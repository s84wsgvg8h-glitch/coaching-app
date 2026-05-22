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
  pinned_message_id?: string | null;
};

type ConversationTarget =
  | { peerUserId: string; groupId?: never }
  | { groupId: string; peerUserId?: never };

type SettingsPatch = Partial<
  Pick<
    ChatConversationSettings,
    "pinned" | "muted" | "cleared_at" | "hidden_at" | "pinned_message_id"
  >
>;

type LocalSettingsStore = Record<string, SettingsPatch>;

const LOCAL_STORAGE_PREFIX = "chat-conversation-settings:";

function getLocalStorageKey(userId: string) {
  return `${LOCAL_STORAGE_PREFIX}${userId}`;
}

function readLocalStore(userId: string): LocalSettingsStore {
  if (typeof window === "undefined") return {};

  try {
    const raw = window.localStorage.getItem(getLocalStorageKey(userId));
    return raw ? (JSON.parse(raw) as LocalSettingsStore) : {};
  } catch {
    return {};
  }
}

function writeLocalPatch(
  userId: string,
  target: ConversationTarget,
  patch: SettingsPatch,
) {
  if (typeof window === "undefined") return;

  const key = getSettingsKey(target);
  const store = readLocalStore(userId);
  store[key] = { ...store[key], ...patch };
  window.localStorage.setItem(getLocalStorageKey(userId), JSON.stringify(store));
}

function parseSettingsKey(settingsKey: string) {
  const [kind, id] = settingsKey.split(":");
  return { kind, id };
}

function buildLocalSettingsEntry(
  userId: string,
  settingsKey: string,
  patch: SettingsPatch,
  existing?: ChatConversationSettings,
): ChatConversationSettings {
  const { kind, id } = parseSettingsKey(settingsKey);

  return {
    id: existing?.id || `local-${settingsKey}`,
    user_id: userId,
    peer_user_id: kind === "direct" ? id : null,
    group_id: kind === "group" ? id : null,
    pinned: patch.pinned ?? existing?.pinned ?? false,
    muted: patch.muted ?? existing?.muted ?? false,
    cleared_at: patch.cleared_at ?? existing?.cleared_at ?? null,
    hidden_at: patch.hidden_at ?? existing?.hidden_at ?? null,
    pinned_message_id:
      patch.pinned_message_id !== undefined
        ? patch.pinned_message_id
        : (existing?.pinned_message_id ?? null),
  };
}

function mergeSettingsWithLocal(
  userId: string,
  remote: ChatConversationSettings[],
): ChatConversationSettings[] {
  const localStore = readLocalStore(userId);
  const merged = new Map<string, ChatConversationSettings>();

  for (const item of remote) {
    const key = getSettingsKey(
      item.peer_user_id
        ? { peerUserId: item.peer_user_id }
        : { groupId: item.group_id! },
    );
    merged.set(key, {
      ...item,
      pinned:
        localStore[key]?.pinned !== undefined
          ? localStore[key]!.pinned!
          : item.pinned,
      muted:
        localStore[key]?.muted !== undefined
          ? localStore[key]!.muted!
          : item.muted,
      pinned_message_id:
        localStore[key]?.pinned_message_id !== undefined
          ? localStore[key]!.pinned_message_id
          : item.pinned_message_id,
      cleared_at:
        localStore[key]?.cleared_at !== undefined
          ? localStore[key]!.cleared_at
          : item.cleared_at,
      hidden_at:
        localStore[key]?.hidden_at !== undefined
          ? localStore[key]!.hidden_at
          : item.hidden_at,
    });
  }

  for (const [settingsKey, patch] of Object.entries(localStore)) {
    if (merged.has(settingsKey)) continue;
    merged.set(
      settingsKey,
      buildLocalSettingsEntry(userId, settingsKey, patch),
    );
  }

  return Array.from(merged.values());
}

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

  if (error || !data) {
    return mergeSettingsWithLocal(userId, []);
  }

  return mergeSettingsWithLocal(userId, data as ChatConversationSettings[]);
}

export async function upsertConversationSettings(
  userId: string,
  target: ConversationTarget,
  patch: SettingsPatch,
) {
  writeLocalPatch(userId, target, patch);

  const now = new Date().toISOString();
  const filter = getTargetFilter(userId, target);
  const settingsKey = getSettingsKey(target);
  const localFallback = buildLocalSettingsEntry(
    userId,
    settingsKey,
    patch,
    readLocalStore(userId)[settingsKey]
      ? buildLocalSettingsEntry(userId, settingsKey, readLocalStore(userId)[settingsKey])
      : undefined,
  );

  const { data: existing, error: existingError } = await supabase
    .from("chat_conversation_settings")
    .select("*")
    .match(filter)
    .maybeSingle();

  if (existingError) {
    return { data: localFallback, error: null };
  }

  if (existing?.id) {
    const { data, error } = await supabase
      .from("chat_conversation_settings")
      .update({ ...patch, updated_at: now })
      .eq("id", existing.id)
      .select("*")
      .single();

    if (error) {
      return {
        data: buildLocalSettingsEntry(
          userId,
          settingsKey,
          patch,
          existing as ChatConversationSettings,
        ),
        error: null,
      };
    }

    return { data: data as ChatConversationSettings, error: null };
  }

  const { data, error } = await supabase
    .from("chat_conversation_settings")
    .insert({ ...filter, ...patch, updated_at: now })
    .select("*")
    .single();

  if (error) {
    return { data: localFallback, error: null };
  }

  return { data: data as ChatConversationSettings, error: null };
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

export async function pinConversationMessage(
  userId: string,
  target: ConversationTarget,
  messageId: string | null,
) {
  return upsertConversationSettings(userId, target, {
    pinned_message_id: messageId,
  });
}

export function isConversationMuted(
  settings: ChatConversationSettings | undefined,
) {
  return Boolean(settings?.muted);
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
