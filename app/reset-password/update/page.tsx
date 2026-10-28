"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getRealSupabase } from "@/lib/supabaseClient";
import AuthShell, { AuthField, AuthInput } from "@/components/auth/AuthShell";
import { SkeletonCard } from "@/components/ui/Skeleton";

function readAuthCallbackError() {
  const sources = [
    window.location.search.replace(/^\?/, ""),
    window.location.hash.replace(/^#/, ""),
  ];

  for (const source of sources) {
    if (!source) continue;
    const params = new URLSearchParams(source);
    const description = params.get("error_description");
    const code = params.get("error_code") || params.get("error");
    if (!description && !code) continue;
    return (
      description?.replace(/\+/g, " ") ||
      "Deze link is ongeldig of verlopen."
    );
  }

  return null;
}

export default function ResetPasswordUpdatePage() {
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Nieuw wachtwoord";

    const callbackError = readAuthCallbackError();
    if (callbackError) {
      setLinkError(callbackError);
      return;
    }

    const client = getRealSupabase();
    let settled = false;

    const markReady = () => {
      settled = true;
      setLinkError(null);
      setReady(true);
    };

    const { data: subscription } = client.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        markReady();
      }
    });

    void client.auth.getSession().then(({ data }) => {
      if (data.session) markReady();
    });

    const timeout = window.setTimeout(() => {
      if (!settled) {
        setLinkError(
          "Deze link is ongeldig of verlopen. Vraag een nieuwe resetlink aan.",
        );
      }
    }, 12000);

    return () => {
      window.clearTimeout(timeout);
      subscription.subscription.unsubscribe();
    };
  }, []);

  async function handleSubmit() {
    if (password.length < 6) {
      setError("Wachtwoord moet minimaal 6 tekens zijn.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Wachtwoorden komen niet overeen.");
      return;
    }

    setLoading(true);
    setError(null);

    const { error: updateError } = await getRealSupabase().auth.updateUser({
      password,
    });

    setLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    await getRealSupabase().auth.signOut();
    setDone(true);
  }

  if (!ready && linkError) {
    return (
      <AuthShell
        title="Link ongeldig"
        subtitle={linkError}
        footer={
          <Link
            href="/reset-password"
            className="block text-center text-[14px] font-medium text-app-accent hover:underline"
          >
            Nieuwe link aanvragen
          </Link>
        }
      >
        <p className="text-[14px] text-app-muted">
          Resetlinks werken één keer en zijn beperkt geldig.
        </p>
      </AuthShell>
    );
  }

  if (!ready) {
    return (
      <main className="auth-shell flex min-h-[100dvh] items-center justify-center p-6">
        <div className="w-full max-w-md">
          <SkeletonCard />
        </div>
      </main>
    );
  }

  if (done) {
    return (
      <AuthShell
        title="Wachtwoord bijgewerkt"
        subtitle="Je kunt nu inloggen met je nieuwe wachtwoord."
        footer={
          <Link
            href="/login"
            className="block text-center text-[14px] font-medium text-app-accent hover:underline"
          >
            Naar inloggen
          </Link>
        }
      >
        <p className="text-[14px] text-app-muted">
          Om veiligheidsredenen is je oude wachtwoord niet meer geldig.
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Nieuw wachtwoord"
      subtitle="Kies een sterk wachtwoord van minimaal 6 tekens."
    >
      <AuthField label="Nieuw wachtwoord">
        <AuthInput
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </AuthField>
      <AuthField label="Bevestig wachtwoord">
        <AuthInput
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
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
        {loading ? "Opslaan..." : "Wachtwoord opslaan"}
      </button>
    </AuthShell>
  );
}
