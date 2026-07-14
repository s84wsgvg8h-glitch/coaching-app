"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { needsPendingApproval } from "@/lib/authRoles";
import { isDemoMode } from "@/lib/demo/demoMode";

const ALLOWED_PATHS = [
  "/pending-approval",
  "/login",
  "/signup",
  "/privacy",
  "/voorwaarden",
];

/** Redirect-only gate — no blocking splash (AuthProvider already bootstraps auth). */
export default function PendingApprovalGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { userId, profile, loading: authLoading } = useAuth();

  useEffect(() => {
    if (authLoading) return;
    if (ALLOWED_PATHS.some((path) => pathname.startsWith(path))) return;
    if (isDemoMode() || !userId) return;
    if (needsPendingApproval(profile)) {
      router.replace("/pending-approval");
    }
  }, [pathname, router, userId, profile, authLoading]);

  return <>{children}</>;
}
