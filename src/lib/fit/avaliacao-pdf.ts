// PDF da avaliação (corpo HTML → chassi fit-doc). Dados só via RLS existente.

import { printDocument, escapeHtml } from "./fit-doc";
import { FIT_BRAND_NAME, FIT_BRAND_SLOGAN } from "./brand";
import { getAssessment } from "./fit-assessments";
import { listMeasurementsByAssessment } from "./fit-measurements";
import { getPatient } from "./fit-patients";
import { getMyProfile } from "./fit-profiles";
import { measurementLabel } from "./metrics";
import { compareMeasurements, isGlobalMeasurement, measurementContextLabel, measurementTechnicalKey, resolveBMI, type FitBMIResolution, type FitComparisonMode } from "./fit-segmented-measurements";
import {
  ASSESSMENT_TYPE_LABELS,
  MEASUREMENT_CATEGORY_LABELS,
  MEASUREMENT_CATEGORY_ORDER,
  MODALITY_LABELS,
  CONSULTORIA_TYPE_LABELS,
  MEASUREMENT_CLINICAL_ROLE_LABELS,
  MEASUREMENT_SIDE_LABELS,
  type FitAssessment,
  type FitMeasurement,
  type FitPatient,
} from "./types";

function fmt(d: string | null): string {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  return day && m && y ? `${day}/${m}/${y}` : d;
}

function row(label: string, value: string): string {
  return `<tr><td>${escapeHtml(label)}</td><td class="val">${escapeHtml(value)}</td></tr>`;
}

function measurementTable(ms: FitMeasurement[]): string {
  const body = ms
    .map((m) => row(measurementLabel(m.metric, m.label), `${m.value}${m.unit ? ` ${m.unit}` : ""}`))
    .join("");
  return `<table><thead><tr><th>Medida</th><th style="text-align:right">Valor</th></tr></thead><tbody>${body}</tbody></table>`;
}

function segmentedTable(ms: FitMeasurement[]): string {
  const body = ms.map((m) => `<tr><td>${escapeHtml(measurementLabel(m.metric, m.label))}<div class="muted">${escapeHtml(measurementContextLabel(m))}</div></td><td>${escapeHtml(m.side ? MEASUREMENT_SIDE_LABELS[m.side] : "—")}</td><td>${escapeHtml(m.clinical_role ? MEASUREMENT_CLINICAL_ROLE_LABELS[m.clinical_role] : "—")}</td><td class="val">${escapeHtml(`${m.value}${m.unit ? ` ${m.unit}` : ""}`)}</td></tr>`).join("");
  return `<table><thead><tr><th>Métrica e contexto</th><th>Lado</th><th>Papel clínico</th><th style="text-align:right">Valor</th></tr></thead><tbody>${body}</tbody></table>`;
}

function asymmetryTable(ms: FitMeasurement[]): string {
  const groups = new Map<string, FitMeasurement[]>();
  for (const m of ms) groups.set(measurementTechnicalKey(m), [...(groups.get(measurementTechnicalKey(m)) ?? []), m]);
  const rows: string[] = [];
  for (const values of groups.values()) for (const mode of ["left_right", "affected_unaffected"] as FitComparisonMode[]) {
    const first = values.filter((m) => mode === "left_right" ? m.side === "left" : m.clinical_role === "affected");
    const second = values.filter((m) => mode === "left_right" ? m.side === "right" : m.clinical_role === "unaffected");
    if (first.length === 0 && second.length === 0) continue;
    const sample = first[0] ?? second[0];
    if (first.length !== 1 || second.length !== 1) { rows.push(`<tr><td>${escapeHtml(measurementLabel(sample.metric, sample.label))}</td><td colspan="4">Dados não comparáveis automaticamente: ${first.length > 1 || second.length > 1 ? "grupo ambíguo" : "par incompleto"}.</td></tr>`); continue; }
    const result = compareMeasurements(first[0], second[0], mode);
    if (!result.comparable) { rows.push(`<tr><td>${escapeHtml(measurementLabel(sample.metric, sample.label))}</td><td colspan="4">Dados não comparáveis automaticamente: ${escapeHtml(result.reason ?? "contexto incompatível")}.</td></tr>`); continue; }
    const labels = mode === "left_right" ? ["Esquerda", "Direita"] : ["Afetado", "Não afetado"];
    rows.push(`<tr><td>${escapeHtml(measurementLabel(sample.metric, sample.label))}<div class="muted">${escapeHtml(measurementContextLabel(sample))}</div></td><td class="val">${labels[0]}: ${result.first.value}</td><td class="val">${labels[1]}: ${result.second.value}</td><td class="val">${result.absoluteDifference?.toFixed(2)}${sample.unit ? ` ${escapeHtml(sample.unit)}` : ""}</td><td class="val">${result.relativeDifferencePct == null ? "—" : `${result.relativeDifferencePct.toFixed(1)}%`}</td></tr>`);
  }
  if (rows.length === 0) return "";
  return `<table><thead><tr><th>Métrica</th><th style="text-align:right">A</th><th style="text-align:right">B</th><th style="text-align:right">Dif. absoluta</th><th style="text-align:right">Dif. relativa</th></tr></thead><tbody>${rows.join("")}</tbody></table><div class="muted">Diferenças informativas, sem classificação automática.</div>`;
}

function bmiBlock(bmi: FitBMIResolution): string {
  if (bmi.status === "incomplete") return `<div class="fit-doc-notes">IMC incompleto: ${escapeHtml(bmi.reason ?? "fontes indisponíveis")}. Data de referência: ${fmt(bmi.referenceDate)}.</div>`;
  const source = (label: string, item: NonNullable<FitBMIResolution["weight"]>, unit: string) => row(label, `${item.value} ${unit} · ${item.type === "measurement" ? "medição" : "check-in"} de ${fmt(item.date)} · ID ${item.id}`);
  return `<table><tbody>${row("IMC derivado", bmi.bmi?.toFixed(1) ?? "—")}${source("Peso utilizado", bmi.weight as NonNullable<FitBMIResolution["weight"]>, "kg")}${source("Altura utilizada", bmi.height as NonNullable<FitBMIResolution["height"]>, "cm")}${row("Data de referência", fmt(bmi.referenceDate))}</tbody></table><div class="muted">Sem classificação automática.</div>`;
}

function section(title: string, inner: string): string {
  return `<div class="fit-doc-section"><h2>${escapeHtml(title)}</h2>${inner}</div>`;
}

function buildBody(params: {
  assessment: FitAssessment;
  measurements: FitMeasurement[];
  patient: FitPatient | null;
  professionalName: string;
  bmi: FitBMIResolution;
}): string {
  const { assessment, measurements, patient, professionalName, bmi } = params;
  const patientName = patient?.full_name ?? "—";

  // Cabeçalho + partes
  let html = `<div class="fit-doc">
    <div class="fit-doc-header">
      <div class="fit-doc-brand">${escapeHtml(FIT_BRAND_NAME)}</div>
      <div class="fit-doc-meta">${escapeHtml(FIT_BRAND_SLOGAN)}</div>
      <h1>Avaliação Física</h1>
      <div class="fit-doc-meta">${escapeHtml(ASSESSMENT_TYPE_LABELS[assessment.type])} · ${fmt(assessment.assessed_at)}</div>
    </div>
    <div class="fit-doc-parties">
      <div><strong>Paciente:</strong> ${escapeHtml(patientName)}</div>
      <div><strong>Profissional:</strong> ${escapeHtml(professionalName || "—")}</div>
    </div>`;

  // Dados do paciente
  if (patient) {
    const dados = [
      row("Objetivo", patient.goal ?? "—"),
      row("Modalidade", patient.modality ? MODALITY_LABELS[patient.modality] : "—"),
      row("Tipo de consultoria", patient.consultoria_type ? CONSULTORIA_TYPE_LABELS[patient.consultoria_type] : "—"),
      row("Data de nascimento", patient.birth_date ? fmt(patient.birth_date) : "—"),
    ].join("");
    html += section("Dados do paciente", `<table><tbody>${dados}</tbody></table>`);
  }

  // Blocos de medições por categoria (omite vazios)
  const globals = measurements.filter(isGlobalMeasurement).filter((m) => m.metric !== "bmi");
  const segmented = measurements.filter((m) => !isGlobalMeasurement(m));
  for (const cat of MEASUREMENT_CATEGORY_ORDER) {
    const ms = globals.filter((m) => m.category === cat);
    if (ms.length === 0) continue;
    html += section(MEASUREMENT_CATEGORY_LABELS[cat], measurementTable(ms));
  }
  html += section("IMC automático", bmiBlock(bmi));
  if (segmented.length > 0) {
    html += section("Métricas segmentares", segmentedTable(segmented));
    const comparison = asymmetryTable(segmented);
    if (comparison) html += section("Diferenças entre lados", comparison);
  }

  // Observações gerais
  if (assessment.notes && assessment.notes.trim()) {
    html += section("Observações", `<div class="fit-doc-notes">${escapeHtml(assessment.notes)}</div>`);
  }

  // Observações clínicas
  const clinical = typeof assessment.data?.clinical_notes === "string" ? (assessment.data.clinical_notes as string) : "";
  if (clinical.trim()) {
    html += section("Observações Clínicas", `<div class="fit-doc-notes">${escapeHtml(clinical)}</div>`);
  }

  html += `</div>`;
  return html;
}

// Gera e imprime. Retorna false se dados indisponíveis ou pop-up bloqueado.
export async function generateAssessmentPdf(assessmentId: string): Promise<boolean> {
  const assessment = await getAssessment(assessmentId);
  if (!assessment) return false;

  const [measurements, patient, profile, bmi] = await Promise.all([
    listMeasurementsByAssessment(assessmentId),
    getPatient(assessment.patient_id),
    getMyProfile(),
    resolveBMI(assessment.patient_id, assessment.assessed_at, assessment.id),
  ]);

  const html = buildBody({ assessment, measurements, patient, professionalName: profile?.full_name ?? "", bmi });
  const safeName = (patient?.full_name ?? "paciente").replace(/\s+/g, "-");
  const title = `Avaliacao-${safeName}-${assessment.assessed_at}`;
  return printDocument(html, title);
}
