-- Admin platform: settings, banners, coach reviews, orgs, sync logs, knowledge chunks

create table if not exists public.app_settings (
  id int primary key check (id = 1),
  maintenance_mode boolean not null default false,
  maintenance_message text,
  welcome_message text,
  feature_flags jsonb not null default '{}'::jsonb,
  email_templates jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null
);

insert into public.app_settings (id)
values (1)
on conflict (id) do nothing;

alter table public.app_settings enable row level security;

drop policy if exists "app_settings_select_authenticated" on public.app_settings;
create policy "app_settings_select_authenticated"
  on public.app_settings for select
  to authenticated
  using (true);

drop policy if exists "app_settings_admin_write" on public.app_settings;
create policy "app_settings_admin_write"
  on public.app_settings for all
  using (public.is_admin())
  with check (public.is_admin());

create table if not exists public.system_banners (
  id uuid primary key default gen_random_uuid(),
  message text not null,
  banner_type text not null default 'info'
    check (banner_type in ('info', 'warning', 'success', 'error')),
  active boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.system_banners enable row level security;

drop policy if exists "system_banners_select_active" on public.system_banners;
create policy "system_banners_select_active"
  on public.system_banners for select
  to authenticated
  using (
    active = true
    and (starts_at is null or starts_at <= now())
    and (ends_at is null or ends_at > now())
  );

drop policy if exists "system_banners_admin_all" on public.system_banners;
create policy "system_banners_admin_all"
  on public.system_banners for all
  using (public.is_admin())
  with check (public.is_admin());

create table if not exists public.coach_approval_reviews (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  admin_id uuid references public.profiles(id) on delete set null,
  action text not null check (action in ('accepted', 'rejected')),
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists coach_approval_reviews_profile_idx
  on public.coach_approval_reviews (profile_id, created_at desc);

alter table public.coach_approval_reviews enable row level security;

drop policy if exists "coach_approval_reviews_admin_all" on public.coach_approval_reviews;
create policy "coach_approval_reviews_admin_all"
  on public.coach_approval_reviews for all
  using (public.is_admin())
  with check (public.is_admin());

create table if not exists public.coach_organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);

alter table public.coach_organizations enable row level security;

drop policy if exists "coach_organizations_select_authenticated" on public.coach_organizations;
create policy "coach_organizations_select_authenticated"
  on public.coach_organizations for select
  to authenticated
  using (true);

drop policy if exists "coach_organizations_admin_all" on public.coach_organizations;
create policy "coach_organizations_admin_all"
  on public.coach_organizations for all
  using (public.is_admin())
  with check (public.is_admin());

alter table public.profiles
  add column if not exists organization_id uuid
  references public.coach_organizations(id) on delete set null;

create index if not exists profiles_organization_id_idx
  on public.profiles (organization_id);

create table if not exists public.calendar_sync_logs (
  id uuid primary key default gen_random_uuid(),
  triggered_by uuid references public.profiles(id) on delete set null,
  source text not null default 'knkf',
  status text not null check (status in ('success', 'error')),
  fetched_count int not null default 0,
  inserted_count int not null default 0,
  skipped_count int not null default 0,
  error_message text,
  created_at timestamptz not null default now()
);

create index if not exists calendar_sync_logs_created_idx
  on public.calendar_sync_logs (created_at desc);

alter table public.calendar_sync_logs enable row level security;

drop policy if exists "calendar_sync_logs_admin_select" on public.calendar_sync_logs;
create policy "calendar_sync_logs_admin_select"
  on public.calendar_sync_logs for select
  using (public.is_admin());

drop policy if exists "calendar_sync_logs_admin_insert" on public.calendar_sync_logs;
create policy "calendar_sync_logs_admin_insert"
  on public.calendar_sync_logs for insert
  with check (public.is_admin() or triggered_by = auth.uid());

create table if not exists public.admin_knowledge_chunks (
  id uuid primary key default gen_random_uuid(),
  scope text not null check (scope in ('coach', 'athlete')),
  chunk_key text not null unique,
  title text not null,
  category text not null,
  content text not null,
  keywords text[] not null default '{}',
  active boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null
);

create index if not exists admin_knowledge_chunks_scope_idx
  on public.admin_knowledge_chunks (scope, active);

alter table public.admin_knowledge_chunks enable row level security;

drop policy if exists "admin_knowledge_chunks_select_active" on public.admin_knowledge_chunks;
create policy "admin_knowledge_chunks_select_active"
  on public.admin_knowledge_chunks for select
  to authenticated
  using (active = true);

drop policy if exists "admin_knowledge_chunks_admin_all" on public.admin_knowledge_chunks;
create policy "admin_knowledge_chunks_admin_all"
  on public.admin_knowledge_chunks for all
  using (public.is_admin())
  with check (public.is_admin());

-- Admin can manage all coach athlete invite links
drop policy if exists "coach_invite_links_admin_select" on public.coach_invite_links;
drop policy if exists "coach_invite_links_admin_update" on public.coach_invite_links;
create policy "coach_invite_links_admin_select"
  on public.coach_invite_links for select
  using (public.is_admin());
create policy "coach_invite_links_admin_update"
  on public.coach_invite_links for update
  using (public.is_admin())
  with check (public.is_admin());
