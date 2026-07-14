/** Shared React Query timing — longer stale window for snappy tab switches on mobile. */
export const ATHLETE_QUERY_STALE_MS = 5 * 60_000;
export const ATHLETE_QUERY_GC_MS = 15 * 60_000;

export const athleteQueryDefaults = {
  staleTime: ATHLETE_QUERY_STALE_MS,
  gcTime: ATHLETE_QUERY_GC_MS,
  refetchOnWindowFocus: false,
  refetchOnReconnect: true,
} as const;
