-- Tighten public storage bucket SELECT policies to prevent anonymous listing.
-- Public bucket URLs (/storage/v1/object/public/...) remain available when bucket.public = true.

drop policy if exists "avatars_select_public" on storage.objects;
create policy "avatars_select_authenticated"
  on storage.objects for select
  using (bucket_id = 'avatars' and auth.uid() is not null);

drop policy if exists "chat_media_select_public" on storage.objects;
create policy "chat_media_select_authenticated"
  on storage.objects for select
  using (bucket_id = 'chat-media' and auth.uid() is not null);

drop policy if exists "Allow public read videos n3qp65_0" on storage.objects;
create policy "exercise_videos_select_authenticated"
  on storage.objects for select
  using (bucket_id = 'exercise-videos' and auth.uid() is not null);

drop policy if exists "Users can read chat files" on storage.objects;
create policy "chat_uploads_select_authenticated"
  on storage.objects for select
  using (bucket_id = 'chat-uploads' and auth.uid() is not null);

drop policy if exists "exercise_library_storage_select" on storage.objects;
create policy "exercise_library_storage_select_authenticated"
  on storage.objects for select
  using (bucket_id = 'exercise-library' and auth.uid() is not null);
