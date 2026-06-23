-- Coach notes and goals per athlete competition registration

alter table public.athlete_competitions
  add column if not exists coach_notes text,
  add column if not exists goals text;

drop policy if exists "athlete_competitions_update" on public.athlete_competitions;
create policy "athlete_competitions_update"
  on public.athlete_competitions for update
  using (public.is_coach())
  with check (public.is_coach());
