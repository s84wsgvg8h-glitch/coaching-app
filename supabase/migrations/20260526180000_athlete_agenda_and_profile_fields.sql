alter table public.profiles
  add column if not exists business_name text;

create table if not exists public.athlete_calendar_events (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles(id) on delete cascade,
  athlete_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  notes text,
  start_at timestamptz not null,
  end_at timestamptz not null,
  all_day boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists athlete_calendar_events_athlete_idx
  on public.athlete_calendar_events (athlete_id, start_at);

create index if not exists athlete_calendar_events_coach_idx
  on public.athlete_calendar_events (coach_id, start_at);

alter table public.athlete_calendar_events enable row level security;

drop policy if exists "athlete_calendar_events_coach_all" on public.athlete_calendar_events;
create policy "athlete_calendar_events_coach_all"
  on public.athlete_calendar_events for all
  using (
    coach_id = auth.uid()
    and exists (
      select 1 from public.profiles athlete
      where athlete.id = athlete_calendar_events.athlete_id
        and athlete.coach_id = auth.uid()
    )
  )
  with check (
    coach_id = auth.uid()
    and exists (
      select 1 from public.profiles athlete
      where athlete.id = athlete_calendar_events.athlete_id
        and athlete.coach_id = auth.uid()
    )
  );

drop policy if exists "athlete_calendar_events_athlete_select" on public.athlete_calendar_events;
create policy "athlete_calendar_events_athlete_select"
  on public.athlete_calendar_events for select
  using (athlete_id = auth.uid());

drop policy if exists "athlete_calendar_events_admin_all" on public.athlete_calendar_events;
create policy "athlete_calendar_events_admin_all"
  on public.athlete_calendar_events for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "profiles_update_admin" on public.profiles;
create policy "profiles_update_admin"
  on public.profiles for update
  using (public.is_admin())
  with check (public.is_admin());
