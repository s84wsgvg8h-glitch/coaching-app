const CHAT_RETURN_ROUTE_KEY = "chat-return-route";

export function saveChatReturnRoute(path: string) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(CHAT_RETURN_ROUTE_KEY, path);
}

export function getChatReturnRoute() {
  if (typeof window === "undefined") return "/chat";

  return sessionStorage.getItem(CHAT_RETURN_ROUTE_KEY) || "/chat";
}

export function clearChatReturnRoute() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(CHAT_RETURN_ROUTE_KEY);
}
