"use client";

import type { DailyTrackingCell } from "@/lib/athleteOverviewDailyTracking";

type AthleteDailyTrackingGridProps = {
  fillScoreByDay: Record<number, DailyTrackingCell>;
  bodyweightByDay: Record<number, DailyTrackingCell>;
  fillScoreValueByDay?: Record<number, number | null>;
  bodyweightValueByDay?: Record<number, number | null>;
  daysInMonth: number;
  todayDay: number;
  mode: "fillScore" | "bodyweight";
};

function formatFillScore(value: number | null | undefined) {
  if (value === null || value === undefined) return null;
  return `${Math.round(value)}`;
}

function formatBodyweight(value: number | null | undefined) {
  if (value === null || value === undefined) return null;
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function renderCell(
  status: DailyTrackingCell,
  mode: "fillScore" | "bodyweight",
  value: number | null | undefined,
) {
  const label =
    mode === "fillScore" ? formatFillScore(value) : formatBodyweight(value);

  if (label) {
    return (
      <span
        className={`text-[8px] font-semibold leading-none tabular-nums ${
          status === "warn"
            ? "text-amber-400"
            : status === "ok"
              ? "text-emerald-400"
              : "text-app-muted"
        }`}
      >
        {label}
      </span>
    );
  }

  if (mode === "fillScore" && status === "warn") {
    return (
      <span className="text-[9px] font-bold leading-none text-amber-400">!</span>
    );
  }

  if (mode === "bodyweight" && status === "warn") {
    return <span className="h-1.5 w-1.5 rounded-full bg-amber-400/70" />;
  }

  if (status === "ok") {
    return <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />;
  }

  return null;
}

export default function AthleteDailyTrackingGrid({
  fillScoreByDay,
  bodyweightByDay,
  fillScoreValueByDay = {},
  bodyweightValueByDay = {},
  daysInMonth,
  todayDay,
  mode,
}: AthleteDailyTrackingGridProps) {
  const byDay = mode === "fillScore" ? fillScoreByDay : bodyweightByDay;
  const valuesByDay =
    mode === "fillScore" ? fillScoreValueByDay : bodyweightValueByDay;

  return (
    <div className="overflow-x-auto">
      <div
        className="grid gap-px"
        style={{
          gridTemplateColumns: `repeat(${daysInMonth}, minmax(28px, 1fr))`,
        }}
      >
        {Array.from({ length: daysInMonth }, (_, index) => {
          const day = index + 1;
          const isToday = day === todayDay;
          const status = byDay[day] || "empty";

          return (
            <div
              key={day}
              className={`flex h-9 min-w-[28px] items-center justify-center border-l border-app-border/20 first:border-l-0 ${
                isToday ? "bg-app-accent/10" : ""
              }`}
              title={
                mode === "fillScore"
                  ? `Dag ${day}${valuesByDay[day] != null ? `: ${Math.round(valuesByDay[day] as number)}%` : ""}`
                  : `Dag ${day}${valuesByDay[day] != null ? `: ${valuesByDay[day]} kg` : ""}`
              }
            >
              {renderCell(status, mode, valuesByDay[day])}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function AthleteDailyTrackingHeader({
  daysInMonth,
  todayDay,
}: {
  daysInMonth: number;
  todayDay: number;
}) {
  return (
    <div className="overflow-x-auto">
      <div
        className="grid gap-px"
        style={{
          gridTemplateColumns: `repeat(${daysInMonth}, minmax(28px, 1fr))`,
        }}
      >
        {Array.from({ length: daysInMonth }, (_, index) => {
          const day = index + 1;
          const isToday = day === todayDay;

          return (
            <div
              key={day}
              className={`flex h-6 min-w-[28px] flex-col items-center justify-center border-l border-app-border/20 first:border-l-0 ${
                isToday ? "rounded-full bg-app-accent/15" : ""
              }`}
            >
              {isToday ? (
                <span className="text-[8px] font-semibold uppercase leading-none text-app-accent">
                  nu
                </span>
              ) : null}
              <span
                className={`text-[9px] tabular-nums ${
                  isToday
                    ? "font-bold text-app-accent"
                    : "font-medium text-app-subtle"
                }`}
              >
                {day}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
