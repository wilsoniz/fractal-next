"use client";

// FitGroupEditor — container de um grupo (superset/circuito/EMOM) no builder.
// Parâmetros do grupo + exercícios aninhados (criar/editar/desagrupar/remover).

import { useState } from "react";
import { updateGroup, archiveGroup, addExercise, updateExercise, archiveExercise, ungroupExercise } from "@/lib/fit/fit-workouts";
import {
  GROUP_TYPE_LABELS,
  type FitGroupType,
  type FitGroupWithExercises,
  type FitExerciseWithBlocks,
  type FitWorkoutExerciseInput,
} from "@/lib/fit/types";
import { FitModal } from "./FitModal";
import { ExerciseForm } from "./FitExerciseFields";
import { FitExerciseRow } from "./FitExerciseRow";
import { fitLabelStyle, fitFieldStyle } from "./FitSection";

function toInt(v: string): number | null {
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? null : n;
}

export function FitGroupEditor({ group, onChanged }: { group: FitGroupWithExercises; onChanged: () => void | Promise<void> }) {
  const [type, setType] = useState<FitGroupType>(group.type);
  const [label, setLabel] = useState(group.label ?? "");
  const [rounds, setRounds] = useState(group.rounds != null ? String(group.rounds) : "");
  const [interval, setIntervalV] = useState(group.interval_seconds != null ? String(group.interval_seconds) : "");
  const [rest, setRest] = useState(group.rest_seconds != null ? String(group.rest_seconds) : "");
  const [savedParams, setSavedParams] = useState(false);

  const [editing, setEditing] = useState<FitExerciseWithBlocks | null>(null);
  const [creating, setCreating] = useState(false);

  async function saveParams() {
    await updateGroup(group.id, {
      type,
      label: label.trim() === "" ? null : label.trim(),
      rounds: toInt(rounds),
      interval_seconds: toInt(interval),
      rest_seconds: toInt(rest),
    });
    setSavedParams(true);
    setTimeout(() => setSavedParams(false), 1500);
    await onChanged();
  }

  async function handleSaveExercise(input: FitWorkoutExerciseInput) {
    if (editing) {
      await updateExercise(editing.id, input);
    } else {
      await addExercise(group.plan_id, group.day_id, group.order_index, input, { groupId: group.id, groupOrder: group.exercises.length });
    }
    setEditing(null);
    setCreating(false);
    await onChanged();
  }

  async function handleArchiveExercise(id: string) {
    await archiveExercise(id);
    await onChanged();
  }
  async function handleUngroup(id: string) {
    await ungroupExercise(id, group.order_index);
    await onChanged();
  }
  async function handleRemoveGroup() {
    await archiveGroup(group);
    await onChanged();
  }

  return (
    <div style={{ borderRadius: 12, border: "1px solid rgba(124,92,252,.4)", background: "rgba(124,92,252,.06)", padding: 12 }}>
      {/* Cabeçalho do grupo */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 10 }}>
        <div style={{ fontSize: ".82rem", fontWeight: 800, color: "#b7a6ff" }}>
          {GROUP_TYPE_LABELS[type]}{label ? ` · ${label}` : ""}
        </div>
        <button onClick={handleRemoveGroup} style={{ background: "none", border: "none", color: "#f0857a", cursor: "pointer", fontSize: ".76rem", fontFamily: "var(--font-sans)" }}>
          Remover grupo
        </button>
      </div>

      {/* Parâmetros */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(90px, 1fr))", gap: 8, marginBottom: 8 }}>
        <div>
          <label style={fitLabelStyle}>Tipo</label>
          <select value={type} onChange={(e) => setType(e.target.value as FitGroupType)} style={{ ...fitFieldStyle, padding: "7px 8px" }}>
            {(Object.keys(GROUP_TYPE_LABELS) as FitGroupType[]).map((k) => <option key={k} value={k}>{GROUP_TYPE_LABELS[k]}</option>)}
          </select>
        </div>
        <div>
          <label style={fitLabelStyle}>Rótulo</label>
          <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="A" style={{ ...fitFieldStyle, padding: "7px 8px" }} />
        </div>
        <div>
          <label style={fitLabelStyle}>Voltas</label>
          <input value={rounds} onChange={(e) => setRounds(e.target.value)} inputMode="numeric" placeholder="3" style={{ ...fitFieldStyle, padding: "7px 8px" }} />
        </div>
        {type === "emom" && (
          <div>
            <label style={fitLabelStyle}>Intervalo (s)</label>
            <input value={interval} onChange={(e) => setIntervalV(e.target.value)} inputMode="numeric" placeholder="60" style={{ ...fitFieldStyle, padding: "7px 8px" }} />
          </div>
        )}
        <div>
          <label style={fitLabelStyle}>Desc. volta (s)</label>
          <input value={rest} onChange={(e) => setRest(e.target.value)} inputMode="numeric" placeholder="60" style={{ ...fitFieldStyle, padding: "7px 8px" }} />
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <button onClick={saveParams} style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid rgba(90,110,160,.4)", background: "transparent", color: "#c5d2e6", fontWeight: 600, fontSize: ".76rem", cursor: "pointer", fontFamily: "var(--font-sans)" }}>Salvar parâmetros</button>
        {savedParams && <span style={{ fontSize: ".74rem", color: "#3fd6ad" }}>Salvo.</span>}
      </div>

      {/* Exercícios do grupo */}
      {group.exercises.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 8 }}>
          {group.exercises.map((ex) => (
            <FitExerciseRow
              key={ex.id}
              exercise={ex}
              onEdit={setEditing}
              onArchive={handleArchiveExercise}
              onChanged={onChanged}
              extraAction={
                <button onClick={() => handleUngroup(ex.id)} title="Desagrupar" style={{ background: "none", border: "1px solid rgba(90,110,160,.35)", color: "#9fb2cf", cursor: "pointer", fontSize: ".7rem", fontWeight: 600, borderRadius: 8, padding: "3px 8px", fontFamily: "var(--font-sans)", whiteSpace: "nowrap" }}>Desagrupar</button>
              }
            />
          ))}
        </div>
      ) : (
        <div style={{ fontSize: ".78rem", color: "#8ea3c0", marginBottom: 8 }}>Sem exercícios neste grupo.</div>
      )}

      <button onClick={() => setCreating(true)} style={{ padding: "7px 12px", borderRadius: 8, border: "1px solid rgba(124,92,252,.5)", background: "rgba(124,92,252,.14)", color: "#b7a6ff", fontWeight: 700, fontSize: ".78rem", cursor: "pointer", fontFamily: "var(--font-sans)" }}>
        + Exercício no grupo
      </button>

      <FitModal open={creating || editing !== null} onClose={() => { setCreating(false); setEditing(null); }} title={editing ? "Editar exercício" : "Novo exercício"}>
        <ExerciseForm initial={editing} onSave={handleSaveExercise} />
      </FitModal>
    </div>
  );
}
