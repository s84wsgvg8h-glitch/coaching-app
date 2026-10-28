-- Fast block duplicate/delete via security-definer RPCs (single round trip).

create or replace function public.duplicate_program_block(
  p_source_block_id uuid,
  p_title text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_source public.program_blocks%rowtype;
  v_new_block_id uuid;
  v_first_week_id uuid;
  v_source_week record;
  v_new_week_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Niet ingelogd' using errcode = '42501';
  end if;

  if not public.is_coach_or_admin() then
    raise exception 'Geen toegang' using errcode = '42501';
  end if;

  select *
  into v_source
  from public.program_blocks
  where id = p_source_block_id;

  if not found then
    raise exception 'Block niet gevonden';
  end if;

  if not public.can_access_program_block(p_source_block_id) then
    raise exception 'Geen leesrechten voor dit block' using errcode = '42501';
  end if;

  if not public.can_write_program_block(p_source_block_id) then
    raise exception 'Geen schrijfrechten voor dit programma' using errcode = '42501';
  end if;

  if v_source.athlete_id is null then
    raise exception 'Block heeft geen atleet' using errcode = '22023';
  end if;

  if not public.can_create_program_for_athlete(v_source.athlete_id) then
    raise exception 'Geen toegang tot deze atleet' using errcode = '42501';
  end if;

  insert into public.program_blocks (
    title,
    description,
    start_date,
    created_by,
    athlete_id,
    macrocycle_id
  )
  values (
    coalesce(nullif(trim(p_title), ''), v_source.title || ' copy'),
    coalesce(v_source.description, ''),
    v_source.start_date,
    auth.uid(),
    v_source.athlete_id,
    v_source.macrocycle_id
  )
  returning id into v_new_block_id;

  for v_source_week in
    select *
    from public.program_weeks
    where program_block_id = p_source_block_id
    order by week_number asc
  loop
    v_new_week_id := public.duplicate_program_week(
      v_source_week.id,
      v_new_block_id,
      v_source_week.week_number,
      v_source_week.title
    );

    if v_first_week_id is null then
      v_first_week_id := v_new_week_id;
    end if;
  end loop;

  if v_first_week_id is null then
    insert into public.program_weeks (title, week_number, program_block_id)
    values ('Week 1', 1, v_new_block_id)
    returning id into v_first_week_id;
  end if;

  return jsonb_build_object(
    'block_id', v_new_block_id,
    'first_week_id', v_first_week_id
  );
end;
$$;

create or replace function public.delete_program_block(p_block_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Niet ingelogd' using errcode = '42501';
  end if;

  if not public.can_write_program_block(p_block_id) then
    raise exception 'Geen schrijfrechten voor dit programma' using errcode = '42501';
  end if;

  delete from public.program_exercises e
  using public.program_days d
  join public.program_weeks w on w.id = d.program_week_id
  where e.program_day_id = d.id
    and w.program_block_id = p_block_id;

  delete from public.program_days d
  using public.program_weeks w
  where d.program_week_id = w.id
    and w.program_block_id = p_block_id;

  delete from public.program_weeks
  where program_block_id = p_block_id;

  delete from public.program_blocks
  where id = p_block_id;
end;
$$;

grant execute on function public.duplicate_program_block(uuid, text) to authenticated;
grant execute on function public.delete_program_block(uuid) to authenticated;

revoke execute on function public.duplicate_program_block(uuid, text) from anon;
revoke execute on function public.delete_program_block(uuid) from anon;
