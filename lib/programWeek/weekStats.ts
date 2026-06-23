import type { ProgramDay, ProgramExercise } from "@/lib/programWeek/types";

export type WeekStatsExerciseRow = {
  id: string;
  name: string;
  sets: number;
  repsPerSet: number;
  totalReps: number;
  intensity: string;
};

export type WeekStatsDayGroup = {
  dayId: string;
  dayTitle: string;
  dateLabel: string;
  exercises: WeekStatsExerciseRow[];
  totalSets: number;
  totalReps: number;
};

export type WeekStatsSbdItem = {
  label: string;
  sets: number;
  reps: number;
};

export type WeekStatsReport = {
  days: WeekStatsDayGroup[];
  sbd: WeekStatsSbdItem[];
  weekTotalSets: number;
  weekTotalReps: number;
  exerciseCount: number;
};

function getPlannedNumber(value: string | null | undefined) {
  if (!value) return 0;

  const match = value.toString().replace(",", ".").match(/\d+(\.\d+)?/);
  if (!match) return 0;

  const numberValue = Number(match[0]);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function getIntensityLabel(exercise: ProgramExercise) {
  if (exercise.rpe?.trim()) return `RPE ${exercise.rpe.trim()}`;
  if (exercise.load?.trim()) return exercise.load.trim();
  return "—";
}

function classifySbd(name: string): "squat" | "bench" | "deadlift" | null {
  const cleanName = name.toLowerCase();
  if (cleanName.includes("squat")) return "squat";
  if (cleanName.includes("bench")) return "bench";
  if (cleanName.includes("deadlift")) return "deadlift";
  return null;
}

export function buildWeekStatsReport(
  days: ProgramDay[],
  exercisesByDay: Record<string, ProgramExercise[]>,
  getDayDateLabel: (day: ProgramDay) => string,
): WeekStatsReport {
  const sbdTotals = {
    squat: { label: "SQ", sets: 0, reps: 0 },
    bench: { label: "BP", sets: 0, reps: 0 },
    deadlift: { label: "DL", sets: 0, reps: 0 },
  };

  let weekTotalSets = 0;
  let weekTotalReps = 0;
  let exerciseCount = 0;

  const dayGroups: WeekStatsDayGroup[] = days.map((day) => {
    const exercises = exercisesByDay[day.id] || [];
    let daySets = 0;
    let dayReps = 0;

    const rows: WeekStatsExerciseRow[] = exercises.map((exercise) => {
      const sets = getPlannedNumber(exercise.sets);
      const repsPerSet = getPlannedNumber(exercise.reps);
      const totalReps = sets * repsPerSet;

      daySets += sets;
      dayReps += totalReps;
      weekTotalSets += sets;
      weekTotalReps += totalReps;
      exerciseCount += 1;

      const sbdKind = classifySbd(exercise.name || "");
      if (sbdKind) {
        sbdTotals[sbdKind].sets += sets;
        sbdTotals[sbdKind].reps += totalReps;
      }

      return {
        id: exercise.id,
        name: exercise.name,
        sets,
        repsPerSet,
        totalReps,
        intensity: getIntensityLabel(exercise),
      };
    });

    return {
      dayId: day.id,
      dayTitle: day.title,
      dateLabel: getDayDateLabel(day),
      exercises: rows,
      totalSets: daySets,
      totalReps: dayReps,
    };
  });

  return {
    days: dayGroups,
    sbd: [sbdTotals.squat, sbdTotals.bench, sbdTotals.deadlift],
    weekTotalSets,
    weekTotalReps,
    exerciseCount,
  };
}
