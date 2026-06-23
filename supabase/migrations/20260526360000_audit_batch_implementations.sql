-- Audit batch: indexes, push subscriptions, RLS hardening

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null,
  p256dh text,
  auth text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, endpoint)
);

create index if not exists push_subscriptions_user_idx
  on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

drop policy if exists "push_subscriptions_own" on public.push_subscriptions;
create policy "push_subscriptions_own"
  on public.push_subscriptions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Performance indexes
create index if not exists messages_receiver_created_idx
  on public.messages (receiver_id, created_at desc);

create index if not exists athlete_exercise_sets_athlete_created_idx
  on public.athlete_exercise_sets (athlete_id, created_at desc);

create index if not exists profiles_role_coach_idx
  on public.profiles (role, coach_id);

create index if not exists program_exercises_day_idx
  on public.program_exercises (program_day_id);

create index if not exists program_days_week_idx
  on public.program_days (program_week_id);

create index if not exists scheduled_broadcasts_due_idx
  on public.scheduled_chat_broadcasts (coach_id, scheduled_at)
  where sent_at is null;

-- Legacy tables RLS (enable if missing)
do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'athlete_day_checkins',
    'athlete_exercise_notes',
    'athlete_exercise_videos',
    'athlete_exercise_sets'
  ]
  loop
    execute format('alter table public.%I enable row level security', tbl);
  end loop;
end $$;

-- Athlete sets: athlete own + coach of athlete
drop policy if exists "athlete_exercise_sets_athlete_rw" on public.athlete_exercise_sets;
create policy "athlete_exercise_sets_athlete_rw"
  on public.athlete_exercise_sets for all
  using (
    auth.uid() = athlete_id
    or exists (
      select 1 from public.profiles p
      where p.id = athlete_exercise_sets.athlete_id
        and p.coach_id = auth.uid()
    )
  )
  with check (
    auth.uid() = athlete_id
    or exists (
      select 1 from public.profiles p
      where p.id = athlete_exercise_sets.athlete_id
        and p.coach_id = auth.uid()
    )
  );

-- Intensity typed column on program_exercises
alter table public.program_exercises
  add column if not exists intensity_type text;

update public.program_exercises
set intensity_type = case
  when rpe is not null and rpe <> '' then 'rpe'
  when load ilike '%\%%' escape '\' then 'percent'
  when load ilike '%kg%' then 'kg'
  else 'rpe'
end
where intensity_type is null;
