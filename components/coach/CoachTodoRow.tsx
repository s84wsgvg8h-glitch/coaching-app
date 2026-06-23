"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronRight, X } from "lucide-react";
import { type CoachTodo } from "@/lib/coachTodos";
import { getTodoDueStyle } from "@/lib/todoDueStyle";
import { formatTodoDeadlineLabel } from "@/lib/todoTitleParser";
import { getTodoNavHint, resolveTodoHref } from "@/lib/todoNavigation";

type CoachTodoRowProps = {
  todo: CoachTodo;
  coachId: string;
  onToggle: () => void;
  onDelete: () => void;
  onUpdated?: (todo: CoachTodo) => void;
  showDueEditor?: boolean;
  athleteName?: string | null;
};

export default function CoachTodoRow({
  todo,
  coachId,
  onToggle,
  onDelete,
  athleteName,
}: CoachTodoRowProps) {
  const router = useRouter();
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [navigating, setNavigating] = useState(false);
  const dueStyle = getTodoDueStyle(todo, nowMs);
  const isAuto = Boolean(todo.auto_key || todo.kind !== "manual");
  const deadlineLabel = formatTodoDeadlineLabel(todo.due_at);
  const navHint = getTodoNavHint(todo);

  useEffect(() => {
    if (todo.completed || !todo.due_at) return;
    const timer = window.setInterval(() => setNowMs(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, [todo.completed, todo.due_at]);

  async function handleNavigate() {
    if (todo.completed || navigating) return;
    setNavigating(true);
    const href = await resolveTodoHref(todo, coachId);
    setNavigating(false);
    if (href) router.push(href);
  }

  const initials = athleteName
    ? athleteName
        .split(" ")
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : null;

  return (
    <div
      className={`ui-todo-row group ${dueStyle.bgClass} ${dueStyle.borderClass} ${
        !todo.completed && navHint ? "cursor-pointer" : ""
      }`}
      onClick={() => void handleNavigate()}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          void handleNavigate();
        }
      }}
      role={!todo.completed && navHint ? "button" : undefined}
      tabIndex={!todo.completed && navHint ? 0 : undefined}
    >
      {dueStyle.indicatorClass ? (
        <span
          className={`ui-todo-urgency ${dueStyle.indicatorClass}`}
          aria-hidden="true"
        />
      ) : (
        <span className="ui-todo-urgency ui-todo-urgency-empty" aria-hidden="true" />
      )}

      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onDelete();
        }}
        disabled={isAuto && todo.kind === "program_needed"}
        className="ui-todo-delete app-focus-ring"
        aria-label="Taak verwijderen"
      >
        <X className="h-3.5 w-3.5" />
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          {todo.athlete_id && initials ? (
            <Link
              href={`/athletes/${todo.athlete_id}`}
              onClick={(event) => event.stopPropagation()}
              className="ui-todo-athlete-link app-focus-ring"
            >
              <span className="ui-todo-avatar">{initials}</span>
              {athleteName}
            </Link>
          ) : null}
          {isAuto ? <span className="ui-badge ui-badge-warning">Auto</span> : null}
        </div>
        <p
          className={`mt-1 text-[13px] leading-5 ${
            todo.completed
              ? "text-app-muted line-through"
              : "font-medium text-app-text"
          }`}
        >
          {todo.title}
        </p>
        {deadlineLabel && !todo.completed ? (
          <p className="mt-0.5 text-[11px] font-medium text-app-subtle">
            Deadline {deadlineLabel}
          </p>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center gap-1">
        {!todo.completed && navHint ? (
          <ChevronRight className="h-4 w-4 text-app-subtle opacity-0 transition group-hover:opacity-100" />
        ) : null}
        <input
          type="checkbox"
          checked={todo.completed}
          onClick={(event) => event.stopPropagation()}
          onChange={onToggle}
          className="ui-todo-checkbox app-focus-ring"
          aria-label="Taak afvinken"
        />
      </div>
    </div>
  );
}
