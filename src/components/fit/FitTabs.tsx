"use client";

// FitTabs — abas genéricas controladas (design system da Consultoria).

export interface FitTabDef {
  key: string;
  label: string;
  disabled?: boolean;
}

export function FitTabs({
  tabs,
  active,
  onChange,
}: {
  tabs: FitTabDef[];
  active: string;
  onChange: (key: string) => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        gap: 4,
        borderBottom: "1px solid rgba(90,110,160,.25)",
        overflowX: "auto",
      }}
    >
      {tabs.map((t) => {
        const isActive = t.key === active;
        return (
          <button
            key={t.key}
            onClick={() => !t.disabled && onChange(t.key)}
            style={{
              padding: "10px 14px",
              background: "none",
              border: "none",
              borderBottom: `2px solid ${isActive ? "#7c5cfc" : "transparent"}`,
              color: isActive ? "#b7a6ff" : t.disabled ? "rgba(142,163,192,.45)" : "#9fb2cf",
              fontFamily: "var(--font-sans)",
              fontSize: ".85rem",
              fontWeight: isActive ? 700 : 500,
              cursor: t.disabled ? "default" : "pointer",
              whiteSpace: "nowrap",
              marginBottom: -1,
            }}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
