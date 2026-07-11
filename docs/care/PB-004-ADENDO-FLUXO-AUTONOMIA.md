# PB-004 · Adendo — Fluxo de Autonomia da Família (11/07/2026)

> **Camada: Decisão — adendo datado** (convenção D6). Registra decisões do Wil após
> regressão de valor encontrada no teste de uso. Não altera os documentos da PB-004;
> qualifica a aplicação deles.

## Princípio (acima de quase todas as decisões da PB-004)

**O Fracta Care precisa ser útil antes mesmo de existir um terapeuta.** Esse
princípio define o modelo de negócio do Care: sem ele, a família abandona o app
antes de chegar ao Marketplace/Clinic — o ecossistema morre antes de começar.

## Regra nova (registrada para todo o Fracta)

**Nunca remover uma funcionalidade apenas porque ela ainda não está integrada ao
restante do ecossistema. Pergunte antes: "ela gera valor sozinha?" Se sim, permanece.**

Corolário: *sintético ≠ não-integrado*. Conteúdo fake sai (D-H4 permanece válida),
mas a **função** que ele carregava (porta de entrada, bootstrap) precisa ser
preservada por um caminho real.

## O que o teste revelou (diagnóstico, 11/07/2026)

O fluxo mínimo de autonomia é: avaliar → leitura → orientação → atividades — sem
terapeuta. A avaliação adaptativa (`/avaliar`) e o bootstrap de atividades
(`/care/atividade`, `criarPlanoInicial`) **nunca foram removidos** (git confirma:
zero commits nesses arquivos desde a tag `pb-004`). O que quebrou:

**A — Regressões causadas pelo CM-A1/A2 (restauradas neste adendo):**
1. O estado vazio da Home apontava para "fazer avaliação" — mas avaliação não gera
   planos; só entrar em `/care/atividade` gera. Loop sem saída. → Restaurado: CTA
   **"Começar primeira atividade"** → `/care/atividade` (função de volta, conteúdo
   fake não).
2. A linha de orientação foi suspensa (D-H6) com substituto adiado (BLQ-1) — família
   ficou com números sem "o que fazer". → Restaurada como **interim declarado** até
   o BLQ-1 definir a leitura canônica (D-AV6); rótulo pendente DEP-6.

**B — Quebra pré-existente exposta pelo teste (corrigida neste adendo):**
3. `/avaliar` e `/care/atividade` buscavam a criança **apenas** por
   `criancas.responsavel_id = auth.uid()`. Crianças cadastradas via Clinic/FFS têm
   `responsavel_id = null` (confirmado em produção: Sebastião) e são acessíveis via
   `crianca_responsaveis`/RLS — as duas páginas falhavam **em silêncio** (tela em
   branco / redirect mudo). É a pendência DEP-9 da auditoria, agora confirmada.
   → Corrigido: as duas páginas usam o padrão do layout (acesso decidido pela RLS,
   sem filtro de `responsavel_id`) e ganham **estado de erro visível** — tela em
   branco nunca é aceitável.

## O que permanece removido (sintético de verdade, sem função)

Gamificação zerada; sugestões não-clicáveis da Agenda; stats históricos; blend
70/30; progresso fictício do Guia. Nenhum gerava ação para a família.
