-- Coach invite: optional intake requirement
alter table public.coach_invite_links
  add column if not exists requires_intake boolean not null default true;

-- Profile flag (set from invite at signup)
alter table public.profiles
  add column if not exists intake_required boolean not null default true;

-- Admin platform invites (organisation head-coach, atleet zonder coach)
create table if not exists public.admin_platform_invites (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  invite_kind text not null check (invite_kind in ('organization', 'athlete')),
  organization_id uuid references public.coach_organizations(id) on delete cascade,
  requires_intake boolean not null default true,
  label text,
  active boolean not null default true,
  expires_at timestamptz not null default (now() + interval '7 days'),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint admin_platform_invites_org_check check (
    (invite_kind = 'organization' and organization_id is not null)
    or (invite_kind = 'athlete' and organization_id is null)
  )
);

create index if not exists admin_platform_invites_token_idx
  on public.admin_platform_invites (token);

alter table public.admin_platform_invites enable row level security;

drop policy if exists "admin_platform_invites_admin_all" on public.admin_platform_invites;
create policy "admin_platform_invites_admin_all"
  on public.admin_platform_invites for all
  using (public.is_admin())
  with check (public.is_admin());

create or replace function public.validate_admin_platform_invite(invite_token text)
returns table (
  invite_kind text,
  organization_id uuid,
  requires_intake boolean
)
language sql
security definer
set search_path = public
stable
as $$
  select i.invite_kind, i.organization_id, i.requires_intake
  from public.admin_platform_invites i
  where i.token = invite_token
    and i.active = true
    and i.expires_at > now()
  limit 1;
$$;

grant execute on function public.validate_admin_platform_invite(text) to anon, authenticated;

create or replace function public.get_coach_invite_details(invite_token text)
returns table (
  coach_id uuid,
  requires_intake boolean
)
language sql
security definer
set search_path = public
stable
as $$
  select l.coach_id, l.requires_intake
  from public.coach_invite_links l
  where l.token = invite_token
    and l.active = true
    and (l.expires_at is null or l.expires_at > now())
  limit 1;
$$;

grant execute on function public.get_coach_invite_details(text) to anon, authenticated;

-- Athletes may bootstrap their own empty program block
drop policy if exists "program_blocks_insert_athlete_own" on public.program_blocks;
create policy "program_blocks_insert_athlete_own"
  on public.program_blocks for insert
  with check (
    athlete_id = auth.uid()
    and created_by = auth.uid()
  );

create or replace function public.handle_auth_user_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_coach_id uuid;
  v_athlete_token text;
  v_coach_signup_token text;
  v_platform_token text;
  v_full_name text;
  v_requires_intake boolean := true;
  v_platform record;
  v_invite record;
begin
  v_athlete_token := nullif(trim(coalesce(new.raw_user_meta_data->>'invite_token', '')), '');
  v_coach_signup_token := nullif(trim(coalesce(new.raw_user_meta_data->>'coach_signup_token', '')), '');
  v_platform_token := nullif(trim(coalesce(new.raw_user_meta_data->>'platform_invite_token', '')), '');
  v_full_name := nullif(trim(coalesce(new.raw_user_meta_data->>'full_name', '')), '');

  if v_coach_signup_token is not null
     and public.validate_coach_signup_token(v_coach_signup_token) then
    insert into public.profiles (id, full_name, role, pending_kind, intake_required)
    values (new.id, v_full_name, 'pending', 'coach', true)
    on conflict (id) do update
    set
      full_name = coalesce(excluded.full_name, public.profiles.full_name),
      role = 'pending',
      pending_kind = 'coach',
      intake_required = true;
    return new;
  end if;

  if v_platform_token is not null then
    select * into v_platform
    from public.validate_admin_platform_invite(v_platform_token);

    if v_platform.invite_kind is not null then
      if v_platform.invite_kind = 'organization' then
        insert into public.profiles (
          id, full_name, role, pending_kind, organization_id, intake_required
        )
        values (
          new.id, v_full_name, 'pending', 'coach', v_platform.organization_id, true
        )
        on conflict (id) do update
        set
          full_name = coalesce(excluded.full_name, public.profiles.full_name),
          role = 'pending',
          pending_kind = 'coach',
          organization_id = excluded.organization_id,
          intake_required = true;
        return new;
      end if;

      if v_platform.invite_kind = 'athlete' then
        insert into public.profiles (
          id, full_name, role, pending_kind, intake_required, intake_completed_at
        )
        values (
          new.id,
          v_full_name,
          'pending',
          'athlete',
          v_platform.requires_intake,
          case when v_platform.requires_intake then null else now() end
        )
        on conflict (id) do update
        set
          full_name = coalesce(excluded.full_name, public.profiles.full_name),
          role = 'pending',
          pending_kind = 'athlete',
          intake_required = excluded.intake_required,
          intake_completed_at = excluded.intake_completed_at;
        return new;
      end if;
    end if;
  end if;

  if v_athlete_token is not null then
    select * into v_invite
    from public.get_coach_invite_details(v_athlete_token);

    v_coach_id := v_invite.coach_id;
    v_requires_intake := coalesce(v_invite.requires_intake, true);
  end if;

  if v_coach_id is not null then
    insert into public.profiles (
      id, full_name, role, coach_id, pending_kind, intake_required, intake_completed_at
    )
    values (
      new.id,
      v_full_name,
      'pending',
      v_coach_id,
      'athlete',
      v_requires_intake,
      case when v_requires_intake then null else now() end
    )
    on conflict (id) do update
    set
      full_name = coalesce(excluded.full_name, public.profiles.full_name),
      role = 'pending',
      coach_id = excluded.coach_id,
      pending_kind = 'athlete',
      intake_required = excluded.intake_required,
      intake_completed_at = excluded.intake_completed_at;
  else
    -- No open signup: only explicit invite tokens create profiles
    null;
  end if;

  return new;
exception
  when others then
    return new;
end;
$$;
