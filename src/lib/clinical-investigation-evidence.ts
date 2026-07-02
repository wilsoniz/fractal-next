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
