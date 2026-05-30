create or replace function public.can_access_message(p_message_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.messages m
    where m.id = p_message_id
      and (
        (
          m.group_id is not null
          and exists (
            select 1
            from public.chat_group_members gm
            where gm.group_id = m.group_id
              and gm.user_id = auth.uid()
          )
        )
        or (
          m.group_id is null
          and (m.sender_id = auth.uid() or m.receiver_id = auth.uid())
        )
      )
  );
$$;

create table if not exists public.chat_message_reactions (
  message_id uuid not null references public.messages(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  emoji text not null,
  created_at timestamptz not null default now(),
  primary key (message_id, user_id)
);

create index if not exists chat_message_reactions_message_id_idx
  on public.chat_message_reactions (message_id);

alter table public.chat_message_reactions enable row level security;

drop policy if exists "chat_message_reactions_select" on public.chat_message_reactions;
create policy "chat_message_reactions_select"
  on public.chat_message_reactions for select
  using (public.can_access_message(message_id));

drop policy if exists "chat_message_reactions_insert" on public.chat_message_reactions;
create policy "chat_message_reactions_insert"
  on public.chat_message_reactions for insert
  with check (
    user_id = auth.uid()
    and public.can_access_message(message_id)
  );

drop policy if exists "chat_message_reactions_update" on public.chat_message_reactions;
create policy "chat_message_reactions_update"
  on public.chat_message_reactions for update
  using (
    user_id = auth.uid()
    and public.can_access_message(message_id)
  )
  with check (
    user_id = auth.uid()
    and public.can_access_message(message_id)
  );

drop policy if exists "chat_message_reactions_delete" on public.chat_message_reactions;
create policy "chat_message_reactions_delete"
  on public.chat_message_reactions for delete
  using (
    user_id = auth.uid()
    and public.can_access_message(message_id)
  );

grant execute on function public.can_access_message(uuid) to authenticated;
