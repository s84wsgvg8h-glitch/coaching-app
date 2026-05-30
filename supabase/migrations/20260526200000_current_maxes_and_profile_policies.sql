-- Current maxes for RPE table calculations (separate from starting PRs)
alter table public.profiles add column if not exists current_max_squat numeric(6,2);
alter table public.profiles add column if not exists current_max_bench numeric(6,2);
alter table public.profiles add column if not exists current_max_deadlift numeric(6,2);

-- Athletes may update their own profile row (e.g. remove coach link)
drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());
