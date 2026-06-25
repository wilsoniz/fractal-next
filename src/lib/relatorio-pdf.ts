// src/lib/relatorio-pdf.ts
// Abre o relatório de sessão em nova janela isolada para impressão/PDF.
// Reutilizável na tela de encerramento e no histórico do paciente.

export interface DadosRelatorio {
  sessaoId:          string
  pacienteNome:      string
  data:              string   // "01/06/2026"
  horario:           string   // "15:05"
  duracao:           string   // "01:43"
  duracaoContratada: number   // minutos
  tipo:              string
  local:             string
  terapeutaNome:     string
  conselhoProfissional?: string
  registroProfissional?: string
  familiaComunicada: boolean
  taxaGeral:         number
  totalOperantes:    number
  programas: {
    nome:          string
    dominio:       string
    taxa:          number
    total:         number
    acertos:       number
    independencia: number
    criterio:      boolean
    seq:           string        // "CCEECCC"
    nivelPredominante?: string
  }[]
  avaliacoes: {
    nome:      string
    registros: number
  }[]
  eventos: {
    label:     string
    tipo:      string
    timestamp: number
  }[]
  encaminhamentos?: {
    programaNome: string
    acao:         string
    prioridade:   string
  }[]
  analiseClinica?:  string
  decisaoProxima?:  string[]
  notaDecisao?:     string
  notaEncerramento?: string
  analiseClinica?:   string
  decisaoProxima?:   string[]
  notaDecisao?:      string
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function corTaxa(taxa: number): string {
  return taxa >= 80 ? '#1a7a56' : taxa >= 50 ? '#a16207' : '#991b1b'
}

function bgTaxa(taxa: number): string {
  return taxa >= 80 ? '#d1fae5' : taxa >= 50 ? '#fef3c7' : '#fee2e2'
}

function bordaTaxa(taxa: number): string {
  return taxa >= 80 ? '#a7f3d0' : taxa >= 50 ? '#fde68a' : '#fecaca'
}

function badgeLabel(taxa: number, criterio: boolean): string {
  if (criterio || taxa >= 80) return 'Critério atingido'
  if (taxa >= 50) return 'Em aquisição'
  return 'Abaixo do critério'
}

function seqChips(seq: string): string {
  return seq.split('').map(c =>
    c === 'C'
      ? `<div class="chip chip-c">C</div>`
      : `<div class="chip chip-e">E</div>`
  ).join('')
}

function eventoIcone(tipo: string): { icone: string; bg: string; cor: string } {
  const map: Record<string, { icone: string; bg: string; cor: string }> = {
    assent_given:     { icone: '✓', bg: '#d1fae5', cor: '#065f46' },
    assent_revoked:   { icone: '✗', bg: '#fee2e2', cor: '#991b1b' },
    assent_recovered: { icone: '↺', bg: '#d1fae5', cor: '#065f46' },
    avoidance_signal: { icone: '!', bg: '#fef3c7', cor: '#92400e' },
    distress_signal:  { icone: '⚠', bg: '#fef3c7', cor: '#92400e' },
    break_requested:  { icone: '⏸', bg: '#e0e7ff', cor: '#3730a3' },
    session_paused:   { icone: '⏸', bg: '#e0e7ff', cor: '#3730a3' },
    session_resumed:  { icone: '▶', bg: '#d1fae5', cor: '#065f46' },
  }
  return map[tipo] ?? { icone: '·', bg: '#f1f5f9', cor: '#64748b' }
}

function fmt(segundos: number): string {
  const m = Math.floor(segundos / 60)
  const s = segundos % 60
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
}

// ─── GERADOR HTML ─────────────────────────────────────────────────────────────

function gerarHTML(d: DadosRelatorio): string {
  const registroProfStr = d.conselhoProfissional && d.registroProfissional
    ? ` · ${d.conselhoProfissional} ${d.registroProfissional}`
    : ''

  const programasHTML = d.programas.map(p => `
    <div class="programa">
      <div class="programa-header">
        <div>
          <div class="programa-nome">${p.nome}</div>
          <div class="programa-dominio">${p.dominio} · ${p.total} tentativas</div>
        </div>
        <div>
          <div class="programa-taxa" style="color:${corTaxa(p.taxa)}">${p.taxa}%</div>
          <div class="programa-taxa-label">acerto</div>
          <div style="margin-top:4px;text-align:right;">
            <span class="badge" style="background:${bgTaxa(p.taxa)};color:${corTaxa(p.taxa)};border-color:${bordaTaxa(p.taxa)}">
              ${badgeLabel(p.taxa, p.criterio)}
            </span>
          </div>
        </div>
      </div>
      <div class="programa-corpo">
        <div>
          <div class="prog-dado-label">Independência</div>
          <div class="prog-dado-valor">${p.independencia}%</div>
        </div>
        <div>
          <div class="prog-dado-label">Nível de ajuda predominante</div>
          <div class="prog-dado-valor">${p.nivelPredominante ?? '—'}</div>
        </div>
        <div>
          <div class="prog-dado-label">Tentativas</div>
          <div class="prog-dado-valor">${p.acertos} / ${p.total}</div>
        </div>
        ${p.seq ? `
        <div class="prog-sequencia">
          <div class="seq-label">Sequência de tentativas</div>
          <div class="seq-chips">${seqChips(p.seq)}</div>
        </div>` : ''}
      </div>
    </div>
  `).join('')

  const avaliacoesHTML = d.avaliacoes.length > 0 ? d.avaliacoes.map(a => `
    <div style="padding:10px 14px;background:#f7f9fc;border:1px solid #e2e8f0;border-radius:8px;display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
      <div>
        <div style="font-weight:600;font-size:13px;color:#1a2332;">${a.nome}</div>
        <div style="font-size:11px;color:#718096;margin-top:2px;">${a.registros} registro(s)</div>
      </div>
      <span style="padding:2px 8px;border-radius:20px;font-size:10px;font-weight:600;background:#ede9fe;color:#4c1d95;border:1px solid #c4b5fd;">Avaliação</span>
    </div>
  `).join('') : '<div style="font-size:12px;color:#718096;">Nenhuma avaliação aplicada</div>'

  const eventosHTML = d.eventos.length > 0 ? d.eventos.map(ev => {
    const cfg = eventoIcone(ev.tipo)
    const hora = ev.timestamp ? new Date(ev.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '—'
    return `
      <div class="evento">
        <div class="evento-icone" style="background:${cfg.bg};color:${cfg.cor};">${cfg.icone}</div>
        <div class="evento-label">${ev.label}</div>
        <div class="evento-hora">${hora}</div>
      </div>
    `
  }).join('') : '<div style="font-size:12px;color:#718096;">Nenhum evento registrado</div>'

  const encaminhamentosHTML = d.encaminhamentos && d.encaminhamentos.length > 0 ? `
    <div class="secao">
      <div class="secao-titulo">Encaminhamentos (${d.encaminhamentos.length})</div>
      ${d.encaminhamentos.map(enc => {
        const corPrior = enc.prioridade === 'alta' ? '#991b1b' : enc.prioridade === 'media' ? '#92400e' : '#065f46'
        const bgPrior  = enc.prioridade === 'alta' ? '#fee2e2' : enc.prioridade === 'media' ? '#fef3c7' : '#d1fae5'
        return `
          <div style="padding:10px 14px;background:#f7f9fc;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:8px;display:flex;gap:10px;align-items:flex-start;">
            <span style="padding:2px 8px;border-radius:20px;font-size:10px;font-weight:700;background:${bgPrior};color:${corPrior};flex-shrink:0;margin-top:1px;">${enc.prioridade.toUpperCase()}</span>
            <div>
              ${enc.programaNome ? `<div style="font-size:11px;font-weight:600;color:#4c1d95;margin-bottom:2px;">${enc.programaNome}</div>` : ''}
              <div style="font-size:13px;color:#1a2332;">${enc.acao}</div>
            </div>
          </div>
        `
      }).join('')}
    </div>
  ` : ''

  const analiseHTML = d.analiseClinica ? `
    <div class="secao">
      <div class="secao-titulo">Análise Clínica</div>
      <div class="texto-clinico">${d.analiseClinica}</div>
    </div>
  ` : ''

  const decisaoHTML = (d.decisaoProxima && d.decisaoProxima.length > 0) || d.notaDecisao ? `
    <div class="secao">
      <div class="secao-titulo">Plano para Próxima Sessão</div>
      ${d.decisaoProxima && d.decisaoProxima.length > 0 ? `
        <div class="decisoes">
          ${d.decisaoProxima.map(dec => `
            <div class="decisao-item">
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5L8 3" stroke="#065f46" stroke-width="1.5" stroke-linecap="round"/></svg>
              ${dec}
            </div>
          `).join('')}
        </div>
      ` : ''}
      ${d.notaDecisao ? `<div class="nota-decisao">${d.notaDecisao}</div>` : ''}
    </div>
  ` : ''

  const obsHTML = d.notaEncerramento ? `
    <div class="secao">
      <div class="secao-titulo">Observações de Encerramento</div>
      <div class="texto-clinico" style="border-left-color:#378ADD;">${d.notaEncerramento}</div>
    </div>
  ` : ''

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Relatório de Sessão — ${d.pacienteNome} — ${d.data}</title>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
  :root {
    --verde:#1D9E75; --azul:#378ADD; --lilas:#8B7FE8;
    --text:#1a2332; --text-2:#4a5568; --text-3:#718096;
    --borda:#e2e8f0; --fundo:#f7f9fc; --branco:#ffffff;
  }
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'DM Sans',sans-serif;font-size:13px;color:var(--text);background:var(--fundo);line-height:1.6;}

  .screen-bar{background:#07111f;padding:12px 24px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:100;}
  .screen-bar span{color:rgba(255,255,255,.4);font-size:12px;}
  .btn-print{padding:8px 18px;border-radius:8px;border:none;background:#1D9E75;color:#07111f;font-family:'DM Sans',sans-serif;font-weight:700;font-size:13px;cursor:pointer;}

  .documento{max-width:800px;margin:28px auto;background:var(--branco);border-radius:4px;box-shadow:0 2px 20px rgba(0,0,0,.08);overflow:hidden;}

  .cabecalho{padding:28px 36px 20px;border-bottom:3px solid var(--verde);display:grid;grid-template-columns:1fr auto;align-items:start;gap:20px;}
  .marca{display:flex;align-items:center;gap:10px;margin-bottom:14px;}
  .marca-icone{width:34px;height:34px;border-radius:8px;background:linear-gradient(135deg,#1D9E75,#378ADD);display:flex;align-items:center;justify-content:center;}
  .marca-nome{font-size:15px;font-weight:700;color:var(--text);letter-spacing:-.02em;}
  .marca-sub{font-size:10px;color:var(--text-3);margin-top:1px;}
  .doc-titulo{font-size:18px;font-weight:700;color:var(--text);letter-spacing:-.02em;margin-bottom:3px;}
  .doc-subtitulo{font-size:11px;color:var(--text-3);text-transform:uppercase;letter-spacing:.07em;font-weight:500;}
  .doc-id-label{font-size:10px;color:var(--text-3);text-transform:uppercase;letter-spacing:.07em;margin-bottom:3px;}
  .doc-id-valor{font-family:'DM Mono',monospace;font-size:10px;color:var(--text-2);background:var(--fundo);padding:3px 8px;border-radius:4px;border:1px solid var(--borda);}

  .metadados{padding:18px 36px;background:var(--fundo);border-bottom:1px solid var(--borda);display:grid;grid-template-columns:repeat(3,1fr);gap:16px;}
  .meta-label{font-size:10px;font-weight:600;color:var(--text-3);text-transform:uppercase;letter-spacing:.07em;margin-bottom:2px;}
  .meta-valor{font-size:13px;color:var(--text);font-weight:500;}

  .kpis{padding:16px 36px;border-bottom:1px solid var(--borda);display:grid;grid-template-columns:repeat(4,1fr);gap:10px;}
  .kpi{background:var(--fundo);border:1px solid var(--borda);border-radius:8px;padding:12px 14px;text-align:center;}
  .kpi-valor{font-size:20px;font-weight:700;line-height:1;margin-bottom:3px;}
  .kpi-label{font-size:10px;color:var(--text-3);font-weight:500;}

  .corpo{padding:28px 36px;display:flex;flex-direction:column;gap:24px;}
  .secao{}
  .secao-titulo{font-size:10px;font-weight:700;color:var(--text-3);text-transform:uppercase;letter-spacing:.1em;padding-bottom:7px;border-bottom:1px solid var(--borda);margin-bottom:12px;display:flex;align-items:center;gap:7px;}
  .secao-titulo::before{content:'';display:inline-block;width:3px;height:11px;border-radius:2px;background:var(--verde);}

  .programa{border:1px solid var(--borda);border-radius:8px;overflow:hidden;margin-bottom:10px;}
  .programa:last-child{margin-bottom:0;}
  .programa-header{padding:11px 14px;background:var(--fundo);border-bottom:1px solid var(--borda);display:flex;align-items:center;justify-content:space-between;}
  .programa-nome{font-weight:600;font-size:13px;color:var(--text);}
  .programa-dominio{font-size:11px;color:var(--text-3);margin-top:2px;}
  .programa-taxa{font-size:18px;font-weight:700;text-align:right;}
  .programa-taxa-label{font-size:10px;color:var(--text-3);text-align:right;margin-top:1px;}
  .programa-corpo{padding:11px 14px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;}
  .prog-dado-label{font-size:10px;color:var(--text-3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:2px;}
  .prog-dado-valor{font-size:13px;font-weight:600;color:var(--text);}
  .prog-sequencia{grid-column:1/-1;padding-top:9px;border-top:1px solid var(--borda);}
  .seq-label{font-size:10px;color:var(--text-3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:5px;}
  .seq-chips{display:flex;gap:3px;flex-wrap:wrap;}
  .chip{width:20px;height:20px;border-radius:3px;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;font-family:'DM Mono',monospace;}
  .chip-c{background:#d1fae5;color:#065f46;border:1px solid #a7f3d0;}
  .chip-e{background:#fee2e2;color:#991b1b;border:1px solid #fecaca;}
  .badge{display:inline-flex;align-items:center;padding:2px 7px;border-radius:20px;font-size:9px;font-weight:600;border:1px solid;}

  .eventos-lista{display:flex;flex-direction:column;gap:5px;}
  .evento{display:flex;align-items:center;gap:9px;padding:7px 11px;border-radius:6px;border:1px solid var(--borda);background:var(--fundo);}
  .evento-icone{width:22px;height:22px;border-radius:5px;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;flex-shrink:0;}
  .evento-label{font-size:12px;color:var(--text);flex:1;}
  .evento-hora{font-size:10px;color:var(--text-3);font-family:'DM Mono',monospace;}

  .texto-clinico{font-size:13px;color:var(--text-2);line-height:1.75;padding:12px 14px;background:var(--fundo);border:1px solid var(--borda);border-radius:8px;border-left:3px solid var(--verde);}
  .decisoes{display:flex;flex-wrap:wrap;gap:7px;margin-bottom:9px;}
  .decisao-item{display:flex;align-items:center;gap:5px;padding:4px 11px;border-radius:20px;border:1px solid #a7f3d0;background:#d1fae5;font-size:11px;font-weight:600;color:#065f46;}
  .nota-decisao{font-size:12px;color:var(--text-2);line-height:1.65;padding:9px 12px;background:var(--fundo);border:1px solid var(--borda);border-radius:6px;font-style:italic;}

  .assinatura{padding:20px 36px;border-top:1px solid var(--borda);display:grid;grid-template-columns:1fr 1fr;gap:36px;}
  .assinatura-label{font-size:10px;color:var(--text-3);text-transform:uppercase;letter-spacing:.07em;margin-bottom:10px;}
  .assinatura-linha{border-bottom:1px solid var(--text);margin-bottom:7px;height:28px;}
  .assinatura-nome{font-size:13px;font-weight:600;color:var(--text);margin-bottom:2px;}
  .assinatura-registro{font-size:10px;color:var(--text-3);font-family:'DM Mono',monospace;}

  .rodape{padding:12px 36px;background:#07111f;display:flex;align-items:center;justify-content:space-between;}
  .rodape-marca{font-size:11px;color:rgba(255,255,255,.4);font-weight:600;}
  .rodape-marca span{color:#1D9E75;}
  .rodape-info{font-size:9px;color:rgba(255,255,255,.2);font-family:'DM Mono',monospace;text-align:right;}

  @media print {
    @page{size:A4;margin:12mm 14mm;}
    body{background:#fff;font-size:11px;}
    .screen-bar{display:none!important;}
    .documento{max-width:100%;margin:0;box-shadow:none;border-radius:0;}
    .cabecalho{padding:18px 24px 14px;}
    .metadados{padding:12px 24px;}
    .kpis{padding:12px 24px;}
    .corpo{padding:18px 24px;gap:18px;}
    .assinatura{padding:14px 24px;}
    .rodape{padding:9px 24px;}
    .kpi-valor{font-size:16px;}
    .programa{page-break-inside:avoid;}
    .secao{page-break-inside:avoid;}
    .assinatura{page-break-inside:avoid;}
    .rodape{page-break-inside:avoid;}
  }
</style>
</head>
<body>

<div class="screen-bar">
  <span>Relatório · ${d.pacienteNome} · ${d.data}</span>
  <button class="btn-print" onclick="window.print()">Exportar PDF</button>
</div>

<div class="documento">

  <div class="cabecalho">
    <div>
      <div class="marca">
        <div class="marca-icone">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
          </svg>
        </div>
        <div>
          <div class="marca-nome">FractaBehavior</div>
          <div class="marca-sub">Plataforma Clínica ABA</div>
        </div>
      </div>
      <div class="doc-titulo">Relatório de Evolução de Sessão ABA</div>
      <div class="doc-subtitulo">Documento clínico · Uso restrito ao profissional responsável</div>
    </div>
    <div style="text-align:right;">
      <div class="doc-id-label">ID do documento</div>
      <div class="doc-id-valor">${d.sessaoId.slice(0, 8)}…</div>
      <div style="margin-top:7px;">
        <div class="doc-id-label">Emissão</div>
        <div class="doc-id-valor">${d.data} ${d.horario}</div>
      </div>
    </div>
  </div>

  <div class="metadados">
    <div>
      <div style="margin-bottom:12px;">
        <div class="meta-label">Paciente</div>
        <div class="meta-valor">${d.pacienteNome}</div>
      </div>
    </div>
    <div>
      <div style="margin-bottom:12px;">
        <div class="meta-label">Data · Horário · Duração</div>
        <div class="meta-valor">${d.data} · ${d.horario} · ${d.duracao}</div>
      </div>
      <div>
        <div class="meta-label">Tipo · Local</div>
        <div class="meta-valor">${d.tipo} · ${d.local}</div>
      </div>
    </div>
    <div>
      <div style="margin-bottom:12px;">
        <div class="meta-label">Terapeuta responsável</div>
        <div class="meta-valor">${d.terapeutaNome}</div>
      </div>
      ${registroProfStr ? `
      <div>
        <div class="meta-label">Registro profissional</div>
        <div class="meta-valor" style="font-family:'DM Mono',monospace;font-size:12px;">${d.conselhoProfissional} ${d.registroProfissional}</div>
      </div>` : ''}
    </div>
  </div>

  <div class="kpis">
    <div class="kpi">
      <div class="kpi-valor" style="color:${corTaxa(d.taxaGeral)}">${d.taxaGeral}%</div>
      <div class="kpi-label">Taxa geral de acerto</div>
    </div>
    <div class="kpi">
      <div class="kpi-valor" style="color:#378ADD">${d.totalOperantes}</div>
      <div class="kpi-label">Operantes registrados</div>
    </div>
    <div class="kpi">
      <div class="kpi-valor" style="color:#8B7FE8">${d.eventos.length}</div>
      <div class="kpi-label">Eventos clínicos</div>
    </div>
    <div class="kpi">
      <div class="kpi-valor" style="color:${d.familiaComunicada ? '#1D9E75' : '#E05A4B'}">${d.familiaComunicada ? 'Sim' : 'Não'}</div>
      <div class="kpi-label">Família comunicada</div>
    </div>
  </div>

  <div class="corpo">

    <div class="secao">
      <div class="secao-titulo">Programas Aplicados (${d.programas.length})</div>
      ${d.programas.length > 0 ? programasHTML : '<div style="font-size:12px;color:#718096;">Nenhum programa aplicado</div>'}
    </div>

    <div class="secao">
      <div class="secao-titulo">Avaliações (${d.avaliacoes.length})</div>
      ${avaliacoesHTML}
    </div>

    <div class="secao">
      <div class="secao-titulo">Eventos Clínicos (${d.eventos.length})</div>
      <div class="eventos-lista">${eventosHTML}</div>
    </div>

    ${encaminhamentosHTML}
    ${analiseHTML}
    ${decisaoHTML}
    ${obsHTML}

  </div>

  <div style="height:1px;background:var(--borda);margin:0 36px;"></div>

  <div class="assinatura">
    <div>
      <div class="assinatura-label">Terapeuta responsável</div>
      <div class="assinatura-linha"></div>
      <div class="assinatura-nome">${d.terapeutaNome}</div>
      <div class="assinatura-registro">${registroProfStr ? `${d.conselhoProfissional} ${d.registroProfissional}` : 'Registro profissional não informado'}</div>
    </div>
    <div>
      <div class="assinatura-label">Responsável pelo paciente</div>
      <div class="assinatura-linha"></div>
      <div class="assinatura-nome">__________________________</div>
      <div class="assinatura-registro">Assinatura e data</div>
    </div>
  </div>

  <div class="rodape">
    <div class="rodape-marca"><span>Fracta</span>Behavior · fractabehavior.com</div>
    <div class="rodape-info">
      ID ${d.sessaoId}<br>
      Documento gerado automaticamente · validade mediante assinatura do profissional
    </div>
  </div>

</div>
<script>
  // Foca na janela para facilitar Cmd+P imediato
  window.focus()
</script>
</body>
</html>`
}

// ─── FUNÇÃO PÚBLICA ───────────────────────────────────────────────────────────

export function abrirRelatorioPDF(dados: DadosRelatorio): void {
  const html = gerarHTML(dados)
  const janela = window.open('', '_blank', 'width=900,height=800')
  if (!janela) {
    alert('O navegador bloqueou a abertura da janela. Permita pop-ups para fractabehavior.com.')
    return
  }
  janela.document.write(html)
  janela.document.close()
}

// ─── HELPER PARA CONSTRUIR DadosRelatorio A PARTIR DO session_summary ─────────
// Usado no histórico do paciente (tabs.tsx)

export function dadosDoSummary(
  summary: {
    id?: string
    sessao_id: string
    taxa_geral: number | null
    total_operantes: number | null
    programas_json: any[]
    eventos_json: any[]
    familia_comunicada: boolean
    nota_encerramento: string | null
    analise_clinica?: string | null
    decisao_proxima?: string[] | null
    nota_decisao?: string | null
  },
  sessao: {
    inicio: string
    tipo: string
    duracao_segundos: number
  },
  terapeuta: {
    nome: string
    conselho_profissional?: string
    registro_profissional?: string
  },
  pacienteNome: string
): DadosRelatorio {
  const inicio = new Date(sessao.inicio)

  const programas = (summary.programas_json ?? [])
    .filter((p: any) => p.area === 'intervencao' || p.tipo === 'intervention')
    .map((p: any) => ({
      nome:              p.nome ?? '—',
      dominio:           p.dominio ?? '—',
      taxa:              p.taxa ?? 0,
      total:             p.total ?? 0,
      acertos:           p.acertos ?? 0,
      independencia:     p.independencia ?? 0,
      criterio:          p.criterio ?? false,
      seq:               p.seq ?? '',
      nivelPredominante: p.nivelPredominante,
    }))

  const avaliacoes = (summary.programas_json ?? [])
    .filter((p: any) => p.area === 'avaliacao' || p.tipo === 'assessment')
    .map((p: any) => ({
      nome:      p.nome ?? '—',
      registros: p.total ?? 0,
    }))

  const eventos = (summary.eventos_json ?? []).map((e: any) => ({
    label:     e.label ?? e.tipo,
    tipo:      e.tipo ?? '',
    timestamp: e.timestamp ?? 0,
  }))

  return {
    sessaoId:          summary.sessao_id,
    pacienteNome,
    data:              inicio.toLocaleDateString('pt-BR'),
    horario:           inicio.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    duracao:           fmt(sessao.duracao_segundos),
    duracaoContratada: 60,
    tipo:              sessao.tipo,
    local:             'presencial',
    terapeutaNome:     terapeuta.nome,
    conselhoProfissional: terapeuta.conselho_profissional,
    registroProfissional: terapeuta.registro_profissional,
    familiaComunicada: summary.familia_comunicada,
    taxaGeral:         summary.taxa_geral ?? 0,
    totalOperantes:    summary.total_operantes ?? 0,
    programas,
    avaliacoes,
    eventos,
    notaEncerramento:  summary.nota_encerramento ?? undefined,
    analiseClinica:    summary.analise_clinica ?? undefined,
    decisaoProxima:    summary.decisao_proxima ?? undefined,
    notaDecisao:       summary.nota_decisao ?? undefined,
  }
}
