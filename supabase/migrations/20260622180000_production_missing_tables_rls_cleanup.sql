-- Production sync: missing tables + RLS hardening (profiles, messages, legacy permissive policies)

-- ---------------------------------------------------------------------------
-- Missing tables (never applied to production)
-- ---------------------------------------------------------------------------

create table if not exists public.coach_signup_invites (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  label text,
  active boolean not null default true,
  expires_at timestamptz not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists coach_signup_invites_token_idx
  on public.coach_signup_invites (token);

alter table public.coach_signup_invites enable row level security;

drop policy if exists "coach_signup_invites_admin_all" on public.coach_signup_invites;
create policy "coach_signup_invites_admin_all"
  on public.coach_signup_invites for all
  using (public.is_admin())
  with check (public.is_admin());

create or replace function public.validate_coach_signup_token(invite_token text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.coach_signup_invites
    where token = invite_token
      and active = true
      and expires_at > now()
  );
$$;

grant execute on function public.validate_coach_signup_token(text) to anon, authenticated;

create table if not exists public.athlete_checklist_templates (
  athlete_id uuid primary key references public.profiles(id) on delete cascade,
  sections jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.athlete_checklist_templates enable row level security;

drop policy if exists "athlete_checklist_templates_coach_all" on public.athlete_checklist_templates;
create policy "athlete_checklist_templates_coach_all"
  on public.athlete_checklist_templates for all
  using (
    public.is_coach_or_admin()
    and (
      public.is_admin()
      or athlete_id in (
        select id from public.profiles where coach_id = auth.uid()
      )
      or athlete_id = auth.uid()
    )
  )
  with check (
    public.is_coach_or_admin()
    and (
      public.is_admin()
      or athlete_id in (
        select id from public.profiles where coach_id = auth.uid()
      )
    )
  );

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

-- ---------------------------------------------------------------------------
-- Profiles: remove permissive legacy policies, add scoped SELECT
-- ---------------------------------------------------------------------------

drop policy if exists "Allow profile updates" on public.profiles;
drop policy if exists "Users can delete profiles" on public.profiles;
drop policy if exists "Users can read profiles" on public.profiles;

drop policy if exists "profiles_select_self" on public.profiles;
create policy "profiles_select_self"
  on public.profiles for select
  using (id = auth.uid());

drop policy if exists "profiles_select_coach_scope" on public.profiles;
create policy "profiles_select_coach_scope"
  on public.profiles for select
  using (
    exists (
      select 1
      from public.profiles viewer
      where viewer.id = auth.uid()
        and viewer.role in ('coach', 'admin')
    )
    and (
      profiles.id = auth.uid()
      or profiles.coach_id = auth.uid()
      or (
        profiles.organization_id is not null
        and profiles.organization_id = (
          select viewer.organization_id
          from public.profiles viewer
          where viewer.id = auth.uid()
        )
      )
    )
  );

drop policy if exists "profiles_select_athlete_coach" on public.profiles;
create policy "profiles_select_athlete_coach"
  on public.profiles for select
  using (
    exists (
      select 1
      from public.profiles me
      where me.id = auth.uid()
        and me.coach_id = profiles.id
    )
  );

drop policy if exists "profiles_select_group_peer" on public.profiles;
create policy "profiles_select_group_peer"
  on public.profiles for select
  using (
    exists (
      select 1
      from public.chat_group_members mine
      join public.chat_group_members theirs
        on mine.group_id = theirs.group_id
      where mine.user_id = auth.uid()
        and theirs.user_id = profiles.id
    )
  );

drop policy if exists "profiles_select_dm_peer" on public.profiles;
create policy "profiles_select_dm_peer"
  on public.profiles for select
  using (
    exists (
      select 1
      from public.messages m
      where m.group_id is null
        and (
          (m.sender_id = auth.uid() and m.receiver_id = profiles.id)
          or (m.receiver_id = auth.uid() and m.sender_id = profiles.id)
        )
    )
  );

-- ---------------------------------------------------------------------------
-- Messages: fix group_id IS NULL hole (was readable/insertable by anyone)
-- ---------------------------------------------------------------------------

drop policy if exists "Users can read their own messages" on public.messages;
drop policy if exists "Users can send messages" on public.messages;
drop policy if exists "Users can delete their own messages" on public.messages;
drop policy if exists "messages_select_group_member" on public.messages;
drop policy if exists "messages_insert_group_member" on public.messages;
drop policy if exists "messages_delete_own_or_group_admin" on public.messages;

drop policy if exists "messages_select_participant" on public.messages;
create policy "messages_select_participant"
  on public.messages for select
  using (
    (
      group_id is null
      and (sender_id = auth.uid() or receiver_id = auth.uid())
    )
    or (
      group_id is not null
      and public.is_chat_group_member(group_id)
    )
  );

drop policy if exists "messages_insert_participant" on public.messages;
create policy "messages_insert_participant"
  on public.messages for insert
  with check (
    sender_id = auth.uid()
    and (
      group_id is null
      or public.can_send_group_message(group_id)
    )
  );

drop policy if exists "messages_delete_participant" on public.messages;
create policy "messages_delete_participant"
  on public.messages for delete
  using (
    sender_id = auth.uid()
    or (
      group_id is not null
      and public.is_chat_group_admin(group_id)
    )
  );

-- ---------------------------------------------------------------------------
-- Drop duplicate permissive program / wedstrijden / limitless policies
-- ---------------------------------------------------------------------------

-- Keep program_days_select / program_exercises_select until scoped athlete/coach policies exist
drop policy if exists "program_days_delete" on public.program_days;

drop policy if exists "program_exercises_delete" on public.program_exercises;

drop policy if exists "program_exercise_sets_delete" on public.program_exercise_sets;
drop policy if exists "program_exercise_sets_insert" on public.program_exercise_sets;
drop policy if exists "program_exercise_sets_select" on public.program_exercise_sets;
drop policy if exists "program_exercise_sets_update" on public.program_exercise_sets;

drop policy if exists "Iedereen mag wedstrijden lezen" on public.wedstrijden;
drop policy if exists "Iedereen mag wedstrijden verwijderen" on public.wedstrijden;

drop policy if exists "limitless_athletes_delete" on public.limitless_athletes;
drop policy if exists "limitless_athletes_select" on public.limitless_athletes;

drop policy if exists "limitless_athletes_select_authenticated" on public.limitless_athletes;
create policy "limitless_athletes_select_authenticated"
  on public.limitless_athletes for select
  using (auth.uid() is not null);

drop policy if exists "limitless_athletes_coach_write" on public.limitless_athletes;
create policy "limitless_athletes_coach_write"
  on public.limitless_athletes for all
  using (public.is_coach_or_admin())
  with check (public.is_coach_or_admin());

-- Performance indexes (idempotent from audit batch)
create index if not exists messages_receiver_created_idx
  on public.messages (receiver_id, created_at desc);
