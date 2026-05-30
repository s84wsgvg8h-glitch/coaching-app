"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import CoachWeekCalendar from "@/components/CoachWeekCalendar";
import { supabase } from "@/lib/supabaseClient";
import EmptyState from "@/components/ui/EmptyState";
import { SkeletonCard } from "@/components/ui/Skeleton";
import {
  formatCompetitionDateRange,
  getTodayDateString,
  isUpcomingCompetition,
  loadCompetitions,
  loadAthleteCompetitionIds,
} from "@/lib/competitions";
import {
  formatAthleteEventRange,
  loadAthleteCalendarEvents,
} from "@/lib/athleteCalendarEvents";
import { isCoachLikeRole } from "@/lib/authRoles";

type AgendaItem = {
  id: string;
  date: string;
  title: string;
  subtitle?: string;
  href?: string;
};

type DashboardAgendaProps = {
  role: string;
  userId: string;
};

function formatAgendaDate(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString("nl-NL", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function getNextPaymentDate(dayOfMonth: number) {
  const today = new Date();
  const candidate = new Date(
    today.getFullYear(),
    today.getMonth(),
    Math.min(dayOfMonth, 28),
  );

  if (candidate < new Date(today.toDateString())) {
    candidate.setMonth(candidate.getMonth() + 1);
  }

  return candidate.toISOString().slice(0, 10);
}

function AthleteAgenda({ userId }: { userId: string }) {
  const [items, setItems] = useState<AgendaItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const today = getTodayDateString();
      const now = new Date();
      const { data: competitions } = await loadCompetitions();
      const upcoming = (competitions || []).filter((competition) =>
        isUpcomingCompetition(competition, today),
      );

      const agendaItems: AgendaItem[] = [];
      const { data: selectedIds } = await loadAthleteCompetitionIds(userId);
      const coachEvents = await loadAthleteCalendarEvents(userId);

      upcoming
        .filter((competition) => selectedIds.includes(competition.id))
        .forEach((competition) => {
          agendaItems.push({
            id: `meet-${competition.id}`,
            date: competition.start_date,
            title: competition.naam,
            subtitle: formatCompetitionDateRange(
              competition.start_date,
              competition.end_date,
            ),
          });
        });

      coachEvents
        .filter((event) => new Date(event.end_at) >= now)
        .forEach((event) => {
          agendaItems.push({
            id: `event-${event.id}`,
            date: event.start_at.slice(0, 10),
            title: event.title,
            subtitle: formatAthleteEventRange(event.start_at, event.end_at),
          });
        });

      const { data: profile } = await supabase
        .from("profiles")
        .select("betaling_dag")
        .eq("id", userId)
        .single();

      if (profile?.betaling_dag) {
        const paymentDate = getNextPaymentDate(Number(profile.betaling_dag));
        agendaItems.push({
          id: `payment-${paymentDate}`,
          date: paymentDate,
          title: "Betaling coaching",
          subtitle: `Betaaldag ${profile.betaling_dag}`,
        });
      }

      agendaItems.sort((a, b) => a.date.localeCompare(b.date));
      setItems(agendaItems.slice(0, 8));
      setLoading(false);
    }

    void load();
  }, [userId]);

  const grouped = useMemo(() => {
    return items.reduce<Record<string, AgendaItem[]>>((acc, item) => {
      if (!acc[item.date]) acc[item.date] = [];
      acc[item.date].push(item);
      return acc;
    }, {});
  }, [items]);

  return (
    <div className="rounded-3xl bg-white p-6 shadow-xl">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-black">Agenda</h2>
          <p className="text-sm text-gray-500">
            Aankomende wedstrijden en belangrijke datums
          </p>
        </div>
        <Link
          href="/wedstrijd-kalender"
          className="text-sm font-semibold text-black underline-offset-2 hover:underline"
        >
          Kalender
        </Link>
      </div>

      {loading ? (
        <SkeletonCard />
      ) : items.length === 0 ? (
        <EmptyState
          icon="calendar"
          title="Geen afspraken"
          description="Je agenda is leeg. Voeg wedstrijden toe via de kalender."
        />
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([date, dayItems]) => (
            <div key={date}>
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-400">
                {formatAgendaDate(date)}
              </p>
              <div className="space-y-2">
                {dayItems.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl border border-gray-200 px-3 py-2"
                  >
                    <p className="text-sm font-semibold text-black">{item.title}</p>
                    {item.subtitle && (
                      <p className="text-xs text-gray-500">{item.subtitle}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function DashboardAgenda({ role, userId }: DashboardAgendaProps) {
  if (isCoachLikeRole(role)) {
    return <CoachWeekCalendar userId={userId} />;
  }

  return <AthleteAgenda userId={userId} />;
}
