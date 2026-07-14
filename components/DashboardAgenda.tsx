"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { Calendar, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import EmptyState from "@/components/ui/EmptyState";
import { SkeletonCard } from "@/components/ui/Skeleton";
import {
  formatCompetitionDateRange,
  getTodayDateString,
  isUpcomingCompetition,
  loadCompetitions,
  loadAthleteCompetitionNotes,
} from "@/lib/competitions";
import {
  formatAthleteEventRange,
  loadAthleteCalendarEvents,
} from "@/lib/athleteCalendarEvents";
import { isCoachLikeRole } from "@/lib/authRoles";

const CoachWeekCalendar = dynamic(
  () => import("@/components/CoachWeekCalendar"),
  {
    ssr: false,
    loading: () => <SkeletonCard />,
  },
);

type AgendaItem = {
  id: string;
  date: string;
  title: string;
  subtitle?: string;
};

type DashboardAgendaProps = {
  role: string;
  userId: string;
  variant?: "default" | "athlete";
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

function AthleteAgenda({
  userId,
  variant = "default",
}: {
  userId: string;
  variant?: "default" | "athlete";
}) {
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
      const [{ data: registrations }, coachEvents, profileResult] =
        await Promise.all([
          loadAthleteCompetitionNotes(userId),
          loadAthleteCalendarEvents(userId),
          supabase
            .from("profiles")
            .select("betaling_dag")
            .eq("id", userId)
            .single(),
        ]);
      const registrationRows = registrations || [];

      upcoming
        .filter((competition) =>
          registrationRows.some((entry) => entry.competitionId === competition.id),
        )
        .forEach((competition) => {
          const registration = registrationRows.find(
            (entry) => entry.competitionId === competition.id,
          );
          const noteParts = [
            formatCompetitionDateRange(
              competition.start_date,
              competition.end_date,
            ),
            registration?.goals ? `Doelen: ${registration.goals}` : null,
            registration?.coachNotes
              ? `Coach: ${registration.coachNotes}`
              : null,
          ].filter(Boolean);

          agendaItems.push({
            id: `meet-${competition.id}`,
            date: competition.start_date,
            title: competition.naam,
            subtitle: noteParts.join(" · "),
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

      const profile = profileResult.data;

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

  if (variant === "athlete") {
    return (
      <div className="athlete-dashboard-card athlete-dashboard-card--agenda">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-app-muted" aria-hidden="true" />
            <h2 className="text-[15px] font-semibold text-app-text">Agenda</h2>
          </div>
          <Link
            href="/meet-week"
            className="text-[13px] font-medium text-[#3b82f6] hover:underline"
          >
            Kalender
          </Link>
        </div>

        {loading ? (
          <div className="mt-4 h-20 animate-pulse rounded-xl bg-app-surface-hover" />
        ) : items.length === 0 ? (
          <p className="mt-4 text-[13px] text-app-muted">
            Geen afspraken gepland.
          </p>
        ) : (
          <div className="mt-4 space-y-4">
            {Object.entries(grouped).map(([date, dayItems]) => (
              <div key={date}>
                <p className="mb-2 text-[12px] font-medium text-app-muted">
                  {formatAgendaDate(date)}
                </p>
                <div className="space-y-2">
                  {dayItems.map((item) => (
                    <div key={item.id} className="athlete-dashboard-agenda-item">
                      <div className="athlete-dashboard-agenda-item-icon">
                        <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-medium text-app-text">
                          {item.title}
                        </p>
                        {item.subtitle ? (
                          <p className="mt-0.5 text-[12px] text-app-muted">
                            {item.subtitle}
                          </p>
                        ) : null}
                      </div>
                      <ChevronRight
                        className="h-4 w-4 shrink-0 text-app-muted"
                        aria-hidden="true"
                      />
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

  return (
    <div className="ui-panel">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-[15px] font-semibold text-app-text">Agenda</h2>
        <Link
          href="/wedstrijd-kalender"
          className="text-[13px] font-medium text-app-accent hover:underline"
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
              <p className="mb-2 text-[12px] font-medium text-app-muted">
                {formatAgendaDate(date)}
              </p>
              <div className="space-y-2">
                {dayItems.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl bg-app-surface-hover/60 px-3 py-2.5"
                  >
                    <p className="text-[13px] font-medium text-app-text">
                      {item.title}
                    </p>
                    {item.subtitle && (
                      <p className="mt-0.5 text-[12px] font-normal text-app-muted">
                        {item.subtitle}
                      </p>
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

export default function DashboardAgenda({
  role,
  userId,
  variant = "default",
}: DashboardAgendaProps) {
  if (isCoachLikeRole(role)) {
    return <CoachWeekCalendar userId={userId} />;
  }

  return <AthleteAgenda userId={userId} variant={variant} />;
}
