import { supabase } from "@/lib/supabaseClient";
import { isCoachLikeRole } from "@/lib/authRoles";

export type ProgramBlock = {
  id: string;
  title: string;
  description?: string | null;
  athlete_id: string | null;
  start_date: string | null;
  macrocycle_id?: string | null;
};

export type ProgramWeek = {
  id: string;
  title: string;
  week_number: number;
  program_block_id: string;
};

export type ProgramDay = {
  id: string;
  title: string;
  day_number: number;
  program_week_id: string;
  notes?: string | null;
  warmup?: string | null;
};

export type ProgramExercise = {
  id: string;
  program_day_id: string;
  name: string;
  sets: string | null;
  reps: string | null;
  load: string | null;
  rpe: string | null;
  notes?: string | null;
  exercise_number: number | null;
  priority?: string | null;
  exercise_library_id?: string | null;
};

export type AthleteExerciseSet = {
  id?: string;
  program_exercise_id: string;
  athlete_id: string;
  set_number: number;
  reps: string | null;
  weight: string | null;
  rpe: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type AthleteDayCheckin = {
  id?: string;
  program_day_id: string;
  athlete_id: string;
  bw: string | null;
  recovery: number | null;
  fatigue: number | null;
  notes?: string | null;
};

export type ProgramHierarchy = {
  blocks: ProgramBlock[];
  weeks: ProgramWeek[];
  days: ProgramDay[];
  exercises: ProgramExercise[];
  sets: AthleteExerciseSet[];
  checkins: AthleteDayCheckin[];
  athleteNames: Record<string, string>;
  blockById: Record<string, ProgramBlock>;
  weekById: Record<string, ProgramWeek>;
  dayById: Record<string, ProgramDay>;
  exerciseById: Record<string, ProgramExercise>;
};

export type LoadProgramHierarchyOptions = {
  userId: string;
  role: string;
  includeSets?: boolean;
  includeCheckins?: boolean;
  coachBlocksScope?: "all" | "linked-athletes";
};

function indexById<T extends { id: string }>(items: T[]) {
  return Object.fromEntries(items.map((item) => [item.id, item])) as Record<
    string,
    T
  >;
}

export async function loadProgramHierarchy(
  options: LoadProgramHierarchyOptions,
): Promise<{ data: ProgramHierarchy | null; error: string | null }> {
  const {
    userId,
    role,
    includeSets = true,
    includeCheckins = true,
  } = options;

  let blocksQuery = supabase.from("program_blocks").select("*");

  if (isCoachLikeRole(role)) {
    blocksQuery = blocksQuery.order("start_date", {
      ascending: true,
      nullsFirst: false,
    });
  } else {
    blocksQuery = blocksQuery
      .eq("athlete_id", userId)
      .order("start_date", { ascending: true, nullsFirst: false });
  }

  const { data: blocksData, error: blocksError } = await blocksQuery;

  if (blocksError) {
    return { data: null, error: blocksError.message };
  }

  const blocks = (blocksData || []) as ProgramBlock[];
  const blockIds = blocks.map((block) => block.id);

  if (blockIds.length === 0) {
    return {
      data: {
        blocks: [],
        weeks: [],
        days: [],
        exercises: [],
        sets: [],
        checkins: [],
        athleteNames: {},
        blockById: {},
        weekById: {},
        dayById: {},
        exerciseById: {},
      },
      error: null,
    };
  }

  const athleteIds = Array.from(
    new Set(blocks.map((block) => block.athlete_id).filter(Boolean)),
  ) as string[];

  const athleteNames: Record<string, string> = {};

  if (athleteIds.length > 0) {
    const { data: athletesData } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", athleteIds);

    (athletesData || []).forEach((athlete) => {
      athleteNames[athlete.id] = athlete.full_name || "Onbekende atleet";
    });
  }

  const { data: weeksData, error: weeksError } = await supabase
    .from("program_weeks")
    .select("*")
    .in("program_block_id", blockIds)
    .order("week_number", { ascending: true });

  if (weeksError) {
    return { data: null, error: weeksError.message };
  }

  const weeks = (weeksData || []) as ProgramWeek[];
  const weekIds = weeks.map((week) => week.id);

  if (weekIds.length === 0) {
    return {
      data: {
        blocks,
        weeks: [],
        days: [],
        exercises: [],
        sets: [],
        checkins: [],
        athleteNames,
        blockById: indexById(blocks),
        weekById: {},
        dayById: {},
        exerciseById: {},
      },
      error: null,
    };
  }

  const { data: daysData, error: daysError } = await supabase
    .from("program_days")
    .select("*")
    .in("program_week_id", weekIds)
    .order("day_number", { ascending: true });

  if (daysError) {
    return { data: null, error: daysError.message };
  }

  const days = (daysData || []) as ProgramDay[];
  const dayIds = days.map((day) => day.id);

  if (dayIds.length === 0) {
    return {
      data: {
        blocks,
        weeks,
        days: [],
        exercises: [],
        sets: [],
        checkins: [],
        athleteNames,
        blockById: indexById(blocks),
        weekById: indexById(weeks),
        dayById: {},
        exerciseById: {},
      },
      error: null,
    };
  }

  const { data: exercisesData, error: exercisesError } = await supabase
    .from("program_exercises")
    .select("*")
    .in("program_day_id", dayIds)
    .order("exercise_number", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });

  if (exercisesError) {
    return { data: null, error: exercisesError.message };
  }

  const exercises = (exercisesData || []) as ProgramExercise[];
  const exerciseIds = exercises.map((exercise) => exercise.id);

  let sets: AthleteExerciseSet[] = [];
  let checkins: AthleteDayCheckin[] = [];

  if (includeSets && exerciseIds.length > 0) {
    const { data: setRowsData, error: setRowsError } = await supabase
      .from("athlete_exercise_sets")
      .select("*")
      .in("program_exercise_id", exerciseIds)
      .order("set_number", { ascending: true });

    if (setRowsError) {
      return { data: null, error: setRowsError.message };
    }

    sets = (setRowsData || []) as AthleteExerciseSet[];
  }

  if (includeCheckins) {
    const { data: dayCheckinsData, error: dayCheckinsError } = await supabase
      .from("athlete_day_checkins")
      .select("*")
      .in("program_day_id", dayIds);

    if (dayCheckinsError) {
      return { data: null, error: dayCheckinsError.message };
    }

    checkins = (dayCheckinsData || []) as AthleteDayCheckin[];
  }

  return {
    data: {
      blocks,
      weeks,
      days,
      exercises,
      sets,
      checkins,
      athleteNames,
      blockById: indexById(blocks),
      weekById: indexById(weeks),
      dayById: indexById(days),
      exerciseById: indexById(exercises),
    },
    error: null,
  };
}
