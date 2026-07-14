"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  loadAthleteCoachChatPreview,
  type AthleteCoachChatPreview,
} from "@/lib/athleteChatPreview";
import { queryKeys } from "@/lib/queryKeys";
import { athleteQueryDefaults } from "@/lib/queryOptions";

export function useAthleteCoachChatPreview(athleteId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.athleteCoachChatPreview(athleteId),
    queryFn: () => loadAthleteCoachChatPreview(athleteId),
    enabled: enabled && Boolean(athleteId),
    ...athleteQueryDefaults,
  });
}

export function prefetchAthleteCoachChatPreview(
  queryClient: ReturnType<typeof useQueryClient>,
  athleteId: string,
) {
  return queryClient.prefetchQuery({
    queryKey: queryKeys.athleteCoachChatPreview(athleteId),
    queryFn: () => loadAthleteCoachChatPreview(athleteId),
    ...athleteQueryDefaults,
  });
}

export type { AthleteCoachChatPreview };
