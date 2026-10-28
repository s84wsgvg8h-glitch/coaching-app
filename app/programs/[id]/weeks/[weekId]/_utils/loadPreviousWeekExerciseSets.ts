import { supabase } from "@/lib/supabaseClient";
import type {
  PreviousWeekSetData,
  ProgramDay,
  ProgramExercise,
  ProgramWeek,
} from "@/lib/programWeek/types";

export type LoadPreviousWeekExerciseSetsParams = {
  ownerAthleteId: string | null;
  currentBlockId: string | undefined;
  weekNumber: number | null | undefined;
  currentDay: ProgramDay;
  currentExercise: ProgramExercise;
  exercisesByDay: Record<string, ProgramExercise[]>;
  setPreviousWeekOpen: (open: boolean) => void;
  setLoadingPreviousWeekSets: (loading: boolean) => void;
  setPreviousWeekData: (data: PreviousWeekSetData | null) => void;
  setPreviousWeekMessage: (message: string) => void;
};

type ResolvedPreviousWeek = {
  week: ProgramWeek;
  blockTitle: string | null;
};

async function resolvePreviousWeek(
  ownerAthleteId: string,
  currentBlockId: string,
  weekNumber: number,
): Promise<ResolvedPreviousWeek | null> {
  if (weekNumber > 1) {
    const { data: previousWeekInBlock, error } = await supabase
      .from("program_weeks")
      .select("*")
      .eq("program_block_id", currentBlockId)
      .eq("week_number", weekNumber - 1)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (previousWeekInBlock) {
      return { week: previousWeekInBlock, blockTitle: null };
    }
  }

  const { data: blocks, error: blocksError } = await supabase
    .from("program_blocks")
    .select("id, title, start_date")
    .eq("athlete_id", ownerAthleteId)
    .order("start_date", { ascending: true });

  if (blocksError) {
    throw blocksError;
  }

  const orderedBlocks = blocks || [];
  const currentBlockIndex = orderedBlocks.findIndex(
    (block) => block.id === currentBlockId,
  );

  if (currentBlockIndex <= 0) {
    return null;
  }

  const previousBlock = orderedBlocks[currentBlockIndex - 1];

  const { data: lastWeekInPreviousBlock, error: previousWeekError } =
    await supabase
      .from("program_weeks")
      .select("*")
      .eq("program_block_id", previousBlock.id)
      .order("week_number", { ascending: false })
      .limit(1)
      .maybeSingle();

  if (previousWeekError) {
    throw previousWeekError;
  }

  if (!lastWeekInPreviousBlock) {
    return null;
  }

  return {
    week: lastWeekInPreviousBlock,
    blockTitle: previousBlock.title || null,
  };
}

function formatPreviousWeekTitle(resolved: ResolvedPreviousWeek) {
  const weekLabel =
    resolved.week.title || `Week ${resolved.week.week_number}`;

  if (resolved.blockTitle) {
    return `${resolved.blockTitle} · ${weekLabel}`;
  }

  return weekLabel;
}

function matchPreviousExercise(
  previousExercises: ProgramExercise[],
  currentDay: ProgramDay,
  currentExercise: ProgramExercise,
  exercisesByDay: Record<string, ProgramExercise[]>,
) {
  const cleanName = (currentExercise.name || "").trim().toLowerCase();

  const sameNameInPreviousWeek = previousExercises.filter(
    (item) => (item.name || "").trim().toLowerCase() === cleanName,
  );

  const previousByExerciseNumber = sameNameInPreviousWeek.find(
    (item) =>
      item.exercise_number != null &&
      item.exercise_number === currentExercise.exercise_number,
  );

  const currentDayExercises = (exercisesByDay[currentDay.id] || [])
    .slice()
    .sort((a, b) => {
      const aNum = a.exercise_number;
      const bNum = b.exercise_number;
      if (aNum == null && bNum == null) return 0;
      if (aNum == null) return 1;
      if (bNum == null) return -1;
      return aNum - bNum;
    });
  const sameNameInCurrentDay = currentDayExercises.filter(
    (exercise) => (exercise.name || "").trim().toLowerCase() === cleanName,
  );
  const occurrenceIndex = sameNameInCurrentDay.findIndex(
    (exercise) => exercise.id === currentExercise.id,
  );
  const previousByOccurrence =
    sameNameInPreviousWeek[Math.max(occurrenceIndex, 0)];

  return (
    previousByExerciseNumber ?? previousByOccurrence ?? sameNameInPreviousWeek[0]
  );
}

export async function loadPreviousWeekExerciseSets({
  ownerAthleteId,
  currentBlockId,
  weekNumber,
  currentDay,
  currentExercise,
  exercisesByDay,
  setPreviousWeekOpen,
  setLoadingPreviousWeekSets,
  setPreviousWeekData,
  setPreviousWeekMessage,
}: LoadPreviousWeekExerciseSetsParams): Promise<void> {
  if (!ownerAthleteId || !currentBlockId || weekNumber == null) {
    setPreviousWeekMessage("Vorige week kon niet worden geladen.");
    return;
  }

  setPreviousWeekOpen(true);
  setLoadingPreviousWeekSets(true);
  setPreviousWeekData(null);
  setPreviousWeekMessage("");

  let resolvedPreviousWeek: ResolvedPreviousWeek | null = null;

  try {
    resolvedPreviousWeek = await resolvePreviousWeek(
      ownerAthleteId,
      currentBlockId,
      weekNumber,
    );
  } catch (error) {
    setLoadingPreviousWeekSets(false);
    setPreviousWeekMessage(
      error instanceof Error ? error.message : "Vorige week kon niet worden geladen.",
    );
    return;
  }

  if (!resolvedPreviousWeek) {
    setLoadingPreviousWeekSets(false);
    setPreviousWeekMessage("Er is geen vorige week gevonden.");
    return;
  }

  const previousWeek = resolvedPreviousWeek.week;

  const { data: previousDays, error: previousDaysError } = await supabase
    .from("program_days")
    .select("*")
    .eq("program_week_id", previousWeek.id)
    .order("day_number", { ascending: true });

  if (previousDaysError) {
    setLoadingPreviousWeekSets(false);
    setPreviousWeekMessage(previousDaysError.message);
    return;
  }

  const sameDay = (previousDays || []).find(
    (item) => item.day_number === currentDay.day_number,
  );

  const dayIds = sameDay
    ? [sameDay.id]
    : (previousDays || []).map((item) => item.id);

  if (dayIds.length === 0) {
    setLoadingPreviousWeekSets(false);
    setPreviousWeekMessage("Vorige week heeft nog geen dagen.");
    return;
  }

  const { data: previousExercises, error: previousExercisesError } =
    await supabase
      .from("program_exercises")
      .select("*")
      .in("program_day_id", dayIds)
      .order("exercise_number", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true });

  if (previousExercisesError) {
    setLoadingPreviousWeekSets(false);
    setPreviousWeekMessage(previousExercisesError.message);
    return;
  }

  const previousExercise = matchPreviousExercise(
    previousExercises || [],
    currentDay,
    currentExercise,
    exercisesByDay,
  );

  if (!previousExercise) {
    setLoadingPreviousWeekSets(false);
    setPreviousWeekMessage("Deze oefening is vorige week niet gevonden.");
    return;
  }

  const previousDay = (previousDays || []).find(
    (item) => item.id === previousExercise.program_day_id,
  );

  const { data: previousRows, error: previousRowsError } = await supabase
    .from("athlete_exercise_sets")
    .select("*")
    .eq("program_exercise_id", previousExercise.id)
    .eq("athlete_id", ownerAthleteId)
    .order("set_number", { ascending: true });

  const { data: previousNote, error: previousNoteError } = await supabase
    .from("athlete_exercise_notes")
    .select("*")
    .eq("program_exercise_id", previousExercise.id)
    .eq("athlete_id", ownerAthleteId)
    .maybeSingle();

  setLoadingPreviousWeekSets(false);

  if (previousRowsError) {
    setPreviousWeekMessage(previousRowsError.message);
    return;
  }

  if (previousNoteError) {
    setPreviousWeekMessage(previousNoteError.message);
    return;
  }

  if (
    (!previousRows || previousRows.length === 0) &&
    !previousNote?.notes?.trim()
  ) {
    setPreviousWeekMessage(
      "Vorige week zijn er nog geen sets of athlete notes ingevuld voor deze oefening.",
    );
    return;
  }

  setPreviousWeekData({
    weekTitle: formatPreviousWeekTitle(resolvedPreviousWeek),
    dayTitle: previousDay?.title || "Vorige week",
    exerciseName: previousExercise.name || currentExercise.name || "Oefening",
    rows: previousRows || [],
    athleteNote: previousNote?.notes || "",
  });
}
