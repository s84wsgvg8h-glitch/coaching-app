"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

function LoginForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    document.title = "Login";
  }, []);

  async function login() {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert(error.message);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const nextPath = searchParams.get("next");
    const safeNext =
      nextPath && nextPath.startsWith("/") && !nextPath.startsWith("//")
        ? nextPath
        : "/dashboard";

    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, intake_completed_at")
        .eq("id", user.id)
        .single();

      if (profile?.role === "atleet" && !profile.intake_completed_at) {
        window.location.href = "/intake";
        return;
      }
    }

    window.location.href = safeNext;
  }

  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-app-bg px-4 py-8 pt-safe pb-safe">
      <div className="w-full max-w-md rounded-2xl bg-app-surface p-6 shadow-xl md:p-8">
        <h1 className="mb-2 text-3xl font-bold text-app-text">Inloggen</h1>

        <p className="mb-6 text-app-muted">
          Welkom terug bij je coaching dashboard
        </p>

        <input
          className="mb-3 w-full rounded-lg border border-app-border bg-app-surface p-3 text-app-text outline-none placeholder:text-app-subtle focus:ring-2 focus:ring-app-primary"
          placeholder="E-mail"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          className="mb-4 w-full rounded-lg border border-app-border bg-app-surface p-3 text-app-text outline-none placeholder:text-app-subtle focus:ring-2 focus:ring-app-primary"
          type="password"
          placeholder="Wachtwoord"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          className="theme-preserve w-full rounded-lg bg-app-primary p-3 font-semibold text-app-primary-fg transition active:scale-[0.98]"
          onClick={() => void login()}
        >
          Inloggen
        </button>

        <p className="mt-6 text-center text-sm text-app-muted">
          Nog geen account?{" "}
          <a href="/signup" className="font-semibold text-app-text">
            Account maken
          </a>
        </p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-[100dvh] items-center justify-center bg-app-bg">
          <p className="text-app-muted">Laden...</p>
        </main>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
