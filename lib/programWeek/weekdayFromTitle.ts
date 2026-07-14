const WEEKDAY_PATTERN =
  /\b(zondag|maandag|dinsdag|woensdag|donderdag|vrijdag|zaterdag|zo|ma|di|wo|do|vr|za)\b/i;

const WEEKDAY_INDEX: Record<string, number> = {
  zondag: 0,
  zo: 0,
  maandag: 1,
  ma: 1,
  dinsdag: 2,
  di: 2,
  woensdag: 3,
  wo: 3,
  donderdag: 4,
  do: 4,
  vrijdag: 5,
  vr: 5,
  zaterdag: 6,
  za: 6,
};

/** JavaScript weekday index (0 = Sunday … 6 = Saturday), or null if not found. */
export function parseWeekdayFromDayTitle(title: string | null | undefined): number | null {
  const cleanTitle = (title || "").trim().toLowerCase();
  if (!cleanTitle) return null;

  const match = cleanTitle.match(WEEKDAY_PATTERN);
  if (match) {
    return WEEKDAY_INDEX[match[1].toLowerCase()] ?? null;
  }

  if (cleanTitle.includes("maandag")) return 1;
  if (cleanTitle.includes("dinsdag")) return 2;
  if (cleanTitle.includes("woensdag")) return 3;
  if (cleanTitle.includes("donderdag")) return 4;
  if (cleanTitle.includes("vrijdag")) return 5;
  if (cleanTitle.includes("zaterdag")) return 6;
  if (cleanTitle.includes("zondag")) return 0;

  return null;
}
