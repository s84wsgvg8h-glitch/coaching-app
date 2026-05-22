-- Fix: group insert with .select() fails because creator is not a member yet.
-- Run in Supabase SQL Editor.

drop policy if exists "chat_groups_select_member" on chat_groups;
drop policy if exists "chat_group_members_select_member" on chat_group_members;

create policy "chat_groups_select_member"
  on chat_groups for select
  using (
    public.is_chat_group_member(id)
    or created_by = auth.uid()
  );

create policy "chat_group_members_select_member"
  on chat_group_members for select
  using (
    public.is_chat_group_member(group_id)
    or public.is_chat_group_creator(group_id)
  );
