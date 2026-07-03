// src/lib/programa-workspace.ts
// Treatment-003 — Program Workspace: agrega, para UMA instância de programa
// (plano_programa), tudo que já existe: identidade, critérios, SD, hierarquia
// de dicas, fase/baseline (lidos), tentativas/sessões, e perguntas clínicas
// relacionadas (FCRM-005). Read-only + reuso das ações existentes.
//
// Chaveado em plano_programa_id (evita o mismatch de fase do modelo legado).
// Sem IA, sem Recommendation/Document Engine: métricas e sugestão de avanço
// apenas LIDAS de programa_fases.

import { supabase } from "@/lib/supabase"
import type { Resultado } from "@/lib/clinical-investigations"

export interface FaseWorkspace {
  id: string
  tipo: string                 // baseline | intervention | maintenance | generalization
  rotulo: string | null
  status: string
  ordem: number | null
  sessoesColetadas: number | null
  media: number | null
  coeficienteVariacao: number | null
  tendenciaSlope: number | null
  estabilidadePct: number | null
  sistemaSugeriuAvanco: boolean | null
  sistemaMotivo: string | null
}

export interface PerguntaRelacionada {
  id: string
  title: string
  status: string
  priority: string
}

export interface ProgramaWorkspaceDados {
  planoProgramaId: string
  programaId: string
  criancaId: string | null
  // identidade
  nome: string
  dominio: string | null
  operante: string | null
  status: string               // plano_programas.status
  percentualAtual: number | null
  sessoesNoCriterio: number | null
  iniciadoEm: string | null
  dominadoEm: string | null
  // critérios (2 eixos)
  criterioMaestria: string | null
  criterioPercentual: number | null
  masteryMinIndependence: number | null
  // ensino
  sd: string | null
  hierarquiaDicas: string[]
  estrategiaDica: string | null
  // fase
  faseAtiva: FaseWorkspace | null
  fases: FaseWorkspace[]
  // sessões / tentativas
  totalTentativas: number
  percentualIndependencia: number | null
  numSessoes: number
  ultimaSessao: string | null  // ISO — sessoes_v2.inicio mais recente
  // perguntas clínicas relacionadas (FCRM-005)
  perguntas: PerguntaRelacionada[]
}

function umObjeto(p: unknown): Record<string, unknown> {
  const o = Array.isArray(p) ? p[0] : p
  return (o ?? {}) as Record<string, unknown>
}

function normalizarHierarquia(h: unknown, nivelDicas: unknown): string[] {
  if (Array.isArray(h) && h.length > 0) {
    return h.map(item => typeof item === "string" ? item : (item?.label ?? item?.key ?? "")).filter(Boolean)
  }
  if (nivelDicas && typeof nivelDicas === "object") return Object.keys(nivelDicas as object)
  return []
}

function mapFase(f: Record<string, any>): FaseWorkspace {
  return {
    id: f.id,
    tipo: f.tipo ?? "—",
    rotulo: f.rotulo ?? null,
    status: f.status ?? "—",
    ordem: f.ordem ?? null,
    sessoesColetadas: f.sessoes_coletadas ?? null,
    media: f.media ?? null,
    coeficienteVariacao: f.coeficiente_variacao ?? null,
    tendenciaSlope: f.tendencia_slope ?? null,
    estabilidadePct: f.estabilidade_pct ?? null,
    sistemaSugeriuAvanco: f.sistema_sugeriu_avanco ?? null,
    sistemaMotivo: f.sistema_motivo ?? null,
  }
}

export async function obterProgramaWorkspace(
  planoProgramaId: string
): Promise<Resultado<ProgramaWorkspaceDados>> {
  // 1. Instância + template + paciente
  const { data: pp, error: errPP } = await supabase
    .from("plano_programas")
    .select(`
      id, plano_id, programa_id, status, percentual_atual, sessoes_no_criterio, iniciado_em, dominado_em,
      programas:programa_id ( nome, dominio, operante, sd, hierarquia_dicas, nivel_dicas, criterio_maestria, criterio_percentual, mastery_min_independence, estrategia_dica ),
      planos:plano_id ( crianca_id )
    `)
    .eq("id", planoProgramaId)
    .single()
  if (errPP) return { data: null, error: errPP.message }
  if (!pp) return { data: null, error: "Programa do plano não encontrado." }

  const prog = umObjeto((pp as any).programas)
  const plano = umObjeto((pp as any).planos)
  const criancaId = (plano.crianca_id as string) ?? null

  // 2. Fases (por plano_programa_id — chave correta)
  const { data: fasesRaw, error: errFase } = await supabase
    .from("programa_fases")
    .select("*")
    .eq("plano_programa_id", planoProgramaId)
    .order("ordem", { ascending: true })
  if (errFase) return { data: null, error: errFase.message }
  const fases = (fasesRaw ?? []).map((f: any) => mapFase(f))
  const faseAtiva = fases.find(f => f.status === "ativa") ?? null

  // 3. Tentativas / sessões
  const { data: tent, error: errTent } = await supabase
    .from("sessao_tentativas")
    .select("sessao_id, prompt_level_used, correto")
    .eq("plano_programa_id", planoProgramaId)
  if (errTent) return { data: null, error: errTent.message }
  const tentativas = (tent ?? []) as { sessao_id: string; prompt_level_used: string | null; correto: boolean | null }[]
  const totalTentativas = tentativas.length
  const independentesCorretas = tentativas.filter(t => t.prompt_level_used === "independente" && t.correto === true).length
  const percentualIndependencia = totalTentativas > 0 ? Math.round((independentesCorretas / totalTentativas) * 100) : null
  const sessionIds = [...new Set(tentativas.map(t => t.sessao_id).filter(Boolean))]
  const numSessoes = sessionIds.length

  let ultimaSessao: string | null = null
  if (sessionIds.length > 0) {
    const { data: sess, error: errSess } = await supabase
      .from("sessoes_v2")
      .select("id, inicio")
      .in("id", sessionIds)
    if (errSess) return { data: null, error: errSess.message }
    const inicios = (sess ?? [])
      .map((s: { inicio: string | null }) => s.inicio)
      .filter((x): x is string => !!x)
      .sort()
    ultimaSessao = inicios.length > 0 ? inicios[inicios.length - 1] : null
  }

  // 4. Perguntas clínicas relacionadas (FCRM-005, reverso por plano_programa_id)
  const perguntas: PerguntaRelacionada[] = []
  const { data: vinc, error: errVinc } = await supabase
    .from("clinical_investigation_programs")
    .select("investigation_id")
    .eq("plano_programa_id", planoProgramaId)
  if (errVinc) return { data: null, error: errVinc.message }
  const invIds = [...new Set((vinc ?? []).map((v: { investigation_id: string }) => v.investigation_id))]
  if (invIds.length > 0) {
    const { data: invs, error: errInv } = await supabase
      .from("clinical_investigations")
      .select("id, title, status, priority")
      .in("id", invIds)
    if (errInv) return { data: null, error: errInv.message }
    for (const inv of (invs ?? []) as any[]) {
      perguntas.push({ id: inv.id, title: inv.title, status: inv.status, priority: inv.priority })
    }
  }

  return {
    data: {
      planoProgramaId: (pp as any).id,
      programaId: (pp as any).programa_id,
      criancaId,
      nome: (prog.nome as string) ?? "Programa",
      dominio: (prog.dominio as string) ?? null,
      operante: (prog.operante as string) ?? null,
      status: (pp as any).status ?? "ativo",
      percentualAtual: (pp as any).percentual_atual ?? null,
      sessoesNoCriterio: (pp as any).sessoes_no_criterio ?? null,
      iniciadoEm: (pp as any).iniciado_em ?? null,
      dominadoEm: (pp as any).dominado_em ?? null,
      criterioMaestria: (prog.criterio_maestria as string) ?? null,
      criterioPercentual: (prog.criterio_percentual as number) ?? null,
      masteryMinIndependence: (prog.mastery_min_independence as number) ?? null,
      sd: (prog.sd as string) ?? null,
      hierarquiaDicas: normalizarHierarquia(prog.hierarquia_dicas, prog.nivel_dicas),
      estrategiaDica: (prog.estrategia_dica as string) ?? null,
      faseAtiva,
      fases,
      totalTentativas,
      percentualIndependencia,
      numSessoes,
      ultimaSessao,
      perguntas,
    },
    error: null,
  }
}

// ─── Ação reusada: avançar fase (RPC avancar_fase_programa) ─────────────────
export async function avancarFaseWorkspace(
  faseId: string,
  motivo?: string | null
): Promise<Resultado<string>> {
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return { data: null, error: "Sessão expirada. Faça login novamente." }

  const { data, error } = await supabase.rpc("avancar_fase_programa", {
    p_fase_id: faseId,
    p_aprovado_por: user.id,
    p_motivo: motivo || null,
  })
  if (error) return { data: null, error: error.message }
  return { data: (data as string) ?? "", error: null }
}
