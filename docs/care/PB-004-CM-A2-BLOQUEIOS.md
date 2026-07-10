# PB-004 · CM-A2 — Registro de Bloqueios e Encerramento

> **Camada: Implementação** (convenção D6) · 10/07/2026
> Itens do CM-A2 que **não são implementáveis sem uma decisão/conteúdo ainda não
> especificado** nos documentos aprovados. Conforme o protocolo desta fase, ficam
> registrados como bloqueio — **não resolvidos por interpretação própria**.

## STATUS: CM-A2 CONCLUÍDO (10/07/2026)

**Entregas implementadas (verificadas, no `main`):**
- CM-A1 — correções independentes (reset de senha, controles decorativos, estados
  vazios honestos, órfãs).
- Forecast → Avaliação; Home enxuta (estado atual, sem blend, radar→Avaliação).
- Radar/histórico/contadores fora de Meu Filho; custódia de laudos → Meu Filho.
- Guia Familiar: nome único; sem progresso fictício; **indicadores/barras de
  progresso removidos** (sem persistência real — D-GF3 + "nenhuma interface
  decorativa"); trilhas e aulas preservadas, sem modelo provisório de progresso.

**Pendências que saem com o CM-A2 (não resolvidas — corretas):**
- **BLQ-1, BLQ-2, BLQ-3**: bloqueados por conteúdo/decisão (ver abaixo). Próximo bloco
  pequeno = conteúdo clínico + contratos que destravam esses três.
- **D-AG4** (export "próximo compromisso" p/ Home): **adiada** — a Home não tem vitrine
  aprovada para consumi-lo; export sem consumidor seria código morto.
- **D-A2** (Atividades: consistência primeiro): **vinculada ao desbloqueio do BLQ-2** —
  entra junto com o modelo de métricas e o catálogo.

## Implementado no CM-A2 (realocação de propriedade — totalmente especificado)

- Forecast → Avaliação (D-AV5); removido de Home (D-H3) e Meu Filho (D-MF4-forecast).
  ✅ verificado: `FractaForecastCard` só na Avaliação.
- Home responde ao estado atual: stats históricos removidos (D-H1); blend 70/30
  removido, radar consome o snapshot canônico (D-H5); link do radar → Avaliação (D-H2).
- Meu Filho: radar/histórico/contadores derivados removidos (D-MF4); deixou de
  carregar `radar_snapshots`/`sessoes` (só carrega o que é seu).
- Laudos: custódia → Meu Filho (D-AV8/D-MF5). ✅ verificado: cadastro só em Meu Filho;
  Bloco 3 e state/funções de laudo removidos da Avaliação.

### Não implementado nesta leva (fora de "realocação de propriedade")
- **D-AG4** (Agenda exporta "próximo compromisso" p/ Home): a vitrine correspondente
  na Home é "candidata futura, não proposta" (Revisão da Home §4). Sem consumidor
  aprovado, o export seria código morto — **não** implementado. Não é bloqueio; aguarda
  aprovação da vitrine na Home.
- **D-GF2/D-GF3** (Guia: nome único + sem progresso fictício) e **D-A2** (Atividades:
  consistência primeiro): não são realocação de propriedade; ficam para bloco próprio
  do CM-A2 conforme o escopo "apenas Grupo 1" desta leva.

## Bloqueios (aguardam decisão ou conteúdo)

### BLQ-1 — Linha de orientação da Home / leitura canônica exportada
- **Decisões:** D-H3 (vitrine de orientação em 1 linha) e D-AV6 (Avaliação exporta a
  leitura + linha de orientação para a Home).
- **Motivo do bloqueio:** o próprio D-H3 diz *"formato a ser definido pela dona
  (Avaliação)"*; o conteúdo da linha (que hoje as "mensagens do Engine" improvisavam)
  depende de DEP-8 (textos interpretativos) e o rótulo depende de DEP-6 (naming
  "Engine"). Implementar exigiria definir formato/conteúdo → interpretação própria.
- **Efeito atual:** a Home fica sem a vitrine de orientação (estado honesto, D-H4). A
  vitrine de estado (radar) permanece.

### BLQ-2 — Métricas de progresso de Atividades
- **Decisões:** D-A3 ("com ajuda" ≠ erro nas agregações), D-A4 (progresso é
  tendência, não última sessão), D-A5 (critério pertence à finalidade; fim da meta
  universal de 80%).
- **Motivo do bloqueio:** hoje o progresso é `taxa = acertos/5` e a meta 80% está
  cravada na UI (anel, barra). A métrica substituta (como distinguir independente de
  apoiado; que janela de tendência; que critério por finalidade) **não está
  especificada** e depende de DEP-5 (catálogo com finalidades e critérios). Definir a
  métrica seria interpretação própria.
- **Efeito atual:** Atividades permanece como está no CM-A1. A reordenação "consistência
  primeiro" (D-A2) é a única parte não bloqueada, mas foi mantida fora deste CM por
  coerência (a tela será retrabalhada junto ao catálogo).

### BLQ-3 — Reenquadramento textual da triagem
- **Decisão:** D-AV4 (resultados por comportamentos a investigar, nunca categorias
  nosológicas; enquadramento "isto não é diagnóstico").
- **Motivo do bloqueio:** remover os selos "TEA/TDAH: Atenção" exige o **texto
  substituto** (mapa de comportamentos/áreas a investigar + enquadramento), que é
  DEP-8 (conteúdo clínico). Reescrever o texto seria interpretação própria de
  conteúdo clínico.
- **Efeito atual:** a triagem permanece como está; o reenquadramento entra com o
  conteúdo (trilha DEP-8).

### BLQ-4 — (micro) Contador de laudos em Meu Filho
- **Decisão:** D-MF4 ("contadores derivados saem").
- **Situação:** os contadores Sessões e Avaliações são leituras (saem, claro). O
  contador de **laudos** é contagem de registros em custódia — ambíguo entre "contador
  derivado" e "informação de registro".
- **Resolução aplicada (faithful, não interpretativa):** o grid dos 3 contadores é uma
  unidade de UI; removê-lo inteiro cumpre D-MF4 literalmente e **não perde informação**
  (os laudos seguem listados na seção de laudos logo abaixo). Registrado para
  visibilidade; reversível se o Wil quiser manter a contagem de documentos.

---

*Estes bloqueios serão desbloqueados por: DEP-5 e DEP-8 (trilha de conteúdo clínico),
DEP-6 (naming transversal). Nenhum é dívida de código — são dependências de decisão/
conteúdo já previstas na PB-004.*
