# PB-004 · Resumo Executivo — Fracta Care Review

> **Camada: Decisão — documento de encerramento** (convenção D6) · 10/07/2026
> Consolida exclusivamente o que foi oficialmente aprovado nas Etapas 1–9.
> Nenhuma ideia, decisão ou princípio novo. Fontes: os nove documentos
> `docs/care/AUDITORIA-FRACTA-CARE-ETAPA-1.md` e `PB-004-ETAPA-2` a `-9`.

## 1. Objetivo da revisão

Auditar, revisar, alinhar e evoluir o Fracta Care existente — sem redesenhá-lo.
Compreender profundamente o produto antes de qualquer decisão, pela perspectiva da
família, e produzir decisões arquiteturais aprovadas que orientem a evolução.

## 2. Etapas realizadas

| Etapa | Entrega | Status |
|---|---|---|
| 1 | Auditoria de produto (fatos) + adendo de Leitura Arquitetural (D1–D6) | ✅ |
| 2 | Mapa de Missões (7 telas, 5 regras, governança) | ✅ |
| 3–9 | Revisões por tela: Home, Atividades, Avaliação, Meu Filho, Agenda, Guia Familiar, Perfil — uma decisão arquitetural aprovada por chat | ✅ (todas) |

## 3. Principais decisões por tela

- **Home** *(D-H1–7)* — Responde ao **estado atual** da criança; contexto histórico
  fica nas donas. Não é dona de nada: toda vitrine aponta para a dona correta. Sem
  profundidade, sem conteúdo sintético, sem métricas próprias. Cada card apoia uma
  decisão imediata da família.
- **Atividades** *(D-A1–10)* — Atividades são **intervenções familiares
  estruturadas** com finalidade clínica declarada, apresentadas sempre inseridas no
  cotidiano ("durante o lanche..."), nunca como exercício isolado. A tela reforça o
  comportamento da família (consistência primeiro). "Com ajuda" ≠ erro; progresso é
  tendência, não última sessão; o critério pertence à finalidade (fim da meta
  universal de 80%). Nenhuma intervenção inicia silenciosamente. Modelo de pontos
  não atende a missão — revisão futura.
- **Avaliação** *(D-AV1–9)* — Produz **compreensão compartilhada, não diagnóstico**.
  Unidade de trabalho: a **evidência de desenvolvimento** (observação situada, com
  contexto preservado); tudo o mais é **leitura**, que declara fonte e data e nunca
  realimenta como evidência. Triagem comunicada por comportamentos a investigar
  (nunca categorias diagnósticas; instrumento intocado). Forecast mora aqui, só na
  voz de pais. A Avaliação **revela necessidades**; objetivos vêm do planejamento.
- **Meu Filho** *(D-MF1–8)* — Tela do "Quem é?": só informações **registráveis e
  rastreáveis** (registro não expira; leitura expira). **Custódia oficial de toda a
  documentação permanente da criança** (laudo é o primeiro exemplo); os demais
  módulos usam sem duplicar. Única tela sem vitrines — cadastro vivo, não dashboard.
  A identidade sobrevive às intervenções e nunca é inferida das leituras do Care.
- **Agenda** *(D-AG1–5)* — Só compromissos reais. **Prática agendada é compromisso;
  prática sugerida não é.** `sessao_clinica` fica como encaixe vazio da integração
  Clinic. Exporta "próximo compromisso" para a Home. Acesso mobile é requisito da
  missão.
- **Guia Familiar** *(D-GF1–4)* — Missão intacta; **o que falta é conteúdo, não
  arquitetura**. Nome único "Guia Familiar". Sem conteúdo real, não simula produto.
  Recomendação de trilha derivará das necessidades reveladas pela Avaliação.
- **Perfil** *(D-P1–4)* — Somente a conta do responsável. **Nenhum controle
  decorativo.** Widget de gamificação sai. Segurança mínima da conta (alterar/
  recuperar senha) é requisito pré-teste.

## 4. Decisões arquiteturais transversais

- **Mapa de Missões** — cada pergunta da família tem uma única tela dona; a Home não
  possui nada; vitrine aponta para a dona; satélites herdam missão; **resumir nunca
  é possuir**. Governança: toda funcionalidade nova declara qual missão fortalece.
- **Vocabulário arquitetural** — *Dashboards consomem indicadores, não produzem* ·
  *Evidências são fatos; leituras são interpretações* · *Custódia ≠ uso* ·
  *Registro não expira; leitura expira* · *"Quem é?" ≠ "Como está?"* ·
  *Rastreabilidade dupla (leitura → evidências; registro → documentos)* ·
  *A identidade sobrevive às intervenções*. Válido para Care **e** Clinic.
- **Ciclo conceitual do Fracta** (candidato a espinha dorsal do ecossistema):
  **Evidências → Leituras → Necessidades → Objetivos → Intervenções → Novas
  Evidências.**
- **Critérios de admissão por tela** — Home: leva a decisão imediata · Atividades:
  existe para mudar comportamento · Avaliação: produz compreensão · Meu Filho:
  registrável e rastreável. Funcionalidade que não passa no critério não entra.
- **Convenção documental** — Auditoria (fatos) / Leitura Arquitetural
  (interpretação) / Decisões (aprovadas) / Implementação (realizadas).
- **Ativos estratégicos protegidos** — avaliação adaptativa e triagem (revisão só de
  linguagem). Guia Familiar reclassificado: produto não iniciado, não dívida.

## 5. Itens encaminhados para implementação

- **A1 — bugs independentes (CM de bugs, corrigíveis já):** reset de senha
  (`/care/nova-senha` inexistente) e alterar senha; badge permanente da aba
  Avaliação; contadores fixos; página órfã `/care/progresso`.
- **A2 — bugs com direção já decidida pelas revisões:** atividades default →
  remover conteúdo sintético (D-H4); gamificação → não conectar pontos, widgets
  suspensos até novo modelo (D-A7/D-P3); mensagens do Engine → conteúdo deriva das
  leituras (D-AV6), rótulo pendente de naming (DEP-6); auto-criação de plano →
  eliminar (D-A6); sugestões sintéticas da Agenda → remover (D-AG1).
- **B — trilha de arquitetura:** `perfis`×`profiles`; modelo legado
  `planos.programa_id`; extração do motor adaptativo para lib; motor de
  recomendação; integração Clinic↔Care (sessões na Agenda, "Do Terapeuta", vínculo
  como registro); verificação de RLS (co-responsável, `triagens`/`avaliacoes`);
  navegação mobile (Agenda acessível).
- **Conteúdo clínico (trilha própria):** catálogo de atividades com finalidades e
  critérios (DEP-5); textos interpretativos das leituras e enquadramento da triagem
  (DEP-8); aulas do Guia Familiar (D-GF1).
- **Logística do teste:** exibir/ocultar Guia Familiar; política sobre depoimentos
  da landing.

## 6. Veredito final

**O Fracta Care vale ser preservado — e agora tem a arquitetura para evoluir.**
A auditoria encontrou um produto com base boa que cresceu sem revisão de
consolidação; a revisão respondeu com consolidação, não reconstrução. As sete telas
têm missão única, fronteiras nítidas, critérios de admissão e contratos entre si;
os conceitos que sustentam o produto (evidência/leitura, registro/estado,
custódia/uso, o ciclo clínico) foram explicitados e aprovados. As três últimas
revisões não exigiram nenhum conceito novo — a confirmação de que a base ficou
madura. O que a PB-004 começou como auditoria de telas, terminou como **ontologia do
produto**: a clareza conceitual que torna o sistema fácil de evoluir pelos próximos
anos. Próxima fase: **implementar as decisões aprovadas.**

---

*PB-004 — Fracta Care Review: encerrada em 10/07/2026.*
