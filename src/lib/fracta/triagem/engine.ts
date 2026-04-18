import {
  AREA_LABELS,
  AREAS_TRIAGEM,
  LIMIAR_INVESTIGACAO,
  PESO_TRIAGEM,
  PESO_INVESTIGACAO,
} from './config'
import { PERGUNTAS_TRIAGEM } from './perguntas-triagem'
import { PERGUNTAS_INVESTIGACAO } from './perguntas-investigacao'
import type { AreaTriagem, NivelRisco } from './config'

export type ResultadoArea = {
  area: AreaTriagem
  label: string
  score: number
  nivel: NivelRisco
}

export function calcularResultadoFinal(respostas: Record<string, number>): ResultadoArea[] {
  return AREAS_TRIAGEM.map(area => {
    const perguntas = PERGUNTAS_TRIAGEM.filter(p => p.area === area)
    const total = perguntas.reduce((acc, p) => acc + (respostas[p.id] ?? 0), 0)
    const max = perguntas.length * 2
    const score = max > 0 ? Math.round((total / max) * 100) : 0
    const nivel: NivelRisco = score >= 60 ? 'alto' : score >= 30 ? 'medio' : 'baixo'
    return { area, label: AREA_LABELS[area], score, nivel }
  })
}

export function obterAreasParaInvestigacao(resultado: ResultadoArea[]): AreaTriagem[] {
  return resultado
    .filter(r => r.score >= LIMIAR_INVESTIGACAO)
    .map(r => r.area)
}

export function calcularScoreInvestigacao(
  area: AreaTriagem,
  respostas: Record<string, number>
): number {
  const perguntas = PERGUNTAS_INVESTIGACAO.filter(p => p.area === area)
  if (perguntas.length === 0) return 0
  const total = perguntas.reduce((acc, p) => acc + (respostas[p.id] ?? 0), 0)
  return Math.round((total / (perguntas.length * 2)) * 100)
}
