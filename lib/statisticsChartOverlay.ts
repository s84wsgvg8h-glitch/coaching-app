import type { SbdLift } from "@/lib/chatVolumeData";
import type {
  StatisticsBwRow,
  StatisticsFatigueRow,
  StatisticsRecoveryRow,
  StatisticsSetRow,
} from "@/lib/statisticsChartData";
import { buildCheckinWeeklyChart } from "@/lib/statisticsChartData";
import {
  buildWeeklyE1rmSeries,
  type E1rmChartMode,
  type E1rmChartPoint,
} from "@/lib/statisticsE1rm";
import type { LiftVariantFilter } from "@/lib/statisticsLiftCatalog";

export type ChartOverlayMetric =
  | "none"
  | "fatigue"
  | "recovery"
  | "bw"
  | "e1rm_squat"
  | "e1rm_bench"
  | "e1rm_deadlift";

export const CHART_OVERLAY_OPTIONS: Array<{
  value: ChartOverlayMetric;
  label: string;
}> = [
  { value: "none", label: "Geen overlay" },
  { value: "fatigue", label: "Fatigue" },
  { value: "recovery", label: "Herstel" },
  { value: "bw", label: "Lichaamsgewicht" },
  { value: "e1rm_squat", label: "Squat e1RM" },
  { value: "e1rm_bench", label: "Bench e1RM" },
  { value: "e1rm_deadlift", label: "Deadlift e1RM" },
];

export type OverlayChartPoint = E1rmChartPoint & {
  overlayValue: number | null;
};

export function getOverlayLabel(metric: ChartOverlayMetric) {
  return CHART_OVERLAY_OPTIONS.find((option) => option.value === metric)?.label || "";
}

export function getOverlaySuffix(metric: ChartOverlayMetric) {
  if (metric === "bw") return "kg";
  if (metric === "fatigue" || metric === "recovery") return "";
  if (metric.startsWith("e1rm_")) return "kg";
  return "";
}

function overlayValuesByWeekKey(
  metric: ChartOverlayMetric,
  input: {
    mode: E1rmChartMode;
    setRows: StatisticsSetRow[];
    bwRows: StatisticsBwRow[];
    fatigueRows: StatisticsFatigueRow[];
    recoveryRows: StatisticsRecoveryRow[];
    variantFilter?: LiftVariantFilter;
  },
) {
  if (metric === "none") return new Map<string, number | null>();

  if (metric === "fatigue") {
    return new Map(
      buildCheckinWeeklyChart(
        input.fatigueRows,
        (row) => row.fatigue,
        input.mode,
      ).map((point) => [point.weekKey, point.value]),
    );
  }

  if (metric === "recovery") {
    return new Map(
      buildCheckinWeeklyChart(
        input.recoveryRows,
        (row) => row.recovery,
        input.mode,
      ).map((point) => [point.weekKey, point.value]),
    );
  }

  if (metric === "bw") {
    return new Map(
      buildCheckinWeeklyChart(input.bwRows, (row) => row.bw, input.mode).map(
        (point) => [point.weekKey, point.value],
      ),
    );
  }

  const lift = metric.replace("e1rm_", "") as SbdLift;
  return new Map(
    buildWeeklyE1rmSeries(
      input.setRows,
      lift,
      input.mode,
      input.variantFilter || "competition",
    ).map((point) => [point.weekKey, point.value]),
  );
}

export function mergeChartOverlay(
  primary: E1rmChartPoint[],
  metric: ChartOverlayMetric,
  input: {
    mode: E1rmChartMode;
    setRows: StatisticsSetRow[];
    bwRows: StatisticsBwRow[];
    fatigueRows: StatisticsFatigueRow[];
    recoveryRows: StatisticsRecoveryRow[];
    variantFilter?: LiftVariantFilter;
  },
): OverlayChartPoint[] {
  const overlayMap = overlayValuesByWeekKey(metric, input);

  return primary.map((point) => ({
    ...point,
    overlayValue: overlayMap.get(point.weekKey) ?? null,
  }));
}
