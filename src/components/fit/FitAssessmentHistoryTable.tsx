"use client";

// FitAssessmentHistoryTable — matriz métrica × avaliações (progressão).

import { ASSESSMENT_TYPE_LABELS, MEASUREMENT_CATEGORY_LABELS, MEASUREMENT_CATEGORY_ORDER } from "@/lib/fit/types";
import type { FitAssessmentHistory } from "@/lib/fit/fit-assessment-compare";

function fmt(d: string): string {
  const [y, m, day] = d.split("-");
  return day && m && y ? `${day}/${m}` : d;
}

const cell: React.CSSProperties = { padding: "6px 8px", fontSize: ".8rem", borderBottom: "1px solid rgba(90,110,160,.14)", whiteSpace: "nowrap" };

export function FitAssessmentHistoryTable({ history }: { history: FitAssessmentHistory }) {
  if (history.assessments.length === 0 || history.metrics.length === 0) {
    return <div style={{ fontSize: ".82rem", color: "#8ea3c0" }}>Sem avaliações com medições para o histórico.</div>;
  }
  const cats = MEASUREMENT_CATEGORY_ORDER.filter((c) => history.metrics.some((m) => m.category === c));

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 360 }}>
        <thead>
          <tr>
            <th style={{ ...cell, textAlign: "left", color: "#8ea3c0", fontSize: ".7rem", textTransform: "uppercase" }}>Métrica</th>
            {history.assessments.map((a) => (
              <th key={a.id} style={{ ...cell, textAlign: "right", color: "#8ea3c0", fontSize: ".7rem" }} title={ASSESSMENT_TYPE_LABELS[a.type]}>
                {a.type === "baseline" ? "Base" : fmt(a.assessed_at)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {cats.map((cat) => (
            <FragmentRows key={cat} catLabel={MEASUREMENT_CATEGORY_LABELS[cat]} metrics={history.metrics.filter((m) => m.category === cat)} assessments={history.assessments} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FragmentRows({
  catLabel,
  metrics,
  assessments,
}: {
  catLabel: string;
  metrics: FitAssessmentHistory["metrics"];
  assessments: FitAssessmentHistory["assessments"];
}) {
  return (
    <>
      <tr>
        <td colSpan={assessments.length + 1} style={{ ...cell, color: "#b7a6ff", fontWeight: 700, fontSize: ".72rem", borderBottom: "none", paddingTop: 10 }}>
          {catLabel}
        </td>
      </tr>
      {metrics.map((m) => (
        <tr key={m.metric}>
          <td style={{ ...cell, textAlign: "left", color: "#e6edf6" }}>
            {m.label}{m.unit ? <span style={{ color: "#8ea3c0" }}> ({m.unit})</span> : null}
          </td>
          {assessments.map((a) => (
            <td key={a.id} style={{ ...cell, textAlign: "right", color: m.values[a.id] != null ? "#e6edf6" : "#5a6b85", fontVariantNumeric: "tabular-nums" }}>
              {m.values[a.id] != null ? m.values[a.id] : "—"}
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
