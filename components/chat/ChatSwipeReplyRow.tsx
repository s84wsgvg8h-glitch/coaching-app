"use client";

import { Reply } from "lucide-react";
import { useRef, useState } from "react";

type ChatSwipeReplyRowProps = {
  children: React.ReactNode;
  onReply: () => void;
  onSwipeStart?: () => void;
  disabled?: boolean;
};

const REPLY_THRESHOLD = 56;
const MAX_OFFSET = 72;

export default function ChatSwipeReplyRow({
  children,
  onReply,
  onSwipeStart,
  disabled = false,
}: ChatSwipeReplyRowProps) {
  const [offset, setOffset] = useState(0);
  const [animating, setAnimating] = useState(false);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const swipingRef = useRef(false);

  function resetOffset() {
    setAnimating(true);
    setOffset(0);
    window.setTimeout(() => setAnimating(false), 200);
  }

  function handleTouchStart(event: React.TouchEvent) {
    if (disabled || typeof window === "undefined" || window.innerWidth >= 768) {
      return;
    }

    const touch = event.touches[0];
    if (!touch) return;

    startXRef.current = touch.clientX;
    startYRef.current = touch.clientY;
    swipingRef.current = false;
    setAnimating(false);
  }

  function handleTouchMove(event: React.TouchEvent) {
    if (disabled || typeof window === "undefined" || window.innerWidth >= 768) {
      return;
    }

    const touch = event.touches[0];
    if (!touch) return;

    const deltaX = touch.clientX - startXRef.current;
    const deltaY = Math.abs(touch.clientY - startYRef.current);

    if (deltaX <= 6 || deltaX <= deltaY) return;

    swipingRef.current = true;
    onSwipeStart?.();
    event.preventDefault();
    setOffset(Math.min(deltaX, MAX_OFFSET));
  }

  function handleTouchEnd() {
    if (disabled || typeof window === "undefined" || window.innerWidth >= 768) {
      return;
    }

    if (swipingRef.current && offset >= REPLY_THRESHOLD) {
      onReply();
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate(10);
      }
    }

    swipingRef.current = false;
    resetOffset();
  }

  return (
    <div className="chat-swipe-reply-row relative min-w-0 max-w-full overflow-hidden">
      <div
        className="pointer-events-none absolute inset-y-0 left-0 flex w-10 items-center justify-center"
        aria-hidden="true"
      >
        <Reply
          className={`h-4 w-4 transition-opacity ${
            offset > 18 ? "text-app-accent opacity-100" : "text-app-muted opacity-0"
          }`}
        />
      </div>
      <div
        className={`min-w-0 max-w-full ${animating ? "transition-transform duration-200 ease-out" : ""}`}
        style={{ transform: offset > 0 ? `translateX(${offset}px)` : undefined }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      >
        {children}
      </div>
    </div>
  );
}
