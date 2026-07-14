"use client";

import { useState } from "react";
import { Scale } from "lucide-react";
import { logQuickBodyweight } from "@/lib/athleteBwLog";
import { trackEvent } from "@/lib/analytics";

type QuickBodyweightLogProps = {
  athleteId: string;
  compact?: boolean;
  variant?: "default" | "athlete";
};

export default function QuickBodyweightLog({
  athleteId,
  compact = false,
  variant = "default",
}: QuickBodyweightLogProps) {
  const [bw, setBw] = useState("");
  const [saving, setSaving] = useState(false);
  const [lastLogged, setLastLogged] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleBwChange(value: string) {
    // Only allow digits, dots and commas — prevents accidental "82k,5" input.
    const filtered = value.replace(/[^0-9.,]/g, "");
    setBw(filtered);
  }

  async function handleSave() {
    const parsed = Number.parseFloat(bw.replace(",", "."));
    if (!Number.isFinite(parsed) || parsed <= 0) return;

    setSaving(true);
    setError(null);
    const { ok, error: saveError } = await logQuickBodyweight(athleteId, parsed);
    setSaving(false);

    if (!ok || saveError) {
      setError(saveError || "Bodyweight kon niet worden opgeslagen.");
      return;
    }

    setLastLogged(`${parsed} kg`);
    setBw("");
    trackEvent("bodyweight_logged", { valueKg: parsed });
  }

  if (variant === "athlete") {
    return (
      <div className="athlete-dashboard-card athlete-dashboard-card--bw">
        <p className="athlete-dashboard-eyebrow athlete-dashboard-eyebrow--with-icon">
          <Scale className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          Snelle BW-log
        </p>
        <p className="athlete-dashboard-card-desc mt-1 hidden text-[13px] text-app-muted lg:block">
          Log bodyweight los van je programmadag.
        </p>
        <div className="athlete-dashboard-bw-row mt-3 lg:mt-4">
          <div className="athlete-dashboard-bw-input-shell min-w-0 flex-1">
            <input
              value={bw}
              onChange={(event) => handleBwChange(event.target.value)}
              placeholder="-"
              inputMode="decimal"
              aria-label="Bodyweight in kg"
              className="athlete-dashboard-bw-value-input min-w-0 flex-1"
            />
            <span className="athlete-dashboard-bw-unit shrink-0" aria-hidden="true">
              kg
            </span>
          </div>
          <button
            type="button"
            disabled={saving || !bw.trim()}
            onClick={() => void handleSave()}
            className="athlete-dashboard-log-btn athlete-dashboard-log-btn--compact shrink-0 disabled:opacity-45"
          >
            {saving ? "…" : "Log"}
          </button>
        </div>
        {lastLogged ? (
          <p className="sr-only" aria-live="polite">
            Opgeslagen: {lastLogged}
          </p>
        ) : null}
        {error ? (
          <p className="athlete-inline-toast athlete-inline-toast--error" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div
      className={
        compact
          ? "rounded-xl border border-app-border bg-app-surface p-3"
          : "app-card"
      }
    >
      <p className="text-sm font-bold text-app-text">Snelle BW-log</p>
      <p className="mt-1 text-xs text-app-muted">
        Log bodyweight los van je programmadag.
      </p>
      <div className="mt-3 flex gap-2">
        <input
          value={bw}
          onChange={(event) => handleBwChange(event.target.value)}
          placeholder="-"
          inputMode="decimal"
          className="w-full rounded-xl border border-app-border px-3 py-2 text-sm"
        />
        <button
          type="button"
          disabled={saving || !bw.trim()}
          onClick={() => void handleSave()}
          className="app-btn-primary shrink-0 disabled:opacity-50"
        >
          {saving ? "…" : "Log"}
        </button>
      </div>
      {lastLogged ? (
        <p className="mt-2 text-xs font-semibold text-emerald-400">
          Opgeslagen: {lastLogged}
        </p>
      ) : null}
    </div>
  );
}
