"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/components/AuthProvider";
import {
  isPendingAthlete,
  isPendingCoachSignup,
} from "@/lib/authRoles";
import { needsIntakeCompletion } from "@/lib/intakeForm";
import { loadAuthenticatedProfile } from "@/lib/profileAuth";
import OnboardingProgress from "@/components/OnboardingProgress";

export default function PendingApprovalPage() {
  const { userId, profile, refresh } = useAuth();
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    document.title = "Wachten op goedkeuring";
  }, []);

  async function redirectApprovedUser(
    approvedUserId: string,
    role: string | null,
  ) {
    if (role === "atleet") {
      const needsIntake = await needsIntakeCompletion(approvedUserId);
      window.location.href = needsIntake ? "/intake" : "/dashboard";
      return;
    }

    if (role === "coach" || role === "admin") {
      window.location.href = role === "admin" ? "/admin" : "/dashboard";
      return;
    }

    window.location.href = "/dashboard";
  }

  useEffect(() => {
    if (!userId) {
      window.location.href = "/login";
      return;
    }

    if (profile && profile.role !== "pending") {
      void redirectApprovedUser(userId, profile.role);
    }
  }, [userId, profile]);

  async function checkApprovalStatus() {
    if (!userId) return;

    setChecking(true);
    try {
      await refresh();
      const latest = await loadAuthenticatedProfile(userId);

      if (latest?.role && latest.role !== "pending") {
        await redirectApprovedUser(userId, latest.role);
      }
    } finally {
      setChecking(false);
    }
  }

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  const isAthletePending = isPendingAthlete(profile || {});
  const isCoachPending = isPendingCoachSignup(profile || {});

  const title = isCoachPending
    ? "Coach-account in behandeling"
    : "Aanmelding in behandeling";

  const description = isCoachPending
    ? "Je coach-account is aangevraagd. Een admin keurt je aanmelding goed — daarna kun je inloggen en aan de slag."
    : isAthletePending
      ? "Je account is aangemaakt. Je coach keurt je aanmelding goed — daarna krijg je toegang tot de app."
      : "Je account wacht op goedkeuring. Je ontvangt toegang zodra je aanmelding is geaccepteerd.";

  return (
    <main className="auth-shell relative flex h-[100dvh] min-h-0 items-center justify-center overflow-y-auto overscroll-contain px-4 py-8 pt-safe pb-safe">
      <div className="auth-shell-glow pointer-events-none" aria-hidden="true" />
      <div className="ui-auth-card animate-fade-in w-full max-w-md">
        <OnboardingProgress />
        <p className="text-[12px] font-medium tracking-wide text-app-accent">
          Limitless Coaching
        </p>
        <h1 className="mt-2 text-[1.75rem] font-semibold tracking-tight text-app-text">
          {title}
        </h1>
        <p className="mt-2 text-[14px] font-normal leading-relaxed text-app-muted">
          {description}
        </p>

        <div className="mt-8 space-y-3">
          <button
            type="button"
            onClick={() => void checkApprovalStatus()}
            disabled={checking}
            className="app-btn-primary min-h-[48px] w-full disabled:opacity-60"
          >
            {checking ? "Controleren…" : "Status verversen"}
          </button>
          <button
            type="button"
            onClick={() => void logout()}
            className="app-btn-secondary min-h-[48px] w-full"
          >
            Uitloggen
          </button>
        </div>

        <p className="mt-6 text-center text-[13px] leading-relaxed text-app-muted">
          Je hoeft niets te doen. Zodra je bent goedgekeurd kun je de app
          gebruiken.
        </p>
      </div>
    </main>
  );
}
