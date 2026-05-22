-- Profile & group avatars, group description, admins-only mode
alter table public.profiles
  add column if not exists avatar_url text;

alter table public.chat_groups
  add column if not exists description text,
  add column if not exists avatar_url text,
  add column if not exists admins_only boolean not null default false;

-- Per-user conversation preferences (pin, mute, clear, hide)
create table if not exists public.chat_conversation_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  peer_user_id uuid references public.profiles(id) on delete cascade,
  group_id uuid references public.chat_groups(id) on delete cascade,
  pinned boolean not null default false,
  muted boolean not null default false,
  cleared_at timestamptz,
  hidden_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (peer_user_id is not null and group_id is null)
    or (peer_user_id is null and group_id is not null)
  )
);

create unique index if not exists chat_conversation_settings_direct_unique
  on public.chat_conversation_settings (user_id, peer_user_id)
  where group_id is null;

create unique index if not exists chat_conversation_settings_group_unique
  on public.chat_conversation_settings (user_id, group_id)
  where peer_user_id is null;

alter table public.chat_conversation_settings enable row level security;

drop policy if exists "chat_conversation_settings_own" on public.chat_conversation_settings;
create policy "chat_conversation_settings_own"
  on public.chat_conversation_settings for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Avatars bucket
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "avatars_select_public" on storage.objects;
create policy "avatars_select_public"
  on storage.objects for select
  using (bucket_id = 'avatars');

drop policy if exists "avatars_insert_own_folder" on storage.objects;
create policy "avatars_insert_own_folder"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "avatars_update_own_folder" on storage.objects;
create policy "avatars_update_own_folder"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Group admin can update group & remove members
drop policy if exists "chat_groups_update_admin" on public.chat_groups;
create policy "chat_groups_update_admin"
  on public.chat_groups for update
  using (public.is_chat_group_admin(id))
  with check (public.is_chat_group_admin(id));

drop policy if exists "chat_group_members_delete_admin" on public.chat_group_members;
create policy "chat_group_members_delete_admin"
  on public.chat_group_members for delete
  using (
    public.is_chat_group_admin(group_id)
    and user_id <> auth.uid()
  );

-- Only admins can post when admins_only is enabled
create or replace function public.can_send_group_message(p_group_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select case
    when not coalesce(
      (select admins_only from public.chat_groups where id = p_group_id),
      false
    ) then public.is_chat_group_member(p_group_id)
    else public.is_chat_group_admin(p_group_id)
  end;
$$;

drop policy if exists "messages_insert_group_member" on public.messages;
create policy "messages_insert_group_member"
  on public.messages for insert
  with check (
    group_id is null
    or public.can_send_group_message(group_id)
  );
