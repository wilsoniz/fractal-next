// src/lib/chassi-documento.ts
// Chassi de documento Fracta (versão CSS-only, client-side via window.open + print).
// Envolve qualquer conteúdo HTML com identidade Fracta, CSS de impressão refinado
// (paginação sem "buracos") e título correto (mata about:blank).
//
// Usado por TODOS os geradores de PDF da plataforma (relatório de fase, sessão, plano).
//
// LIMITAÇÃO CONHECIDA (plano Vercel Hobby, sem Puppeteer): a marca Fracta aparece com
// destaque no CABEÇALHO DA PRIMEIRA PÁGINA e o rodapé traz numeração "Página X de Y"
// em todas as páginas (via @page counters, bem suportado). A marca repetida em TODAS as
// páginas exige geração server-side (Puppeteer) — migrar quando houver plano Pro.
//
// CLASSES DE PAGINAÇÃO (use no conteúdo):
//   .bloco-coeso → NÃO quebra entre páginas. Use em PARES pequenos que devem ficar juntos
//                  (gráfico+título, narrativa+rótulo). NÃO envolva um card inteiro (vira buraco).
//   (sem classe) → flui livremente; pode quebrar entre páginas (use no card externo).
//
// Uso:
//   const html = envolverComChassi(conteudoInterno, {
//     tituloDocumento: "Relatório de Fase",
//     pacienteNome: "Sebastião",
//     rodapeInfo: "Documento clínico · uso restrito ao profissional responsável",
//   })

export interface OpcoesChassi {
  tituloDocumento: string
  subtitulo?: string
  pacienteNome?: string
  rodapeInfo?: string
  dataEmissao?: string
}

const TEAL = '#1D9E75'
const TINTA = '#1a2e44'
const CINZA = '#64748b'

export function envolverComChassi(conteudoHTML: string, opcoes: OpcoesChassi): string {
  const data = opcoes.dataEmissao ?? new Date().toLocaleDateString('pt-BR')
  const titulo = opcoes.pacienteNome
    ? `${opcoes.tituloDocumento} — ${opcoes.pacienteNome}`
    : opcoes.tituloDocumento
  const rodapeTxt = [opcoes.rodapeInfo, `Emitido em ${data}`].filter(Boolean).join(' · ')

  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8">
<title>${esc(titulo)}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=DM+Mono&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Inter', -apple-system, sans-serif; color: ${TINTA}; background: #fff;
         line-height: 1.5; font-size: 13px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }

  /* Numeração de página no rodapé (garantida em qualquer navegador) */
  @page {
    size: A4;
    margin: 16mm 16mm 18mm 16mm;
    @bottom-center {
      content: "Fracta Behavior · fractabehavior.com          Página " counter(page) " de " counter(pages);
      font-family: 'Inter', sans-serif; font-size: 8px; color: #94a3b8;
    }
  }

  /* Cabeçalho de marca (1ª página — identidade forte) */
  .chassi-topo {
    display: flex; justify-content: space-between; align-items: center;
    padding-bottom: 8px; margin-bottom: 4px; border-bottom: 2px solid ${TEAL};
  }
  .chassi-marca { font-weight: 800; font-size: 15px; color: ${TEAL}; letter-spacing: -0.01em; }
  .chassi-marca span { color: ${TINTA}; font-weight: 600; }
  .chassi-topo-doc { font-size: 9.5px; color: ${CINZA}; text-align: right; }
  .chassi-topo-doc b { display: block; font-size: 10.5px; color: ${TINTA}; font-weight: 600; }

  /* Rodapé visível na tela (no print, o @page cuida) */
  .chassi-rodape-tela { margin-top: 32px; padding-top: 10px; border-top: 1px solid #e2e8f0;
    font-size: 9px; color: #94a3b8; display: flex; justify-content: space-between; }
  .chassi-rodape-tela b { color: ${TEAL}; font-weight: 600; }

  /* Paginação refinada (mata os "buracos") */
  h1, h2, h3 { page-break-after: avoid; break-after: avoid; }
  h2, p { orphans: 3; widows: 3; }
  .bloco-coeso { page-break-inside: avoid; break-inside: avoid; }

  @media screen {
    body { padding: 0; background: #f1f5f9; }
    .pagina { max-width: 760px; margin: 0 auto; background: #fff; padding: 28px 34px;
              box-shadow: 0 1px 8px rgba(0,0,0,.08); }
  }
  @media print {
    .pagina { max-width: none; margin: 0; padding: 0; box-shadow: none; }
    .chassi-rodape-tela { display: none; }   /* no print, o @page @bottom-center cuida */
  }
</style></head><body>
  <div class="pagina">
    <div class="chassi-topo">
      <div class="chassi-marca">Fracta<span>Behavior</span></div>
      <div class="chassi-topo-doc">
        <b>${esc(opcoes.tituloDocumento)}</b>
        ${opcoes.pacienteNome ? esc(opcoes.pacienteNome) + ' · ' : ''}${esc(data)}
      </div>
    </div>

    ${conteudoHTML}

    <div class="chassi-rodape-tela">
      <span><b>Fracta Behavior</b> · fractabehavior.com</span>
      <span>${esc(rodapeTxt)}</span>
    </div>
  </div>
</body></html>`
}

function esc(s: string): string {
  return (s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
