import type { ChatGroupListItem } from "@/lib/chatGroups";
import type { ChatProfile } from "@/lib/chatUtils";

export type ChatListEntry =
  | (ChatProfile & { kind: "direct" })
  | (ChatGroupListItem & { kind: "group" });

export type ActiveChatRoute =
  | { type: "none"; id: "" }
  | { type: "direct"; id: string }
  | { type: "group"; id: string }
  | { type: "group-info"; id: string };

export function getActiveChatRoute(pathname: string): ActiveChatRoute {
  const parts = pathname.split("/").filter(Boolean);

  if (parts[0] !== "chat") {
    return { type: "none", id: "" };
  }

  if (parts[1] === "group" && parts[2]) {
    if (parts[3] === "info") {
      return { type: "group-info", id: parts[2] };
    }

    return { type: "group", id: parts[2] };
  }

  if (parts[1] && parts[1] !== "group") {
    return { type: "direct", id: parts[1] };
  }

  return { type: "none", id: "" };
}

/** True when viewing a DM or group thread (not the chat inbox list). */
export function isActiveChatConversation(pathname: string) {
  const route = getActiveChatRoute(pathname);
  return route.type === "direct" || route.type === "group";
}
