-- Fix infinite recursion in profiles SELECT policies.
-- Policies that subquery public.profiles trigger RLS again on the same table (42P17).

create or replace function public.get_my_organization_id()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select organization_id
  from public.profiles
  where id = auth.uid();
$$;

create or replace function public.get_my_coach_id()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select coach_id
  from public.profiles
  where id = auth.uid();
$$;

grant execute on function public.get_my_organization_id() to authenticated;
grant execute on function public.get_my_coach_id() to authenticated;

drop policy if exists "profiles_select_coach_scope" on public.profiles;
create policy "profiles_select_coach_scope"
  on public.profiles for select
  using (
    public.is_coach_or_admin()
    and (
      profiles.id = auth.uid()
      or profiles.coach_id = auth.uid()
      or (
        profiles.organization_id is not null
        and profiles.organization_id = public.get_my_organization_id()
      )
    )
  );

drop policy if exists "profiles_select_athlete_coach" on public.profiles;
create policy "profiles_select_athlete_coach"
  on public.profiles for select
  using (
    public.get_my_coach_id() is not null
    and profiles.id = public.get_my_coach_id()
  );
