# ADR-FIT-009 — Estratégias com Etapas Internas

- **Status:** Aceito
- **Data:** 2026-07-14
- **Escopo:** Plataforma de Consultoria (isolada do Fracta Behavior)
- **Fase:** 15

## Contexto

Drop sets, escadas, Widowmaker e isometrias podem conter ocorrências internas com
carga, repetições, duração e pausas próprias. Reduzi-las a uma linha apaga dados
relevantes. Transformar cada ocorrência em bloco, por outro lado, perde a unidade
da estratégia.

## Decisão

Adotar:

`fit_exercise_blocks → fit_exercise_block_steps → fit_training_log_block_step_entries`

O bloco é a estratégia aplicada. As etapas são snapshots ordenados e editáveis da
prescrição. O registro de etapa representa cada ocorrência real. Uma etapa
repetível pode gerar várias entradas com o mesmo `step_id` e diferentes
`occurrence_index`.

Presets permanecem em código. Ao aplicar, o builder cria o bloco, copia sua
configuração para `block.data` e copia as etapas para a prescrição. Alterações
futuras do preset não reescrevem treinos.

## Contrato de `block.data`

```json
{
  "strategy_key": "drop_set_target",
  "strategy_version": 1,
  "summary_rule": "initial_load_total_reps_drop_count",
  "configuration": {},
  "safety": {"warning": null, "termination": null}
}
```

Campos específicos ficam em `configuration`, por exemplo `initial_rep_range`,
`target_total_reps`, `hold_position` e `hold_per_rep_seconds`.

## Etapas repetíveis

`repeat_mode='open'` permite “Adicionar ocorrência”. `min_occurrences` e
`max_occurrences` limitam o fluxo; `max_occurrences=null` significa aberto, mas o
runner nunca cria ocorrências automaticamente. Encerramento é ação explícita e
pode exigir `termination_reason`.

## Prescrição por lado

Etapas pertencem ao bloco. Quando há lados ativos, o runner executa as mesmas
etapas separadamente por lado e grava snapshots laterais em cada ocorrência.

## Regra de resumo

`fit_training_log_block_entries` continua sendo o resumo compatível:

- top set: carga e reps do bloco primário;
- drop set: carga inicial, reps totais e quantidade de drops em `data`;
- cluster: carga, reps totais e mini-blocos em `data`;
- Widowmaker: carga inicial, reps totais e pausas em `data`;
- isometria: carga e duração total em `data`;
- escada: completas e parciais totais em `data`.

O resumo nunca substitui as entradas detalhadas.

## Resiliência

A gravação usa compensação segura: se resumo ou etapas falharem, o log recém-criado
é arquivado, o formulário mantém estado local e pode ser reenviado. Não há DELETE,
duplo envio ou conclusão visual antes da confirmação de todos os lotes.

## Segurança

Presets são pontos de partida, nunca recomendações automáticas. Estratégias
intensivas admitem alerta, instrução, dor e motivo de interrupção. Não são ligadas
a gênero ou categoria corporal.

## Compatibilidade

Bloco sem etapas continua igual. Sem backfill. Logs antigos permanecem legíveis e
a Evolução continua lendo o resumo existente.
