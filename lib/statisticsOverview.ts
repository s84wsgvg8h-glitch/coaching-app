import type { SbdLift } from "@/lib/chatVolumeData";
import {
  applyStatisticsPeriodFilter,
  getBlockMetas,
  type BlockMeta,
  type StatisticsPeriodFilter,
} from "@/lib/statisticsChartFilters";
import {
  buildBwWeeklyChart,
  buildWeeklyIntensityChart,
  EMPTY_DATE_RANGE,
  type StatisticsBwRow,
  type StatisticsFatigueRow,
  type StatisticsSetRow,
} from "@/lib/statisticsChartData";
import type { WeeklyVolumeRow } from "@/lib/chatVolumeData";
import {
  buildCombinedWeeklyE1rmSeries,
  buildWeeklyE1rmSeries,
  formatKg,
  formatPercent,
  getTrendDelta,
} from "@/lib/statisticsE1rm";
import { buildGlPointsTotalSeries } from "@/lib/statisticsGlPoints";

export type OverviewKpi = {
  label: string;
  value: string;
  change: string;
  changeTone: "up" | "down" | "neutral";
  sparkline: number[];
  sparkColor: string;
  clickable?: boolean;
};

export type OverviewInsight = {
  id: string;
  text: string;
};

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function formatSignedKg(delta: number) {
  const sign = delta > 0 ? "+" : "";
  return `${sign}${round1(delta)} kg`;
}

function formatSignedPercent(delta: number) {
  return `${formatPercent(delta)}`;
}

function liftSparkline(setRows: StatisticsSetRow[], lift: SbdLift) {
  return buildWeeklyE1rmSeries(setRows, lift, "weekly_best", "competition")
    .map((point) => point.value)
    .filter((value): value is number => value !== null);
}

function liftLatestPeak(
  setRows: StatisticsSetRow[],
  lift: SbdLift,
): number | null {
  const values = liftSparkline(setRows, lift);
  return values.length > 0 ? values[values.length - 1]! : null;
}

function liftDelta(setRows: StatisticsSetRow[], lift: SbdLift) {
  return getTrendDelta(liftSparkline(setRows, lift));
}

function topSetRpeSeries(setRows: StatisticsSetRow[]) {
  const grouped = new Map<string, number[]>();

  for (const row of setRows) {
    if (row.rpe === null) continue;

    const existing = grouped.get(row.weekKey) || [];
    existing.push(row.rpe);
    grouped.set(row.weekKey, existing);
  }

  return Array.from(grouped.values()).map((values) => Math.max(...values));
}

function totalHardSets(volumeRows: WeeklyVolumeRow[]) {
  return volumeRows.map(
    (row) => row.squat.sets + row.bench.sets + row.deadlift.sets,
  );
}

function totalTonnage(volumeRows: WeeklyVolumeRow[]) {
  return volumeRows.map(
    (row) =>
      row.squat.tonnage + row.bench.tonnage + row.deadlift.tonnage,
  );
}

function averageIntensitySeries(setRows: StatisticsSetRow[]) {
  const lifts: SbdLift[] = ["squat", "bench", "deadlift"];
  const weekly = new Map<string, number[]>();

  for (const lift of lifts) {
    const points = buildWeeklyIntensityChart(
      setRows,
      lift,
      EMPTY_DATE_RANGE,
      "average",
    );

    for (const point of points) {
      if (point.intensityPct === null) continue;
      const existing = weekly.get(point.weekStartDate) || [];
      existing.push(point.intensityPct);
      weekly.set(point.weekStartDate, existing);
    }
  }

  return Array.from(weekly.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, values]) => round1(average(values)));
}

function fatigueSeries(rows: StatisticsFatigueRow[]) {
  const grouped = new Map<string, number[]>();

  for (const row of rows) {
    const existing = grouped.get(row.weekKey) || [];
    existing.push(row.fatigue);
    grouped.set(row.weekKey, existing);
  }

  return Array.from(grouped.values()).map((values) => Math.round(average(values)));
}

function seriesDelta(values: number[], asPercent = false) {
  if (values.length < 5) return 0;

  const recent = values.slice(-4);
  const previous = values.slice(-8, -4);
  if (previous.length === 0) return 0;

  const recentAvg = average(recent);
  const previousAvg = average(previous);
  const delta = recentAvg - previousAvg;

  if (asPercent && previousAvg > 0) {
    return round1((delta / previousAvg) * 100);
  }

  return round1(delta);
}

function trainingLoadLabel(setRows: StatisticsSetRow[], volumeRows: WeeklyVolumeRow[]) {
  const sets = totalHardSets(volumeRows);
  const rpes = topSetRpeSeries(setRows);
  const recentSets = average(sets.slice(-4));
  const recentRpe = average(rpes.slice(-4));

  if (recentSets >= 32 || recentRpe >= 8.5) return "Zeer hoog";
  if (recentSets >= 28 || recentRpe >= 8.2) return "Hoog";
  if (recentSets >= 18 || recentRpe >= 7.2) return "Normaal";
  return "Laag";
}

export function formatOverviewPeriodLabel(
  period: StatisticsPeriodFilter,
  blockMetas: BlockMeta[],
) {
  if (period.preset === "all") return "Alle blocks";
  if (period.preset === "current") {
    const current = blockMetas.at(-1);
    return current?.blockTitle || "Huidig block";
  }
  if (period.preset === "last_year") return "Laatste jaar";
  if (period.preset === "last_4_weeks") return "Laatste 4 weken";
  if (period.preset === "custom") {
    const from = blockMetas.find((block) => block.blockId === period.fromBlockId);
    const to = blockMetas.find((block) => block.blockId === period.toBlockId);
    if (from && to) return `${from.blockTitle} – ${to.blockTitle}`;
    return "Custom range";
  }

  const count =
    period.preset === "last_2"
      ? 2
      : period.preset === "last_4"
        ? 4
        : period.preset === "last_8"
          ? 8
          : 0;

  if (count === 0 || blockMetas.length === 0) return "Alle blocks";

  const selected = blockMetas.slice(-count);
  const first = selected[0]?.blockTitle.match(/\d+/)?.[0];
  const last = selected[selected.length - 1]?.blockTitle.match(/\d+/)?.[0];

  if (first && last) return `Blocks ${first}–${last}`;
  return `Laatste ${count} blocks`;
}

export function filterOverviewData<T extends { blockId: string; date: string }>(
  rows: T[],
  period: StatisticsPeriodFilter,
  blockMetas: BlockMeta[],
) {
  return applyStatisticsPeriodFilter(rows, period, blockMetas);
}

export function buildOverviewKpis(input: {
  setRows: StatisticsSetRow[];
  bwRows: StatisticsBwRow[];
  volumeRows: WeeklyVolumeRow[];
  referenceMaxes: Record<SbdLift, number | null>;
}) {
  const { setRows, bwRows, volumeRows, referenceMaxes } = input;

  const squatPeak =
    liftLatestPeak(setRows, "squat") ?? referenceMaxes.squat;
  const benchPeak =
    liftLatestPeak(setRows, "bench") ?? referenceMaxes.bench;
  const deadliftPeak =
    liftLatestPeak(setRows, "deadlift") ?? referenceMaxes.deadlift;

  const projectedTotal =
    (squatPeak || 0) + (benchPeak || 0) + (deadliftPeak || 0);

  const projectedSeries = buildCombinedWeeklyE1rmSeries(
    setRows,
    "weekly_best",
    "competition",
  ).map((point) => (point.squat || 0) + (point.bench || 0) + (point.deadlift || 0));

  const glSeries = buildGlPointsTotalSeries(setRows, bwRows, "weekly_best", {
    squat: "competition",
    bench: "competition",
    deadlift: "competition",
  })
    .map((point) => point.value)
    .filter((value): value is number => value !== null);

  const bwSeries = buildBwWeeklyChart(bwRows, EMPTY_DATE_RANGE)
    .map((point) => point.value)
    .filter((value): value is number => value !== null);

  const kpis: OverviewKpi[] = [
    {
      label: "Squat e1RM",
      value: formatKg(squatPeak),
      change: `${formatSignedKg(liftDelta(setRows, "squat"))} vs vorige 4 weken`,
      changeTone: liftDelta(setRows, "squat") >= 0 ? "up" : "down",
      sparkline: liftSparkline(setRows, "squat"),
      sparkColor: "#a855f7",
    },
    {
      label: "Bench e1RM",
      value: formatKg(benchPeak),
      change: `${formatSignedKg(liftDelta(setRows, "bench"))} vs vorige 4 weken`,
      changeTone: liftDelta(setRows, "bench") >= 0 ? "up" : "down",
      sparkline: liftSparkline(setRows, "bench"),
      sparkColor: "#3b82f6",
    },
    {
      label: "Deadlift e1RM",
      value: formatKg(deadliftPeak),
      change: `${formatSignedKg(liftDelta(setRows, "deadlift"))} vs vorige 4 weken`,
      changeTone: liftDelta(setRows, "deadlift") >= 0 ? "up" : "down",
      sparkline: liftSparkline(setRows, "deadlift"),
      sparkColor: "#10b981",
    },
    {
      label: "Projected total",
      value: formatKg(projectedTotal),
      change: `${formatSignedKg(seriesDelta(projectedSeries))} vs vorige 4 weken`,
      changeTone: seriesDelta(projectedSeries) >= 0 ? "up" : "down",
      sparkline: projectedSeries,
      sparkColor: "#e5e7eb",
    },
    {
      label: "GL Points",
      value: glSeries.length > 0 ? `${round1(glSeries[glSeries.length - 1]!)} pts` : "-",
      change: `${seriesDelta(glSeries) >= 0 ? "+" : ""}${round1(seriesDelta(glSeries))} pts vs vorige 4 weken`,
      changeTone: seriesDelta(glSeries) >= 0 ? "up" : "down",
      sparkline: glSeries,
      sparkColor: "#eab308",
    },
    {
      label: "Bodyweight",
      value: bwSeries.length > 0 ? `${round1(bwSeries[bwSeries.length - 1]!)} kg` : "-",
      change: `${formatSignedKg(seriesDelta(bwSeries))} vs vorige 4 weken`,
      changeTone: seriesDelta(bwSeries) <= 0 ? "up" : "neutral",
      sparkline: bwSeries,
      sparkColor: "#94a3b8",
      clickable: true,
    },
  ];

  return kpis;
}

export function buildOverviewInsights(input: {
  setRows: StatisticsSetRow[];
  volumeRows: WeeklyVolumeRow[];
  fatigueRows: StatisticsFatigueRow[];
}) {
  const { setRows, volumeRows, fatigueRows } = input;
  const insights: OverviewInsight[] = [];

  const squatDelta = liftDelta(setRows, "squat");
  const benchDelta = liftDelta(setRows, "bench");
  const deadliftDelta = liftDelta(setRows, "deadlift");

  const strongestLift =
    deadliftDelta >= squatDelta && deadliftDelta >= benchDelta
      ? "Deadlift"
      : squatDelta >= benchDelta
        ? "Squat"
        : "Bench";

  if (Math.max(squatDelta, benchDelta, deadliftDelta) > 0) {
    insights.push({
      id: "strongest-lift",
      text: `${strongestLift} e1RM stijgt het sterkst.`,
    });
  }

  const sets = totalHardSets(volumeRows);
  const fatigue = fatigueSeries(fatigueRows);
  const highVolume = average(sets.slice(-4)) >= 24;
  const risingFatigue = seriesDelta(fatigue) > 2;

  if (highVolume) {
    insights.push({
      id: "volume",
      text: risingFatigue
        ? "Volume is hoog, fatigue loopt iets op."
        : "Volume is hoog in de laatste weken.",
    });
  }

  const rpeSeries = topSetRpeSeries(setRows);
  if (average(rpeSeries.slice(-4)) >= 8 || risingFatigue) {
    insights.push({
      id: "deload",
      text: "Overweeg deload in volgende block.",
    });
  }

  if (insights.length === 0) {
    insights.push({
      id: "steady",
      text: "Trends zijn stabiel in de geselecteerde periode.",
    });
  }

  return insights.slice(0, 3);
}

export function getOverviewBlockMetas(
  setRows: StatisticsSetRow[],
  bwRows: StatisticsBwRow[],
  volumeRows: WeeklyVolumeRow[],
) {
  return getBlockMetas([
    ...setRows.map((row) => ({
      blockId: row.blockId,
      blockTitle: row.blockTitle,
      date: row.date,
    })),
    ...bwRows.map((row) => ({
      blockId: row.blockId,
      blockTitle: row.blockTitle,
      date: row.date,
    })),
    ...volumeRows.map((row) => ({
      blockId: row.blockId,
      blockTitle: row.blockTitle,
      date: row.date,
    })),
  ]);
}

export function buildOverviewMiniMetrics(input: {
  setRows: StatisticsSetRow[];
  bwRows: StatisticsBwRow[];
  volumeRows: WeeklyVolumeRow[];
  fatigueRows: StatisticsFatigueRow[];
}) {
  const sets = totalHardSets(input.volumeRows);
  const tonnage = totalTonnage(input.volumeRows);
  const intensity = averageIntensitySeries(input.setRows);
  const fatigue = fatigueSeries(input.fatigueRows);
  const bodyweight = buildBwWeeklyChart(input.bwRows, EMPTY_DATE_RANGE)
    .map((point) => point.value)
    .filter((value): value is number => value !== null);

  return {
    volume: {
      value:
        sets.length > 0
          ? `${Math.round(average(sets.slice(-4)))} sets`
          : "-",
      change: formatSignedPercent(seriesDelta(sets, true)),
      series: sets,
      color: "#3b82f6",
    },
    tonnage: {
      value:
        tonnage.length > 0
          ? `${round1(average(tonnage.slice(-4)) / 1000)} ton`
          : "-",
      change: formatSignedPercent(seriesDelta(tonnage, true)),
      series: tonnage,
      color: "#10b981",
    },
    intensity: {
      value:
        intensity.length > 0
          ? `${Math.round(average(intensity.slice(-4)))}%`
          : "-",
      change: formatSignedPercent(seriesDelta(intensity, true)),
      series: intensity,
      color: "#a855f7",
    },
    fatigue: {
      value:
        fatigue.length > 0
          ? `${Math.round(average(fatigue.slice(-4)))} / 100`
          : "-",
      change: `${seriesDelta(fatigue) >= 0 ? "+" : ""}${seriesDelta(fatigue)}`,
      series: fatigue,
      color: "#f97316",
    },
    bodyweight: {
      value:
        bodyweight.length > 0
          ? formatKg(bodyweight[bodyweight.length - 1])
          : "-",
      change: formatSignedKg(seriesDelta(bodyweight)),
      series: bodyweight,
      color: "#94a3b8",
    },
  };
}
