// I/O de registro de treino (fit_training_logs + entries).
// Escrito pelo PACIENTE (RLS via fit_patients.user_id). Sem professional_id: derivado da ficha.

import { supabase } from "./supabase-fit";
import type {
  FitTrainingLog,
  FitTrainingLogEntry,
  FitTrainingLogEntryInput,
  FitTrainingLogBlockEntry,
  FitTrainingLogBlockEntryInput,
} from "./types";

export async function createLog(params: {
  patientId: string;
  planId: string | null;
  dayId: string | null;
  performed_at: string;
  notes: string | null;
}): Promise<FitTrainingLog | null> {
  const { data, error } = await supabase
    .from("fit_training_logs")
    .insert({
      patient_id: params.patientId,
      plan_id: params.planId,
      day_id: params.dayId,
      performed_at: params.performed_at,
      notes: params.notes,
    })
    .select()
    .single();
  if (error) return null;
  return data as FitTrainingLog;
}

export async function saveEntries(logId: string, entries: FitTrainingLogEntryInput[]): Promise<boolean> {
  if (entries.length === 0) return true;
  const rows = entries.map((e) => ({ ...e, log_id: logId }));
  const { error } = await supabase.from("fit_training_log_entries").insert(rows);
  return !error;
}

export async function listLogs(patientId: string): Promise<FitTrainingLog[]> {
  const { data } = await supabase
    .from("fit_training_logs")
    .select("*")
    .eq("patient_id", patientId)
    .eq("status", "active")
    .order("performed_at", { ascending: false });
  return (data as FitTrainingLog[] | null) ?? [];
}

export async function listLogEntries(logId: string): Promise<FitTrainingLogEntry[]> {
  const { data } = await supabase
    .from("fit_training_log_entries")
    .select("*")
    .eq("log_id", logId)
    .order("created_at", { ascending: true });
  return (data as FitTrainingLogEntry[] | null) ?? [];
}

// ── Registro por bloco (modo avançado) ──────────────────────
export async function saveBlockEntries(
  logId: string,
  entries: FitTrainingLogBlockEntryInput[],
): Promise<boolean> {
  if (entries.length === 0) return true;
  const rows = entries.map((e) => ({ ...e, log_id: logId }));
  const { error } = await supabase.from("fit_training_log_block_entries").insert(rows);
  return !error;
}

export async function listLogBlockEntries(logId: string): Promise<FitTrainingLogBlockEntry[]> {
  const { data } = await supabase
    .from("fit_training_log_block_entries")
    .select("*")
    .eq("log_id", logId)
    .order("created_at", { ascending: true });
  return (data as FitTrainingLogBlockEntry[] | null) ?? [];
}
