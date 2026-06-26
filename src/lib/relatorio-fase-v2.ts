// src/lib/relatorio-fase-v2.ts
// Relatório de Fase nível BCBA — análise single-case por programa.
// Substitui o relatorio-fase.ts (amontoado) seguindo o spec aprovado.
//
// Arquitetura:
//   1. reconstruirSeries() — transforma tentativas cruas em séries por sessão (PURA, testável)
//   2. analisarProgramas() — roda o motor sobre as séries → métricas + narrativa (PURA)
//   3. montarDadosRelatorioFase() — orquestra queries Supabase + 1 e 2 (I/O)
//   4. gerarHTMLRelatorioFase() — monta o documento HTML (PURA)
//   5. abrirRelatorioFaseV2() — abre janela p/ impressão/PDF (I/O)

import {
    analisarFase, calcularPND, gerarNarrativa, projetarSessoesAteMastery,
    type MetricasFase, type ComparacaoFases, type DirecaoAlvo,
} from './analise-single-case'
import { gerarGraficoSVG, type PontoSerie } from './grafico-evolucao'
import { gerarNarrativaAcessivel } from './narrativa-acessivel'

// ── Contrato de dados ────────────────────────────────────────────────────────

export interface TentativaCrua {
    sessao_id: string
    sessao_data: string         // ISO
    phase: string               // baseline | intervention | ...
    prompt_level_used: string | null
    correto: boolean | null
    contador: number | null
    duracao_seg: number | null
    latencia_seg: number | null
}

export interface ProgramaFonte {
    nome: string
    dominio: string
    dominio_aba: string
    tipo_registro: string       // dtt | frequencia | duracao | latencia | task_analysis | matching
    criterio_percentual: number | null
    mastery_min_independence: number | null
    meta_frequencia: number | null
    meta_latencia_seg: number | null
    meta_duracao_seg: number | null
    tentativas: TentativaCrua[]
}

export interface AnaliseProgramaRelatorio {
    nome: string
    dominio: string
    tipoRegistro: string
    medidaLabel: string
    direcao: DirecaoAlvo
    estrutura: 'duas_fases' | 'fase_unica'
    serie: PontoSerie[]
    metricas: MetricasFase
    comparacao?: ComparacaoFases
    masterySessao: number | null
    projecaoSessoes: number | null
    criterio: number | null
    narrativa: string           // técnica (gerada, editável)
    narrativaAcessivel: string  // linguagem para famílias (gerada, editável)
    svg: string                 // gráfico inline
    unidadeMedida: string       // p/ narrativa acessível: '%', 'vezes por sessão', 's'
}

// ── 1. Reconstrução de séries (PURA) ─────────────────────────────────────────

// Define a medida principal de cada sessão conforme o tipo de registro do programa.
// Retorna { sessao_id, data, phase, valor } por sessão, ordenado por data.
interface PontoSessao { sessao_id: string; data: string; phase: string; valor: number }

export function reconstruirSerie(prog: ProgramaFonte): PontoSessao[] {
    // agrupa tentativas por sessão
    const porSessao = new Map<string, TentativaCrua[]>()
    for (const t of prog.tentativas) {
        if (!porSessao.has(t.sessao_id)) porSessao.set(t.sessao_id, [])
        porSessao.get(t.sessao_id)!.push(t)
    }
    const pontos: PontoSessao[] = []
    for (const [sessaoId, tents] of porSessao) {
        const data = tents[0].sessao_data
        const phase = tents[0].phase ?? 'intervention'
        let valor = 0
        switch (prog.tipo_registro) {
            case 'dtt':
            case 'matching':
            case 'task_analysis': {
                // % de independência: tentativas independentes E corretas / total
                const total = tents.length
                const indep = tents.filter(t => t.prompt_level_used === 'independente' && t.correto).length
                valor = total > 0 ? Math.round((indep / total) * 100) : 0
                break
            }
            case 'frequencia': {
                // soma dos contadores da sessão (ou média se múltiplos registros)
                const cnts = tents.map(t => t.contador ?? 0)
                valor = cnts.reduce((a, b) => a + b, 0)
                break
            }
            case 'duracao': {
                const durs = tents.map(t => t.duracao_seg ?? 0).filter(d => d > 0)
                valor = durs.length ? Math.round(durs.reduce((a, b) => a + b, 0) / durs.length) : 0
                break
            }
            case 'latencia': {
                const lats = tents.map(t => t.latencia_seg ?? 0).filter(l => l > 0)
                valor = lats.length ? Math.round((lats.reduce((a, b) => a + b, 0) / lats.length) * 10) / 10 : 0
                break
            }
            default: {
                // fallback: % de acerto
                const total = tents.length
                const acertos = tents.filter(t => t.correto).length
                valor = total > 0 ? Math.round((acertos / total) * 100) : 0
            }
        }
        pontos.push({ sessao_id: sessaoId, data, phase, valor })
    }
    pontos.sort((a, b) => a.data.localeCompare(b.data))
    return pontos
}

// Metadados de apresentação por tipo de registro
export function medidaInfo(tipoRegistro: string): { label: string; direcao: DirecaoAlvo } {
    switch (tipoRegistro) {
        case 'dtt':
        case 'matching':
        case 'task_analysis':
            return { label: '% Independência', direcao: 'aumentar' }
        case 'frequencia':
            return { label: 'Frequência', direcao: 'reduzir' } // problema-alvo costuma ser reduzir
        case 'duracao':
            return { label: 'Duração (s)', direcao: 'reduzir' }
        case 'latencia':
            return { label: 'Latência (s)', direcao: 'reduzir' }
        default:
            return { label: '% Acerto', direcao: 'aumentar' }
    }
}

// ── 2. Análise dos programas (PURA) ──────────────────────────────────────────

export function analisarPrograma(prog: ProgramaFonte): AnaliseProgramaRelatorio {
    const { label, direcao } = medidaInfo(prog.tipo_registro)
    const pontos = reconstruirSerie(prog)

    // separa baseline e intervenção
    const baseline = pontos.filter(p => p.phase === 'baseline')
    const intervencao = pontos.filter(p => p.phase === 'intervention')
    const temBaseline = baseline.length >= 2 && intervencao.length >= 1
    const estrutura: 'duas_fases' | 'fase_unica' = temBaseline ? 'duas_fases' : 'fase_unica'

    // série para o gráfico (numera sessões 1..n na ordem)
    const serieGrafico: PontoSerie[] = pontos.map((p, i) => ({
        sessao: i + 1,
        valor: p.valor,
        fase: p.phase === 'baseline' ? 'baseline' : 'intervention',
    }))

    // métricas: analisa a fase de intervenção (ou a série toda se fase única)
    const valoresInterv = (temBaseline ? intervencao : pontos).map(p => p.valor)
    const metricas = analisarFase(valoresInterv, direcao)

    let comparacao: ComparacaoFases | undefined
    if (temBaseline) {
        comparacao = calcularPND(baseline.map(p => p.valor), intervencao.map(p => p.valor), direcao)
    }

    // critério e mastery
    const criterio = prog.tipo_registro === 'dtt' || prog.tipo_registro === 'matching' || prog.tipo_registro === 'task_analysis'
        ? (prog.mastery_min_independence ?? prog.criterio_percentual ?? 80)
        : prog.tipo_registro === 'frequencia' ? (prog.meta_frequencia ?? null)
            : prog.tipo_registro === 'latencia' ? (prog.meta_latencia_seg ?? null)
                : prog.tipo_registro === 'duracao' ? (prog.meta_duracao_seg ?? null)
                    : prog.criterio_percentual ?? null

    // mastery: 1ª sessão (1-based, na série do gráfico) que atinge e sustenta o critério
    let masterySessao: number | null = null
    if (criterio !== null) {
        const consec = prog.mastery_min_independence ? 2 : 2
        for (let i = 0; i < serieGrafico.length; i++) {
            const janela = serieGrafico.slice(i, i + consec)
            if (janela.length < consec) break
            const atingiu = direcao === 'aumentar'
                ? janela.every(p => p.valor >= criterio)
                : janela.every(p => p.valor <= criterio)
            if (atingiu) { masterySessao = i + 1; break }
        }
    }

    const projecaoSessoes = (masterySessao === null && criterio !== null)
        ? projetarSessoesAteMastery(metricas, direcao, criterio)
        : null

    const narrativa = gerarNarrativa(metricas, direcao, label.replace('% ', '').toLowerCase(), comparacao, masterySessao)

    // narrativa acessível (para famílias)
    const ehHabilidade = direcao === 'aumentar'
    const unidadeMedida = prog.tipo_registro === 'frequencia' ? 'vezes por sessão'
        : prog.tipo_registro === 'latencia' ? 'segundos'
            : prog.tipo_registro === 'duracao' ? 'segundos'
                : '%'
    const nomeMedidaAcessivel = ehHabilidade
        ? (prog.tipo_registro === 'dtt' || prog.tipo_registro === 'matching' || prog.tipo_registro === 'task_analysis' ? 'a independência' : 'o desempenho')
        : `o comportamento de ${prog.nome.replace(/^\[TESTE\]\s*/, '').toLowerCase()}`
    const valores = serieGrafico.map(p => p.valor)
    const narrativaAcessivel = gerarNarrativaAcessivel({
        medidaNome: nomeMedidaAcessivel, direcao, metricas, comparacao,
        primeiroValor: valores[0], ultimoValor: valores[valores.length - 1],
        masterySessao, unidade: unidadeMedida, ehHabilidade,
    })

    // gráfico
    const n = valoresInterv.length
    const mx = (n - 1) / 2
    const my = valoresInterv.reduce((a, b) => a + b, 0) / (n || 1)
    const intercept = my - metricas.slope * mx
    const svg = gerarGraficoSVG(serieGrafico, {
        titulo: prog.nome,
        labelY: label,
        criterio: criterio ?? undefined,
        mudancaFaseAposIndex: temBaseline ? baseline.length - 1 : undefined,
        slope: estrutura === 'fase_unica' ? metricas.slope : undefined,
        intercept: estrutura === 'fase_unica' ? intercept : undefined,
    })

    return {
        nome: prog.nome, dominio: prog.dominio, tipoRegistro: prog.tipo_registro,
        medidaLabel: label, direcao, estrutura, serie: serieGrafico, metricas,
        comparacao, masterySessao, projecaoSessoes, criterio, narrativa,
        narrativaAcessivel, svg, unidadeMedida,
    }
}

// ── 4. Geração de HTML (PURA) ────────────────────────────────────────────────

export interface CabecalhoFase {
    pacienteNome: string
    pacienteDiagnostico?: string
    pacienteIdade?: string
    terapeutaNome: string
    terapeutaConselho?: string
    terapeutaRegistro?: string
    fase: string
    numeroCiclo: number
    dataInicio: string
    dataFim: string
    totalSessoes: number
}

export interface AvaliacaoAplicada {
    instrumento: string   // VB-MAPP, PEAK, ABLLS-R
    resumo?: string
}

export type ModoRelatorio = 'tecnico' | 'familia' | 'completo'

export interface DadosRelatorioFaseV2 {
    cabecalho: CabecalhoFase
    programas: AnaliseProgramaRelatorio[]
    avaliacoes: AvaliacaoAplicada[]
    sinteseNarrativa?: string   // editável
    recomendacoes?: string      // editável
}

const FASE_LABEL: Record<string, string> = {
    avaliacao: 'Avaliação', reavaliacao: 'Reavaliação',
    intervencao: 'Intervenção', alta: 'Alta', baseline: 'Linha de base',
}
const TEND_LABEL: Record<string, string> = {
    ascendente: 'Crescente', descendente: 'Decrescente', estavel: 'Estável',
}
const VAR_LABEL: Record<string, string> = {
    estavel: 'Estável', moderada: 'Moderada', erratica: 'Errática',
}

function esc(s: string): string {
    return (s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function renderNarrativas(p: AnaliseProgramaRelatorio, modo: ModoRelatorio): string {
    const tecnica = `<div class="narrativa narrativa-tec">
    <div class="narrativa-label">Interpretação clínica</div>
    <p>${esc(p.narrativa)}</p>
  </div>`
    const acessivel = `<div class="narrativa narrativa-aces">
    <div class="narrativa-label">${modo === 'familia' ? 'Análise' : 'Em palavras simples'}</div>
    <p>${esc(p.narrativaAcessivel)}</p>
  </div>`
    if (modo === 'tecnico') return tecnica
    if (modo === 'familia') return acessivel
    return tecnica + acessivel // completo
}

export function gerarHTMLRelatorioFase(d: DadosRelatorioFaseV2, modo: ModoRelatorio = 'completo'): string {
    const c = d.cabecalho
    const modoLabel = modo === 'familia' ? ' · versão para a família' : modo === 'tecnico' ? ' · versão técnica' : ''
    const registroStr = c.terapeutaConselho && c.terapeutaRegistro
        ? `${c.terapeutaConselho} ${c.terapeutaRegistro}` : 'Registro profissional não informado'

    const masteryCount = d.programas.filter(p => p.masterySessao !== null).length

    // Síntese
    const sintese = d.sinteseNarrativa
        ? `<p class="texto">${esc(d.sinteseNarrativa)}</p>`
        : `<p class="texto">Durante a fase de ${FASE_LABEL[c.fase] ?? c.fase}, foram trabalhados ${d.programas.length} programa(s) de ensino ao longo de ${c.totalSessoes} sessões. ${masteryCount > 0 ? `${masteryCount} programa(s) atingiram o critério de domínio.` : 'Nenhum programa atingiu critério de domínio no período.'}</p>`

    // Análise por programa (núcleo)
    const programasHTML = d.programas.map(p => {
        const cmp = p.comparacao
        const metricasLinhas = [
            `<tr><td>Nível médio</td><td><b>${p.metricas.nivel}${ehPct(p.medidaLabel) ? '%' : ''}</b></td></tr>`,
            `<tr><td>Tendência</td><td><b>${TEND_LABEL[p.metricas.tendencia]}</b> (slope ${p.metricas.slope})</td></tr>`,
            `<tr><td>Variabilidade</td><td><b>${VAR_LABEL[p.metricas.variabilidade]}</b> (CV ${p.metricas.coefVariacao}%)</td></tr>`,
            cmp ? `<tr><td>PND (não-sobreposição)</td><td><b>${cmp.pnd}%</b> — ${cmp.interpretacaoPND}</td></tr>` : '',
            cmp ? `<tr><td>Mudança de nível</td><td><b>${cmp.mudancaNivel > 0 ? '+' : ''}${cmp.mudancaNivel}</b></td></tr>` : '',
        ].filter(Boolean).join('')

        const masteryBadge = p.masterySessao !== null
            ? `<span class="badge badge-ok">Domínio atingido — sessão ${p.masterySessao}</span>`
            : p.projecaoSessoes !== null
                ? `<span class="badge badge-proj">Projeção: ~${p.projecaoSessoes} sessões até o critério</span>`
                : `<span class="badge badge-prog">Em progresso</span>`

        const estruturaBadge = p.estrutura === 'duas_fases'
            ? `<span class="badge badge-fase">Análise linha de base × intervenção</span>`
            : `<span class="badge badge-fase">Análise de fase única (descritiva)</span>`

        return `
    <div class="programa">
      <div class="prog-head">
        <div>
          <div class="prog-nome">${esc(p.nome)}</div>
          <div class="prog-meta">${esc(p.dominio)} · ${esc(p.tipoRegistro.toUpperCase())}</div>
        </div>
        <div class="prog-badges">${masteryBadge}</div>
      </div>
      <div class="prog-grafico">${p.svg}</div>
      <div style="margin:6px 0">${estruturaBadge}</div>
      <table class="metricas">${metricasLinhas}</table>
      ${renderNarrativas(p, modo)}
    </div>`
    }).join('')

    // Avaliações aplicadas (SEPARADAS dos programas)
    const avaliacoesHTML = d.avaliacoes.length > 0 ? `
    <div class="secao">
      <h2>Avaliações aplicadas na fase</h2>
      <p class="nota">Instrumentos padronizados de avaliação de repertório — não confundir com programas de ensino.</p>
      ${d.avaliacoes.map(a => `<div class="aval-item"><b>${esc(a.instrumento)}</b>${a.resumo ? ` — ${esc(a.resumo)}` : ''}</div>`).join('')}
    </div>` : ''

    const recomendacoesHTML = d.recomendacoes ? `
    <div class="secao">
      <h2>Recomendações</h2>
      <p class="texto">${esc(d.recomendacoes)}</p>
    </div>` : ''

    return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8">
<title>Relatório de Fase — ${esc(c.pacienteNome)}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=DM+Mono&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Inter', -apple-system, sans-serif; color: #1a2e44; background: #fff; padding: 40px; line-height: 1.5; }
  .doc { max-width: 760px; margin: 0 auto; }
  .cabecalho { border-bottom: 3px solid #1D9E75; padding-bottom: 16px; margin-bottom: 24px; }
  .titulo { font-size: 22px; font-weight: 800; color: #1D9E75; }
  .subtitulo { font-size: 13px; color: #64748b; margin-top: 2px; }
  .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; margin-top: 16px; font-size: 13px; }
  .meta-item { display: flex; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding: 4px 0; }
  .meta-label { color: #64748b; }
  .meta-valor { font-weight: 600; }
  .secao { margin: 28px 0; }
  h2 { font-size: 16px; font-weight: 700; color: #1a2e44; border-left: 4px solid #1D9E75; padding-left: 10px; margin-bottom: 12px; }
  .texto { font-size: 13.5px; color: #334155; }
  .nota { font-size: 11.5px; color: #94a3b8; font-style: italic; margin-bottom: 10px; }
  .programa { border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; margin-bottom: 20px; page-break-inside: avoid; }
  .prog-head { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
  .prog-nome { font-size: 15px; font-weight: 700; }
  .prog-meta { font-size: 11.5px; color: #64748b; text-transform: capitalize; }
  .prog-grafico { margin: 8px 0; text-align: center; }
  .prog-grafico svg { max-width: 100%; height: auto; }
  table.metricas { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 12.5px; }
  table.metricas td { padding: 5px 8px; border-bottom: 1px solid #f1f5f9; }
  table.metricas td:first-child { color: #64748b; width: 42%; }
  .badge { display: inline-block; font-size: 11px; font-weight: 600; padding: 3px 10px; border-radius: 20px; }
  .badge-ok { background: #dcfce7; color: #166534; }
  .badge-proj { background: #fef9c3; color: #854d0e; }
  .badge-prog { background: #e0f2fe; color: #075985; }
  .badge-fase { background: #f1f5f9; color: #475569; font-size: 10.5px; }
  .narrativa { border-radius: 8px; padding: 10px 12px; margin-top: 10px; }
  .narrativa-tec { background: #f8fafc; border-left: 3px solid #64748b; }
  .narrativa-aces { background: #f0fdf4; border-left: 3px solid #1D9E75; }
  .narrativa-label { font-size: 10.5px; text-transform: uppercase; letter-spacing: .06em; color: #94a3b8; margin-bottom: 4px; font-weight: 600; }
  .narrativa p { font-size: 13px; color: #334155; }
  .aval-item { font-size: 13px; padding: 6px 0; border-bottom: 1px solid #f1f5f9; }
  .assinatura { margin-top: 48px; padding-top: 12px; border-top: 1px solid #e2e8f0; text-align: center; }
  .assinatura-linha { width: 280px; border-top: 1px solid #1a2e44; margin: 32px auto 6px; }
  .assinatura-nome { font-weight: 600; font-size: 13px; }
  .assinatura-registro { font-family: 'DM Mono', monospace; font-size: 12px; color: #64748b; }
  @media print { body { padding: 0; } .programa { page-break-inside: avoid; } }
</style></head><body><div class="doc">
  <div class="cabecalho">
    <div class="titulo">Relatório de Fase — ${FASE_LABEL[c.fase] ?? esc(c.fase)}</div>
    <div class="subtitulo">Análise de evolução clínica · delineamento de caso único${modoLabel}</div>
    <div class="meta-grid">
      <div class="meta-item"><span class="meta-label">Paciente</span><span class="meta-valor">${esc(c.pacienteNome)}</span></div>
      <div class="meta-item"><span class="meta-label">Ciclo</span><span class="meta-valor">${c.numeroCiclo}</span></div>
      ${c.pacienteDiagnostico ? `<div class="meta-item"><span class="meta-label">Diagnóstico</span><span class="meta-valor">${esc(c.pacienteDiagnostico)}</span></div>` : ''}
      ${c.pacienteIdade ? `<div class="meta-item"><span class="meta-label">Idade</span><span class="meta-valor">${esc(c.pacienteIdade)}</span></div>` : ''}
      <div class="meta-item"><span class="meta-label">Período</span><span class="meta-valor">${esc(c.dataInicio)} a ${esc(c.dataFim)}</span></div>
      <div class="meta-item"><span class="meta-label">Sessões</span><span class="meta-valor">${c.totalSessoes}</span></div>
    </div>
  </div>

  <div class="secao">
    <h2>Síntese da fase</h2>
    ${sintese}
  </div>

  <div class="secao">
    <h2>Análise por programa</h2>
    ${programasHTML || '<p class="texto">Nenhum programa de ensino com dados nesta fase.</p>'}
  </div>

  ${avaliacoesHTML}
  ${recomendacoesHTML}

  <div class="assinatura">
    <div class="assinatura-linha"></div>
    <div class="assinatura-nome">${esc(c.terapeutaNome)}</div>
    <div class="assinatura-registro">${registroStr}</div>
  </div>
</div></body></html>`
}

function ehPct(label: string): boolean { return /independ|acerto|%/i.test(label) }