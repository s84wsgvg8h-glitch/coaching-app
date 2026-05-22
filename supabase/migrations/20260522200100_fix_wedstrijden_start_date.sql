-- Fix: run this if wedstrijden only has `datum` (no start_date/end_date yet)
-- Safe to re-run (uses IF NOT EXISTS / ON CONFLICT)

alter table public.profiles
  add column if not exists geboortedatum date,
  add column if not exists lidnummer text;

create or replace function public.is_coach()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'coach'
  );
$$;

-- 1) Add new date columns to existing wedstrijden table
alter table public.wedstrijden
  add column if not exists start_date date,
  add column if not exists end_date date;

-- 2) Migrate legacy datum -> start_date / end_date
update public.wedstrijden
set
  start_date = coalesce(start_date, datum),
  end_date = coalesce(end_date, datum, start_date)
where start_date is null
   or end_date is null;

update public.wedstrijden
set end_date = start_date
where end_date is null
  and start_date is not null;

-- 3) Keep legacy datum filled (NOT NULL on older schemas)
update public.wedstrijden
set datum = coalesce(datum, start_date)
where datum is null
  and start_date is not null;

alter table public.wedstrijden
  alter column start_date set not null,
  alter column end_date set not null;

alter table public.wedstrijden
  drop constraint if exists wedstrijden_date_range_check;

alter table public.wedstrijden
  add constraint wedstrijden_date_range_check check (end_date >= start_date);

create unique index if not exists wedstrijden_naam_start_date_unique
  on public.wedstrijden (naam, start_date);

create index if not exists wedstrijden_start_date_idx
  on public.wedstrijden (start_date asc);

alter table public.wedstrijden enable row level security;

drop policy if exists "wedstrijden_select_authenticated" on public.wedstrijden;
create policy "wedstrijden_select_authenticated"
  on public.wedstrijden for select
  using (auth.uid() is not null);

drop policy if exists "wedstrijden_insert_coach" on public.wedstrijden;
create policy "wedstrijden_insert_coach"
  on public.wedstrijden for insert
  with check (public.is_coach());

drop policy if exists "wedstrijden_update_coach" on public.wedstrijden;
create policy "wedstrijden_update_coach"
  on public.wedstrijden for update
  using (public.is_coach())
  with check (public.is_coach());

drop policy if exists "wedstrijden_delete_coach" on public.wedstrijden;
create policy "wedstrijden_delete_coach"
  on public.wedstrijden for delete
  using (public.is_coach());

create table if not exists public.athlete_competitions (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.profiles(id) on delete cascade,
  competition_id uuid not null references public.wedstrijden(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (athlete_id, competition_id)
);

create index if not exists athlete_competitions_athlete_id_idx
  on public.athlete_competitions (athlete_id);

alter table public.athlete_competitions enable row level security;

drop policy if exists "athlete_competitions_select" on public.athlete_competitions;
create policy "athlete_competitions_select"
  on public.athlete_competitions for select
  using (
    athlete_id = auth.uid()
    or public.is_coach()
  );

drop policy if exists "athlete_competitions_insert" on public.athlete_competitions;
create policy "athlete_competitions_insert"
  on public.athlete_competitions for insert
  with check (
    athlete_id = auth.uid()
    or public.is_coach()
  );

drop policy if exists "athlete_competitions_delete" on public.athlete_competitions;
create policy "athlete_competitions_delete"
  on public.athlete_competitions for delete
  using (
    athlete_id = auth.uid()
    or public.is_coach()
  );

drop policy if exists "profiles_update_coach" on public.profiles;
create policy "profiles_update_coach"
  on public.profiles for update
  using (public.is_coach())
  with check (public.is_coach());

-- 4) Seed 2026 calendar (datum = start_date for legacy column)
insert into public.wedstrijden (naam, datum, start_date, end_date)
values
  ('Breda Open Cup & Grand Prix', '2026-05-09', '2026-05-09', '2026-05-10'),
  ('Beginnerswedstrijd TOPFIT', '2026-05-31', '2026-05-31', '2026-05-31'),
  ('Masters NK Powerliften', '2026-06-06', '2026-06-06', '2026-06-07'),
  ('Subjunioren NK Powerliften', '2026-06-06', '2026-06-06', '2026-06-07'),
  ('RK Zuid', '2026-06-27', '2026-06-27', '2026-06-28'),
  ('RK Noord', '2026-07-11', '2026-07-11', '2026-07-12'),
  ('Ascending Cup 2.0', '2026-09-05', '2026-09-05', '2026-09-06'),
  ('Beginnerswedstrijd Prime Strength', '2026-09-12', '2026-09-12', '2026-09-13'),
  ('Open NK Deadliften', '2026-09-19', '2026-09-19', '2026-09-20'),
  ('Open Deadlift Cup', '2026-09-19', '2026-09-19', '2026-09-20'),
  ('NSK Powerliften', '2026-10-10', '2026-10-10', '2026-10-11'),
  ('Beginnerswedstrijd Q4', '2026-10-31', '2026-10-31', '2026-11-01'),
  ('Open NK Powerliften', '2026-11-07', '2026-11-07', '2026-11-08'),
  ('Lichtstad Cup', '2026-11-28', '2026-11-28', '2026-11-29'),
  ('Open NK Bankdrukken', '2026-12-12', '2026-12-12', '2026-12-13'),
  ('Open Bankdruk Cup', '2026-12-12', '2026-12-12', '2026-12-13')
on conflict (naam, start_date) do nothing;
