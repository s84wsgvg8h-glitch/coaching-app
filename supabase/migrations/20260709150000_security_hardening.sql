-- Security hardening: admin RPC + permissive RLS cleanup

-- ---------------------------------------------------------------------------
-- admin_list_users: admin-only, not callable by anon
-- ---------------------------------------------------------------------------

create or replace function public.admin_list_users()
returns table (
  id uuid,
  full_name text,
  role text,
  email text,
  created_at timestamptz,
  coach_id uuid,
  coach_name text
)
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Geen toegang.'
      using errcode = '42501';
  end if;

  return query
  select
    p.id,
    p.full_name,
    p.role,
    u.email::text,
    p.created_at,
    p.coach_id,
    coach.full_name as coach_name
  from public.profiles p
  join auth.users u on u.id = p.id
  left join public.profiles coach on coach.id = p.coach_id
  order by coach.full_name nulls last, p.created_at desc;
end;
$$;

revoke all on function public.admin_list_users() from public;
revoke all on function public.admin_list_users() from anon;
grant execute on function public.admin_list_users() to authenticated;

-- ---------------------------------------------------------------------------
-- Drop legacy permissive INSERT policies (OR'd with coach policies)
-- ---------------------------------------------------------------------------

drop policy if exists "limitless_athletes_insert" on public.limitless_athletes;

drop policy if exists "Iedereen mag wedstrijden toevoegen" on public.wedstrijden;
drop policy if exists "Iedereen mag wedstrijden lezen" on public.wedstrijden;
drop policy if exists "Iedereen mag wedstrijden verwijderen" on public.wedstrijden;

-- Ensure coach-scoped write policies remain (idempotent)
drop policy if exists "limitless_athletes_coach_write" on public.limitless_athletes;
create policy "limitless_athletes_coach_write"
  on public.limitless_athletes for all
  using (public.is_coach_or_admin())
  with check (public.is_coach_or_admin());

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
