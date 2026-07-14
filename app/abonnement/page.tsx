"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/components/AuthProvider";
import ProfileCoachingSubscriptionSection from "@/components/profile/ProfileCoachingSubscriptionSection";
import OnboardingProgress from "@/components/OnboardingProgress";
import { isAthleteRole } from "@/lib/authRoles";

export default function AbonnementPage() {
  const router = useRouter();
  const { userId, profile, loading: authLoading } = useAuth();

  useEffect(() => {
    document.title = "Coachingabonnement";
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!userId) {
      router.replace("/login?next=/abonnement");
      return;
    }
    if (profile && !isAthleteRole(profile.role)) {
      router.replace("/dashboard");
    }
  }, [authLoading, profile, router, userId]);

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <main className="auth-shell relative flex min-h-[100dvh] items-center justify-center overflow-y-auto overscroll-contain px-4 py-8 pt-safe pb-safe">
      <div className="auth-shell-glow pointer-events-none" aria-hidden="true" />
      <div className="ui-auth-card animate-fade-in w-full max-w-lg">
        <OnboardingProgress />
        <p className="text-[12px] font-medium tracking-wide text-app-accent">
          Limitless Coaching
        </p>
        <h1 className="mt-2 text-[1.75rem] font-semibold tracking-tight text-app-text">
          Coachingabonnement
        </h1>
        <p className="mt-2 text-[14px] font-normal leading-relaxed text-app-muted">
          Beheer hier je coachingabonnement en betalingen wanneer je coach een
          prijs heeft ingesteld. Je kunt de app gewoon gebruiken zonder actief
          abonnement.
        </p>

        {userId ? (
          <div className="mt-6">
            <ProfileCoachingSubscriptionSection userId={userId} />
          </div>
        ) : (
          <p className="mt-6 text-sm text-app-muted">Laden…</p>
        )}

        <div className="mt-6 flex flex-col gap-2 border-t border-app-border/60 pt-4">
          <Link href="/dashboard" className="app-btn-primary min-h-11 w-full text-center">
            Naar dashboard
          </Link>
          <button
            type="button"
            onClick={() => void logout()}
            className="app-btn-secondary min-h-11 w-full"
          >
            Uitloggen
          </button>
        </div>
      </div>
    </main>
  );
}
