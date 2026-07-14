"use client";

import { useEffect } from "react";
import Toast, { useToast } from "@/components/ui/Toast";
import { registerAppToast } from "@/lib/appToast";

export default function AppToastHost() {
  const { message, showToast, clearToast } = useToast();

  useEffect(() => {
    registerAppToast(showToast);
    return () => registerAppToast(null);
  }, [showToast]);

  return <Toast message={message} onDismiss={clearToast} />;
}
