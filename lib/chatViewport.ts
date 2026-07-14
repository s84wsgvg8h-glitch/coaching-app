import { readKeyboardInset, lockWindowScroll } from "@/lib/viewportPin";
import {
  applyKeyboardCssVars,
  getNativeKeyboardHeight,
  isCapacitorNativePlatform,
} from "@/lib/nativeKeyboard";

export const CHAT_VIEWPORT_SYNC_ATTR = "data-chat-viewport-sync";

const KEYBOARD_OPEN_THRESHOLD_PX = 72;

type ChatViewportElements = {
  panel: HTMLElement | null;
  messages: HTMLElement | null;
};

let elements: ChatViewportElements = {
  panel: null,
  messages: null,
};
let stickToBottom = true;
let rafId = 0;
let keyboardWasOpen = false;

export function setChatViewportStickToBottom(stick: boolean) {
  stickToBottom = stick;
}

export function resolveChatKeyboardHeight(): number {
  const native = getNativeKeyboardHeight();
  const viewportInset = readKeyboardInset();
  if (native > 0) return Math.max(native, viewportInset);
  if (isCapacitorNativePlatform()) return native;
  return viewportInset;
}

export function bindChatViewportElements(next: ChatViewportElements | null) {
  if (!next?.panel) {
    clearChatVisualViewport();
    elements = { panel: null, messages: null };
    return;
  }

  elements = next;
  document.documentElement.setAttribute(CHAT_VIEWPORT_SYNC_ATTR, "true");
  scheduleChatViewportSync(true);
}

export function isChatViewportSyncActive() {
  return document.documentElement.getAttribute(CHAT_VIEWPORT_SYNC_ATTR) === "true";
}

export function scheduleChatViewportSync(force = false) {
  if (!elements.panel) return;
  if (force && rafId !== 0) {
    window.cancelAnimationFrame(rafId);
    rafId = 0;
  }
  if (rafId !== 0) return;
  rafId = window.requestAnimationFrame(() => {
    rafId = 0;
    applyChatVisualViewport();
  });
}

function scrollMessagesToBottom(messages: HTMLElement, instant = true) {
  if (instant) {
    messages.scrollTop = messages.scrollHeight;
    return;
  }
  messages.scrollTo({ top: messages.scrollHeight, behavior: "smooth" });
}

export function applyChatVisualViewport() {
  const { messages } = elements;
  const keyboardHeight = resolveChatKeyboardHeight();
  const keyboardOpen = keyboardHeight >= KEYBOARD_OPEN_THRESHOLD_PX;
  const keyboardJustOpened = keyboardOpen && !keyboardWasOpen;
  keyboardWasOpen = keyboardOpen;

  applyKeyboardCssVars(keyboardHeight);

  if (window.visualViewport && window.visualViewport.offsetTop > 0) {
    lockWindowScroll();
  }

  if (!messages) return;

  const previousScrollTop = messages.scrollTop;
  const previousClientHeight = messages.clientHeight;

  if (stickToBottom || keyboardJustOpened) {
    requestAnimationFrame(() => {
      scrollMessagesToBottom(messages, true);
      requestAnimationFrame(() => scrollMessagesToBottom(messages, true));
    });
    return;
  }

  const heightDelta = messages.clientHeight - previousClientHeight;
  if (previousClientHeight > 0 && heightDelta !== 0) {
    messages.scrollTop = Math.max(0, previousScrollTop - heightDelta);
  }
}

export function clearChatVisualViewport() {
  if (rafId !== 0) {
    window.cancelAnimationFrame(rafId);
    rafId = 0;
  }

  keyboardWasOpen = false;
  document.documentElement.removeAttribute(CHAT_VIEWPORT_SYNC_ATTR);
}

export function syncChatVisualViewport() {
  scheduleChatViewportSync(true);
}
