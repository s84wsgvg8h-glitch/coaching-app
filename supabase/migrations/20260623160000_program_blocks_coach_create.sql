-- Coach program creation + athlete read/write access on own blocks

create or replace function public.can_create_program_for_athlete(p_athlete_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select
    p_athlete_id is not null
    and (
      public.is_admin()
      or exists (
        select 1
        from public.profiles athlete
        where athlete.id = p_athlete_id
          and athlete.role = 'atleet'
          and (
            athlete.coach_id = auth.uid()
            or athlete.archived_by_coach_id = auth.uid()
            or (
              athlete.organization_id is not null
              and athlete.organization_id = public.get_my_organization_id()
              and public.is_coach_or_admin()
            )
          )
      )
    );
$$;

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
      )
  );
$$;

create or replace function public.create_program_block_for_athlete(
  p_athlete_id uuid,
  p_title text,
  p_description text default '',
  p_start_date date default current_date,
  p_macrocycle_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_block_id uuid;
begin
  if not public.is_coach_or_admin() then
    raise exception 'Geen toegang';
  end if;

  if not public.can_create_program_for_athlete(p_athlete_id) then
    raise exception 'Geen toegang tot deze atleet';
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
    coalesce(nullif(trim(p_title), ''), 'Block 1'),
    coalesce(p_description, ''),
    coalesce(p_start_date, current_date),
    auth.uid(),
    p_athlete_id,
    p_macrocycle_id
  )
  returning id into v_block_id;

  insert into public.program_weeks (title, week_number, program_block_id)
  values ('Week 1', 1, v_block_id);

  return v_block_id;
end;
$$;

grant execute on function public.can_create_program_for_athlete(uuid) to authenticated;
grant execute on function public.create_program_block_for_athlete(uuid, text, text, date, uuid) to authenticated;

drop policy if exists "program_blocks_insert_coach" on public.program_blocks;
create policy "program_blocks_insert_coach"
  on public.program_blocks for insert
  with check (
    public.is_coach_or_admin()
    and auth.uid() = created_by
    and public.can_create_program_for_athlete(athlete_id)
  );

drop policy if exists "program_blocks_insert_athlete_own" on public.program_blocks;
