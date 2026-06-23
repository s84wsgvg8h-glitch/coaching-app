"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, X } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import {
  formatAppointmentRange,
  loadCoachCalendarEvents,
  type CoachCalendarEvent,
} from "@/lib/coachCalendarEvents";
import {
  formatCompetitionDateRange,
  loadCoachAthleteCompetitions,
  loadUpcomingCompetitions,
} from "@/lib/competitions";
import { CHAT_SIDE_PANEL_CLASS } from "@/lib/chatSidePanel";

type AgendaOverviewItem = {
  id: string;
  date: string;
  sortAt: number;
  title: string;
  subtitle: string;
  kind: "appointment" | "competition" | "athlete_meet" | "payment";
};

type ChatCoachAgendaOverviewPanelProps = {
  coachId: string;
  onClose: () => void;
};

function getTodayDateString() {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
}

function formatDayHeading(dateStr: string) {
  const date = new Date(`${dateStr}T12:00:00`);
  return date.toLocaleDateString("nl-NL", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function getNextPaymentDate(dayOfMonth: number) {
  const today = new Date();
  const candidate = new Date(today.getFullYear(), today.getMonth(), dayOfMonth);
  if (candidate < today) {
    candidate.setMonth(candidate.getMonth() + 1);
  }
  return `${candidate.getFullYear()}-${String(candidate.getMonth() + 1).padStart(2, "0")}-${String(candidate.getDate()).padStart(2, "0")}`;
}

export default function ChatCoachAgendaOverviewPanel({
  coachId,
  onClose,
}: ChatCoachAgendaOverviewPanelProps) {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<AgendaOverviewItem[]>([]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const today = getTodayDateString();
      const overviewItems: AgendaOverviewItem[] = [];

      const appointments = await loadCoachCalendarEvents(coachId);
      for (const appointment of appointments) {
        const date = appointment.start_at.slice(0, 10);
        overviewItems.push({
          id: `appointment-${appointment.id}`,
          date,
          sortAt: new Date(appointment.start_at).getTime(),
          title: appointment.title,
          subtitle: appointment.all_day
            ? "Hele dag"
            : formatAppointmentRange(appointment.start_at, appointment.end_at),
          kind: "appointment",
        });
      }

      const athleteCompetitions = await loadCoachAthleteCompetitions(today);
      for (const entry of athleteCompetitions) {
        overviewItems.push({
          id: `athlete-meet-${entry.competition.id}-${entry.athleteId}`,
          date: entry.competition.start_date,
          sortAt: new Date(`${entry.competition.start_date}T12:00:00`).getTime(),
          title: `${entry.athleteName} · ${entry.competition.naam}`,
          subtitle: formatCompetitionDateRange(
            entry.competition.start_date,
            entry.competition.end_date,
          ),
          kind: "athlete_meet",
        });
      }

      const { data: competitions } = await loadUpcomingCompetitions(today);
      for (const competition of competitions) {
        overviewItems.push({
          id: `competition-${competition.id}`,
          date: competition.start_date,
          sortAt: new Date(`${competition.start_date}T12:00:00`).getTime(),
          title: competition.naam,
          subtitle: formatCompetitionDateRange(
            competition.start_date,
            competition.end_date,
          ),
          kind: "competition",
        });
      }

      const { data: athletes } = await supabase
        .from("profiles")
        .select("id, full_name, betaling_dag")
        .eq("role", "atleet")
        .not("betaling_dag", "is", null);

      for (const athlete of athletes || []) {
        if (!athlete.betaling_dag) continue;
        const paymentDate = getNextPaymentDate(Number(athlete.betaling_dag));
        overviewItems.push({
          id: `payment-${athlete.id}-${paymentDate}`,
          date: paymentDate,
          sortAt: new Date(`${paymentDate}T12:00:00`).getTime(),
          title: `Betaling ${athlete.full_name || "Atleet"}`,
          subtitle: `Betaaldag ${athlete.betaling_dag}`,
          kind: "payment",
        });
      }

      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 1);

      setItems(
        overviewItems
          .filter((item) => new Date(`${item.date}T23:59:59`).getTime() >= cutoff.getTime())
          .sort((a, b) => a.sortAt - b.sortAt || a.title.localeCompare(b.title)),
      );
      setLoading(false);
    }

    void load();
  }, [coachId]);

  const groupedByDay = useMemo(() => {
    const map = new Map<string, AgendaOverviewItem[]>();
    for (const item of items) {
      if (!map.has(item.date)) map.set(item.date, []);
      map.get(item.date)!.push(item);
    }
    return [...map.entries()];
  }, [items]);

  const kindLabel: Record<AgendaOverviewItem["kind"], string> = {
    appointment: "Afspraak",
    competition: "Wedstrijd",
    athlete_meet: "Atleet",
    payment: "Betaling",
  };

  return (
    <aside
      className={`${CHAT_SIDE_PANEL_CLASS} max-md:fixed max-md:inset-0 max-md:z-[70] max-md:w-full max-md:max-w-none max-md:border-r-0`}
    >
      <div className="chat-panel-header">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-app-text" />
            <h2 className="truncate chat-panel-title truncate">Agenda</h2>
          </div>
          <p className="truncate chat-panel-subtitle truncate">
            Versimpeld overzicht van afspraken, wedstrijden en betalingen
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="ui-icon-btn app-focus-ring"
          aria-label="Agenda sluiten"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 mobile-scroll">
        {loading ? (
          <p className="text-sm text-app-muted">Agenda laden...</p>
        ) : groupedByDay.length === 0 ? (
          <p className="text-sm text-app-muted">Geen aankomende agenda-items.</p>
        ) : (
          <div className="space-y-5">
            {groupedByDay.map(([date, dayItems]) => (
              <section key={date}>
                <h3 className="mb-2 chat-section-label">
                  {formatDayHeading(date)}
                </h3>
                <div className="space-y-2">
                  {dayItems.map((item) => (
                    <div
                      key={item.id}
                      className="chat-card-elevated px-3 py-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold text-app-text">{item.title}</p>
                        <span className="shrink-0 rounded-full bg-app-surface-hover px-2 py-0.5 text-[10px] font-bold text-app-muted">
                          {kindLabel[item.kind]}
                        </span>
                      </div>
                      <p className="mt-1 chat-panel-subtitle truncate">{item.subtitle}</p>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
