-- Fix infinite recursion in chat_group_members RLS policies.
-- Run this in Supabase SQL Editor if you already applied the first migration.

drop policy if exists "chat_groups_select_member" on chat_groups;
drop policy if exists "chat_group_members_select_member" on chat_group_members;
drop policy if exists "chat_group_members_insert_creator" on chat_group_members;
drop policy if exists "messages_select_group_member" on messages;
drop policy if exists "messages_insert_group_member" on messages;
drop policy if exists "chat_group_read_states_write_own" on chat_group_read_states;

create or replace function public.is_chat_group_member(p_group_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.chat_group_members
    where group_id = p_group_id
      and user_id = auth.uid()
  );
$$;

create or replace function public.is_chat_group_creator(p_group_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.chat_groups
    where id = p_group_id
      and created_by = auth.uid()
  );
$$;

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

create policy "chat_group_members_insert_creator"
  on chat_group_members for insert
  with check (
    public.is_chat_group_creator(group_id)
    or user_id = auth.uid()
  );

create policy "chat_group_read_states_write_own"
  on chat_group_read_states for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "messages_select_group_member"
  on messages for select
  using (
    group_id is null
    or public.is_chat_group_member(group_id)
  );

create policy "messages_insert_group_member"
  on messages for insert
  with check (
    group_id is null
    or public.is_chat_group_member(group_id)
  );
