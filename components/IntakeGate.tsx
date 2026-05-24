"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { needsIntakeCompletion } from "@/lib/intakeForm";

const ALLOWED_PATHS = ["/intake", "/login", "/signup"];

export default function IntakeGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
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

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        if (!cancelled) {
          setBlocked(false);
          setChecked(true);
        }
        return;
      }

      const needsIntake = await needsIntakeCompletion(user.id);

      if (cancelled) return;

      if (needsIntake) {
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
  }, [pathname, router]);

  if (!checked || blocked) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-gray-100">
        <p className="text-sm text-gray-500">Laden...</p>
      </div>
    );
  }

  return <>{children}</>;
}
