import { formatPrescriptionIntensity } from "@/lib/exercisePrescription";
import type { AthleteCurrentMaxes } from "@/lib/athleteCurrentMaxes";
import type { ProgramExercise } from "@/lib/programWeek/types";

export function getExerciseColorClass(exerciseName: string | null | undefined) {
  const cleanName = (exerciseName || "").toLowerCase();

  if (cleanName.includes("squat")) {
    return "bg-[#6fa8dc] border-[#6fa8dc] hover:bg-[#669fd3]";
  }

  if (
    cleanName.includes("benchpress") ||
    cleanName.includes("bench press") ||
    cleanName.includes("bench")
  ) {
    return "bg-[#9fc5e8] border-[#9fc5e8] hover:bg-[#94badf]";
  }

  if (cleanName.includes("deadlift")) {
    return "bg-[#cfe2f3] border-[#cfe2f3] hover:bg-[#c4d7e8]";
  }

  return "bg-gray-50 border-gray-200 hover:border-black hover:bg-gray-100";
}

export function getCoachExerciseColorClass(exerciseName: string | null | undefined) {
  const cleanName = (exerciseName || "").toLowerCase();

  if (cleanName.includes("squat")) {
    return "coach-exercise-tone coach-exercise-tone-squat";
  }

  if (
    cleanName.includes("benchpress") ||
    cleanName.includes("bench press") ||
    cleanName.includes("bench")
  ) {
    return "coach-exercise-tone coach-exercise-tone-bench";
  }

  if (cleanName.includes("deadlift")) {
    return "coach-exercise-tone coach-exercise-tone-deadlift";
  }

  return "coach-exercise-tone coach-exercise-tone-default";
}

export function getExercisePriority(exercise: ProgramExercise) {
  return (exercise.priority || "").toString().trim().toLowerCase();
}

export function getExercisePriorityLabel(exercise: ProgramExercise) {
  const priority = getExercisePriority(exercise);

  if (!priority) return "";
  if (priority === "primary") return "Primary";
  if (priority === "secondary") return "Secondary";
  if (priority === "tertiary") return "Tertiary";
  if (priority === "quaternary") return "Quaternary";
  if (priority === "quinary") return "Quinary";
  if (priority === "senary") return "Senary";
  if (priority === "septenary") return "Septenary";

  return "";
}

export function getExercisePriorityShortLabel(exercise: ProgramExercise) {
  const label = getExercisePriorityLabel(exercise);
  if (!label) return "—";
  return label.slice(0, 3).toUpperCase();
}

export function getCoachExercisePriorityClass(exercise: ProgramExercise) {
  const priority = getExercisePriority(exercise);

  if (!priority) return "coach-program-priority coach-program-priority-empty";

  return `coach-program-priority coach-program-priority-${priority}`;
}

export function getExercisePriorityClass(exercise: ProgramExercise) {
  const priority = getExercisePriority(exercise);

  if (!priority) {
    return "bg-gray-50 text-gray-500 border-gray-200";
  }

  if (priority === "primary") {
    return "bg-red-100 text-red-700 border-red-200";
  }

  if (priority === "secondary") {
    return "bg-orange-100 text-orange-700 border-orange-200";
  }

  if (priority === "tertiary") {
    return "bg-yellow-100 text-yellow-700 border-yellow-200";
  }

  if (priority === "quaternary") {
    return "bg-green-100 text-green-700 border-green-200";
  }

  if (priority === "quinary") {
    return "bg-blue-100 text-blue-700 border-blue-200";
  }

  if (priority === "senary") {
    return "bg-purple-100 text-purple-700 border-purple-200";
  }

  if (priority === "septenary") {
    return "bg-pink-100 text-pink-700 border-pink-200";
  }

  return "bg-gray-100 text-gray-700 border-gray-200";
}

export function getIntensityType(exercise: ProgramExercise) {
  if (exercise.rpe) return "rpe";
  if (exercise.load?.includes("%")) return "%";
  if (exercise.load?.toLowerCase().includes("kg")) return "kg";
  return "rpe";
}

export function getIntensityValue(exercise: ProgramExercise) {
  if (exercise.rpe) return exercise.rpe;
  if (exercise.load) {
    return exercise.load.replace("%", "").replace("kg", "").replace("KG", "");
  }
  return "";
}

export function getDisplayIntensity(
  exercise: ProgramExercise,
  athleteCurrentMaxes: AthleteCurrentMaxes | null,
) {
  return formatPrescriptionIntensity(exercise, athleteCurrentMaxes);
}

export function getPlannedNumber(value: string | null | undefined) {
  if (!value) return 0;
  const match = value.toString().replace(",", ".").match(/\d+(\.\d+)?/);
  if (!match) return 0;
  const numberValue = Number(match[0]);
  return Number.isFinite(numberValue) ? numberValue : 0;
}
