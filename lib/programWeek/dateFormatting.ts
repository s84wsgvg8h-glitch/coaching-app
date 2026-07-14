import { parseWeekdayFromDayTitle } from "@/lib/programWeek/weekdayFromTitle";
import type { ProgramBlock, ProgramDay, ProgramWeek } from "@/lib/programWeek/types";

const DUTCH_MONTHS = [
  "januari",
  "februari",
  "maart",
  "april",
  "mei",
  "juni",
  "juli",
  "augustus",
  "september",
  "oktober",
  "november",
  "december",
];

export function formatDutchDateWithFullMonth(date: Date) {
  const day = date.getDate();
  const month = DUTCH_MONTHS[date.getMonth()];
  const year = String(date.getFullYear()).slice(-2);
  return `${day} ${month} '${year}`;
}

export function formatShortDutchDate(date: Date) {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}-${month}`;
}

export function formatDate(date: string | null) {
  if (!date) return "Geen startdatum";
  return formatDutchDateWithFullMonth(new Date(date));
}

export function getBlockStartDateObject(block: ProgramBlock) {
  if (!block.start_date) return null;
  const date = new Date(block.start_date);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function getBlockEndDateObject(block: ProgramBlock, blockWeeks: ProgramWeek[]) {
  const start = getBlockStartDateObject(block);
  if (!start) return null;
  const weekCount = Math.max(blockWeeks.length, 1);
  const end = new Date(start);
  end.setDate(end.getDate() + weekCount * 7 - 1);
  return end;
}

export function getWeekStartDateObject(block: ProgramBlock, programWeek: ProgramWeek) {
  const start = getBlockStartDateObject(block);
  if (!start) return null;
  const weekStart = new Date(start);
  weekStart.setDate(weekStart.getDate() + (programWeek.week_number - 1) * 7);
  return weekStart;
}

function getMondayOfCalendarWeek(date: Date) {
  const monday = new Date(date);
  monday.setHours(0, 0, 0, 0);
  const dayOfWeek = monday.getDay();
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  monday.setDate(monday.getDate() - daysFromMonday);
  return monday;
}

function getDateForWeekdayInProgramWeek(
  currentBlock: ProgramBlock | null,
  week: ProgramWeek | null,
  weekdayJs: number,
) {
  if (!currentBlock || !week) return null;

  const weekAnchor = getWeekStartDateObject(currentBlock, week);
  if (!weekAnchor) return null;

  const monday = getMondayOfCalendarWeek(weekAnchor);
  const daysFromMonday = weekdayJs === 0 ? 6 : weekdayJs - 1;
  const date = new Date(monday);
  date.setDate(date.getDate() + daysFromMonday);
  return date;
}

function resolveProgramDayDate(
  currentBlock: ProgramBlock | null,
  week: ProgramWeek | null,
  day: ProgramDay,
  previousDate: Date | null,
) {
  const weekdayFromTitle = parseWeekdayFromDayTitle(day.title);

  if (weekdayFromTitle !== null && previousDate !== null) {
    const previousWeekday = previousDate.getDay();
    let daysToAdd = (weekdayFromTitle - previousWeekday + 7) % 7;
    if (daysToAdd === 0) daysToAdd = 7;
    const date = new Date(previousDate);
    date.setDate(date.getDate() + daysToAdd);
    date.setHours(0, 0, 0, 0);
    return date;
  }

  if (weekdayFromTitle !== null) {
    const dateFromTitle = getDateForWeekdayInProgramWeek(
      currentBlock,
      week,
      weekdayFromTitle,
    );
    if (dateFromTitle) {
      dateFromTitle.setHours(0, 0, 0, 0);
      return dateFromTitle;
    }
  }

  if (day.scheduled_date) {
    const date = new Date(`${day.scheduled_date}T12:00:00`);
    date.setHours(0, 0, 0, 0);
    return date;
  }

  const date = getDayDateObject(currentBlock, week, day.day_number);
  if (date) date.setHours(0, 0, 0, 0);
  return date;
}

/** Resolve dates for all days in a week, counting forward through the day order. */
export function buildProgramWeekDayDates(
  currentBlock: ProgramBlock | null,
  week: ProgramWeek | null,
  days: ProgramDay[],
): Map<string, Date> {
  const sorted = [...days].sort((a, b) => a.day_number - b.day_number);
  const result = new Map<string, Date>();
  let previousDate: Date | null = null;

  for (const day of sorted) {
    const date = resolveProgramDayDate(currentBlock, week, day, previousDate);
    if (!date) continue;
    result.set(day.id, date);
    previousDate = date;
  }

  return result;
}

export function getWeekEndDateObject(block: ProgramBlock, programWeek: ProgramWeek) {
  const weekStart = getWeekStartDateObject(block, programWeek);
  if (!weekStart) return null;
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  return weekEnd;
}

export function formatDateRangeLabel(
  start: Date | null,
  end: Date | null,
  fallback = "Geen datum",
) {
  if (!start || !end) return fallback;
  return `${formatShortDutchDate(start)} - ${formatShortDutchDate(end)}`;
}

export function getDayDateObject(
  currentBlock: ProgramBlock | null,
  week: ProgramWeek | null,
  dayNumber: number,
) {
  if (!currentBlock?.start_date || week?.week_number == null) return null;
  const date = new Date(currentBlock.start_date);
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + (week.week_number - 1) * 7 + (dayNumber - 1));
  return date;
}

export function getDayDateLabel(
  currentBlock: ProgramBlock | null,
  week: ProgramWeek | null,
  dayNumber: number,
) {
  const date = getDayDateObject(currentBlock, week, dayNumber);
  if (!date) return "Geen datum";
  return formatDutchDateWithFullMonth(date);
}

export function getDayDateForProgramDay(
  currentBlock: ProgramBlock | null,
  week: ProgramWeek | null,
  day: ProgramDay,
  weekDays?: ProgramDay[],
) {
  if (weekDays && weekDays.length > 0) {
    const dates = buildProgramWeekDayDates(currentBlock, week, weekDays);
    return dates.get(day.id) ?? null;
  }

  return resolveProgramDayDate(currentBlock, week, day, null);
}

export function getDayDateLabelForProgramDay(
  currentBlock: ProgramBlock | null,
  week: ProgramWeek | null,
  day: ProgramDay,
  weekDays?: ProgramDay[],
) {
  const date = getDayDateForProgramDay(currentBlock, week, day, weekDays);
  if (!date) return "Geen datum";
  return formatDutchDateWithFullMonth(date);
}

export function getDayDateInputValue(
  currentBlock: ProgramBlock | null,
  week: ProgramWeek | null,
  day: ProgramDay,
  weekDays?: ProgramDay[],
) {
  const date = getDayDateForProgramDay(currentBlock, week, day, weekDays);
  if (!date) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const dayOfMonth = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${dayOfMonth}`;
}
