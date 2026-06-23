alter table public.coach_todos
  add column if not exists due_at timestamptz;

create index if not exists coach_todos_coach_due_idx
  on public.coach_todos (coach_id, due_at)
  where due_at is not null and completed = false;
