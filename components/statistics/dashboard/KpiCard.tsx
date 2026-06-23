"use client";

import { Sparkline } from "@/components/statistics/dashboard/Sparkline";

type KpiCardProps = {
  label: string;
  value: string;
  change: string;
  changeTone?: "up" | "down" | "neutral" | "risk";
  sparkline: number[];
  sparkColor: string;
  sparkVariant?: "line" | "bar";
  onClick?: () => void;
};

export default function KpiCard({
  label,
  value,
  change,
  changeTone = "neutral",
  sparkline,
  sparkColor,
  sparkVariant = "line",
  onClick,
}: KpiCardProps) {
  const toneClass =
    changeTone === "up"
      ? "text-emerald-400"
      : changeTone === "down" || changeTone === "risk"
        ? "text-orange-400"
        : "text-app-muted";

  return (
    <div
      className={`rounded-2xl border border-white/10 bg-[#0d1118] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_12px_40px_rgba(0,0,0,0.22)] ${
        onClick ? "cursor-pointer transition hover:border-white/20 hover:bg-[#10151f]" : ""
      }`}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-app-muted">
        {label}
      </p>
      <p className="mt-3 text-[30px] font-semibold leading-none tracking-tight text-app-text">
        {value}
      </p>
      <p className={`mt-2 text-xs font-medium ${toneClass}`}>{change}</p>
      <div className="mt-4">
        <Sparkline data={sparkline} color={sparkColor} variant={sparkVariant} />
      </div>
    </div>
  );
}
