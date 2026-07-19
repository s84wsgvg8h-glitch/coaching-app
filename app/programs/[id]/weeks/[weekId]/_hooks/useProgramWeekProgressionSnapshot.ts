"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  fetchBlockProgressionSnapshot,
  type BlockProgressionSnapshot,
} from "@/lib/programWeek/progressionView";
import type { ProgramDay, ProgramExercise, ProgramWeek } from "@/lib/programWeek/types";

export function useProgramWeekProgressionSnapshot(
  enabled: boolean,
  weeks: ProgramWeek[],
) {
  const [result, setResult] = useState<{
    requestKey: string;
    snapshot: BlockProgressionSnapshot | null;
  }>({ requestKey: "", snapshot: null });
  const [refreshing, setRefreshing] = useState(false);
  const weekKey = useMemo(
    () => weeks.map((week) => week.id).join("|"),
    [weeks],
  );
  const requestKey = enabled && weeks.length > 0 ? weekKey : "";

  const fetchSnapshot = useCallback(async () => {
    if (!enabled || weeks.length === 0) {
      return null;
    }

    try {
      return await fetchBlockProgressionSnapshot(
        weeks,
        async (weekIds) => {
          const { data, error } = await supabase
            .from("program_days")
            .select("*")
            .in("program_week_id", weekIds)
            .order("day_number", { ascending: true });

          if (error) throw new Error(error.message);
          return (data ?? []) as ProgramDay[];
        },
        async (dayIds) => {
          if (dayIds.length === 0) return [];

          const { data, error } = await supabase
            .from("program_exercises")
            .select("*")
            .in("program_day_id", dayIds)
            .order("exercise_number", { ascending: true, nullsFirst: false })
            .order("created_at", { ascending: true });

          if (error) throw new Error(error.message);
          return (data ?? []) as ProgramExercise[];
        },
      );
    } catch {
      return null;
    }
  }, [enabled, weeks]);

  useEffect(() => {
    let cancelled = false;

    void fetchSnapshot().then((snapshot) => {
      if (!cancelled) {
        setResult({ requestKey, snapshot });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [fetchSnapshot, requestKey]);

  const refreshProgressionSnapshot = useCallback(async () => {
    setRefreshing(true);
    const snapshot = await fetchSnapshot();
    setResult({ requestKey, snapshot });
    setRefreshing(false);
  }, [fetchSnapshot, requestKey]);

  const hasActiveRequest = enabled && weeks.length > 0;
  const snapshot =
    hasActiveRequest && result.requestKey === requestKey
      ? result.snapshot
      : null;
  const loading =
    refreshing || (hasActiveRequest && result.requestKey !== requestKey);

  return {
    snapshot,
    loading,
    refreshProgressionSnapshot,
  };
}
