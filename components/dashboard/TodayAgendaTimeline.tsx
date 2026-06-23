"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  loadCoachCalendarEvents,
  type CoachCalendarEvent,
} from "@/lib/coachCalendarEvents";
import {
  AGENDA_DAY_END_HOUR,
  AGENDA_DAY_START_HOUR,
  AGENDA_HOUR_HEIGHT,
  filterTodayAppointments,
  formatAgendaDayHeading,
  formatAgendaTimeRange,
  getHourFraction,
  getTimelineBlockStyle,
  isAppointmentActiveNow,
} from "@/lib/coachAgendaDisplay";
import {
  layoutOverlappingEvents,
  type TimedEventLayoutInput,
} from "@/lib/calendarOverlapLayout";

type TodayAgendaTimelineProps = {
  coachId: string;
  variant?: "default" | "rail";
};

const HOUR_LABELS = Array.from(
  { length: AGENDA_DAY_END_HOUR - AGENDA_DAY_START_HOUR + 1 },
  (_, index) => AGENDA_DAY_START_HOUR + index,
);

const BLOCK_TONES = [
  "today-agenda-block-tone-0",
  "today-agenda-block-tone-1",
  "today-agenda-block-tone-2",
  "today-agenda-block-tone-3",
  "today-agenda-block-tone-4",
];

const TIMELINE_VIEW_HEIGHT = 380;

export default function TodayAgendaTimeline({
  coachId,
  variant = "default",
}: TodayAgendaTimelineProps) {
  const [appointments, setAppointments] = useState<CoachCalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(() => new Date());
  const [hourHeight, setHourHeight] = useState(AGENDA_HOUR_HEIGHT);
  const scrollRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const todayAppointments = useMemo(
    () => filterTodayAppointments(appointments),
    [appointments],
  );

  const timedAppointments = useMemo(
    () => todayAppointments.filter((row) => !row.all_day),
    [todayAppointments],
  );

  const allDayAppointments = useMemo(
    () => todayAppointments.filter((row) => row.all_day),
    [todayAppointments],
  );

  const layoutBlocks = useMemo(() => {
    const inputs: TimedEventLayoutInput[] = timedAppointments.map((row) => ({
      id: row.id,
      startHour: getHourFraction(row.start_at),
      endHour: Math.max(
        getHourFraction(row.start_at) + 0.5,
        getHourFraction(row.end_at),
      ),
    }));

    const layout = layoutOverlappingEvents(inputs);
    const byId = new Map(timedAppointments.map((row) => [row.id, row]));

    return layout
      .map((block, index) => {
        const appointment = byId.get(block.id);
        if (!appointment) return null;
        return {
          appointment,
          startHour: block.startHour,
          endHour: block.endHour,
          column: block.column,
          totalColumns: block.totalColumns,
          tone: BLOCK_TONES[index % BLOCK_TONES.length],
          active: isAppointmentActiveNow(appointment, now),
        };
      })
      .filter((block): block is NonNullable<typeof block> => block !== null);
  }, [timedAppointments, now]);

  const isRail = variant === "rail";

  useLayoutEffect(() => {
    const container = scrollRef.current;
    if (!container || loading) return;

    function updateHourHeight() {
      const nextContainer = scrollRef.current;
      if (!nextContainer) return;
      const availableHeight = isRail
        ? nextContainer.clientHeight
        : TIMELINE_VIEW_HEIGHT;
      if (availableHeight <= 0) return;
      setHourHeight(
        Math.max(18, availableHeight / Math.max(HOUR_LABELS.length, 1)),
      );
    }

    updateHourHeight();

    const observer = new ResizeObserver(updateHourHeight);
    observer.observe(container);
    return () => observer.disconnect();
  }, [isRail, loading]);

  const gridHeight = HOUR_LABELS.length * hourHeight;
  const currentHour = now.getHours() + now.getMinutes() / 60;
  const currentTop = (currentHour - AGENDA_DAY_START_HOUR) * hourHeight;

  return (
    <section
      className={`today-agenda-timeline glass-accent-card ${
        isRail ? "today-agenda-timeline--rail" : ""
      }`}
    >
      <div className="today-agenda-timeline-header">
        <div className="min-w-0">
          <p className="text-[8px] font-medium uppercase tracking-wide text-app-subtle">
            Snelle agenda
          </p>
          <h2 className="mt-0.5 text-[18px] font-semibold capitalize tracking-tight text-app-text">
            {formatAgendaDayHeading(now)}
          </h2>
        </div>
        <Link
          href="/agenda"
          className="shrink-0 text-[11px] font-medium text-app-accent hover:underline"
        >
          Alle afspraken
        </Link>
      </div>

      {allDayAppointments.length > 0 ? (
        <div className="today-agenda-allday-row">
          {allDayAppointments.map((appointment) => (
            <span key={appointment.id} className="today-agenda-allday-chip">
              {appointment.title}
            </span>
          ))}
        </div>
      ) : null}

      <div
        ref={scrollRef}
        className="today-agenda-scroll today-agenda-scroll--fit"
        style={isRail ? undefined : { height: TIMELINE_VIEW_HEIGHT }}
      >
        {loading ? (
          <p className="px-3 py-4 text-[12px] text-app-muted">Agenda laden...</p>
        ) : (
          <div className="today-agenda-grid" style={{ height: gridHeight }}>
            {HOUR_LABELS.map((hour) => (
              <div key={hour} className="today-agenda-hour-row">
                <div className="today-agenda-hour-label">
                  {hour.toString().padStart(2, "0")}:00
                </div>
                <div
                  className="today-agenda-hour-line"
                  style={{ height: hourHeight }}
                />
              </div>
            ))}

            <div className="today-agenda-events-layer">
              {layoutBlocks.map((block) => (
                <div
                  key={block.appointment.id}
                  className={`today-agenda-block ${block.tone} ${
                    block.active ? "today-agenda-block-active" : ""
                  }`}
                  style={{
                    ...getTimelineBlockStyle(block.column, block.totalColumns),
                    top: (block.startHour - AGENDA_DAY_START_HOUR) * hourHeight,
                    height: Math.max(
                      24,
                      (block.endHour - block.startHour) * hourHeight,
                    ),
                  }}
                >
                  <p className="truncate text-[12px] font-semibold leading-4">
                    {block.appointment.title}
                  </p>
                  <p className="mt-0.5 truncate text-[10px] opacity-80">
                    {formatAgendaTimeRange(
                      block.appointment.start_at,
                      block.appointment.end_at,
                    )}
                  </p>
                </div>
              ))}

              {currentHour >= AGENDA_DAY_START_HOUR &&
              currentHour <= AGENDA_DAY_END_HOUR ? (
                <div
                  className="today-agenda-now-line"
                  style={{
                    top: currentTop,
                  }}
                >
                  <span className="today-agenda-now-badge">
                    {now.toLocaleTimeString("nl-NL", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
