import { supabase } from "@/lib/supabaseClient";
import { broadcastMessageToAthletes } from "@/lib/chatBroadcast";

export type ScheduledBroadcast = {
  id: string;
  coach_id: string;
  message: string;
  scheduled_at: string;
  sent_at: string | null;
  repeat_rule: string | null;
  athlete_ids: string[] | null;
  created_at: string;
};

export async function loadScheduledBroadcasts(
  coachId: string,
): Promise<ScheduledBroadcast[]> {
  const { data, error } = await supabase
    .from("scheduled_chat_broadcasts")
    .select("*")
    .eq("coach_id", coachId)
    .order("scheduled_at", { ascending: true });

  if (error) return [];
  return (data || []) as ScheduledBroadcast[];
}

export async function createScheduledBroadcast(input: {
  coachId: string;
  message: string;
  scheduledAt: string;
  repeatRule?: string | null;
  athleteIds?: string[] | null;
}) {
  const { data, error } = await supabase
    .from("scheduled_chat_broadcasts")
    .insert({
      coach_id: input.coachId,
      message: input.message.trim(),
      scheduled_at: input.scheduledAt,
      repeat_rule: input.repeatRule || null,
      athlete_ids: input.athleteIds?.length ? input.athleteIds : null,
    })
    .select("*")
    .single();

  return { data: data as ScheduledBroadcast | null, error };
}

export async function deleteScheduledBroadcast(id: string) {
  return supabase.from("scheduled_chat_broadcasts").delete().eq("id", id);
}

export async function processDueBroadcasts(coachId: string) {
  const now = new Date().toISOString();

  const { data: due } = await supabase
    .from("scheduled_chat_broadcasts")
    .select("*")
    .eq("coach_id", coachId)
    .is("sent_at", null)
    .lte("scheduled_at", now);

  let processed = 0;

  for (const row of due || []) {
    const result = await broadcastMessageToAthletes(
      coachId,
      row.message,
      row.athlete_ids,
    );
    if (!result.error) {
      if (row.repeat_rule === "weekly") {
        const next = new Date(row.scheduled_at);
        next.setDate(next.getDate() + 7);
        await supabase.from("scheduled_chat_broadcasts").insert({
          coach_id: coachId,
          message: row.message,
          scheduled_at: next.toISOString(),
          repeat_rule: row.repeat_rule,
          athlete_ids: row.athlete_ids,
        });
      }

      await supabase
        .from("scheduled_chat_broadcasts")
        .update({ sent_at: now })
        .eq("id", row.id);
      processed += 1;
    }
  }

  return processed;
}
