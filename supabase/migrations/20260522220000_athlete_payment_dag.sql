-- Replace betaling_datum with betaling_dag (day of month, e.g. 20 = every month on the 20th)

alter table public.profiles
  add column if not exists betaling_prijs numeric(10, 2),
  add column if not exists betaling_dag smallint;

-- Migrate legacy betaling_datum -> day-of-month if that column exists
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'betaling_datum'
  ) then
    execute $sql$
      update public.profiles
      set betaling_dag = coalesce(betaling_dag, extract(day from betaling_datum)::smallint)
      where betaling_datum is not null
    $sql$;
  end if;
end $$;

alter table public.profiles
  drop constraint if exists profiles_betaling_dag_check;

alter table public.profiles
  add constraint profiles_betaling_dag_check
  check (betaling_dag is null or (betaling_dag >= 1 and betaling_dag <= 31));

comment on column public.profiles.betaling_prijs is 'Fee the athlete pays (EUR)';
comment on column public.profiles.betaling_dag is 'Day of month payment is due (1-31)';
