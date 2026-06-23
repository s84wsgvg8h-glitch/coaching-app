"use client";

import type { LucideIcon } from "lucide-react";
import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import { Sparkline } from "@/components/statistics/dashboard/Sparkline";

export type AdminKpiCardProps = {
  label: string;
  value: string | number;
  changePct: number | null;
  sparkline: number[];
  sparkColor: string;
  icon: LucideIcon;
};

export default function AdminKpiCard({
  label,
  value,
  changePct,
  sparkline,
  sparkColor,
  icon: Icon,
}: AdminKpiCardProps) {
  const tone =
    changePct === null || changePct === 0
      ? "neutral"
      : changePct > 0
        ? "up"
        : "down";

  const changeLabel =
    changePct === null
      ? "—"
      : `${changePct > 0 ? "+" : ""}${changePct}%`;

  return (
    <div className="admin-kpi-card">
      <div className="admin-kpi-card-top">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <Icon className="h-3.5 w-3.5 shrink-0 text-app-muted" />
            <p className="admin-kpi-label">{label}</p>
          </div>
          <p className="admin-kpi-value">{value}</p>
          <div className="admin-kpi-change-row">
            <span className={`admin-kpi-change admin-kpi-change--${tone}`}>
              {tone === "up" ? (
                <TrendingUp className="h-3 w-3" />
              ) : tone === "down" ? (
                <TrendingDown className="h-3 w-3" />
              ) : (
                <Minus className="h-3 w-3" />
              )}
              {changeLabel}
            </span>
            <span className="admin-kpi-period">vs. vorige 7 dagen</span>
          </div>
        </div>
      </div>
      <div className="admin-kpi-sparkline">
        <Sparkline data={sparkline} color={sparkColor} />
      </div>
    </div>
  );
}
