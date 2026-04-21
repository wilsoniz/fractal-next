// ─────────────────────────────────────────────────────────────────────────────
// ARQUIVO: src/lib/fracta/gamification.ts
// Cole o conteúdo abaixo em src/lib/fracta/gamification.ts
// ─────────────────────────────────────────────────────────────────────────────

export type Badge = {
  id: string
  titulo: string
  desc: string
  icon: string
  cor: string
  desbloqueado: boolean
}

export type GamificationData = {
  pontos: number
  nivel: string
  nivelIndex: number
  streakAtual: number
  streakMax: number
  badges: Badge[]
  proximoNivel: string
  pontosProximoNivel: number
}

export const NIVEIS = [
  { nome: 'Iniciante',  min: 0,   cor: '#8a9ab8', icon: '🌱' },
  { nome: 'Engajado',   min: 100, cor: '#2BBFA4', icon: '🌿' },
  { nome: 'Dedicado',   min: 300, cor: '#2A7BA8', icon: '⭐' },
  { nome: 'Expert',     min: 600, cor: '#EF9F27', icon: '🏆' },
]

export const BADGES_BASE: Omit<Badge, 'desbloqueado'>[] = [
  { id: 'primeiro-passo',   titulo: 'Primeiro passo',     desc: 'Registrou a primeira atividade',       icon: '👣', cor: '#2BBFA4' },
  { id: 'sequencia-3',      titulo: '3 dias seguidos',    desc: 'Manteve streak por 3 dias',             icon: '🔥', cor: '#EF9F27' },
  { id: 'sequencia-7',      titulo: 'Uma semana!',        desc: 'Manteve streak por 7 dias',             icon: '🌟', cor: '#EF9F27' },
  { id: 'trilha-concluida', titulo: 'Trilheiro',          desc: 'Concluiu a primeira trilha do Guia',    icon: '📚', cor: '#7AE040' },
  { id: 'avaliacao-2',      titulo: 'Evolução medida',    desc: 'Realizou a segunda avaliação',          icon: '📊', cor: '#2A7BA8' },
  { id: 'atividades-10',    titulo: 'Em ritmo!',          desc: 'Completou 10 atividades',               icon: '💪', cor: '#2BBFA4' },
  { id: 'atividades-30',    titulo: 'Constância',         desc: 'Completou 30 atividades',               icon: '🏅', cor: '#EF9F27' },
  { id: 'sequencia-30',     titulo: 'Mês completo',       desc: 'Manteve streak por 30 dias',            icon: '🏆', cor: '#EF9F27' },
]

export function calcularNivel(pontos: number) {
  let nivelIndex = 0
  for (let i = NIVEIS.length - 1; i >= 0; i--) {
    if (pontos >= NIVEIS[i].min) { nivelIndex = i; break }
  }
  const proximo = NIVEIS[nivelIndex + 1]
  return {
    nivel: NIVEIS[nivelIndex].nome,
    nivelIndex,
    proximoNivel: proximo?.nome ?? 'Máximo',
    pontosProximoNivel: proximo?.min ?? NIVEIS[nivelIndex].min,
  }
}

export function calcularBadges(atividades: number, streak: number, trilhasConcluidas: number, avaliacoes: number): Badge[] {
  return BADGES_BASE.map(b => ({
    ...b,
    desbloqueado:
      (b.id === 'primeiro-passo'   && atividades >= 1) ||
      (b.id === 'sequencia-3'      && streak >= 3) ||
      (b.id === 'sequencia-7'      && streak >= 7) ||
      (b.id === 'sequencia-30'     && streak >= 30) ||
      (b.id === 'trilha-concluida' && trilhasConcluidas >= 1) ||
      (b.id === 'avaliacao-2'      && avaliacoes >= 2) ||
      (b.id === 'atividades-10'    && atividades >= 10) ||
      (b.id === 'atividades-30'    && atividades >= 30),
  }))
}
