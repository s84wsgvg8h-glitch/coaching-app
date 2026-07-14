-- Stripe Connect marketplace: subscriptions on coach connected accounts

alter table public.profiles
  add column if not exists stripe_connect_customer_account_id text;

alter table public.coaching_subscriptions
  add column if not exists coach_id uuid references public.profiles (id) on delete set null,
  add column if not exists stripe_connect_account_id text;

create index if not exists coaching_subscriptions_coach_id_idx
  on public.coaching_subscriptions (coach_id);

create index if not exists coaching_subscriptions_connect_account_idx
  on public.coaching_subscriptions (stripe_connect_account_id)
  where stripe_connect_account_id is not null;

create table if not exists public.coach_stripe_prices (
  coach_id uuid not null references public.profiles (id) on delete cascade,
  plan_id text not null,
  stripe_connect_account_id text not null,
  stripe_price_id text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (coach_id, plan_id)
);

create index if not exists coach_stripe_prices_connect_account_idx
  on public.coach_stripe_prices (stripe_connect_account_id);

alter table public.coach_stripe_prices enable row level security;

drop policy if exists "coach_stripe_prices_deny_all" on public.coach_stripe_prices;
create policy "coach_stripe_prices_deny_all"
  on public.coach_stripe_prices for all
  using (false)
  with check (false);

create or replace function public.set_coach_stripe_prices_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists coach_stripe_prices_updated_at on public.coach_stripe_prices;
create trigger coach_stripe_prices_updated_at
  before update on public.coach_stripe_prices
  for each row execute function public.set_coach_stripe_prices_updated_at();
