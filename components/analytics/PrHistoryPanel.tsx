"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  classifySbdLift,
  estimateE1rmFromSet,
  parseSetNumber,
} from "@/lib/exercisePrescription";

type PrHistoryPanelProps = {
  athleteId: string;
};

type PrRow = {
  id: string;
  lift: string;
  e1rm: number;
  weight: number;
  reps: number;
  date: string;
  exerciseName: string;
};

export default function PrHistoryPanel({ athleteId }: PrHistoryPanelProps) {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<PrRow[]>([]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data } = await supabase
        .from("athlete_exercise_sets")
        .select("id, weight, reps, created_at, program_exercises(name)")
        .eq("athlete_id", athleteId)
        .order("created_at", { ascending: false })
        .limit(400);

      const bestByLift = new Map<string, PrRow>();

      for (const row of data || []) {
        const weight = parseSetNumber(row.weight as string);
        const reps = parseSetNumber(row.reps as string);
        if (weight === null || reps === null) continue;

        const exerciseName =
          (row.program_exercises as { name?: string } | null)?.name || "";
        const lift = classifySbdLift(exerciseName);
        if (!lift) continue;

        const e1rm = estimateE1rmFromSet(weight, reps);
        if (e1rm === null) continue;

        const current = bestByLift.get(lift);
        if (!current || e1rm > current.e1rm) {
          bestByLift.set(lift, {
            id: row.id as string,
            lift: lift.toUpperCase(),
            e1rm,
            weight,
            reps,
            date: new Date(row.created_at as string).toLocaleDateString("nl-NL"),
            exerciseName,
          });
        }
      }

      setRows([...bestByLift.values()].sort((a, b) => b.e1rm - a.e1rm));
      setLoading(false);
    }

    void load();
  }, [athleteId]);

  if (loading) {
    return <div className="app-card text-sm text-app-muted">PR-geschiedenis laden...</div>;
  }

  if (rows.length === 0) {
    return (
      <div className="app-card text-sm text-app-muted">
        Nog geen PR&apos;s uit gelogde sets.
      </div>
    );
  }

  return (
    <div className="app-card overflow-x-auto">
      <h3 className="font-bold text-app-text">PR-geschiedenis (e1RM uit logs)</h3>
      <table className="mt-4 w-full min-w-[520px] text-sm">
        <thead>
          <tr className="border-b border-app-border text-left text-xs uppercase text-app-muted">
            <th className="py-2">Lift</th>
            <th className="py-2">e1RM</th>
            <th className="py-2">Set</th>
            <th className="py-2">Oefening</th>
            <th className="py-2">Datum</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-app-border/60">
              <td className="py-2 font-semibold">{row.lift}</td>
              <td className="py-2">{row.e1rm} kg</td>
              <td className="py-2">
                {row.weight} × {row.reps}
              </td>
              <td className="py-2">{row.exerciseName}</td>
              <td className="py-2 text-app-muted">{row.date}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
