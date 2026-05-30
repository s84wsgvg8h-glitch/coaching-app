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
