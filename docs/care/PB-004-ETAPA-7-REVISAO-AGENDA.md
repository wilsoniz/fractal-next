# PB-004 · Etapa 7 — Revisão da Agenda

> **Camada: Decisão — APROVADO em 10/07/2026** (convenção D6)
> Aprovação: Wil — D-AG1 a D-AG5 integrais, sem alterações.
> Referências: Auditoria (Etapa 1, §3.8), Mapa de Missões
> (Etapa 2) e decisões das Etapas 3–6. Modo: **prático** (definido pelo Wil) — a
> arquitetura do Care já está definida; esta revisão pergunta "a tela cumpre sua
> função?", não "o que ela significa?". Nenhum conceito novo é criado aqui.
> Escopo: exclusivamente a tela Agenda.

**Missão (mapa):** *"O que acontecerá nos próximos dias?"* — organizar os
compromissos reais da criança no tempo e preparar a agenda terapêutica quando ela
existir. Fronteira já traçada: **sugestão de prática não é compromisso** (→
Atividades).

---

## 1. A Agenda cumpre sua missão?

**Como ferramenta, sim; como agenda da família, ainda não — por dois motivos
práticos.**

A mecânica funciona: criar compromisso manual, ver por lista ou semana, filtrar por
tipo, marcar como realizado. O que impede a missão:

1. **O conteúdo real é soterrado pelo sintético.** A tela injeta até 14 sugestões de
   atividade por semana (2 planos × 7 dias, todas às 9h) mais um placeholder fixo de
   "Sessão com terapeuta" daqui a 7 dias. Os poucos compromissos reais do pai — a
   razão de ser da tela — se perdem no meio de itens que ninguém marcou.
2. **A tela não existe no celular.** A tab bar mobile omite a Agenda (auditoria,
   §3.3). Para o público mobile-first do Care, uma agenda inacessível no celular não
   cumpre missão nenhuma.

## 2. O que já funciona muito bem e deve permanecer

- **O modelo de 3 tipos de evento** (sessão clínica / atividade / compromisso
  externo) com filtros — é exatamente o desenho que a integração com o Clinic vai
  preencher.
- **A criação manual de compromisso** — bottom-sheet mobile bem resolvido, campos
  certos (título, data, hora, duração, observação).
- **Marcar como realizado** — simples e suficiente.
- **A lista cronológica agrupada por dia** ("Hoje", "Amanhã") e a **visão semanal**
  com navegação — as duas visualizações se complementam.

## 3. O que não pertence à Agenda

- **Sugestões automáticas de prática** — já decidido pelo mapa (fronteiras) e pela
  revisão de Atividades: sugerir o que praticar é missão de Atividades; a Agenda
  registra o que está *marcado*.
- **Placeholder fixo de sessão clínica** — conteúdo sintético; o encaixe da
  integração permanece, o evento inventado não.
- Nada mais: com esses dois itens removidos, todo o restante da tela pertence à
  missão.

## 4. Decisões propostas (para aprovação)

- **D-AG1 — A Agenda exibe apenas compromissos reais.** As sugestões sintéticas de
  atividade e o placeholder de sessão clínica saem. Estado vazio honesto, com o
  caminho para criar um compromisso (mesma filosofia da D-H4, aplicada — não é
  princípio novo).
- **D-AG2 — Prática agendada é compromisso; prática sugerida não é.** O tipo
  `atividade` permanece no modelo e continua disponível na criação manual: quando a
  família *marca* um horário para praticar, isso é um compromisso real da Agenda.
  O que não entra é a sugestão automática — a fronteira com Atividades fica
  operacional.
- **D-AG3 — `sessao_clinica` é o encaixe reservado da integração Clinic.** O tipo
  permanece no modelo e nos filtros, vazio até o vínculo com terapeuta existir —
  quando as sessões reais do Clinic passarem a preencher a agenda terapêutica, a
  tela já está pronta para recebê-las (trilha B; nada a desenhar aqui).
- **D-AG4 — Contrato da vitrine "próximo compromisso" para a Home** *(resolve a
  DEP-3)*. A Agenda passa a exportar: o próximo evento real (o quê, quando, tipo),
  consumido pela Home sem recálculo. Sem evento futuro, a Home não mostra nada —
  nunca um placeholder. A vitrine passa no critério de admissão da Home
  (D-H7: "preparar").
- **D-AG5 — A Agenda precisa ser alcançável no celular.** Registro do problema real:
  a missão é incompatível com uma tela ausente da navegação mobile. A *forma* de
  resolver (reorganização da tab bar, atalho, agrupamento) é implementação — a
  decisão aqui é apenas que o acesso mobile é requisito da missão.

## 5. Dependências

| # | Dependência | Onde |
|---|---|---|
| — | Preenchimento da agenda terapêutica com sessões reais do Clinic (D-AG3) | Integração Clinic↔Care (trilha B) |
| — | Reorganização da navegação mobile (D-AG5) | Implementação (transversal ao layout) |

---

*Decisões D-AG1 a D-AG5 aprovadas integralmente em 10/07/2026 — Etapa 7 (Agenda)
encerrada. Próxima: Guia Familiar — produto não iniciado (D2), arquitetura
editorial aprovada, revisão em modo prático.*
