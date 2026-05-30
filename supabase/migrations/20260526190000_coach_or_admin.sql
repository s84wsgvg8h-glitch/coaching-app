create or replace function public.is_coach_or_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role in ('coach', 'admin')
  );
$$;

create or replace function public.is_coach()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.is_coach_or_admin();
$$;

grant execute on function public.is_coach_or_admin() to authenticated;
