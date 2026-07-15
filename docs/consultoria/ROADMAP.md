# ROADMAP — POREA

Prioridade: MVP funcional no ar. Evitar features secundárias antes do MVP.

## MVP (ordem)

1. Login
2. Dashboard do profissional
3. Cadastro de pacientes
4. Questionário pré-avaliação
5. Avaliação inicial
6. Linha de base
7. Planejamento de treinos
8. Registro de treinos
9. Check-ins
10. Dashboard de evolução

## Fluxo do paciente

Cadastro → Questionário → Avaliação → Linha de Base → Treino → Check-ins →
Acompanhamento Semanal → Reavaliação → Novo Treino → Histórico Completo.

## Faseamento

- **Fase 0 — Fundação** ✅ (em validação): `fit_profiles` + `fit_patients` + RLS,
  módulo `src/lib/fit/`, login e entrada roteada por papel. Item 1.
- **Fase 1 — Profissional base** ✅ (em validação): rotas `/consultoria/professional/*`,
  guard + `FitSidebar`, Dashboard (item 2), Cadastro de pacientes (item 3) com campos
  estruturais (modalidade, tipo de consultoria, academia/local) via migration 001,
  e workspace do paciente por abas. Componentes `Fit*`.
- **Fase 2 — Avaliação** ✅ (em validação): Questionário JSONB por seções (item 4),
  Avaliação como documento em blocos (item 5), Linha de base = avaliação `baseline`
  com medições em `fit_measurements` (item 6). Catálogo de métricas aberto + custom.
  Aba Arquivos criada (sem upload). Componentes `Fit*`.
- **Fase 3 — Treino** ✅ (em validação): Planejamento de treinos (item 7) — planos
  (draft/active/archived) → dias (A/B/C) → exercícios (séries/reps/carga/descanso/tempo/
  vídeo/instruções/obs). Soft-delete; exercícios como linhas estáveis prontas p/ Fase 4.
- **Fase 4 — Lado paciente** ✅ (em validação): rotas `/consultoria/patient/*`,
  guard + auto-vínculo por email (`fn_fit_link_self`), Registro de treinos (item 8)
  via runner, Check-ins semanais (item 9), histórico básico. Mobile-first.
- **Fase 5 — Evolução** ✅ (em validação): Dashboard de evolução (item 10) com recharts.
  Sem SQL — camada de leitura `fit-evolution.ts`. Peso unificado (measurements+checkins),
  medidas, carga por exercício, tendências de check-in, frequência semanal, comparativo
  com a linha de base (Δ neutro, valência só em dor/aderência), IMC automático. Visão
  completa p/ o profissional (aba Evolução) e enxuta p/ o paciente (Progresso).

**MVP (10 itens) completo.**

- **Fase 6 — Métodos de treino e blocos de execução** ✅ (em validação): ver
  [ADR-FIT-001](adr/ADR-FIT-001-metodos-treino-blocos.md). `fit_exercise_blocks` +
  `fit_training_log_block_entries`; builder com modo avançado por blocos; runner por
  bloco; evolução prioriza bloco `primary`. Aditivo, modo simples intacto.

## Backlog pós-MVP (ordem de prioridade definida pelo dono, 2026-07-04)

1. **Convite/token de paciente** ✅ (Fase 7 — em validação) — ver
   [ADR-FIT-002](adr/ADR-FIT-002-onboarding-convite-token.md). `fit_patient_invites` +
   `fn_fit_invite_info`/`fn_fit_redeem_invite`; painel no workspace, página
   `/consultoria/convite`, KPI de convites pendentes. Auto-vínculo por email mantido.
2. **Upload de fotos/arquivos** ✅ (Fase 8 — em validação) — ver
   [ADR-FIT-003](adr/ADR-FIT-003-storage-arquivos.md). Bucket privado `fit-files` +
   `fit_files`; aba Arquivos funcional (upload/grid/hard-delete); paciente envia foto
   de progresso. Signed URLs 300s; consentimento na UI.
3. **PDF da avaliação** ✅ (Fase 9 — em validação) — ver
   [ADR-FIT-004](adr/ADR-FIT-004-chassi-documento-html-print.md). Chassi próprio
   HTML→print (`fit-doc.ts`) + `avaliacao-pdf.ts`; botão "Gerar PDF" no detalhe da
   avaliação. Sem SQL, sem lib nova, sem Storage.
4. **Reavaliações comparadas** ✅ (Fase 10 — em validação) — `fit-assessment-compare.ts`;
   seção "Comparativo" no detalhe da reavaliação (vs Linha de base / vs Anterior, Δ neutro
   + %) e tabela "Histórico de avaliações" (métrica × avaliações) na Evolução. Sem SQL.
   PDF comparativo fica para depois (reusa o chassi `fit-doc.ts`).
5. **Superset/circuito multi-exercício + EMOM** ✅ (Fase 11 — em validação) — ver
   [ADR-FIT-005](adr/ADR-FIT-005-agrupamento-exercicios.md). `fit_exercise_groups` +
   `group_id`/`group_order` em exercícios; builder com grupos, runner com cabeçalho de
   grupo. Aditivo; registro segue por exercício/bloco; gráficos inalterados.

**Backlog pós-MVP concluído (#1–#5).**

## Fase 14 — Biblioteca de exercícios e assimetria ✅ (implementada; SQL pendente)

- famílias, variações globais/personalizadas e favoritos;
- picker por favoritos, grupo muscular, família, equipamento e texto;
- `exercise_library_id` com snapshot de nome;
- prescrição e registro separados por lado no modo avançado por blocos;
- seeds 012/013 criados, ainda não aplicados no Supabase;
- dashboard de assimetria e modelo corporal visual ficam para fase futura.

## Fase 15 — Estratégias com etapas internas ✅ (concluída e validada)

- etapas ordenadas e editáveis dentro de blocos, com snapshot do preset;
- ocorrências fixas ou abertas, índice por ocorrência e encerramento explícito;
- runner guiado por etapa e por lado, com registro de completas, parciais,
  isometria, descanso, dor e motivo de encerramento;
- resumo compatível em `fit_training_log_block_entries` e detalhe preservado em
  `fit_training_log_block_step_entries`;
- presets piloto intensivos sem recomendação automática ao paciente;
- migration 015 versionada e validada operacionalmente.

## Fase 16 — Avaliação segmentada e assimetria ✅ (concluída e validada)

- contexto anatômico, lado e papel clínico em `fit_measurements`;
- registro global, unilateral e pareado sem persistir diferenças derivadas;
- IMC automático por data de referência, com fontes rastreáveis;
- comparativos longitudinais por identidade técnica completa;
- Evolução esquerda/direita, afetado/não afetado e trajetória da assimetria;
- PDF global e segmentar;
- migration 016 versionada e validada operacionalmente.

## Marco v0.5.0-beta

As Fases 15 e 16 formam o primeiro marco Beta versionado da POREA. A validação
operacional conjunta confirmou os fluxos avançados de treino e avaliação
segmentada com profissional e aluno real.

Grandes expansões arquiteturais ficam temporariamente congeladas durante o Beta.

## Beta Hardening

Objetivo: transformar uma plataforma funcional em um produto rápido, intuitivo,
confiável e pronto para uso recorrente.

Prioridades iniciais:

1. corrigir atritos observados por usuários reais;
2. melhorar fluxos de maior frequência;
3. reduzir cliques e redigitação;
4. melhorar responsividade mobile;
5. melhorar loading, skeletons e estados vazios;
6. melhorar mensagens de erro;
7. prevenir perda de formulário;
8. melhorar acessibilidade;
9. revisar performance;
10. criar onboarding;
11. criar templates e atalhos apenas quando sustentados por uso real;
12. não abrir grandes módulos sem evidência de necessidade.

> Nenhuma grande funcionalidade nova entra durante o Beta Hardening sem evidência
> de uso real, risco operacional ou necessidade estratégica aprovada.

### Futuro — alternativas de equipamento e planejamento semanal

Alternativas equivalentes de equipamento exigirão modelagem própria e validação
profissional; não serão inferidas pela plataforma. Planejamento semanal e
periodização permanecem fases futuras, sem código de periodização nesta fase.

### Futuro — modelo corporal e análise segmentar

Mapa corporal, dor por região, força por lado, mobilidade por articulação,
assimetrias, composição corporal segmentar, histórico visual e regiões clicáveis,
sem copiar produtos existentes. A Fase 16 prepara os dados, mas não implementa o
corpo gráfico.
