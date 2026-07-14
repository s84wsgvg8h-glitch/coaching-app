import { getAuthenticatedUser } from "@/lib/authSession";
import { supabase } from "@/lib/supabaseClient";
import type {
  ProgramBlock,
  ProgramDay,
  ProgramExercise,
  ProgramWeek,
} from "@/lib/programWeek/types";

export type ProgramWeekCoreData = {
  userId: string;
  role: string;
  block: ProgramBlock | null;
  week: ProgramWeek | null;
  days: ProgramDay[];
  exercisesByDay: Record<string, ProgramExercise[]>;
};

async function loadExercisesForDays(loadedDays: ProgramDay[]) {
  const dayIds = loadedDays.map((day) => day.id);

  if (dayIds.length === 0) {
    return {} as Record<string, ProgramExercise[]>;
  }

  const { data, error } = await supabase
    .from("program_exercises")
    .select("*")
    .in("program_day_id", dayIds)
    .order("exercise_number", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const grouped: Record<string, ProgramExercise[]> = {};

  loadedDays.forEach((day) => {
    grouped[day.id] = [];
  });

  (data || []).forEach((exercise) => {
    if (!grouped[exercise.program_day_id]) {
      grouped[exercise.program_day_id] = [];
    }
    grouped[exercise.program_day_id].push(exercise as ProgramExercise);
  });

  return grouped;
}

export async function loadProgramWeekCore(
  blockId: string,
  weekId: string,
  options?: { userId?: string; role?: string },
): Promise<ProgramWeekCoreData> {
  const user =
    options?.userId != null
      ? { id: options.userId }
      : await getAuthenticatedUser();

  if (!user) {
    throw new Error("unauthenticated");
  }

  const role = options?.role ?? "";

  const [blockResult, weekResult] = await Promise.all([
    supabase.from("program_blocks").select("*").eq("id", blockId).maybeSingle(),
    supabase.from("program_weeks").select("*").eq("id", weekId).maybeSingle(),
  ]);

  const { data: daysData } = await supabase
    .from("program_days")
    .select("*")
    .eq("program_week_id", weekId)
    .order("day_number", { ascending: true });

  const loadedDays = (daysData || []) as ProgramDay[];
  const exercisesByDay =
    loadedDays.length > 0 ? await loadExercisesForDays(loadedDays) : {};

  return {
    userId: user.id,
    role,
    block: (blockResult.data as ProgramBlock | null) ?? null,
    week: (weekResult.data as ProgramWeek | null) ?? null,
    days: loadedDays,
    exercisesByDay,
  };
}
