import {
  DEFAULT_ENABLED_CHARTS,
  STATISTICS_CHART_CATALOG,
  type StatisticsChartId,
} from "@/lib/statisticsChartCatalog";

export type StatisticsChartInstance = {
  instanceId: string;
  chartId: StatisticsChartId;
  exerciseName?: string;
};

const STORAGE_KEY = "statistics-chart-instances-v2";

function isValidChartId(id: string): id is StatisticsChartId {
  return STATISTICS_CHART_CATALOG.some((entry) => entry.id === id);
}

export function createChartInstanceId() {
  return `ci-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createDefaultInstances(): StatisticsChartInstance[] {
  return DEFAULT_ENABLED_CHARTS.map((chartId) => ({
    instanceId: createChartInstanceId(),
    chartId,
  }));
}

export function loadAthleteChartInstances(
  athleteId: string,
): StatisticsChartInstance[] {
  if (typeof window === "undefined" || !athleteId) {
    return [];
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw) as Record<string, StatisticsChartInstance[]>;
    const instances = parsed[athleteId];

    if (!instances?.length) return [];

    return instances
      .filter((item) => item.instanceId && isValidChartId(item.chartId))
      .map((item) => ({
        instanceId: item.instanceId,
        chartId: item.chartId,
        exerciseName: item.exerciseName,
      }));
  } catch {
    return [];
  }
}

export function saveAthleteChartInstances(
  athleteId: string,
  instances: StatisticsChartInstance[],
) {
  if (typeof window === "undefined" || !athleteId) return;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw
      ? (JSON.parse(raw) as Record<string, StatisticsChartInstance[]>)
      : {};

    parsed[athleteId] = instances;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
  } catch {
    // Ignore storage errors.
  }
}

export function chartNeedsExercise(chartId: StatisticsChartId) {
  return (
    chartId === "sets_per_exercise" ||
    chartId === "reps_per_exercise" ||
    chartId === "tonnage_exercise"
  );
}
