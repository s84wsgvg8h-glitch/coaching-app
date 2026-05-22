import { supabase } from "@/lib/supabaseClient";
import { notifyChatUnreadChanged } from "@/lib/chatUnread";

export type ChatConversationSettings = {
  id: string;
  user_id: string;
  peer_user_id: string | null;
  group_id: string | null;
  pinned: boolean;
  muted: boolean;
  cleared_at: string | null;
  hidden_at: string | null;
};

type ConversationTarget =
  | { peerUserId: string; groupId?: never }
  | { groupId: string; peerUserId?: never };

function getTargetFilter(userId: string, target: ConversationTarget) {
  if ("peerUserId" in target && target.peerUserId) {
    return {
      user_id: userId,
      peer_user_id: target.peerUserId,
      group_id: null,
    };
  }

  return {
    user_id: userId,
    peer_user_id: null,
    group_id: target.groupId!,
  };
}

export async function loadAllConversationSettings(userId: string) {
  const { data, error } = await supabase
    .from("chat_conversation_settings")
    .select("*")
    .eq("user_id", userId);

  if (error) {
    return [] as ChatConversationSettings[];
  }

  return (data || []) as ChatConversationSettings[];
}

export async function upsertConversationSettings(
  userId: string,
  target: ConversationTarget,
  patch: Partial<
    Pick<
      ChatConversationSettings,
      "pinned" | "muted" | "cleared_at" | "hidden_at"
    >
  >,
) {
  const now = new Date().toISOString();
  const filter = getTargetFilter(userId, target);

  const { data: existing } = await supabase
    .from("chat_conversation_settings")
    .select("id")
    .match(filter)
    .maybeSingle();

  if (existing?.id) {
    const { data, error } = await supabase
      .from("chat_conversation_settings")
      .update({ ...patch, updated_at: now })
      .eq("id", existing.id)
      .select("*")
      .single();

    return { data: data as ChatConversationSettings | null, error };
  }

  const { data, error } = await supabase
    .from("chat_conversation_settings")
    .insert({ ...filter, ...patch, updated_at: now })
    .select("*")
    .single();

  return { data: data as ChatConversationSettings | null, error };
}

export async function pinConversation(
  userId: string,
  target: ConversationTarget,
  pinned: boolean,
) {
  return upsertConversationSettings(userId, target, { pinned });
}

export async function muteConversation(
  userId: string,
  target: ConversationTarget,
  muted: boolean,
) {
  return upsertConversationSettings(userId, target, { muted });
}

export async function clearConversation(userId: string, target: ConversationTarget) {
  return upsertConversationSettings(userId, target, {
    cleared_at: new Date().toISOString(),
  });
}

export async function hideConversation(userId: string, target: ConversationTarget) {
  return upsertConversationSettings(userId, target, {
    hidden_at: new Date().toISOString(),
  });
}

export async function markConversationUnread(
  userId: string,
  target: ConversationTarget,
) {
  if ("peerUserId" in target && target.peerUserId) {
    const { error } = await supabase
      .from("messages")
      .update({ read_at: null })
      .eq("sender_id", target.peerUserId)
      .eq("receiver_id", userId)
      .is("group_id", null);

    if (error) return { error };

    notifyChatUnreadChanged();
    return { error: null };
  }

  const clearedAt = new Date(Date.now() - 60_000).toISOString();

  const { error } = await supabase.from("chat_group_read_states").upsert(
    {
      group_id: target.groupId!,
      user_id: userId,
      last_read_at: clearedAt,
    },
    { onConflict: "group_id,user_id" },
  );

  if (error) return { error };

  notifyChatUnreadChanged();
  return { error: null };
}

export async function unhideConversation(
  userId: string,
  target: ConversationTarget,
) {
  return upsertConversationSettings(userId, target, { hidden_at: null });
}

export function getSettingsKey(target: ConversationTarget) {
  if ("peerUserId" in target && target.peerUserId) {
    return `direct:${target.peerUserId}`;
  }

  return `group:${target.groupId}`;
}

export function filterMessagesByClearedAt<T extends { created_at: string }>(
  messages: T[],
  clearedAt: string | null | undefined,
) {
  if (!clearedAt) return messages;
  return messages.filter(
    (message) => new Date(message.created_at) > new Date(clearedAt),
  );
}
