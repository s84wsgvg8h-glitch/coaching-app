"use client";

import { useEffect } from "react";
import { flushOfflineSetQueue, getOfflineSetQueueCount } from "@/lib/offlineLogQueue";

export function useOfflineSetSync(onQueueChange?: (count: number) => void) {
  useEffect(() => {
    async function sync() {
      await flushOfflineSetQueue();
      onQueueChange?.(getOfflineSetQueueCount());
    }

    function handleOnline() {
      void sync();
    }

    void sync();
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [onQueueChange]);
}
