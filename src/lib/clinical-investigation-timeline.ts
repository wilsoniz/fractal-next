// src/lib/clinical-investigation-timeline.ts
// FCRM-006 — Timeline Clínica: agrega, em ordem cronológica, os eventos já
// existentes de uma Pergunta Clínica. Read-only, zero migration.
//
// Fontes (só leitura):
//   clinical_investigations            → criada / encerrada + updated_at (metadado)
//   clinical_investigation_programs    → cada programa vinculado (FCRM-005)
//   clinical_investigation_evidence    → cada sessão-evidência (FCRM-002)
//   sessoes_v2.inicio                  → data clínica real da sessão
//
// Decisões (FCRM-006): sessão-evidência usa sessoes_v2.inicio (data real, mesmo
// que vinculada depois); ordem ascendente (mais antigo → mais recente);
// updated_at é metadado, não é nó da timeline; sem auditoria de edição.

import { supabase } from "@/lib/supabase"
import type { Resultado } from "@/lib/clinical-investigations"

export type TimelineEventType = 'criada' | 'encerrada' | 'programa_vinculado' | 'sessao_evidencia'

export interface TimelineEvent {
  tipo: TimelineEventType
  data: string          // ISO
  titulo: string
  detalhe?: string
}

export interface TimelineInvestigacao {
  eventos: TimelineEvent[]
  ultimaAtualizacao: string | null   // metadado (updated_at) — não é evento
}

// Embed to-one pode vir como objeto ou array (1 elemento) — normaliza.
function normNome(p: unknown): string {
  const o = Array.isArray(p) ? p[0] : p
  return (o as { nome?: string })?.nome ?? "Programa"
}

export async function montarTimelineInvestigacao(
  investigationId: string
): Promise<Resultado<TimelineInvestigacao>> {
  const eventos: TimelineEvent[] = []

  // 1. Investigação: criada / encerrada + updated_at (metadado)
  const { data: inv, error: errInv } = await supabase
    .from("clinical_investigations")
    .select("created_at, closed_at, status, updated_at")
    .eq("id", investigationId)
    .single()
  if (errInv) return { data: null, error: errInv.message }
  if (!inv) return { data: null, error: "Pergunta clínica não encontrada." }

  if (inv.created_at)
    eventos.push({ tipo: 'criada', data: inv.created_at, titulo: "Pergunta clínica criada" })
  if (inv.status === 'Closed' && inv.closed_at)
    eventos.push({ tipo: 'encerrada', data: inv.closed_at, titulo: "Investigação encerrada" })

  // 2. Programas vinculados (FCRM-005)
  const { data: vinc, error: errVinc } = await supabase
    .from("clinical_investigation_programs")
    .select("created_at, plano_programa_id")
    .eq("investigation_id", investigationId)
  if (errVinc) return { data: null, error: errVinc.message }

  const vinculos = (vinc ?? []) as { created_at: string; plano_programa_id: string }[]
  if (vinculos.length > 0) {
    const ppIds = [...new Set(vinculos.map(v => v.plano_programa_id))]
    const { data: pps, error: errPP } = await supabase
      .from("plano_programas")
      .select("id, programas:programa_id ( nome )")
      .in("id", ppIds)
    if (errPP) return { data: null, error: errPP.message }
    const nomePorPP = new Map((pps ?? []).map((pp: { id: string; programas: unknown }) => [pp.id, normNome(pp.programas)]))
    for (const v of vinculos) {
      eventos.push({
        tipo: 'programa_vinculado',
        data: v.created_at,
        titulo: "Programa vinculado",
        detalhe: nomePorPP.get(v.plano_programa_id) ?? "Programa",
      })
    }
  }

  // 3. Sessões-evidência (FCRM-002) — data = sessoes_v2.inicio (data clínica real)
  const { data: evid, error: errEvid } = await supabase
    .from("clinical_investigation_evidence")
    .select("source_id, created_at")
    .eq("investigation_id", investigationId)
    .eq("source_type", "Session")
  if (errEvid) return { data: null, error: errEvid.message }

  const evidencias = (evid ?? []) as { source_id: string; created_at: string }[]
  if (evidencias.length > 0) {
    const sessionIds = [...new Set(evidencias.map(e => e.source_id))]
    const { data: sess, error: errSess } = await supabase
      .from("sessoes_v2")
      .select("id, inicio")
      .in("id", sessionIds)
    if (errSess) return { data: null, error: errSess.message }
    const inicioPorSessao = new Map(
      (sess ?? []).map((s: { id: string; inicio: string | null }) => [s.id, s.inicio])
    )
    for (const e of evidencias) {
      // fallback para created_at do vínculo se a sessão não tiver inicio
      const data = inicioPorSessao.get(e.source_id) ?? e.created_at
      eventos.push({
        tipo: 'sessao_evidencia',
        data,
        titulo: "Sessão vinculada como evidência",
      })
    }
  }

  // Ordem cronológica ascendente (a história da investigação)
  eventos.sort((a, b) => (a.data < b.data ? -1 : a.data > b.data ? 1 : 0))

  return { data: { eventos, ultimaAtualizacao: inv.updated_at ?? null }, error: null }
}
