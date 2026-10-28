import { supabase } from "@/lib/supabaseClient";

export function intakeTodoAutoKey(athleteId: string) {
  return `intake-completed:${athleteId}`;
}

export function lowComplianceTodoAutoKey(athleteId: string) {
  return `low-compliance:${athleteId}`;
}

export function isLowComplianceTodo(todo: {
  kind?: string | null;
  auto_key?: string | null;
  title?: string;
}) {
  if (todo.kind === "low_compliance") return true;
  if (todo.auto_key?.startsWith("low-compliance:")) return true;
  return (todo.title ?? "").startsWith("Lage invulscore");
}

export async function clearIntakeTodoForAthlete(
  coachId: string,
  athleteId: string,
) {
  await supabase
    .from("coach_todos")
    .delete()
    .eq("coach_id", coachId)
    .eq("auto_key", intakeTodoAutoKey(athleteId));
}

export async function syncIntakeSubmittedTodo(
  athleteId: string,
  athleteName: string,
) {
  const { data: athlete } = await supabase
    .from("profiles")
    .select("coach_id")
    .eq("id", athleteId)
    .maybeSingle();

  const coachId = athlete?.coach_id as string | undefined;
  if (!coachId) return;

  const autoKey = intakeTodoAutoKey(athleteId);
  const title = `Intake ingevuld door ${athleteName || "atleet"} — bekijk antwoorden`;

  const { data: existing } = await supabase
    .from("coach_todos")
    .select("id")
    .eq("coach_id", coachId)
    .eq("auto_key", autoKey)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("coach_todos")
      .update({ title, updated_at: new Date().toISOString(), completed: false })
      .eq("id", existing.id);
  } else {
    await supabase.from("coach_todos").insert({
      coach_id: coachId,
      title,
      athlete_id: athleteId,
      auto_key: autoKey,
      kind: "intake_completed",
    });
  }
}

export async function syncIntakeCompletedTodosCleanup(
  coachId: string,
  isAdmin = false,
) {
  const { data: intakeTodos } = await supabase
    .from("coach_todos")
    .select("id, athlete_id")
    .eq("coach_id", coachId)
    .eq("kind", "intake_completed");

  if (!intakeTodos?.length) return;

  const athleteIds = [
    ...new Set(
      intakeTodos
        .map((todo) => todo.athlete_id as string | null)
        .filter(Boolean),
    ),
  ] as string[];

  if (athleteIds.length === 0) return;

  let query = supabase
    .from("profiles")
    .select("id, intake_completed_at")
    .in("id", athleteIds);

  if (!isAdmin) {
    query = query.eq("coach_id", coachId);
  }

  const { data: profiles } = await query;
  const completedIds = new Set(
    (profiles || [])
      .filter((profile) => profile.intake_completed_at)
      .map((profile) => profile.id as string),
  );

  for (const todo of intakeTodos) {
    const athleteId = todo.athlete_id as string | null;
    if (!athleteId || !completedIds.has(athleteId)) {
      await supabase.from("coach_todos").delete().eq("id", todo.id);
    }
  }
}

/** Removes legacy low-compliance auto-todos (no longer shown in todo UI). */
export async function purgeLowComplianceTodos(coachId: string) {
  const { data: todos } = await supabase
    .from("coach_todos")
    .select("id, kind, auto_key, title")
    .eq("coach_id", coachId);

  const ids = (todos || []).filter(isLowComplianceTodo).map((todo) => todo.id);
  if (ids.length === 0) return;

  await supabase.from("coach_todos").delete().in("id", ids);
}
