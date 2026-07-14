import {
  getIntensityInputDisplay,
  getLoadKgInputDisplay,
} from "@/lib/programWeek/intensityInput";
import type { ProgramExercise } from "@/lib/programWeek/types";
import type { RawColKey } from "@/lib/programWeek/rawClipboard";

export type RawCellRef = {
  dayId: string;
  rowIndex: number;
  colKey: RawColKey;
};

export function isPrintableKey(event: KeyboardEvent) {
  if (event.ctrlKey || event.metaKey || event.altKey) return false;
  if (event.key.length !== 1) return false;
  return !/[\x00-\x1F]/.test(event.key);
}

/** Alt/Option + 1–9 week index (0-based). Uses `event.code` for Mac Option+digit. */
export function getAltDigitWeekIndex(event: KeyboardEvent): number | null {
  if (!event.altKey || event.ctrlKey || event.metaKey) return null;

  const digitCode = event.code.match(/^Digit([1-9])$/);
  if (digitCode) return Number(digitCode[1]) - 1;

  const numpadCode = event.code.match(/^Numpad([1-9])$/);
  if (numpadCode) return Number(numpadCode[1]) - 1;

  if (event.key.length === 1 && event.key >= "1" && event.key <= "9") {
    return Number(event.key) - 1;
  }

  return null;
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

export function focusRawCellInput(
  container: HTMLElement | null,
  ref: RawCellRef,
  options?: { preserve?: boolean; placeAtEnd?: boolean },
) {
  if (!container) return;
  const cell = container.querySelector(
    `[data-cell="${ref.dayId}:${ref.rowIndex}:${ref.colKey}"]`,
  );
  const input = cell?.querySelector(
    "input, textarea, select",
  ) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null;
  if (!input) return;

  input.focus();
  if (input instanceof HTMLSelectElement) return;

  const len = input.value.length;
  if (options?.preserve) {
    const pos = options.placeAtEnd ? len : len;
    input.setSelectionRange(pos, pos);
  } else {
    input.setSelectionRange(len, len);
  }
}
