import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ── Tipos ─────────────────────────────────────────────────────────────────────
interface Trial {
  trial_index: number
  is_correct: boolean
  latency_ms: number | null
  correct_stimulus_id: string
  selected_stimulus_id: string | null
}

interface EngineResult {
  session_id: string
  task_id: string
  child_id: string
  accuracy: number
  total_trials: number
  correct_trials: number
  incorrect_trials: number
  avg_latency_ms: number | null
  latency_trend: 'melhorando' | 'estavel' | 'piorando'
  independence_index: number
  consistency_score: number
  barriers: string[]
  stimulus_analysis: Record<string, { acertos: number; erros: number; latencia_media: number | null }>
  next_action: string
  next_action_type: 'avancar' | 'manter' | 'regredir' | 'revisar'
  mastery_reached: boolean
  created_at: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function calcLatencyTrend(trials: Trial[]): 'melhorando' | 'estavel' | 'piorando' {
  const withLatency = trials.filter(t => t.latency_ms !== null && t.latency_ms > 0)
  if (withLatency.length < 4) return 'estavel'

  const metade = Math.floor(withLatency.length / 2)
  const primeiraMetade = withLatency.slice(0, metade)
  const segundaMetade = withLatency.slice(metade)

  const mediaInicio = primeiraMetade.reduce((s, t) => s + t.latency_ms!, 0) / primeiraMetade.length
  const mediaFim = segundaMetade.reduce((s, t) => s + t.latency_ms!, 0) / segundaMetade.length

  const delta = (mediaFim - mediaInicio) / mediaInicio

  if (delta < -0.15) return 'melhorando'
  if (delta > 0.15) return 'piorando'
  return 'estavel'
}

function calcConsistency(trials: Trial[]): number {
  // Janelas de 3 trials — verifica variação de acertos
  if (trials.length < 3) return trials.filter(t => t.is_correct).length / trials.length
  const janelas: number[] = []
  for (let i = 0; i <= trials.length - 3; i++) {
    const janela = trials.slice(i, i + 3)
    janelas.push(janela.filter(t => t.is_correct).length / 3)
  }
  const media = janelas.reduce((s, v) => s + v, 0) / janelas.length
  const variancia = janelas.reduce((s, v) => s + Math.pow(v - media, 2), 0) / janelas.length
  // Consistência = 1 - desvio padrão normalizado
  return Math.max(0, 1 - Math.sqrt(variancia))
}

function detectBarriers(trials: Trial[], accuracy: number, latencyTrend: string, consistency: number): string[] {
  const barriers: string[] = []

  if (accuracy < 0.5) barriers.push('accuracy_baixa')
  if (accuracy >= 0.5 && accuracy < 0.7) barriers.push('accuracy_limiar')
  if (latencyTrend === 'piorando') barriers.push('latencia_crescente')
  if (consistency < 0.5) barriers.push('inconsistencia_alta')

  // Verifica erros repetidos no mesmo estímulo
  const errosPorEstimulo: Record<string, number> = {}
  trials.filter(t => !t.is_correct).forEach(t => {
    errosPorEstimulo[t.correct_stimulus_id] = (errosPorEstimulo[t.correct_stimulus_id] ?? 0) + 1
  })
  const estimuloProblema = Object.entries(errosPorEstimulo).find(([, v]) => v >= 3)
  if (estimuloProblema) barriers.push(`estimulo_problematico:${estimuloProblema[0]}`)

  // Verifica padrão de posição (sempre escolhe a mesma posição)
  if (trials.length >= 6) {
    const primeiros6 = trials.slice(0, 6)
    const todosErro = primeiros6.every(t => !t.is_correct)
    if (todosErro) barriers.push('inicio_dificil')
  }

  return barriers
}

function calcNextAction(
  accuracy: number,
  latencyTrend: string,
  consistency: number,
  barriers: string[],
  masteryReached: boolean
): { action: string; type: 'avancar' | 'manter' | 'regredir' | 'revisar' } {
  if (masteryReached) {
    return {
      action: 'Critério de maestria atingido. Avançar para generalização ou próximo programa.',
      type: 'avancar',
    }
  }

  if (barriers.includes('accuracy_baixa') || barriers.includes('inicio_dificil')) {
    return {
      action: 'Accuracy abaixo de 50%. Considerar regressão de nível ou revisão de estímulos e dicas.',
      type: 'regredir',
    }
  }

  if (barriers.includes('estimulo_problematico')) {
    const est = barriers.find(b => b.startsWith('estimulo_problematico:'))?.split(':')[1]
    return {
      action: `Estímulo "${est}" com 3+ erros consecutivos. Isolar e treinar separadamente antes de reintroduzir.`,
      type: 'revisar',
    }
  }

  if (barriers.includes('inconsistencia_alta') && accuracy >= 0.7) {
    return {
      action: 'Boa accuracy mas inconsistente. Manter programa atual por mais 2 sessões para consolidar.',
      type: 'manter',
    }
  }

  if (accuracy >= 0.8 && latencyTrend !== 'piorando' && consistency >= 0.7) {
    return {
      action: 'Desempenho sólido. Manter programa e avaliar critério de maestria na próxima sessão.',
      type: 'manter',
    }
  }

  if (barriers.includes('latencia_crescente')) {
    return {
      action: 'Latência aumentando ao longo da sessão. Verificar fatiga, motivação ou complexidade do estímulo.',
      type: 'revisar',
    }
  }

  return {
    action: 'Progresso dentro do esperado. Continuar programa na próxima sessão.',
    type: 'manter',
  }
}

// ── Handler ───────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const { session_id } = await req.json()

    if (!session_id) {
      return NextResponse.json({ error: 'session_id obrigatório' }, { status: 400 })
    }

    // Busca a sessão
    const { data: session, error: sessionError } = await supabase
      .from('apprentice_sessions')
      .select('*')
      .eq('id', session_id)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Sessão não encontrada' }, { status: 404 })
    }

    // Busca os trials da sessão
    const { data: trialsData, error: trialsError } = await supabase
      .from('apprentice_trials')
      .select('trial_index, is_correct, latency_ms, correct_stimulus_id, selected_stimulus_id')
      .eq('session_id', session_id)
      .order('trial_index', { ascending: true })

    if (trialsError || !trialsData || trialsData.length === 0) {
      return NextResponse.json({ error: 'Trials não encontrados' }, { status: 404 })
    }

    const trials = trialsData as Trial[]

    // Métricas base
    const totalTrials = trials.length
    const correctTrials = trials.filter(t => t.is_correct).length
    const incorrectTrials = totalTrials - correctTrials
    const accuracy = correctTrials / totalTrials

    // Latência
    const trialsComLatencia = trials.filter(t => t.latency_ms !== null && t.latency_ms > 0)
    const avgLatency = trialsComLatencia.length > 0
      ? trialsComLatencia.reduce((s, t) => s + t.latency_ms!, 0) / trialsComLatencia.length
      : null

    // Tendência de latência
    const latencyTrend = calcLatencyTrend(trials)

    // Índice de independência (acertos nas primeiras tentativas — sem considerar retentativas)
    const independenceIndex = accuracy // V1: simplificado, sem dados de dica ainda

    // Consistência
    const consistencyScore = calcConsistency(trials)

    // Análise por estímulo
    const stimulusAnalysis: Record<string, { acertos: number; erros: number; latencia_media: number | null }> = {}
    trials.forEach(t => {
      const id = t.correct_stimulus_id
      if (!stimulusAnalysis[id]) stimulusAnalysis[id] = { acertos: 0, erros: 0, latencia_media: null }
      if (t.is_correct) stimulusAnalysis[id].acertos++
      else stimulusAnalysis[id].erros++
    })
    // Calcula latência média por estímulo
    Object.keys(stimulusAnalysis).forEach(id => {
      const trialsDoEstimulo = trials.filter(t => t.correct_stimulus_id === id && t.latency_ms !== null)
      stimulusAnalysis[id].latencia_media = trialsDoEstimulo.length > 0
        ? trialsDoEstimulo.reduce((s, t) => s + t.latency_ms!, 0) / trialsDoEstimulo.length
        : null
    })

    // Barreiras
    const barriers = detectBarriers(trials, accuracy, latencyTrend, consistencyScore)

    // Verifica maestria (busca critério da task)
    const { data: task } = await supabase
      .from('apprentice_tasks')
      .select('mastery_criterion')
      .eq('id', session.task_id)
      .single()

    const masteryCriterion = task?.mastery_criterion ?? 0.8
    const masteryReached = accuracy >= masteryCriterion && consistencyScore >= 0.7

    // Próxima ação
    const { action: nextAction, type: nextActionType } = calcNextAction(
      accuracy, latencyTrend, consistencyScore, barriers, masteryReached
    )

    // Monta resultado
    const engineResult: EngineResult = {
      session_id,
      task_id: session.task_id,
      child_id: session.child_id,
      accuracy,
      total_trials: totalTrials,
      correct_trials: correctTrials,
      incorrect_trials: incorrectTrials,
      avg_latency_ms: avgLatency,
      latency_trend: latencyTrend,
      independence_index: independenceIndex,
      consistency_score: consistencyScore,
      barriers,
      stimulus_analysis: stimulusAnalysis,
      next_action: nextAction,
      next_action_type: nextActionType,
      mastery_reached: masteryReached,
      created_at: new Date().toISOString(),
    }

    // Salva em apprentice_engine_results
    const { error: insertError } = await supabase
      .from('apprentice_engine_results')
      .insert(engineResult)

    if (insertError) {
      console.error('Erro ao salvar engine result:', insertError)
      return NextResponse.json({ error: 'Erro ao salvar análise' }, { status: 500 })
    }

    return NextResponse.json({ success: true, result: engineResult })

  } catch (err) {
    console.error('FractaEngine error:', err)
    return NextResponse.json({ error: 'Erro interno do engine' }, { status: 500 })
  }
}
