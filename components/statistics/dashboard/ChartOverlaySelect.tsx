"use client";

import {
  CHART_OVERLAY_OPTIONS,
  type ChartOverlayMetric,
} from "@/lib/statisticsChartOverlay";

export default function ChartOverlaySelect({
  value,
  onChange,
  exclude = [],
}: {
  value: ChartOverlayMetric;
  onChange: (metric: ChartOverlayMetric) => void;
  exclude?: ChartOverlayMetric[];
}) {
  const options = CHART_OVERLAY_OPTIONS.filter(
    (option) => !exclude.includes(option.value),
  );

  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value as ChartOverlayMetric)}
      className="rounded-xl border border-white/10 bg-[#111827] px-3 py-2 text-sm text-app-text outline-none focus:ring-2 focus:ring-brand-purple/40"
      aria-label="Overlay grafiek"
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
