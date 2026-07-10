# PB-004 · Etapa 2 — Mapa de Missões do Fracta Care

> **Camada: Decisão — APROVADO em 10/07/2026** (convenção D6)
> Base: Auditoria Etapa 1 + Leitura Arquitetural (adendo D1–D6) · Aprovação: Wil,
> com os 5 ajustes deliberados aceitos e a regra 5 acrescentada na aprovação.
> Este documento responde uma única pergunta por tela: *que pergunta da família esta
> tela existe para responder?* Não trata de layout, componentes ou funcionalidades.
> Aprovado, torna-se a referência de todos os chats de revisão por tela.

---

## Regras do mapa

1. **Cada pergunta da família tem exatamente uma tela dona.** A dona é a fonte da
   resposta completa.
2. **A Home não é dona de nada.** Ela resume e direciona — todo card da Home é uma
   vitrine que aponta para a tela dona.
3. **Vitrine aponta para a dona.** Outras telas podem exibir um resumo de algo que não
   possuem, desde que levem à dona em um toque. Resumo não cresce: se precisar de mais
   profundidade, a profundidade nasce na dona.
4. **Telas-satélite herdam a missão da dona:** `/care/atividade` (execução) pertence a
   Atividades; `/avaliar` (reavaliação) pertence a Avaliação; `/convite/[codigo]`
   pertence a Meu Filho; `/captura/*` pertence ao funil de aquisição (fora deste mapa).
5. **Resumir nunca é possuir.** Uma tela pode resumir informações pertencentes a outra
   tela, mas nunca se tornar dona delas. A missão e a responsabilidade por cada
   informação permanecem sempre na tela definida por este mapa.

---

## O mapa

| Tela | Pergunta da família | Missão em uma linha |
|---|---|---|
| **Home** | "Como meu filho está hoje?" | Resumir o essencial do dia e direcionar para a ação certa. |
| **Atividades** | "O que posso fazer hoje com meu filho?" | Guiar a prática em casa e mostrar como ela está indo. |
| **Avaliação** | "Como acompanho o desenvolvimento?" | Medir, acompanhar e projetar o desenvolvimento da criança. |
| **Meu Filho** | "Quem é meu filho dentro do Fracta — e quem acompanha com a gente?" | Guardar a identidade da criança e gerir quem tem acesso a ela. |
| **Agenda** | "O que acontecerá nos próximos dias?" | Organizar os compromissos reais da criança no tempo. |
| **Guia Familiar** | "Como posso aprender a ajudá-lo?" | Ensinar os porquês — psicoeducação em linguagem de pais. |
| **Perfil** | "Como gerencio a minha conta?" | Cuidar do responsável: dados, notificações e segurança. |

---

## Fronteiras (quem é dono do quê)

**Home** — dona de: nada (regra 2). Vitrine de: estado do dia, próxima ação de prática
(→ Atividades), destaque de desenvolvimento (→ Avaliação). Não responde: nenhuma
pergunta em profundidade.

**Atividades** — dona de: programas ativos, execução e registro de sessões,
consistência/streak, progresso por programa, histórico de prática. Não responde:
desenvolvimento global da criança (radar) → Avaliação; quando praticar → Agenda.

**Avaliação** — dona de: radar e seu histórico, reavaliação adaptativa, triagem,
forecast (linguagem de pais), instrumentos enviados pelo terapeuta ("Do Terapeuta").
Não responde: documentos externos da criança (laudos) → Meu Filho; desempenho da
prática → Atividades.

**Meu Filho** — dona de: perfil da criança (nome, nascimento, diagnóstico,
observações), laudos e documentos externos, gestão de filhos (adicionar/trocar),
responsáveis com acesso e convites. Não responde: como a criança está se
desenvolvendo (radar/histórico/forecast) → Avaliação.

**Agenda** — dona de: compromissos reais (terapias, consultas, eventos manuais) e,
futuramente, sessões vindas do Clinic. Não responde: o que praticar → Atividades
(sugestão de prática não é compromisso).

**Guia Familiar** — dona de: trilhas e aulas de orientação parental, progresso de
aprendizado do responsável. Não responde: o que fazer agora com a criança → Atividades.

**Perfil** — dona de: dados do responsável, notificações, senha/segurança, sessão.
Não responde: nada sobre a criança ou sobre quem a acompanha → Meu Filho.

---

## Ajustes deliberados em relação ao rascunho original

1. **Laudos saem de Avaliação e passam a Meu Filho.** Laudo é documento externo sobre
   quem a criança é (dossiê), não medição feita pela família. Avaliação fica com o que
   mede e projeta; Meu Filho fica com o que documenta.
2. **"Minha família" sai de Perfil e fica em Meu Filho.** Co-responsáveis e convites
   são acesso *à criança* (o vínculo é por criança no modelo de dados). Perfil estreita
   para "minha conta"; Meu Filho ganha o segundo termo da pergunta ("…e quem acompanha
   com a gente?"). Evita criar nova sobreposição Perfil×Meu Filho.
3. **Forecast tem dona única: Avaliação.** Home exibe vitrine; Meu Filho deixa de
   exibi-lo.
4. **Radar e histórico têm dona única: Avaliação.** Home exibe vitrine; Meu Filho
   deixa de exibi-los.
5. **Sugestões de prática não pertencem à Agenda.** A Agenda responde "o que está
   marcado", não "o que praticar" — fronteira que resolve a poluição de itens
   sintéticos apontada na auditoria.

---

---

## Governança (a partir da aprovação)

- Todas as revisões de tela (Etapa 3 em diante) usam este mapa como referência —
  uma tela, uma decisão por chat.
- **Qualquer nova funcionalidade futura do Care deve declarar explicitamente qual
  missão deste mapa ela fortalece antes de ser incorporada ao produto.** Se não
  fortalece nenhuma, a discussão é sobre o mapa, não sobre a funcionalidade.

*PB-004 · Etapa 2 encerrada em 10/07/2026 com a aprovação deste documento.*
