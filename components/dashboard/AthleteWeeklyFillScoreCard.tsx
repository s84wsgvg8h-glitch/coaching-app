"use client";

import {
  formatFillScorePercentage,
  getAthleteDashboardFillScoreColorClass,
} from "@/lib/athleteFillScore";

type AthleteWeeklyFillScoreCardProps = {
  percentage: number | null;
  loading?: boolean;
};

function FillScoreProgressRing({
  value,
  colorClass,
}: {
  value: number;
  colorClass: string;
}) {
  const size = 52;
  const stroke = 4;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(100, Math.max(0, value)) / 100) * circumference;

  return (
    <div className={`athlete-dashboard-fill-ring ${colorClass}`} aria-hidden="true">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255, 255, 255, 0.08)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <span className={`athlete-dashboard-fill-ring-label ${colorClass}`}>
        {formatFillScorePercentage(value)}
      </span>
    </div>
  );
}

export default function AthleteWeeklyFillScoreCard({
  percentage,
  loading = false,
}: AthleteWeeklyFillScoreCardProps) {
  const hasScore = percentage !== null;
  const value = percentage ?? 0;
  const colorClass = hasScore
    ? getAthleteDashboardFillScoreColorClass(value)
    : "text-app-muted";

  if (loading) {
    return (
      <div className="athlete-dashboard-card athlete-dashboard-card--fill animate-pulse">
        <div className="h-3 w-24 rounded bg-app-surface-hover" />
        <div className="mt-4 flex justify-center">
          <div className="h-[52px] w-[52px] rounded-full bg-app-surface-hover" />
        </div>
      </div>
    );
  }

  return (
    <div className="athlete-dashboard-card athlete-dashboard-card--fill">
      <p className="athlete-dashboard-fill-card-title">Invulscore</p>
      <p className="athlete-dashboard-card-desc mt-1 hidden text-[13px] text-app-muted lg:block">
        Invulscore afgelopen 7 dagen
      </p>
      <div className="athlete-dashboard-fill-layout mt-3 lg:mt-4">
        {hasScore ? (
          <FillScoreProgressRing value={value} colorClass={colorClass} />
        ) : (
          <div className="athlete-dashboard-fill-ring text-app-muted" aria-hidden="true">
            <span className="athlete-dashboard-fill-ring-label">—</span>
          </div>
        )}
      </div>
    </div>
  );
}
