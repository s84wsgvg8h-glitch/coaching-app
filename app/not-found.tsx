"use client";

import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { isCoachLikeRole } from "@/lib/authRoles";
import AuthShell, { AuthField, AuthInput } from "@/components/auth/AuthShell";

export default function NotFoundPage() {
  const { userId, loading } = useAuth();
  const signedIn = Boolean(userId);

  return (
    <AuthShell
      title="Pagina niet gevonden"
      subtitle={
        signedIn
          ? "Deze pagina bestaat niet of is verplaatst. Ga terug naar je dashboard om verder te gaan."
          : "Deze pagina bestaat niet. Log in om verder te gaan in Limitless Coaching."
      }
      footer={
        !loading ? (
          <div className="flex flex-col gap-2">
            {signedIn ? (
              <Link href="/dashboard" className="app-btn-primary min-h-[44px] text-center">
                Naar dashboard
              </Link>
            ) : (
              <Link href="/login" className="app-btn-primary min-h-[44px] text-center">
                Inloggen
              </Link>
            )}
            <Link href="/" className="app-btn-secondary min-h-[44px] text-center">
              Naar home
            </Link>
          </div>
        ) : null
      }
    >
      <AuthField label="Status">
        <AuthInput value="404 — pagina niet gevonden" readOnly aria-readonly />
      </AuthField>
    </AuthShell>
  );
}
