"use client";

import { supabase } from "@/lib/supabaseClient";
import {
  getNativePushEnabled,
  isNativePushAvailable,
  subscribeToNativePush,
  unsubscribeFromNativePush,
} from "@/lib/nativePush";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}

export function isWebPushSupported() {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

/** Web or native (Capacitor iOS) push availability. */
export async function isPushAvailable(): Promise<boolean> {
  if (await isNativePushAvailable()) return true;
  return isWebPushSupported();
}

export async function isPushEnabledForUser(userId: string): Promise<boolean> {
  if (await isNativePushAvailable()) {
    return getNativePushEnabled(userId);
  }
  if (!isWebPushSupported()) return false;
  const registration = await navigator.serviceWorker.getRegistration("/sw.js");
  const subscription = await registration?.pushManager.getSubscription();
  return Boolean(subscription);
}

export async function registerServiceWorker() {
  if (!isWebPushSupported()) return null;
  return navigator.serviceWorker.register("/sw.js");
}

async function subscribeToWebPush(userId: string) {
  if (!isWebPushSupported()) {
    return { error: new Error("Push notificaties worden niet ondersteund.") };
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    return { error: new Error("Notificatie-permissie geweigerd.") };
  }

  const registration = await registerServiceWorker();
  if (!registration) {
    return { error: new Error("Service worker kon niet worden geregistreerd.") };
  }

  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidKey) {
    return { error: new Error("VAPID key ontbreekt.") };
  }

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidKey),
  });

  const json = subscription.toJSON();
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: userId,
      endpoint: json.endpoint,
      p256dh: json.keys?.p256dh,
      auth: json.keys?.auth,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,endpoint" },
  );

  return { error: error ? new Error(error.message) : null };
}

export async function subscribeToPush(userId: string) {
  if (await isNativePushAvailable()) {
    return subscribeToNativePush(userId);
  }
  return subscribeToWebPush(userId);
}

async function unsubscribeFromWebPush(userId: string) {
  if (!isWebPushSupported()) return { error: null };

  const registration = await navigator.serviceWorker.getRegistration("/sw.js");
  const subscription = await registration?.pushManager.getSubscription();
  if (subscription) {
    await subscription.unsubscribe();
    await supabase
      .from("push_subscriptions")
      .delete()
      .eq("user_id", userId)
      .eq("endpoint", subscription.endpoint);
  }

  return { error: null };
}

export async function unsubscribeFromPush(userId: string) {
  if (await isNativePushAvailable()) {
    return unsubscribeFromNativePush(userId);
  }
  return unsubscribeFromWebPush(userId);
}

/** @deprecated Use isPushAvailable() */
export function isPushSupported() {
  return isWebPushSupported();
}
