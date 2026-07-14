-- Chat UGC moderation: user blocks + content reports

create table if not exists public.chat_user_blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint chat_user_blocks_not_self check (blocker_id <> blocked_id)
);

create index if not exists chat_user_blocks_blocked_id_idx
  on public.chat_user_blocks (blocked_id);

alter table public.chat_user_blocks enable row level security;

drop policy if exists "chat_user_blocks_select" on public.chat_user_blocks;
create policy "chat_user_blocks_select"
  on public.chat_user_blocks for select
  using (blocker_id = auth.uid());

drop policy if exists "chat_user_blocks_insert" on public.chat_user_blocks;
create policy "chat_user_blocks_insert"
  on public.chat_user_blocks for insert
  with check (
    blocker_id = auth.uid()
    and blocked_id <> auth.uid()
  );

drop policy if exists "chat_user_blocks_delete" on public.chat_user_blocks;
create policy "chat_user_blocks_delete"
  on public.chat_user_blocks for delete
  using (blocker_id = auth.uid());

create or replace function public.is_chat_peer_blocked(p_user_a uuid, p_user_b uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.chat_user_blocks b
    where (
      (b.blocker_id = p_user_a and b.blocked_id = p_user_b)
      or (b.blocker_id = p_user_b and b.blocked_id = p_user_a)
    )
  );
$$;

grant execute on function public.is_chat_peer_blocked(uuid, uuid) to authenticated;

create table if not exists public.chat_content_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reported_user_id uuid references public.profiles(id) on delete set null,
  message_id uuid references public.messages(id) on delete set null,
  group_id uuid references public.chat_groups(id) on delete set null,
  reason text not null,
  details text,
  status text not null default 'pending'
    check (status in ('pending', 'reviewed', 'dismissed', 'actioned')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id) on delete set null
);

create index if not exists chat_content_reports_status_idx
  on public.chat_content_reports (status, created_at desc);

create index if not exists chat_content_reports_reporter_idx
  on public.chat_content_reports (reporter_id, created_at desc);

alter table public.chat_content_reports enable row level security;

drop policy if exists "chat_content_reports_select_own" on public.chat_content_reports;
create policy "chat_content_reports_select_own"
  on public.chat_content_reports for select
  using (reporter_id = auth.uid() or public.is_admin());

drop policy if exists "chat_content_reports_insert" on public.chat_content_reports;
create policy "chat_content_reports_insert"
  on public.chat_content_reports for insert
  with check (
    reporter_id = auth.uid()
    and (
      message_id is null
      or public.can_access_message(message_id)
    )
  );

drop policy if exists "chat_content_reports_admin_update" on public.chat_content_reports;
create policy "chat_content_reports_admin_update"
  on public.chat_content_reports for update
  using (public.is_admin())
  with check (public.is_admin());

-- Block DMs between blocked users
drop policy if exists "messages_insert_participant" on public.messages;
create policy "messages_insert_participant"
  on public.messages for insert
  with check (
    sender_id = auth.uid()
    and (
      group_id is null
      or public.can_send_group_message(group_id)
    )
    and (
      group_id is not null
      or receiver_id is null
      or not public.is_chat_peer_blocked(sender_id, receiver_id)
    )
  );
