# Smoke Test — Plataforma de Consultoria

Roteiro de fumaça para rodar **antes de cada rodada de teste** (ex.: com a Jessica).
Cada passo indica a tabela que exercita e a migration que a cobre — se travar, vá direto
à fonte. Regra de ouro: se "não salvar e não der erro claro", abra o Console (F12), leia a
mensagem real do Supabase e cheque `pg_policies` da tabela daquele passo.

Dica: rode a área do paciente numa **aba anônima**, para não sobrepor a sessão do
profissional no mesmo navegador (client Supabase compartilhado).

## Parte A — Profissional (monta a ficha)

- [ ] **A1** Login como profissional; a barra mostra o **nome** (não "Profissional") — `fit_profiles` (000)
- [ ] **A2** Criar paciente com objetivo, modalidade, tipo, local — `fit_patients` (000/001)
- [ ] **A3** Aba Questionário → preencher e salvar — `fit_questionnaires` (002)
- [ ] **A4** Aba Avaliações → criar avaliação com medidas — `fit_assessments` + `fit_measurements` (002)
- [ ] **A5** Aba Treinos → criar plano → dia → adicionar exercício simples — `fit_workout_plans/days/exercises` (003)
- [ ] **A6** Adicionar exercício com **bloco** (modo avançado) — `fit_exercise_blocks` (005 → 011)
- [ ] **A7** Adicionar **grupo** (superset/circuit/EMOM) + exercício dentro — `fit_exercise_groups` (008 → 011)
- [ ] **A8** Aba Cadastro → gerar **convite** (copiar link/token) — `fit_patient_invites` (006)
- [ ] **A9** "Ver como paciente" → abre em leitura — (read-only)

## Parte B — Paciente (consome e registra) — aba anônima, link do A8

- [ ] **B1** Aceitar convite → criar conta/login como paciente — `fn_fit_redeem_invite` (006/009)
- [ ] **B2** Aba Treino → o plano do A5 aparece? abrir o dia — `fit_workout_plans/days` (003)
- [ ] **B3** Bloco (A6) e grupo (A7) aparecem no dia — `fit_exercise_blocks/groups` (011)
- [ ] **B4** Preencher cargas/reps → **Concluir treino** — `fit_training_logs/entries/block_entries` (010)
- [ ] **B5** Aba Check-in → preencher e enviar — `fit_checkins` (004 → 011)
- [ ] **B6** Aba Progresso → enviar **foto de progresso** (com consentimento) — `fit_files` + `storage.objects` (007 → 011)
- [ ] **B7** Aba Progresso → gráficos de evolução renderizam — leitura consolidada (004/005)

## Parte C — Profissional (confere o retorno)

- [ ] **C1** Reabrir paciente → Treinos/Evolução → registro do B4 aparece — `fit_training_logs` (010)
- [ ] **C2** Evolução → check-in (B5) e medidas nos gráficos — `fit_checkins`/`fit_measurements` (004/002)
- [ ] **C3** Aba Arquivos → foto do B6 aparece (thumbnail via signed URL) — `fit_files` + storage (011)

---

Pontos em **010/011** foram consertados recentemente (migrations aplicadas parciais) —
atenção redobrada. Histórico das correções: `docs/consultoria/sql/010_*.sql` e `011_*.sql`.
