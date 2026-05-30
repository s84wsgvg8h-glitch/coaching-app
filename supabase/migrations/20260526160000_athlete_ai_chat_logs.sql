create table if not exists public.athlete_ai_chat_logs (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.profiles(id) on delete cascade,
  coach_id uuid references public.profiles(id) on delete set null,
  question text not null,
  answer text,
  knowledge_scope text not null default 'athlete',
  sources jsonb not null default '[]'::jsonb,
  is_unknown boolean not null default false,
  had_error boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists athlete_ai_chat_logs_athlete_idx
  on public.athlete_ai_chat_logs (athlete_id, created_at desc);

create index if not exists athlete_ai_chat_logs_coach_idx
  on public.athlete_ai_chat_logs (coach_id, created_at desc);

create index if not exists athlete_ai_chat_logs_unknown_idx
  on public.athlete_ai_chat_logs (coach_id, is_unknown, created_at desc)
  where is_unknown = true;

alter table public.athlete_ai_chat_logs enable row level security;

drop policy if exists "athlete_ai_chat_logs_athlete_insert" on public.athlete_ai_chat_logs;
create policy "athlete_ai_chat_logs_athlete_insert"
  on public.athlete_ai_chat_logs for insert
  with check (
    athlete_id = auth.uid()
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'atleet'
    )
  );

drop policy if exists "athlete_ai_chat_logs_coach_select" on public.athlete_ai_chat_logs;
create policy "athlete_ai_chat_logs_coach_select"
  on public.athlete_ai_chat_logs for select
  using (
    coach_id = auth.uid()
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('coach', 'admin')
    )
  );

drop policy if exists "athlete_ai_chat_logs_admin_select" on public.athlete_ai_chat_logs;
create policy "athlete_ai_chat_logs_admin_select"
  on public.athlete_ai_chat_logs for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );
