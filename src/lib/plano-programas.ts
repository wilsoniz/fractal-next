// src/lib/plano-programas.ts
// Treatment-001 — Adicionar Programa de Ensino ao plano ATIVO do paciente.
//
// Cria registro REAL em plano_programas (a fonte que sessão/relatórios/FCRM-005
// usam), status='ativo', + fase baseline via RPC iniciar_baseline_programa
// (idempotente), replicando o fluxo de aprovação de sugestões.
//
// Fatos do schema (confirmados): unique(plano_id, programa_id) → upsert;
// alvo_id é nullable → insert mínimo sem alvo; RPC assinatura
// (p_programa_id, p_plano_programa_id, p_crianca_id, p_terapeuta_id).

import { supabase } from "@/lib/supabase"
import type { Resultado } from "@/lib/clinical-investigations"

export interface ProgramaCatalogo {
  programaId: string
  nome: string
  dominio: string | null
}

export interface ProgramaDoPlano {
  planoProgramaId: string
  programaId: string
  nome: string
  dominio: string | null
}

function normPrograma(p: unknown): { nome?: string; dominio?: string } {
  const o = Array.isArray(p) ? p[0] : p
  return (o ?? {}) as { nome?: string; dominio?: string }
}

// ─── Plano ATIVO do paciente (fallback: 1º plano) ───────────────────────────
export async function obterPlanoAtivoDoPaciente(
  patientId: string
): Promise<Resultado<{ id: string } | null>> {
  const { data, error } = await supabase
    .from("planos")
    .select("id, status, criado_em")
    .eq("crianca_id", patientId)
    .order("criado_em", { ascending: false })
  if (error) return { data: null, error: error.message }

  const planos = (data ?? []) as { id: string; status: string | null }[]
  if (planos.length === 0) return { data: null, error: null }
  const ativo = planos.find(p => p.status === "ativo") ?? planos[0]
  return { data: { id: ativo.id }, error: null }
}

// ─── Programas do catálogo ainda NÃO vinculados ao plano ────────────────────
export async function listarProgramasCatalogoDisponiveis(
  planoId: string
): Promise<Resultado<ProgramaCatalogo[]>> {
  // já vinculados a este plano (qualquer status) — para excluir do catálogo
  const { data: jaVinc, error: errJa } = await supabase
    .from("plano_programas")
    .select("programa_id")
    .eq("plano_id", planoId)
  if (errJa) return { data: null, error: errJa.message }
  const idsVinculados = new Set((jaVinc ?? []).map((r: { programa_id: string }) => r.programa_id))

  const { data: cat, error } = await supabase
    .from("programas")
    .select("id, nome, dominio")
    .eq("ativo", true)
    .order("nome")
  if (error) return { data: null, error: error.message }

  const disponiveis = (cat ?? [])
    .filter((p: { id: string }) => !idsVinculados.has(p.id))
    .map((p: { id: string; nome: string | null; dominio: string | null }) => ({
      programaId: p.id,
      nome: p.nome ?? "Programa",
      dominio: p.dominio ?? null,
    }))
  return { data: disponiveis, error: null }
}

// ─── Programas ATIVOS do plano (lista aditiva — visibilidade imediata) ──────
export async function listarProgramasDoPlano(
  planoId: string
): Promise<Resultado<ProgramaDoPlano[]>> {
  const { data, error } = await supabase
    .from("plano_programas")
    .select("id, programa_id, programas:programa_id ( nome, dominio )")
    .eq("plano_id", planoId)
    .eq("status", "ativo")
    .order("ordem")
  if (error) return { data: null, error: error.message }

  const lista = (data ?? []).map((pp: { id: string; programa_id: string; programas: unknown }) => {
    const m = normPrograma(pp.programas)
    return {
      planoProgramaId: pp.id,
      programaId: pp.programa_id,
      nome: m.nome ?? "Programa",
      dominio: m.dominio ?? null,
    }
  })
  return { data: lista, error: null }
}

// ─── Adicionar programa ao plano (upsert + RPC baseline) ────────────────────
export async function adicionarProgramaAoPlano(input: {
  planoId: string
  programaId: string
  patientId: string
}): Promise<Resultado<{ planoProgramaId: string }>> {
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return { data: null, error: "Sessão expirada. Faça login novamente." }

  // upsert no unique(plano_id, programa_id): insere OU reativa (status='ativo'),
  // retornando o id para a RPC.
  const { data: pp, error } = await supabase
    .from("plano_programas")
    .upsert(
      { plano_id: input.planoId, programa_id: input.programaId, status: "ativo" },
      { onConflict: "plano_id,programa_id" }
    )
    .select("id")
    .single()
  if (error) return { data: null, error: error.message }
  if (!pp) return { data: null, error: "Não foi possível adicionar o programa ao plano." }

  const planoProgramaId = (pp as { id: string }).id

  // Fase baseline (RPC idempotente — retorna a fase ativa se já existir)
  const { error: rpcErr } = await supabase.rpc("iniciar_baseline_programa", {
    p_programa_id: input.programaId,
    p_plano_programa_id: planoProgramaId,
    p_crianca_id: input.patientId,
    p_terapeuta_id: user.id,
  })
  if (rpcErr) return { data: null, error: rpcErr.message }

  return { data: { planoProgramaId }, error: null }
}
