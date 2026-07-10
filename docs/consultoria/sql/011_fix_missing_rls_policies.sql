-- 011_fix_missing_rls_policies.sql
-- Correção: auditoria (pg_policies × pg_class.relrowsecurity) revelou mais tabelas com
-- RLS ligada e ZERO policies — mesmo padrão de aplicação parcial da migration 010.
-- Tabelas afetadas (todas com RLS on e nenhuma policy):
--   fit_checkins           (004) → check-in semanal não salvava/lia
--   fit_exercise_blocks    (005) → blocos de execução não salvavam e sumiam na leitura
--   fit_exercise_groups    (008) → grupos (superset/circuit/emom) idem
--   fit_files              (007) → upload/list/delete de arquivo bloqueados
--   storage.objects        (007) → blob no bucket fit-files bloqueado (fora do escopo
--                                  da auditoria de public.fit_*; verificado à parte)
-- Idempotente (drop if exists + create); definições idênticas às migrations de origem.
-- Após aplicar: recarregar o schema cache do PostgREST (Dashboard → Settings → API).

-- ── fit_checkins ──
drop policy if exists fit_checkins_select on public.fit_checkins;
create policy fit_checkins_select on public.fit_checkins for select
  using (patient_id in (select id from public.fit_patients where user_id = auth.uid() or professional_id = auth.uid()));
drop policy if exists fit_checkins_insert on public.fit_checkins;
create policy fit_checkins_insert on public.fit_checkins for insert
  with check (patient_id in (select id from public.fit_patients where user_id = auth.uid() or professional_id = auth.uid()));
drop policy if exists fit_checkins_update on public.fit_checkins;
create policy fit_checkins_update on public.fit_checkins for update
  using (patient_id in (select id from public.fit_patients where user_id = auth.uid() or professional_id = auth.uid()))
  with check (patient_id in (select id from public.fit_patients where user_id = auth.uid() or professional_id = auth.uid()));

-- ── fit_exercise_blocks ──
drop policy if exists fit_exercise_blocks_select on public.fit_exercise_blocks;
create policy fit_exercise_blocks_select on public.fit_exercise_blocks for select
  using (plan_id in (select id from public.fit_workout_plans where professional_id = auth.uid()
    or patient_id in (select id from public.fit_patients where user_id = auth.uid())));
drop policy if exists fit_exercise_blocks_insert on public.fit_exercise_blocks;
create policy fit_exercise_blocks_insert on public.fit_exercise_blocks for insert
  with check (plan_id in (select id from public.fit_workout_plans where professional_id = auth.uid()));
drop policy if exists fit_exercise_blocks_update on public.fit_exercise_blocks;
create policy fit_exercise_blocks_update on public.fit_exercise_blocks for update
  using (plan_id in (select id from public.fit_workout_plans where professional_id = auth.uid()))
  with check (plan_id in (select id from public.fit_workout_plans where professional_id = auth.uid()));

-- ── fit_exercise_groups ──
drop policy if exists fit_exercise_groups_select on public.fit_exercise_groups;
create policy fit_exercise_groups_select on public.fit_exercise_groups for select
  using (plan_id in (select id from public.fit_workout_plans where professional_id = auth.uid()
    or patient_id in (select id from public.fit_patients where user_id = auth.uid())));
drop policy if exists fit_exercise_groups_insert on public.fit_exercise_groups;
create policy fit_exercise_groups_insert on public.fit_exercise_groups for insert
  with check (plan_id in (select id from public.fit_workout_plans where professional_id = auth.uid()));
drop policy if exists fit_exercise_groups_update on public.fit_exercise_groups;
create policy fit_exercise_groups_update on public.fit_exercise_groups for update
  using (plan_id in (select id from public.fit_workout_plans where professional_id = auth.uid()))
  with check (plan_id in (select id from public.fit_workout_plans where professional_id = auth.uid()));

-- ── fit_files (metadados) ──
drop policy if exists fit_files_select on public.fit_files;
create policy fit_files_select on public.fit_files for select
  using (patient_id in (select id from public.fit_patients where professional_id = auth.uid() or user_id = auth.uid()));
drop policy if exists fit_files_insert on public.fit_files;
create policy fit_files_insert on public.fit_files for insert
  with check (uploaded_by = auth.uid()
    and patient_id in (select id from public.fit_patients where professional_id = auth.uid() or user_id = auth.uid()));
drop policy if exists fit_files_update on public.fit_files;
create policy fit_files_update on public.fit_files for update
  using (patient_id in (select id from public.fit_patients where professional_id = auth.uid() or user_id = auth.uid()))
  with check (patient_id in (select id from public.fit_patients where professional_id = auth.uid() or user_id = auth.uid()));
drop policy if exists fit_files_delete on public.fit_files;
create policy fit_files_delete on public.fit_files for delete
  using (patient_id in (select id from public.fit_patients where professional_id = auth.uid()));

-- ── Bucket privado fit-files (idempotente) ──
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fit-files', 'fit-files', false, 52428800,
  array['image/jpeg','image/png','image/webp','application/pdf','video/mp4','video/quicktime'])
on conflict (id) do nothing;

-- ── RLS de Storage (só bucket fit-files) — path: patient/{patient_id}/{arquivo} ──
drop policy if exists fit_files_obj_select on storage.objects;
create policy fit_files_obj_select on storage.objects for select
  using (bucket_id = 'fit-files'
    and (split_part(name,'/',2))::uuid in
      (select id from public.fit_patients where professional_id = auth.uid() or user_id = auth.uid()));
drop policy if exists fit_files_obj_insert on storage.objects;
create policy fit_files_obj_insert on storage.objects for insert
  with check (bucket_id = 'fit-files'
    and (split_part(name,'/',2))::uuid in
      (select id from public.fit_patients where professional_id = auth.uid() or user_id = auth.uid()));
drop policy if exists fit_files_obj_update on storage.objects;
create policy fit_files_obj_update on storage.objects for update
  using (bucket_id = 'fit-files'
    and (split_part(name,'/',2))::uuid in
      (select id from public.fit_patients where professional_id = auth.uid() or user_id = auth.uid()));
drop policy if exists fit_files_obj_delete on storage.objects;
create policy fit_files_obj_delete on storage.objects for delete
  using (bucket_id = 'fit-files'
    and (split_part(name,'/',2))::uuid in
      (select id from public.fit_patients where professional_id = auth.uid()));
