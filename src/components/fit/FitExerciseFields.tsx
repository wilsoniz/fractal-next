"use client";

// Form de exercício + helpers compartilhados (usado por standalone e por grupos).

import { useState } from "react";
import type { FitWorkoutExercise, FitWorkoutExerciseInput } from "@/lib/fit/types";
import { fitLabelStyle, fitFieldStyle } from "./FitSection";

export function nn(v: string): string | null {
  const t = v.trim();
  return t === "" ? null : t;
}

export function exerciseSummary(ex: FitWorkoutExercise): string {
  const parts: string[] = [];
  if (ex.sets != null) parts.push(`${ex.sets}x`);
  if (ex.target_reps) parts.push(ex.target_reps);
  if (ex.target_load) parts.push(ex.target_load);
  if (ex.rest_seconds != null) parts.push(`desc ${ex.rest_seconds}s`);
  return parts.join(" · ");
}

export function ExerciseForm({
  initial,
  onSave,
}: {
  initial: FitWorkoutExercise | null;
  onSave: (input: FitWorkoutExerciseInput) => Promise<void>;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [sets, setSets] = useState(initial?.sets != null ? String(initial.sets) : "");
  const [reps, setReps] = useState(initial?.target_reps ?? "");
  const [load, setLoad] = useState(initial?.target_load ?? "");
  const [rest, setRest] = useState(initial?.rest_seconds != null ? String(initial.rest_seconds) : "");
  const [tempo, setTempo] = useState(initial?.tempo ?? "");
  const [video, setVideo] = useState(initial?.video_url ?? "");
  const [instructions, setInstructions] = useState(initial?.instructions ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (name.trim() === "") return;
    setSaving(true);
    try {
      const setsNum = sets.trim() === "" ? null : parseInt(sets, 10);
      const restNum = rest.trim() === "" ? null : parseInt(rest, 10);
      await onSave({
        name: name.trim(),
        sets: setsNum != null && !Number.isNaN(setsNum) ? setsNum : null,
        target_reps: nn(reps),
        target_load: nn(load),
        rest_seconds: restNum != null && !Number.isNaN(restNum) ? restNum : null,
        tempo: nn(tempo),
        video_url: nn(video),
        instructions: nn(instructions),
        notes: nn(notes),
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div>
        <label style={fitLabelStyle}>Nome do exercício *</label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Supino reto" style={fitFieldStyle} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
        <div><label style={fitLabelStyle}>Séries</label><input value={sets} onChange={(e) => setSets(e.target.value)} placeholder="3" inputMode="numeric" style={fitFieldStyle} /></div>
        <div><label style={fitLabelStyle}>Reps alvo</label><input value={reps} onChange={(e) => setReps(e.target.value)} placeholder="8-12" style={fitFieldStyle} /></div>
        <div><label style={fitLabelStyle}>Carga alvo</label><input value={load} onChange={(e) => setLoad(e.target.value)} placeholder="70% 1RM / RPE 8" style={fitFieldStyle} /></div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div><label style={fitLabelStyle}>Descanso (s)</label><input value={rest} onChange={(e) => setRest(e.target.value)} placeholder="90" inputMode="numeric" style={fitFieldStyle} /></div>
        <div><label style={fitLabelStyle}>Tempo / cadência</label><input value={tempo} onChange={(e) => setTempo(e.target.value)} placeholder="Ex.: 2-0-2" style={fitFieldStyle} /></div>
      </div>
      <div><label style={fitLabelStyle}>Link / vídeo de execução</label><input value={video} onChange={(e) => setVideo(e.target.value)} placeholder="https://…" style={fitFieldStyle} /></div>
      <div><label style={fitLabelStyle}>Instruções de execução</label><textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} rows={2} style={{ ...fitFieldStyle, resize: "vertical" }} /></div>
      <div><label style={fitLabelStyle}>Observações</label><textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} style={{ ...fitFieldStyle, resize: "vertical" }} /></div>
      <button type="submit" disabled={saving} style={{ padding: "11px 16px", borderRadius: 10, border: "none", background: saving ? "rgba(124,92,252,.4)" : "linear-gradient(135deg,#7c5cfc,#5b8def)", color: "#0b1120", fontWeight: 800, fontSize: ".87rem", cursor: saving ? "default" : "pointer", fontFamily: "var(--font-sans)" }}>
        {saving ? "Salvando..." : "Salvar exercício"}
      </button>
    </form>
  );
}
