// Vínculo da conta do paciente à ficha fit_patients.
// Usa a função SECURITY DEFINER fn_fit_link_self (auto-vínculo por email,
// só se houver EXATAMENTE 1 ficha com aquele email e user_id nulo).

import { supabase, getFitUser } from "./supabase-fit";
import type { FitPatient } from "./types";

// Tenta vincular; retorna o id da ficha vinculada ou null.
export async function ensurePatientLink(): Promise<string | null> {
  const { data, error } = await supabase.rpc("fn_fit_link_self");
  if (error) return null;
  return (data as string | null) ?? null;
}

// Ficha do paciente logado (RLS: user_id = auth.uid()).
export async function getLinkedPatient(): Promise<FitPatient | null> {
  const { user } = await getFitUser();
  if (!user) return null;
  const { data } = await supabase
    .from("fit_patients")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();
  return (data as FitPatient | null) ?? null;
}
