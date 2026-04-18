/**
 * FractaEngine — Forecast Module
 * src/lib/fracta/forecast.ts
 *
 * Calcula previsibilidade dinâmica baseada em:
 *   A) Delta entre os dois últimos radar_snapshots (evolução real)
 *   B) Taxa de adesão e performance nas sessoes/programas
 *   C) Confiança baseada em volume de dados disponíveis
 *
 * Retorna duas versões:
 *   - care: linguagem acolhedora para pais
 *   - clinic: dados estruturados para terapeutas
 */

import { Dominio, DOMINIO_LABELS } from './scoring'

// ─────────────────────────────────────────────
// TIPOS DE ENTRADA (vindos do Supabase)
// ─────────────────────────────────────────────

export type RadarSnapshot = {
  id: string
  crianca_id: string
  criado_em: string
  score_comunicacao: number
  score_social: number
  score_atencao: number
  score_regulacao: number
  score_brincadeira: number
  score_flexibilidade: number
  score_autonomia: number
  score_motivacao: number
}

export type DadosSessao = {
  total_sessoes: number
  sessoes_ultimos_14d: number
  media_acertos?: number // 0–100
}

// ─────────────────────────────────────────────
// TIPOS DE SAÍDA
// ─────────────────────────────────────────────

export type ForecastDominio = {
  dominio: Dominio
  score_atual: number
  delta_14d: number       // pontos ganhos/perdidos nos últimos 14 dias
  forecast_4w: number     // projeção em 4 semanas (0–100)
  tendencia: 'crescendo' | 'estavel' | 'atencao'
  confianca: number       // 0–1
}

export type ForecastResultado = {
  crianca_id: string
  calculado_em: string
  dados_suficientes: boolean
  adesao_geral: number    // 0–1 (taxa de sessões nos últimos 14 dias)
  dominios: ForecastDominio[]
  // Frente Care (linguagem para pais)
  care: {
    mensagem_principal: string
    dominio_destaque: Dominio
    estimativa_semanas: number | null
    motivacao: string
  }
  // Frente Clinic (dados para terapeutas)
  clinic: {
    acao_recomendada: 'manter_plano' | 'intensificar' | 'revisar_metas' | 'avaliar_barreiras'
    alerta: string | null
    resumo_clinico: string
  }
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

/** Mapeia nome do score no snapshot para chave de domínio */
const SCORE_KEY_MAP: Record<Dominio, keyof RadarSnapshot> = {
  comunicacao: 'score_comunicacao',
  social: 'score_social',
  atencao: 'score_atencao',
  regulacao: 'score_regulacao',
  brincadeira: 'score_brincadeira',
  flexibilidade: 'score_flexibilidade',
  autonomia: 'score_autonomia',
  motivacao: 'score_motivacao',
}

const DOMINIOS: Dominio[] = [
  'comunicacao', 'social', 'atencao', 'regulacao',
  'brincadeira', 'flexibilidade', 'autonomia', 'motivacao',
]

function clamp(val: number, min: number, max: number) {
  return Math.max(min, Math.min(max, val))
}

function diasEntre(a: string, b: string): number {
  const msA = new Date(a).getTime()
  const msB = new Date(b).getTime()
  return Math.abs((msB - msA) / (1000 * 60 * 60 * 24))
}

// ─────────────────────────────────────────────
// MENSAGENS PARA PAIS (Care)
// ─────────────────────────────────────────────

const MENSAGENS_CARE: Record<
  ForecastDominio['tendencia'],
  (dominio: string, semanas: number | null) => string
> = {
  crescendo: (d, s) =>
    s
      ? `${d} está evoluindo! Mantendo o ritmo, uma nova habilidade deve surgir em cerca de ${s} semana${s > 1 ? 's' : ''}.`
      : `${d} está em crescimento — continue com as atividades!`,
  estavel: (d, _s) =>
    `${d} está estável. Pequenas variações no dia a dia são normais — siga em frente.`,
  atencao: (d, _s) =>
    `${d} merece um pouco mais de atenção esta semana. As atividades podem ajudar.`,
}

const MOTIVACOES = [
  'Cada pequeno avanço conta — você está no caminho certo.',
  'Consistência é o maior motor do desenvolvimento.',
  'Pequenas experiências diárias constroem grandes habilidades.',
  'A presença de vocês faz toda a diferença no desenvolvimento.',
  'Todo progresso, por menor que seja, é real e importante.',
]

// ─────────────────────────────────────────────
// FUNÇÃO PRINCIPAL: calcularForecast()
// ─────────────────────────────────────────────

export function calcularForecast(
  crianca_id: string,
  snapshots: RadarSnapshot[],     // ordenados por criado_em DESC (mais recente primeiro)
  sessoes: DadosSessao
): ForecastResultado {
  const agora = new Date().toISOString()
  const temDoisSnapshots = snapshots.length >= 2

  // ── Taxa de adesão (sessões nos últimos 14 dias vs esperado = 10 sessões/14 dias)
  const sessoes_esperadas_14d = 10
  const adesao_geral = clamp(
    sessoes.sessoes_ultimos_14d / sessoes_esperadas_14d,
    0,
    1
  )

  // ── Calcular forecast por domínio
  const dominios: ForecastDominio[] = DOMINIOS.map((dominio) => {
    const key = SCORE_KEY_MAP[dominio]
    const score_atual = snapshots[0] ? Number(snapshots[0][key]) : 0

    let delta_14d = 0
    let confianca = 0.3 // confiança base sem dados históricos

    if (temDoisSnapshots) {
      const score_anterior = Number(snapshots[1][key])
      const dias = diasEntre(snapshots[1].criado_em, snapshots[0].criado_em)
      // Normaliza delta para 14 dias
      delta_14d = Math.round(((score_atual - score_anterior) / Math.max(dias, 1)) * 14)
      // Confiança aumenta com mais dados e adesão
      confianca = clamp(0.4 + adesao_geral * 0.4 + (snapshots.length > 2 ? 0.2 : 0), 0, 1)
    }

    // Tendência
    let tendencia: ForecastDominio['tendencia']
    if (delta_14d >= 3) tendencia = 'crescendo'
    else if (delta_14d >= -2) tendencia = 'estavel'
    else tendencia = 'atencao'

    // Projeção em 4 semanas (2 períodos de 14 dias)
    // Taxa de crescimento esperada: delta atual * adesão * fator de rendimentos decrescentes
    const fator_crescimento = delta_14d * adesao_geral
    const ganho_projetado_4w = Math.round(fator_crescimento * 2 * 0.85) // leve desconto
    const forecast_4w = clamp(score_atual + ganho_projetado_4w, 0, 100)

    return {
      dominio,
      score_atual,
      delta_14d,
      forecast_4w,
      tendencia,
      confianca,
    }
  })

  // ── Domínio em maior crescimento (para destaque no Care)
  const dominio_destaque = dominios
    .filter((d) => d.tendencia === 'crescendo')
    .sort((a, b) => b.delta_14d - a.delta_14d)[0]
    ?? dominios.sort((a, b) => b.score_atual - a.score_atual)[0]

  // ── Estimativa de semanas para próxima habilidade
  // Lógica: quantas semanas para sair da zona emergente (score atual → 71)
  let estimativa_semanas: number | null = null
  if (dominio_destaque.delta_14d > 0 && dominio_destaque.score_atual < 71) {
    const pontos_necessarios = 71 - dominio_destaque.score_atual
    const semanas = Math.ceil(pontos_necessarios / (dominio_destaque.delta_14d / 2))
    estimativa_semanas = semanas <= 12 ? semanas : null // só mostra se razoável
  }

  // ── Mensagem Care
  const mensagem_principal = MENSAGENS_CARE[dominio_destaque.tendencia](
    DOMINIO_LABELS[dominio_destaque.dominio],
    estimativa_semanas
  )
  const motivacao = MOTIVACOES[Math.floor(Math.random() * MOTIVACOES.length)]

  // ── Ação clínica recomendada
  const dominios_em_atencao = dominios.filter((d) => d.tendencia === 'atencao').length
  const media_score = Math.round(
    dominios.reduce((acc, d) => acc + d.score_atual, 0) / dominios.length
  )

  let acao_recomendada: ForecastResultado['clinic']['acao_recomendada']
  let alerta: string | null = null

  if (adesao_geral < 0.3) {
    acao_recomendada = 'avaliar_barreiras'
    alerta = `Baixa adesão detectada (${Math.round(adesao_geral * 100)}% nos últimos 14 dias). Verificar barreiras familiares.`
  } else if (dominios_em_atencao >= 3) {
    acao_recomendada = 'revisar_metas'
    alerta = `${dominios_em_atencao} domínios com delta negativo. Considerar revisão de metas e dificuldade das atividades.`
  } else if (media_score >= 65 && adesao_geral >= 0.6) {
    acao_recomendada = 'manter_plano'
  } else {
    acao_recomendada = 'intensificar'
  }

  const resumo_clinico = gerarResumoClinco({
    media_score,
    adesao_geral,
    dominios_em_atencao,
    dominio_destaque: dominio_destaque.dominio,
    delta_destaque: dominio_destaque.delta_14d,
    temDados: temDoisSnapshots,
  })

  return {
    crianca_id,
    calculado_em: agora,
    dados_suficientes: temDoisSnapshots,
    adesao_geral,
    dominios,
    care: {
      mensagem_principal,
      dominio_destaque: dominio_destaque.dominio,
      estimativa_semanas,
      motivacao,
    },
    clinic: {
      acao_recomendada,
      alerta,
      resumo_clinico,
    },
  }
}

// ─────────────────────────────────────────────
// HELPERS INTERNOS
// ─────────────────────────────────────────────

function gerarResumoClinco({
  media_score,
  adesao_geral,
  dominios_em_atencao,
  dominio_destaque,
  delta_destaque,
  temDados,
}: {
  media_score: number
  adesao_geral: number
  dominios_em_atencao: number
  dominio_destaque: Dominio
  delta_destaque: number
  temDados: boolean
}): string {
  if (!temDados) {
    return `Score médio atual: ${media_score}/100. Dados insuficientes para previsibilidade — aguardar segunda avaliação.`
  }

  const adesaoStr = `${Math.round(adesao_geral * 100)}%`
  const alertaStr = dominios_em_atencao > 0
    ? ` ${dominios_em_atencao} domínio(s) com regressão.`
    : ' Sem regressões detectadas.'

  return (
    `Score médio: ${media_score}/100. Adesão (14d): ${adesaoStr}.` +
    ` Domínio em maior progresso: ${DOMINIO_LABELS[dominio_destaque]} (+${delta_destaque}pts/14d).` +
    alertaStr
  )
}
