-- Athletes can rename their own optional extra exercises.

create or replace function public.update_athlete_extra_exercise_name(
  p_exercise_id uuid,
  p_name text
)
returns public.program_exercises
language plpgsql
security definer
set search_path = public
as $$
declare
  v_exercise public.program_exercises;
  v_name text;
begin
  if auth.uid() is null then
    raise exception 'Niet ingelogd'
      using errcode = '42501';
  end if;

  v_name := nullif(trim(p_name), '');

  if v_name is null then
    raise exception 'Oefeningnaam is verplicht'
      using errcode = '22023';
  end if;

  if char_length(v_name) > 120 then
    raise exception 'Oefeningnaam is te lang'
      using errcode = '22023';
  end if;

  select e.*
  into v_exercise
  from public.program_exercises e
  where e.id = p_exercise_id;

  if not found then
    raise exception 'Oefening niet gevonden'
      using errcode = 'P0002';
  end if;

  if v_exercise.exercise_format is distinct from 'athlete_extra' then
    raise exception 'Alleen extra oefeningen kunnen worden hernoemd'
      using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.program_days d
    join public.program_weeks w on w.id = d.program_week_id
    join public.program_blocks b on b.id = w.program_block_id
    where d.id = v_exercise.program_day_id
      and b.athlete_id = auth.uid()
  ) then
    raise exception 'Geen toegang om deze oefening te hernoemen'
      using errcode = '42501';
  end if;

  update public.program_exercises
  set name = v_name
  where id = p_exercise_id
  returning * into v_exercise;

  return v_exercise;
end;
$$;

revoke all on function public.update_athlete_extra_exercise_name(uuid, text) from public;
grant execute on function public.update_athlete_extra_exercise_name(uuid, text) to authenticated;
revoke execute on function public.update_athlete_extra_exercise_name(uuid, text) from anon;
