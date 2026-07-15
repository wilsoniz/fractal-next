"use client";

import { useState } from "react";
import { addBlockStep, archiveBlockStep, updateBlockStep } from "@/lib/fit/fit-workouts";
import type { FitExerciseBlock, FitExerciseBlockStep, FitExerciseBlockStepInput, FitStrategyStepType } from "@/lib/fit/types";
import { FitModal } from "./FitModal";
import { fitFieldStyle, fitLabelStyle } from "./FitSection";

const STEP_LABELS: Record<FitStrategyStepType, string> = { dynamic_reps: "Repetições dinâmicas", partial_reps: "Repetições parciais", isometric_hold: "Isometria", load_drop: "Redução de carga", rest: "Descanso", mini_set: "Mini-série", failure_segment: "Segmento até falha", target_total: "Meta total", custom: "Personalizado" };
const nn = (v: string) => v.trim() || null;
const ni = (v: string) => v.trim() && !Number.isNaN(Number(v)) ? Number.parseInt(v, 10) : null;
const nf = (v: string) => v.trim() && !Number.isNaN(Number(v.replace(",", "."))) ? Number(v.replace(",", ".")) : null;

export function FitBlockStepEditor({ block, onChanged }: { block: FitExerciseBlock; onChanged: () => void | Promise<void> }) {
  const steps = block.steps ?? [];
  const [editing, setEditing] = useState<FitExerciseBlockStep | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function save(input: FitExerciseBlockStepInput) {
    const ok = editing ? await updateBlockStep(editing.id, input) : Boolean(await addBlockStep({ blockId: block.id, exerciseId: block.exercise_id, orderIndex: steps.length, input }));
    if (!ok) { setError("Não foi possível salvar a etapa."); return; }
    setError(null); setEditing(null); setCreating(false); await onChanged();
  }
  async function move(index: number, direction: -1 | 1) {
    const target = steps[index + direction];
    if (!target) return;
    const current = steps[index];
    const first = await updateBlockStep(current.id, { order_index: target.order_index });
    const second = first && await updateBlockStep(target.id, { order_index: current.order_index });
    if (!second) {
      if (first) await updateBlockStep(current.id, { order_index: current.order_index });
      setError("Não foi possível reordenar as etapas.");
      return;
    }
    setError(null); await onChanged();
  }
  return <div style={{ marginTop: 7, paddingTop: 7, borderTop: "1px solid rgba(90,110,160,.14)" }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><span style={{ fontSize: ".68rem", color: "#8ea3c0", fontWeight: 700 }}>Etapas da estratégia</span><button onClick={() => setCreating(true)} style={{ border: 0, background: "transparent", color: "#9fb2cf", fontSize: ".68rem", cursor: "pointer" }}>+ Etapa</button></div>
    {error && <div style={{ fontSize: ".68rem", color: "#f08070", marginTop: 4 }}>{error}</div>}
    {steps.length === 0 ? <div style={{ fontSize: ".68rem", color: "#6f829f", marginTop: 4 }}>Sem etapas internas — fluxo clássico.</div> : <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 5 }}>{steps.map((s, index) => <div key={s.id} style={{ display: "flex", gap: 4, alignItems: "center", fontSize: ".7rem" }}><button onClick={() => move(index, -1)} disabled={index === 0} aria-label="Mover etapa para cima" style={{ border: 0, background: "transparent", color: "#8ea3c0", cursor: index === 0 ? "default" : "pointer" }}>↑</button><button onClick={() => move(index, 1)} disabled={index === steps.length - 1} aria-label="Mover etapa para baixo" style={{ border: 0, background: "transparent", color: "#8ea3c0", cursor: index === steps.length - 1 ? "default" : "pointer" }}>↓</button><button onClick={() => setEditing(s)} style={{ flex: 1, textAlign: "left", border: 0, background: "transparent", color: "#c5d2e6", cursor: "pointer" }}>{index + 1}. <strong>{s.label ?? STEP_LABELS[s.step_type]}</strong>{s.repeat_mode === "open" ? " · repetível" : ""}</button><button onClick={async () => { const ok = await archiveBlockStep(s.id); if (!ok) { setError("Não foi possível arquivar a etapa."); return; } setError(null); await onChanged(); }} style={{ border: 0, background: "transparent", color: "#f0857a", cursor: "pointer" }}>×</button></div>)}</div>}
    <FitModal open={creating || editing !== null} onClose={() => { setCreating(false); setEditing(null); }} title={editing ? "Editar etapa" : "Nova etapa"}><StepForm initial={editing} onSave={save} /></FitModal>
  </div>;
}

function StepForm({ initial, onSave }: { initial: FitExerciseBlockStep | null; onSave: (input: FitExerciseBlockStepInput) => Promise<void> }) {
  const [type, setType] = useState<FitStrategyStepType>(initial?.step_type ?? "dynamic_reps"); const [label, setLabel] = useState(initial?.label ?? ""); const [reps, setReps] = useState(initial?.target_reps ?? ""); const [full, setFull] = useState(String(initial?.target_full_reps ?? "")); const [partial, setPartial] = useState(String(initial?.target_partial_reps ?? "")); const [duration, setDuration] = useState(String(initial?.target_duration_seconds ?? "")); const [load, setLoad] = useState(initial?.target_load ?? ""); const [unit, setUnit] = useState(initial?.target_load_unit ?? "kg"); const [changeType, setChangeType] = useState<"" | "percentage" | "absolute" | "manual">(initial?.load_change_type ?? ""); const [change, setChange] = useState(String(initial?.load_change_value ?? "")); const [rest, setRest] = useState(String(initial?.rest_seconds ?? "")); const [repeat, setRepeat] = useState(initial?.repeat_mode ?? "fixed"); const [min, setMin] = useState(String(initial?.min_occurrences ?? 1)); const [max, setMax] = useState(String(initial?.max_occurrences ?? 1)); const [termination, setTermination] = useState(initial?.termination_rule ?? ""); const [saving, setSaving] = useState(false);
  async function submit(e: React.FormEvent) { e.preventDefault(); setSaving(true); try { await onSave({ step_type: type, label: nn(label), target_reps: nn(reps), target_full_reps: ni(full), target_partial_reps: ni(partial), target_duration_seconds: ni(duration), target_load: nn(load), target_load_unit: nn(unit), load_change_type: changeType || null, load_change_value: nf(change), rest_seconds: ni(rest), repeat_mode: repeat, min_occurrences: ni(min) ?? 0, max_occurrences: repeat === "open" && !max.trim() ? null : ni(max), termination_rule: nn(termination), data: initial?.data ?? {} }); } finally { setSaving(false); } }
  const field = (labelText: string, value: string, setter: (v: string) => void) => <div><label style={fitLabelStyle}>{labelText}</label><input value={value} onChange={(e) => setter(e.target.value)} style={fitFieldStyle} /></div>;
  return <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 10 }}><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}><div><label style={fitLabelStyle}>Tipo</label><select value={type} onChange={(e) => setType(e.target.value as FitStrategyStepType)} style={fitFieldStyle}>{Object.entries(STEP_LABELS).map(([v,l]) => <option key={v} value={v}>{l}</option>)}</select></div>{field("Rótulo", label, setLabel)}</div><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(100px,1fr))", gap: 8 }}>{field("Reps", reps, setReps)}{field("Completas", full, setFull)}{field("Parciais", partial, setPartial)}{field("Duração (s)", duration, setDuration)}{field("Carga", load, setLoad)}{field("Unidade", unit, setUnit)}{field("Descanso (s)", rest, setRest)}</div><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}><div><label style={fitLabelStyle}>Mudança de carga</label><select value={changeType} onChange={(e) => setChangeType(e.target.value as typeof changeType)} style={fitFieldStyle}><option value="">Nenhuma</option><option value="percentage">Percentual</option><option value="absolute">Valor absoluto</option><option value="manual">Manual</option></select></div>{field("Valor da mudança", change, setChange)}</div><div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}><div><label style={fitLabelStyle}>Repetição</label><select value={repeat} onChange={(e) => setRepeat(e.target.value as "fixed" | "open")} style={fitFieldStyle}><option value="fixed">Fixa</option><option value="open">Aberta</option></select></div>{field("Mínimo", min, setMin)}{field("Máximo (vazio = aberto)", max, setMax)}</div>{field("Critério de encerramento", termination, setTermination)}<button disabled={saving} style={{ padding: 10, border: 0, borderRadius: 9, background: "linear-gradient(135deg,#7c5cfc,#5b8def)", fontWeight: 800 }}>{saving ? "Salvando..." : "Salvar etapa"}</button></form>;
}
