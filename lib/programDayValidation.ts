export function getTodayAtMidnight() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

export function isDayPast(dayDate: Date | null, today = getTodayAtMidnight()) {
  if (!dayDate) return false;
  return dayDate.getTime() < today.getTime();
}

export function isEmptyCheckinBw(bw: string | null | undefined) {
  return !bw?.trim();
}

export function isEmptyCheckinRecovery(recovery: number | null | undefined) {
  return recovery === null || recovery === undefined;
}

export function isEmptyCheckinFatigue(fatigue: number | null | undefined) {
  return fatigue === null || fatigue === undefined;
}

export function isEmptySetField(value: string | null | undefined) {
  return !value?.trim();
}

export const OVERDUE_INPUT_CLASS =
  "border-red-400 bg-red-50 focus:border-red-500 focus:ring-red-200";

export const OVERDUE_BUTTON_GROUP_CLASS = "ring-2 ring-red-400 rounded-xl";

export const OVERDUE_CARD_BOX_CLASS =
  "border-red-500 bg-red-50 text-red-700";

export const ATHLETE_PLACEHOLDER_INPUT_CLASS =
  "placeholder:text-gray-300";

export type AthleteSetRow = {
  reps?: string | null;
  weight?: string | null;
  rpe?: string | null;
};

export function hasIncompleteSetField(
  rows: AthleteSetRow[],
  field: "reps" | "weight" | "rpe",
) {
  if (rows.length === 0) return true;
  return rows.some((row) => isEmptySetField(row[field]));
}

export function withOverdueInputClass(baseClass: string, overdue: boolean) {
  return overdue
    ? `${baseClass} ${OVERDUE_INPUT_CLASS}`
    : baseClass;
}

export function withOverdueCardBoxClass(baseClass: string, overdue: boolean) {
  return overdue ? `${baseClass} ${OVERDUE_CARD_BOX_CLASS}` : baseClass;
}
