"use client";

type FillScoreSparklineProps = {
  values: number[];
  className?: string;
  width?: number;
  height?: number;
};

export default function FillScoreSparkline({
  values,
  className = "text-emerald-400",
  width = 52,
  height = 14,
}: FillScoreSparklineProps) {
  if (values.length < 2) return null;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const points = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * width;
      const y = height - ((value - min) / range) * (height - 3) - 1.5;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={`shrink-0 ${className}`}
      aria-hidden
    >
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}

export function buildFillScoreSparklineValues(
  fillScoreValueByDay: Record<number, number | null> | undefined,
  todayDay: number,
  pointCount = 10,
): number[] {
  if (!fillScoreValueByDay) return [];

  const startDay = Math.max(1, todayDay - pointCount + 1);
  const values: number[] = [];

  for (let day = startDay; day <= todayDay; day += 1) {
    const value = fillScoreValueByDay[day];
    if (value !== null && value !== undefined) {
      values.push(value);
    }
  }

  if (values.length >= 2) return values;

  const fallback: number[] = [];
  for (let day = 1; day <= todayDay; day += 1) {
    const value = fillScoreValueByDay[day];
    if (value !== null && value !== undefined) {
      fallback.push(value);
    }
  }

  return fallback.slice(-pointCount);
}
