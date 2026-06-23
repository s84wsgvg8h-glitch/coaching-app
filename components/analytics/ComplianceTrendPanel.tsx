"use client";

import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { loadAthleteWeeklyFillScoreHistory } from "@/lib/athleteFillScoreHistory";

type ComplianceTrendPanelProps = {
  athleteId: string;
};

export default function ComplianceTrendPanel({
  athleteId,
}: ComplianceTrendPanelProps) {
  const [loading, setLoading] = useState(true);
  const [points, setPoints] = useState<Array<{ week: string; score: number }>>(
    [],
  );

  useEffect(() => {
    async function load() {
      setLoading(true);
      const history = await loadAthleteWeeklyFillScoreHistory(athleteId, 8);
      setPoints(
        history.map((row) => ({
          week: row.label,
          score: row.score,
        })),
      );
      setLoading(false);
    }
    void load();
  }, [athleteId]);

  if (loading) {
    return <div className="app-card text-sm text-app-muted">Compliance laden...</div>;
  }

  if (points.length === 0) {
    return (
      <div className="app-card text-sm text-app-muted">
        Nog geen invulscore-trend beschikbaar.
      </div>
    );
  }

  return (
    <div className="app-card">
      <h3 className="font-bold text-app-text">Compliance-trend (gelogde sets/week)</h3>
      <div className="mt-4 h-56">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="week" tick={{ fontSize: 11 }} />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="score"
              name="Sets/week"
              stroke="#2563eb"
              strokeWidth={2}
              dot
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
