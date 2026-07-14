-- Enable Supabase Realtime (postgres_changes) for chat and program tables.
-- Without publication entries, client subscriptions receive no events.

do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'messages',
    'chat_poll_votes',
    'chat_message_reactions',
    'program_days',
    'program_exercises',
    'program_weeks',
    'athlete_exercise_sets',
    'athlete_exercise_videos',
    'athlete_exercise_notes'
  ]
  loop
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = tbl
    ) then
      execute format(
        'alter publication supabase_realtime add table public.%I',
        tbl
      );
    end if;
  end loop;
end $$;

-- DELETE payloads need old row ids in realtime events.
alter table public.messages replica identity full;
alter table public.program_exercises replica identity full;
alter table public.program_days replica identity full;
alter table public.chat_message_reactions replica identity full;
