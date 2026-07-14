"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { loadCoachAthleteOverview } from "@/lib/coachAthleteOverview";
import { getApiAuthHeaders } from "@/lib/apiClient";
import { isDemoMode } from "@/lib/demo/demoMode";

type CoachAiCopilotWidgetProps = {
  coachId: string;
  role: string;
};

export default function CoachAiCopilotWidget({
  coachId,
  role,
}: CoachAiCopilotWidgetProps) {
  const [digest, setDigest] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const overview = await loadCoachAthleteOverview(coachId, role);
      const atRisk = overview.filter((a) => a.fillScore < 70);
      const lowFill = overview.filter((a) => a.fillScore < 90);

      const summary = [
        `Team: ${overview.length} atleten.`,
        atRisk.length > 0
          ? `Let op: ${atRisk.map((a) => `${a.fullName} (${a.fillScore}%)`).join(", ")}.`
          : "Geen atleten onder 70% invulscore.",
        lowFill.length > 0
          ? `${lowFill.length} atleet/atleten onder 90%.`
          : "Iedereen scoort 90%+.",
      ].join(" ");

      try {
        if (!isDemoMode()) {
          const response = await fetch("/api/coach-copilot", {
            method: "POST",
            headers: await getApiAuthHeaders({ "Content-Type": "application/json" }),
            body: JSON.stringify({ summary, athleteCount: overview.length }),
          });
          const payload = (await response.json()) as { digest?: string };
          setDigest(payload.digest || summary);
        } else {
          setDigest(summary);
        }
      } catch {
        setDigest(summary);
      }

      setLoading(false);
    }

    void load();
  }, [coachId, role]);

  return (
    <div className="app-card">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-app-muted">
            Team digest
          </p>
          <h3 className="text-lg font-bold text-app-text">Weekoverzicht</h3>
        </div>
        <Link href="/kennisbank?tab=vragen" className="text-xs font-semibold text-brand-purple hover:underline">
          AI-vragen →
        </Link>
      </div>

      {loading ? (
        <p className="mt-3 text-sm text-app-muted">Digest laden...</p>
      ) : (
        <p className="mt-3 whitespace-pre-wrap text-sm text-app-text">{digest}</p>
      )}
    </div>
  );
}
