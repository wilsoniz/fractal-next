// Camada de leitura/agregação da evolução (Fase 5). Só leitura de tabelas fit_*.
// Sem SQL novo. Funções puras sobre queries; trata .in() vazio (armadilha 400).

import { supabase } from "./supabase-fit";
import { measurementLabel } from "./metrics";
import { blockChartRole } from "./training-methods";
import { buildAsymmetrySeries, isGlobalMeasurement, measurementContextLabel, measurementTechnicalKey, resolveBMI, type FitAsymmetryPoint, type FitComparisonMode, type FitMeasurementSource } from "./fit-segmented-measurements";
import type { FitMeasurement } from "./types";

export interface FitPoint {
  date: string; // yyyy-mm-dd
  value: number;
}

export interface FitMetricRef {
  metric: string;
  label: string;
  unit: string | null;
  category: string;
}

export interface FitSegmentedMetricRef extends FitMetricRef {
  technicalKey: string;
  contextLabel: string;
  bodyRegion: string | null;
}

export type FitValence = "neutral" | "higher_better" | "lower_better";

export interface FitBaselineRow {
  metric: string;
  label: string;
  unit: string | null;
  baseline: number;
  current: number;
  delta: number;
  valence: FitValence;
}

export interface FitCheckinPoint {
  date: string;
  weight: number | null;
  adherence: number | null;
  energy: number | null;
  sleep: number | null;
  pain: number | null;
  mood: number | null;
}

interface FitCheckinRow {
  checkin_date: string;
  weight_kg: number | null;
  adherence_pct: number | null;
  energy_level: number | null;
  sleep_quality: number | null;
  pain_level: number | null;
  mood: number | null;
}

// Valência: neutra por padrão; só métricas óbvias têm direção clara.
export function metricValence(metric: string): FitValence {
  if (metric === "pain_level") return "lower_better";
  return "neutral";
}

function sortByDate<T extends { date: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => a.date.localeCompare(b.date));
}

// ── Peso: unifica fit_measurements(weight_kg) + fit_checkins(weight_kg) ──
export async function getWeightSeries(patientId: string): Promise<FitPoint[]> {
  const [{ data: meas }, { data: checks }] = await Promise.all([
    supabase.from("fit_measurements").select("*").eq("patient_id", patientId).eq("metric", "weight_kg"),
    supabase.from("fit_checkins").select("weight_kg, checkin_date").eq("patient_id", patientId).not("weight_kg", "is", null),
  ]);
  const points: FitPoint[] = [];
  for (const m of ((meas as FitMeasurement[] | null) ?? []).filter(isGlobalMeasurement)) points.push({ date: m.measured_at, value: Number(m.value) });
  for (const c of (checks as { weight_kg: number; checkin_date: string }[] | null) ?? []) points.push({ date: c.checkin_date, value: Number(c.weight_kg) });
  // dedupe por data (mantém o último inserido)
  const byDate = new Map<string, number>();
  for (const p of points) byDate.set(p.date, p.value);
  return sortByDate(Array.from(byDate, ([date, value]) => ({ date, value })));
}

export async function getMeasurementSeries(patientId: string, metric: string): Promise<FitPoint[]> {
  const { data } = await supabase
    .from("fit_measurements")
    .select("*")
    .eq("patient_id", patientId)
    .eq("metric", metric)
    .order("measured_at", { ascending: true });
  return ((data as FitMeasurement[] | null) ?? []).filter(isGlobalMeasurement).map((r) => ({ date: r.measured_at, value: Number(r.value) }));
}

export async function listPatientMetrics(patientId: string): Promise<FitMetricRef[]> {
  const { data } = await supabase.from("fit_measurements").select("*").eq("patient_id", patientId);
  const rows = ((data as FitMeasurement[] | null) ?? []).filter(isGlobalMeasurement).filter((row) => row.metric !== "bmi");
  const seen = new Map<string, FitMetricRef>();
  for (const r of rows) {
    if (!seen.has(r.metric)) seen.set(r.metric, { metric: r.metric, label: measurementLabel(r.metric, r.label), unit: r.unit, category: r.category });
  }
  return Array.from(seen.values());
}

export async function listSegmentedMetrics(patientId: string): Promise<FitSegmentedMetricRef[]> {
  const { data } = await supabase.from("fit_measurements").select("*").eq("patient_id", patientId).order("measured_at");
  const rows = ((data as FitMeasurement[] | null) ?? []).filter((row) => !isGlobalMeasurement(row));
  const seen = new Map<string, FitSegmentedMetricRef>();
  for (const row of rows) {
    const technicalKey = measurementTechnicalKey(row);
    const label = measurementLabel(row.metric, row.label);
    if (!seen.has(technicalKey)) seen.set(technicalKey, { technicalKey, metric: row.metric, label, unit: row.unit, category: row.category, contextLabel: [label, measurementContextLabel(row)].filter(Boolean).join(" · "), bodyRegion: row.body_region });
  }
  return Array.from(seen.values());
}

export async function getSegmentedMeasurements(patientId: string, technicalKey: string): Promise<FitMeasurement[]> {
  const { data } = await supabase.from("fit_measurements").select("*").eq("patient_id", patientId).order("measured_at");
  return ((data as FitMeasurement[] | null) ?? []).filter((row) => measurementTechnicalKey(row) === technicalKey);
}

export async function getAsymmetrySeries(patientId: string, technicalKey: string, mode: FitComparisonMode): Promise<FitAsymmetryPoint[]> {
  return buildAsymmetrySeries(await getSegmentedMeasurements(patientId, technicalKey), mode);
}

// ── Carga por exercício (fit_training_log_entries via logs) ──
async function patientLogDates(patientId: string): Promise<Map<string, string>> {
  const { data } = await supabase
    .from("fit_training_logs")
    .select("id, performed_at")
    .eq("patient_id", patientId)
    .eq("status", "active");
  const map = new Map<string, string>();
  for (const l of (data as { id: string; performed_at: string }[] | null) ?? []) map.set(l.id, l.performed_at);
  return map;
}

export async function listPatientExercises(patientId: string): Promise<string[]> {
  const dates = await patientLogDates(patientId);
  const logIds = Array.from(dates.keys());
  if (logIds.length === 0) return [];
  const [{ data: simple }, { data: blocks }] = await Promise.all([
    supabase.from("fit_training_log_entries").select("exercise_name").in("log_id", logIds),
    supabase.from("fit_training_log_block_entries").select("exercise_name").in("log_id", logIds),
  ]);
  const set = new Set<string>();
  for (const e of (simple as { exercise_name: string | null }[] | null) ?? []) if (e.exercise_name) set.add(e.exercise_name);
  for (const e of (blocks as { exercise_name: string | null }[] | null) ?? []) if (e.exercise_name) set.add(e.exercise_name);
  return Array.from(set);
}

// Série de carga por exercício, ciente de blocos:
// se houver registro por bloco, usa o bloco de papel "primary" (ex.: top_set);
// senão, cai para o registro simples (fit_training_log_entries).
export async function getExerciseLoadSeries(patientId: string, exerciseName: string): Promise<FitPoint[]> {
  const dates = await patientLogDates(patientId);
  const logIds = Array.from(dates.keys());
  if (logIds.length === 0) return [];

  const { data: blockRows } = await supabase
    .from("fit_training_log_block_entries")
    .select("log_id, load_done, block_type, exercise_name")
    .in("log_id", logIds)
    .eq("exercise_name", exerciseName)
    .not("load_done", "is", null);
  const blockPoints: FitPoint[] = [];
  for (const e of (blockRows as { log_id: string; load_done: number; block_type: string }[] | null) ?? []) {
    if (blockChartRole(e.block_type) !== "primary") continue;
    const d = dates.get(e.log_id);
    if (d) blockPoints.push({ date: d, value: Number(e.load_done) });
  }
  if (blockPoints.length > 0) return sortByDate(blockPoints);

  const { data } = await supabase
    .from("fit_training_log_entries")
    .select("log_id, load_done, exercise_name")
    .in("log_id", logIds)
    .eq("exercise_name", exerciseName)
    .not("load_done", "is", null);
  const points: FitPoint[] = [];
  for (const e of (data as { log_id: string; load_done: number }[] | null) ?? []) {
    const d = dates.get(e.log_id);
    if (d) points.push({ date: d, value: Number(e.load_done) });
  }
  return sortByDate(points);
}

// ── Check-ins ──
export async function getCheckinSeries(patientId: string): Promise<FitCheckinPoint[]> {
  const { data } = await supabase
    .from("fit_checkins")
    .select("checkin_date, weight_kg, adherence_pct, energy_level, sleep_quality, pain_level, mood")
    .eq("patient_id", patientId)
    .order("checkin_date", { ascending: true });
  return ((data as FitCheckinRow[] | null) ?? []).map((c) => ({
    date: c.checkin_date,
    weight: c.weight_kg != null ? Number(c.weight_kg) : null,
    adherence: c.adherence_pct != null ? Number(c.adherence_pct) : null,
    energy: c.energy_level != null ? Number(c.energy_level) : null,
    sleep: c.sleep_quality != null ? Number(c.sleep_quality) : null,
    pain: c.pain_level != null ? Number(c.pain_level) : null,
    mood: c.mood != null ? Number(c.mood) : null,
  }));
}

// ── Comparativo com a Linha de Base ──
export async function getBaselineComparison(patientId: string): Promise<FitBaselineRow[]> {
  const { data: baseline } = await supabase
    .from("fit_assessments")
    .select("id")
    .eq("patient_id", patientId)
    .eq("type", "baseline")
    .order("assessed_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!baseline) return [];

  const { data: baseMeas } = await supabase
    .from("fit_measurements")
    .select("*")
    .eq("assessment_id", (baseline as { id: string }).id);
  const baseRows = ((baseMeas as FitMeasurement[] | null) ?? []).filter(isGlobalMeasurement).filter((row) => row.metric !== "bmi");
  if (baseRows.length === 0) return [];

  const rows: FitBaselineRow[] = [];
  for (const b of baseRows) {
    const series = await getMeasurementSeries(patientId, b.metric);
    if (series.length === 0) continue;
    const current = series[series.length - 1].value;
    rows.push({
      metric: b.metric,
      label: measurementLabel(b.metric, b.label),
      unit: b.unit,
      baseline: Number(b.value),
      current,
      delta: current - Number(b.value),
      valence: metricValence(b.metric),
    });
  }
  return rows;
}

// ── IMC derivado (último peso × última altura) ──
export interface FitBMI {
  bmi: number;
  weight: number;
  height_cm: number;
  referenceDate: string;
  weightSource: FitMeasurementSource;
  heightSource: FitMeasurementSource;
}
export async function getCurrentBMI(patientId: string): Promise<FitBMI | null> {
  const resolved = await resolveBMI(patientId, new Date().toISOString().slice(0, 10));
  if (resolved.status !== "complete" || resolved.bmi == null || !resolved.weight || !resolved.height) return null;
  return { bmi: resolved.bmi, weight: resolved.weight.value, height_cm: resolved.height.value, referenceDate: resolved.referenceDate, weightSource: resolved.weight, heightSource: resolved.height };
}

// ── Frequência semanal de treino ──
function weekStart(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const dow = (d.getDay() + 6) % 7; // 0 = segunda
  d.setDate(d.getDate() - dow);
  return d.toISOString().slice(0, 10);
}
export async function getWeeklyTrainingCounts(patientId: string, weeks = 8): Promise<FitPoint[]> {
  const { data } = await supabase
    .from("fit_training_logs")
    .select("performed_at")
    .eq("patient_id", patientId)
    .eq("status", "active");
  const rows = (data as { performed_at: string }[] | null) ?? [];
  const counts = new Map<string, number>();
  for (const r of rows) {
    const w = weekStart(r.performed_at);
    counts.set(w, (counts.get(w) ?? 0) + 1);
  }
  return sortByDate(Array.from(counts, ([date, value]) => ({ date, value }))).slice(-weeks);
}
