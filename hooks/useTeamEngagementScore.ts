"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  loadTeamEngagementScore,
  type TeamEngagementScore,
} from "@/lib/teamEngagementScore";
import { athleteQueryDefaults } from "@/lib/queryOptions";
import { queryKeys } from "@/lib/queryKeys";

export function useTeamEngagementScore(
  coachId: string,
  role: string,
  enabled = true,
) {
  return useQuery({
    queryKey: queryKeys.teamEngagement(coachId, role),
    queryFn: () => loadTeamEngagementScore(coachId, role),
    enabled: enabled && Boolean(coachId && role),
    ...athleteQueryDefaults,
  });
}

export function prefetchTeamEngagementScore(
  queryClient: ReturnType<typeof useQueryClient>,
  coachId: string,
  role: string,
) {
  return queryClient.prefetchQuery({
    queryKey: queryKeys.teamEngagement(coachId, role),
    queryFn: () => loadTeamEngagementScore(coachId, role),
    ...athleteQueryDefaults,
  });
}

export type { TeamEngagementScore };
