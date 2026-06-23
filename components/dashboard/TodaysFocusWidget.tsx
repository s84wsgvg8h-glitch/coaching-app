"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import EmptyState from "@/components/ui/EmptyState";
import {
  loadCoachCalendarEvents,
  type CoachCalendarEvent,
} from "@/lib/coachCalendarEvents";
import {
  filterTodayAppointments,
  formatAgendaTime,
  formatAgendaTimeRange,
} from "@/lib/coachAgendaDisplay";
import {
  loadCoachTodosFast,
  toggleCoachTodo,
  type CoachTodo,
  type CoachTodoKanbanStatus,
} from "@/lib/coachTodos";
import { getTodoDueStyle } from "@/lib/todoDueStyle";
import { resolveTodoHref } from "@/lib/todoNavigation";

type TodaysFocusWidgetProps = {
  coachId: string;
  athletes?: Array<{ id: string; full_name: string | null }>;
};

function resolveKanbanStatus(todo: CoachTodo): CoachTodoKanbanStatus {
  if (todo.kanban_status) return todo.kanban_status;
  return todo.completed ? "done" : "todo";
}

function sortOpenTodos(items: CoachTodo[]) {
  return [...items]
    .filter((todo) => !todo.completed && resolveKanbanStatus(todo) !== "done")
    .sort((a, b) => {
      if (a.due_at && b.due_at) return a.due_at.localeCompare(b.due_at);
      if (a.due_at) return -1;
      if (b.due_at) return 1;
      return b.created_at.localeCompare(a.created_at);
    });
}

export default function TodaysFocusWidget({
  coachId,
  athletes = [],
}: TodaysFocusWidgetProps) {
  const router = useRouter();
  const [todos, setTodos] = useState<CoachTodo[]>([]);
  const [appointments, setAppointments] = useState<CoachCalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [navigatingId, setNavigatingId] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  const athleteNameById = useMemo(
    () =>
      Object.fromEntries(
        athletes.map((athlete) => [athlete.id, athlete.full_name || "Atleet"]),
      ),
    [athletes],
  );

  const todayAppointments = useMemo(
    () => filterTodayAppointments(appointments),
    [appointments],
  );

  const openTodos = useMemo(() => sortOpenTodos(todos).slice(0, 8), [todos]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      const [todoResult, appointmentRows] = await Promise.all([
        loadCoachTodosFast(coachId),
        loadCoachCalendarEvents(coachId),
      ]);
      if (!cancelled) {
        setTodos(todoResult.data);
        setAppointments(appointmentRows);
        setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [coachId]);

  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  async function handleToggle(todo: CoachTodo) {
    if (togglingId) return;
    setTogglingId(todo.id);
    const { data, error } = await toggleCoachTodo(todo);
    if (data && !error) {
      setTodos((current) =>
        current.map((item) => (item.id === data.id ? data : item)),
      );
    }
    setTogglingId(null);
  }

  async function handleOpenTodo(todo: CoachTodo) {
    if (todo.completed || navigatingId) return;
    setNavigatingId(todo.id);
    const href = await resolveTodoHref(todo, coachId);
    setNavigatingId(null);
    if (href) router.push(href);
  }

  return (
    <section className="dashboard-focus-panel glass-accent-card">
      <div className="dashboard-focus-panel-header">
        <div className="min-w-0">
          <p className="text-[8px] font-medium uppercase tracking-wide text-app-subtle">
            Focus vandaag
          </p>
          <p className="mt-0.5 text-[11px] font-medium text-app-muted">
            {todayAppointments.length} afspraken · {openTodos.length} taken
          </p>
        </div>
        <Link
          href="/todo"
          className="shrink-0 text-[10px] font-medium text-app-accent hover:underline"
        >
          Alle taken
        </Link>
      </div>

      {loading ? (
        <p className="dashboard-focus-panel-empty text-[11px] text-app-muted">
          Laden...
        </p>
      ) : (
        <div className="dashboard-focus-panel-body">
          <div className="dashboard-focus-appointments">
            <p className="dashboard-focus-section-label">Afspraken vandaag</p>
            {todayAppointments.length === 0 ? (
              <p className="text-[11px] text-app-muted">Geen afspraken vandaag.</p>
            ) : (
              <ul className="dashboard-focus-appointment-list">
                {todayAppointments.map((appointment) => (
                  <li key={appointment.id}>
                    <Link
                      href="/agenda"
                      className="dashboard-focus-appointment-row app-focus-ring"
                    >
                      <span className="shrink-0 text-[10px] font-semibold tabular-nums text-app-accent">
                        {appointment.all_day
                          ? "Hele dag"
                          : formatAgendaTime(appointment.start_at)}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[11px] font-medium text-app-text">
                        {appointment.title}
                      </span>
                      {!appointment.all_day ? (
                        <span className="hidden shrink-0 text-[10px] text-app-muted sm:inline">
                          {formatAgendaTimeRange(
                            appointment.start_at,
                            appointment.end_at,
                          )}
                        </span>
                      ) : null}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="dashboard-focus-todos">
            <p className="dashboard-focus-section-label">Taken</p>
            {openTodos.length === 0 ? (
              <div className="py-2">
                <EmptyState
                  title="Alles bij"
                  description="Geen open taken."
                  compact
                />
              </div>
            ) : (
              <ul className="dashboard-focus-panel-list">
                {openTodos.map((todo) => {
                  const dueStyle = getTodoDueStyle(todo, nowMs);
                  const athleteName = todo.athlete_id
                    ? athleteNameById[todo.athlete_id]
                    : null;

                  return (
                    <li key={todo.id}>
                      <div
                        className={`dashboard-focus-check-row ${dueStyle.bgClass} ${dueStyle.borderClass} ${
                          navigatingId === todo.id ? "opacity-70" : "cursor-pointer"
                        }`}
                        onClick={() => void handleOpenTodo(todo)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            void handleOpenTodo(todo);
                          }
                        }}
                        role="button"
                        tabIndex={0}
                      >
                        {dueStyle.indicatorClass ? (
                          <span
                            className={`dashboard-focus-check-urgency ${dueStyle.indicatorClass}`}
                            aria-hidden="true"
                          />
                        ) : (
                          <span
                            className="dashboard-focus-check-urgency dashboard-focus-check-urgency-empty"
                            aria-hidden="true"
                          />
                        )}
                        <input
                          type="checkbox"
                          checked={todo.completed}
                          disabled={togglingId === todo.id}
                          onClick={(event) => event.stopPropagation()}
                          onChange={() => void handleToggle(todo)}
                          className="ui-todo-checkbox app-focus-ring"
                          aria-label={`Taak afvinken: ${todo.title}`}
                        />
                        <span className="min-w-0 flex-1">
                          {athleteName ? (
                            <span className="block truncate text-[9px] font-medium uppercase tracking-wide text-app-subtle">
                              {athleteName}
                            </span>
                          ) : null}
                          <span className="block truncate text-[11px] font-medium leading-4 text-app-text">
                            {todo.title}
                          </span>
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
