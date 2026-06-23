import type { CoachTodo } from "@/lib/coachTodos";

const ONE_HOUR_MS = 60 * 60 * 1000;
const GRADIENT_WINDOW_MS = 24 * ONE_HOUR_MS;

export type TodoDueStyle = {
  borderClass: string;
  bgClass: string;
  indicatorClass: string | null;
};

export function getTodoDueStyle(todo: CoachTodo, nowMs = Date.now()): TodoDueStyle {
  const base: TodoDueStyle = {
    borderClass: "border-app-border",
    bgClass: "bg-app-surface",
    indicatorClass: null,
  };

  if (todo.completed || !todo.due_at) {
    return base;
  }

  const dueMs = new Date(todo.due_at).getTime();
  const remainingMs = dueMs - nowMs;

  if (remainingMs <= ONE_HOUR_MS) {
    return {
      ...base,
      indicatorClass: "bg-red-500",
    };
  }

  const progress = Math.min(
    1,
    Math.max(0, 1 - remainingMs / GRADIENT_WINDOW_MS),
  );

  if (progress < 0.35) {
    return {
      ...base,
      indicatorClass: "bg-emerald-500",
    };
  }

  if (progress < 0.7) {
    return {
      ...base,
      indicatorClass: "bg-amber-400",
    };
  }

  return {
    ...base,
    indicatorClass: "bg-orange-500",
  };
}

export function formatTodoDueAt(dueAt: string | null | undefined) {
  if (!dueAt) return "";
  const date = new Date(dueAt);
  if (Number.isNaN(date.getTime())) return "";

  const hasTime =
    date.getHours() !== 0 ||
    date.getMinutes() !== 0 ||
    date.getSeconds() !== 0;

  if (hasTime) {
    return date.toLocaleString("nl-NL", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return date.toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function toDatetimeLocalValue(date: Date) {
  const copy = new Date(date);
  copy.setMinutes(copy.getMinutes() - copy.getTimezoneOffset());
  return copy.toISOString().slice(0, 16);
}
