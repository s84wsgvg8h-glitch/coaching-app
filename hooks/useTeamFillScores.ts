"use client";

import { useQuery } from "@tanstack/react-query";
import { loadTeamFillScores } from "@/lib/athleteFillScoreHistory";
import { queryKeys } from "@/lib/queryKeys";
import { athleteQueryDefaults } from "@/lib/queryOptions";

export function useTeamFillScores(coachId: string, isAdmin: boolean) {
  return useQuery({
    queryKey: queryKeys.teamFillScores(coachId, isAdmin),
    queryFn: () => loadTeamFillScores(coachId, isAdmin),
    enabled: Boolean(coachId),
    ...athleteQueryDefaults,
  });
}
