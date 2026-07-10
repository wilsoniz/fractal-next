-- 010_fix_training_logs_rls.sql
-- Correção: as migrations 004/005 foram aplicadas parcialmente no ambiente real —
-- as tabelas de REGISTRO de treino ficaram com RLS ligada e policies faltando:
--   fit_training_logs               → só tinha INSERT (faltavam SELECT, UPDATE)
--   fit_training_log_entries        → nenhuma policy (faltavam SELECT, INSERT, UPDATE)
--   fit_training_log_block_entries  → nenhuma policy (faltavam SELECT, INSERT, UPDATE)
-- Sintoma: paciente registrava treino e recebia 403
-- "new row violates row-level security policy for table fit_training_logs"
-- (createLog faz .insert().select(); sem policy de SELECT o retorno é negado).
-- Idempotente (drop if exists + create); definições idênticas às migrations 004/005.
-- Após aplicar: recarregar o schema cache do PostgREST (Dashboard → Settings → API).

-- ── fit_training_logs: faltavam SELECT e UPDATE ──
drop policy if exists fit_training_logs_select on public.fit_training_logs;
create policy fit_training_logs_select on public.fit_training_logs for select
  using (patient_id in (select id from public.fit_patients where user_id = auth.uid() or professional_id = auth.uid()));

drop policy if exists fit_training_logs_update on public.fit_training_logs;
create policy fit_training_logs_update on public.fit_training_logs for update
  using (patient_id in (select id from public.fit_patients where user_id = auth.uid() or professional_id = auth.uid()))
  with check (patient_id in (select id from public.fit_patients where user_id = auth.uid() or professional_id = auth.uid()));

-- ── fit_training_log_entries: faltavam TODAS ──
drop policy if exists fit_log_entries_select on public.fit_training_log_entries;
create policy fit_log_entries_select on public.fit_training_log_entries for select
  using (log_id in (select id from public.fit_training_logs where patient_id in
    (select id from public.fit_patients where user_id = auth.uid() or professional_id = auth.uid())));
drop policy if exists fit_log_entries_insert on public.fit_training_log_entries;
create policy fit_log_entries_insert on public.fit_training_log_entries for insert
  with check (log_id in (select id from public.fit_training_logs where patient_id in
    (select id from public.fit_patients where user_id = auth.uid() or professional_id = auth.uid())));
drop policy if exists fit_log_entries_update on public.fit_training_log_entries;
create policy fit_log_entries_update on public.fit_training_log_entries for update
  using (log_id in (select id from public.fit_training_logs where patient_id in
    (select id from public.fit_patients where user_id = auth.uid() or professional_id = auth.uid())))
  with check (log_id in (select id from public.fit_training_logs where patient_id in
    (select id from public.fit_patients where user_id = auth.uid() or professional_id = auth.uid())));

-- ── fit_training_log_block_entries: faltavam TODAS ──
drop policy if exists fit_log_block_entries_select on public.fit_training_log_block_entries;
create policy fit_log_block_entries_select on public.fit_training_log_block_entries for select
  using (log_id in (select id from public.fit_training_logs where patient_id in
    (select id from public.fit_patients where user_id = auth.uid() or professional_id = auth.uid())));
drop policy if exists fit_log_block_entries_insert on public.fit_training_log_block_entries;
create policy fit_log_block_entries_insert on public.fit_training_log_block_entries for insert
  with check (log_id in (select id from public.fit_training_logs where patient_id in
    (select id from public.fit_patients where user_id = auth.uid() or professional_id = auth.uid())));
drop policy if exists fit_log_block_entries_update on public.fit_training_log_block_entries;
create policy fit_log_block_entries_update on public.fit_training_log_block_entries for update
  using (log_id in (select id from public.fit_training_logs where patient_id in
    (select id from public.fit_patients where user_id = auth.uid() or professional_id = auth.uid())))
  with check (log_id in (select id from public.fit_training_logs where patient_id in
    (select id from public.fit_patients where user_id = auth.uid() or professional_id = auth.uid())));
