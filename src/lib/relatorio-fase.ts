// src/lib/relatorio-fase.ts
// Gera relatório clínico de fase da Jornada Clínica em nova janela para impressão/PDF.

export interface DadosRelatorioFase {
  pacienteNome:        string
  pacienteDiagnostico: string
  pacienteIdade:       string
  terapeutaNome:       string
  conselhoProfissional?: string
  registroProfissional?: string
  fase:                string
  numeroCiclo:         number
  dataInicioFase:      string
  dataFimFase:         string
  totalSessoes:        number
  taxaMedia:           number
  analiseClinica:      string
  recomendacoes:       string
  programas: {
    nome:         string
    dominio:      string
    taxaMedia:    number
    sessoes:      number
    criterio:     boolean
    status:       string
  }[]
  habilidades: {
    dominio:      string
    habilidade:   string
    status:       string
    score:        number
    fonte:        string
  }[]
  comportamentosInterferentes: {
    comportamento: string
    intensidade:   string
    status:        string
  }[]
  radarInicio?: Record<string, number>
  radarFim?:    Record<string, number>
  avaliacoes: {
    protocolo:  string
    dominios:   { nome: string; score: number }[]
  }[]
}

const FASE_LABEL: Record<string, string> = {
  avaliacao:    "Avaliação",
  intervencao:  "Intervenção",
  reavaliacao:  "Reavaliação",
  alta:         "Alta",
}

const STATUS_LABEL: Record<string, string> = {
  dominada:     "Dominada",
  em_aquisicao: "Em aquisição",
  emergente:    "Emergente",
  ausente:      "Ausente",
}

const DOMINIO_PT: Record<string, string> = {
  comunicacao:   "Comunicação",
  social:        "Social",
  atencao:       "Atenção",
  regulacao:     "Regulação",
  brincadeira:   "Brincadeira",
  flexibilidade: "Flexibilidade",
  autonomia:     "Autonomia",
  motivacao:     "Motivação",
}

function corScore(s: number) {
  return s >= 70 ? '#1a7a56' : s >= 40 ? '#a16207' : '#991b1b'
}
function bgScore(s: number) {
  return s >= 70 ? '#d1fae5' : s >= 40 ? '#fef3c7' : '#fee2e2'
}

export function abrirRelatorioFasePDF(dados: DadosRelatorioFase) {
  const win = window.open('', '_blank')
  if (!win) return

  const faseLabel = FASE_LABEL[dados.fase] ?? dados.fase
  const domPorDominio: Record<string, typeof dados.habilidades> = {}
  for (const h of dados.habilidades) {
    if (!domPorDominio[h.dominio]) domPorDominio[h.dominio] = []
    domPorDominio[h.dominio].push(h)
  }

  const radarLinhas = Object.entries(dados.radarFim ?? {}).map(([dom, val]) => {
    const inicio = dados.radarInicio?.[dom] ?? 0
    const diff = val - inicio
    const sinal = diff >= 0 ? `+${diff}` : `${diff}`
    const cor = diff >= 0 ? '#1a7a56' : '#991b1b'
    return `
      <tr>
        <td style="padding:6px 10px;font-size:12px;color:#334155">${DOMINIO_PT[dom] ?? dom}</td>
        <td style="padding:6px 10px;text-align:center;font-size:12px;color:#64748b">${inicio}%</td>
        <td style="padding:6px 10px;text-align:center;font-size:12px;font-weight:700;color:#1e293b">${val}%</td>
        <td style="padding:6px 10px;text-align:center;font-size:12px;font-weight:700;color:${cor}">${sinal}%</td>
      </tr>`
  }).join('')

  const programasHTML = dados.programas.length === 0
    ? '<p style="color:#94a3b8;font-size:12px;text-align:center;padding:16px 0">Nenhum programa trabalhado nesta fase</p>'
    : dados.programas.map(p => `
      <tr>
        <td style="padding:7px 10px;font-size:12px;color:#1e293b;font-weight:500">${p.nome}</td>
        <td style="padding:7px 10px;font-size:11px;color:#64748b">${DOMINIO_PT[p.dominio] ?? p.dominio}</td>
        <td style="padding:7px 10px;text-align:center">
          <span style="background:${bgScore(p.taxaMedia)};color:${corScore(p.taxaMedia)};padding:2px 8px;border-radius:20px;font-size:11px;font-weight:700">${p.taxaMedia}%</span>
        </td>
        <td style="padding:7px 10px;text-align:center;font-size:11px;color:#64748b">${p.sessoes}</td>
        <td style="padding:7px 10px;text-align:center;font-size:11px;color:${p.criterio ? '#1a7a56' : '#94a3b8'};font-weight:${p.criterio ? 700 : 400}">${p.criterio ? 'Atingido' : 'Em progresso'}</td>
      </tr>`).join('')

  const habilidadesHTML = Object.entries(domPorDominio).map(([dom, habs]) => {
    const dominadas = habs.filter(h => h.status === 'dominada').length
    const emAq = habs.filter(h => h.status === 'em_aquisicao').length
    return `
      <div style="margin-bottom:16px">
        <div style="font-size:11px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px;padding-bottom:4px;border-bottom:1px solid #e2e8f0">
          ${DOMINIO_PT[dom] ?? dom} · ${habs.length} habilidades · ${dominadas} dominadas · ${emAq} em aquisição
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:6px">
          ${habs.map(h => `
            <div style="padding:5px 10px;background:${bgScore(h.score)};border-radius:6px;font-size:11px">
              <span style="color:#1e293b;font-weight:500">${h.habilidade}</span>
              <span style="color:${corScore(h.score)};margin-left:6px;font-weight:700">${h.score}%</span>
              <span style="color:#94a3b8;margin-left:4px;font-size:10px">${STATUS_LABEL[h.status] ?? h.status}</span>
              ${h.fonte ? `<span style="color:#94a3b8;margin-left:4px;font-size:9px;text-transform:uppercase">${h.fonte}</span>` : ''}
            </div>`).join('')}
        </div>
      </div>`
  }).join('')

  const comportamentosHTML = dados.comportamentosInterferentes.length === 0
    ? '<p style="color:#94a3b8;font-size:12px;text-align:center;padding:8px 0">Nenhum comportamento interferente identificado</p>'
    : dados.comportamentosInterferentes.map(c => `
      <div style="display:flex;align-items:center;gap:10px;padding:8px 12px;background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;margin-bottom:6px">
        <div style="width:8px;height:8px;border-radius:50%;background:${c.intensidade === 'grave' ? '#dc2626' : c.intensidade === 'moderada' ? '#f59e0b' : '#22c55e'};flex-shrink:0"></div>
        <div style="flex:1;font-size:12px;color:#1e293b;font-weight:500">${c.comportamento}</div>
        <span style="font-size:10px;color:#92400e;text-transform:capitalize">${c.intensidade} · ${c.status}</span>
      </div>`).join('')

  const avaliacoesHTML = dados.avaliacoes.length === 0
    ? '<p style="color:#94a3b8;font-size:12px;text-align:center;padding:8px 0">Nenhuma avaliação formal aplicada nesta fase</p>'
    : dados.avaliacoes.map(av => `
      <div style="margin-bottom:16px">
        <div style="font-size:12px;font-weight:700;color:#1e293b;margin-bottom:8px">${av.protocolo}</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px">
          ${av.dominios.map(d => `
            <div style="padding:4px 10px;background:${bgScore(d.score)};border-radius:6px;font-size:11px">
              <span style="color:#1e293b">${d.nome}</span>
              <span style="color:${corScore(d.score)};margin-left:6px;font-weight:700">${d.score}%</span>
            </div>`).join('')}
        </div>
      </div>`).join('')

  const registroProf = dados.conselhoProfissional && dados.registroProfissional
    ? ` · ${dados.conselhoProfissional} ${dados.registroProfissional}`
    : ''

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Relatório de Fase — ${dados.pacienteNome}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; background:#f8fafc; color:#1e293b; }
  .page { max-width:800px; margin:0 auto; background:#fff; padding:40px; }
  @media print {
    body { background:#fff; }
    .page { padding:20px; box-shadow:none; }
    .no-print { display:none; }
  }
  h2 { font-size:15px; font-weight:700; color:#0f172a; margin-bottom:12px; padding-bottom:6px; border-bottom:2px solid #e2e8f0; }
  table { width:100%; border-collapse:collapse; }
  tr:nth-child(even) { background:#f8fafc; }
  th { background:#f1f5f9; padding:8px 10px; font-size:11px; color:#64748b; text-align:left; font-weight:600; text-transform:uppercase; letter-spacing:.05em; }
</style>
</head>
<body>
<div class="page">

  <!-- Botão imprimir -->
  <div class="no-print" style="text-align:right;margin-bottom:20px">
    <button onclick="window.print()" style="padding:10px 20px;background:#1D9E75;color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer">
      Exportar PDF
    </button>
  </div>

  <!-- Cabeçalho -->
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:28px;padding-bottom:20px;border-bottom:3px solid #1D9E75">
    <div>
      <div style="font-size:11px;font-weight:700;color:#1D9E75;text-transform:uppercase;letter-spacing:.1em;margin-bottom:6px">FractaBehavior · Relatório Clínico</div>
      <div style="font-size:22px;font-weight:800;color:#0f172a;margin-bottom:4px">${faseLabel} — Ciclo ${dados.numeroCiclo}</div>
      <div style="font-size:14px;color:#475569">${dados.dataInicioFase} a ${dados.dataFimFase}</div>
    </div>
    <div style="text-align:right">
      <div style="font-size:11px;color:#94a3b8;margin-bottom:3px">Emitido em ${new Date().toLocaleDateString('pt-BR')}</div>
      <div style="font-size:12px;font-weight:600;color:#1e293b">${dados.terapeutaNome}${registroProf}</div>
    </div>
  </div>

  <!-- Dados do paciente -->
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px">
    <div style="background:#f8fafc;border-radius:10px;padding:16px">
      <div style="font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.07em;margin-bottom:6px">Paciente</div>
      <div style="font-size:16px;font-weight:700;color:#0f172a;margin-bottom:3px">${dados.pacienteNome}</div>
      <div style="font-size:12px;color:#64748b">${dados.pacienteDiagnostico} · ${dados.pacienteIdade}</div>
    </div>
    <div style="background:#f8fafc;border-radius:10px;padding:16px">
      <div style="font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.07em;margin-bottom:8px">Dados da fase</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        ${[
          ['Sessões realizadas', dados.totalSessoes],
          ['Taxa média de acerto', `${Math.round(dados.taxaMedia)}%`],
        ].map(([l,v]) => `
          <div>
            <div style="font-size:10px;color:#94a3b8">${l}</div>
            <div style="font-size:15px;font-weight:700;color:#1D9E75">${v}</div>
          </div>`).join('')}
      </div>
    </div>
  </div>

  <!-- Radar comparativo -->
  ${Object.keys(dados.radarFim ?? {}).length > 0 ? `
  <div style="margin-bottom:24px">
    <h2>Evolução por domínio</h2>
    <table>
      <thead><tr>
        <th>Domínio</th>
        <th style="text-align:center">Início da fase</th>
        <th style="text-align:center">Fim da fase</th>
        <th style="text-align:center">Variação</th>
      </tr></thead>
      <tbody>${radarLinhas}</tbody>
    </table>
  </div>` : ''}

  <!-- Avaliações formais -->
  <div style="margin-bottom:24px">
    <h2>Avaliações formais aplicadas</h2>
    ${avaliacoesHTML}
  </div>

  <!-- Programas trabalhados -->
  <div style="margin-bottom:24px">
    <h2>Programas trabalhados</h2>
    <table>
      <thead><tr>
        <th>Programa</th>
        <th>Domínio</th>
        <th style="text-align:center">Taxa média</th>
        <th style="text-align:center">Sessões</th>
        <th style="text-align:center">Critério</th>
      </tr></thead>
      <tbody>${programasHTML}</tbody>
    </table>
  </div>

  <!-- Repertório de habilidades -->
  <div style="margin-bottom:24px">
    <h2>Repertório de habilidades</h2>
    ${habilidadesHTML || '<p style="color:#94a3b8;font-size:12px;text-align:center;padding:16px 0">Nenhuma habilidade registrada</p>'}
  </div>

  <!-- Comportamentos interferentes -->
  <div style="margin-bottom:24px">
    <h2>Comportamentos interferentes</h2>
    ${comportamentosHTML}
  </div>

  <!-- Análise clínica -->
  <div style="margin-bottom:24px">
    <h2>Análise clínica</h2>
    <div style="background:#f8fafc;border-radius:10px;padding:16px;font-size:13px;color:#334155;line-height:1.7;white-space:pre-wrap">${dados.analiseClinica || 'Não informada.'}</div>
  </div>

  <!-- Recomendações -->
  <div style="margin-bottom:32px">
    <h2>Recomendações para próxima fase</h2>
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:16px;font-size:13px;color:#166534;line-height:1.7;white-space:pre-wrap">${dados.recomendacoes || 'Não informadas.'}</div>
  </div>

  <!-- Assinatura -->
  <div style="border-top:1px solid #e2e8f0;padding-top:20px;display:flex;justify-content:space-between;align-items:flex-end">
    <div style="font-size:11px;color:#94a3b8">Gerado por FractaBehavior · fractabehavior.com</div>
    <div style="text-align:center">
      <div style="width:180px;border-top:1px solid #1e293b;padding-top:6px;font-size:11px;color:#475569">
        ${dados.terapeutaNome}${registroProf}
      </div>
    </div>
  </div>

</div>
<script>window.onload = function(){ }</script>
</body>
</html>`

  win.document.write(html)
  win.document.close()
}
