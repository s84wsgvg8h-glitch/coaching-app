-- Athletes who sign up via coach invite link stay pending until the coach accepts them.

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
    values (new.id, v_full_name, 'pending', v_coach_id, 'athlete')
    on conflict (id) do update
    set
      full_name = coalesce(excluded.full_name, public.profiles.full_name),
      role = 'pending',
      coach_id = excluded.coach_id,
      pending_kind = 'athlete';
  else
    insert into public.profiles (id, full_name, role, pending_kind)
    values (new.id, v_full_name, 'pending', 'athlete')
    on conflict (id) do nothing;
  end if;

  return new;
end;
$$;
