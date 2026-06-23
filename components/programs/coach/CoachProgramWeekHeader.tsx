"use client";

import { useState } from "react";
import Link from "next/link";
import { Calendar, ChevronLeft } from "lucide-react";
import ProgramSearch from "@/components/ProgramSearch";
import CoachProgramWeekStatsModal from "@/components/programs/coach/CoachProgramWeekStatsModal";
import type { ProgramSearchContext } from "@/lib/programSearch";
import type { WeekStatsReport } from "@/lib/programWeek/weekStats";

export type CoachSbdSummaryItem = {
  label: string;
  sets: number;
  reps: number;
};

export type EditorView = "card" | "raw";

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
};

function SbdSummaryPill({
  items,
  onClick,
}: {
  items: CoachSbdSummaryItem[];
  onClick?: () => void;
}) {
  if (items.length === 0) return null;

  const content = (
    <div className="coach-program-sbd-summary-grid">
      {items.map((item) => (
        <div key={item.label} className="coach-program-sbd-summary-item">
          <p className="coach-program-sbd-summary-label">{item.label}</p>
          <p className="coach-program-sbd-summary-value">
            {item.sets}s / {item.reps}r
          </p>
        </div>
      ))}
    </div>
  );

  if (!onClick) {
    return (
      <div className="coach-program-sbd-summary" aria-label="Week volume SQ BP DL">
        {content}
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
      {content}
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
}: CoachProgramWeekHeaderProps) {
  const [weekStatsOpen, setWeekStatsOpen] = useState(false);

  const openWeekStats = weekStatsReport ? () => setWeekStatsOpen(true) : undefined;

  return (
    <>
      <div className="coach-program-week-header-wrap lg:hidden">
        <div className="coach-program-week-header-top mb-3">
          <h1 className="coach-program-breadcrumb text-base">
            <span>{blockTitle}</span>
            <span className="coach-program-breadcrumb-sep">/</span>
            <span className="coach-program-breadcrumb-week">{weekTitle}</span>
          </h1>
          <Link href={backHref} className="coach-program-back-btn shrink-0">
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            Terug
          </Link>
        </div>

        {showEditorViewToggle && onEditorViewChange ? (
          <div className="mb-3">
            <EditorViewToggle
              editorView={editorView}
              onEditorViewChange={onEditorViewChange}
            />
          </div>
        ) : null}

        {sbdWeekSummary.length > 0 ? (
          <div className="mb-3">
            <SbdSummaryPill items={sbdWeekSummary} onClick={openWeekStats} />
          </div>
        ) : null}
      </div>

      <div className="coach-program-week-header-wrap hidden lg:block">
        <div className="coach-program-week-header-top">
          <h1 className="coach-program-breadcrumb">
            <span>{blockTitle}</span>
            <span className="coach-program-breadcrumb-sep">/</span>
            <span className="coach-program-breadcrumb-week">{weekTitle}</span>
          </h1>

          <div className="coach-program-week-actions">
            {showEditorViewToggle && onEditorViewChange ? (
              <EditorViewToggle
                editorView={editorView}
                onEditorViewChange={onEditorViewChange}
              />
            ) : null}

            <button
              type="button"
              onClick={onTogglePlanning}
              className={`coach-program-action-btn ${
                planningSplitOpen ? "is-active" : ""
              }`}
            >
              <Calendar className="h-4 w-4" aria-hidden="true" />
              Block planning
            </button>

            <SbdSummaryPill items={sbdWeekSummary} onClick={openWeekStats} />

            <Link
              href={backHref}
              className="coach-program-back-btn coach-program-back-btn--icon"
              aria-label="Terug"
              title="Terug"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>

        <div className="coach-program-search-wrap">
          <ProgramSearch context={programSearchContext} variant="coach-dark" />
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
