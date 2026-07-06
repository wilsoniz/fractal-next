"use client";

// FitAssessmentForm — bloco "Dados Gerais" da avaliação (documento).
// Data, Tipo, Profissional (read-only) e Observações gerais.

import { useState } from "react";
import { ASSESSMENT_TYPE_LABELS, type FitAssessment, type FitAssessmentType } from "@/lib/fit/types";
import { fitLabelStyle, fitFieldStyle } from "./FitSection";

export interface FitAssessmentInput {
  type: FitAssessmentType;
  assessed_at: string;
  notes: string | null;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function FitAssessmentForm({
  initial,
  professionalName,
  submitLabel,
  onSubmit,
}: {
  initial?: FitAssessment | null;
  professionalName: string;
  submitLabel: string;
  onSubmit: (input: FitAssessmentInput) => Promise<void>;
}) {
  const [type, setType] = useState<FitAssessmentType>(initial?.type ?? "baseline");
  const [assessedAt, setAssessedAt] = useState(initial?.assessed_at ?? today());
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSubmit({ type, assessed_at: assessedAt, notes: notes.trim() === "" ? null : notes.trim() });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <label style={fitLabelStyle}>Data</label>
          <input type="date" value={assessedAt} onChange={(e) => setAssessedAt(e.target.value)} style={fitFieldStyle} />
        </div>
        <div>
          <label style={fitLabelStyle}>Tipo</label>
          <select value={type} onChange={(e) => setType(e.target.value as FitAssessmentType)} style={fitFieldStyle}>
            {(Object.keys(ASSESSMENT_TYPE_LABELS) as FitAssessmentType[]).map((k) => (
              <option key={k} value={k}>{ASSESSMENT_TYPE_LABELS[k]}</option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label style={fitLabelStyle}>Profissional</label>
        <input value={professionalName} readOnly style={{ ...fitFieldStyle, opacity: 0.7, cursor: "default" }} />
      </div>
      <div>
        <label style={fitLabelStyle}>Observações</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} style={{ ...fitFieldStyle, resize: "vertical" }} />
      </div>
      <button
        type="submit"
        disabled={saving}
        style={{
          alignSelf: "flex-start",
          padding: "10px 16px",
          borderRadius: 10,
          border: "none",
          background: saving ? "rgba(124,92,252,.4)" : "linear-gradient(135deg,#7c5cfc,#5b8def)",
          color: "#0b1120",
          fontWeight: 800,
          fontSize: ".85rem",
          cursor: saving ? "default" : "pointer",
          fontFamily: "var(--font-sans)",
        }}
      >
        {saving ? "Salvando..." : submitLabel}
      </button>
    </form>
  );
}
