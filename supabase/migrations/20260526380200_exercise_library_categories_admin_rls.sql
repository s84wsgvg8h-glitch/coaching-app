drop policy if exists "exercise_library_categories_coach_write" on public.exercise_library_categories;

create policy "exercise_library_categories_coach_write"
  on public.exercise_library_categories for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('coach', 'admin')
    )
  )
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('coach', 'admin')
    )
  );
