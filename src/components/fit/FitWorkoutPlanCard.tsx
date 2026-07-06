"use client";

// FitWorkoutPlanCard — item de plano de treino na listagem.

import { WORKOUT_PLAN_STATUS_LABELS, type FitWorkoutPlan } from "@/lib/fit/types";

const STATUS_COLOR: Record<FitWorkoutPlan["status"], string> = {
  draft: "#efb04a",
  active: "#22c5a4",
  archived: "#8ea3c0",
};

function fmt(d: string | null): string {
  if (!d) return "";
  const [y, m, day] = d.split("-");
  return day && m && y ? `${day}/${m}/${y}` : d;
}

export function FitWorkoutPlanCard({ plan, onClick }: { plan: FitWorkoutPlan; onClick: () => void }) {
  const color = STATUS_COLOR[plan.status];
  const period = [fmt(plan.start_date), fmt(plan.end_date)].filter(Boolean).join(" → ");
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        padding: "13px 16px",
        borderRadius: 12,
        textAlign: "left",
        cursor: "pointer",
        background: "rgba(20,28,48,.7)",
        border: "1px solid rgba(90,110,160,.22)",
        fontFamily: "var(--font-sans)",
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: ".92rem", fontWeight: 600, color: "#f2f6ff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {plan.title}
        </div>
        <div style={{ fontSize: ".76rem", color: "#8ea3c0", marginTop: 2 }}>
          {plan.goal ? plan.goal : "Sem objetivo definido"}
          {period ? ` · ${period}` : ""}
        </div>
      </div>
      <span style={{ fontSize: ".7rem", color, background: `${color}22`, border: `1px solid ${color}66`, borderRadius: 999, padding: "3px 10px", whiteSpace: "nowrap" }}>
        {WORKOUT_PLAN_STATUS_LABELS[plan.status]}
      </span>
    </button>
  );
}
