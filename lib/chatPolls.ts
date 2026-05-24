import { supabase } from "@/lib/supabaseClient";

export type PollOption = {
  id: string;
  text: string;
};

export type PollMessagePayload = {
  type: "poll";
  question: string;
  options: PollOption[];
  createdBy: string;
};

export type PollVote = {
  poll_message_id: string;
  user_id: string;
  option_id: string;
  voted_at?: string;
};

export function parsePollMessage(body: string | null): PollMessagePayload | null {
  if (!body) return null;

  try {
    const parsed = JSON.parse(body) as PollMessagePayload;
    if (
      parsed?.type === "poll" &&
      typeof parsed.question === "string" &&
      Array.isArray(parsed.options) &&
      parsed.options.length >= 2
    ) {
      return parsed;
    }
  } catch {
    return null;
  }

  return null;
}

export function buildPollMessageBody(
  question: string,
  options: PollOption[],
  createdBy: string,
) {
  const payload: PollMessagePayload = {
    type: "poll",
    question: question.trim(),
    options,
    createdBy,
  };

  return JSON.stringify(payload);
}

export function getPollPreviewText(body: string | null) {
  const poll = parsePollMessage(body);
  if (!poll) return "Poll";
  return `📊 ${poll.question}`;
}

export async function loadPollVotes(messageIds: string[]) {
  if (messageIds.length === 0) {
    return [] as PollVote[];
  }

  const { data, error } = await supabase
    .from("chat_poll_votes")
    .select("poll_message_id, user_id, option_id, voted_at")
    .in("poll_message_id", messageIds);

  if (error) {
    console.error("Poll votes laden mislukt:", error.message);
    return [] as PollVote[];
  }

  return (data || []) as PollVote[];
}

export async function castPollVote(
  pollMessageId: string,
  userId: string,
  optionId: string,
) {
  const { error } = await supabase.from("chat_poll_votes").upsert(
    {
      poll_message_id: pollMessageId,
      user_id: userId,
      option_id: optionId,
      voted_at: new Date().toISOString(),
    },
    { onConflict: "poll_message_id,user_id" },
  );

  return { error };
}

export function countPollVotes(
  votes: PollVote[],
  pollMessageId: string,
  optionId: string,
) {
  return votes.filter(
    (vote) =>
      vote.poll_message_id === pollMessageId && vote.option_id === optionId,
  ).length;
}

export function getUserPollVote(
  votes: PollVote[],
  pollMessageId: string,
  userId: string,
) {
  return votes.find(
    (vote) => vote.poll_message_id === pollMessageId && vote.user_id === userId,
  )?.option_id;
}

export function createPollOptionId(index: number) {
  return `opt-${index + 1}`;
}
