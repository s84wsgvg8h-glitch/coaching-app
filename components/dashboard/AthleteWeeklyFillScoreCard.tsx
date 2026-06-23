"use client";

import { Check } from "lucide-react";
import {
  formatFillScorePercentage,
  getFillScoreColorClass,
} from "@/lib/athleteFillScore";

type AthleteWeeklyFillScoreCardProps = {
  percentage: number | null;
  loading?: boolean;
};

export default function AthleteWeeklyFillScoreCard({
  percentage,
  loading = false,
}: AthleteWeeklyFillScoreCardProps) {
  const value = percentage ?? 100;
  const colorClass = getFillScoreColorClass(value);

  if (loading) {
    return (
      <div className="athlete-dashboard-card athlete-dashboard-card--fill animate-pulse">
        <div className="h-20 rounded-xl bg-white/5" />
      </div>
    );
  }

  return (
    <div className="athlete-dashboard-card athlete-dashboard-card--fill">
      <p className="athlete-dashboard-eyebrow">Weekly fill score</p>
      <p className="mt-1 text-[13px] text-app-muted">
        Invulscore afgelopen 7 dagen
      </p>
      <div className="mt-4 flex items-center justify-between gap-2">
        <p
          className={`athlete-dashboard-fill-value text-[42px] font-semibold leading-none tracking-tight ${colorClass}`}
        >
          {formatFillScorePercentage(value)}
        </p>
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
            value >= 80
              ? "bg-emerald-500/15 text-emerald-400"
              : "bg-white/6 text-app-muted"
          }`}
          aria-hidden="true"
        >
          <Check className="h-5 w-5" strokeWidth={2.5} />
        </div>
      </div>
    </div>
  );
}
