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

const DUTCH_MONTHS_SHORT = [
  "jan",
  "feb",
  "mrt",
  "apr",
  "mei",
  "jun",
  "jul",
  "aug",
  "sep",
  "okt",
  "nov",
  "dec",
];

export function formatDutchDateWithFullMonth(date: Date) {
  const day = date.getDate();
  const month = DUTCH_MONTHS[date.getMonth()];
  const year = String(date.getFullYear()).slice(-2);
  return `${day} ${month} '${year}`;
}

export function formatDutchDateWithShortMonth(date: Date) {
  const day = date.getDate();
  const month = DUTCH_MONTHS_SHORT[date.getMonth()];
  const year = String(date.getFullYear()).slice(-2);
  return `${day} ${month} '${year}`;
}

export function formatShortDutchDate(date: Date) {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}-${month}`;
}

/** Display format for day headers, e.g. 13-08-26 */
export function formatCompactDutchDate(date: Date) {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear()).slice(-2);
  return `${day}-${month}-${year}`;
}

/** Parse DD-MM-YY or DD-MM-YYYY into YYYY-MM-DD for storage. */
export function parseCompactDutchDate(value: string): string | null {
  const trimmed = value.trim();
  const match = trimmed.match(/^(\d{1,2})-(\d{1,2})-(\d{2}|\d{4})$/);
  if (!match) return null;

  const day = Number.parseInt(match[1], 10);
  const month = Number.parseInt(match[2], 10);
  let year = Number.parseInt(match[3], 10);
  if (match[3].length === 2) {
    year += year >= 70 ? 1900 : 2000;
  }

  if (
    !Number.isFinite(day) ||
    !Number.isFinite(month) ||
    !Number.isFinite(year) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return null;
  }

  const parsed = new Date(year, month - 1, day, 12, 0, 0, 0);
  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null;
  }

  const isoMonth = String(month).padStart(2, "0");
  const isoDay = String(day).padStart(2, "0");
  return `${year}-${isoMonth}-${isoDay}`;
}

export function formatDate(date: string | null) {
  if (!date) return "Geen startdatum";
  const parsed = new Date(`${date}T12:00:00`);
  parsed.setHours(0, 0, 0, 0);
  return formatDutchDateWithShortMonth(parsed);
}

export function getBlockStartDateObject(block: ProgramBlock) {
  if (!block.start_date) return null;
  const date = new Date(`${block.start_date}T12:00:00`);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function sortBlockWeeks(blockWeeks: ProgramWeek[]): ProgramWeek[] {
  return [...blockWeeks].sort((a, b) => {
    if (a.week_number !== b.week_number) {
      return a.week_number - b.week_number;
    }
    return a.id.localeCompare(b.id);
  });
}

/** 1-based position of a week within its block (for date math). */
export function getWeekIndexInBlock(
  week: ProgramWeek,
  blockWeeks?: ProgramWeek[] | null,
): number {
  if (!blockWeeks?.length) {
    return Math.max(1, week.week_number);
  }

  const sorted = sortBlockWeeks(blockWeeks);
  const index = sorted.findIndex((item) => item.id === week.id);
  if (index >= 0) {
    return index + 1;
  }

  return Math.max(1, week.week_number);
}

export function getBlockWeekCount(blockWeeks: ProgramWeek[]) {
  if (blockWeeks.length === 0) return 1;
  return blockWeeks.length;
}

export function getBlockEndDateObject(block: ProgramBlock, blockWeeks: ProgramWeek[]) {
  const start = getBlockStartDateObject(block);
  if (!start) return null;
  const weekCount = getBlockWeekCount(blockWeeks);
  const end = new Date(start);
  end.setDate(end.getDate() + weekCount * 7 - 1);
  return end;
}

/** Start date for a duplicated block: source start + one week per week in the block. */
export function getDuplicatedBlockStartDateObject(
  block: ProgramBlock,
  blockWeeks: ProgramWeek[],
) {
  const start = getBlockStartDateObject(block);
  if (!start) return null;
  const weekCount = getBlockWeekCount(blockWeeks);
  const nextStart = new Date(start);
  nextStart.setDate(nextStart.getDate() + weekCount * 7);
  return nextStart;
}

export function getWeekStartDateObject(
  block: ProgramBlock,
  programWeek: ProgramWeek,
  blockWeeks?: ProgramWeek[] | null,
) {
  const start = getBlockStartDateObject(block);
  if (!start) return null;
  const weekIndex = getWeekIndexInBlock(programWeek, blockWeeks);
  const weekStart = new Date(start);
  weekStart.setDate(weekStart.getDate() + (weekIndex - 1) * 7);
  weekStart.setHours(0, 0, 0, 0);
  return weekStart;
}

function getDateForWeekdayInProgramWeek(
  currentBlock: ProgramBlock | null,
  week: ProgramWeek | null,
  weekdayJs: number,
  blockWeeks?: ProgramWeek[] | null,
) {
  if (!currentBlock || !week) return null;

  const weekStart = getWeekStartDateObject(currentBlock, week, blockWeeks);
  if (!weekStart) return null;

  for (let offset = 0; offset < 7; offset += 1) {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + offset);
    if (date.getDay() === weekdayJs) {
      return date;
    }
  }

  return null;
}

function resolveProgramDayDate(
  currentBlock: ProgramBlock | null,
  week: ProgramWeek | null,
  day: ProgramDay,
  previousDate: Date | null,
  blockWeeks?: ProgramWeek[] | null,
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
      blockWeeks,
    );
    if (dateFromTitle) {
      dateFromTitle.setHours(0, 0, 0, 0);
      return dateFromTitle;
    }
  }

  const fromDayNumber = getDayDateObject(
    currentBlock,
    week,
    day.day_number,
    blockWeeks,
  );
  if (fromDayNumber) {
    fromDayNumber.setHours(0, 0, 0, 0);
    return fromDayNumber;
  }

  if (day.scheduled_date) {
    const date = new Date(`${day.scheduled_date}T12:00:00`);
    date.setHours(0, 0, 0, 0);
    return date;
  }

  return null;
}

/** Resolve dates for all days in a week, counting forward through the day order. */
export function buildProgramWeekDayDates(
  currentBlock: ProgramBlock | null,
  week: ProgramWeek | null,
  days: ProgramDay[],
  blockWeeks?: ProgramWeek[] | null,
): Map<string, Date> {
  const sorted = [...days].sort((a, b) => a.day_number - b.day_number);
  const result = new Map<string, Date>();
  let previousDate: Date | null = null;

  for (const day of sorted) {
    const date = resolveProgramDayDate(
      currentBlock,
      week,
      day,
      previousDate,
      blockWeeks,
    );
    if (!date) continue;
    result.set(day.id, date);
    previousDate = date;
  }

  return result;
}

export function getWeekEndDateObject(
  block: ProgramBlock,
  programWeek: ProgramWeek,
  blockWeeks?: ProgramWeek[] | null,
) {
  const weekStart = getWeekStartDateObject(block, programWeek, blockWeeks);
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
  blockWeeks?: ProgramWeek[] | null,
) {
  if (!currentBlock?.start_date || !week) return null;
  const date = new Date(`${currentBlock.start_date}T12:00:00`);
  date.setHours(0, 0, 0, 0);
  const weekIndex = getWeekIndexInBlock(week, blockWeeks);
  date.setDate(date.getDate() + (weekIndex - 1) * 7 + (dayNumber - 1));
  return date;
}

export function getDayDateLabel(
  currentBlock: ProgramBlock | null,
  week: ProgramWeek | null,
  dayNumber: number,
  blockWeeks?: ProgramWeek[] | null,
) {
  const date = getDayDateObject(currentBlock, week, dayNumber, blockWeeks);
  if (!date) return "Geen datum";
  return formatDutchDateWithFullMonth(date);
}

export function getDayDateForProgramDay(
  currentBlock: ProgramBlock | null,
  week: ProgramWeek | null,
  day: ProgramDay,
  weekDays?: ProgramDay[],
  blockWeeks?: ProgramWeek[] | null,
) {
  if (weekDays && weekDays.length > 0) {
    const dates = buildProgramWeekDayDates(
      currentBlock,
      week,
      weekDays,
      blockWeeks,
    );
    return dates.get(day.id) ?? null;
  }

  return resolveProgramDayDate(currentBlock, week, day, null, blockWeeks);
}

export function getDayDateLabelForProgramDay(
  currentBlock: ProgramBlock | null,
  week: ProgramWeek | null,
  day: ProgramDay,
  weekDays?: ProgramDay[],
  blockWeeks?: ProgramWeek[] | null,
) {
  const date = getDayDateForProgramDay(
    currentBlock,
    week,
    day,
    weekDays,
    blockWeeks,
  );
  if (!date) return "Geen datum";
  return formatCompactDutchDate(date);
}

export function getDayDateInputValue(
  currentBlock: ProgramBlock | null,
  week: ProgramWeek | null,
  day: ProgramDay,
  weekDays?: ProgramDay[],
  blockWeeks?: ProgramWeek[] | null,
) {
  const date = getDayDateForProgramDay(
    currentBlock,
    week,
    day,
    weekDays,
    blockWeeks,
  );
  if (!date) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const dayOfMonth = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${dayOfMonth}`;
}
