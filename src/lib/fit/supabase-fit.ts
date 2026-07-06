// Costura ÚNICA entre a Plataforma de Consultoria e a infraestrutura Supabase.
//
// Reexporta o client já existente do projeto em vez de instanciar um novo
// (dois clients = múltiplas instâncias de GoTrueClient = auth.uid() instável).
// Reuso permitido: apenas o cliente Supabase, nada de lógica de negócio do Fracta.
//
// Na futura migração para um repositório próprio, ESTE é o único arquivo a trocar:
// basta substituir o import abaixo por um `createClient(url, anonKey)` local.

import { supabase } from "@/lib/supabase";
import type { FitRole } from "./types";

export { supabase };

export async function signUpFit(
  email: string,
  password: string,
  fullName: string,
  role: FitRole,
) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    // role/full_name ficam no user_metadata para o perfil ser criado de forma
    // lazy e autenticada (sessão ativa → RLS satisfeita) via ensureProfile().
    options: { data: { full_name: fullName, role } },
  });
  return { data, error };
}

export async function signInFit(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  return { data, error };
}

export async function signOutFit() {
  const { error } = await supabase.auth.signOut();
  return { error };
}

export async function getFitUser() {
  const { data, error } = await supabase.auth.getUser();
  return { user: data.user, error };
}

// Envia email de recuperação; o link volta para /consultoria/nova-senha.
export async function resetPasswordFit(email: string) {
  const redirectTo =
    typeof window !== "undefined" ? `${window.location.origin}/consultoria/nova-senha` : undefined;
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  return { error };
}

// Define a nova senha (na sessão de recuperação criada pelo link do email).
export async function updatePasswordFit(password: string) {
  const { error } = await supabase.auth.updateUser({ password });
  return { error };
}
