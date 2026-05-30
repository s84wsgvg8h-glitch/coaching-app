create table if not exists public.exercise_library_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null default 'Overig',
  description text,
  cues text,
  video_url text,
  video_path text,
  thumbnail_url text,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists exercise_library_items_category_idx
  on public.exercise_library_items (category);

create index if not exists exercise_library_items_active_idx
  on public.exercise_library_items (active);

alter table public.exercise_library_items enable row level security;

drop policy if exists "exercise_library_items_select" on public.exercise_library_items;
create policy "exercise_library_items_select"
  on public.exercise_library_items for select
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

drop policy if exists "exercise_library_items_coach_write" on public.exercise_library_items;
create policy "exercise_library_items_coach_write"
  on public.exercise_library_items for all
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

insert into storage.buckets (id, name, public)
values ('exercise-library', 'exercise-library', true)
on conflict (id) do nothing;

drop policy if exists "exercise_library_storage_select" on storage.objects;
create policy "exercise_library_storage_select"
  on storage.objects for select
  using (bucket_id = 'exercise-library');

drop policy if exists "exercise_library_storage_coach_write" on storage.objects;
create policy "exercise_library_storage_coach_write"
  on storage.objects for all
  using (
    bucket_id = 'exercise-library'
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'coach'
    )
  )
  with check (
    bucket_id = 'exercise-library'
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'coach'
    )
  );
