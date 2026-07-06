"use client";

// FitDeltaBadge — variação (Δ) em relação à linha de base.
// NEUTRO por padrão (só mostra a direção, sem julgar). Cores de melhora/piora
// apenas quando a valência é óbvia (dor = menor melhor; aderência = maior melhor).

import type { FitValence } from "@/lib/fit/fit-evolution";

function fmt(n: number): string {
  const r = Math.round(n * 100) / 100;
  return (r > 0 ? "+" : "") + String(r);
}

export function FitDeltaBadge({
  delta,
  unit,
  valence = "neutral",
}: {
  delta: number;
  unit?: string | null;
  valence?: FitValence;
}) {
  const arrow = delta > 0 ? "▲" : delta < 0 ? "▼" : "–";

  let color = "#9fb2cf"; // neutro
  if (delta !== 0 && valence !== "neutral") {
    const good =
      (valence === "higher_better" && delta > 0) || (valence === "lower_better" && delta < 0);
    color = good ? "#22c5a4" : "#e0705a";
  }

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, color, fontSize: ".8rem", fontWeight: 700, whiteSpace: "nowrap" }}>
      <span style={{ fontSize: ".7rem" }}>{arrow}</span>
      {fmt(delta)}{unit ? ` ${unit}` : ""}
    </span>
  );
}
