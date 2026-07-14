import { supabase } from "@/lib/supabaseClient";
import type {
  PreviousWeekSetData,
  ProgramDay,
  ProgramExercise,
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

  if (weekNumber <= 1) {
    setPreviousWeekData(null);
    setPreviousWeekMessage("Er is geen vorige week in dit block.");
    setPreviousWeekOpen(true);
    return;
  }

  setPreviousWeekOpen(true);
  setLoadingPreviousWeekSets(true);
  setPreviousWeekData(null);
  setPreviousWeekMessage("");

  const { data: previousWeek, error: previousWeekError } = await supabase
    .from("program_weeks")
    .select("*")
    .eq("program_block_id", currentBlockId)
    .eq("week_number", weekNumber - 1)
    .maybeSingle();

  if (previousWeekError) {
    setLoadingPreviousWeekSets(false);
    setPreviousWeekMessage(previousWeekError.message);
    return;
  }

  if (!previousWeek) {
    setLoadingPreviousWeekSets(false);
    setPreviousWeekMessage("Er is geen vorige week gevonden.");
    return;
  }

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

  const cleanName = (currentExercise.name || "").trim().toLowerCase();

  const sameNameInPreviousWeek = (previousExercises || []).filter(
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
    (e) => (e.name || "").trim().toLowerCase() === cleanName,
  );
  const occurrenceIndex = sameNameInCurrentDay.findIndex(
    (e) => e.id === currentExercise.id,
  );
  const previousByOccurrence =
    sameNameInPreviousWeek[Math.max(occurrenceIndex, 0)];

  const previousExercise =
    previousByExerciseNumber ?? previousByOccurrence ?? sameNameInPreviousWeek[0];

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
    weekTitle: previousWeek.title || `Week ${previousWeek.week_number}`,
    dayTitle: previousDay?.title || "Vorige week",
    exerciseName: previousExercise.name || currentExercise.name || "Oefening",
    rows: previousRows || [],
    athleteNote: previousNote?.notes || "",
  });
}
