// I/O do questionário pré-avaliação (fit_questionnaires).
// Um questionário "atual" por paciente (o mais recente). Respostas em jsonb por seção.

import { supabase, getFitUser } from "./supabase-fit";
import type { FitQuestionnaire, FitQuestionnaireStatus } from "./types";

export async function getQuestionnaire(patientId: string): Promise<FitQuestionnaire | null> {
  const { data } = await supabase
    .from("fit_questionnaires")
    .select("*")
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as FitQuestionnaire | null) ?? null;
}

export async function saveQuestionnaire(params: {
  patientId: string;
  existingId?: string | null;
  answers: Record<string, Record<string, string>>;
  status: FitQuestionnaireStatus;
}): Promise<FitQuestionnaire | null> {
  const { user } = await getFitUser();
  if (!user) return null;

  const payload = {
    answers: params.answers,
    status: params.status,
    completed_at: params.status === "completed" ? new Date().toISOString() : null,
  };

  if (params.existingId) {
    const { data, error } = await supabase
      .from("fit_questionnaires")
      .update(payload)
      .eq("id", params.existingId)
      .select()
      .single();
    if (error) return null;
    return data as FitQuestionnaire;
  }

  const { data, error } = await supabase
    .from("fit_questionnaires")
    .insert({ ...payload, patient_id: params.patientId, professional_id: user.id })
    .select()
    .single();
  if (error) return null;
  return data as FitQuestionnaire;
}
