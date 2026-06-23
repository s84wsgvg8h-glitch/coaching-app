export type AppRole = "coach" | "atleet" | "admin" | "pending" | string;

export function isCoachLikeRole(role: AppRole | null | undefined) {
  return role === "coach" || role === "admin";
}

export function isAdminRole(role: AppRole | null | undefined) {
  return role === "admin";
}

export function isAthleteRole(role: AppRole | null | undefined) {
  return role === "atleet";
}

export function isHeadCoachRole(
  role: AppRole | null | undefined,
  isHeadCoach?: boolean | null,
) {
  return isCoachLikeRole(role) && Boolean(isHeadCoach);
}

/** Routes that require coach or admin role */
export const COACH_ONLY_PATH_PREFIXES = [
  "/invulscore",
  "/ai-vragen",
  "/settings/",
  "/athletes",
  "/limitless-data",
] as const;

export const ADMIN_ONLY_PATH_PREFIXES = ["/admin"] as const;

export function pathRequiresCoachLikeRole(pathname: string) {
  return COACH_ONLY_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export function pathRequiresAdminRole(pathname: string) {
  return ADMIN_ONLY_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export function sanitizeNextPath(next: string | null | undefined): string | null {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return null;
  const path = next.split("?")[0];
  if (path === "/login" || path === "/signup" || path === "/") return null;
  // Never restore CRM deep links — they point at another user's context.
  if (
    /^\/profile\/[^/]+/.test(path) ||
    /^\/athletes\/[^/]+/.test(path) ||
    /^\/chat\/[^/]+/.test(path)
  ) {
    return null;
  }
  // Drop athlete context from saved return URLs (e.g. meet-week?athlete=…).
  if (next.includes("athlete=")) {
    const base = path;
    if (base === "/meet-week" || base === "/planning" || base === "/programs") {
      return null;
    }
  }
  return next;
}

export function canAccessPath(
  role: AppRole | null | undefined,
  pathname: string,
): boolean {
  const path = pathname.split("?")[0];
  if (pathRequiresAdminRole(path)) return isAdminRole(role);
  if (pathRequiresCoachLikeRole(path)) return isCoachLikeRole(role);
  return true;
}

export function getHomePathForRole(role: AppRole | null | undefined): string {
  if (isAdminRole(role)) return "/admin";
  return "/dashboard";
}

/** Default landing route after login — always role home, never ?next= profile/CRM URLs. */
export function resolvePostLoginPath(
  role: AppRole | null | undefined,
  _nextPath?: string | null,
): string {
  void _nextPath;
  const knownRole =
    role === "admin" || role === "coach" || role === "atleet";

  if (!knownRole) {
    return "/dashboard";
  }

  return getHomePathForRole(role);
}
