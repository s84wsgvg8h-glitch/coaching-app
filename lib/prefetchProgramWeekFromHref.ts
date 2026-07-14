import type { QueryClient } from "@tanstack/react-query";
import { prefetchProgramWeekCore } from "@/hooks/useProgramWeekCore";

const PROGRAM_WEEK_HREF_RE = /^\/programs\/([^/]+)\/weeks\/([^/?]+)/;

export function parseProgramWeekHref(href: string) {
  const match = href.match(PROGRAM_WEEK_HREF_RE);
  if (!match) return null;
  return { blockId: match[1], weekId: match[2] };
}

export function prefetchProgramWeekFromHref(
  queryClient: QueryClient,
  href: string,
  options?: { userId?: string; role?: string },
) {
  const parsed = parseProgramWeekHref(href);
  if (!parsed) return Promise.resolve();

  return prefetchProgramWeekCore(
    queryClient,
    parsed.blockId,
    parsed.weekId,
    options,
  );
}
