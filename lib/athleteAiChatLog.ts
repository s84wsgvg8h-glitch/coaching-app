import { supabase } from "@/lib/supabaseClient";

export const UNKNOWN_ANSWER_MARKER = "Dat staat niet in mijn kennisbank";

export type AthleteAiChatLogRow = {
  id: string;
  athlete_id: string;
  coach_id: string | null;
  question: string;
  answer: string | null;
  knowledge_scope: string;
  sources: string[] | null;
  is_unknown: boolean;
  had_error: boolean;
  created_at: string;
  athlete?: { full_name: string | null } | null;
};

export function isUnknownAiAnswer(answer: string | null | undefined) {
  if (!answer?.trim()) return true;
  return answer.includes(UNKNOWN_ANSWER_MARKER);
}

export async function logAthleteAiChatTurn(input: {
  athleteId: string;
  question: string;
  answer?: string | null;
  knowledgeScope?: string;
  sources?: string[];
  hadError?: boolean;
}) {
  const { data: profile } = await supabase
    .from("profiles")
    .select("coach_id, role")
    .eq("id", input.athleteId)
    .maybeSingle();

  if (profile?.role !== "atleet") return;

  const answer = input.answer?.trim() || null;
  const sources = input.sources ?? [];
  const isUnknown =
    Boolean(input.hadError) || isUnknownAiAnswer(answer);

  const { error } = await supabase.from("athlete_ai_chat_logs").insert({
    athlete_id: input.athleteId,
    coach_id: profile.coach_id ?? null,
    question: input.question.trim(),
    answer,
    knowledge_scope: input.knowledgeScope ?? "athlete",
    sources,
    is_unknown: isUnknown,
    had_error: Boolean(input.hadError),
  });

  if (error) {
    console.error("athlete AI chat log insert failed:", error.message);
  }
}
