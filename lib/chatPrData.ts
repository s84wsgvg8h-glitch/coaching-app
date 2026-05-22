import { supabase } from "@/lib/supabaseClient";
import {
  formatLiftLabel,
  type SbdLift,
} from "@/lib/chatVolumeData";

export { formatLiftLabel, type SbdLift };

export type RepMaxEntry = {
  reps: number;
  weight: number;
};

export type LiftPrData = {
  lift: SbdLift;
  repMaxes: RepMaxEntry[];
};

const SBD_LIFTS: SbdLift[] = ["squat", "bench", "deadlift"];
const MAX_REP_COUNT = 20;

function normalizeExerciseName(name: string) {
  return name.trim().toLowerCase().replace(/[\s\-_]+/g, "");
}

export function classifyStrictSbdLift(exerciseName: string): SbdLift | null {
  const normalized = normalizeExerciseName(exerciseName);

  if (normalized === "squat") return "squat";
  if (normalized === "bench" || normalized === "benchpress") return "bench";
  if (normalized === "deadlift") return "deadlift";

  return null;
}

function parseNumber(value: string | null | undefined) {
  if (!value) return null;

  const normalized = value.replace(",", ".").trim();
  if (!normalized || normalized.includes("%")) return null;

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseReps(value: string | null | undefined) {
  const parsed = parseNumber(value);
  if (parsed === null) return null;

  const reps = Math.round(parsed);
  if (reps < 1 || reps > MAX_REP_COUNT) return null;

  return reps;
}

function emptyRepMaxMap() {
  return new Map<number, number>();
}

export function buildLiftPrData(
  repMaxesByLift: Record<SbdLift, Map<number, number>>,
): LiftPrData[] {
  return SBD_LIFTS.map((lift) => ({
    lift,
    repMaxes: Array.from(repMaxesByLift[lift].entries())
      .map(([reps, weight]) => ({ reps, weight }))
      .sort((a, b) => a.reps - b.reps),
  }));
}

export function formatRepMaxLabel(reps: number) {
  return reps === 1 ? "1RM" : `${reps}RM`;
}

export function formatRepMaxWeight(weight: number) {
  const rounded =
    Number.isInteger(weight) || weight % 1 === 0
      ? weight.toFixed(0)
      : weight.toFixed(1).replace(/\.0$/, "");

  return `${rounded} kg`;
}

export async function loadAthleteSbdPrData(athleteId: string) {
  const { data: blocks, error: blocksError } = await supabase
    .from("program_blocks")
    .select("id")
    .eq("athlete_id", athleteId);

  if (blocksError) {
    throw new Error(blocksError.message);
  }

  if (!blocks?.length) {
    return buildLiftPrData({
      squat: emptyRepMaxMap(),
      bench: emptyRepMaxMap(),
      deadlift: emptyRepMaxMap(),
    });
  }

  const blockIds = blocks.map((block) => block.id);

  const { data: weeks, error: weeksError } = await supabase
    .from("program_weeks")
    .select("id")
    .in("program_block_id", blockIds);

  if (weeksError) {
    throw new Error(weeksError.message);
  }

  if (!weeks?.length) {
    return buildLiftPrData({
      squat: emptyRepMaxMap(),
      bench: emptyRepMaxMap(),
      deadlift: emptyRepMaxMap(),
    });
  }

  const weekIds = weeks.map((week) => week.id);

  const { data: days, error: daysError } = await supabase
    .from("program_days")
    .select("id")
    .in("program_week_id", weekIds);

  if (daysError) {
    throw new Error(daysError.message);
  }

  if (!days?.length) {
    return buildLiftPrData({
      squat: emptyRepMaxMap(),
      bench: emptyRepMaxMap(),
      deadlift: emptyRepMaxMap(),
    });
  }

  const dayIds = days.map((day) => day.id);

  const { data: exercises, error: exercisesError } = await supabase
    .from("program_exercises")
    .select("id, name")
    .in("program_day_id", dayIds);

  if (exercisesError) {
    throw new Error(exercisesError.message);
  }

  if (!exercises?.length) {
    return buildLiftPrData({
      squat: emptyRepMaxMap(),
      bench: emptyRepMaxMap(),
      deadlift: emptyRepMaxMap(),
    });
  }

  const exerciseById = Object.fromEntries(
    exercises.map((exercise) => [exercise.id, exercise]),
  );
  const exerciseIds = exercises.map((exercise) => exercise.id);

  const { data: setRows, error: setRowsError } = await supabase
    .from("athlete_exercise_sets")
    .select("program_exercise_id, reps, weight")
    .eq("athlete_id", athleteId)
    .in("program_exercise_id", exerciseIds);

  if (setRowsError) {
    throw new Error(setRowsError.message);
  }

  const repMaxesByLift: Record<SbdLift, Map<number, number>> = {
    squat: emptyRepMaxMap(),
    bench: emptyRepMaxMap(),
    deadlift: emptyRepMaxMap(),
  };

  for (const setRow of setRows || []) {
    const exercise = exerciseById[setRow.program_exercise_id];
    if (!exercise) continue;

    const lift = classifyStrictSbdLift(exercise.name || "");
    if (!lift) continue;

    const reps = parseReps(setRow.reps);
    const weight = parseNumber(setRow.weight);
    if (reps === null || weight === null || weight <= 0) continue;

    const currentMax = repMaxesByLift[lift].get(reps);
    if (currentMax === undefined || weight > currentMax) {
      repMaxesByLift[lift].set(reps, weight);
    }
  }

  return buildLiftPrData(repMaxesByLift);
}

export function hasAnyPrData(lifts: LiftPrData[]) {
  return lifts.some((lift) => lift.repMaxes.length > 0);
}
