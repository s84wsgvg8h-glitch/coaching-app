"use client";

import type { ReactNode } from "react";

type MiniMetricCardProps = {
  title: string;
  value: string;
  change: string;
  changeTone?: "up" | "down" | "neutral" | "risk";
  children: ReactNode;
  onClick?: () => void;
};

export default function MiniMetricCard({
  title,
  value,
  change,
  changeTone = "up",
  children,
  onClick,
}: MiniMetricCardProps) {
  const toneClass =
    changeTone === "up"
      ? "text-emerald-400"
      : changeTone === "down" || changeTone === "risk"
        ? "text-orange-400"
        : "text-app-muted";

  return (
    <div
      className={`rounded-2xl border border-app-border bg-app-surface p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] ${
        onClick
          ? "app-focus-ring cursor-pointer transition hover:border-app-border-strong hover:bg-app-surface-hover"
          : ""
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
      <p className="text-[11px] font-medium uppercase tracking-wide text-app-subtle">
        {title}
      </p>
      <p className="mt-2 text-[22px] font-semibold leading-none tracking-tight text-app-text">{value}</p>
      <p className={`mt-1 text-xs font-medium ${toneClass}`}>{change}</p>
      <div className="mt-3">{children}</div>
    </div>
  );
}
