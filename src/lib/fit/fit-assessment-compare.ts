// Comparação entre avaliações (baseline / reavaliações). Só leitura via RLS.
// Valência neutra por padrão (só dor/aderência têm sinal) — reusa metricValence.

import { supabase } from "./supabase-fit";
import { measurementLabel } from "./metrics";
import { metricValence, type FitValence } from "./fit-evolution";
import {
  MEASUREMENT_CATEGORY_ORDER,
  type FitAssessment,
  type FitAssessmentType,
  type FitMeasurement,
  type FitMeasurementCategory,
} from "./types";

export type FitComparisonReference = "baseline" | "previous";

export interface FitComparisonRow {
  metric: string;
  label: string;
  unit: string | null;
  category: FitMeasurementCategory;
  refValue: number | null;
  currentValue: number;
  delta: number | null;
  pct: number | null;
  valence: FitValence;
}

export interface FitComparisonResult {
  hasReference: boolean;
  referenceLabel: string;
  referenceDate: string | null;
  rows: FitComparisonRow[];
}

function fmt(d: string): string {
  const [y, m, day] = d.split("-");
  return day && m && y ? `${day}/${m}/${y}` : d;
}

async function loadAssessments(patientId: string): Promise<FitAssessment[]> {
  const { data } = await supabase
    .from("fit_assessments")
    .select("*")
    .eq("patient_id", patientId)
    .eq("status", "active")
    .order("assessed_at", { ascending: true });
  return (data as FitAssessment[] | null) ?? [];
}

async function measurementsFor(assessmentId: string): Promise<FitMeasurement[]> {
  const { data } = await supabase.from("fit_measurements").select("*").eq("assessment_id", assessmentId);
  return (data as FitMeasurement[] | null) ?? [];
}

function byCategoryThenLabel<T extends { category: FitMeasurementCategory; label: string }>(a: T, b: T): number {
  const ci = MEASUREMENT_CATEGORY_ORDER.indexOf(a.category) - MEASUREMENT_CATEGORY_ORDER.indexOf(b.category);
  return ci !== 0 ? ci : a.label.localeCompare(b.label);
}

export async function getAssessmentComparison(
  patientId: string,
  currentAssessmentId: string,
  reference: FitComparisonReference,
): Promise<FitComparisonResult> {
  const assessments = await loadAssessments(patientId);
  const currentIdx = assessments.findIndex((a) => a.id === currentAssessmentId);
  if (currentIdx < 0) return { hasReference: false, referenceLabel: "", referenceDate: null, rows: [] };
  const current = assessments[currentIdx];

  let ref: FitAssessment | undefined;
  if (reference === "baseline") ref = assessments.find((a) => a.type === "baseline");
  else ref = currentIdx > 0 ? assessments[currentIdx - 1] : undefined;
  if (ref && ref.id === current.id) ref = undefined;

  const currentMs = await measurementsFor(current.id);
  const refMs = ref ? await measurementsFor(ref.id) : [];

  const refMap = new Map<string, number>();
  for (const m of refMs) refMap.set(m.metric, Number(m.value));
  const curMap = new Map<string, FitMeasurement>();
  for (const m of currentMs) curMap.set(m.metric, m);

  const rows: FitComparisonRow[] = [];
  for (const [metric, m] of curMap) {
    const currentValue = Number(m.value);
    const refValue = refMap.has(metric) ? (refMap.get(metric) as number) : null;
    const delta = refValue != null ? currentValue - refValue : null;
    const pct = refValue != null && refValue !== 0 ? ((delta as number) / refValue) * 100 : null;
    rows.push({
      metric,
      label: measurementLabel(metric, m.label),
      unit: m.unit,
      category: m.category,
      refValue,
      currentValue,
      delta,
      pct,
      valence: metricValence(metric),
    });
  }
  rows.sort(byCategoryThenLabel);

  const referenceLabel = !ref ? "" : ref.type === "baseline" ? "Linha de base" : `Reavaliação de ${fmt(ref.assessed_at)}`;
  return { hasReference: !!ref, referenceLabel, referenceDate: ref?.assessed_at ?? null, rows };
}

// ── Histórico: matriz métrica × avaliações ──
export interface FitAssessmentHistory {
  assessments: { id: string; assessed_at: string; type: FitAssessmentType }[];
  metrics: {
    metric: string;
    label: string;
    unit: string | null;
    category: FitMeasurementCategory;
    values: Record<string, number>; // assessmentId → valor
  }[];
}

export async function listAssessmentsWithMeasurements(patientId: string): Promise<FitAssessmentHistory> {
  const assessments = await loadAssessments(patientId);
  const ids = assessments.map((a) => a.id);
  if (ids.length === 0) return { assessments: [], metrics: [] };

  const { data } = await supabase.from("fit_measurements").select("*").in("assessment_id", ids);
  const ms = (data as FitMeasurement[] | null) ?? [];

  const map = new Map<string, FitAssessmentHistory["metrics"][number]>();
  for (const m of ms) {
    if (!m.assessment_id) continue;
    let row = map.get(m.metric);
    if (!row) {
      row = { metric: m.metric, label: measurementLabel(m.metric, m.label), unit: m.unit, category: m.category, values: {} };
      map.set(m.metric, row);
    }
    row.values[m.assessment_id] = Number(m.value);
  }

  return {
    assessments: assessments.map((a) => ({ id: a.id, assessed_at: a.assessed_at, type: a.type })),
    metrics: Array.from(map.values()).sort(byCategoryThenLabel),
  };
}
