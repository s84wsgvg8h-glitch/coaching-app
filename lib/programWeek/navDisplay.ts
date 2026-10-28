import type { ProgramBlock, ProgramWeek } from "@/lib/programWeek/types";

export function resolveNavBlocksForDisplay(
  navBlocks: ProgramBlock[],
  currentBlock: ProgramBlock | null,
  _blockId: string,
): ProgramBlock[] {
  if (navBlocks.length > 0) return navBlocks;
  if (currentBlock) return [currentBlock];
  return [];
}

export function resolveBlockWeeksForDisplay(
  weeksByBlock: Record<string, ProgramWeek[]>,
  blockId: string,
  week: ProgramWeek | null,
  weekId?: string,
): ProgramWeek[] {
  const fromNav = weeksByBlock[blockId] || [];
  if (fromNav.length > 0) return fromNav;

  if (!week) return [];

  if (week.program_block_id === blockId) return [week];
  if (weekId && week.id === weekId) return [week];

  return [];
}
