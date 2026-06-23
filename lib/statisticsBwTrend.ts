import type { SingleValuePoint } from "@/lib/statisticsChartData";

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

export function computeAverageWeeklyBwChange(points: SingleValuePoint[]) {
  const values = points
    .filter((point) => point.value !== null)
    .map((point) => ({
      weekStartDate: point.weekStartDate || point.date,
      value: point.value as number,
    }));

  if (values.length < 2) return null;

  const first = values[0]!;
  const last = values[values.length - 1]!;
  const weekSpan = values.length - 1;
  const change = (last.value - first.value) / weekSpan;

  return round1(change);
}

export function formatAverageWeeklyBwChange(change: number | null) {
  if (change === null) return null;
  const sign = change > 0 ? "+" : "";
  return `${sign}${change} kg/week gem.`;
}
