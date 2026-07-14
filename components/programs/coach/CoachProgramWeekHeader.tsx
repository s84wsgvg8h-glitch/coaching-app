"use client";

import { useState } from "react";
import Link from "next/link";
import { Calendar, ChevronDown, ChevronLeft } from "lucide-react";
import ProgramSearch from "@/components/ProgramSearch";
import CoachProgramWeekStatsModal from "@/components/programs/coach/CoachProgramWeekStatsModal";
import type { ProgramSearchContext } from "@/lib/programSearch";
import type { WeekStatsReport } from "@/lib/programWeek/weekStats";

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
  programSearchContext: ProgramSearchContext;
  planningSplitOpen: boolean;
  onTogglePlanning: () => void;
  backHref: string;
  sbdWeekSummary?: CoachSbdSummaryItem[];
  weekStatsReport?: WeekStatsReport | null;
  editorView?: EditorView;
  onEditorViewChange?: (view: EditorView) => void;
  showEditorViewToggle?: boolean;
  athleteOptions?: CoachProgramAthleteOption[];
  currentAthleteId?: string;
  onAthleteChange?: (athleteId: string) => void;
  athleteSwitching?: boolean;
};

function SbdSummaryPill({
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

function EditorViewToggle({
  editorView,
  onEditorViewChange,
}: {
  editorView: EditorView;
  onEditorViewChange: (view: EditorView) => void;
}) {
  return (
    <div
      className="coach-program-editor-view-toggle"
      role="group"
      aria-label="Editorweergave"
    >
      <button
        type="button"
        className={editorView === "card" ? "is-active" : ""}
        onClick={() => onEditorViewChange("card")}
      >
        Card View
      </button>
      <button
        type="button"
        className={editorView === "raw" ? "is-active" : ""}
        onClick={() => onEditorViewChange("raw")}
      >
        Raw View
      </button>
      <button
        type="button"
        className={editorView === "progression" ? "is-active" : ""}
        onClick={() => onEditorViewChange("progression")}
      >
        Progressie
      </button>
      <button
        type="button"
        className={editorView === "athlete" ? "is-active" : ""}
        onClick={() => onEditorViewChange("athlete")}
      >
        Atleet View
      </button>
    </div>
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
  programSearchContext,
  planningSplitOpen,
  onTogglePlanning,
  backHref,
  sbdWeekSummary = [],
  weekStatsReport = null,
  editorView = "card",
  onEditorViewChange,
  showEditorViewToggle = false,
  athleteOptions = [],
  currentAthleteId,
  onAthleteChange,
  athleteSwitching = false,
}: CoachProgramWeekHeaderProps) {
  const [weekStatsOpen, setWeekStatsOpen] = useState(false);

  const openWeekStats = weekStatsReport ? () => setWeekStatsOpen(true) : undefined;
  const showAthleteSwitcher =
    athleteOptions.length > 0 && currentAthleteId && onAthleteChange;

  return (
    <>
      <div className="coach-program-week-header-wrap">
        <div className="coach-program-week-header-bar">
          <div className="coach-program-week-header-leading">
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
            {(showAthleteSwitcher || (showEditorViewToggle && onEditorViewChange)) ? (
              <div className="coach-program-week-header-center">
                {showAthleteSwitcher ? (
                  <AthleteSwitcher
                    options={athleteOptions}
                    currentAthleteId={currentAthleteId}
                    onAthleteChange={onAthleteChange}
                    disabled={athleteSwitching}
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

            <div className="coach-program-week-header-tools">
              <button
                type="button"
                onClick={onTogglePlanning}
                className={`coach-program-action-btn coach-program-action-btn--icon ${
                  planningSplitOpen ? "is-active" : ""
                }`}
                aria-label="Block planning"
                title="Block planning"
              >
                <Calendar className="h-4 w-4" aria-hidden="true" />
              </button>

              <SbdSummaryPill items={sbdWeekSummary} onClick={openWeekStats} />

              <ProgramSearch
                context={programSearchContext}
                variant="coach-dark"
                layout="icon"
              />
            </div>
          </div>
        </div>
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
