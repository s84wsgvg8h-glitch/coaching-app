create table if not exists public.competition_checklist_templates (
  id uuid primary key default gen_random_uuid(),
  sections jsonb not null default '[]'::jsonb,
  updated_at timestamptz default now()
);

create table if not exists public.merch_items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  price numeric(10, 2),
  image_url text,
  buy_url text,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.competition_checklist_templates enable row level security;
alter table public.merch_items enable row level security;

drop policy if exists "competition_checklist_templates_select" on public.competition_checklist_templates;
create policy "competition_checklist_templates_select"
  on public.competition_checklist_templates for select
  using (auth.uid() is not null);

drop policy if exists "competition_checklist_templates_coach_write" on public.competition_checklist_templates;
create policy "competition_checklist_templates_coach_write"
  on public.competition_checklist_templates for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'coach'
    )
  )
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'coach'
    )
  );

drop policy if exists "merch_items_select" on public.merch_items;
create policy "merch_items_select"
  on public.merch_items for select
  using (
    auth.uid() is not null
    and (
      active = true
      or exists (
        select 1 from public.profiles
        where id = auth.uid() and role = 'coach'
      )
    )
  );

drop policy if exists "merch_items_coach_write" on public.merch_items;
create policy "merch_items_coach_write"
  on public.merch_items for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'coach'
    )
  )
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'coach'
    )
  );
