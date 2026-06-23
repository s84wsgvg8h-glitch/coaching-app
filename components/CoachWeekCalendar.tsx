"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import CoachAppointmentModal from "@/components/CoachAppointmentModal";
import {
  getOverlappingBlockStyle,
  layoutOverlappingEvents,
} from "@/lib/calendarOverlapLayout";
import {
  createDefaultAppointmentDraft,
  loadCoachCalendarEvents,
  saveCoachCalendarEvent,
  type CoachCalendarEvent,
  type CoachCalendarEventInput,
} from "@/lib/coachCalendarEvents";
import {
  formatAthleteShortName,
  formatCompetitionDateRange,
  getTodayDateString,
  loadCoachAthleteCompetitions,
  loadUpcomingCompetitions,
} from "@/lib/competitions";

type CalendarEvent = {
  id: string;
  source: "competition_calendar" | "athlete_competition" | "appointment";
  date: string;
  endDate?: string;
  startAt?: string;
  endAt?: string;
  allDay?: boolean;
  title: string;
  subtitle?: string;
  color: string;
  pillClass: string;
  icon: string;
  href?: string;
};

type CoachWeekCalendarProps = {
  userId: string;
  variant?: "default" | "embedded" | "compact";
  defaultExpanded?: boolean;
  forceExpanded?: boolean;
  fullPage?: boolean;
  focusRequest?: {
    date: string;
    startAt?: string;
    appointmentId?: string;
  } | null;
  onFocusHandled?: () => void;
};

const ALL_HOURS = Array.from({ length: 24 }, (_, index) => index);
const HOUR_HEIGHT = 48;
const COLLAPSED_VIEW_HEIGHT = 380;
const COLLAPSED_DAY_COUNT = 3;
const DRAG_THRESHOLD_PX = 8;

type TimedAppointmentBlock = {
  id: string;
  appointmentId: string;
  title: string;
  date: string;
  startHour: number;
  endHour: number;
  color: string;
  column: number;
  totalColumns: number;
};

type DragCreateState = {
  dateString: string;
  dayIndex: number;
  startHour: number;
  endHour: number;
};

type DragMoveState = {
  appointmentId: string;
  dayIndex: number;
  startHour: number;
  endHour: number;
  durationHours: number;
  grabOffsetHour: number;
};

function toDateString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDate(date: string) {
  return new Date(`${date}T12:00:00`);
}

function getMonday(date: Date) {
  const copy = new Date(date);
  copy.setHours(12, 0, 0, 0);
  const offset = (copy.getDay() + 6) % 7;
  copy.setDate(copy.getDate() - offset);
  return copy;
}

function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function addMinutes(date: Date, minutes: number) {
  const copy = new Date(date);
  copy.setMinutes(copy.getMinutes() + minutes);
  return copy;
}

function isDateInRange(date: string, start: string, end?: string) {
  const target = parseDate(date).getTime();
  const rangeStart = parseDate(start).getTime();
  const rangeEnd = parseDate(end || start).getTime();
  return target >= rangeStart && target <= rangeEnd;
}

function formatMonthYear(date: Date) {
  return date.toLocaleDateString("nl-NL", {
    month: "long",
    year: "numeric",
  });
}

function formatUpcomingDayLabel(date: string, today: string, tomorrow: string) {
  if (date === today) return "Vandaag";
  if (date === tomorrow) return "Morgen";

  return parseDate(date)
    .toLocaleDateString("nl-NL", {
      weekday: "long",
      day: "numeric",
      month: "long",
    })
    .toUpperCase();
}

function formatDayHeader(date: Date) {
  return date
    .toLocaleDateString("nl-NL", { weekday: "short" })
    .replace(".", "")
    .slice(0, 2);
}

function getHourFraction(iso: string) {
  const date = new Date(iso);
  return date.getHours() + date.getMinutes() / 60;
}

function snapToQuarterHour(hour: number) {
  return Math.max(0, Math.min(24, Math.round(hour * 4) / 4));
}

function getDayColumnStyle(dayIndex: number, dayCount: number) {
  return {
    left: `calc(56px + ((100% - 56px) / ${dayCount}) * ${dayIndex} + 2px)`,
    width: `calc((100% - 56px) / ${dayCount} - 4px)`,
  };
}

function appointmentToDraft(appointment: CoachCalendarEvent): CoachCalendarEventInput {
  return {
    id: appointment.id,
    coach_id: appointment.coach_id,
    event_type: appointment.event_type,
    title: appointment.title,
    location: appointment.location || "",
    video_url: appointment.video_url || "",
    start_at: appointment.start_at,
    end_at: appointment.end_at,
    all_day: appointment.all_day,
    invitees: appointment.invitees || "",
    notes: appointment.notes || "",
  };
}

function mapAppointmentToCalendarEvent(appointment: CoachCalendarEvent): CalendarEvent {
  const start = new Date(appointment.start_at);
  const end = new Date(appointment.end_at);
  const date = toDateString(start);
  const endDate = toDateString(end);

  return {
    id: `appointment-${appointment.id}`,
    source: "appointment",
    date,
    endDate: endDate !== date ? endDate : undefined,
    startAt: appointment.start_at,
    endAt: appointment.end_at,
    allDay: appointment.all_day,
    title: appointment.title,
    subtitle: appointment.location || appointment.notes || undefined,
    color:
      appointment.event_type === "reminder"
        ? "bg-amber-100 text-amber-900"
        : "bg-emerald-100 text-emerald-900",
    pillClass:
      appointment.event_type === "reminder"
        ? "bg-amber-50 text-amber-900 border border-amber-200"
        : "bg-emerald-50 text-emerald-900 border border-emerald-200",
    icon: appointment.event_type === "reminder" ? "⏰" : "📌",
  };
}

function CoachUpcomingEvents({
  events,
  loading,
  onNavigateToDate,
}: {
  events: CalendarEvent[];
  loading: boolean;
  onNavigateToDate: (date: string, startAt?: string, appointmentId?: string) => void;
}) {
  const grouped = useMemo(() => {
    const today = getTodayDateString();
    const horizon = toDateString(addDays(parseDate(today), 365));

    const upcoming = events
      .flatMap((event) => {
        const dates: string[] = [];
        let cursor = parseDate(event.date);
        const end = parseDate(event.endDate || event.date);

        while (cursor.getTime() <= end.getTime()) {
          const dateString = toDateString(cursor);
          if (dateString >= today && dateString <= horizon) {
            dates.push(dateString);
          }
          cursor = addDays(cursor, 1);
        }

        return dates.map((date) => ({ ...event, occurrenceDate: date }));
      })
      .sort((a, b) => a.occurrenceDate.localeCompare(b.occurrenceDate));

    return upcoming.reduce<
      Record<string, Array<CalendarEvent & { occurrenceDate: string }>>
    >((acc, event) => {
      if (!acc[event.occurrenceDate]) acc[event.occurrenceDate] = [];
      acc[event.occurrenceDate].push(event);
      return acc;
    }, {});
  }, [events]);

  const today = getTodayDateString();
  const tomorrow = toDateString(addDays(parseDate(today), 1));

  return (
    <>
      <h3 className="ui-label mb-3">Komende items</h3>

      {loading ? (
        <p className="text-xs text-app-muted">Laden...</p>
      ) : Object.keys(grouped).length === 0 ? (
        <p className="text-xs text-app-muted">Geen gebeurtenissen.</p>
      ) : (
        <div className="space-y-3">
          {Object.entries(grouped).map(([date, dayEvents]) => (
            <div key={date}>
              <p className="ui-label mb-1.5">
                {formatUpcomingDayLabel(date, today, tomorrow)}
              </p>
              <div className="space-y-1.5">
                {dayEvents.map((event) => (
                  <button
                    key={`${event.id}-${date}`}
                    type="button"
                    onClick={(clickEvent) => {
                      clickEvent.stopPropagation();
                      onNavigateToDate(
                        date,
                        event.startAt || undefined,
                        event.source === "appointment"
                          ? event.id.replace(/^appointment-/, "")
                          : undefined,
                      );
                    }}
                    className={`flex w-full items-center gap-1.5 rounded-full px-2 py-1 text-left text-[11px] font-semibold ${event.pillClass}`}
                  >
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-app-surface-hover text-[9px]">
                      {event.icon}
                    </span>
                    <span className="truncate">{event.title}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

export default function CoachWeekCalendar({
  userId,
  variant = "default",
  defaultExpanded = false,
  forceExpanded = false,
  fullPage = false,
  focusRequest = null,
  onFocusHandled,
}: CoachWeekCalendarProps) {
  const embedded = variant === "embedded" || variant === "compact";
  const compact = variant === "compact";
  const collapsedViewHeight = COLLAPSED_VIEW_HEIGHT;
  const calendarLayoutRef = useRef<HTMLDivElement>(null);
  const calendarCardRef = useRef<HTMLDivElement>(null);
  const timeGridScrollRef = useRef<HTMLDivElement>(null);
  const collapsedContainerRef = useRef<HTMLDivElement>(null);
  const gridContainerRef = useRef<HTMLDivElement>(null);
  const dragPointerIdRef = useRef<number | null>(null);
  const dragStartClientYRef = useRef(0);
  const dragStartClientXRef = useRef(0);
  const dragMovedRef = useRef(false);
  const movePointerIdRef = useRef<number | null>(null);
  const moveStartClientYRef = useRef(0);
  const moveStartClientXRef = useRef(0);
  const moveMovedRef = useRef(false);
  const moveGrabOffsetHourRef = useRef(0);
  const moveTargetRef = useRef<HTMLDivElement | null>(null);
  const dragMoveRef = useRef<DragMoveState | null>(null);
  const visibleDaysRef = useRef<Date[]>([]);
  const appointmentsByIdRef = useRef<Map<string, CoachCalendarEvent>>(new Map());
  const moveListenersRef = useRef<{
    onMove: (event: PointerEvent) => void;
    onUp: (event: PointerEvent) => void;
  } | null>(null);

  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()));
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [appointments, setAppointments] = useState<CoachCalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(defaultExpanded || forceExpanded);
  const [now, setNow] = useState(() => new Date());
  const [appointmentDraft, setAppointmentDraft] = useState(
    createDefaultAppointmentDraft(userId, new Date()),
  );
  const [appointmentModalOpen, setAppointmentModalOpen] = useState(false);
  const [scrollToHour, setScrollToHour] = useState<number | null>(null);
  const [dragCreate, setDragCreate] = useState<DragCreateState | null>(null);
  const [dragCreateMoved, setDragCreateMoved] = useState(false);
  const [dragMove, setDragMove] = useState<DragMoveState | null>(null);
  const [highlightedAppointmentId, setHighlightedAppointmentId] = useState<
    string | null
  >(null);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!expanded || appointmentModalOpen) return;

    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        setWeekStart((current) => addDays(current, -7));
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        setWeekStart((current) => addDays(current, 7));
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [expanded, appointmentModalOpen]);

  useEffect(() => {
    if (!expanded || appointmentModalOpen) return;

    function handleOutsideClick(event: MouseEvent) {
      if (
        calendarLayoutRef.current &&
        !calendarLayoutRef.current.contains(event.target as Node)
      ) {
        collapseCalendar();
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [expanded, appointmentModalOpen]);

  useEffect(() => {
    if (!expanded || !calendarCardRef.current) return;

    window.requestAnimationFrame(() => {
      calendarCardRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    });
  }, [expanded]);

  useEffect(() => {
    if (!focusRequest) return;

    setWeekStart(getMonday(parseDate(focusRequest.date)));
    setScrollToHour(
      focusRequest.startAt ? getHourFraction(focusRequest.startAt) : currentHour,
    );
    setHighlightedAppointmentId(focusRequest.appointmentId || null);
    setExpanded(true);
    onFocusHandled?.();
  }, [focusRequest, onFocusHandled]);

  useEffect(() => {
    if (!highlightedAppointmentId) return;

    const timer = window.setTimeout(() => {
      setHighlightedAppointmentId(null);
    }, 4000);

    return () => window.clearTimeout(timer);
  }, [highlightedAppointmentId]);

  useEffect(() => {
    if (!expanded || scrollToHour === null || !timeGridScrollRef.current) return;

    window.requestAnimationFrame(() => {
      const container = timeGridScrollRef.current;
      if (!container) return;

      container.scrollTop = Math.max(
        0,
        scrollToHour * HOUR_HEIGHT - container.clientHeight / 2,
      );
      setScrollToHour(null);
    });
  }, [expanded, scrollToHour, weekStart]);

  useEffect(() => {
    const scrollEl = timeGridScrollRef.current;
    if (!scrollEl || !expanded) return;

    function handleWheel(event: WheelEvent) {
      const container = timeGridScrollRef.current;
      if (!container || !container.contains(event.target as Node)) return;

      event.stopPropagation();

      const { scrollTop, scrollHeight, clientHeight } = container;
      const atTop = scrollTop <= 0;
      const atBottom = scrollTop + clientHeight >= scrollHeight - 1;

      if ((atTop && event.deltaY < 0) || (atBottom && event.deltaY > 0)) {
        event.preventDefault();
      }
    }

    scrollEl.addEventListener("wheel", handleWheel, { passive: false });
    return () => scrollEl.removeEventListener("wheel", handleWheel);
  }, [expanded]);

  const loadEvents = useCallback(async () => {
    const today = getTodayDateString();
    const calendarEvents: CalendarEvent[] = [];

    const athleteCompetitions = await loadCoachAthleteCompetitions(today);
    const athleteNames = athleteCompetitions.map((entry) => entry.athleteName);

    for (const {
      athleteId,
      athleteName,
      athleteAvailabilityNote,
      competition,
    } of athleteCompetitions) {
      const shortName = formatAthleteShortName(athleteName, athleteNames);
      const availabilitySuffix = athleteAvailabilityNote ? " ⚠️" : "";

      calendarEvents.push({
        id: `meet-athlete-${competition.id}-${athleteId}`,
        source: "athlete_competition",
        date: competition.start_date,
        endDate: competition.end_date,
        title: `${shortName} · ${competition.naam}${availabilitySuffix}`,
        subtitle: formatCompetitionDateRange(
          competition.start_date,
          competition.end_date,
        ),
        color: "bg-purple-100 text-purple-800",
        pillClass: "bg-purple-50 text-purple-800 border border-purple-200",
        icon: "📅",
        allDay: true,
        href: `/profile/${athleteId}`,
      });
    }

    const { data: allCompetitions } = await loadUpcomingCompetitions(today);
    for (const competition of allCompetitions) {
      calendarEvents.push({
        id: `meet-calendar-${competition.id}`,
        source: "competition_calendar",
        date: competition.start_date,
        endDate: competition.end_date,
        title: competition.naam,
        subtitle: formatCompetitionDateRange(
          competition.start_date,
          competition.end_date,
        ),
        color: "bg-violet-100 text-violet-800",
        pillClass: "bg-violet-50 text-violet-800 border border-violet-200",
        icon: "🏆",
        allDay: true,
        href: "/wedstrijd-kalender",
      });
    }

    const loadedAppointments = await loadCoachCalendarEvents(userId);
    setAppointments(loadedAppointments);
    calendarEvents.push(...loadedAppointments.map(mapAppointmentToCalendarEvent));

    setEvents(calendarEvents);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    if (userId) {
      void loadEvents();
    }
  }, [userId, loadEvents]);

  const visibleEvents = useMemo(() => {
    return events.filter((event) => {
      if (event.source === "appointment") return true;
      if (event.source === "athlete_competition") return true;
      return false;
    });
  }, [events]);

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)),
    [weekStart],
  );

  const visibleDays = useMemo(() => {
    if (forceExpanded || expanded) return weekDays;

    const today = new Date();
    today.setHours(12, 0, 0, 0);
    return Array.from({ length: COLLAPSED_DAY_COUNT }, (_, index) =>
      addDays(today, index),
    );
  }, [expanded, forceExpanded, weekDays]);

  const dayCount = visibleDays.length;
  const gridTemplateColumns = `56px repeat(${dayCount}, minmax(0, 1fr))`;
  const todayString = getTodayDateString();
  const currentHour = now.getHours() + now.getMinutes() / 60;
  const gridHeight = ALL_HOURS.length * HOUR_HEIGHT;
  const todayDayIndex = visibleDays.findIndex(
    (day) => toDateString(day) === todayString,
  );

  const collapsedOffset = useMemo(() => {
    const currentTop = currentHour * HOUR_HEIGHT;
    const maxOffset = Math.max(0, gridHeight - collapsedViewHeight);
    const idealOffset = currentTop - collapsedViewHeight / 2 + HOUR_HEIGHT / 2;
    return Math.min(maxOffset, Math.max(0, idealOffset));
  }, [collapsedViewHeight, currentHour, gridHeight]);

  useLayoutEffect(() => {
    if (expanded) return;
    const container = collapsedContainerRef.current;
    if (!container) return;
    container.scrollTop = collapsedOffset;
  }, [expanded, collapsedOffset, visibleDays]);

  const timedBlocks = useMemo(() => {
    const blocksByDay = new Map<string, TimedAppointmentBlock[]>();

    for (const event of visibleEvents) {
      if (event.source !== "appointment" || event.allDay || !event.startAt || !event.endAt) {
        continue;
      }

      const startHour = getHourFraction(event.startAt);
      const endHour = Math.max(startHour + 0.5, getHourFraction(event.endAt));
      const date = toDateString(new Date(event.startAt));
      const appointmentId = event.id.replace(/^appointment-/, "");

      const block = {
        id: event.id,
        appointmentId,
        title: event.title,
        date,
        startHour,
        endHour,
        color: event.pillClass.includes("amber")
          ? "coach-calendar-appointment coach-calendar-appointment-reminder"
          : "coach-calendar-appointment",
        column: 0,
        totalColumns: 1,
      };

      if (!blocksByDay.has(date)) {
        blocksByDay.set(date, []);
      }
      blocksByDay.get(date)?.push(block);
    }

    const result: TimedAppointmentBlock[] = [];

    for (const [date, dayBlocks] of blocksByDay) {
      const layout = layoutOverlappingEvents(
        dayBlocks.map((block) => ({
          id: block.id,
          startHour: block.startHour,
          endHour: block.endHour,
        })),
      );

      for (const positioned of layout) {
        const source = dayBlocks.find((block) => block.id === positioned.id);
        if (!source) continue;

        result.push({
          ...source,
          column: positioned.column,
          totalColumns: positioned.totalColumns,
        });
      }
    }

    return result;
  }, [visibleEvents]);

  const appointmentsById = useMemo(
    () => new Map(appointments.map((appointment) => [appointment.id, appointment])),
    [appointments],
  );

  useEffect(() => {
    visibleDaysRef.current = visibleDays;
  }, [visibleDays]);

  useEffect(() => {
    appointmentsByIdRef.current = appointmentsById;
  }, [appointmentsById]);

  useEffect(() => {
    dragMoveRef.current = dragMove;
  }, [dragMove]);

  function getRawHourFromClientY(clientY: number) {
    const container = expanded
      ? timeGridScrollRef.current
      : collapsedContainerRef.current;
    if (!container) return 0;

    const containerRect = container.getBoundingClientRect();
    const scrollOffset = container.scrollTop;
    const y = clientY - containerRect.top + scrollOffset;

    return Math.max(0, Math.min(24, y / HOUR_HEIGHT));
  }

  function getHourFromClientY(clientY: number) {
    return snapToQuarterHour(getRawHourFromClientY(clientY));
  }

  function getDayIndexFromClientX(clientX: number) {
    const grid = gridContainerRef.current;
    if (!grid) return 0;

    const rect = grid.getBoundingClientRect();
    const timeColumnWidth = 56;
    const dayAreaWidth = rect.width - timeColumnWidth;
    if (dayAreaWidth <= 0) return 0;

    const x = clientX - rect.left - timeColumnWidth;
    const index = Math.floor((x / dayAreaWidth) * dayCount);

    return Math.max(0, Math.min(dayCount - 1, index));
  }

  function eventsForDay(date: string) {
    return visibleEvents.filter((event) => {
      if (event.allDay || event.source !== "appointment") {
        return isDateInRange(date, event.date, event.endDate);
      }

      if (event.startAt) {
        return toDateString(new Date(event.startAt)) === date;
      }

      return isDateInRange(date, event.date, event.endDate);
    });
  }

  function collapseCalendar() {
    if (forceExpanded) return;
    setExpanded(false);
    setWeekStart(getMonday(new Date()));
  }

  function ensureExpanded() {
    if (!expanded) {
      setScrollToHour(currentHour);
      setExpanded(true);
    }
  }

  function handleSidebarClick(event: React.MouseEvent<HTMLDivElement>) {
    if ((event.target as HTMLElement).closest("button")) return;
    if (expanded) {
      collapseCalendar();
      return;
    }
    setScrollToHour(currentHour);
    setExpanded(true);
  }

  function handleCardClick(event: React.MouseEvent<HTMLDivElement>) {
    if (forceExpanded) return;
    if ((event.target as HTMLElement).closest("button")) return;
    if (expanded) return;
    setScrollToHour(currentHour);
    setExpanded(true);
  }

  function openAppointmentModalRange(start: Date, end: Date) {
    setAppointmentDraft(createDefaultAppointmentDraft(userId, start, end));
    setAppointmentModalOpen(true);
  }

  function openAppointmentModal(start: Date) {
    openAppointmentModalRange(start, addMinutes(start, 60));
  }

  function openEditAppointment(appointmentId: string) {
    const appointment = appointmentsById.get(appointmentId);
    if (!appointment) return;

    setAppointmentDraft(appointmentToDraft(appointment));
    setAppointmentModalOpen(true);
  }

  function dateAtHour(dateString: string, hour: number) {
    const date = new Date(`${dateString}T12:00:00`);
    const hours = Math.floor(hour);
    const minutes = Math.round((hour - hours) * 60);
    date.setHours(hours, minutes, 0, 0);
    return date;
  }

  function navigateToDate(
    date: string,
    startAt?: string,
    appointmentId?: string,
  ) {
    setWeekStart(getMonday(parseDate(date)));
    setExpanded(true);
    setScrollToHour(startAt ? getHourFraction(startAt) : 0);
    setHighlightedAppointmentId(appointmentId || null);
  }

  function handleAppointmentSaved() {
    setExpanded(true);
    void loadEvents();
  }

  function handleSlotDoubleClick(dateString: string, hour: number) {
    if (!expanded) return;
    openAppointmentModal(dateAtHour(dateString, hour));
  }

  function handleDragPointerDown(
    event: React.PointerEvent<HTMLDivElement>,
    dateString: string,
    dayIndex: number,
  ) {
    if (!expanded) return;

    event.stopPropagation();

    const startHour = getHourFromClientY(event.clientY);
    dragPointerIdRef.current = event.pointerId;
    dragStartClientYRef.current = event.clientY;
    dragStartClientXRef.current = event.clientX;
    dragMovedRef.current = false;
    setDragCreateMoved(false);
    event.currentTarget.setPointerCapture(event.pointerId);

    setDragCreate({
      dateString,
      dayIndex,
      startHour,
      endHour: Math.min(24, startHour + 0.25),
    });
  }

  function handleDragPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (dragPointerIdRef.current !== event.pointerId || !dragCreate) return;

    if (
      Math.abs(event.clientY - dragStartClientYRef.current) > DRAG_THRESHOLD_PX ||
      Math.abs(event.clientX - dragStartClientXRef.current) > DRAG_THRESHOLD_PX
    ) {
      dragMovedRef.current = true;
      setDragCreateMoved(true);
    }

    if (!dragMovedRef.current) return;

    const endHour = Math.max(
      dragCreate.startHour + 0.25,
      getHourFromClientY(event.clientY),
    );

    setDragCreate((current) =>
      current ? { ...current, endHour: Math.min(24, endHour) } : null,
    );
  }

  function finishDragCreate(event: React.PointerEvent<HTMLDivElement>) {
    if (dragPointerIdRef.current !== event.pointerId) return;

    dragPointerIdRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);

    const currentDrag = dragCreate;
    setDragCreate(null);
    setDragCreateMoved(false);

    if (!currentDrag || !dragMovedRef.current) return;

    const start = dateAtHour(currentDrag.dateString, currentDrag.startHour);
    const end = dateAtHour(
      currentDrag.dateString,
      Math.max(currentDrag.startHour + 0.25, currentDrag.endHour),
    );

    openAppointmentModalRange(start, end);
  }

  function updateDragMovePosition(clientX: number, clientY: number) {
    setDragMove((current) => {
      if (!current) return null;

      const nextDayIndex = getDayIndexFromClientX(clientX);
      const pointerHour = getRawHourFromClientY(clientY);
      const maxStart = 24 - current.durationHours;
      const nextStartHour = Math.max(
        0,
        Math.min(maxStart, pointerHour - current.grabOffsetHour),
      );

      const next = {
        ...current,
        dayIndex: nextDayIndex,
        startHour: nextStartHour,
        endHour: nextStartHour + current.durationHours,
      };
      dragMoveRef.current = next;
      return next;
    });
  }

  function cleanupMoveListeners() {
    if (!moveListenersRef.current) return;

    window.removeEventListener("pointermove", moveListenersRef.current.onMove);
    window.removeEventListener("pointerup", moveListenersRef.current.onUp);
    window.removeEventListener("pointercancel", moveListenersRef.current.onUp);
    moveListenersRef.current = null;
  }

  async function finishMoveAppointmentFromWindow(event: PointerEvent) {
    if (movePointerIdRef.current !== event.pointerId) return;

    movePointerIdRef.current = null;
    cleanupMoveListeners();

    try {
      moveTargetRef.current?.releasePointerCapture(event.pointerId);
    } catch {
      // Pointer may already be released.
    }
    moveTargetRef.current = null;

    const currentMove = dragMoveRef.current;
    dragMoveRef.current = null;
    setDragMove(null);

    if (!currentMove) return;

    if (!moveMovedRef.current) {
      openEditAppointment(currentMove.appointmentId);
      return;
    }

    const appointment = appointmentsByIdRef.current.get(currentMove.appointmentId);
    if (!appointment) return;

    const snappedStartHour = snapToQuarterHour(currentMove.startHour);
    const snappedEndHour = snapToQuarterHour(currentMove.endHour);
    const targetDate = toDateString(visibleDaysRef.current[currentMove.dayIndex]);
    const start = dateAtHour(targetDate, snappedStartHour);
    const end = dateAtHour(targetDate, snappedEndHour);

    const updatedDraft = {
      ...appointmentToDraft(appointment),
      start_at: start.toISOString(),
      end_at: end.toISOString(),
    };

    setAppointments((current) =>
      current.map((item) =>
        item.id === appointment.id
          ? {
              ...item,
              start_at: updatedDraft.start_at,
              end_at: updatedDraft.end_at,
            }
          : item,
      ),
    );
    setEvents((current) =>
      current.map((item) =>
        item.id === `appointment-${appointment.id}`
          ? {
              ...item,
              date: targetDate,
              startAt: updatedDraft.start_at,
              endAt: updatedDraft.end_at,
            }
          : item,
      ),
    );

    const { error } = await saveCoachCalendarEvent(updatedDraft);

    if (error) {
      void loadEvents();
    }
  }

  function handleMovePointerDown(
    event: React.PointerEvent<HTMLDivElement>,
    block: TimedAppointmentBlock,
    dayIndex: number,
  ) {
    if (!expanded) return;

    event.stopPropagation();
    event.preventDefault();

    cleanupMoveListeners();

    const pointerHour = getRawHourFromClientY(event.clientY);
    movePointerIdRef.current = event.pointerId;
    moveStartClientYRef.current = event.clientY;
    moveStartClientXRef.current = event.clientX;
    moveMovedRef.current = false;
    moveGrabOffsetHourRef.current = pointerHour - block.startHour;
    moveTargetRef.current = event.currentTarget;
    event.currentTarget.setPointerCapture(event.pointerId);

    const initialMove: DragMoveState = {
      appointmentId: block.appointmentId,
      dayIndex,
      startHour: block.startHour,
      endHour: block.endHour,
      durationHours: block.endHour - block.startHour,
      grabOffsetHour: moveGrabOffsetHourRef.current,
    };

    dragMoveRef.current = initialMove;
    setDragMove(initialMove);

    const onMove = (moveEvent: PointerEvent) => {
      if (movePointerIdRef.current !== moveEvent.pointerId) return;

      if (
        Math.abs(moveEvent.clientY - moveStartClientYRef.current) > DRAG_THRESHOLD_PX ||
        Math.abs(moveEvent.clientX - moveStartClientXRef.current) > DRAG_THRESHOLD_PX
      ) {
        moveMovedRef.current = true;
      }

      updateDragMovePosition(moveEvent.clientX, moveEvent.clientY);
    };

    const onUp = (upEvent: PointerEvent) => {
      void finishMoveAppointmentFromWindow(upEvent);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    moveListenersRef.current = { onMove, onUp };
  }

  useEffect(() => () => cleanupMoveListeners(), []);

  function renderDayHeaders() {
    return (
      <div
        className="grid border-b border-app-border/40"
        style={{ gridTemplateColumns }}
      >
        <div />
        {visibleDays.map((day) => {
          const dateString = toDateString(day);
          const isToday = dateString === todayString;

          return (
            <div
              key={dateString}
              className="flex min-h-9 items-center justify-center border-l border-app-border/30 px-2 py-2"
            >
              {isToday ? (
                <span className="inline-flex items-center justify-center whitespace-nowrap rounded-full bg-app-accent px-2.5 py-1 text-[11px] font-semibold uppercase leading-none text-white">
                  {formatDayHeader(day)} {day.getDate()}
                </span>
              ) : (
                <p className="text-xs uppercase leading-none text-app-muted">
                  {formatDayHeader(day)} {day.getDate()}
                </p>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  function appointmentsForDay(date: string) {
    return visibleEvents.filter((event) => {
      if (event.source !== "appointment") return false;
      if (event.startAt) {
        return toDateString(new Date(event.startAt)) === date;
      }
      return isDateInRange(date, event.date, event.endDate);
    });
  }

  function renderCollapsedTimedRow() {
    if (expanded) return null;

    const items = visibleDays.flatMap((day) => {
      const dateString = toDateString(day);
      return appointmentsForDay(dateString).map((event) => ({
        ...event,
        dateString,
        appointmentId: event.id.replace(/^appointment-/, ""),
      }));
    });

    return (
      <div
        className="grid border-b border-app-border/40 bg-app-surface-muted/40"
        style={{ gridTemplateColumns }}
      >
        <div className="space-y-1 border-r border-app-border/30 px-1.5 py-2">
          <p className="px-0.5 text-[10px] text-app-subtle">afspraken</p>
          {items.length === 0 ? (
            <span className="px-0.5 text-[10px] text-app-subtle">Geen afspraken</span>
          ) : (
            items.map((event) => (
              <button
                key={`${event.id}-${event.dateString}`}
                type="button"
                onClick={(clickEvent) => {
                  clickEvent.stopPropagation();
                  navigateToDate(
                    event.dateString,
                    event.startAt,
                    event.appointmentId,
                  );
                }}
                className="coach-calendar-appointment flex w-full max-w-[52px] flex-col items-start gap-0.5 rounded-md px-1.5 py-1 text-left app-focus-ring"
                title={event.title}
              >
                <span className="line-clamp-2 text-[9px] font-semibold leading-tight text-white">
                  {event.title}
                </span>
                {event.startAt && !event.allDay ? (
                  <span className="text-[8px] font-normal text-emerald-100">
                    {new Date(event.startAt).toLocaleTimeString("nl-NL", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                ) : null}
              </button>
            ))
          )}
        </div>
        {visibleDays.map((day) => (
          <div
            key={`appt-spacer-${toDateString(day)}`}
            className="min-h-[40px] border-l border-app-border/30"
          />
        ))}
      </div>
    );
  }

  function renderAllDayRow() {
    return (
      <div
        className="grid border-b border-app-border/40"
        style={{ gridTemplateColumns }}
      >
        <div className="px-2 py-1.5 text-[10px] text-app-subtle">hele dag</div>
        {visibleDays.map((day) => {
          const dateString = toDateString(day);
          const dayEvents = eventsForDay(dateString).filter(
            (event) => event.source !== "appointment",
          );

          return (
            <div
              key={`allday-${dateString}`}
              className="min-h-[36px] space-y-1 border-l border-app-border/30 p-1.5"
            >
              {!expanded && dayEvents.length > 1 ? (
                <div className="truncate rounded-full bg-app-surface-hover px-2 py-0.5 text-[10px] font-medium text-app-muted">
                  {dayEvents.length} activiteiten
                </div>
              ) : (
                dayEvents.map((event) => (
                  <div
                    key={event.id}
                    className={`truncate rounded-md px-2 py-1 text-[11px] font-medium ${event.color}`}
                    title={event.subtitle}
                  >
                    {event.title}
                  </div>
                ))
              )}
            </div>
          );
        })}
      </div>
    );
  }

  function renderAppointmentBlock(block: TimedAppointmentBlock, dayIndex: number) {
    const isMoving = dragMove?.appointmentId === block.appointmentId;
    const isHighlighted = highlightedAppointmentId === block.appointmentId;
    const displayDayIndex = isMoving ? dragMove.dayIndex : dayIndex;
    const displayStartHour = isMoving ? dragMove.startHour : block.startHour;
    const displayEndHour = isMoving ? dragMove.endHour : block.endHour;
    const positionStyle = getOverlappingBlockStyle(
      displayDayIndex,
      dayCount,
      block.column,
      block.totalColumns,
    );

    return (
      <div
        key={block.id}
        className={`absolute touch-none overflow-hidden rounded-lg px-1.5 py-1 text-[11px] font-medium ${block.color} ${
          isMoving
            ? "z-40 scale-[1.02] opacity-95 shadow-lg ring-2 ring-white/80 transition-none"
            : isHighlighted
              ? "z-30 shadow-lg ring-2 ring-yellow-300 ring-offset-2 ring-offset-app-bg animate-pulse"
              : "z-20 cursor-grab active:cursor-grabbing"
        }`}
        style={{
          ...positionStyle,
          top: displayStartHour * HOUR_HEIGHT,
          height: Math.max(20, (displayEndHour - displayStartHour) * HOUR_HEIGHT),
          willChange: isMoving ? "top, left, width, height" : undefined,
        }}
        title={block.title}
        onPointerDown={(event) => handleMovePointerDown(event, block, dayIndex)}
      >
        {block.title}
      </div>
    );
  }

  function renderTimeGrid() {
    return (
      <div
        ref={gridContainerRef}
        className="relative grid"
        style={{ gridTemplateColumns, height: gridHeight }}
      >
        {ALL_HOURS.map((hour) => (
          <div key={hour} className="contents">
            <div
              className="border-t border-app-border/30 px-2 text-[11px] text-app-subtle"
              style={{ height: HOUR_HEIGHT }}
            >
              {String(hour).padStart(2, "0")}:00
            </div>
            {visibleDays.map((day) => {
              const dateString = toDateString(day);

              return (
                <div
                  key={`${hour}-${dateString}`}
                  className="border-l border-t border-app-border/25"
                  style={{ height: HOUR_HEIGHT }}
                  onDoubleClick={(event) => {
                    event.stopPropagation();
                    handleSlotDoubleClick(dateString, hour);
                  }}
                />
              );
            })}
          </div>
        ))}

        {expanded &&
          visibleDays.map((day, dayIndex) => {
            const dateString = toDateString(day);

            return (
              <div
                key={`drag-${dateString}`}
                className="absolute top-0 z-[5] cursor-cell touch-none"
                style={{
                  ...getDayColumnStyle(dayIndex, dayCount),
                  height: gridHeight,
                }}
                onPointerDown={(event) =>
                  handleDragPointerDown(event, dateString, dayIndex)
                }
                onPointerMove={handleDragPointerMove}
                onPointerUp={finishDragCreate}
                onPointerCancel={finishDragCreate}
              />
            );
          })}

        {timedBlocks.map((block) => {
          const dayIndex = visibleDays.findIndex(
            (day) => toDateString(day) === block.date,
          );
          if (dayIndex === -1) return null;

          return renderAppointmentBlock(block, dayIndex);
        })}

        {dragCreate && dragCreateMoved && (
          <div
            className="pointer-events-none absolute z-30 overflow-hidden rounded-md border-2 border-blue-500 bg-blue-400/30"
            style={{
              ...getDayColumnStyle(dragCreate.dayIndex, dayCount),
              top: dragCreate.startHour * HOUR_HEIGHT,
              height: Math.max(
                12,
                (dragCreate.endHour - dragCreate.startHour) * HOUR_HEIGHT,
              ),
            }}
          />
        )}

        {todayDayIndex >= 0 && (
          <div
            className="pointer-events-none absolute z-50 border-t-2 border-red-500"
            style={{
              ...getDayColumnStyle(todayDayIndex, dayCount),
              top: currentHour * HOUR_HEIGHT,
            }}
          >
            <span className="absolute -left-12 -top-3 rounded bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
              {now.toLocaleTimeString("nl-NL", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        )}
      </div>
    );
  }

  const isExpanded = forceExpanded || expanded;
  const minGridWidth = isExpanded ? 720 : 380;
  const timeGridMaxHeight = fullPage
    ? "calc(100dvh - 12.5rem)"
    : `${COLLAPSED_VIEW_HEIGHT}px`;
  const shellClass = fullPage
    ? "agenda-calendar-full"
    : embedded
      ? "ui-panel-calendar"
      : "ui-card !p-0 overflow-hidden";

  return (
    <>
      <div ref={calendarLayoutRef} className={fullPage ? "flex min-h-0 flex-1 flex-col" : undefined}>
        <div
          ref={calendarCardRef}
          role={forceExpanded ? undefined : "button"}
          tabIndex={forceExpanded ? undefined : 0}
          onClick={forceExpanded ? undefined : handleCardClick}
          onKeyDown={
            forceExpanded
              ? undefined
              : (event) => {
                  if (!isExpanded && (event.key === "Enter" || event.key === " ")) {
                    event.preventDefault();
                    setScrollToHour(currentHour);
                    setExpanded(true);
                  }
                }
          }
          className={`${shellClass} ${fullPage ? "min-h-0 flex-1" : ""} ${!isExpanded && !forceExpanded ? "cursor-pointer" : ""}`}
        >
          {!fullPage ? (
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 md:px-5">
            <div>
              <h2 className="text-[15px] font-semibold capitalize tracking-tight text-app-text">
                {formatMonthYear(isExpanded ? weekStart : new Date())}
              </h2>
              <p className="mt-0.5 text-[12px] font-normal text-app-muted">
                {compact
                  ? "Komende afspraken"
                  : isExpanded
                    ? "Weekoverzicht"
                    : "Komende 3 dagen"}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  ensureExpanded();
                  openAppointmentModal(new Date());
                }}
                className="ui-btn-secondary !h-9 !w-9 !p-0 text-lg"
                title="Nieuwe afspraak"
              >
                +
              </button>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  ensureExpanded();
                  setWeekStart((current) => addDays(current, -7));
                }}
                className="ui-btn-secondary !px-3 !py-2 text-sm"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  ensureExpanded();
                  setWeekStart(getMonday(new Date()));
                }}
                className="ui-btn-secondary !px-3 !py-2 text-sm"
              >
                Vandaag
              </button>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  ensureExpanded();
                  setWeekStart((current) => addDays(current, 7));
                }}
                className="ui-btn-secondary !px-3 !py-2 text-sm"
              >
                ›
              </button>
            </div>
          </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-app-border px-1 py-2 md:px-2">
              <h2 className="text-sm font-medium capitalize text-app-text">
                {formatMonthYear(weekStart)}
              </h2>
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setWeekStart((current) => addDays(current, -7))}
                  className="ui-btn-secondary !px-3 !py-1.5 text-sm"
                >
                  ‹
                </button>
                <button
                  type="button"
                  onClick={() => setWeekStart(getMonday(new Date()))}
                  className="ui-btn-secondary !px-3 !py-1.5 text-sm"
                >
                  Vandaag
                </button>
                <button
                  type="button"
                  onClick={() => setWeekStart((current) => addDays(current, 7))}
                  className="ui-btn-secondary !px-3 !py-1.5 text-sm"
                >
                  ›
                </button>
              </div>
            </div>
          )}

          <div className={`overflow-x-auto ${fullPage ? "flex min-h-0 flex-1 flex-col" : ""}`}>
            <div
              className={fullPage ? "flex min-h-0 flex-1 flex-col" : ""}
              style={{ minWidth: minGridWidth }}
            >
              {renderDayHeaders()}
              {renderAllDayRow()}

              {isExpanded ? (
                <div
                  ref={timeGridScrollRef}
                  className={`relative overscroll-y-contain bg-app-bg/20 ${
                    fullPage ? "min-h-0 flex-1 overflow-y-auto" : "overflow-y-auto"
                  }`}
                  style={fullPage ? undefined : { maxHeight: timeGridMaxHeight }}
                >
                  {renderTimeGrid()}
                </div>
              ) : (
                <div
                  ref={collapsedContainerRef}
                  className="coach-calendar-collapsed-scroll relative bg-app-bg/40"
                  style={{
                    height: collapsedViewHeight,
                  }}
                >
                  <div>{renderTimeGrid()}</div>
                </div>
              )}
            </div>
          </div>

          {loading && (
            <p className="px-4 py-2.5 text-[12px] font-normal text-app-muted md:px-5">
              Agenda laden...
            </p>
          )}
        </div>
      </div>

      <CoachAppointmentModal
        open={appointmentModalOpen}
        draft={appointmentDraft}
        onClose={() => setAppointmentModalOpen(false)}
        onSaved={handleAppointmentSaved}
      />
    </>
  );
}
