alter table public.profiles
  add column if not exists video_submit_target text not null default 'chat'
  check (video_submit_target in ('chat', 'video_review'));

alter table public.video_reviews
  add column if not exists exercise_name text,
  add column if not exists set_number integer,
  add column if not exists caption text,
  add column if not exists thumbnail_url text,
  add column if not exists reference_video_url text,
  add column if not exists reference_video_title text;
