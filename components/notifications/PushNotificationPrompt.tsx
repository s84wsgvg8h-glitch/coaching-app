"use client";

import { useEffect, useState } from "react";
import {
  isPushAvailable,
  isPushEnabledForUser,
  subscribeToPush,
  unsubscribeFromPush,
} from "@/lib/pushNotifications";

type PushNotificationPromptProps = {
  userId: string;
};

export default function PushNotificationPrompt({ userId }: PushNotificationPromptProps) {
  const [supported, setSupported] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void (async () => {
      const available = await isPushAvailable();
      setSupported(available);
      if (available) {
        setEnabled(await isPushEnabledForUser(userId));
      }
    })();
  }, [userId]);

  async function enable() {
    setBusy(true);
    const { error } = await subscribeToPush(userId);
    setBusy(false);
    if (error) {
      alert(error.message);
      return;
    }
    setEnabled(true);
  }

  async function disable() {
    setBusy(true);
    const { error } = await unsubscribeFromPush(userId);
    setBusy(false);
    if (error) {
      alert(error.message);
      return;
    }
    setEnabled(false);
  }

  if (!supported) return null;

  return (
    <div className="rounded-2xl border border-app-border bg-app-surface p-4">
      <p className="text-sm font-bold text-app-text">Push notificaties</p>
      <p className="mt-1 text-xs text-app-muted">
        Ontvang herinneringen voor training, digest en coach-meldingen.
      </p>
      <button
        type="button"
        disabled={busy}
        onClick={() => void (enabled ? disable() : enable())}
        className="app-btn-secondary mt-3 min-h-11 text-sm disabled:opacity-50"
      >
        {enabled ? "Uitschakelen" : "Inschakelen"}
      </button>
    </div>
  );
}
