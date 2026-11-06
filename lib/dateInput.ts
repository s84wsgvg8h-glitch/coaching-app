/** YYYY-MM-DD in local time (geschikt voor `<input type="date">`). */
export function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Maandag van de kalenderweek (NL) waarin `date` valt. */
export function toWeekStartDateInputValue(date: Date = new Date()) {
  const result = new Date(date);
  result.setHours(12, 0, 0, 0);
  const day = result.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  result.setDate(result.getDate() + mondayOffset);
  return toDateInputValue(result);
}
