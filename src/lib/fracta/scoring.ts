/**
 * FractaEngine — Scoring Module
 * src/lib/fracta/scoring.ts
 *
 * Responsável por:
 * 1. Receber as respostas brutas do questionário (14 perguntas)
 * 2. Calcular score por domínio (0–100) com peso por idade
 * 3. Detectar domínio prioritário e cúspides emergentes
 * 4. Retornar objeto pronto para INSERT em avaliacoes + radar_snapshots
 */

// ─────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────

export type Dominio =
  | 'comunicacao'
  | 'social'
  | 'atencao'
  | 'regulacao'
  | 'brincadeira'
  | 'flexibilidade'
  | 'autonomia'
  | 'motivacao'

export type RespostaBruta = {
  questao_id: string       // ex: "q1_comunicacao"
  dominio: Dominio
  valor: 0 | 1 | 2 | 3    // 0 = nunca, 1 = raramente, 2 = às vezes, 3 = sempre
}

export type ScoresPorDominio = Record<Dominio, number> // 0–100

export type CuspideEmergente = {
  dominio: Dominio
  nivel: 'emergente' | 'proximo'   // emergente = score 30–55 | proximo = score 56–70
  descricao: string
}

export type ResultadoScoring = {
  scores: ScoresPorDominio
  score_geral: number
  dominio_prioritario: Dominio
  cuspides_emergentes: CuspideEmergente[]
  // Prontos para INSERT direto no Supabase
  para_avaliacoes: ScoresParaAvaliacoes
  para_radar_snapshot: ScoresParaRadar
}

export type ScoresParaAvaliacoes = {
  score_comunicacao: number
  score_social: number
  score_atencao: number
  score_regulacao: number
  score_brincadeira: number
  score_flexibilidade: number
  score_autonomia: number
  score_motivacao: number
  score_geral: number
  dominio_prioritario: string
}

export type ScoresParaRadar = {
  score_comunicacao: number
  score_social: number
  score_atencao: number
  score_regulacao: number
  score_brincadeira: number
  score_flexibilidade: number
  score_autonomia: number
  score_motivacao: number
}

// ─────────────────────────────────────────────
// PERGUNTAS DO QUESTIONÁRIO
// Estrutura usada pelo front para renderizar o fluxo
// ─────────────────────────────────────────────

export type Pergunta = {
  id: string
  dominio: Dominio
  texto: string
  exemplo?: string
  opcoes: { label: string; valor: 0 | 1 | 2 | 3 }[]
}

export const PERGUNTAS: Pergunta[] = [
  // ── COMUNICAÇÃO (2 perguntas)
  {
    id: 'q1_comunicacao',
    dominio: 'comunicacao',
    texto: 'Seu filho consegue pedir o que quer de alguma forma?',
    exemplo: 'Com palavras, gestos, apontar ou sons',
    opcoes: [
      { label: 'Ainda não', valor: 0 },
      { label: 'Raramente', valor: 1 },
      { label: 'Às vezes', valor: 2 },
      { label: 'Sim, com frequência', valor: 3 },
    ],
  },
  {
    id: 'q2_comunicacao',
    dominio: 'comunicacao',
    texto: 'Ele responde quando você chama o nome dele?',
    opcoes: [
      { label: 'Quase nunca', valor: 0 },
      { label: 'Raramente', valor: 1 },
      { label: 'Às vezes', valor: 2 },
      { label: 'Quase sempre', valor: 3 },
    ],
  },

  // ── SOCIAL (2 perguntas)
  {
    id: 'q3_social',
    dominio: 'social',
    texto: 'Seu filho demonstra interesse em brincar com outras crianças ou adultos?',
    opcoes: [
      { label: 'Prefere ficar sozinho', valor: 0 },
      { label: 'Raramente busca contato', valor: 1 },
      { label: 'Às vezes se aproxima', valor: 2 },
      { label: 'Gosta de companhia', valor: 3 },
    ],
  },
  {
    id: 'q4_social',
    dominio: 'social',
    texto: 'Ele olha nos olhos quando interage com você?',
    opcoes: [
      { label: 'Quase nunca', valor: 0 },
      { label: 'Por poucos segundos', valor: 1 },
      { label: 'Com alguma frequência', valor: 2 },
      { label: 'Naturalmente', valor: 3 },
    ],
  },

  // ── ATENÇÃO (2 perguntas)
  {
    id: 'q5_atencao',
    dominio: 'atencao',
    texto: 'Seu filho consegue se concentrar em uma atividade por alguns minutos?',
    exemplo: 'Montar peças, folhear livro, assistir algo',
    opcoes: [
      { label: 'Muito difícil, menos de 1 min', valor: 0 },
      { label: '1 a 2 minutos', valor: 1 },
      { label: '3 a 5 minutos', valor: 2 },
      { label: 'Mais de 5 minutos', valor: 3 },
    ],
  },
  {
    id: 'q6_atencao',
    dominio: 'atencao',
    texto: 'Ele consegue seguir uma instrução simples?',
    exemplo: '"Pega o brinquedo" ou "Vai lá buscar"',
    opcoes: [
      { label: 'Ainda não', valor: 0 },
      { label: 'Com muita insistência', valor: 1 },
      { label: 'Às vezes', valor: 2 },
      { label: 'Com facilidade', valor: 3 },
    ],
  },

  // ── REGULAÇÃO EMOCIONAL (2 perguntas)
  {
    id: 'q7_regulacao',
    dominio: 'regulacao',
    texto: 'Quando algo não acontece como ele espera, como ele costuma reagir?',
    opcoes: [
      { label: 'Muita dificuldade para se acalmar', valor: 0 },
      { label: 'Bastante agitado', valor: 1 },
      { label: 'Fica frustrado, mas passa', valor: 2 },
      { label: 'Lida bem', valor: 3 },
    ],
  },
  {
    id: 'q8_regulacao',
    dominio: 'regulacao',
    texto: 'Mudanças de rotina costumam ser difíceis para ele?',
    opcoes: [
      { label: 'Muito difíceis', valor: 0 },
      { label: 'Bastante difíceis', valor: 1 },
      { label: 'Um pouco difíceis', valor: 2 },
      { label: 'Tranquilas', valor: 3 },
    ],
  },

  // ── BRINCADEIRA (1 pergunta)
  {
    id: 'q9_brincadeira',
    dominio: 'brincadeira',
    texto: 'Como é a brincadeira do seu filho?',
    opcoes: [
      { label: 'Repetitiva, com poucos brinquedos', valor: 0 },
      { label: 'Limitada a um tipo só', valor: 1 },
      { label: 'Variada, com alguma criatividade', valor: 2 },
      { label: 'Criativa e imaginativa', valor: 3 },
    ],
  },

  // ── FLEXIBILIDADE (1 pergunta)
  {
    id: 'q10_flexibilidade',
    dominio: 'flexibilidade',
    texto: 'Seu filho tem dificuldade para parar uma atividade que gosta?',
    exemplo: 'Celular, TV, brincadeira favorita',
    opcoes: [
      { label: 'Muita dificuldade', valor: 0 },
      { label: 'Bastante difícil', valor: 1 },
      { label: 'Um pouco difícil', valor: 2 },
      { label: 'Consegue bem', valor: 3 },
    ],
  },

  // ── AUTONOMIA (2 perguntas)
  {
    id: 'q11_autonomia',
    dominio: 'autonomia',
    texto: 'Ele consegue fazer coisas básicas sozinho?',
    exemplo: 'Beber água, pegar um brinquedo, se vestir com ajuda',
    opcoes: [
      { label: 'Precisamos fazer tudo por ele', valor: 0 },
      { label: 'Poucas coisas sozinho', valor: 1 },
      { label: 'Algumas coisas com ajuda', valor: 2 },
      { label: 'Bastante independente', valor: 3 },
    ],
  },
  {
    id: 'q12_autonomia',
    dominio: 'autonomia',
    texto: 'Quando quer algo, ele tenta resolver antes de pedir ajuda?',
    opcoes: [
      { label: 'Nunca, sempre pede imediatamente', valor: 0 },
      { label: 'Raramente tenta', valor: 1 },
      { label: 'Às vezes tenta', valor: 2 },
      { label: 'Costuma tentar primeiro', valor: 3 },
    ],
  },

  // ── MOTIVAÇÃO (2 perguntas)
  {
    id: 'q13_motivacao',
    dominio: 'motivacao',
    texto: 'Seu filho demonstra entusiasmo por coisas que gosta?',
    opcoes: [
      { label: 'Pouco interesse por quase tudo', valor: 0 },
      { label: 'Interesse limitado', valor: 1 },
      { label: 'Alguns interesses claros', valor: 2 },
      { label: 'Muito entusiasmado', valor: 3 },
    ],
  },
  {
    id: 'q14_motivacao',
    dominio: 'motivacao',
    texto: 'Ele persiste em uma tarefa mesmo quando tem dificuldade?',
    opcoes: [
      { label: 'Desiste rapidamente', valor: 0 },
      { label: 'Tenta poucas vezes', valor: 1 },
      { label: 'Tenta algumas vezes', valor: 2 },
      { label: 'Persiste bastante', valor: 3 },
    ],
  },
]

// ─────────────────────────────────────────────
// PESOS POR IDADE
// Ajusta impacto do score conforme expectativa desenvolvimental
// ─────────────────────────────────────────────

type PesoIdade = {
  min_anos: number
  max_anos: number
  pesos: Partial<Record<Dominio, number>>
}

const PESOS_IDADE: PesoIdade[] = [
  {
    // Bebês e crianças muito pequenas (1–2 anos)
    min_anos: 1,
    max_anos: 2,
    pesos: {
      comunicacao: 1.3,
      social: 1.2,
      atencao: 0.8,
      regulacao: 0.7,
      brincadeira: 1.0,
      flexibilidade: 0.6,
      autonomia: 0.7,
      motivacao: 1.0,
    },
  },
  {
    // Pré-escolar (3–4 anos)
    min_anos: 3,
    max_anos: 4,
    pesos: {
      comunicacao: 1.2,
      social: 1.2,
      atencao: 1.1,
      regulacao: 1.0,
      brincadeira: 1.1,
      flexibilidade: 0.9,
      autonomia: 1.0,
      motivacao: 1.0,
    },
  },
  {
    // Idade escolar inicial (5–7 anos)
    min_anos: 5,
    max_anos: 7,
    pesos: {
      comunicacao: 1.0,
      social: 1.1,
      atencao: 1.3,
      regulacao: 1.2,
      brincadeira: 0.9,
      flexibilidade: 1.1,
      autonomia: 1.2,
      motivacao: 1.1,
    },
  },
  {
    // 8+ anos
    min_anos: 8,
    max_anos: 18,
    pesos: {
      comunicacao: 1.0,
      social: 1.0,
      atencao: 1.2,
      regulacao: 1.2,
      brincadeira: 0.8,
      flexibilidade: 1.1,
      autonomia: 1.3,
      motivacao: 1.1,
    },
  },
]

function getPesosPorIdade(idade_anos: number): Record<Dominio, number> {
  const defaults: Record<Dominio, number> = {
    comunicacao: 1.0,
    social: 1.0,
    atencao: 1.0,
    regulacao: 1.0,
    brincadeira: 1.0,
    flexibilidade: 1.0,
    autonomia: 1.0,
    motivacao: 1.0,
  }

  const faixa = PESOS_IDADE.find(
    (f) => idade_anos >= f.min_anos && idade_anos <= f.max_anos
  )

  if (!faixa) return defaults

  return { ...defaults, ...faixa.pesos }
}

// ─────────────────────────────────────────────
// DESCRIÇÕES DE CÚSPIDES EMERGENTES
// ─────────────────────────────────────────────

const DESCRICOES_CUSPIDES: Record<Dominio, string> = {
  comunicacao: 'Habilidade de comunicação funcional prestes a se expandir',
  social: 'Interesse social emergindo — base para vínculos mais ricos',
  atencao: 'Capacidade de atenção compartilhada em desenvolvimento',
  regulacao: 'Estratégias de autorregulação começando a se consolidar',
  brincadeira: 'Repertório de brincadeira pronto para ganhar variedade',
  flexibilidade: 'Tolerância à mudança mostrando primeiros sinais de crescimento',
  autonomia: 'Iniciativa e independência emergindo naturalmente',
  motivacao: 'Motivação intrínseca pronta para ser fortalecida',
}

// ─────────────────────────────────────────────
// FUNÇÃO PRINCIPAL: calcularScores()
// ─────────────────────────────────────────────

export function calcularScores(
  respostas: RespostaBruta[],
  idade_anos: number
): ResultadoScoring {
  const dominios: Dominio[] = [
    'comunicacao',
    'social',
    'atencao',
    'regulacao',
    'brincadeira',
    'flexibilidade',
    'autonomia',
    'motivacao',
  ]

  const pesos = getPesosPorIdade(idade_anos)

  // ── 1. Agrupar respostas por domínio
  const respostasPorDominio: Partial<Record<Dominio, number[]>> = {}
  for (const r of respostas) {
    if (!respostasPorDominio[r.dominio]) respostasPorDominio[r.dominio] = []
    respostasPorDominio[r.dominio]!.push(r.valor)
  }

  // ── 2. Calcular score bruto por domínio (0–100)
  const scores: ScoresPorDominio = {} as ScoresPorDominio
  for (const dominio of dominios) {
    const vals = respostasPorDominio[dominio] ?? []
    if (vals.length === 0) {
      scores[dominio] = 0
      continue
    }
    // Máximo possível: nº de perguntas × 3
    const maxPossivel = vals.length * 3
    const soma = vals.reduce((acc, v) => acc + v, 0)
    const scoreBase = Math.round((soma / maxPossivel) * 100)
    // Aplica peso por idade, clamped em 0–100
    scores[dominio] = Math.min(100, Math.round(scoreBase * pesos[dominio]))
  }

  // ── 3. Score geral (média ponderada)
  const score_geral = Math.round(
    dominios.reduce((acc, d) => acc + scores[d], 0) / dominios.length
  )

  // ── 4. Domínio prioritário (menor score = mais precisa de atenção)
  const dominio_prioritario = dominios.reduce((menor, d) =>
    scores[d] < scores[menor] ? d : menor
  )

  // ── 5. Detectar cúspides emergentes (score entre 30 e 70)
  const cuspides_emergentes: CuspideEmergente[] = dominios
    .filter((d) => scores[d] >= 30 && scores[d] <= 70)
    .map((d) => ({
      dominio: d,
      nivel: scores[d] <= 55 ? ('emergente' as const) : ('proximo' as const),
      descricao: DESCRICOES_CUSPIDES[d],
    }))
    // Ordenar: emergentes primeiro, depois próximos
    .sort((a, b) => (a.nivel === 'emergente' ? -1 : 1))

  // ── 6. Montar objetos para INSERT no Supabase
  const para_avaliacoes: ScoresParaAvaliacoes = {
    score_comunicacao: scores.comunicacao,
    score_social: scores.social,
    score_atencao: scores.atencao,
    score_regulacao: scores.regulacao,
    score_brincadeira: scores.brincadeira,
    score_flexibilidade: scores.flexibilidade,
    score_autonomia: scores.autonomia,
    score_motivacao: scores.motivacao,
    score_geral,
    dominio_prioritario,
  }

  const para_radar_snapshot: ScoresParaRadar = {
    score_comunicacao: scores.comunicacao,
    score_social: scores.social,
    score_atencao: scores.atencao,
    score_regulacao: scores.regulacao,
    score_brincadeira: scores.brincadeira,
    score_flexibilidade: scores.flexibilidade,
    score_autonomia: scores.autonomia,
    score_motivacao: scores.motivacao,
  }

  return {
    scores,
    score_geral,
    dominio_prioritario,
    cuspides_emergentes,
    para_avaliacoes,
    para_radar_snapshot,
  }
}

// ─────────────────────────────────────────────
// HELPERS UTILITÁRIOS (usados pelo front)
// ─────────────────────────────────────────────

/** Rótulo legível para cada domínio (para exibir no radar e cards) */
export const DOMINIO_LABELS: Record<Dominio, string> = {
  comunicacao: 'Comunicação',
  social: 'Social',
  atencao: 'Atenção',
  regulacao: 'Regulação',
  brincadeira: 'Brincadeira',
  flexibilidade: 'Flexibilidade',
  autonomia: 'Autonomia',
  motivacao: 'Motivação',
}

/** Cor de cada domínio (consistente em todo o sistema) */
export const DOMINIO_CORES: Record<Dominio, string> = {
  comunicacao: '#2BBFA4',
  social: '#4FC3D8',
  atencao: '#7AE040',
  regulacao: '#2A7BA8',
  brincadeira: '#A78BFA',
  flexibilidade: '#F59E0B',
  autonomia: '#34D399',
  motivacao: '#F87171',
}

/** Ícone SVG path de cada domínio */
export const DOMINIO_ICONES: Record<Dominio, string> = {
  comunicacao: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z',
  social: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0',
  atencao: 'M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z',
  regulacao: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z',
  brincadeira: 'M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  flexibilidade: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15',
  autonomia: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z',
  motivacao: 'M13 10V3L4 14h7v7l9-11h-7z',
}

/**
 * Interpreta o score de um domínio em linguagem acolhedora para pais.
 * Nunca usa termos alarmistas — sempre foca em potencial.
 */
export function interpretarScore(dominio: Dominio, score: number): string {
  if (score >= 75) {
    return `${DOMINIO_LABELS[dominio]} é um ponto forte — continue estimulando!`
  }
  if (score >= 56) {
    return `${DOMINIO_LABELS[dominio]} está em bom desenvolvimento, com espaço para crescer.`
  }
  if (score >= 30) {
    return `${DOMINIO_LABELS[dominio]} tem habilidades emergindo — é o momento ideal para estimular.`
  }
  return `${DOMINIO_LABELS[dominio]} é uma área com muitas oportunidades de crescimento.`
}
