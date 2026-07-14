"use client";

import { useLayoutEffect, useState } from "react";
import {
  clearKeyboardViewportVars,
  DEFAULT_KEYBOARD_VIEWPORT,
  isEditableFocusTarget,
  readKeyboardViewport,
  resetAppScrollContainers,
  restoreLayoutAfterKeyboardClose,
  syncKeyboardViewportLayout,
  type KeyboardViewportState,
} from "@/lib/keyboardViewport";
import { deferEffectUpdate } from "@/lib/deferEffectUpdate";

export function useKeyboardViewportSync(enabled = true) {
  const [state, setState] = useState<KeyboardViewportState>(() =>
    typeof window !== "undefined" ? readKeyboardViewport() : DEFAULT_KEYBOARD_VIEWPORT,
  );

  useLayoutEffect(() => {
    if (!enabled) {
      clearKeyboardViewportVars();
      resetAppScrollContainers();
      deferEffectUpdate(() => {
        setState(DEFAULT_KEYBOARD_VIEWPORT);
      });
      return;
    }

    let focusOutTimer: number | null = null;

    function sync() {
      const next = syncKeyboardViewportLayout();
      setState(next);
    }

    function onFocusIn(event: FocusEvent) {
      if (!isEditableFocusTarget(event.target)) return;
      sync();
    }

    function onFocusOut() {
      if (focusOutTimer !== null) {
        window.clearTimeout(focusOutTimer);
      }

      focusOutTimer = window.setTimeout(() => {
        if (isEditableFocusTarget(document.activeElement)) return;
        restoreLayoutAfterKeyboardClose();
        sync();
      }, 60);
    }

    sync();

    const viewport = window.visualViewport;
    viewport?.addEventListener("resize", sync);
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);

    return () => {
      if (focusOutTimer !== null) {
        window.clearTimeout(focusOutTimer);
      }
      viewport?.removeEventListener("resize", sync);
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
      clearKeyboardViewportVars();
      resetAppScrollContainers();
    };
  }, [enabled]);

  return state;
}

export { forceKeyboardViewportReset } from "@/lib/keyboardViewport";