-- ============================================================
-- CONSULTORIA — Fase 3 — planos de treino (prescrição)
-- Aplicar no SQL Editor (após 000, 001, 002). Isolado do Fracta.
-- Exercícios são linhas estáveis → prontos p/ registro do paciente (Fase 4)
-- e p/ evolução de carga por exercício (Fase 5).
-- Sem DELETE físico: dias e exercícios usam soft-delete (status).
-- ============================================================

-- ── fit_workout_plans ──
create table if not exists public.fit_workout_plans (
  id                 uuid primary key default gen_random_uuid(),
  patient_id         uuid not null references public.fit_patients(id) on delete cascade,
  professional_id    uuid not null references public.fit_profiles(id) on delete cascade,
  title              text not null,
  goal               text,
  start_date         date,
  end_date           date,
  frequency_per_week int,
  notes              text,
  data               jsonb not null default '{}'::jsonb,
  status             text not null default 'draft' check (status in ('draft','active','archived')),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index if not exists idx_fit_workout_plans_patient on public.fit_workout_plans(patient_id);
create trigger trg_fit_workout_plans_updated before update on public.fit_workout_plans
  for each row execute function public.fn_fit_set_updated_at();
alter table public.fit_workout_plans enable row level security;
create policy fit_workout_plans_select on public.fit_workout_plans for select
  using (professional_id = auth.uid()
    or patient_id in (select id from public.fit_patients where user_id = auth.uid()));
create policy fit_workout_plans_insert on public.fit_workout_plans for insert
  with check (professional_id = auth.uid());
create policy fit_workout_plans_update on public.fit_workout_plans for update
  using (professional_id = auth.uid()) with check (professional_id = auth.uid());

-- ── fit_workout_days ──
create table if not exists public.fit_workout_days (
  id           uuid primary key default gen_random_uuid(),
  plan_id      uuid not null references public.fit_workout_plans(id) on delete cascade,
  name         text not null,
  focus        text,
  order_index  int not null default 0,
  notes        text,
  status       text not null default 'active' check (status in ('active','archived')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists idx_fit_workout_days_plan on public.fit_workout_days(plan_id);
create trigger trg_fit_workout_days_updated before update on public.fit_workout_days
  for each row execute function public.fn_fit_set_updated_at();
alter table public.fit_workout_days enable row level security;
create policy fit_workout_days_select on public.fit_workout_days for select
  using (plan_id in (select id from public.fit_workout_plans where professional_id = auth.uid()
    or patient_id in (select id from public.fit_patients where user_id = auth.uid())));
create policy fit_workout_days_insert on public.fit_workout_days for insert
  with check (plan_id in (select id from public.fit_workout_plans where professional_id = auth.uid()));
create policy fit_workout_days_update on public.fit_workout_days for update
  using (plan_id in (select id from public.fit_workout_plans where professional_id = auth.uid()))
  with check (plan_id in (select id from public.fit_workout_plans where professional_id = auth.uid()));

-- ── fit_workout_exercises ──
create table if not exists public.fit_workout_exercises (
  id           uuid primary key default gen_random_uuid(),
  plan_id      uuid not null references public.fit_workout_plans(id) on delete cascade,
  day_id       uuid not null references public.fit_workout_days(id) on delete cascade,
  name         text not null,
  order_index  int not null default 0,
  sets         int,
  target_reps  text,          -- ex.: "8-12"
  target_load  text,          -- ex.: "70% 1RM", "12kg", "RPE 8", "moderada"
  rest_seconds int,
  tempo        text,
  video_url    text,          -- link/vídeo de execução (exp. do paciente na Fase 4)
  instructions text,          -- instruções de execução
  notes        text,
  status       text not null default 'active' check (status in ('active','archived')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists idx_fit_workout_exercises_plan on public.fit_workout_exercises(plan_id);
create index if not exists idx_fit_workout_exercises_day on public.fit_workout_exercises(day_id);
create trigger trg_fit_workout_exercises_updated before update on public.fit_workout_exercises
  for each row execute function public.fn_fit_set_updated_at();
alter table public.fit_workout_exercises enable row level security;
create policy fit_workout_exercises_select on public.fit_workout_exercises for select
  using (plan_id in (select id from public.fit_workout_plans where professional_id = auth.uid()
    or patient_id in (select id from public.fit_patients where user_id = auth.uid())));
create policy fit_workout_exercises_insert on public.fit_workout_exercises for insert
  with check (plan_id in (select id from public.fit_workout_plans where professional_id = auth.uid()));
create policy fit_workout_exercises_update on public.fit_workout_exercises for update
  using (plan_id in (select id from public.fit_workout_plans where professional_id = auth.uid()))
  with check (plan_id in (select id from public.fit_workout_plans where professional_id = auth.uid()));
