// Chassi de documento imprimível da Consultoria (HTML → print). Ver ADR-FIT-004.
// Isolado: NÃO usa nada do chassi/documentos do Fracta.

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const PRINT_CSS = `
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #fff; color: #1a2e44;
    font-family: -apple-system, "Helvetica Neue", Arial, sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  @page { size: A4 portrait; margin: 16mm 15mm 18mm; }
  .fit-doc { max-width: 180mm; margin: 0 auto; padding: 4mm 0 0; }
  .fit-doc-header { border-bottom: 2px solid #7c5cfc; padding-bottom: 8px; margin-bottom: 14px; }
  .fit-doc-brand { font-size: 13pt; font-weight: 800; color: #1a2e44; letter-spacing: -.02em; }
  .fit-doc-brand span { color: #7c5cfc; }
  .fit-doc-header h1 { font-size: 17pt; margin: 8px 0 4px; color: #1a2e44; }
  .fit-doc-meta { font-size: 9.5pt; color: #6b7688; }
  .fit-doc-parties { display: flex; gap: 24px; flex-wrap: wrap; font-size: 10pt; margin-bottom: 6px; }
  .fit-doc-section { margin-top: 16px; page-break-inside: avoid; }
  .fit-doc-section h2 { font-size: 11.5pt; color: #7c5cfc; border-bottom: 1px solid #d8def0;
    padding-bottom: 3px; margin: 0 0 8px; }
  table { width: 100%; border-collapse: collapse; }
  th, td { text-align: left; padding: 5px 8px; font-size: 10pt; border-bottom: 1px solid #eceff6; }
  th { color: #6b7688; font-weight: 600; font-size: 9pt; text-transform: uppercase; letter-spacing: .04em; }
  td.val { text-align: right; font-variant-numeric: tabular-nums; }
  .fit-doc-notes { font-size: 10pt; white-space: pre-wrap; line-height: 1.45; }
  .muted { color: #6b7688; }
  .fit-doc-footer { position: fixed; bottom: 8mm; left: 0; right: 0; text-align: center;
    font-size: 8pt; color: #9aa4b5; }
`;

function docShell(bodyHtml: string, title: string, footer: string): string {
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<title>${escapeHtml(title)}</title><style>${PRINT_CSS}</style></head>
<body>${bodyHtml}<div class="fit-doc-footer">${escapeHtml(footer)}</div></body></html>`;
}

// Abre o documento numa janela e dispara a impressão. Retorna false se bloqueado.
export function printDocument(bodyHtml: string, title: string): boolean {
  const win = window.open("", "_blank", "width=900,height=1200");
  if (!win) return false;
  const footer = `Gerado por ConsultoriaFit · ${new Date().toLocaleString("pt-BR")}`;
  win.document.open();
  win.document.write(docShell(bodyHtml, title, footer));
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 350);
  return true;
}
