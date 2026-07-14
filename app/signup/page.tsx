"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { validateCoachInviteToken } from "@/lib/coachInviteLinks";
import { validateCoachSignupToken } from "@/lib/coachSignupInvites";
import { validateAdminPlatformInvite } from "@/lib/adminPlatformInvites";
import AuthShell, { AuthField, AuthInput } from "@/components/auth/AuthShell";
import AuthLegalLinks from "@/components/legal/AuthLegalLinks";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { deferEffectUpdate } from "@/lib/deferEffectUpdate";

type InviteMode =
  | "coach-athlete"
  | "coach-signup"
  | "platform-organization"
  | "platform-athlete"
  | "none";

function SignupForm() {
  const searchParams = useSearchParams();
  const athleteToken = searchParams.get("coach")?.trim() || "";
  const coachSignupToken = searchParams.get("coach-signup")?.trim() || "";
  const platformToken = searchParams.get("platform")?.trim() || "";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [inviteValid, setInviteValid] = useState<boolean | null>(null);
  const [inviteMode, setInviteMode] = useState<InviteMode>("none");
  const [inviteLabel, setInviteLabel] = useState("");

  useEffect(() => {
    document.title = "Account maken";
  }, []);

  useEffect(() => {
    const hasToken = Boolean(athleteToken || coachSignupToken || platformToken);
    if (!hasToken) {
      deferEffectUpdate(() => {
        setInviteValid(false);
        setInviteMode("none");
      });
      return;
    }

    async function validateInvite() {
      if (coachSignupToken) {
        const valid = await validateCoachSignupToken(coachSignupToken);
        setInviteValid(valid);
        setInviteMode(valid ? "coach-signup" : "none");
        setInviteLabel(valid ? "coach-account" : "");
        return;
      }

      if (platformToken) {
        const platform = await validateAdminPlatformInvite(platformToken);
        if (!platform) {
          setInviteValid(false);
          setInviteMode("none");
          return;
        }

        setInviteValid(true);
        setInviteMode(
          platform.invite_kind === "organization"
            ? "platform-organization"
            : "platform-athlete",
        );
        setInviteLabel(
          platform.invite_kind === "organization"
            ? "organisatie-coach"
            : "platform-atleet",
        );
        return;
      }

      const coachId = await validateCoachInviteToken(athleteToken);

      if (!coachId) {
        setInviteValid(false);
        setInviteMode("none");
        return;
      }

      const { data } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", coachId)
        .maybeSingle();

      setInviteLabel(data?.full_name || "je coach");
      setInviteValid(true);
      setInviteMode("coach-athlete");
    }

    void validateInvite();
  }, [athleteToken, coachSignupToken, platformToken]);

  async function signUp() {
    if (inviteValid !== true) {
      alert("Deze uitnodigingslink is ongeldig of verlopen.");
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          invite_token: athleteToken || null,
          coach_signup_token: coachSignupToken || null,
          platform_invite_token: platformToken || null,
        },
      },
    });
    setLoading(false);

    if (error) {
      alert(error.message);
      return;
    }

    if (!data.user) {
      alert("Geen user aangevraagd");
      return;
    }

    const pendingSignup =
      inviteMode === "coach-athlete" ||
      inviteMode === "coach-signup" ||
      inviteMode === "platform-organization" ||
      inviteMode === "platform-athlete";

    if (data.session && pendingSignup) {
      window.location.href = "/pending-approval";
      return;
    }

    alert(
      inviteMode === "coach-signup"
        ? "Coach-account aangevraagd. Een admin keurt je aanmelding goed."
        : inviteMode === "platform-organization"
          ? "Coach-account aangevraagd voor de organisatie. Een admin keurt je aanmelding goed."
          : inviteMode === "platform-athlete"
            ? "Atleet-account aangevraagd. Een admin keurt je aanmelding goed."
            : "Account aangevraagd. Je coach keurt je aanmelding goed — daarna kun je inloggen.",
    );
    window.location.href = "/login";
  }

  const subtitle =
    inviteMode === "coach-signup"
      ? "Maak je coach-account aan. Een admin keurt je aanmelding daarna goed."
      : inviteMode === "platform-organization"
        ? "Maak je coach-account aan voor de organisatie via deze admin-link."
        : inviteMode === "platform-athlete"
          ? "Maak je atletenaccount aan via deze admin-link."
          : inviteMode === "coach-athlete"
            ? `Maak je atletenaccount aan via ${inviteLabel}.`
            : "Registreren kan alleen met een geldige uitnodigingslink.";

  if (inviteValid === null) {
    return (
      <main className="auth-shell flex min-h-[100dvh] items-center justify-center p-6">
        <div className="w-full max-w-md">
          <SkeletonCard />
        </div>
      </main>
    );
  }

  if (inviteValid === false) {
    return (
      <AuthShell
        title="Uitnodiging vereist"
        subtitle="Account aanmaken kan alleen met een geldige link van je coach of admin."
        footer={
          <p className="text-center text-[14px] text-app-muted">
            <Link href="/login" className="font-medium text-app-accent hover:underline">
              Terug naar inloggen
            </Link>
          </p>
        }
      >
        <div />
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Account maken"
      subtitle={subtitle}
      footer={
        <p className="text-center text-[14px] text-app-muted">
          Heb je al een account?{" "}
          <Link href="/login" className="font-medium text-app-accent hover:underline">
            Inloggen
          </Link>
        </p>
      }
    >
      <AuthField label="Volledige naam">
        <AuthInput
          placeholder="Je naam"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />
      </AuthField>
      <AuthField label="E-mail">
        <AuthInput
          placeholder="jij@email.nl"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </AuthField>
      <AuthField label="Wachtwoord">
        <AuthInput
          type="password"
          placeholder="••••••••"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void signUp();
          }}
        />
      </AuthField>
      <button
        type="button"
        onClick={() => void signUp()}
        disabled={loading}
        className="app-btn-primary w-full py-3 disabled:opacity-60"
      >
        {loading
          ? "Bezig..."
          : inviteMode === "coach-signup" || inviteMode === "platform-organization"
            ? "Coach-account aanvragen"
            : "Account aanmaken"}
      </button>
      <AuthLegalLinks />
    </AuthShell>
  );
}

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <main className="auth-shell flex min-h-[100dvh] items-center justify-center p-6">
          <div className="w-full max-w-md">
            <SkeletonCard />
          </div>
        </main>
      }
    >
      <SignupForm />
    </Suspense>
  );
}
