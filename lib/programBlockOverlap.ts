import {
  getBlockEndDateObject,
  getBlockStartDateObject,
} from "@/lib/programWeek/dateFormatting";
import type { ProgramBlock, ProgramWeek } from "@/lib/programWeek/types";

export type ProgramBlockOverlapMap = Record<string, string[]>;

function rangesOverlap(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date,
) {
  return aStart.getTime() <= bEnd.getTime() && bStart.getTime() <= aEnd.getTime();
}

/** Per block-id: titels van andere blocks waarvan de week-datums overlappen. */
export function getProgramBlockOverlapMap(
  blocks: ProgramBlock[],
  weeksByBlock: Record<string, ProgramWeek[]>,
): ProgramBlockOverlapMap {
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
      };
    })
    .filter((range): range is NonNullable<typeof range> => range !== null);

  const overlapMap: ProgramBlockOverlapMap = {};

  for (let i = 0; i < ranges.length; i += 1) {
    for (let j = i + 1; j < ranges.length; j += 1) {
      const left = ranges[i]!;
      const right = ranges[j]!;
      if (!rangesOverlap(left.start, left.end, right.start, right.end)) continue;

      if (!overlapMap[left.id]) overlapMap[left.id] = [];
      if (!overlapMap[right.id]) overlapMap[right.id] = [];
      overlapMap[left.id]!.push(right.title);
      overlapMap[right.id]!.push(left.title);
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
