// src/lib/clinical-investigations.ts
// FCRM-001 — Camada de I/O da entidade ClinicalInvestigation (UI: "Pergunta Clínica").
//
// Valores internos em EN (espelham os CHECK constraints do banco); a UI é PT-BR.
// Toda função retorna { data, error } de forma explícita — nunca engole erro.
// Detector de falha silenciosa de RLS: todo UPDATE usa .select() e verifica se
// alguma linha voltou (RLS sem policy de UPDATE devolve 0 linhas e nenhum erro).

import { supabase } from "@/lib/supabase"

// ─── Tipos internos (EN — batem com os constraints ci_*_check) ──────────────
export type InvestigationPriority = 'Low' | 'Medium' | 'High' | 'Critical'
export type InvestigationStatus = 'Active' | 'Paused' | 'Closed'
export type ReasoningStage =
  | 'Problem' | 'Observation' | 'Analysis' | 'Hypothesis'
  | 'Intervention' | 'Monitoring' | 'Resolved'

export interface ClinicalInvestigation {
  id: string
  patient_id: string
  title: string
  clinical_problem: string | null
  priority: InvestigationPriority
  status: InvestigationStatus
  reasoning_stage: ReasoningStage
  created_by: string
  created_at: string
  updated_at: string
  closed_at: string | null
}

// ─── Mapa PT-BR (fonte única; acessar SEMPRE com ?? fallback) ───────────────
export const PRIORIDADE_LABEL: Record<InvestigationPriority, string> = {
  Low: 'Baixa', Medium: 'Média', High: 'Alta', Critical: 'Crítica',
}
export const STATUS_LABEL: Record<InvestigationStatus, string> = {
  Active: 'Ativa', Paused: 'Pausada', Closed: 'Encerrada',
}

// Ordem de exibição: Ativa → Pausada → Encerrada
const ORDEM_STATUS: Record<InvestigationStatus, number> = { Active: 0, Paused: 1, Closed: 2 }

export type Resultado<T> = { data: T; error: null } | { data: null; error: string }

// ─── Leitura ────────────────────────────────────────────────────────────────
export async function listarInvestigacoes(
  patientId: string
): Promise<Resultado<ClinicalInvestigation[]>> {
  const { data, error } = await supabase
    .from("clinical_investigations")
    .select("*")
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false })

  if (error) return { data: null, error: error.message }

  // Ordena por status (Active primeiro); sort estável preserva created_at desc
  // dentro de cada grupo.
  const lista = ((data ?? []) as ClinicalInvestigation[]).slice().sort(
    (a, b) => (ORDEM_STATUS[a.status] ?? 99) - (ORDEM_STATUS[b.status] ?? 99)
  )
  return { data: lista, error: null }
}

// ─── Criação ──────────────────────────────────────────────────────────────
export async function criarInvestigacao(input: {
  patientId: string
  title: string
  clinicalProblem?: string | null
  priority?: InvestigationPriority
}): Promise<Resultado<ClinicalInvestigation>> {
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return { data: null, error: "Sessão expirada. Faça login novamente." }

  const { data, error } = await supabase
    .from("clinical_investigations")
    .insert({
      patient_id: input.patientId,
      title: input.title,
      clinical_problem: input.clinicalProblem?.trim() || null,
      priority: input.priority ?? 'Medium',
      created_by: user.id,   // = auth.uid() = profiles.id (with check ci_insert)
      // status / reasoning_stage ficam nos defaults do banco
    })
    .select()
    .single()

  if (error) return { data: null, error: error.message }
  return { data: data as ClinicalInvestigation, error: null }
}

// ─── Edição (não altera status por aqui) ────────────────────────────────────
export async function editarInvestigacao(
  id: string,
  input: { title: string; clinicalProblem?: string | null; priority: InvestigationPriority }
): Promise<Resultado<ClinicalInvestigation>> {
  const { data, error } = await supabase
    .from("clinical_investigations")
    .update({
      title: input.title,
      clinical_problem: input.clinicalProblem?.trim() || null,
      priority: input.priority,
    })
    .eq("id", id)
    .select()

  if (error) return { data: null, error: error.message }
  if (!data || data.length === 0)
    return { data: null, error: "Nada foi atualizado (verifique permissão de acesso)." }
  return { data: data[0] as ClinicalInvestigation, error: null }
}

// ─── Encerrar (status + closed_at no MESMO update — constraint ci_closed_coherence) ─
export async function fecharInvestigacao(
  id: string
): Promise<Resultado<ClinicalInvestigation>> {
  const { data, error } = await supabase
    .from("clinical_investigations")
    .update({ status: 'Closed', closed_at: new Date().toISOString() })
    .eq("id", id)
    .select()

  if (error) return { data: null, error: error.message }
  if (!data || data.length === 0)
    return { data: null, error: "Não foi possível encerrar (verifique permissão de acesso)." }
  return { data: data[0] as ClinicalInvestigation, error: null }
}

// ─── Reabrir (status + closed_at=null no MESMO update — mesma constraint) ────
export async function reabrirInvestigacao(
  id: string
): Promise<Resultado<ClinicalInvestigation>> {
  const { data, error } = await supabase
    .from("clinical_investigations")
    .update({ status: 'Active', closed_at: null })
    .eq("id", id)
    .select()

  if (error) return { data: null, error: error.message }
  if (!data || data.length === 0)
    return { data: null, error: "Não foi possível reabrir (verifique permissão de acesso)." }
  return { data: data[0] as ClinicalInvestigation, error: null }
}
