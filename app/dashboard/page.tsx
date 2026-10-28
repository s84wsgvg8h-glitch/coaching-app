"use client";

import dynamic from "next/dynamic";
import AppShell from "@/components/AppShell";
import { useAuth } from "@/components/AuthProvider";
import { useAthleteFillScore } from "@/hooks/useAthleteFillScore";
import { useAthleteProgramEntry } from "@/hooks/useAthleteProgramEntry";
import { useCoachDashboardData } from "@/hooks/useCoachDashboardData";
import CoachInboxPanel from "@/components/dashboard/CoachInboxPanel";
import CoachCockpitHeader from "@/components/dashboard/CoachCockpitHeader";
import AthleteDashboard from "@/components/dashboard/AthleteDashboard";
import CoachMobileDashboardSearch from "@/components/dashboard/CoachMobileDashboardSearch";
import { isCoachLikeRole } from "@/lib/authRoles";
import type { CoachDashboardMetrics } from "@/lib/coachDashboardFeed";

const widgetFallback = () => (
  <div className="min-h-[8rem] animate-pulse rounded-2xl bg-app-surface" />
);

const TodayAgendaTimeline = dynamic(
  () => import("@/components/dashboard/TodayAgendaTimeline"),
  { loading: widgetFallback, ssr: false },
);
const TodaysFocusWidget = dynamic(
  () => import("@/components/dashboard/TodaysFocusWidget"),
  { loading: widgetFallback, ssr: false },
);
const CoachAiCopilotWidget = dynamic(
  () => import("@/components/dashboard/CoachAiCopilotWidget"),
  { loading: widgetFallback, ssr: false },
);
const CoachAlertsWidget = dynamic(
  () => import("@/components/dashboard/CoachAlertsWidget"),
  { loading: widgetFallback, ssr: false },
);
const CoachAttentionWidget = dynamic(
  () => import("@/components/dashboard/CoachAttentionWidget"),
  { loading: widgetFallback, ssr: false },
);
const CoachMobileAgendaSheet = dynamic(
  () => import("@/components/dashboard/CoachMobileAgendaSheet"),
  { loading: () => null, ssr: false },
);
const ClientNotesWidget = dynamic(
  () => import("@/components/dashboard/ClientNotesWidget"),
  { loading: widgetFallback, ssr: false },
);
const FocusAreasWidget = dynamic(
  () => import("@/components/dashboard/FocusAreasWidget"),
  { loading: widgetFallback, ssr: false },
);
const RetentionStatsWidget = dynamic(
  () => import("@/components/dashboard/RetentionStatsWidget"),
  { loading: widgetFallback, ssr: false },
);

export default function DashboardPage() {
  const { userId, role, profile, email, loading: authLoading, refresh } = useAuth();
  const fullName = profile?.full_name || "";
  const isAthlete = role === "atleet";
  const isCoach = isCoachLikeRole(role);

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
  const coachDashboardQuery = useCoachDashboardData(
    userId,
    role,
    isCoach && !authLoading && Boolean(userId),
  );

  const weeklyFillScore = fillScoreQuery.data?.percentage ?? null;
  const athleteProgramHref = programEntryQuery.data?.href ?? null;
  const athleteHasProgram = programEntryQuery.data?.hasProgram ?? true;

  const coachData = coachDashboardQuery.data;

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

  const openTodoCount = coachData?.openTodoCount ?? 0;
  const pendingCount = coachData?.pendingCount ?? 0;
  const athletes = coachData?.athletes ?? [];
  const inboxItems = coachData?.inboxItems ?? [];
  const coachMetrics: CoachDashboardMetrics = coachData?.dashboardMetrics ?? {
    athleteCount: athletes.length,
    openCheckIns: openTodoCount,
    unreadMessages: coachData?.chatUnreadCount ?? 0,
    upcomingCompetitions: coachData?.upcomingCompetitionCount ?? 0,
    newVideos: 0,
    competitionsThisWeek: 0,
    messagesLast24h: 0,
    activeAthletes: athletes.length,
    attentionAthletes: coachData?.attentionAthletes.length ?? 0,
  };

  const coachMainProps = userId
    ? {
        userId,
        metrics: coachMetrics,
        inbox: inboxItems,
        activity: coachData?.activityItems ?? [],
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
    <div className="coach-dashboard-desktop-only hidden w-full min-w-0 lg:block">
      <div className="dashboard-cockpit premium-coach-dashboard w-full min-w-0">
      <CoachCockpitHeader
        fullName={fullName}
        athleteCount={coachMetrics.athleteCount}
      />

      <div className="dashboard-cockpit-main">
        <div className="dashboard-cockpit-col dashboard-cockpit-col--focus">
          <TodaysFocusWidget coachId={userId} role={role} athletes={athletes} />
        </div>

        <div className="dashboard-cockpit-col dashboard-cockpit-col--center">
          <CoachMobileDashboardSearch variant="embedded" />
          <div className="dashboard-cockpit-panel dashboard-cockpit-panel--inbox dashboard-cockpit-panel--inbox-desktop">
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
    </div>
  ) : null;

  return (
    <AppShell contentClassName="app-page-content dashboard-page-content px-2 md:px-3 lg:px-4">
      {isCoach ? (
        <>
          <CoachMobileDashboardSearch />
          {coachContent}
        </>
      ) : (
        athleteContent
      )}
    </AppShell>
  );
}
