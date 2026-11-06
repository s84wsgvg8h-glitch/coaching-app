import { toWeekStartDateInputValue } from "@/lib/dateInput";
import {
  getBlockStartDateObject,
  getBlockWeekCount,
} from "@/lib/programWeek/dateFormatting";
import type { ProgramBlock, ProgramWeek } from "@/lib/programWeek/types";

export type ProgramBlockOverlapMap = Record<string, string[]>;

type BlockWeekRange = {
  id: string;
  title: string;
  startMs: number;
  /** YYYY-MM-DD van elke weekstart in dit block. */
  weekStarts: string[];
};

function getBlockWeekStarts(start: Date, weekCount: number) {
  const weekStarts: string[] = [];
  for (let index = 0; index < weekCount; index += 1) {
    const weekStart = new Date(start);
    weekStart.setDate(start.getDate() + index * 7);
    // Normaliseer naar maandag, zodat dinsdag-startende blocks dezelfde
    // kalenderweek delen als een block dat die week op maandag start.
    weekStarts.push(toWeekStartDateInputValue(weekStart));
  }
  return [...new Set(weekStarts)];
}

function isLaterBlock(a: BlockWeekRange, b: BlockWeekRange) {
  if (a.startMs !== b.startMs) {
    return a.startMs > b.startMs ? a : b;
  }
  return a.id.localeCompare(b.id) > 0 ? a : b;
}

function sharedWeekStarts(a: BlockWeekRange, b: BlockWeekRange) {
  const right = new Set(b.weekStarts);
  return a.weekStarts.filter((weekStart) => right.has(weekStart));
}

/**
 * Per block-id: titels van eerdere blocks waarmee dit block dezelfde kalenderweek deelt.
 * Alleen het latere block krijgt een waarschuwing, en alleen als de huidige week
 * in die overlap zit.
 */
export function getProgramBlockOverlapMap(
  blocks: ProgramBlock[],
  weeksByBlock: Record<string, ProgramWeek[]>,
  todayInput: Date = new Date(),
): ProgramBlockOverlapMap {
  const currentWeekStart = toWeekStartDateInputValue(todayInput);

  const ranges = blocks
    .map((block) => {
      const start = getBlockStartDateObject(block);
      if (!start) return null;
      const weekCount = getBlockWeekCount(weeksByBlock[block.id] || []);
      return {
        id: block.id,
        title: (block.title || "Block").trim() || "Block",
        startMs: start.getTime(),
        weekStarts: getBlockWeekStarts(start, weekCount),
      } satisfies BlockWeekRange;
    })
    .filter((range): range is BlockWeekRange => range !== null);

  const overlapMap: ProgramBlockOverlapMap = {};

  for (let i = 0; i < ranges.length; i += 1) {
    for (let j = i + 1; j < ranges.length; j += 1) {
      const left = ranges[i]!;
      const right = ranges[j]!;
      const shared = sharedWeekStarts(left, right);
      if (shared.length === 0) continue;
      // Alleen waarschuwen als de overlap nu speelt (deze kalenderweek).
      if (!shared.includes(currentWeekStart)) continue;

      const later = isLaterBlock(left, right);
      const earlier = later.id === left.id ? right : left;
      if (!overlapMap[later.id]) overlapMap[later.id] = [];
      if (!overlapMap[later.id]!.includes(earlier.title)) {
        overlapMap[later.id]!.push(earlier.title);
      }
    }
  }

  return overlapMap;
}

export function formatProgramBlockOverlapMessage(overlappingTitles: string[]) {
  const uniqueTitles = [...new Set(overlappingTitles.filter(Boolean))];
  if (uniqueTitles.length === 0) {
    return "Dit block overlapt met een ander block";
  }
  if (uniqueTitles.length === 1) {
    return `Dit block overlapt met ${uniqueTitles[0]}`;
  }
  return `Dit block overlapt met: ${uniqueTitles.join(", ")}`;
}
