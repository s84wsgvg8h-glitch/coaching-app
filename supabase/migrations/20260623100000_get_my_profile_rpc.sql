-- Reliable own-profile read for auth routing (bypasses RLS edge cases).
create or replace function public.get_my_profile()
returns table (
  id uuid,
  full_name text,
  role text,
  coach_id uuid,
  business_name text
)
language sql
security definer
set search_path = public
stable
as $$
  select p.id, p.full_name, p.role, p.coach_id, p.business_name
  from public.profiles p
  where p.id = auth.uid();
$$;

grant execute on function public.get_my_profile() to authenticated;
