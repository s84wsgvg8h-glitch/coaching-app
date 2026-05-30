"use client";

import { useMemo } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import {
  calculateDots,
  calculateTotal,
  calculateWilks,
  LIMITLESS_CHART_COLORS,
} from "@/lib/ipfPoints";
import type { WeeklyVolumeRow } from "@/lib/chatVolumeData";

type IpfTrendPoint = {
  name: string;
  wilks: number;
  dots: number;
  weekNumber: number;
};

type StatisticsExtendedChartsProps = {
  athleteId: string;
  bwRows: Array<{
    athleteId: string;
    weekNumber: number;
    blockTitle: string;
    weekTitle: string;
    bw: number;
    weekStartDate: string | null;
  }>;
  maxes: {
    squat: number | null;
    bench: number | null;
    deadlift: number | null;
  };
  volumeRows: WeeklyVolumeRow[];
};

export default function StatisticsExtendedCharts({
  athleteId,
  bwRows,
  maxes,
  volumeRows,
}: StatisticsExtendedChartsProps) {
  const athleteBw = useMemo(
    () =>
      bwRows
        .filter((row) => row.athleteId === athleteId)
        .sort((a, b) => {
          const block = a.blockTitle.localeCompare(b.blockTitle);
          if (block !== 0) return block;
          return a.weekNumber - b.weekNumber;
        }),
    [athleteId, bwRows],
  );

  const ipfTrend = useMemo<IpfTrendPoint[]>(() => {
    const total = calculateTotal(maxes.squat, maxes.bench, maxes.deadlift);
    if (total <= 0) return [];

    return athleteBw.map((row) => {
      const bw = row.bw > 0 ? row.bw : 80;
      return {
        name: `${row.blockTitle} · ${row.weekTitle}`,
        weekNumber: row.weekNumber,
        wilks: Math.round(calculateWilks(total, bw) * 100) / 100,
        dots: Math.round(calculateDots(total, bw) * 100) / 100,
      };
    });
  }, [athleteBw, maxes]);

  const volumeByLift = useMemo(() => {
    const filtered = volumeRows.filter((row) => row.blockId);
    return filtered.map((row) => ({
      name: `${row.blockTitle} · ${row.weekTitle}`,
      Squat: Math.round(row.squat.tonnage),
      Bench: Math.round(row.bench.tonnage),
      Deadlift: Math.round(row.deadlift.tonnage),
    }));
  }, [volumeRows]);

  return (
    <div className="space-y-6">
      <div className="app-card">
        <h2 className="text-lg font-bold text-app-text">Wilks / DOTS trend</h2>
        <p className="mt-1 text-sm text-app-muted">
          Gebaseerd op current maxes en lichaamsgewicht per week.
        </p>
        {ipfTrend.length === 0 ? (
          <p className="mt-6 text-sm text-app-muted">Onvoldoende data voor IPF-punten.</p>
        ) : (
          <div className="mt-4 h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={ipfTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke={LIMITLESS_CHART_COLORS.muted} />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="wilks"
                  name="Wilks"
                  stroke={LIMITLESS_CHART_COLORS.primary}
                  strokeWidth={2}
                  dot
                />
                <Line
                  type="monotone"
                  dataKey="dots"
                  name="DOTS"
                  stroke={LIMITLESS_CHART_COLORS.secondary}
                  strokeWidth={2}
                  dot
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="app-card">
        <h2 className="text-lg font-bold text-app-text">Volume per lift</h2>
        <p className="mt-1 text-sm text-app-muted">
          Tonnage per week, uitgesplitst naar squat, bench en deadlift.
        </p>
        {volumeByLift.length === 0 ? (
          <p className="mt-6 text-sm text-app-muted">Geen volume-data gevonden.</p>
        ) : (
          <div className="mt-4 h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={volumeByLift}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="Squat" fill={LIMITLESS_CHART_COLORS.squat} />
                <Bar dataKey="Bench" fill={LIMITLESS_CHART_COLORS.bench} />
                <Bar dataKey="Deadlift" fill={LIMITLESS_CHART_COLORS.deadlift} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
