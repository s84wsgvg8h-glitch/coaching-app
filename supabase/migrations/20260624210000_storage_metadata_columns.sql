-- Storage metadata for gradual Supabase -> R2 migration.

alter table public.messages
  add column if not exists storage_provider text not null default 'supabase',
  add column if not exists storage_bucket text,
  add column if not exists storage_path text,
  add column if not exists storage_content_type text,
  add column if not exists storage_size_bytes bigint;

alter table public.athlete_exercise_videos
  add column if not exists storage_provider text not null default 'supabase',
  add column if not exists storage_bucket text,
  add column if not exists storage_path text,
  add column if not exists storage_content_type text,
  add column if not exists storage_size_bytes bigint;

alter table public.video_reviews
  add column if not exists storage_provider text not null default 'supabase',
  add column if not exists storage_bucket text,
  add column if not exists storage_path text,
  add column if not exists storage_content_type text,
  add column if not exists storage_size_bytes bigint;

alter table public.exercise_library_items
  add column if not exists storage_provider text not null default 'supabase',
  add column if not exists storage_bucket text,
  add column if not exists storage_path text,
  add column if not exists storage_content_type text,
  add column if not exists storage_size_bytes bigint;

alter table public.profiles
  add column if not exists storage_provider text not null default 'supabase',
  add column if not exists storage_bucket text,
  add column if not exists storage_path text,
  add column if not exists storage_content_type text,
  add column if not exists storage_size_bytes bigint;

alter table public.chat_groups
  add column if not exists storage_provider text not null default 'supabase',
  add column if not exists storage_bucket text,
  add column if not exists storage_path text,
  add column if not exists storage_content_type text,
  add column if not exists storage_size_bytes bigint;

alter table public.merch_items
  add column if not exists storage_provider text not null default 'supabase',
  add column if not exists storage_bucket text,
  add column if not exists storage_path text,
  add column if not exists storage_content_type text,
  add column if not exists storage_size_bytes bigint;
