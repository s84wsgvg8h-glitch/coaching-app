"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { loadCoachTodosFast, type CoachTodo } from "@/lib/coachTodos";
import { athleteQueryDefaults } from "@/lib/queryOptions";
import { queryKeys } from "@/lib/queryKeys";

export function useCoachTodosQuery(coachId: string, role: string, enabled = true) {
  const isAdmin = role === "admin";

  return useQuery({
    queryKey: queryKeys.coachTodos(coachId, role),
    queryFn: async () => {
      const { data, error } = await loadCoachTodosFast(coachId, { isAdmin });
      if (error) throw error;
      return data;
    },
    enabled: enabled && Boolean(coachId && role),
    ...athleteQueryDefaults,
  });
}

export function prefetchCoachTodos(
  queryClient: ReturnType<typeof useQueryClient>,
  coachId: string,
  role: string,
) {
  const isAdmin = role === "admin";

  return queryClient.prefetchQuery({
    queryKey: queryKeys.coachTodos(coachId, role),
    queryFn: async () => {
      const { data, error } = await loadCoachTodosFast(coachId, { isAdmin });
      if (error) throw error;
      return data;
    },
    ...athleteQueryDefaults,
  });
}

export type { CoachTodo };
