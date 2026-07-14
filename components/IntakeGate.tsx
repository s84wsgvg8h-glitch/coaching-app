"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { needsIntakeCompletionFromProfile } from "@/lib/authIntake";
import { isDemoMode } from "@/lib/demo/demoMode";

const ALLOWED_PATHS = [
  "/intake",
  "/login",
  "/signup",
  "/privacy",
  "/voorwaarden",
  "/pending-approval",
];

/** Redirect-only gate — no extra splash screen after auth bootstrap. */
export default function IntakeGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { userId, profile, loading: authLoading } = useAuth();

  useEffect(() => {
    if (authLoading) return;
    if (ALLOWED_PATHS.some((path) => pathname.startsWith(path))) return;
    if (isDemoMode() || !userId) return;

    if (needsIntakeCompletionFromProfile(profile)) {
      router.replace("/intake");
    }
  }, [pathname, router, userId, profile, authLoading]);

  return <>{children}</>;
}
