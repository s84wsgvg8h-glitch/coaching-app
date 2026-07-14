import type { CoachCalendarEvent } from "@/lib/coachCalendarEvents";
import { getTodayDateString } from "@/lib/competitions";

export const AGENDA_HOUR_HEIGHT = 52;
export const AGENDA_DAY_START_HOUR = 6;
export const AGENDA_DAY_END_HOUR = 24;

export function parseAgendaDate(date: string) {
  return new Date(`${date}T12:00:00`);
}

export function addAgendaDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function toAgendaDateString(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function getHourFraction(iso: string) {
  const value = new Date(iso);
  return value.getHours() + value.getMinutes() / 60;
}

export function formatAgendaTime(iso: string) {
  return new Date(iso).toLocaleTimeString("nl-NL", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatAgendaTimeRange(startAt: string, endAt: string) {
  return `${formatAgendaTime(startAt)} – ${formatAgendaTime(endAt)}`;
}

export function formatAgendaDayHeading(date = new Date()) {
  return date.toLocaleDateString("nl-NL", {
    weekday: "long",
    day: "numeric",
    month: "short",
  });
}

export function filterTodayAppointments(appointments: CoachCalendarEvent[]) {
  const today = getTodayDateString();
  return appointments
    .filter((row) => row.start_at.slice(0, 10) === today)
    .sort((a, b) => a.start_at.localeCompare(b.start_at));
}

export function filterUpcomingAppointments(
  appointments: CoachCalendarEvent[],
  weeks = 8,
) {
  const today = getTodayDateString();
  const horizon = toAgendaDateString(
    addAgendaDays(parseAgendaDate(today), weeks * 7),
  );

  return appointments
    .filter((row) => {
      const date = row.start_at.slice(0, 10);
      return date >= today && date <= horizon;
    })
    .sort((a, b) => a.start_at.localeCompare(b.start_at));
}

export function groupAppointmentsByDate(appointments: CoachCalendarEvent[]) {
  return appointments.reduce<Record<string, CoachCalendarEvent[]>>((acc, row) => {
    const date = row.start_at.slice(0, 10);
    if (!acc[date]) acc[date] = [];
    acc[date].push(row);
    return acc;
  }, {});
}

export function formatAgendaDayLabel(
  date: string,
  today: string,
  tomorrow: string,
) {
  if (date === today) return "Vandaag";
  if (date === tomorrow) return "Morgen";
  return parseAgendaDate(date).toLocaleDateString("nl-NL", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function isAppointmentActiveNow(
  appointment: CoachCalendarEvent,
  now = new Date(),
) {
  if (appointment.all_day) return false;
  const start = new Date(appointment.start_at).getTime();
  const end = new Date(appointment.end_at).getTime();
  const current = now.getTime();
  return current >= start && current <= end;
}

export type AppointmentStatus = "past" | "active" | "upcoming";

export function getAppointmentStatus(
  appointment: CoachCalendarEvent,
  now = new Date(),
): AppointmentStatus {
  if (isAppointmentActiveNow(appointment, now)) return "active";
  if (!appointment.all_day) {
    const end = new Date(appointment.end_at).getTime();
    if (now.getTime() > end) return "past";
  }
  return "upcoming";
}

export function getTimelineBlockStyle(column: number, totalColumns: number) {
  const width = 100 / totalColumns;
  return {
    left: `${column * width}%`,
    width: `calc(${width}% - 4px)`,
  };
}
