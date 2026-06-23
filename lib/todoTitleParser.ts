import { dueAtFromPreset, type TodoDuePreset } from "@/components/coach/TodoDueQuickPicker";

export type ParsedTodoInput = {
  title: string;
  duePreset: TodoDuePreset;
  dueAt: string | null;
};

const PHRASE_RULES: Array<{
  pattern: RegExp;
  preset?: TodoDuePreset;
  dayOffset?: number;
}> = [
  { pattern: /\bvandaag\b/i, preset: "today" },
  { pattern: /\bmorgen\b/i, preset: "tomorrow" },
  { pattern: /\bovermorgen\b/i, dayOffset: 2 },
  { pattern: /\bdeze week\b/i, preset: "week" },
  { pattern: /\bover\s*3\s*dagen\b/i, preset: "3days" },
  { pattern: /\bin\s*3\s*dagen\b/i, preset: "3days" },
];

const WEEKDAY_NAMES =
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

const WORD_NUMBERS: Record<string, number> = {
  een: 1,
  twee: 2,
  drie: 3,
  vier: 4,
  vijf: 5,
  zes: 6,
  zeven: 7,
  acht: 8,
};

const MONTHS: Record<string, number> = {
  jan: 0,
  januarie: 0,
  feb: 1,
  februari: 1,
  mrt: 2,
  maart: 2,
  mar: 2,
  apr: 3,
  april: 3,
  mei: 4,
  jun: 5,
  juni: 5,
  jul: 6,
  juli: 6,
  aug: 7,
  augustus: 7,
  sep: 8,
  sept: 8,
  september: 8,
  okt: 9,
  oktober: 9,
  nov: 10,
  november: 10,
  dec: 11,
  december: 11,
};

function endOfDayIso(date: Date) {
  const copy = new Date(date);
  copy.setHours(23, 59, 0, 0);
  return copy.toISOString();
}

function dueAtFromDayOffset(offset: number) {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return endOfDayIso(date);
}

function dueAtFromNextWeekday(weekday: number) {
  const date = new Date();
  const today = date.getDay();
  let daysUntil = (weekday - today + 7) % 7;
  if (daysUntil === 0) daysUntil = 7;
  date.setDate(date.getDate() + daysUntil);
  return endOfDayIso(date);
}

function dueAtFromWeeksAndWeekday(weeks: number, weekday: number) {
  const date = new Date();
  date.setDate(date.getDate() + weeks * 7);
  const currentDay = date.getDay();
  let daysUntil = (weekday - currentDay + 7) % 7;
  if (daysUntil === 0) daysUntil = 7;
  date.setDate(date.getDate() + daysUntil);
  return endOfDayIso(date);
}

function parseWeekCount(raw: string) {
  const normalized = raw.trim().toLowerCase();
  if (/^\d+$/.test(normalized)) return Number(normalized);
  return WORD_NUMBERS[normalized] ?? null;
}

function parseWeekdayPhrase(text: string): {
  dueAt: string | null;
  matched: string | null;
} {
  const weeksMatch = text.match(
    /\bover\s+(?:over\s+)?(\d+|een|twee|drie|vier|vijf|zes|zeven|acht)\s+weken?\s+(zondag|maandag|dinsdag|woensdag|donderdag|vrijdag|zaterdag|zo|ma|di|wo|do|vr|za)\b/i,
  );
  if (weeksMatch) {
    const weeks = parseWeekCount(weeksMatch[1]);
    const weekdayKey = weeksMatch[2].toLowerCase();
    const weekday = WEEKDAY_INDEX[weekdayKey];
    if (weeks !== null && weekday !== undefined) {
      return {
        dueAt: dueAtFromWeeksAndWeekday(weeks, weekday),
        matched: weeksMatch[0],
      };
    }
  }

  const weekdayMatch = text.match(WEEKDAY_NAMES);
  if (weekdayMatch) {
    const weekdayKey = weekdayMatch[1].toLowerCase();
    const weekday = WEEKDAY_INDEX[weekdayKey];
    if (weekday !== undefined) {
      return {
        dueAt: dueAtFromNextWeekday(weekday),
        matched: weekdayMatch[0],
      };
    }
  }

  return { dueAt: null, matched: null };
}

function parseExplicitDate(text: string): string | null {
  const match = text.match(/\b(\d{1,2})\s+([a-z]+)(?:\s+(\d{4}))?\b/i);
  if (!match) return null;

  const day = Number(match[1]);
  const monthKey = match[2].toLowerCase();
  const month = MONTHS[monthKey];
  if (month === undefined || day < 1 || day > 31) return null;

  const year = match[3] ? Number(match[3]) : new Date().getFullYear();
  const date = new Date(year, month, day, 23, 59, 0, 0);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

export function parseTodoInput(raw: string): ParsedTodoInput {
  let text = raw.trim().replace(/\s+/g, " ");
  let duePreset: TodoDuePreset = "";
  let dueAt: string | null = null;

  const weekdayParsed = parseWeekdayPhrase(text);
  if (weekdayParsed.dueAt && weekdayParsed.matched) {
    dueAt = weekdayParsed.dueAt;
    text = text
      .replace(weekdayParsed.matched, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  if (!dueAt) {
    for (const rule of PHRASE_RULES) {
      if (!rule.pattern.test(text)) continue;
      text = text.replace(rule.pattern, " ").replace(/\s+/g, " ").trim();
      if (rule.preset) {
        duePreset = rule.preset;
        dueAt = dueAtFromPreset(rule.preset);
      } else if (rule.dayOffset !== undefined) {
        dueAt = dueAtFromDayOffset(rule.dayOffset);
      }
      break;
    }
  }

  if (!dueAt) {
    const explicit = parseExplicitDate(text);
    if (explicit) {
      dueAt = explicit;
      text = text
        .replace(/\b\d{1,2}\s+[a-z]+(?:\s+\d{4})?\b/i, " ")
        .replace(/\s+/g, " ")
        .trim();
    }
  }

  return {
    title: text,
    duePreset,
    dueAt,
  };
}

export function formatTodoDeadlineLabel(dueAt: string | null | undefined) {
  if (!dueAt) return null;
  const date = new Date(dueAt);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "long",
  });
}
