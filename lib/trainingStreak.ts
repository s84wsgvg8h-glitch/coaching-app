import { supabase } from "@/lib/supabaseClient";

export type TrainingDayStatus = {
  date: string;
  filled: boolean;
};

export type TrainingStreak = {
  currentStreak: number;
  longestStreak: number;
  recentDays: TrainingDayStatus[];
  filledDates: Set<string>;
};

function getDateString(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDaysToDate(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export async function loadTrainingStreak(athleteId: string): Promise<TrainingStreak> {
  const empty: TrainingStreak = {
    currentStreak: 0,
    longestStreak: 0,
    recentDays: [],
    filledDates: new Set(),
  };

  const { data: blocks } = await supabase
    .from("program_blocks")
    .select("id, start_date")
    .eq("athlete_id", athleteId);

  if (!blocks?.length) return empty;

  const blockIds = blocks.map((b) => b.id);
  const blockStartById = Object.fromEntries(
    blocks.map((b) => [b.id, b.start_date as string | null]),
  );

  const { data: weeks } = await supabase
    .from("program_weeks")
    .select("id, week_number, program_block_id")
    .in("program_block_id", blockIds);

  if (!weeks?.length) return empty;

  const weekIds = weeks.map((w) => w.id);
  const weekMeta = Object.fromEntries(
    weeks.map((w) => [
      w.id,
      { weekNumber: w.week_number as number, blockId: w.program_block_id as string },
    ]),
  );

  const { data: days } = await supabase
    .from("program_days")
    .select("id, program_week_id, day_number")
    .in("program_week_id", weekIds);

  if (!days?.length) return empty;

  const dayIds = days.map((d) => d.id);

  const [{ data: checkins }, { data: setRows }] = await Promise.all([
    supabase
      .from("athlete_day_checkins")
      .select("program_day_id, updated_at, created_at")
      .eq("athlete_id", athleteId)
      .in("program_day_id", dayIds),
    supabase
      .from("athlete_exercise_sets")
      .select("program_exercise_id, updated_at, created_at")
      .eq("athlete_id", athleteId),
  ]);

  const { data: exercises } = await supabase
    .from("program_exercises")
    .select("id, program_day_id")
    .in("program_day_id", dayIds);

  const exerciseDayMap = Object.fromEntries(
    (exercises || []).map((e) => [e.id, e.program_day_id as string]),
  );

  const filledDates = new Set<string>();

  for (const checkin of checkins || []) {
    const ts = checkin.updated_at || checkin.created_at;
    if (ts) filledDates.add(String(ts).slice(0, 10));
  }

  for (const set of setRows || []) {
    const dayId = exerciseDayMap[set.program_exercise_id];
    if (!dayId) continue;
    const ts = set.updated_at || set.created_at;
    if (ts) filledDates.add(String(ts).slice(0, 10));
  }

  // Map scheduled training days to calendar dates
  for (const day of days) {
    const meta = weekMeta[day.program_week_id];
    if (!meta) continue;
    const startDate = blockStartById[meta.blockId];
    if (!startDate) continue;

    const scheduled = addDaysToDate(
      new Date(`${startDate}T12:00:00`),
      (meta.weekNumber - 1) * 7 + ((day.day_number as number) - 1),
    );
    const dateStr = getDateString(scheduled);
    if (filledDates.has(dateStr)) continue;

    // Also check if any fill happened on this scheduled day via day id mapping
    const hasCheckin = (checkins || []).some(
      (c) => c.program_day_id === day.id,
    );
    const dayExerciseIds = (exercises || [])
      .filter((e) => e.program_day_id === day.id)
      .map((e) => e.id);
    const hasSets = (setRows || []).some((s) =>
      dayExerciseIds.includes(s.program_exercise_id),
    );

    if (hasCheckin || hasSets) {
      filledDates.add(dateStr);
    }
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const recentDays: TrainingDayStatus[] = [];
  for (let i = 27; i >= 0; i -= 1) {
    const d = addDaysToDate(today, -i);
    const dateStr = getDateString(d);
    recentDays.push({ date: dateStr, filled: filledDates.has(dateStr) });
  }

  let currentStreak = 0;
  for (let i = 0; i <= 365; i += 1) {
    const d = addDaysToDate(today, -i);
    const dateStr = getDateString(d);
    if (filledDates.has(dateStr)) {
      currentStreak += 1;
    } else if (i === 0) {
      continue;
    } else {
      break;
    }
  }

  let longestStreak = 0;
  let running = 0;
  for (let i = 365; i >= 0; i -= 1) {
    const d = addDaysToDate(today, -i);
    if (filledDates.has(getDateString(d))) {
      running += 1;
      longestStreak = Math.max(longestStreak, running);
    } else {
      running = 0;
    }
  }

  return { currentStreak, longestStreak, recentDays, filledDates };
}
