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
      className="app-focus-ring min-h-11 min-w-0 max-w-full rounded-xl border border-app-border bg-app-surface px-3 py-2 text-base text-app-text outline-none md:min-h-9 md:text-sm"
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
