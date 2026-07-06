"use client";

// FitExerciseRow — uma linha de exercício (com expander de blocos). Reutilizada
// por exercícios standalone e por exercícios dentro de grupos.

import { useState, type ReactNode } from "react";
import { FitBlockEditor } from "./FitBlockEditor";
import { exerciseSummary } from "./FitExerciseFields";
import type { FitExerciseWithBlocks } from "@/lib/fit/types";

export function FitExerciseRow({
  exercise,
  onEdit,
  onArchive,
  onChanged,
  extraAction,
}: {
  exercise: FitExerciseWithBlocks;
  onEdit: (ex: FitExerciseWithBlocks) => void;
  onArchive: (id: string) => void;
  onChanged: () => void | Promise<void>;
  extraAction?: ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasBlocks = exercise.blocks.length > 0;

  return (
    <div style={{ borderRadius: 9, background: "rgba(15,22,40,.5)", border: "1px solid rgba(90,110,160,.18)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px" }}>
        <button onClick={() => onEdit(exercise)} style={{ flex: 1, minWidth: 0, textAlign: "left", background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-sans)" }}>
          <div style={{ fontSize: ".86rem", fontWeight: 600, color: "#f2f6ff" }}>
            {exercise.name}
            {hasBlocks && (
              <span style={{ marginLeft: 8, fontSize: ".62rem", color: "#b7a6ff", background: "rgba(124,92,252,.16)", border: "1px solid rgba(124,92,252,.4)", borderRadius: 999, padding: "1px 7px" }}>
                {exercise.blocks.length} bloco{exercise.blocks.length > 1 ? "s" : ""}
              </span>
            )}
          </div>
          {!hasBlocks && exerciseSummary(exercise) && (
            <div style={{ fontSize: ".76rem", color: "#8ea3c0", marginTop: 1 }}>{exerciseSummary(exercise)}</div>
          )}
        </button>
        {exercise.video_url && <span title="Tem vídeo" style={{ fontSize: ".7rem", color: "#7c9cfc" }}>▶</span>}
        {extraAction}
        <button
          onClick={() => setExpanded((v) => !v)}
          style={{ background: "none", border: "1px solid rgba(90,110,160,.35)", color: expanded ? "#b7a6ff" : "#9fb2cf", cursor: "pointer", fontSize: ".72rem", fontWeight: 600, borderRadius: 8, padding: "3px 9px", fontFamily: "var(--font-sans)", whiteSpace: "nowrap" }}
        >
          Blocos {expanded ? "▲" : "▾"}
        </button>
        <button onClick={() => onArchive(exercise.id)} aria-label="Remover" style={{ background: "none", border: "none", color: "#f0857a", cursor: "pointer", fontSize: "1.05rem", padding: "2px 6px" }}>×</button>
      </div>
      {expanded && (
        <div style={{ padding: "0 10px 10px", borderTop: "1px solid rgba(90,110,160,.14)" }}>
          <FitBlockEditor exercise={exercise} onChanged={onChanged} />
        </div>
      )}
    </div>
  );
}
