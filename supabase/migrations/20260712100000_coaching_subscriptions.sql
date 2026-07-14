-- Coaching subscription billing (Stripe Subscriptions)

alter table public.profiles
  add column if not exists stripe_customer_id text;

create unique index if not exists profiles_stripe_customer_id_uidx
  on public.profiles (stripe_customer_id)
  where stripe_customer_id is not null;

create table if not exists public.coaching_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  stripe_customer_id text not null,
  stripe_subscription_id text not null,
  stripe_price_id text not null,
  status text not null,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists coaching_subscriptions_stripe_subscription_id_uidx
  on public.coaching_subscriptions (stripe_subscription_id);

create index if not exists coaching_subscriptions_stripe_customer_id_idx
  on public.coaching_subscriptions (stripe_customer_id);

create index if not exists coaching_subscriptions_user_id_idx
  on public.coaching_subscriptions (user_id);

create index if not exists coaching_subscriptions_status_idx
  on public.coaching_subscriptions (status);

-- One active-like subscription row per user (active, trialing, past_due)
create unique index if not exists coaching_subscriptions_user_active_uidx
  on public.coaching_subscriptions (user_id)
  where status in ('active', 'trialing', 'past_due');

create table if not exists public.stripe_webhook_events (
  id text primary key,
  event_type text not null,
  processed_at timestamptz not null default now()
);

create index if not exists stripe_webhook_events_processed_at_idx
  on public.stripe_webhook_events (processed_at desc);

alter table public.coaching_subscriptions enable row level security;
alter table public.stripe_webhook_events enable row level security;

drop policy if exists "coaching_subscriptions_select_own" on public.coaching_subscriptions;
create policy "coaching_subscriptions_select_own"
  on public.coaching_subscriptions for select
  using (auth.uid() = user_id);

-- Writes only via service role (webhooks); no insert/update/delete policies for clients.
drop policy if exists "stripe_webhook_events_deny_all" on public.stripe_webhook_events;
create policy "stripe_webhook_events_deny_all"
  on public.stripe_webhook_events for all
  using (false)
  with check (false);

create or replace function public.set_coaching_subscriptions_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists coaching_subscriptions_updated_at on public.coaching_subscriptions;
create trigger coaching_subscriptions_updated_at
  before update on public.coaching_subscriptions
  for each row execute function public.set_coaching_subscriptions_updated_at();
