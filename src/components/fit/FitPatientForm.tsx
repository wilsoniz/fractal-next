"use client";

// FitPatientForm — formulário cadastral do paciente (Consultoria).
// Compartilhado entre a criação (FitModal) e a aba "Cadastro" do workspace.
// Normaliza strings vazias em null antes de entregar via onSubmit (FitPatientInput).

import { useState } from "react";
import {
  MODALITY_LABELS,
  CONSULTORIA_TYPE_LABELS,
  SEX_LABELS,
  type FitPatient,
  type FitPatientInput,
  type FitModality,
  type FitConsultoriaType,
  type FitSex,
} from "@/lib/fit/types";

const label: React.CSSProperties = {
  display: "block",
  fontSize: ".74rem",
  fontWeight: 600,
  color: "#a7bad6",
  marginBottom: 5,
};
const field: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 9,
  border: "1px solid rgba(90,110,160,.4)",
  background: "rgba(15,22,40,.7)",
  color: "#e6edf6",
  fontFamily: "var(--font-sans)",
  fontSize: ".88rem",
  outline: "none",
  boxSizing: "border-box",
};

function nn(v: string): string | null {
  const t = v.trim();
  return t === "" ? null : t;
}

export function FitPatientForm({
  initial,
  submitLabel,
  onSubmit,
}: {
  initial?: FitPatient | null;
  submitLabel: string;
  onSubmit: (input: FitPatientInput) => Promise<void>;
}) {
  const [fullName, setFullName] = useState(initial?.full_name ?? "");
  const [birthDate, setBirthDate] = useState(initial?.birth_date ?? "");
  const [sex, setSex] = useState<FitSex | "">(initial?.sex ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [goal, setGoal] = useState(initial?.goal ?? "");
  const [modality, setModality] = useState<FitModality | "">(initial?.modality ?? "");
  const [consultoriaType, setConsultoriaType] = useState<FitConsultoriaType | "">(initial?.consultoria_type ?? "");
  const [trainingLocation, setTrainingLocation] = useState(initial?.training_location ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (fullName.trim() === "") {
      setError("Informe o nome do paciente.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSubmit({
        full_name: fullName.trim(),
        birth_date: nn(birthDate),
        sex: sex === "" ? null : sex,
        phone: nn(phone),
        email: nn(email),
        goal: nn(goal),
        modality: modality === "" ? null : modality,
        consultoria_type: consultoriaType === "" ? null : consultoriaType,
        training_location: nn(trainingLocation),
        notes: nn(notes),
      });
    } catch {
      setError("Não foi possível salvar. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {error && (
        <div style={{ padding: "9px 12px", background: "rgba(224,90,75,.1)", border: "1px solid rgba(224,90,75,.3)", borderRadius: 8, fontSize: ".8rem", color: "#f08070" }}>
          {error}
        </div>
      )}

      <div>
        <label style={label}>Nome completo *</label>
        <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Nome do paciente" style={field} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <label style={label}>Data de nascimento</label>
          <input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} style={field} />
        </div>
        <div>
          <label style={label}>Sexo</label>
          <select value={sex} onChange={(e) => setSex(e.target.value as FitSex | "")} style={field}>
            <option value="">—</option>
            {(Object.keys(SEX_LABELS) as FitSex[]).map((k) => (
              <option key={k} value={k}>{SEX_LABELS[k]}</option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <label style={label}>Telefone</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(00) 00000-0000" style={field} />
        </div>
        <div>
          <label style={label}>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@exemplo.com" style={field} />
        </div>
      </div>

      <div>
        <label style={label}>Objetivo principal</label>
        <input value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="Ex.: hipertrofia, retorno ao esporte, alívio de dor" style={field} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <label style={label}>Modalidade</label>
          <select value={modality} onChange={(e) => setModality(e.target.value as FitModality | "")} style={field}>
            <option value="">—</option>
            {(Object.keys(MODALITY_LABELS) as FitModality[]).map((k) => (
              <option key={k} value={k}>{MODALITY_LABELS[k]}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={label}>Tipo de consultoria</label>
          <select value={consultoriaType} onChange={(e) => setConsultoriaType(e.target.value as FitConsultoriaType | "")} style={field}>
            <option value="">—</option>
            {(Object.keys(CONSULTORIA_TYPE_LABELS) as FitConsultoriaType[]).map((k) => (
              <option key={k} value={k}>{CONSULTORIA_TYPE_LABELS[k]}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label style={label}>Academia / local de treino</label>
        <input value={trainingLocation} onChange={(e) => setTrainingLocation(e.target.value)} placeholder="Nome da academia ou local" style={field} />
      </div>

      <div>
        <label style={label}>Observações gerais</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Notas cadastrais" style={{ ...field, resize: "vertical" }} />
      </div>

      <button
        type="submit"
        disabled={saving}
        style={{
          marginTop: 4,
          padding: "12px",
          borderRadius: 10,
          border: "none",
          background: saving ? "rgba(124,92,252,.4)" : "linear-gradient(135deg,#7c5cfc,#5b8def)",
          color: "#0b1120",
          fontFamily: "var(--font-sans)",
          fontWeight: 800,
          fontSize: ".9rem",
          cursor: saving ? "default" : "pointer",
        }}
      >
        {saving ? "Salvando..." : submitLabel}
      </button>
    </form>
  );
}
