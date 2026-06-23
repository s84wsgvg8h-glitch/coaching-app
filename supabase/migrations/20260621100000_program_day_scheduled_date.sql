alter table public.program_days
  add column if not exists scheduled_date date;
