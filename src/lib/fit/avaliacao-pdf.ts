// PDF da avaliação (corpo HTML → chassi fit-doc). Dados só via RLS existente.

import { printDocument, escapeHtml } from "./fit-doc";
import { getAssessment } from "./fit-assessments";
import { listMeasurementsByAssessment } from "./fit-measurements";
import { getPatient } from "./fit-patients";
import { getMyProfile } from "./fit-profiles";
import { measurementLabel } from "./metrics";
import {
  ASSESSMENT_TYPE_LABELS,
  MEASUREMENT_CATEGORY_LABELS,
  MEASUREMENT_CATEGORY_ORDER,
  MODALITY_LABELS,
  CONSULTORIA_TYPE_LABELS,
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

function section(title: string, inner: string): string {
  return `<div class="fit-doc-section"><h2>${escapeHtml(title)}</h2>${inner}</div>`;
}

function buildBody(params: {
  assessment: FitAssessment;
  measurements: FitMeasurement[];
  patient: FitPatient | null;
  professionalName: string;
}): string {
  const { assessment, measurements, patient, professionalName } = params;
  const patientName = patient?.full_name ?? "—";

  // Cabeçalho + partes
  let html = `<div class="fit-doc">
    <div class="fit-doc-header">
      <div class="fit-doc-brand">Consultoria<span>Fit</span></div>
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
  for (const cat of MEASUREMENT_CATEGORY_ORDER) {
    const ms = measurements.filter((m) => m.category === cat);
    if (ms.length === 0) continue;
    html += section(MEASUREMENT_CATEGORY_LABELS[cat], measurementTable(ms));
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

  const [measurements, patient, profile] = await Promise.all([
    listMeasurementsByAssessment(assessmentId),
    getPatient(assessment.patient_id),
    getMyProfile(),
  ]);

  const html = buildBody({ assessment, measurements, patient, professionalName: profile?.full_name ?? "" });
  const safeName = (patient?.full_name ?? "paciente").replace(/\s+/g, "-");
  const title = `Avaliacao-${safeName}-${assessment.assessed_at}`;
  return printDocument(html, title);
}
