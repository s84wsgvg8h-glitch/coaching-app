create table if not exists public.athlete_dashboard_items (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.profiles(id) on delete cascade,
  coach_id uuid references public.profiles(id) on delete set null,
  title text not null,
  item_type text not null check (item_type in ('todo', 'habit')),
  created_by text not null check (created_by in ('coach', 'atleet')),
  completed boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists athlete_dashboard_items_athlete_idx
  on public.athlete_dashboard_items (athlete_id, item_type, completed, created_at desc);

alter table public.athlete_dashboard_items enable row level security;

drop policy if exists "athlete_dashboard_items_athlete_select" on public.athlete_dashboard_items;
create policy "athlete_dashboard_items_athlete_select"
  on public.athlete_dashboard_items for select
  using (athlete_id = auth.uid());

drop policy if exists "athlete_dashboard_items_athlete_insert" on public.athlete_dashboard_items;
create policy "athlete_dashboard_items_athlete_insert"
  on public.athlete_dashboard_items for insert
  with check (
    athlete_id = auth.uid()
    and created_by = 'atleet'
    and (
      item_type = 'habit'
      or item_type = 'todo'
    )
  );

drop policy if exists "athlete_dashboard_items_athlete_update" on public.athlete_dashboard_items;
create policy "athlete_dashboard_items_athlete_update"
  on public.athlete_dashboard_items for update
  using (athlete_id = auth.uid())
  with check (athlete_id = auth.uid());

drop policy if exists "athlete_dashboard_items_athlete_delete" on public.athlete_dashboard_items;
create policy "athlete_dashboard_items_athlete_delete"
  on public.athlete_dashboard_items for delete
  using (
    athlete_id = auth.uid()
    and created_by = 'atleet'
  );

drop policy if exists "athlete_dashboard_items_coach_select" on public.athlete_dashboard_items;
create policy "athlete_dashboard_items_coach_select"
  on public.athlete_dashboard_items for select
  using (
    exists (
      select 1
      from public.profiles athlete
      where athlete.id = athlete_dashboard_items.athlete_id
        and athlete.coach_id = auth.uid()
    )
    and exists (
      select 1 from public.profiles coach
      where coach.id = auth.uid()
        and coach.role in ('coach', 'admin')
    )
  );

drop policy if exists "athlete_dashboard_items_coach_insert" on public.athlete_dashboard_items;
create policy "athlete_dashboard_items_coach_insert"
  on public.athlete_dashboard_items for insert
  with check (
    item_type = 'todo'
    and created_by = 'coach'
    and exists (
      select 1
      from public.profiles athlete
      where athlete.id = athlete_dashboard_items.athlete_id
        and athlete.coach_id = auth.uid()
    )
    and exists (
      select 1 from public.profiles coach
      where coach.id = auth.uid()
        and coach.role in ('coach', 'admin')
    )
  );

drop policy if exists "athlete_dashboard_items_coach_update" on public.athlete_dashboard_items;
create policy "athlete_dashboard_items_coach_update"
  on public.athlete_dashboard_items for update
  using (
    exists (
      select 1
      from public.profiles athlete
      where athlete.id = athlete_dashboard_items.athlete_id
        and athlete.coach_id = auth.uid()
    )
    and exists (
      select 1 from public.profiles coach
      where coach.id = auth.uid()
        and coach.role in ('coach', 'admin')
    )
  )
  with check (
    item_type = 'todo'
    and created_by = 'coach'
  );

drop policy if exists "athlete_dashboard_items_coach_delete" on public.athlete_dashboard_items;
create policy "athlete_dashboard_items_coach_delete"
  on public.athlete_dashboard_items for delete
  using (
    created_by = 'coach'
    and exists (
      select 1
      from public.profiles athlete
      where athlete.id = athlete_dashboard_items.athlete_id
        and athlete.coach_id = auth.uid()
    )
    and exists (
      select 1 from public.profiles coach
      where coach.id = auth.uid()
        and coach.role in ('coach', 'admin')
    )
  );
