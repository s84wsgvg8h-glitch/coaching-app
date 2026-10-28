"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  clearProgramEditQueue,
  dispatchProgramOfflineSyncComplete,
  flushProgramEditQueue,
  getProgramEditQueueCount,
  mirrorProgramEditQueueToIdb,
  restoreProgramEditQueueFromIdb,
} from "@/lib/offlineProgramEditQueue";

const RETRY_INTERVAL_MS = 20_000;

export function useOfflineProgramSync() {
  const [count, setCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(
    typeof navigator === "undefined" ? true : navigator.onLine,
  );
  const syncingRef = useRef(false);

  const refreshCount = useCallback(() => {
    setCount(getProgramEditQueueCount());
  }, []);

  const retry = useCallback(async () => {
    if (syncingRef.current) return;
    syncingRef.current = true;
    setSyncing(true);
    try {
      const result = await flushProgramEditQueue();
      await mirrorProgramEditQueueToIdb();
      refreshCount();
      if (result.synced > 0) {
        dispatchProgramOfflineSyncComplete(result.affectedWeeks);
      }
    } finally {
      syncingRef.current = false;
      setSyncing(false);
    }
  }, [refreshCount]);

  const dismiss = useCallback(() => {
    clearProgramEditQueue();
    void mirrorProgramEditQueueToIdb();
    refreshCount();
  }, [refreshCount]);

  useEffect(() => {
    void restoreProgramEditQueueFromIdb().then(refreshCount);
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
      if (getProgramEditQueueCount() > 0 && navigator.onLine) {
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
