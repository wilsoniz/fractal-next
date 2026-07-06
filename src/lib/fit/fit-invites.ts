// I/O de convites de paciente (fit_patient_invites) + resgate por token.
// Profissional cria/revoga; paciente resgata via funções SECURITY DEFINER.

import { supabase, getFitUser } from "./supabase-fit";
import type { FitPatientInvite, FitInviteInfo, FitRedeemResult } from "./types";

export async function createInvite(patientId: string, email: string | null): Promise<FitPatientInvite | null> {
  const { user } = await getFitUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from("fit_patient_invites")
    .insert({ patient_id: patientId, professional_id: user.id, email })
    .select()
    .single();
  if (error) return null;
  return data as FitPatientInvite;
}

// Convite mais recente do paciente (para exibir estado atual no workspace).
export async function latestInvite(patientId: string): Promise<FitPatientInvite | null> {
  const { data } = await supabase
    .from("fit_patient_invites")
    .select("*")
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as FitPatientInvite | null) ?? null;
}

export async function revokeInvite(id: string): Promise<boolean> {
  const { error } = await supabase.from("fit_patient_invites").update({ status: "revoked" }).eq("id", id);
  return !error;
}

// Convites pendentes e não expirados do profissional logado (KPI do dashboard).
export async function countPendingInvites(): Promise<number> {
  const nowIso = new Date().toISOString();
  const { count } = await supabase
    .from("fit_patient_invites")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending")
    .gt("expires_at", nowIso);
  return count ?? 0;
}

export async function getInviteInfo(token: string): Promise<FitInviteInfo | null> {
  const { data, error } = await supabase.rpc("fn_fit_invite_info", { p_token: token });
  if (error) return null;
  return data as FitInviteInfo;
}

export async function redeemInvite(token: string): Promise<FitRedeemResult> {
  const { data, error } = await supabase.rpc("fn_fit_redeem_invite", { p_token: token });
  if (error) return { ok: false, reason: "error" };
  return data as FitRedeemResult;
}

// Helper de validade "pendente e não expirado".
export function isInvitePending(inv: FitPatientInvite | null): boolean {
  if (!inv) return false;
  return inv.status === "pending" && new Date(inv.expires_at).getTime() > Date.now();
}
