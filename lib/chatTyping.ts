import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";

export type TypingPayload = {
  userId: string;
  userName: string;
};

const typingChannels = new Map<string, RealtimeChannel>();

export function subscribeToTyping(
  conversationKey: string,
  userId: string,
  userName: string,
  onTyping: (payload: TypingPayload | null) => void,
) {
  const existing = typingChannels.get(conversationKey);
  if (existing) {
    supabase.removeChannel(existing);
  }

  const channel = supabase.channel(`typing:${conversationKey}`, {
    config: { broadcast: { self: false } },
  });

  channel
    .on("broadcast", { event: "typing" }, ({ payload }) => {
      const data = payload as TypingPayload;
      if (data.userId !== userId) {
        onTyping(data);
      }
    })
    .on("broadcast", { event: "stop_typing" }, ({ payload }) => {
      const data = payload as TypingPayload;
      if (data.userId !== userId) {
        onTyping(null);
      }
    })
    .subscribe();

  typingChannels.set(conversationKey, channel);

  return () => {
    supabase.removeChannel(channel);
    typingChannels.delete(conversationKey);
  };
}

let typingTimer: ReturnType<typeof setTimeout> | null = null;

export function broadcastTyping(
  conversationKey: string,
  userId: string,
  userName: string,
) {
  const channel = typingChannels.get(conversationKey);
  if (!channel) return;

  void channel.send({
    type: "broadcast",
    event: "typing",
    payload: { userId, userName } satisfies TypingPayload,
  });

  if (typingTimer) clearTimeout(typingTimer);
  typingTimer = setTimeout(() => {
    void channel.send({
      type: "broadcast",
      event: "stop_typing",
      payload: { userId, userName } satisfies TypingPayload,
    });
  }, 2000);
}

export function getConversationTypingKey(
  userId: string,
  peerUserId?: string | null,
  groupId?: string | null,
) {
  if (groupId) return `group:${groupId}`;
  if (peerUserId) return `dm:${[userId, peerUserId].sort().join(":")}`;
  return "";
}
