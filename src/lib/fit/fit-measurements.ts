// I/O de medições (fit_measurements) — repositório central de variáveis quantitativas.
// Única tabela do sistema com DELETE físico permitido (correção de leitura), só do dono.

import { supabase, getFitUser } from "./supabase-fit";
import { measurementIdentityKey } from "./fit-segmented-measurements";
import type { FitMeasurement, FitMeasurementCategory, FitMeasurementClinicalRole, FitMeasurementSide } from "./types";

export interface FitMeasurementCreateInput {
  patientId: string;
  assessmentId: string | null;
  category: FitMeasurementCategory;
  metric: string;
  label: string | null;
  value: number;
  unit: string | null;
  measured_at: string;
  side?: FitMeasurementSide | null;
  clinical_role?: FitMeasurementClinicalRole | null;
  side_label?: string | null;
  body_region?: string | null;
  body_segment?: string | null;
  joint?: string | null;
  measurement_site?: string | null;
  protocol?: string | null;
  method?: string | null;
  source_exercise_library_id?: string | null;
  source_exercise_name_snapshot?: string | null;
  context?: Record<string, unknown>;
  data?: Record<string, unknown>;
}

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

export async function addMeasurements(inputs: FitMeasurementCreateInput[]): Promise<{ data: FitMeasurement[]; error: string | null }> {
  if (inputs.length === 0) return { data: [], error: null };
  if (inputs.some((input) => input.metric === "bmi")) return { data: [], error: "IMC é calculado automaticamente e não pode ser informado manualmente." };
  const { user } = await getFitUser();
  if (!user) return { data: [], error: "Sessão não encontrada." };

  const assessmentId = inputs[0].assessmentId;
  if (assessmentId && inputs.some((input) => input.assessmentId !== assessmentId)) return { data: [], error: "As medições do lote devem pertencer à mesma avaliação." };
  const normalized = inputs.map((params) => ({
    patient_id: params.patientId, professional_id: user.id, assessment_id: params.assessmentId,
    category: params.category, metric: params.metric, label: params.label, value: params.value,
    unit: params.unit, measured_at: params.measured_at, side: params.side ?? null,
    clinical_role: params.clinical_role ?? null, side_label: params.side_label ?? null,
    body_region: params.body_region ?? null, body_segment: params.body_segment ?? null,
    joint: params.joint ?? null, measurement_site: params.measurement_site ?? null,
    protocol: params.protocol ?? null, method: params.method ?? null,
    source_exercise_library_id: params.source_exercise_library_id ?? null,
    source_exercise_name_snapshot: params.source_exercise_name_snapshot ?? null,
    context: params.context ?? {}, data: params.data ?? {},
  }));
  const newKeys = normalized.map(measurementIdentityKey);
  if (new Set(newKeys).size !== newKeys.length) return { data: [], error: "O lote contém medições tecnicamente duplicadas." };
  if (assessmentId) {
    const existing = await listMeasurementsByAssessment(assessmentId);
    const existingKeys = new Set(existing.map(measurementIdentityKey));
    if (newKeys.some((key) => existingKeys.has(key))) return { data: [], error: "Já existe uma medição tecnicamente equivalente nesta avaliação." };
  }

  const { data, error } = await supabase
    .from("fit_measurements")
    .insert(normalized)
    .select()
  return { data: (data as FitMeasurement[] | null) ?? [], error: error?.message ?? null };
}

export async function addMeasurement(params: FitMeasurementCreateInput): Promise<FitMeasurement | null> {
  const result = await addMeasurements([params]);
  return result.data[0] ?? null;
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
