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
  const [snapshot, setSnapshot] = useState<BlockProgressionSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const weekKey = useMemo(
    () => weeks.map((week) => week.id).join("|"),
    [weeks],
  );

  const loadSnapshot = useCallback(async () => {
    if (!enabled || weeks.length === 0) {
      setSnapshot(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const nextSnapshot = await fetchBlockProgressionSnapshot(
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

      setSnapshot(nextSnapshot);
    } catch {
      setSnapshot(null);
    } finally {
      setLoading(false);
    }
  }, [enabled, weeks]);

  useEffect(() => {
    void loadSnapshot();
  }, [loadSnapshot, weekKey]);

  return {
    snapshot,
    loading,
    refreshProgressionSnapshot: loadSnapshot,
  };
}
