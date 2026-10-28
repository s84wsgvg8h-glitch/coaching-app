-- Extend athlete extra exercise RPC with optional sets / reps / RPE prescription.

drop function if exists public.insert_athlete_extra_exercise_for_day(uuid, text, uuid);

create or replace function public.insert_athlete_extra_exercise_for_day(
  p_day_id uuid,
  p_name text,
  p_exercise_library_id uuid default null,
  p_sets text default '1',
  p_reps text default '',
  p_rpe text default ''
)
returns public.program_exercises
language plpgsql
security definer
set search_path = public
as $$
declare
  v_exercise public.program_exercises;
  v_next_number integer;
begin
  if auth.uid() is null then
    raise exception 'Niet ingelogd'
      using errcode = '42501';
  end if;

  if not public.can_access_program_day(p_day_id) then
    raise exception 'Geen toegang tot deze dag'
      using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.program_days d
    join public.program_weeks w on w.id = d.program_week_id
    join public.program_blocks b on b.id = w.program_block_id
    where d.id = p_day_id
      and b.athlete_id = auth.uid()
  ) then
    raise exception 'Alleen de atleet kan extra oefeningen toevoegen'
      using errcode = '42501';
  end if;

  if nullif(trim(p_name), '') is null then
    raise exception 'Oefeningnaam is verplicht'
      using errcode = '22023';
  end if;

  select coalesce(max(e.exercise_number), 0) + 1
  into v_next_number
  from public.program_exercises e
  where e.program_day_id = p_day_id;

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
    exercise_library_id
  )
  values (
    p_day_id,
    trim(p_name),
    coalesce(nullif(trim(p_sets), ''), '1'),
    coalesce(trim(p_reps), ''),
    '',
    coalesce(trim(p_rpe), ''),
    '',
    '',
    v_next_number,
    'athlete_extra',
    p_exercise_library_id
  )
  returning * into v_exercise;

  return v_exercise;
end;
$$;

revoke all on function public.insert_athlete_extra_exercise_for_day(uuid, text, uuid, text, text, text) from public;
grant execute on function public.insert_athlete_extra_exercise_for_day(uuid, text, uuid, text, text, text) to authenticated;
revoke execute on function public.insert_athlete_extra_exercise_for_day(uuid, text, uuid, text, text, text) from anon;
