// src/lib/grafico-evolucao.ts
// Gera o gráfico de evolução de UM programa ao longo das sessões de uma fase,
// como SVG inline (vetorial, imprime nítido em PDF via HTML→print).
// Padrão ABA: X=sessões, Y=medida; linha de mudança de fase, linha de critério,
// pontos conectados e faixa de tendência (regressão). Identidade Fracta.

export interface PontoSerie {
    sessao: number      // índice/numero da sessão (eixo X)
    valor: number       // medida (eixo Y)
    fase?: 'baseline' | 'intervention' // a qual fase o ponto pertence
}

export interface ConfigGrafico {
    titulo?: string
    labelY: string          // ex: "% Independência", "Frequência", "Latência (s)"
    yMin?: number           // default 0
    yMax?: number           // default: auto (máx dos dados, arredondado)
    criterio?: number       // linha horizontal de mastery (ex: 80)
    mudancaFaseAposIndex?: number // desenha linha vertical após este índice (0-based) — baseline→interv
    slope?: number          // se fornecido, desenha faixa/linha de tendência
    intercept?: number
    largura?: number        // default 560
    altura?: number         // default 280
}

const COR = {
    teal: '#1D9E75',
    tealClaro: 'rgba(29,158,117,0.12)',
    amber: '#EF9F27',
    tinta: '#1a2e44',       // texto/eixos (escuro azulado)
    grade: '#e2e8f0',       // linhas de grade
    faseLinepha: '#94a3b8', // linha de mudança de fase
    criterio: '#EF9F27',    // linha de critério (amber)
    ponto: '#1D9E75',       // pontos (teal)
    linha: '#1D9E75',
    tendencia: 'rgba(239,159,39,0.5)', // faixa de tendência (amber translúcido)
}

function esc(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export function gerarGraficoSVG(serie: PontoSerie[], cfg: ConfigGrafico): string {
    const W = cfg.largura ?? 560
    const H = cfg.altura ?? 280
    const ML = 48, MR = 18, MT = cfg.titulo ? 34 : 16, MB = 40 // margens
    const plotW = W - ML - MR
    const plotH = H - MT - MB

    if (serie.length === 0) {
        return `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg"><text x="${W / 2}" y="${H / 2}" text-anchor="middle" fill="#94a3b8" font-family="sans-serif" font-size="13">Sem dados nesta fase</text></svg>`
    }

    const xs = serie.map(p => p.sessao)
    const ys = serie.map(p => p.valor)
    const xMin = Math.min(...xs), xMax = Math.max(...xs)
    const yMin = cfg.yMin ?? 0
    const yMaxData = Math.max(...ys, cfg.criterio ?? 0)
    // arredonda o topo pra um número "redondo"
    const yMax = cfg.yMax ?? niceCeil(yMaxData)

    const xScale = (x: number) => ML + (xMax === xMin ? plotW / 2 : ((x - xMin) / (xMax - xMin)) * plotW)
    const yScale = (y: number) => MT + plotH - ((y - yMin) / (yMax - yMin || 1)) * plotH

    const parts: string[] = []
    parts.push(`<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" font-family="-apple-system,Segoe UI,sans-serif">`)
    parts.push(`<rect x="0" y="0" width="${W}" height="${H}" fill="white"/>`)

    if (cfg.titulo) {
        parts.push(`<text x="${ML}" y="20" fill="${COR.tinta}" font-size="13" font-weight="700">${esc(cfg.titulo)}</text>`)
    }

    // Grade horizontal + rótulos Y (5 divisões)
    const nY = 5
    for (let i = 0; i <= nY; i++) {
        const yVal = yMin + (i / nY) * (yMax - yMin)
        const yPix = yScale(yVal)
        parts.push(`<line x1="${ML}" y1="${yPix}" x2="${ML + plotW}" y2="${yPix}" stroke="${COR.grade}" stroke-width="1"/>`)
        parts.push(`<text x="${ML - 8}" y="${yPix + 4}" text-anchor="end" fill="#64748b" font-size="10">${formatNum(yVal)}</text>`)
    }

    // Eixos
    parts.push(`<line x1="${ML}" y1="${MT}" x2="${ML}" y2="${MT + plotH}" stroke="${COR.tinta}" stroke-width="1.5"/>`)
    parts.push(`<line x1="${ML}" y1="${MT + plotH}" x2="${ML + plotW}" y2="${MT + plotH}" stroke="${COR.tinta}" stroke-width="1.5"/>`)

    // Rótulo eixo Y (vertical)
    parts.push(`<text x="14" y="${MT + plotH / 2}" text-anchor="middle" fill="${COR.tinta}" font-size="11" font-weight="600" transform="rotate(-90 14 ${MT + plotH / 2})">${esc(cfg.labelY)}</text>`)
    // Rótulo eixo X
    parts.push(`<text x="${ML + plotW / 2}" y="${H - 6}" text-anchor="middle" fill="${COR.tinta}" font-size="11" font-weight="600">Sessões</text>`)

    // Rótulos X (cada sessão, ou espaçado se muitos)
    const stepX = xs.length > 12 ? Math.ceil(xs.length / 12) : 1
    serie.forEach((p, i) => {
        if (i % stepX === 0 || i === serie.length - 1) {
            parts.push(`<text x="${xScale(p.sessao)}" y="${MT + plotH + 14}" text-anchor="middle" fill="#64748b" font-size="9">${p.sessao}</text>`)
        }
    })

    // Faixa de tendência (regressão) — desenhada como linha amber translúcida
    if (cfg.slope !== undefined && cfg.intercept !== undefined && serie.length >= 3) {
        const x0 = 0, x1 = serie.length - 1
        const yT0 = cfg.intercept + cfg.slope * x0
        const yT1 = cfg.intercept + cfg.slope * x1
        const px0 = xScale(serie[0].sessao), px1 = xScale(serie[serie.length - 1].sessao)
        parts.push(`<line x1="${px0}" y1="${yScale(yT0)}" x2="${px1}" y2="${yScale(yT1)}" stroke="${COR.amber}" stroke-width="2" stroke-dasharray="2,3" opacity="0.7"/>`)
    }

    // Linha de critério (mastery)
    if (cfg.criterio !== undefined) {
        const yC = yScale(cfg.criterio)
        parts.push(`<line x1="${ML}" y1="${yC}" x2="${ML + plotW}" y2="${yC}" stroke="${COR.criterio}" stroke-width="1.5" stroke-dasharray="6,3"/>`)
        parts.push(`<text x="${ML + plotW - 2}" y="${yC - 4}" text-anchor="end" fill="${COR.amber}" font-size="9" font-weight="600">critério ${formatNum(cfg.criterio)}</text>`)
    }

    // Linha de mudança de fase (vertical) — entre baseline e intervenção
    if (cfg.mudancaFaseAposIndex !== undefined && cfg.mudancaFaseAposIndex >= 0 && cfg.mudancaFaseAposIndex < serie.length - 1) {
        const xMeio = (xScale(serie[cfg.mudancaFaseAposIndex].sessao) + xScale(serie[cfg.mudancaFaseAposIndex + 1].sessao)) / 2
        parts.push(`<line x1="${xMeio}" y1="${MT}" x2="${xMeio}" y2="${MT + plotH}" stroke="${COR.faseLinepha}" stroke-width="1.5" stroke-dasharray="4,3"/>`)
        parts.push(`<text x="${xMeio - 4}" y="${MT + 10}" text-anchor="end" fill="#64748b" font-size="9" font-weight="600">Linha de base</text>`)
        parts.push(`<text x="${xMeio + 4}" y="${MT + 10}" text-anchor="start" fill="${COR.teal}" font-size="9" font-weight="600">Intervenção</text>`)
    }

    // Linha conectando os pontos — QUEBRA na mudança de fase (convenção ABA:
    // baseline e intervenção são séries visualmente separadas, não conectadas).
    const fase1: PontoSerie[] = []
    const fase2: PontoSerie[] = []
    if (cfg.mudancaFaseAposIndex !== undefined && cfg.mudancaFaseAposIndex >= 0 && cfg.mudancaFaseAposIndex < serie.length - 1) {
        serie.forEach((p, i) => { (i <= cfg.mudancaFaseAposIndex! ? fase1 : fase2).push(p) })
    } else {
        fase1.push(...serie)
    }
    for (const seg of [fase1, fase2]) {
        if (seg.length === 0) continue
        const pts = seg.map(p => `${xScale(p.sessao)},${yScale(p.valor)}`).join(' ')
        parts.push(`<polyline points="${pts}" fill="none" stroke="${COR.linha}" stroke-width="2" stroke-linejoin="round"/>`)
    }

    // Pontos
    serie.forEach(p => {
        parts.push(`<circle cx="${xScale(p.sessao)}" cy="${yScale(p.valor)}" r="3.5" fill="white" stroke="${COR.ponto}" stroke-width="2"/>`)
    })

    parts.push(`</svg>`)
    return parts.join('')
}

// ── helpers ──
function niceCeil(v: number): number {
    if (v <= 0) return 10
    if (v <= 5) return 5
    if (v <= 10) return 10
    if (v <= 20) return 20
    if (v <= 50) return Math.ceil(v / 10) * 10
    if (v <= 100) return 100
    return Math.ceil(v / 50) * 50
}
function formatNum(v: number): string {
    return Number.isInteger(v) ? String(v) : v.toFixed(1)
}