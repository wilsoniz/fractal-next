-- ============================================================
-- CONSULTORIA — Fase 8 — arquivos do paciente (Storage) — ver ADR-FIT-003
-- Aplicar no SQL Editor (após 000..006). Aditivo e isolado do Fracta.
-- Bucket privado + metadados + RLS escopada só ao bucket fit-files.
-- ============================================================

-- ── Bucket privado fit-files (versionado por SQL) ──
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'fit-files', 'fit-files', false, 52428800,
  array['image/jpeg','image/png','image/webp','application/pdf','video/mp4','video/quicktime']
)
on conflict (id) do nothing;

-- ── fit_files : metadados ──
create table if not exists public.fit_files (
  id           uuid primary key default gen_random_uuid(),
  patient_id   uuid not null references public.fit_patients(id) on delete cascade,
  uploaded_by  uuid not null,                    -- auth.uid do autor (prof ou paciente)
  storage_path text not null unique,             -- caminho no bucket
  file_name    text not null,
  mime_type    text,
  size_bytes   bigint,
  category     text not null default 'document'
    check (category in ('photo','video','exam','document','progress_photo','other')),
  taken_at     date,
  notes        text,
  status       text not null default 'active' check (status in ('active','archived')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists idx_fit_files_patient on public.fit_files(patient_id);
create index if not exists idx_fit_files_category on public.fit_files(category);
create trigger trg_fit_files_updated before update on public.fit_files
  for each row execute function public.fn_fit_set_updated_at();
alter table public.fit_files enable row level security;
create policy fit_files_select on public.fit_files for select
  using (patient_id in (select id from public.fit_patients where professional_id = auth.uid() or user_id = auth.uid()));
create policy fit_files_insert on public.fit_files for insert
  with check (uploaded_by = auth.uid()
    and patient_id in (select id from public.fit_patients where professional_id = auth.uid() or user_id = auth.uid()));
create policy fit_files_update on public.fit_files for update
  using (patient_id in (select id from public.fit_patients where professional_id = auth.uid() or user_id = auth.uid()))
  with check (patient_id in (select id from public.fit_patients where professional_id = auth.uid() or user_id = auth.uid()));
-- LGPD: hard-delete do metadado permitido ao profissional dono
create policy fit_files_delete on public.fit_files for delete
  using (patient_id in (select id from public.fit_patients where professional_id = auth.uid()));

-- ── RLS de Storage (só bucket fit-files) — path: patient/{patient_id}/{arquivo} ──
create policy fit_files_obj_select on storage.objects for select
  using (bucket_id = 'fit-files'
    and (split_part(name,'/',2))::uuid in
      (select id from public.fit_patients where professional_id = auth.uid() or user_id = auth.uid()));
create policy fit_files_obj_insert on storage.objects for insert
  with check (bucket_id = 'fit-files'
    and (split_part(name,'/',2))::uuid in
      (select id from public.fit_patients where professional_id = auth.uid() or user_id = auth.uid()));
create policy fit_files_obj_update on storage.objects for update
  using (bucket_id = 'fit-files'
    and (split_part(name,'/',2))::uuid in
      (select id from public.fit_patients where professional_id = auth.uid() or user_id = auth.uid()));
-- hard-delete do blob permitido ao profissional dono
create policy fit_files_obj_delete on storage.objects for delete
  using (bucket_id = 'fit-files'
    and (split_part(name,'/',2))::uuid in
      (select id from public.fit_patients where professional_id = auth.uid()));
