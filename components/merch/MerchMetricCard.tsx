"use client";

import type { LucideIcon } from "lucide-react";

type MerchMetricCardProps = {
  label: string;
  value: string | number;
  sub?: string | null;
  subUp?: boolean;
  icon: LucideIcon;
  tone?: string;
  bg?: string;
};

export default function MerchMetricCard({
  label,
  value,
  sub,
  subUp,
  icon: Icon,
  tone = "text-sky-400",
  bg = "bg-sky-500/10",
}: MerchMetricCardProps) {
  return (
    <article
      className="rounded-2xl border border-app-border/80 bg-[#161B22]/80 p-4 backdrop-blur-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[12px] text-app-muted">{label}</p>
          <p className="mt-1 text-[26px] font-bold leading-none text-app-text">
            {value}
          </p>
          {sub ? (
            <p
              className={`mt-1 text-[11px] ${
                subUp === false
                  ? "text-red-400"
                  : subUp
                    ? "text-emerald-400"
                    : "text-app-muted"
              }`}
            >
              {sub}
            </p>
          ) : null}
        </div>
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${bg}`}
        >
          <Icon className={`h-5 w-5 ${tone}`} />
        </div>
      </div>
    </article>
  );
}
