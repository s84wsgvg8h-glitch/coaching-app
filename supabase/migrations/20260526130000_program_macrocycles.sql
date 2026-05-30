create table if not exists public.program_macrocycles (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null
);

create index if not exists program_macrocycles_athlete_idx
  on public.program_macrocycles (athlete_id, sort_order);

alter table public.program_blocks
  add column if not exists macrocycle_id uuid references public.program_macrocycles(id) on delete set null;

create index if not exists program_blocks_macrocycle_idx
  on public.program_blocks (macrocycle_id);
