-- Merch premium foundation: order payment fields, product detail, order events, shop settings

alter table public.merch_items
  add column if not exists material_info text,
  add column if not exists size_guide_text text,
  add column if not exists delivery_time_text text,
  add column if not exists return_policy_override text,
  add column if not exists image_urls jsonb not null default '[]'::jsonb;

alter table public.merch_orders
  add column if not exists stripe_payment_intent_id text,
  add column if not exists stripe_customer_id text,
  add column if not exists coach_note text,
  add column if not exists discount_code text,
  add column if not exists discount_cents integer not null default 0,
  add column if not exists refunded_at timestamptz,
  add column if not exists payment_failed_at timestamptz;

create index if not exists merch_orders_stripe_session_idx
  on public.merch_orders (stripe_session_id)
  where stripe_session_id is not null;

create index if not exists merch_orders_pickup_method_idx
  on public.merch_orders (pickup_method, fulfillment_status)
  where pickup_method is not null;

create table if not exists public.merch_order_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.merch_orders(id) on delete cascade,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists merch_order_events_order_idx
  on public.merch_order_events (order_id, created_at asc);

alter table public.merch_order_events enable row level security;

drop policy if exists "merch_order_events_coach_select" on public.merch_order_events;
create policy "merch_order_events_coach_select"
  on public.merch_order_events for select
  using (
    public.is_coach_or_admin()
    and exists (
      select 1 from public.merch_orders o
      join public.profiles athlete on athlete.id = o.athlete_id
      where o.id = merch_order_events.order_id
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

drop policy if exists "merch_order_events_athlete_select" on public.merch_order_events;
create policy "merch_order_events_athlete_select"
  on public.merch_order_events for select
  using (
    exists (
      select 1 from public.merch_orders o
      where o.id = merch_order_events.order_id
        and o.athlete_id = auth.uid()
    )
  );

drop policy if exists "merch_order_events_service_insert" on public.merch_order_events;
create policy "merch_order_events_service_insert"
  on public.merch_order_events for insert
  with check (public.is_admin());

create table if not exists public.merch_shop_settings (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles(id) on delete cascade,
  pickup_at_training boolean not null default true,
  default_shipping_cents integer not null default 495,
  return_policy text not null default '30 dagen retourrecht. Product moet ongebruikt en in originele staat zijn.',
  currency text not null default 'EUR',
  stock_alerts boolean not null default true,
  new_order_notifications boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (coach_id)
);

alter table public.merch_shop_settings enable row level security;

drop policy if exists "merch_shop_settings_coach_all" on public.merch_shop_settings;
create policy "merch_shop_settings_coach_all"
  on public.merch_shop_settings for all
  using (coach_id = auth.uid() and public.is_coach_or_admin())
  with check (coach_id = auth.uid() and public.is_coach_or_admin());

drop policy if exists "merch_shop_settings_athlete_select" on public.merch_shop_settings;
create policy "merch_shop_settings_athlete_select"
  on public.merch_shop_settings for select
  using (
    exists (
      select 1 from public.profiles athlete
      where athlete.id = auth.uid()
        and athlete.coach_id = merch_shop_settings.coach_id
    )
  );
