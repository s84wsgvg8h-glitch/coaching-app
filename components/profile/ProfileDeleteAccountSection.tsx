"use client";

import { Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function ProfileDeleteAccountSection() {
  const router = useRouter();
  const [confirmText, setConfirmText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState(false);

  const canDelete = confirmText === "VERWIJDER" && !loading;

  async function handleDelete() {
    if (!canDelete) return;

    const confirmed = window.confirm(
      "Weet je zeker dat je je account permanent wilt verwijderen? Dit kan niet ongedaan worden gemaakt.",
    );
    if (!confirmed) return;

    setLoading(true);
    setError("");

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      if (!token) {
        setError("Je bent niet ingelogd.");
        setLoading(false);
        return;
      }

      const response = await fetch("/api/account/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ confirmText: "VERWIJDER" }),
      });

      const payload = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;

      if (!response.ok) {
        setError(payload?.error || "Account verwijderen mislukt.");
        setLoading(false);
        return;
      }

      await supabase.auth.signOut();
      router.push("/login?deleted=1");
    } catch {
      setError("Account verwijderen mislukt. Probeer het opnieuw.");
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-red-500/25 bg-red-500/5 p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-bold text-app-text">Account verwijderen</p>
          <p className="mt-1 text-xs leading-relaxed text-app-muted">
            Verwijder je account en alle bijbehorende gegevens permanent. Zie ook
            ons{" "}
            <Link href="/privacy" className="font-semibold text-app-text underline">
              privacybeleid
            </Link>
            .
          </p>
        </div>
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="app-focus-ring inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-500/15 dark:text-red-300"
        >
          {expanded ? "Annuleren" : "Account verwijderen"}
        </button>
      </div>

      {expanded ? (
        <div className="mt-4 space-y-3 border-t border-red-500/20 pt-4">
          <p className="text-xs leading-relaxed text-app-muted">
            Dit verwijdert je profiel, trainingslogs, chatgeschiedenis en andere
            gegevens. Actieve coachingrelaties en openstaande taken worden ook
            beëindigd.
          </p>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-app-text">
              Typ <span className="font-mono">VERWIJDER</span> om te bevestigen
            </span>
            <input
              type="text"
              value={confirmText}
              onChange={(event) => setConfirmText(event.target.value)}
              autoComplete="off"
              spellCheck={false}
              className="profile-field-input w-full font-mono uppercase"
              placeholder="VERWIJDER"
            />
          </label>
          {error ? (
            <p className="text-xs font-medium text-red-600 dark:text-red-300">{error}</p>
          ) : null}
          <button
            type="button"
            disabled={!canDelete}
            onClick={() => void handleDelete()}
            className="app-focus-ring inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            {loading ? "Account wordt verwijderd…" : "Permanent verwijderen"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
