create table if not exists chat_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists chat_group_members (
  group_id uuid not null references chat_groups(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create table if not exists chat_group_read_states (
  group_id uuid not null references chat_groups(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

alter table messages
  add column if not exists group_id uuid references chat_groups(id) on delete cascade;

create index if not exists messages_group_id_created_at_idx
  on messages (group_id, created_at desc);

-- Helper functions bypass RLS to avoid infinite recursion in policies.
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

alter table chat_groups enable row level security;
alter table chat_group_members enable row level security;
alter table chat_group_read_states enable row level security;

create policy "chat_groups_select_member"
  on chat_groups for select
  using (
    public.is_chat_group_member(id)
    or created_by = auth.uid()
  );

create policy "chat_groups_insert_coach"
  on chat_groups for insert
  with check (auth.uid() = created_by);

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

create policy "chat_group_read_states_select_own"
  on chat_group_read_states for select
  using (user_id = auth.uid());

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
