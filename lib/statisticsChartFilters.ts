import { addDays } from "@/lib/chatBwData";

export type ChartBlockFilterPreset =
  | "all"
  | "current"
  | "last_2"
  | "last_4"
  | "last_8"
  | "last_4_weeks"
  | "last_year"
  | "custom";

export type StatisticsPeriodFilter = {
  preset: ChartBlockFilterPreset;
  fromBlockId?: string;
  toBlockId?: string;
};

export type BlockMeta = {
  blockId: string;
  blockTitle: string;
  startDate: string;
  endDate: string;
};

export const CHART_BLOCK_FILTER_OPTIONS: Array<{
  value: ChartBlockFilterPreset;
  label: string;
}> = [
  { value: "all", label: "Alle blocks" },
  { value: "current", label: "Huidig block" },
  { value: "last_2", label: "Laatste 2 blocks" },
  { value: "last_4", label: "Laatste 4 blocks" },
  { value: "last_8", label: "Laatste 8 blocks" },
  { value: "last_4_weeks", label: "Laatste 4 weken" },
  { value: "last_year", label: "Laatste jaar" },
  { value: "custom", label: "Custom range" },
];

export function getBlockMetas(
  rows: Array<{ blockId: string; blockTitle: string; date: string }>,
): BlockMeta[] {
  const map = new Map<string, BlockMeta>();

  for (const row of rows) {
    const existing = map.get(row.blockId);
    if (!existing) {
      map.set(row.blockId, {
        blockId: row.blockId,
        blockTitle: row.blockTitle,
        startDate: row.date,
        endDate: row.date,
      });
      continue;
    }

    if (row.date < existing.startDate) existing.startDate = row.date;
    if (row.date > existing.endDate) existing.endDate = row.date;
  }

  return Array.from(map.values()).sort((a, b) =>
    a.startDate.localeCompare(b.startDate),
  );
}

function blockCountForPreset(preset: ChartBlockFilterPreset) {
  switch (preset) {
    case "current":
      return 1;
    case "last_2":
      return 2;
    case "last_4":
      return 4;
    case "last_8":
      return 8;
    default:
      return 0;
  }
}

function resolveCustomBlockIds(
  blockMetas: BlockMeta[],
  fromBlockId?: string,
  toBlockId?: string,
) {
  if (!fromBlockId && !toBlockId) return new Set(blockMetas.map((b) => b.blockId));

  const fromIndex = fromBlockId
    ? blockMetas.findIndex((block) => block.blockId === fromBlockId)
    : 0;
  const toIndex = toBlockId
    ? blockMetas.findIndex((block) => block.blockId === toBlockId)
    : blockMetas.length - 1;

  if (fromIndex < 0 || toIndex < 0) {
    return new Set(blockMetas.map((b) => b.blockId));
  }

  const start = Math.min(fromIndex, toIndex);
  const end = Math.max(fromIndex, toIndex);
  return new Set(blockMetas.slice(start, end + 1).map((block) => block.blockId));
}

export function applyChartBlockFilter<T extends { blockId: string; date: string }>(
  rows: T[],
  preset: ChartBlockFilterPreset,
  blockMetas: BlockMeta[],
  custom?: Pick<StatisticsPeriodFilter, "fromBlockId" | "toBlockId">,
): T[] {
  if (preset === "all" || rows.length === 0) {
    return rows;
  }

  if (preset === "custom") {
    const selectedIds = resolveCustomBlockIds(
      blockMetas,
      custom?.fromBlockId,
      custom?.toBlockId,
    );
    return rows.filter((row) => selectedIds.has(row.blockId));
  }

  if (preset === "last_year") {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const cutoff = addDays(today.toISOString().slice(0, 10), -364);
    if (!cutoff) return rows;
    return rows.filter((row) => row.date >= cutoff);
  }

  if (preset === "last_4_weeks") {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const cutoff = addDays(today.toISOString().slice(0, 10), -28);
    if (!cutoff) return rows;
    return rows.filter((row) => row.date >= cutoff);
  }

  const count = blockCountForPreset(preset);
  if (count === 0 || blockMetas.length === 0) {
    return rows;
  }

  const selectedIds = new Set(
    blockMetas.slice(-count).map((block) => block.blockId),
  );

  return rows.filter((row) => selectedIds.has(row.blockId));
}

export function applyStatisticsPeriodFilter<T extends { blockId: string; date: string }>(
  rows: T[],
  period: StatisticsPeriodFilter,
  blockMetas: BlockMeta[],
) {
  return applyChartBlockFilter(rows, period.preset, blockMetas, period);
}
