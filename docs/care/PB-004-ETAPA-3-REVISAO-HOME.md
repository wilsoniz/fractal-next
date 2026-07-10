# PB-004 · Etapa 3 — Revisão da Home

> **Camada: Decisão — APROVADO em 10/07/2026** (convenção D6)
> Referências: Auditoria (Etapa 1, §3.4) e Mapa de Missões aprovado (Etapa 2).
> Escopo: exclusivamente a tela Home. Nada aqui altera outras telas nem o Mapa de
> Missões; o que pertence a outras telas está registrado como **dependência**.
> Aprovação: Wil — D-H2 a D-H6 integrais; D-H1 com redação ajustada na aprovação;
> D-H7 acrescentada na aprovação.

**Missão da Home (mapa):** *"Como meu filho está hoje?"* — resumir o essencial do dia
e direcionar para a ação certa. Regras aplicáveis: a Home **não é dona de nada** (R2);
toda vitrine aponta para a dona (R3); **resumir nunca é possuir** (R5).

---

## 1. A Home cumpre sua missão?

**Parcialmente.** A estrutura está certa — ela já nasceu agregadora (cards que resumem
e direcionam), que é exatamente o que o mapa pede. O desvio não é de formato, é de
conteúdo, em três frentes:

1. **Mistura "hoje" com "desde o início"** — dois dos três cards de estatística
   respondem histórico ("Atividades realizadas desde o início", "Média geral"), não o
   dia da criança.
2. **Mistura resumo com profundidade** — o card de Forecast é o forecast *completo*
   (estimativa em semanas, top-3 domínios, adesão, frase motivacional): é a resposta
   da dona (Avaliação), não uma vitrine dela.
3. **Mistura dado real com conteúdo sintético** — "Próxima atividade: Hoje" é texto
   fixo; sem planos ativos, o card lista 3 atividades fictícias com links inválidos;
   o selo "X novas" tem fallback fixo "3".

## 2. O que já faz muito bem e deve ser preservado

- **Os dois CTAs no topo** ("Registrar atividade de hoje" / "Avaliar") — são a metade
  "direcionar para a ação certa" da missão, já resolvida.
- **A personalização do dia**: saudação por hora, nome do responsável, "Painel de
  {criança}" — o tom certo para a primeira tela da manhã.
- **O radar como resumo visual** do desenvolvimento — como vitrine, é a resposta
  perfeita ao "como meu filho está" em um olhar.
- **O padrão de cards-que-linkam** e o recarregamento ao voltar à aba — a mecânica de
  agregadora já existe.

## 3. O que está fora da missão da Home

| Conteúdo atual | Por quê está fora | Dona (mapa) |
|---|---|---|
| Forecast completo (estimativa, top-3, adesão, motivação) | Profundidade, não resumo (viola R5) | Avaliação |
| "Atividades realizadas desde o início" | Histórico de prática, não "hoje" | Atividades |
| "Média geral" (média aritmética dos 8 domínios) | Métrica de desenvolvimento; além disso duplica o que o radar já resume | Avaliação |
| Widget de gamificação | Consistência/celebração da prática; hoje sempre zerado (A2) | Atividades |
| Mensagem "FractaEngine" (template sobre o menor score) | Insight de desenvolvimento; conteúdo classificado como A2 | Avaliação |
| **Cálculo próprio de scores (70% avaliação + 30% planos)** | A Home *produz* uma métrica que nenhuma dona possui — resumir nunca é possuir; a Home deve exibir a verdade da dona, não uma versão própria dela | Avaliação |
| Lista de até 6 planos com links individuais | No volume atual é a tela Atividades embutida, não uma vitrine dela | Atividades |
| Conteúdo sintético (atividades default, "Hoje" fixo, "3 novas") | A Home nunca inventa resposta para a pergunta da família | — (ver D-H4) |

## 4. O que pertence à Home apenas como resumo (Regra 5)

A Home responde "como meu filho está hoje?" com **três vitrines + a ação**:

1. **Estado** — radar em versão resumo (vitrine de Avaliação), apontando para
   Avaliação. *Hoje o link "Ver evolução →" aponta para Meu Filho — destino errado
   segundo o mapa; correção interna da Home.*
2. **Orientação** — uma linha de insight/projeção (vitrine de Avaliação), no formato
   que a dona definir, apontando para Avaliação.
3. **Prática de hoje** — o que há para praticar hoje e/ou o que já foi feito hoje
   (vitrine de Atividades), apontando para Atividades — resumo, não lista completa.
4. **Ação** — os dois CTAs existentes (já corretos).

Nada além disso pertence à Home. Candidata futura (registrada, **não proposta aqui**):
vitrine de "próximo compromisso" (dona: Agenda) — só se o chat da Agenda decidir
oferecê-la.

## 5. Decisões propostas (para aprovação)

- **D-H1 — A Home responde ao estado atual da criança; toda contextualização
  histórica pertence às telas donas.** A Home não mostra evolução, tendência nem
  séries históricas — mas pode mostrar o estado atual *calculado pelas donas*,
  inclusive quando esse estado carrega contexto ("Comunicação está evoluindo bem"),
  sem exibir o gráfico. Preserva a capacidade de orientar sem transformar a Home em
  tela de evolução. Métricas históricas atuais ("desde o início", "média geral")
  saem da Home.
- **D-H2 — Toda vitrine aponta para a dona correta.** Radar → Avaliação (corrige o
  destino atual para Meu Filho); prática → Atividades.
- **D-H3 — Profundidade não mora na Home.** O forecast completo sai; permanece apenas
  a vitrine de orientação em uma linha (formato a ser definido pela dona, Avaliação).
- **D-H4 — A Home nunca exibe conteúdo sintético.** Sem atividades fictícias, sem
  "Hoje" fixo, sem contadores de fallback. Estado vazio é honesto e direciona para a
  ação da dona ("fazer avaliação" / "ver atividades"). *Isto dá a direção do item A2
  "atividades default": a correção é remover o conteúdo sintético, não consertar os
  links.*
- **D-H5 — A Home não produz métricas próprias.** O blend 70/30 deixa de ser calculado
  na Home; a Home exibe o resumo canônico que a dona (Avaliação) definir. Se o
  conceito de "radar vivo" for valioso, quem o adota é a dona.
  *Generalização registrada na aprovação (Wil), como regra arquitetural do Fracta
  inteiro, válida também para o Clinic:* **"Dashboards consomem indicadores.
  Não produzem indicadores."**
- **D-H6 — Gamificação e mensagem do Engine ficam suspensas na Home** até a decisão
  das donas (dependências abaixo). Nenhuma das duas é removida do produto por esta
  revisão — apenas deixam de ocupar a Home enquanto seu papel não for decidido.
- **D-H7 — Toda informação apresentada na Home deve apoiar uma decisão imediata da
  família.** A Home não exibe informações apenas por interesse ou completude; cada
  card deve responder à pergunta *"o que a família faz com isso agora?"* —
  radar → entender; próxima atividade → agir; compromisso → preparar;
  orientação → orientar. Jamais estatística pela estatística, gráfico pela estética
  ou informação curiosa. *(Acrescentada pelo Wil na aprovação.)*

## 6. Dependências registradas (nada decidido aqui)

| # | Dependência | Decidida em |
|---|---|---|
| DEP-1 | Formato canônico do resumo de desenvolvimento + linha de orientação que a Home consome (inclui o destino do conceito "radar vivo" 70/30 e o conteúdo A2 "mensagens do Engine") | Chat Avaliação |
| DEP-2 | Papel da gamificação no Care (A2) e formato do resumo "prática de hoje" | Chat Atividades |
| DEP-3 | Existência de uma vitrine "próximo compromisso" para a Home | Chat Agenda |
| DEP-4 | Itens A1 já encaminhados para a Clinical Milestone de bugs (não passam por aqui) | CM de bugs |

---

*Decisões D-H1 a D-H7 aprovadas em 10/07/2026 — Etapa 3 (Home) encerrada. Próxima
tela da sequência: Atividades (herda DEP-2 desta revisão).*
