"use client";

// FitBlockEditor — modo avançado: blocos de execução de um exercício (builder).
// Aplica um método (semeia blocos) ou adiciona blocos manualmente. Soft-delete.

import { useState } from "react";
import { addBlock, updateBlock, archiveBlock } from "@/lib/fit/fit-workouts";
import { TRAINING_METHODS, blockTypeLabel, BLOCK_TYPE_META } from "@/lib/fit/training-methods";
import type { FitExerciseBlock, FitExerciseBlockInput, FitExerciseWithBlocks, FitBlockType } from "@/lib/fit/types";
import { FitModal } from "./FitModal";
import { fitLabelStyle, fitFieldStyle } from "./FitSection";
import { FitBlockSideEditor } from "./FitBlockSideEditor";

function nn(v: string): string | null {
  const t = v.trim();
  return t === "" ? null : t;
}
function toInt(v: string): number | null {
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? null : n;
}
function blockSummary(b: FitExerciseBlock): string {
  const parts: string[] = [];
  if (b.sets != null) parts.push(`${b.sets}x`);
  if (b.target_reps) parts.push(b.target_reps);
  if (b.target_load) parts.push(b.target_load);
  if (b.rir) parts.push(`RIR ${b.rir}`);
  if (b.rest_seconds != null) parts.push(`desc ${b.rest_seconds}s`);
  return parts.join(" · ");
}

export function FitBlockEditor({
  exercise,
  onChanged,
}: {
  exercise: FitExerciseWithBlocks;
  onChanged: () => void | Promise<void>;
}) {
  const [editing, setEditing] = useState<FitExerciseBlock | null>(null);
  const [creating, setCreating] = useState(false);
  const [methodKey, setMethodKey] = useState("");
  const blocks = exercise.blocks;

  async function applyMethod() {
    const method = TRAINING_METHODS.find((m) => m.key === methodKey);
    if (!method) return;
    let idx = blocks.length;
    for (const s of method.blocks) {
      await addBlock({
        exerciseId: exercise.id,
        planId: exercise.plan_id,
        dayId: exercise.day_id,
        orderIndex: idx++,
        input: {
          block_type: s.block_type,
          label: s.label,
          sets: s.sets,
          target_reps: s.target_reps,
          target_load: null,
          rest_seconds: s.rest_seconds,
          rir: s.rir,
          rpe: null,
          tempo: null,
          instructions: null,
        },
      });
    }
    setMethodKey("");
    await onChanged();
  }

  async function handleSave(input: FitExerciseBlockInput) {
    if (editing) {
      await updateBlock(editing.id, input);
    } else {
      await addBlock({ exerciseId: exercise.id, planId: exercise.plan_id, dayId: exercise.day_id, orderIndex: blocks.length, input });
    }
    setEditing(null);
    setCreating(false);
    await onChanged();
  }

  async function handleArchive(id: string) {
    await archiveBlock(id);
    await onChanged();
  }

  return (
    <div style={{ paddingTop: 10 }}>
      {/* Aplicar método */}
      <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
        <select value={methodKey} onChange={(e) => setMethodKey(e.target.value)} style={{ ...fitFieldStyle, width: "auto", flex: "1 1 180px", padding: "8px 10px" }}>
          <option value="">Aplicar um método…</option>
          {TRAINING_METHODS.map((m) => <option key={m.key} value={m.key}>{m.name}</option>)}
        </select>
        <button onClick={applyMethod} disabled={!methodKey} style={{ padding: "8px 14px", borderRadius: 9, border: "1px solid rgba(124,92,252,.5)", background: methodKey ? "rgba(124,92,252,.14)" : "transparent", color: "#b7a6ff", fontWeight: 700, fontSize: ".8rem", cursor: methodKey ? "pointer" : "default", fontFamily: "var(--font-sans)" }}>Aplicar</button>
      </div>

      {/* Blocos existentes */}
      {blocks.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
          {blocks.map((b) => (
            <div key={b.id} style={{ padding: "7px 10px", borderRadius: 8, background: "rgba(20,28,48,.6)", border: "1px solid rgba(90,110,160,.2)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button onClick={() => setEditing(b)} style={{ flex: 1, minWidth: 0, textAlign: "left", background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-sans)" }}>
                <div style={{ fontSize: ".8rem", fontWeight: 600, color: "#e6edf6" }}>
                  {b.label ?? blockTypeLabel(b.block_type)}
                  <span style={{ marginLeft: 8, fontSize: ".64rem", color: "#8ea3c0" }}>{blockTypeLabel(b.block_type)}</span>
                </div>
                {blockSummary(b) && <div style={{ fontSize: ".72rem", color: "#8ea3c0", marginTop: 1 }}>{blockSummary(b)}</div>}
              </button>
              <button onClick={() => handleArchive(b.id)} aria-label="Remover" style={{ background: "none", border: "none", color: "#f0857a", cursor: "pointer", fontSize: "1rem", padding: "2px 6px" }}>×</button>
              </div>
              <FitBlockSideEditor block={b} onChanged={onChanged} />
            </div>
          ))}
        </div>
      ) : (
        <div style={{ fontSize: ".78rem", color: "#8ea3c0", marginBottom: 10 }}>Sem blocos. Aplique um método ou adicione manualmente.</div>
      )}

      <button onClick={() => setCreating(true)} style={{ padding: "7px 12px", borderRadius: 8, border: "1px solid rgba(90,110,160,.4)", background: "transparent", color: "#c5d2e6", fontWeight: 600, fontSize: ".78rem", cursor: "pointer", fontFamily: "var(--font-sans)" }}>
        + Adicionar bloco
      </button>

      <FitModal open={creating || editing !== null} onClose={() => { setCreating(false); setEditing(null); }} title={editing ? "Editar bloco" : "Novo bloco"}>
        <BlockForm initial={editing} onSave={handleSave} />
      </FitModal>
    </div>
  );
}

function BlockForm({ initial, onSave }: { initial: FitExerciseBlock | null; onSave: (input: FitExerciseBlockInput) => Promise<void> }) {
  const [blockType, setBlockType] = useState<FitBlockType>(initial?.block_type ?? "straight_set");
  const [label, setLabel] = useState(initial?.label ?? "");
  const [sets, setSets] = useState(initial?.sets != null ? String(initial.sets) : "");
  const [reps, setReps] = useState(initial?.target_reps ?? "");
  const [load, setLoad] = useState(initial?.target_load ?? "");
  const [rest, setRest] = useState(initial?.rest_seconds != null ? String(initial.rest_seconds) : "");
  const [rir, setRir] = useState(initial?.rir ?? "");
  const [rpe, setRpe] = useState(initial?.rpe ?? "");
  const [tempo, setTempo] = useState(initial?.tempo ?? "");
  const [instructions, setInstructions] = useState(initial?.instructions ?? "");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({
        block_type: blockType,
        label: nn(label),
        sets: toInt(sets),
        target_reps: nn(reps),
        target_load: nn(load),
        rest_seconds: toInt(rest),
        rir: nn(rir),
        rpe: nn(rpe),
        tempo: nn(tempo),
        instructions: nn(instructions),
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div>
          <label style={fitLabelStyle}>Tipo de bloco</label>
          <select value={blockType} onChange={(e) => setBlockType(e.target.value as FitBlockType)} style={fitFieldStyle}>
            {(Object.keys(BLOCK_TYPE_META) as FitBlockType[]).map((k) => <option key={k} value={k}>{BLOCK_TYPE_META[k].label}</option>)}
          </select>
        </div>
        <div>
          <label style={fitLabelStyle}>Rótulo</label>
          <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Ex.: Top set" style={fitFieldStyle} />
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
        <div><label style={fitLabelStyle}>Séries</label><input value={sets} onChange={(e) => setSets(e.target.value)} inputMode="numeric" placeholder="1" style={fitFieldStyle} /></div>
        <div><label style={fitLabelStyle}>Reps alvo</label><input value={reps} onChange={(e) => setReps(e.target.value)} placeholder="6-8" style={fitFieldStyle} /></div>
        <div><label style={fitLabelStyle}>Carga alvo</label><input value={load} onChange={(e) => setLoad(e.target.value)} placeholder="RPE 8" style={fitFieldStyle} /></div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
        <div><label style={fitLabelStyle}>Descanso (s)</label><input value={rest} onChange={(e) => setRest(e.target.value)} inputMode="numeric" placeholder="90" style={fitFieldStyle} /></div>
        <div><label style={fitLabelStyle}>RIR alvo</label><input value={rir} onChange={(e) => setRir(e.target.value)} placeholder="1-2" style={fitFieldStyle} /></div>
        <div><label style={fitLabelStyle}>RPE alvo</label><input value={rpe} onChange={(e) => setRpe(e.target.value)} placeholder="7-9" style={fitFieldStyle} /></div>
      </div>
      <div><label style={fitLabelStyle}>Tempo / cadência</label><input value={tempo} onChange={(e) => setTempo(e.target.value)} placeholder="2-0-2" style={fitFieldStyle} /></div>
      <div><label style={fitLabelStyle}>Instruções</label><textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} rows={2} style={{ ...fitFieldStyle, resize: "vertical" }} /></div>
      <button type="submit" disabled={saving} style={{ padding: "11px 16px", borderRadius: 10, border: "none", background: saving ? "rgba(124,92,252,.4)" : "linear-gradient(135deg,#7c5cfc,#5b8def)", color: "#0b1120", fontWeight: 800, fontSize: ".87rem", cursor: saving ? "default" : "pointer", fontFamily: "var(--font-sans)" }}>
        {saving ? "Salvando..." : "Salvar bloco"}
      </button>
    </form>
  );
}
