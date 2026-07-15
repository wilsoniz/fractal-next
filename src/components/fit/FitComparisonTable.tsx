"use client";

// FitComparisonTable — comparação por categoria (referência vs atual + Δ).

import { FitDeltaBadge } from "./FitDeltaBadge";
import { MEASUREMENT_CATEGORY_LABELS, MEASUREMENT_CATEGORY_ORDER, type FitMeasurementCategory } from "@/lib/fit/types";
import type { FitAssessmentAsymmetryRow, FitComparisonRow } from "@/lib/fit/fit-assessment-compare";

function val(v: number | null, unit: string | null): string {
  return v == null ? "—" : `${v}${unit ? ` ${unit}` : ""}`;
}

export function FitComparisonTable({ rows, asymmetries, refLabel }: { rows: FitComparisonRow[]; asymmetries: FitAssessmentAsymmetryRow[]; refLabel: string }) {
  if (rows.length === 0 && asymmetries.length === 0) {
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
            <div key={r.identityKey} style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr auto", gap: 8, alignItems: "center", padding: "6px 0", borderBottom: "1px solid rgba(90,110,160,.14)", fontSize: ".82rem" }}>
              <div style={{ color: "#e6edf6" }}>{r.label}<div style={{ color: "#6f829f", fontSize: ".66rem" }}>{r.contextLabel}{r.sideLabel ? ` · ${r.sideLabel}` : ""}</div></div>
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
      {asymmetries.length > 0 && <div style={{ marginTop: 14 }}><div style={{ color: "#b7a6ff", fontWeight: 700, fontSize: ".76rem", marginBottom: 5 }}>Assimetria derivada</div>{asymmetries.map((row) => <div key={row.key} style={{ padding: "7px 0", borderBottom: "1px solid rgba(90,110,160,.14)", fontSize: ".78rem" }}><div style={{ color: "#e6edf6" }}>{row.label} · {row.mode === "left_right" ? "esquerda/direita" : "afetado/não afetado"}</div><div style={{ color: "#6f829f", fontSize: ".66rem" }}>{row.contextLabel}</div>{row.reason ? <div style={{ color: "#efb04a", marginTop: 3 }}>{row.reason}</div> : <div style={{ color: "#9fb2cf", marginTop: 3 }}>{refLabel}: {row.referenceDifference ?? "—"}{row.unit ? ` ${row.unit}` : ""} · atual: {row.currentDifference ?? "—"}{row.unit ? ` ${row.unit}` : ""} · variação: {row.differenceDelta == null ? "—" : row.differenceDelta.toFixed(2)}</div>}</div>)}</div>}
    </div>
  );
}
