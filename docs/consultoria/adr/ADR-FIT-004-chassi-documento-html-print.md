# ADR-FIT-004 — Chassi de Documento (HTML → print)

- **Status:** Aceito
- **Data:** 2026-07-04
- **Escopo:** Fracta Consultoria (isolado do Fracta Behavior)
- **Fase:** 9

## Contexto

Os documentos da Consultoria (a começar pelo PDF da avaliação) precisam ser
imprimíveis/salvos como PDF, mantendo isolamento total do Fracta.

## Decisão

Gerar documentos por **HTML → print** (janela same-origin + `window.print()`),
**sem biblioteca nova e sem servidor**. Um **chassi próprio** (`src/lib/fit/fit-doc.ts`)
envolve o corpo HTML num shell de impressão (papel branco, cabeçalho/rodapé, CSS
`@page`, `document.title`). Cada documento fornece só o corpo.

- **Não** reutiliza `chassi-documento.ts` / `relatorio-pdf.ts` do Fracta — chassi
  isolado da Consultoria.
- Geração 100% client-side, a partir de dados já autorizados por RLS. Nada é enviado
  a servidor; a janela é efêmera. O usuário salva como PDF pelo diálogo de impressão.
- Identidade visual própria (branco, tinta `#1a2e44`, acento violeta `#7c5cfc`).

## Consequências

- Sem download `.pdf` de 1 clique (passa pelo diálogo "Salvar como PDF") — aceitável
  no MVP; um lib/servidor seria necessário para download direto ou para salvar o PDF
  no Storage (fora de escopo agora).
- Chassi reutilizável pelos próximos documentos (reavaliação comparada, etc.).
