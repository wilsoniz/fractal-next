"use client";

// Preview do Treino do paciente (read-only) — visualização estática da prescrição.

import { useEffect, useState } from "react";
import { listActivePlans, getPlanFull, orderedDayItems } from "@/lib/fit/fit-workouts";
import { blockTypeLabel } from "@/lib/fit/training-methods";
import { exerciseSummary } from "@/components/fit/FitExerciseFields";
import { FitCard } from "@/components/fit/FitCard";
import { GROUP_TYPE_LABELS, type FitWorkoutPlanFull, type FitExerciseWithBlocks, type FitGroupWithExercises } from "@/lib/fit/types";

function groupContext(g: FitGroupWithExercises): string {
  const parts = [`${GROUP_TYPE_LABELS[g.type]}${g.label ? ` ${g.label}` : ""}`];
  if (g.type === "emom" && g.interval_seconds != null) parts.push(`${g.interval_seconds}s`);
  if (g.rounds != null) parts.push(`${g.rounds} voltas`);
  return parts.join(" · ");
}

function ExerciseView({ ex }: { ex: FitExerciseWithBlocks }) {
  return (
    <div style={{ padding: "8px 10px", borderRadius: 9, background: "rgba(15,22,40,.5)", border: "1px solid rgba(90,110,160,.18)" }}>
      <div style={{ fontSize: ".86rem", fontWeight: 600, color: "#f2f6ff" }}>{ex.name}</div>
      {ex.blocks.length > 0 ? (
        <div style={{ marginTop: 4, display: "flex", flexDirection: "column", gap: 2 }}>
          {ex.blocks.map((b) => (
            <div key={b.id} style={{ fontSize: ".74rem", color: "#8ea3c0" }}>
              <span style={{ color: "#b7a6ff" }}>{b.label ?? blockTypeLabel(b.block_type)}:</span>{" "}
              {[b.sets != null ? `${b.sets}x` : "", b.target_reps ?? "", b.target_load ?? "", b.rir ? `RIR ${b.rir}` : ""].filter(Boolean).join(" · ")}
            </div>
          ))}
        </div>
      ) : (
        exerciseSummary(ex) && <div style={{ fontSize: ".76rem", color: "#8ea3c0", marginTop: 1 }}>{exerciseSummary(ex)}</div>
      )}
    </div>
  );
}

export function FitPreviewTreino({ patientId }: { patientId: string }) {
  const [plan, setPlan] = useState<FitWorkoutPlanFull | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const plans = await listActivePlans(patientId);
      if (plans[0]) setPlan(await getPlanFull(plans[0].id));
      setLoading(false);
    })();
  }, [patientId]);

  if (loading) return <div style={{ color: "#8ea3c0" }}>Carregando…</div>;
  if (!plan) return <FitCard><div style={{ fontSize: ".85rem", color: "#8ea3c0", textAlign: "center", padding: 12 }}>Nenhum treino ativo.</div></FitCard>;

  return (
    <div>
      <h1 style={{ margin: "0 0 12px", fontSize: "1.25rem", fontWeight: 800, color: "#f2f6ff" }}>{plan.title}</h1>
      {plan.days.length === 0 ? (
        <FitCard><div style={{ fontSize: ".85rem", color: "#8ea3c0" }}>Sem dias de treino.</div></FitCard>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {plan.days.map((d) => (
            <div key={d.id}>
              <div style={{ fontSize: ".95rem", fontWeight: 700, color: "#f2f6ff" }}>{d.name}</div>
              {d.focus && <div style={{ fontSize: ".76rem", color: "#8ea3c0", marginBottom: 6 }}>{d.focus}</div>}
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 6 }}>
                {orderedDayItems({ exercises: d.exercises, groups: d.groups }).map((it) =>
                  it.kind === "exercise" ? (
                    <ExerciseView key={it.exercise.id} ex={it.exercise} />
                  ) : (
                    <div key={it.group.id} style={{ borderRadius: 10, border: "1px solid rgba(124,92,252,.4)", background: "rgba(124,92,252,.06)", padding: 10 }}>
                      <div style={{ fontSize: ".8rem", fontWeight: 800, color: "#b7a6ff", marginBottom: 8 }}>{groupContext(it.group)}</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {it.group.exercises.map((ex) => <ExerciseView key={ex.id} ex={ex} />)}
                      </div>
                    </div>
                  ),
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
