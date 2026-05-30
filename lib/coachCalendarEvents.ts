import { supabase } from "@/lib/supabaseClient";

export type CoachCalendarEventType = "activity" | "reminder";

export type CoachCalendarEvent = {
  id: string;
  coach_id: string;
  event_type: CoachCalendarEventType;
  title: string;
  location: string | null;
  video_url: string | null;
  start_at: string;
  end_at: string;
  all_day: boolean;
  invitees: string | null;
  notes: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type CoachCalendarEventInput = Omit<
  CoachCalendarEvent,
  "id" | "created_at" | "updated_at"
> & { id?: string };

export async function loadCoachCalendarEvents(coachId: string) {
  const { data, error } = await supabase
    .from("coach_calendar_events")
    .select("*")
    .eq("coach_id", coachId)
    .order("start_at", { ascending: true });

  if (error) {
    console.error("Agenda afspraken laden mislukt:", error.message);
    return [] as CoachCalendarEvent[];
  }

  return (data || []) as CoachCalendarEvent[];
}

export async function saveCoachCalendarEvent(event: CoachCalendarEventInput) {
  const payload = {
    coach_id: event.coach_id,
    event_type: event.event_type,
    title: event.title.trim(),
    location: event.location?.trim() || null,
    video_url: event.video_url?.trim() || null,
    start_at: event.start_at,
    end_at: event.end_at,
    all_day: event.all_day,
    invitees: event.invitees?.trim() || null,
    notes: event.notes?.trim() || null,
    updated_at: new Date().toISOString(),
  };

  if (event.id) {
    return supabase
      .from("coach_calendar_events")
      .update(payload)
      .eq("id", event.id)
      .eq("coach_id", event.coach_id);
  }

  return supabase.from("coach_calendar_events").insert(payload);
}

export async function deleteCoachCalendarEvent(id: string, coachId: string) {
  return supabase
    .from("coach_calendar_events")
    .delete()
    .eq("id", id)
    .eq("coach_id", coachId);
}

export function toDatetimeLocalValue(date: Date) {
  const copy = new Date(date);
  copy.setMinutes(copy.getMinutes() - copy.getTimezoneOffset());
  return copy.toISOString().slice(0, 16);
}

export function formatAppointmentRange(startAt: string, endAt: string) {
  const start = new Date(startAt);
  const end = new Date(endAt);

  const datePart = start.toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

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

export function createDefaultAppointmentDraft(
  coachId: string,
  start: Date,
  end?: Date,
): CoachCalendarEventInput {
  const endDate = end ? new Date(end) : new Date(start);
  if (!end) {
    endDate.setMinutes(endDate.getMinutes() + 60);
  }

  return {
    coach_id: coachId,
    event_type: "activity",
    title: "",
    location: "",
    video_url: "",
    start_at: start.toISOString(),
    end_at: endDate.toISOString(),
    all_day: false,
    invitees: "",
    notes: "",
  };
}
