-- Scoped program RLS: athletes/coaches only see their own program data

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
        or b.created_by = auth.uid()
        or athlete.coach_id = auth.uid()
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

create or replace function public.can_access_program_week(p_week_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.program_weeks w
    where w.id = p_week_id
      and public.can_access_program_block(w.program_block_id)
  );
$$;

create or replace function public.can_write_program_week(p_week_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.program_weeks w
    where w.id = p_week_id
      and public.can_write_program_block(w.program_block_id)
  );
$$;

create or replace function public.can_access_program_day(p_day_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.program_days d
    join public.program_weeks w on w.id = d.program_week_id
    where d.id = p_day_id
      and public.can_access_program_block(w.program_block_id)
  );
$$;

create or replace function public.can_write_program_day(p_day_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.program_days d
    join public.program_weeks w on w.id = d.program_week_id
    where d.id = p_day_id
      and public.can_write_program_block(w.program_block_id)
  );
$$;

create or replace function public.can_access_program_exercise(p_exercise_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.program_exercises e
    join public.program_days d on d.id = e.program_day_id
    join public.program_weeks w on w.id = d.program_week_id
    where e.id = p_exercise_id
      and public.can_access_program_block(w.program_block_id)
  );
$$;

create or replace function public.can_write_program_exercise(p_exercise_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.program_exercises e
    join public.program_days d on d.id = e.program_day_id
    join public.program_weeks w on w.id = d.program_week_id
    where e.id = p_exercise_id
      and public.can_write_program_block(w.program_block_id)
  );
$$;

grant execute on function public.can_access_program_block(uuid) to authenticated;
grant execute on function public.can_write_program_block(uuid) to authenticated;
grant execute on function public.can_access_program_week(uuid) to authenticated;
grant execute on function public.can_write_program_week(uuid) to authenticated;
grant execute on function public.can_access_program_day(uuid) to authenticated;
grant execute on function public.can_write_program_day(uuid) to authenticated;
grant execute on function public.can_access_program_exercise(uuid) to authenticated;
grant execute on function public.can_write_program_exercise(uuid) to authenticated;

-- program_blocks
drop policy if exists "Users can read program blocks" on public.program_blocks;
drop policy if exists "Coach can delete program blocks" on public.program_blocks;
drop policy if exists "Coach can update program blocks" on public.program_blocks;
drop policy if exists "Coaches can create program blocks" on public.program_blocks;

drop policy if exists "program_blocks_select_scoped" on public.program_blocks;
create policy "program_blocks_select_scoped"
  on public.program_blocks for select
  using (public.can_access_program_block(id));

drop policy if exists "program_blocks_insert_coach" on public.program_blocks;
create policy "program_blocks_insert_coach"
  on public.program_blocks for insert
  with check (
    public.is_coach_or_admin()
    and auth.uid() = created_by
  );

drop policy if exists "program_blocks_update_scoped" on public.program_blocks;
create policy "program_blocks_update_scoped"
  on public.program_blocks for update
  using (public.can_write_program_block(id))
  with check (public.can_write_program_block(id));

drop policy if exists "program_blocks_delete_scoped" on public.program_blocks;
create policy "program_blocks_delete_scoped"
  on public.program_blocks for delete
  using (public.can_write_program_block(id));

-- program_weeks
drop policy if exists "Users can read program weeks" on public.program_weeks;
drop policy if exists "Coach can delete program weeks" on public.program_weeks;
drop policy if exists "Coach can update program weeks" on public.program_weeks;
drop policy if exists "Users can create program weeks" on public.program_weeks;

drop policy if exists "program_weeks_select_scoped" on public.program_weeks;
create policy "program_weeks_select_scoped"
  on public.program_weeks for select
  using (public.can_access_program_week(id));

drop policy if exists "program_weeks_insert_scoped" on public.program_weeks;
create policy "program_weeks_insert_scoped"
  on public.program_weeks for insert
  with check (public.can_write_program_block(program_block_id));

drop policy if exists "program_weeks_update_scoped" on public.program_weeks;
create policy "program_weeks_update_scoped"
  on public.program_weeks for update
  using (public.can_write_program_week(id))
  with check (public.can_write_program_block(program_block_id));

drop policy if exists "program_weeks_delete_scoped" on public.program_weeks;
create policy "program_weeks_delete_scoped"
  on public.program_weeks for delete
  using (public.can_write_program_week(id));

-- program_days
drop policy if exists "Coach can delete program days" on public.program_days;
drop policy if exists "Coaches can update program days" on public.program_days;
drop policy if exists "program_days_insert" on public.program_days;
drop policy if exists "program_days_select" on public.program_days;

drop policy if exists "program_days_select_scoped" on public.program_days;
create policy "program_days_select_scoped"
  on public.program_days for select
  using (public.can_access_program_day(id));

drop policy if exists "program_days_insert_scoped" on public.program_days;
create policy "program_days_insert_scoped"
  on public.program_days for insert
  with check (
    public.can_write_program_block(
      (select w.program_block_id from public.program_weeks w where w.id = program_week_id)
    )
  );

drop policy if exists "program_days_update_scoped" on public.program_days;
create policy "program_days_update_scoped"
  on public.program_days for update
  using (public.can_write_program_day(id))
  with check (
    public.can_write_program_block(
      (select w.program_block_id from public.program_weeks w where w.id = program_week_id)
    )
  );

drop policy if exists "program_days_delete_scoped" on public.program_days;
create policy "program_days_delete_scoped"
  on public.program_days for delete
  using (public.can_write_program_day(id));

-- program_exercises
drop policy if exists "Coach can delete program exercises" on public.program_exercises;
drop policy if exists "Coaches can update program exercises" on public.program_exercises;
drop policy if exists "program_exercises_insert" on public.program_exercises;
drop policy if exists "program_exercises_select" on public.program_exercises;

drop policy if exists "program_exercises_select_scoped" on public.program_exercises;
create policy "program_exercises_select_scoped"
  on public.program_exercises for select
  using (public.can_access_program_exercise(id));

drop policy if exists "program_exercises_insert_scoped" on public.program_exercises;
create policy "program_exercises_insert_scoped"
  on public.program_exercises for insert
  with check (
    public.can_write_program_block(
      (
        select w.program_block_id
        from public.program_days d
        join public.program_weeks w on w.id = d.program_week_id
        where d.id = program_day_id
      )
    )
  );

drop policy if exists "program_exercises_update_scoped" on public.program_exercises;
create policy "program_exercises_update_scoped"
  on public.program_exercises for update
  using (public.can_write_program_exercise(id))
  with check (
    public.can_write_program_block(
      (
        select w.program_block_id
        from public.program_days d
        join public.program_weeks w on w.id = d.program_week_id
        where d.id = program_day_id
      )
    )
  );

drop policy if exists "program_exercises_delete_scoped" on public.program_exercises;
create policy "program_exercises_delete_scoped"
  on public.program_exercises for delete
  using (public.can_write_program_exercise(id));
