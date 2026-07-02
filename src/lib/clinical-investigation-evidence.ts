// src/lib/clinical-investigation-evidence.ts
// FCRM-002 — Camada de I/O do vínculo N:N entre Pergunta Clínica
// (clinical_investigations) e fontes de evidência.
//
// Nesta sprint só source_type='Session' é gravado (source_id = sessoes_v2.id).
// Reusa tipos/ordenação da FCRM-001. Retorno { data, error } explícito; guarda
// de .in([]) vazio; created_by = auth.getUser().user.id.

import { supabase } from "@/lib/supabase"
import {
  listarInvestigacoes,
  type ClinicalInvestigation,
  type InvestigationPriority,
  type Resultado,
} from "@/lib/clinical-investigations"

const SOURCE_SESSION = 'Session' as const

export interface EvidenceLink {
  id: string
  investigation_id: string
  source_type: string
  source_id: string
  created_by: string
  created_at: string
}

export interface InvestigacaoComContagem extends ClinicalInvestigation {
  evidenceCount: number
}

// ─── Evidências (Session) de uma investigação ───────────────────────────────
export async function listarEvidenciasDaInvestigacao(
  investigationId: string
): Promise<Resultado<EvidenceLink[]>> {
  const { data, error } = await supabase
    .from("clinical_investigation_evidence")
    .select("*")
    .eq("investigation_id", investigationId)
    .eq("source_type", SOURCE_SESSION)
    .order("created_at", { ascending: false })

  if (error) return { data: null, error: error.message }
  return { data: (data ?? []) as EvidenceLink[], error: null }
}

// ─── Investigações do paciente + contagem de evidências (Session) ───────────
export async function listarInvestigacoesComContagemEvidencias(
  patientId: string
): Promise<Resultado<InvestigacaoComContagem[]>> {
  const invRes = await listarInvestigacoes(patientId)
  if (invRes.error !== null) return { data: null, error: invRes.error }
  const investigacoes = invRes.data
  if (investigacoes.length === 0) return { data: [], error: null }

  const ids = investigacoes.map(i => i.id)
  const { data: evid, error } = await supabase
    .from("clinical_investigation_evidence")
    .select("investigation_id")
    .eq("source_type", SOURCE_SESSION)
    .in("investigation_id", ids)

  if (error) return { data: null, error: error.message }

  const contagem = new Map<string, number>()
  for (const row of (evid ?? []) as { investigation_id: string }[]) {
    contagem.set(row.investigation_id, (contagem.get(row.investigation_id) ?? 0) + 1)
  }
  const enriquecidas = investigacoes.map(i => ({ ...i, evidenceCount: contagem.get(i.id) ?? 0 }))
  return { data: enriquecidas, error: null }
}

// ─── Investigações ATIVAS do paciente (alimenta o card do encerramento) ─────
export async function listarInvestigacoesAtivasDoPaciente(
  patientId: string
): Promise<Resultado<ClinicalInvestigation[]>> {
  const { data, error } = await supabase
    .from("clinical_investigations")
    .select("*")
    .eq("patient_id", patientId)
    .eq("status", "Active")
    .order("created_at", { ascending: false })

  if (error) return { data: null, error: error.message }
  return { data: (data ?? []) as ClinicalInvestigation[], error: null }
}

// ─── Vincular uma sessão a N investigações (idempotente via onConflict) ──────
export async function vincularSessaoAInvestigacoes(
  sessionId: string,
  investigationIds: string[]
): Promise<Resultado<null>> {
  if (!investigationIds || investigationIds.length === 0)
    return { data: null, error: null }   // nada a fazer

  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return { data: null, error: "Sessão expirada. Faça login novamente." }

  const rows = investigationIds.map(investigation_id => ({
    investigation_id,
    source_type: SOURCE_SESSION,
    source_id: sessionId,
    created_by: user.id,
  }))

  const { error } = await supabase
    .from("clinical_investigation_evidence")
    .upsert(rows, {
      onConflict: "investigation_id,source_type,source_id",
      ignoreDuplicates: true,
    })

  if (error) return { data: null, error: error.message }
  return { data: null, error: null }
}

// ─── Ids das investigações já vinculadas a uma sessão ───────────────────────
export async function listarInvestigacoesDaSessao(
  sessionId: string
): Promise<Resultado<string[]>> {
  const { data, error } = await supabase
    .from("clinical_investigation_evidence")
    .select("investigation_id")
    .eq("source_type", SOURCE_SESSION)
    .eq("source_id", sessionId)

  if (error) return { data: null, error: error.message }
  return { data: (data ?? []).map((r: { investigation_id: string }) => r.investigation_id), error: null }
}

// ─── FCRM-004: contexto das investigações ATIVAS (contagem + última sessão) ─
// Para o card de encerramento: quantas evidências cada pergunta já tem e a data
// da última sessão-evidência. 3 queries no total, independente do nº de perguntas.
export interface ContextoInvestigacaoSessao {
  id: string
  title: string
  priority: InvestigationPriority
  evidenceCount: number
  ultimaSessao: string | null   // ISO — sessoes_v2.inicio da evidência mais recente
}

export async function listarContextoInvestigacoesAtivas(
  patientId: string
): Promise<Resultado<ContextoInvestigacaoSessao[]>> {
  const { data: invs, error: errInv } = await supabase
    .from("clinical_investigations")
    .select("id, title, priority")
    .eq("patient_id", patientId)
    .eq("status", "Active")
    .order("created_at", { ascending: false })
  if (errInv) return { data: null, error: errInv.message }

  const investigacoes = (invs ?? []) as { id: string; title: string; priority: InvestigationPriority }[]
  if (investigacoes.length === 0) return { data: [], error: null }

  const invIds = investigacoes.map(i => i.id)
  const { data: evid, error: errEvid } = await supabase
    .from("clinical_investigation_evidence")
    .select("investigation_id, source_id")
    .eq("source_type", SOURCE_SESSION)
    .in("investigation_id", invIds)
  if (errEvid) return { data: null, error: errEvid.message }

  const evidencias = (evid ?? []) as { investigation_id: string; source_id: string }[]
  const sessionIds = [...new Set(evidencias.map(e => e.source_id))]

  // Datas das sessões-evidência (guarda contra .in([]) vazio)
  const dataPorSessao = new Map<string, string>()
  if (sessionIds.length > 0) {
    const { data: sess, error: errSess } = await supabase
      .from("sessoes_v2")
      .select("id, inicio")
      .in("id", sessionIds)
    if (errSess) return { data: null, error: errSess.message }
    for (const s of (sess ?? []) as { id: string; inicio: string | null }[]) {
      if (s.inicio) dataPorSessao.set(s.id, s.inicio)
    }
  }

  const contexto = investigacoes.map(inv => {
    const daInvestigacao = evidencias.filter(e => e.investigation_id === inv.id)
    const datas = daInvestigacao
      .map(e => dataPorSessao.get(e.source_id))
      .filter((x): x is string => !!x)
      .sort()
    return {
      id: inv.id,
      title: inv.title,
      priority: inv.priority,
      evidenceCount: daInvestigacao.length,
      ultimaSessao: datas.length > 0 ? datas[datas.length - 1] : null,
    }
  })
  return { data: contexto, error: null }
}

// ─── Desfazer o vínculo de uma sessão com uma investigação ──────────────────
export async function removerVinculoSessao(
  investigationId: string,
  sessionId: string
): Promise<Resultado<null>> {
  const { error } = await supabase
    .from("clinical_investigation_evidence")
    .delete()
    .eq("investigation_id", investigationId)
    .eq("source_type", SOURCE_SESSION)
    .eq("source_id", sessionId)

  if (error) return { data: null, error: error.message }
  return { data: null, error: null }
}
