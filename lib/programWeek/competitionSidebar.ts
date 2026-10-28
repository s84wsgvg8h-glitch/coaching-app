import { formatCompetitionDateRange } from "@/lib/competitions";
import { weeksOutFromMeet } from "@/lib/meetWeekDisplay";
import {
  formatDutchDateWithFullMonth,
  getBlockEndDateObject,
} from "@/lib/programWeek/dateFormatting";
import type { ProgramBlock, ProgramWeek } from "@/lib/programWeek/types";

export type ProgramSidebarCompetitionSource = {
  id: string;
  naam: string;
  start_date: string;
  end_date: string;
};

export type ProgramSidebarCompetitionEntry = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  dateLabel: string;
  weeksAfterLastBlock: number | null;
  weeksFromToday: number;
  lastBlockEndDate: string | null;
};

function toIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Latest end date across all blocks that have a start date and weeks. */
export function getProgramLastBlockEndDate(
  blocks: ProgramBlock[],
  weeksByBlock: Record<string, ProgramWeek[]>,
): Date | null {
  let latestEnd: Date | null = null;

  for (const block of blocks) {
    if (!block.start_date) continue;

    const blockWeeks = weeksByBlock[block.id] || [];
    if (blockWeeks.length === 0) continue;

    const end = getBlockEndDateObject(block, blockWeeks);
    if (!end) continue;

    if (!latestEnd || end.getTime() > latestEnd.getTime()) {
      latestEnd = end;
    }
  }

  return latestEnd;
}

/** Whole weeks between the last block day (inclusive) and the meet start. */
export function getWeeksBetweenBlockEndAndMeet(
  blockEndDate: Date,
  meetStartIso: string,
): number {
  const blockEnd = new Date(blockEndDate);
  blockEnd.setHours(0, 0, 0, 0);

  const meetStart = new Date(`${meetStartIso}T12:00:00`);
  meetStart.setHours(0, 0, 0, 0);

  const diffDays = Math.floor(
    (meetStart.getTime() - blockEnd.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffDays <= 0) return 0;
  return Math.ceil(diffDays / 7);
}

export function formatWeeksAfterLastBlockLabel(weeks: number | null) {
  if (weeks === null) return "Geen programma-einde bekend";
  if (weeks <= 0) return "Direct na laatste block";
  if (weeks === 1) return "1 week na laatste block";
  return `${weeks} weken na laatste block`;
}

export function formatProgramSidebarCompetitionDate(startDate: string, endDate: string) {
  if (startDate === endDate) {
    const date = new Date(`${startDate}T12:00:00`);
    date.setHours(0, 0, 0, 0);
    return formatDutchDateWithFullMonth(date);
  }

  return formatCompetitionDateRange(startDate, endDate);
}

export function buildProgramSidebarCompetitionEntries(
  blocks: ProgramBlock[],
  weeksByBlock: Record<string, ProgramWeek[]>,
  competitions: ProgramSidebarCompetitionSource[],
): ProgramSidebarCompetitionEntry[] {
  const lastBlockEnd = getProgramLastBlockEndDate(blocks, weeksByBlock);
  const lastBlockEndIso = lastBlockEnd ? toIsoDate(lastBlockEnd) : null;

  return [...competitions]
    .sort((a, b) => a.start_date.localeCompare(b.start_date))
    .map((competition) => {
      const weeksAfterLastBlock = lastBlockEnd
        ? getWeeksBetweenBlockEndAndMeet(lastBlockEnd, competition.start_date)
        : null;

      return {
        id: competition.id,
        name: competition.naam,
        startDate: competition.start_date,
        endDate: competition.end_date,
        dateLabel: formatProgramSidebarCompetitionDate(
          competition.start_date,
          competition.end_date,
        ),
        weeksAfterLastBlock,
        weeksFromToday: weeksOutFromMeet(competition.start_date),
        lastBlockEndDate: lastBlockEndIso,
      };
    });
}
