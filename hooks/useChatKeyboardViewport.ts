"use client";

import { useLayoutEffect, type RefObject } from "react";
import {
  bindChatViewportElements,
  scheduleChatViewportSync,
  setChatViewportStickToBottom,
} from "@/lib/chatViewport";
import { addNativeKeyboardListener } from "@/lib/nativeKeyboard";

type ChatKeyboardViewportOptions = {
  enabled: boolean;
  panelRef: RefObject<HTMLElement | null>;
  messagesRef: RefObject<HTMLElement | null>;
  stickToBottomRef: RefObject<boolean>;
};

/**
 * Syncs --keyboard-height and scroll position for mobile chat conversations.
 * Panel height stays fixed; padding-bottom lifts compose with the keyboard.
 */
export function useChatKeyboardViewport({
  enabled,
  panelRef,
  messagesRef,
  stickToBottomRef,
}: ChatKeyboardViewportOptions) {
  useLayoutEffect(() => {
    if (!enabled) {
      bindChatViewportElements(null);
      return;
    }

    bindChatViewportElements({
      panel: panelRef.current,
      messages: messagesRef.current,
    });

    function sync() {
      setChatViewportStickToBottom(stickToBottomRef.current ?? true);
      scheduleChatViewportSync(true);
    }

    sync();

    const viewport = window.visualViewport;
    viewport?.addEventListener("resize", sync);
    viewport?.addEventListener("scroll", sync);
    window.addEventListener("orientationchange", sync);

    const unsubNativeKb = addNativeKeyboardListener(() => {
      scheduleChatViewportSync(true);
    });

    return () => {
      viewport?.removeEventListener("resize", sync);
      viewport?.removeEventListener("scroll", sync);
      window.removeEventListener("orientationchange", sync);
      unsubNativeKb();
      bindChatViewportElements(null);
    };
  }, [enabled]);
}
