-- Feature batch May: profiles extensions, broadcasts, video reviews, meet plans, alerts

alter table public.profiles
  add column if not exists coach_dashboard_layout jsonb,
  add column if not exists bodyweight_goal_kg numeric,
  add column if not exists bodyweight_goal_date date;

do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'limitless_athletes'
  ) then
    alter table public.profiles
      add column if not exists limitless_athlete_id uuid
      references public.limitless_athletes(id) on delete set null;
  else
    alter table public.profiles
      add column if not exists limitless_athlete_id text;
  end if;
end $$;

create table if not exists public.scheduled_chat_broadcasts (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles(id) on delete cascade,
  message text not null,
  scheduled_at timestamptz not null,
  sent_at timestamptz,
  repeat_rule text,
  athlete_ids uuid[],
  created_at timestamptz not null default now()
);

create index if not exists scheduled_chat_broadcasts_coach_idx
  on public.scheduled_chat_broadcasts (coach_id, scheduled_at);

alter table public.scheduled_chat_broadcasts enable row level security;

drop policy if exists "scheduled_broadcasts_coach_rw" on public.scheduled_chat_broadcasts;
create policy "scheduled_broadcasts_coach_rw"
  on public.scheduled_chat_broadcasts for all
  using (
    coach_id = auth.uid()
    and public.is_coach_or_admin()
  )
  with check (
    coach_id = auth.uid()
    and public.is_coach_or_admin()
  );

drop policy if exists "scheduled_broadcasts_admin_all" on public.scheduled_chat_broadcasts;
create policy "scheduled_broadcasts_admin_all"
  on public.scheduled_chat_broadcasts for all
  using (public.is_admin())
  with check (public.is_admin());

create table if not exists public.video_reviews (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.profiles(id) on delete cascade,
  coach_id uuid not null references public.profiles(id) on delete cascade,
  video_url text not null,
  lift text not null,
  status text not null default 'pending'
    check (status in ('pending', 'reviewed')),
  coach_feedback text,
  timestamps jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists video_reviews_coach_status_idx
  on public.video_reviews (coach_id, status, created_at desc);

create index if not exists video_reviews_athlete_idx
  on public.video_reviews (athlete_id, created_at desc);

alter table public.video_reviews enable row level security;

drop policy if exists "video_reviews_athlete_insert" on public.video_reviews;
create policy "video_reviews_athlete_insert"
  on public.video_reviews for insert
  with check (
    athlete_id = auth.uid()
    and exists (
      select 1 from public.profiles athlete
      where athlete.id = athlete_id
        and athlete.coach_id = coach_id
    )
  );

drop policy if exists "video_reviews_coach_rw" on public.video_reviews;
create policy "video_reviews_coach_rw"
  on public.video_reviews for all
  using (
    coach_id = auth.uid()
    and public.is_coach_or_admin()
  )
  with check (
    coach_id = auth.uid()
    and public.is_coach_or_admin()
  );

drop policy if exists "video_reviews_athlete_select" on public.video_reviews;
create policy "video_reviews_athlete_select"
  on public.video_reviews for select
  using (athlete_id = auth.uid());

drop policy if exists "video_reviews_admin_all" on public.video_reviews;
create policy "video_reviews_admin_all"
  on public.video_reviews for all
  using (public.is_admin())
  with check (public.is_admin());

create table if not exists public.meet_attempt_plans (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.profiles(id) on delete cascade,
  competition_id uuid references public.wedstrijden(id) on delete set null,
  coach_id uuid not null references public.profiles(id) on delete cascade,
  attempts jsonb not null default '[]'::jsonb,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists meet_attempt_plans_athlete_idx
  on public.meet_attempt_plans (athlete_id, created_at desc);

alter table public.meet_attempt_plans enable row level security;

drop policy if exists "meet_attempt_plans_coach_rw" on public.meet_attempt_plans;
create policy "meet_attempt_plans_coach_rw"
  on public.meet_attempt_plans for all
  using (
    coach_id = auth.uid()
    and public.is_coach_or_admin()
  )
  with check (
    coach_id = auth.uid()
    and public.is_coach_or_admin()
  );

drop policy if exists "meet_attempt_plans_athlete_select" on public.meet_attempt_plans;
create policy "meet_attempt_plans_athlete_select"
  on public.meet_attempt_plans for select
  using (athlete_id = auth.uid());

drop policy if exists "meet_attempt_plans_admin_all" on public.meet_attempt_plans;
create policy "meet_attempt_plans_admin_all"
  on public.meet_attempt_plans for all
  using (public.is_admin())
  with check (public.is_admin());

create table if not exists public.periodization_alerts (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles(id) on delete cascade,
  athlete_id uuid not null references public.profiles(id) on delete cascade,
  alert_type text not null,
  message text not null,
  dismissed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists periodization_alerts_coach_idx
  on public.periodization_alerts (coach_id, dismissed_at, created_at desc);

alter table public.periodization_alerts enable row level security;

drop policy if exists "periodization_alerts_coach_rw" on public.periodization_alerts;
create policy "periodization_alerts_coach_rw"
  on public.periodization_alerts for all
  using (
    coach_id = auth.uid()
    and public.is_coach_or_admin()
  )
  with check (
    coach_id = auth.uid()
    and public.is_coach_or_admin()
  );

drop policy if exists "periodization_alerts_admin_all" on public.periodization_alerts;
create policy "periodization_alerts_admin_all"
  on public.periodization_alerts for all
  using (public.is_admin())
  with check (public.is_admin());
