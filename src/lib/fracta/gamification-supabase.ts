// src/lib/fracta/gamification-supabase.ts
// Funções para buscar e atualizar dados de gamificação no Supabase

import { supabase } from '@/lib/supabase'

export type GamificacaoData = {
  pontos: number
  streak_atual: number
  streak_max: number
  ultimo_checkin: string | null
}

// Busca dados de gamificação do responsável
export async function buscarGamificacao(responsavelId: string): Promise<GamificacaoData> {
  const { data } = await supabase
    .from('gamificacao')
    .select('pontos, streak_atual, streak_max, ultimo_checkin')
    .eq('responsavel_id', responsavelId)
    .single()

  if (!data) {
    return { pontos: 0, streak_atual: 0, streak_max: 0, ultimo_checkin: null }
  }

  return data
}

// Registra atividade e atualiza streak/pontos
export async function registrarAtividade(
  responsavelId: string,
  criancaId: string,
  pontosPorAtividade = 10
): Promise<GamificacaoData> {
  const hoje = new Date().toISOString().split('T')[0]

  // Busca estado atual
  const { data: atual } = await supabase
    .from('gamificacao')
    .select('*')
    .eq('responsavel_id', responsavelId)
    .single()

  let streakAtual = 1
  let streakMax = 1
  let pontos = pontosPorAtividade

  if (atual) {
    const ultimoCheckin = atual.ultimo_checkin
    const ontem = new Date()
    ontem.setDate(ontem.getDate() - 1)
    const ontemStr = ontem.toISOString().split('T')[0]

    if (ultimoCheckin === hoje) {
      // Já fez checkin hoje — não conta novo streak nem pontos
      return {
        pontos: atual.pontos,
        streak_atual: atual.streak_atual,
        streak_max: atual.streak_max,
        ultimo_checkin: atual.ultimo_checkin,
      }
    } else if (ultimoCheckin === ontemStr) {
      // Ontem fez — continua streak
      streakAtual = atual.streak_atual + 1
      streakMax = Math.max(streakAtual, atual.streak_max)
      pontos = atual.pontos + pontosPorAtividade
    } else {
      // Streak quebrado — recomeça
      streakAtual = 1
      streakMax = Math.max(1, atual.streak_max)
      pontos = atual.pontos + pontosPorAtividade
    }
  }

  // Upsert na tabela gamificacao
  const { data: updated } = await supabase
    .from('gamificacao')
    .upsert({
      responsavel_id: responsavelId,
      pontos,
      streak_atual: streakAtual,
      streak_max: streakMax,
      ultimo_checkin: hoje,
      atualizado_em: new Date().toISOString(),
    }, { onConflict: 'responsavel_id' })
    .select()
    .single()

  // Registra o checkin
  await supabase.from('checkins').insert({
    crianca_id: criancaId,
    responsavel_id: responsavelId,
    tipo: 'atividade',
    titulo: 'Atividade registrada',
    descricao: `Atividade registrada em ${hoje}`,
  })

  // Verifica e cria conquistas
  await verificarConquistas(responsavelId, criancaId, streakAtual, pontos)

  return updated ?? { pontos, streak_atual: streakAtual, streak_max: streakMax, ultimo_checkin: hoje }
}

// Verifica e cria conquistas desbloqueadas
async function verificarConquistas(
  responsavelId: string,
  criancaId: string,
  streak: number,
  pontos: number
) {
  const { data: existentes } = await supabase
    .from('conquistas')
    .select('tipo')
    .eq('responsavel_id', responsavelId)

  const tiposExistentes = new Set(existentes?.map(c => c.tipo) ?? [])

  const novas: { crianca_id: string; responsavel_id: string; tipo: string; titulo: string; descricao: string }[] = []

  if (!tiposExistentes.has('primeiro-passo') && pontos >= 10) {
    novas.push({ crianca_id: criancaId, responsavel_id: responsavelId, tipo: 'primeiro-passo', titulo: 'Primeiro passo', descricao: 'Registrou a primeira atividade' })
  }
  if (!tiposExistentes.has('sequencia-3') && streak >= 3) {
    novas.push({ crianca_id: criancaId, responsavel_id: responsavelId, tipo: 'sequencia-3', titulo: '3 dias seguidos', descricao: 'Manteve streak por 3 dias' })
  }
  if (!tiposExistentes.has('sequencia-7') && streak >= 7) {
    novas.push({ crianca_id: criancaId, responsavel_id: responsavelId, tipo: 'sequencia-7', titulo: 'Uma semana!', descricao: 'Manteve streak por 7 dias' })
  }
  if (!tiposExistentes.has('atividades-10') && pontos >= 100) {
    novas.push({ crianca_id: criancaId, responsavel_id: responsavelId, tipo: 'atividades-10', titulo: 'Em ritmo!', descricao: 'Completou 10 atividades' })
  }

  if (novas.length > 0) {
    await supabase.from('conquistas').insert(novas)
  }
}

// Busca conquistas do responsável
export async function buscarConquistas(responsavelId: string): Promise<string[]> {
  const { data } = await supabase
    .from('conquistas')
    .select('tipo')
    .eq('responsavel_id', responsavelId)

  return data?.map(c => c.tipo) ?? []
}

// Calcula pontos totais baseado em avaliações
export async function sincronizarPontos(responsavelId: string, criancaId: string) {
  const { count: avaliacoes } = await supabase
    .from('avaliacoes')
    .select('*', { count: 'exact', head: true })
    .eq('responsavel_id', responsavelId)

  const { count: checkins } = await supabase
    .from('checkins')
    .select('*', { count: 'exact', head: true })
    .eq('responsavel_id', responsavelId)

  const pontosCalculados = ((checkins ?? 0) * 10) + ((avaliacoes ?? 0) * 20)

  await supabase
    .from('gamificacao')
    .upsert({
      responsavel_id: responsavelId,
      pontos: pontosCalculados,
      atualizado_em: new Date().toISOString(),
    }, { onConflict: 'responsavel_id' })
}
