"use client";

import { useEffect, useState } from "react";
import { CalendarDays, ChevronUp, X } from "lucide-react";
import TodayAgendaTimeline from "@/components/dashboard/TodayAgendaTimeline";
import { formatAgendaDayHeading } from "@/lib/coachAgendaDisplay";

type CoachMobileAgendaSheetProps = {
  coachId: string;
};

export default function CoachMobileAgendaSheet({
  coachId,
}: CoachMobileAgendaSheetProps) {
  const [open, setOpen] = useState(false);
  const [heading, setHeading] = useState(() => formatAgendaDayHeading(new Date()));

  useEffect(() => {
    if (!open) return;
    const timer = window.setInterval(
      () => setHeading(formatAgendaDayHeading(new Date())),
      60_000,
    );
    return () => window.clearInterval(timer);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="coach-mobile-agenda-trigger app-focus-ring lg:hidden"
        aria-expanded={open}
      >
        <CalendarDays className="h-4 w-4 shrink-0 text-app-accent" strokeWidth={1.75} />
        <span className="min-w-0 flex-1 text-left">
          <span className="block text-[13px] font-semibold text-app-text">
            Agenda vandaag
          </span>
          <span className="block truncate text-[11px] capitalize text-app-muted">
            {heading}
          </span>
        </span>
        <ChevronUp className="h-4 w-4 shrink-0 text-app-muted" strokeWidth={1.75} />
      </button>

      {open ? (
        <div className="coach-mobile-agenda-sheet lg:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            className="coach-mobile-agenda-backdrop"
            aria-label="Agenda sluiten"
            onClick={() => setOpen(false)}
          />
          <div className="coach-mobile-agenda-panel">
            <div className="coach-mobile-agenda-panel-header">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-app-subtle">
                  Vandaag
                </p>
                <p className="text-[16px] font-semibold capitalize text-app-text">
                  {heading}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="ui-icon-btn app-focus-ring"
                aria-label="Sluiten"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="coach-mobile-agenda-panel-body">
              <TodayAgendaTimeline coachId={coachId} />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
