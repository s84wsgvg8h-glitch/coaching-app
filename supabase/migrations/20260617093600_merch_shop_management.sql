alter table public.merch_items
  add column if not exists status text not null default 'live',
  add column if not exists cost_price numeric(10, 2),
  add column if not exists stock_by_size jsonb not null default '{}'::jsonb,
  add column if not exists color_variants jsonb not null default '[]'::jsonb,
  add column if not exists collection text,
  add column if not exists featured boolean not null default false,
  add column if not exists limited boolean not null default false,
  add column if not exists preorder boolean not null default false,
  add column if not exists preorder_target integer,
  add column if not exists preorder_closes_at timestamptz,
  add column if not exists go_live_at timestamptz,
  add column if not exists archived_at timestamptz;

update public.merch_items
set status = case when active then 'live' else 'concept' end
where status is null or status = '';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'merch_items_status_check'
      and conrelid = 'public.merch_items'::regclass
  ) then
    alter table public.merch_items
      add constraint merch_items_status_check
      check (status in ('live', 'concept', 'soldout', 'archived'));
  end if;
end $$;

create index if not exists merch_items_status_idx
  on public.merch_items (status, active, sort_order);

create index if not exists merch_items_collection_idx
  on public.merch_items (collection);

alter table public.merch_orders
  add column if not exists fulfillment_status text not null default 'new',
  add column if not exists color text,
  add column if not exists customer_note text,
  add column if not exists pickup_method text,
  add column if not exists fulfilled_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'merch_orders_fulfillment_status_check'
      and conrelid = 'public.merch_orders'::regclass
  ) then
    alter table public.merch_orders
      add constraint merch_orders_fulfillment_status_check
      check (
        fulfillment_status in (
          'new',
          'processing',
          'shipped',
          'delivered',
          'cancelled'
        )
      );
  end if;
end $$;

create index if not exists merch_orders_fulfillment_status_idx
  on public.merch_orders (fulfillment_status, created_at desc);

drop policy if exists "merch_orders_coach_update" on public.merch_orders;
create policy "merch_orders_coach_update"
  on public.merch_orders for update
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
  )
  with check (
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
