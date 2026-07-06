-- ============================================================
-- CONSULTORIA — Fase 4 — área do paciente (registro de treino + check-ins)
-- Aplicar no SQL Editor (após 000..003). Isolado do Fracta.
-- Primeira escrita feita pelo PACIENTE (RLS via fit_patients.user_id).
-- ============================================================

-- ── Auto-vínculo por email (SECURITY DEFINER) ──
-- Vincula a conta do paciente à ficha fit_patients SOMENTE se houver
-- EXATAMENTE 1 ficha com aquele email e user_id nulo.
-- 0 fichas → null. >1 fichas → null (evita vínculo incorreto).
create or replace function public.fn_fit_link_self()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid   uuid := auth.uid();
  v_email text;
  v_pid   uuid;
  v_count int;
begin
  if v_uid is null then return null; end if;

  -- já vinculado?
  select id into v_pid from public.fit_patients where user_id = v_uid limit 1;
  if v_pid is not null then return v_pid; end if;

  select email into v_email from auth.users where id = v_uid;
  if v_email is null then return null; end if;

  select count(*) into v_count
    from public.fit_patients
    where user_id is null and lower(email) = lower(v_email);

  if v_count <> 1 then return null; end if;  -- 0 ou >1 → não vincula

  update public.fit_patients set user_id = v_uid
    where user_id is null and lower(email) = lower(v_email)
    returning id into v_pid;

  return v_pid;
end;
$$;
grant execute on function public.fn_fit_link_self() to authenticated;

-- ── fit_training_logs : sessão de treino executada ──
create table if not exists public.fit_training_logs (
  id           uuid primary key default gen_random_uuid(),
  patient_id   uuid not null references public.fit_patients(id) on delete cascade,
  plan_id      uuid references public.fit_workout_plans(id) on delete set null,
  day_id       uuid references public.fit_workout_days(id) on delete set null,
  performed_at date not null default current_date,
  duration_min int,
  notes        text,
  status       text not null default 'active' check (status in ('active','archived')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists idx_fit_training_logs_patient on public.fit_training_logs(patient_id);
create index if not exists idx_fit_training_logs_day on public.fit_training_logs(day_id);
create trigger trg_fit_training_logs_updated before update on public.fit_training_logs
  for each row execute function public.fn_fit_set_updated_at();
alter table public.fit_training_logs enable row level security;
create policy fit_training_logs_select on public.fit_training_logs for select
  using (patient_id in (select id from public.fit_patients where user_id = auth.uid() or professional_id = auth.uid()));
create policy fit_training_logs_insert on public.fit_training_logs for insert
  with check (patient_id in (select id from public.fit_patients where user_id = auth.uid() or professional_id = auth.uid()));
create policy fit_training_logs_update on public.fit_training_logs for update
  using (patient_id in (select id from public.fit_patients where user_id = auth.uid() or professional_id = auth.uid()))
  with check (patient_id in (select id from public.fit_patients where user_id = auth.uid() or professional_id = auth.uid()));

-- ── fit_training_log_entries : desempenho por exercício ──
create table if not exists public.fit_training_log_entries (
  id            uuid primary key default gen_random_uuid(),
  log_id        uuid not null references public.fit_training_logs(id) on delete cascade,
  exercise_id   uuid references public.fit_workout_exercises(id) on delete set null,
  exercise_name text not null,                 -- snapshot p/ histórico
  sets_done     int,
  reps_done     text,
  load_done     numeric,
  load_unit     text default 'kg',
  rpe           numeric,
  completed     boolean not null default true,
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists idx_fit_log_entries_log on public.fit_training_log_entries(log_id);
create index if not exists idx_fit_log_entries_exercise on public.fit_training_log_entries(exercise_id);
create trigger trg_fit_log_entries_updated before update on public.fit_training_log_entries
  for each row execute function public.fn_fit_set_updated_at();
alter table public.fit_training_log_entries enable row level security;
create policy fit_log_entries_select on public.fit_training_log_entries for select
  using (log_id in (select id from public.fit_training_logs where patient_id in
    (select id from public.fit_patients where user_id = auth.uid() or professional_id = auth.uid())));
create policy fit_log_entries_insert on public.fit_training_log_entries for insert
  with check (log_id in (select id from public.fit_training_logs where patient_id in
    (select id from public.fit_patients where user_id = auth.uid() or professional_id = auth.uid())));
create policy fit_log_entries_update on public.fit_training_log_entries for update
  using (log_id in (select id from public.fit_training_logs where patient_id in
    (select id from public.fit_patients where user_id = auth.uid() or professional_id = auth.uid())))
  with check (log_id in (select id from public.fit_training_logs where patient_id in
    (select id from public.fit_patients where user_id = auth.uid() or professional_id = auth.uid())));

-- ── fit_checkins : check-in semanal ──
create table if not exists public.fit_checkins (
  id            uuid primary key default gen_random_uuid(),
  patient_id    uuid not null references public.fit_patients(id) on delete cascade,
  checkin_date  date not null default current_date,
  weight_kg     numeric,
  adherence_pct int,      -- aderência %
  energy_level  int,      -- 1-5
  sleep_quality int,      -- 1-5
  pain_level    int,      -- 0-10
  mood          int,      -- 1-5
  notes         text,
  data          jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists idx_fit_checkins_patient on public.fit_checkins(patient_id);
create trigger trg_fit_checkins_updated before update on public.fit_checkins
  for each row execute function public.fn_fit_set_updated_at();
alter table public.fit_checkins enable row level security;
create policy fit_checkins_select on public.fit_checkins for select
  using (patient_id in (select id from public.fit_patients where user_id = auth.uid() or professional_id = auth.uid()));
create policy fit_checkins_insert on public.fit_checkins for insert
  with check (patient_id in (select id from public.fit_patients where user_id = auth.uid() or professional_id = auth.uid()));
create policy fit_checkins_update on public.fit_checkins for update
  using (patient_id in (select id from public.fit_patients where user_id = auth.uid() or professional_id = auth.uid()))
  with check (patient_id in (select id from public.fit_patients where user_id = auth.uid() or professional_id = auth.uid()));
