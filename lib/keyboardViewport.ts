import {
  applyKeyboardInset,
  clearMobileViewportVars,
  lockWindowScroll,
  pinAppViewport,
  readKeyboardInset,
  syncMobileViewport,
} from "@/lib/viewportPin";
import { isChatViewportSyncActive, scheduleChatViewportSync } from "@/lib/chatViewport";

export type KeyboardViewportState = {
  viewportHeight: number;
  offsetTop: number;
  keyboardInset: number;
  keyboardOpen: boolean;
};

export const DEFAULT_KEYBOARD_VIEWPORT: KeyboardViewportState = {
  viewportHeight: 0,
  offsetTop: 0,
  keyboardInset: 0,
  keyboardOpen: false,
};

export function isEditableFocusTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(
    target.closest(
      'input:not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="hidden"]), textarea, select, [contenteditable="true"]',
    ),
  );
}

export function readKeyboardViewport(): KeyboardViewportState {
  if (typeof window === "undefined") return DEFAULT_KEYBOARD_VIEWPORT;

  const viewport = window.visualViewport;
  const keyboardInset = readKeyboardInset();
  const offsetTop = Math.round(viewport?.offsetTop ?? 0);
  const viewportHeight = Math.round(viewport?.height ?? window.innerHeight);

  return {
    viewportHeight,
    offsetTop,
    keyboardInset,
    keyboardOpen: keyboardInset > 0,
  };
}

export function clearKeyboardViewportVars() {
  clearMobileViewportVars();
}

export function resetMobileWindowScroll() {
  lockWindowScroll();
}

const APP_SCROLL_CONTAINER_SELECTOR =
  ".mobile-page-shell__body--scroll, .mobile-scroll, .chat-list-scroll, .athlete-dashboard-todos-scroll";

export function resetAppScrollContainers() {
  document.querySelectorAll(APP_SCROLL_CONTAINER_SELECTOR).forEach((node) => {
    if (node instanceof HTMLElement) {
      node.scrollTop = 0;
    }
  });
}

export function syncKeyboardViewportLayout() {
  if (isChatViewportSyncActive()) {
    scheduleChatViewportSync();
    applyKeyboardInset(readKeyboardInset());
    return readKeyboardViewport();
  }
  syncMobileViewport();
  return readKeyboardViewport();
}

export function forceKeyboardViewportReset() {
  if (isChatViewportSyncActive()) {
    scheduleChatViewportSync(true);
    applyKeyboardInset(readKeyboardInset());
    return readKeyboardViewport();
  }
  syncMobileViewport();
  resetAppScrollContainers();
  return readKeyboardViewport();
}

export function restoreLayoutAfterKeyboardClose() {
  if (isChatViewportSyncActive()) {
    scheduleChatViewportSync(true);
    applyKeyboardInset(readKeyboardInset());
    return;
  }

  for (const delay of [0, 120, 280]) {
    window.setTimeout(() => {
      pinAppViewport();
      applyKeyboardInset(readKeyboardInset());
      if (delay === 0) {
        lockWindowScroll();
      }
    }, delay);
  }
}
