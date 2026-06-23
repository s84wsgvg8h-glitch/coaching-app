-- Soft-archive athletes for coaches (data retained, athlete unlinked)

alter table public.profiles
  add column if not exists archived_at timestamptz,
  add column if not exists archived_by_coach_id uuid references public.profiles(id) on delete set null;

create index if not exists profiles_archived_by_coach_idx
  on public.profiles (archived_by_coach_id)
  where archived_at is not null;

create or replace function public.archive_athlete_for_coach(p_athlete_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_coach_or_admin() then
    raise exception 'Geen toegang';
  end if;

  if not exists (
    select 1
    from public.profiles athlete
    where athlete.id = p_athlete_id
      and athlete.role = 'atleet'
      and athlete.archived_at is null
      and (
        athlete.coach_id = auth.uid()
        or public.is_admin()
        or (
          athlete.organization_id is not null
          and athlete.organization_id = public.get_my_organization_id()
          and public.is_coach_or_admin()
        )
      )
  ) then
    raise exception 'Atleet niet gevonden of al gearchiveerd';
  end if;

  update public.profiles
  set
    archived_at = now(),
    archived_by_coach_id = auth.uid(),
    coach_id = null,
    organization_id = null
  where id = p_athlete_id;
end;
$$;

create or replace function public.restore_athlete_for_coach(p_athlete_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_coach_id uuid;
begin
  if not public.is_coach_or_admin() then
    raise exception 'Geen toegang';
  end if;

  select archived_by_coach_id
  into v_coach_id
  from public.profiles
  where id = p_athlete_id
    and role = 'atleet'
    and archived_at is not null
    and (
      archived_by_coach_id = auth.uid()
      or public.is_admin()
    );

  if v_coach_id is null then
    raise exception 'Gearchiveerde atleet niet gevonden';
  end if;

  update public.profiles
  set
    archived_at = null,
    archived_by_coach_id = null,
    coach_id = v_coach_id
  where id = p_athlete_id;

  perform public.sync_athlete_org_from_coach(p_athlete_id, v_coach_id);
end;
$$;

create or replace function public.sync_athlete_org_from_coach(
  p_athlete_id uuid,
  p_coach_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
begin
  if p_coach_id is null then
    update public.profiles
    set organization_id = null
    where id = p_athlete_id;
    return;
  end if;

  select organization_id into v_org_id
  from public.profiles
  where id = p_coach_id;

  if v_org_id is not null then
    update public.profiles
    set organization_id = v_org_id
    where id = p_athlete_id;
  end if;
end;
$$;

grant execute on function public.archive_athlete_for_coach(uuid) to authenticated;
grant execute on function public.restore_athlete_for_coach(uuid) to authenticated;
grant execute on function public.sync_athlete_org_from_coach(uuid, uuid) to authenticated;

-- Coaches may update athletes they coach (including archive fields)
drop policy if exists "profiles_update_coach" on public.profiles;
create policy "profiles_update_coach"
  on public.profiles for update
  using (
    public.is_coach_or_admin()
    and (
      public.is_admin()
      or id = auth.uid()
      or coach_id = auth.uid()
      or archived_by_coach_id = auth.uid()
      or (
        organization_id is not null
        and organization_id = public.get_my_organization_id()
      )
    )
  )
  with check (
    public.is_coach_or_admin()
  );

-- Extend own-profile RPC
drop function if exists public.get_my_profile();
create or replace function public.get_my_profile()
returns table (
  id uuid,
  full_name text,
  role text,
  coach_id uuid,
  business_name text,
  intake_completed_at timestamptz,
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
    p.coach_id,
    p.business_name,
    p.intake_completed_at,
    p.archived_at
  from public.profiles p
  where p.id = auth.uid();
$$;
