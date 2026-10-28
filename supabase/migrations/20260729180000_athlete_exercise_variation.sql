-- Coach can mark an exercise slot as "athlete chooses variation"; athlete fills the
-- concrete name once and it syncs across all weeks in the block.

alter table public.program_exercises
  add column if not exists block_slot_key uuid,
  add column if not exists variation_base_name text;

create index if not exists program_exercises_block_slot_key_idx
  on public.program_exercises (block_slot_key)
  where block_slot_key is not null;

create or replace function public.set_coach_exercise_athlete_variation_mode(
  p_exercise_id uuid,
  p_enabled boolean,
  p_base_name text default null
)
returns setof public.program_exercises
language plpgsql
security definer
set search_path = public
as $$
declare
  v_exercise public.program_exercises%rowtype;
  v_day_number integer;
  v_block_id uuid;
  v_base_name text;
  v_slot_key uuid;
  v_target record;
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

  select d.day_number, w.program_block_id
  into v_day_number, v_block_id
  from public.program_days d
  join public.program_weeks w on w.id = d.program_week_id
  where d.id = v_exercise.program_day_id;

  if not found then
    raise exception 'Dag niet gevonden'
      using errcode = 'P0002';
  end if;

  if not public.can_write_program_block(v_block_id) then
    raise exception 'Geen schrijfrechten voor dit programma'
      using errcode = '42501';
  end if;

  if v_exercise.exercise_format = 'athlete_extra' then
    raise exception 'Extra oefeningen ondersteunen geen variatie-modus'
      using errcode = '42501';
  end if;

  if p_enabled then
    v_base_name := nullif(trim(coalesce(p_base_name, v_exercise.name)), '');

    if v_base_name is null then
      raise exception 'Vul eerst een oefeningnaam in'
        using errcode = '22023';
    end if;

    if char_length(v_base_name) > 120 then
      raise exception 'Oefeningnaam is te lang'
        using errcode = '22023';
    end if;

    v_slot_key := coalesce(v_exercise.block_slot_key, gen_random_uuid());

    for v_target in
      select e.id
      from public.program_exercises e
      join public.program_days d on d.id = e.program_day_id
      join public.program_weeks w on w.id = d.program_week_id
      where w.program_block_id = v_block_id
        and d.day_number = v_day_number
        and e.exercise_number is not distinct from v_exercise.exercise_number
        and e.exercise_format is distinct from 'athlete_extra'
    loop
      update public.program_exercises
      set
        block_slot_key = v_slot_key,
        variation_base_name = v_base_name,
        exercise_format = 'athlete_choice',
        name = case
          when block_slot_key is distinct from v_slot_key
            or variation_base_name is distinct from v_base_name
            or name is null
            or btrim(name) = ''
            or lower(btrim(name)) = lower(btrim(coalesce(variation_base_name, '')))
          then v_base_name
          else name
        end
      where id = v_target.id;
    end loop;
  else
    v_slot_key := v_exercise.block_slot_key;

    if v_slot_key is null then
      return;
    end if;

    for v_target in
      select e.id
      from public.program_exercises e
      join public.program_days d on d.id = e.program_day_id
      join public.program_weeks w on w.id = d.program_week_id
      where w.program_block_id = v_block_id
        and e.block_slot_key = v_slot_key
    loop
      update public.program_exercises
      set
        block_slot_key = null,
        variation_base_name = null,
        exercise_format = case
          when exercise_format = 'athlete_choice' then 'normal'
          else exercise_format
        end
      where id = v_target.id;
    end loop;
  end if;

  return query
  select e.*
  from public.program_exercises e
  join public.program_days d on d.id = e.program_day_id
  join public.program_weeks w on w.id = d.program_week_id
  where w.program_block_id = v_block_id
    and (
      (p_enabled and e.block_slot_key = v_slot_key)
      or (not p_enabled and e.id = p_exercise_id)
    );
end;
$$;

create or replace function public.set_athlete_exercise_variation_choice(
  p_exercise_id uuid,
  p_chosen_name text
)
returns setof public.program_exercises
language plpgsql
security definer
set search_path = public
as $$
declare
  v_exercise public.program_exercises%rowtype;
  v_block_id uuid;
  v_chosen_name text;
begin
  if auth.uid() is null then
    raise exception 'Niet ingelogd'
      using errcode = '42501';
  end if;

  v_chosen_name := nullif(trim(p_chosen_name), '');

  if v_chosen_name is null then
    raise exception 'Vul een variatie in'
      using errcode = '22023';
  end if;

  if char_length(v_chosen_name) > 120 then
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

  select w.program_block_id
  into v_block_id
  from public.program_days d
  join public.program_weeks w on w.id = d.program_week_id
  where d.id = v_exercise.program_day_id;

  if not found then
    raise exception 'Dag niet gevonden'
      using errcode = 'P0002';
  end if;

  if v_exercise.exercise_format is distinct from 'athlete_choice' then
    raise exception 'Deze oefening staat geen variatiekeuze toe'
      using errcode = '42501';
  end if;

  if v_exercise.block_slot_key is null then
    raise exception 'Oefening mist variatie-slot'
      using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.program_blocks b
    where b.id = v_block_id
      and b.athlete_id = auth.uid()
  ) then
    raise exception 'Geen toegang om deze variatie te wijzigen'
      using errcode = '42501';
  end if;

  return query
  with updated as (
    update public.program_exercises e
    set name = v_chosen_name
    from public.program_days d
    join public.program_weeks w on w.id = d.program_week_id
    where e.program_day_id = d.id
      and w.program_block_id = v_block_id
      and e.block_slot_key = v_exercise.block_slot_key
    returning e.*
  )
  select * from updated;
end;
$$;

-- Week duplicate must preserve variation slot metadata.
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
  v_day_offset integer;
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

  v_day_offset := (p_target_week_number - v_source_week.week_number) * 7;

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
      case
        when v_source_day.scheduled_date is not null then
          v_source_day.scheduled_date + v_day_offset
        else null
      end
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
        exercise_library_id,
        block_slot_key,
        variation_base_name
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
        v_source_exercise.exercise_library_id,
        v_source_exercise.block_slot_key,
        v_source_exercise.variation_base_name
      );
    end loop;
  end loop;

  return v_new_week_id;
end;
$$;

revoke all on function public.set_coach_exercise_athlete_variation_mode(uuid, boolean, text) from public;
grant execute on function public.set_coach_exercise_athlete_variation_mode(uuid, boolean, text) to authenticated;
revoke execute on function public.set_coach_exercise_athlete_variation_mode(uuid, boolean, text) from anon;

revoke all on function public.set_athlete_exercise_variation_choice(uuid, text) from public;
grant execute on function public.set_athlete_exercise_variation_choice(uuid, text) to authenticated;
revoke execute on function public.set_athlete_exercise_variation_choice(uuid, text) from anon;

grant execute on function public.duplicate_program_week(uuid, uuid, integer, text) to authenticated;
