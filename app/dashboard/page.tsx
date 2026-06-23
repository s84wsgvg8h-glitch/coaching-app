"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import AppShell from "@/components/AppShell";
import { useAuth } from "@/components/AuthProvider";
import DashboardSearch from "@/components/DashboardSearch";
import DashboardAgenda from "@/components/DashboardAgenda";
import CoachDashboardWidgets from "@/components/dashboard/CoachDashboardWidgets";
import CoachInboxPanel from "@/components/dashboard/CoachInboxPanel";
import CoachCockpitHeader from "@/components/dashboard/CoachCockpitHeader";
import CoachDashboardApps from "@/components/dashboard/CoachDashboardApps";
import type { AttentionAthleteRow } from "@/components/dashboard/TodaysFocus";
import TodayAgendaTimeline from "@/components/dashboard/TodayAgendaTimeline";
import TodaysFocusWidget from "@/components/dashboard/TodaysFocusWidget";
import CoachInvitePanel from "@/components/dashboard/CoachInvitePanel";
import CoachAiCopilotWidget from "@/components/dashboard/CoachAiCopilotWidget";
import CoachAlertsWidget from "@/components/dashboard/CoachAlertsWidget";
import TeamEngagementWidget from "@/components/dashboard/TeamEngagementWidget";
import AthleteCountWidget from "@/components/dashboard/AthleteCountWidget";
import AthleteDashboard from "@/components/dashboard/AthleteDashboard";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { loadTotalAthleteIncome } from "@/lib/athletePayments";
import { isAdminRole, isCoachLikeRole } from "@/lib/authRoles";
import {
  applyAthleteScope,
  loadCoachOrgContext,
} from "@/lib/orgAthleteScope";
import { loadAthleteWeeklyFillScore } from "@/lib/athleteWeeklyFillScore";
import { loadCoachTodos } from "@/lib/coachTodos";
import { countCoachTodosDueToday } from "@/lib/todoDueToday";
import { processDueBroadcasts } from "@/lib/scheduledBroadcasts";
import { detectAndInsertPeriodizationAlerts } from "@/lib/periodizationAlerts";
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
  const [weeklyFillScore, setWeeklyFillScore] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [dashboardEditing, setDashboardEditing] = useState(false);
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

  useEffect(() => {
    if (authLoading || !userId) return;

    let cancelled = false;

    async function bootstrap() {
      if (role === "atleet") {
        const score = await loadAthleteWeeklyFillScore(
          userId,
          fullName || "Atleet",
        );
        if (!cancelled) setWeeklyFillScore(score.percentage);
      }

      if (!cancelled) setLoading(false);
    }

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [authLoading, userId, role, fullName]);

  useEffect(() => {
    if (!userId || !isCoachLikeRole(role)) return;

    let cancelled = false;

    async function loadCoachData() {
      const ctx = await loadCoachOrgContext(userId);
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

      const [{ count }, incomeResult, athletesResult] = await Promise.all([
        pendingQuery,
        loadTotalAthleteIncome(userId, role),
        athletesQuery,
      ]);

      const athleteRows = (athletesResult.error
        ? (
            await supabase
              .from("profiles")
              .select("id, full_name, lidnummer")
              .eq("role", "atleet")
              .order("full_name", { ascending: true })
          ).data
        : athletesResult.data) as DashboardAthlete[] | null;

      const rows = athleteRows || [];

      const [activityMap, chatUnread, competitionsResult, todosResult] =
        await Promise.all([
          loadAthleteLastActivities(rows.map((athlete) => athlete.id)),
          getUnreadMessageCount(userId),
          loadCompetitions(),
          loadCoachTodos(userId, role === "admin"),
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
      );

      if (cancelled) return;

      setDashboardMetrics(feed.metrics);
      setInboxItems(feed.inbox);
      setActivityItems(feed.activity);

      void syncPaymentMissingTodos(userId, role === "admin");
      void processDueBroadcasts(userId);
      void detectAndInsertPeriodizationAlerts(userId, role);
    }

    void loadCoachData();

    return () => {
      cancelled = true;
    };
  }, [role, userId]);

  if (authLoading || loading || !userId) {
    return (
      <AppShell contentClassName="flex-1 px-4 pb-16 pt-2 md:px-6 md:pt-3">
        <div className="mx-auto w-full max-w-none space-y-3">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </AppShell>
    );
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
    />
  ) : null;

  const coachContent = userId && coachMainProps ? (
    <div className="dashboard-shell w-full pb-2">
      <CoachCockpitHeader fullName={fullName} />

      <div className="dashboard-coach-body">
        <div className="dashboard-coach-main space-y-2.5">
          <CoachDashboardApps
            userId={userId}
            openTodoCount={openTodoCount}
            pendingAthleteCount={pendingCount}
          />

          <div className="dashboard-widget-row">
            <TeamEngagementWidget coachId={userId} role={role} />
            <TodaysFocusWidget coachId={userId} athletes={athletes} />
            <AthleteCountWidget
              count={coachMetrics.athleteCount}
              activeCount={coachMetrics.activeAthletes}
            />
          </div>

          <CoachDashboardWidgets
        coachId={userId}
        editing={dashboardEditing}
        widgets={{
          apps: null,
          engagement: null,
          todaysFocusPanel: null,
          athleteCountMetric: null,
          agenda: null,
          welcome: null,
          focus: null,
          kpi: null,
          inbox: <CoachInboxPanel items={inboxItems} compact />,
          activity: null,
          newVideos: (
            <div className="ui-panel">
              <p className="ui-label">Nieuwe video&apos;s</p>
              <p className="ui-metric-value mt-2 text-app-text">
                {coachMetrics.newVideos}
              </p>
              <Link
                href="/video-review"
                className="mt-3 inline-block text-[13px] font-medium text-app-accent hover:underline"
              >
                Naar video review →
              </Link>
            </div>
          ),
          leaderboard: (
            <div className="ui-panel">
              <p className="text-[15px] font-semibold text-app-text">
                Leaderboard
              </p>
              <p className="mt-2 text-[13px] font-normal text-app-muted">
                Bekijk rankings en prestaties van je team.
              </p>
              <Link href="/leaderboard" className="app-btn-secondary mt-4">
                Open leaderboard
              </Link>
            </div>
          ),
          bwTrends: (
            <div className="ui-panel">
              <p className="text-[15px] font-semibold text-app-text">
                BW Trends
              </p>
              <p className="mt-2 text-[13px] font-normal text-app-muted">
                Widget beschikbaar in een volgende update.
              </p>
            </div>
          ),
          search: (
            <div className="ui-panel">
              <h2 className="ui-section-title mb-4">Zoeken</h2>
              <DashboardSearch
                role={role}
                pendingCount={pendingCount}
                athletes={athletes}
                coachSnapshot={coachSnapshot}
              />
            </div>
          ),
          invites: <CoachInvitePanel coachId={userId} />,
          income: totalIncome !== null ? (
            <div className="ui-panel">
              <p className="ui-label">Maandelijkse inkomsten</p>
              <p className="ui-metric-value mt-3 text-app-accent">
                € {totalIncome.toFixed(2)}
              </p>
              <p className="mt-1 text-sm text-app-muted">
                {payingAthleteCount} betalende atleten
              </p>
            </div>
          ) : null,
          pending: (
            <div className="ui-panel">
              <p className="ui-label">Openstaande aanmeldingen</p>
              <p className="ui-metric-value mt-3 text-app-text">
                {pendingCount}
              </p>
              <Link
                href="/athletes"
                className="mt-3 inline-block text-sm font-medium text-app-accent hover:underline"
              >
                Naar atleten beheren →
              </Link>
            </div>
          ),
          todo: (
            <div className="ui-panel">
              <p className="ui-label">Openstaande taken</p>
              <p className="ui-metric-value mt-3 text-app-text">
                {openTodoCount}
              </p>
              <Link
                href="/todo"
                className="mt-3 inline-block text-sm font-medium text-app-accent hover:underline"
              >
                Naar to-do →
              </Link>
            </div>
          ),
          copilot: (
            <CoachAiCopilotWidget coachId={userId} role={role} />
          ),
          alerts: (
            <CoachAlertsWidget coachId={userId} role={role} />
          ),
          athletes: (
            <div className="ui-panel">
              <p className="ui-label">Mijn atleten</p>
              <p className="ui-metric-value mt-3 text-app-text">
                {athletes.length}
              </p>
              <ul className="mt-3 space-y-1">
                {athletes.slice(0, 5).map((athlete) => (
                  <li key={athlete.id}>
                    <Link
                      href={`/athletes/${athlete.id}`}
                      className="text-sm font-medium text-app-accent hover:underline"
                    >
                      {athlete.full_name || "Naamloos"}
                    </Link>
                  </li>
                ))}
              </ul>
              {athletes.length > 5 && (
                <Link
                  href="/athletes"
                  className="mt-2 inline-block text-xs font-semibold text-app-muted hover:underline"
                >
                  + {athletes.length - 5} meer
                </Link>
              )}
            </div>
          ),
          quicklinks: (
            <div className="ui-panel">
              <p className="ui-label mb-3">Snelkoppelingen</p>
              <div className="flex flex-wrap gap-2">
                <Link href="/athletes" className="app-btn-secondary text-xs">
                  Atleten hub
                </Link>
                <Link href="/athletes" className="app-btn-secondary text-xs">
                  Invulscore
                </Link>
                <Link href="/data" className="app-btn-secondary text-xs">
                  Data
                </Link>
                <Link href="/leaderboard" className="app-btn-secondary text-xs">
                  Leaderboard
                </Link>
              </div>
            </div>
          ),
        }}
      />

      <div className="flex justify-center border-t border-app-border/60 pt-6 pb-2">
        <button
          type="button"
          onClick={() => setDashboardEditing((value) => !value)}
          className={`dashboard-edit-btn app-focus-ring ${
            dashboardEditing ? "dashboard-edit-btn-active" : ""
          }`}
        >
          {dashboardEditing ? "Klaar met layout" : "Layout aanpassen"}
        </button>
      </div>
        </div>

        <aside className="dashboard-coach-agenda-rail">
          <TodayAgendaTimeline coachId={userId} variant="rail" />
        </aside>
      </div>
    </div>
  ) : null;

  return (
    <AppShell>
      {isCoachLikeRole(role) ? coachContent : athleteContent}
    </AppShell>
  );
}
