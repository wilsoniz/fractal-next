-- ============================================================
-- CONSULTORIA — Fase 1 — campos cadastrais estruturais do paciente
-- Aditivo e isolado em fit_patients. Nada aqui toca o Fracta.
-- Aplicar no SQL Editor do Supabase (após 000_fase0_init.sql).
-- ============================================================

alter table public.fit_patients
  add column if not exists modality          text,  -- modalidade
  add column if not exists consultoria_type  text,  -- tipo de consultoria
  add column if not exists training_location text;  -- academia / local de treino (texto livre)

-- CHECKs enumerados (idempotentes). training_location é texto livre, sem check.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'fit_patients_modality_chk') then
    alter table public.fit_patients
      add constraint fit_patients_modality_chk
      check (modality is null or modality in
        ('strength','running','crossfit','rehab','wellness','other'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'fit_patients_consultoria_type_chk') then
    alter table public.fit_patients
      add constraint fit_patients_consultoria_type_chk
      check (consultoria_type is null or consultoria_type in
        ('in_person','online','hybrid'));
  end if;
end $$;
