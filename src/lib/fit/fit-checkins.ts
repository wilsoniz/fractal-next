// I/O de check-ins semanais (fit_checkins). Escrito pelo PACIENTE (RLS via user_id).

import { supabase } from "./supabase-fit";
import type { FitCheckin, FitCheckinInput } from "./types";

export async function createCheckin(patientId: string, input: FitCheckinInput): Promise<FitCheckin | null> {
  const { data, error } = await supabase
    .from("fit_checkins")
    .insert({ patient_id: patientId, ...input })
    .select()
    .single();
  if (error) return null;
  return data as FitCheckin;
}

export async function listCheckins(patientId: string): Promise<FitCheckin[]> {
  const { data } = await supabase
    .from("fit_checkins")
    .select("*")
    .eq("patient_id", patientId)
    .order("checkin_date", { ascending: false });
  return (data as FitCheckin[] | null) ?? [];
}
