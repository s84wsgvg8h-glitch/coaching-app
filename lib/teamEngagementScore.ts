import { loadCoachAthleteOverviewBasic, enrichCoachAthleteOverviewRows } from "@/lib/coachAthleteOverview";
import { supabase } from "@/lib/supabaseClient";

export type TeamEngagementBreakdown = {
  program: number;
  checkin: number;
  communication: number;
};

export type TeamEngagementScore = {
  score: number;
  breakdown: TeamEngagementBreakdown;
  history: number[];
};

function clampScore(value: number) {
  return Math.max(0, Math.min(10, Math.round(value * 10) / 10));
}

function monthWindow(monthsAgo: number) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1, 0, 0, 0, 0);
  const end = new Date(
    now.getFullYear(),
    now.getMonth() - monthsAgo + 1,
    0,
    23,
    59,
    59,
    999,
  );
  return { start, end };
}

async function loadMonthlyEngagementHistory(
  coachId: string,
  athleteIds: string[],
  programBaseline: number,
  months = 6,
): Promise<number[]> {
  if (athleteIds.length === 0) {
    return Array.from({ length: months }, () => 10);
  }

  const oldest = monthWindow(months - 1).start;

  const [{ data: checkins }, { data: messages }, { data: sets }] =
    await Promise.all([
      supabase
        .from("athlete_day_checkins")
        .select("athlete_id, updated_at")
        .in("athlete_id", athleteIds)
        .gte("updated_at", oldest.toISOString()),
      supabase
        .from("messages")
        .select("sender_id, created_at")
        .eq("receiver_id", coachId)
        .in("sender_id", athleteIds)
        .gte("created_at", oldest.toISOString()),
      supabase
        .from("athlete_exercise_sets")
        .select("athlete_id, created_at")
        .in("athlete_id", athleteIds)
        .gte("created_at", oldest.toISOString()),
    ]);

  const history: number[] = [];

  for (let monthsAgo = months - 1; monthsAgo >= 0; monthsAgo -= 1) {
    const { start, end } = monthWindow(monthsAgo);

    const checkinAthletes = new Set<string>();
    for (const row of checkins || []) {
      const at = new Date(row.updated_at as string);
      if (at >= start && at <= end) {
        checkinAthletes.add(row.athlete_id as string);
      }
    }

    const messagingAthletes = new Set<string>();
    for (const row of messages || []) {
      const at = new Date(row.created_at as string);
      if (at >= start && at <= end) {
        messagingAthletes.add(row.sender_id as string);
      }
    }

    let setCount = 0;
    for (const row of sets || []) {
      const at = new Date(row.created_at as string);
      if (at >= start && at <= end) setCount += 1;
    }

    const activityRatio = Math.min(1, setCount / Math.max(athleteIds.length * 8, 1));
    const programScore = clampScore(programBaseline * (0.55 + activityRatio * 0.45));
    const checkinScore = clampScore(
      (checkinAthletes.size / athleteIds.length) * 10,
    );
    const communicationScore = clampScore(
      (messagingAthletes.size / athleteIds.length) * 10,
    );

    history.push(
      clampScore((programScore + checkinScore + communicationScore) / 3),
    );
  }

  return history;
}

export async function loadTeamEngagementScore(
  coachId: string,
  role: string,
): Promise<TeamEngagementScore> {
  const basic = await loadCoachAthleteOverviewBasic(coachId, role);
  if (basic.length === 0) {
    return {
      score: 10,
      breakdown: { program: 10, checkin: 10, communication: 10 },
      history: [10, 10, 10, 10, 10, 10],
    };
  }

  const enriched = await enrichCoachAthleteOverviewRows(basic);
  const athleteIds = enriched.map((row) => row.id);
  const programAvg =
    enriched.reduce((sum, row) => sum + row.fillScore, 0) / enriched.length;
  const programScore = clampScore(programAvg / 10);

  const since = new Date();
  since.setDate(since.getDate() - 7);

  const [{ data: checkins }, { data: messages }] = await Promise.all([
    supabase
      .from("athlete_day_checkins")
      .select("athlete_id")
      .in("athlete_id", athleteIds)
      .gte("updated_at", since.toISOString()),
    supabase
      .from("messages")
      .select("sender_id")
      .eq("receiver_id", coachId)
      .in("sender_id", athleteIds)
      .gte("created_at", since.toISOString()),
  ]);

  const checkinAthletes = new Set(
    (checkins || []).map((row) => row.athlete_id as string),
  );
  const messagingAthletes = new Set(
    (messages || []).map((row) => row.sender_id as string),
  );

  const checkinScore = clampScore(
    (checkinAthletes.size / athleteIds.length) * 10,
  );
  const communicationScore = clampScore(
    (messagingAthletes.size / athleteIds.length) * 10,
  );

  const score = clampScore(
    (programScore + checkinScore + communicationScore) / 3,
  );

  const history = await loadMonthlyEngagementHistory(
    coachId,
    athleteIds,
    programScore,
  );
  if (history.length > 0) {
    history[history.length - 1] = score;
  }

  return {
    score,
    breakdown: {
      program: programScore,
      checkin: checkinScore,
      communication: communicationScore,
    },
    history,
  };
}
