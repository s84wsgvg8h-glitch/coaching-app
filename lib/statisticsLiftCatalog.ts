import type { SbdLift } from "@/lib/chatVolumeData";

export type LiftVariantFilter = "competition" | "all_variants";

const ACCESSORY_PATTERNS = [
  "rdl",
  "romanian",
  "row",
  "leg press",
  "split squat",
  "lunge",
  "curl",
  "extension",
  "pulldown",
  "fly",
  "raise",
  "ab ",
  "core",
  "calf",
  "hip thrust",
  "good morning",
  "warm",
  "warmup",
  "warm-up",
  "opwarm",
];

const SQUAT_COMPETITION = [
  "squat",
  "competition squat",
  "comp squat",
  "back squat",
  "low bar squat",
  "high bar squat",
];

const SQUAT_VARIANTS = [
  ...SQUAT_COMPETITION,
  "paused squat",
  "tempo squat",
  "front squat",
  "safety bar squat",
];

const BENCH_COMPETITION = [
  "bench",
  "bench press",
  "competition bench",
  "comp bench",
  "paused bench",
];

const BENCH_VARIANTS = [
  ...BENCH_COMPETITION,
  "close grip bench",
  "spoto bench",
  "tempo bench",
];

const DEADLIFT_COMPETITION = [
  "deadlift",
  "competition deadlift",
  "comp deadlift",
  "conventional deadlift",
  "sumo deadlift",
];

const DEADLIFT_VARIANTS = [
  ...DEADLIFT_COMPETITION,
  "paused deadlift",
  "block pull",
  "deficit deadlift",
  "rack pull",
];

function normalizeExerciseName(name: string) {
  return name.toLowerCase().replace(/\s+/g, " ").trim();
}

function matchesAny(name: string, patterns: string[]) {
  return patterns.some(
    (pattern) => name === pattern || name.includes(pattern),
  );
}

function isAccessory(name: string) {
  return ACCESSORY_PATTERNS.some((pattern) => name.includes(pattern));
}

export type LiftClassification = {
  lift: SbdLift;
  isCompetition: boolean;
  isVariant: boolean;
};

export function categorizeLift(exerciseName: string): LiftClassification | null {
  const name = normalizeExerciseName(exerciseName);
  if (!name || isAccessory(name)) return null;

  if (matchesAny(name, SQUAT_VARIANTS) || name.includes("squat") || name.includes("knie")) {
    return {
      lift: "squat",
      isCompetition: matchesAny(name, SQUAT_COMPETITION),
      isVariant: !matchesAny(name, SQUAT_COMPETITION),
    };
  }

  if (
    matchesAny(name, BENCH_VARIANTS) ||
    (name.includes("bench") && !name.includes("incline"))
  ) {
    return {
      lift: "bench",
      isCompetition: matchesAny(name, BENCH_COMPETITION),
      isVariant: !matchesAny(name, BENCH_COMPETITION),
    };
  }

  if (matchesAny(name, DEADLIFT_VARIANTS) || name.includes("deadlift")) {
    return {
      lift: "deadlift",
      isCompetition: matchesAny(name, DEADLIFT_COMPETITION),
      isVariant: !matchesAny(name, DEADLIFT_COMPETITION),
    };
  }

  return null;
}

export function matchesLiftVariantFilter(
  classification: LiftClassification,
  filter: LiftVariantFilter,
) {
  if (filter === "all_variants") return true;
  return classification.isCompetition;
}
