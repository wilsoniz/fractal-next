"use client";

// FitExerciseEditor — área de exercícios de UM dia: exercícios standalone + grupos.
// Ordena por order_index (grupos e standalone compartilham o espaço).

import { useState } from "react";
import { addExercise, updateExercise, archiveExercise, addGroup, orderedDayItems } from "@/lib/fit/fit-workouts";
import {
  GROUP_TYPE_LABELS,
  type FitExerciseWithBlocks,
  type FitGroupWithExercises,
  type FitWorkoutExerciseInput,
  type FitGroupType,
} from "@/lib/fit/types";
import { FitModal } from "./FitModal";
import { ExerciseForm } from "./FitExerciseFields";
import { FitExerciseRow } from "./FitExerciseRow";
import { FitGroupEditor } from "./FitGroupEditor";
import { fitLabelStyle, fitFieldStyle } from "./FitSection";

export function FitExerciseEditor({
  planId,
  dayId,
  exercises,
  groups,
  onChanged,
}: {
  planId: string;
  dayId: string;
  exercises: FitExerciseWithBlocks[];
  groups: FitGroupWithExercises[];
  onChanged: () => void | Promise<void>;
}) {
  const [editing, setEditing] = useState<FitExerciseWithBlocks | null>(null);
  const [creating, setCreating] = useState(false);
  const [addingGroup, setAddingGroup] = useState(false);
  const [groupType, setGroupType] = useState<FitGroupType>("superset");
  const [saveError, setSaveError] = useState<string | null>(null);

  const items = orderedDayItems({ exercises, groups });
  const nextDayOrder =
    Math.max(0, ...exercises.map((e) => e.order_index), ...groups.map((g) => g.order_index)) + 1;

  async function handleSaveExercise(input: FitWorkoutExerciseInput) {
    setSaveError(null);
    if (editing) {
      const ok = await updateExercise(editing.id, input);
      if (!ok) { setSaveError("Não foi possível salvar as alterações."); return; }
    } else {
      const { data, error } = await addExercise(planId, dayId, nextDayOrder, input);
      if (!data) {
        setSaveError(error ? `Não foi possível salvar: ${error}` : "Não foi possível salvar o exercício. Recarregue a página (Cmd+Shift+R) e tente novamente.");
        return;
      }
    }
    setEditing(null);
    setCreating(false);
    await onChanged();
  }

  async function handleArchive(id: string) {
    await archiveExercise(id);
    await onChanged();
  }

  async function handleAddGroup() {
    await addGroup(planId, dayId, nextDayOrder, {
      type: groupType,
      label: null,
      rounds: null,
      interval_seconds: groupType === "emom" ? 60 : null,
      rest_seconds: null,
    });
    setAddingGroup(false);
    await onChanged();
  }

  return (
    <div>
      {items.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 10 }}>
          {items.map((it) =>
            it.kind === "exercise" ? (
              <FitExerciseRow key={it.exercise.id} exercise={it.exercise} onEdit={setEditing} onArchive={handleArchive} onChanged={onChanged} />
            ) : (
              <FitGroupEditor key={it.group.id} group={it.group} onChanged={onChanged} />
            ),
          )}
        </div>
      ) : (
        <div style={{ fontSize: ".8rem", color: "#8ea3c0", marginBottom: 10 }}>Nenhum exercício neste dia.</div>
      )}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button onClick={() => setCreating(true)} style={{ padding: "8px 14px", borderRadius: 9, border: "1px solid rgba(124,92,252,.5)", background: "rgba(124,92,252,.14)", color: "#b7a6ff", fontWeight: 700, fontSize: ".82rem", cursor: "pointer", fontFamily: "var(--font-sans)" }}>
          + Adicionar exercício
        </button>
        <button onClick={() => setAddingGroup(true)} style={{ padding: "8px 14px", borderRadius: 9, border: "1px solid rgba(90,110,160,.4)", background: "transparent", color: "#c5d2e6", fontWeight: 700, fontSize: ".82rem", cursor: "pointer", fontFamily: "var(--font-sans)" }}>
          + Adicionar grupo
        </button>
      </div>

      <FitModal open={creating || editing !== null} onClose={() => { setCreating(false); setEditing(null); setSaveError(null); }} title={editing ? "Editar exercício" : "Novo exercício"}>
        {saveError && (
          <div style={{ padding: "9px 12px", marginBottom: 12, background: "rgba(224,90,75,.1)", border: "1px solid rgba(224,90,75,.3)", borderRadius: 8, fontSize: ".8rem", color: "#f08070" }}>{saveError}</div>
        )}
        <ExerciseForm initial={editing} onSave={handleSaveExercise} />
      </FitModal>

      <FitModal open={addingGroup} onClose={() => setAddingGroup(false)} title="Novo grupo">
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label style={fitLabelStyle}>Tipo do grupo</label>
            <select value={groupType} onChange={(e) => setGroupType(e.target.value as FitGroupType)} style={fitFieldStyle}>
              {(Object.keys(GROUP_TYPE_LABELS) as FitGroupType[]).map((k) => <option key={k} value={k}>{GROUP_TYPE_LABELS[k]}</option>)}
            </select>
          </div>
          <div style={{ fontSize: ".78rem", color: "#8ea3c0" }}>
            Crie o grupo e depois adicione exercícios dentro dele.
          </div>
          <button onClick={handleAddGroup} style={{ padding: "11px 16px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#7c5cfc,#5b8def)", color: "#0b1120", fontWeight: 800, fontSize: ".87rem", cursor: "pointer", fontFamily: "var(--font-sans)" }}>
            Criar grupo
          </button>
        </div>
      </FitModal>
    </div>
  );
}
