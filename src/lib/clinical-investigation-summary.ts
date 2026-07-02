// src/lib/clinical-investigation-summary.ts
// FCRM-003 — Resumo da Investigação (calculado em runtime, sem tabela nova).
//
// Deriva o resumo a partir de dados já existentes:
//   clinical_investigation_evidence (vínculos Session)
//   + sessoes_v2 (data real da sessão: inicio)
//   + session_summary.programas_json (programas trabalhados)
//
// Não exige preenchimento novo do terapeuta. Retorno { data, error } explícito.

import { supabase } from "@/lib/supabase"
import type { Resultado } from "@/lib/clinical-investigations"

// Instrumentos de avaliação — NUNCA entram como "programas trabalhados"
// (mesmo critério canônico de montar-relatorio-fase.ts).
const INSTRUMENTOS_AVALIACAO = ['vb-mapp', 'vbmapp', 'peak', 'ablls', 'ablls-r', 'afls']
function ehInstrumentoAvaliacao(nome: string): boolean {
  const n = (nome ?? '').toLowerCase()
  return INSTRUMENTOS_AVALIACAO.some(i => n.includes(i))
}
function ehAreaAvaliacao(p: { area?: string; tipo?: string }): boolean {
  return p?.area === 'avaliacao' || p?.tipo === 'assessment'
}

export interface ResumoInvestigacao {
  totalEvidencias: number
  totalSessoes: number
  primeiraSessao: string | null    // ISO — sessoes_v2.inicio (data clínica real)
  ultimaSessao: string | null      // ISO — sessoes_v2.inicio
  programas: string[]              // programas de ensino (dedupe), sem instrumentos
  ultimaAtualizacao: string | null // ISO — max(vínculo mais recente, investigation.updated_at)
}

export async function obterResumoInvestigacao(
  investigationId: string
): Promise<Resultado<ResumoInvestigacao>> {
  // 1. Evidências (Session) da investigação
  const { data: evid, error: errEvid } = await supabase
    .from("clinical_investigation_evidence")
    .select("source_id, created_at")
    .eq("investigation_id", investigationId)
    .eq("source_type", "Session")
  if (errEvid) return { data: null, error: errEvid.message }

  const evidencias = (evid ?? []) as { source_id: string; created_at: string }[]
  const totalEvidencias = evidencias.length
  const sessionIds = [...new Set(evidencias.map(e => e.source_id))]

  // updated_at da investigação (para "última atualização")
  const { data: inv, error: errInv } = await supabase
    .from("clinical_investigations")
    .select("updated_at")
    .eq("id", investigationId)
    .single()
  if (errInv) return { data: null, error: errInv.message }

  const maxVinculo = evidencias.reduce<string | null>(
    (acc, e) => (!acc || e.created_at > acc) ? e.created_at : acc, null)
  const ultimaAtualizacao =
    [inv?.updated_at ?? null, maxVinculo].filter((x): x is string => !!x).sort().pop() ?? null

  // Sem evidências → resumo zerado (guarda contra .in([]) malformado)
  if (sessionIds.length === 0) {
    return {
      data: {
        totalEvidencias: 0, totalSessoes: 0,
        primeiraSessao: null, ultimaSessao: null,
        programas: [], ultimaAtualizacao,
      },
      error: null,
    }
  }

  // 2. Datas reais das sessões
  const { data: sess, error: errSess } = await supabase
    .from("sessoes_v2")
    .select("id, inicio")
    .in("id", sessionIds)
  if (errSess) return { data: null, error: errSess.message }

  const inicios = (sess ?? [])
    .map((s: { inicio: string | null }) => s.inicio)
    .filter((x): x is string => !!x)
    .sort()
  const primeiraSessao = inicios[0] ?? null
  const ultimaSessao = inicios.length > 0 ? inicios[inicios.length - 1] : null

  // 3. Programas de ensino (session_summary.programas_json), excluindo instrumentos
  const { data: summaries, error: errSum } = await supabase
    .from("session_summary")
    .select("programas_json")
    .in("sessao_id", sessionIds)
  if (errSum) return { data: null, error: errSum.message }

  const nomes = new Set<string>()
  for (const s of (summaries ?? []) as { programas_json: any[] | null }[]) {
    for (const p of (s.programas_json ?? [])) {
      const nome = (p?.nome ?? '').trim()
      if (!nome) continue
      if (ehAreaAvaliacao(p) || ehInstrumentoAvaliacao(nome)) continue
      nomes.add(nome)
    }
  }

  return {
    data: {
      totalEvidencias,
      totalSessoes: sessionIds.length,
      primeiraSessao,
      ultimaSessao,
      programas: [...nomes].sort((a, b) => a.localeCompare(b, 'pt-BR')),
      ultimaAtualizacao,
    },
    error: null,
  }
}
