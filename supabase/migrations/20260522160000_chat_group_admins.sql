alter table chat_group_members
  add column if not exists role text not null default 'member'
  check (role in ('member', 'admin'));

update chat_group_members cgm
set role = 'admin'
from chat_groups cg
where cgm.group_id = cg.id
  and cgm.user_id = cg.created_by
  and cgm.role <> 'admin';

create or replace function public.is_chat_group_admin(p_group_id uuid)
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
      and role = 'admin'
  )
  or public.is_chat_group_creator(p_group_id);
$$;

drop policy if exists "chat_group_members_update_admin" on chat_group_members;

create policy "chat_group_members_update_admin"
  on chat_group_members for update
  using (public.is_chat_group_admin(group_id))
  with check (public.is_chat_group_admin(group_id));

drop policy if exists "chat_group_members_insert_admin" on chat_group_members;

create policy "chat_group_members_insert_admin"
  on chat_group_members for insert
  with check (
    public.is_chat_group_admin(group_id)
    or public.is_chat_group_creator(group_id)
    or user_id = auth.uid()
  );
