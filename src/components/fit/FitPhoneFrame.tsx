"use client";

// FitPhoneFrame — moldura mobile para a preview "Ver como paciente" (read-only).

import type { ReactNode } from "react";

const TABS = [
  { key: "inicio", label: "Início" },
  { key: "treino", label: "Treino" },
  { key: "checkin", label: "Check-in" },
  { key: "progresso", label: "Progresso" },
];

export function FitPhoneFrame({
  patientName,
  active,
  onChange,
  children,
}: {
  patientName: string;
  active: string;
  onChange: (key: string) => void;
  children: ReactNode;
}) {
  return (
    <div style={{ maxWidth: 400, margin: "0 auto", border: "1px solid rgba(90,110,160,.35)", borderRadius: 22, overflow: "hidden", background: "#0b1120" }}>
      <div style={{ background: "rgba(239,176,74,.12)", borderBottom: "1px solid rgba(239,176,74,.3)", padding: "8px 14px", textAlign: "center" }}>
        <div style={{ fontSize: ".72rem", color: "#efb04a", fontWeight: 700 }}>Pré-visualização — somente leitura</div>
        <div style={{ fontSize: ".7rem", color: "#8ea3c0", marginTop: 1 }}>{patientName}</div>
      </div>

      <div style={{ minHeight: 460, maxHeight: "68vh", overflowY: "auto", padding: 16 }}>{children}</div>

      <nav style={{ display: "flex", borderTop: "1px solid rgba(90,110,160,.3)", background: "rgba(11,17,32,.97)" }}>
        {TABS.map((t) => {
          const on = t.key === active;
          return (
            <button
              key={t.key}
              onClick={() => onChange(t.key)}
              style={{ flex: 1, padding: "10px 4px", background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-sans)", fontSize: 11, fontWeight: on ? 700 : 500, color: on ? "#b7a6ff" : "rgba(160,180,210,.7)", borderTop: `2px solid ${on ? "#7c5cfc" : "transparent"}` }}
            >
              {t.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
