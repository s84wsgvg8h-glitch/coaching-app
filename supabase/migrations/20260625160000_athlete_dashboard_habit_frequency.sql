alter table public.athlete_dashboard_items
  add column if not exists habit_frequency text
    check (
      habit_frequency is null
      or habit_frequency in ('daily', 'every_other_day', 'weekly')
    );

comment on column public.athlete_dashboard_items.habit_frequency is
  'Repeat interval for habits: daily, every_other_day, or weekly. Null for todos.';
