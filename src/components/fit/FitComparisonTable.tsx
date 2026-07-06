"use client";

// FitComparisonTable — comparação por categoria (referência vs atual + Δ).

import { FitDeltaBadge } from "./FitDeltaBadge";
import { MEASUREMENT_CATEGORY_LABELS, MEASUREMENT_CATEGORY_ORDER, type FitMeasurementCategory } from "@/lib/fit/types";
import type { FitComparisonRow } from "@/lib/fit/fit-assessment-compare";

function val(v: number | null, unit: string | null): string {
  return v == null ? "—" : `${v}${unit ? ` ${unit}` : ""}`;
}

export function FitComparisonTable({ rows, refLabel }: { rows: FitComparisonRow[]; refLabel: string }) {
  if (rows.length === 0) {
    return <div style={{ fontSize: ".82rem", color: "#8ea3c0" }}>Sem métricas para comparar.</div>;
  }
  const cats = MEASUREMENT_CATEGORY_ORDER.filter((c) => rows.some((r) => r.category === c));

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr auto", gap: 8, padding: "0 0 6px", fontSize: ".68rem", color: "#8ea3c0", textTransform: "uppercase", letterSpacing: ".04em" }}>
        <div>Métrica</div>
        <div>{refLabel || "Referência"}</div>
        <div>Atual</div>
        <div style={{ textAlign: "right" }}>Δ</div>
      </div>

      {cats.map((cat: FitMeasurementCategory) => (
        <div key={cat} style={{ marginBottom: 8 }}>
          <div style={{ fontSize: ".72rem", fontWeight: 700, color: "#b7a6ff", margin: "8px 0 4px" }}>
            {MEASUREMENT_CATEGORY_LABELS[cat]}
          </div>
          {rows.filter((r) => r.category === cat).map((r) => (
            <div key={r.metric} style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr auto", gap: 8, alignItems: "center", padding: "6px 0", borderBottom: "1px solid rgba(90,110,160,.14)", fontSize: ".82rem" }}>
              <div style={{ color: "#e6edf6" }}>{r.label}</div>
              <div style={{ color: "#8ea3c0" }}>{val(r.refValue, r.unit)}</div>
              <div style={{ color: "#e6edf6" }}>{val(r.currentValue, r.unit)}</div>
              <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 6 }}>
                {r.delta == null ? (
                  <span style={{ fontSize: ".76rem", color: "#8ea3c0" }}>nova</span>
                ) : (
                  <>
                    <FitDeltaBadge delta={r.delta} unit={r.unit} valence={r.valence} />
                    {r.pct != null && (
                      <span style={{ fontSize: ".7rem", color: "#8ea3c0" }}>{r.pct > 0 ? "+" : ""}{r.pct.toFixed(1)}%</span>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
