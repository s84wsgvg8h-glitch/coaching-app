-- Exercise format (superset, AMRAP, rest) + quick bodyweight logs

alter table public.program_exercises
  add column if not exists exercise_format text not null default 'normal',
  add column if not exists superset_group text,
  add column if not exists rest_seconds integer;

create index if not exists program_exercises_superset_idx
  on public.program_exercises (program_day_id, superset_group)
  where superset_group is not null;

create table if not exists public.athlete_bw_logs (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.profiles(id) on delete cascade,
  bw numeric not null check (bw > 0 and bw < 500),
  note text,
  logged_at timestamptz not null default now()
);

create index if not exists athlete_bw_logs_athlete_idx
  on public.athlete_bw_logs (athlete_id, logged_at desc);

alter table public.athlete_bw_logs enable row level security;

drop policy if exists "athlete_bw_logs_own" on public.athlete_bw_logs;
create policy "athlete_bw_logs_own"
  on public.athlete_bw_logs for all
  using (
    auth.uid() = athlete_id
    or exists (
      select 1 from public.profiles p
      where p.id = athlete_bw_logs.athlete_id and p.coach_id = auth.uid()
    )
  )
  with check (
    auth.uid() = athlete_id
    or exists (
      select 1 from public.profiles p
      where p.id = athlete_bw_logs.athlete_id and p.coach_id = auth.uid()
    )
  );
