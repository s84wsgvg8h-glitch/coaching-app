-- Athlete logging RLS gaps + performance indexes (audit Q1)

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

create index if not exists athlete_exercise_sets_program_exercise_id_idx
  on public.athlete_exercise_sets (program_exercise_id);

create index if not exists athlete_day_checkins_day_athlete_idx
  on public.athlete_day_checkins (program_day_id, athlete_id);

create index if not exists program_blocks_athlete_id_idx
  on public.program_blocks (athlete_id);

create index if not exists coach_todos_coach_auto_key_idx
  on public.coach_todos (coach_id, auto_key);

-- ---------------------------------------------------------------------------
-- athlete_exercise_sets — add admin access to existing policy
-- ---------------------------------------------------------------------------

drop policy if exists "athlete_exercise_sets_athlete_rw" on public.athlete_exercise_sets;
create policy "athlete_exercise_sets_athlete_rw"
  on public.athlete_exercise_sets for all
  using (
    public.is_admin()
    or auth.uid() = athlete_id
    or exists (
      select 1 from public.profiles p
      where p.id = athlete_exercise_sets.athlete_id
        and p.coach_id = auth.uid()
    )
  )
  with check (
    public.is_admin()
    or auth.uid() = athlete_id
    or exists (
      select 1 from public.profiles p
      where p.id = athlete_exercise_sets.athlete_id
        and p.coach_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- athlete_day_checkins
-- ---------------------------------------------------------------------------

alter table public.athlete_day_checkins enable row level security;

drop policy if exists "athlete_day_checkins_select_scoped" on public.athlete_day_checkins;
create policy "athlete_day_checkins_select_scoped"
  on public.athlete_day_checkins for select
  using (
    public.is_admin()
    or auth.uid() = athlete_id
    or exists (
      select 1 from public.profiles p
      where p.id = athlete_day_checkins.athlete_id
        and p.coach_id = auth.uid()
    )
  );

drop policy if exists "athlete_day_checkins_insert_scoped" on public.athlete_day_checkins;
create policy "athlete_day_checkins_insert_scoped"
  on public.athlete_day_checkins for insert
  with check (
    public.is_admin()
    or auth.uid() = athlete_id
    or exists (
      select 1 from public.profiles p
      where p.id = athlete_day_checkins.athlete_id
        and p.coach_id = auth.uid()
    )
  );

drop policy if exists "athlete_day_checkins_update_scoped" on public.athlete_day_checkins;
create policy "athlete_day_checkins_update_scoped"
  on public.athlete_day_checkins for update
  using (
    public.is_admin()
    or auth.uid() = athlete_id
    or exists (
      select 1 from public.profiles p
      where p.id = athlete_day_checkins.athlete_id
        and p.coach_id = auth.uid()
    )
  )
  with check (
    public.is_admin()
    or auth.uid() = athlete_id
    or exists (
      select 1 from public.profiles p
      where p.id = athlete_day_checkins.athlete_id
        and p.coach_id = auth.uid()
    )
  );

drop policy if exists "athlete_day_checkins_delete_scoped" on public.athlete_day_checkins;
create policy "athlete_day_checkins_delete_scoped"
  on public.athlete_day_checkins for delete
  using (
    public.is_admin()
    or auth.uid() = athlete_id
    or exists (
      select 1 from public.profiles p
      where p.id = athlete_day_checkins.athlete_id
        and p.coach_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- athlete_exercise_notes
-- ---------------------------------------------------------------------------

alter table public.athlete_exercise_notes enable row level security;

drop policy if exists "athlete_exercise_notes_select_scoped" on public.athlete_exercise_notes;
create policy "athlete_exercise_notes_select_scoped"
  on public.athlete_exercise_notes for select
  using (
    public.is_admin()
    or auth.uid() = athlete_id
    or exists (
      select 1 from public.profiles p
      where p.id = athlete_exercise_notes.athlete_id
        and p.coach_id = auth.uid()
    )
  );

drop policy if exists "athlete_exercise_notes_insert_scoped" on public.athlete_exercise_notes;
create policy "athlete_exercise_notes_insert_scoped"
  on public.athlete_exercise_notes for insert
  with check (
    public.is_admin()
    or auth.uid() = athlete_id
    or exists (
      select 1 from public.profiles p
      where p.id = athlete_exercise_notes.athlete_id
        and p.coach_id = auth.uid()
    )
  );

drop policy if exists "athlete_exercise_notes_update_scoped" on public.athlete_exercise_notes;
create policy "athlete_exercise_notes_update_scoped"
  on public.athlete_exercise_notes for update
  using (
    public.is_admin()
    or auth.uid() = athlete_id
    or exists (
      select 1 from public.profiles p
      where p.id = athlete_exercise_notes.athlete_id
        and p.coach_id = auth.uid()
    )
  )
  with check (
    public.is_admin()
    or auth.uid() = athlete_id
    or exists (
      select 1 from public.profiles p
      where p.id = athlete_exercise_notes.athlete_id
        and p.coach_id = auth.uid()
    )
  );

drop policy if exists "athlete_exercise_notes_delete_scoped" on public.athlete_exercise_notes;
create policy "athlete_exercise_notes_delete_scoped"
  on public.athlete_exercise_notes for delete
  using (
    public.is_admin()
    or auth.uid() = athlete_id
    or exists (
      select 1 from public.profiles p
      where p.id = athlete_exercise_notes.athlete_id
        and p.coach_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- athlete_exercise_videos — full CRUD (update policy existed)
-- ---------------------------------------------------------------------------

alter table public.athlete_exercise_videos enable row level security;

drop policy if exists "athlete_exercise_videos_select_scoped" on public.athlete_exercise_videos;
create policy "athlete_exercise_videos_select_scoped"
  on public.athlete_exercise_videos for select
  using (
    public.is_admin()
    or auth.uid() = athlete_id
    or exists (
      select 1 from public.profiles p
      where p.id = athlete_exercise_videos.athlete_id
        and p.coach_id = auth.uid()
    )
  );

drop policy if exists "athlete_exercise_videos_insert_scoped" on public.athlete_exercise_videos;
create policy "athlete_exercise_videos_insert_scoped"
  on public.athlete_exercise_videos for insert
  with check (
    public.is_admin()
    or auth.uid() = athlete_id
    or exists (
      select 1 from public.profiles p
      where p.id = athlete_exercise_videos.athlete_id
        and p.coach_id = auth.uid()
    )
  );

drop policy if exists "athlete_exercise_videos_update_coach" on public.athlete_exercise_videos;
drop policy if exists "athlete_exercise_videos_update_scoped" on public.athlete_exercise_videos;
create policy "athlete_exercise_videos_update_scoped"
  on public.athlete_exercise_videos for update
  using (
    public.is_admin()
    or auth.uid() = athlete_id
    or exists (
      select 1 from public.profiles p
      where p.id = athlete_exercise_videos.athlete_id
        and p.coach_id = auth.uid()
    )
  )
  with check (
    public.is_admin()
    or auth.uid() = athlete_id
    or exists (
      select 1 from public.profiles p
      where p.id = athlete_exercise_videos.athlete_id
        and p.coach_id = auth.uid()
    )
  );

drop policy if exists "athlete_exercise_videos_delete_scoped" on public.athlete_exercise_videos;
create policy "athlete_exercise_videos_delete_scoped"
  on public.athlete_exercise_videos for delete
  using (
    public.is_admin()
    or auth.uid() = athlete_id
    or exists (
      select 1 from public.profiles p
      where p.id = athlete_exercise_videos.athlete_id
        and p.coach_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- program_exercise_sets (legacy table — only if present)
-- ---------------------------------------------------------------------------

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'program_exercise_sets'
      and column_name = 'program_exercise_id'
  ) then
    execute 'alter table public.program_exercise_sets enable row level security';

    execute 'drop policy if exists "program_exercise_sets_select_scoped" on public.program_exercise_sets';
    execute $policy$
      create policy "program_exercise_sets_select_scoped"
        on public.program_exercise_sets for select
        using (public.can_access_program_exercise(program_exercise_id))
    $policy$;

    execute 'drop policy if exists "program_exercise_sets_insert_scoped" on public.program_exercise_sets';
    execute $policy$
      create policy "program_exercise_sets_insert_scoped"
        on public.program_exercise_sets for insert
        with check (public.can_write_program_exercise(program_exercise_id))
    $policy$;

    execute 'drop policy if exists "program_exercise_sets_update_scoped" on public.program_exercise_sets';
    execute $policy$
      create policy "program_exercise_sets_update_scoped"
        on public.program_exercise_sets for update
        using (public.can_write_program_exercise(program_exercise_id))
        with check (public.can_write_program_exercise(program_exercise_id))
    $policy$;

    execute 'drop policy if exists "program_exercise_sets_delete_scoped" on public.program_exercise_sets';
    execute $policy$
      create policy "program_exercise_sets_delete_scoped"
        on public.program_exercise_sets for delete
        using (public.can_write_program_exercise(program_exercise_id))
    $policy$;
  end if;
end $$;
