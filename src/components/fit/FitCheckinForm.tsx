"use client";

// FitCheckinForm — check-in semanal do paciente (mobile-first).

import { useState } from "react";
import { createCheckin } from "@/lib/fit/fit-checkins";
import type { FitCheckinInput } from "@/lib/fit/types";
import { fitLabelStyle, fitFieldStyle } from "./FitSection";

function scale(n: number): number[] {
  return Array.from({ length: n }, (_, i) => i + 1);
}

export function FitCheckinForm({ patientId, onDone }: { patientId: string; onDone: () => void }) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [weight, setWeight] = useState("");
  const [adherence, setAdherence] = useState("");
  const [energy, setEnergy] = useState<number | null>(null);
  const [sleep, setSleep] = useState<number | null>(null);
  const [pain, setPain] = useState<number | null>(null);
  const [mood, setMood] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function num(v: string): number | null {
    const n = parseFloat(v.replace(",", "."));
    return Number.isNaN(n) ? null : n;
  }
  function int(v: string): number | null {
    const n = parseInt(v, 10);
    return Number.isNaN(n) ? null : n;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const input: FitCheckinInput = {
      checkin_date: date,
      weight_kg: num(weight),
      adherence_pct: int(adherence),
      energy_level: energy,
      sleep_quality: sleep,
      pain_level: pain,
      mood: mood,
      notes: notes.trim() === "" ? null : notes.trim(),
    };
    const saved = await createCheckin(patientId, input);
    setSaving(false);
    if (!saved) {
      setError("Não foi possível salvar o check-in.");
      return;
    }
    onDone();
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {error && (
        <div style={{ padding: "9px 12px", background: "rgba(224,90,75,.1)", border: "1px solid rgba(224,90,75,.3)", borderRadius: 8, fontSize: ".8rem", color: "#f08070" }}>{error}</div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <label style={fitLabelStyle}>Data</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={fitFieldStyle} />
        </div>
        <div>
          <label style={fitLabelStyle}>Peso (kg)</label>
          <input value={weight} onChange={(e) => setWeight(e.target.value)} inputMode="decimal" placeholder="opcional" style={fitFieldStyle} />
        </div>
      </div>

      <div>
        <label style={fitLabelStyle}>Aderência ao plano (%)</label>
        <input value={adherence} onChange={(e) => setAdherence(e.target.value)} inputMode="numeric" placeholder="0-100" style={fitFieldStyle} />
      </div>

      <ScaleRow label="Energia" max={5} value={energy} onChange={setEnergy} />
      <ScaleRow label="Sono" max={5} value={sleep} onChange={setSleep} />
      <ScaleRow label="Humor" max={5} value={mood} onChange={setMood} />
      <ScaleRow label="Dor" max={10} value={pain} onChange={setPain} />

      <div>
        <label style={fitLabelStyle}>Observações da semana</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} style={{ ...fitFieldStyle, resize: "vertical" }} />
      </div>

      <button
        type="submit"
        disabled={saving}
        style={{ padding: "14px", borderRadius: 12, border: "none", background: saving ? "rgba(124,92,252,.4)" : "linear-gradient(135deg,#7c5cfc,#5b8def)", color: "#0b1120", fontWeight: 800, fontSize: ".95rem", cursor: saving ? "default" : "pointer", fontFamily: "var(--font-sans)" }}
      >
        {saving ? "Salvando..." : "Enviar check-in"}
      </button>
    </form>
  );

  function ScaleRow({ label, max, value, onChange }: { label: string; max: number; value: number | null; onChange: (n: number) => void }) {
    return (
      <div>
        <label style={fitLabelStyle}>{label} {value != null ? `(${value})` : ""}</label>
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          {scale(max).map((n) => {
            const active = value === n;
            return (
              <button
                key={n}
                type="button"
                onClick={() => onChange(n)}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 8,
                  border: `1px solid ${active ? "#7c5cfc" : "rgba(90,110,160,.4)"}`,
                  background: active ? "rgba(124,92,252,.2)" : "transparent",
                  color: active ? "#b7a6ff" : "#9fb2cf",
                  fontWeight: 700,
                  fontSize: ".82rem",
                  cursor: "pointer",
                  fontFamily: "var(--font-sans)",
                }}
              >
                {n}
              </button>
            );
          })}
        </div>
      </div>
    );
  }
}
