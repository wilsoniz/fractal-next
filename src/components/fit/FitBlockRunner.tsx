"use client";

// FitBlockRunner — registro do paciente POR BLOCO (modo avançado).
// Apresentacional: o estado é mantido pelo FitWorkoutRunner (values/onChange).

import { blockTypeLabel } from "@/lib/fit/training-methods";
import type { FitExerciseBlock } from "@/lib/fit/types";
import { fitFieldStyle } from "./FitSection";

export interface FitBlockEntryState {
  load: string;
  reps: string;
  sets: string;
  rpe: string;
  rir: string;
  completed: boolean;
}

export const emptyBlockEntry = (b: FitExerciseBlock): FitBlockEntryState => ({
  load: "",
  reps: b.target_reps ?? "",
  sets: b.sets != null ? String(b.sets) : "",
  rpe: "",
  rir: "",
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
}: {
  blocks: FitExerciseBlock[];
  values: Record<string, FitBlockEntryState>;
  onChange: (blockId: string, patch: Partial<FitBlockEntryState>) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10 }}>
      {blocks.map((b) => {
        const v = values[b.id] ?? emptyBlockEntry(b);
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

            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 6, marginTop: 10 }}>
              <Field label="Carga"><input value={v.load} onChange={(e) => onChange(b.id, { load: e.target.value })} inputMode="decimal" style={input} /></Field>
              <Field label="Reps"><input value={v.reps} onChange={(e) => onChange(b.id, { reps: e.target.value })} style={input} /></Field>
              <Field label="Séries"><input value={v.sets} onChange={(e) => onChange(b.id, { sets: e.target.value })} inputMode="numeric" style={input} /></Field>
              <Field label="RPE"><input value={v.rpe} onChange={(e) => onChange(b.id, { rpe: e.target.value })} inputMode="decimal" style={input} /></Field>
              <Field label="RIR"><input value={v.rir} onChange={(e) => onChange(b.id, { rir: e.target.value })} inputMode="decimal" style={input} /></Field>
            </div>

            <button
              onClick={() => onChange(b.id, { completed: !v.completed })}
              style={{ marginTop: 8, width: "100%", padding: "7px", borderRadius: 8, border: `1px solid ${v.completed ? "rgba(34,197,164,.5)" : "rgba(90,110,160,.4)"}`, background: v.completed ? "rgba(34,197,164,.16)" : "transparent", color: v.completed ? "#3fd6ad" : "#c5d2e6", fontWeight: 700, fontSize: ".78rem", cursor: "pointer", fontFamily: "var(--font-sans)" }}
            >
              {v.completed ? "✓ Feito" : "Marcar bloco como feito"}
            </button>
          </div>
        );
      })}
    </div>
  );
}
