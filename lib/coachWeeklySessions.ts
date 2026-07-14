import { supabase } from "@/lib/supabaseClient";
import { getTodayDateString } from "@/lib/competitions";
import { loadCoachCalendarEvents } from "@/lib/coachCalendarEvents";
import { applyAthleteScope, loadCoachOrgContext } from "@/lib/orgAthleteScope";

export type WeeklySessionDay = {
  key: string;
  label: string;
  date: string;
  scheduled: number;
  logged: number;
  total: number;
  isToday: boolean;
};

export type WeeklySessionsSummary = {
  days: WeeklySessionDay[];
  totalSessions: number;
  averagePerDay: number;
};

const WEEKDAY_LABELS = ["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"];

function getWeekRange(today = getTodayDateString()) {
  const date = new Date(`${today}T12:00:00`);
  const day = date.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(date);
  monday.setDate(date.getDate() + mondayOffset);

  const days: WeeklySessionDay[] = [];
  for (let index = 0; index < 7; index += 1) {
    const current = new Date(monday);
    current.setDate(monday.getDate() + index);
    const iso = current.toISOString().slice(0, 10);
    days.push({
      key: iso,
      label: WEEKDAY_LABELS[index],
      date: iso,
      scheduled: 0,
      logged: 0,
      total: 0,
      isToday: iso === today,
    });
  }

  return days;
}

function eventDateKey(startAt: string) {
  return startAt.slice(0, 10);
}

export async function loadCoachWeeklySessions(
  coachId: string,
  role: string,
): Promise<WeeklySessionsSummary> {
  const days = getWeekRange();
  const dayByKey = new Map(days.map((day) => [day.key, day]));
  const weekStart = days[0]?.date;
  const weekEnd = days[days.length - 1]?.date;

  if (!weekStart || !weekEnd) {
    return { days, totalSessions: 0, averagePerDay: 0 };
  }

  const ctx = await loadCoachOrgContext(coachId);
  let athletesQuery = supabase.from("profiles").select("id").eq("role", "atleet");

  if (ctx) {
    athletesQuery = applyAthleteScope(athletesQuery, { ...ctx, role });
  }

  const [{ data: athletes }, calendarEvents] = await Promise.all([
    athletesQuery,
    loadCoachCalendarEvents(coachId),
  ]);

  const athleteIds = (athletes || []).map((row) => row.id as string);

  for (const event of calendarEvents) {
    const key = eventDateKey(event.start_at);
    const day = dayByKey.get(key);
    if (!day) continue;
    day.scheduled += 1;
    day.total += 1;
  }

  if (athleteIds.length > 0) {
    const { data: checkins } = await supabase
      .from("athlete_day_checkins")
      .select("updated_at")
      .in("athlete_id", athleteIds)
      .gte("updated_at", `${weekStart}T00:00:00.000Z`)
      .lte("updated_at", `${weekEnd}T23:59:59.999Z`);

    for (const row of checkins || []) {
      const key = String(row.updated_at).slice(0, 10);
      const day = dayByKey.get(key);
      if (!day) continue;
      day.logged += 1;
      day.total += 1;
    }
  }

  const totalSessions = days.reduce((sum, day) => sum + day.total, 0);
  const averagePerDay = Math.round((totalSessions / 7) * 10) / 10;

  return {
    days,
    totalSessions,
    averagePerDay,
  };
}
