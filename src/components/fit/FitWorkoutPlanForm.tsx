"use client";

// FitWorkoutPlanForm — cabeçalho do plano de treino.

import { useState } from "react";
import type { FitWorkoutPlan } from "@/lib/fit/types";
import { fitLabelStyle, fitFieldStyle } from "./FitSection";

export interface FitWorkoutPlanInput {
  title: string;
  goal: string | null;
  start_date: string | null;
  end_date: string | null;
  frequency_per_week: number | null;
  notes: string | null;
}

function nn(v: string): string | null {
  const t = v.trim();
  return t === "" ? null : t;
}

export function FitWorkoutPlanForm({
  initial,
  onSubmit,
}: {
  initial: FitWorkoutPlan;
  onSubmit: (input: FitWorkoutPlanInput) => Promise<void>;
}) {
  const [title, setTitle] = useState(initial.title);
  const [goal, setGoal] = useState(initial.goal ?? "");
  const [startDate, setStartDate] = useState(initial.start_date ?? "");
  const [endDate, setEndDate] = useState(initial.end_date ?? "");
  const [freq, setFreq] = useState(initial.frequency_per_week != null ? String(initial.frequency_per_week) : "");
  const [notes, setNotes] = useState(initial.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (title.trim() === "") return;
    setSaving(true);
    setSaved(false);
    try {
      const freqNum = freq.trim() === "" ? null : parseInt(freq, 10);
      await onSubmit({
        title: title.trim(),
        goal: nn(goal),
        start_date: nn(startDate),
        end_date: nn(endDate),
        frequency_per_week: freqNum != null && !Number.isNaN(freqNum) ? freqNum : null,
        notes: nn(notes),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div>
        <label style={fitLabelStyle}>Título do treino *</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Hipertrofia — Fase 1" style={fitFieldStyle} />
      </div>
      <div>
        <label style={fitLabelStyle}>Objetivo</label>
        <input value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="Ex.: ganho de força e massa" style={fitFieldStyle} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
        <div>
          <label style={fitLabelStyle}>Início</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={fitFieldStyle} />
        </div>
        <div>
          <label style={fitLabelStyle}>Fim</label>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={fitFieldStyle} />
        </div>
        <div>
          <label style={fitLabelStyle}>Freq./semana</label>
          <input value={freq} onChange={(e) => setFreq(e.target.value)} placeholder="Ex.: 4" inputMode="numeric" style={fitFieldStyle} />
        </div>
      </div>
      <div>
        <label style={fitLabelStyle}>Observações</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} style={{ ...fitFieldStyle, resize: "vertical" }} />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button
          type="submit"
          disabled={saving}
          style={{ alignSelf: "flex-start", padding: "10px 16px", borderRadius: 10, border: "none", background: saving ? "rgba(124,92,252,.4)" : "linear-gradient(135deg,#7c5cfc,#5b8def)", color: "#0b1120", fontWeight: 800, fontSize: ".85rem", cursor: saving ? "default" : "pointer", fontFamily: "var(--font-sans)" }}
        >
          {saving ? "Salvando..." : "Salvar cabeçalho"}
        </button>
        {saved && <span style={{ fontSize: ".8rem", color: "#3fd6ad" }}>Salvo.</span>}
      </div>
    </form>
  );
}
