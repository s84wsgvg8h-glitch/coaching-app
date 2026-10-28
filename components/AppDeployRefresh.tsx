"use client";

import { useEffect } from "react";
import { refreshAppIfStale } from "@/lib/nativeAppRefresh";

/** Reload the web app when production deploy version changes (stale CDN/browser cache). */
export default function AppDeployRefresh() {
  useEffect(() => {
    void refreshAppIfStale({ immediate: true });

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        void refreshAppIfStale();
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return null;
}
