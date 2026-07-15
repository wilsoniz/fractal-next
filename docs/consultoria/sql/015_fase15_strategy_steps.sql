-- ============================================================
-- CONSULTORIA — Fase 15 — etapas internas de estratégias
-- Aplicar após 014. Aditivo, sem backfill e sem DELETE.
-- NÃO foi aplicado automaticamente no Supabase.
-- ============================================================

begin;

create table public.fit_exercise_block_steps (
  id uuid primary key default gen_random_uuid(),
  block_id uuid not null references public.fit_exercise_blocks(id) on delete cascade,
  exercise_id uuid not null references public.fit_workout_exercises(id) on delete cascade,
  step_type text not null check (step_type in (
    'dynamic_reps','partial_reps','isometric_hold','load_drop','rest',
    'mini_set','failure_segment','target_total','custom'
  )),
  label text,
  order_index int not null default 0,
  target_reps text,
  target_full_reps int check (target_full_reps is null or target_full_reps >= 0),
  target_partial_reps int check (target_partial_reps is null or target_partial_reps >= 0),
  target_duration_seconds int check (target_duration_seconds is null or target_duration_seconds >= 0),
  target_load text,
  target_load_unit text,
  load_change_type text check (load_change_type is null or load_change_type in ('percentage','absolute','manual')),
  load_change_value numeric,
  rest_seconds int check (rest_seconds is null or rest_seconds >= 0),
  repeat_mode text not null default 'fixed' check (repeat_mode in ('fixed','open')),
  min_occurrences int not null default 1 check (min_occurrences >= 0),
  max_occurrences int check (max_occurrences is null or max_occurrences >= min_occurrences),
  termination_rule text,
  data jsonb not null default '{}'::jsonb check (jsonb_typeof(data) = 'object'),
  status text not null default 'active' check (status in ('active','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_fit_exercise_block_steps_block on public.fit_exercise_block_steps(block_id, status, order_index);
create index idx_fit_exercise_block_steps_exercise on public.fit_exercise_block_steps(exercise_id);
create trigger trg_fit_exercise_block_steps_updated before update on public.fit_exercise_block_steps
  for each row execute function public.fn_fit_set_updated_at();
alter table public.fit_exercise_block_steps enable row level security;
create policy fit_exercise_block_steps_select on public.fit_exercise_block_steps for select
  using (block_id in (select id from public.fit_exercise_blocks where plan_id in (
    select id from public.fit_workout_plans where professional_id = auth.uid()
    or patient_id in (select id from public.fit_patients where user_id = auth.uid())
  )));
create policy fit_exercise_block_steps_insert on public.fit_exercise_block_steps for insert
  with check (block_id in (select id from public.fit_exercise_blocks where plan_id in (
    select id from public.fit_workout_plans where professional_id = auth.uid()
  )));
create policy fit_exercise_block_steps_update on public.fit_exercise_block_steps for update
  using (block_id in (select id from public.fit_exercise_blocks where plan_id in (
    select id from public.fit_workout_plans where professional_id = auth.uid()
  )))
  with check (block_id in (select id from public.fit_exercise_blocks where plan_id in (
    select id from public.fit_workout_plans where professional_id = auth.uid()
  )));

create table public.fit_training_log_block_step_entries (
  id uuid primary key default gen_random_uuid(),
  log_id uuid not null references public.fit_training_logs(id) on delete cascade,
  exercise_id uuid references public.fit_workout_exercises(id) on delete set null,
  block_id uuid references public.fit_exercise_blocks(id) on delete set null,
  step_id uuid references public.fit_exercise_block_steps(id) on delete set null,
  exercise_library_id uuid references public.fit_exercise_variations(id) on delete set null,
  side_prescription_id uuid references public.fit_exercise_block_sides(id) on delete set null,
  occurrence_index int not null default 0 check (occurrence_index >= 0),
  exercise_name text,
  block_type text,
  block_label text,
  step_type text,
  step_label text,
  side text check (side is null or side in ('left','right','bilateral','alternating','affected','unaffected','custom')),
  side_label_snapshot text,
  load_done numeric,
  load_unit text,
  reps_done int check (reps_done is null or reps_done >= 0),
  full_reps_done int check (full_reps_done is null or full_reps_done >= 0),
  partial_reps_done int check (partial_reps_done is null or partial_reps_done >= 0),
  duration_seconds int check (duration_seconds is null or duration_seconds >= 0),
  rest_seconds int check (rest_seconds is null or rest_seconds >= 0),
  rpe numeric check (rpe is null or rpe between 0 and 10),
  rir numeric check (rir is null or rir between 0 and 10),
  pain_level numeric check (pain_level is null or pain_level between 0 and 10),
  termination_reason text,
  completed boolean not null default true,
  notes text,
  data jsonb not null default '{}'::jsonb check (jsonb_typeof(data) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_fit_log_step_entries_log on public.fit_training_log_block_step_entries(log_id);
create index idx_fit_log_step_entries_block on public.fit_training_log_block_step_entries(block_id);
create index idx_fit_log_step_entries_step on public.fit_training_log_block_step_entries(step_id, occurrence_index);
create trigger trg_fit_log_step_entries_updated before update on public.fit_training_log_block_step_entries
  for each row execute function public.fn_fit_set_updated_at();
alter table public.fit_training_log_block_step_entries enable row level security;
create policy fit_log_step_entries_select on public.fit_training_log_block_step_entries for select
  using (log_id in (select id from public.fit_training_logs where patient_id in (
    select id from public.fit_patients where user_id = auth.uid() or professional_id = auth.uid()
  )));
create policy fit_log_step_entries_insert on public.fit_training_log_block_step_entries for insert
  with check (log_id in (select id from public.fit_training_logs where patient_id in (
    select id from public.fit_patients where user_id = auth.uid() or professional_id = auth.uid()
  )));
create policy fit_log_step_entries_update on public.fit_training_log_block_step_entries for update
  using (log_id in (select id from public.fit_training_logs where patient_id in (
    select id from public.fit_patients where user_id = auth.uid() or professional_id = auth.uid()
  )))
  with check (log_id in (select id from public.fit_training_logs where patient_id in (
    select id from public.fit_patients where user_id = auth.uid() or professional_id = auth.uid()
  )));

commit;
