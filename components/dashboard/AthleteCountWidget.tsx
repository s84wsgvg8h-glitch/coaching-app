"use client";

import Link from "next/link";

type AthleteCountWidgetProps = {
  count: number;
  activeCount?: number;
};

export default function AthleteCountWidget({
  count,
  activeCount,
}: AthleteCountWidgetProps) {
  const active = activeCount ?? count;

  return (
    <Link
      href="/athletes"
      className="dashboard-metric-card glass-accent-card app-focus-ring"
      aria-label="Atleten"
    >
      <div className="dashboard-metric-card-body">
        <p className="text-[8px] font-medium uppercase tracking-wide text-app-subtle">
          Atleten
        </p>
        <p className="mt-0.5 text-[23px] font-semibold leading-none tracking-tight text-app-text tabular-nums">
          {count}
        </p>
        <p className="mt-1 text-[9px] font-medium text-app-muted">
          {active} actief
        </p>
      </div>
    </Link>
  );
}
