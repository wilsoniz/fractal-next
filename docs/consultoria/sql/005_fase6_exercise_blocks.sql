-- ============================================================
-- CONSULTORIA — Fase 6 — blocos de execução + registro por bloco
-- Aplicar no SQL Editor (após 000..004). Aditivo e isolado do Fracta.
-- Compatível com o MVP: exercício sem blocos = modo simples (inalterado).
-- ============================================================

-- ── fit_exercise_blocks : blocos de execução de um exercício (prescrição) ──
create table if not exists public.fit_exercise_blocks (
  id           uuid primary key default gen_random_uuid(),
  exercise_id  uuid not null references public.fit_workout_exercises(id) on delete cascade,
  plan_id      uuid not null references public.fit_workout_plans(id) on delete cascade,
  day_id       uuid not null references public.fit_workout_days(id) on delete cascade,
  block_type   text not null default 'straight_set'
    check (block_type in ('feeder','top_set','backoff','myo_activation','myo_mini_set',
                          'straight_set','warmup','amrap','rest_pause','drop_set','cluster','circuit','other')),
  label        text,
  order_index  int not null default 0,
  sets         int,
  target_reps  text,          -- "6-8"
  target_load  text,          -- "70% 1RM" / "RPE 8"
  rest_seconds int,
  rir          text,          -- alvo (faixa permitida, ex.: "1-2")
  rpe          text,          -- alvo (faixa permitida, ex.: "7-9")
  tempo        text,
  instructions text,
  data         jsonb not null default '{}'::jsonb,
  status       text not null default 'active' check (status in ('active','archived')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists idx_fit_exercise_blocks_exercise on public.fit_exercise_blocks(exercise_id);
create index if not exists idx_fit_exercise_blocks_plan on public.fit_exercise_blocks(plan_id);
create index if not exists idx_fit_exercise_blocks_day on public.fit_exercise_blocks(day_id);
create trigger trg_fit_exercise_blocks_updated before update on public.fit_exercise_blocks
  for each row execute function public.fn_fit_set_updated_at();
alter table public.fit_exercise_blocks enable row level security;
create policy fit_exercise_blocks_select on public.fit_exercise_blocks for select
  using (plan_id in (select id from public.fit_workout_plans where professional_id = auth.uid()
    or patient_id in (select id from public.fit_patients where user_id = auth.uid())));
create policy fit_exercise_blocks_insert on public.fit_exercise_blocks for insert
  with check (plan_id in (select id from public.fit_workout_plans where professional_id = auth.uid()));
create policy fit_exercise_blocks_update on public.fit_exercise_blocks for update
  using (plan_id in (select id from public.fit_workout_plans where professional_id = auth.uid()))
  with check (plan_id in (select id from public.fit_workout_plans where professional_id = auth.uid()));

-- ── fit_training_log_block_entries : registro do paciente por bloco ──
create table if not exists public.fit_training_log_block_entries (
  id            uuid primary key default gen_random_uuid(),
  log_id        uuid not null references public.fit_training_logs(id) on delete cascade,
  exercise_id   uuid references public.fit_workout_exercises(id) on delete set null,
  block_id      uuid references public.fit_exercise_blocks(id) on delete set null,
  exercise_name text,          -- snapshot p/ histórico e agrupamento em gráficos
  block_label   text,
  block_type    text,          -- snapshot (define papel no gráfico)
  load_done     numeric,
  load_unit     text default 'kg',
  reps_done     text,
  sets_done     int,
  rpe           numeric,       -- real executado
  rir           numeric,       -- real executado
  completed     boolean not null default true,
  notes         text,
  data          jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists idx_fit_log_block_entries_log on public.fit_training_log_block_entries(log_id);
create index if not exists idx_fit_log_block_entries_exercise on public.fit_training_log_block_entries(exercise_id);
create index if not exists idx_fit_log_block_entries_block on public.fit_training_log_block_entries(block_id);
create trigger trg_fit_log_block_entries_updated before update on public.fit_training_log_block_entries
  for each row execute function public.fn_fit_set_updated_at();
alter table public.fit_training_log_block_entries enable row level security;
create policy fit_log_block_entries_select on public.fit_training_log_block_entries for select
  using (log_id in (select id from public.fit_training_logs where patient_id in
    (select id from public.fit_patients where user_id = auth.uid() or professional_id = auth.uid())));
create policy fit_log_block_entries_insert on public.fit_training_log_block_entries for insert
  with check (log_id in (select id from public.fit_training_logs where patient_id in
    (select id from public.fit_patients where user_id = auth.uid() or professional_id = auth.uid())));
create policy fit_log_block_entries_update on public.fit_training_log_block_entries for update
  using (log_id in (select id from public.fit_training_logs where patient_id in
    (select id from public.fit_patients where user_id = auth.uid() or professional_id = auth.uid())))
  with check (log_id in (select id from public.fit_training_logs where patient_id in
    (select id from public.fit_patients where user_id = auth.uid() or professional_id = auth.uid())));
