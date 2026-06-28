@AGENTS.md

# CLAUDE.md — Fracta Behavior

> Arquivo lido automaticamente no início de cada sessão do Claude Code.
> Trabalhe **sempre em PT-BR**.

---

## REGRAS (guardrails — têm precedência)

Antes de alterar qualquer código:
1. Analise a arquitetura existente.
2. Liste os riscos.
3. Mostre quais arquivos serão modificados.
4. **Aguarde minha aprovação** antes de escrever/editar qualquer arquivo.

Nunca, sem aprovação explícita:
- Alterar autenticação.
- Alterar schema do Supabase (mudanças de schema eu faço pelo SQL Editor).
- Alterar rotas existentes.
- Remover funcionalidades existentes.

> Use julgamento clínico e técnico ao **planejar** a abordagem (não me pergunte
> cada microdecisão de raciocínio) — mas a execução sempre passa pelo portão de
> aprovação acima. Passos pequenos e confirmáveis. Fix de causa-raiz, não paliativo.

---

## POR QUE existe

Fracta Behavior é uma plataforma SaaS clínica para gestão de prática em **ABA (Análise do Comportamento Aplicada)**, voltada ao tratamento de autismo e neurodesenvolvimento. O dono é psicólogo (CRP 06-125253), fundador e único desenvolvedor — constrói a plataforma que também usa clinicamente. Toda decisão técnica é fundamentada em raciocínio clínico alinhado a QABA.

**Foco atual:** Fracta Clinic (profissionais independentes, não instituições). Estado **pré-lançamento**, sendo preparado para teste com profissionais reais.

**Decisão de produto FIRME:** famílias **nunca pagam**. Fracta Care é gratuito. Monetização vem só do lado profissional (Fracta Clinic). Qualquer preço B2C de família em documento de consultor/investidor **não** reflete a visão do projeto.

---

## O QUE é (stack)

- **Next.js** (App Router, TypeScript, `.tsx`)
- **Supabase** (Postgres + RLS + Auth) — fonte de dados única
- **Tailwind**
- Identidade visual "Petróleo Clínico": teal `#1D9E75` (dados), amber `#EF9F27` (critério/destaque), tinta `#1a2e44` (eixos/texto), sobre branco (imprimível em PDF via HTML→print)

---

## COMO trabalhar aqui

### Comandos
```bash
# Check de build (rodar antes de commit)
npm run build 2>&1 | grep -E "Type error|Error occurred" | head -5

# Commit
git add -A && git commit -m "..." && git push origin main
```

### Edição de arquivo
- Edições em arquivo grande: `str_replace` cirúrgico ou reescrita do arquivo inteiro.
- **Nunca** `sed` por número de linha em arquivo com acento/JSX — causa duplicação.

---

## PRINCÍPIOS CLÍNICOS (não violar)

- **Mastery = independência, NÃO acurácia.** Critério de domínio é
  `prompt_level_used = 'independente' AND correto = true` — não "acertou com dica".
- **Dois eixos separados, de propósito:**
  - acurácia → `criterio_percentual` / `criterio_sessoes`
  - independência → `mastery_min_independence` / `mastery_consecutive_sessions`
- **16 tipos de dica canônicos**, com `ordem_canonica` fixa (escala de intrusividade — **nunca muda**), separada da ordem operacional do template (`posicao`, pode inverter para estratégias mais-para-menos).
- **Nunca misturar ecoico + modelo** na mesma hierarquia de dicas.
- **VB-MAPP / PEAK / ABLLS-R são INSTRUMENTOS DE AVALIAÇÃO, não programas de ensino.** Nunca listar como "programas trabalhados" em relatório — destrói credibilidade clínica.

---

## ARMADILHAS DE BANCO (já custaram caro)

- `sessao_tentativas.correto` é **coluna GERADA** = `(resultado = 'acerto')`. **Não aceita INSERT direto.**
- `prompt_level_used = null` em caso de erro (respeita FK → `prompt_types.codigo` e a regra clínica).
- **RLS ativa sem policy de UPDATE = falha silenciosa: 0 linhas, nenhum erro.** Padrão recorrente. Ao depurar "não salvou e não deu erro", checar se existe policy de UPDATE.
- **Múltiplas instâncias de GoTrueClient** → token `auth.uid()` instável. Garantir client único.
- `.in()` com lista vazia gera `id=in.()` malformado → **erro 400**. Pular a query quando a lista estiver vazia.
- Cada programa guarda um **snapshot** (`hierarquia_dicas`), não referência viva ao template.

---

## MAPA DE ARQUIVOS-CHAVE

- `src/components/fracta/Modal.tsx` — modal via portal
- `src/lib/analise-single-case.ts` — motor de métricas single-case (funções puras: nível, tendência, variabilidade por resíduos, PND, narrativa)
- `src/lib/grafico-evolucao.ts` — gráficos SVG padrão ABA (X=sessões, Y=medida, quebra na mudança de fase)
- `src/lib/relatorio-fase-v2.ts` — relatório de fase (3 modos: técnico / família / completo)
- `src/lib/narrativa-acessivel.ts` — tradução de métricas em linguagem para pais
- `src/lib/montar-relatorio-fase.ts` — I/O do relatório de fase (queries Supabase; monta DadosRelatorioFaseV2; aceita período livre / fase arquivada via `dataInicio`/`dataFim`/`faseRotulo`/`numeroCiclo`, ou janela da fase atual por padrão)
- `paciente/[id]/relatorios-tab.tsx` — aba "Relatórios" (recorte por fase OU período livre, 3 modos, geração do PDF + persistência em `relatorios_fase`)
- `paciente/[id]/page.tsx` — função `gerarRelatorioFase(avancar)` (ex-`gerarEAvancar`) + modal de relatório + wiring da aba "Relatórios"

### AVISO: `sessao/page.tsx`
Tem **5 overlays**. Antes de migrar qualquer um para `<Modal>`:
- o overlay **zIndex 200** fullscreen (~linha 4151) **NÃO** pode virar `<Modal>`
- o **zIndex 40** (~linha 4265) é backdrop de dropdown, não modal
Auditar cada um individualmente.

---

## DÍVIDA TÉCNICA CONHECIDA

- **Migração de Modal** (baixa prioridade, migrar conforme tocar a página):
  - Já migrado: `protocolos`, `pacientes`
  - Pendente: `planos`, `terapeuta`, `avaliacoes`, `paciente/[id]/tabs.tsx`, `paciente/[id]/page.tsx`, `programas`, `wallet`, `agenda`, `sessao`
- Relatório de fase: a função antiga `gerarEAvancar` já não existe (virou `gerarRelatorioFase`). Os bugs antes listados (terapeuta como email; `total_sessoes = 0`) estão resolvidos — terapeuta vem do contexto com CRP e `total_sessoes` confere no teste real da aba.
- Backlog: limpar `console.log` de debug; valor de sessão hardcoded (deveria vir do contrato).

---

## EM ANDAMENTO

**Relatório de Fase (Frente 3) — engine + aba "Relatórios" (Camada 1) CONCLUÍDAS** e validadas com dados reais.
- `src/lib/montar-relatorio-fase.ts` — I/O pronto (queries Supabase; aceita 
  `dataInicio`/`dataFim`/`faseRotulo`/`numeroCiclo` para período livre OU fase 
  arquivada, ou janela da fase atual por padrão; separa instrumentos de avaliação 
  de programas de ensino)
- `paciente/[id]/relatorios-tab.tsx` — aba "Relatórios": recorte por fase (todos os 
  ciclos: fase atual + histórico) OU período livre, 3 modos (técnico/família/completo), 
  geração do PDF e persistência em `relatorios_fase` (`fase='periodo_livre'` no período 
  livre). Testada: período livre gera, abre PDF e persiste com datas/`total_sessoes` ok.
- `paciente/[id]/page.tsx` — `gerarRelatorioFase(avancar)` no fluxo de avançar fase + 
  wiring da aba.

**PRÓXIMO — Aba "Relatórios", Camadas 2-3:**
- Camada 2: pré-visualização dos gráficos de evolução na própria tela (antes de gerar o PDF).
- Camada 3: lista de relatórios salvos (`relatorios_fase`) para reabrir/reimprimir.
- Limpeza: remover seed `[TESTE]` do banco.

NOTA: o fluxo de avançar fase (`gerarRelatorioFase` em page.tsx) ainda passa o paciente 
sem normalizar EN→PT (`data.name`/`diagnosis`); a aba nova já normaliza. Alinhar quando 
tocar esse caminho.
---

*Para crescer: dá pra mover blocos detalhados (mapa de arquivos, dívida técnica) para `.claude/rules/*.md` (carregados automaticamente) e manter este arquivo conciso.*