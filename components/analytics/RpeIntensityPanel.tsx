"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  LineChart,
  Line,
} from "recharts";
import { supabase } from "@/lib/supabaseClient";

type RpeIntensityPanelProps = {
  athleteId: string;
};

export default function RpeIntensityPanel({ athleteId }: RpeIntensityPanelProps) {
  const [loading, setLoading] = useState(true);
  const [rpeBuckets, setRpeBuckets] = useState<Array<{ bucket: string; count: number }>>(
    [],
  );
  const [weeklyRpe, setWeeklyRpe] = useState<Array<{ week: string; avgRpe: number }>>(
    [],
  );

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data } = await supabase
        .from("athlete_exercise_sets")
        .select("rpe, created_at")
        .eq("athlete_id", athleteId)
        .order("created_at", { ascending: false })
        .limit(500);

      const buckets = new Map<string, number>();
      const weekMap = new Map<string, { total: number; count: number }>();

      for (const row of data || []) {
        const rpe = Number.parseFloat(String(row.rpe || "").replace(",", "."));
        if (!Number.isFinite(rpe) || rpe <= 0) continue;

        const bucket = rpe <= 6 ? "≤6" : rpe <= 7 ? "7" : rpe <= 8 ? "8" : rpe <= 9 ? "9" : "10";
        buckets.set(bucket, (buckets.get(bucket) || 0) + 1);

        const date = new Date(row.created_at as string);
        const weekStart = new Date(date);
        weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
        const key = weekStart.toLocaleDateString("nl-NL", {
          day: "numeric",
          month: "short",
        });
        const entry = weekMap.get(key) || { total: 0, count: 0 };
        entry.total += rpe;
        entry.count += 1;
        weekMap.set(key, entry);
      }

      setRpeBuckets(
        ["≤6", "7", "8", "9", "10"].map((bucket) => ({
          bucket,
          count: buckets.get(bucket) || 0,
        })),
      );

      setWeeklyRpe(
        [...weekMap.entries()]
          .slice(-8)
          .map(([week, entry]) => ({
            week,
            avgRpe: Math.round((entry.total / entry.count) * 10) / 10,
          })),
      );

      setLoading(false);
    }

    void load();
  }, [athleteId]);

  const totalSets = useMemo(
    () => rpeBuckets.reduce((sum, row) => sum + row.count, 0),
    [rpeBuckets],
  );

  if (loading) {
    return <div className="app-card text-sm text-app-muted">RPE data laden...</div>;
  }

  if (totalSets === 0) {
    return (
      <div className="app-card text-sm text-app-muted">
        Nog geen RPE-data gelogd voor deze atleet.
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="app-card">
        <h3 className="font-bold text-app-text">Intensiteitsverdeling (RPE)</h3>
        <div className="mt-4 h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rpeBuckets}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="bucket" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" name="Sets" fill="#7c3aed" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="app-card">
        <h3 className="font-bold text-app-text">Gemiddelde RPE per week</h3>
        <div className="mt-4 h-56">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={weeklyRpe}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" tick={{ fontSize: 11 }} />
              <YAxis domain={[5, 10]} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="avgRpe"
                name="Gem. RPE"
                stroke="#059669"
                strokeWidth={2}
                dot
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
