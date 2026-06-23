-- Merch collections, discounts, and discount usage

create table if not exists public.merch_collections (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  description text not null default '',
  cover_url text,
  sort_order integer not null default 0,
  visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists merch_collections_coach_idx
  on public.merch_collections (coach_id, sort_order);

alter table public.merch_collections enable row level security;

drop policy if exists "merch_collections_coach_all" on public.merch_collections;
create policy "merch_collections_coach_all"
  on public.merch_collections for all
  using (coach_id = auth.uid() and public.is_coach_or_admin())
  with check (coach_id = auth.uid() and public.is_coach_or_admin());

drop policy if exists "merch_collections_athlete_select" on public.merch_collections;
create policy "merch_collections_athlete_select"
  on public.merch_collections for select
  using (visible = true and auth.uid() is not null);

create table if not exists public.merch_discounts (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles(id) on delete cascade,
  code text not null,
  type text not null check (type in ('percent', 'fixed')),
  value numeric(10, 2) not null default 0,
  valid_from timestamptz,
  valid_until timestamptz,
  usage_limit integer,
  usage_count integer not null default 0,
  collection text,
  product_id uuid references public.merch_items(id) on delete set null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (coach_id, code)
);

create index if not exists merch_discounts_coach_code_idx
  on public.merch_discounts (coach_id, code)
  where active = true;

alter table public.merch_discounts enable row level security;

drop policy if exists "merch_discounts_coach_all" on public.merch_discounts;
create policy "merch_discounts_coach_all"
  on public.merch_discounts for all
  using (coach_id = auth.uid() and public.is_coach_or_admin())
  with check (coach_id = auth.uid() and public.is_coach_or_admin());

create table if not exists public.merch_discount_usage (
  id uuid primary key default gen_random_uuid(),
  discount_id uuid not null references public.merch_discounts(id) on delete cascade,
  order_id uuid references public.merch_orders(id) on delete set null,
  athlete_id uuid not null references public.profiles(id) on delete cascade,
  used_at timestamptz not null default now()
);

create index if not exists merch_discount_usage_discount_idx
  on public.merch_discount_usage (discount_id, used_at desc);

alter table public.merch_discount_usage enable row level security;

drop policy if exists "merch_discount_usage_coach_select" on public.merch_discount_usage;
create policy "merch_discount_usage_coach_select"
  on public.merch_discount_usage for select
  using (
    public.is_coach_or_admin()
    and exists (
      select 1 from public.merch_discounts d
      where d.id = merch_discount_usage.discount_id
        and d.coach_id = auth.uid()
    )
  );
