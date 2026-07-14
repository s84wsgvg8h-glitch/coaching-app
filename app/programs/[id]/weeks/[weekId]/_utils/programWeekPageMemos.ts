import { buildWeekStatsReport } from "@/lib/programWeek/weekStats";
import type { ProgramMacrocycle } from "@/lib/programMacrocycles";
import type { ProgramSearchContext } from "@/lib/programSearch";
import type {
  ProgramBlock,
  ProgramDay,
  ProgramExercise,
  ProgramWeek,
} from "@/lib/programWeek/types";

type DateHelpers = {
  getDayDate: (day: ProgramDay | number) => string;
  getBlockStartDateObject: (block: ProgramBlock) => Date | null;
  getBlockEndDateObject: (block: ProgramBlock, weeks: ProgramWeek[]) => Date | null;
  getWeekStartDateObject: (block: ProgramBlock, weekItem: ProgramWeek) => Date | null;
  getWeekEndDateObject: (block: ProgramBlock, weekItem: ProgramWeek) => Date | null;
  formatDateRangeLabel: (start: Date | null, end: Date | null) => string;
};

export function buildProgramWeekStatsReport(
  days: ProgramDay[],
  exercisesByDay: Record<string, ProgramExercise[]>,
  getDayDate: DateHelpers["getDayDate"],
) {
  return buildWeekStatsReport(days, exercisesByDay, (day) => getDayDate(day));
}

export function buildProgramSearchContext(input: {
  athleteId: string | null;
  currentBlock: ProgramBlock | null;
  week: ProgramWeek | null;
  days: ProgramDay[];
  exercisesByDay: Record<string, ProgramExercise[]>;
  weeksByBlock: Record<string, ProgramWeek[]>;
}): ProgramSearchContext {
  const { athleteId, currentBlock, week, days, exercisesByDay, weeksByBlock } =
    input;
  const blockWeeks = currentBlock ? weeksByBlock[currentBlock.id] || [] : [];

  const exercises = days.flatMap((day) =>
    (exercisesByDay[day.id] || []).map((exercise) => ({
      id: exercise.id,
      name: exercise.name,
      dayTitle: day.title,
      weekTitle: week?.title || "Week",
    })),
  );

  const athleteProfileId = athleteId || currentBlock?.athlete_id || undefined;

  return {
    athleteId: athleteProfileId,
    block: currentBlock
      ? { id: currentBlock.id, title: currentBlock.title }
      : undefined,
    week: week
      ? {
          id: week.id,
          title: week.title,
          weekNumber: week.week_number,
        }
      : undefined,
    weeks: blockWeeks.map((item) => ({
      id: item.id,
      title: item.title,
      weekNumber: item.week_number,
    })),
    exercises,
  };
}

export function buildAthleteSidebarBlocks(input: {
  role: string;
  blockId: string;
  weekId: string;
  navMacrocycles: ProgramMacrocycle[];
  navBlocks: ProgramBlock[];
  weeksByBlock: Record<string, ProgramWeek[]>;
  openBlockIds: Record<string, boolean>;
  dateHelpers: DateHelpers;
}) {
  const {
    role,
    blockId,
    weekId,
    navMacrocycles,
    navBlocks,
    weeksByBlock,
    openBlockIds,
    dateHelpers,
  } = input;

  if (role !== "atleet") return [];

  const orderedSidebarBlocks = [
    ...navMacrocycles.flatMap((macrocycle) =>
      navBlocks.filter((block) => block.macrocycle_id === macrocycle.id),
    ),
    ...navBlocks.filter((block) => !block.macrocycle_id),
  ];

  return orderedSidebarBlocks.map((block) => {
    const blockWeeks = weeksByBlock[block.id] || [];
    const blockStart = dateHelpers.getBlockStartDateObject(block);
    const blockEnd = dateHelpers.getBlockEndDateObject(block, blockWeeks);

    return {
      id: block.id,
      title: block.title,
      dateRange: dateHelpers.formatDateRangeLabel(blockStart, blockEnd),
      isActive: block.id === blockId,
      isOpen: openBlockIds[block.id] ?? block.id === blockId,
      weeks: blockWeeks.map((item) => ({
        id: item.id,
        title: item.title,
        dateRange: dateHelpers.formatDateRangeLabel(
          dateHelpers.getWeekStartDateObject(block, item),
          dateHelpers.getWeekEndDateObject(block, item),
        ),
        isActive: item.id === weekId,
      })),
    };
  });
}
