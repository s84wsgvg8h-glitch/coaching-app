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

export function getPrescribedKgFromExercise(exercise: {
  load?: string | null;
}): string {
  const load = exercise.load?.trim() || "";
  if (!load || load.includes("%")) return "";
  return load.replace(/kg/gi, "").trim();
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
  const rpe = exercise.rpe?.trim() || "";
  const load = exercise.load?.trim() || "";

  if (load.includes("%")) {
    const value = load.replace("%", "").trim();
    if (!value) return rpe ? `RPE ${rpe}` : "-";

    const percent = Number.parseFloat(value.replace(",", "."));
    const percentLabel = Number.isFinite(percent) ? `${value}%` : `${value}%`;

    const lift = classifySbdLift(exercise.name || "");
    const max = lift && maxes ? getMaxForLift(maxes, lift) : null;
    const derivedKg = Number.isFinite(percent) ? percentToKg(percent, max) : null;
    if (derivedKg !== null) return `${percentLabel} (${derivedKg} kg)`;
    return percentLabel;
  }

  if (rpe) return `RPE ${rpe}`;

  const prescribedKg = getPrescribedKgFromExercise(exercise);
  if (prescribedKg) return `${prescribedKg} kg`;

  return "-";
}

export function getPrescriptionSummary(
  exercise: { name?: string | null; rpe?: string | null; load?: string | null },
  maxes?: AthleteCurrentMaxes | null,
): string {
  const intensity = formatPrescriptionIntensity(exercise, maxes);
  const prescribedKg = getPrescribedKgFromExercise(exercise);
  const parts: string[] = [];

  if (intensity && intensity !== "-") parts.push(intensity);
  if (prescribedKg && exercise.rpe?.trim()) {
    parts.push(`${prescribedKg} kg`);
  }

  return parts.length > 0 ? parts.join(" · ") : "-";
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
    return Math.round((weight * 100) / percentage);
  }

  // Brzycki formula — becomes invalid when reps ≥ 37 (denominator ≤ 0)
  const denominator = 1.0278 - 0.0278 * reps;
  if (denominator <= 0) return null;
  return Math.round(weight / denominator);
}

export function parseSetNumber(value: string | null | undefined): number | null {
  if (!value) return null;
  const match = value.toString().replace(",", ".").trim().match(/-?\d+(\.\d+)?/);
  if (!match) return null;
  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : null;
}
