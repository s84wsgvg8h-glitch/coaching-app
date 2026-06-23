-- Merch sizes, orders, org hierarchy extensions

alter table public.merch_items
  add column if not exists sizes text[] not null default '{}'::text[];

alter table public.coach_organizations
  add column if not exists head_coach_id uuid references public.profiles(id) on delete set null,
  add column if not exists billing_email text,
  add column if not exists subscription_status text not null default 'trial'
    check (subscription_status in ('trial', 'active', 'past_due', 'cancelled'));

alter table public.profiles
  add column if not exists is_head_coach boolean not null default false;

create table if not exists public.merch_orders (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.profiles(id) on delete cascade,
  merch_item_id uuid not null references public.merch_items(id) on delete cascade,
  size text not null,
  amount_cents integer not null default 0,
  currency text not null default 'eur',
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'cancelled', 'failed')),
  stripe_session_id text,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

create index if not exists merch_orders_athlete_idx
  on public.merch_orders (athlete_id, created_at desc);

create index if not exists merch_orders_coach_items_idx
  on public.merch_orders (merch_item_id, status);

alter table public.merch_orders enable row level security;

drop policy if exists "merch_orders_athlete_select" on public.merch_orders;
create policy "merch_orders_athlete_select"
  on public.merch_orders for select
  using (athlete_id = auth.uid());

drop policy if exists "merch_orders_athlete_insert" on public.merch_orders;
create policy "merch_orders_athlete_insert"
  on public.merch_orders for insert
  with check (athlete_id = auth.uid());

drop policy if exists "merch_orders_coach_select" on public.merch_orders;
create policy "merch_orders_coach_select"
  on public.merch_orders for select
  using (
    public.is_coach_or_admin()
    and exists (
      select 1 from public.profiles athlete
      where athlete.id = merch_orders.athlete_id
        and (
          athlete.coach_id = auth.uid()
          or public.is_admin()
          or (
            exists (
              select 1 from public.profiles coach
              where coach.id = auth.uid()
                and coach.organization_id is not null
                and coach.organization_id = athlete.organization_id
            )
          )
        )
    )
  );

drop policy if exists "merch_orders_admin_all" on public.merch_orders;
create policy "merch_orders_admin_all"
  on public.merch_orders for all
  using (public.is_admin())
  with check (public.is_admin());

-- Allow athletes to update own pending orders (stripe session id)
drop policy if exists "merch_orders_athlete_update" on public.merch_orders;
create policy "merch_orders_athlete_update"
  on public.merch_orders for update
  using (athlete_id = auth.uid())
  with check (athlete_id = auth.uid());
