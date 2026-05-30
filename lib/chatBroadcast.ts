import { supabase } from "@/lib/supabaseClient";

export async function broadcastMessageToAthletes(
  coachId: string,
  body: string,
) {
  const { data: athletes, error: athletesError } = await supabase
    .from("profiles")
    .select("id")
    .eq("role", "atleet")
    .eq("coach_id", coachId);

  if (athletesError || !athletes?.length) {
    return { sent: 0, error: athletesError?.message || "Geen atleten gevonden" };
  }

  const trimmed = body.trim();
  if (!trimmed) {
    return { sent: 0, error: "Bericht is leeg" };
  }

  const messages = athletes.map((athlete) => ({
    sender_id: coachId,
    receiver_id: athlete.id,
    body: trimmed,
    read_at: null,
  }));

  const { error } = await supabase.from("messages").insert(messages);

  if (error) {
    return { sent: 0, error: error.message };
  }

  return { sent: messages.length, error: null };
}
