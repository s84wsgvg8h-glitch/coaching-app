create table if not exists public.chat_poll_votes (
  poll_message_id uuid not null references public.messages(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  option_id text not null,
  voted_at timestamptz default now(),
  primary key (poll_message_id, user_id)
);

create index if not exists chat_poll_votes_message_id_idx
  on public.chat_poll_votes (poll_message_id);

alter table public.chat_poll_votes enable row level security;

create or replace function public.can_access_poll(p_poll_message_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.messages m
    join public.chat_group_members gm on gm.group_id = m.group_id
    where m.id = p_poll_message_id
      and m.group_id is not null
      and gm.user_id = auth.uid()
  );
$$;

drop policy if exists "chat_poll_votes_select" on public.chat_poll_votes;
create policy "chat_poll_votes_select"
  on public.chat_poll_votes for select
  using (public.can_access_poll(poll_message_id));

drop policy if exists "chat_poll_votes_insert" on public.chat_poll_votes;
create policy "chat_poll_votes_insert"
  on public.chat_poll_votes for insert
  with check (
    user_id = auth.uid()
    and public.can_access_poll(poll_message_id)
  );

drop policy if exists "chat_poll_votes_update" on public.chat_poll_votes;
create policy "chat_poll_votes_update"
  on public.chat_poll_votes for update
  using (
    user_id = auth.uid()
    and public.can_access_poll(poll_message_id)
  )
  with check (
    user_id = auth.uid()
    and public.can_access_poll(poll_message_id)
  );

drop policy if exists "chat_poll_votes_delete" on public.chat_poll_votes;
create policy "chat_poll_votes_delete"
  on public.chat_poll_votes for delete
  using (
    user_id = auth.uid()
    and public.can_access_poll(poll_message_id)
  );
