// Regras puras e leitura derivada da avaliação segmentada (Fase 16).
// Diferenças e IMC nunca são persistidos como fit_measurements.

import { supabase } from "./supabase-fit";
import { MEASUREMENT_CLINICAL_ROLE_LABELS, MEASUREMENT_SIDE_LABELS, type FitMeasurement, type FitMeasurementClinicalRole, type FitMeasurementSide } from "./types";

export type FitComparisonMode = "left_right" | "affected_unaffected";

export interface FitMeasurementSource {
  id: string;
  type: "measurement" | "checkin";
  date: string;
  value: number;
}

export interface FitBMIResolution {
  status: "complete" | "incomplete";
  referenceDate: string;
  bmi: number | null;
  weight: FitMeasurementSource | null;
  height: FitMeasurementSource | null;
  reason: string | null;
}

export interface FitAsymmetryResult {
  comparable: boolean;
  reason: string | null;
  mode: FitComparisonMode;
  first: FitMeasurement;
  second: FitMeasurement;
  absoluteDifference: number | null;
  relativeDifferencePct: number | null;
  affectedUnaffectedPct: number | null;
}

export interface FitAsymmetryPoint {
  date: string;
  first: number;
  second: number;
  absoluteDifference: number;
  relativeDifferencePct: number | null;
  affectedUnaffectedPct: number | null;
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b));
    return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

const norm = (value: string | null | undefined) => value?.trim() || "";

export function isGlobalMeasurement(m: Pick<FitMeasurement, "side" | "clinical_role" | "body_region" | "body_segment" | "joint" | "measurement_site" | "protocol" | "method" | "source_exercise_library_id" | "context">): boolean {
  return !m.side && !m.clinical_role && !m.body_region && !m.body_segment && !m.joint && !m.measurement_site && !m.protocol && !m.method && !m.source_exercise_library_id && Object.keys(m.context ?? {}).length === 0;
}

export function measurementTechnicalKey(m: Pick<FitMeasurement, "category" | "metric" | "label" | "unit" | "body_region" | "body_segment" | "joint" | "measurement_site" | "protocol" | "method" | "source_exercise_library_id" | "source_exercise_name_snapshot" | "context">): string {
  const customLabel = m.metric.startsWith("custom_") ? norm(m.label) : "";
  const exerciseIdentity = m.source_exercise_library_id ? m.source_exercise_library_id : m.source_exercise_name_snapshot;
  return [m.category, m.metric, customLabel, norm(m.unit), norm(m.body_region), norm(m.body_segment), norm(m.joint), norm(m.measurement_site), norm(m.protocol), norm(m.method), norm(exerciseIdentity), canonical(m.context ?? {})].join("|");
}

export function measurementIdentityKey(m: Pick<FitMeasurement, "category" | "metric" | "label" | "unit" | "body_region" | "body_segment" | "joint" | "measurement_site" | "protocol" | "method" | "source_exercise_library_id" | "source_exercise_name_snapshot" | "context" | "side" | "clinical_role">): string {
  return `${measurementTechnicalKey(m)}|${m.side ?? "global"}|${m.clinical_role ?? "none"}`;
}

export function measurementContextLabel(m: FitMeasurement): string {
  const side = m.side_label ?? (m.side ? MEASUREMENT_SIDE_LABELS[m.side] : null);
  const role = m.clinical_role ? MEASUREMENT_CLINICAL_ROLE_LABELS[m.clinical_role] : null;
  return [m.body_region, m.body_segment, m.joint, m.measurement_site, m.protocol, m.method, m.source_exercise_name_snapshot, side, role].filter(Boolean).join(" · ");
}

function comparisonIssue(a: FitMeasurement, b: FitMeasurement): string | null {
  if (!a.unit || !b.unit) return "Unidade ausente em métrica segmentar.";
  if (a.category !== b.category || a.metric !== b.metric) return "Métricas diferentes.";
  if (a.metric.startsWith("custom_") && norm(a.label) !== norm(b.label)) return "Rótulos personalizados diferentes.";
  if (norm(a.unit) !== norm(b.unit)) return "Unidades diferentes.";
  if (norm(a.body_region) !== norm(b.body_region) || norm(a.body_segment) !== norm(b.body_segment) || norm(a.joint) !== norm(b.joint)) return "Contextos anatômicos diferentes.";
  if (norm(a.measurement_site) !== norm(b.measurement_site)) return "Pontos anatômicos diferentes.";
  if (norm(a.protocol) !== norm(b.protocol)) return "Protocolos diferentes.";
  if (norm(a.method) !== norm(b.method)) return "Métodos de medida diferentes.";
  if (canonical(a.context ?? {}) !== canonical(b.context ?? {})) return "Contextos técnicos diferentes.";
  const hasExercise = Boolean(a.source_exercise_library_id || b.source_exercise_library_id || a.source_exercise_name_snapshot || b.source_exercise_name_snapshot);
  if (hasExercise && (!a.source_exercise_library_id || !b.source_exercise_library_id)) return "Origem manual não autoriza equivalência de exercício ou equipamento.";
  if (a.source_exercise_library_id !== b.source_exercise_library_id) return "Exercícios ou equipamentos de origem diferentes.";
  return null;
}

export function compareMeasurements(a: FitMeasurement, b: FitMeasurement, mode: FitComparisonMode): FitAsymmetryResult {
  const expected: [FitMeasurementSide | FitMeasurementClinicalRole, FitMeasurementSide | FitMeasurementClinicalRole] = mode === "left_right" ? ["left", "right"] : ["affected", "unaffected"];
  const axes = mode === "left_right" ? [a.side, b.side] : [a.clinical_role, b.clinical_role];
  const first = axes[0] === expected[0] ? a : b;
  const second = first === a ? b : a;
  if (!axes.includes(expected[0] as never) || !axes.includes(expected[1] as never)) return { comparable: false, reason: `Par ${expected[0]}/${expected[1]} incompleto.`, mode, first, second, absoluteDifference: null, relativeDifferencePct: null, affectedUnaffectedPct: null };
  const issue = comparisonIssue(first, second);
  if (issue) return { comparable: false, reason: issue, mode, first, second, absoluteDifference: null, relativeDifferencePct: null, affectedUnaffectedPct: null };
  const av = Number(first.value); const bv = Number(second.value);
  const absoluteDifference = Math.abs(av - bv);
  const relativeDenominator = Math.max(Math.abs(av), Math.abs(bv));
  return {
    comparable: true,
    reason: null,
    mode,
    first,
    second,
    absoluteDifference,
    relativeDifferencePct: relativeDenominator === 0 ? null : (absoluteDifference / relativeDenominator) * 100,
    affectedUnaffectedPct: mode === "affected_unaffected" && bv !== 0 ? (av / bv) * 100 : null,
  };
}

export function buildAsymmetrySeries(measurements: FitMeasurement[], mode: FitComparisonMode): FitAsymmetryPoint[] {
  const groups = new Map<string, FitMeasurement[]>();
  for (const m of measurements) {
    const key = `${m.assessment_id ?? m.measured_at}|${measurementTechnicalKey(m)}`;
    groups.set(key, [...(groups.get(key) ?? []), m]);
  }
  const points: FitAsymmetryPoint[] = [];
  for (const rows of groups.values()) {
    const firstRows = rows.filter((m) => mode === "left_right" ? m.side === "left" : m.clinical_role === "affected");
    const secondRows = rows.filter((m) => mode === "left_right" ? m.side === "right" : m.clinical_role === "unaffected");
    if (firstRows.length !== 1 || secondRows.length !== 1) continue;
    const result = compareMeasurements(firstRows[0], secondRows[0], mode);
    if (!result.comparable || result.absoluteDifference == null) continue;
    points.push({ date: firstRows[0].measured_at, first: Number(result.first.value), second: Number(result.second.value), absoluteDifference: result.absoluteDifference, relativeDifferencePct: result.relativeDifferencePct, affectedUnaffectedPct: result.affectedUnaffectedPct });
  }
  return points.sort((a, b) => a.date.localeCompare(b.date));
}

export async function resolveBMI(patientId: string, referenceDate: string, preferredAssessmentId?: string | null): Promise<FitBMIResolution> {
  const [{ data: measurementRows }, { data: checkinRows }] = await Promise.all([
    supabase.from("fit_measurements").select("*").eq("patient_id", patientId).in("metric", ["weight_kg", "height_cm"]).lte("measured_at", referenceDate).order("measured_at", { ascending: false }).order("created_at", { ascending: false }),
    supabase.from("fit_checkins").select("id, checkin_date, weight_kg").eq("patient_id", patientId).lte("checkin_date", referenceDate).not("weight_kg", "is", null).order("checkin_date", { ascending: false }).order("created_at", { ascending: false }),
  ]);
  const measurements = ((measurementRows as FitMeasurement[] | null) ?? []).filter(isGlobalMeasurement);
  const valid = (value: unknown) => Number.isFinite(Number(value)) && Number(value) > 0;
  const preferredWeight = preferredAssessmentId ? measurements.find((m) => m.metric === "weight_kg" && m.assessment_id === preferredAssessmentId && valid(m.value)) : undefined;
  const measuredWeight = measurements.find((m) => m.metric === "weight_kg" && valid(m.value));
  const checkin = ((checkinRows as { id: string; checkin_date: string; weight_kg: number }[] | null) ?? []).find((row) => valid(row.weight_kg));
  const fallbackWeight = measuredWeight && (!checkin || measuredWeight.measured_at >= checkin.checkin_date) ? { id: measuredWeight.id, type: "measurement" as const, date: measuredWeight.measured_at, value: Number(measuredWeight.value) } : checkin ? { id: checkin.id, type: "checkin" as const, date: checkin.checkin_date, value: Number(checkin.weight_kg) } : null;
  const weight = preferredWeight ? { id: preferredWeight.id, type: "measurement" as const, date: preferredWeight.measured_at, value: Number(preferredWeight.value) } : fallbackWeight;
  const heightRow = measurements.find((m) => m.metric === "height_cm" && valid(m.value));
  const height = heightRow ? { id: heightRow.id, type: "measurement" as const, date: heightRow.measured_at, value: Number(heightRow.value) } : null;
  if (!weight || !height) return { status: "incomplete", referenceDate, bmi: null, weight, height, reason: !weight && !height ? "Peso e altura não encontrados até a data de referência." : !weight ? "Peso não encontrado até a data de referência." : "Altura não encontrada até a data de referência." };
  const heightM = height.value / 100;
  return { status: "complete", referenceDate, bmi: weight.value / (heightM * heightM), weight, height, reason: null };
}
