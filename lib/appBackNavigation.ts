import { isCoachLikeRole } from "@/lib/authRoles";
import { getChatEntryReturn } from "@/lib/chatNavigation";

export type LogicalBackContext = {
  pathname: string;
  searchParams?: Pick<URLSearchParams, "get"> | null;
  role?: string | null;
};

const ROOT_PATHS = new Set([
  "/dashboard",
  "/login",
  "/signup",
  "/intake",
  "/",
]);

function normalizePathname(pathname: string) {
  const base = pathname.split("?")[0] || "/";
  return base === "/" ? "/dashboard" : base;
}

function parentByPathSegments(pathname: string) {
  const segments = normalizePathname(pathname).split("/").filter(Boolean);
  if (segments.length <= 1) return "/dashboard";
  segments.pop();
  return `/${segments.join("/")}`;
}

export function shouldShowBackButton(pathname: string) {
  const normalized = normalizePathname(pathname);
  if (ROOT_PATHS.has(normalized)) return false;
  // Profile detail pages render their own back control in the page header.
  if (/^\/profile\/[^/]+$/.test(normalized)) return false;
  return true;
}

export function getLogicalBackRoute(ctx: LogicalBackContext): string {
  const pathname = normalizePathname(ctx.pathname);
  const sp = ctx.searchParams;
  const coach = isCoachLikeRole(ctx.role);

  if (pathname === "/chat") {
    return getChatEntryReturn();
  }

  const groupInfoMatch = pathname.match(/^\/chat\/group\/([^/]+)\/info$/);
  if (groupInfoMatch) {
    return `/chat/group/${groupInfoMatch[1]}`;
  }

  if (pathname.startsWith("/chat/group/")) {
    return "/chat";
  }

  if (pathname.startsWith("/chat/")) {
    return "/chat";
  }

  const programWeekMatch = pathname.match(/^\/programs\/([^/]+)\/weeks\/([^/]+)$/);
  if (programWeekMatch) {
    const athleteId = sp?.get("athlete");
    if (athleteId) return `/athletes/${athleteId}`;
    if (coach) return "/athletes";
    return "/programs";
  }

  if (pathname.match(/^\/programs\/[^/]+$/)) {
    const athleteId = sp?.get("athlete");
    if (athleteId) return `/athletes/${athleteId}`;
    return "/programs";
  }

  if (pathname === "/programs") {
    return "/dashboard";
  }

  const athleteHubMatch = pathname.match(/^\/athletes\/([^/]+)$/);
  if (athleteHubMatch) {
    return "/athletes";
  }

  if (
    pathname === "/athletes" ||
    pathname === "/atleten-overzicht" ||
    pathname === "/athlete-profiles"
  ) {
    return "/dashboard";
  }

  const profileMatch = pathname.match(/^\/profile\/([^/]+)$/);
  if (profileMatch) {
    const profileId = profileMatch[1];
    if (coach) return `/athletes/${profileId}`;
    return "/dashboard";
  }

  if (pathname === "/profile" || pathname.startsWith("/profile")) {
    return "/dashboard";
  }

  if (pathname === "/admin/create-coach") {
    return "/admin";
  }

  if (pathname.startsWith("/admin")) {
    return "/dashboard";
  }

  if (pathname === "/statistics" || pathname === "/raw-data") {
    return "/data";
  }

  if (pathname === "/video-gallery" || pathname === "/video-review") {
    return coach ? "/data" : "/data";
  }

  if (pathname === "/data") {
    return "/dashboard";
  }

  if (pathname === "/ai-vragen") {
    return "/kennisbank";
  }

  if (pathname === "/kennisbank") {
    return "/dashboard";
  }

  if (pathname === "/wedstrijd-checklist") {
    return coach ? "/wedstrijd-kalender" : "/meet-week";
  }

  if (pathname === "/settings/competition-checklist") {
    return "/meet-week";
  }

  if (pathname.startsWith("/settings/")) {
    return "/profile";
  }

  if (pathname === "/reset-password/update") {
    return "/login";
  }

  if (pathname === "/reset-password") {
    return "/login";
  }

  if (pathname === "/privacy" || pathname === "/voorwaarden") {
    return "/login";
  }

  const dashboardChildren = new Set([
    "/agenda",
    "/planning",
    "/betalingen",
    "/organisatie",
    "/merch",
    "/limitless-data",
    "/leaderboard",
    "/oefeningenbibliotheek",
    "/todo",
    "/invulscore",
    "/doelen",
    "/meet-week",
    "/wedstrijd-kalender",
    "/rpe-tabel",
  ]);

  if (dashboardChildren.has(pathname)) {
    return "/dashboard";
  }

  return parentByPathSegments(pathname);
}

export function getLogicalBackLabel(href: string): string {
  if (href === "/dashboard") return "Dashboard";
  if (href === "/athletes") return "Atleten";
  if (href.match(/^\/athletes\/[^/]+$/)) return "Atleet";
  if (href === "/programs") return "Programma's";
  if (href === "/chat") return "Chat";
  if (href === "/data") return "Data";
  if (href === "/kennisbank") return "Kennisbank";
  if (href === "/meet-week") return "Meet-week";
  if (href === "/wedstrijd-kalender") return "Wedstrijdkalender";
  if (href === "/profile") return "Profiel";
  if (href === "/admin") return "Admin";
  if (href === "/login") return "Inloggen";
  if (href.startsWith("/chat/group/")) return "Groepschat";
  return "Terug";
}
