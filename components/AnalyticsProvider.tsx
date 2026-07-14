"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import {
  identifyUser,
  initAnalytics,
  resetAnalyticsUser,
  trackPageView,
} from "@/lib/analytics";

export default function AnalyticsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { userId, role, profile } = useAuth();

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return;

    const start = () => {
      void initAnalytics();
    };

    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      window.requestIdleCallback(start);
      return;
    }

    const timer = globalThis.setTimeout(start, 1500);
    return () => globalThis.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!pathname) return;
    trackPageView(pathname);
  }, [pathname]);

  useEffect(() => {
    if (!userId) {
      resetAnalyticsUser();
      return;
    }
    identifyUser(userId, {
      role: role || "unknown",
      name: profile?.full_name || undefined,
    });
  }, [userId, role, profile?.full_name]);

  return children;
}
