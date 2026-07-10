"use client";

// Painel da aba "Treinos" no workspace do paciente.
// Lista de planos + builder (cabeçalho + dias + exercícios) + publicar/arquivar.

import { useEffect, useState } from "react";
import {
  listPlans,
  getPlanFull,
  createPlan,
  updatePlan,
  setPlanStatus,
  addDay,
  archiveDay,
} from "@/lib/fit/fit-workouts";
import { FitCard } from "@/components/fit/FitCard";
import { FitSection, fitFieldStyle } from "@/components/fit/FitSection";
import { FitWorkoutPlanCard } from "@/components/fit/FitWorkoutPlanCard";
import { FitWorkoutPlanForm, type FitWorkoutPlanInput } from "@/components/fit/FitWorkoutPlanForm";
import { FitExerciseEditor } from "@/components/fit/FitExerciseEditor";
import { FitWorkoutRegister } from "@/components/fit/FitWorkoutRegister";
import { WORKOUT_PLAN_STATUS_LABELS, type FitWorkoutPlan, type FitWorkoutPlanFull } from "@/lib/fit/types";

type PanelMode = "prescrever" | "registrar";

export function FitTreinosPanel({ patientId }: { patientId: string }) {
  const [mode, setMode] = useState<PanelMode>("prescrever");
  const [plans, setPlans] = useState<FitWorkoutPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [creating, setCreating] = useState(false);

  async function loadPlans() {
    const rows = await listPlans(patientId);
    setPlans(rows);
    setLoading(false);
  }

  useEffect(() => {
    loadPlans();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

  async function handleCreate() {
    if (newTitle.trim() === "") return;
    setCreating(true);
    const created = await createPlan(patientId, newTitle.trim());
    setCreating(false);
    if (created) {
      setNewTitle("");
      await loadPlans();
      setSelectedId(created.id);
    }
  }

  if (loading) return <div style={{ color: "#8ea3c0" }}>Carregando…</div>;

  const modeToggle = (
    <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
      {(["prescrever", "registrar"] as PanelMode[]).map((m) => {
        const active = mode === m;
        return (
          <button
            key={m}
            onClick={() => setMode(m)}
            style={{ flex: 1, padding: "9px 12px", borderRadius: 10, border: `1px solid ${active ? "rgba(124,92,252,.5)" : "rgba(90,110,160,.35)"}`, background: active ? "rgba(124,92,252,.14)" : "transparent", color: active ? "#b7a6ff" : "#c5d2e6", fontWeight: 700, fontSize: ".82rem", cursor: "pointer", fontFamily: "var(--font-sans)" }}
          >
            {m === "prescrever" ? "Prescrever" : "Registrar treino realizado"}
          </button>
        );
      })}
    </div>
  );

  if (mode === "registrar") {
    return (
      <div>
        {modeToggle}
        <FitWorkoutRegister patientId={patientId} />
      </div>
    );
  }

  if (selectedId) {
    return (
      <div>
        {modeToggle}
        <PlanBuilder planId={selectedId} onBack={() => { setSelectedId(null); loadPlans(); }} />
      </div>
    );
  }

  return (
    <div>
      {modeToggle}
      <FitCard style={{ marginBottom: 16 }}>
        <div style={{ fontSize: ".85rem", fontWeight: 700, color: "#f2f6ff", marginBottom: 8 }}>Novo treino</div>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            placeholder="Título do treino"
            style={{ ...fitFieldStyle, flex: 1 }}
          />
          <button
            onClick={handleCreate}
            disabled={creating}
            style={{ padding: "10px 16px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#7c5cfc,#5b8def)", color: "#0b1120", fontWeight: 800, fontSize: ".84rem", cursor: creating ? "default" : "pointer", fontFamily: "var(--font-sans)", whiteSpace: "nowrap" }}
          >
            Criar
          </button>
        </div>
      </FitCard>

      {plans.length === 0 ? (
        <FitCard>
          <div style={{ fontSize: ".85rem", color: "#8ea3c0", textAlign: "center", padding: 16 }}>
            Nenhum treino ainda. Crie o primeiro acima.
          </div>
        </FitCard>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {plans.map((p) => (
            <FitWorkoutPlanCard key={p.id} plan={p} onClick={() => setSelectedId(p.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

function PlanBuilder({ planId, onBack }: { planId: string; onBack: () => void }) {
  const [plan, setPlan] = useState<FitWorkoutPlanFull | null>(null);
  const [dayName, setDayName] = useState("");
  const [dayFocus, setDayFocus] = useState("");

  async function load() {
    const full = await getPlanFull(planId);
    setPlan(full);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planId]);

  async function handleHeader(input: FitWorkoutPlanInput) {
    await updatePlan(planId, input);
    await load();
  }

  async function handleAddDay() {
    if (!plan || dayName.trim() === "") return;
    await addDay(planId, dayName.trim(), plan.days.length, dayFocus.trim() || null);
    setDayName("");
    setDayFocus("");
    await load();
  }

  async function handleArchiveDay(id: string) {
    await archiveDay(id);
    await load();
  }

  async function handleStatus(status: "draft" | "active" | "archived") {
    await setPlanStatus(planId, status);
    if (status === "archived") { onBack(); return; }
    await load();
  }

  if (!plan) return <div style={{ color: "#8ea3c0" }}>Carregando…</div>;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, gap: 12, flexWrap: "wrap" }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: "#8ea3c0", cursor: "pointer", fontSize: ".82rem", fontFamily: "var(--font-sans)", padding: 0 }}>← Treinos</button>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: ".74rem", color: "#8ea3c0" }}>Status: {WORKOUT_PLAN_STATUS_LABELS[plan.status]}</span>
          {plan.status !== "active" && (
            <button onClick={() => handleStatus("active")} style={{ padding: "7px 12px", borderRadius: 8, border: "1px solid rgba(34,197,164,.5)", background: "rgba(34,197,164,.14)", color: "#3fd6ad", fontWeight: 700, fontSize: ".78rem", cursor: "pointer", fontFamily: "var(--font-sans)" }}>Publicar (ativar)</button>
          )}
          {plan.status === "active" && (
            <button onClick={() => handleStatus("draft")} style={{ padding: "7px 12px", borderRadius: 8, border: "1px solid rgba(239,176,74,.5)", background: "rgba(239,176,74,.14)", color: "#efb04a", fontWeight: 700, fontSize: ".78rem", cursor: "pointer", fontFamily: "var(--font-sans)" }}>Despublicar</button>
          )}
          <button onClick={() => handleStatus("archived")} style={{ padding: "7px 12px", borderRadius: 8, border: "1px solid rgba(224,90,75,.35)", background: "transparent", color: "#f0857a", fontWeight: 600, fontSize: ".78rem", cursor: "pointer", fontFamily: "var(--font-sans)" }}>Arquivar</button>
        </div>
      </div>

      <FitSection title="Cabeçalho do treino">
        <FitWorkoutPlanForm initial={plan} onSubmit={handleHeader} />
      </FitSection>

      {/* Dias */}
      {plan.days.map((day) => (
        <FitSection
          key={day.id}
          title={day.name}
          subtitle={day.focus ?? undefined}
          right={
            <button onClick={() => handleArchiveDay(day.id)} style={{ background: "none", border: "none", color: "#f0857a", cursor: "pointer", fontSize: ".78rem", fontFamily: "var(--font-sans)" }}>Remover dia</button>
          }
        >
          <FitExerciseEditor planId={planId} dayId={day.id} exercises={day.exercises} groups={day.groups} onChanged={load} />
        </FitSection>
      ))}

      {/* Adicionar dia */}
      <FitCard>
        <div style={{ fontSize: ".85rem", fontWeight: 700, color: "#f2f6ff", marginBottom: 8 }}>Adicionar dia de treino</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input value={dayName} onChange={(e) => setDayName(e.target.value)} placeholder="Nome (ex.: Treino A)" style={{ ...fitFieldStyle, flex: "1 1 160px" }} />
          <input value={dayFocus} onChange={(e) => setDayFocus(e.target.value)} placeholder="Foco (ex.: Peito e tríceps)" style={{ ...fitFieldStyle, flex: "1 1 160px" }} />
          <button onClick={handleAddDay} style={{ padding: "10px 16px", borderRadius: 10, border: "1px solid rgba(124,92,252,.5)", background: "rgba(124,92,252,.14)", color: "#b7a6ff", fontWeight: 700, fontSize: ".82rem", cursor: "pointer", fontFamily: "var(--font-sans)", whiteSpace: "nowrap" }}>+ Dia</button>
        </div>
      </FitCard>
    </div>
  );
}
