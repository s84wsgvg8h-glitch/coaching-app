"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { loadProgramWeekCore } from "@/lib/programWeekCoreLoader";
import { queryKeys } from "@/lib/queryKeys";
import { athleteQueryDefaults } from "@/lib/queryOptions";

type UseProgramWeekCoreOptions = {
  userId?: string;
  role?: string;
  enabled?: boolean;
};

export function useProgramWeekCore(
  blockId: string,
  weekId: string,
  options: UseProgramWeekCoreOptions = {},
) {
  const { userId, role, enabled = true } = options;

  return useQuery({
    queryKey: queryKeys.programWeekCore(blockId, weekId),
    queryFn: () =>
      loadProgramWeekCore(blockId, weekId, {
        userId,
        role,
      }),
    enabled: enabled && Boolean(blockId && weekId),
    ...athleteQueryDefaults,
  });
}

export function prefetchProgramWeekCore(
  queryClient: ReturnType<typeof useQueryClient>,
  blockId: string,
  weekId: string,
  options?: { userId?: string; role?: string },
) {
  return queryClient.prefetchQuery({
    queryKey: queryKeys.programWeekCore(blockId, weekId),
    queryFn: () => loadProgramWeekCore(blockId, weekId, options),
    ...athleteQueryDefaults,
  });
}

export function getCachedProgramWeekCore(
  queryClient: ReturnType<typeof useQueryClient>,
  blockId: string,
  weekId: string,
) {
  return queryClient.getQueryData(
    queryKeys.programWeekCore(blockId, weekId),
  );
}

export function syncProgramWeekCoreExercises(
  queryClient: ReturnType<typeof useQueryClient>,
  blockId: string,
  weekId: string,
  exercisesByDay: Record<string, import("@/lib/programWeek/types").ProgramExercise[]>,
) {
  queryClient.setQueryData(
    queryKeys.programWeekCore(blockId, weekId),
    (current) => {
      if (!current || typeof current !== "object") return current;
      return {
        ...current,
        exercisesByDay,
      };
    },
  );
}

export function syncProgramWeekCoreDays(
  queryClient: ReturnType<typeof useQueryClient>,
  blockId: string,
  weekId: string,
  days: import("@/lib/programWeek/types").ProgramDay[],
) {
  queryClient.setQueryData(
    queryKeys.programWeekCore(blockId, weekId),
    (current) => {
      if (!current || typeof current !== "object") return current;
      return {
        ...current,
        days,
      };
    },
  );
}
