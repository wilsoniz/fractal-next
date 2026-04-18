export type AreaTriagem =
  | 'TDI'
  | 'TC'
  | 'TEA'
  | 'TDAH'
  | 'TA'
  | 'TM'
  | 'TT'
  | 'Outros'

export type NivelRisco = 'baixo' | 'medio' | 'alto'

export type PerguntaTriagem = {
  id: string
  area: AreaTriagem
  texto: string
}

export type PerguntaInvestigacao = {
  id: string
  area: AreaTriagem
  subtipo: string
  funcao: string
  texto: string
  peso: number
}

export type ResultadoArea = {
  area: AreaTriagem
  label: string
  scoreTriagem: number
  scoreInvestigacao: number | null
  scoreFinal: number
  nivel: NivelRisco
  investigada: boolean
}

export type RespostasNumericas = Record<string, number>