"use client";

import { useEffect, useState } from "react";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { SectionHeader } from "@/components/ui/design-system";
import { loadTeamFillScores } from "@/lib/athleteFillScoreHistory";
import { isAdminRole } from "@/lib/authRoles";

type RetentionStatsWidgetProps = {
  coachId: string;
  role: string;
};

function ProgressBar({
  value,
  tone = "accent",
}: {
  value: number;
  tone?: "accent" | "success" | "warning" | "danger";
}) {
  const toneClass =
    tone === "success"
      ? "bg-emerald-500"
      : tone === "warning"
        ? "bg-amber-400"
        : tone === "danger"
          ? "bg-red-500"
          : "bg-app-accent";

  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-app-surface-hover">
      <div
        className={`h-full rounded-full transition-all duration-500 ${toneClass}`}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}

export default function RetentionStatsWidget({
  coachId,
  role,
}: RetentionStatsWidgetProps) {
  const [loading, setLoading] = useState(true);
  const [avgFill, setAvgFill] = useState(0);
  const [activeCount, setActiveCount] = useState(0);
  const [atRiskCount, setAtRiskCount] = useState(0);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const rows = await loadTeamFillScores(coachId, isAdminRole(role));
      setTotal(rows.length);
      setActiveCount(rows.filter((row) => row.fillScore >= 70).length);
      setAtRiskCount(
        rows.filter((row) => row.fillScore > 0 && row.fillScore < 50).length,
      );
      setAvgFill(
        rows.length
          ? Math.round(
              rows.reduce((sum, row) => sum + row.fillScore, 0) / rows.length,
            )
          : 0,
      );
      setLoading(false);
    }
    void load();
  }, [coachId, role]);

  if (loading) {
    return <SkeletonCard />;
  }

  const missedCheckIns = Math.max(total - activeCount, 0);

  return (
    <div className="ui-panel">
      <SectionHeader
        title="Retentie & engagement"
        description="Team gezondheid op basis van invulscore"
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <div className="mb-2 flex items-end justify-between gap-2">
            <p className="text-[12px] font-medium text-app-muted">
              Gem. invulscore
            </p>
            <p className="text-[22px] font-semibold leading-none text-app-text">
              {avgFill}%
            </p>
          </div>
          <ProgressBar value={avgFill} tone={avgFill >= 70 ? "success" : "warning"} />
        </div>
        <div>
          <div className="mb-2 flex items-end justify-between gap-2">
            <p className="text-[12px] font-medium text-app-muted">
              Actieve atleten
            </p>
            <p className="text-[22px] font-semibold leading-none text-app-text">
              {activeCount}
              <span className="text-[13px] font-normal text-app-muted">
                /{total}
              </span>
            </p>
          </div>
          <ProgressBar
            value={total ? (activeCount / total) * 100 : 0}
            tone="success"
          />
        </div>
        <div>
          <div className="mb-2 flex items-end justify-between gap-2">
            <p className="text-[12px] font-medium text-app-muted">
              At-risk atleten
            </p>
            <p className="text-[22px] font-semibold leading-none text-amber-400">
              {atRiskCount}
            </p>
          </div>
          <ProgressBar
            value={total ? (atRiskCount / total) * 100 : 0}
            tone="warning"
          />
        </div>
        <div>
          <div className="mb-2 flex items-end justify-between gap-2">
            <p className="text-[12px] font-medium text-app-muted">
              Gemiste check-ins
            </p>
            <p className="text-[22px] font-semibold leading-none text-red-400">
              {missedCheckIns}
            </p>
          </div>
          <ProgressBar
            value={total ? (missedCheckIns / total) * 100 : 0}
            tone="danger"
          />
        </div>
      </div>
    </div>
  );
}
