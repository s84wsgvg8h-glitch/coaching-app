-- Allow admin role on profiles
alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('coach', 'atleet', 'admin', 'pending'));

-- Macrocycles: coaches/admins manage, athletes read own
alter table public.program_macrocycles enable row level security;

drop policy if exists "program_macrocycles_coach_admin_all" on public.program_macrocycles;
create policy "program_macrocycles_coach_admin_all"
  on public.program_macrocycles for all
  using (
    exists (
      select 1
      from public.profiles
      where id = auth.uid()
        and role in ('coach', 'admin')
    )
  )
  with check (
    exists (
      select 1
      from public.profiles
      where id = auth.uid()
        and role in ('coach', 'admin')
    )
  );

drop policy if exists "program_macrocycles_athlete_select" on public.program_macrocycles;
create policy "program_macrocycles_athlete_select"
  on public.program_macrocycles for select
  using (athlete_id = auth.uid());
