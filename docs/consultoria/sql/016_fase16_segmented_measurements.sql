-- ============================================================
-- CONSULTORIA — Fase 16 — avaliação segmentada e lateralidade
-- Aplicar após 012. Aditivo, sem backfill e sem alteração de RLS.
-- NÃO foi aplicado automaticamente no Supabase.
-- ============================================================

begin;

alter table public.fit_measurements
  add column side text check (side is null or side in ('left','right','bilateral','custom')),
  add column clinical_role text check (clinical_role is null or clinical_role in ('dominant','non_dominant','affected','unaffected','operated','contralateral','custom')),
  add column side_label text,
  add column body_region text,
  add column body_segment text,
  add column joint text,
  add column measurement_site text,
  add column protocol text,
  add column method text,
  add column source_exercise_library_id uuid references public.fit_exercise_variations(id) on delete set null,
  add column source_exercise_name_snapshot text,
  add column context jsonb not null default '{}'::jsonb check (jsonb_typeof(context) = 'object'),
  add column data jsonb not null default '{}'::jsonb check (jsonb_typeof(data) = 'object');

create index idx_fit_measurements_segmented_series
  on public.fit_measurements(patient_id, metric, side, clinical_role, measured_at);
create index idx_fit_measurements_body_region
  on public.fit_measurements(patient_id, body_region, body_segment, metric, measured_at);
create index idx_fit_measurements_source_exercise
  on public.fit_measurements(source_exercise_library_id, metric, measured_at);

commit;

-- Auditoria pós-aplicação (executar separadamente):
-- select column_name, data_type, is_nullable
-- from information_schema.columns
-- where table_schema = 'public' and table_name = 'fit_measurements'
-- order by ordinal_position;
--
-- As policies existentes de fit_measurements permanecem inalteradas.
