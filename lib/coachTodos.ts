import { supabase } from "@/lib/supabaseClient";
import {
  loadAthletesNeedingNewProgram,
  programAlertAutoKey,
} from "@/lib/coachProgramAlerts";

export type CoachTodo = {
  id: string;
  coach_id: string;
  title: string;
  completed: boolean;
  created_at: string;
  updated_at: string;
  athlete_id?: string | null;
  auto_key?: string | null;
  kind?: string | null;
};

export async function syncProgramAlertTodos(coachId: string, isAdmin = false) {
  const alerts = await loadAthletesNeedingNewProgram(coachId, isAdmin);

  for (const alert of alerts) {
    const autoKey = programAlertAutoKey(alert.athleteId, alert.blockId);
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
}

export async function loadCoachTodos(coachId: string, isAdmin = false) {
  await syncProgramAlertTodos(coachId, isAdmin);

  const { data, error } = await supabase
    .from("coach_todos")
    .select("*")
    .eq("coach_id", coachId)
    .order("completed", { ascending: true })
    .order("created_at", { ascending: false });

  return {
    data: (data || []) as CoachTodo[],
    error,
  };
}

export async function createCoachTodo(coachId: string, title: string) {
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
    })
    .select("*")
    .single();

  return {
    data: (data || null) as CoachTodo | null,
    error,
  };
}

export async function toggleCoachTodo(todo: CoachTodo) {
  const { data, error } = await supabase
    .from("coach_todos")
    .update({
      completed: !todo.completed,
      updated_at: new Date().toISOString(),
    })
    .eq("id", todo.id)
    .select("*")
    .single();

  return {
    data: (data || null) as CoachTodo | null,
    error,
  };
}

export async function deleteCoachTodo(todoId: string) {
  const { error } = await supabase.from("coach_todos").delete().eq("id", todoId);
  return { error };
}
