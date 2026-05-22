insert into storage.buckets (id, name, public)
values ('chat-media', 'chat-media', true)
on conflict (id) do nothing;

create policy "chat_media_select_public"
  on storage.objects for select
  using (bucket_id = 'chat-media');

create policy "chat_media_insert_own_folder"
  on storage.objects for insert
  with check (
    bucket_id = 'chat-media'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
