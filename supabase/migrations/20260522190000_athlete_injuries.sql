create table if not exists public.athlete_injuries (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.profiles(id) on delete cascade,
  muscle_area_id text not null,
  name text not null,
  injury_date date not null default current_date,
  urgency text not null check (urgency in ('laag', 'medium', 'hoog')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists athlete_injuries_athlete_id_idx
  on public.athlete_injuries (athlete_id, injury_date desc);

alter table public.athlete_injuries enable row level security;

drop policy if exists "athlete_injuries_select" on public.athlete_injuries;
create policy "athlete_injuries_select"
  on public.athlete_injuries for select
  using (
    athlete_id = auth.uid()
    or exists (
      select 1
      from public.profiles
      where id = auth.uid()
        and role = 'coach'
    )
  );

drop policy if exists "athlete_injuries_insert" on public.athlete_injuries;
create policy "athlete_injuries_insert"
  on public.athlete_injuries for insert
  with check (
    athlete_id = auth.uid()
    or exists (
      select 1
      from public.profiles
      where id = auth.uid()
        and role = 'coach'
    )
  );

drop policy if exists "athlete_injuries_update" on public.athlete_injuries;
create policy "athlete_injuries_update"
  on public.athlete_injuries for update
  using (
    athlete_id = auth.uid()
    or exists (
      select 1
      from public.profiles
      where id = auth.uid()
        and role = 'coach'
    )
  )
  with check (
    athlete_id = auth.uid()
    or exists (
      select 1
      from public.profiles
      where id = auth.uid()
        and role = 'coach'
    )
  );

drop policy if exists "athlete_injuries_delete" on public.athlete_injuries;
create policy "athlete_injuries_delete"
  on public.athlete_injuries for delete
  using (
    athlete_id = auth.uid()
    or exists (
      select 1
      from public.profiles
      where id = auth.uid()
        and role = 'coach'
    )
  );
