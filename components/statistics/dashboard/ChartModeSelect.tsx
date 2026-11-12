"use client";

import {
  E1RM_CHART_MODE_OPTIONS,
  type E1rmChartMode,
} from "@/lib/statisticsE1rm";

export default function ChartModeSelect({
  value,
  onChange,
}: {
  value: E1rmChartMode;
  onChange: (mode: E1rmChartMode) => void;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value as E1rmChartMode)}
      className="app-focus-ring min-h-11 min-w-0 max-w-full rounded-xl border border-app-border bg-app-surface px-3 py-2 text-base text-app-text outline-none md:min-h-9 md:text-sm"
    >
      {E1RM_CHART_MODE_OPTIONS.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
