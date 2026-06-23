alter table public.coach_todos
  add column if not exists completed_at timestamptz;

alter table public.video_reviews
  add column if not exists feedback_media jsonb not null default '[]'::jsonb;
