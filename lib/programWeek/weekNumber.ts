/** Parse "Week 0", "week 2", etc. from a week title. Returns null if no match. */
export function parseWeekNumberFromTitle(title: string): number | null {
  const match = title.trim().match(/^week\s+(-?\d+)$/i);
  if (!match) return null;
  const parsed = Number.parseInt(match[1], 10);
  return Number.isFinite(parsed) ? parsed : null;
}
