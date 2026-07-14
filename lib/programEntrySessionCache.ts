const PROGRAM_HREF_KEY = "lc:athlete-program-href";

export function cacheAthleteProgramHref(href: string) {
  if (typeof window === "undefined" || !href || href === "/programs") return;

  try {
    sessionStorage.setItem(PROGRAM_HREF_KEY, href);
  } catch {
    // ignore quota / private mode
  }
}

export function readAthleteProgramHrefSession(): string | null {
  if (typeof window === "undefined") return null;

  try {
    const href = sessionStorage.getItem(PROGRAM_HREF_KEY);
    return href && href !== "/programs" ? href : null;
  } catch {
    return null;
  }
}

export function clearAthleteProgramHrefSession() {
  if (typeof window === "undefined") return;

  try {
    sessionStorage.removeItem(PROGRAM_HREF_KEY);
  } catch {
    // ignore
  }
}
