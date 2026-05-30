alter table public.profiles
  add column if not exists coach_id uuid references public.profiles(id) on delete set null;

create index if not exists profiles_coach_id_idx
  on public.profiles (coach_id);

create table if not exists public.coach_invite_links (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles(id) on delete cascade,
  token text not null unique,
  label text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists coach_invite_links_coach_idx
  on public.coach_invite_links (coach_id);

create index if not exists coach_invite_links_token_idx
  on public.coach_invite_links (token);

alter table public.coach_invite_links enable row level security;

drop policy if exists "coach_invite_links_coach_all" on public.coach_invite_links;
create policy "coach_invite_links_coach_all"
  on public.coach_invite_links for all
  using (
    coach_id = auth.uid()
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('coach', 'admin')
    )
  )
  with check (
    coach_id = auth.uid()
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('coach', 'admin')
    )
  );

create or replace function public.validate_coach_invite_token(invite_token text)
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select coach_id
  from public.coach_invite_links
  where token = invite_token
    and active = true
  limit 1;
$$;

grant execute on function public.validate_coach_invite_token(text) to anon, authenticated;

create or replace function public.register_athlete_via_invite(
  p_user_id uuid,
  p_full_name text,
  p_invite_token text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_coach_id uuid;
begin
  select public.validate_coach_invite_token(p_invite_token) into v_coach_id;

  if v_coach_id is null then
    raise exception 'Ongeldige of verlopen uitnodigingslink';
  end if;

  insert into public.profiles (id, full_name, role, coach_id)
  values (p_user_id, nullif(trim(p_full_name), ''), 'atleet', v_coach_id)
  on conflict (id) do update
  set
    full_name = excluded.full_name,
    role = 'atleet',
    coach_id = excluded.coach_id;
end;
$$;

grant execute on function public.register_athlete_via_invite(uuid, text, text) to authenticated;

create or replace function public.handle_auth_user_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_coach_id uuid;
  v_token text;
  v_full_name text;
begin
  v_token := nullif(trim(coalesce(new.raw_user_meta_data->>'invite_token', '')), '');
  v_full_name := nullif(trim(coalesce(new.raw_user_meta_data->>'full_name', '')), '');

  if v_token is not null then
    select public.validate_coach_invite_token(v_token) into v_coach_id;
  end if;

  if v_coach_id is not null then
    insert into public.profiles (id, full_name, role, coach_id)
    values (new.id, v_full_name, 'atleet', v_coach_id)
    on conflict (id) do update
    set
      full_name = coalesce(excluded.full_name, public.profiles.full_name),
      role = 'atleet',
      coach_id = excluded.coach_id;
  else
    insert into public.profiles (id, full_name, role)
    values (new.id, v_full_name, 'pending')
    on conflict (id) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_auth_user_created();

drop function if exists public.admin_list_users();

create function public.admin_list_users()
returns table (
  id uuid,
  full_name text,
  role text,
  email text,
  created_at timestamptz,
  coach_id uuid,
  coach_name text
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
    coach.full_name as coach_name
  from public.profiles p
  join auth.users u on u.id = p.id
  left join public.profiles coach on coach.id = p.coach_id
  where public.is_admin()
  order by coach.full_name nulls last, p.created_at desc;
$$;

grant execute on function public.admin_list_users() to authenticated;
