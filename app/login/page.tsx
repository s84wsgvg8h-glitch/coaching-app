"use client";

import Link from "next/link";
import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { disableDemoMode } from "@/lib/demo/demoMode";
import { getRealSupabase } from "@/lib/supabaseClient";
import { getHomePathForRole, needsPendingApproval } from "@/lib/authRoles";
import { trackEvent } from "@/lib/analytics";
import { getPersistedAuthSession } from "@/lib/authSession";
import { needsIntakeCompletion } from "@/lib/intakeForm";
import { loadAuthenticatedProfile } from "@/lib/profileAuth";
import AuthShell, { AuthField, AuthInput } from "@/components/auth/AuthShell";
import AuthLegalLinks from "@/components/legal/AuthLegalLinks";
import { useAuthOptional } from "@/components/AuthProvider";

type LoginBootstrapResult =
  | { status: "ready" }
  | { status: "redirect"; path: string };

async function loadProfileWithRetry(userId: string) {
  for (let i = 0; i < 5; i += 1) {
    const profile = await loadAuthenticatedProfile(userId);
    if (profile?.role) return profile;
    await new Promise((resolve) => window.setTimeout(resolve, 120));
  }

  return loadAuthenticatedProfile(userId);
}

async function resolvePostAuthPath(userId: string): Promise<string> {
  const profile = await loadProfileWithRetry(userId);

  if (needsPendingApproval(profile)) {
    return "/pending-approval";
  }

  if (profile?.role === "atleet") {
    const needsIntake = await needsIntakeCompletion(userId);
    if (needsIntake) {
      return "/intake";
    }
  }

  return getHomePathForRole(profile?.role);
}

async function prepareLoginPage(): Promise<LoginBootstrapResult> {
  disableDemoMode();

  const {
    data: { session },
  } = await getRealSupabase().auth.getSession();

  if (!session?.user?.id) {
    return { status: "ready" };
  }

  return {
    status: "redirect",
    path: await resolvePostAuthPath(session.user.id),
  };
}

async function waitForSession(userId: string, attempts = 5) {
  for (let i = 0; i < attempts; i += 1) {
    const session = await getPersistedAuthSession();

    if (session?.user?.id === userId) {
      return session;
    }

    await new Promise((resolve) => window.setTimeout(resolve, 120));
  }

  return null;
}

function LoginForm() {
  const router = useRouter();
  const auth = useAuthOptional();
  const searchParams = useSearchParams();
  const accountDeleted = searchParams.get("deleted") === "1";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pageReady, setPageReady] = useState(false);
  const submittingRef = useRef(false);

  useEffect(() => {
    document.title = "Login";

    void (async () => {
      const result = await prepareLoginPage();
      if (submittingRef.current) return;

      if (result.status === "redirect") {
        router.replace(result.path);
        return;
      }

      setPageReady(true);
    })();
  }, [router]);

  async function login() {
    submittingRef.current = true;
    setLoading(true);
    setError(null);
    disableDemoMode();

    try {
      const client = getRealSupabase();
      const { data, error: signInError } = await client.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        setError(signInError.message);
        return;
      }

      const user = data.session?.user ?? data.user;

      if (!user) {
        setError(
          "Inloggen gelukt, maar er is geen actieve sessie. Bevestig je e-mail en probeer opnieuw.",
        );
        return;
      }

      const session = await waitForSession(user.id);
      if (!session) {
        throw new Error(
          "Sessie kon niet worden gestart. Probeer opnieuw in te loggen.",
        );
      }

      trackEvent("login_success", { role: "unknown" });
      router.replace(await resolvePostAuthPath(user.id));
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Inloggen mislukt. Probeer het opnieuw.",
      );
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  }

  if (auth?.loading || !pageReady) {
    return null;
  }

  return (
    <AuthShell
      title="Inloggen"
      subtitle="Welkom terug bij je coaching workspace"
      footer={
        <p className="text-center text-[14px] font-normal text-app-muted">
          Nog geen account? Vraag je coach of admin om een uitnodigingslink.
        </p>
      }
    >
      {accountDeleted ? (
        <div
          role="status"
          className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300"
        >
          Je account is permanent verwijderd. Je kunt opnieuw inloggen als je
          opnieuw bent uitgenodigd.
        </div>
      ) : null}
      <AuthField label="E-mail">
        <AuthInput
          placeholder="jij@email.nl"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void login();
          }}
        />
      </AuthField>
      <AuthField label="Wachtwoord">
        <AuthInput
          type="password"
          placeholder="••••••••"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void login();
          }}
        />
      </AuthField>
      <div className="flex justify-end">
        <Link
          href="/reset-password"
          className="text-[13px] font-medium text-app-accent hover:underline"
        >
          Wachtwoord vergeten?
        </Link>
      </div>
      {error ? (
        <p className="text-[13px] font-medium text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}
      <button
        className="app-btn-primary min-h-[44px] w-full"
        onClick={() => void login()}
        disabled={loading}
      >
        {loading ? "Bezig..." : "Inloggen"}
      </button>
      <AuthLegalLinks />
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
