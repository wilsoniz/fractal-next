// Gera a narrativa em linguagem acessível (para pais), traduzindo os números.
import { type MetricasFase, type ComparacaoFases, type DirecaoAlvo } from './analise-single-case'

interface DadosNarrativa {
    medidaNome: string        // "independência", "o comportamento de bater na mesa"
    direcao: DirecaoAlvo
    metricas: MetricasFase
    comparacao?: ComparacaoFases
    primeiroValor?: number    // valor da 1a sessão (pra traduzir "de X")
    ultimoValor?: number      // valor da última (pra "para Y")
    masterySessao?: number | null
    unidade?: string          // "%", "vezes por sessão", "segundos"
    ehHabilidade: boolean     // true=habilidade (independência sobe), false=comportamento-problema
}

export function gerarNarrativaAcessivel(d: DadosNarrativa): string {
    const { metricas: m, comparacao: cmp } = d
    if (m.n === 0) return 'Ainda não há dados suficientes nesta fase para uma análise.'
    if (m.n < 3) return `Esta fase teve poucas sessões (${m.n}), então ainda é cedo para conclusões firmes sobre a evolução.`

    const partes: string[] = []
    const un = d.unidade ?? ''
    const fmtV = (v: number) => un === '%' ? `${Math.round(v)}%` : `${arred(v)}${un ? ' ' + un : ''}`

    // 1. Evolução observada (de X para Y)
    if (d.primeiroValor !== undefined && d.ultimoValor !== undefined) {
        if (d.ehHabilidade) {
            if (d.ultimoValor > d.primeiroValor) {
                partes.push(`${cap(d.medidaNome)} evoluiu de ${fmtV(d.primeiroValor)} no início para ${fmtV(d.ultimoValor)} ao final desta fase.`)
            } else if (d.ultimoValor < d.primeiroValor) {
                partes.push(`${cap(d.medidaNome)} passou de ${fmtV(d.primeiroValor)} para ${fmtV(d.ultimoValor)}, indicando uma queda que merece atenção.`)
            } else {
                partes.push(`${cap(d.medidaNome)} manteve-se em torno de ${fmtV(d.ultimoValor)} ao longo da fase.`)
            }
        } else {
            // comportamento-problema (queremos reduzir)
            if (d.ultimoValor < d.primeiroValor) {
                partes.push(`${cap(d.medidaNome)} diminuiu de cerca de ${fmtV(d.primeiroValor)} no início para ${fmtV(d.ultimoValor)} ao final — uma redução importante.`)
            } else if (d.ultimoValor > d.primeiroValor) {
                partes.push(`${cap(d.medidaNome)} aumentou de ${fmtV(d.primeiroValor)} para ${fmtV(d.ultimoValor)}, o que indica necessidade de rever a estratégia.`)
            } else {
                partes.push(`${cap(d.medidaNome)} manteve-se em torno de ${fmtV(d.ultimoValor)}.`)
            }
        }
    }

    // 2. Consistência (variabilidade em linguagem simples)
    if (m.variabilidade === 'estavel') {
        partes.push('A evolução foi consistente, sem grandes oscilações entre as sessões.')
    } else if (m.variabilidade === 'moderada') {
        partes.push('Houve alguma variação entre as sessões, o que é esperado no processo de aprendizagem.')
    } else {
        partes.push('Os resultados oscilaram bastante entre as sessões, o que sugere que vale ajustar o ensino para dar mais estabilidade.')
    }

    // 3. Efeito da intervenção (quando há comparação com linha de base)
    if (cmp) {
        if (cmp.pnd >= 90) {
            partes.push('A comparação com o período inicial mostra que a intervenção teve um efeito muito claro e confiável.')
        } else if (cmp.pnd >= 70) {
            partes.push('A comparação com o período inicial mostra que a intervenção teve um bom efeito.')
        } else if (cmp.pnd >= 50) {
            partes.push('O efeito da intervenção em relação ao período inicial é moderado e ainda pode melhorar.')
        } else {
            partes.push('Ainda não há diferença clara em relação ao período inicial; vale revisar a abordagem.')
        }
    }

    // 4. Mastery / projeção
    if (d.masterySessao) {
        partes.push(`O objetivo foi alcançado na sessão ${d.masterySessao}, e agora o foco passa a ser manter e generalizar essa conquista.`)
    }

    return partes.join(' ')
}

function cap(s: string): string { return s.charAt(0).toUpperCase() + s.slice(1) }
function arred(v: number): string { return Number.isInteger(v) ? String(v) : v.toFixed(1) }