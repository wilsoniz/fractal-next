// src/lib/preference-assessment.ts
// FS-003 — Biblioteca Científica: Preference Assessment I/O.
//
// Toda função retorna Resultado<T> (nunca engole erro).
// UPDATE em finalizarSessaoPA usa .select() para detectar falha silenciosa de RLS.

import { supabase } from "@/lib/supabase"
import type { Resultado } from "@/lib/clinical-investigations"

export type TipoPA =
  | "mswo"
  | "paired"
  | "single"
  | "free_operant"
  | "response_restriction"

export type StatusPA = "em_andamento" | "concluida"

export interface PASession {
  id: string
  patient_id: string
  tipo: TipoPA
  status: StatusPA
  itens: string[]
  observacoes: string | null
  created_by: string
  created_at: string
  updated_at: string
  concluida_em: string | null
}

export interface PATrial {
  id: string
  session_id: string
  rodada: number
  itens_apresentados: string[]
  item_selecionado: string
  ordem_apresentacao: number
  created_at: string
}

export async function iniciarSessaoPA(
  patientId: string,
  tipo: TipoPA,
  itens: string[],
  observacoes?: string
): Promise<Resultado<PASession>> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: "Não autenticado" }

  const { data, error } = await supabase
    .from("preference_assessment_sessions")
    .insert({
      patient_id: patientId,
      tipo,
      itens,
      observacoes: observacoes ?? null,
      created_by: user.id,
    })
    .select()
    .single()

  if (error) return { data: null, error: error.message }
  return { data: data as PASession, error: null }
}

export async function registrarTrialPA(
  sessionId: string,
  rodada: number,
  itensApresentados: string[],
  itemSelecionado: string,
  ordemApresentacao: number
): Promise<Resultado<PATrial>> {
  const { data, error } = await supabase
    .from("preference_assessment_trials")
    .insert({
      session_id: sessionId,
      rodada,
      itens_apresentados: itensApresentados,
      item_selecionado: itemSelecionado,
      ordem_apresentacao: ordemApresentacao,
    })
    .select()
    .single()

  if (error) return { data: null, error: error.message }
  return { data: data as PATrial, error: null }
}

export async function finalizarSessaoPA(
  sessionId: string
): Promise<Resultado<PASession>> {
  const { data, error } = await supabase
    .from("preference_assessment_sessions")
    .update({ status: "concluida", concluida_em: new Date().toISOString() })
    .eq("id", sessionId)
    .select()
    .single()

  if (error) return { data: null, error: error.message }
  if (!data) return { data: null, error: "Sessão não encontrada ou acesso negado (RLS — checar policy de UPDATE)" }
  return { data: data as PASession, error: null }
}

export async function listarSessoesPA(
  patientId?: string
): Promise<Resultado<PASession[]>> {
  let q = supabase
    .from("preference_assessment_sessions")
    .select("*")
    .order("created_at", { ascending: false })

  if (patientId) q = q.eq("patient_id", patientId)

  const { data, error } = await q
  if (error) return { data: null, error: error.message }
  return { data: (data ?? []) as PASession[], error: null }
}

export async function obterTrialsPA(
  sessionId: string
): Promise<Resultado<PATrial[]>> {
  const { data, error } = await supabase
    .from("preference_assessment_trials")
    .select("*")
    .eq("session_id", sessionId)
    .order("rodada", { ascending: true })

  if (error) return { data: null, error: error.message }
  return { data: (data ?? []) as PATrial[], error: null }
}
