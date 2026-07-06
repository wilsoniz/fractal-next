# CHANGELOG — Plataforma de Consultoria

## Beta hardening — "Ver como paciente" + arquivamento

Sem SQL, sem alteração no Fracta.

Adicionado:
- **Ver como paciente** (ADR-FIT-006): rota `/consultoria/professional/patients/[id]/preview`,
  preview read-only dos dados reais do paciente (Início/Treino/Check-in/Progresso) numa
  moldura mobile (`FitPhoneFrame`). Sem impersonation, sem escrita (só funções de leitura;
  nenhum controle de registro/upload/exclusão). Botão no header do workspace.
- **Desarquivar paciente** (`reactivatePatient`) no workspace.
- **Filtro "Mostrar arquivados"** na lista de pacientes (esconde arquivados por padrão).
- Builder: exercício que falha ao salvar agora mostra erro (não some em silêncio).

Segurança:
- Read-only é garantido pela UI (o profissional tem acesso de escrita ao próprio paciente
  por design). `getPatient` só retorna paciente do profissional (RLS). Sem SQL, sem RLS nova.


## Fase 13 — Recuperação de senha + onboarding de paciente

Sem SQL. Config no Supabase: adicionar `…/consultoria/nova-senha` em
Authentication → URL Configuration → Redirect URLs.

Adicionado:
- `resetPasswordFit` / `updatePasswordFit` em `supabase-fit.ts`.
- Login: **"Esqueci a senha"** funcional (envia email de recuperação).
- Página `/consultoria/nova-senha` (define a nova senha na sessão de recuperação).
- Login vindo do convite (`redirect` → `/consultoria/convite…`) abre em **Criar conta**
  já com **Paciente** selecionado + aviso.

Garantias:
- Só a superfície de auth da Consultoria (Supabase Auth padrão). Zero Fracta.


## Fase 12 — Endurecimento de convite/acesso

Schema (aplicado por você no SQL Editor):
- `docs/consultoria/sql/009_fase12_invite_hardening.sql` — `fn_fit_redeem_invite`
  passa a recusar contas de profissional (reason `is_professional`).

Corrigido/Adicionado:
- Página do convite: detecta conta de profissional (mostra aviso + Sair, sem "Aceitar");
  distingue **erro de sistema** (não foi possível carregar) de **token inválido**.
- Login: atalho **"Sou paciente / tenho um convite"** (cola link/token → `/consultoria/convite`).
- Workspace: badge de acesso oculto quando o paciente está arquivado.

Nota operacional:
- `fn_fit_invite_info` faltava no banco de alguns ambientes (404) — reaplicar a função da 006.
- Vínculo indevido (profissional resgatando convite) corrige-se com
  `update fit_patients set user_id = null where id = ...`.

Garantias:
- Só troca 1 função + ajustes de UI. Zero alteração no Fracta.


## Fase 11 — Agrupamento de exercícios (ADR-FIT-005)

Schema (aplicado por você no SQL Editor):
- `docs/consultoria/sql/008_fase11_exercise_groups.sql` — `fit_exercise_groups` (+ RLS,
  trigger) e colunas aditivas `group_id`/`group_order` em `fit_workout_exercises`.

Adicionado:
- ADR-FIT-005. Tipos `FitExerciseGroup`/`FitGroupType` + aninhamento no `FitWorkoutPlanFull`.
- I/O em `fit-workouts.ts`: `addGroup/updateGroup/archiveGroup` (desagrupa ao arquivar),
  `ungroupExercise`, `addExercise` com grupo, `getPlanFull` com grupos, `orderedDayItems`.
- Componentes `Fit*`: `FitGroupEditor`, `FitExerciseRow`, `FitExerciseFields` (ExerciseForm
  extraída); `FitExerciseEditor` e `FitWorkoutRunner` reformulados para grupos + standalone.

Compatibilidade:
- Aditivo. `group_id null` = standalone (comportamento atual). Sem migração de dados.
- Sem nova tabela de log; gráficos inalterados.

Garantias:
- 1 tabela `fit_*` + 2 colunas aditivas. Zero alteração no Fracta e nas policies anteriores.


## Fase 10 — Reavaliações comparadas

Sem SQL, sem alteração no Fracta.

Adicionado:
- `src/lib/fit/fit-assessment-compare.ts` — `getAssessmentComparison` (referência
  baseline/anterior; Δ + % por métrica, valência neutra) e
  `listAssessmentsWithMeasurements` (matriz métrica × avaliações).
- Componentes `Fit*`: `FitComparisonTable`, `FitAssessmentHistoryTable`.
- Aba Avaliações: seção **"Comparativo"** no detalhe da reavaliação (seletor
  vs Linha de base / vs Anterior); baseline mostra nota de ponto de partida.
- Aba Evolução: seção **"Histórico de avaliações"** (matriz de progressão).

Garantias:
- Só leitura via RLS; `fit-*`/`Fit*`; PDF comparativo adiado (reusa `fit-doc.ts`).


## Fase 9 — PDF da avaliação (ADR-FIT-004)

Sem SQL, sem biblioteca nova, sem Storage.

Adicionado:
- ADR-FIT-004 (chassi de documento HTML→print).
- `src/lib/fit/fit-doc.ts` — chassi próprio da Consultoria (shell de impressão, CSS
  `@page`, `document.title`, rodapé discreto). Não usa nada do Fracta.
- `src/lib/fit/avaliacao-pdf.ts` — monta o corpo da avaliação (dados do paciente +
  blocos de medição por categoria + observações) e imprime.
- Botão "Gerar PDF" no detalhe da avaliação (`FitAvaliacoesPanel`).

Segurança:
- Geração 100% client-side a partir de dados já autorizados por RLS; nada é enviado a
  servidor; janela efêmera; usuário salva como PDF pelo diálogo.

Garantias:
- Zero alteração no Fracta; identidade visual própria; sem reutilizar libs clínicas.


## Fase 8 — Upload de fotos/arquivos (ADR-FIT-003)

Schema/Storage (aplicado por você no SQL Editor):
- `docs/consultoria/sql/007_fase8_files.sql` — bucket privado `fit-files` (via SQL),
  tabela `fit_files` (+ RLS) e policies de `storage.objects` escopadas ao bucket.

Adicionado:
- ADR-FIT-003 (arquitetura de Storage).
- `src/lib/fit/fit-files.ts` (upload/list/signedUrl/update/hard-delete; allowlist de mime;
  limites 10/50 MB); tipos em `types.ts`.
- Componentes `Fit*`: `FitFileUpload` (com consentimento), `FitFileGrid` (thumbnails via
  Signed URL, abrir, excluir); painel `FitArquivosPanel`.
- Workspace: aba **Arquivos** funcional (antes placeholder).
- Paciente: seção "Fotos de progresso" no Progresso (upload `progress_photo`).

Segurança/LGPD:
- Bucket privado, sem URL pública; Signed URLs 300s; RLS por path→paciente.
- Hard-delete (blob + metadado) pelo profissional dono. Tipos: JPEG/PNG/WEBP/PDF/MP4/MOV.

Garantias:
- 1 bucket + 1 tabela `fit_*` novos; policies só do bucket `fit-files`. Zero Fracta.


## Fase 7 — Convite/token de paciente (ADR-FIT-002)

Schema (aplicado por você no SQL Editor):
- `docs/consultoria/sql/006_fase7_patient_invites.sql` — `fit_patient_invites` (+ RLS,
  trigger) e funções `fn_fit_invite_info` / `fn_fit_redeem_invite` (SECURITY DEFINER).

Adicionado:
- ADR-FIT-002 (estratégia de onboarding por convite/token).
- `src/lib/fit/fit-invites.ts` (create/latest/revoke/countPending + rpc info/redeem);
  tipos em `types.ts`.
- Componentes `Fit*`: `FitInvitePanel` (workspace — gerar/copiar/revogar), `FitAccessBadge`.
- Página `/consultoria/convite` (resgate por token, fora do guard da área do paciente).
- Workspace: seção "Acesso do paciente" na aba Cadastro + badge de acesso no header.
- Tela "conta não vinculada": campo "Tenho um convite" (cola link/token).
- Dashboard: KPI "Convites pendentes".

Compatibilidade:
- Auto-vínculo por email (`fn_fit_link_self`) mantido como atalho/fallback.
- Regra MVP: 1 conta = 1 paciente.

Garantias:
- Cria 1 tabela `fit_*` + 2 funções. Zero alteração no Fracta e nas policies anteriores.


## Fase 6 — Métodos de Treino e Blocos de Execução (ADR-FIT-001)

Schema (aplicado por você no SQL Editor):
- `docs/consultoria/sql/005_fase6_exercise_blocks.sql` — `fit_exercise_blocks` +
  `fit_training_log_block_entries` (+ RLS, triggers; soft-delete, sem DELETE físico).

Adicionado:
- ADR-FIT-001 (`docs/consultoria/adr/`) documentando a arquitetura de blocos.
- `src/lib/fit/training-methods.ts` — catálogo de métodos + metadados de bloco
  (chartRole primary/secondary/none).
- Tipos de bloco/registro por bloco em `types.ts`; `FitWorkoutPlanFull` aninha blocos.
- I/O de blocos em `fit-workouts.ts` (`listBlocks/addBlock/updateBlock/archiveBlock`,
  `getPlanFull` com blocos); `saveBlockEntries/listLogBlockEntries` em `fit-training-logs.ts`.
- Evolução ciente de blocos: `getExerciseLoadSeries` prioriza bloco `primary`.
- Componentes `Fit*`: `FitBlockEditor` (builder), `FitBlockRunner` (registro paciente);
  `FitExerciseEditor` ganha modo avançado por blocos; `FitWorkoutRunner` ramifica
  simples/blocos.

Compatibilidade:
- Puramente aditivo. Exercício sem blocos = modo simples (fit_workout_exercises +
  fit_training_log_entries) inalterado. Treinos existentes seguem funcionando.

Garantias:
- Cria 2 tabelas `fit_*`. Zero alteração no Fracta e nas policies anteriores.


## Fase 5 — Dashboard de Evolução (fecha o MVP)

Sem schema: fase 100% de leitura/agregação sobre tabelas fit_* existentes.

Adicionado:
- `src/lib/fit/fit-evolution.ts` — séries e derivados: peso unificado
  (`fit_measurements` + `fit_checkins`), medidas por métrica, carga por exercício
  (via log entries), tendências de check-in, frequência semanal, comparativo com a
  linha de base (Δ), e **IMC automático** (último peso × última altura).
- Componentes `Fit*`: `FitLineChart` (recharts, linha/barra), `FitDeltaBadge`
  (variação NEUTRA por padrão; valência só em dor/aderência).
- Profissional: aba **Evolução** (`FitEvolucaoPanel`) — KPIs, comparativo baseline,
  gráficos e **atividade recente** (os registros do paciente aparecem aqui).
- Paciente: **Progresso** repaginado (peso, IMC, carga por exercício, aderência).

Garantias:
- Zero SQL, zero mudança de policy, zero alteração no Fracta.


## Fase 4 — Área do Paciente (registro de treino + check-ins)

Schema (aplicado por você no SQL Editor):
- `docs/consultoria/sql/004_fase4_patient.sql` — `fn_fit_link_self()` (auto-vínculo por
  email, só com match único), `fit_training_logs`, `fit_training_log_entries`,
  `fit_checkins` (+ RLS de escrita do paciente; sem DELETE físico).

Adicionado:
- Rotas `/consultoria/patient/*` (mobile-first): layout com guard + auto-vínculo,
  início, treino (runner), check-in, progresso. `FitPatientNav` (nav inferior).
- Registro de treino (item 8): `FitWorkoutRunner` — prescrito + vídeo/instruções +
  realizado (carga/reps/séries/RPE/feito) → grava log + entries.
- Check-in semanal (item 9): `FitCheckinForm` (peso, aderência, energia/sono/humor/dor).
- Progresso: histórico básico de treinos e check-ins (gráficos completos na Fase 5).
- I/O: `fit-linking.ts`, `fit-training-logs.ts`, `fit-checkins.ts`; `listActivePlans`
  em `fit-workouts.ts`. Contexto `patient/_context.tsx`.
- Entrada `/consultoria` roteia paciente → `/consultoria/patient/inicio`.

Garantias:
- Cria 3 tabelas `fit_*` + 1 função de vínculo. Zero alteração no Fracta e zero
  mudança nas policies das fases anteriores.


## Fase 3 — Planejamento de Treinos

Schema (aplicado por você no SQL Editor):
- `docs/consultoria/sql/003_fase3_workouts.sql` — `fit_workout_plans`,
  `fit_workout_days`, `fit_workout_exercises` (+ RLS, triggers; soft-delete, sem DELETE).

Adicionado:
- Aba Treinos funcional (item 7): lista de planos + criação + builder
  (cabeçalho → dias → exercícios) + publicar/despublicar/arquivar.
- Exercício com nome, séries, reps alvo, carga alvo (texto flexível), descanso, tempo,
  `video_url`, `instructions`, observações — linhas estáveis prontas p/ registro (Fase 4).
- Plano `draft|active|archived`; paciente verá só `active` na Fase 4 (RLS já preparada).
- Componentes `Fit*`: `FitWorkoutPlanCard`, `FitWorkoutPlanForm`, `FitExerciseEditor`;
  painel `FitTreinosPanel`. I/O `fit-workouts.ts`; tipos em `types.ts`.

Garantias:
- Schema só cria 3 tabelas `fit_*` novas. Zero alteração no Fracta.


## Fase 2 — Questionário, Avaliação e Linha de Base

Schema (aplicado por você no SQL Editor):
- `docs/consultoria/sql/002_fase2_assessments.sql` — `fit_questionnaires`,
  `fit_assessments`, `fit_measurements` (+ RLS, triggers; DELETE só em measurements).

Adicionado:
- Questionário pré-avaliação (item 4) em JSONB por seções (schema data-driven
  `questionnaire-schema.ts`), aba funcional com resumo/editar.
- Avaliação como documento (item 5) em blocos: Dados Gerais, Antropometria, Perimetria,
  Performance, Dor e Funcionalidade, Observações Clínicas — preparada para PDF futuro.
- Linha de Base (item 6): avaliação `baseline` + medições em `fit_measurements`.
- `fit_measurements` como repositório central de variáveis quantitativas; catálogo
  aberto (`metrics.ts`) + criação de métrica personalizada (nome/unidade/categoria).
- Componentes `Fit*`: `FitSection`, `FitQuestionnaireForm`, `FitAssessmentForm`,
  `FitMeasurementEditor`; painéis colocados `FitQuestionarioPanel`, `FitAvaliacoesPanel`.
- I/O: `fit-questionnaires.ts`, `fit-assessments.ts`, `fit-measurements.ts`.
- Workspace: abas Questionário, Avaliações e Arquivos passam a funcionais/navegáveis;
  Treinos e Evolução seguem preparados.

Garantias:
- Schema só cria tabelas `fit_*` novas. Zero alteração no Fracta.


## Fase 1 — Profissional base (dashboard + cadastro de pacientes)

Schema (aplicado por você no SQL Editor):
- `docs/consultoria/sql/001_fase1_patient_fields.sql` — colunas aditivas em
  `fit_patients`: `modality`, `consultoria_type`, `training_location` (com CHECKs).

Adicionado:
- Rotas `/consultoria/professional/*` com guard (`role='professional'`) e shell `FitSidebar`.
- `professional/dashboard` (item 2): KPIs reais (total, ativos, próximas avaliações
  placeholder), últimos cadastrados e espaço reservado (aderência, evolução, check-ins,
  mensagens).
- `professional/patients` (item 3): listagem + busca + criação via `FitModal`/`FitPatientForm`
  + arquivar (soft).
- `professional/patients/[id]`: workspace do paciente por abas (Resumo e Cadastro
  funcionais; Questionário/Avaliações/Treinos/Evolução/Arquivos preparados).
- Componentes `Fit*`: `FitCard`, `FitKpi`, `FitModal`, `FitStatusBadge` (4 estados de UI),
  `FitTabs`, `FitSidebar`, `FitPatientCard`, `FitPatientForm`.
- I/O `src/lib/fit/fit-patients.ts`; tipos/labels ampliados em `src/lib/fit/types.ts`.
- Entrada `/consultoria` passa a rotear profissional → dashboard.

Garantias:
- Schema muda só `fit_patients` (aditivo). Zero alteração no Fracta.


## Fase 0 — Fundação (auth + identidade)

Adicionado:
- Schema inicial `fit_profiles` e `fit_patients` com RLS explícita, trigger próprio
  `fn_fit_set_updated_at` e política de não-exclusão (`docs/consultoria/sql/000_fase0_init.sql`).
- Módulo isolado `src/lib/fit/`: `supabase-fit.ts` (costura única com a infra
  Supabase), `fit-profiles.ts` (identidade + `ensureProfile` lazy), `types.ts`.
- Área `src/app/consultoria/`: `layout.tsx` (shell/identidade própria),
  `login/page.tsx` (item 1 do MVP — login/registro com seletor de papel),
  `page.tsx` (entrada roteada por sessão/papel; landing autenticada mínima).
- Documentação inicial: ARCHITECTURE, DATABASE, ROADMAP, CHANGELOG.

Garantias:
- Nenhum arquivo do Fracta foi alterado. `src/lib/supabase.ts` intacto (apenas
  reexportado). Sem dependência de `components/fracta` ou lógica clínica.
