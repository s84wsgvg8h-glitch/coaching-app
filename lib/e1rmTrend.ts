import { supabase } from "@/lib/supabaseClient";
import {
  classifySbdLift,
  estimateE1rmFromSet,
  parseSetNumber,
} from "@/lib/exercisePrescription";

export type WeeklyE1rmPoint = {
  weekKey: string;
  weekLabel: string;
  squat: number | null;
  bench: number | null;
  deadlift: number | null;
  average: number | null;
};

function weekKeyFromDate(date: Date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  return start.toISOString().slice(0, 10);
}

function weekLabelFromKey(key: string) {
  const date = new Date(`${key}T12:00:00`);
  return date.toLocaleDateString("nl-NL", { day: "numeric", month: "short" });
}

export async function loadWeeklyE1rmTrend(
  athleteId: string,
  limitWeeks = 12,
): Promise<WeeklyE1rmPoint[]> {
  const { data: sets } = await supabase
    .from("athlete_exercise_sets")
    .select("weight, reps, created_at, program_exercise_id")
    .eq("athlete_id", athleteId)
    .order("created_at", { ascending: true });

  const exerciseIds = [
    ...new Set((sets || []).map((row) => row.program_exercise_id as string)),
  ];

  const nameByExerciseId = new Map<string, string>();
  if (exerciseIds.length > 0) {
    const { data: exercises } = await supabase
      .from("program_exercises")
      .select("id, name")
      .in("id", exerciseIds);

    for (const exercise of exercises || []) {
      nameByExerciseId.set(exercise.id as string, (exercise.name as string) || "");
    }
  }

  const byWeek = new Map<
    string,
    { squat: number[]; bench: number[]; deadlift: number[]; label: string }
  >();

  for (const row of sets || []) {
    const weight = parseSetNumber(row.weight as string);
    const reps = parseSetNumber(row.reps as string);
    if (weight === null || reps === null) continue;

    const e1rm = estimateE1rmFromSet(weight, reps);
    if (e1rm === null) continue;

    const exerciseName = nameByExerciseId.get(row.program_exercise_id as string) || "";
    const lift = classifySbdLift(exerciseName);
    if (!lift) continue;

    const createdAt = row.created_at ? new Date(row.created_at as string) : new Date();
    const key = weekKeyFromDate(createdAt);
    const bucket = byWeek.get(key) || {
      squat: [],
      bench: [],
      deadlift: [],
      label: weekLabelFromKey(key),
    };

    bucket[lift].push(e1rm);
    byWeek.set(key, bucket);
  }

  const maxOf = (values: number[]) =>
    values.length ? Math.max(...values) : null;

  return [...byWeek.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-limitWeeks)
    .map(([weekKey, bucket]) => {
      const squat = maxOf(bucket.squat);
      const bench = maxOf(bucket.bench);
      const deadlift = maxOf(bucket.deadlift);
      const parts = [squat, bench, deadlift].filter(
        (v): v is number => v !== null,
      );
      const average =
        parts.length > 0
          ? Math.round((parts.reduce((a, b) => a + b, 0) / parts.length) * 10) /
            10
          : null;

      return {
        weekKey,
        weekLabel: bucket.label,
        squat,
        bench,
        deadlift,
        average,
      };
    });
}
