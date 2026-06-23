"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getRealSupabase } from "@/lib/supabaseClient";
import { getAppOrigin } from "@/lib/appUrl";
import AuthShell, { AuthField, AuthInput } from "@/components/auth/AuthShell";

export default function ResetPasswordRequestPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Wachtwoord vergeten";
  }, []);

  async function handleSubmit() {
    const trimmed = email.trim();
    if (!trimmed) {
      setError("Vul je e-mailadres in.");
      return;
    }

    setLoading(true);
    setError(null);

    const origin =
      typeof window !== "undefined" ? window.location.origin : getAppOrigin();

    const { error: resetError } = await getRealSupabase().auth.resetPasswordForEmail(
      trimmed,
      { redirectTo: `${origin}/reset-password/update` },
    );

    setLoading(false);

    if (resetError) {
      setError(resetError.message);
      return;
    }

    setSent(true);
  }

  if (sent) {
    return (
      <AuthShell
        title="E-mail verstuurd"
        subtitle="Als dit e-mailadres bij ons bekend is, ontvang je binnen enkele minuten een link om je wachtwoord te resetten."
        footer={
          <Link
            href="/login"
            className="block text-center text-[14px] font-medium text-app-accent hover:underline"
          >
            Terug naar inloggen
          </Link>
        }
      >
        <p className="text-[14px] text-app-muted">
          Controleer ook je spam-map. De link is beperkt geldig.
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Wachtwoord vergeten"
      subtitle="Vul je e-mailadres in. We sturen je een link om een nieuw wachtwoord in te stellen."
      footer={
        <Link
          href="/login"
          className="block text-center text-[14px] font-medium text-app-accent hover:underline"
        >
          Terug naar inloggen
        </Link>
      }
    >
      <AuthField label="E-mail">
        <AuthInput
          type="email"
          autoComplete="email"
          placeholder="jij@email.nl"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") void handleSubmit();
          }}
        />
      </AuthField>
      {error ? (
        <p className="text-[13px] font-medium text-red-400" role="alert">
          {error}
        </p>
      ) : null}
      <button
        type="button"
        className="app-btn-primary min-h-[44px] w-full"
        disabled={loading}
        onClick={() => void handleSubmit()}
      >
        {loading ? "Bezig..." : "Resetlink versturen"}
      </button>
    </AuthShell>
  );
}
