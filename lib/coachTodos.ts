import { loadAthleteLastActivities } from "@/lib/athleteLastActivity";
import { isOptionalTextFieldComplete } from "@/lib/optionalFieldDash";
import { supabase } from "@/lib/supabaseClient";
import { isLowComplianceTodo, purgeLowComplianceTodos } from "@/lib/coachTodoSync";
import {
  loadAthletesNeedingNewProgram,
  programAlertAutoKey,
} from "@/lib/coachProgramAlerts";

export type CoachTodoKanbanStatus = "todo" | "doing" | "done";

export type CoachTodo = {
  id: string;
  coach_id: string;
  title: string;
  completed: boolean;
  completed_at?: string | null;
  due_at?: string | null;
  created_at: string;
  updated_at: string;
  athlete_id?: string | null;
  auto_key?: string | null;
  kind?: string | null;
  kanban_status?: CoachTodoKanbanStatus;
};

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const DONE_RETENTION_MS = 7 * ONE_DAY_MS;

export const COACH_TODOS_CHANGED_EVENT = "coach-todos-changed";

export async function refreshCoachAutoTodos(coachId: string, isAdmin = false) {
  await syncCoachTodosInBackground(coachId, isAdmin);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(COACH_TODOS_CHANGED_EVENT));
  }
}

export function isRecentCompletedTodo(todo: CoachTodo) {
  if (!todo.completed) return true;
  if (!todo.completed_at) return true;
  return Date.now() - new Date(todo.completed_at).getTime() <= DONE_RETENTION_MS;
}

export async function purgeOldCompletedCoachTodos(coachId: string) {
  const cutoff = new Date(Date.now() - DONE_RETENTION_MS).toISOString();

  await supabase
    .from("coach_todos")
    .delete()
    .eq("coach_id", coachId)
    .eq("completed", true)
    .not("completed_at", "is", null)
    .lt("completed_at", cutoff);
}

function isAthleteInactiveForWeek(daysAgo: number | null) {
  return daysAgo === null || daysAgo >= 7;
}

async function loadInactiveAthleteIds(coachId: string, isAdmin = false) {
  let query = supabase.from("profiles").select("id").eq("role", "atleet");
  if (!isAdmin) {
    query = query.eq("coach_id", coachId);
  }

  const { data: athletes } = await query;
  const athleteIds = (athletes || []).map((athlete) => athlete.id as string);
  if (athleteIds.length === 0) return new Set<string>();

  const activityMap = await loadAthleteLastActivities(athleteIds);
  const inactiveIds = new Set<string>();
  for (const athleteId of athleteIds) {
    const daysAgo = activityMap.get(athleteId)?.daysAgo ?? null;
    if (isAthleteInactiveForWeek(daysAgo)) {
      inactiveIds.add(athleteId);
    }
  }
  return inactiveIds;
}

function isTodoLinkedToInactiveAthlete(
  todo: CoachTodo,
  inactiveAthleteIds: Set<string>,
) {
  return Boolean(todo.athlete_id && inactiveAthleteIds.has(todo.athlete_id));
}

export async function syncProgramAlertTodos(coachId: string, isAdmin = false) {
  const inactiveIds = await loadInactiveAthleteIds(coachId, isAdmin);
  const alerts = await loadAthletesNeedingNewProgram(coachId, isAdmin);
  const activeKeys = new Set<string>();

  for (const alert of alerts) {
    if (inactiveIds.has(alert.athleteId)) continue;
    const autoKey = programAlertAutoKey(alert.athleteId, alert.blockId);
    activeKeys.add(autoKey);
    const title = `Nieuw programma nodig voor ${alert.athleteName}`;

    const { data: existing } = await supabase
      .from("coach_todos")
      .select("id")
      .eq("coach_id", coachId)
      .eq("auto_key", autoKey)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("coach_todos")
        .update({ title, updated_at: new Date().toISOString() })
        .eq("id", existing.id);
    } else {
      await supabase.from("coach_todos").insert({
        coach_id: coachId,
        title,
        athlete_id: alert.athleteId,
        auto_key: autoKey,
        kind: "program_needed",
      });
    }
  }

  const { data: programTodos } = await supabase
    .from("coach_todos")
    .select("id, auto_key")
    .eq("coach_id", coachId)
    .eq("kind", "program_needed");

  for (const todo of programTodos || []) {
    if (!todo.auto_key || activeKeys.has(todo.auto_key)) continue;
    await supabase.from("coach_todos").delete().eq("id", todo.id);
  }
}

export async function syncCoachTodosInBackground(
  coachId: string,
  isAdmin = false,
) {
  await syncProgramAlertTodos(coachId, isAdmin);
  await syncPaymentMissingTodos(coachId, isAdmin);
  await syncAthleteProfileTodos(coachId, isAdmin);
  await syncInactiveAthleteTodos(coachId, isAdmin);

  try {
    const { syncIntakeCompletedTodosCleanup } = await import("@/lib/coachTodoSync");
    await syncIntakeCompletedTodosCleanup(coachId, isAdmin);
    await purgeLowComplianceTodos(coachId);
  } catch {
    // Intake / legacy low-compliance cleanup is best-effort.
  }

  await purgeOldCompletedCoachTodos(coachId);
}

function normalizeCoachTodo(row: CoachTodo): CoachTodo {
  const kanbanStatus =
    row.kanban_status ||
    (row.completed ? "done" : "todo");
  return {
    ...row,
    kanban_status: kanbanStatus,
  };
}

export async function loadCoachTodosFast(
  coachId: string,
  options?: { includeOldCompleted?: boolean; isAdmin?: boolean },
) {
  const inactiveAthleteIds = await loadInactiveAthleteIds(
    coachId,
    options?.isAdmin ?? false,
  );

  const { data, error } = await supabase
    .from("coach_todos")
    .select("*")
    .eq("coach_id", coachId)
    .order("completed", { ascending: true })
    .order("created_at", { ascending: false });

  const rows = ((data || []) as CoachTodo[])
    .map(normalizeCoachTodo)
    .filter((todo) =>
      options?.includeOldCompleted ? true : isRecentCompletedTodo(todo),
    )
    .filter(
      (todo) => !isTodoLinkedToInactiveAthlete(todo, inactiveAthleteIds),
    )
    .filter((todo) => !isLowComplianceTodo(todo));

  return {
    data: rows,
    error,
  };
}

export async function loadCoachTodos(
  coachId: string,
  isAdmin = false,
  options?: { includeOldCompleted?: boolean },
) {
  await syncCoachTodosInBackground(coachId, isAdmin);
  return loadCoachTodosFast(coachId, { ...options, isAdmin });
}

export function paymentTodoAutoKey(athleteId: string) {
  return `payment-missing:${athleteId}`;
}

export async function syncPaymentMissingTodos(coachId: string, isAdmin = false) {
  const inactiveIds = await loadInactiveAthleteIds(coachId, isAdmin);

  let query = supabase
    .from("profiles")
    .select("id, full_name, betaling_prijs, betaling_dag")
    .eq("role", "atleet");

  if (!isAdmin) {
    query = query.eq("coach_id", coachId);
  }

  const { data: athletes } = await query;

  for (const athlete of athletes || []) {
    const athleteId = athlete.id as string;
    if (inactiveIds.has(athleteId)) continue;

    const price =
      athlete.betaling_prijs !== null && athlete.betaling_prijs !== undefined
        ? Number(athlete.betaling_prijs)
        : null;
    const day =
      athlete.betaling_dag !== null && athlete.betaling_dag !== undefined
        ? Number(athlete.betaling_dag)
        : null;
    const autoKey = paymentTodoAutoKey(athleteId);
    const hasPrice = price !== null && !Number.isNaN(price);
    const paymentNotApplicable =
      !hasPrice && (day === null || Number.isNaN(day));

    if (hasPrice || paymentNotApplicable) {
      await clearAutoTodo(coachId, autoKey);
      continue;
    }

    const title = `Vul prijs in voor ${athlete.full_name || "atleet"}`;
    const { data: existing } = await supabase
      .from("coach_todos")
      .select("id")
      .eq("coach_id", coachId)
      .eq("auto_key", autoKey)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("coach_todos")
        .update({ title, athlete_id: athlete.id, updated_at: new Date().toISOString() })
        .eq("id", existing.id);
    } else {
      await supabase.from("coach_todos").insert({
        coach_id: coachId,
        title,
        athlete_id: athlete.id,
        auto_key: autoKey,
        kind: "payment_missing",
      });
    }
  }
}

type AthleteProfileRow = {
  id: string;
  full_name: string | null;
  geboortedatum: string | null;
  lidnummer: string | null;
  betaling_prijs: number | null;
  betaling_dag: number | null;
  coaching_start_date: string | null;
  starting_pr_squat: number | null;
  starting_pr_bench: number | null;
  starting_pr_deadlift: number | null;
};

async function upsertAutoTodo(
  coachId: string,
  autoKey: string,
  title: string,
  athleteId: string,
  kind: string,
) {
  const { data: existing } = await supabase
    .from("coach_todos")
    .select("id")
    .eq("coach_id", coachId)
    .eq("auto_key", autoKey)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("coach_todos")
      .update({
        title,
        athlete_id: athleteId,
        kind,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
    return;
  }

  await supabase.from("coach_todos").insert({
    coach_id: coachId,
    title,
    athlete_id: athleteId,
    auto_key: autoKey,
    kind,
  });
}

async function clearAutoTodo(coachId: string, autoKey: string) {
  await supabase
    .from("coach_todos")
    .delete()
    .eq("coach_id", coachId)
    .eq("auto_key", autoKey);
}

export function paymentDayTodoAutoKey(athleteId: string) {
  return `payment-day-missing:${athleteId}`;
}

export function profileFieldsTodoAutoKey(athleteId: string) {
  return `profile-fields-missing:${athleteId}`;
}

export function startingPrsTodoAutoKey(athleteId: string) {
  return `starting-prs-missing:${athleteId}`;
}

export async function dismissAthleteAdminTodosAfterSave(
  coachId: string | undefined,
  athleteId: string,
  snapshot: {
    geboortedatum: string | null;
    lidnummer: string | null;
    betalingPrijs: number | null;
    betalingDag: number | null;
    paymentMarkedNa?: boolean;
    lidnummerMarkedNa?: boolean;
  },
) {
  if (!coachId) return;

  const profileComplete =
    Boolean(snapshot.geboortedatum?.trim()) &&
    (isOptionalTextFieldComplete(snapshot.lidnummer) ||
      Boolean(snapshot.lidnummerMarkedNa));

  if (profileComplete) {
    await clearAutoTodo(coachId, profileFieldsTodoAutoKey(athleteId));
  }

  const hasPaymentPrice =
    snapshot.betalingPrijs !== null && !Number.isNaN(snapshot.betalingPrijs);
  const hasPaymentDay =
    snapshot.betalingDag !== null && !Number.isNaN(snapshot.betalingDag);

  if (snapshot.paymentMarkedNa) {
    await clearAutoTodo(coachId, paymentTodoAutoKey(athleteId));
    await clearAutoTodo(coachId, paymentDayTodoAutoKey(athleteId));
    return;
  }

  if (hasPaymentPrice) {
    await clearAutoTodo(coachId, paymentTodoAutoKey(athleteId));
  }

  if (hasPaymentPrice && hasPaymentDay) {
    await clearAutoTodo(coachId, paymentDayTodoAutoKey(athleteId));
  }
}

export function inactiveAthleteTodoAutoKey(athleteId: string) {
  return `inactive-athlete:${athleteId}`;
}

export async function syncInactiveAthleteTodos(
  coachId: string,
  isAdmin = false,
) {
  const inactiveIds = await loadInactiveAthleteIds(coachId, isAdmin);
  if (inactiveIds.size === 0) return;

  for (const athleteId of inactiveIds) {
    await clearAutoTodo(coachId, inactiveAthleteTodoAutoKey(athleteId));
  }

  await supabase
    .from("coach_todos")
    .delete()
    .eq("coach_id", coachId)
    .in("athlete_id", Array.from(inactiveIds))
    .not("auto_key", "is", null);
}

function isStartingPrsMissing(athlete: AthleteProfileRow) {
  if (!athlete.coaching_start_date) return true;
  return (
    athlete.starting_pr_squat === null ||
    athlete.starting_pr_bench === null ||
    athlete.starting_pr_deadlift === null
  );
}

export async function syncAthleteProfileTodos(coachId: string, isAdmin = false) {
  const inactiveIds = await loadInactiveAthleteIds(coachId, isAdmin);

  let query = supabase
    .from("profiles")
    .select(
      "id, full_name, geboortedatum, lidnummer, betaling_prijs, betaling_dag, coaching_start_date, starting_pr_squat, starting_pr_bench, starting_pr_deadlift",
    )
    .eq("role", "atleet");

  if (!isAdmin) {
    query = query.eq("coach_id", coachId);
  }

  const { data: athletes } = await query;
  const name = (athlete: AthleteProfileRow) => athlete.full_name || "atleet";

  for (const row of athletes || []) {
    const athlete = row as AthleteProfileRow;
    const athleteId = athlete.id;
    if (inactiveIds.has(athleteId)) continue;

    const paymentDayKey = paymentDayTodoAutoKey(athleteId);
    const hasPaymentPrice =
      athlete.betaling_prijs !== null && athlete.betaling_prijs !== undefined;
    if (
      hasPaymentPrice &&
      (athlete.betaling_dag === null || athlete.betaling_dag === undefined)
    ) {
      await upsertAutoTodo(
        coachId,
        paymentDayKey,
        `Vul betaaldag in voor ${name(athlete)}`,
        athleteId,
        "payment_day_missing",
      );
    } else {
      await clearAutoTodo(coachId, paymentDayKey);
    }

    const profileKey = profileFieldsTodoAutoKey(athleteId);
    const missingProfile =
      !athlete.geboortedatum?.trim() ||
      !isOptionalTextFieldComplete(athlete.lidnummer);
    if (missingProfile) {
      await upsertAutoTodo(
        coachId,
        profileKey,
        `Vul geboortedatum/lidnummer in voor ${name(athlete)}`,
        athleteId,
        "profile_fields_missing",
      );
    } else {
      await clearAutoTodo(coachId, profileKey);
    }

    const startingKey = startingPrsTodoAutoKey(athleteId);
    if (isStartingPrsMissing(athlete)) {
      await upsertAutoTodo(
        coachId,
        startingKey,
        `Vul startdatum/PRs in voor ${name(athlete)}`,
        athleteId,
        "starting_prs_missing",
      );
    } else {
      await clearAutoTodo(coachId, startingKey);
    }
  }
}

export async function createCoachTodo(
  coachId: string,
  title: string,
  athleteId?: string | null,
  dueAt?: string | null,
) {
  const trimmed = title.trim();
  if (!trimmed) {
    return { data: null, error: new Error("Vul een taak in.") };
  }

  const { data, error } = await supabase
    .from("coach_todos")
    .insert({
      coach_id: coachId,
      title: trimmed,
      kind: "manual",
      athlete_id: athleteId || null,
      due_at: dueAt || null,
    })
    .select("*")
    .single();

  return {
    data: (data || null) as CoachTodo | null,
    error,
  };
}

export async function updateCoachTodoDueAt(todoId: string, dueAt: string | null) {
  const { data, error } = await supabase
    .from("coach_todos")
    .update({
      due_at: dueAt,
      updated_at: new Date().toISOString(),
    })
    .eq("id", todoId)
    .select("*")
    .single();

  return {
    data: (data || null) as CoachTodo | null,
    error,
  };
}

export async function toggleCoachTodo(todo: CoachTodo) {
  const nextCompleted = !todo.completed;
  const { data, error } = await supabase
    .from("coach_todos")
    .update({
      completed: nextCompleted,
      completed_at: nextCompleted ? new Date().toISOString() : null,
      kanban_status: nextCompleted ? "done" : "todo",
      updated_at: new Date().toISOString(),
    })
    .eq("id", todo.id)
    .select("*")
    .single();

  return {
    data: data ? normalizeCoachTodo(data as CoachTodo) : null,
    error,
  };
}

export async function updateCoachTodoKanbanStatus(
  todo: CoachTodo,
  status: CoachTodoKanbanStatus,
) {
  const nextCompleted = status === "done";
  const { data, error } = await supabase
    .from("coach_todos")
    .update({
      kanban_status: status,
      completed: nextCompleted,
      completed_at: nextCompleted ? todo.completed_at || new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", todo.id)
    .select("*")
    .single();

  return {
    data: data ? normalizeCoachTodo(data as CoachTodo) : null,
    error,
  };
}

export async function deleteCoachTodo(todoId: string) {
  const { error } = await supabase.from("coach_todos").delete().eq("id", todoId);
  return { error };
}
