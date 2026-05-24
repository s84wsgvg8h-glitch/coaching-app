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

export function withOverdueInputClass(baseClass: string, overdue: boolean) {
  return overdue ? `${baseClass} ${OVERDUE_INPUT_CLASS}` : baseClass;
}
