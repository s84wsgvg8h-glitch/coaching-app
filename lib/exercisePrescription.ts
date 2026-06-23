import type { AthleteCurrentMaxes } from "@/lib/athleteCurrentMaxes";
import { getMaxForLift, type SbdLiftKey } from "@/lib/athleteCurrentMaxes";
import { getPercentageForRpeAndReps } from "@/lib/rpeTable";

export type IntensityType = "rpe" | "%" | "kg";

export function getIntensityTypeFromExercise(exercise: {
  rpe?: string | null;
  load?: string | null;
}): IntensityType {
  if (exercise.rpe) return "rpe";
  if (exercise.load?.includes("%")) return "%";
  if (exercise.load?.toLowerCase().includes("kg")) return "kg";
  return "rpe";
}

export function getIntensityValueFromExercise(exercise: {
  rpe?: string | null;
  load?: string | null;
}): string {
  if (exercise.rpe) return exercise.rpe;
  if (exercise.load) {
    return exercise.load.replace("%", "").replace(/kg/gi, "").trim();
  }
  return "";
}

export function classifySbdLift(exerciseName: string): SbdLiftKey | null {
  const name = exerciseName.toLowerCase();
  if (
    name.includes("squat") ||
    name.includes("knie") ||
    name.includes("front squat") ||
    name.includes("back squat")
  ) {
    return "squat";
  }
  if (
    name.includes("bench") ||
    name.includes("bank") ||
    name.includes("press") && !name.includes("overhead") && !name.includes("shoulder")
  ) {
    return "bench";
  }
  if (
    name.includes("deadlift") ||
    name.includes("dead lift") ||
    name.includes("strek") ||
    name.includes("rdl") ||
    name.includes("romanian")
  ) {
    return "deadlift";
  }
  return null;
}

export function roundToNearestTwoPointFive(value: number) {
  return Math.round(value / 2.5) * 2.5;
}

export function percentToKg(percent: number, maxKg: number | null): number | null {
  if (maxKg === null || maxKg <= 0 || percent <= 0) return null;
  return roundToNearestTwoPointFive((percent / 100) * maxKg);
}

export function formatPrescriptionIntensity(
  exercise: { name?: string | null; rpe?: string | null; load?: string | null },
  maxes?: AthleteCurrentMaxes | null,
): string {
  const value = getIntensityValueFromExercise(exercise).trim();
  const type = getIntensityTypeFromExercise(exercise);
  if (!value) return "-";

  if (type === "%") {
    const percent = Number.parseFloat(value.replace(",", "."));
    if (!Number.isFinite(percent)) return `${value}%`;

    const lift = classifySbdLift(exercise.name || "");
    const max = lift && maxes ? getMaxForLift(maxes, lift) : null;
    const kg = percentToKg(percent, max);
    if (kg !== null) return `${value}% (${kg} kg)`;
    return `${value}%`;
  }

  if (type === "kg") return `${value} kg`;
  return `RPE ${value}`;
}

export function estimateE1rmFromSet(
  weight: number,
  reps: number,
  rpe?: number | null,
): number | null {
  if (weight <= 0 || reps <= 0) return null;

  if (
    rpe !== null &&
    rpe !== undefined &&
    Number.isFinite(rpe) &&
    rpe >= 0 &&
    rpe <= 10
  ) {
    const percentage = getPercentageForRpeAndReps(rpe, reps);
    if (percentage <= 0) return null;
    return roundToNearestTwoPointFive((weight * 100) / percentage);
  }

  return roundToNearestTwoPointFive(weight * (1 + reps / 30));
}

export function parseSetNumber(value: string | null | undefined): number | null {
  if (!value) return null;
  const match = value.toString().replace(",", ".").trim().match(/-?\d+(\.\d+)?/);
  if (!match) return null;
  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : null;
}
