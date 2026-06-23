"use client";

import { useState } from "react";
import { Scale } from "lucide-react";
import { logQuickBodyweight } from "@/lib/athleteBwLog";

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

  async function handleSave() {
    const parsed = Number.parseFloat(bw.replace(",", "."));
    if (!Number.isFinite(parsed) || parsed <= 0) return;

    setSaving(true);
    const { ok, error } = await logQuickBodyweight(athleteId, parsed);
    setSaving(false);

    if (!ok || error) {
      alert(error || "Bodyweight kon niet worden opgeslagen.");
      return;
    }

    setLastLogged(`${parsed} kg`);
    setBw("");
  }

  if (variant === "athlete") {
    return (
      <div className="athlete-dashboard-card">
        <div className="flex items-center gap-2">
          <Scale className="h-4 w-4 text-app-muted" aria-hidden="true" />
          <h2 className="text-[15px] font-semibold text-app-text">
            Snelle BW-log
          </h2>
        </div>
        <p className="mt-2 text-[13px] text-app-muted">
          Log bodyweight los van je programmadag.
        </p>
        <div className="mt-4 flex gap-2">
          <input
            value={bw}
            onChange={(event) => setBw(event.target.value)}
            placeholder="82,5"
            inputMode="decimal"
            className="athlete-dashboard-input min-w-0 flex-1"
          />
          <button
            type="button"
            disabled={saving || !bw.trim()}
            onClick={() => void handleSave()}
            className="athlete-dashboard-log-btn shrink-0 disabled:opacity-45"
          >
            {saving ? "…" : "Log"}
          </button>
        </div>
        {lastLogged ? (
          <p className="mt-2 text-[12px] font-medium text-emerald-400">
            Opgeslagen: {lastLogged}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div
      className={
        compact
          ? "rounded-xl border border-app-border bg-white p-3"
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
          onChange={(event) => setBw(event.target.value)}
          placeholder="82,5"
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
        <p className="mt-2 text-xs font-semibold text-emerald-700">
          Opgeslagen: {lastLogged}
        </p>
      ) : null}
    </div>
  );
}
