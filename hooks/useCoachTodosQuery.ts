"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { loadCoachTodosFast, type CoachTodo } from "@/lib/coachTodos";
import { athleteQueryDefaults } from "@/lib/queryOptions";
import { queryKeys } from "@/lib/queryKeys";

export function useCoachTodosQuery(coachId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.coachTodos(coachId),
    queryFn: async () => {
      const { data, error } = await loadCoachTodosFast(coachId);
      if (error) throw error;
      return data;
    },
    enabled: enabled && Boolean(coachId),
    ...athleteQueryDefaults,
  });
}

export function prefetchCoachTodos(
  queryClient: ReturnType<typeof useQueryClient>,
  coachId: string,
) {
  return queryClient.prefetchQuery({
    queryKey: queryKeys.coachTodos(coachId),
    queryFn: async () => {
      const { data, error } = await loadCoachTodosFast(coachId);
      if (error) throw error;
      return data;
    },
    ...athleteQueryDefaults,
  });
}

export type { CoachTodo };
