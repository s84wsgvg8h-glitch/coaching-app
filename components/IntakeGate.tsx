"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { needsIntakeCompletion } from "@/lib/intakeForm";
import { isDemoMode } from "@/lib/demo/demoMode";
import { SkeletonCard } from "@/components/ui/Skeleton";

const ALLOWED_PATHS = ["/intake", "/login", "/signup", "/privacy", "/voorwaarden"];

export default function IntakeGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { userId, role, loading: authLoading } = useAuth();
  const [checked, setChecked] = useState(false);
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      if (ALLOWED_PATHS.some((path) => pathname.startsWith(path))) {
        if (!cancelled) {
          setBlocked(false);
          setChecked(true);
        }
        return;
      }

      if (authLoading) return;

      if (isDemoMode()) {
        if (!cancelled) {
          setBlocked(false);
          setChecked(true);
        }
        return;
      }

      if (!userId) {
        if (!cancelled) {
          setBlocked(false);
          setChecked(true);
        }
        return;
      }

      const needsIntake = await needsIntakeCompletion(userId);

      if (cancelled) return;

      if (needsIntake && role === "atleet") {
        setBlocked(true);
        router.replace("/intake");
      } else {
        setBlocked(false);
      }

      setChecked(true);
    }

    void check();

    return () => {
      cancelled = true;
    };
  }, [pathname, router, userId, role, authLoading]);

  if (authLoading || !checked || blocked) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-app-bg">
        <p className="text-sm text-app-muted">Laden...</p>
      </div>
    );
  }

  return <>{children}</>;
}
