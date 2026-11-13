"use client";

import { Reply } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type ChatSwipeReplyRowProps = {
  children: React.ReactNode;
  onReply: () => void;
  onSwipeStart?: () => void;
  disabled?: boolean;
  className?: string;
};

type SwipeAxis = "none" | "horizontal" | "vertical";

const REPLY_THRESHOLD = 56;
const MAX_OFFSET = 72;
const AXIS_LOCK_DISTANCE = 6;
const EDGE_GESTURE_GUARD = 24;

export default function ChatSwipeReplyRow({
  children,
  onReply,
  onSwipeStart,
  disabled = false,
  className = "",
}: ChatSwipeReplyRowProps) {
  const [offset, setOffset] = useState(0);
  const [animating, setAnimating] = useState(false);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const callbacksRef = useRef({ onReply, onSwipeStart, disabled });

  useEffect(() => {
    callbacksRef.current = { onReply, onSwipeStart, disabled };
  });

  useEffect(() => {
    const node = contentRef.current;
    if (!node) return;

    let startX = 0;
    let startY = 0;
    let axis: SwipeAxis = "none";
    let tracking = false;
    let currentOffset = 0;
    let resetTimer = 0;

    function isSwipeEnabled() {
      return !callbacksRef.current.disabled && window.innerWidth < 768;
    }

    function updateOffset(next: number) {
      currentOffset = next;
      setOffset(next);
    }

    function handleTouchStart(event: TouchEvent) {
      tracking = false;
      axis = "none";
      if (!isSwipeEnabled()) return;

      const touch = event.touches[0];
      if (!touch || touch.clientX <= EDGE_GESTURE_GUARD) return;

      startX = touch.clientX;
      startY = touch.clientY;
      tracking = true;
      window.clearTimeout(resetTimer);
      setAnimating(false);
    }

    function handleTouchMove(event: TouchEvent) {
      if (!tracking || axis === "vertical" || !isSwipeEnabled()) return;

      const touch = event.touches[0];
      if (!touch) return;

      const deltaX = touch.clientX - startX;
      const deltaY = Math.abs(touch.clientY - startY);

      if (axis === "none") {
        if (deltaX > AXIS_LOCK_DISTANCE && deltaX > deltaY) {
          axis = "horizontal";
          callbacksRef.current.onSwipeStart?.();
        } else if (
          deltaY > AXIS_LOCK_DISTANCE ||
          deltaX < -AXIS_LOCK_DISTANCE
        ) {
          axis = "vertical";
          return;
        } else {
          return;
        }
      }

      if (event.cancelable) event.preventDefault();
      updateOffset(Math.min(Math.max(deltaX, 0), MAX_OFFSET));
    }

    function handleTouchEnd() {
      const wasHorizontal = tracking && axis === "horizontal";
      tracking = false;
      axis = "none";
      if (!wasHorizontal) return;

      if (currentOffset >= REPLY_THRESHOLD) {
        callbacksRef.current.onReply();
        if ("vibrate" in navigator) {
          navigator.vibrate(10);
        }
      }

      setAnimating(true);
      updateOffset(0);
      resetTimer = window.setTimeout(() => setAnimating(false), 200);
    }

    node.addEventListener("touchstart", handleTouchStart, { passive: true });
    node.addEventListener("touchmove", handleTouchMove, { passive: false });
    node.addEventListener("touchend", handleTouchEnd);
    node.addEventListener("touchcancel", handleTouchEnd);

    return () => {
      window.clearTimeout(resetTimer);
      node.removeEventListener("touchstart", handleTouchStart);
      node.removeEventListener("touchmove", handleTouchMove);
      node.removeEventListener("touchend", handleTouchEnd);
      node.removeEventListener("touchcancel", handleTouchEnd);
    };
  }, []);

  return (
    <div
      className={`chat-swipe-reply-row relative max-w-full shrink-0 overflow-hidden ${className}`}
    >
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
        ref={contentRef}
        className={`w-full max-w-full ${animating ? "transition-transform duration-200 ease-out" : ""}`}
        style={{ transform: offset > 0 ? `translateX(${offset}px)` : undefined }}
      >
        {children}
      </div>
    </div>
  );
}
