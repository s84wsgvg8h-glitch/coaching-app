import {
  applyKeyboardCssVars,
  getNativeKeyboardHeight,
} from "@/lib/nativeKeyboard";

export const APP_VIEWPORT_ROOT_ID = "app-viewport-root";

const CHAT_VIEWPORT_SYNC_ATTR = "data-chat-viewport-sync";

function isChatViewportSyncActive() {
  if (typeof document === "undefined") return false;
  return document.documentElement.getAttribute(CHAT_VIEWPORT_SYNC_ATTR) === "true";
}

const KEYBOARD_INSET_THRESHOLD_PX = 72;

export function lockWindowScroll() {
  window.scrollTo(0, 0);
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
}

export function getVisualViewportOffsetTop() {
  return Math.max(0, Math.round(window.visualViewport?.offsetTop ?? 0));
}

export function getVisualViewportHeight() {
  return Math.round(window.visualViewport?.height ?? window.innerHeight);
}

export function readKeyboardInset() {
  const viewport = window.visualViewport;
  if (!viewport) return 0;

  const rawInset = Math.max(
    0,
    window.innerHeight - viewport.height - viewport.offsetTop,
  );

  return rawInset >= KEYBOARD_INSET_THRESHOLD_PX ? Math.round(rawInset) : 0;
}

export function isChatPath(pathname = "") {
  if (typeof window !== "undefined" && !pathname) {
    pathname = window.location.pathname;
  }
  return pathname === "/chat" || pathname.startsWith("/chat/");
}

/** Pages with their own inner scroll container (not document/body). */
export function isMobileInnerScrollPath(pathname = "") {
  if (typeof window !== "undefined" && !pathname) {
    pathname = window.location.pathname;
  }
  return (
    pathname === "/profile" ||
    pathname.startsWith("/profile?") ||
    pathname === "/intake"
  );
}

function isCapacitorNative() {
  if (typeof document === "undefined") return false;
  return document.documentElement.classList.contains("capacitor-native");
}

/** Pin the app root to the visual viewport — fixes iOS layout viewport drift. */
export function pinAppViewport(pathname?: string) {
  const root = document.getElementById(APP_VIEWPORT_ROOT_ID);
  if (!root) return;

  // Chat manages keyboard layout itself — never pin or resize the app root.
  if (isChatPath(pathname)) {
    root.style.top = "0px";
    root.style.height = "";
    root.style.bottom = "0px";
    root.style.transform = "";
    return;
  }

  if (isChatViewportSyncActive()) {
    root.style.top = "0px";
    root.style.height = "";
    root.style.bottom = "0px";
    root.style.transform = "";
    return;
  }

  // Profile (inner scroll shell): no viewport pinning — avoids iOS snap-back.
  if (isMobileInnerScrollPath(pathname)) {
    return;
  }

  if (isCapacitorNative()) {
    root.style.top = "0px";
    root.style.height = "100%";
    root.style.bottom = "0px";
    root.style.transform = "";
    lockWindowScroll();
    return;
  }

  lockWindowScroll();

  const offsetTop = getVisualViewportOffsetTop();

  // Only compensate iOS scroll drift — never shrink the page when the keyboard opens.
  if (offsetTop > 0) {
    root.style.top = `-${offsetTop}px`;
    root.style.height = "";
    root.style.bottom = "0px";
  } else {
    root.style.top = "0px";
    root.style.height = "";
    root.style.bottom = "0px";
  }
}

export function applyKeyboardInset(inset: number) {
  applyKeyboardCssVars(inset);
}

export function clearMobileViewportVars() {
  const html = document.documentElement;
  html.style.removeProperty("--keyboard-height");
  html.style.removeProperty("--keyboard-inset");
  html.style.removeProperty("--chat-keyboard-inset");
  delete html.dataset.keyboardOpen;

  const appRoot = document.getElementById(APP_VIEWPORT_ROOT_ID);
  if (appRoot) {
    appRoot.style.top = "0px";
    appRoot.style.height = "";
    appRoot.style.bottom = "0px";
  }
}

export function syncMobileViewport(pathname?: string) {
  pinAppViewport(pathname);
  if (isChatPath(pathname) || isChatViewportSyncActive()) {
    const native = getNativeKeyboardHeight();
    const inset =
      native > 0 ? native : isCapacitorNative() ? 0 : readKeyboardInset();
    applyKeyboardCssVars(inset);
    return;
  }
  applyKeyboardInset(readKeyboardInset());
}
