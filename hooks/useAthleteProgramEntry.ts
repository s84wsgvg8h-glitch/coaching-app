"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import {
  buildProgramWeekPath,
  resolveProgramEntryForAthlete,
  type ResolvedProgramEntry,
} from "@/lib/programNavigation";
import { queryKeys } from "@/lib/queryKeys";
import { athleteQueryDefaults } from "@/lib/queryOptions";
import {
  cacheAthleteProgramHref,
  clearAthleteProgramHrefSession,
  readAthleteProgramHrefSession,
} from "@/lib/programEntrySessionCache";

export type AthleteProgramEntryResult = {
  entry: ResolvedProgramEntry | null;
  error: string | null;
  href: string;
  hasProgram: boolean;
};

async function fetchAthleteProgramEntry(
  athleteId: string,
  actingUserId: string,
): Promise<AthleteProgramEntryResult> {
  const result = await resolveProgramEntryForAthlete(athleteId, actingUserId);

  if (result.data) {
    const coachViewing = actingUserId !== athleteId;
    const href = buildProgramWeekPath(
      result.data,
      coachViewing ? { coachViewingAthlete: true } : undefined,
    );
    if (!coachViewing) {
      cacheAthleteProgramHref(href);
    }
    return {
      entry: result.data,
      error: result.error,
      href,
      hasProgram: true,
    };
  }

  clearAthleteProgramHrefSession();
  return {
    entry: null,
    error: result.error,
    href: "/programs",
    hasProgram: false,
  };
}

export function useAthleteProgramEntry(
  athleteId: string,
  actingUserId: string,
  enabled = true,
) {
  return useQuery({
    queryKey: queryKeys.athleteProgramEntry(athleteId, actingUserId),
    queryFn: () => fetchAthleteProgramEntry(athleteId, actingUserId),
    enabled: enabled && Boolean(athleteId && actingUserId),
    ...athleteQueryDefaults,
    staleTime: 0,
    refetchOnMount: "always",
  });
}

export function useAthleteTrainingHref(userId: string, enabled = true) {
  const sessionHref = useMemo(
    () => (enabled && userId ? readAthleteProgramHrefSession() : null),
    [enabled, userId],
  );
  const query = useAthleteProgramEntry(userId, userId, enabled);

  return {
    href: query.data?.href ?? sessionHref,
    hasProgram: query.data?.hasProgram ?? (sessionHref ? true : true),
    isLoading: query.isLoading && !query.data && !sessionHref,
    entry: query.data?.entry ?? null,
  };
}

export function prefetchAthleteProgramEntry(
  queryClient: ReturnType<typeof useQueryClient>,
  athleteId: string,
  actingUserId: string,
) {
  return queryClient.prefetchQuery({
    queryKey: queryKeys.athleteProgramEntry(athleteId, actingUserId),
    queryFn: () => fetchAthleteProgramEntry(athleteId, actingUserId),
    ...athleteQueryDefaults,
  });
}

export function prefetchCoachAthleteProgramEntries(
  queryClient: ReturnType<typeof useQueryClient>,
  coachId: string,
  athleteIds: string[],
  limit = 16,
) {
  const uniqueIds = [...new Set(athleteIds.filter(Boolean))].slice(0, limit);
  return Promise.all(
    uniqueIds.map((athleteId) =>
      prefetchAthleteProgramEntry(queryClient, athleteId, coachId),
    ),
  );
}

export function getCachedAthleteProgramHref(
  queryClient: ReturnType<typeof useQueryClient>,
  athleteId: string,
  actingUserId: string,
): string | null {
  const cached = queryClient.getQueryData<AthleteProgramEntryResult>(
    queryKeys.athleteProgramEntry(athleteId, actingUserId),
  );
  if (cached?.hasProgram && cached.href && cached.href !== "/programs") {
    return cached.href;
  }
  if (actingUserId === athleteId) {
    return readAthleteProgramHrefSession();
  }
  return null;
}

/** Resolve a coach-facing deep program week href for an athlete (cached when possible). */
export async function resolveCoachAthleteProgramHref(
  queryClient: ReturnType<typeof useQueryClient>,
  athleteId: string,
  coachId: string,
): Promise<string | null> {
  const cached = getCachedAthleteProgramHref(queryClient, athleteId, coachId);
  if (cached) return cached;

  await prefetchAthleteProgramEntry(queryClient, athleteId, coachId);
  return getCachedAthleteProgramHref(queryClient, athleteId, coachId);
}

export function programAthleteIdFromCommandItem(item: {
  id: string;
  href?: string;
}): string | null {
  if (item.id.startsWith("program-")) {
    return item.id.slice("program-".length) || null;
  }

  if (!item.href) return null;
  try {
    const url = new URL(item.href, "https://limitless.local");
    if (url.pathname !== "/programs") return null;
    return url.searchParams.get("athlete");
  } catch {
    return null;
  }
}
