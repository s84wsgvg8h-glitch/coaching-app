alter table public.profiles
  add column if not exists availability_note text;

alter table public.athlete_exercise_videos
  add column if not exists review_requested boolean not null default false;

alter table public.athlete_competitions
  add column if not exists squat_kg numeric,
  add column if not exists bench_kg numeric,
  add column if not exists deadlift_kg numeric,
  add column if not exists total_kg numeric;

drop policy if exists "athlete_exercise_videos_update_coach" on public.athlete_exercise_videos;
create policy "athlete_exercise_videos_update_coach"
  on public.athlete_exercise_videos for update
  using (public.is_coach() or athlete_id = auth.uid())
  with check (public.is_coach() or athlete_id = auth.uid());
