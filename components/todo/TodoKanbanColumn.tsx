"use client";

import { Footprints, MoreVertical } from "lucide-react";
import type { ReactNode } from "react";
import type { CoachTodoKanbanStatus } from "@/lib/coachTodos";

type TodoKanbanColumnProps = {
  status: CoachTodoKanbanStatus;
  label: string;
  count: number;
  icon: ReactNode;
  children: ReactNode;
  showDoingMotivation?: boolean;
  countBump?: boolean;
  onDragOver?: (event: React.DragEvent) => void;
  onDrop?: (event: React.DragEvent) => void;
};

export default function TodoKanbanColumn({
  status,
  label,
  count,
  icon,
  children,
  showDoingMotivation = false,
  countBump = false,
  onDragOver,
  onDrop,
}: TodoKanbanColumnProps) {
  return (
    <section
      className="todo-kanban-column"
      data-status={status}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <header className="todo-kanban-column-header">
        <div className="flex min-w-0 items-center gap-2">
          <span className="todo-kanban-column-icon">{icon}</span>
          <h2 className="text-[13px] font-semibold text-app-text">{label}</h2>
          <span
            className={`todo-kanban-count ${countBump ? "is-bumping" : ""}`}
          >
            {count}
          </span>
        </div>
        <button
          type="button"
          className="todo-kanban-menu-btn"
          aria-label={`${label} opties`}
        >
          <MoreVertical className="h-4 w-4" />
        </button>
      </header>

      <div className="todo-kanban-column-body">
        {children}

        {showDoingMotivation ? (
          <div className="todo-kanban-doing-motivation">
            <div className="todo-kanban-doing-glow" aria-hidden="true">
              <div className="todo-kanban-doing-glow-ring todo-kanban-doing-glow-ring-outer" />
              <div className="todo-kanban-doing-glow-ring todo-kanban-doing-glow-ring-inner" />
              <div className="todo-kanban-doing-glow-icon">
                <Footprints className="h-7 w-7 text-sky-300" />
              </div>
            </div>
            <p className="mt-4 text-[14px] font-semibold text-white">Goed bezig!</p>
            <p className="mt-1 max-w-[200px] text-center text-[12px] leading-relaxed text-app-muted">
              Taken die je gaat doen, verschijnen hier.
            </p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
