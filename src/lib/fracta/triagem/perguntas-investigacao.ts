// ─── perguntas-investigacao.ts ───────────────────────────────────────────────
import type { AreaTriagem } from './config'

export type PerguntaInvestigacao = {
  id: string
  area: AreaTriagem
  texto: string
}

export const PERGUNTAS_INVESTIGACAO: PerguntaInvestigacao[] = [
  { id: 'inv_tdi_1', area: 'TDI', texto: 'Seu filho frequenta escola regular ou especial?' },
  { id: 'inv_tdi_2', area: 'TDI', texto: 'Ele recebe algum tipo de apoio escolar ou terapêutico?' },
  { id: 'inv_tea_1', area: 'TEA', texto: 'Seu filho tem diagnóstico formal de TEA?' },
  { id: 'inv_tea_2', area: 'TEA', texto: 'Ele faz terapia ABA ou outra intervenção comportamental?' },
  { id: 'inv_tdah_1', area: 'TDAH', texto: 'Seu filho usa medicação para atenção ou hiperatividade?' },
  { id: 'inv_tdah_2', area: 'TDAH', texto: 'Ele tem dificuldades para dormir ou manter uma rotina?' },
]
