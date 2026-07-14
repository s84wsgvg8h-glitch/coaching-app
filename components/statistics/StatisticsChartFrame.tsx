"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { MoreVertical, X } from "lucide-react";
import {
  CHART_BLOCK_FILTER_OPTIONS,
  type ChartBlockFilterPreset,
} from "@/lib/statisticsChartFilters";
import {
  CHART_OVERLAY_OPTIONS,
  getOverlayLabel,
  type ChartOverlayMetric,
} from "@/lib/statisticsChartOverlay";
import {
  E1RM_CHART_MODE_OPTIONS,
  type E1rmChartMode,
} from "@/lib/statisticsE1rm";

export type StatisticsAxisPoint = {
  blockId: string;
  weekNumber: number;
  weekLabel: string;
  weekKey: string;
  shortBlockLabel: string;
};

type StatisticsChartFrameProps = {
  title: string;
  subtitle?: string;
  filter: ChartBlockFilterPreset;
  onFilterChange: (preset: ChartBlockFilterPreset) => void;
  axisData: StatisticsAxisPoint[];
  onRemove?: () => void;
  exerciseSelector?: ReactNode;
  heightClass?: string;
  showPeriodControl?: boolean;
  controls?: ReactNode;
  children: ReactNode;
  supportsOverlay?: boolean;
  overlayMetric?: ChartOverlayMetric;
  onOverlayChange?: (metric: ChartOverlayMetric) => void;
  overlayExclude?: ChartOverlayMetric[];
  chartMode?: E1rmChartMode;
  onChartModeChange?: (mode: E1rmChartMode) => void;
};

function BlockSpanFooter({ data }: { data: StatisticsAxisPoint[] }) {
  if (data.length === 0) return null;

  const spans: Array<{ blockId: string; label: string; count: number }> = [];

  for (const point of data) {
    const last = spans[spans.length - 1];
    if (last && last.blockId === point.blockId) {
      last.count += 1;
      continue;
    }

    spans.push({
      blockId: point.blockId,
      label: point.shortBlockLabel,
      count: 1,
    });
  }

  return (
    <div className="pl-[44px] pr-2">
      <div className="flex border-t border-app-border/20">
        {spans.map((span) => (
          <div
            key={`${span.blockId}-${span.count}`}
            className="border-r border-dashed border-app-border/30 pt-1 text-center text-[10px] font-medium text-app-muted last:border-r-0"
            style={{ width: `${(span.count / data.length) * 100}%` }}
          >
            {span.label}
          </div>
        ))}
      </div>
    </div>
  );
}

function MenuSection({ label }: { label: string }) {
  return (
    <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wide text-app-muted">
      {label}
    </p>
  );
}

export default function StatisticsChartFrame({
  title,
  subtitle,
  filter,
  onFilterChange,
  axisData,
  onRemove,
  exerciseSelector,
  heightClass = "h-[280px]",
  showPeriodControl = true,
  controls,
  children,
  supportsOverlay = false,
  overlayMetric = "none",
  onOverlayChange,
  overlayExclude = [],
  chartMode,
  onChartModeChange,
}: StatisticsChartFrameProps) {
  const [hovered, setHovered] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;

    function handlePointerDown(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [menuOpen]);

  const overlayOptions = CHART_OVERLAY_OPTIONS.filter(
    (option) => !overlayExclude.includes(option.value),
  );

  const modeLabel = chartMode
    ? E1RM_CHART_MODE_OPTIONS.find((option) => option.value === chartMode)?.label
    : null;

  return (
    <div
      className="group relative rounded-2xl border border-app-border/80 bg-[#0d1118] p-4 shadow-[0_12px_40px_rgba(0,0,0,0.22)]"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {onRemove && hovered ? (
        <button
          type="button"
          onClick={onRemove}
          className="absolute right-3 top-3 z-10 flex h-7 w-7 items-center justify-center rounded-lg border border-app-border bg-app-surface text-app-muted transition hover:bg-red-500/10 hover:text-red-400"
          aria-label={`Verwijder ${title}`}
        >
          <X className="h-4 w-4" />
        </button>
      ) : null}

      <div className="mb-3 flex items-start justify-between gap-2 pr-8">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[15px] font-semibold text-app-text">{title}</h3>
          {subtitle ? (
            <p className="mt-1 text-xs text-app-muted">{subtitle}</p>
          ) : null}
          {modeLabel ? (
            <p className="mt-1 text-[11px] text-app-muted">{modeLabel}</p>
          ) : null}
          {supportsOverlay && overlayMetric !== "none" ? (
            <p className="mt-1 text-[11px] text-orange-400">
              Overlay: {getOverlayLabel(overlayMetric)}
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {controls}
          {showPeriodControl ? (
            <select
              value={filter}
              onChange={(event) =>
                onFilterChange(event.target.value as ChartBlockFilterPreset)
              }
              className="max-w-[132px] rounded-xl border border-app-border bg-app-surface px-2.5 py-2 text-xs text-app-text outline-none focus:ring-2 focus:ring-brand-purple/40"
              aria-label="Block filter"
            >
              {CHART_BLOCK_FILTER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          ) : null}

          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-app-border bg-app-surface text-app-muted transition hover:text-app-text"
              aria-label="Grafiek opties"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
            {menuOpen ? (
              <div className="absolute right-0 z-20 mt-2 max-h-[min(70vh,420px)] min-w-[220px] overflow-y-auto rounded-xl border border-white/10 bg-[#111827] p-1 shadow-xl">
                {onChartModeChange && chartMode ? (
                  <>
                    <MenuSection label="Weergave" />
                    {E1RM_CHART_MODE_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        className={`flex w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-app-surface-hover ${
                          chartMode === option.value
                            ? "text-brand-purple"
                            : "text-app-text"
                        }`}
                        onClick={() => {
                          onChartModeChange(option.value);
                          setMenuOpen(false);
                        }}
                      >
                        {option.label}
                      </button>
                    ))}
                  </>
                ) : null}
                {supportsOverlay && onOverlayChange ? (
                  <>
                    <MenuSection label="Overlay" />
                    {overlayOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        className={`flex w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-app-surface-hover ${
                          overlayMetric === option.value
                            ? "text-orange-400"
                            : "text-app-text"
                        }`}
                        onClick={() => {
                          onOverlayChange(option.value);
                          setMenuOpen(false);
                        }}
                      >
                        {option.label}
                      </button>
                    ))}
                  </>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {exerciseSelector ? <div className="mb-3">{exerciseSelector}</div> : null}

      <div className={heightClass}>{children}</div>
      <BlockSpanFooter data={axisData} />
    </div>
  );
}
