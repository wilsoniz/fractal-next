"use client";

import type { FitExerciseBlock, FitExerciseBlockSide } from "@/lib/fit/types";
import { fitFieldStyle } from "./FitSection";

export interface FitStepEntryState { load: string; reps: string; fullReps: string; partialReps: string; duration: string; rest: string; rpe: string; rir: string; pain: string; notes: string; terminationReason: string; completed: boolean }
export const emptyStepEntry = (): FitStepEntryState => ({ load: "", reps: "", fullReps: "", partialReps: "", duration: "", rest: "", rpe: "", rir: "", pain: "", notes: "", terminationReason: "", completed: false });
export const strategyContextKey = (blockId: string, sideId: string | null) => `${blockId}:${sideId ?? "bilateral"}`;
export const strategyStepKey = (blockId: string, sideId: string | null, stepId: string, occurrence: number) => `${strategyContextKey(blockId, sideId)}:${stepId}:${occurrence}`;

export function FitStrategyStepRunner({ block, side, values, occurrenceCounts, ended, onChange, onAddOccurrence, onEnd }: { block: FitExerciseBlock; side: FitExerciseBlockSide | null; values: Record<string, FitStepEntryState>; occurrenceCounts: Record<string, number>; ended: Record<string, boolean>; onChange: (key: string, patch: Partial<FitStepEntryState>) => void; onAddOccurrence: (contextKey: string, stepId: string) => void; onEnd: (contextKey: string) => void }) {
  const steps = block.steps ?? [];
  const context = strategyContextKey(block.id, side?.id ?? null);
  const units = steps.flatMap((step) => Array.from({ length: occurrenceCounts[`${context}:${step.id}`] ?? 1 }, (_, occurrence) => ({ step, occurrence, key: strategyStepKey(block.id, side?.id ?? null, step.id, occurrence) })));
  const currentIndex = units.findIndex((u) => !values[u.key]?.completed);
  const activeIndex = currentIndex >= 0 ? currentIndex : Math.max(0, units.length - 1);
  const unit = units[activeIndex];
  if (!unit) return null;
  const value = values[unit.key] ?? emptyStepEntry();
  const countKey = `${context}:${unit.step.id}`;
  const count = occurrenceCounts[countKey] ?? 1;
  const canAdd = unit.step.repeat_mode === "open" && value.completed && !ended[context] && (unit.step.max_occurrences == null || count < unit.step.max_occurrences);
  const minMet = units.filter((u) => u.step.id === unit.step.id && values[u.key]?.completed).length >= unit.step.min_occurrences;
  const completeCount = units.filter((u) => values[u.key]?.completed).length;
  const predicted = [unit.step.target_reps ? `${unit.step.target_reps} reps` : null, unit.step.target_full_reps != null ? `${unit.step.target_full_reps} completas` : null, unit.step.target_partial_reps != null ? `${unit.step.target_partial_reps} parciais` : null, unit.step.target_duration_seconds != null ? `${unit.step.target_duration_seconds}s` : null, unit.step.rest_seconds != null ? `${unit.step.rest_seconds}s de descanso` : null, unit.step.load_change_value != null ? `${unit.step.load_change_type === "percentage" ? `${unit.step.load_change_value}%` : unit.step.load_change_value} de ajuste` : null].filter(Boolean).join(" · ");
  const input: React.CSSProperties = { ...fitFieldStyle, padding: "8px 6px", textAlign: "center" };
  const field = (label: string, prop: keyof FitStepEntryState, mode?: "decimal") => <div><label style={{ display: "block", fontSize: ".62rem", color: "#8ea3c0", marginBottom: 3, textAlign: "center" }}>{label}</label><input value={String(value[prop])} onChange={(e) => onChange(unit.key, { [prop]: e.target.value })} inputMode={mode} style={input} /></div>;
  return <div style={{ marginTop: 10, padding: 11, borderRadius: 10, border: "1px solid rgba(124,92,252,.3)", background: "rgba(124,92,252,.05)" }}>
    <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><div><div style={{ fontSize: ".7rem", color: "#b7a6ff", fontWeight: 700 }}>Etapa atual · {activeIndex + 1}/{units.length}</div><div style={{ color: "#f2f6ff", fontWeight: 700, marginTop: 2 }}>{unit.step.label ?? unit.step.step_type}{unit.step.repeat_mode === "open" ? ` · ocorrência ${unit.occurrence + 1}` : ""}</div></div><div style={{ fontSize: ".7rem", color: "#8ea3c0" }}>{completeCount}/{units.length}</div></div>
    {predicted && <div style={{ fontSize: ".72rem", color: "#9fb2cf", marginTop: 5 }}>Previsto: {predicted}</div>}
    {unit.step.termination_rule && <div style={{ fontSize: ".72rem", color: "#efb04a", marginTop: 4 }}>Encerrar: {unit.step.termination_rule}</div>}
    {typeof unit.step.data?.hold_per_rep_seconds === "number" && <div style={{ fontSize: ".72rem", color: "#efb04a", marginTop: 4 }}>Sustentar {unit.step.data.hold_per_rep_seconds}s em cada repetição.</div>}
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(64px,1fr))", gap: 6, marginTop: 10 }}>{field("Carga", "load", "decimal")}{field("Reps", "reps")}{field("Completas", "fullReps")}{field("Parciais", "partialReps")}{field("Duração", "duration")}{field("Pausa", "rest")}{field("RPE", "rpe", "decimal")}{field("RIR", "rir", "decimal")}{field("Dor", "pain", "decimal")}</div>
    <input value={value.notes} onChange={(e) => onChange(unit.key, { notes: e.target.value })} placeholder="Observação opcional" style={{ ...input, marginTop: 7, textAlign: "left" }} />
    <button onClick={() => onChange(unit.key, { completed: !value.completed })} style={{ marginTop: 8, width: "100%", padding: 8, borderRadius: 8, border: `1px solid ${value.completed ? "rgba(34,197,164,.5)" : "rgba(90,110,160,.4)"}`, background: value.completed ? "rgba(34,197,164,.16)" : "transparent", color: value.completed ? "#3fd6ad" : "#c5d2e6", fontWeight: 700 }}>{value.completed ? "✓ Etapa registrada" : "Concluir etapa"}</button>
    {canAdd && <button onClick={() => onAddOccurrence(context, unit.step.id)} style={{ marginTop: 6, width: "100%", padding: 8, borderRadius: 8, border: "1px solid rgba(124,92,252,.4)", background: "rgba(124,92,252,.12)", color: "#b7a6ff", fontWeight: 700 }}>Adicionar ocorrência</button>}
    {unit.step.repeat_mode === "open" && minMet && !ended[context] && <div style={{ marginTop: 6 }}><input value={value.terminationReason} onChange={(e) => onChange(unit.key, { terminationReason: e.target.value })} placeholder="Motivo de encerramento, quando pertinente" style={{ ...input, textAlign: "left" }} /><button onClick={() => onEnd(context)} style={{ marginTop: 5, width: "100%", padding: 7, borderRadius: 8, border: "1px solid rgba(239,176,74,.45)", background: "rgba(239,176,74,.1)", color: "#efb04a" }}>Encerrar estratégia</button></div>}
    {ended[context] && <div style={{ marginTop: 7, fontSize: ".72rem", color: "#3fd6ad" }}>Estratégia encerrada.</div>}
    {activeIndex + 1 < units.length && <div style={{ marginTop: 7, fontSize: ".68rem", color: "#8ea3c0" }}>Próxima: {units[activeIndex + 1].step.label ?? units[activeIndex + 1].step.step_type}</div>}
  </div>;
}
