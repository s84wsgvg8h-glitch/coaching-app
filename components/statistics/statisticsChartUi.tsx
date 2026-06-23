"use client";

import { ReferenceLine } from "recharts";
import type { WeekChartPoint } from "@/lib/statisticsChartData";

export const CHART_MARGIN = { top: 10, right: 12, left: 0, bottom: 4 };

export const CHART_MARGIN_DUAL_AXIS = { top: 10, right: 44, left: 0, bottom: 0 };

export const CHART_GRID = {
  horizontal: true,
  vertical: false,
  stroke: "rgba(148, 163, 184, 0.18)",
  strokeWidth: 1,
};

const WEIGHT_STEPS = [10, 15, 20, 25, 30, 40, 50, 60, 75, 100];
const COUNT_STEPS = [1, 2, 5, 10, 15, 20, 25, 50];

export type WeekAxisPoint = {
  weekKey: string;
  weekLabel: string;
  blockId?: string;
};

export type IndexedWeekAxisPoint<T extends WeekAxisPoint = WeekAxisPoint> = T & {
  axisIndex: number;
};

export function withChartAxisIndex<T extends WeekAxisPoint>(
  data: T[],
): Array<IndexedWeekAxisPoint<T>> {
  return data.map((point, index) => ({ ...point, axisIndex: index }));
}

function buildAxisTickIndices(dataLength: number) {
  const interval =
    dataLength <= 10
      ? 0
      : dataLength <= 18
        ? 1
        : dataLength <= 28
          ? 2
          : Math.ceil(dataLength / 12) - 1;

  const ticks: number[] = [];
  for (let index = 0; index < dataLength; index += interval + 1) {
    ticks.push(index);
  }

  if (dataLength > 0 && ticks[ticks.length - 1] !== dataLength - 1) {
    ticks.push(dataLength - 1);
  }

  return ticks;
}

export function weekAxisProps(data: WeekAxisPoint[]) {
  const ticks = buildAxisTickIndices(data.length);
  const spansMultipleBlocks =
    new Set(data.map((point) => point.blockId).filter(Boolean)).size > 1;

  return {
    dataKey: "axisIndex" as const,
    type: "number" as const,
    domain: [0, Math.max(0, data.length - 1)] as [number, number],
    ticks,
    tickFormatter: (value: number) => {
      if (spansMultipleBlocks) {
        return `W${value + 1}`;
      }

      return data[value]?.weekLabel ?? "";
    },
    tick: { fontSize: 10, fill: "var(--app-muted, #9ca3af)" },
    tickLine: false,
    axisLine: false,
    height: 24,
  };
}

export function collectNumericValues(
  data: Array<Record<string, unknown>>,
  keys: string[],
) {
  const values: number[] = [];

  for (const row of data) {
    for (const key of keys) {
      const value = row[key];
      if (typeof value === "number" && Number.isFinite(value)) {
        values.push(value);
      }
    }
  }

  return values;
}

function pickWeightStep(span: number) {
  const targetTicks = 5;
  let bestStep = 30;
  let bestScore = Number.POSITIVE_INFINITY;

  for (const step of WEIGHT_STEPS) {
    const tickCount = Math.max(2, Math.round(span / step) + 1);
    const score = Math.abs(tickCount - targetTicks);

    if (score < bestScore) {
      bestScore = score;
      bestStep = step;
    }
  }

  return bestStep;
}

export function computeWeightAxisDomain(
  values: number[],
  options?: { minFloor?: number; maxCeil?: number; padRatio?: number },
): [number, number] {
  const padRatio = options?.padRatio ?? 0.1;

  if (values.length === 0) {
    return [options?.minFloor ?? 0, options?.maxCeil ?? 100];
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || Math.max(max * 0.12, 10);
  const pad = span * padRatio;

  let low = min - pad;
  let high = max + pad;

  if (options?.minFloor !== undefined) {
    low = Math.max(options.minFloor, low);
  }

  if (options?.maxCeil !== undefined) {
    high = Math.min(options.maxCeil, high);
  }

  const step = pickWeightStep(high - low);
  let domainMin = Math.floor(low / step) * step;
  let domainMax = Math.ceil(high / step) * step;

  if (domainMax <= domainMin) {
    domainMax = domainMin + step;
  }

  if (options?.minFloor !== undefined) {
    domainMin = Math.max(options.minFloor, domainMin);
  }

  if (options?.maxCeil !== undefined) {
    domainMax = Math.min(options.maxCeil, domainMax);
  }

  return [domainMin, domainMax];
}

export function buildAxisTicks(domain: [number, number], step?: number) {
  const [min, max] = domain;
  const resolvedStep = step ?? pickWeightStep(max - min);
  const ticks: number[] = [];

  for (let value = min; value <= max + 0.001; value += resolvedStep) {
    ticks.push(Math.round(value));
  }

  return ticks;
}

export function weightYAxisProps(domain: [number, number]) {
  return {
    width: 44,
    domain,
    ticks: buildAxisTicks(domain),
    allowDecimals: false,
    tick: { fontSize: 10, fill: "var(--app-muted, #9ca3af)" },
    axisLine: false,
    tickLine: false,
  };
}

export function computeNiceDomain(
  values: number[],
  options?: { minFloor?: number; maxCeil?: number; padRatio?: number },
): [number, number] {
  return computeWeightAxisDomain(values, options);
}

type ChartTooltipRow = {
  color?: string;
  label: string;
  value: string;
};

export function StatisticsChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{
    color?: string;
    name?: string;
    dataKey?: string | number;
    value?: number | string;
    payload?: WeekChartPoint;
  }>;
}) {
  if (!active || !payload?.length) return null;

  const point = payload[0]?.payload as WeekChartPoint | undefined;
  if (!point) return null;

  const rows: ChartTooltipRow[] = payload
    .filter((entry) => entry.value !== null && entry.value !== undefined)
    .map((entry) => ({
      color: entry.color,
      label: String(entry.name || entry.dataKey || ""),
      value: String(entry.value),
    }));

  return (
    <div className="rounded-xl border border-app-border bg-[#111827] px-3 py-2 shadow-xl">
      <p className="text-xs font-semibold text-white">
        {point.shortBlockLabel} · {point.weekLabel}
      </p>
      <div className="mt-1.5 space-y-1">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center gap-2 text-xs">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: row.color || "#a78bfa" }}
            />
            <span className="text-app-muted">{row.label}</span>
            <span className="ml-auto font-medium text-white">{row.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export const LINE_PROPS = {
  type: "monotone" as const,
  dot: false,
  activeDot: { r: 4, strokeWidth: 0 },
  connectNulls: true,
  strokeWidth: 2,
};

export function computeCountAxisDomain(values: number[]): [number, number] {
  if (values.length === 0) return [0, 5];

  const max = Math.max(...values);
  const step = pickCountStep(max);
  const paddedMax = max + step * 0.2;
  const domainMax = Math.max(step, Math.ceil(paddedMax / step) * step);

  return [0, domainMax];
}

function pickCountStep(max: number) {
  if (max <= 0) return 1;

  let bestStep = 1;
  let bestScore = Number.POSITIVE_INFINITY;

  for (const step of COUNT_STEPS) {
    const tickCount = Math.max(2, Math.round(max / step) + 1);
    const score = Math.abs(tickCount - 4);
    if (score < bestScore) {
      bestScore = score;
      bestStep = step;
    }
  }

  return bestStep;
}

export function countYAxisProps(domain: [number, number]) {
  const [min, max] = domain;
  const step = pickCountStep(max);
  const ticks: number[] = [];

  for (let value = min; value <= max + 0.001; value += step) {
    ticks.push(Math.round(value));
  }

  return {
    width: 44,
    domain,
    ticks,
    allowDecimals: false,
    tick: { fontSize: 10, fill: "var(--app-muted, #9ca3af)" },
    axisLine: false,
    tickLine: false,
  };
}

export function getBlockEndBoundaryIndices(
  data: Array<{ blockId: string }>,
) {
  const indices: number[] = [];

  for (let index = 0; index < data.length - 1; index += 1) {
    if (data[index + 1]?.blockId !== data[index]?.blockId) {
      indices.push(index);
    }
  }

  return indices;
}

/** @deprecated Use getBlockEndBoundaryIndices */
export function getBlockEndBoundaryKeys(
  data: Array<{ blockId: string; weekKey: string }>,
) {
  return getBlockEndBoundaryIndices(data).map((index) => data[index]!.weekKey);
}

/** @deprecated Use getBlockEndBoundaryIndices */
export function getBlockEndBoundaryLabels(
  data: Array<{ blockId: string; weekKey: string }>,
) {
  return getBlockEndBoundaryKeys(data);
}

/** @deprecated Use getBlockEndBoundaryIndices */
export function getBlockBoundaryLabels(
  data: Array<{ blockId: string; weekKey: string }>,
) {
  return getBlockEndBoundaryKeys(data);
}

export function BlockDividers({
  data,
}: {
  data: Array<{ blockId: string }>;
}) {
  const indices = getBlockEndBoundaryIndices(data);

  return (
    <>
      {indices.map((index) => (
        <ReferenceLine
          key={index}
          x={index}
          stroke={CHART_GRID.stroke}
          strokeWidth={CHART_GRID.strokeWidth}
          strokeDasharray="4 4"
        />
      ))}
    </>
  );
}

export function bodyweightYAxisProps(domain: [number, number]) {
  const [min, max] = domain;
  const span = max - min;
  const step = span <= 8 ? 1 : span <= 16 ? 2 : span <= 40 ? 5 : 10;
  const ticks: number[] = [];

  for (let value = min; value <= max + 0.001; value += step) {
    ticks.push(Math.round(value * 10) / 10);
  }

  return {
    width: 44,
    domain,
    ticks,
    allowDecimals: step < 1,
    tick: { fontSize: 10, fill: "var(--app-muted, #9ca3af)" },
    axisLine: false,
    tickLine: false,
  };
}

export function scoreYAxisProps(domain: [number, number] = [0, 100]) {
  return {
    width: 44,
    domain,
    ticks: [0, 25, 50, 75, 100],
    allowDecimals: false,
    tick: { fontSize: 10, fill: "var(--app-muted, #9ca3af)" },
    axisLine: false,
    tickLine: false,
  };
}
