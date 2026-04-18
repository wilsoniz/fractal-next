export type AreaTriagem = 'TDI' | 'TC' | 'TEA' | 'TDAH' | 'TA' | 'TM' | 'TT' | 'Outros'
export type NivelRisco = 'baixo' | 'medio' | 'alto'

export const AREAS_TRIAGEM: AreaTriagem[] = ['TDI', 'TC', 'TEA', 'TDAH', 'TA', 'TM', 'TT', 'Outros']

export const AREA_LABELS: Record<AreaTriagem, string> = {
  TDI: 'Desenvolvimento Intelectual',
  TC: 'Comunicação',
  TEA: 'Espectro Autista',
  TDAH: 'Atenção / Hiperatividade',
  TA: 'Aprendizagem',
  TM: 'Transtornos Motores',
  TT: 'Transtornos de Tique',
  Outros: 'Outras Áreas',
}

export const AREA_CORES: Record<AreaTriagem, string> = {
  TDI: '#8B5CF6',
  TC: '#2BBFA4',
  TEA: '#4FC3D8',
  TDAH: '#F59E0B',
  TA: '#7AE040',
  TM: '#F87171',
  TT: '#A78BFA',
  Outros: '#94a3b8',
}

export const PESO_TRIAGEM = 1.0
export const PESO_INVESTIGACAO = 1.2
export const LIMIAR_INVESTIGACAO = 40
