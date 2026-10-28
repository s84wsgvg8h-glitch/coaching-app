import { supabase } from "@/lib/supabaseClient";
import { loadTotalAthleteIncome } from "@/lib/athletePayments";
import { isAdminRole } from "@/lib/authRoles";
import {
  applyAthleteScope,
  loadCoachOrgContext,
} from "@/lib/orgAthleteScope";
import { loadCoachTodosFast, type CoachTodo } from "@/lib/coachTodos";
import { countCoachTodosDueToday } from "@/lib/todoDueToday";
import { loadAthleteLastActivities } from "@/lib/athleteLastActivity";
import { getAthleteStatus, getAthleteStatusMeta } from "@/lib/athleteStatus";
import { getUnreadMessageCount } from "@/lib/chatUnread";
import {
  getTodayDateString,
  isUpcomingCompetition,
  loadCompetitions,
} from "@/lib/competitions";
import {
  loadCoachDashboardFeed,
  type CoachDashboardMetrics,
  type CoachInboxItem,
  type DashboardActivityItem,
} from "@/lib/coachDashboardFeed";
import type { CoachSnapshot } from "@/lib/knowledgeSearch";
import type { AttentionAthleteRow } from "@/components/dashboard/TodaysFocus";
import type { QueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { ATHLETE_QUERY_STALE_MS } from "@/lib/queryOptions";

export type CoachDashboardAthlete = {
  id: string;
  full_name: string | null;
  lidnummer?: string | null;
  betaling_prijs?: number | null;
  betaling_dag?: number | null;
};

export type CoachDashboardData = {
  pendingCount: number;
  totalIncome: number;
  payingAthleteCount: number;
  athletes: CoachDashboardAthlete[];
  coachSnapshot: CoachSnapshot;
  openTodoCount: number;
  chatUnreadCount: number;
  upcomingCompetitionCount: number;
  dashboardMetrics: CoachDashboardMetrics;
  inboxItems: CoachInboxItem[];
  activityItems: DashboardActivityItem[];
  attentionAthletes: AttentionAthleteRow[];
};

async function fetchCoachTodosCached(
  queryClient: QueryClient,
  coachId: string,
  role: string,
  isAdmin: boolean,
): Promise<CoachTodo[]> {
  return queryClient.fetchQuery({
    queryKey: queryKeys.coachTodos(coachId, role),
    queryFn: async () => {
      const { data, error } = await loadCoachTodosFast(coachId, { isAdmin });
      if (error) throw error;
      return data;
    },
    staleTime: ATHLETE_QUERY_STALE_MS,
  });
}

async function fetchChatUnreadCached(
  queryClient: QueryClient,
  userId: string,
  role: string,
): Promise<number> {
  return queryClient.fetchQuery({
    queryKey: queryKeys.notificationCount(userId, role),
    queryFn: () => getUnreadMessageCount(userId),
    staleTime: ATHLETE_QUERY_STALE_MS,
  });
}

export async function loadCoachDashboardData(
  userId: string,
  role: string,
  queryClient: QueryClient,
): Promise<CoachDashboardData> {
  const isAdmin = isAdminRole(role);

  const pendingQuery = isAdmin
    ? supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("role", "pending")
    : supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("role", "pending")
        .eq("coach_id", userId);

  const [
    ctx,
    incomeResult,
    competitionsResult,
    todos,
    chatUnread,
    pendingResult,
  ] = await Promise.all([
    loadCoachOrgContext(userId),
    loadTotalAthleteIncome(userId, role),
    loadCompetitions(),
    fetchCoachTodosCached(queryClient, userId, role, isAdmin),
    fetchChatUnreadCached(queryClient, userId, role),
    pendingQuery,
  ]);

  let athletesQuery = supabase
    .from("profiles")
    .select("id, full_name, lidnummer, betaling_prijs, betaling_dag")
    .eq("role", "atleet")
    .order("full_name", { ascending: true });

  if (ctx) {
    athletesQuery = applyAthleteScope(athletesQuery, { ...ctx, role });
  }

  const athletesResult = await athletesQuery;
  const rows = (athletesResult.error ? [] : athletesResult.data) || [];
  const athleteIds = rows.map((athlete) => athlete.id as string);

  const activityMap = await loadAthleteLastActivities(athleteIds);

  const inactiveAttention: AttentionAthleteRow[] = [];
  for (const athlete of rows) {
    const days = activityMap.get(athlete.id)?.daysAgo ?? null;
    const status = getAthleteStatus(days, null);
    if (status !== "inactive") continue;
    const meta = getAthleteStatusMeta(status);
    inactiveAttention.push({
      id: athlete.id,
      name: athlete.full_name || "Atleet",
      href: `/athletes/${athlete.id}`,
      statusLabel: meta.label,
      priority: "high",
    });
  }

  const openTodoCount = countCoachTodosDueToday(todos);
  const today = getTodayDateString();
  const upcomingCompetitionCount = (competitionsResult.data || []).filter(
    (competition) => isUpcomingCompetition(competition, today),
  ).length;

  const feed = await loadCoachDashboardFeed(
    userId,
    athleteIds,
    {
      athleteCount: rows.length,
      openCheckIns: openTodoCount,
      unreadMessages: chatUnread,
      upcomingCompetitions: upcomingCompetitionCount,
    },
    { preloadedActivityMap: activityMap },
  );

  const pendingCount = pendingResult.count || 0;

  const coachSnapshot: CoachSnapshot = {
    totalIncome: incomeResult.total,
    payingAthleteCount: incomeResult.payingAthleteCount,
    pendingCount,
    athletes: rows.map((athlete) => ({
      name: athlete.full_name || "Naamloos",
      href: `/profile/${athlete.id}`,
      lidnummer: athlete.lidnummer || null,
      betalingPrijs:
        athlete.betaling_prijs !== null && athlete.betaling_prijs !== undefined
          ? Number(athlete.betaling_prijs)
          : null,
      betalingDag:
        athlete.betaling_dag !== null && athlete.betaling_dag !== undefined
          ? Number(athlete.betaling_dag)
          : null,
    })),
  };

  return {
    pendingCount,
    totalIncome: incomeResult.total,
    payingAthleteCount: incomeResult.payingAthleteCount,
    athletes: rows as CoachDashboardAthlete[],
    coachSnapshot,
    openTodoCount,
    chatUnreadCount: chatUnread,
    upcomingCompetitionCount,
    dashboardMetrics: feed.metrics,
    inboxItems: feed.inbox,
    activityItems: feed.activity,
    attentionAthletes: inactiveAttention.slice(0, 5),
  };
}
