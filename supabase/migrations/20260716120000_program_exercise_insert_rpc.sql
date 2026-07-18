-- Coaches could not paste/add exercises in raw view: direct insert hit RLS on program_exercises.
-- Use a security-definer RPC aligned with can_write_program_day (same pattern as program weeks).

create or replace function public.insert_program_exercise_for_day(
  p_day_id uuid,
  p_name text,
  p_sets text default '',
  p_reps text default '',
  p_load text default '',
  p_rpe text default '',
  p_notes text default '',
  p_priority text default '',
  p_exercise_number integer default 1,
  p_exercise_format text default 'normal',
  p_superset_group text default null,
  p_rest_seconds integer default null,
  p_exercise_library_id uuid default null
)
returns public.program_exercises
language plpgsql
security definer
set search_path = public
as $$
declare
  v_exercise public.program_exercises;
begin
  if auth.uid() is null then
    raise exception 'Niet ingelogd'
      using errcode = '42501';
  end if;

  if not public.can_write_program_day(p_day_id) then
    raise exception 'Geen schrijfrechten voor deze dag'
      using errcode = '42501';
  end if;

  if nullif(trim(p_name), '') is null then
    raise exception 'Oefeningnaam is verplicht'
      using errcode = '22023';
  end if;

  insert into public.program_exercises (
    program_day_id,
    name,
    sets,
    reps,
    load,
    rpe,
    notes,
    priority,
    exercise_number,
    exercise_format,
    superset_group,
    rest_seconds,
    exercise_library_id
  )
  values (
    p_day_id,
    trim(p_name),
    coalesce(p_sets, ''),
    coalesce(p_reps, ''),
    coalesce(p_load, ''),
    coalesce(p_rpe, ''),
    coalesce(p_notes, ''),
    coalesce(p_priority, ''),
    greatest(coalesce(p_exercise_number, 1), 1),
    coalesce(nullif(trim(p_exercise_format), ''), 'normal'),
    nullif(trim(p_superset_group), ''),
    p_rest_seconds,
    p_exercise_library_id
  )
  returning * into v_exercise;

  return v_exercise;
end;
$$;

revoke all on function public.insert_program_exercise_for_day(
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  integer,
  text,
  text,
  integer,
  uuid
) from public;

grant execute on function public.insert_program_exercise_for_day(
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  integer,
  text,
  text,
  integer,
  uuid
) to authenticated;

revoke execute on function public.insert_program_exercise_for_day(
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  integer,
  text,
  text,
  integer,
  uuid
) from anon;
