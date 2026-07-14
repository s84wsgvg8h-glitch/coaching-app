"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Maximize2, MoreVertical, RotateCcw, Table, X } from "lucide-react";
import {
  CHART_OVERLAY_OPTIONS,
  getOverlayLabel,
  type ChartOverlayMetric,
} from "@/lib/statisticsChartOverlay";
import {
  E1RM_CHART_MODE_OPTIONS,
  type E1rmChartMode,
} from "@/lib/statisticsE1rm";
import type { LiftVariantFilter } from "@/lib/statisticsLiftCatalog";

const VARIANT_OPTIONS: Array<{ value: LiftVariantFilter; label: string }> = [
  { value: "competition", label: "Competition only" },
  { value: "all_variants", label: "Alle varianten" },
];

type ChartCardProps = {
  title: string;
  subtitle?: string;
  controls?: ReactNode;
  axisFooter?: ReactNode;
  onHide?: () => void;
  onExport?: () => void;
  onReset?: () => void;
  heightClass?: string;
  children: ReactNode;
  overlayMetric?: ChartOverlayMetric;
  onOverlayChange?: (metric: ChartOverlayMetric) => void;
  overlayExclude?: ChartOverlayMetric[];
  supportsOverlay?: boolean;
  chartMode?: E1rmChartMode;
  onChartModeChange?: (mode: E1rmChartMode) => void;
  variantFilter?: LiftVariantFilter;
  onVariantFilterChange?: (value: LiftVariantFilter) => void;
};

function MenuSection({ label }: { label: string }) {
  return (
    <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wide text-app-muted">
      {label}
    </p>
  );
}

function MenuItem({
  active,
  onClick,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className={`flex w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-app-surface-hover ${
        active ? "text-brand-purple" : "text-app-text"
      }`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export default function ChartCard({
  title,
  subtitle,
  controls,
  axisFooter,
  onHide,
  onExport,
  onReset,
  heightClass = "h-[280px]",
  children,
  overlayMetric = "none",
  onOverlayChange,
  overlayExclude = [],
  supportsOverlay = false,
  chartMode,
  onChartModeChange,
  variantFilter,
  onVariantFilterChange,
}: ChartCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
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
  const variantLabel = variantFilter
    ? VARIANT_OPTIONS.find((option) => option.value === variantFilter)?.label
    : null;

  const settingsHint = [modeLabel, variantLabel]
    .filter(Boolean)
    .join(" · ");

  const body = (
    <div className="rounded-2xl border border-app-border bg-app-surface p-4 shadow-sm">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1 pr-2">
          <h3 className="truncate text-[15px] font-semibold text-app-text">{title}</h3>
          {subtitle ? (
            <p className="mt-1 text-xs text-app-muted">{subtitle}</p>
          ) : null}
          {settingsHint ? (
            <p className="mt-1 text-[11px] text-app-muted">{settingsHint}</p>
          ) : null}
          {supportsOverlay && overlayMetric !== "none" ? (
            <p className="mt-1 text-[11px] text-orange-400">
              Overlay: {getOverlayLabel(overlayMetric)}
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {controls}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-app-border bg-app-surface-muted text-app-muted transition hover:bg-app-surface-hover hover:text-app-text"
              aria-label="Grafiek opties"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
            {menuOpen ? (
              <div className="absolute right-0 z-20 mt-2 max-h-[min(70vh,420px)] min-w-[220px] overflow-y-auto rounded-xl border border-app-border bg-app-surface p-1 shadow-xl">
                {onChartModeChange && chartMode ? (
                  <>
                    <MenuSection label="Weergave" />
                    {E1RM_CHART_MODE_OPTIONS.map((option) => (
                      <MenuItem
                        key={option.value}
                        active={chartMode === option.value}
                        onClick={() => {
                          onChartModeChange(option.value);
                          setMenuOpen(false);
                        }}
                      >
                        {option.label}
                      </MenuItem>
                    ))}
                  </>
                ) : null}
                {onVariantFilterChange && variantFilter ? (
                  <>
                    <MenuSection label="Lift variant" />
                    {VARIANT_OPTIONS.map((option) => (
                      <MenuItem
                        key={option.value}
                        active={variantFilter === option.value}
                        onClick={() => {
                          onVariantFilterChange(option.value);
                          setMenuOpen(false);
                        }}
                      >
                        {option.label}
                      </MenuItem>
                    ))}
                  </>
                ) : null}
                {supportsOverlay && onOverlayChange ? (
                  <>
                    <MenuSection label="Overlay" />
                    {overlayOptions.map((option) => (
                      <MenuItem
                        key={option.value}
                        active={overlayMetric === option.value}
                        onClick={() => {
                          onOverlayChange(option.value);
                          setMenuOpen(false);
                        }}
                      >
                        {option.label}
                      </MenuItem>
                    ))}
                  </>
                ) : null}
                {onHide || onExport || onReset ? (
                  <MenuSection label="Acties" />
                ) : null}
                {onHide ? (
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-app-text hover:bg-app-surface-hover"
                    onClick={() => {
                      onHide();
                      setMenuOpen(false);
                    }}
                  >
                    <X className="h-4 w-4" />
                    Verberg grafiek
                  </button>
                ) : null}
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-app-text hover:bg-app-surface-hover"
                  onClick={() => {
                    setExpanded(true);
                    setMenuOpen(false);
                  }}
                >
                  <Maximize2 className="h-4 w-4" />
                  Vergroot
                </button>
                {onExport ? (
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-app-text hover:bg-app-surface-hover"
                    onClick={() => {
                      onExport();
                      setMenuOpen(false);
                    }}
                  >
                    <Table className="h-4 w-4" />
                    Exporteer CSV
                  </button>
                ) : null}
                {onReset ? (
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-app-text hover:bg-app-surface-hover"
                    onClick={() => {
                      onReset();
                      setMenuOpen(false);
                    }}
                  >
                    <RotateCcw className="h-4 w-4" />
                    Reset filter
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className={heightClass}>{children}</div>
      {axisFooter}
    </div>
  );

  if (!expanded) return body;

  return (
    <>
      {body}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
        onClick={() => setExpanded(false)}
      >
        <div
          className="max-h-[90vh] w-full max-w-6xl overflow-auto rounded-2xl border border-app-border bg-app-surface p-4"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-app-text">{title}</h3>
              {subtitle ? <p className="text-sm text-app-muted">{subtitle}</p> : null}
            </div>
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="rounded-lg border border-app-border p-2 text-app-muted hover:bg-app-surface-hover hover:text-app-text"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="h-[70vh]">{children}</div>
          {axisFooter}
        </div>
      </div>
    </>
  );
}

function BlockSpanFooter({
  data,
}: {
  data: Array<{ blockId: string; shortBlockLabel: string }>;
}) {
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
      <div className="flex border-t border-app-border">
        {spans.map((span) => (
          <div
            key={`${span.blockId}-${span.count}`}
            className="border-r border-dashed border-app-border pt-1 text-center text-[10px] font-medium text-app-muted last:border-r-0"
            style={{ width: `${(span.count / data.length) * 100}%` }}
          >
            {span.label}
          </div>
        ))}
      </div>
    </div>
  );
}

export { BlockSpanFooter };
