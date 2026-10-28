"use client";

import { useEffect, useState } from "react";
import { loadProgramWeekCoreCached } from "@/lib/programWeekCoreClient";
import type { ProgramWeekCoreData } from "@/lib/programWeekCoreLoader";

export function useProgramWeekCompareSnapshot(
  compareTarget: { blockId: string; weekId: string } | null,
  options: { userId: string; role: string; enabled?: boolean },
) {
  const [data, setData] = useState<ProgramWeekCoreData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!compareTarget || options.enabled === false) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    void loadProgramWeekCoreCached(compareTarget.blockId, compareTarget.weekId, {
      userId: options.userId,
      role: options.role,
    })
      .then(({ data: loaded }) => {
        if (!cancelled) {
          setData(loaded);
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setData(null);
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Week kon niet geladen worden.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    compareTarget?.blockId,
    compareTarget?.weekId,
    options.enabled,
    options.role,
    options.userId,
  ]);

  return { data, loading, error };
}
