/** Primary tab routes — no mobile top bar (bottom nav is enough). */
const HIDE_MOBILE_TOP_BAR_EXACT_PATHS: string[] = [];

/** Athlete dashboard quick-link routes — no mobile top bar (back + profile). */
const HIDE_MOBILE_TOP_BAR_PATHS = [
  "/leaderboard",
  "/statistics",
  "/merch",
  "/meet-week",
];

/** Athlete-only routes (e.g. /statistics redirects to /data). */
const HIDE_MOBILE_TOP_BAR_ATHLETE_PATHS = ["/data"];

export function shouldHideMobileTopBar(pathname: string, role?: string | null) {
  if (HIDE_MOBILE_TOP_BAR_EXACT_PATHS.includes(pathname)) {
    return true;
  }

  if (
    HIDE_MOBILE_TOP_BAR_PATHS.some(
      (path) => pathname === path || pathname.startsWith(`${path}/`),
    )
  ) {
    return true;
  }

  if (
    role === "atleet" &&
    HIDE_MOBILE_TOP_BAR_ATHLETE_PATHS.some(
      (path) => pathname === path || pathname.startsWith(`${path}/`),
    )
  ) {
    return true;
  }

  return false;
}
