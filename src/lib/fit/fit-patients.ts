// I/O da tabela fit_patients (Plataforma de Consultoria).
// RLS já garante o escopo por profissional (professional_id = auth.uid()).
// Isolado: importa apenas de @/lib/fit/*.

import { supabase, getFitUser } from "./supabase-fit";
import type { FitPatient, FitPatientInput } from "./types";

// Lista todos os pacientes do profissional logado (ativos + arquivados).
// A UI segmenta/filtra por status.
export async function listPatients(): Promise<FitPatient[]> {
  const { data } = await supabase
    .from("fit_patients")
    .select("*")
    .order("created_at", { ascending: false });
  return (data as FitPatient[] | null) ?? [];
}

export async function getPatient(id: string): Promise<FitPatient | null> {
  const { data } = await supabase
    .from("fit_patients")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return (data as FitPatient | null) ?? null;
}

export async function createPatient(input: FitPatientInput): Promise<FitPatient | null> {
  const { user } = await getFitUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("fit_patients")
    .insert({ ...input, professional_id: user.id })
    .select()
    .single();

  if (error) return null;
  return data as FitPatient;
}

export async function updatePatient(
  id: string,
  patch: Partial<FitPatientInput>,
): Promise<FitPatient | null> {
  const { data, error } = await supabase
    .from("fit_patients")
    .update(patch)
    .eq("id", id)
    .select()
    .single();

  if (error) return null;
  return data as FitPatient;
}

export async function archivePatient(id: string): Promise<boolean> {
  const { error } = await supabase
    .from("fit_patients")
    .update({ status: "archived" })
    .eq("id", id);
  return !error;
}

export async function reactivatePatient(id: string): Promise<boolean> {
  const { error } = await supabase
    .from("fit_patients")
    .update({ status: "active" })
    .eq("id", id);
  return !error;
}
