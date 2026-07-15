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

## Fase 15 — estratégias com etapas internas

Pré-condição: aplicar manualmente a migration 015 em um ambiente de teste.

1. [ ] Criar e concluir um bloco antigo sem etapas; confirmar o runner e o log anteriores.
2. [ ] Aplicar um preset com etapas fixas; editar uma meta e confirmar que o snapshot não muda com o catálogo.
3. [ ] Executar etapa repetível, adicionar ocorrência e conferir índices 0, 1 e seguintes.
4. [ ] Executar Drop set com múltiplos drops; conferir carga e repetições por ocorrência.
5. [ ] Executar isometria; conferir duração detalhada e duração total no resumo.
6. [ ] Executar escada; conferir totais separados de completas e parciais.
7. [ ] Executar Widowmaker com pausas; conferir repetições, descansos e quantidade de ocorrências.
8. [ ] Encerrar manualmente uma estratégia aberta; conferir `termination_reason`.
9. [ ] Prescrever lados diferentes; confirmar etapas e ocorrências isoladas por lado.
10. [ ] Simular falha na gravação; confirmar formulário intacto, erro visível, log arquivado e nova tentativa possível.
11. [ ] Abrir Evolução; confirmar que o resumo por bloco continua legível e não duplica o detalhe.
12. [ ] Abrir treino criado antes da migration; confirmar que permanece intacto.
13. [ ] Com outro profissional, tentar ler/escrever etapas e entradas; confirmar bloqueio por RLS.
14. [ ] Revisar o diff; confirmar ausência de mudanças no Fracta, auth, middleware e `supabase/schema.sql`.

## Fase 16 — avaliação segmentada, assimetria e IMC

Pré-condição: aplicar manualmente a migration 016 em ambiente de teste.

1. [ ] Abrir avaliação global antiga e confirmar edição, comparativo e PDF intactos.
2. [ ] Registrar peso e altura na mesma avaliação; conferir IMC e fontes.
3. [ ] Criar avaliação sem peso; conferir uso do peso anterior.
4. [ ] Sem peso medido anterior, registrar check-in anterior; conferir fallback.
5. [ ] Registrar apenas peso; conferir estado incompleto por altura.
6. [ ] Registrar apenas altura; conferir estado incompleto por peso.
7. [ ] Criar avaliação passada e altura futura; confirmar que a altura futura não é usada.
8. [ ] Confirmar que IMC não aparece no catálogo e que criação manual é bloqueada.
9. [ ] Registrar perimetria esquerda/direita e conferir duas linhas independentes.
10. [ ] Registrar força por lado com exercício da biblioteca.
11. [ ] Registrar dor por lado com articulação e ponto anatômico.
12. [ ] Registrar afetado/não afetado e conferir índice derivado.
13. [ ] Registrar `side=left` e `clinical_role=operated` simultaneamente.
14. [ ] Conferir diferença absoluta e os valores de origem.
15. [ ] Conferir diferença relativa e tooltip da fórmula.
16. [ ] Usar dois valores zero; conferir percentual indisponível.
17. [ ] Usar protocolos diferentes; conferir “Dados não comparáveis automaticamente”.
18. [ ] Usar pontos anatômicos diferentes; confirmar bloqueio da comparação.
19. [ ] Usar exercícios/equipamentos diferentes; confirmar bloqueio da comparação.
20. [ ] Criar grupo ambíguo legado; confirmar que nenhuma linha é escolhida silenciosamente.
21. [ ] Conferir gráfico esquerda/direita.
22. [ ] Conferir gráfico afetado/não afetado.
23. [ ] Registrar reavaliação e conferir trajetória da assimetria.
24. [ ] Comparar reavaliação com baseline e anterior, preservando lado/contexto.
25. [ ] Gerar PDF e conferir contexto segmentar, diferenças e fontes do IMC.
26. [ ] Conferir que dados antigos e `bmi` legado permanecem intactos.
27. [ ] Revisar diff e confirmar isolamento completo do Fracta e dos treinos.
