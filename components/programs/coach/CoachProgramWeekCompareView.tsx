"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Columns2, ExternalLink, X } from "lucide-react";
import CoachProgramWeekMiniPreview from "@/components/programs/coach/CoachProgramWeekMiniPreview";
import { useProgramWeekCompareSnapshot } from "@/hooks/useProgramWeekCompareSnapshot";
import type {
  ProgramBlock,
  ProgramDay,
  ProgramExercise,
  ProgramWeek,
} from "@/lib/programWeek/types";

type CoachProgramWeekCompareViewProps = {
  currentBlockId: string;
  currentWeekId: string;
  currentBlock: ProgramBlock | null;
  currentWeek: ProgramWeek | null;
  currentDays: ProgramDay[];
  currentExercisesByDay: Record<string, ProgramExercise[]>;
  navBlocks: ProgramBlock[];
  weeksByBlock: Record<string, ProgramWeek[]>;
  userId: string;
  role: string;
  onOpenWeek?: (blockId: string, weekId: string) => void;
  className?: string;
};

export default function CoachProgramWeekCompareView({
  currentBlockId,
  currentWeekId,
  currentBlock,
  currentWeek,
  currentDays,
  currentExercisesByDay,
  navBlocks,
  weeksByBlock,
  userId,
  role,
  onOpenWeek,
  className = "",
}: CoachProgramWeekCompareViewProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [selectedBlockId, setSelectedBlockId] = useState("");
  const [selectedWeekId, setSelectedWeekId] = useState("");

  const blockOptions = useMemo(
    () =>
      [...navBlocks].sort((left, right) =>
        (left.title || "").localeCompare(right.title || "", "nl"),
      ),
    [navBlocks],
  );

  const weekOptions = useMemo(() => {
    if (!selectedBlockId) return [];
    return [...(weeksByBlock[selectedBlockId] || [])].sort(
      (left, right) => left.week_number - right.week_number,
    );
  }, [selectedBlockId, weeksByBlock]);

  const selectedBlock = useMemo(
    () => blockOptions.find((block) => block.id === selectedBlockId) ?? null,
    [blockOptions, selectedBlockId],
  );

  const selectedWeek = useMemo(
    () => weekOptions.find((week) => week.id === selectedWeekId) ?? null,
    [weekOptions, selectedWeekId],
  );

  const isCurrentSelection =
    selectedBlockId === currentBlockId && selectedWeekId === currentWeekId;

  const compareTarget =
    selectedBlockId && selectedWeekId
      ? { blockId: selectedBlockId, weekId: selectedWeekId }
      : null;

  const { data, loading, error } = useProgramWeekCompareSnapshot(compareTarget, {
    userId,
    role,
    enabled: open && Boolean(compareTarget) && !isCurrentSelection,
  });

  const previewBlock = isCurrentSelection ? currentBlock : data?.block ?? null;
  const previewWeek = isCurrentSelection ? currentWeek : data?.week ?? null;
  const previewDays = isCurrentSelection ? currentDays : data?.days ?? [];
  const previewExercisesByDay = isCurrentSelection
    ? currentExercisesByDay
    : data?.exercisesByDay ?? {};
  const previewBlockWeeks = selectedBlockId
    ? weeksByBlock[selectedBlockId] || []
    : [];

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent | TouchEvent) {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (rootRef.current?.contains(target)) return;
      setOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, [open]);

  useEffect(() => {
    if (!open || selectedBlockId || blockOptions.length === 0) return;
    const fallbackBlock =
      blockOptions.find((block) => block.id !== currentBlockId) ??
      blockOptions[0];
    if (fallbackBlock) {
      setSelectedBlockId(fallbackBlock.id);
    }
  }, [blockOptions, currentBlockId, open, selectedBlockId]);

  useEffect(() => {
    if (!selectedBlockId) {
      setSelectedWeekId("");
      return;
    }

    const weeks = weeksByBlock[selectedBlockId] || [];
    if (weeks.length === 0) {
      setSelectedWeekId("");
      return;
    }

    if (!weeks.some((week) => week.id === selectedWeekId)) {
      const fallbackWeek =
        selectedBlockId === currentBlockId
          ? weeks.find((week) => week.id !== currentWeekId) ?? weeks[0]
          : weeks[0];
      setSelectedWeekId(fallbackWeek?.id ?? "");
    }
  }, [
    currentBlockId,
    currentWeekId,
    selectedBlockId,
    selectedWeekId,
    weeksByBlock,
  ]);

  const previewTitle =
    selectedBlock && selectedWeek
      ? `${selectedBlock.title || "Block"} / ${selectedWeek.title || "Week"}`
      : "Selecteer een week";

  const compareDayCount = Math.max(previewDays.length, 1);
  const comparePanelStyle = {
    ["--compare-day-count" as string]: String(compareDayCount),
  } as CSSProperties;

  return (
    <div
      ref={rootRef}
      className={`coach-program-compare-root ${className}`.trim()}
    >
      <button
        type="button"
        className={`coach-program-compare-trigger${open ? " is-active" : ""}`}
        aria-expanded={open}
        aria-controls="coach-program-compare-panel"
        onClick={() => setOpen((value) => !value)}
      >
        <Columns2 className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="coach-program-compare-trigger-label">Compare</span>
      </button>

      {open ? (
        <div
          id="coach-program-compare-panel"
          className="coach-program-compare-panel"
          role="dialog"
          aria-label="Week vergelijken"
          style={comparePanelStyle}
        >
          <div className="coach-program-compare-panel-header">
            <div className="min-w-0 flex-1">
              <p className="coach-program-compare-panel-kicker">Compare view</p>
              <p className="coach-program-compare-panel-title">{previewTitle}</p>
            </div>
            <button
              type="button"
              className="coach-program-compare-close"
              aria-label="Compare view sluiten"
              onClick={() => setOpen(false)}
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <div className="coach-program-compare-pickers">
            <label className="coach-program-compare-field">
              <span>Block</span>
              <select
                value={selectedBlockId}
                onChange={(event) => {
                  setSelectedBlockId(event.target.value);
                  setSelectedWeekId("");
                }}
                className="coach-program-compare-select"
              >
                <option value="">Kies block</option>
                {blockOptions.map((block) => (
                  <option key={block.id} value={block.id}>
                    {block.title || "Block"}
                  </option>
                ))}
              </select>
            </label>

            <label className="coach-program-compare-field">
              <span>Week</span>
              <select
                value={selectedWeekId}
                onChange={(event) => setSelectedWeekId(event.target.value)}
                className="coach-program-compare-select"
                disabled={!selectedBlockId || weekOptions.length === 0}
              >
                <option value="">
                  {weekOptions.length === 0 ? "Geen weken" : "Kies week"}
                </option>
                {weekOptions.map((week) => (
                  <option key={week.id} value={week.id}>
                    {week.title || `Week ${week.week_number}`}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="coach-program-compare-preview-wrap">
            {loading ? (
              <div className="coach-program-compare-status">Week laden…</div>
            ) : error ? (
              <div className="coach-program-compare-status coach-program-compare-status--error">
                {error}
              </div>
            ) : selectedWeekId ? (
              <CoachProgramWeekMiniPreview
                block={previewBlock}
                week={previewWeek}
                days={previewDays}
                exercisesByDay={previewExercisesByDay}
                blockWeeks={previewBlockWeeks}
              />
            ) : (
              <div className="coach-program-compare-status">
                Kies een block en week om te vergelijken.
              </div>
            )}
          </div>

          {selectedBlockId && selectedWeekId && onOpenWeek ? (
            <button
              type="button"
              className="coach-program-compare-open-week"
              onClick={() => onOpenWeek(selectedBlockId, selectedWeekId)}
            >
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              Open week
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
