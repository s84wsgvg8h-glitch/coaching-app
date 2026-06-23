import { supabase } from "@/lib/supabaseClient";
import { getTodayDateString } from "@/lib/competitions";
import { loadAthleteLastActivities } from "@/lib/athleteLastActivity";
import { getAthleteStatus } from "@/lib/athleteStatus";

export type CoachDashboardMetrics = {
  athleteCount: number;
  openCheckIns: number;
  unreadMessages: number;
  upcomingCompetitions: number;
  newVideos: number;
  competitionsThisWeek: number;
  messagesLast24h: number;
  activeAthletes: number;
  attentionAthletes: number;
};

export type CoachInboxItem = {
  id: string;
  type: "checkin" | "message" | "video" | "competition" | "approval";
  tone: "red" | "amber" | "blue" | "green";
  count: number;
  label: string;
  subtitle: string;
  href: string;
  priority: "high" | "medium" | "low";
  actionLabel: string;
};

export type DashboardActivityItem = {
  id: string;
  at: string;
  timeLabel: string;
  dayLabel: string;
  label: string;
  href?: string;
  icon: "checkin" | "video" | "message" | "program" | "intake" | "signup" | "approval";
};

function formatActivityDay(iso: string) {
  const date = new Date(iso);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  const diff = Math.round(
    (today.getTime() - target.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (diff === 0) return "Vandaag";
  if (diff === 1) return "Gisteren";
  return date.toLocaleDateString("nl-NL", { weekday: "short", day: "numeric", month: "short" });
}

function formatActivityTime(iso: string) {
  return new Date(iso).toLocaleTimeString("nl-NL", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function firstName(fullName: string | null | undefined) {
  if (!fullName) return "Atleet";
  return fullName.split(/\s+/)[0] || fullName;
}

function getWeekRange(today = getTodayDateString()) {
  const date = new Date(`${today}T12:00:00`);
  const day = date.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(date);
  monday.setDate(date.getDate() + mondayOffset);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return {
    start: monday.toISOString().slice(0, 10),
    end: sunday.toISOString().slice(0, 10),
  };
}

function isDateInWeek(date: string, weekStart: string, weekEnd: string) {
  return date >= weekStart && date <= weekEnd;
}

export async function loadCoachDashboardFeed(
  coachId: string,
  athleteIds: string[],
  metrics: Omit<
    CoachDashboardMetrics,
    "newVideos" | "competitionsThisWeek" | "messagesLast24h" | "activeAthletes" | "attentionAthletes"
  >,
): Promise<{
  metrics: CoachDashboardMetrics;
  inbox: CoachInboxItem[];
  activity: DashboardActivityItem[];
}> {
  const week = getWeekRange();
  const nameById = new Map<string, string>();

  if (athleteIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", athleteIds);

    for (const profile of profiles || []) {
      nameById.set(profile.id as string, profile.full_name as string);
    }
  }

  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [
    { count: pendingVideos },
    { count: messagesLast24h },
    { data: competitions },
    { data: checkins },
    { data: videos },
    { data: messages },
    { count: pendingApprovals },
    { data: recentIntakes },
    { data: recentSignups },
  ] = await Promise.all([
    supabase
      .from("video_reviews")
      .select("*", { count: "exact", head: true })
      .eq("coach_id", coachId)
      .eq("status", "pending"),
    supabase
      .from("messages")
      .select("*", { count: "exact", head: true })
      .eq("receiver_id", coachId)
      .gte("created_at", since24h),
    supabase
      .from("wedstrijden")
      .select("id, start_date, end_date")
      .gte("end_date", getTodayDateString()),
    athleteIds.length > 0
      ? supabase
          .from("athlete_day_checkins")
          .select("athlete_id, updated_at, created_at")
          .in("athlete_id", athleteIds)
          .order("updated_at", { ascending: false })
          .limit(8)
      : Promise.resolve({ data: [] }),
    supabase
      .from("video_reviews")
      .select("id, athlete_id, exercise_name, lift, created_at")
      .eq("coach_id", coachId)
      .order("created_at", { ascending: false })
      .limit(8),
    athleteIds.length > 0
      ? supabase
          .from("messages")
          .select("id, sender_id, created_at, content")
          .eq("receiver_id", coachId)
          .in("sender_id", athleteIds)
          .order("created_at", { ascending: false })
          .limit(8)
      : Promise.resolve({ data: [] }),
    supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("coach_id", coachId)
      .eq("role", "pending")
      .neq("pending_kind", "coach"),
    supabase
      .from("profiles")
      .select("id, full_name, intake_completed_at")
      .eq("coach_id", coachId)
      .eq("role", "atleet")
      .not("intake_completed_at", "is", null)
      .gte("intake_completed_at", since7d)
      .order("intake_completed_at", { ascending: false })
      .limit(8),
    supabase
      .from("profiles")
      .select("id, full_name, created_at")
      .eq("coach_id", coachId)
      .eq("role", "pending")
      .neq("pending_kind", "coach")
      .gte("created_at", since7d)
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  const competitionsThisWeek = (competitions || []).filter(
    (row) =>
      isDateInWeek(row.start_date as string, week.start, week.end) ||
      isDateInWeek(row.end_date as string, week.start, week.end),
  ).length;

  const activityMap = await loadAthleteLastActivities(athleteIds);
  let activeAthletes = 0;
  let attentionAthletes = 0;

  for (const athleteId of athleteIds) {
    const days = activityMap.get(athleteId)?.daysAgo ?? null;
    const status = getAthleteStatus(days, null);
    if (status === "active") activeAthletes += 1;
    else attentionAthletes += 1;
  }

  const fullMetrics: CoachDashboardMetrics = {
    ...metrics,
    newVideos: pendingVideos || 0,
    competitionsThisWeek,
    messagesLast24h: messagesLast24h || 0,
    activeAthletes,
    attentionAthletes,
  };

  const inbox: CoachInboxItem[] = (
    [
      {
        id: "approvals",
        type: "approval",
        tone: "red",
        count: pendingApprovals || 0,
        label:
          (pendingApprovals || 0) === 1
            ? "Atleet wacht op goedkeuring"
            : "Atleten wachten op goedkeuring",
        subtitle: "Nieuwe aanmelding via uitnodigingslink",
        href: "/athletes",
        priority: "high",
        actionLabel: "Goedkeuren",
      },
      {
        id: "checkins",
        type: "checkin",
        tone: "red",
        count: fullMetrics.openCheckIns,
        label: "Open check-ins",
        subtitle: "Taken die vandaag aflopen",
        href: "/todo",
        priority: "high",
        actionLabel: "Bekijk taken",
      },
      {
        id: "messages",
        type: "message",
        tone: "amber",
        count: fullMetrics.unreadMessages,
        label: "Ongelezen berichten",
        subtitle:
          fullMetrics.unreadMessages === 1
            ? "1 ongelezen bericht"
            : `${fullMetrics.unreadMessages} ongelezen berichten`,
        href: "/chat",
        priority: "high",
        actionLabel: "Open chat",
      },
      {
        id: "videos",
        type: "video",
        tone: "blue",
        count: fullMetrics.newVideos,
        label: "Nieuwe video's",
        subtitle: "Wachten op review",
        href: "/video-review",
        priority: "medium",
        actionLabel: "Reviewen",
      },
      {
        id: "competitions",
        type: "competition",
        tone: "green",
        count: fullMetrics.competitionsThisWeek,
        label:
          fullMetrics.competitionsThisWeek === 1
            ? "Wedstrijd deze week"
            : "Wedstrijden deze week",
        subtitle: "Deze week op het programma",
        href: "/wedstrijd-kalender",
        priority: "low",
        actionLabel: "Kalender",
      },
    ] satisfies CoachInboxItem[]
  ).filter((item) => item.count > 0);

  type RawActivity = DashboardActivityItem & { sortAt: number };

  const raw: RawActivity[] = [];

  for (const row of checkins || []) {
    const at =
      (row.updated_at as string | null) || (row.created_at as string | null);
    if (!at) continue;
    const athleteId = row.athlete_id as string;
    raw.push({
      id: `checkin-${athleteId}-${at}`,
      at,
      sortAt: new Date(at).getTime(),
      timeLabel: formatActivityTime(at),
      dayLabel: formatActivityDay(at),
      icon: "checkin",
      label: `${firstName(nameById.get(athleteId))} check-in voltooid`,
      href: `/athletes/${athleteId}`,
    });
  }

  for (const row of videos || []) {
    const at = row.created_at as string;
    const athleteId = row.athlete_id as string;
    const lift =
      (row.exercise_name as string | null) ||
      (row.lift as string | null) ||
      "video";
    raw.push({
      id: `video-${row.id}`,
      at,
      sortAt: new Date(at).getTime(),
      timeLabel: formatActivityTime(at),
      dayLabel: formatActivityDay(at),
      icon: "video",
      label: `${firstName(nameById.get(athleteId))} uploadde een ${lift} video`,
      href: "/video-review",
    });
  }

  for (const row of messages || []) {
    const at = row.created_at as string;
    const athleteId = row.sender_id as string;
    raw.push({
      id: `message-${row.id}`,
      at,
      sortAt: new Date(at).getTime(),
      timeLabel: formatActivityTime(at),
      dayLabel: formatActivityDay(at),
      icon: "message",
      label: `${firstName(nameById.get(athleteId))} stuurde een bericht`,
      href: `/chat/${athleteId}`,
    });
  }

  for (const row of recentIntakes || []) {
    const at = row.intake_completed_at as string;
    const athleteId = row.id as string;
    raw.push({
      id: `intake-${athleteId}-${at}`,
      at,
      sortAt: new Date(at).getTime(),
      timeLabel: formatActivityTime(at),
      dayLabel: formatActivityDay(at),
      icon: "intake",
      label: `${firstName((row.full_name as string | null) || nameById.get(athleteId))} heeft intake ingevuld`,
      href: `/athletes/${athleteId}`,
    });
  }

  for (const row of recentSignups || []) {
    const at = row.created_at as string;
    const athleteId = row.id as string;
    raw.push({
      id: `signup-${athleteId}-${at}`,
      at,
      sortAt: new Date(at).getTime(),
      timeLabel: formatActivityTime(at),
      dayLabel: formatActivityDay(at),
      icon: "signup",
      label: `${firstName(row.full_name as string | null)} heeft zich aangemeld`,
      href: "/athletes",
    });
  }

  const activity = raw
    .sort((a, b) => b.sortAt - a.sortAt)
    .slice(0, 8)
    .map(({ sortAt: _sortAt, ...item }) => item);

  return { metrics: fullMetrics, inbox, activity };
}

export function formatDashboardSummary(metrics: CoachDashboardMetrics) {
  const parts = [
    `${metrics.athleteCount} actieve atleten`,
    `${metrics.openCheckIns} open check-ins`,
    `${metrics.unreadMessages} nieuwe berichten`,
  ];
  return parts.join(" • ");
}
