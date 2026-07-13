"use client";

import { useState } from "react";
import { addBlockSide, archiveBlockSide, updateBlockSide } from "@/lib/fit/fit-workouts";
import { EXERCISE_SIDE_LABELS, type FitExerciseBlock, type FitExerciseBlockSide, type FitExerciseBlockSideInput, type FitExerciseSide } from "@/lib/fit/types";
import { FitModal } from "./FitModal";
import { fitFieldStyle, fitLabelStyle } from "./FitSection";

const nn = (v: string): string | null => v.trim() || null;
const toInt = (v: string): number | null => v.trim() && !Number.isNaN(Number(v)) ? Number.parseInt(v, 10) : null;
const toNum = (v: string): number | null => v.trim() && !Number.isNaN(Number(v.replace(",", "."))) ? Number(v.replace(",", ".")) : null;

export function FitBlockSideEditor({ block, onChanged }: { block: FitExerciseBlock; onChanged: () => void | Promise<void> }) {
  const sides = block.sides ?? [];
  const [editing, setEditing] = useState<FitExerciseBlockSide | null>(null);
  const [creating, setCreating] = useState(false);

  async function activate() {
    for (const [index, side] of (["left", "right"] as FitExerciseSide[]).entries()) {
      await addBlockSide({
        blockId: block.id,
        exerciseId: block.exercise_id,
        orderIndex: index,
        input: {
          side, side_label: EXERCISE_SIDE_LABELS[side], sets: block.sets,
          target_reps: block.target_reps, target_load: block.target_load,
          target_load_unit: null, target_intensity_pct_rm: null,
          rest_seconds: block.rest_seconds, rir: block.rir, rpe: block.rpe,
          tempo: block.tempo, instructions: block.instructions,
        },
      });
    }
    await onChanged();
  }

  async function save(input: FitExerciseBlockSideInput) {
    if (editing) await updateBlockSide(editing.id, input);
    else await addBlockSide({ blockId: block.id, exerciseId: block.exercise_id, orderIndex: sides.length, input });
    setEditing(null); setCreating(false); await onChanged();
  }

  if (sides.length === 0) {
    return <button onClick={activate} style={{ marginTop: 7, padding: "5px 9px", borderRadius: 7, border: "1px solid rgba(124,92,252,.35)", background: "rgba(124,92,252,.08)", color: "#b7a6ff", fontSize: ".7rem", cursor: "pointer" }}>Ativar prescrição diferente por lado</button>;
  }

  return (
    <div style={{ marginTop: 7, paddingTop: 7, borderTop: "1px solid rgba(124,92,252,.18)" }}>
      <div style={{ fontSize: ".68rem", color: "#b7a6ff", fontWeight: 700, marginBottom: 5 }}>Prescrição por lado</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {sides.map((s) => <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: ".7rem", color: "#c5d2e6" }}>
          <button onClick={() => setEditing(s)} style={{ flex: 1, textAlign: "left", border: 0, background: "transparent", color: "inherit", cursor: "pointer" }}><strong>{s.side_label ?? EXERCISE_SIDE_LABELS[s.side]}</strong> · {[s.sets != null ? `${s.sets}x` : null, s.target_reps, s.target_load, s.target_intensity_pct_rm != null ? `${s.target_intensity_pct_rm}% 1RM` : null].filter(Boolean).join(" · ")}</button>
          <button onClick={async () => { await archiveBlockSide(s.id); await onChanged(); }} style={{ border: 0, background: "transparent", color: "#f0857a", cursor: "pointer" }}>×</button>
        </div>)}
      </div>
      <button onClick={() => setCreating(true)} style={{ marginTop: 5, border: 0, background: "transparent", color: "#9fb2cf", fontSize: ".68rem", cursor: "pointer" }}>+ Adicionar lado</button>
      <FitModal open={creating || editing !== null} onClose={() => { setCreating(false); setEditing(null); }} title={editing ? "Editar prescrição lateral" : "Nova prescrição lateral"}>
        <SideForm initial={editing} block={block} onSave={save} />
      </FitModal>
    </div>
  );
}

function SideForm({ initial, block, onSave }: { initial: FitExerciseBlockSide | null; block: FitExerciseBlock; onSave: (input: FitExerciseBlockSideInput) => Promise<void> }) {
  const [side, setSide] = useState<FitExerciseSide>(initial?.side ?? "custom");
  const [label, setLabel] = useState(initial?.side_label ?? "");
  const [sets, setSets] = useState(String(initial?.sets ?? block.sets ?? ""));
  const [reps, setReps] = useState(initial?.target_reps ?? block.target_reps ?? "");
  const [load, setLoad] = useState(initial?.target_load ?? block.target_load ?? "");
  const [unit, setUnit] = useState(initial?.target_load_unit ?? "kg");
  const [intensity, setIntensity] = useState(String(initial?.target_intensity_pct_rm ?? ""));
  const [rest, setRest] = useState(String(initial?.rest_seconds ?? block.rest_seconds ?? ""));
  const [rir, setRir] = useState(initial?.rir ?? block.rir ?? "");
  const [rpe, setRpe] = useState(initial?.rpe ?? block.rpe ?? "");
  const [tempo, setTempo] = useState(initial?.tempo ?? block.tempo ?? "");
  const [instructions, setInstructions] = useState(initial?.instructions ?? block.instructions ?? "");
  const [saving, setSaving] = useState(false);
  async function submit(e: React.FormEvent) { e.preventDefault(); setSaving(true); try { await onSave({ side, side_label: nn(label) ?? EXERCISE_SIDE_LABELS[side], sets: toInt(sets), target_reps: nn(reps), target_load: nn(load), target_load_unit: nn(unit), target_intensity_pct_rm: toNum(intensity), rest_seconds: toInt(rest), rir: nn(rir), rpe: nn(rpe), tempo: nn(tempo), instructions: nn(instructions) }); } finally { setSaving(false); } }
  return <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}><div><label style={fitLabelStyle}>Lado</label><select value={side} onChange={(e) => setSide(e.target.value as FitExerciseSide)} style={fitFieldStyle}>{Object.entries(EXERCISE_SIDE_LABELS).map(([v,l]) => <option key={v} value={v}>{l}</option>)}</select></div><div><label style={fitLabelStyle}>Rótulo</label><input value={label} onChange={(e) => setLabel(e.target.value)} placeholder={EXERCISE_SIDE_LABELS[side]} style={fitFieldStyle} /></div></div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}><div><label style={fitLabelStyle}>Séries</label><input value={sets} onChange={(e) => setSets(e.target.value)} style={fitFieldStyle} /></div><div><label style={fitLabelStyle}>Reps</label><input value={reps} onChange={(e) => setReps(e.target.value)} style={fitFieldStyle} /></div><div><label style={fitLabelStyle}>Carga</label><input value={load} onChange={(e) => setLoad(e.target.value)} style={fitFieldStyle} /></div></div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}><div><label style={fitLabelStyle}>Unidade</label><input value={unit} onChange={(e) => setUnit(e.target.value)} style={fitFieldStyle} /></div><div><label style={fitLabelStyle}>% 1RM</label><input value={intensity} onChange={(e) => setIntensity(e.target.value)} style={fitFieldStyle} /></div><div><label style={fitLabelStyle}>Descanso (s)</label><input value={rest} onChange={(e) => setRest(e.target.value)} style={fitFieldStyle} /></div></div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}><div><label style={fitLabelStyle}>RIR</label><input value={rir} onChange={(e) => setRir(e.target.value)} style={fitFieldStyle} /></div><div><label style={fitLabelStyle}>RPE</label><input value={rpe} onChange={(e) => setRpe(e.target.value)} style={fitFieldStyle} /></div><div><label style={fitLabelStyle}>Tempo</label><input value={tempo} onChange={(e) => setTempo(e.target.value)} style={fitFieldStyle} /></div></div>
    <div><label style={fitLabelStyle}>Instruções</label><textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} rows={2} style={{ ...fitFieldStyle, resize: "vertical" }} /></div>
    <button disabled={saving} style={{ padding: 10, border: 0, borderRadius: 9, background: "linear-gradient(135deg,#7c5cfc,#5b8def)", fontWeight: 800 }}>{saving ? "Salvando..." : "Salvar lado"}</button>
  </form>;
}
