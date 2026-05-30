export function isPriorityExercise(name: string) {
  const clean = name.toLowerCase();
  return (
    clean.includes("squat") ||
    clean.includes("bench") ||
    clean.includes("deadlift")
  );
}

export function capitalizeExerciseName(value: string | null | undefined) {
  const cleanValue = (value || "").trim();

  if (!cleanValue) return "";

  return cleanValue.charAt(0).toUpperCase() + cleanValue.slice(1);
}

export function getPriorityClass(priority: string | null | undefined) {
  const value = priority || "primary";

  if (value === "primary") return "bg-red-100 text-red-700 border-red-200";
  if (value === "secondary")
    return "bg-orange-100 text-orange-700 border-orange-200";
  if (value === "tertiary")
    return "bg-yellow-100 text-yellow-700 border-yellow-200";
  if (value === "quaternary")
    return "bg-green-100 text-green-700 border-green-200";
  if (value === "quinary") return "bg-blue-100 text-blue-700 border-blue-200";
  if (value === "senary")
    return "bg-purple-100 text-purple-700 border-purple-200";
  if (value === "septenary")
    return "bg-pink-100 text-pink-700 border-pink-200";

  return "bg-gray-100 text-gray-700 border-gray-200";
}
