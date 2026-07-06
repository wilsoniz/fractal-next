// I/O de identidade da Plataforma de Consultoria (tabela fit_profiles).
// fit_profiles.id = auth.uid(). Papel (role) governa o roteamento profissional/paciente.

import { supabase, getFitUser } from "./supabase-fit";
import type { FitProfile, FitRole } from "./types";

export async function getMyProfile(): Promise<FitProfile | null> {
  const { user } = await getFitUser();
  if (!user) return null;

  const { data } = await supabase
    .from("fit_profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  return (data as FitProfile | null) ?? null;
}

// Cria o perfil de forma lazy e autenticada (sessão já ativa → RLS satisfeita),
// lendo role/full_name do user_metadata gravado no signup. Idempotente.
export async function ensureProfile(): Promise<FitProfile | null> {
  const { user } = await getFitUser();
  if (!user) return null;

  const existing = await getMyProfile();
  if (existing) return existing;

  const meta = (user.user_metadata ?? {}) as { role?: FitRole; full_name?: string };
  const role: FitRole = meta.role ?? "professional";
  const fullName = meta.full_name ?? null;

  const { data, error } = await supabase
    .from("fit_profiles")
    .upsert({ id: user.id, role, full_name: fullName, email: user.email ?? null })
    .select()
    .single();

  if (error) return null;
  return data as FitProfile;
}
