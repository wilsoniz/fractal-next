// I/O de avaliações (fit_assessments). Avaliação = documento (preparada p/ PDF futuro).
// baseline = avaliação inicial / linha de base; reassessment = reavaliação.

import { supabase, getFitUser } from "./supabase-fit";
import type { FitAssessment, FitAssessmentType } from "./types";

export async function listAssessments(patientId: string): Promise<FitAssessment[]> {
  const { data } = await supabase
    .from("fit_assessments")
    .select("*")
    .eq("patient_id", patientId)
    .order("assessed_at", { ascending: false });
  return (data as FitAssessment[] | null) ?? [];
}

export async function getAssessment(id: string): Promise<FitAssessment | null> {
  const { data } = await supabase.from("fit_assessments").select("*").eq("id", id).maybeSingle();
  return (data as FitAssessment | null) ?? null;
}

export async function createAssessment(params: {
  patientId: string;
  type: FitAssessmentType;
  assessed_at: string;
  title: string | null;
  notes: string | null;
  data?: Record<string, unknown>;
}): Promise<FitAssessment | null> {
  const { user } = await getFitUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("fit_assessments")
    .insert({
      patient_id: params.patientId,
      professional_id: user.id,
      type: params.type,
      assessed_at: params.assessed_at,
      title: params.title,
      notes: params.notes,
      data: params.data ?? {},
    })
    .select()
    .single();
  if (error) return null;
  return data as FitAssessment;
}

export async function updateAssessment(
  id: string,
  patch: Partial<Pick<FitAssessment, "type" | "assessed_at" | "title" | "notes" | "data" | "status">>,
): Promise<FitAssessment | null> {
  const { data, error } = await supabase
    .from("fit_assessments")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) return null;
  return data as FitAssessment;
}

export async function archiveAssessment(id: string): Promise<boolean> {
  const { error } = await supabase.from("fit_assessments").update({ status: "archived" }).eq("id", id);
  return !error;
}
