create table if not exists public.program_planning_notes (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.profiles(id) on delete cascade,
  program_week_id uuid references public.program_weeks(id) on delete cascade,
  program_block_id uuid references public.program_blocks(id) on delete cascade,
  coach_id uuid not null references public.profiles(id) on delete cascade,
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint program_planning_notes_target_check check (
    (program_week_id is not null and program_block_id is null)
    or (program_week_id is null and program_block_id is not null)
  )
);

create unique index if not exists program_planning_notes_week_uniq
  on public.program_planning_notes (athlete_id, program_week_id)
  where program_week_id is not null;

create unique index if not exists program_planning_notes_block_uniq
  on public.program_planning_notes (athlete_id, program_block_id)
  where program_block_id is not null;

create index if not exists program_planning_notes_athlete_idx
  on public.program_planning_notes (athlete_id);

alter table public.program_planning_notes enable row level security;

drop policy if exists "program_planning_notes_select" on public.program_planning_notes;
create policy "program_planning_notes_select"
  on public.program_planning_notes for select
  using (
    athlete_id = auth.uid()
    or public.is_coach()
  );

drop policy if exists "program_planning_notes_coach_write" on public.program_planning_notes;
create policy "program_planning_notes_coach_write"
  on public.program_planning_notes for all
  using (public.is_coach())
  with check (public.is_coach());
