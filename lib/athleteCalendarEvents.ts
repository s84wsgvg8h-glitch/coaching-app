import { supabase } from "@/lib/supabaseClient";

export type AthleteCalendarEvent = {
  id: string;
  coach_id: string;
  athlete_id: string;
  title: string;
  notes: string | null;
  start_at: string;
  end_at: string;
  all_day: boolean;
  created_at?: string | null;
  updated_at?: string | null;
};

export type AthleteCalendarEventInput = Omit<
  AthleteCalendarEvent,
  "id" | "created_at" | "updated_at"
> & { id?: string };

export async function loadAthleteCalendarEvents(athleteId: string) {
  const { data, error } = await supabase
    .from("athlete_calendar_events")
    .select("*")
    .eq("athlete_id", athleteId)
    .order("start_at", { ascending: true });

  if (error) {
    console.error("Atleet-agenda laden mislukt:", error.message);
    return [] as AthleteCalendarEvent[];
  }

  return (data || []) as AthleteCalendarEvent[];
}

export async function saveAthleteCalendarEvent(event: AthleteCalendarEventInput) {
  const payload = {
    coach_id: event.coach_id,
    athlete_id: event.athlete_id,
    title: event.title.trim(),
    notes: event.notes?.trim() || null,
    start_at: event.start_at,
    end_at: event.end_at,
    all_day: event.all_day,
    updated_at: new Date().toISOString(),
  };

  if (event.id) {
    return supabase
      .from("athlete_calendar_events")
      .update(payload)
      .eq("id", event.id)
      .eq("coach_id", event.coach_id);
  }

  return supabase.from("athlete_calendar_events").insert(payload);
}

export async function deleteAthleteCalendarEvent(
  id: string,
  coachId: string,
) {
  return supabase
    .from("athlete_calendar_events")
    .delete()
    .eq("id", id)
    .eq("coach_id", coachId);
}

export function toDatetimeLocalValue(date: Date) {
  const copy = new Date(date);
  copy.setMinutes(copy.getMinutes() - copy.getTimezoneOffset());
  return copy.toISOString().slice(0, 16);
}

export function createDefaultAthleteEventDraft(
  coachId: string,
  athleteId: string,
  start: Date,
  end?: Date,
): AthleteCalendarEventInput {
  const endDate = end ? new Date(end) : new Date(start);
  if (!end) {
    endDate.setMinutes(endDate.getMinutes() + 60);
  }

  return {
    coach_id: coachId,
    athlete_id: athleteId,
    title: "",
    notes: "",
    start_at: start.toISOString(),
    end_at: endDate.toISOString(),
    all_day: false,
  };
}

export function formatAthleteEventRange(startAt: string, endAt: string) {
  const start = new Date(startAt);
  const end = new Date(endAt);

  const datePart = start.toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  if (start.toDateString() === end.toDateString()) {
    const startTime = start.toLocaleTimeString("nl-NL", {
      hour: "2-digit",
      minute: "2-digit",
    });
    const endTime = end.toLocaleTimeString("nl-NL", {
      hour: "2-digit",
      minute: "2-digit",
    });
    return `${datePart} ${startTime} – ${endTime}`;
  }

  return `${datePart} – ${end.toLocaleDateString("nl-NL")}`;
}
