import { supabase } from "@/lib/supabaseClient";

export type QuickBwLogResult = {
  ok: boolean;
  error: string | null;
  loggedAt?: string;
};

export async function logQuickBodyweight(
  athleteId: string,
  bw: number,
  note?: string | null,
): Promise<QuickBwLogResult> {
  const { error } = await supabase.from("athlete_bw_logs").insert({
    athlete_id: athleteId,
    bw,
    note: note?.trim() || null,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true, error: null, loggedAt: new Date().toISOString() };
}
