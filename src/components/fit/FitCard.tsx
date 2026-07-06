// FitCard — card genérico do design system da Consultoria (isolado do Fracta).
// Usos: KPIs do dashboard, seções, containers.

import type { CSSProperties, ReactNode } from "react";

export function FitCard({
  children,
  style,
  padding = 20,
}: {
  children: ReactNode;
  style?: CSSProperties;
  padding?: number;
}) {
  return (
    <div
      style={{
        background: "rgba(20,28,48,.85)",
        border: "1px solid rgba(90,110,160,.28)",
        borderRadius: 16,
        padding,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function FitKpi({
  label,
  value,
  hint,
  accent = "#7c5cfc",
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  accent?: string;
}) {
  return (
    <FitCard>
      <div style={{ fontSize: ".72rem", color: "#8ea3c0", textTransform: "uppercase", letterSpacing: ".06em" }}>
        {label}
      </div>
      <div style={{ fontSize: "1.9rem", fontWeight: 800, color: "#f2f6ff", marginTop: 6, lineHeight: 1 }}>
        {value}
      </div>
      {hint && <div style={{ fontSize: ".76rem", color: accent, marginTop: 6 }}>{hint}</div>}
    </FitCard>
  );
}
