"use client";

// FitBlockRunner — registro do paciente POR BLOCO (modo avançado).
// Apresentacional: o estado é mantido pelo FitWorkoutRunner (values/onChange).

import { blockTypeLabel } from "@/lib/fit/training-methods";
import { EXERCISE_SIDE_LABELS, type FitExerciseBlock, type FitExerciseBlockSide } from "@/lib/fit/types";
import { fitFieldStyle } from "./FitSection";
import { FitStrategyStepRunner, type FitStepEntryState } from "./FitStrategyStepRunner";

export interface FitBlockEntryState {
  load: string;
  reps: string;
  sets: string;
  rpe: string;
  rir: string;
  pain: string;
  notes: string;
  completed: boolean;
}

export const emptyBlockEntry = (b: FitExerciseBlock): FitBlockEntryState => ({
  load: "",
  reps: b.target_reps ?? "",
  sets: b.sets != null ? String(b.sets) : "",
  rpe: "",
  rir: "",
  pain: "",
  notes: "",
  completed: false,
});

export const emptySideEntry = (side: FitExerciseBlockSide): FitBlockEntryState => ({
  load: "",
  reps: side.target_reps ?? "",
  sets: side.sets != null ? String(side.sets) : "",
  rpe: "",
  rir: "",
  pain: "",
  notes: "",
  completed: false,
});

function prescribed(b: FitExerciseBlock): string {
  const parts: string[] = [];
  if (b.sets != null) parts.push(`${b.sets}x`);
  if (b.target_reps) parts.push(b.target_reps);
  if (b.target_load) parts.push(b.target_load);
  if (b.rir) parts.push(`RIR ${b.rir}`);
  if (b.rest_seconds != null) parts.push(`desc ${b.rest_seconds}s`);
  return parts.join(" · ");
}

function prescribedSide(s: FitExerciseBlockSide): string {
  const parts = [s.sets != null ? `${s.sets}x` : null, s.target_reps, s.target_load, s.target_intensity_pct_rm != null ? `${s.target_intensity_pct_rm}% 1RM` : null, s.rir ? `RIR ${s.rir}` : null];
  return parts.filter(Boolean).join(" · ");
}

function safetyText(block: FitExerciseBlock): string[] {
  const safety = block.data?.safety;
  if (!safety || typeof safety !== "object" || Array.isArray(safety)) return [];
  const values = safety as Record<string, unknown>;
  return [values.warning, values.termination].filter((value): value is string => typeof value === "string" && value.trim().length > 0);
}

const input: React.CSSProperties = { ...fitFieldStyle, padding: "7px 6px", textAlign: "center" };

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: ".62rem", color: "#8ea3c0", marginBottom: 3, textAlign: "center" }}>{label}</label>
      {children}
    </div>
  );
}

export function FitBlockRunner({
  blocks,
  values,
  onChange,
  stepValues,
  occurrenceCounts,
  endedStrategies,
  onStepChange,
  onAddOccurrence,
  onEndStrategy,
}: {
  blocks: FitExerciseBlock[];
  values: Record<string, FitBlockEntryState>;
  onChange: (blockId: string, patch: Partial<FitBlockEntryState>) => void;
  stepValues: Record<string, FitStepEntryState>;
  occurrenceCounts: Record<string, number>;
  endedStrategies: Record<string, boolean>;
  onStepChange: (key: string, patch: Partial<FitStepEntryState>) => void;
  onAddOccurrence: (contextKey: string, stepId: string) => void;
  onEndStrategy: (contextKey: string) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10 }}>
      {blocks.map((b) => {
        const sides = b.sides ?? [];
        const v = values[b.id] ?? emptyBlockEntry(b);
        const safety = safetyText(b);
        return (
          <div key={b.id} style={{ padding: 12, borderRadius: 10, background: "rgba(15,22,40,.55)", border: `1px solid ${v.completed ? "rgba(34,197,164,.45)" : "rgba(90,110,160,.2)"}` }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
              <div style={{ fontSize: ".84rem", fontWeight: 700, color: "#f2f6ff" }}>
                {b.label ?? blockTypeLabel(b.block_type)}
                <span style={{ marginLeft: 8, fontSize: ".62rem", color: "#8ea3c0" }}>{blockTypeLabel(b.block_type)}</span>
              </div>
              <div style={{ fontSize: ".72rem", color: "#8ea3c0" }}>{prescribed(b)}</div>
            </div>

            {b.instructions && <div style={{ fontSize: ".72rem", color: "#9fb2cf", marginTop: 6, whiteSpace: "pre-wrap" }}>{b.instructions}</div>}
            {safety.length > 0 && <div style={{ fontSize: ".72rem", color: "#efb04a", marginTop: 6, whiteSpace: "pre-wrap" }}>{safety.join(" ")}</div>}

            {sides.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
                {sides.map((side) => {
                  const sv = values[side.id] ?? emptySideEntry(side);
                  return <div key={side.id} style={{ padding: 9, borderRadius: 8, border: `1px solid ${sv.completed ? "rgba(34,197,164,.4)" : "rgba(124,92,252,.25)"}` }}>
                    <div style={{ fontSize: ".76rem", fontWeight: 700, color: "#b7a6ff" }}>{side.side_label ?? EXERCISE_SIDE_LABELS[side.side]} <span style={{ color: "#8ea3c0", fontWeight: 400 }}>· {prescribedSide(side)}</span></div>
                    {(b.steps?.length ?? 0) > 0 ? <FitStrategyStepRunner block={b} side={side} values={stepValues} occurrenceCounts={occurrenceCounts} ended={endedStrategies} onChange={onStepChange} onAddOccurrence={onAddOccurrence} onEnd={onEndStrategy} /> : <EntryFields value={sv} onChange={(patch) => onChange(side.id, patch)} />}
                  </div>;
                })}
              </div>
            ) : (b.steps?.length ?? 0) > 0 ? <FitStrategyStepRunner block={b} side={null} values={stepValues} occurrenceCounts={occurrenceCounts} ended={endedStrategies} onChange={onStepChange} onAddOccurrence={onAddOccurrence} onEnd={onEndStrategy} /> : <EntryFields value={v} onChange={(patch) => onChange(b.id, patch)} />}
          </div>
        );
      })}
    </div>
  );
}

function EntryFields({ value, onChange }: { value: FitBlockEntryState; onChange: (patch: Partial<FitBlockEntryState>) => void }) {
  return <>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 6, marginTop: 10 }}>
      <Field label="Carga"><input value={value.load} onChange={(e) => onChange({ load: e.target.value })} inputMode="decimal" style={input} /></Field>
      <Field label="Reps"><input value={value.reps} onChange={(e) => onChange({ reps: e.target.value })} style={input} /></Field>
      <Field label="Séries"><input value={value.sets} onChange={(e) => onChange({ sets: e.target.value })} inputMode="numeric" style={input} /></Field>
      <Field label="RPE"><input value={value.rpe} onChange={(e) => onChange({ rpe: e.target.value })} inputMode="decimal" style={input} /></Field>
      <Field label="RIR"><input value={value.rir} onChange={(e) => onChange({ rir: e.target.value })} inputMode="decimal" style={input} /></Field>
      <Field label="Dor 0–10"><input value={value.pain} onChange={(e) => onChange({ pain: e.target.value })} inputMode="decimal" style={input} /></Field>
    </div>
    <input value={value.notes} onChange={(e) => onChange({ notes: e.target.value })} placeholder="Observação opcional" style={{ ...input, marginTop: 6, textAlign: "left" }} />
    <button onClick={() => onChange({ completed: !value.completed })} style={{ marginTop: 8, width: "100%", padding: "7px", borderRadius: 8, border: `1px solid ${value.completed ? "rgba(34,197,164,.5)" : "rgba(90,110,160,.4)"}`, background: value.completed ? "rgba(34,197,164,.16)" : "transparent", color: value.completed ? "#3fd6ad" : "#c5d2e6", fontWeight: 700, fontSize: ".78rem", cursor: "pointer", fontFamily: "var(--font-sans)" }}>{value.completed ? "✓ Feito" : "Marcar como feito"}</button>
  </>;
}
