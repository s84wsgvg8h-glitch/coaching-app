import {
  getBlockEndDateObject,
  getBlockStartDateObject,
} from "@/lib/programWeek/dateFormatting";
import type { ProgramBlock, ProgramWeek } from "@/lib/programWeek/types";

export type ProgramBlockOverlapMap = Record<string, string[]>;

type BlockRange = {
  id: string;
  title: string;
  start: Date;
  end: Date;
};

function startOfLocalDay(date: Date = new Date()) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

function rangesOverlap(a: BlockRange, b: BlockRange) {
  return a.start.getTime() <= b.end.getTime() && b.start.getTime() <= a.end.getTime();
}

function isLaterBlock(a: BlockRange, b: BlockRange) {
  if (a.start.getTime() !== b.start.getTime()) {
    return a.start.getTime() > b.start.getTime() ? a : b;
  }
  if (a.end.getTime() !== b.end.getTime()) {
    return a.end.getTime() > b.end.getTime() ? a : b;
  }
  return a.id.localeCompare(b.id) > 0 ? a : b;
}

function isBlockOngoing(range: BlockRange, today: Date) {
  return (
    today.getTime() >= range.start.getTime() &&
    today.getTime() <= range.end.getTime()
  );
}

/**
 * Per block-id: titels van eerdere blocks waarmee dit block overlapt.
 * Alleen het latere block krijgt een waarschuwing, en alleen als dat block nu loopt.
 */
export function getProgramBlockOverlapMap(
  blocks: ProgramBlock[],
  weeksByBlock: Record<string, ProgramWeek[]>,
  todayInput: Date = new Date(),
): ProgramBlockOverlapMap {
  const today = startOfLocalDay(todayInput);

  const ranges = blocks
    .map((block) => {
      const start = getBlockStartDateObject(block);
      const end = getBlockEndDateObject(block, weeksByBlock[block.id] || []);
      if (!start || !end) return null;
      return {
        id: block.id,
        title: (block.title || "Block").trim() || "Block",
        start,
        end,
      } satisfies BlockRange;
    })
    .filter((range): range is BlockRange => range !== null);

  const overlapMap: ProgramBlockOverlapMap = {};

  for (let i = 0; i < ranges.length; i += 1) {
    for (let j = i + 1; j < ranges.length; j += 1) {
      const left = ranges[i]!;
      const right = ranges[j]!;
      if (!rangesOverlap(left, right)) continue;

      const later = isLaterBlock(left, right);
      if (!isBlockOngoing(later, today)) continue;

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
