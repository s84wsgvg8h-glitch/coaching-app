-- Extend get_my_profile so auth bootstrap avoids extra round trips for intake + pending.

drop function if exists public.get_my_profile();

create or replace function public.get_my_profile()
returns table (
  id uuid,
  full_name text,
  role text,
  pending_kind text,
  coach_id uuid,
  business_name text,
  intake_completed_at timestamptz,
  intake_required boolean,
  archived_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select
    p.id,
    p.full_name,
    p.role,
    p.pending_kind,
    p.coach_id,
    p.business_name,
    p.intake_completed_at,
    p.intake_required,
    p.archived_at
  from public.profiles p
  where p.id = auth.uid();
$$;

grant execute on function public.get_my_profile() to authenticated;
