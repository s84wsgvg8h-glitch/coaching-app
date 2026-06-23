create table if not exists public.training_sessions (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles(id) on delete cascade,
  program_week_id uuid not null references public.program_weeks(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'ended')),
  started_at timestamptz not null default now(),
  ended_at timestamptz
);

create index if not exists training_sessions_week_idx
  on public.training_sessions (program_week_id, status);

alter table public.training_sessions enable row level security;

drop policy if exists "training_sessions_select" on public.training_sessions;
create policy "training_sessions_select"
  on public.training_sessions for select
  using (
    public.is_coach()
    or exists (
      select 1
      from public.program_weeks w
      join public.program_blocks b on b.id = w.program_block_id
      where w.id = program_week_id
        and b.athlete_id = auth.uid()
    )
  );

drop policy if exists "training_sessions_coach_write" on public.training_sessions;
create policy "training_sessions_coach_write"
  on public.training_sessions for all
  using (public.is_coach())
  with check (public.is_coach());

create table if not exists public.block_intake_wizard (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.profiles(id) on delete cascade,
  program_block_id uuid not null references public.program_blocks(id) on delete cascade unique,
  step integer not null default 1,
  answers jsonb not null default '{}'::jsonb,
  completed_at timestamptz,
  coach_reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.block_intake_wizard enable row level security;

drop policy if exists "block_intake_wizard_select" on public.block_intake_wizard;
create policy "block_intake_wizard_select"
  on public.block_intake_wizard for select
  using (
    athlete_id = auth.uid()
    or public.is_coach()
  );

drop policy if exists "block_intake_wizard_athlete_write" on public.block_intake_wizard;
create policy "block_intake_wizard_athlete_write"
  on public.block_intake_wizard for insert
  with check (athlete_id = auth.uid());

drop policy if exists "block_intake_wizard_athlete_update" on public.block_intake_wizard;
create policy "block_intake_wizard_athlete_update"
  on public.block_intake_wizard for update
  using (athlete_id = auth.uid())
  with check (athlete_id = auth.uid());

drop policy if exists "block_intake_wizard_coach_update" on public.block_intake_wizard;
create policy "block_intake_wizard_coach_update"
  on public.block_intake_wizard for update
  using (public.is_coach())
  with check (public.is_coach());
