-- ============================================================
-- CONSULTORIA — Fase 11 — agrupamento de exercícios (ver ADR-FIT-005)
-- Aplicar no SQL Editor (após 000..007). Aditivo e isolado do Fracta.
-- Exercício sem grupo (group_id null) = comportamento atual (inalterado).
-- ============================================================

create table if not exists public.fit_exercise_groups (
  id               uuid primary key default gen_random_uuid(),
  plan_id          uuid not null references public.fit_workout_plans(id) on delete cascade,
  day_id           uuid not null references public.fit_workout_days(id) on delete cascade,
  type             text not null default 'superset'
                   check (type in ('superset','circuit','emom','other')),
  label            text,
  rounds           int,           -- voltas (superset/circuit)
  interval_seconds int,           -- EMOM (ex.: 60)
  rest_seconds     int,           -- descanso entre voltas
  order_index      int not null default 0,
  notes            text,
  data             jsonb not null default '{}'::jsonb,
  status           text not null default 'active' check (status in ('active','archived')),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists idx_fit_exercise_groups_plan on public.fit_exercise_groups(plan_id);
create index if not exists idx_fit_exercise_groups_day on public.fit_exercise_groups(day_id);
create trigger trg_fit_exercise_groups_updated before update on public.fit_exercise_groups
  for each row execute function public.fn_fit_set_updated_at();
alter table public.fit_exercise_groups enable row level security;
create policy fit_exercise_groups_select on public.fit_exercise_groups for select
  using (plan_id in (select id from public.fit_workout_plans where professional_id = auth.uid()
    or patient_id in (select id from public.fit_patients where user_id = auth.uid())));
create policy fit_exercise_groups_insert on public.fit_exercise_groups for insert
  with check (plan_id in (select id from public.fit_workout_plans where professional_id = auth.uid()));
create policy fit_exercise_groups_update on public.fit_exercise_groups for update
  using (plan_id in (select id from public.fit_workout_plans where professional_id = auth.uid()))
  with check (plan_id in (select id from public.fit_workout_plans where professional_id = auth.uid()));

-- Colunas aditivas em fit_workout_exercises (existentes ficam group_id null = standalone)
alter table public.fit_workout_exercises
  add column if not exists group_id    uuid references public.fit_exercise_groups(id) on delete set null,
  add column if not exists group_order int not null default 0;
create index if not exists idx_fit_workout_exercises_group on public.fit_workout_exercises(group_id);
