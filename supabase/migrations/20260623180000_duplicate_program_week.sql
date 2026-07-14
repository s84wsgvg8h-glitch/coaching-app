-- Fix program week writes for coaches with block access + RPC to duplicate weeks

create or replace function public.can_write_program_block(p_block_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.program_blocks b
    left join public.profiles athlete on athlete.id = b.athlete_id
    where b.id = p_block_id
      and (
        public.is_admin()
        or b.athlete_id = auth.uid()
        or b.created_by = auth.uid()
        or athlete.coach_id = auth.uid()
        or athlete.archived_by_coach_id = auth.uid()
        or (
          athlete.organization_id is not null
          and athlete.organization_id = (
            select p.organization_id from public.profiles p where p.id = auth.uid()
          )
          and exists (
            select 1 from public.profiles coach
            where coach.id = auth.uid()
              and coach.role in ('coach', 'admin')
          )
        )
        or (
          public.is_coach_or_admin()
          and public.can_access_program_block(p_block_id)
        )
      )
  );
$$;

create or replace function public.duplicate_program_week(
  p_source_week_id uuid,
  p_target_block_id uuid,
  p_target_week_number integer,
  p_target_title text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_source_week public.program_weeks%rowtype;
  v_new_week_id uuid;
  v_source_day record;
  v_new_day_id uuid;
  v_source_exercise record;
begin
  select *
  into v_source_week
  from public.program_weeks
  where id = p_source_week_id;

  if not found then
    raise exception 'Week niet gevonden';
  end if;

  if not public.can_write_program_block(p_target_block_id) then
    raise exception 'Geen schrijfrechten voor dit programma';
  end if;

  if not public.can_access_program_week(p_source_week_id) then
    raise exception 'Geen leesrechten voor deze week';
  end if;

  insert into public.program_weeks (
    title,
    week_number,
    program_block_id
  )
  values (
    coalesce(nullif(trim(p_target_title), ''), v_source_week.title),
    p_target_week_number,
    p_target_block_id
  )
  returning id into v_new_week_id;

  for v_source_day in
    select *
    from public.program_days
    where program_week_id = p_source_week_id
    order by day_number asc
  loop
    insert into public.program_days (
      title,
      day_number,
      program_week_id,
      notes,
      warmup,
      scheduled_date
    )
    values (
      v_source_day.title,
      v_source_day.day_number,
      v_new_week_id,
      coalesce(v_source_day.notes, ''),
      coalesce(v_source_day.warmup, ''),
      v_source_day.scheduled_date
    )
    returning id into v_new_day_id;

    for v_source_exercise in
      select *
      from public.program_exercises
      where program_day_id = v_source_day.id
      order by created_at asc
    loop
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
        v_new_day_id,
        v_source_exercise.name,
        coalesce(v_source_exercise.sets, ''),
        coalesce(v_source_exercise.reps, ''),
        coalesce(v_source_exercise.load, ''),
        coalesce(v_source_exercise.rpe, ''),
        coalesce(v_source_exercise.notes, ''),
        coalesce(v_source_exercise.priority, ''),
        v_source_exercise.exercise_number,
        v_source_exercise.exercise_format,
        v_source_exercise.superset_group,
        v_source_exercise.rest_seconds,
        v_source_exercise.exercise_library_id
      );
    end loop;
  end loop;

  return v_new_week_id;
end;
$$;

grant execute on function public.duplicate_program_week(uuid, uuid, integer, text) to authenticated;
