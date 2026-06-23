export function isCoachTodoDueToday(dueAt: string | null | undefined) {
  if (!dueAt) return false;

  const due = new Date(dueAt);
  const today = new Date();
  if (Number.isNaN(due.getTime())) return false;

  due.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  return due.getTime() === today.getTime();
}

export function countCoachTodosDueToday(
  todos: Array<{ completed?: boolean; due_at?: string | null }>,
) {
  return todos.filter(
    (todo) => !todo.completed && isCoachTodoDueToday(todo.due_at),
  ).length;
}
