# PB-004 · Etapa 5 — Revisão da Avaliação

> **Camada: Decisão — APROVADO em 10/07/2026** (convenção D6)
> Referências: Auditoria (Etapa 1, §3.7), Mapa de Missões (Etapa 2), decisões D3/D4
> da Leitura Arquitetural, Revisão da Home (herda DEP-1) e Revisão de Atividades
> (herda DEP-4).
> Aprovação: Wil — D-AV1 a D-AV6 e D-AV8 integrais (D-AV1 elevada a princípio do
> Fracta); D-AV7 com redação ajustada na aprovação; D-AV9 acrescentada na aprovação.
> Escopo: exclusivamente a tela Avaliação e sua satélite `/avaliar` (reavaliação
> adaptativa). Nada aqui altera outras telas nem o Mapa de Missões.

**Missão (mapa):** *"Como acompanho o desenvolvimento?"* — medir, acompanhar e
projetar o desenvolvimento da criança.

## Princípio desta revisão (registrado pelo Wil)

**A Avaliação do Care não existe para produzir diagnósticos. Existe para produzir
compreensão compartilhada do desenvolvimento da criança.** Não é teste, não é laudo,
não é parecer. É o instrumento pelo qual a família compreende e acompanha o
desenvolvimento, o terapeuta recebe uma linha de base organizada quando houver
vínculo, e o Marketplace conecta com informação útil. Se for percebida como "teste
que dá diagnóstico", perde-se parte essencial da proposta; se for percebida como
ferramenta de entendimento e participação, torna-se um dos maiores diferenciais do
ecossistema.

---

## 0. Pergunta zero — qual é a unidade de trabalho da Avaliação?

**Hipótese do Wil: a evidência de desenvolvimento. Validada — com um refinamento
estrutural.**

A validação: nada do que a tela exibe é primário. O radar deriva das respostas da
família; o histórico deriva de radares no tempo; o forecast deriva do histórico; a
triagem deriva de respostas; as recomendações de atividade derivam de tudo isso.
O que *entra* no sistema é sempre a mesma coisa: **uma observação situada sobre a
criança — quem observou, quando, em que contexto, o quê**. Isso é a evidência de
desenvolvimento, e o código confirma: as respostas brutas já são persistidas
separadas dos scores (`avaliacoes.respostas` vs. `radar_snapshots`) — a distinção
existe no banco; falta existir no produto.

O refinamento: se a evidência é a unidade, então tudo o mais na tela pertence a uma
segunda categoria — **leituras**. A Avaliação trabalha com exatamente dois objetos:

| Objeto | O que é | Exemplos |
|---|---|---|
| **Evidência** | Observação situada (fonte + data + contexto + conteúdo) | Respostas da reavaliação adaptativa; respostas da triagem; futuramente instrumentos do terapeuta; evidências de prática (vindas de Atividades); laudos como evidência *externa* |
| **Leitura** | Interpretação derivada de evidências | Radar (leitura de estado), histórico (leitura no tempo), forecast (leitura projetiva), resultado da triagem (leitura de rastreio), recomendações (leitura acionável) |

Duas consequências que organizam todas as decisões abaixo:

1. **Leitura nunca vira evidência** — uma interpretação não realimenta o sistema
   como se fosse observação (é a versão, dentro da Avaliação, de "dashboards
   consomem indicadores").
2. **Toda leitura declara de quais evidências deriva e de quando** — sem fonte e
   data, uma leitura é um veredicto; com fonte e data, é compreensão.

Nota de fronteira: o laudo é evidência **externa** — a *custódia* do documento é de
Meu Filho (mapa); o *uso* como fonte de leitura é da Avaliação. Usar não é possuir
(Regra 5).

## 1. A tela cumpre sua missão?

**O motor cumpre; a tela ainda não.** A separação importa:

- A satélite `/avaliar` é o coração técnico confirmado (D4): perguntas por idade em
  meses, gatilhos de aprofundamento, escalas com exemplos concretos em linguagem de
  pais. **Mede muito bem.**
- A tela, porém, se organiza por **instrumentos** (Bloco 1: radar; Bloco 2: triagem;
  Bloco 3: laudos; Bloco 4: terapeuta) e não por **compreensão**. A família vê
  ferramentas numeradas, não entendimento: uma média "62" sem significado, um delta
  "+3" sem interpretação, um radar "comparado ao esperado para a idade" sem uma
  frase que diga o que fazer com isso.
- Os sinais de "teste que dá resultado" estão presentes: selos por categoria
  diagnóstica na triagem (TEA, TDAH com "Atenção"), porcentagens em tudo, nenhum
  texto de enquadramento.
- E a dona não exibe o que possui: o forecast — que o mapa atribui à Avaliação —
  hoje aparece na Home e em Meu Filho, mas não aqui.

## 2. O que já faz muito bem e deve ser preservado

- **O motor adaptativo inteiro** (banco de perguntas, faixas etárias, gatilhos,
  exemplos, pesos) — ativo estratégico (D4); extração para lib segue na trilha B.
- **O ritual leve da reavaliação**: confirmação → ~3 minutos → resultado imediato.
- **Histórico de snapshots com deltas** — a mecânica de "acompanhar no tempo" existe.
- **A triagem como instrumento** — as perguntas e os gatilhos têm valor clínico;
  o que muda é exclusivamente a comunicação (D3).
- **O bloco "Do Terapeuta" como placeholder honesto** — é o encaixe declarado da
  integração e do papel de "linha de base para o vínculo".

## 3. O que está fora da missão da tela

- **Laudos (gestão/cadastro)** → Meu Filho, conforme o mapa. A Avaliação passa a
  apenas *usar* laudos como fonte externa de leitura quando existirem. Como Meu
  Filho os recebe: dependência (DEP-7).
- Nada mais — com os laudos realocados, os quatro blocos restantes pertencem todos
  à missão.

## 4. O que pertence à tela apenas como resumo (Regra 5)

- Hoje, nada de outras telas é exibido aqui — correto.
- No sentido inverso, a Avaliação passa a **exportar** a leitura canônica de estado
  que a Home consome (contrato em D-AV6, resolvendo a DEP-1).

## 5. Decisões propostas (para aprovação)

- **D-AV1 — A unidade de trabalho da Avaliação é a evidência de desenvolvimento.**
  Evidência = observação situada (fonte, data, contexto, conteúdo). Tudo o mais que
  a tela exibe é **leitura** derivada de evidências. Valida a pergunta zero, com o
  refinamento evidência/leitura da seção 0.
  *Elevada a princípio do Fracta na aprovação (Wil):* **"Evidências são os fatos.
  Leituras são interpretações dos fatos."** — separação alinhada à filosofia
  científica de todo o ecossistema.
- **D-AV2 — Toda leitura declara suas fontes e sua data; leitura nunca realimenta
  evidência.** "Baseado nas suas respostas de 12/06" em vez de um número solto.
  Consequência direta: o "radar vivo" (blend 70/30) **morre como cálculo escondido**
  (complemento, do lado da dona, à D-H5). Se evidências de prática vierem a compor a
  leitura de estado, entram como fonte declarada e visível — a composição exata é
  calibração clínica de implementação.
- **D-AV3 — A Avaliação produz compreensão, não veredicto.** Nenhum número aparece
  sem significado em linguagem de pais, e nenhuma leitura termina sem apontar uma
  ação possível (praticar, reavaliar, investigar com um profissional). É o análogo,
  nesta tela, da D-H7: cada informação responde "o que a família faz com isso?".
- **D-AV4 — Reenquadramento de linguagem da triagem** *(executa a D3; o instrumento
  permanece intocado)*. Resultados comunicados por **comportamentos e áreas de
  desenvolvimento que merecem investigação**, nunca por categorias nosológicas com
  selos de alerta. O convite é sempre "vale investigar com um profissional", jamais
  afirmação ou sugestão de diagnóstico. Texto de enquadramento ("isto não é
  diagnóstico") presente no início e no resultado.
- **D-AV5 — O forecast mora na Avaliação, somente na voz de pais.** A dona passa a
  exibir sua leitura projetiva; a voz `clinic` do motor (ação recomendada, resumo
  clínico) não aparece em nenhuma tela de família — fica reservada ao futuro vínculo
  com terapeuta. Estimativas são sempre possibilidade condicionada à prática
  ("mantendo as atividades..."), nunca promessa.
- **D-AV6 — Contrato da leitura canônica para a Home** *(resolve a DEP-1)*. A
  Avaliação exporta: (a) estado atual em linguagem de pais (a leitura que o radar
  resume), com data/fonte; (b) uma linha de orientação derivada da leitura (o
  conteúdo que hoje as "mensagens do Engine" improvisam — direção do A2
  correspondente: a mensagem passa a derivar da leitura de evidências; o rótulo
  "Engine" segue pendente em DEP-6). A Home consome sem recalcular.
- **D-AV7 — A Avaliação é a fonte das necessidades de desenvolvimento. Os objetivos
  terapêuticos são derivados dessas necessidades, respeitando o contexto clínico e,
  quando houver, o planejamento do terapeuta.** *(Redação do Wil na aprovação;
  resolve a parte de produto da DEP-4.)* A Avaliação não cria objetivos — **revela
  necessidades**; quem cria objetivos é o planejamento (no Clinic, o PEI; no Care,
  camada ainda não explícita). A distinção evita que o Care pareça prescrever
  intervenção sozinho. Quando houver terapeuta vinculado, os instrumentos e o
  planejamento do terapeuta tornam-se fonte prioritária. O motor de recomendação em
  si é trilha B.
- **D-AV8 — Laudos saem da gestão da Avaliação** *(executa a fronteira do mapa)*.
  Custódia em Meu Filho; a Avaliação referencia laudo apenas como fonte externa de
  evidência em suas leituras.
- **D-AV9 — Toda evidência deve preservar seu contexto de observação.** Evidências
  nunca são interpretadas isoladamente de quem observou, quando foram produzidas e
  em qual situação ocorreram. "Pediu água" só significa algo sabendo quando, com
  quem, em qual contexto, se espontaneamente ou após ajuda, durante qual atividade.
  *(Acrescentada pelo Wil na aprovação; consequência direta da D-AV1 e coerente com
  a D-A10 — o contexto que a intervenção carrega é o mesmo que a evidência
  preserva.)*

## 6. Dependências registradas (nada decidido aqui)

| # | Dependência | Decidida em |
|---|---|---|
| DEP-7 | Como Meu Filho recebe a custódia dos laudos (forma de cadastro/exibição no dossiê) | Chat Meu Filho |
| DEP-8 | Textos interpretativos das leituras (significados em linguagem de pais, enquadramento da triagem) — calibração clínica de conteúdo | Trilha de conteúdo (junto com DEP-5) |
| DEP-6 | Uso da marca "Engine" no Care (rotulagem da linha de orientação) | Naming transversal (já registrada) |
| B | Extração do motor adaptativo para lib (D4); motor de recomendação; verificação de RLS/policies de `triagens`/`avaliacoes` | Trilha de arquitetura |

---

## Registro da aprovação — o ciclo conceitual do Fracta

Na aprovação, o Wil consolidou a sequência descoberta nesta revisão — com a inserção
de "Necessidades" decorrente da D-AV7 — como candidata a **arquitetura conceitual de
todo o ecossistema Fracta** (Care, Clinic, Engine, Marketplace):

```
Evidências → Leituras → Necessidades → Objetivos → Intervenções → Novas Evidências
```

Primeiro compreende-se a realidade (evidências e leituras), depois identificam-se
necessidades, então definem-se objetivos, planejam-se intervenções e coletam-se
novas evidências, reiniciando o ciclo. A sequência respeita a lógica clínica e
conecta as decisões desta revisão (D-AV1/D-AV2/D-AV7/D-AV9) às de Atividades
(D-A1/D-A10): a Avaliação habita as três primeiras estações do ciclo; Atividades,
as intervenções; a prática devolve novas evidências.

---

*Decisões D-AV1 a D-AV9 aprovadas em 10/07/2026 — Etapa 5 (Avaliação) encerrada.
Próxima tela da sequência: Meu Filho — que entra com DEP-7 (custódia dos laudos) e
com as decisões do mapa que a redefinem (identidade + acesso, sem
radar/forecast/histórico).*
