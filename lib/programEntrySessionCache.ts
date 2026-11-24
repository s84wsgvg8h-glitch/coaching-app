const PROGRAM_HREF_KEY = "lc:athlete-program-href";

function localCalendarDay(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function cacheAthleteProgramHref(href: string) {
  if (typeof window === "undefined" || !href || href === "/programs") return;

  try {
    sessionStorage.setItem(
      PROGRAM_HREF_KEY,
      JSON.stringify({ href, day: localCalendarDay() }),
    );
  } catch {
    // ignore quota / private mode
  }
}

export function readAthleteProgramHrefSession(): string | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = sessionStorage.getItem(PROGRAM_HREF_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as { href?: unknown; day?: unknown };
    if (
      parsed?.day === localCalendarDay() &&
      typeof parsed.href === "string" &&
      parsed.href !== "/programs"
    ) {
      return parsed.href;
    }
  } catch {
    // Legacy plain-string values are from an older build and can point at yesterday's week.
  }

  try {
    sessionStorage.removeItem(PROGRAM_HREF_KEY);
  } catch {
    // ignore
  }

  return null;
}

export function readAthleteProgramWeekIdSession() {
  const href = readAthleteProgramHrefSession();
  if (!href) return null;

  try {
    const url = new URL(href, "https://limitless.local");
    const match = url.pathname.match(/\/programs\/[^/]+\/weeks\/([^/]+)/);
    return match?.[1] ?? null;
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
