# PB-004 · Etapa 4 — Revisão de Atividades

> **Camada: Decisão — APROVADO em 10/07/2026** (convenção D6)
> Referências: Auditoria (Etapa 1, §3.5–3.6), Mapa de Missões aprovado (Etapa 2),
> Revisão da Home (Etapa 3 — herda DEP-2).
> Aprovação: Wil — D-A1 a D-A6 integrais (D-A1 elevada a princípio); D-A7 e D-A9
> com redação ajustada na aprovação; D-A10 acrescentada na aprovação; D-A8 sem
> objeção registrada.
> Escopo: exclusivamente a tela Atividades e sua satélite `/care/atividade`
> (execução), que herda a missão (Regra 4 do mapa). Nada aqui altera outras telas
> nem o Mapa de Missões.

**Missão (mapa):** *"O que posso fazer hoje com meu filho?"* — guiar a prática em
casa e mostrar como ela está indo.

## Reenquadramento clínico (premissa desta revisão, registrada pelo Wil)

As atividades do Care **não são sugestões de rotina nem lista de tarefas**. São
**intervenções familiares estruturadas**: a principal forma pela qual o Care traduz
objetivos terapêuticos em ações concretas que a família consegue realizar
naturalmente no cotidiano (casa, alimentação, banho, brincadeira, escola, passeio).
Toda atividade tem finalidade clínica — ensinar nova habilidade, fortalecer
habilidade existente, promover generalização, ampliar autonomia, prevenir/reduzir
dificuldades, ensinar segurança, melhorar a qualidade das interações familiares.

Este reenquadramento **não altera o Mapa de Missões** — qualifica a leitura da linha
de Atividades: a pergunta operacional da revisão passa de "como organizar
atividades?" para **"como transformar objetivos terapêuticos em intervenções que uma
família aplica naturalmente no seu cotidiano?"**. É também uma afirmação de
identidade: o Care não é um app de "dicas para pais".

---

## 1. A tela cumpre sua missão?

**Na mecânica, sim — na semântica, ainda não.** A auditoria a apontou como a melhor
tela do Care, e o mérito se confirma: heatmap de consistência, execução guiada em 3
fases, registro por tentativa, histórico com humor e observações. A família consegue
*praticar*. O que a lente clínica expõe:

1. **A finalidade clínica é invisível.** As atividades se apresentam por domínio,
   tempo e nível ("Comunicação · 5 min · iniciante"). Em nenhum lugar a família vê
   *para que* aquela intervenção existe na vida do filho — embora o dado exista em
   parte (`objetivo` aparece só na fase de instrução da execução).
2. **A medida contradiz a intervenção.** Todo progresso é taxa de acerto (`acertos/5`),
   com "com ajuda" colapsado em não-acerto, meta universal de 80% e estado do
   programa sobrescrito pela última sessão. Para uma intervenção estruturada, isso
   mede a coisa errada, com o critério errado, na janela errada.
3. **Intervenções começam sem a família saber.** A satélite de execução cria um plano
   automaticamente (menor score do radar, nível iniciante) quando não encontra um —
   início silencioso de intervenção, incompatível com a premissa desta revisão.
4. **O cotidiano não existe como dimensão.** A premissa diz "banho, refeição,
   passeio"; o modelo da atividade não carrega contexto de aplicação.

## 2. O que já faz muito bem e deve ser preservado

- **Heatmap de consistência + streak** — é exatamente o reforço do comportamento que
  importa (a constância da família), honesto porque deriva de sessões reais.
- **Fluxo de execução em 3 fases** (instrução → prática → resultado), com objetivo,
  materiais, passos numerados e "dica importante" — a "estrutura" da intervenção
  estruturada já existe aqui.
- **Registro por tentativa com 3 estados** — "com ajuda" já é *capturado*
  corretamente; o problema está só na agregação (ver D-A3).
- **Humor da criança + observação livre** por sessão — contexto qualitativo que
  nenhuma métrica substitui e que enriquece a futura entrega ao terapeuta.
- **Progresso por programa** como conceito (anel + evolução por sessão) — a forma
  muda de eixo (ver D-A4/D-A5), o hábito de mostrar progresso por intervenção fica.

## 3. O que está fora da missão da tela

Quase nada — é a tela mais bem delimitada do Care. Registros:

- **Origem dos objetivos terapêuticos** (o que gera as recomendações de atividade):
  a fonte é a dona do desenvolvimento (Avaliação) e, futuramente, o terapeuta via
  Clinic. Atividades traduz e executa; não decide *de onde vêm* os objetivos →
  dependência (DEP-4).
- **Desenvolvimento global da criança** (radar): já corretamente ausente; o CTA do
  estado vazio apontando para Avaliação é vitrine legítima (Regra 3).

## 4. O que pertence à tela apenas como resumo (Regra 5)

- Nada de outras telas é exibido aqui hoje além do apontamento para Avaliação no
  estado vazio — correto.
- No sentido inverso, Atividades passa a **exportar** um resumo canônico para a Home
  (contrato da DEP-2), definido em D-A8.

## 5. Decisões propostas (para aprovação)

- **D-A1 — Toda atividade declara sua finalidade clínica.** Atividade no Care é
  intervenção familiar estruturada: carrega finalidade (ensinar / fortalecer /
  generalizar / autonomia / prevenção / segurança / qualidade de interação) e
  contexto de aplicação no cotidiano. A finalidade é visível para a família na
  tela — não só dentro da execução. **Atividade sem finalidade declarada não entra
  no catálogo** (espelho, em Atividades, da regra de governança do mapa).
  *Elevada a princípio do Care na aprovação (Wil):* **toda atividade existe para
  resolver um objetivo de desenvolvimento — não existe porque é divertida nem porque
  ocupa tempo; existe porque muda comportamento.**
- **D-A2 — A tela reforça o comportamento da família.** Hierarquia de informação:
  primeiro a consistência da prática (o que a família controla), depois o desempenho
  da criança (que é consequência). O alvo comportamental da tela Atividades é o
  responsável praticar com constância e qualidade.
- **D-A3 — "Com ajuda" é dado clínico, não erro.** Toda leitura de progresso
  distingue desempenho independente de desempenho com apoio; nenhuma agregação
  colapsa ajuda em não-acerto. Alinha o Care ao princípio "domínio = independência"
  na *narrativa*, sem importar a complexidade operacional do Clinic — pai e
  terapeuta passam a contar a mesma história sobre a mesma criança.
- **D-A4 — Progresso de prática é tendência, não último valor.** O estado de uma
  intervenção nunca é sobrescrito por uma única sessão; a leitura é por janela de
  sessões. Um dia ruim não apaga três semanas de avanço aos olhos da família.
- **D-A5 — O critério de progresso pertence à finalidade, não à tela.** A meta
  universal de 80% deixa de existir como conceito. Cada finalidade clínica define o
  que é "está funcionando" para as intervenções daquele tipo (com critérios default
  vindos do catálogo). *(Definição clínica dos critérios: trabalho de conteúdo,
  DEP-5.)*
- **D-A6 — Nenhuma intervenção inicia silenciosamente.** Início de programa é ato
  explícito da família: uma recomendação apresentada com o porquê (finalidade) e
  aceita antes de começar. A auto-criação de plano na execução deixa de existir como
  comportamento. *(Dá direção ao item correlato da trilha A2.)*
- **D-A7 — A tela Atividades reforça consistência e marcos significativos da
  jornada da família.** O **modelo atual baseado em pontos não atende adequadamente
  essa missão** e deverá ser revisto em momento oportuno. Nenhuma decisão sobre um
  novo modelo de reconhecimento faz parte desta etapa — a categoria "gamificação"
  permanece aberta (sequências de prática, autonomia conquistada, habilidades
  dominadas e desafios concluídos são caminhos possíveis futuros). *(Redação do
  Wil na aprovação, substituindo "descartar pontos".)* Enquanto isso: o mecanismo
  de reforço vigente é o que já é honesto (streak + heatmap); direção do A2
  "gamificação desconectada": os widgets de pontos **não** serão conectados —
  permanecem suspensos até a revisão do modelo de reconhecimento. *(Resolve a
  DEP-2a.)*
- **D-A8 — Contrato do resumo "prática de hoje" para a Home.** *(Resolve a DEP-2b.)*
  Atividades expõe, como fonte canônica: (a) há o que praticar hoje — próxima
  atividade com sua finalidade em uma linha; (b) estado do dia — praticou ou não +
  streak atual. A Home consome sem recalcular (regra "dashboards consomem
  indicadores").
- **D-A9 — O vocabulário do Care usa termos compreensíveis para famílias.**
  Conceitos internos do Clinic permanecem no Clinic; jargões ("score", "taxa",
  "sessão" como termo técnico) saem da superfície. **Termos que ajudem a família a
  organizar a jornada podem ser mantidos, desde que comunicados em linguagem
  acessível** — "Programa Alimentação" ou "Programa Comunicação" são compreensíveis
  e úteis; o problema é o jargão, não a palavra "programa". Termos exatos: decisão
  futura/implementação. *(Redação ajustada pelo Wil na aprovação.)*
- **D-A10 — Toda atividade é apresentada como oportunidade de desenvolvimento
  inserida na vida cotidiana da criança, nunca como exercício isolado.** A atividade
  sempre nasce de um contexto: não "treinar comunicação", mas "durante o lanche,
  criar oportunidades para que seu filho peça o que deseja"; não "treinar
  tolerância", mas "na hora de guardar os brinquedos, pratique esperar a vez". A
  intervenção acontece **na vida, não fora dela** — essência do Fracta Care.
  *(Acrescentada pelo Wil na aprovação; operacionaliza a dimensão "contexto de
  aplicação" da D-A1.)*

## 6. Dependências registradas (nada decidido aqui)

| # | Dependência | Decidida em |
|---|---|---|
| DEP-4 | Origem das recomendações: como objetivos terapêuticos (avaliação hoje; terapeuta/Clinic amanhã) geram recomendações de atividade — fonte dos objetivos e papel do motor | Chat Avaliação + trilha B (engine/integração) |
| DEP-5 | Catálogo de atividades com finalidade clínica e critérios por finalidade — trabalho de conteúdo clínico (mesma natureza do conteúdo do Guia Familiar) | Trilha de conteúdo (fora da revisão de telas) |
| DEP-6 | Mensagens pós-atividade hoje rotuladas "FractaEngine" (A2): passam a derivar da finalidade da atividade; o uso da marca "Engine" no Care é decisão transversal de nomenclatura | Decisão transversal de naming (com o Clinic) |
| DEP-2 | Herdada da Home — **resolvida** por D-A7 (gamificação) e D-A8 (resumo) | — |

---

*Decisões D-A1 a D-A10 aprovadas em 10/07/2026 — Etapa 4 (Atividades) encerrada.
Registro da aprovação (Wil): a principal descoberta desta revisão é de identidade —
"o diferencial do Fracta não está em ter atividades, mas em conseguir traduzir
objetivos terapêuticos em oportunidades naturais de desenvolvimento dentro da rotina
da família"; preservado esse princípio, o produto nasce da lógica clínica, não da
interface. Próxima tela da sequência: Avaliação — que entra com DEP-1 (resumo
canônico para a Home), DEP-4 (origem dos objetivos) e as decisões D3/D4 da Leitura
Arquitetural (triagem e avaliação adaptativa como ativos estratégicos).*
