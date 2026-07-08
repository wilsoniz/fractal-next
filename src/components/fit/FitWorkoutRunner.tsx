"use client";

// FitWorkoutRunner — execução + registro de um dia (exercícios standalone + grupos).
// Grupo é ORIENTAÇÃO de execução; o registro continua por exercício/bloco.

import { useState } from "react";
import { createLog, saveEntries, saveBlockEntries } from "@/lib/fit/fit-training-logs";
import { orderedDayItems } from "@/lib/fit/fit-workouts";
import { blockTypeLabel } from "@/lib/fit/training-methods";
import {
  GROUP_TYPE_LABELS,
  type FitWorkoutDay,
  type FitExerciseWithBlocks,
  type FitGroupWithExercises,
  type FitTrainingLogEntryInput,
  type FitTrainingLogBlockEntryInput,
} from "@/lib/fit/types";
import { fitFieldStyle } from "./FitSection";
import { FitBlockRunner, emptyBlockEntry, type FitBlockEntryState } from "./FitBlockRunner";

type DayFull = FitWorkoutDay & { exercises: FitExerciseWithBlocks[]; groups: FitGroupWithExercises[] };

interface Entry {
  load_done: string;
  reps_done: string;
  sets_done: string;
  rpe: string;
  completed: boolean;
}

function prescribed(ex: FitExerciseWithBlocks): string {
  const parts: string[] = [];
  if (ex.sets != null) parts.push(`${ex.sets} séries`);
  if (ex.target_reps) parts.push(`${ex.target_reps} reps`);
  if (ex.target_load) parts.push(ex.target_load);
  if (ex.rest_seconds != null) parts.push(`desc ${ex.rest_seconds}s`);
  return parts.join(" · ") || "Sem prescrição";
}

function groupContext(g: FitGroupWithExercises): string {
  const head = `${GROUP_TYPE_LABELS[g.type]}${g.label ? ` ${g.label}` : ""}`;
  const parts = [head];
  if (g.type === "emom" && g.interval_seconds != null) parts.push(`${g.interval_seconds}s`);
  if (g.rounds != null) parts.push(`${g.rounds} voltas`);
  return parts.join(" · ");
}

function toNum(v: string): number | null {
  const n = parseFloat(v.replace(",", "."));
  return Number.isNaN(n) ? null : n;
}
function toInt(v: string): number | null {
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? null : n;
}
function nn(v: string): string | null {
  const t = v.trim();
  return t === "" ? null : t;
}

export function FitWorkoutRunner({
  patientId,
  planId,
  day,
  onDone,
}: {
  patientId: string;
  planId: string;
  day: DayFull;
  onDone: () => void;
}) {
  const allExercises: FitExerciseWithBlocks[] = [...day.exercises, ...day.groups.flatMap((g) => g.exercises)];

  const [entries, setEntries] = useState<Record<string, Entry>>(() =>
    Object.fromEntries(
      allExercises
        .filter((ex) => ex.blocks.length === 0)
        .map((ex) => [ex.id, { load_done: "", reps_done: ex.target_reps ?? "", sets_done: ex.sets != null ? String(ex.sets) : "", rpe: "", completed: false }]),
    ),
  );
  const [blockEntries, setBlockEntries] = useState<Record<string, FitBlockEntryState>>(() =>
    Object.fromEntries(allExercises.flatMap((ex) => ex.blocks.map((b) => [b.id, emptyBlockEntry(b)]))),
  );

  const [openInfo, setOpenInfo] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function upd(id: string, patch: Partial<Entry>) {
    setEntries((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }
  function updBlock(blockId: string, patch: Partial<FitBlockEntryState>) {
    setBlockEntries((prev) => ({ ...prev, [blockId]: { ...prev[blockId], ...patch } }));
  }

  async function handleFinish() {
    setSaving(true);
    setError(null);
    const { data: log, error: logErr } = await createLog({ patientId, planId, dayId: day.id, performed_at: new Date().toISOString().slice(0, 10), notes: null });
    if (!log) {
      setError(logErr ? `Não foi possível salvar o treino: ${logErr}` : "Não foi possível salvar o treino.");
      setSaving(false);
      return;
    }

    const simplePayload: FitTrainingLogEntryInput[] = allExercises
      .filter((ex) => ex.blocks.length === 0)
      .map((ex) => {
        const e = entries[ex.id];
        return {
          exercise_id: ex.id,
          exercise_name: ex.name,
          sets_done: toInt(e.sets_done),
          reps_done: nn(e.reps_done),
          load_done: toNum(e.load_done),
          load_unit: "kg",
          rpe: toNum(e.rpe),
          completed: e.completed,
          notes: null,
        };
      });

    const blockPayload: FitTrainingLogBlockEntryInput[] = allExercises.flatMap((ex) =>
      ex.blocks.map((b) => {
        const v = blockEntries[b.id];
        return {
          exercise_id: ex.id,
          block_id: b.id,
          exercise_name: ex.name,
          block_label: b.label ?? blockTypeLabel(b.block_type),
          block_type: b.block_type,
          load_done: toNum(v.load),
          load_unit: "kg",
          reps_done: nn(v.reps),
          sets_done: toInt(v.sets),
          rpe: toNum(v.rpe),
          rir: toNum(v.rir),
          completed: v.completed,
          notes: null,
        };
      }),
    );

    const { ok: okSimple, error: simpleErr } = await saveEntries(log.id, simplePayload);
    const { ok: okBlocks, error: blocksErr } = await saveBlockEntries(log.id, blockPayload);
    setSaving(false);
    if (!okSimple || !okBlocks) {
      const detail = simpleErr ?? blocksErr;
      setError(detail ? `Treino criado, mas erro ao salvar registro: ${detail}` : "Treino criado, mas houve erro ao salvar parte do registro.");
      return;
    }
    onDone();
  }

  const totalUnits = allExercises.reduce((acc, ex) => acc + (ex.blocks.length > 0 ? ex.blocks.length : 1), 0);
  const doneUnits =
    Object.values(entries).filter((e) => e.completed).length +
    Object.values(blockEntries).filter((b) => b.completed).length;

  function renderExercise(ex: FitExerciseWithBlocks) {
    const hasBlocks = ex.blocks.length > 0;
    const e = entries[ex.id];
    const borderColor = !hasBlocks && e?.completed ? "rgba(34,197,164,.5)" : "rgba(90,110,160,.24)";
    return (
      <div key={ex.id} style={{ background: "rgba(20,28,48,.75)", border: `1px solid ${borderColor}`, borderRadius: 14, padding: 14 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: ".95rem", fontWeight: 700, color: "#f2f6ff" }}>{ex.name}</div>
            {!hasBlocks && <div style={{ fontSize: ".78rem", color: "#8ea3c0", marginTop: 2 }}>{prescribed(ex)}</div>}
            {hasBlocks && <div style={{ fontSize: ".72rem", color: "#b7a6ff", marginTop: 2 }}>{ex.blocks.length} bloco{ex.blocks.length > 1 ? "s" : ""}</div>}
          </div>
          {(ex.video_url || ex.instructions) && (
            <button onClick={() => setOpenInfo(openInfo === ex.id ? null : ex.id)} style={{ flexShrink: 0, background: "rgba(124,92,252,.14)", border: "1px solid rgba(124,92,252,.4)", color: "#b7a6ff", borderRadius: 8, fontSize: ".72rem", fontWeight: 700, padding: "5px 10px", cursor: "pointer", fontFamily: "var(--font-sans)" }}>
              Como fazer
            </button>
          )}
        </div>

        {openInfo === ex.id && (
          <div style={{ marginTop: 10, padding: 10, background: "rgba(15,22,40,.6)", borderRadius: 9, fontSize: ".8rem", color: "#c5d2e6" }}>
            {ex.video_url && (
              <div style={{ marginBottom: ex.instructions ? 8 : 0 }}>
                <a href={ex.video_url} target="_blank" rel="noopener noreferrer" style={{ color: "#7c9cfc" }}>▶ Ver vídeo de execução</a>
              </div>
            )}
            {ex.instructions && <div style={{ whiteSpace: "pre-wrap" }}>{ex.instructions}</div>}
          </div>
        )}

        {hasBlocks ? (
          <FitBlockRunner blocks={ex.blocks} values={blockEntries} onChange={updBlock} />
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, marginTop: 12 }}>
              <Field label="Carga (kg)"><input value={e.load_done} onChange={(ev) => upd(ex.id, { load_done: ev.target.value })} inputMode="decimal" style={runnerInput} /></Field>
              <Field label="Reps"><input value={e.reps_done} onChange={(ev) => upd(ex.id, { reps_done: ev.target.value })} style={runnerInput} /></Field>
              <Field label="Séries"><input value={e.sets_done} onChange={(ev) => upd(ex.id, { sets_done: ev.target.value })} inputMode="numeric" style={runnerInput} /></Field>
              <Field label="RPE"><input value={e.rpe} onChange={(ev) => upd(ex.id, { rpe: ev.target.value })} inputMode="decimal" style={runnerInput} /></Field>
            </div>
            <button
              onClick={() => upd(ex.id, { completed: !e.completed })}
              style={{ marginTop: 10, width: "100%", padding: "9px", borderRadius: 9, border: `1px solid ${e.completed ? "rgba(34,197,164,.5)" : "rgba(90,110,160,.4)"}`, background: e.completed ? "rgba(34,197,164,.16)" : "transparent", color: e.completed ? "#3fd6ad" : "#c5d2e6", fontWeight: 700, fontSize: ".82rem", cursor: "pointer", fontFamily: "var(--font-sans)" }}
            >
              {e.completed ? "✓ Feito" : "Marcar como feito"}
            </button>
          </>
        )}
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 14 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 800, color: "#f2f6ff" }}>{day.name}</h2>
          {day.focus && <div style={{ fontSize: ".8rem", color: "#8ea3c0", marginTop: 2 }}>{day.focus}</div>}
        </div>
        <div style={{ fontSize: ".78rem", color: "#8ea3c0" }}>{doneUnits}/{totalUnits} feitos</div>
      </div>

      {error && (
        <div style={{ padding: "9px 12px", marginBottom: 12, background: "rgba(224,90,75,.1)", border: "1px solid rgba(224,90,75,.3)", borderRadius: 8, fontSize: ".8rem", color: "#f08070" }}>{error}</div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {orderedDayItems({ exercises: day.exercises, groups: day.groups }).map((it) =>
          it.kind === "exercise" ? (
            renderExercise(it.exercise)
          ) : (
            <div key={it.group.id} style={{ borderRadius: 14, border: "1px solid rgba(124,92,252,.4)", background: "rgba(124,92,252,.06)", padding: 12 }}>
              <div style={{ fontSize: ".82rem", fontWeight: 800, color: "#b7a6ff", marginBottom: 10 }}>{groupContext(it.group)}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {it.group.exercises.map((ex) => renderExercise(ex))}
              </div>
            </div>
          ),
        )}
      </div>

      <button
        onClick={handleFinish}
        disabled={saving}
        style={{ marginTop: 18, width: "100%", padding: "14px", borderRadius: 12, border: "none", background: saving ? "rgba(124,92,252,.4)" : "linear-gradient(135deg,#7c5cfc,#5b8def)", color: "#0b1120", fontWeight: 800, fontSize: ".95rem", cursor: saving ? "default" : "pointer", fontFamily: "var(--font-sans)" }}
      >
        {saving ? "Salvando..." : "Concluir treino"}
      </button>
    </div>
  );
}

const runnerInput: React.CSSProperties = { ...fitFieldStyle, padding: "8px 8px", textAlign: "center" };

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: ".66rem", color: "#8ea3c0", marginBottom: 3, textAlign: "center" }}>{label}</label>
      {children}
    </div>
  );
}
