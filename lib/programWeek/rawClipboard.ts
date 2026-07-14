import {
  applyIntensityInput,
  applyLoadKgInput,
  getIntensityInputDisplay,
  getLoadKgInputDisplay,
} from "@/lib/programWeek/intensityInput";
import type { ProgramDay, ProgramExercise } from "@/lib/programWeek/types";

export type RawColKey =
  | "name"
  | "sets"
  | "reps"
  | "intensity"
  | "load"
  | "priority"
  | "notes";

export type RawCellRef = {
  dayId: string;
  rowIndex: number;
  colKey: RawColKey;
};

export function rawCellKey(ref: RawCellRef) {
  return `${ref.dayId}:${ref.rowIndex}:${ref.colKey}`;
}

export function parseRawCellKey(key: string): RawCellRef | null {
  const parts = key.split(":");
  if (parts.length !== 3) return null;
  const [dayId, rowIndexStr, colKey] = parts;
  const rowIndex = Number(rowIndexStr);
  if (!dayId || !Number.isFinite(rowIndex)) return null;
  return { dayId, rowIndex, colKey: colKey as RawColKey };
}

export function getRawCellDisplayValue(
  exercise: ProgramExercise | null,
  colKey: RawColKey,
): string {
  if (!exercise) return "";
  if (colKey === "name") return exercise.name;
  if (colKey === "sets") return exercise.sets || "";
  if (colKey === "reps") return exercise.reps || "";
  if (colKey === "notes") return exercise.notes || "";
  if (colKey === "priority") return exercise.priority || "";
  if (colKey === "intensity") return getIntensityInputDisplay(exercise);
  if (colKey === "load") return getLoadKgInputDisplay(exercise);
  return "";
}

type SelectionBounds = {
  minDay: number;
  maxDay: number;
  minRow: number;
  maxRow: number;
  minCol: number;
  maxCol: number;
};

export function getRawSelectionBounds(
  selectedCells: Set<string>,
  days: ProgramDay[],
  visibleColKeys: RawColKey[],
): SelectionBounds | null {
  if (selectedCells.size === 0) return null;

  const dayIds = days.map((day) => day.id);
  let minDay = Infinity;
  let maxDay = -Infinity;
  let minRow = Infinity;
  let maxRow = -Infinity;
  let minCol = Infinity;
  let maxCol = -Infinity;

  selectedCells.forEach((key) => {
    const ref = parseRawCellKey(key);
    if (!ref) return;

    const dayIndex = dayIds.indexOf(ref.dayId);
    const colIndex = visibleColKeys.indexOf(ref.colKey);
    if (dayIndex === -1 || colIndex === -1) return;

    minDay = Math.min(minDay, dayIndex);
    maxDay = Math.max(maxDay, dayIndex);
    minRow = Math.min(minRow, ref.rowIndex);
    maxRow = Math.max(maxRow, ref.rowIndex);
    minCol = Math.min(minCol, colIndex);
    maxCol = Math.max(maxCol, colIndex);
  });

  if (!Number.isFinite(minDay)) return null;

  return { minDay, maxDay, minRow, maxRow, minCol, maxCol };
}

export function serializeRawSelectionToTsv(
  selectedCells: Set<string>,
  days: ProgramDay[],
  visibleColKeys: RawColKey[],
  getExerciseAt: (dayId: string, rowIndex: number) => ProgramExercise | null,
  getCellValue?: (
    dayId: string,
    rowIndex: number,
    colKey: RawColKey,
    exercise: ProgramExercise | null,
  ) => string,
): string {
  const bounds = getRawSelectionBounds(selectedCells, days, visibleColKeys);
  if (!bounds) return "";

  const rows: string[] = [];
  for (let row = bounds.minRow; row <= bounds.maxRow; row += 1) {
    const cols: string[] = [];
    for (let dayIndex = bounds.minDay; dayIndex <= bounds.maxDay; dayIndex += 1) {
      const dayId = days[dayIndex]?.id;
      if (!dayId) continue;

      for (let colIndex = bounds.minCol; colIndex <= bounds.maxCol; colIndex += 1) {
        const colKey = visibleColKeys[colIndex];
        const key = rawCellKey({ dayId, rowIndex: row, colKey });
        if (!selectedCells.has(key)) {
          cols.push("");
          continue;
        }
        const exercise = getExerciseAt(dayId, row);
        cols.push(
          getCellValue
            ? getCellValue(dayId, row, colKey, exercise)
            : getRawCellDisplayValue(exercise, colKey),
        );
      }
    }
    rows.push(cols.join("\t"));
  }

  return rows.join("\n");
}

export function parseClipboardGrid(text: string): string[][] {
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = normalized.split("\n");

  while (lines.length > 1 && lines[lines.length - 1] === "") {
    lines.pop();
  }

  return lines.map((line) => line.split("\t"));
}

export type RawExerciseSeed = Partial<
  Pick<
    ProgramExercise,
    "name" | "sets" | "reps" | "load" | "rpe" | "notes" | "priority"
  >
>;

export function buildRawSeedFromRowValues(
  rowValues: Partial<Record<RawColKey, string>>,
): RawExerciseSeed {
  const seed: RawExerciseSeed = {};

  if (rowValues.name !== undefined) {
    seed.name = rowValues.name;
  }
  if (rowValues.sets !== undefined) {
    seed.sets = rowValues.sets;
  }
  if (rowValues.reps !== undefined) {
    seed.reps = rowValues.reps;
  }
  if (rowValues.notes !== undefined) {
    seed.notes = rowValues.notes;
  }
  if (rowValues.priority !== undefined) {
    seed.priority = rowValues.priority.toLowerCase();
  }
  if (rowValues.intensity !== undefined) {
    const parsed = applyIntensityInput({ load: "", rpe: "" }, rowValues.intensity);
    seed.rpe = parsed.rpe || "";
    seed.load = parsed.load || "";
  }
  if (rowValues.load !== undefined) {
    const parsed = applyLoadKgInput({ load: "", rpe: "" }, rowValues.load);
    seed.load = parsed.load || "";
    if (parsed.rpe) seed.rpe = parsed.rpe;
  }

  return seed;
}

export function hasRawClipboardGrid(text: string) {
  if (text.includes("\t")) return true;
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  while (lines.length > 1 && lines[lines.length - 1] === "") {
    lines.pop();
  }
  return lines.length > 1;
}

export type RawPasteTarget = {
  dayOffset: number;
  rowOffset: number;
  rowValues: Partial<Record<RawColKey, string>>;
};

function getColsPerDaySegment(
  valuesLength: number,
  originColIndex: number,
  visibleColKeys: RawColKey[],
): number {
  const maxFromStart = visibleColKeys.length - originColIndex;
  if (maxFromStart <= 0) return 0;
  if (valuesLength <= maxFromStart) return valuesLength;
  if (valuesLength % maxFromStart === 0) return maxFromStart;
  if (originColIndex === 0 && valuesLength % visibleColKeys.length === 0) {
    return visibleColKeys.length;
  }
  return maxFromStart;
}

/** Map clipboard TSV rows onto day/row targets for paste (supports multi-day rows). */
export function buildRawPastePlan(params: {
  grid: string[][];
  originDayIndex: number;
  originRowIndex: number;
  originColIndex: number;
  visibleColKeys: RawColKey[];
  availableDayCount: number;
  maxRows: number;
}): RawPasteTarget[] {
  const {
    grid,
    originDayIndex,
    originRowIndex,
    originColIndex,
    visibleColKeys,
    availableDayCount,
    maxRows,
  } = params;

  const targets: RawPasteTarget[] = [];

  for (let rowOffset = 0; rowOffset < grid.length; rowOffset += 1) {
    const values = grid[rowOffset] || [];
    const rowIndex = originRowIndex + rowOffset;
    if (rowIndex >= maxRows) break;

    const colsPerDay = getColsPerDaySegment(
      values.length,
      originColIndex,
      visibleColKeys,
    );
    if (colsPerDay <= 0) continue;

    let valueIndex = 0;
    let dayOffset = 0;

    while (valueIndex < values.length) {
      const dayIndex = originDayIndex + dayOffset;
      if (dayIndex >= availableDayCount) break;

      const rowValues: Partial<Record<RawColKey, string>> = {};
      for (
        let colOffset = 0;
        colOffset < colsPerDay && valueIndex < values.length;
        colOffset += 1
      ) {
        const colKey = visibleColKeys[originColIndex + colOffset];
        if (!colKey) break;
        rowValues[colKey] = values[valueIndex] ?? "";
        valueIndex += 1;
      }

      if (Object.keys(rowValues).length > 0) {
        targets.push({ dayOffset, rowOffset, rowValues });
      }

      dayOffset += 1;
    }
  }

  return targets;
}
