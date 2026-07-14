"use client";

import { SkeletonCard } from "@/components/ui/Skeleton";
import { SectionHeader } from "@/components/ui/design-system";
import { useTeamFillScores } from "@/hooks/useTeamFillScores";
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
  const { data: rows = [], isLoading } = useTeamFillScores(
    coachId,
    isAdminRole(role),
  );

  if (isLoading) {
    return <SkeletonCard />;
  }

  const total = rows.length;
  const activeCount = rows.filter((row) => row.fillScore >= 70).length;
  const atRiskCount = rows.filter(
    (row) => row.fillScore > 0 && row.fillScore < 50,
  ).length;
  const avgFill = total
    ? Math.round(rows.reduce((sum, row) => sum + row.fillScore, 0) / total)
    : 0;
  const missedCheckIns = Math.max(total - activeCount, 0);

  return (
    <div className="ui-panel dashboard-cockpit-retention-panel h-full">
      <SectionHeader
        title="Retentie & engagement"
        description="Team gezondheid op basis van invulscore"
      />
      <div className="grid min-h-0 flex-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="mb-1 flex items-end justify-between gap-2">
            <p className="text-[11px] font-medium text-app-muted">
              Gem. invulscore
            </p>
            <p className="text-lg font-semibold leading-none text-app-text">
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
