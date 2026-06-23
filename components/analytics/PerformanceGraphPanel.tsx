"use client";

import { useEffect, useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import { supabase } from "@/lib/supabaseClient";
import { loadAthleteSbdVolumeData } from "@/lib/chatVolumeData";
import { loadWeeklyE1rmTrend } from "@/lib/e1rmTrend";
import { isUpcomingCompetition, type Competition } from "@/lib/competitions";
import { normalizeJoinedCompetition } from "@/lib/orgAthleteScope";

type PerformanceGraphPanelProps = {
  athleteId: string;
  athleteName?: string;
};

type ChartPoint = {
  label: string;
  volume: number;
  e1rm: number | null;
  meetMarker: number | null;
};

export default function PerformanceGraphPanel({
  athleteId,
  athleteName = "Atleet",
}: PerformanceGraphPanelProps) {
  const [loading, setLoading] = useState(true);
  const [points, setPoints] = useState<ChartPoint[]>([]);

  useEffect(() => {
    async function load() {
      setLoading(true);

      const [volumeRows, e1rmTrend, { data: competitions }] = await Promise.all([
        loadAthleteSbdVolumeData(athleteId),
        loadWeeklyE1rmTrend(athleteId, 12),
        supabase
          .from("athlete_competitions")
          .select("competition_id, wedstrijden(id, naam, start_date, end_date)")
          .eq("athlete_id", athleteId),
      ]);

      const meetDates = new Set<string>();
      for (const row of competitions || []) {
        const raw = normalizeJoinedCompetition(row.wedstrijden);
        if (!raw?.start_date) continue;
        const comp = raw as Competition;
        if (isUpcomingCompetition(comp)) {
          meetDates.add(comp.start_date);
        }
      }

      const e1rmByWeek = new Map(
        e1rmTrend.map((row) => [row.weekKey, row.average]),
      );

      const chartPoints: ChartPoint[] = volumeRows.slice(-12).map((row) => {
        const weekStart = new Date(row.date);
        weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
        const key = weekStart.toISOString().slice(0, 10);
        const e1rm = e1rmByWeek.get(key) ?? null;

        return {
          label: row.weekTitle,
          volume: Math.round(
            row.squat.tonnage + row.bench.tonnage + row.deadlift.tonnage,
          ),
          e1rm,
          meetMarker: meetDates.has(row.date) ? e1rm : null,
        };
      });

      if (chartPoints.length === 0 && e1rmTrend.length > 0) {
        for (const row of e1rmTrend) {
          chartPoints.push({
            label: row.weekLabel,
            volume: 0,
            e1rm: row.average,
            meetMarker: null,
          });
        }
      }

      setPoints(chartPoints);
      setLoading(false);
    }

    void load();
  }, [athleteId]);

  const maxVolume = useMemo(
    () => Math.max(...points.map((p) => p.volume), 1),
    [points],
  );

  if (loading) {
    return (
      <div className="app-card">
        <p className="text-sm text-app-muted">Performance grafiek laden...</p>
      </div>
    );
  }

  if (points.length === 0) {
    return (
      <div className="app-card">
        <p className="text-sm text-app-muted">
          Geen performance data voor {athleteName}.
        </p>
      </div>
    );
  }

  return (
    <div className="app-card">
      <h2 className="text-lg font-bold text-app-text">Performance — {athleteName}</h2>
      <p className="mt-1 text-sm text-app-muted">
        Volume, e1RM-trend uit gelogde sets en wedstrijddata.
      </p>

      <div className="mt-4 h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis yAxisId="vol" tick={{ fontSize: 11 }} domain={[0, maxVolume * 1.1]} />
            <YAxis yAxisId="e1rm" orientation="right" tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend />
            <Line
              yAxisId="vol"
              type="monotone"
              dataKey="volume"
              name="Volume (kg)"
              stroke="#7c3aed"
              strokeWidth={2}
              dot={false}
            />
            <Line
              yAxisId="e1rm"
              type="monotone"
              dataKey="e1rm"
              name="Gem. e1RM (logs)"
              stroke="#059669"
              strokeWidth={2}
              connectNulls
              dot={{ r: 3 }}
            />
            <Line
              yAxisId="e1rm"
              type="monotone"
              dataKey="meetMarker"
              name="Wedstrijd"
              stroke="#dc2626"
              strokeWidth={0}
              dot={{ r: 6, fill: "#dc2626" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
