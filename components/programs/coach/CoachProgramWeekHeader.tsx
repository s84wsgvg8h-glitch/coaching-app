"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronLeft } from "lucide-react";
import CoachProgramWeekCompareView from "@/components/programs/coach/CoachProgramWeekCompareView";
import {
  ApplyAllWeeksBadge,
  ApplyAllWeeksButton,
} from "@/components/programs/coach/ApplyAllWeeksControl";
import CoachProgramWeekStatsModal from "@/components/programs/coach/CoachProgramWeekStatsModal";
import type { WeekStatsReport } from "@/lib/programWeek/weekStats";
import type {
  ProgramBlock,
  ProgramDay,
  ProgramExercise,
  ProgramWeek,
} from "@/lib/programWeek/types";

export type CoachSbdSummaryItem = {
  label: string;
  sets: number;
  reps: number;
};

export type EditorView = "card" | "raw" | "athlete" | "progression";

export type CoachProgramAthleteOption = {
  id: string;
  name: string;
};

type CoachProgramWeekHeaderProps = {
  blockTitle: string;
  weekTitle: string;
  backHref: string;
  editorView?: EditorView;
  onEditorViewChange?: (view: EditorView) => void;
  showEditorViewToggle?: boolean;
  athleteOptions?: CoachProgramAthleteOption[];
  currentAthleteId?: string;
  onAthleteChange?: (athleteId: string) => void;
  athleteSwitching?: boolean;
  showCompareView?: boolean;
  compareNavBlocks?: ProgramBlock[];
  compareWeeksByBlock?: Record<string, ProgramWeek[]>;
  compareBlockId?: string;
  compareWeekId?: string;
  compareCurrentBlock?: ProgramBlock | null;
  compareCurrentWeek?: ProgramWeek | null;
  compareCurrentDays?: ProgramDay[];
  compareCurrentExercisesByDay?: Record<string, ProgramExercise[]>;
  onCompareOpenWeek?: (blockId: string, weekId: string) => void;
  userId?: string;
  role?: string;
  applyAllWeeksBlockId?: string;
};

export function SbdSummaryPill({
  items,
  onClick,
}: {
  items: CoachSbdSummaryItem[];
  onClick?: () => void;
}) {
  if (items.length === 0) return null;

  const inlineLabel = items
    .map((item) => `${item.label} ${item.sets}s/${item.reps}r`)
    .join(" · ");

  if (!onClick) {
    return (
      <div className="coach-program-sbd-summary" aria-label="Week volume SQ BP DL">
        <span className="coach-program-sbd-summary-inline">{inlineLabel}</span>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="coach-program-sbd-summary coach-program-sbd-summary--clickable"
      aria-label="Weekstatistieken bekijken"
      title="Weekstatistieken"
    >
      <span className="coach-program-sbd-summary-inline">{inlineLabel}</span>
    </button>
  );
}

const EDITOR_VIEW_OPTIONS: {
  value: EditorView;
  label: string;
  shortLabel: string;
}[] = [
  { value: "card", label: "Card View", shortLabel: "Card" },
  { value: "raw", label: "Raw View", shortLabel: "Raw" },
  { value: "progression", label: "Progressie", shortLabel: "Prog" },
  { value: "athlete", label: "Atleet View", shortLabel: "Atleet" },
];

function EditorViewToggle({
  editorView,
  onEditorViewChange,
}: {
  editorView: EditorView;
  onEditorViewChange: (view: EditorView) => void;
}) {
  return (
    <div
      className="coach-program-editor-view-toggle hidden lg:inline-flex"
      role="group"
      aria-label="Editorweergave"
    >
      {EDITOR_VIEW_OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          className={editorView === option.value ? "is-active" : ""}
          onClick={() => onEditorViewChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function EditorViewSelect({
  editorView,
  onEditorViewChange,
  className = "",
}: {
  editorView: EditorView;
  onEditorViewChange: (view: EditorView) => void;
  className?: string;
}) {
  return (
    <div className={`coach-program-editor-view-select ${className}`.trim()}>
      <select
        value={editorView}
        onChange={(event) =>
          onEditorViewChange(event.target.value as EditorView)
        }
        className="coach-program-editor-view-select-input"
        aria-label="Editorweergave"
      >
        {EDITOR_VIEW_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.shortLabel}
          </option>
        ))}
      </select>
      <ChevronDown
        className="coach-program-editor-view-select-chevron"
        aria-hidden="true"
      />
    </div>
  );
}

export function CoachProgramEditorViewSelect(props: {
  editorView: EditorView;
  onEditorViewChange: (view: EditorView) => void;
  className?: string;
}) {
  return <EditorViewSelect {...props} />;
}

export function CoachProgramWeekStatsFooter({
  weekTitle,
  sbdWeekSummary = [],
  weekStatsReport = null,
}: {
  weekTitle: string;
  sbdWeekSummary?: CoachSbdSummaryItem[];
  weekStatsReport?: WeekStatsReport | null;
}) {
  const [weekStatsOpen, setWeekStatsOpen] = useState(false);

  if (sbdWeekSummary.length === 0) return null;

  const openWeekStats = weekStatsReport ? () => setWeekStatsOpen(true) : undefined;

  return (
    <>
      <div className="coach-program-week-stats-footer">
        <SbdSummaryPill items={sbdWeekSummary} onClick={openWeekStats} />
      </div>
      <CoachProgramWeekStatsModal
        open={weekStatsOpen}
        weekTitle={weekTitle}
        report={weekStatsReport}
        onClose={() => setWeekStatsOpen(false)}
      />
    </>
  );
}

function AthleteSwitcher({
  options,
  currentAthleteId,
  onAthleteChange,
  disabled,
}: {
  options: CoachProgramAthleteOption[];
  currentAthleteId?: string;
  onAthleteChange: (athleteId: string) => void;
  disabled?: boolean;
}) {
  if (options.length === 0) return null;

  const selectedId = currentAthleteId || options[0]?.id || "";
  const selectedName =
    options.find((option) => option.id === selectedId)?.name ||
    options[0]?.name ||
    "Atleet";

  return (
    <div className="coach-program-athlete-switcher">
      <div className="coach-program-athlete-switcher-face" aria-hidden="true">
        <span className="coach-program-athlete-switcher-label">{selectedName}</span>
        <ChevronDown className="coach-program-athlete-switcher-chevron" />
      </div>
      <select
        value={selectedId}
        disabled={disabled}
        onChange={(event) => onAthleteChange(event.target.value)}
        className="coach-program-athlete-switcher-select"
        aria-label="Atleet wisselen"
      >
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name}
          </option>
        ))}
      </select>
    </div>
  );
}

export default function CoachProgramWeekHeader({
  blockTitle,
  weekTitle,
  backHref,
  editorView = "card",
  onEditorViewChange,
  showEditorViewToggle = false,
  athleteOptions = [],
  currentAthleteId,
  onAthleteChange,
  athleteSwitching = false,
  showCompareView = false,
  compareNavBlocks = [],
  compareWeeksByBlock = {},
  compareBlockId = "",
  compareWeekId = "",
  compareCurrentBlock = null,
  compareCurrentWeek = null,
  compareCurrentDays = [],
  compareCurrentExercisesByDay = {},
  onCompareOpenWeek,
  userId = "",
  role = "",
  applyAllWeeksBlockId = "",
}: CoachProgramWeekHeaderProps) {
  const showAthleteSwitcher = athleteOptions.length > 0 && onAthleteChange;
  const showCompare =
    showCompareView &&
    userId &&
    compareNavBlocks.length > 0 &&
    compareBlockId &&
    compareWeekId;

  return (
    <>
    {applyAllWeeksBlockId ? (
      <div className="mb-2 lg:hidden">
        <ApplyAllWeeksButton blockId={applyAllWeeksBlockId} fullWidth />
      </div>
    ) : null}
    <div className="coach-program-week-header-wrap hidden lg:block">
        <div className="coach-program-week-header-bar">
          <div className="coach-program-week-header-leading hidden lg:flex">
            <Link
              href={backHref}
              className="coach-program-back-btn coach-program-back-btn--icon shrink-0"
              aria-label="Terug"
              title="Terug"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </Link>

            <h1 className="coach-program-breadcrumb min-w-0">
              <span className="coach-program-breadcrumb-block">{blockTitle}</span>
              <span className="coach-program-breadcrumb-sep">/</span>
              <span className="coach-program-breadcrumb-week">{weekTitle}</span>
            </h1>
          </div>

          <div className="coach-program-week-header-trailing">
            {(showAthleteSwitcher ||
              showCompare ||
              applyAllWeeksBlockId ||
              (showEditorViewToggle && onEditorViewChange)) ? (
              <div className="coach-program-week-header-center">
                {showAthleteSwitcher ? (
                  <AthleteSwitcher
                    options={athleteOptions}
                    currentAthleteId={currentAthleteId}
                    onAthleteChange={onAthleteChange}
                    disabled={athleteSwitching}
                  />
                ) : null}

                {applyAllWeeksBlockId ? (
                  <ApplyAllWeeksButton blockId={applyAllWeeksBlockId} />
                ) : null}

                {showCompare ? (
                  <CoachProgramWeekCompareView
                    currentBlockId={compareBlockId}
                    currentWeekId={compareWeekId}
                    currentBlock={compareCurrentBlock}
                    currentWeek={compareCurrentWeek}
                    currentDays={compareCurrentDays}
                    currentExercisesByDay={compareCurrentExercisesByDay}
                    navBlocks={compareNavBlocks}
                    weeksByBlock={compareWeeksByBlock}
                    userId={userId}
                    role={role}
                    onOpenWeek={onCompareOpenWeek}
                  />
                ) : null}

                {showEditorViewToggle && onEditorViewChange ? (
                  <EditorViewToggle
                    editorView={editorView}
                    onEditorViewChange={onEditorViewChange}
                  />
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    {applyAllWeeksBlockId ? (
      <ApplyAllWeeksBadge blockId={applyAllWeeksBlockId} />
    ) : null}
    </>
  );
}
