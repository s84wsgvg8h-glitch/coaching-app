-- Pinned message per conversation (per-user view)
alter table public.chat_conversation_settings
  add column if not exists pinned_message_id uuid references public.messages(id) on delete set null;

-- Users can delete their own messages; group admins can delete any group message
drop policy if exists "messages_delete_own_or_group_admin" on public.messages;
create policy "messages_delete_own_or_group_admin"
  on public.messages for delete
  using (
    sender_id = auth.uid()
    or (
      group_id is not null
      and public.is_chat_group_admin(group_id)
    )
  );
