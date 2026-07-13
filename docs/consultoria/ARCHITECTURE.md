# ARCHITECTURE — Plataforma de Consultoria

Produto SaaS independente para consultoria de treino, performance, reabilitação,
fisioterapia e bem-estar. Vive **temporariamente** no repo do Fracta e deve poder
ser movido para repo próprio com o menor esforço possível.

## Isolamento (regra mais importante)

Fracta e Consultoria são produtos distintos. Só compartilham **infra técnica**
(Next.js, deploy, ambiente, cliente Supabase, componentes puramente visuais).

Nunca:
- adicionar código da Consultoria fora de `src/app/consultoria/` e `src/lib/fit/`;
- reutilizar/alterar tabelas, rotas, auth, dashboards ou lógica clínica do Fracta;
- importar de `components/fracta/*` ou de `src/lib/*` clínico.

## Estrutura

```
src/app/consultoria/     # rotas e telas (UI PT-BR)
  layout.tsx             # shell/identidade própria
  page.tsx               # entrada: roteia por sessão/papel
  login/                 # item 1 do MVP
src/lib/fit/             # domínio isolado
  supabase-fit.ts        # COSTURA ÚNICA com a infra Supabase
  fit-profiles.ts        # identidade
  types.ts               # contratos
docs/consultoria/        # docs migram junto com o produto
  sql/                   # migrations (aplicadas no SQL Editor)
```

## Costura com a infra

`src/lib/fit/supabase-fit.ts` é o **único** ponto de acoplamento com o Supabase:
reexporta o client existente (evita 2º GoTrueClient / `auth.uid()` instável).
Na migração para repo próprio, basta trocar esse arquivo por um `createClient`
local. Todo o resto do módulo `fit` importa apenas de `@/lib/fit/*`.

## Avaliação como documento (PDF futuro)

A avaliação é modelada como documento: `fit_assessments` (cabeçalho + `data jsonb`)
+ `fit_measurements` (blocos quantitativos). Essa separação já viabiliza gerar PDF
depois (compor um HTML→print a partir do snapshot da avaliação) **sem** reusar o
chassi de documento do Fracta — a Consultoria terá o seu próprio, isolado.

`fit_measurements` é o repositório central de TODAS as variáveis quantitativas do
paciente (antropometria, perimetria, performance, funcional, custom), não uma tabela
de antropometria. Isso deixa a plataforma pronta para corrida, crossfit, fisioterapia
e reabilitação sem refatoração estrutural.

## Métodos de treino e blocos (Fase 6)

Exercício passa a ter blocos de execução (`fit_exercise_blocks`) e registro do paciente
por bloco (`fit_training_log_block_entries`), preservando o modo simples. Detalhes e
racional em [ADR-FIT-001](adr/ADR-FIT-001-metodos-treino-blocos.md). Catálogo de métodos
e papel de cada bloco no gráfico vivem em `src/lib/fit/training-methods.ts`.

## Biblioteca e assimetria (Fase 14)

`fit_exercise_families` organiza movimentos-base e `fit_exercise_variations`
representa ativos técnicos específicos. `fit_workout_exercises.name` permanece
snapshot; `exercise_library_id` é a referência estável opcional. Favoritos são
relações em `fit_exercise_favorites`, sem duplicar o catálogo.

Prescrições diferentes por lado pertencem ao bloco em
`fit_exercise_block_sides`. Sem lados ativos, o bloco mantém o comportamento da
Fase 6. Com lados ativos, o runner registra uma entrada separada por lado, com
identificadores e snapshots. Ver [ADR-FIT-007](adr/ADR-FIT-007-biblioteca-exercicios-variacoes.md)
e [ADR-FIT-008](adr/ADR-FIT-008-prescricao-assimetrica.md).

## Evolução (camada de leitura)

`fit-evolution.ts` agrega as tabelas fit_* em séries para os gráficos (recharts),
sem SQL novo. Decisões:
- **Peso unificado na leitura:** funde `fit_measurements(weight_kg)` (avaliações) e
  `fit_checkins.weight_kg` (semanal) numa única série.
- **IMC derivado:** `peso / (altura_m)²`, com o último peso e a última altura de
  `fit_measurements`; nunca é persistido (sempre calculado).
- **Δ vs linha de base neutro:** a variação não assume melhora/piora por padrão — a
  leitura depende do objetivo. Valência (bom/ruim) só em métricas óbvias (dor, aderência).
- **Registros do paciente para o profissional:** a aba Evolução lê os `fit_training_*`
  e `fit_checkins` via RLS (`professional_id = auth.uid()`), sem policy nova.

## Auth

Auth própria (superfície separada), 2 papéis: `professional` e `patient`.
Guard client-side por layout (padrão do repo; sem middleware, o que também
simplifica a migração). Perfil criado de forma lazy e autenticada via
`ensureProfile()`, lendo `role`/`full_name` do `user_metadata` do signup.
