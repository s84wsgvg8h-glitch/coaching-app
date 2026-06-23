alter table public.coach_todos
  add column if not exists kanban_status text not null default 'todo'
  check (kanban_status in ('todo', 'doing', 'done'));

update public.coach_todos
set kanban_status = 'done'
where completed = true;

create index if not exists coach_todos_coach_kanban_idx
  on public.coach_todos (coach_id, kanban_status, completed);
