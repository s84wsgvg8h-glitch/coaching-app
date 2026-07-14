-- Coaches could not add program weeks: RLS insert/select mismatch on program_weeks.
-- Fix by aligning block access checks and adding a security-definer create RPC.

create or replace function public.can_access_program_block(p_block_id uuid)
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
          and athlete.organization_id = public.get_my_organization_id()
          and public.is_coach_or_admin()
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
  select public.can_access_program_block(p_block_id);
$$;

create or replace function public.create_program_week_for_block(
  p_block_id uuid,
  p_title text,
  p_week_number integer default 1
)
returns public.program_weeks
language plpgsql
security definer
set search_path = public
as $$
declare
  v_week public.program_weeks;
begin
  if auth.uid() is null then
    raise exception 'Niet ingelogd'
      using errcode = '42501';
  end if;

  if not public.can_write_program_block(p_block_id) then
    raise exception 'Geen schrijfrechten voor dit programma'
      using errcode = '42501';
  end if;

  if nullif(trim(p_title), '') is null then
    raise exception 'Weektitel is verplicht'
      using errcode = '22023';
  end if;

  insert into public.program_weeks (title, week_number, program_block_id)
  values (
    trim(p_title),
    greatest(coalesce(p_week_number, 1), 1),
    p_block_id
  )
  returning * into v_week;

  return v_week;
end;
$$;

revoke all on function public.create_program_week_for_block(uuid, text, integer) from public;
grant execute on function public.create_program_week_for_block(uuid, text, integer) to authenticated;
