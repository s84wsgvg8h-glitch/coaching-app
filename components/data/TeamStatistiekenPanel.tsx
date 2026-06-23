"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { loadCoachAthleteOverview } from "@/lib/coachAthleteOverview";
import { formatFillScorePercentage } from "@/lib/athleteFillScore";

type TeamStatistiekenPanelProps = {
  coachId: string;
  role: string;
};

export default function TeamStatistiekenPanel({
  coachId,
  role,
}: TeamStatistiekenPanelProps) {
  const [loading, setLoading] = useState(true);
  const [avgFill, setAvgFill] = useState(0);
  const [athleteCount, setAthleteCount] = useState(0);
  const [atRiskCount, setAtRiskCount] = useState(0);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const rows = await loadCoachAthleteOverview(coachId, role);
      const avg =
        rows.length > 0
          ? Math.round(
              rows.reduce((sum, row) => sum + row.fillScore, 0) / rows.length,
            )
          : 0;
      setAvgFill(avg);
      setAthleteCount(rows.length);
      setAtRiskCount(rows.filter((row) => row.fillScore < 70).length);
      setLoading(false);
    }

    void load();
  }, [coachId, role]);

  if (loading) {
    return (
      <div className="app-card">
        <p className="text-sm text-app-muted">Teamstatistieken laden...</p>
      </div>
    );
  }

  return (
    <div className="app-card">
      <h2 className="text-lg font-bold text-app-text">Teamstatistieken</h2>
      <p className="mt-1 text-sm text-app-muted">
        Invulscore afgelopen 30 dagen (maand)
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-app-muted">
            Gem. invulscore
          </p>
          <p className="mt-1 text-2xl font-bold text-app-text">
            {formatFillScorePercentage(avgFill)}
          </p>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-app-muted">
            Atleten
          </p>
          <p className="mt-1 text-2xl font-bold text-app-text">{athleteCount}</p>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-app-muted">
            At-risk (&lt;70%)
          </p>
          <p className="mt-1 text-2xl font-bold text-red-600">{atRiskCount}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Link href="/athletes" className="app-btn-secondary text-xs">
          Invulscore
        </Link>
        <Link href="/athletes" className="app-btn-secondary text-xs">
          Atleten overzicht
        </Link>
        <Link href="/leaderboard" className="app-btn-secondary text-xs">
          Leaderboard
        </Link>
      </div>
    </div>
  );
}
