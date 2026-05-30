import type { SupabaseClient } from "@supabase/supabase-js";
import {
  calculateAthleteFillScore,
  type FillScoreBlock,
  type FillScoreCheckin,
  type FillScoreDay,
  type FillScoreExercise,
  type FillScoreSetRow,
  type FillScoreWeek,
} from "@/lib/athleteFillScore";

export type PlatformStats = {
  totalUsers: number;
  coaches: number;
  athletes: number;
  pending: number;
  admins: number;
  chatMessages30d: number;
  chatGroups: number;
  avgInvulscore: number | null;
  athletesWithPrograms: number;
};

export type GrowthMonth = {
  month: string;
  signups: number;
};

export type CoachPerformanceRow = {
  coachId: string;
  coachName: string;
  athleteCount: number;
  avgInvulscore: number;
  organizationName: string | null;
};

export type InvulscoreOverview = {
  average: number;
  median: number;
  below50: number;
  athletesScored: number;
};

async function loadFillScoresForAthleteIds(
  admin: SupabaseClient,
  athleteIds: string[],
  athleteNames: Map<string, string>,
): Promise<Map<string, number>> {
  const scores = new Map<string, number>();
  if (athleteIds.length === 0) return scores;

  for (const id of athleteIds) {
    scores.set(id, 100);
  }

  const { data: blocks } = await admin
    .from("program_blocks")
    .select("id, athlete_id, start_date")
    .in("athlete_id", athleteIds);

  const blockRows = (blocks || []) as FillScoreBlock[];
  if (blockRows.length === 0) return scores;

  const blockIds = blockRows.map((b) => b.id);
  const { data: weeks } = await admin
    .from("program_weeks")
    .select("id, week_number, program_block_id")
    .in("program_block_id", blockIds);

  const weekRows = (weeks || []) as FillScoreWeek[];
  const weekIds = weekRows.map((w) => w.id);
  if (weekIds.length === 0) return scores;

  const { data: days } = await admin
    .from("program_days")
    .select("id, program_week_id, day_number")
    .in("program_week_id", weekIds);

  const dayRows = (days || []) as FillScoreDay[];
  const dayIds = dayRows.map((d) => d.id);
  if (dayIds.length === 0) return scores;

  const { data: exercises } = await admin
    .from("program_exercises")
    .select("id, program_day_id, name, sets, reps, rpe, load")
    .in("program_day_id", dayIds);

  const exerciseRows = (exercises || []) as FillScoreExercise[];
  const exerciseIds = exerciseRows.map((e) => e.id);

  const [{ data: setRows }, { data: checkins }] = await Promise.all([
    exerciseIds.length > 0
      ? admin
          .from("athlete_exercise_sets")
          .select("program_exercise_id, athlete_id, set_number, reps, weight, rpe")
          .in("program_exercise_id", exerciseIds)
      : Promise.resolve({ data: [] }),
    admin
      .from("athlete_day_checkins")
      .select("program_day_id, athlete_id, bw, recovery, fatigue, notes")
      .in("program_day_id", dayIds),
  ]);

  const allSets = (setRows || []) as FillScoreSetRow[];
  const allCheckins = (checkins || []) as FillScoreCheckin[];

  for (const athleteId of athleteIds) {
    const athleteBlocks = blockRows.filter((b) => b.athlete_id === athleteId);
    const athleteWeeks = weekRows.filter((w) =>
      athleteBlocks.some((b) => b.id === w.program_block_id),
    );
    const athleteDays = dayRows.filter((d) =>
      athleteWeeks.some((w) => w.id === d.program_week_id),
    );
    const athleteDayIds = new Set(athleteDays.map((d) => d.id));
    const athleteExercises = exerciseRows.filter((e) =>
      athleteDayIds.has(e.program_day_id),
    );
    const athleteExerciseIds = new Set(athleteExercises.map((e) => e.id));

    const result = calculateAthleteFillScore({
      athleteId,
      athleteName: athleteNames.get(athleteId) || "Atleet",
      blocks: athleteBlocks,
      weeks: athleteWeeks,
      days: athleteDays,
      exercises: athleteExercises,
      setRows: allSets.filter(
        (s) =>
          s.athlete_id === athleteId &&
          athleteExerciseIds.has(s.program_exercise_id),
      ),
      checkins: allCheckins.filter(
        (c) => c.athlete_id === athleteId && athleteDayIds.has(c.program_day_id),
      ),
    });

    scores.set(athleteId, result.percentage);
  }

  return scores;
}

export async function fetchPlatformStats(
  admin: SupabaseClient,
): Promise<PlatformStats> {
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, role");

  const rows = profiles || [];
  const athletes = rows.filter((p) => p.role === "atleet");
  const athleteIds = athletes.map((a) => a.id);

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [messagesResult, groupsResult, blocksResult] = await Promise.all([
    admin
      .from("messages")
      .select("id", { count: "exact", head: true })
      .gte("created_at", thirtyDaysAgo.toISOString()),
    admin.from("chat_groups").select("id", { count: "exact", head: true }),
    admin
      .from("program_blocks")
      .select("athlete_id")
      .in(
        "athlete_id",
        athleteIds.length > 0 ? athleteIds : ["00000000-0000-0000-0000-000000000000"],
      ),
  ]);

  const athleteNames = new Map(
    athletes.map((a) => [a.id, "Atleet"]),
  );

  const fillScores = await loadFillScoresForAthleteIds(
    admin,
    athleteIds,
    athleteNames,
  );

  const percentages = [...fillScores.values()];
  const avgInvulscore =
    percentages.length > 0
      ? Math.round(
          percentages.reduce((sum, v) => sum + v, 0) / percentages.length,
        )
      : null;

  const athletesWithPrograms = new Set(
    (blocksResult.data || []).map((b) => b.athlete_id),
  ).size;

  return {
    totalUsers: rows.length,
    coaches: rows.filter((p) => p.role === "coach").length,
    athletes: athletes.length,
    pending: rows.filter((p) => p.role === "pending").length,
    admins: rows.filter((p) => p.role === "admin").length,
    chatMessages30d: messagesResult.count ?? 0,
    chatGroups: groupsResult.count ?? 0,
    avgInvulscore,
    athletesWithPrograms,
  };
}

export async function fetchInvulscoreOverview(
  admin: SupabaseClient,
): Promise<InvulscoreOverview> {
  const { data: athletes } = await admin
    .from("profiles")
    .select("id, full_name")
    .eq("role", "atleet");

  const athleteRows = athletes || [];
  const names = new Map(
    athleteRows.map((a) => [a.id, a.full_name || "Atleet"]),
  );

  const scores = await loadFillScoresForAthleteIds(
    admin,
    athleteRows.map((a) => a.id),
    names,
  );

  const values = [...scores.values()].sort((a, b) => a - b);
  if (values.length === 0) {
    return { average: 0, median: 0, below50: 0, athletesScored: 0 };
  }

  const average = Math.round(
    values.reduce((sum, v) => sum + v, 0) / values.length,
  );
  const mid = Math.floor(values.length / 2);
  const median =
    values.length % 2 === 0
      ? Math.round((values[mid - 1]! + values[mid]!) / 2)
      : values[mid]!;

  return {
    average,
    median,
    below50: values.filter((v) => v < 50).length,
    athletesScored: values.length,
  };
}

export async function fetchCoachPerformance(
  admin: SupabaseClient,
): Promise<CoachPerformanceRow[]> {
  const { data: coaches } = await admin
    .from("profiles")
    .select("id, full_name, organization_id")
    .eq("role", "coach");

  const { data: athletes } = await admin
    .from("profiles")
    .select("id, full_name, coach_id")
    .eq("role", "atleet");

  const { data: orgs } = await admin.from("coach_organizations").select("id, name");

  const orgMap = new Map((orgs || []).map((o) => [o.id, o.name]));

  const athleteRows = athletes || [];
  const names = new Map(
    athleteRows.map((a) => [a.id, a.full_name || "Atleet"]),
  );

  const allScores = await loadFillScoresForAthleteIds(
    admin,
    athleteRows.map((a) => a.id),
    names,
  );

  return (coaches || []).map((coach) => {
    const coachAthletes = athleteRows.filter((a) => a.coach_id === coach.id);
    const scoreValues = coachAthletes.map(
      (a) => allScores.get(a.id) ?? 100,
    );
    const avgInvulscore =
      scoreValues.length > 0
        ? Math.round(
            scoreValues.reduce((sum, v) => sum + v, 0) / scoreValues.length,
          )
        : 100;

    return {
      coachId: coach.id,
      coachName: coach.full_name || "Coach",
      athleteCount: coachAthletes.length,
      avgInvulscore,
      organizationName: coach.organization_id
        ? orgMap.get(coach.organization_id) ?? null
        : null,
    };
  });
}

export async function fetchGrowthAnalytics(
  admin: SupabaseClient,
  monthsBack = 12,
): Promise<GrowthMonth[]> {
  const { data: users } = await admin.auth.admin.listUsers({
    perPage: 1000,
  });

  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - monthsBack);

  const buckets = new Map<string, number>();

  for (const user of users.users) {
    const created = user.created_at ? new Date(user.created_at) : null;
    if (!created || created < cutoff) continue;
    const key = `${created.getFullYear()}-${String(created.getMonth() + 1).padStart(2, "0")}`;
    buckets.set(key, (buckets.get(key) || 0) + 1);
  }

  const result: GrowthMonth[] = [];
  const cursor = new Date(cutoff);
  const end = new Date();

  while (cursor <= end) {
    const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`;
    result.push({ month: key, signups: buckets.get(key) || 0 });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return result;
}

export async function fetchActiveUsers30d(
  admin: SupabaseClient,
): Promise<number> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: messageSenders } = await admin
    .from("messages")
    .select("sender_id")
    .gte("created_at", thirtyDaysAgo.toISOString());

  const { data: setLoggers } = await admin
    .from("athlete_exercise_sets")
    .select("athlete_id")
    .gte("created_at", thirtyDaysAgo.toISOString());

  const active = new Set<string>();
  for (const row of messageSenders || []) {
    if (row.sender_id) active.add(row.sender_id);
  }
  for (const row of setLoggers || []) {
    if (row.athlete_id) active.add(row.athlete_id);
  }

  return active.size;
}

export async function fetchTableCounts(
  admin: SupabaseClient,
): Promise<Record<string, number>> {
  const tables = [
    "profiles",
    "messages",
    "chat_groups",
    "program_blocks",
    "coach_invite_links",
    "coach_signup_invites",
    "wedstrijden",
    "calendar_sync_logs",
    "admin_knowledge_chunks",
  ];

  const counts: Record<string, number> = {};

  await Promise.all(
    tables.map(async (table) => {
      const { count } = await admin
        .from(table)
        .select("*", { count: "exact", head: true });
      counts[table] = count ?? 0;
    }),
  );

  return counts;
}
