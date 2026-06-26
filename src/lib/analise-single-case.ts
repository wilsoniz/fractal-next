// src/lib/analise-single-case.ts
// Motor de análise de delineamento de caso único (single-case design) — padrão BCBA.
// Referência: Cooper, Heron & Heward (2020), análise visual.
// Funções PURAS (sem I/O) — recebem séries numéricas, devolvem métricas e narrativa.
// Cada série representa a medida de UM programa ao longo das sessões de uma fase.

// ── Tipos ────────────────────────────────────────────────────────────────────

export type DirecaoAlvo = 'aumentar' | 'reduzir'
// 'aumentar' = habilidade (independência, acertos): queremos a série subir.
// 'reduzir'  = comportamento-problema (agressão, latência): queremos descer.

export type ClassTendencia = 'ascendente' | 'descendente' | 'estavel'
export type ClassVariabilidade = 'estavel' | 'moderada' | 'erratica'

export interface MetricasFase {
    n: number               // nº de pontos (sessões com dado)
    nivel: number           // média
    mediana: number
    minimo: number
    maximo: number
    amplitude: number
    desvioPadrao: number
    coefVariacao: number    // CV% = (dp / |média|) * 100
    slope: number           // inclinação da regressão linear (por sessão)
    tendencia: ClassTendencia
    variabilidade: ClassVariabilidade
    estabilidadePct: number // % de pontos dentro de ±X% da média (proxy de estabilidade)
}

export interface ComparacaoFases {
    pnd: number             // Percent of Nonoverlapping Data (0-100)
    mudancaNivel: number    // nível intervenção - nível baseline
    imediatismo: number | null // 1º ponto interv vs último baseline (delta)
    interpretacaoPND: string
}

// ── Utilitários estatísticos ─────────────────────────────────────────────────

function media(xs: number[]): number {
    if (xs.length === 0) return 0
    return xs.reduce((a, b) => a + b, 0) / xs.length
}

function mediana(xs: number[]): number {
    if (xs.length === 0) return 0
    const s = [...xs].sort((a, b) => a - b)
    const m = Math.floor(s.length / 2)
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

function desvioPadrao(xs: number[]): number {
    if (xs.length < 2) return 0
    const m = media(xs)
    const variancia = xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1) // amostral
    return Math.sqrt(variancia)
}

// Regressão linear simples (mínimos quadrados). x = índice da sessão (0,1,2..).
// Retorna {slope, intercept}.
function regressao(ys: number[]): { slope: number; intercept: number } {
    const n = ys.length
    if (n < 2) return { slope: 0, intercept: ys[0] ?? 0 }
    const xs = ys.map((_, i) => i)
    const mx = media(xs)
    const my = media(ys)
    let num = 0, den = 0
    for (let i = 0; i < n; i++) {
        num += (xs[i] - mx) * (ys[i] - my)
        den += (xs[i] - mx) ** 2
    }
    const slope = den === 0 ? 0 : num / den
    const intercept = my - slope * mx
    return { slope, intercept }
}

function slopeRegressao(ys: number[]): number {
    return regressao(ys).slope
}

// Desvio padrão dos RESÍDUOS em torno da linha de regressão (não da média).
// Clinicamente: mede o "ruído" em torno da tendência. Uma rampa limpa tem
// resíduos pequenos (estável na tendência), mesmo que o desvio bruto seja alto.
function desvioResidual(ys: number[]): number {
    const n = ys.length
    if (n < 3) return 0
    const { slope, intercept } = regressao(ys)
    let somaQuad = 0
    for (let i = 0; i < n; i++) {
        const previsto = intercept + slope * i
        somaQuad += (ys[i] - previsto) ** 2
    }
    return Math.sqrt(somaQuad / (n - 2)) // n-2: graus de liberdade da regressão
}

// ── Classificações clínicas ──────────────────────────────────────────────────

// Tendência: classifica o slope. Para contar como tendência (não platô), o
// movimento TOTAL ao longo da fase (slope × nº de sessões) deve ser relevante —
// tanto frente ao ruído residual quanto frente ao nível da série. Isso evita que
// um slope minúsculo num platô estável (ex: 78→81) seja lido como "ascendente".
function classificarTendencia(slope: number, amplitude: number, residual: number, nivel: number, n: number): ClassTendencia {
    const movimentoTotal = Math.abs(slope) * Math.max(1, n - 1) // variação ponta-a-ponta projetada
    // precisa mover ao menos ~8% do nível ao longo de toda a fase
    const limiarNivel = Math.abs(nivel) * 0.08
    // e superar o ruído residual (senão é indistinguível de flutuação)
    const limiarRuido = residual * 0.5
    const relevante = movimentoTotal >= Math.max(limiarNivel, limiarRuido, 1e-6)
    if (!relevante) return 'estavel'
    return slope > 0 ? 'ascendente' : 'descendente'
}

// Variabilidade: classifica pelo coeficiente de variação RESIDUAL — o ruído em
// torno da linha de tendência, relativo ao nível. Assim uma rampa limpa (sobe
// consistente) é "estável", e só dispersão real em torno da tendência conta.
// CVres < 15% estável; 15-30% moderada; > 30% errática.
function classificarVariabilidade(cvResidual: number): ClassVariabilidade {
    if (cvResidual < 15) return 'estavel'
    if (cvResidual <= 30) return 'moderada'
    return 'erratica'
}

// Estabilidade: % de pontos dentro de ±20% da média (envelope de estabilidade).
function calcularEstabilidadePct(xs: number[]): number {
    if (xs.length === 0) return 0
    const m = media(xs)
    if (m === 0) return xs.every(x => x === 0) ? 100 : 0
    const dentro = xs.filter(x => Math.abs(x - m) <= Math.abs(m) * 0.20).length
    return Math.round((dentro / xs.length) * 100)
}

// ── Função principal: métricas de uma fase ───────────────────────────────────

export function analisarFase(serie: number[], direcao: DirecaoAlvo = 'aumentar'): MetricasFase {
    const xs = serie.filter(v => v !== null && v !== undefined && !Number.isNaN(v))
    const nivel = media(xs)
    const dp = desvioPadrao(xs)
    const dpResid = desvioResidual(xs)
    const minimo = xs.length ? Math.min(...xs) : 0
    const maximo = xs.length ? Math.max(...xs) : 0
    const amplitude = maximo - minimo
    const cv = nivel !== 0 ? (dp / Math.abs(nivel)) * 100 : 0
    const cvResid = nivel !== 0 ? (dpResid / Math.abs(nivel)) * 100 : 0
    const slope = slopeRegressao(xs)
    return {
        n: xs.length,
        nivel: round2(nivel),
        mediana: round2(mediana(xs)),
        minimo, maximo, amplitude: round2(amplitude),
        desvioPadrao: round2(dp),
        coefVariacao: round2(cv),
        slope: round2(slope),
        tendencia: classificarTendencia(slope, amplitude, dpResid, nivel, xs.length),
        variabilidade: classificarVariabilidade(cvResid),
        estabilidadePct: calcularEstabilidadePct(xs),
    }
}

// ── Comparação baseline vs intervenção (PND) ─────────────────────────────────

// PND: % de pontos da intervenção que NÃO se sobrepõem ao baseline.
// Para 'aumentar' (habilidade): pontos da interv ACIMA do máximo do baseline.
// Para 'reduzir' (problema): pontos da interv ABAIXO do mínimo do baseline.
export function calcularPND(baseline: number[], intervencao: number[], direcao: DirecaoAlvo): ComparacaoFases {
    const bl = baseline.filter(v => !Number.isNaN(v))
    const iv = intervencao.filter(v => !Number.isNaN(v))
    let naoSobrepostos = 0
    if (bl.length > 0 && iv.length > 0) {
        if (direcao === 'aumentar') {
            const maxBl = Math.max(...bl)
            naoSobrepostos = iv.filter(v => v > maxBl).length
        } else {
            const minBl = Math.min(...bl)
            naoSobrepostos = iv.filter(v => v < minBl).length
        }
    }
    const pnd = iv.length > 0 ? Math.round((naoSobrepostos / iv.length) * 100) : 0
    const mudancaNivel = round2(media(iv) - media(bl))
    const imediatismo = (bl.length > 0 && iv.length > 0) ? round2(iv[0] - bl[bl.length - 1]) : null
    return { pnd, mudancaNivel, imediatismo, interpretacaoPND: interpretarPND(pnd) }
}

function interpretarPND(pnd: number): string {
    if (pnd > 90) return 'intervenção muito eficaz'
    if (pnd >= 70) return 'intervenção eficaz'
    if (pnd >= 50) return 'eficácia questionável'
    return 'intervenção ineficaz'
}

// ── Geração de narrativa clínica ─────────────────────────────────────────────

const LABEL_TEND: Record<ClassTendencia, string> = {
    ascendente: 'tendência crescente',
    descendente: 'tendência decrescente',
    estavel: 'sem tendência definida',
}
const LABEL_VAR: Record<ClassVariabilidade, string> = {
    estavel: 'baixa variabilidade',
    moderada: 'variabilidade moderada',
    erratica: 'alta variabilidade',
}

// Gera a frase-síntese estilo BCBA. medida = rótulo do eixo (ex: "independência").
export function gerarNarrativa(
    m: MetricasFase,
    direcao: DirecaoAlvo,
    medidaLabel: string,
    comparacao?: ComparacaoFases,
    masterySessao?: number | null,
): string {
    if (m.n === 0) return 'Sem dados suficientes nesta fase para análise.'
    if (m.n < 3) return `Dados insuficientes (${m.n} ${m.n === 1 ? 'sessão' : 'sessões'}) para análise visual confiável; recomenda-se ao menos 3 pontos.`

    const partes: string[] = []

    // Tendência interpretada em relação ao alvo
    const favoravel =
        (direcao === 'aumentar' && m.tendencia === 'ascendente') ||
        (direcao === 'reduzir' && m.tendencia === 'descendente')
    const desfavoravel =
        (direcao === 'aumentar' && m.tendencia === 'descendente') ||
        (direcao === 'reduzir' && m.tendencia === 'ascendente')

    const tendTexto = m.tendencia === 'estavel'
        ? 'sem tendência definida'
        : `tendência ${m.tendencia === 'ascendente' ? 'crescente' : 'decrescente'}`
    partes.push(`Nível médio de ${medidaLabel} em ${m.nivel}${ehPercentual(medidaLabel) ? '%' : ''}, com ${LABEL_VAR[m.variabilidade]} e ${tendTexto} (CV=${m.coefVariacao}%).`)

    if (comparacao) {
        partes.push(`Comparado à linha de base, mudança de nível de ${comparacao.mudancaNivel > 0 ? '+' : ''}${comparacao.mudancaNivel}, com PND de ${comparacao.pnd}% (${comparacao.interpretacaoPND}).`)
        if (comparacao.imediatismo !== null && Math.abs(comparacao.imediatismo) > 0) {
            partes.push(`Efeito ${Math.abs(comparacao.imediatismo) >= m.amplitude * 0.3 ? 'imediato' : 'gradual'} na transição de fase.`)
        }
    }

    if (masterySessao) {
        partes.push(`Critério de domínio atingido na sessão ${masterySessao}.`)
    } else if (favoravel && m.variabilidade !== 'erratica') {
        partes.push('Progresso consistente em direção ao critério.')
    } else if (desfavoravel) {
        partes.push('Evolução desfavorável ao objetivo; recomenda-se revisar a estratégia de ensino.')
    } else if (m.variabilidade === 'erratica') {
        partes.push('Desempenho instável; recomenda-se revisar densidade de reforço e nível de ajuda.')
    }

    return partes.join(' ')
}

// ── Projeção de aprendizado ──────────────────────────────────────────────────

// Se a tendência é favorável e estável, projeta sessões até atingir o critério.
// Retorna null se não projetável (tendência plana/desfavorável ou já atingido).
export function projetarSessoesAteMastery(
    m: MetricasFase, direcao: DirecaoAlvo, criterio: number,
): number | null {
    if (m.slope === 0) return null
    const favoravel =
        (direcao === 'aumentar' && m.slope > 0) ||
        (direcao === 'reduzir' && m.slope < 0)
    if (!favoravel) return null
    if (m.variabilidade === 'erratica') return null
    // já atingiu?
    if (direcao === 'aumentar' && m.nivel >= criterio) return 0
    if (direcao === 'reduzir' && m.nivel <= criterio) return 0
    const faltam = (criterio - m.nivel) / m.slope
    if (faltam <= 0 || !Number.isFinite(faltam)) return null
    return Math.ceil(faltam)
}

// ── helpers ──────────────────────────────────────────────────────────────────
function round2(x: number): number { return Math.round(x * 100) / 100 }
function ehPercentual(label: string): boolean {
    return /independ|acerto|passos|%/i.test(label)
}