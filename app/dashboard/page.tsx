"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import AppShell from "@/components/AppShell";
import { useAuth } from "@/components/AuthProvider";
import { useAthleteFillScore } from "@/hooks/useAthleteFillScore";
import { useAthleteProgramEntry } from "@/hooks/useAthleteProgramEntry";
import CoachInboxPanel from "@/components/dashboard/CoachInboxPanel";
import CoachCockpitHeader from "@/components/dashboard/CoachCockpitHeader";
import CoachDashboardApps from "@/components/dashboard/CoachDashboardApps";
import type { AttentionAthleteRow } from "@/components/dashboard/TodaysFocus";
import TodayAgendaTimeline from "@/components/dashboard/TodayAgendaTimeline";
import TodaysFocusWidget from "@/components/dashboard/TodaysFocusWidget";
import dynamic from "next/dynamic";
const CoachAiCopilotWidget = dynamic(
  () => import("@/components/dashboard/CoachAiCopilotWidget"),
  { ssr: false, loading: () => <div className="h-32 animate-pulse rounded-2xl bg-app-surface" /> },
);
import CoachAlertsWidget from "@/components/dashboard/CoachAlertsWidget";
import CoachAttentionWidget from "@/components/dashboard/CoachAttentionWidget";
import CoachDashboardKpiRow from "@/components/dashboard/CoachDashboardKpiRow";
import CoachDashboardQuickActions from "@/components/dashboard/CoachDashboardQuickActions";
import CoachMobileAgendaSheet from "@/components/dashboard/CoachMobileAgendaSheet";
import ClientNotesWidget from "@/components/dashboard/ClientNotesWidget";
import FocusAreasWidget from "@/components/dashboard/FocusAreasWidget";
import RetentionStatsWidget from "@/components/dashboard/RetentionStatsWidget";
import AthleteDashboard from "@/components/dashboard/AthleteDashboard";
import { loadTotalAthleteIncome } from "@/lib/athletePayments";
import { isAdminRole, isCoachLikeRole } from "@/lib/authRoles";
import {
  applyAthleteScope,
  loadCoachOrgContext,
} from "@/lib/orgAthleteScope";
import { loadCoachTodosFast, syncCoachTodosInBackground } from "@/lib/coachTodos";
import { countCoachTodosDueToday } from "@/lib/todoDueToday";
import { processDueBroadcasts } from "@/lib/scheduledBroadcasts";
import { schedulePeriodizationAlertDetection } from "@/lib/periodizationAlertScheduler";
import {
  loadAthleteLastActivities,
} from "@/lib/athleteLastActivity";
import { getAthleteStatus, getAthleteStatusMeta } from "@/lib/athleteStatus";
import { syncPaymentMissingTodos } from "@/lib/coachTodos";
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

type DashboardAthlete = {
  id: string;
  full_name: string | null;
  lidnummer?: string | null;
  betaling_prijs?: number | null;
  betaling_dag?: number | null;
};

export default function DashboardPage() {
  const { userId, role, profile, email, loading: authLoading, refresh } = useAuth();
  const fullName = profile?.full_name || "";
  const [pendingCount, setPendingCount] = useState(0);
  const [totalIncome, setTotalIncome] = useState<number | null>(null);
  const [payingAthleteCount, setPayingAthleteCount] = useState(0);
  const [athletes, setAthletes] = useState<DashboardAthlete[]>([]);
  const [coachSnapshot, setCoachSnapshot] = useState<CoachSnapshot | undefined>();
  const [openTodoCount, setOpenTodoCount] = useState(0);
  const [chatUnreadCount, setChatUnreadCount] = useState(0);
  const [upcomingCompetitionCount, setUpcomingCompetitionCount] = useState(0);
  const [dashboardMetrics, setDashboardMetrics] =
    useState<CoachDashboardMetrics | null>(null);
  const [inboxItems, setInboxItems] = useState<CoachInboxItem[]>([]);
  const [activityItems, setActivityItems] = useState<DashboardActivityItem[]>(
    [],
  );
  const [attentionAthletes, setAttentionAthletes] = useState<
    AttentionAthleteRow[]
  >([]);

  const isAthlete = role === "atleet";
  const fillScoreQuery = useAthleteFillScore(
    userId,
    fullName,
    isAthlete && !authLoading && Boolean(userId),
  );
  const programEntryQuery = useAthleteProgramEntry(
    userId,
    userId,
    isAthlete && !authLoading && Boolean(userId),
  );

  const weeklyFillScore = fillScoreQuery.data?.percentage ?? null;
  const athleteProgramHref = programEntryQuery.data?.href ?? null;
  const athleteHasProgram = programEntryQuery.data?.hasProgram ?? true;

  useEffect(() => {
    if (!userId || !isCoachLikeRole(role)) return;

    let cancelled = false;

    async function loadCoachData() {
      const [ctx, incomeResult, competitionsResult] = await Promise.all([
        loadCoachOrgContext(userId),
        loadTotalAthleteIncome(userId, role),
        loadCompetitions(),
      ]);

      let athletesQuery = supabase
        .from("profiles")
        .select("id, full_name, lidnummer, betaling_prijs, betaling_dag")
        .eq("role", "atleet")
        .order("full_name", { ascending: true });

      if (ctx) {
        athletesQuery = applyAthleteScope(athletesQuery, { ...ctx, role });
      }

      const pendingQuery = isAdminRole(role)
        ? supabase
            .from("profiles")
            .select("*", { count: "exact", head: true })
            .eq("role", "pending")
        : supabase
            .from("profiles")
            .select("*", { count: "exact", head: true })
            .eq("role", "pending")
            .eq("coach_id", userId);

      const [{ count }, athletesResult] = await Promise.all([
        pendingQuery,
        athletesQuery,
      ]);

      const athleteRows = (athletesResult.error
        ? []
        : athletesResult.data) as DashboardAthlete[] | null;

      const rows = athleteRows || [];

      const [activityMap, chatUnread, todosResult] = await Promise.all([
          loadAthleteLastActivities(rows.map((athlete) => athlete.id)),
          getUnreadMessageCount(userId),
          loadCoachTodosFast(userId),
        ]);

      if (cancelled) return;

      setPendingCount(count || 0);
      setTotalIncome(incomeResult.total);
      setPayingAthleteCount(incomeResult.payingAthleteCount);
      setAthletes(rows);
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
      setAttentionAthletes(inactiveAttention.slice(0, 5));
      setCoachSnapshot({
        totalIncome: incomeResult.total,
        payingAthleteCount: incomeResult.payingAthleteCount,
        pendingCount: count || 0,
        athletes: rows.map((athlete) => ({
          name: athlete.full_name || "Naamloos",
          href: `/profile/${athlete.id}`,
          lidnummer: athlete.lidnummer || null,
          betalingPrijs:
            athlete.betaling_prijs !== null &&
            athlete.betaling_prijs !== undefined
              ? Number(athlete.betaling_prijs)
              : null,
          betalingDag:
            athlete.betaling_dag !== null && athlete.betaling_dag !== undefined
              ? Number(athlete.betaling_dag)
              : null,
        })),
      });

      const todos = todosResult.data || [];
      const dueTodayCount = countCoachTodosDueToday(todos);
      setOpenTodoCount(dueTodayCount);
      setChatUnreadCount(chatUnread);

      const today = getTodayDateString();
      const upcomingCount = (competitionsResult.data || []).filter(
        (competition) => isUpcomingCompetition(competition, today),
      ).length;
      setUpcomingCompetitionCount(upcomingCount);

      const feed = await loadCoachDashboardFeed(
        userId,
        rows.map((athlete) => athlete.id),
        {
          athleteCount: rows.length,
          openCheckIns: dueTodayCount,
          unreadMessages: chatUnread,
          upcomingCompetitions: upcomingCount,
        },
        { preloadedActivityMap: activityMap },
      );

      if (cancelled) return;

      setDashboardMetrics(feed.metrics);
      setInboxItems(feed.inbox);
      setActivityItems(feed.activity);

      void syncCoachTodosInBackground(userId, role === "admin");
      void syncPaymentMissingTodos(userId, role === "admin");
      void processDueBroadcasts(userId);
      schedulePeriodizationAlertDetection(userId, role);
    }

    void loadCoachData();

    return () => {
      cancelled = true;
    };
  }, [role, userId]);

  if (!userId) {
    return null;
  }

  if (!role) {
    return (
      <AppShell contentClassName="flex-1 px-4 pb-16 pt-2 md:px-6 md:pt-3">
        <div className="mx-auto max-w-lg rounded-2xl border border-app-border bg-app-surface p-6">
          <h1 className="text-lg font-semibold text-app-text">Profiel niet geladen</h1>
          <p className="mt-2 text-[14px] text-app-muted">
            Ingelogd als <strong className="text-app-text">{email || "onbekend"}</strong>, maar je
            rol kon niet worden opgehaald. Probeer opnieuw of neem contact op met support.
          </p>
          <button
            type="button"
            onClick={() => void refresh()}
            className="app-btn-primary mt-4"
          >
            Opnieuw laden
          </button>
        </div>
      </AppShell>
    );
  }

  if (role === "atleet" && profile?.archived_at) {
    return (
      <AppShell contentClassName="flex-1 px-4 pb-16 pt-2 md:px-6 md:pt-3">
        <div className="mx-auto max-w-lg rounded-2xl border border-app-border bg-app-surface p-6">
          <h1 className="text-lg font-semibold text-app-text">Account gedeactiveerd</h1>
          <p className="mt-2 text-[14px] text-app-muted">
            Je coach heeft je verwijderd uit het team. Je trainingsdata blijft bewaard, maar je
            hebt momenteel geen toegang tot het platform. Neem contact op met je coach als je
            denkt dat dit een vergissing is.
          </p>
        </div>
      </AppShell>
    );
  }

  const coachMetrics: CoachDashboardMetrics = dashboardMetrics || {
    athleteCount: athletes.length,
    openCheckIns: openTodoCount,
    unreadMessages: chatUnreadCount,
    upcomingCompetitions: upcomingCompetitionCount,
    newVideos: 0,
    competitionsThisWeek: 0,
    messagesLast24h: 0,
    activeAthletes: athletes.length,
    attentionAthletes: attentionAthletes.length,
  };

  const coachMainProps = userId
    ? {
        userId,
        metrics: coachMetrics,
        inbox: inboxItems,
        activity: activityItems,
      }
    : null;

  const athleteContent = userId ? (
    <AthleteDashboard
      userId={userId}
      fullName={fullName}
      role={role}
      weeklyFillScore={weeklyFillScore}
      programHref={athleteProgramHref}
      programLoading={
        isAthlete &&
        programEntryQuery.isFetching &&
        Boolean(programEntryQuery.data)
      }
      hasProgram={athleteHasProgram}
    />
  ) : null;

  const coachContent = userId && coachMainProps ? (
    <div className="dashboard-cockpit premium-coach-dashboard w-full min-w-0">
      <CoachCockpitHeader
        fullName={fullName}
        athleteCount={coachMetrics.athleteCount}
      />

      <CoachDashboardApps
        userId={userId}
        openTodoCount={openTodoCount}
        pendingAthleteCount={pendingCount}
      />

      <div className="dashboard-cockpit-kpi">
        <CoachDashboardKpiRow
          coachId={userId}
          role={role}
          athleteCount={coachMetrics.athleteCount}
          activeAthleteCount={coachMetrics.activeAthletes}
          openTodoCount={openTodoCount}
          unreadMessages={coachMetrics.unreadMessages}
        />
      </div>

      <div className="dashboard-cockpit-main">
        <div className="dashboard-cockpit-col dashboard-cockpit-col--focus">
          <TodaysFocusWidget coachId={userId} athletes={athletes} />
        </div>

        <div className="dashboard-cockpit-col dashboard-cockpit-col--center">
          <div className="dashboard-cockpit-panel dashboard-cockpit-panel--quick premium-card glass-accent-card">
            <p className="dashboard-cockpit-panel-label">Snelle acties</p>
            <CoachDashboardQuickActions variant="cockpit" />
          </div>
          <div className="dashboard-cockpit-panel dashboard-cockpit-panel--inbox dashboard-cockpit-panel--inbox-desktop premium-card glass-accent-card">
            <CoachInboxPanel items={inboxItems} compact />
          </div>
          <div className="dashboard-cockpit-panel dashboard-cockpit-panel--alerts">
            <CoachAttentionWidget coachId={userId} role={role} compact />
            <CoachAlertsWidget coachId={userId} role={role} />
          </div>
        </div>

        <div className="dashboard-cockpit-col dashboard-cockpit-col--agenda">
          <TodayAgendaTimeline coachId={userId} variant="rail" />
        </div>
      </div>

      <div className="dashboard-cockpit-bottom">
        <div className="dashboard-cockpit-bottom-primary">
          <CoachInboxPanel items={inboxItems} compact />
          <div className="dashboard-cockpit-retention min-h-0">
            <RetentionStatsWidget coachId={userId} role={role} />
          </div>
        </div>

        <div className="dashboard-cockpit-secondary">
          <div className="dashboard-cockpit-secondary-item">
            <FocusAreasWidget coachId={userId} role={role} />
          </div>
          <div className="dashboard-cockpit-secondary-item">
            <ClientNotesWidget coachId={userId} role={role} />
          </div>
          <div className="dashboard-cockpit-secondary-item">
            <CoachAiCopilotWidget coachId={userId} role={role} />
          </div>
        </div>
      </div>

      <CoachMobileAgendaSheet coachId={userId} />
    </div>
  ) : null;

  return (
    <AppShell contentClassName="app-page-content dashboard-page-content px-2 md:px-3 lg:px-4">
      {isCoachLikeRole(role) ? coachContent : athleteContent}
    </AppShell>
  );
}
