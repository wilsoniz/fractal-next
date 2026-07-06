# ADR-FIT-001 — Arquitetura de Métodos de Treino e Blocos de Execução

- **Status:** Aceito
- **Data:** 2026-07-04
- **Escopo:** Fracta Consultoria (isolado do Fracta Behavior)
- **Fase:** 6

## Contexto

O modelo do MVP **Plano → Dia → Exercício** (`fit_workout_exercises` com
`sets/target_reps/target_load`) cobre prescrições lineares ("3x10"), mas não
representa métodos avançados em que **um mesmo exercício tem múltiplos blocos de
execução com parâmetros distintos**: feeder/top/back-off, myo reps, rest-pause,
drop set, cluster, AMRAP, etc.

## Decisão

Introduzir um nível abaixo do exercício — **Blocos de Execução**
(`fit_exercise_blocks`) — e o registro correspondente do paciente por bloco
(`fit_training_log_block_entries`).

Nova estrutura conceitual:

```
Plano → Dia → Exercício → Blocos de execução → Registro do paciente por bloco
```

Um exercício passa a ter dois modos:

- **Simples** (sem blocos): comportamento atual, via `fit_workout_exercises` +
  `fit_training_log_entries`.
- **Avançado** (≥1 bloco `active`): prescrição em `fit_exercise_blocks`, registro
  em `fit_training_log_block_entries`.

Catálogo de métodos e metadados de bloco vivem em código
(`src/lib/fit/training-methods.ts`), incluindo o papel de cada `block_type` nos
gráficos (`chartRole`: primary / secondary / none).

### `block_type` inicial
`feeder, top_set, backoff, myo_activation, myo_mini_set, straight_set, warmup,
amrap, rest_pause, drop_set, cluster, circuit, other`.

### RIR/RPE
- Prescrição (blocos): **texto** — permite faixas ("1-2", "7-9").
- Registro (paciente): **numérico** — valor real executado.

## Compatibilidade

- Migração **puramente aditiva**. Nenhuma coluna/tabela removida ou alterada em
  conteúdo.
- `fit_workout_exercises` e `fit_training_log_entries` permanecem como fonte do
  **modo simples**. Treinos existentes têm zero blocos → seguem simples, sem
  migração de dados.
- Regra única: exercício é *avançado* se e somente se tem ≥1 bloco `active`.

## Fora de escopo (fase própria futura)

- **Superset / circuito multi-exercício** (agrupamento de vários exercícios,
  ex.: A1/A2). Nesta fase há apenas `block_type='circuit'` de bloco único +
  `data jsonb`. Agrupamento real exigirá um `group_label` no exercício.
- **EMOM** dedicado: mapeado por ora como `other` + `data jsonb`.

## Consequências

- Builder e runner passam a ramificar por "o exercício tem blocos?".
- A Evolução prioriza o bloco relevante (ex.: `top_set` como série principal;
  `backoff` secundária; `feeder`/`myo_mini_set` não entram como principal).
- Snapshots (`block_type`, `block_label`, `exercise_name`) no registro preservam
  o histórico mesmo se blocos/exercícios forem arquivados.
