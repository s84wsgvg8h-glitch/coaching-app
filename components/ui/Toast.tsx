"use client";

import { useEffect, useState } from "react";

type ToastProps = {
  message: string | null;
  onDismiss?: () => void;
};

export default function Toast({ message, onDismiss }: ToastProps) {
  const [visible, setVisible] = useState(Boolean(message));

  useEffect(() => {
    if (!message) {
      setVisible(false);
      return;
    }

    setVisible(true);
    const timer = window.setTimeout(() => {
      setVisible(false);
      onDismiss?.();
    }, 3200);

    return () => window.clearTimeout(timer);
  }, [message, onDismiss]);

  if (!message || !visible) return null;

  return (
    <div
      role="status"
      className="fixed bottom-6 right-4 z-50 max-w-sm rounded-2xl border border-app-border bg-app-surface px-4 py-3 text-sm font-medium text-app-text shadow-2xl"
    >
      {message}
    </div>
  );
}

export function useToast() {
  const [message, setMessage] = useState<string | null>(null);

  function showToast(next: string) {
    setMessage(next);
  }

  function clearToast() {
    setMessage(null);
  }

  return { message, showToast, clearToast };
}
