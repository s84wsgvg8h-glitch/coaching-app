-- Coach private notes per athlete
create table if not exists public.coach_athlete_notes (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles(id) on delete cascade,
  athlete_id uuid not null references public.profiles(id) on delete cascade,
  notes text not null default '',
  updated_at timestamptz not null default now(),
  unique (coach_id, athlete_id)
);

create index if not exists coach_athlete_notes_athlete_idx
  on public.coach_athlete_notes (athlete_id);

alter table public.coach_athlete_notes enable row level security;

drop policy if exists "coach_athlete_notes_coach_rw" on public.coach_athlete_notes;
create policy "coach_athlete_notes_coach_rw"
  on public.coach_athlete_notes for all
  using (
    coach_id = auth.uid()
    and exists (
      select 1 from public.profiles athlete
      where athlete.id = athlete_id
        and athlete.coach_id = auth.uid()
    )
    and exists (
      select 1 from public.profiles viewer
      where viewer.id = auth.uid()
        and viewer.role in ('coach', 'admin')
    )
  )
  with check (
    coach_id = auth.uid()
    and exists (
      select 1 from public.profiles athlete
      where athlete.id = athlete_id
        and athlete.coach_id = auth.uid()
    )
  );

-- Program templates
create table if not exists public.program_templates (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  source_program_id uuid references public.program_blocks(id) on delete set null,
  structure jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists program_templates_coach_idx
  on public.program_templates (coach_id);

alter table public.program_templates enable row level security;

drop policy if exists "program_templates_coach_all" on public.program_templates;
create policy "program_templates_coach_all"
  on public.program_templates for all
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

-- Athlete lift goals
create table if not exists public.athlete_goals (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.profiles(id) on delete cascade,
  lift text not null check (lift in ('squat', 'bench', 'deadlift')),
  target_weight numeric not null check (target_weight > 0),
  target_date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists athlete_goals_athlete_idx
  on public.athlete_goals (athlete_id);

alter table public.athlete_goals enable row level security;

drop policy if exists "athlete_goals_own_rw" on public.athlete_goals;
create policy "athlete_goals_own_rw"
  on public.athlete_goals for all
  using (
    athlete_id = auth.uid()
    or exists (
      select 1 from public.profiles athlete
      where athlete.id = athlete_id
        and athlete.coach_id = auth.uid()
        and exists (
          select 1 from public.profiles viewer
          where viewer.id = auth.uid() and viewer.role in ('coach', 'admin')
        )
    )
  )
  with check (
    athlete_id = auth.uid()
    or exists (
      select 1 from public.profiles athlete
      where athlete.id = athlete_id
        and athlete.coach_id = auth.uid()
    )
  );

-- Chat read state per conversation
create table if not exists public.chat_read_state (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  peer_user_id uuid references public.profiles(id) on delete cascade,
  group_id uuid references public.chat_groups(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (peer_user_id is not null and group_id is null)
    or (peer_user_id is null and group_id is not null)
  )
);

create unique index if not exists chat_read_state_direct_unique
  on public.chat_read_state (user_id, peer_user_id)
  where group_id is null;

create unique index if not exists chat_read_state_group_unique
  on public.chat_read_state (user_id, group_id)
  where peer_user_id is null;

alter table public.chat_read_state enable row level security;

drop policy if exists "chat_read_state_own" on public.chat_read_state;
create policy "chat_read_state_own"
  on public.chat_read_state for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Profile preferences (dashboard widget order, etc.)
alter table public.profiles
  add column if not exists preferences jsonb not null default '{}'::jsonb;

-- Coach invite links: 4-day expiry
alter table public.coach_invite_links
  add column if not exists expires_at timestamptz;

update public.coach_invite_links
set expires_at = created_at + interval '4 days'
where expires_at is null;

alter table public.coach_invite_links
  alter column expires_at set default (now() + interval '4 days');

create or replace function public.validate_coach_invite_token(invite_token text)
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select coach_id
  from public.coach_invite_links
  where token = invite_token
    and active = true
    and (expires_at is null or expires_at > now())
  limit 1;
$$;
