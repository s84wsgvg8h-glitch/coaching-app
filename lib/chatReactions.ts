import { supabase } from "@/lib/supabaseClient";

export type MessageReaction = {
  message_id: string;
  user_id: string;
  emoji: string;
  user_name?: string | null;
};

export const QUICK_REACTION_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏"] as const;

export async function loadMessageReactions(messageIds: string[]) {
  if (messageIds.length === 0) {
    return {} as Record<string, MessageReaction[]>;
  }

  const { data, error } = await supabase
    .from("chat_message_reactions")
    .select("message_id, user_id, emoji")
    .in("message_id", messageIds);

  if (error || !data) return {};

  const grouped: Record<string, MessageReaction[]> = {};

  for (const row of data) {
    const reaction: MessageReaction = {
      message_id: row.message_id,
      user_id: row.user_id,
      emoji: row.emoji,
    };

    if (!grouped[row.message_id]) {
      grouped[row.message_id] = [];
    }
    grouped[row.message_id].push(reaction);
  }

  return grouped;
}

export async function toggleMessageReaction(messageId: string, emoji: string) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: new Error("Niet ingelogd.") };
  }

  const { data: existing } = await supabase
    .from("chat_message_reactions")
    .select("emoji")
    .eq("message_id", messageId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing?.emoji === emoji) {
    const { error } = await supabase
      .from("chat_message_reactions")
      .delete()
      .eq("message_id", messageId)
      .eq("user_id", user.id);
    return { error };
  }

  if (existing) {
    const { error } = await supabase
      .from("chat_message_reactions")
      .update({ emoji, created_at: new Date().toISOString() })
      .eq("message_id", messageId)
      .eq("user_id", user.id);
    return { error };
  }

  const { error } = await supabase.from("chat_message_reactions").insert({
    message_id: messageId,
    user_id: user.id,
    emoji,
  });

  return { error };
}

export function groupReactionsByEmoji(reactions: MessageReaction[]) {
  const map = new Map<string, MessageReaction[]>();

  for (const reaction of reactions) {
    const list = map.get(reaction.emoji) || [];
    list.push(reaction);
    map.set(reaction.emoji, list);
  }

  return [...map.entries()].map(([emoji, users]) => ({ emoji, users }));
}
