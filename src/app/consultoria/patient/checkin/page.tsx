"use client";

// Check-in semanal do paciente (item 9).

import { useState } from "react";
import { usePatient } from "../_context";
import { FitCard } from "@/components/fit/FitCard";
import { FitCheckinForm } from "@/components/fit/FitCheckinForm";

export default function PatientCheckin() {
  const patient = usePatient();
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <FitCard>
        <div style={{ textAlign: "center", padding: "30px 16px" }}>
          <div style={{ fontSize: "2rem" }}>✓</div>
          <div style={{ fontSize: "1.05rem", fontWeight: 800, color: "#f2f6ff", marginTop: 6 }}>Check-in enviado!</div>
          <div style={{ fontSize: ".85rem", color: "#8ea3c0", marginTop: 6 }}>Obrigado por acompanhar sua semana.</div>
          <button onClick={() => setDone(false)} style={{ marginTop: 16, padding: "10px 18px", borderRadius: 10, border: "1px solid rgba(90,110,160,.4)", background: "transparent", color: "#c5d2e6", fontWeight: 700, fontSize: ".85rem", cursor: "pointer", fontFamily: "var(--font-sans)" }}>Novo check-in</button>
        </div>
      </FitCard>
    );
  }

  return (
    <div>
      <h1 style={{ margin: "0 0 4px", fontSize: "1.3rem", fontWeight: 800, color: "#f2f6ff" }}>Check-in semanal</h1>
      <p style={{ margin: "0 0 18px", fontSize: ".82rem", color: "#8ea3c0" }}>Como foi sua semana?</p>
      <FitCheckinForm patientId={patient.id} onDone={() => setDone(true)} />
    </div>
  );
}
