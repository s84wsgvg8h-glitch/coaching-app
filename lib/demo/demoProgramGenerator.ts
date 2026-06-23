import {
  DEMO_ATHLETE_1,
  DEMO_ATHLETE_2,
  DEMO_ATHLETE_3,
  DEMO_COACH_ID,
} from "@/lib/demo/constants";

export const DEMO_PROGRAM_BLOCK = "demo-sophie-b3";
export const DEMO_PROGRAM_WEEK = "demo-sophie-b3-w11";
export const DEMO_PROGRAM_DAY = "demo-sophie-b3-w11-d1";
export const DEMO_EXERCISE_SQUAT = "demo-sophie-b3-w11-d1-ex1";
export const DEMO_EXERCISE_BENCH = "demo-sophie-b3-w11-d1-ex2";
export const DEMO_EXERCISE_DEAD = "demo-sophie-b3-w11-d3-ex1";

const WEEKS_PER_YEAR = 52;
const WEEKS_PER_BLOCK = 13;
const BLOCK_COUNT = 4;

type AthleteConfig = {
  id: string;
  prefix: string;
  squatMax: number;
  benchMax: number;
  deadliftMax: number;
  bw: number;
};

const ATHLETES: AthleteConfig[] = [
  {
    id: DEMO_ATHLETE_1,
    prefix: "sophie",
    squatMax: 180,
    benchMax: 105,
    deadliftMax: 220,
    bw: 72,
  },
  {
    id: DEMO_ATHLETE_2,
    prefix: "noah",
    squatMax: 200,
    benchMax: 130,
    deadliftMax: 240,
    bw: 93,
  },
  {
    id: DEMO_ATHLETE_3,
    prefix: "emma",
    squatMax: 115,
    benchMax: 65,
    deadliftMax: 145,
    bw: 63,
  },
];

type DayTemplate = {
  title: string;
  exercises: Array<{
    name: string;
    sets: number;
    reps: string;
    rpe: string;
    liftKey: "squat" | "bench" | "deadlift" | "accessory";
    loadFactor: number;
  }>;
};

const DAY_TEMPLATES: DayTemplate[] = [
  {
    title: "Squat & bench",
    exercises: [
      { name: "Competition Squat", sets: 4, reps: "5", rpe: "8", liftKey: "squat", loadFactor: 0.78 },
      { name: "Pause Squat", sets: 3, reps: "4", rpe: "7", liftKey: "squat", loadFactor: 0.68 },
      { name: "Competition Bench", sets: 3, reps: "6", rpe: "7.5", liftKey: "bench", loadFactor: 0.72 },
      { name: "Romanian Deadlift", sets: 3, reps: "8", rpe: "7", liftKey: "accessory", loadFactor: 0.55 },
    ],
  },
  {
    title: "Bench focus",
    exercises: [
      { name: "Competition Bench", sets: 4, reps: "5", rpe: "8", liftKey: "bench", loadFactor: 0.8 },
      { name: "Close Grip Bench", sets: 3, reps: "6", rpe: "7.5", liftKey: "bench", loadFactor: 0.7 },
      { name: "Spoto Press", sets: 3, reps: "5", rpe: "7", liftKey: "bench", loadFactor: 0.65 },
      { name: "Tricep Pushdown", sets: 3, reps: "12", rpe: "8", liftKey: "accessory", loadFactor: 0.25 },
    ],
  },
  {
    title: "Deadlift & squat",
    exercises: [
      { name: "Conventional Deadlift", sets: 4, reps: "4", rpe: "8", liftKey: "deadlift", loadFactor: 0.8 },
      { name: "Deficit Deadlift", sets: 3, reps: "4", rpe: "7.5", liftKey: "deadlift", loadFactor: 0.72 },
      { name: "Competition Squat", sets: 3, reps: "5", rpe: "7", liftKey: "squat", loadFactor: 0.7 },
      { name: "Barbell Row", sets: 3, reps: "8", rpe: "7.5", liftKey: "accessory", loadFactor: 0.35 },
    ],
  },
];

const BLOCK_TITLES = [
  "Foundation & volume",
  "Strength build",
  "Competition prep",
  "Peak & transition",
];

function addDays(dateString: string, days: number) {
  const date = new Date(dateString);
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function dateToIso(date: Date) {
  return date.toISOString();
}

function roundTo2_5(value: number) {
  return Math.round(value / 2.5) * 2.5;
}

function formatWeight(value: number) {
  const rounded = roundTo2_5(value);
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function formatRpe(value: number) {
  return String(Math.round(value * 10) / 10);
}

function hashSeed(parts: string[]) {
  let hash = 0;
  const input = parts.join(":");
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function shouldLogDay(athleteId: string, date: string) {
  const hash = hashSeed([athleteId, date]);
  return hash % 11 !== 0;
}

function getLiftMax(athlete: AthleteConfig, liftKey: DayTemplate["exercises"][number]["liftKey"]) {
  if (liftKey === "squat") return athlete.squatMax;
  if (liftKey === "bench") return athlete.benchMax;
  if (liftKey === "deadlift") return athlete.deadliftMax;
  return athlete.benchMax;
}

function getProgressFactor(globalWeek: number, weekInBlock: number, isDeload: boolean) {
  const yearlyProgress = 1 + (globalWeek / WEEKS_PER_YEAR) * 0.08;
  const blockWave = 1 + ((weekInBlock - 1) / WEEKS_PER_BLOCK) * 0.04;
  const deloadFactor = isDeload ? 0.88 : 1;
  return yearlyProgress * blockWave * deloadFactor;
}

export type DemoProgramTables = {
  program_blocks: Array<Record<string, unknown>>;
  program_weeks: Array<Record<string, unknown>>;
  program_days: Array<Record<string, unknown>>;
  program_exercises: Array<Record<string, unknown>>;
  athlete_exercise_sets: Array<Record<string, unknown>>;
  athlete_day_checkins: Array<Record<string, unknown>>;
};

export function generateDemoProgramYear(referenceDate = new Date()): DemoProgramTables {
  const today = new Date(referenceDate);
  today.setHours(0, 0, 0, 0);
  const todayIso = today.toISOString().slice(0, 10);
  const yearStart = addDays(todayIso, -(WEEKS_PER_YEAR * 7 - 1));

  const program_blocks: Array<Record<string, unknown>> = [];
  const program_weeks: Array<Record<string, unknown>> = [];
  const program_days: Array<Record<string, unknown>> = [];
  const program_exercises: Array<Record<string, unknown>> = [];
  const athlete_exercise_sets: Array<Record<string, unknown>> = [];
  const athlete_day_checkins: Array<Record<string, unknown>> = [];

  let setCounter = 0;
  let checkinCounter = 0;

  for (const athlete of ATHLETES) {
    for (let blockIndex = 0; blockIndex < BLOCK_COUNT; blockIndex += 1) {
      const blockId = `demo-${athlete.prefix}-b${blockIndex}`;
      const blockStart = addDays(yearStart, blockIndex * WEEKS_PER_BLOCK * 7);
      const blockCreatedAt = dateToIso(new Date(`${blockStart}T08:00:00.000Z`));

      program_blocks.push({
        id: blockId,
        title: `Block ${blockIndex + 1} — ${BLOCK_TITLES[blockIndex]}`,
        description: `${BLOCK_TITLES[blockIndex]} voor ${athlete.prefix}`,
        athlete_id: athlete.id,
        start_date: blockStart,
        created_by: DEMO_COACH_ID,
        macrocycle_id: null,
        created_at: blockCreatedAt,
      });

      for (let weekInBlock = 1; weekInBlock <= WEEKS_PER_BLOCK; weekInBlock += 1) {
        const globalWeek = blockIndex * WEEKS_PER_BLOCK + weekInBlock;
        const weekId = `${blockId}-w${weekInBlock}`;
        const isDeload = weekInBlock % 4 === 0;
        const weekTitle = isDeload
          ? `Week ${weekInBlock} — Deload`
          : `Week ${weekInBlock}`;

        program_weeks.push({
          id: weekId,
          title: weekTitle,
          week_number: weekInBlock,
          program_block_id: blockId,
          created_at: blockCreatedAt,
        });

        for (let dayNumber = 1; dayNumber <= DAY_TEMPLATES.length; dayNumber += 1) {
          const dayTemplate = DAY_TEMPLATES[dayNumber - 1];
          const dayId = `${weekId}-d${dayNumber}`;
          const dayDate = addDays(blockStart, (weekInBlock - 1) * 7 + (dayNumber - 1));
          const dayIsPast = dayDate <= todayIso;
          const shouldLog = dayIsPast && shouldLogDay(athlete.id, dayDate);

          program_days.push({
            id: dayId,
            title: `Dag ${dayNumber} — ${dayTemplate.title}`,
            day_number: dayNumber,
            program_week_id: weekId,
            notes: null,
            warmup: "5 min fiets + mobiliteit",
            created_at: blockCreatedAt,
          });

          if (shouldLog) {
            const bwWave =
              athlete.bw +
              Math.sin(globalWeek / 6) * 0.8 +
              ((hashSeed([athlete.id, dayDate]) % 5) - 2) * 0.1;
            const recovery = 5 + (hashSeed([athlete.id, dayDate, "recovery"]) % 5);
            const fatigue = 4 + (hashSeed([athlete.id, dayDate, "fatigue"]) % 4);

            checkinCounter += 1;
            athlete_day_checkins.push({
              id: `demo-checkin-${checkinCounter}`,
              program_day_id: dayId,
              athlete_id: athlete.id,
              bw: (Math.round(bwWave * 10) / 10).toFixed(1),
              recovery,
              fatigue,
              notes: null,
              created_at: `${dayDate}T18:30:00.000Z`,
              updated_at: `${dayDate}T18:30:00.000Z`,
            });
          }

          dayTemplate.exercises.forEach((exerciseTemplate, exerciseIndex) => {
            const exerciseId = `${dayId}-ex${exerciseIndex + 1}`;
            const prescribedSets = isDeload
              ? Math.max(2, exerciseTemplate.sets - 1)
              : exerciseTemplate.sets;
            const prescribedRpe = isDeload
              ? Math.max(6, Number(exerciseTemplate.rpe) - 1.5)
              : Number(exerciseTemplate.rpe);

            program_exercises.push({
              id: exerciseId,
              program_day_id: dayId,
              name: exerciseTemplate.name,
              sets: String(prescribedSets),
              reps: exerciseTemplate.reps,
              load: "",
              rpe: formatRpe(prescribedRpe),
              notes: null,
              exercise_number: exerciseIndex + 1,
              priority: exerciseIndex === 0 ? "primary" : "secondary",
              exercise_library_id: null,
              exercise_format: null,
              superset_group: null,
              rest_seconds: exerciseIndex === 0 ? 180 : 120,
              intensity_type: "rpe",
              created_at: blockCreatedAt,
            });

            if (!shouldLog) return;

            const progress = getProgressFactor(globalWeek, weekInBlock, isDeload);
            const liftMax = getLiftMax(athlete, exerciseTemplate.liftKey);
            const baseWeight = roundTo2_5(liftMax * exerciseTemplate.loadFactor * progress);

            for (let setNumber = 1; setNumber <= prescribedSets; setNumber += 1) {
              const backoffFactor = setNumber === 1 ? 1 : 1 - (setNumber - 1) * 0.03;
              const setWeight = roundTo2_5(baseWeight * backoffFactor);
              const setRpe = prescribedRpe + (setNumber - 1) * 0.25;
              const reps = Number(exerciseTemplate.reps.split("-")[0]) || 5;

              setCounter += 1;
              athlete_exercise_sets.push({
                id: `demo-set-${setCounter}`,
                program_exercise_id: exerciseId,
                athlete_id: athlete.id,
                set_number: setNumber,
                weight: formatWeight(setWeight),
                reps: String(reps),
                rpe: formatRpe(Math.min(10, setRpe)),
                created_at: `${dayDate}T${17 + setNumber}:00:00.000Z`,
                updated_at: `${dayDate}T${17 + setNumber}:00:00.000Z`,
              });
            }
          });
        }
      }
    }
  }

  return {
    program_blocks,
    program_weeks,
    program_days,
    program_exercises,
    athlete_exercise_sets,
    athlete_day_checkins,
  };
}

export function getDemoAthleteMaxes() {
  return ATHLETES.reduce(
    (acc, athlete) => {
      acc[athlete.id] = {
        current_max_squat: athlete.squatMax,
        current_max_bench: athlete.benchMax,
        current_max_deadlift: athlete.deadliftMax,
      };
      return acc;
    },
    {} as Record<
      string,
      { current_max_squat: number; current_max_bench: number; current_max_deadlift: number }
    >,
  );
}
