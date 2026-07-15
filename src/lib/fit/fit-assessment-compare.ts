// Comparação entre avaliações (baseline / reavaliações). Só leitura via RLS.
// Valência neutra por padrão (só dor/aderência têm sinal) — reusa metricValence.

import { supabase } from "./supabase-fit";
import { measurementLabel } from "./metrics";
import { metricValence, type FitValence } from "./fit-evolution";
import { compareMeasurements, measurementContextLabel, measurementIdentityKey, measurementTechnicalKey, resolveBMI, type FitComparisonMode } from "./fit-segmented-measurements";
import {
  MEASUREMENT_CATEGORY_ORDER,
  type FitAssessment,
  type FitAssessmentType,
  type FitMeasurement,
  type FitMeasurementCategory,
} from "./types";

export type FitComparisonReference = "baseline" | "previous";

export interface FitComparisonRow {
  identityKey: string;
  metric: string;
  label: string;
  contextLabel: string;
  sideLabel: string | null;
  unit: string | null;
  category: FitMeasurementCategory;
  refValue: number | null;
  currentValue: number;
  delta: number | null;
  pct: number | null;
  valence: FitValence;
}

export interface FitAssessmentAsymmetryRow {
  key: string;
  label: string;
  contextLabel: string;
  unit: string | null;
  mode: FitComparisonMode;
  referenceDifference: number | null;
  currentDifference: number | null;
  differenceDelta: number | null;
  referenceValues: [number, number] | null;
  currentValues: [number, number] | null;
  reason: string | null;
}

export interface FitComparisonResult {
  hasReference: boolean;
  referenceLabel: string;
  referenceDate: string | null;
  rows: FitComparisonRow[];
  asymmetries: FitAssessmentAsymmetryRow[];
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
  if (currentIdx < 0) return { hasReference: false, referenceLabel: "", referenceDate: null, rows: [], asymmetries: [] };
  const current = assessments[currentIdx];

  let ref: FitAssessment | undefined;
  if (reference === "baseline") ref = assessments.find((a) => a.type === "baseline");
  else ref = currentIdx > 0 ? assessments[currentIdx - 1] : undefined;
  if (ref && ref.id === current.id) ref = undefined;

  const currentMs = await measurementsFor(current.id);
  const refMs = ref ? await measurementsFor(ref.id) : [];

  const visibleCurrent = currentMs.filter((m) => m.metric !== "bmi");
  const visibleRef = refMs.filter((m) => m.metric !== "bmi");
  const refMap = new Map<string, number>();
  for (const m of visibleRef) refMap.set(measurementIdentityKey(m), Number(m.value));
  const curMap = new Map<string, FitMeasurement>();
  for (const m of visibleCurrent) curMap.set(measurementIdentityKey(m), m);

  const rows: FitComparisonRow[] = [];
  for (const [identityKey, m] of curMap) {
    const currentValue = Number(m.value);
    const refValue = refMap.has(identityKey) ? (refMap.get(identityKey) as number) : null;
    const delta = refValue != null ? currentValue - refValue : null;
    const pct = refValue != null && refValue !== 0 ? ((delta as number) / refValue) * 100 : null;
    rows.push({
      identityKey,
      metric: m.metric,
      label: measurementLabel(m.metric, m.label),
      contextLabel: measurementContextLabel(m),
      sideLabel: m.side_label,
      unit: m.unit,
      category: m.category,
      refValue,
      currentValue,
      delta,
      pct,
      valence: metricValence(m.metric),
    });
  }
  const [currentBmi, referenceBmi] = await Promise.all([
    resolveBMI(patientId, current.assessed_at, current.id),
    ref ? resolveBMI(patientId, ref.assessed_at, ref.id) : Promise.resolve(null),
  ]);
  if (currentBmi.status === "complete" && currentBmi.bmi != null) {
    const refValue = referenceBmi?.status === "complete" ? referenceBmi.bmi : null;
    const delta = refValue != null ? currentBmi.bmi - refValue : null;
    rows.push({ identityKey: "derived|bmi", metric: "bmi_derived", label: "IMC derivado", contextLabel: `Peso ${currentBmi.weight?.value} kg (${currentBmi.weight?.date}) · altura ${currentBmi.height?.value} cm (${currentBmi.height?.date})`, sideLabel: null, unit: "kg/m²", category: "anthropometry", refValue, currentValue: currentBmi.bmi, delta, pct: refValue && delta != null ? delta / refValue * 100 : null, valence: "neutral" });
  }
  rows.sort(byCategoryThenLabel);

  const asymmetries = compareAssessmentAsymmetries(visibleCurrent, visibleRef);

  const referenceLabel = !ref ? "" : ref.type === "baseline" ? "Linha de base" : `Reavaliação de ${fmt(ref.assessed_at)}`;
  return { hasReference: !!ref, referenceLabel, referenceDate: ref?.assessed_at ?? null, rows, asymmetries };
}

function asymmetriesFor(measurements: FitMeasurement[]): Map<string, Omit<FitAssessmentAsymmetryRow, "referenceDifference" | "differenceDelta" | "referenceValues">> {
  const groups = new Map<string, FitMeasurement[]>();
  for (const m of measurements) groups.set(measurementTechnicalKey(m), [...(groups.get(measurementTechnicalKey(m)) ?? []), m]);
  const result = new Map<string, Omit<FitAssessmentAsymmetryRow, "referenceDifference" | "differenceDelta" | "referenceValues">>();
  for (const [technicalKey, rows] of groups) for (const mode of ["left_right", "affected_unaffected"] as FitComparisonMode[]) {
    const first = rows.filter((m) => mode === "left_right" ? m.side === "left" : m.clinical_role === "affected");
    const second = rows.filter((m) => mode === "left_right" ? m.side === "right" : m.clinical_role === "unaffected");
    if (first.length === 0 && second.length === 0) continue;
    const sample = first[0] ?? second[0];
    const key = `${technicalKey}|${mode}`;
    if (first.length !== 1 || second.length !== 1) {
      result.set(key, { key, label: measurementLabel(sample.metric, sample.label), contextLabel: measurementContextLabel(sample), unit: sample.unit, mode, currentDifference: null, currentValues: null, reason: first.length > 1 || second.length > 1 ? "Dados não comparáveis automaticamente: grupo ambíguo." : "Dados não comparáveis automaticamente: par incompleto." });
      continue;
    }
    const compared = compareMeasurements(first[0], second[0], mode);
    result.set(key, { key, label: measurementLabel(sample.metric, sample.label), contextLabel: measurementContextLabel(sample), unit: sample.unit, mode, currentDifference: compared.absoluteDifference, currentValues: [Number(compared.first.value), Number(compared.second.value)], reason: compared.comparable ? null : `Dados não comparáveis automaticamente: ${compared.reason}` });
  }
  return result;
}

function compareAssessmentAsymmetries(current: FitMeasurement[], reference: FitMeasurement[]): FitAssessmentAsymmetryRow[] {
  const currentMap = asymmetriesFor(current); const refMap = asymmetriesFor(reference);
  return Array.from(currentMap.values()).map((row) => {
    const ref = refMap.get(row.key);
    const referenceDifference = ref?.currentDifference ?? null;
    return { ...row, referenceDifference, referenceValues: ref?.currentValues ?? null, differenceDelta: row.currentDifference != null && referenceDifference != null ? row.currentDifference - referenceDifference : null };
  });
}

// ── Histórico: matriz métrica × avaliações ──
export interface FitAssessmentHistory {
  assessments: { id: string; assessed_at: string; type: FitAssessmentType }[];
  metrics: {
    identityKey: string;
    metric: string;
    label: string;
    unit: string | null;
    category: FitMeasurementCategory;
    contextLabel: string;
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
  for (const m of ms.filter((row) => row.metric !== "bmi")) {
    if (!m.assessment_id) continue;
    const identityKey = measurementIdentityKey(m);
    let row = map.get(identityKey);
    if (!row) {
      row = { identityKey, metric: m.metric, label: measurementLabel(m.metric, m.label), unit: m.unit, category: m.category, contextLabel: measurementContextLabel(m), values: {} };
      map.set(identityKey, row);
    }
    row.values[m.assessment_id] = Number(m.value);
  }

  return {
    assessments: assessments.map((a) => ({ id: a.id, assessed_at: a.assessed_at, type: a.type })),
    metrics: Array.from(map.values()).sort(byCategoryThenLabel),
  };
}
