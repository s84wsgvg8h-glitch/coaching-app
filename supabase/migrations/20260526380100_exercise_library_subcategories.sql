alter table public.exercise_library_items
  add column if not exists subcategory text;

create table if not exists public.exercise_library_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  parent_id uuid references public.exercise_library_categories(id) on delete cascade,
  sort_order integer not null default 0,
  created_at timestamptz default now()
);

create unique index if not exists exercise_library_categories_name_parent_idx
  on public.exercise_library_categories (lower(name), coalesce(parent_id, '00000000-0000-0000-0000-000000000000'::uuid));

alter table public.exercise_library_categories enable row level security;

drop policy if exists "exercise_library_categories_select" on public.exercise_library_categories;
create policy "exercise_library_categories_select"
  on public.exercise_library_categories for select
  using (auth.uid() is not null);

drop policy if exists "exercise_library_categories_coach_write" on public.exercise_library_categories;
create policy "exercise_library_categories_coach_write"
  on public.exercise_library_categories for all
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
