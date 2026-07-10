# PB-004 · Etapa 6 — Revisão de Meu Filho

> **Camada: Decisão — APROVADO em 10/07/2026** (convenção D6)
> Referências: Auditoria (Etapa 1, §3.9), Mapa de Missões (Etapa 2), Revisão da
> Avaliação (herda DEP-7) e o vocabulário arquitetural consolidado
> (identidade/estado, registro/leitura, custódia≠uso).
> Escopo: exclusivamente a tela Meu Filho e sua satélite `/care/convite/[codigo]`.
> Aprovação: Wil — D-MF1/D-MF2 formuladas por ele antes da revisão; D-MF3
> generalizada e elevada a princípio na aprovação; D-MF5 ampliada na aprovação;
> D-MF4, D-MF6 e D-MF7 integrais; D-MF8 acrescentada na aprovação.

**Missão (mapa):** *"Quem é meu filho dentro do Fracta — e quem acompanha com a
gente?"* — guardar a identidade da criança e gerir quem tem acesso a ela.

## Premissa conceitual desta revisão (consolidada pelo Wil)

**Identidade responde "Quem é?". Estado responde "Como está?"** — distinção válida
para qualquer entidade do ecossistema (criança: identidade vs. avaliação; terapeuta:
perfil vs. indicadores; programa: definição vs. execução). Identidade muda por
eventos da vida; estado muda por observação. E o refinamento importante: **a
identidade não é *produzida* pelas evidências de desenvolvimento** do ciclo do Care
— ela pode derivar de evidências *externas* (um diagnóstico nasce de evidências
produzidas por um profissional), mas nunca das leituras internas do Care.

Meu Filho é a tela do "Quem é?". Sua unidade de trabalho é o **registro**: o fato
documentável com origem conhecida.

---

## 1. A tela cumpre sua missão?

**A metade que é dela, cumpre bem; a outra metade não é dela.** A auditoria já havia
nomeado o problema ("tela acumuladora") e o vocabulário agora o explica: Meu Filho
mistura **registro** (perfil, filhos, laudos, responsáveis, convites — tudo missão
dela, tudo razoavelmente maduro) com **leitura importada** (evolução do radar,
histórico de snapshots, forecast completo — inclusive na voz `clinic`, com "ação
recomendada" e "resumo clínico" exibidos ao pai). Até os três contadores do topo
(sessões, avaliações, laudos) são agregados derivados — números que precisariam
dizer "calculado em..." para serem honestos.

## 2. O que já faz muito bem e deve ser preservado

- **O fluxo de convite completo** — geração de link com validade, aceite com todos
  os estados (inválido/expirado/usado/já vinculado), vínculo tipado
  (primário/secundário). É o mecanismo de "quem acompanha com a gente" já pronto.
- **A lista "Meus filhos"** com troca de criança ativa e cadastro de novo filho —
  gestão de identidade multi-criança funcionando.
- **A edição de perfil** (nome, nascimento, diagnóstico, observações) — o núcleo do
  registro.
- **A exibição de laudos** com CID, especialidades, horas recomendadas e
  profissional emissor — já estruturada como documento.
- **A lista de responsáveis com acesso** — inclusive o cuidado existente de não
  exibir o vínculo técnico do terapeuta FFS como responsável familiar.

## 3. O que está fora da missão da tela

| Conteúdo atual | Por quê está fora | Dona |
|---|---|---|
| Evolução do radar + histórico de snapshots | Leitura de estado — expira | Avaliação |
| Forecast completo (inclusive voz `clinic`) | Leitura projetiva; a voz clinic não aparece em telas de família (D-AV5) | Avaliação |
| Contadores de sessões e avaliações | Agregados derivados — leitura, não registro | Atividades / Avaliação |

Nenhum desses itens permanece nem como vitrine: o Mapa de Missões já decidiu que Meu
Filho **não responde** "como está se desenvolvendo" — quem quiser estado é
direcionado à Avaliação.

## 4. O que pertence à tela apenas como resumo (Regra 5)

Nada. Meu Filho é a única tela do Care sem vitrines: ela guarda e mostra apenas o
que possui. (No sentido inverso, todo o produto *usa* o que ela guarda —
custódia ≠ uso.)

## 5. Decisões

- **D-MF1 — Registro não expira. Leitura expira.** *(Aprovada previamente — Wil.)*
  Nome, nascimento e laudo não expiram — um laudo pode ficar desatualizado, mas
  permanece documento histórico. Radar, forecast e recomendação expiram. Esta é a
  régua que separa o que entra e o que sai desta tela.
- **D-MF2 — Toda leitura deve poder ser reconstruída a partir de suas evidências;
  todo registro deve poder ser rastreado até sua origem documental.**
  *(Aprovada previamente — Wil.)* Nesta tela: cada item de identidade tem origem
  conhecida — quem declarou, qual documento sustenta, quando entrou.
- **D-MF3 — Meu Filho contém apenas informações registráveis e rastreáveis.
  Informações que dependem de cálculo, interpretação ou validade temporal pertencem
  às telas de leitura.** *(Generalizada e elevada a princípio arquitetural
  permanente na aprovação — redação do Wil.)* Teste prático: *"se um item precisa
  dizer 'calculado em...' para ser honesto, ele não pertence a Meu Filho."*
  É o critério de admissão desta tela — análogo da D-H7 (Home) e da D-AV3
  (Avaliação).
- **D-MF4 — O estado sai da tela.** Radar, histórico, forecast e contadores
  derivados deixam Meu Filho (executa a fronteira do mapa; complementa a D-AV5 —
  com isto, a voz `clinic` do forecast desaparece da última tela de família que a
  exibia).
- **D-MF5 — Meu Filho é a custódia oficial de toda documentação permanente da
  criança. Os demais módulos apenas consomem essas informações quando necessário,
  sem duplicar sua gestão.** *(Ampliada na aprovação — redação do Wil; resolve a
  DEP-7, aplica "custódia ≠ uso".)* O laudo é apenas o primeiro exemplo: a mesma
  custódia acolherá relatórios escolares, exames, avaliações neuropsicológicas,
  audiometrias, exames genéticos, vídeos autorizados, fotografias clínicas e
  documentos judiciais — a arquitetura nasce preparada para crescer. Cadastro,
  exibição e — quando implementado — o arquivo em si vivem aqui; a lacuna do upload
  apontada na auditoria passa a ser pendência desta custódia.
- **D-MF6 — Identidade nunca é inferida das leituras do Care.** Diagnóstico e
  qualquer atributo de identidade entram como registro declarado/documentado (com
  origem — D-MF2), jamais derivados de scores, triagens ou forecasts internos. É a
  materialização, no modelo de dados da tela, da fronteira que a D-AV4 protege na
  linguagem.
- **D-MF7 — Acesso é registro.** "Quem acompanha com a gente" é parte da identidade
  da jornada: responsáveis, convites e — futuramente — o vínculo com terapeuta são
  registros com origem documental (um convite aceito em data X é o documento de
  origem do acesso). A representação do vínculo com terapeuta aguarda a integração
  Clinic↔Care (trilha B) — registrada, não desenhada aqui.
- **D-MF8 — A identidade da criança permanece estável independentemente das
  intervenções em andamento.** *(Acrescentada pelo Wil na aprovação.)* Hoje ABA;
  amanhã TO, fono, psicologia; mudança de clínica; retorno — nada disso muda quem a
  criança é. **A identidade sobrevive às intervenções; as intervenções vêm e vão.**
  Reforça a separação registro → leitura → planejamento e garante que nenhum vínculo
  terapêutico, plano ou programa jamais seja pré-condição ou modificador da
  identidade.

## 6. Dependências registradas (nada decidido aqui)

| # | Dependência | Decidida em |
|---|---|---|
| DEP-9 | Verificação de RLS: co-responsável aceito via convite enxerga de fato a criança (a query do layout não faz join com `crianca_responsaveis`; depende de policy — pendência da auditoria §6) | Trilha B (banco) |
| DEP-10 | Representação do vínculo com terapeuta como registro de acesso | Integração Clinic↔Care (trilha B) |
| — | Upload do arquivo de laudo (lacuna funcional, agora sob custódia de Meu Filho — D-MF5) | Implementação futura |

---

## Registro da aprovação — o padrão dos critérios de admissão

Na aprovação, o Wil consolidou o padrão que emergiu das quatro revisões: **cada tela
tem um critério de admissão**, e funcionalidade futura que não passar no critério da
tela não entra — sem discussão:

| Tela | Critério de admissão |
|---|---|
| Home | Tudo precisa levar a uma decisão imediata (D-H7) |
| Atividades | Tudo precisa existir para mudar comportamento (D-A1) |
| Avaliação | Tudo precisa produzir compreensão (D-AV3) |
| Meu Filho | Tudo precisa ser registrável e rastreável (D-MF3) |

Registro adicional (Wil): sem vitrines e sem leituras, Meu Filho deixa de ser um
dashboard e vira um **cadastro vivo**. E a observação sobre a PB-004 como um todo:
o que começou como auditoria do Care está terminando como **definição da ontologia
do produto** — o que é identidade, estado, evidência, leitura, intervenção, e quem
é dono de cada tipo de informação.

---

*Decisões D-MF1 a D-MF8 aprovadas em 10/07/2026 — Etapa 6 (Meu Filho) encerrada.
Próxima tela da sequência: Agenda — que entra com DEP-3 (vitrine de próximo
compromisso para a Home) e com a fronteira já traçada pelo mapa (compromissos
reais; sugestão de prática não é compromisso).*
