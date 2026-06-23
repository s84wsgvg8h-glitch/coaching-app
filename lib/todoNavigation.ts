import type { CoachTodo } from "@/lib/coachTodos";
import {
  buildProgramWeekPath,
  resolveProgramEntryForAthlete,
} from "@/lib/programNavigation";

export type TodoFocusField =
  | "betaling_prijs"
  | "betaling_dag"
  | "geboortedatum"
  | "lidnummer"
  | "starting_prs";

function athleteProfileHref(athleteId: string, focus?: TodoFocusField) {
  const params = new URLSearchParams({ section: "athlete" });
  if (focus) params.set("focus", focus);
  return `/profile/${athleteId}?${params.toString()}`;
}

function athleteHubHref(athleteId: string) {
  return `/athletes/${athleteId}`;
}

export function getTodoFocusField(todo: CoachTodo): TodoFocusField | null {
  switch (todo.kind) {
    case "payment_missing":
      return "betaling_prijs";
    case "payment_day_missing":
      return "betaling_dag";
    case "profile_fields_missing":
      return "geboortedatum";
    case "starting_prs_missing":
      return "starting_prs";
    default:
      break;
  }

  const title = todo.title.toLowerCase();
  if (/prijs/.test(title)) return "betaling_prijs";
  if (/betaaldag/.test(title)) return "betaling_dag";
  if (/geboortedatum|lidnummer/.test(title)) return "geboortedatum";
  if (/start|prs|coaching/.test(title)) return "starting_prs";
  return null;
}

export function getTodoNavHint(todo: CoachTodo): string | null {
  if (todo.completed) return null;

  switch (todo.kind) {
    case "program_needed":
      return "Open programma";
    case "payment_missing":
    case "payment_day_missing":
      return "Vul betaling in";
    case "profile_fields_missing":
      return "Vul profiel in";
    case "starting_prs_missing":
      return "Vul startgegevens in";
    case "inactive_athlete":
      return "Open atleet";
    default:
      break;
  }

  const title = todo.title.toLowerCase();
  if (/programma/.test(title)) return "Open programma";
  if (/prijs|betaaldag|betaling/.test(title)) return "Vul betaling in";
  if (/geboortedatum|lidnummer/.test(title)) return "Vul profiel in";
  if (/start|prs|coaching/.test(title)) return "Vul startgegevens in";
  return todo.athlete_id ? "Open atleet" : null;
}

export async function resolveTodoHref(
  todo: CoachTodo,
  coachId: string,
): Promise<string | null> {
  if (todo.completed) return null;

  const athleteId = todo.athlete_id;
  const title = todo.title.toLowerCase();
  const focusField = getTodoFocusField(todo);

  const wantsProgram =
    todo.kind === "program_needed" || /programma/.test(title);
  const wantsPayment =
    todo.kind === "payment_missing" ||
    todo.kind === "payment_day_missing" ||
    /prijs|betaaldag|betaling/.test(title);
  const wantsProfileFields =
    todo.kind === "profile_fields_missing" ||
    /geboortedatum|lidnummer/.test(title);
  const wantsStartingPrs =
    todo.kind === "starting_prs_missing" ||
    /startprs|start prs|coaching start|startdatum/.test(title);

  if (athleteId && wantsProgram) {
    const { data } = await resolveProgramEntryForAthlete(athleteId, coachId);
    if (data) {
      return buildProgramWeekPath(data, { coachViewingAthlete: true });
    }
    return athleteHubHref(athleteId);
  }

  if (athleteId && wantsPayment) {
    return athleteProfileHref(
      athleteId,
      focusField === "betaling_dag" ? "betaling_dag" : "betaling_prijs",
    );
  }

  if (athleteId && wantsProfileFields) {
    return athleteProfileHref(athleteId, focusField || "geboortedatum");
  }

  if (athleteId && wantsStartingPrs) {
    return athleteProfileHref(athleteId, "starting_prs");
  }

  if (athleteId) {
    return athleteHubHref(athleteId);
  }

  return null;
}
