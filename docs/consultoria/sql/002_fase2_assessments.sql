-- ============================================================
-- CONSULTORIA — Fase 2 — questionário, avaliações e medições
-- Aplicar no SQL Editor (após 000 e 001). Isolado do Fracta.
--
-- fit_measurements NÃO é uma tabela de antropometria: é o repositório
-- central de TODAS as variáveis quantitativas da evolução do paciente
-- (antropometria, perimetria, performance, funcional, custom).
-- ============================================================

-- ── fit_questionnaires : pré-avaliação (respostas flexíveis em jsonb) ──
create table if not exists public.fit_questionnaires (
  id               uuid primary key default gen_random_uuid(),
  patient_id       uuid not null references public.fit_patients(id) on delete cascade,
  professional_id  uuid not null references public.fit_profiles(id) on delete cascade,
  answers          jsonb not null default '{}'::jsonb,   -- { secao: { campo: valor } }
  status           text not null default 'draft' check (status in ('draft','completed')),
  completed_at     timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists idx_fit_questionnaires_patient on public.fit_questionnaires(patient_id);
create trigger trg_fit_questionnaires_updated before update on public.fit_questionnaires
  for each row execute function public.fn_fit_set_updated_at();
alter table public.fit_questionnaires enable row level security;
create policy fit_questionnaires_select on public.fit_questionnaires for select
  using (professional_id = auth.uid()
    or patient_id in (select id from public.fit_patients where user_id = auth.uid()));
create policy fit_questionnaires_insert on public.fit_questionnaires for insert
  with check (professional_id = auth.uid());
create policy fit_questionnaires_update on public.fit_questionnaires for update
  using (professional_id = auth.uid()) with check (professional_id = auth.uid());

-- ── fit_assessments : avaliação inicial (baseline) e reavaliações ──
create table if not exists public.fit_assessments (
  id               uuid primary key default gen_random_uuid(),
  patient_id       uuid not null references public.fit_patients(id) on delete cascade,
  professional_id  uuid not null references public.fit_profiles(id) on delete cascade,
  type             text not null default 'baseline' check (type in ('baseline','reassessment')),
  assessed_at      date not null default current_date,
  title            text,
  notes            text,                                 -- observações gerais
  data             jsonb not null default '{}'::jsonb,   -- extensível (ex.: clinical_notes)
  status           text not null default 'active' check (status in ('active','archived')),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists idx_fit_assessments_patient on public.fit_assessments(patient_id);
create trigger trg_fit_assessments_updated before update on public.fit_assessments
  for each row execute function public.fn_fit_set_updated_at();
alter table public.fit_assessments enable row level security;
create policy fit_assessments_select on public.fit_assessments for select
  using (professional_id = auth.uid()
    or patient_id in (select id from public.fit_patients where user_id = auth.uid()));
create policy fit_assessments_insert on public.fit_assessments for insert
  with check (professional_id = auth.uid());
create policy fit_assessments_update on public.fit_assessments for update
  using (professional_id = auth.uid()) with check (professional_id = auth.uid());

-- ── fit_measurements : variáveis quantitativas (série temporal) ──
create table if not exists public.fit_measurements (
  id               uuid primary key default gen_random_uuid(),
  patient_id       uuid not null references public.fit_patients(id) on delete cascade,
  professional_id  uuid not null references public.fit_profiles(id) on delete cascade,
  assessment_id    uuid references public.fit_assessments(id) on delete set null,
  category         text not null default 'other'
                   check (category in ('anthropometry','circumference','performance','functional','other')),
  metric           text not null,   -- chave do catálogo (ex.: 'weight_kg') ou slug custom
  label            text,            -- rótulo livre p/ métrica personalizada
  value            numeric not null,
  unit             text,
  measured_at      date not null default current_date,
  notes            text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists idx_fit_measurements_patient on public.fit_measurements(patient_id);
create index if not exists idx_fit_measurements_series on public.fit_measurements(patient_id, metric, measured_at);
create index if not exists idx_fit_measurements_assessment on public.fit_measurements(assessment_id);
create trigger trg_fit_measurements_updated before update on public.fit_measurements
  for each row execute function public.fn_fit_set_updated_at();
alter table public.fit_measurements enable row level security;
create policy fit_measurements_select on public.fit_measurements for select
  using (professional_id = auth.uid()
    or patient_id in (select id from public.fit_patients where user_id = auth.uid()));
create policy fit_measurements_insert on public.fit_measurements for insert
  with check (professional_id = auth.uid());
create policy fit_measurements_update on public.fit_measurements for update
  using (professional_id = auth.uid()) with check (professional_id = auth.uid());
-- Exceção do sistema: DELETE físico permitido SÓ aqui (correção de leitura), só o dono.
create policy fit_measurements_delete on public.fit_measurements for delete
  using (professional_id = auth.uid());
