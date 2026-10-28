import { supabase } from "@/lib/supabaseClient";
import { getPollPreviewText, parsePollMessage } from "@/lib/chatPolls";
import {
  getAiAssistantPreviewText,
  parseAiAssistantMessage,
} from "@/lib/chatAi";

export type ChatMessage = {
  id: string;
  sender_id: string;
  receiver_id: string | null;
  body: string | null;
  file_url: string | null;
  file_type: string | null;
  created_at: string;
  read_at?: string | null;
  group_id?: string | null;
  reply_to_body?: string | null;
  reply_to_file_type?: string | null;
  reply_to_sender_id?: string | null;
};

export type ChatProfile = {
  id: string;
  full_name: string;
  role: string;
  avatar_url?: string | null;
  lastMessage?: string;
  lastMessageTime?: string;
  lastMessageSender?: string;
  unreadCount?: number;
};

export type ExerciseVideoMessagePayload = {
  type: "exercise_video";
  exerciseName: string;
  setNumber: number;
  reps: string | null;
  coachReps: string | null;
  weight: string | null;
  rpe: string | null;
  caption: string | null;
  thumbnailUrl: string | null;
  priority?: string | null;
};

export function formatDutchSetLabel(setNumber: number) {
  const suffix = setNumber === 1 ? "ste" : "de";
  return `${setNumber}${suffix} set`;
}

export function formatExerciseVideoStatsLine(
  payload: Pick<
    ExerciseVideoMessagePayload,
    "reps" | "coachReps" | "weight" | "rpe"
  >,
) {
  const displayReps = payload.reps?.trim() || payload.coachReps?.trim() || "";
  const weight = payload.weight?.trim() || "";
  const rpe = payload.rpe?.trim() || "";
  const parts: string[] = [];

  if (displayReps && weight) {
    parts.push(`${displayReps} x ${weight}kg`);
  } else if (displayReps) {
    parts.push(`${displayReps} reps`);
  } else if (weight) {
    parts.push(`${weight}kg`);
  }

  if (rpe) {
    parts.push(`RPE ${rpe}`);
  }

  return parts.join(" · ");
}

export function parseExerciseVideoMessage(
  body: string | null,
): ExerciseVideoMessagePayload | null {
  if (!body) return null;

  try {
    const parsed = JSON.parse(body) as ExerciseVideoMessagePayload;

    if (parsed?.type === "exercise_video" && parsed.exerciseName) {
      return parsed;
    }
  } catch {
    return null;
  }

  return null;
}

export function buildExerciseVideoMessageBody(
  payload: Omit<ExerciseVideoMessagePayload, "type">,
) {
  const message: ExerciseVideoMessagePayload = {
    type: "exercise_video",
    ...payload,
  };

  return JSON.stringify(message);
}

export function getInitials(name: string | null | undefined) {
  const parts = (name || "?").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
}

export function getMessagePreview(
  message: ChatMessage | undefined,
  selfId: string,
  senderName = "",
) {
  if (!message) {
    return { text: "Nog geen berichten", sender: "" };
  }

  const sender = message.sender_id === selfId ? "Jij" : senderName;

  if (parseAiAssistantMessage(message.body)) {
    return { text: getAiAssistantPreviewText(message.body), sender };
  }

  if (parsePollMessage(message.body)) {
    return { text: getPollPreviewText(message.body), sender };
  }

  if (parseExerciseVideoMessage(message.body)) {
    return { text: "Video", sender };
  }

  if (message.file_type === "image") {
    return { text: message.body?.trim() || "Foto", sender };
  }

  if (message.file_type === "video" && !parseExerciseVideoMessage(message.body)) {
    return { text: message.body?.trim() || "Video", sender };
  }

  if (message.file_type === "audio") {
    return { text: "Spraakbericht", sender };
  }

  if (message.body) {
    return { text: message.body, sender };
  }

  return { text: "Bericht", sender };
}

export function getReplyText(message: ChatMessage) {
  if (parseAiAssistantMessage(message.body)) {
    return getAiAssistantPreviewText(message.body);
  }

  if (parsePollMessage(message.body)) {
    return getPollPreviewText(message.body);
  }

  if (parseExerciseVideoMessage(message.body)) {
    return "Video";
  }

  if (message.body) return message.body;
  if (message.file_type === "image") return "Foto";
  if (message.file_type === "video") return "Video";
  if (message.file_type === "audio") return "Spraakbericht";
  return "Bericht";
}

export function formatMessageTime(value: string) {
  return new Date(value).toLocaleTimeString("nl-NL", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatChatListTime(value: string | undefined) {
  if (!value) return "";

  const date = new Date(value);
  const now = new Date();
  const sameDay =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  if (sameDay) {
    return formatMessageTime(value);
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  if (isYesterday) {
    return "Gisteren";
  }

  return date.toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "short",
  });
}

export function shouldShowDateDivider(
  current: ChatMessage,
  previous: ChatMessage | undefined,
) {
  if (!previous) return true;

  const currentDate = new Date(current.created_at).toDateString();
  const previousDate = new Date(previous.created_at).toDateString();
  return currentDate !== previousDate;
}

const MESSAGE_GROUP_WINDOW_MS = 5 * 60 * 1000;

export function shouldGroupWithPrevious(
  current: ChatMessage | undefined,
  previous: ChatMessage | undefined,
) {
  if (!current || !previous) return false;
  if (current.sender_id !== previous.sender_id) return false;
  if (shouldShowDateDivider(current, previous)) return false;

  const gap =
    new Date(current.created_at).getTime() -
    new Date(previous.created_at).getTime();
  return gap <= MESSAGE_GROUP_WINDOW_MS;
}

export function shouldShowMessageTimestamp(
  _current: ChatMessage,
  _next: ChatMessage | undefined,
) {
  return true;
}

export function getMessageBubbleRadiusClass(
  isMine: boolean,
  groupedWithPrevious: boolean,
  groupedWithNext: boolean,
) {
  const side = isMine ? "own" : "other";

  if (groupedWithPrevious && groupedWithNext) {
    return `chat-bubble-shape-${side}-middle`;
  }
  if (!groupedWithPrevious && groupedWithNext) {
    return `chat-bubble-shape-${side}-first`;
  }
  if (groupedWithPrevious && !groupedWithNext) {
    return `chat-bubble-shape-${side}-last chat-bubble-has-tail-${side}`;
  }
  return `chat-bubble-shape-${side}-single chat-bubble-has-tail-${side}`;
}

export async function sendExerciseVideoMessageToCoach(params: {
  athleteId: string;
  coachId?: string | null;
  videoUrl: string;
  thumbnailUrl: string | null;
  caption: string | null;
  exerciseName: string;
  setNumber: number;
  reps: string | null;
  coachReps: string | null;
  weight: string | null;
  rpe: string | null;
  priority?: string | null;
}) {
  const coachId =
    params.coachId ||
    (
      await supabase
        .from("profiles")
        .select("coach_id")
        .eq("id", params.athleteId)
        .maybeSingle()
    ).data?.coach_id ||
    (
      await supabase.from("profiles").select("id").eq("role", "coach").limit(1)
    ).data?.[0]?.id;

  if (!coachId) {
    return { error: new Error("Geen coach gevonden") };
  }

  const { error } = await supabase.from("messages").insert({
    sender_id: params.athleteId,
    receiver_id: coachId,
    body: buildExerciseVideoMessageBody({
      exerciseName: params.exerciseName,
      setNumber: params.setNumber,
      reps: params.reps,
      coachReps: params.coachReps,
      weight: params.weight,
      rpe: params.rpe,
      caption: params.caption,
      thumbnailUrl: params.thumbnailUrl,
      priority: params.priority ?? null,
    }),
    file_url: params.videoUrl,
    file_type: "video",
    read_at: null,
  });

  return { error };
}

export function formatDateDivider(value: string) {
  const date = new Date(value);
  const now = new Date();
  const sameDay =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  if (sameDay) return "Vandaag";

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  if (isYesterday) return "Gisteren";

  return date.toLocaleDateString("nl-NL", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}
