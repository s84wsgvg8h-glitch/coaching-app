"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { loadAthleteWeeklyFillScore } from "@/lib/athleteWeeklyFillScore";
import { queryKeys } from "@/lib/queryKeys";
import { athleteQueryDefaults } from "@/lib/queryOptions";

export function useAthleteFillScore(
  athleteId: string,
  athleteName: string,
  enabled = true,
) {
  return useQuery({
    queryKey: queryKeys.athleteFillScore(athleteId),
    queryFn: () => loadAthleteWeeklyFillScore(athleteId, athleteName || "Atleet"),
    enabled: enabled && Boolean(athleteId),
    ...athleteQueryDefaults,
  });
}

export function prefetchAthleteFillScore(
  queryClient: ReturnType<typeof useQueryClient>,
  athleteId: string,
  athleteName: string,
) {
  return queryClient.prefetchQuery({
    queryKey: queryKeys.athleteFillScore(athleteId),
    queryFn: () => loadAthleteWeeklyFillScore(athleteId, athleteName || "Atleet"),
    ...athleteQueryDefaults,
  });
}
