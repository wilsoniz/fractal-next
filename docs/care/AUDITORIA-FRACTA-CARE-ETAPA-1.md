# AUDITORIA DO FRACTA CARE — ETAPA 1

> **PB-004 — Fracta Care Review · Etapa 1 (auditoria de produto)**
> Data: 10/07/2026 · Método: leitura integral do código de `/care` e do funil `/captura`,
> analisado da perspectiva de um responsável usando o sistema. Nenhuma implementação
> foi feita nesta etapa. O código é citado apenas para explicar o comportamento observado.

---

## 1. O que é o Fracta Care hoje (visão de produto)

O Fracta Care existente é um produto **surpreendentemente completo em superfície**: tem
funil de aquisição, onboarding, dashboard multi-criança, avaliação adaptativa, execução
de atividades com registro de tentativas, forecast, gamificação, agenda, trilhas de
orientação parental, perfil da criança com laudos, e compartilhamento de acesso entre
responsáveis. A identidade visual (paleta verde-água/verde-limão sobre gradientes claros,
tom acolhedor, linguagem 100% para pais) é **distinta do Clinic e coerente entre todas as
telas** — o Care já tem identidade própria, como o charter pede.

Porém, por baixo dessa superfície há **três camadas de maturidade muito diferentes**:

1. **Real e funcional** — auth, cadastro de filhos, avaliação adaptativa (radar),
   execução de atividade com 5 tentativas, histórico de sessões, forecast, convite de
   co-responsável, laudos, triagem.
2. **Real mas desconectado** — gamificação (lê do banco, mas nada grava pontos),
   agenda (mistura eventos reais com sugestões geradas na hora e um placeholder fixo).
3. **Mock/protótipo** — trilhas do Guia-Familiar (conteúdo e progresso hardcoded),
   toggles de notificação (puramente visuais), página `/care/progresso` (protótipo
   órfão com dados fictícios), bloco "Do Terapeuta" (placeholder declarado).

A auditoria abaixo detalha tela a tela e depois consolida os achados transversais.

---

## 2. Jornada da família (mapa de fluxo)

```
/captura (landing) ──► /captura/avaliacao (14+ perguntas, sem conta)
                            │  salva em sessionStorage + tabela avaliacoes (anônima)
                            ▼
                      /captura/resultado (radar + CTA cadastro)
                            │  cria conta → profiles + criancas + radar_snapshots
                            ▼
/care/login ─────────► /care/dashboard (Home)
                            ├── Atividades (lista, consistência, progresso, histórico)
                            ├── Avaliação (radar, triagem 39 perguntas, laudos, "Do Terapeuta")
                            │       └── /care/dashboard/avaliar (reavaliação adaptativa)
                            ├── Agenda (lista/semana, compromissos manuais)
                            ├── Meu Filho (perfil, filhos, forecast, laudos, convite)
                            ├── Guia-Familiar (trilhas de aprendizado — mock)
                            └── Meu Perfil (dados, notificações, conta)
                       /care/atividade (execução: instrução → prática → resultado)
                       /care/convite/[codigo] (aceite de co-responsável)
```

O desenho da jornada é bom: a família extrai valor **antes** de criar conta (avaliação
gratuita), o cadastro herda os dados da avaliação, e o dashboard fecha o ciclo
avaliar → praticar → acompanhar. Isso está alinhado à missão de gerar valor sem terapeuta.

---

## 3. Auditoria por tela

### 3.1 Funil `/captura` (landing + avaliação gratuita + resultado)

- **Missão:** converter interesse em avaliação e avaliação em conta.
- **Valor para a família:** entender o momento do filho em ~3 minutos, sem custo e sem
  cadastro prévio. É a promessa central do Care cumprida na porta de entrada.
- **Fluxo:** landing → avaliação (respostas guardadas em `sessionStorage` + registro
  anônimo em `avaliacoes`) → resultado com radar → cadastro que "adota" os dados
  (cria criança, snapshot, marca `convertido`). Faz sentido e é bem costurado.
- **Muito bom:** FAQ honesto ("não substitui profissional"), sem cartão de crédito,
  compartilhamento por WhatsApp no resultado (crescimento orgânico), avaliação
  adaptativa por idade.
- **Desalinhado / risco:**
  - Depoimentos são fictícios (nomes/idades inventados). Em pré-lançamento de produto
    clínico isso é um risco de credibilidade — decidir política antes do teste real.
  - O cadastro dentro de `/care/login` grava na tabela **`perfis`**, enquanto o cadastro
    via `/captura/resultado` e o restante do app usam **`profiles`**. Dois caminhos de
    signup gravando em tabelas diferentes — comportamento divergente conforme a porta
    de entrada.
- **Manter como está:** a estrutura do funil (valor antes do cadastro) e a linguagem.

### 3.2 Login / Cadastro (`/care/login`, `/care/esqueci-senha`)

- **Missão:** entrada de baixa fricção.
- **Fluxo:** abas Entrar/Criar conta, mensagens de erro traduzidas, link de volta para
  a avaliação gratuita. Simples e adequado.
- **Quebrado (crítico para o teste):** "Esqueci minha senha" envia e-mail com redirect
  para `/care/nova-senha` — **essa página não existe** (o diretório está vazio; só a
  Consultoria tem `nova-senha`). Toda recuperação de senha do Care termina em 404.
- **Desalinhado:** o cadastro por aqui usa a tabela `perfis` (ver 3.1) e refaz por conta
  própria a lógica de importar criança/radar do `sessionStorage`, duplicando o que
  `/captura/resultado` faz — dois pontos de manutenção para o mesmo onboarding.

### 3.3 Layout do dashboard (`/care/dashboard/layout.tsx`)

- **Missão:** casa da família — navegação, seletor de criança ativa, contexto global.
- **Muito bom:** suporte real a múltiplos filhos (seletor com persistência em
  `localStorage`, "Adicionar filho" no dropdown), empty-state claro quando não há
  criança, tab bar mobile — o mobile-first que o público exige.
- **Desalinhado:**
  - A tab bar mobile omite **Agenda** e **Meu Perfil** (só home, atividades, avaliação,
    guia, filho). No desktop existem 7 itens; no celular — o dispositivo principal
    dessas famílias — Agenda e Perfil ficam inacessíveis.
  - O item "Guia-Familiar" na navegação abre uma página cujo título é "Aprendizado" —
    dois nomes para a mesma coisa.
  - O badge (bolinha verde) na aba "Avaliação" é **incondicional** — sempre aceso,
    mesmo sem nada pendente. Badge permanente vira ruído e perde função.
- **Manter:** o padrão de contexto (`useCareContext`) — todas as abas dependem dele e
  funciona bem.

### 3.4 Home (`/care/dashboard`)

- **Missão:** responder "como meu filho está e o que faço hoje?".
- **Valor:** radar de habilidades + mensagem do FractaEngine + forecast + atividades do
  dia + gamificação — o resumo emocionalmente certo para um pai abrir de manhã.
- **Muito bom:** dois CTAs corretos no topo (Registrar atividade / Avaliar); a mescla
  70% avaliação + 30% desempenho nos planos para o score exibido é uma ideia boa de
  "radar vivo"; recarrega ao voltar para a aba (visibilitychange).
- **Desalinhado:**
  - **Atividades fantasma:** sem planos ativos, o card "Atividades de hoje" mostra 3
    atividades default cujos links carregam `planoId` inválido (slugs como
    `pedir-o-que-quer`) — a tela de atividade não os encontra e cai no fluxo de criação
    automática. O pai clica numa coisa e recebe outra.
  - Card "Próxima atividade: **Hoje**" é texto fixo, não dado.
  - Contagem "X novas" no card de atividades exibe `3` mesmo vazio (fallback).
  - A "mensagem do FractaEngine" é template determinístico sobre o menor score. Honesto
    como heurística, mas o rótulo "Engine" promete mais do que entrega — atenção ao
    posicionamento quando o Session Engine real do Clinic amadurecer.
  - Widget de gamificação sempre mostra 0 pontos/0 streak (ver 3.10).

### 3.5 Atividades (`/care/dashboard/atividades`)

- **Missão:** visão de prática — o que está ativo, com que consistência e com que resultado.
- **Muito bom — a melhor tela do Care:** heatmap de consistência de 30 dias com streak
  (espelho perfeito de "consistência importa mais que intensidade"), progresso por
  programa (anel + sparkline + meta 80% + início vs. atual), histórico de sessões com
  humor e observações. É acompanhamento honesto e legível para leigos.
- **Desalinhado (conceitual, importante):**
  - Todo o eixo de progresso é **taxa de acerto**. O Clinic evoluiu para o princípio
    "mastery = independência, não acurácia"; o Care mede e celebra acurácia com ajuda
    incluída no denominador ("acerto" vs. "com ajuda" existem no registro, mas o score
    é `acertos/5`). Não é para copiar o Clinic — mas o *conceito* comunicado à família
    ("seu filho está a X% da meta") hoje pode divergir do que o terapeuta dirá.
  - A meta fixa de 80% é arbitrária e universal para qualquer programa.
  - `score_atual` do plano é **sobrescrito pela última sessão** (não é média nem
    tendência) — um dia ruim derruba a barra inteira que o pai vê.
- **Manter:** heatmap de consistência, humor por sessão, observações — exatamente o tipo
  de dado que enriquece a futura entrega ao terapeuta via Marketplace.

### 3.6 Execução de atividade (`/care/atividade`)

- **Missão:** guiar o pai a praticar 5 tentativas e registrar o resultado.
- **Muito bom:** estrutura Instrução → Prática → Resultado com barra de progresso;
  instruções com materiais, passos numerados e "dica importante"; registro por 3 botões
  grandes (Acertou / Com ajuda / Não respondeu); humor + observação ao final; mensagens
  de resultado com tom certo. UX mobile de qualidade, sem exigir treinamento.
- **Desalinhado:**
  - Registra "com ajuda" mas **não registra o tipo de ajuda** — e o resultado trata
    ajuda como não-acerto na taxa. De novo o eixo acurácia vs. independência (ver 3.5).
  - Se o pai entra sem plano, a tela **cria um plano sozinha** (domínio de menor score,
    nível iniciante). Auto-início silencioso de "intervenção" é uma decisão clínica que
    merece revisão de produto — hoje o pai nem fica sabendo que um programa começou.
  - As sugestões pós-atividade ("avance de nível", "use reforçadores de maior valor")
    são templates por faixa de acerto rotulados como FractaEngine (mesmo ponto do 3.4).
  - Ao concluir, **não** chama a gamificação (`registrarAtividade` existe na lib e não é
    invocada em lugar nenhum) — o streak celebrado na aba Atividades é calculado das
    sessões, mas pontos/conquistas nunca acontecem.

### 3.7 Avaliação (`/care/dashboard/avaliacao` + `/avaliar`)

- **Missão:** concentrar tudo que "mede" a criança: radar, triagem, laudos, e (futuro)
  instrumentos enviados pelo terapeuta.
- **Muito bom:**
  - A **reavaliação adaptativa** (`/avaliar`) é sofisticada de verdade: perguntas
    filtradas por idade em meses, gatilhos de aprofundamento conforme respostas
    (comunicação, social, regulação, telas...), escalas com exemplos concretos em
    linguagem de pais, pesos por pergunta. É o coração técnico do Care e está bem feito.
  - Histórico de snapshots com delta entre avaliações — evolução visível.
  - Laudos: formulário simples (CID, especialidades, horas/semana) que estrutura
    informação que normalmente vive em papel — ótimo insumo futuro para o Marketplace.
  - Bloco "Do Terapeuta" como placeholder explícito e honesto ("Em breve") — é o ponto
    de encaixe natural da integração Clinic→Care.
- **Desalinhado / atenção:**
  - A **Triagem de Desenvolvimento** (39 perguntas) agrupa e devolve resultado por
    categorias diagnósticas (TEA, TDAH, TDI...) com selos "Atenção/Observar". Isso é
    território sensível: triagem de categorias nosológicas respondida por pais, sem
    profissional no circuito e sem texto de "isto não é diagnóstico" na tela de
    resultado. Rever enquadramento clínico e disclaimers antes do teste com famílias.
  - As perguntas da triagem repetem "Seu filho" com substituição textual simples e há
    perguntas quase duplicadas entre si (herança da planilha de origem).
  - O tipo de laudo tem campo `arquivo_url`, mas **não há upload** — o comentário do
    código promete "upload + formulário" e só o formulário existe.
  - Dois lugares distintos mostram laudos e histórico do radar (Avaliação e Meu Filho),
    com pequenas diferenças — duplicação de missão entre abas (ver 3.9).

### 3.8 Agenda (`/care/dashboard/agenda`)

- **Missão:** organizar a semana da criança (terapias, compromissos, prática em casa).
- **Muito bom:** conceito dos 3 tipos de evento (sessão clínica / atividade /
  compromisso externo) com filtros e visualização lista/semana; criação de compromisso
  manual num bottom-sheet mobile bem resolvido; "marcar como realizado".
- **Desalinhado:**
  - A lista mistura eventos reais com **sugestões geradas na hora** (2 planos × 7 dias,
    sempre às 9h, todos os dias) e com um **placeholder fixo de "Sessão com terapeuta"**
    datado de +7 dias. O selo "Sugestão" ajuda, mas o volume de itens sintéticos
    (até 14 por semana) enterra os compromissos reais do pai.
  - Sugestões diárias idênticas não respeitam frequência real de prática nem o que já
    foi feito no dia (não cruzam com `sessoes`).
  - Como visto no 3.3, a Agenda inteira **não aparece no mobile**.
- **Manter:** o modelo de dados de 3 tipos — é exatamente o encaixe futuro do Clinic
  (sessões reais substituindo o placeholder).

### 3.9 Meu Filho (`/care/dashboard/meu-filho`)

- **Missão:** perfil da criança + gestão da família (múltiplos filhos, co-responsáveis).
- **Muito bom:** edição de perfil, lista "Meus filhos" com troca de ativo, geração de
  **link de convite** para outro responsável (7 dias, uso único, fluxo de aceite
  completo em `/care/convite/[codigo]` com todos os estados: inválido/expirado/usado/
  já vinculado), lista de responsáveis com acesso. O fluxo de convite é dos mais
  maduros do produto.
  - O card "Previsibilidade clínica" (forecast detalhado com projeção por domínio,
    ação recomendada e resumo clínico) é rico e mostra respeito pela inteligência
    do pai.
- **Desalinhado:**
  - **Sobreposição de missão com outras abas:** radar + histórico (repete Avaliação),
    laudos (repete Avaliação), forecast (repete card da Home). "Meu Filho" acumulou
    funções de dashboard além de perfil; as abas perderam fronteiras nítidas após o
    crescimento incremental.
  - O bloco de forecast expõe vocabulário do Clinic dentro do Care ("Ação recomendada:
    revisar metas", "Resumo clínico") — conteúdo desenhado para terapeuta sendo exibido
    ao pai. O motor de forecast separa `care` e `clinic` de propósito; esta tela mostra
    os dois.
  - Referências a `terapeuta_ffs` no vínculo (fluxo FFS do Clinic) já tratadas no
    código — bom sinal de integração pensada, mas convém confirmar por RLS que o
    co-responsável convidado realmente enxerga a criança (a query do layout busca
    `criancas` sem join explícito com `crianca_responsaveis`; depende de policy).

### 3.10 Guia-Familiar (`/care/dashboard/aprendizado`)

- **Missão:** psicoeducação — traduzir ABA para o dia a dia dos pais. É o coração da
  proposta "aumentar a autonomia da família".
- **Muito bom (como blueprint):** a arquitetura editorial está certa — trilhas por
  domínio, aulas de 3–5 min, "recomendada para você", dica prática por aula. Os títulos
  são exatamente o que pais procuram ("Por que seu filho tem dificuldade de aceitar
  'não'", "Parar telas sem conflito").
- **Mas é 100% mock:** trilhas e aulas hardcoded no arquivo; o texto de toda aula é o
  mesmo parágrafo genérico; progresso fixo (2 de 5 na trilha de comunicação, sempre);
  "Marcar como concluída" não persiste nada; "recomendada" não olha o radar da criança.
  Para o pai, isso é uma promessa quebrada dois cliques depois do índice bonito.
- **Nomenclatura:** menu diz "Guia-Familiar", página diz "Aprendizado" (ver 3.3).

### 3.11 Meu Perfil (`/care/dashboard/perfil`)

- **Missão:** conta do responsável.
- **Funciona:** editar nome (persiste em `profiles`), sair da conta.
- **Mock:** os 4 toggles de notificação são estáticos (estado visual fixo, sem
  persistência e sem onClick); "Alterar senha" é um botão sem ação; o widget de
  gamificação mostra pontos/conquistas que nunca são gravados (nenhum caminho do app
  chama `registrarAtividade`/`sincronizarPontos`; só o aceite de convite cria a linha
  zerada). A contagem de avaliações do widget também é derivada de aproximações
  (`pontos/10`, `+1` fixo).

### 3.12 `/care/progresso` — página órfã

Protótipo antigo com dados 100% fictícios ("Lucas", números fixos por período,
conquistas inventadas), navegação apontando para rotas inexistentes (`/app`,
`/dashboard/atividade`). Não é linkada de nenhum lugar do app. Só causaria dano se
alguém chegar por URL. Candidata a remoção/arquivamento (decisão para etapa 2 — nada
foi removido).

Também existem dois diretórios vazios: `src/app/care/avaliacao/` e
`src/app/care/nova-senha/` (este último é a causa do 404 do reset de senha).

---

## 4. Achados transversais

### 4.1 Inventário real × mock (o mais importante desta auditoria)

| Funcionalidade | Estado real |
|---|---|
| Funil captura → cadastro → dashboard | **Funcional** |
| Avaliação adaptativa + radar + histórico | **Funcional** (motor mais maduro do Care) |
| Execução de atividade + histórico de sessões | **Funcional** |
| Consistência/streak (aba Atividades) | **Funcional** (derivado de sessões reais) |
| Forecast | **Funcional** (heurística transparente, exige 2 snapshots) |
| Convite de co-responsável | **Funcional** |
| Laudos (formulário) | **Funcional**; upload de arquivo prometido e ausente |
| Triagem 39 perguntas | **Funcional**, mas com risco de enquadramento clínico |
| Multi-filho | **Funcional** |
| Agenda | **Meio real**: compromissos manuais reais + sugestões sintéticas + placeholder fixo |
| Gamificação (pontos/conquistas) | **Desconectada**: lib completa, nunca chamada; UI sempre em zero |
| Guia-Familiar (trilhas) | **Mock total** (conteúdo, progresso e recomendação) |
| Notificações (toggles) | **Mock visual** |
| Alterar senha (perfil) | **Botão sem ação** |
| Recuperar senha (e-mail) | **Quebrado** (redirect para página inexistente) |
| Bloco "Do Terapeuta" | Placeholder declarado (ok) |
| `/care/progresso` | Protótipo órfão |

### 4.2 Desalinhamentos com a evolução do Clinic

1. **Eixo de medida.** O Care mede acurácia (`acertos/5`) e trata "com ajuda" como
   não-acerto; o Clinic consolidou "mastery = independência ≠ acurácia" com dois eixos
   separados. O Care não precisa da complexidade do Clinic, mas precisa contar a
   **mesma história conceitual** — hoje um pai e um terapeuta olhando a mesma criança
   veriam narrativas de progresso diferentes.
2. **Modelo de programas.** O Care roda sobre `planos.programa_id` + `programas`
   (catálogo antigo por domínio/nível). O Clinic migrou para Program Builder /
   `plano_programas`. É a mesma dívida já registrada para a página do paciente do
   Clinic — o Care é mais um consumidor do modelo legado a considerar quando essa
   migração acontecer.
3. **Marca "FractaEngine".** No Care, tudo que se chama Engine é template determinístico
   (mensagens por faixa de score). Com o Session Engine real nascendo no Clinic, o
   mesmo nome passará a designar coisas de naturezas muito diferentes.
4. **Vazamento de linguagem clínica.** O forecast já separa saída `care` vs. `clinic`,
   mas a tela Meu Filho exibe a versão clínica ao pai. A separação existe no motor e
   se perdeu na UI.
5. **Ponto de integração.** Os encaixes Clinic↔Care já estão desenhados no produto
   (bloco "Do Terapeuta", tipo de evento `sessao_clinica` na agenda, vínculo
   `terapeuta_ffs`) — todos aguardando o lado Clinic. Estão nos lugares certos.

### 4.3 Inconsistências internas do Care

- Tabela **`perfis` vs. `profiles`**: caminhos de cadastro divergentes (login vs.
  captura/resultado) gravando perfil em tabelas diferentes.
- Onboarding duplicado: a lógica "importar criança do sessionStorage" existe em dois
  arquivos com pequenas diferenças.
- Nomenclatura: "Guia-Familiar" vs. "Aprendizado"; "Atividades" vs. "Sessões" vs.
  "Programas" usados de forma intercambiável nas telas.
- Sobreposição de missão entre abas: radar/histórico em 3 lugares, laudos em 2,
  forecast em 2 — sintoma de crescimento incremental sem revisão de fronteiras (é
  exatamente o que esta revisão veio corrigir).
- Badge de avaliação sempre aceso; contadores com fallbacks fixos ("3 novas",
  "Próxima atividade: Hoje").

### 4.4 O que já está muito bom e deve permanecer como está

- **Identidade e tom**: linguagem para pais, sem jargão, com exemplos concretos —
  consistente em todo o produto. É o maior ativo do Care.
- **Avaliação adaptativa** (`/avaliar`): perguntas por idade em meses + gatilhos de
  aprofundamento. Manter o motor.
- **Heatmap de consistência + streak** na aba Atividades.
- **Fluxo de execução de atividade** (3 fases, botões grandes, humor, observação).
- **Fluxo de convite de co-responsável** completo.
- **Estrutura do funil de captura** (valor antes do cadastro).
- **Placeholders honestos** onde a integração com o Clinic ainda não existe.
- **Multi-filho** com criança ativa persistida.

---

## 5. Pontos que exigem decisão antes do teste com famílias

(sem propor reformulação — apenas o que não dá para testar sem decidir)

1. **Reset de senha quebrado** (`/care/nova-senha` inexistente) — bloqueia teste real.
2. **Triagem por categorias diagnósticas** sem disclaimer — risco clínico/ético.
3. **Depoimentos fictícios** na landing — política de credibilidade.
4. **Guia-Familiar mock** — decidir entre alimentar com conteúdo mínimo real ou
   ocultar a aba no teste (promessa quebrada é pior que ausência).
5. **Gamificação em zero permanente** — conectar (1 chamada no fim da atividade) ou
   ocultar os widgets.
6. **Atividades default com links inválidos** na Home quando não há planos.
7. **`perfis` vs. `profiles`** — verificar no banco qual caminho de cadastro está de
   fato correto hoje (mudança é schema; fica para o SQL Editor quando decidido).

## 6. Verificações pendentes (não confirmáveis só pelo código)

- RLS de `criancas`: o co-responsável aceito via convite realmente enxerga a criança?
  (a query do layout não faz join com `crianca_responsaveis`; depende de policy).
- Estado real das tabelas `triagens`, `agenda_eventos`, `gamificacao`, `conquistas`,
  `convites` no Supabase (existência/policies) — o código assume todas.
- Se `sessoes.taxa_acerto` é coluna gerada ou gravada (o insert de atividade não a envia).

---

*Este documento é a base da revisão do Fracta Care (PB-004). A Etapa 2 — decisões e
priorização — parte do inventário da seção 4.1 e das decisões da seção 5.*

---

## Adendo — Leitura Arquitetural: Decisões da Revisão (10/07/2026)

> Este adendo registra **apenas decisões aprovadas** na leitura arquitetural feita após
> a auditoria. A auditoria acima permanece inalterada como retrato do produto
> (fatos observados); este adendo é interpretação e decisão.

**Veredito.** O Fracta Care será **preservado e consolidado**, não reconstruído. O
diagnóstico central não é falta de funcionalidades, é crescimento incremental sem
revisão de consolidação — resumido na frase "sobreposição de missão entre abas".

**D1 — Classificação dos achados.** Todo achado da auditoria pertence a uma de três
categorias, tratadas em trilhas separadas:

- **A — Bugs** → Clinical Milestone própria, fora da revisão de produto. Subdivididos em:
  - **A1 — independentes**: solução única, corrigíveis imediatamente
    (ex.: reset de senha `/care/nova-senha`, badge permanente da aba Avaliação,
    contadores fixos, página órfã `/care/progresso`).
  - **A2 — dependentes de decisão de produto**: só corrigidos após a revisão da tela
    correspondente, para não corrigir na direção errada
    (ex.: gamificação desconectada, atividades default da Home, mensagens do Engine).
- **B — Dívidas técnicas** → trilha de arquitetura (ex.: `perfis`×`profiles`, modelo
  legado `planos.programa_id`, extração futura do motor de avaliação para lib,
  integração Clinic↔Care).
- **C — Produto** → foco da revisão PB-004 (missão das telas, sobreposição, linguagem,
  papel de forecast/avaliação/Guia Familiar).

**D2 — Guia Familiar reclassificado.** Deixa de ser tratado como "mock" e passa a ser
**produto ainda não iniciado**: arquitetura editorial aprovada, conteúdo pendente.
Não é dívida — é módulo em desenvolvimento. (Pendência isolada, fora da revisão:
decidir se a aba fica visível ou oculta durante o teste com famílias.)

**D3 — Triagem é ativo estratégico.** A Triagem de Desenvolvimento permanece no
produto. A revisão (Chat da tela Avaliação) tratará **exclusivamente de enquadramento
e comunicação dos resultados** — incluindo os rótulos de agrupamento (selos por
categoria diagnóstica), não só a tela final. Direção: "comportamentos que merecem
investigação", nunca afirmação ou sugestão de diagnóstico. Remoção do instrumento
está fora de questão.

**D4 — Avaliação adaptativa é ativo estratégico.** Deixa de ser tratada como "uma
tela" e passa a ser protegida como ativo central do Fracta. Desdobramento técnico
(Categoria B, futuro): extrair banco de perguntas/gatilhos/pesos/scores do componente
de página para lib testável, como os motores do Clinic.

**D5 — Formato da Etapa 2.** A revisão seguirá em chats disciplinados, **uma decisão
arquitetural aprovada por chat**:

- **Chat 1 — Mapa de Missões do Fracta Care** (exclusivamente). Uma página que
  responde, por tela: *que pergunta da família esta tela existe para responder?*
  Rascunho inicial a validar:
  - Home → "Como meu filho está hoje?"
  - Atividades → "O que posso fazer hoje?"
  - Avaliação → "Como acompanho o desenvolvimento?"
  - Meu Filho → "Quem é meu filho dentro do Fracta?"
  - Agenda → "O que acontecerá nos próximos dias?"
  - Guia Familiar → "Como posso aprender a ajudá-lo?"
  - Perfil → "Como gerencio minha conta e minha família?"
- **Chats seguintes**: um por tela, cada um detalhando apenas a sua linha do mapa e
  devolvendo ao mapa o que não for dele. Sem discussão de layout, componentes ou
  funcionalidades antes do mapa aprovado.

**D6 — Convenção documental do Fracta (transversal).** Daqui em diante os documentos
mantêm quatro camadas separadas, para rastreabilidade:

1. **Auditoria** → fatos observados.
2. **Leitura Arquitetural** → interpretação.
3. **Decisões** → conclusões aprovadas.
4. **Implementação** → mudanças realizadas.

*Próxima etapa oficial: **PB-004 · Etapa 2 — Mapa de Missões do Fracta Care**.*
