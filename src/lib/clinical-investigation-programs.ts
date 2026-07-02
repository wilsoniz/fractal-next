// src/lib/clinical-investigation-programs.ts
// FCRM-005 — I/O do vínculo EXPLÍCITO Pergunta Clínica ↔ Programa de Ensino.
//
// Responde: "Quais intervenções estão sendo utilizadas para responder esta
// Pergunta Clínica?" — vínculo declarado pelo terapeuta (nunca inferido de sessão).
// Programa em uso = plano_programas (instância no plano do paciente).
//
// Retorno { data, error } explícito; guarda de .in([]) vazio; created_by = auth.

import { supabase } from "@/lib/supabase"
import type { Resultado } from "@/lib/clinical-investigations"

export interface ProgramaVinculado {
  vinculoId: string          // clinical_investigation_programs.id
  planoProgramaId: string
  nome: string
  dominio: string | null
}

export interface ProgramaDisponivel {
  planoProgramaId: string
  nome: string
  dominio: string | null
}

// Embed to-one pode vir como objeto ou array (1 elemento) — normaliza.
function normPrograma(p: unknown): { nome?: string; dominio?: string } {
  const o = Array.isArray(p) ? p[0] : p
  return (o ?? {}) as { nome?: string; dominio?: string }
}

// ─── Programas vinculados a uma investigação ────────────────────────────────
export async function listarProgramasDaInvestigacao(
  investigationId: string
): Promise<Resultado<ProgramaVinculado[]>> {
  const { data: vinc, error } = await supabase
    .from("clinical_investigation_programs")
    .select("id, plano_programa_id")
    .eq("investigation_id", investigationId)
    .order("created_at", { ascending: true })
  if (error) return { data: null, error: error.message }

  const vinculos = (vinc ?? []) as { id: string; plano_programa_id: string }[]
  if (vinculos.length === 0) return { data: [], error: null }

  const ppIds = [...new Set(vinculos.map(v => v.plano_programa_id))]
  const { data: pps, error: errPP } = await supabase
    .from("plano_programas")
    .select("id, programas:programa_id ( nome, dominio )")
    .in("id", ppIds)
  if (errPP) return { data: null, error: errPP.message }

  const metaById = new Map(
    (pps ?? []).map((pp: { id: string; programas: unknown }) => [pp.id, normPrograma(pp.programas)])
  )

  const lista = vinculos.map(v => {
    const m = metaById.get(v.plano_programa_id)
    return {
      vinculoId: v.id,
      planoProgramaId: v.plano_programa_id,
      nome: m?.nome ?? "Programa",
      dominio: m?.dominio ?? null,
    }
  })
  return { data: lista, error: null }
}

// ─── Programas ativos do paciente (candidatos a vincular) ───────────────────
export async function listarProgramasDisponiveisDoPaciente(
  patientId: string
): Promise<Resultado<ProgramaDisponivel[]>> {
  const { data: planos, error: errPl } = await supabase
    .from("planos")
    .select("id")
    .eq("crianca_id", patientId)
  if (errPl) return { data: null, error: errPl.message }

  const planoIds = (planos ?? []).map((p: { id: string }) => p.id)
  if (planoIds.length === 0) return { data: [], error: null }

  const { data: pps, error } = await supabase
    .from("plano_programas")
    .select("id, programas:programa_id ( nome, dominio )")
    .in("plano_id", planoIds)
    .eq("status", "ativo")
  if (error) return { data: null, error: error.message }

  const lista = (pps ?? [])
    .map((pp: { id: string; programas: unknown }) => {
      const m = normPrograma(pp.programas)
      return { planoProgramaId: pp.id, nome: m.nome ?? "Programa", dominio: m.dominio ?? null }
    })
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
  return { data: lista, error: null }
}

// ─── Vincular (idempotente via onConflict) ──────────────────────────────────
export async function vincularPrograma(
  investigationId: string,
  planoProgramaId: string
): Promise<Resultado<null>> {
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return { data: null, error: "Sessão expirada. Faça login novamente." }

  const { error } = await supabase
    .from("clinical_investigation_programs")
    .upsert(
      { investigation_id: investigationId, plano_programa_id: planoProgramaId, created_by: user.id },
      { onConflict: "investigation_id,plano_programa_id", ignoreDuplicates: true }
    )
  if (error) return { data: null, error: error.message }
  return { data: null, error: null }
}

// ─── Desvincular ────────────────────────────────────────────────────────────
export async function desvincularPrograma(
  investigationId: string,
  planoProgramaId: string
): Promise<Resultado<null>> {
  const { error } = await supabase
    .from("clinical_investigation_programs")
    .delete()
    .eq("investigation_id", investigationId)
    .eq("plano_programa_id", planoProgramaId)
  if (error) return { data: null, error: error.message }
  return { data: null, error: null }
}
