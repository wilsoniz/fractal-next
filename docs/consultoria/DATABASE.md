# DATABASE — Plataforma de Consultoria (`fit_*`)

Produto isolado do Fracta. Todas as tabelas usam prefixo `fit_`, sem FK para
entidades do Fracta (exceto `auth.users`, infra compartilhada do Supabase).

## Convenções

- **Prefixo `fit_`** em toda tabela. Nunca reutilizar/alterar tabela do Fracta.
- **Valores internos em inglês** (`role`, `sex`, `status`), UI traduz para PT-BR.
- **Sem DELETE**: exclusão lógica via `status` (`active` / `archived`).
- **`updated_at`** mantido por trigger próprio `fn_fit_set_updated_at`
  (nunca a `set_atualizado_em()` do Fracta, que grava `atualizado_em`).
- **RLS sempre com policy explícita** de SELECT/INSERT/UPDATE — RLS ativa sem
  policy = 0 linhas sem erro (falha silenciosa).
- Identidade: `fit_profiles.id = auth.uid()`.

## Fase 0

### `fit_profiles`
Identidade de app. `id` = `auth.users.id`. `role ∈ {professional, patient}`.
Policies: usuário só vê/insere/edita o próprio perfil (`id = auth.uid()`).

### `fit_patients`
Ficha do paciente, dono = profissional (`professional_id → fit_profiles`).
`user_id` (nullable) liga a conta de login do próprio paciente, quando houver.
Policies:
- SELECT: `professional_id = auth.uid()` OU `user_id = auth.uid()`.
- INSERT: `professional_id = auth.uid()`.
- UPDATE: `professional_id = auth.uid()`.

SQL aplicável: [`sql/000_fase0_init.sql`](sql/000_fase0_init.sql).

## Fase 1 — colunas cadastrais aditivas em `fit_patients`

Migration aditiva e isolada (não toca o Fracta):
- `modality` — modalidade. CHECK `strength|running|crossfit|rehab|wellness|other` (nullable).
- `consultoria_type` — tipo de consultoria. CHECK `in_person|online|hybrid` (nullable).
- `training_location` — academia / local de treino (texto livre, nullable).

Valores internos em inglês; UI traduz (mapas em `src/lib/fit/types.ts`).
RLS e trigger `updated_at` já cobrem as colunas (herdam da tabela).

Status: o banco mantém apenas `active` / `archived`. A UI já exibe 4 estados
(Ativo, Em avaliação, Pausado, Arquivado) via `FitStatusBadge`; "Em avaliação" e
"Pausado" ainda não são persistíveis (migration futura).

SQL aplicável: [`sql/001_fase1_patient_fields.sql`](sql/001_fase1_patient_fields.sql).

## Fase 2 — questionário, avaliações e medições

Três tabelas novas, isoladas, com RLS explícita e trigger `updated_at`.

### `fit_questionnaires`
Anamnese pré-avaliação. `answers jsonb` no formato `{ secao: { campo: valor } }`
(schema data-driven em `src/lib/fit/questionnaire-schema.ts` — perguntas evoluem
sem migration). `status` `draft|completed`.

### `fit_assessments`
Avaliação como **documento** (preparada para PDF futuro). `type` `baseline|reassessment`
— a **Linha de Base** é a avaliação `baseline` (não é tabela). `notes` = observações
gerais; `data jsonb` extensível (ex.: `clinical_notes`). Soft-close via `status`.

### `fit_measurements`
**Repositório central de todas as variáveis quantitativas** (não só antropometria):
antropometria, perimetria, performance (corrida, VO₂, salto, FC, 1RM…), funcional
(dor, ROM) e custom. Série temporal por `(patient_id, metric, measured_at)`.
`category` `anthropometry|circumference|performance|functional|other`. Catálogo aberto
em `src/lib/fit/metrics.ts` + métrica personalizada (label/unit inline).
**Única tabela com DELETE físico permitido** (correção de leitura), restrito ao dono;
todas as demais seguem soft-delete.

RLS (as três): SELECT do profissional dono OU do paciente vinculado
(`patient_id in (select id from fit_patients where user_id = auth.uid())`);
INSERT/UPDATE só do profissional; DELETE só em `fit_measurements`.

SQL aplicável: [`sql/002_fase2_assessments.sql`](sql/002_fase2_assessments.sql).

## Fase 3 — planos de treino (prescrição)

Três tabelas novas, isoladas, RLS explícita e trigger `updated_at`.

### `fit_workout_plans`
Cabeçalho do plano: `patient_id`, `title`, `goal`, período, `frequency_per_week`,
`notes`, `data jsonb`. `status` `draft|active|archived` — o paciente (Fase 4) só verá
planos `active`.

### `fit_workout_days`
Dias/sessões do plano (Treino A/B/C): `name`, `focus`, `order_index`, `notes`.
Soft-delete via `status` `active|archived`.

### `fit_workout_exercises`
Exercícios (linhas estáveis, prontas p/ registro na Fase 4 e evolução de carga na
Fase 5): `name`, `order_index`, `sets`, `target_reps` (texto), `target_load` (texto —
"70% 1RM"/"12kg"/"RPE 8"), `rest_seconds`, `tempo`, `video_url`, `instructions`,
`notes`. Soft-delete via `status`. Guarda `plan_id` e `day_id` (RLS 1 nível via plano).

RLS (as três): SELECT do profissional dono OU do paciente vinculado; INSERT/UPDATE
só do profissional (dias/exercícios via `plan_id`). **Sem DELETE físico** — coerente
com a regra de que só `fit_measurements` permite exclusão física; aqui o soft-delete
ainda protege os futuros registros do paciente (Fase 4) de ficarem órfãos.

SQL aplicável: [`sql/003_fase3_workouts.sql`](sql/003_fase3_workouts.sql).

## Fase 11 — agrupamento de exercícios (ver ADR-FIT-005)

`fit_exercise_groups` (type superset/circuit/emom/other, rounds, interval_seconds,
rest_seconds, order_index) + colunas aditivas `group_id`/`group_order` em
`fit_workout_exercises`. Exercício `group_id null` = standalone (inalterado). RLS via
`plan_id` (prof dono + paciente vinculado); soft-delete. Arquivar grupo desagrupa os
exercícios. Sem nova tabela de log (grupo é orientação; registro segue por exercício/bloco).
SQL: [`sql/008_fase11_exercise_groups.sql`](sql/008_fase11_exercise_groups.sql).

## Fase 6 — blocos de execução (ver ADR-FIT-001)

Aditivo. Exercício sem blocos = modo simples (inalterado); com ≥1 bloco `active` =
modo avançado.

### `fit_exercise_blocks`
Blocos de execução de um exercício (prescrição): `block_type` (feeder/top_set/backoff/
myo_activation/myo_mini_set/straight_set/warmup/amrap/rest_pause/drop_set/cluster/circuit/
other), `label`, `sets`, `target_reps`, `target_load`, `rest_seconds`, `rir`/`rpe`
(texto, faixas), `tempo`, `instructions`, `data jsonb`. Guarda `plan_id`/`day_id` (RLS 1
nível via plano). Soft-delete via `status`.

### `fit_training_log_block_entries`
Registro do paciente por bloco: `load_done` (numérico — base da evolução), `reps_done`,
`sets_done`, `rpe`/`rir` (numéricos, real executado), `completed`, snapshots
`exercise_name`/`block_label`/`block_type` (histórico + agrupamento em gráfico). RLS via
`log_id → fit_training_logs`. Sem DELETE físico.

`fit_workout_exercises` e `fit_training_log_entries` permanecem como fonte do modo simples.

SQL aplicável: [`sql/005_fase6_exercise_blocks.sql`](sql/005_fase6_exercise_blocks.sql).
ADR: [`adr/ADR-FIT-001-metodos-treino-blocos.md`](adr/ADR-FIT-001-metodos-treino-blocos.md).

## Fase 8 — arquivos / Storage (ver ADR-FIT-003)

Bucket privado `fit-files` (Storage) + `public.fit_files` (metadados: `patient_id`,
`uploaded_by`, `storage_path`, `mime_type`, `size_bytes`, `category`
photo/video/exam/document/progress_photo/other, `taken_at`, `status`). Path
`patient/{patient_id}/{uuid}-{nome}`. RLS (tabela e `storage.objects`, escopada a
`bucket_id='fit-files'`): profissional dono + paciente vinculado. **Hard-delete**
(blob + metadado) pelo profissional dono (LGPD). Exibição via Signed URLs 300s.
SQL: [`sql/007_fase8_files.sql`](sql/007_fase8_files.sql).

## Fase 7 — convite/token de paciente (ver ADR-FIT-002)

`fit_patient_invites` (token uuid, `status` pending/accepted/revoked, `expires_at`
default +7 dias). RLS: só o profissional dono lê/cria/edita (revoga); sem DELETE.
Paciente nunca acessa direto — usa funções SECURITY DEFINER:
- `fn_fit_invite_info(token)` → dados p/ a tela de aceite (nomes, status, expiração).
- `fn_fit_redeem_invite(token)` → vincula `fit_patients.user_id = auth.uid()`; regra
  1 conta = 1 paciente; rejeita inválido/expirado/usado/revogado/já-vinculado.

Convive com `fn_fit_link_self` (auto-vínculo por email, Fase 4) — atalho; o convite é o
caminho robusto. SQL: [`sql/006_fase7_patient_invites.sql`](sql/006_fase7_patient_invites.sql).

## Fase 4 — área do paciente (registro de treino + check-ins)

Primeira escrita feita pelo **paciente**. RLS via `fit_patients.user_id = auth.uid()`.

### Vínculo — `fn_fit_link_self()` (SECURITY DEFINER)
Auto-vincula a conta do paciente à ficha por email, **só se houver exatamente 1**
ficha com aquele email e `user_id` nulo (0 → null; >1 → null, evita vínculo errado).
Chamada no 1º acesso do paciente. `grant execute ... to authenticated`.

### `fit_training_logs` / `fit_training_log_entries`
Sessão executada + desempenho por exercício. `entries.load_done` (numérico) é a base
da evolução de carga por exercício (Fase 5). `exercise_name` guarda snapshot. Soft-delete
via `status` no log. RLS: paciente vinculado OU profissional dono (via `fit_patients`).

### `fit_checkins`
Check-in semanal: data, peso, aderência %, energia/sono/humor (1-5), dor (0-10), notas,
`data jsonb`. RLS igual. Peso fica aqui por enquanto (Fase 5 unifica leitura com
`fit_measurements`).

Nenhuma policy das Fases 1–3 foi alterada.

SQL aplicável: [`sql/004_fase4_patient.sql`](sql/004_fase4_patient.sql).

## Fase 14 — biblioteca, favoritos e prescrição por lado

### `fit_exercise_families` / `fit_exercise_variations`

Famílias globais organizam o movimento-base. Variações representam o ativo rico,
com implementação, equipamento, marca/modelo, lateralidade e campos técnicos
opcionais. Globais são read-only para profissionais; personalizados pertencem ao
autor. Pacientes não acessam a biblioteca.

### `fit_exercise_favorites`

Preferência do profissional por um item existente. Usa `status` para desfavoritar
sem DELETE físico e tem unicidade por profissional/item.

### Compatibilidade da prescrição

`fit_workout_exercises.exercise_library_id` é nullable. `name` continua sendo o
snapshot canônico da prescrição. Logs simples e por bloco também guardam a
referência nullable para análises futuras.

### `fit_exercise_block_sides`

Prescrição estruturada por lado vinculada ao bloco. Sem registros ativos, o bloco
funciona como antes. O registro por bloco recebe `side_prescription_id`, `side`,
`side_label_snapshot` e `pain_level`, todos nullable. Sem backfill.

SQL: [`sql/012_fase14_exercise_library.sql`](sql/012_fase14_exercise_library.sql) e
seed piloto [`sql/013_fase14_exercise_library_seed.sql`](sql/013_fase14_exercise_library_seed.sql).

### Reconciliação de schema preliminar

Ambientes que aplicaram a proposta preliminar (com `equipment` e
`exercise_variation_id`) devem executar primeiro
[`sql/014_fase14_reconcile_preliminary_schema.sql`](sql/014_fase14_reconcile_preliminary_schema.sql).
A correção é aditiva: preserva as colunas legadas, cria o contrato aprovado e só
copia valores para as colunas equivalentes. Depois, executar o seed 013.
