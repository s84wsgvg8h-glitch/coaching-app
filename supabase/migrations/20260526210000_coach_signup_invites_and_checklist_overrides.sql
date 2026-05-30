-- Required helper (also defined in 20260526190000; re-declared here for manual runs)
create or replace function public.is_coach_or_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role in ('coach', 'admin')
  );
$$;

grant execute on function public.is_coach_or_admin() to authenticated;

-- Coach signup invites (admin-generated, time-limited)
create table if not exists public.coach_signup_invites (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  label text,
  active boolean not null default true,
  expires_at timestamptz not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists coach_signup_invites_token_idx
  on public.coach_signup_invites (token);

alter table public.coach_signup_invites enable row level security;

drop policy if exists "coach_signup_invites_admin_all" on public.coach_signup_invites;
create policy "coach_signup_invites_admin_all"
  on public.coach_signup_invites for all
  using (public.is_admin())
  with check (public.is_admin());

alter table public.profiles
  add column if not exists pending_kind text;

create or replace function public.validate_coach_signup_token(invite_token text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.coach_signup_invites
    where token = invite_token
      and active = true
      and expires_at > now()
  );
$$;

grant execute on function public.validate_coach_signup_token(text) to anon, authenticated;

-- Per-athlete checklist overrides
create table if not exists public.athlete_checklist_templates (
  athlete_id uuid primary key references public.profiles(id) on delete cascade,
  sections jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.athlete_checklist_templates enable row level security;

drop policy if exists "athlete_checklist_templates_coach_all" on public.athlete_checklist_templates;
create policy "athlete_checklist_templates_coach_all"
  on public.athlete_checklist_templates for all
  using (
    public.is_coach_or_admin()
    and (
      public.is_admin()
      or athlete_id in (
        select id from public.profiles where coach_id = auth.uid()
      )
      or athlete_id = auth.uid()
    )
  )
  with check (
    public.is_coach_or_admin()
    and (
      public.is_admin()
      or athlete_id in (
        select id from public.profiles where coach_id = auth.uid()
      )
    )
  );

-- Update auth trigger for coach signup invites
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
  v_full_name text;
begin
  v_athlete_token := nullif(trim(coalesce(new.raw_user_meta_data->>'invite_token', '')), '');
  v_coach_signup_token := nullif(trim(coalesce(new.raw_user_meta_data->>'coach_signup_token', '')), '');
  v_full_name := nullif(trim(coalesce(new.raw_user_meta_data->>'full_name', '')), '');

  if v_coach_signup_token is not null
     and public.validate_coach_signup_token(v_coach_signup_token) then
    insert into public.profiles (id, full_name, role, pending_kind)
    values (new.id, v_full_name, 'pending', 'coach')
    on conflict (id) do update
    set
      full_name = coalesce(excluded.full_name, public.profiles.full_name),
      role = 'pending',
      pending_kind = 'coach';
    return new;
  end if;

  if v_athlete_token is not null then
    select public.validate_coach_invite_token(v_athlete_token) into v_coach_id;
  end if;

  if v_coach_id is not null then
    insert into public.profiles (id, full_name, role, coach_id, pending_kind)
    values (new.id, v_full_name, 'atleet', v_coach_id, null)
    on conflict (id) do update
    set
      full_name = coalesce(excluded.full_name, public.profiles.full_name),
      role = 'atleet',
      coach_id = excluded.coach_id,
      pending_kind = null;
  else
    insert into public.profiles (id, full_name, role, pending_kind)
    values (new.id, v_full_name, 'pending', 'athlete')
    on conflict (id) do nothing;
  end if;

  return new;
end;
$$;

drop function if exists public.admin_list_users();

create function public.admin_list_users()
returns table (
  id uuid,
  full_name text,
  role text,
  email text,
  created_at timestamptz,
  coach_id uuid,
  coach_name text,
  pending_kind text
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
    u.email::text,
    p.created_at,
    p.coach_id,
    coach.full_name as coach_name,
    p.pending_kind
  from public.profiles p
  join auth.users u on u.id = p.id
  left join public.profiles coach on coach.id = p.coach_id
  where public.is_admin()
  order by coach.full_name nulls last, p.created_at desc;
$$;

grant execute on function public.admin_list_users() to authenticated;
