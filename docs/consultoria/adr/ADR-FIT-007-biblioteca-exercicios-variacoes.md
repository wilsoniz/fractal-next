# ADR-FIT-007 — Biblioteca de Exercícios e Variações

- **Status:** Aceito
- **Data:** 2026-07-13
- **Escopo:** Plataforma de Consultoria (isolada do Fracta Behavior)
- **Fase:** 14

## Contexto

O builder registra nomes livres em `fit_workout_exercises.name`. Isso preserva
flexibilidade, mas exige redigitação e não oferece identidade estável para ativos
tecnicamente distintos.

## Decisão

Criar `fit_exercise_families` para o movimento-base e
`fit_exercise_variations` para o ativo específico. A variação estrutura
implementação, equipamento, marca/modelo, lateralidade e detalhes técnicos sem
exigir que campos futuros estejam preenchidos.

Itens globais têm `is_system=true` e são mantidos apenas por migrations. Itens
personalizados têm `professional_id=auth.uid()` e só podem ser vistos e alterados
pelo autor. `fit_exercise_favorites` representa preferência, sem duplicar o ativo.

`fit_workout_exercises.exercise_library_id` é nullable e referencia o ativo. O
campo `name` continua obrigatório como snapshot. Vídeo e instruções são copiados
somente na criação da prescrição.

Exercícios manuais continuam com `exercise_library_id=null`.

## RLS

- biblioteca global: leitura por profissionais;
- variações próprias: leitura, criação e atualização somente pelo autor;
- favoritos: leitura, criação e atualização somente pelo profissional;
- pacientes: nenhum acesso direto;
- sem DELETE físico.

## Compatibilidade

A migration é aditiva, sem backfill. Runner, grupos, blocos e treinos antigos
continuam funcionando. Arquivar um ativo não altera prescrições existentes.

## Carga inicial

Schema e seed são separados. O seed piloto é pequeno, idempotente, versionado e
não preenche classificações sem validação profissional.

## Consequências

A biblioteca reduz digitação e prepara análises por item, família e equipamento.
Em contrapartida, exige governança editorial e preservação rigorosa de snapshots.

## Alternativas rejeitadas

- catálogo plano sem famílias;
- substituir `name` por FK;
- tratar movimento-base e variação como equivalentes;
- permitir edição client-side do catálogo global;
- reutilizar entidades ou componentes clínicos do Fracta.

## Rollback operacional

Ocultar o picker e manter o exercício manual. Tabelas e coluna nullable permanecem
sem afetar o fluxo anterior; não há rollback destrutivo após uso real.
