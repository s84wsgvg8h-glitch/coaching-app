import { getProgramDayDate } from "@/lib/athleteFillScore";
import { supabase } from "@/lib/supabaseClient";

export type AthleteLastActivity = {
  athleteId: string;
  lastActivityAt: string | null;
  daysAgo: number | null;
};

type ProgramBlock = {
  id: string;
  athlete_id: string;
  start_date: string | null;
};

type ProgramWeek = {
  id: string;
  week_number: number;
  program_block_id: string;
};

type ProgramDay = {
  id: string;
  program_week_id: string;
  day_number: number;
};

type ProgramExercise = {
  id: string;
  program_day_id: string;
};

type ActivitySetRow = {
  program_exercise_id: string;
  athlete_id: string;
  reps: string | null;
  weight: string | null;
  rpe: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type ActivityCheckinRow = {
  program_day_id: string;
  athlete_id: string;
  created_at?: string | null;
  updated_at?: string | null;
};

function daysSince(iso: string | null) {
  if (!iso) return null;
  const then = new Date(iso);
  const now = new Date();
  then.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  return Math.floor((now.getTime() - then.getTime()) / (1000 * 60 * 60 * 24));
}

function pickTimestamp(...values: Array<string | null | undefined>) {
  let best: string | null = null;
  let bestMs = -1;

  for (const value of values) {
    if (!value) continue;
    const ms = new Date(value).getTime();
    if (!Number.isFinite(ms)) continue;
    if (ms > bestMs) {
      bestMs = ms;
      best = value;
    }
  }

  return best;
}

function considerActivity(
  latestByAthlete: Map<string, string>,
  athleteId: string,
  iso: string | null | undefined,
) {
  if (!iso || !athleteId) return;
  const ms = new Date(iso).getTime();
  if (!Number.isFinite(ms)) return;

  const prev = latestByAthlete.get(athleteId);
  if (!prev || ms > new Date(prev).getTime()) {
    latestByAthlete.set(athleteId, iso);
  }
}

function dateIsoAtNoon(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}T12:00:00.000Z`;
}

function setHasLoggedData(row: ActivitySetRow) {
  return Boolean(
    (row.reps && String(row.reps).trim()) ||
      (row.weight && String(row.weight).trim()) ||
      (row.rpe && String(row.rpe).trim()),
  );
}

function buildActivityResult(
  athleteIds: string[],
  latestByAthlete: Map<string, string>,
) {
  const result = new Map<string, AthleteLastActivity>();

  for (const athleteId of athleteIds) {
    const lastActivityAt = latestByAthlete.get(athleteId) ?? null;
    result.set(athleteId, {
      athleteId,
      lastActivityAt,
      daysAgo: daysSince(lastActivityAt),
    });
  }

  return result;
}

export async function loadAthleteLastActivities(
  athleteIds: string[],
): Promise<Map<string, AthleteLastActivity>> {
  if (athleteIds.length === 0) return new Map();

  const latestByAthlete = new Map<string, string>();
  const today = new Date();
  today.setHours(23, 59, 59, 999);

  const { data: checkinRows } = await supabase
    .from("athlete_day_checkins")
    .select("athlete_id, program_day_id, created_at, updated_at")
    .in("athlete_id", athleteIds);

  for (const row of (checkinRows || []) as ActivityCheckinRow[]) {
    considerActivity(
      latestByAthlete,
      row.athlete_id,
      pickTimestamp(row.updated_at, row.created_at),
    );
  }

  const { data: blocks } = await supabase
    .from("program_blocks")
    .select("id, athlete_id, start_date")
    .in("athlete_id", athleteIds);

  const blockRows = (blocks || []) as ProgramBlock[];
  const blockIds = blockRows.map((block) => block.id);

  if (blockIds.length === 0) {
    return buildActivityResult(athleteIds, latestByAthlete);
  }

  const { data: weeks } = await supabase
    .from("program_weeks")
    .select("id, week_number, program_block_id")
    .in("program_block_id", blockIds);

  const weekRows = (weeks || []) as ProgramWeek[];
  const weekIds = weekRows.map((week) => week.id);

  if (weekIds.length === 0) {
    return buildActivityResult(athleteIds, latestByAthlete);
  }

  const { data: days } = await supabase
    .from("program_days")
    .select("id, program_week_id, day_number")
    .in("program_week_id", weekIds);

  const dayRows = (days || []) as ProgramDay[];
  const dayIds = dayRows.map((day) => day.id);

  const { data: exercises } =
    dayIds.length > 0
      ? await supabase
          .from("program_exercises")
          .select("id, program_day_id")
          .in("program_day_id", dayIds)
      : { data: [] };

  const exerciseRows = (exercises || []) as ProgramExercise[];
  const exerciseIds = exerciseRows.map((exercise) => exercise.id);

  const blockById = Object.fromEntries(blockRows.map((block) => [block.id, block]));
  const weekById = Object.fromEntries(weekRows.map((week) => [week.id, week]));
  const exerciseDayMap = Object.fromEntries(
    exerciseRows.map((exercise) => [exercise.id, exercise.program_day_id]),
  );

  const dayMetaById = new Map<
    string,
    { athleteId: string; dayDate: Date | null }
  >();

  for (const day of dayRows) {
    const week = weekById[day.program_week_id];
    const block = week ? blockById[week.program_block_id] : undefined;
    if (!week || !block?.athlete_id) continue;

    const dayDate = getProgramDayDate(
      block.start_date,
      week.week_number,
      day.day_number,
    );

    dayMetaById.set(day.id, {
      athleteId: block.athlete_id,
      dayDate,
    });
  }

  const [{ data: setRows }, { data: programCheckins }] = await Promise.all([
    exerciseIds.length > 0
      ? supabase
          .from("athlete_exercise_sets")
          .select(
            "program_exercise_id, athlete_id, set_number, reps, weight, rpe, created_at, updated_at",
          )
          .in("program_exercise_id", exerciseIds)
      : Promise.resolve({ data: [] }),
    dayIds.length > 0
      ? supabase
          .from("athlete_day_checkins")
          .select("program_day_id, athlete_id, created_at, updated_at")
          .in("program_day_id", dayIds)
      : Promise.resolve({ data: [] }),
  ]);

  for (const row of (setRows || []) as ActivitySetRow[]) {
    const ts = pickTimestamp(row.updated_at, row.created_at);
    if (ts) {
      considerActivity(latestByAthlete, row.athlete_id, ts);
    }

    if (!setHasLoggedData(row)) continue;

    const dayId = exerciseDayMap[row.program_exercise_id];
    const meta = dayId ? dayMetaById.get(dayId) : undefined;
    if (!meta?.dayDate || meta.dayDate > today) continue;

    considerActivity(
      latestByAthlete,
      row.athlete_id,
      dateIsoAtNoon(meta.dayDate),
    );
  }

  for (const row of (programCheckins || []) as ActivityCheckinRow[]) {
    const ts = pickTimestamp(row.updated_at, row.created_at);
    if (ts) {
      considerActivity(latestByAthlete, row.athlete_id, ts);
    }

    const meta = dayMetaById.get(row.program_day_id);
    if (!meta?.dayDate || meta.dayDate > today) continue;

    considerActivity(
      latestByAthlete,
      row.athlete_id,
      dateIsoAtNoon(meta.dayDate),
    );
  }

  return buildActivityResult(athleteIds, latestByAthlete);
}

export function formatLastActivityLabel(daysAgo: number | null) {
  if (daysAgo === null) return "Nog niet actief";
  if (daysAgo === 0) return "Vandaag";
  if (daysAgo === 1) return "Gisteren";
  return `${daysAgo} dagen geleden`;
}

export function formatLastActivityRich(
  lastActivityAt: string | null,
  daysAgo: number | null,
) {
  if (!lastActivityAt || daysAgo === null) return "Nog niet actief";

  const then = new Date(lastActivityAt);
  const now = new Date();
  const diffHours = Math.max(
    1,
    Math.floor((now.getTime() - then.getTime()) / (1000 * 60 * 60)),
  );

  if (daysAgo === 0) {
    return `Vandaag · ${diffHours}u geleden`;
  }

  if (daysAgo === 1) {
    return `Gisteren · ${diffHours}u geleden`;
  }

  return `${daysAgo} dagen geleden`;
}

export function formatLastActiveBadge(daysAgo: number | null) {
  const label = formatLastActivityLabel(daysAgo);
  return `Laatst actief · ${label.toLowerCase()}`;
}

/** Compact label for table badge next to athlete name (e.g. vandaag, 4d). */
export function formatActivityBadgeLabel(daysAgo: number | null) {
  if (daysAgo === null) return "—";
  if (daysAgo === 0) return "vandaag";
  return `${daysAgo}d`;
}

export type ActivityBadgeTone =
  | "unknown"
  | "fresh"
  | "recent"
  | "warm"
  | "aging"
  | "inactive"
  | "stale";

/** Longer inactivity → redder badge tone. */
export function getActivityBadgeTone(daysAgo: number | null): ActivityBadgeTone {
  if (daysAgo === null) return "unknown";
  if (daysAgo === 0) return "fresh";
  if (daysAgo <= 2) return "recent";
  if (daysAgo <= 4) return "warm";
  if (daysAgo <= 6) return "aging";
  if (daysAgo <= 13) return "inactive";
  return "stale";
}

export function getActivityBadgeClassName(daysAgo: number | null) {
  return `athletes-activity-badge athletes-activity-badge--${getActivityBadgeTone(daysAgo)}`;
}
