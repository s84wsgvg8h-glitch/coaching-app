"use client";

import { useEffect, useRef } from "react";
import {
  COACH_TODOS_CHANGED_EVENT,
  refreshCoachAutoTodos,
} from "@/lib/coachTodos";

const AUTO_TODO_SYNC_MS = 90_000;

/** Keeps auto-generated coach todos in sync while the coach uses the app. */
export function useCoachAutoTodoSync(
  coachId: string | null,
  isAdmin = false,
  onSynced?: () => void,
) {
  const onSyncedRef = useRef(onSynced);
  onSyncedRef.current = onSynced;

  useEffect(() => {
    if (!coachId) return;

    let cancelled = false;

    async function runSync() {
      await refreshCoachAutoTodos(coachId!, isAdmin);
      if (!cancelled) {
        onSyncedRef.current?.();
      }
    }

    void runSync();

    const interval = window.setInterval(() => {
      void runSync();
    }, AUTO_TODO_SYNC_MS);

    function handleFocus() {
      void runSync();
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        void runSync();
      }
    }

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [coachId, isAdmin]);
}

export { COACH_TODOS_CHANGED_EVENT };
