"use client";

import { useMemo } from "react";
import { Activity } from "lucide-react";
import { useTeamEngagementScore } from "@/hooks/useTeamEngagementScore";

type TeamEngagementWidgetProps = {
  coachId: string;
  role: string;
  variant?: "square" | "kpi";
};

function buildSparklinePath(points: number[], width: number, height: number) {
  if (points.length === 0) {
    return { line: "", peak: null as null | { x: number; y: number } };
  }

  const max = 10;
  const min = 0;
  const coords = points.map((value, index) => {
    const x = points.length === 1 ? width / 2 : (index / (points.length - 1)) * width;
    const y = height - ((value - min) / (max - min)) * (height - 6) - 3;
    return { x, y };
  });

  const line = coords
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(" ");

  return { line, peak: coords[coords.length - 1] ?? null };
}

export default function TeamEngagementWidget({
  coachId,
  role,
  variant = "square",
}: TeamEngagementWidgetProps) {
  const { data, isPending } = useTeamEngagementScore(coachId, role);
  const loading = isPending && !data;

  const score = data?.score ?? 0;
  const history = data?.history ?? [];
  const sparkline = useMemo(
    () => buildSparklinePath(history, 100, 42),
    [history],
  );

  const trendLabel =
    history.length >= 2
      ? `${(history[history.length - 1] - history[history.length - 2]).toFixed(1)} t.o.v. vorige maand`
      : "Team engagement";

  if (variant === "kpi") {
    return (
      <div className="dashboard-kpi-card dashboard-kpi-card--v2 dashboard-kpi-card--chart dashboard-kpi-card--purple">
        <span className="dashboard-kpi-accent" aria-hidden="true" />
        <svg
          viewBox="0 0 100 42"
          preserveAspectRatio="none"
          className="team-engagement-chart"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="engagement-line" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="rgba(61, 139, 255, 0.35)" />
              <stop offset="100%" stopColor="rgba(120, 180, 255, 0.95)" />
            </linearGradient>
          </defs>
          {sparkline.line ? (
            <path
              d={sparkline.line}
              fill="none"
              stroke="url(#engagement-line)"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="drop-shadow(0 0 6px rgba(61, 139, 255, 0.55))"
            />
          ) : null}
        </svg>
        <div className="dashboard-kpi-inner team-engagement-score">
          <div className="dashboard-kpi-top">
            <span className="dashboard-kpi-icon-wrap">
              <Activity className="h-4 w-4" strokeWidth={1.75} />
            </span>
            <p className="dashboard-kpi-label">Team betrokkenheid</p>
          </div>
          <p className="dashboard-kpi-value">
            {loading ? "…" : score.toFixed(1)}
            {!loading ? (
              <span className="dashboard-kpi-value-suffix">/10</span>
            ) : null}
          </p>
          {!loading ? (
            <p className="dashboard-kpi-hint">{trendLabel}</p>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="team-engagement-card glass-accent-card">
      <svg
        viewBox="0 0 100 42"
        preserveAspectRatio="none"
        className="team-engagement-chart"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="engagement-line-square" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="rgba(79, 140, 255, 0.35)" />
            <stop offset="100%" stopColor="rgba(120, 180, 255, 0.95)" />
          </linearGradient>
        </defs>
        {sparkline.line ? (
          <path
            d={sparkline.line}
            fill="none"
            stroke="url(#engagement-line-square)"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="drop-shadow(0 0 6px rgba(79, 140, 255, 0.55))"
          />
        ) : null}
      </svg>

      <div className="team-engagement-score">
        <p className="text-[8px] font-medium uppercase tracking-wide text-app-subtle">
          Team betrokkenheid
        </p>
        <p className="mt-0.5 text-[23px] font-semibold leading-none tracking-tight text-app-text tabular-nums">
          {loading ? "…" : score.toFixed(1)}
          {!loading ? (
            <span className="ml-0.5 text-[14px] font-medium text-app-muted">/10</span>
          ) : null}
        </p>
      </div>
    </div>
  );
}
