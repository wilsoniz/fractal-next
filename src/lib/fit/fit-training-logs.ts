// I/O de registro de treino (fit_training_logs + entries).
// Escrito pelo PACIENTE (RLS via fit_patients.user_id). Sem professional_id: derivado da ficha.

import { supabase } from "./supabase-fit";
import type {
  FitTrainingLog,
  FitTrainingLogEntry,
  FitTrainingLogEntryInput,
  FitTrainingLogBlockEntry,
  FitTrainingLogBlockEntryInput,
  FitTrainingLogBlockStepEntry,
  FitTrainingLogBlockStepEntryInput,
} from "./types";

export async function createLog(params: {
  patientId: string;
  planId: string | null;
  dayId: string | null;
  performed_at: string;
  notes: string | null;
}): Promise<{ data: FitTrainingLog | null; error: string | null }> {
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
  return { data: (data as FitTrainingLog | null) ?? null, error: error?.message ?? null };
}

export async function saveEntries(logId: string, entries: FitTrainingLogEntryInput[]): Promise<{ ok: boolean; error: string | null }> {
  if (entries.length === 0) return { ok: true, error: null };
  const rows = entries.map((e) => ({ ...e, log_id: logId }));
  const { error } = await supabase.from("fit_training_log_entries").insert(rows);
  return { ok: !error, error: error?.message ?? null };
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
): Promise<{ ok: boolean; error: string | null }> {
  if (entries.length === 0) return { ok: true, error: null };
  const rows = entries.map((e) => ({ ...e, log_id: logId }));
  const { error } = await supabase.from("fit_training_log_block_entries").insert(rows);
  return { ok: !error, error: error?.message ?? null };
}

export async function listLogBlockEntries(logId: string): Promise<FitTrainingLogBlockEntry[]> {
  const { data } = await supabase
    .from("fit_training_log_block_entries")
    .select("*")
    .eq("log_id", logId)
    .order("created_at", { ascending: true });
  return (data as FitTrainingLogBlockEntry[] | null) ?? [];
}

export async function saveBlockStepEntries(logId: string, entries: FitTrainingLogBlockStepEntryInput[]): Promise<{ ok: boolean; error: string | null }> {
  if (entries.length === 0) return { ok: true, error: null };
  const { error } = await supabase.from("fit_training_log_block_step_entries").insert(entries.map((e) => ({ ...e, log_id: logId })));
  return { ok: !error, error: error?.message ?? null };
}

export async function listLogBlockStepEntries(logId: string): Promise<FitTrainingLogBlockStepEntry[]> {
  const { data } = await supabase.from("fit_training_log_block_step_entries").select("*").eq("log_id", logId).order("created_at");
  return (data as FitTrainingLogBlockStepEntry[] | null) ?? [];
}

// Compensação segura: preserva rastreabilidade e exclui o log incompleto das leituras ativas.
export async function archiveFailedLog(logId: string, reason: string): Promise<boolean> {
  const { error } = await supabase.from("fit_training_logs").update({ status: "archived", notes: `Falha ao salvar treino: ${reason}` }).eq("id", logId);
  return !error;
}
