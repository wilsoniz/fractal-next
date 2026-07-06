# ADR-FIT-005 — Agrupamento de Exercícios (superset / circuito / EMOM)

- **Status:** Aceito
- **Data:** 2026-07-04
- **Escopo:** Fracta Consultoria (isolado do Fracta Behavior)
- **Fase:** 11

## Contexto

Métodos que agrupam **vários exercícios** (superset A1/A2, circuito, EMOM) não cabiam
no modelo por-exercício da Fase 6 (blocos). Ficaram explicitamente fora de escopo na
ADR-FIT-001.

## Decisão

Introduzir um nível **opcional** de **Grupo** entre Dia e Exercício:

```
Plano → Dia → [Grupo] → Exercício → Bloco
```

- Nova tabela `fit_exercise_groups` (type `superset|circuit|emom|other`, `rounds`,
  `interval_seconds` p/ EMOM, `rest_seconds`, `label`, `order_index`).
- Colunas aditivas em `fit_workout_exercises`: `group_id` (nullable) e `group_order`.
- Exercício `group_id null` = standalone (comportamento atual). Blocos (Fase 6)
  permanecem por exercício, ortogonais ao grupo.

## Regras

- **Ordenação:** grupos e exercícios standalone compartilham `order_index` no dia;
  exercícios dentro do grupo usam `group_order`.
- **Registro do paciente:** o grupo é **orientação de execução** — o registro continua
  por exercício/bloco. **Sem nova tabela de log.** Registro por volta fica para depois.
- **Gráficos:** inalterados (chaveiam por exercício/bloco).
- **Arquivar grupo** → desagrupa os exercícios (viram standalone, sem perda).

## Compatibilidade

Puramente aditivo. `group_id null` em todos os exercícios existentes → planos e treinos
atuais renderizam idêntico. Sem migração de dados.

## Fora de escopo (futuro)

Registro round-a-round; drag-and-drop de reordenação; mover exercícios existentes entre
grupos (MVP: criar exercício dentro do grupo + desagrupar).
