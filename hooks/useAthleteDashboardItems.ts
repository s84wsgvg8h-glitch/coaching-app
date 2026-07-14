"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { loadAthleteDashboardItems } from "@/lib/athleteDashboardItems";
import { queryKeys } from "@/lib/queryKeys";
import { athleteQueryDefaults } from "@/lib/queryOptions";

export function useAthleteDashboardItems(athleteId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.athleteDashboardItems(athleteId),
    queryFn: async () => {
      const { data, error } = await loadAthleteDashboardItems(athleteId);
      if (error) throw error;
      return data;
    },
    enabled: enabled && Boolean(athleteId),
    ...athleteQueryDefaults,
  });
}

export function invalidateAthleteDashboardItems(
  queryClient: ReturnType<typeof useQueryClient>,
  athleteId: string,
) {
  return queryClient.invalidateQueries({
    queryKey: queryKeys.athleteDashboardItems(athleteId),
  });
}
