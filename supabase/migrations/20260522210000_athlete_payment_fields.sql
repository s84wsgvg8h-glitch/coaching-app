-- Payment tracking per athlete (coach-managed)

alter table public.profiles
  add column if not exists betaling_prijs numeric(10, 2),
  add column if not exists betaling_dag smallint;

alter table public.profiles
  drop constraint if exists profiles_betaling_dag_check;

alter table public.profiles
  add constraint profiles_betaling_dag_check
  check (betaling_dag is null or (betaling_dag >= 1 and betaling_dag <= 31));

comment on column public.profiles.betaling_prijs is 'Fee the athlete pays (EUR)';
comment on column public.profiles.betaling_dag is 'Day of month payment is due (1-31)';
