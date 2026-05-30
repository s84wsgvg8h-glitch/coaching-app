const PRIORITY_LABELS: Record<string, string> = {
  primary: "Primary",
  secondary: "Secondary",
  tertiary: "Tertiary",
  quaternary: "Quaternary",
  quinary: "Quinary",
  senary: "Senary",
  septenary: "Septenary",
};

export function formatPriorityLabel(priority: string | null | undefined) {
  const value = (priority || "").trim().toLowerCase();
  if (!value) return "";
  return PRIORITY_LABELS[value] || value.charAt(0).toUpperCase() + value.slice(1);
}

export function getSbdLiftName(exerciseName: string) {
  const clean = exerciseName.toLowerCase();

  if (clean.includes("squat")) return "Squat";
  if (clean.includes("bench")) return "Bench press";
  if (clean.includes("deadlift")) return "Deadlift";

  return null;
}

export function formatExercisePriorityBadge(
  priority: string | null | undefined,
  exerciseName: string,
) {
  const priorityLabel = formatPriorityLabel(priority);
  const liftName = getSbdLiftName(exerciseName);

  if (priorityLabel && liftName) {
    return `${priorityLabel} ${liftName}`;
  }

  if (liftName) return liftName;
  if (priorityLabel) return priorityLabel;

  return null;
}

export function getExercisePriorityClass(priority: string | null | undefined) {
  const value = (priority || "").trim().toLowerCase();

  if (!value) return "bg-black/60 text-white";
  if (value === "primary") return "bg-red-600 text-white";
  if (value === "secondary") return "bg-orange-600 text-white";
  if (value === "tertiary") return "bg-yellow-500 text-black";
  if (value === "quaternary") return "bg-green-600 text-white";
  if (value === "quinary") return "bg-blue-600 text-white";
  if (value === "senary") return "bg-purple-600 text-white";
  if (value === "septenary") return "bg-pink-600 text-white";

  return "bg-black/60 text-white";
}
