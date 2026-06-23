import type { SbdLift } from "@/lib/chatVolumeData";
import { estimateE1rmFromSet } from "@/lib/exercisePrescription";
import type { LiftVariantFilter } from "@/lib/statisticsLiftCatalog";
import {
  categorizeLift,
  matchesLiftVariantFilter,
} from "@/lib/statisticsLiftCatalog";
import type { StatisticsSetRow } from "@/lib/statisticsChartData";

export type E1rmChartMode = "weekly_best" | "weekly_average" | "raw";

export type E1rmSourceSet = {
  weight: number;
  reps: number;
  rpe: number | null;
  exerciseName: string;
  date: string;
};

export type E1rmWeekBucket = {
  weekKey: string;
  weekNumber: number;
  blockId: string;
  blockTitle: string;
  weekStartDate: string;
  date: string;
  values: number[];
  sources: E1rmSourceSet[];
};

export type E1rmChartPoint = {
  weekKey: string;
  weekNumber: number;
  blockId: string;
  blockTitle: string;
  shortBlockLabel: string;
  weekStartDate: string;
  date: string;
  weekLabel: string;
  label: string;
  value: number | null;
  sourceSet: E1rmSourceSet | null;
  squat?: number | null;
  bench?: number | null;
  deadlift?: number | null;
  squatSource?: E1rmSourceSet | null;
  benchSource?: E1rmSourceSet | null;
  deadliftSource?: E1rmSourceSet | null;
};

export function formatKg(value: number | null | undefined) {
  if (value === null || value === undefined) return "-";
  const rounded = Math.round(value * 10) / 10;
  return `${rounded} kg`;
}

export function formatPercent(value: number) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${Math.round(value)}%`;
}

export function formatSourceSet(source: E1rmSourceSet | null | undefined) {
  if (!source) return "";
  const rpe = source.rpe !== null ? ` @ RPE ${source.rpe}` : "";
  return `${source.weight} × ${source.reps}${rpe}`;
}

export function isReliableE1rmSet(row: StatisticsSetRow) {
  if (row.weight === null || row.weight <= 0) return false;
  if (row.reps === null || row.reps <= 0) return false;
  if (row.e1rm === null || row.e1rm <= 0) return false;
  if (row.rpe !== null && row.rpe < 6) return false;
  return true;
}

function formatShortBlockLabel(blockTitle: string) {
  const match = blockTitle.match(/^Block\s*\d+/i);
  if (match) return match[0].replace(/\s+/g, " ");
  const beforeDash = blockTitle.split("—")[0]?.trim();
  return beforeDash || blockTitle;
}

function weekAxisLabel(weekNumber: number) {
  return `W${weekNumber}`;
}

function roundMetric(value: number) {
  return Math.round(value * 10) / 10;
}

function average(values: number[]) {
  if (values.length === 0) return null;
  return roundMetric(values.reduce((sum, v) => sum + v, 0) / values.length);
}

function pickBestSource(sources: E1rmSourceSet[], bestValue: number | null) {
  if (!sources.length || bestValue === null) return null;
  return (
    sources.find((source) => {
      const e1rm = estimateE1rmFromSet(source.weight, source.reps);
      return e1rm !== null && Math.abs(e1rm - bestValue) < 0.05;
    }) || sources[sources.length - 1]!
  );
}

function filterOutlierValues(values: number[]) {
  if (values.length < 3) return values;
  const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
  return values.filter((value) => value >= avg * 0.6);
}

export function filterE1rmRows(
  rows: StatisticsSetRow[],
  options?: {
    lift?: SbdLift;
    variantFilter?: LiftVariantFilter;
  },
) {
  return rows.filter((row) => {
    if (!isReliableE1rmSet(row)) return false;

    const classification = categorizeLift(row.exerciseName);
    if (!classification) return false;

    if (options?.lift && classification.lift !== options.lift) return false;

    if (
      options?.variantFilter &&
      !matchesLiftVariantFilter(classification, options.variantFilter)
    ) {
      return false;
    }

    return true;
  });
}

function groupByProgramWeek(
  rows: StatisticsSetRow[],
  options?: {
    lift?: SbdLift;
    variantFilter?: LiftVariantFilter;
  },
) {
  const filtered = filterE1rmRows(rows, options);
  const grouped = new Map<string, E1rmWeekBucket>();

  for (const row of filtered) {
    const classification = categorizeLift(row.exerciseName);
    if (!classification) continue;
    if (options?.lift && classification.lift !== options.lift) continue;

    const existing =
      grouped.get(row.weekKey) ||
      ({
        weekKey: row.weekKey,
        weekNumber: row.weekNumber,
        blockId: row.blockId,
        blockTitle: row.blockTitle,
        weekStartDate: row.weekStartDate,
        date: row.date,
        values: [],
        sources: [],
      } satisfies E1rmWeekBucket);

    existing.values.push(row.e1rm as number);
    existing.sources.push({
      weight: row.weight as number,
      reps: row.reps as number,
      rpe: row.rpe,
      exerciseName: row.exerciseName,
      date: row.date,
    });

    grouped.set(row.weekKey, existing);
  }

  return Array.from(grouped.values()).sort((a, b) => {
    const dateCompare = a.weekStartDate.localeCompare(b.weekStartDate);
    if (dateCompare !== 0) return dateCompare;
    return a.weekNumber - b.weekNumber;
  });
}

function aggregateWeekValue(bucket: E1rmWeekBucket, mode: E1rmChartMode) {
  const values = filterOutlierValues(bucket.values);
  if (values.length === 0) return null;

  if (mode === "weekly_average") return average(values);
  return Math.max(...values);
}

function finalizePoint(
  bucket: E1rmWeekBucket,
  value: number | null,
  sourceSet: E1rmSourceSet | null,
): E1rmChartPoint {
  return {
    weekKey: bucket.weekKey,
    weekNumber: bucket.weekNumber,
    blockId: bucket.blockId,
    blockTitle: bucket.blockTitle,
    shortBlockLabel: formatShortBlockLabel(bucket.blockTitle),
    weekStartDate: bucket.weekStartDate,
    date: bucket.date,
    weekLabel: weekAxisLabel(bucket.weekNumber),
    label: `${formatShortBlockLabel(bucket.blockTitle)} · Week ${bucket.weekNumber}`,
    value,
    sourceSet,
  };
}

export function buildWeeklyE1rmSeries(
  rows: StatisticsSetRow[],
  lift: SbdLift,
  mode: E1rmChartMode,
  variantFilter: LiftVariantFilter = "competition",
): E1rmChartPoint[] {
  const buckets = groupByProgramWeek(rows, { lift, variantFilter });

  if (mode === "raw") {
    const rawPoints: E1rmChartPoint[] = [];

    for (const row of filterE1rmRows(rows, { lift, variantFilter })) {
      rawPoints.push({
        weekKey: `${row.weekKey}:${row.date}:${row.exerciseName}`,
        weekNumber: row.weekNumber,
        blockId: row.blockId,
        blockTitle: row.blockTitle,
        shortBlockLabel: formatShortBlockLabel(row.blockTitle),
        weekStartDate: row.weekStartDate,
        date: row.date,
        weekLabel: weekAxisLabel(row.weekNumber),
        label: row.exerciseName,
        value: row.e1rm,
        sourceSet: {
          weight: row.weight as number,
          reps: row.reps as number,
          rpe: row.rpe,
          exerciseName: row.exerciseName,
          date: row.date,
        },
      });
    }

    return rawPoints.sort((a, b) => a.date.localeCompare(b.date));
  }

  const weeklyPoints = buckets.map((bucket) => {
    const value = aggregateWeekValue(bucket, mode);
    return finalizePoint(bucket, value, pickBestSource(bucket.sources, value));
  });

  return weeklyPoints;
}

export function buildCombinedWeeklyE1rmSeries(
  rows: StatisticsSetRow[],
  mode: E1rmChartMode,
  variantFilters: LiftVariantFilter | Record<SbdLift, LiftVariantFilter> = "competition",
): E1rmChartPoint[] {
  const lifts: SbdLift[] = ["squat", "bench", "deadlift"];
  const weekMap = new Map<string, E1rmChartPoint>();

  for (const lift of lifts) {
    const variantFilter =
      typeof variantFilters === "string" ? variantFilters : variantFilters[lift];
    const series = buildWeeklyE1rmSeries(rows, lift, mode, variantFilter);

    for (const point of series) {
      const existing =
        weekMap.get(point.weekKey) ||
        ({
          weekKey: point.weekKey,
          weekNumber: point.weekNumber,
          blockId: point.blockId,
          blockTitle: point.blockTitle,
          shortBlockLabel: point.shortBlockLabel,
          weekStartDate: point.weekStartDate,
          date: point.date,
          weekLabel: point.weekLabel,
          label: point.label,
          value: null,
          sourceSet: null,
          squat: null,
          bench: null,
          deadlift: null,
          squatSource: null,
          benchSource: null,
          deadliftSource: null,
        } satisfies E1rmChartPoint);

      if (lift === "squat") {
        existing.squat = point.value;
        existing.squatSource = point.sourceSet;
      }
      if (lift === "bench") {
        existing.bench = point.value;
        existing.benchSource = point.sourceSet;
      }
      if (lift === "deadlift") {
        existing.deadlift = point.value;
        existing.deadliftSource = point.sourceSet;
      }

      weekMap.set(point.weekKey, existing);
    }
  }

  return Array.from(weekMap.values()).sort((a, b) => {
    const dateCompare = a.weekStartDate.localeCompare(b.weekStartDate);
    if (dateCompare !== 0) return dateCompare;
    return a.weekNumber - b.weekNumber;
  });
}

export function getTrendDelta(values: number[], recentWeeks = 4) {
  if (values.length < recentWeeks + 1) return 0;

  const recent = values.slice(-recentWeeks);
  const previous = values.slice(-recentWeeks * 2, -recentWeeks);
  if (previous.length === 0) return 0;

  const recentAvg = recent.reduce((sum, v) => sum + v, 0) / recent.length;
  const previousAvg = previous.reduce((sum, v) => sum + v, 0) / previous.length;
  return roundMetric(recentAvg - previousAvg);
}

export const E1RM_CHART_MODE_OPTIONS: Array<{
  value: E1rmChartMode;
  label: string;
}> = [
  { value: "weekly_best", label: "Wekelijks piek" },
  { value: "weekly_average", label: "Wekelijks gemiddelde" },
  { value: "raw", label: "Raw" },
];
