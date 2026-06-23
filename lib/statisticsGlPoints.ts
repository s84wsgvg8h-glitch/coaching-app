import type { SbdLift } from "@/lib/chatVolumeData";
import { calculateDots } from "@/lib/ipfPoints";
import type { StatisticsBwRow, StatisticsSetRow } from "@/lib/statisticsChartData";
import {
  buildCombinedWeeklyE1rmSeries,
  type E1rmChartMode,
  type E1rmChartPoint,
} from "@/lib/statisticsE1rm";
import type { LiftVariantFilter } from "@/lib/statisticsLiftCatalog";

function roundGl(value: number) {
  return Math.round(value * 10) / 10;
}

function bwByWeekKey(rows: StatisticsBwRow[]) {
  const grouped = new Map<string, number[]>();

  for (const row of rows) {
    const existing = grouped.get(row.weekKey) || [];
    existing.push(row.bw);
    grouped.set(row.weekKey, existing);
  }

  const averages = new Map<string, number>();
  for (const [weekKey, values] of grouped.entries()) {
    averages.set(
      weekKey,
      values.reduce((sum, value) => sum + value, 0) / values.length,
    );
  }

  return averages;
}

function bwByDate(rows: StatisticsBwRow[]) {
  const map = new Map<string, number>();
  for (const row of rows) {
    map.set(row.date, row.bw);
  }
  return map;
}

function resolveBodyweight(
  point: E1rmChartPoint,
  bwWeeks: Map<string, number>,
  bwDates: Map<string, number>,
) {
  return bwDates.get(point.date) ?? bwWeeks.get(point.weekKey) ?? null;
}

function toGlPoints(
  liftValue: number | null | undefined,
  bodyweight: number | null,
) {
  if (liftValue === null || liftValue === undefined || !bodyweight) return null;
  return roundGl(calculateDots(liftValue, bodyweight));
}

export function buildGlPointsSbdSeries(
  setRows: StatisticsSetRow[],
  bwRows: StatisticsBwRow[],
  mode: E1rmChartMode,
  variantFilters: Record<SbdLift, LiftVariantFilter>,
): E1rmChartPoint[] {
  const e1rmSeries = buildCombinedWeeklyE1rmSeries(setRows, mode, variantFilters);
  const bwWeeks = bwByWeekKey(bwRows);
  const bwDates = bwByDate(bwRows);

  return e1rmSeries.map((point) => {
    const bodyweight = resolveBodyweight(point, bwWeeks, bwDates);

    return {
      ...point,
      squat: toGlPoints(point.squat, bodyweight),
      bench: toGlPoints(point.bench, bodyweight),
      deadlift: toGlPoints(point.deadlift, bodyweight),
      value: null,
      sourceSet: null,
      squatSource: null,
      benchSource: null,
      deadliftSource: null,
    };
  });
}

export function buildGlPointsTotalSeries(
  setRows: StatisticsSetRow[],
  bwRows: StatisticsBwRow[],
  mode: E1rmChartMode,
  variantFilters: Record<SbdLift, LiftVariantFilter>,
): E1rmChartPoint[] {
  const e1rmSeries = buildCombinedWeeklyE1rmSeries(setRows, mode, variantFilters);
  const bwWeeks = bwByWeekKey(bwRows);
  const bwDates = bwByDate(bwRows);

  return e1rmSeries.map((point) => {
    const bodyweight = resolveBodyweight(point, bwWeeks, bwDates);
    const lifts = [point.squat, point.bench, point.deadlift].filter(
      (value): value is number => typeof value === "number",
    );
    const total = lifts.reduce((sum, value) => sum + value, 0);

    return {
      ...point,
      value: total > 0 && bodyweight ? roundGl(calculateDots(total, bodyweight)) : null,
      sourceSet: null,
      squat: null,
      bench: null,
      deadlift: null,
      squatSource: null,
      benchSource: null,
      deadliftSource: null,
    };
  });
}
