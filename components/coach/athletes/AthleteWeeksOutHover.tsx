"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { formatCompetitionDateRange } from "@/lib/competitions";
import type { AthleteUpcomingCompetition } from "@/lib/coachAthleteOverview";

const POPOVER_WIDTH = 240;

type AthleteWeeksOutHoverProps = {
  weeksOut: number;
  competitions: AthleteUpcomingCompetition[];
  className?: string;
  onPointerDown?: (event: React.PointerEvent) => void;
};

export default function AthleteWeeksOutHover({
  weeksOut,
  competitions,
  className = "",
  onPointerDown,
}: AthleteWeeksOutHoverProps) {
  const anchorRef = useRef<HTMLSpanElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  const hasCompetitions = competitions.length > 0;

  const updatePosition = useCallback(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;

    const rect = anchor.getBoundingClientRect();
    const left = Math.max(
      8,
      Math.min(
        rect.left + rect.width / 2 - POPOVER_WIDTH / 2,
        window.innerWidth - POPOVER_WIDTH - 8,
      ),
    );

    setPosition({ top: rect.bottom + 8, left });
  }, []);

  const handleOpen = useCallback(() => {
    if (!hasCompetitions) return;
    updatePosition();
    setOpen(true);
  }, [hasCompetitions, updatePosition]);

  const handleClose = useCallback((event?: React.MouseEvent | React.FocusEvent) => {
    const related = event?.relatedTarget as Node | null;
    if (
      related &&
      (anchorRef.current?.contains(related) || popoverRef.current?.contains(related))
    ) {
      return;
    }
    setOpen(false);
  }, []);

  useEffect(() => {
    if (!open) return;

    function reposition() {
      updatePosition();
    }

    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);

    return () => {
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [open, updatePosition]);

  const popover =
    open && hasCompetitions ? (
      <div
        ref={popoverRef}
        className="fixed z-[9999] w-60 rounded-xl border border-app-border bg-app-surface p-3 shadow-xl"
        style={{ left: position.left, top: position.top }}
        onMouseEnter={handleOpen}
        onMouseLeave={handleClose}
        role="tooltip"
      >
        <p className="text-[10px] font-bold uppercase tracking-wide text-app-muted">
          Wedstrijden
        </p>
        <ul className="mt-2 space-y-2">
          {competitions.map((competition) => (
            <li key={competition.id} className="min-w-0">
              <p className="truncate text-[13px] font-semibold text-app-text">
                {competition.naam}
              </p>
              <p className="mt-0.5 text-[11px] text-app-muted">
                {formatCompetitionDateRange(
                  competition.startDate,
                  competition.endDate,
                )}
              </p>
              <p className="mt-0.5 text-[11px] font-medium text-app-accent">
                {competition.weeksOut <= 0
                  ? "Wedstrijdweek"
                  : competition.weeksOut === 1
                    ? "1 week uit"
                    : `${competition.weeksOut} weken uit`}
              </p>
            </li>
          ))}
        </ul>
      </div>
    ) : null;

  return (
    <>
      <span
        ref={anchorRef}
        className={`inline-flex ${className}`}
        onMouseEnter={handleOpen}
        onMouseLeave={handleClose}
        onFocus={handleOpen}
        onBlur={handleClose}
        onClick={(event) => {
          event.stopPropagation();
          if (open) {
            handleClose();
            return;
          }
          handleOpen();
        }}
        onPointerDown={onPointerDown}
        tabIndex={hasCompetitions ? 0 : undefined}
        role={hasCompetitions ? "button" : undefined}
        aria-label={
          hasCompetitions
            ? `${weeksOut} weken uit. Hover voor wedstrijden.`
            : undefined
        }
      >
        <span
          className={`tabular-nums ${
            hasCompetitions
              ? "cursor-help border-b border-dotted border-app-subtle/60"
              : ""
          }`}
        >
          {weeksOut}w
        </span>
      </span>

      {typeof document !== "undefined" && popover
        ? createPortal(popover, document.body)
        : null}
    </>
  );
}
