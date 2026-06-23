create table if not exists public.program_day_coach_notes (
  id uuid primary key default gen_random_uuid(),
  program_day_id uuid not null references public.program_days(id) on delete cascade,
  athlete_id uuid not null references public.profiles(id) on delete cascade,
  coach_id uuid not null references public.profiles(id) on delete cascade,
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (program_day_id, athlete_id)
);

create index if not exists program_day_coach_notes_day_idx
  on public.program_day_coach_notes (program_day_id);

alter table public.program_day_coach_notes enable row level security;

drop policy if exists "program_day_coach_notes_select" on public.program_day_coach_notes;
create policy "program_day_coach_notes_select"
  on public.program_day_coach_notes for select
  using (
    athlete_id = auth.uid()
    or public.is_coach()
  );

drop policy if exists "program_day_coach_notes_coach_write" on public.program_day_coach_notes;
create policy "program_day_coach_notes_coach_write"
  on public.program_day_coach_notes for all
  using (public.is_coach())
  with check (public.is_coach());
