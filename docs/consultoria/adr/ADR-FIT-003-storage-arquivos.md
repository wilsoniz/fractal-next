# ADR-FIT-003 — Arquitetura de Arquivos (Supabase Storage)

- **Status:** Aceito
- **Data:** 2026-07-04
- **Escopo:** Fracta Consultoria (isolado do Fracta Behavior)
- **Fase:** 8

## Contexto

A aba "Arquivos" do paciente precisa armazenar fotos, vídeos, exames e documentos
(dados de saúde sensíveis). Blobs não devem ir para o Postgres.

## Decisão

- **Blobs no Supabase Storage**, bucket **privado** `fit-files`.
- **Metadados** em `public.fit_files` (para listar/filtrar/categorizar).
- Path por paciente: `patient/{patient_id}/{uuid}-{nome}`. O `patient_id` no path é
  a chave da RLS de Storage.
- **Sem URL pública**; exibição/download via **Signed URLs** de **300s**.
- RLS (tabela e `storage.objects`, escopada a `bucket_id='fit-files'`): acesso só ao
  profissional dono e ao paciente vinculado.
- **Hard-delete permitido** (blob + metadado) pelo profissional dono — exceção
  justificada por LGPD (direito à eliminação de dado de saúde). As demais tabelas
  seguem soft-delete.
- Tipos aceitos: JPEG, PNG, WEBP, PDF, MP4, MOV. HEIC rejeitado por ora.
- Limites: bucket 50 MB; client 10 MB (foto/exame/doc) e 50 MB (vídeo).
- **Consentimento**: a UI de upload exige confirmação de consentimento.

## Escopo MVP

- Profissional envia qualquer categoria no workspace.
- Paciente envia **apenas foto de progresso** (`progress_photo`, com `taken_at`).
- `category='progress_photo'` + `taken_at` já preparam uma futura seção de fotos na
  Evolução (não implementada nesta fase).

## Isolamento

Bucket e tabela novos (`fit-*`/`fit_files`); storage policies escopadas só ao bucket
`fit-files`. Zero alteração no Fracta.

## Consequências

- Custo de storage (free tier = 1 GB) — vídeos consomem rápido; monitorar.
- Path é a fronteira de segurança: uploads DEVEM seguir `patient/{id}/...`.
