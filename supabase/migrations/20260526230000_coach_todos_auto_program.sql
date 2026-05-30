alter table public.coach_todos
  add column if not exists athlete_id uuid references public.profiles(id) on delete set null,
  add column if not exists auto_key text,
  add column if not exists kind text not null default 'manual';

create unique index if not exists coach_todos_coach_auto_key_idx
  on public.coach_todos (coach_id, auto_key)
  where auto_key is not null;
