"use client";

// Preview do Check-in (read-only) — form estático desabilitado.

import { FitCard } from "@/components/fit/FitCard";

const field: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 9,
  border: "1px solid rgba(90,110,160,.3)",
  background: "rgba(15,22,40,.4)",
  color: "#8ea3c0",
  fontFamily: "var(--font-sans)",
  fontSize: ".88rem",
  boxSizing: "border-box",
};
const label: React.CSSProperties = { display: "block", fontSize: ".74rem", fontWeight: 600, color: "#a7bad6", marginBottom: 5 };

export function FitPreviewCheckin() {
  return (
    <div>
      <h1 style={{ margin: "0 0 4px", fontSize: "1.25rem", fontWeight: 800, color: "#f2f6ff" }}>Check-in semanal</h1>
      <p style={{ margin: "0 0 14px", fontSize: ".82rem", color: "#8ea3c0" }}>Como foi sua semana?</p>

      <div style={{ padding: "9px 12px", marginBottom: 14, background: "rgba(239,176,74,.1)", border: "1px solid rgba(239,176,74,.3)", borderRadius: 8, fontSize: ".8rem", color: "#efb04a" }}>
        Preview — ação desativada. Aqui o paciente envia peso, aderência e escalas de energia/sono/humor/dor.
      </div>

      <FitCard>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div><label style={label}>Peso (kg)</label><input disabled placeholder="—" style={field} /></div>
          <div><label style={label}>Aderência ao plano (%)</label><input disabled placeholder="—" style={field} /></div>
          <div><label style={label}>Energia / Sono / Humor / Dor</label><input disabled placeholder="escalas 1–5 / 0–10" style={field} /></div>
          <div><label style={label}>Observações da semana</label><textarea disabled rows={2} placeholder="—" style={{ ...field, resize: "none" }} /></div>
          <button disabled style={{ padding: "12px", borderRadius: 10, border: "none", background: "rgba(124,92,252,.25)", color: "rgba(11,17,32,.6)", fontWeight: 800, fontSize: ".9rem", cursor: "not-allowed", fontFamily: "var(--font-sans)" }}>
            Enviar check-in (desativado no preview)
          </button>
        </div>
      </FitCard>
    </div>
  );
}
