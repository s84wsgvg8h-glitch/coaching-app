"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { CoachTodo } from "@/lib/coachTodos";
import { getTodoNavHint, resolveTodoHref } from "@/lib/todoNavigation";
import TaskCompleteCheckbox from "@/components/todo/TaskCompleteCheckbox";

type TodoKanbanCardProps = {
  todo: CoachTodo;
  coachId: string;
  athleteName?: string | null;
  onToggle: () => void;
  draggable?: boolean;
  onDragStart?: (event: React.DragEvent) => void;
  isCompleting?: boolean;
  isEnteringDone?: boolean;
  reducedMotion?: boolean;
  toggleDisabled?: boolean;
};

function displayAthleteLabel(todo: CoachTodo, athleteName?: string | null) {
  if (athleteName?.trim()) return athleteName.trim();
  const match = todo.title.match(/\bvoor\s+(.+)$/i);
  if (match?.[1]) return match[1].trim();
  return todo.title.split(" ")[0] || "Taak";
}

function initialsFromLabel(label: string) {
  return label
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function TodoKanbanCard({
  todo,
  coachId,
  athleteName,
  onToggle,
  draggable = false,
  onDragStart,
  isCompleting = false,
  isEnteringDone = false,
  reducedMotion = false,
  toggleDisabled = false,
}: TodoKanbanCardProps) {
  const router = useRouter();
  const [navigating, setNavigating] = useState(false);
  const isAuto = Boolean(todo.auto_key || todo.kind !== "manual");
  const isDone = todo.completed;
  const showDoneStyle = isDone || isCompleting;
  const label = displayAthleteLabel(todo, athleteName);
  const navHint = getTodoNavHint(todo);

  async function handleNavigate() {
    if (showDoneStyle || navigating || !navHint || isCompleting) return;
    setNavigating(true);
    const href = await resolveTodoHref(todo, coachId);
    setNavigating(false);
    if (href) router.push(href);
  }

  return (
    <div
      className={[
        "todo-kanban-card group",
        !showDoneStyle && navHint ? "cursor-pointer" : "",
        isCompleting ? "is-completing" : "",
        isEnteringDone ? "is-entering-done" : "",
        reducedMotion ? "is-reduced-motion" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      draggable={draggable && !isCompleting}
      onDragStart={onDragStart}
      onClick={() => void handleNavigate()}
      onKeyDown={(event) => {
        if (
          (event.key === "Enter" || event.key === " ") &&
          !showDoneStyle &&
          navHint &&
          !isCompleting
        ) {
          event.preventDefault();
          void handleNavigate();
        }
      }}
      role={!showDoneStyle && navHint ? "button" : undefined}
      tabIndex={!showDoneStyle && navHint ? 0 : undefined}
    >
      <div className="todo-kanban-avatar" aria-hidden="true">
        {initialsFromLabel(label)}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[12px] font-medium text-white/90">{label}</span>
          {isAuto ? <span className="todo-kanban-auto-badge">Auto</span> : null}
        </div>
        <p
          className={`mt-0.5 text-[12px] leading-snug ${
            showDoneStyle ? "text-app-muted line-through" : "text-app-muted"
          }`}
        >
          {todo.title}
        </p>
      </div>

      <TaskCompleteCheckbox
        checked={isDone}
        isAnimating={isCompleting}
        reducedMotion={reducedMotion}
        disabled={toggleDisabled || isCompleting}
        onToggle={onToggle}
      />
    </div>
  );
}
