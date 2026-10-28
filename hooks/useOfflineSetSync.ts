"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  clearOfflineSetQueue,
  flushOfflineSetQueue,
  getOfflineSetQueueCount,
} from "@/lib/offlineLogQueue";

const RETRY_INTERVAL_MS = 20_000;

export function useOfflineSetSync() {
  const [count, setCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(
    typeof navigator === "undefined" ? true : navigator.onLine,
  );
  const syncingRef = useRef(false);

  const refreshCount = useCallback(() => {
    setCount(getOfflineSetQueueCount());
  }, []);

  const retry = useCallback(async () => {
    if (syncingRef.current) return;
    syncingRef.current = true;
    setSyncing(true);
    try {
      await flushOfflineSetQueue();
      refreshCount();
    } finally {
      syncingRef.current = false;
      setSyncing(false);
    }
  }, [refreshCount]);

  const dismiss = useCallback(() => {
    clearOfflineSetQueue();
    refreshCount();
  }, [refreshCount]);

  useEffect(() => {
    refreshCount();
  }, [refreshCount]);

  useEffect(() => {
    function handleOnline() {
      setIsOnline(true);
      void retry();
    }

    function handleOffline() {
      setIsOnline(false);
      refreshCount();
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        void retry();
      }
    }

    void retry();
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    const intervalId = window.setInterval(() => {
      if (getOfflineSetQueueCount() > 0 && navigator.onLine) {
        void retry();
      }
    }, RETRY_INTERVAL_MS);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.clearInterval(intervalId);
    };
  }, [refreshCount, retry]);

  return {
    count,
    syncing,
    isOnline,
    retry,
    dismiss,
    refreshCount,
  };
}
