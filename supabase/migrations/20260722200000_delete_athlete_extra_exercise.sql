-- Athletes can delete their own optional extra exercises.

create or replace function public.delete_athlete_extra_exercise(p_exercise_id uuid)
returns void
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

  select e.*
  into v_exercise
  from public.program_exercises e
  where e.id = p_exercise_id;

  if not found then
    raise exception 'Oefening niet gevonden'
      using errcode = 'P0002';
  end if;

  if v_exercise.exercise_format is distinct from 'athlete_extra' then
    raise exception 'Alleen extra oefeningen kunnen worden verwijderd'
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
    raise exception 'Geen toegang om deze oefening te verwijderen'
      using errcode = '42501';
  end if;

  delete from public.athlete_exercise_sets
  where program_exercise_id = p_exercise_id;

  delete from public.athlete_exercise_notes
  where program_exercise_id = p_exercise_id;

  delete from public.athlete_exercise_videos
  where program_exercise_id = p_exercise_id;

  delete from public.program_exercises
  where id = p_exercise_id;
end;
$$;

revoke all on function public.delete_athlete_extra_exercise(uuid) from public;
grant execute on function public.delete_athlete_extra_exercise(uuid) to authenticated;
revoke execute on function public.delete_athlete_extra_exercise(uuid) from anon;
