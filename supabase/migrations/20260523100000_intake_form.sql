create table if not exists public.intake_form_templates (
  id uuid primary key default gen_random_uuid(),
  fields jsonb not null default '[]'::jsonb,
  updated_at timestamptz default now()
);

create table if not exists public.athlete_intake_responses (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.profiles(id) on delete cascade unique,
  answers jsonb not null default '{}'::jsonb,
  completed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles add column if not exists intake_completed_at timestamptz;
alter table public.profiles add column if not exists coaching_start_date date;
alter table public.profiles add column if not exists starting_pr_squat numeric(6,2);
alter table public.profiles add column if not exists starting_pr_bench numeric(6,2);
alter table public.profiles add column if not exists starting_pr_deadlift numeric(6,2);

alter table public.intake_form_templates enable row level security;
alter table public.athlete_intake_responses enable row level security;

drop policy if exists "intake_form_templates_select" on public.intake_form_templates;
create policy "intake_form_templates_select"
  on public.intake_form_templates for select
  using (auth.uid() is not null);

drop policy if exists "intake_form_templates_coach_write" on public.intake_form_templates;
create policy "intake_form_templates_coach_write"
  on public.intake_form_templates for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'coach'
    )
  )
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'coach'
    )
  );

drop policy if exists "athlete_intake_responses_select" on public.athlete_intake_responses;
create policy "athlete_intake_responses_select"
  on public.athlete_intake_responses for select
  using (
    athlete_id = auth.uid()
    or exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'coach'
    )
  );

drop policy if exists "athlete_intake_responses_insert_own" on public.athlete_intake_responses;
create policy "athlete_intake_responses_insert_own"
  on public.athlete_intake_responses for insert
  with check (athlete_id = auth.uid());

drop policy if exists "athlete_intake_responses_update_own" on public.athlete_intake_responses;
create policy "athlete_intake_responses_update_own"
  on public.athlete_intake_responses for update
  using (athlete_id = auth.uid())
  with check (athlete_id = auth.uid());

insert into public.intake_form_templates (id, fields)
values (
  'a0000000-0000-4000-8000-000000000001'::uuid,
  '[
    {"key":"name","label":"Naam","type":"text","required":true,"order":1},
    {"key":"birthdate","label":"Geboortedatum","type":"date","required":true,"order":2},
    {"key":"knkf_lidnummer","label":"KNKF-lidnummer","type":"text","required":false,"order":3},
    {"key":"bodyweight","label":"Lichaamsgewicht (kg)","type":"number","required":true,"order":4},
    {"key":"weightclass","label":"Gewichtsklasse","type":"text","required":false,"order":5},
    {"key":"height","label":"Lengte (cm)","type":"number","required":false,"order":6},
    {"key":"upcoming_meet_name","label":"Aankomende wedstrijd","type":"text","required":false,"order":7},
    {"key":"upcoming_meet_date","label":"Datum aankomende wedstrijd","type":"date","required":false,"order":8},
    {"key":"prs","label":"Huidige PR''s","type":"textarea","required":false,"order":9},
    {"key":"injury_history","label":"Blessuregeschiedenis","type":"textarea","required":false,"order":10},
    {"key":"had_coach_before","label":"Eerder een coach gehad?","type":"select","required":true,"order":11,"options":[{"value":"yes","label":"Ja"},{"value":"no","label":"Nee"}]},
    {"key":"old_program","label":"Vorig programma","type":"textarea","required":false,"order":12},
    {"key":"what_worked","label":"Wat werkte goed?","type":"textarea","required":false,"order":13},
    {"key":"training_days","label":"Trainingsdagen","type":"textarea","required":true,"order":14},
    {"key":"equipment","label":"Beschikbare apparatuur","type":"textarea","required":false,"order":15},
    {"key":"short_term_goals","label":"Korte-termijn doelen","type":"textarea","required":true,"order":16},
    {"key":"long_term_goals","label":"Lange-termijn doelen","type":"textarea","required":true,"order":17},
    {"key":"lifestyle","label":"Leefstijl","type":"textarea","required":false,"order":18},
    {"key":"recovery_management","label":"Herstelbeheer","type":"textarea","required":false,"order":19},
    {"key":"coach_expectations","label":"Verwachtingen van coach","type":"textarea","required":false,"order":20},
    {"key":"training_duration","label":"Hoe lang train je al?","type":"textarea","required":false,"order":21},
    {"key":"city","label":"Woonplaats","type":"text","required":false,"order":22},
    {"key":"meets_before","label":"Eerder wedstrijden gedaan?","type":"select","required":true,"order":23,"options":[{"value":"yes","label":"Ja"},{"value":"no","label":"Nee"}]},
    {"key":"motivation","label":"Motivatie","type":"textarea","required":true,"order":24},
    {"key":"no_steroids","label":"Ik gebruik geen anabole steroïden","type":"select","required":true,"order":25,"options":[{"value":"yes","label":"Ja, ik bevestig dit"},{"value":"no","label":"Nee"}]}
  ]'::jsonb
)
on conflict (id) do nothing;
