/**
 * Native iOS keyboard height from @capacitor/keyboard.
 * Updated by CapacitorBootstrap; consumed by chatViewport and keyboard CSS.
 */

export const KEYBOARD_TRANSITION_DURATION = "0.25s";
export const KEYBOARD_TRANSITION_EASING = "cubic-bezier(0.17, 0.59, 0.4, 0.99)";

let _height = 0;
const _listeners = new Set<(height: number) => void>();

export function setNativeKeyboardHeight(h: number): void {
  _height = Math.max(0, Math.round(h));
  applyKeyboardCssVars(_height);
  for (const fn of _listeners) fn(_height);
}

export function getNativeKeyboardHeight(): number {
  return _height;
}

/** Subscribe to native keyboard height changes. Returns an unsubscribe function. */
export function addNativeKeyboardListener(fn: (height: number) => void): () => void {
  _listeners.add(fn);
  return () => _listeners.delete(fn);
}

export function isCapacitorNativePlatform(): boolean {
  if (typeof document === "undefined") return false;
  if (document.documentElement.classList.contains("capacitor-native")) {
    return true;
  }

  if (typeof window !== "undefined") {
    const capacitor = (
      window as Window & {
        Capacitor?: { isNativePlatform?: () => boolean };
      }
    ).Capacitor;
    if (capacitor?.isNativePlatform?.()) {
      return true;
    }
  }

  return false;
}

export function isMobileUploadClient(): boolean {
  if (isCapacitorNativePlatform()) return true;
  if (typeof navigator === "undefined") return false;
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
}

/** Single source of truth for keyboard offset CSS variables. */
export function applyKeyboardCssVars(height: number): void {
  if (typeof document === "undefined") return;

  const root = document.documentElement;
  const h = Math.max(0, Math.round(height));

  root.style.setProperty("--keyboard-height", `${h}px`);
  root.style.setProperty("--keyboard-inset", `${h}px`);
  root.style.setProperty("--chat-keyboard-inset", `${h}px`);
  root.style.setProperty(
    "--keyboard-transition-duration",
    KEYBOARD_TRANSITION_DURATION,
  );
  root.style.setProperty(
    "--keyboard-transition-easing",
    KEYBOARD_TRANSITION_EASING,
  );

  if (h > 0) {
    root.dataset.keyboardOpen = "true";
  } else {
    delete root.dataset.keyboardOpen;
  }
}

export function clearKeyboardCssVars(): void {
  applyKeyboardCssVars(0);
}
