// I/O de medições (fit_measurements) — repositório central de variáveis quantitativas.
// Única tabela do sistema com DELETE físico permitido (correção de leitura), só do dono.

import { supabase, getFitUser } from "./supabase-fit";
import type { FitMeasurement, FitMeasurementCategory } from "./types";

export async function listMeasurementsByAssessment(assessmentId: string): Promise<FitMeasurement[]> {
  const { data } = await supabase
    .from("fit_measurements")
    .select("*")
    .eq("assessment_id", assessmentId)
    .order("created_at", { ascending: true });
  return (data as FitMeasurement[] | null) ?? [];
}

export async function listMeasurementsByPatient(patientId: string): Promise<FitMeasurement[]> {
  const { data } = await supabase
    .from("fit_measurements")
    .select("*")
    .eq("patient_id", patientId)
    .order("measured_at", { ascending: true });
  return (data as FitMeasurement[] | null) ?? [];
}

export async function addMeasurement(params: {
  patientId: string;
  assessmentId: string | null;
  category: FitMeasurementCategory;
  metric: string;
  label: string | null;
  value: number;
  unit: string | null;
  measured_at: string;
}): Promise<FitMeasurement | null> {
  const { user } = await getFitUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("fit_measurements")
    .insert({
      patient_id: params.patientId,
      professional_id: user.id,
      assessment_id: params.assessmentId,
      category: params.category,
      metric: params.metric,
      label: params.label,
      value: params.value,
      unit: params.unit,
      measured_at: params.measured_at,
    })
    .select()
    .single();
  if (error) return null;
  return data as FitMeasurement;
}

export async function updateMeasurement(
  id: string,
  patch: Partial<Pick<FitMeasurement, "value" | "unit" | "notes" | "measured_at">>,
): Promise<FitMeasurement | null> {
  const { data, error } = await supabase
    .from("fit_measurements")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) return null;
  return data as FitMeasurement;
}

export async function deleteMeasurement(id: string): Promise<boolean> {
  const { error } = await supabase.from("fit_measurements").delete().eq("id", id);
  return !error;
}
