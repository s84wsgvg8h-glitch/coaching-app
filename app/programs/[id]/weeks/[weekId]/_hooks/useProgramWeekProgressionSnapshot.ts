"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  fetchBlockProgressionSnapshot,
  patchProgressionSnapshotExercise,
  type BlockProgressionSnapshot,
} from "@/lib/programWeek/progressionView";
import type {
  AthleteExerciseSet,
  ProgramDay,
  ProgramExercise,
  ProgramWeek,
} from "@/lib/programWeek/types";

export function useProgramWeekProgressionSnapshot(
  enabled: boolean,
  weeks: ProgramWeek[],
  athleteId: string | null | undefined,
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
  const requestKey =
    enabled && weeks.length > 0 ? `${athleteId ?? ""}:${weekKey}` : "";

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
        athleteId
          ? async (exerciseIds) => {
              if (exerciseIds.length === 0) return [];

              const { data, error } = await supabase
                .from("athlete_exercise_sets")
                .select("*")
                .eq("athlete_id", athleteId)
                .in("program_exercise_id", exerciseIds)
                .order("set_number", { ascending: true });

              if (error) throw new Error(error.message);
              return (data ?? []) as AthleteExerciseSet[];
            }
          : undefined,
      );
    } catch {
      return null;
    }
  }, [athleteId, enabled, weeks]);

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

  const refreshProgressionSnapshot = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!options?.silent) setRefreshing(true);
      const snapshot = await fetchSnapshot();
      setResult((current) => {
        if (options?.silent && snapshot === null && current.snapshot) {
          return current;
        }
        return { requestKey, snapshot };
      });
      if (!options?.silent) setRefreshing(false);
    },
    [fetchSnapshot, requestKey],
  );

  const patchProgressionExercise = useCallback(
    (
      exerciseId: string,
      updates: Partial<Pick<ProgramExercise, "load" | "reps" | "rpe">>,
    ) => {
      let previous: Pick<ProgramExercise, "load" | "reps" | "rpe"> | null = null;

      setResult((current) => {
        if (!current.snapshot) return current;

        for (const exercises of Object.values(current.snapshot.exercisesByDay)) {
          const match = exercises.find((exercise) => exercise.id === exerciseId);
          if (match) {
            previous = {
              load: match.load,
              reps: match.reps,
              rpe: match.rpe,
            };
            break;
          }
        }

        return {
          ...current,
          snapshot: patchProgressionSnapshotExercise(
            current.snapshot,
            exerciseId,
            updates,
          ),
        };
      });

      return () => {
        if (!previous) return;
        const revert = previous;
        setResult((current) => {
          if (!current.snapshot) return current;
          return {
            ...current,
            snapshot: patchProgressionSnapshotExercise(
              current.snapshot,
              exerciseId,
              revert,
            ),
          };
        });
      };
    },
    [],
  );

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
    patchProgressionExercise,
  };
}
