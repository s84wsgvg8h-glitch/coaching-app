import type { ProgramExercise } from "@/lib/programWeek/types";

export function getIntensityInputDisplay(exercise: {
  rpe?: string | null;
  load?: string | null;
}): string {
  if (exercise.rpe?.trim()) return exercise.rpe.trim();

  const load = exercise.load?.trim() || "";
  if (load.includes("%")) return load;

  return "";
}

export function getLoadKgInputDisplay(exercise: {
  load?: string | null;
}): string {
  const load = exercise.load?.trim() || "";
  if (!load || load.includes("%")) return "";
  return load.replace(/kg/gi, "").trim();
}

export function parseIntensityInput(raw: string): {
  rpe: string;
  percentLoad: string;
} {
  const value = raw.trim();
  if (!value) return { rpe: "", percentLoad: "" };

  if (value.includes("%")) {
    const numeric = value.replace(/%/g, "").trim();
    if (!numeric) return { rpe: "", percentLoad: "" };
    return { rpe: "", percentLoad: `${numeric}%` };
  }

  const normalized = value.replace(",", ".");
  const numeric = Number.parseFloat(normalized);
  if (
    Number.isFinite(numeric) &&
    /^-?\d+([.,]\d+)?$/.test(value)
  ) {
    if (numeric >= 0 && numeric <= 10) {
      return { rpe: String(numeric), percentLoad: "" };
    }
    return { rpe: "", percentLoad: `${numeric}%` };
  }

  return { rpe: value, percentLoad: "" };
}

export function formatLoadKgValue(raw: string): string {
  const value = raw.trim();
  if (!value) return "";
  if (/kg$/i.test(value)) return value;
  return `${value}kg`;
}

export function applyIntensityInput(
  exercise: Pick<ProgramExercise, "load" | "rpe">,
  rawInt: string,
): Pick<ProgramExercise, "load" | "rpe"> {
  const { rpe, percentLoad } = parseIntensityInput(rawInt);
  const existingKg = getLoadKgInputDisplay(exercise);

  if (percentLoad) {
    return { rpe: "", load: percentLoad };
  }

  if (rpe) {
    return {
      rpe,
      load: existingKg ? formatLoadKgValue(existingKg) : "",
    };
  }

  return {
    rpe: "",
    load: existingKg ? formatLoadKgValue(existingKg) : "",
  };
}

export function applyLoadKgInput(
  exercise: Pick<ProgramExercise, "load" | "rpe">,
  rawKg: string,
): Pick<ProgramExercise, "load" | "rpe"> {
  const rpe = exercise.rpe?.trim() || "";
  const kg = formatLoadKgValue(rawKg);

  if (!kg) {
    const existing = exercise.load?.trim() || "";
    if (existing.includes("%")) {
      return { rpe: "", load: existing };
    }
    return { rpe, load: "" };
  }

  return { rpe, load: kg };
}
