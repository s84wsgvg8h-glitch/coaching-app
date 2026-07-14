"use client";

import { supabase } from "@/lib/supabaseClient";
import { toIosPushEndpoint } from "@/lib/pushEndpoint";

export async function isCapacitorNativePlatform(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  const { Capacitor } = await import("@capacitor/core");
  return Capacitor.isNativePlatform();
}

export async function isNativePushAvailable(): Promise<boolean> {
  return isCapacitorNativePlatform();
}

async function persistIosToken(userId: string, deviceToken: string) {
  const endpoint = toIosPushEndpoint(deviceToken);
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: userId,
      endpoint,
      p256dh: null,
      auth: null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,endpoint" },
  );
  return { error };
}

export async function subscribeToNativePush(userId: string) {
  if (!(await isNativePushAvailable())) {
    return { error: new Error("Native push is niet beschikbaar op dit apparaat.") };
  }

  const { PushNotifications } = await import("@capacitor/push-notifications");
  const permission = await PushNotifications.requestPermissions();
  if (permission.receive !== "granted") {
    return { error: new Error("Notificatie-permissie geweigerd.") };
  }

  return new Promise<{ error: Error | null }>((resolve) => {
    let settled = false;
    let registrationListener: { remove: () => Promise<void> } | null = null;
    let errorListener: { remove: () => Promise<void> } | null = null;

    const finish = (error: Error | null) => {
      if (settled) return;
      settled = true;
      void registrationListener?.remove();
      void errorListener?.remove();
      resolve({ error });
    };

    void (async () => {
      registrationListener = await PushNotifications.addListener(
        "registration",
        (token) => {
          void persistIosToken(userId, token.value).then(({ error }) => {
            finish(error ? new Error(error.message) : null);
          });
        },
      );

      errorListener = await PushNotifications.addListener(
        "registrationError",
        (error) => {
          finish(new Error(error.error || "Push-registratie mislukt."));
        },
      );

      await PushNotifications.register();
    })();

    window.setTimeout(() => {
      finish(new Error("Push-registratie duurde te lang. Probeer opnieuw."));
    }, 15000);
  });
}

export async function unsubscribeFromNativePush(userId: string) {
  if (!(await isNativePushAvailable())) return { error: null };

  const { data, error: fetchError } = await supabase
    .from("push_subscriptions")
    .select("endpoint")
    .eq("user_id", userId)
    .like("endpoint", "ios:%");

  if (fetchError) {
    return { error: new Error(fetchError.message) };
  }

  const endpoints = (data ?? []).map((row) => row.endpoint).filter(Boolean);
  if (endpoints.length > 0) {
    const { error } = await supabase
      .from("push_subscriptions")
      .delete()
      .eq("user_id", userId)
      .in("endpoint", endpoints);
    if (error) return { error: new Error(error.message) };
  }

  return { error: null };
}

export async function getNativePushEnabled(userId: string): Promise<boolean> {
  const { count, error } = await supabase
    .from("push_subscriptions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .like("endpoint", "ios:%");

  if (error) return false;
  return (count ?? 0) > 0;
}
