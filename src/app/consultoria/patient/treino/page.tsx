"use client";

// Treino do paciente — escolhe o plano ativo, o dia e executa/registra (item 8).

import { useEffect, useState } from "react";
import { usePatient } from "../_context";
import { listActivePlans, getPlanFull } from "@/lib/fit/fit-workouts";
import { FitCard } from "@/components/fit/FitCard";
import { FitWorkoutRunner } from "@/components/fit/FitWorkoutRunner";
import type { FitWorkoutPlan, FitWorkoutPlanFull } from "@/lib/fit/types";

export default function PatientWorkout() {
  const patient = usePatient();
  const [plans, setPlans] = useState<FitWorkoutPlan[]>([]);
  const [planFull, setPlanFull] = useState<FitWorkoutPlanFull | null>(null);
  const [dayId, setDayId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [done, setDone] = useState(false);

  async function loadPlan(planId: string) {
    const full = await getPlanFull(planId);
    setPlanFull(full);
    setDayId(null);
  }

  useEffect(() => {
    (async () => {
      const active = await listActivePlans(patient.id);
      setPlans(active);
      if (active[0]) await loadPlan(active[0].id);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patient.id]);

  if (loading) return <div style={{ color: "#8ea3c0" }}>Carregando…</div>;

  if (done) {
    return (
      <FitCard>
        <div style={{ textAlign: "center", padding: "30px 16px" }}>
          <div style={{ fontSize: "2rem" }}>✓</div>
          <div style={{ fontSize: "1.05rem", fontWeight: 800, color: "#f2f6ff", marginTop: 6 }}>Treino registrado!</div>
          <div style={{ fontSize: ".85rem", color: "#8ea3c0", marginTop: 6 }}>Seu profissional já pode ver o registro.</div>
          <button onClick={() => { setDone(false); setDayId(null); }} style={{ marginTop: 16, padding: "10px 18px", borderRadius: 10, border: "1px solid rgba(90,110,160,.4)", background: "transparent", color: "#c5d2e6", fontWeight: 700, fontSize: ".85rem", cursor: "pointer", fontFamily: "var(--font-sans)" }}>
            Registrar outro
          </button>
        </div>
      </FitCard>
    );
  }

  if (plans.length === 0 || !planFull) {
    return (
      <FitCard>
        <div style={{ fontSize: ".9rem", color: "#8ea3c0", textAlign: "center", padding: 20 }}>
          Nenhum treino ativo. Seu profissional publicará um plano em breve.
        </div>
      </FitCard>
    );
  }

  const selectedDay = planFull.days.find((d) => d.id === dayId) ?? null;

  if (selectedDay) {
    return (
      <div>
        <button onClick={() => setDayId(null)} style={{ background: "none", border: "none", color: "#8ea3c0", cursor: "pointer", fontSize: ".82rem", fontFamily: "var(--font-sans)", padding: 0, marginBottom: 14 }}>← Dias</button>
        <FitWorkoutRunner patientId={patient.id} planId={planFull.id} day={selectedDay} onDone={() => setDone(true)} />
      </div>
    );
  }

  return (
    <div>
      <h1 style={{ margin: "0 0 4px", fontSize: "1.3rem", fontWeight: 800, color: "#f2f6ff" }}>{planFull.title}</h1>
      <p style={{ margin: "0 0 16px", fontSize: ".82rem", color: "#8ea3c0" }}>Escolha o treino de hoje.</p>

      {plans.length > 1 && (
        <select
          value={planFull.id}
          onChange={(e) => loadPlan(e.target.value)}
          style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(90,110,160,.4)", background: "rgba(15,22,40,.7)", color: "#e6edf6", fontFamily: "var(--font-sans)", fontSize: ".88rem", marginBottom: 14 }}
        >
          {plans.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
        </select>
      )}

      {planFull.days.length === 0 ? (
        <FitCard><div style={{ fontSize: ".85rem", color: "#8ea3c0", textAlign: "center", padding: 16 }}>Este plano ainda não tem dias de treino.</div></FitCard>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {planFull.days.map((d) => (
            <button
              key={d.id}
              onClick={() => setDayId(d.id)}
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "16px", borderRadius: 12, textAlign: "left", cursor: "pointer", background: "rgba(20,28,48,.75)", border: "1px solid rgba(90,110,160,.24)", fontFamily: "var(--font-sans)" }}
            >
              <div>
                <div style={{ fontSize: "1rem", fontWeight: 700, color: "#f2f6ff" }}>{d.name}</div>
                <div style={{ fontSize: ".78rem", color: "#8ea3c0", marginTop: 2 }}>
                  {d.focus ? `${d.focus} · ` : ""}{d.exercises.length + d.groups.reduce((a, g) => a + g.exercises.length, 0)} exercício(s)
                </div>
              </div>
              <span style={{ color: "#b7a6ff", fontSize: "1.2rem" }}>→</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
