alter table public.program_exercises
  add column if not exists exercise_library_id uuid
  references public.exercise_library_items(id)
  on delete set null;

create index if not exists program_exercises_exercise_library_id_idx
  on public.program_exercises (exercise_library_id);
