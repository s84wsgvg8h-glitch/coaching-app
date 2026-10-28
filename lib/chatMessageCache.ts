import type { ChatMessage } from "@/lib/chatUtils";
import {
  loadDirectMessagesRecent,
  loadGroupMessagesRecent,
} from "@/lib/chatMessageLoader";

const messageCache = new Map<string, ChatMessage[]>();
const inflightPrefetches = new Map<string, Promise<ChatMessage[]>>();

export function getDirectChatCacheKey(userId: string, peerUserId: string) {
  return `direct:${userId}:${peerUserId}`;
}

export function getGroupChatCacheKey(groupId: string) {
  return `group:${groupId}`;
}

export function getCachedChatMessages(key: string) {
  return messageCache.get(key);
}

export function setCachedChatMessages(key: string, messages: ChatMessage[]) {
  messageCache.set(key, messages);
}

export function appendCachedChatMessage(key: string, message: ChatMessage) {
  const current = messageCache.get(key);
  if (!current) {
    messageCache.set(key, [message]);
    return;
  }
  if (current.some((item) => item.id === message.id)) return;
  messageCache.set(key, [...current, message]);
}

export function replaceCachedChatMessageId(
  key: string,
  optimisticId: string,
  nextMessage: ChatMessage,
) {
  const current = messageCache.get(key);
  if (!current) return;
  messageCache.set(
    key,
    current.map((item) => (item.id === optimisticId ? nextMessage : item)),
  );
}

export function removeCachedChatMessage(key: string, messageId: string) {
  const current = messageCache.get(key);
  if (!current) return;
  messageCache.set(
    key,
    current.filter((item) => item.id !== messageId),
  );
}

export function prefetchChatMessages(
  userId: string,
  entry: { kind: "direct"; id: string } | { kind: "group"; id: string },
) {
  const key =
    entry.kind === "direct"
      ? getDirectChatCacheKey(userId, entry.id)
      : getGroupChatCacheKey(entry.id);

  if (messageCache.has(key) || inflightPrefetches.has(key)) return;

  const promise =
    entry.kind === "direct"
      ? loadDirectMessagesRecent(userId, entry.id)
      : loadGroupMessagesRecent(entry.id);

  inflightPrefetches.set(key, promise);
  void promise
    .then((messages) => {
      messageCache.set(key, messages);
    })
    .finally(() => {
      inflightPrefetches.delete(key);
    });
}

export async function resolveChatMessages(
  key: string,
  loader: () => Promise<ChatMessage[]>,
) {
  const inflight = inflightPrefetches.get(key);
  if (inflight) {
    try {
      const messages = await inflight;
      messageCache.set(key, messages);
      return messages;
    } catch {
      // Fall through to a fresh load.
    }
  }

  const cached = messageCache.get(key);
  if (cached?.length) return cached;

  const messages = await loader();
  messageCache.set(key, messages);
  return messages;
}
