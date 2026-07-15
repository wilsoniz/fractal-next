# ARCHITECTURE — POREA

POREA é um produto SaaS independente para consultoria de treino, performance, reabilitação,
fisioterapia e bem-estar. Vive **temporariamente** no repo do Fracta e deve poder
ser movido para repo próprio com o menor esforço possível.

POREA é a identidade pública. A rota `/consultoria`, o módulo `fit` e as tabelas
`fit_*` são identificadores técnicos estáveis e não representam a marca exibida.

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

## Estratégias com etapas internas (Fase 15)

Estratégias complexas usam a composição aditiva
`fit_exercise_blocks → fit_exercise_block_steps → fit_training_log_block_step_entries`.
O bloco identifica a estratégia aplicada; as etapas são o snapshot ordenado e
editável da prescrição; cada ocorrência executada gera uma entrada detalhada com
`occurrence_index`. Blocos antigos sem etapas continuam no runner da Fase 6.

O runner percorre etapas por bloco e lado. Etapas fixas exigem sua ocorrência;
etapas abertas permitem adicionar ocorrências até o limite configurado e exigem
encerramento explícito. `fit_training_log_block_entries` permanece como resumo para
a Evolução atual, sem substituir o detalhe. A persistência usa compensação segura:
se resumo ou detalhe falhar, o log recém-criado é arquivado, o formulário local é
preservado e a conclusão não é confirmada. Ver
[ADR-FIT-009](adr/ADR-FIT-009-estrategias-etapas-internas.md).

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

## Avaliação segmentada e assimetria (Fase 16)

`fit_measurements` continua sendo o repositório quantitativo único, agora com
contexto anatômico e lateral nullable. Cada lado é persistido separadamente. A
identidade técnica combina métrica, unidade, região, segmento, articulação, ponto,
protocolo, método, exercício de origem e contexto canônico; lado e papel clínico
são eixos de comparação.

`fit-segmented-measurements.ts` centraliza comparabilidade, diferença absoluta,
diferença relativa, índice afetado/não afetado e IMC temporal. Esses resultados
não criam novas medições. Séries globais filtram medições sem contexto segmentar,
preservando os gráficos anteriores. Ver
[ADR-FIT-010](adr/ADR-FIT-010-avaliacao-segmentada-assimetria-imc.md).

O IMC é resolvido por data de referência e retorna as fontes utilizadas. Avaliação,
comparativo e PDF usam `assessed_at`; a Evolução atual usa a data corrente. Valores
manuais antigos de `bmi` são legado e não alimentam o cálculo.

## Auth

Auth própria (superfície separada), 2 papéis: `professional` e `patient`.
Guard client-side por layout (padrão do repo; sem middleware, o que também
simplifica a migração). Perfil criado de forma lazy e autenticada via
`ensureProfile()`, lendo `role`/`full_name` do `user_metadata` do signup.
