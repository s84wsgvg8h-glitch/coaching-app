"use client";

import { useEffect, useMemo, useState } from "react";
import {
  loadCoachCalendarEvents,
  type CoachCalendarEvent,
} from "@/lib/coachCalendarEvents";
import {
  filterUpcomingAppointments,
  formatAgendaDayLabel,
  formatAgendaTime,
  groupAppointmentsByDate,
  parseAgendaDate,
  addAgendaDays,
  toAgendaDateString,
} from "@/lib/coachAgendaDisplay";
import { getTodayDateString } from "@/lib/competitions";

type CoachUpcomingAppointmentsPanelProps = {
  coachId: string;
  weeks?: number;
  variant?: "sidebar" | "page";
  onSelectAppointment?: (appointment: CoachCalendarEvent) => void;
};

export default function CoachUpcomingAppointmentsPanel({
  coachId,
  weeks = 4,
  variant = "sidebar",
  onSelectAppointment,
}: CoachUpcomingAppointmentsPanelProps) {
  const [appointments, setAppointments] = useState<CoachCalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      const rows = await loadCoachCalendarEvents(coachId);
      if (!cancelled) {
        setAppointments(rows);
        setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [coachId]);

  const grouped = useMemo(() => {
    const upcoming = filterUpcomingAppointments(appointments, weeks);
    return groupAppointmentsByDate(upcoming);
  }, [appointments, weeks]);

  const today = getTodayDateString();
  const tomorrow = toAgendaDateString(addAgendaDays(parseAgendaDate(today), 1));
  const dates = Object.keys(grouped);
  const shellClass =
    variant === "page"
      ? "ui-panel flex min-h-[420px] flex-col"
      : "ui-panel flex h-full min-h-[280px] flex-col";

  return (
    <div className={shellClass}>
      <h3 className="ui-label mb-3">Komende afspraken</h3>

      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        {loading ? (
          <p className="text-[12px] text-app-muted">Laden...</p>
        ) : dates.length === 0 ? (
          <p className="text-[12px] text-app-muted">Geen afspraken gepland.</p>
        ) : (
          <div className="space-y-3">
            {dates.map((date) => (
              <div key={date}>
                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-app-subtle">
                  {formatAgendaDayLabel(date, today, tomorrow)}
                </p>
                <div className="space-y-1.5">
                  {grouped[date].map((appointment) => (
                    <button
                      key={appointment.id}
                      type="button"
                      onClick={() => onSelectAppointment?.(appointment)}
                      className="coach-calendar-appointment flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left app-focus-ring"
                    >
                      <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-app-text">
                        {appointment.title}
                      </span>
                      <span className="shrink-0 text-[10px] text-app-muted">
                        {appointment.all_day
                          ? "Hele dag"
                          : formatAgendaTime(appointment.start_at)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
