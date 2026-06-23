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
      className="rounded-xl border border-white/10 bg-[#111827] px-3 py-2 text-sm text-app-text outline-none focus:ring-2 focus:ring-brand-purple/40"
    >
      {E1RM_CHART_MODE_OPTIONS.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
