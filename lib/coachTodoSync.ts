import { supabase } from "@/lib/supabaseClient";

export function intakeTodoAutoKey(athleteId: string) {
  return `intake-completed:${athleteId}`;
}

export function lowComplianceTodoAutoKey(athleteId: string) {
  return `low-compliance:${athleteId}`;
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

export async function syncLowComplianceTodos(
  coachId: string,
  rows: Array<{ athleteId: string; athleteName: string; fillScore: number }>,
  threshold = 50,
) {
  for (const row of rows) {
    const autoKey = lowComplianceTodoAutoKey(row.athleteId);
    const low = row.fillScore < threshold;

    if (!low) {
      await supabase
        .from("coach_todos")
        .delete()
        .eq("coach_id", coachId)
        .eq("auto_key", autoKey);
      continue;
    }

    const title = `Lage invulscore (${row.fillScore}%) — ${row.athleteName}`;
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
        athlete_id: row.athleteId,
        auto_key: autoKey,
        kind: "low_compliance",
      });
    }
  }
}
