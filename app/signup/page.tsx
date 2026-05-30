"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { validateCoachInviteToken } from "@/lib/coachInviteLinks";
import { validateCoachSignupToken } from "@/lib/coachSignupInvites";

function SignupForm() {
  const searchParams = useSearchParams();
  const athleteToken = searchParams.get("coach")?.trim() || "";
  const coachSignupToken = searchParams.get("coach-signup")?.trim() || "";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [inviteValid, setInviteValid] = useState<boolean | null>(
    athleteToken || coachSignupToken ? null : false,
  );
  const [inviteLabel, setInviteLabel] = useState("");

  useEffect(() => {
    document.title = "Account maken";
  }, []);

  useEffect(() => {
    if (!athleteToken && !coachSignupToken) {
      setInviteValid(false);
      return;
    }

    async function validateInvite() {
      if (coachSignupToken) {
        const valid = await validateCoachSignupToken(coachSignupToken);
        setInviteValid(valid);
        setInviteLabel(valid ? "coach-account" : "");
        return;
      }

      const coachId = await validateCoachInviteToken(athleteToken);

      if (!coachId) {
        setInviteValid(false);
        return;
      }

      const { data } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", coachId)
        .single();

      setInviteLabel(data?.full_name || "je coach");
      setInviteValid(true);
    }

    void validateInvite();
  }, [athleteToken, coachSignupToken]);

  async function signUp() {
    if ((athleteToken || coachSignupToken) && inviteValid !== true) {
      alert("Deze uitnodigingslink is ongeldig of verlopen.");
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          invite_token: athleteToken || null,
          coach_signup_token: coachSignupToken || null,
        },
      },
    });

    if (error) {
      alert(error.message);
      return;
    }

    if (!data.user) {
      alert("Geen user aangemaakt");
      return;
    }

    alert(
      coachSignupToken
        ? "Coach-account aangevraagd. Een admin keurt je aanmelding goed."
        : athleteToken
          ? "Account aangemaakt. Je kunt nu inloggen."
          : "Account aanvraag verstuurd",
    );
    window.location.href = "/login";
  }

  if ((athleteToken || coachSignupToken) && inviteValid === null) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-app-bg px-4">
        <p className="text-sm text-app-muted">Uitnodiging controleren...</p>
      </main>
    );
  }

  if ((athleteToken || coachSignupToken) && inviteValid === false) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-app-bg px-4 py-8">
        <div className="w-full max-w-md rounded-2xl bg-app-surface p-8 shadow-xl">
          <h1 className="mb-2 text-3xl font-bold text-app-text">Ongeldige link</h1>
          <p className="text-app-muted">
            Deze uitnodigingslink is ongeldig of verlopen. Vraag om een nieuwe
            link.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-app-bg px-4 py-8 pt-safe pb-safe">
      <div className="w-full max-w-md rounded-2xl bg-app-surface p-6 shadow-xl md:p-8">
        <h1 className="mb-2 text-3xl font-bold text-app-text">Account maken</h1>

        <p className="mb-6 text-app-muted">
          {coachSignupToken
            ? "Maak je coach-account aan. Een admin keurt je aanmelding daarna goed."
            : athleteToken
              ? `Maak je atletenaccount aan via ${inviteLabel}.`
              : "Vraag toegang aan als atleet"}
        </p>

        <input
          className="mb-3 w-full rounded-lg border border-app-border bg-app-surface p-3 text-app-text outline-none placeholder:text-app-subtle"
          placeholder="Volledige naam"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />

        <input
          className="mb-3 w-full rounded-lg border border-app-border bg-app-surface p-3 text-app-text outline-none placeholder:text-app-subtle"
          placeholder="E-mail"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          className="mb-4 w-full rounded-lg border border-app-border bg-app-surface p-3 text-app-text outline-none placeholder:text-app-subtle"
          type="password"
          placeholder="Wachtwoord"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          onClick={() => void signUp()}
          className="theme-preserve w-full rounded-lg bg-app-primary p-3 font-semibold text-app-primary-fg transition active:scale-[0.98]"
        >
          {coachSignupToken
            ? "Coach-account aanvragen"
            : athleteToken
              ? "Account aanmaken"
              : "Account aanvragen"}
        </button>
      </div>
    </main>
  );
}

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-gray-100 px-4">
          <p className="text-sm text-gray-500">Laden...</p>
        </main>
      }
    >
      <SignupForm />
    </Suspense>
  );
}
