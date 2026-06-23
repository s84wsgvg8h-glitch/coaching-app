const CHAT_RETURN_ROUTE_KEY = "chat-return-route";
const CHAT_ENTRY_RETURN_KEY = "chat-entry-return";

export function saveChatReturnRoute(path: string) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(CHAT_RETURN_ROUTE_KEY, path);
}

export function saveChatEntryReturn(path: string) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(CHAT_ENTRY_RETURN_KEY, path);
}

export function getChatReturnRoute() {
  if (typeof window === "undefined") return "/chat";

  return sessionStorage.getItem(CHAT_RETURN_ROUTE_KEY) || "/chat";
}

export function getChatEntryReturn() {
  if (typeof window === "undefined") return "/dashboard";

  return sessionStorage.getItem(CHAT_ENTRY_RETURN_KEY) || "/dashboard";
}

export function clearChatReturnRoute() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(CHAT_RETURN_ROUTE_KEY);
}
