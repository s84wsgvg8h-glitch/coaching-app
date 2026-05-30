create table if not exists public.coach_calendar_events (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles(id) on delete cascade,
  event_type text not null default 'activity' check (event_type in ('activity', 'reminder')),
  title text not null,
  location text,
  video_url text,
  start_at timestamptz not null,
  end_at timestamptz not null,
  all_day boolean not null default false,
  invitees text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists coach_calendar_events_coach_start_idx
  on public.coach_calendar_events (coach_id, start_at);

alter table public.coach_calendar_events enable row level security;

drop policy if exists "coach_calendar_events_coach_all" on public.coach_calendar_events;
create policy "coach_calendar_events_coach_all"
  on public.coach_calendar_events for all
  using (
    coach_id = auth.uid()
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'coach'
    )
  )
  with check (
    coach_id = auth.uid()
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'coach'
    )
  );
