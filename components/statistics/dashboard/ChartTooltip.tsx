"use client";

import type { E1rmChartPoint } from "@/lib/statisticsE1rm";

type TooltipEntry = {
  color?: string;
  name?: string;
  dataKey?: string | number;
  value?: number | string;
  payload?: E1rmChartPoint;
};

export default function ChartTooltip({
  active,
  payload,
  valueSuffix = "kg",
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  valueSuffix?: string;
}) {
  if (!active || !payload?.length) return null;

  const point = payload[0]?.payload;
  if (!point) return null;

  return (
    <div className="rounded-xl border border-white/10 bg-[#111827] px-3 py-2.5 shadow-2xl">
      <p className="text-xs font-semibold text-white">
        {point.shortBlockLabel} · {point.weekLabel}
      </p>
      {point.date ? (
        <p className="mt-0.5 text-[11px] text-app-muted">{point.date}</p>
      ) : null}
      <div className="mt-2 space-y-1.5">
        {payload.map((entry) => {
          const liftName = String(entry.name || entry.dataKey || "");
          const suffix = valueSuffix ? ` ${valueSuffix}` : "";

          return (
            <div key={liftName} className="flex items-center gap-2 text-xs">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: entry.color || "#a78bfa" }}
              />
              <span className="text-app-muted">{liftName}</span>
              <span className="ml-auto font-medium text-white">
                {entry.value}
                {suffix}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
