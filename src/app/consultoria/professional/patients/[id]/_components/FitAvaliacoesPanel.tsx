"use client";

// Painel da aba "Avaliações" no workspace do paciente.
// Lista de avaliações (badge "Linha de base" no baseline) + detalhe em blocos:
// Dados Gerais / Antropometria / Perimetria / Performance / Dor e Funcionalidade /
// Observações Clínicas. As medições da avaliação baseline formam a Linha de Base.

import { useEffect, useState } from "react";
import { getMyProfile } from "@/lib/fit/fit-profiles";
import { listAssessments, getAssessment, createAssessment, updateAssessment } from "@/lib/fit/fit-assessments";
import { listMeasurementsByAssessment } from "@/lib/fit/fit-measurements";
import { generateAssessmentPdf } from "@/lib/fit/avaliacao-pdf";
import { getAssessmentComparison, type FitComparisonResult, type FitComparisonReference } from "@/lib/fit/fit-assessment-compare";
import { FitComparisonTable } from "@/components/fit/FitComparisonTable";
import { FitCard } from "@/components/fit/FitCard";
import { FitSection, fitFieldStyle } from "@/components/fit/FitSection";
import { FitAssessmentForm, type FitAssessmentInput } from "@/components/fit/FitAssessmentForm";
import { FitMeasurementEditor } from "@/components/fit/FitMeasurementEditor";
import { FitAssessmentBmi } from "@/components/fit/FitAssessmentBmi";
import {
  ASSESSMENT_TYPE_LABELS,
  MEASUREMENT_CATEGORY_LABELS,
  MEASUREMENT_CATEGORY_ORDER,
  type FitAssessment,
  type FitMeasurement,
} from "@/lib/fit/types";

function fmtDate(d: string): string {
  const [y, m, day] = d.split("-");
  return day && m && y ? `${day}/${m}/${y}` : d;
}

export function FitAvaliacoesPanel({ patientId }: { patientId: string }) {
  const [list, setList] = useState<FitAssessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [professionalName, setProfessionalName] = useState("Profissional");

  async function loadList() {
    const rows = await listAssessments(patientId);
    setList(rows);
    setLoading(false);
  }

  useEffect(() => {
    getMyProfile().then((p) => p?.full_name && setProfessionalName(p.full_name));
    loadList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

  async function handleCreate() {
    const type = list.length === 0 ? "baseline" : "reassessment";
    const created = await createAssessment({
      patientId,
      type,
      assessed_at: new Date().toISOString().slice(0, 10),
      title: null,
      notes: null,
    });
    if (created) {
      await loadList();
      setSelectedId(created.id);
    }
  }

  if (loading) return <div style={{ color: "#8ea3c0" }}>Carregando…</div>;

  if (selectedId) {
    return (
      <AssessmentDetail
        assessmentId={selectedId}
        patientId={patientId}
        professionalName={professionalName}
        onBack={() => {
          setSelectedId(null);
          loadList();
        }}
      />
    );
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ fontSize: ".82rem", color: "#8ea3c0" }}>{list.length} avaliação(ões)</div>
        <button
          onClick={handleCreate}
          style={{ padding: "9px 16px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#7c5cfc,#5b8def)", color: "#0b1120", fontWeight: 800, fontSize: ".84rem", cursor: "pointer", fontFamily: "var(--font-sans)" }}
        >
          + Nova avaliação
        </button>
      </div>

      {list.length === 0 ? (
        <FitCard>
          <div style={{ fontSize: ".85rem", color: "#8ea3c0", textAlign: "center", padding: "20px" }}>
            Nenhuma avaliação. A primeira será a <strong style={{ color: "#b7a6ff" }}>linha de base</strong> do paciente.
          </div>
        </FitCard>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {list.map((a) => (
            <button
              key={a.id}
              onClick={() => setSelectedId(a.id)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                padding: "13px 16px",
                borderRadius: 12,
                textAlign: "left",
                cursor: "pointer",
                background: "rgba(20,28,48,.7)",
                border: "1px solid rgba(90,110,160,.22)",
                fontFamily: "var(--font-sans)",
              }}
            >
              <div>
                <div style={{ fontSize: ".9rem", fontWeight: 600, color: "#f2f6ff" }}>{fmtDate(a.assessed_at)}</div>
                <div style={{ fontSize: ".76rem", color: "#8ea3c0", marginTop: 2 }}>{ASSESSMENT_TYPE_LABELS[a.type]}</div>
              </div>
              {a.type === "baseline" && (
                <span style={{ fontSize: ".7rem", color: "#b7a6ff", background: "rgba(124,92,252,.14)", border: "1px solid rgba(124,92,252,.4)", borderRadius: 999, padding: "3px 10px" }}>
                  Linha de base
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function AssessmentDetail({
  assessmentId,
  patientId,
  professionalName,
  onBack,
}: {
  assessmentId: string;
  patientId: string;
  professionalName: string;
  onBack: () => void;
}) {
  const [assessment, setAssessment] = useState<FitAssessment | null>(null);
  const [measurements, setMeasurements] = useState<FitMeasurement[]>([]);
  const [clinical, setClinical] = useState("");
  const [savedGeneral, setSavedGeneral] = useState(false);
  const [savingClinical, setSavingClinical] = useState(false);

  async function loadAll() {
    const a = await getAssessment(assessmentId);
    setAssessment(a);
    setClinical(typeof a?.data?.clinical_notes === "string" ? (a.data.clinical_notes as string) : "");
    const ms = await listMeasurementsByAssessment(assessmentId);
    setMeasurements(ms);
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assessmentId]);

  async function reloadMeasurements() {
    const ms = await listMeasurementsByAssessment(assessmentId);
    setMeasurements(ms);
  }

  async function handleGeneral(input: FitAssessmentInput) {
    const updated = await updateAssessment(assessmentId, input);
    if (updated) {
      setAssessment(updated);
      setSavedGeneral(true);
      setTimeout(() => setSavedGeneral(false), 2000);
    }
  }

  async function handleClinical() {
    if (!assessment) return;
    setSavingClinical(true);
    const updated = await updateAssessment(assessmentId, {
      data: { ...assessment.data, clinical_notes: clinical },
    });
    if (updated) setAssessment(updated);
    setSavingClinical(false);
  }

  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfError, setPdfError] = useState(false);
  async function handlePdf() {
    setPdfBusy(true);
    setPdfError(false);
    const ok = await generateAssessmentPdf(assessmentId);
    setPdfBusy(false);
    if (!ok) setPdfError(true);
  }

  const [compareRef, setCompareRef] = useState<FitComparisonReference>("baseline");
  const [comparison, setComparison] = useState<FitComparisonResult | null>(null);
  useEffect(() => {
    if (assessment?.type !== "reassessment") { setComparison(null); return; }
    getAssessmentComparison(patientId, assessmentId, compareRef).then(setComparison);
  }, [assessmentId, patientId, compareRef, assessment?.type]);

  if (!assessment) return <div style={{ color: "#8ea3c0" }}>Carregando…</div>;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: "#8ea3c0", cursor: "pointer", fontSize: ".82rem", fontFamily: "var(--font-sans)", padding: 0 }}>
          ← Avaliações
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {assessment.type === "baseline" && (
            <span style={{ fontSize: ".7rem", color: "#b7a6ff", background: "rgba(124,92,252,.14)", border: "1px solid rgba(124,92,252,.4)", borderRadius: 999, padding: "3px 10px" }}>
              Linha de base
            </span>
          )}
          <button
            onClick={handlePdf}
            disabled={pdfBusy}
            style={{ padding: "7px 14px", borderRadius: 8, border: "1px solid rgba(124,92,252,.5)", background: "rgba(124,92,252,.14)", color: "#b7a6ff", fontWeight: 700, fontSize: ".78rem", cursor: pdfBusy ? "default" : "pointer", fontFamily: "var(--font-sans)" }}
          >
            {pdfBusy ? "Gerando…" : "Gerar PDF"}
          </button>
        </div>
      </div>

      {pdfError && (
        <div style={{ padding: "8px 12px", marginBottom: 12, background: "rgba(224,90,75,.1)", border: "1px solid rgba(224,90,75,.3)", borderRadius: 8, fontSize: ".8rem", color: "#f08070" }}>
          Não foi possível abrir o PDF. Permita pop-ups para este site e tente novamente.
        </div>
      )}

      {/* Dados Gerais */}
      <FitSection title="Dados Gerais" subtitle={savedGeneral ? "Salvo." : undefined}>
        <FitAssessmentForm initial={assessment} professionalName={professionalName} submitLabel="Salvar dados gerais" onSubmit={handleGeneral} />
      </FitSection>

      <FitSection title="IMC automático" subtitle="Calculado por data de referência; sem interpretação automática.">
        <FitAssessmentBmi patientId={patientId} assessmentId={assessmentId} assessedAt={assessment.assessed_at} refreshKey={measurements.map((m) => `${m.id}:${m.value}`).join("|")} />
      </FitSection>

      {/* Blocos de medição por categoria */}
      {MEASUREMENT_CATEGORY_ORDER.filter((c) => c !== "other").map((cat) => (
        <FitSection key={cat} title={MEASUREMENT_CATEGORY_LABELS[cat]}>
          <FitMeasurementEditor
            patientId={patientId}
            assessmentId={assessmentId}
            category={cat}
            measuredAt={assessment.assessed_at}
            measurements={measurements.filter((m) => m.category === cat)}
            onChanged={reloadMeasurements}
          />
        </FitSection>
      ))}

      {/* Comparativo (reavaliações) */}
      {assessment.type === "reassessment" ? (
        <FitSection
          title="Comparativo"
          right={
            <select value={compareRef} onChange={(e) => setCompareRef(e.target.value as FitComparisonReference)} style={{ ...fitFieldStyle, width: "auto", padding: "6px 10px" }}>
              <option value="baseline">vs Linha de base</option>
              <option value="previous">vs Anterior</option>
            </select>
          }
        >
          {!comparison ? (
            <div style={{ fontSize: ".82rem", color: "#8ea3c0" }}>Carregando…</div>
          ) : !comparison.hasReference ? (
            <div style={{ fontSize: ".82rem", color: "#8ea3c0" }}>
              {compareRef === "previous" ? "Não há avaliação anterior para comparar." : "Não há linha de base para comparar."}
            </div>
          ) : (
            <FitComparisonTable rows={comparison.rows} asymmetries={comparison.asymmetries} refLabel={comparison.referenceLabel} />
          )}
        </FitSection>
      ) : (
        <FitSection title="Comparativo">
          <div style={{ fontSize: ".82rem", color: "#8ea3c0" }}>Esta é a linha de base — ponto de partida, sem comparativo.</div>
        </FitSection>
      )}

      {/* Observações Clínicas */}
      <FitSection title="Observações Clínicas">
        <textarea
          value={clinical}
          onChange={(e) => setClinical(e.target.value)}
          rows={4}
          placeholder="Texto livre — avaliação postural, achados clínicos, conduta…"
          style={{ ...fitFieldStyle, resize: "vertical" }}
        />
        <button
          onClick={handleClinical}
          disabled={savingClinical}
          style={{ marginTop: 10, padding: "9px 16px", borderRadius: 9, border: "none", background: savingClinical ? "rgba(124,92,252,.4)" : "linear-gradient(135deg,#7c5cfc,#5b8def)", color: "#0b1120", fontWeight: 800, fontSize: ".83rem", cursor: savingClinical ? "default" : "pointer", fontFamily: "var(--font-sans)" }}
        >
          {savingClinical ? "Salvando..." : "Salvar observações"}
        </button>
      </FitSection>
    </div>
  );
}
