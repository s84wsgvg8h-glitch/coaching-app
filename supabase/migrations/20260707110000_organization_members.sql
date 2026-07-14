create table if not exists public.organization_members (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles(id) on delete cascade,
  organization_id uuid references public.coach_organizations(id) on delete cascade,
  full_name text not null,
  geboortedatum date,
  lidnummer text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists organization_members_coach_id_idx
  on public.organization_members (coach_id);

create index if not exists organization_members_organization_id_idx
  on public.organization_members (organization_id);

create index if not exists organization_members_full_name_idx
  on public.organization_members (full_name);

alter table public.organization_members enable row level security;

drop policy if exists "organization_members_select" on public.organization_members;
create policy "organization_members_select"
  on public.organization_members for select
  using (
    public.is_coach_or_admin()
    and (
      public.is_admin()
      or coach_id = auth.uid()
      or (
        organization_id is not null
        and organization_id = public.get_my_organization_id()
      )
    )
  );

drop policy if exists "organization_members_insert" on public.organization_members;
create policy "organization_members_insert"
  on public.organization_members for insert
  with check (
    public.is_coach_or_admin()
    and (
      public.is_admin()
      or coach_id = auth.uid()
    )
  );

drop policy if exists "organization_members_update" on public.organization_members;
create policy "organization_members_update"
  on public.organization_members for update
  using (
    public.is_coach_or_admin()
    and (
      public.is_admin()
      or coach_id = auth.uid()
      or (
        organization_id is not null
        and organization_id = public.get_my_organization_id()
      )
    )
  )
  with check (
    public.is_coach_or_admin()
  );

drop policy if exists "organization_members_delete" on public.organization_members;
create policy "organization_members_delete"
  on public.organization_members for delete
  using (
    public.is_coach_or_admin()
    and (
      public.is_admin()
      or coach_id = auth.uid()
    )
  );
