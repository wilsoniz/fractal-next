// FitSection — bloco de seção com título (design system da Consultoria).
// Base visual dos formulários longos (questionário e avaliação em blocos).

import type { ReactNode } from "react";

export function FitSection({
  title,
  subtitle,
  right,
  children,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section
      style={{
        background: "rgba(20,28,48,.7)",
        border: "1px solid rgba(90,110,160,.24)",
        borderRadius: 14,
        padding: 18,
        marginBottom: 16,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: ".92rem", fontWeight: 700, color: "#f2f6ff" }}>{title}</div>
          {subtitle && <div style={{ fontSize: ".76rem", color: "#8ea3c0", marginTop: 2 }}>{subtitle}</div>}
        </div>
        {right}
      </div>
      {children}
    </section>
  );
}

export const fitLabelStyle: React.CSSProperties = {
  display: "block",
  fontSize: ".74rem",
  fontWeight: 600,
  color: "#a7bad6",
  marginBottom: 5,
};

export const fitFieldStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 9,
  border: "1px solid rgba(90,110,160,.4)",
  background: "rgba(15,22,40,.7)",
  color: "#e6edf6",
  fontFamily: "var(--font-sans)",
  fontSize: ".88rem",
  outline: "none",
  boxSizing: "border-box",
};
