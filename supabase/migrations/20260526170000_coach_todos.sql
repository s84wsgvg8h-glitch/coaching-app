create table if not exists public.coach_todos (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists coach_todos_coach_created_idx
  on public.coach_todos (coach_id, created_at desc);

alter table public.coach_todos enable row level security;

drop policy if exists "coach_todos_coach_all" on public.coach_todos;
create policy "coach_todos_coach_all"
  on public.coach_todos for all
  using (
    coach_id = auth.uid()
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('coach', 'admin')
    )
  )
  with check (
    coach_id = auth.uid()
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('coach', 'admin')
    )
  );
