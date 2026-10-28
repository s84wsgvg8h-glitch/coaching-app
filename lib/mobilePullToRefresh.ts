export const MOBILE_PTR_THRESHOLD_PX = 72;
export const MOBILE_PTR_MAX_PULL_PX = 120;
export const MOBILE_PTR_HOLD_PX = 52;

const EXCLUDED_PREFIXES = [
  "/chat",
  "/login",
  "/signup",
  "/intake",
  "/reset-password",
  "/pending-approval",
];

export function isMobilePullToRefreshPath(pathname: string) {
  if (EXCLUDED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
    return false;
  }

  // Program week uses its own inner scroll container.
  if (/^\/programs\/[^/]+\/weeks\/[^/]+/.test(pathname)) {
    return false;
  }

  // Coach mobile home search should not pull-to-refresh.
  if (pathname === "/dashboard") {
    return false;
  }

  return true;
}

export function isMobilePullToRefreshViewport() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(max-width: 1023px)").matches;
}
