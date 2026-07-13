# ADR-FIT-008 — Prescrição e Registro Assimétricos por Bloco

- **Status:** Aceito
- **Data:** 2026-07-13
- **Escopo:** Plataforma de Consultoria (isolada do Fracta Behavior)
- **Fase:** 14

## Contexto

Um exercício unilateral pode exigir séries, repetições, carga ou intensidade
diferentes entre lados. Registrar isso apenas em notas impede execução guiada e
análise futura de assimetria.

## Decisão

Criar `fit_exercise_block_sides`. A assimetria pertence ao bloco e cada linha
representa uma prescrição lateral estruturada. Valores iniciais de `side`:
`left`, `right`, `bilateral`, `alternating`, `affected`, `unaffected` e `custom`.
`side_label` adapta a terminologia sem substituir o valor estruturado.

Adicionar de forma nullable aos registros por bloco:

- `exercise_library_id`;
- `side_prescription_id`;
- `side`;
- `side_label_snapshot`;
- `pain_level`.

Registros simples também recebem `exercise_library_id` para preparar análise
futura por ativo.

## Regra de modo

Sem lados ativos, o bloco funciona exatamente como hoje. Com lados ativos, o
runner cria um registro separado para cada prescrição lateral. Assimetria exige
bloco e, portanto, ativa apenas o modo avançado.

## RLS

Leitura segue o plano: profissional dono ou paciente vinculado. Criação e edição
da prescrição lateral são exclusivas do profissional dono. O registro continua
protegido pelas policies do log. Sem DELETE; arquivamento por `status`.

## Compatibilidade

Todas as colunas são nullable, não há backfill e logs antigos continuam legíveis.
Blocos sem lados permanecem inalterados.

## Evolução futura

Os identificadores e snapshots permitem calcular diferença absoluta, percentual
e evolução por lado ou membro afetado. O dashboard não será redesenhado nesta fase.

## Rollback operacional

Ocultar o editor lateral. Blocos sem linhas ativas continuam usando o fluxo
anterior; não remover dados já registrados.
