"use client";

// FitAccessBadge — estado de acesso do paciente à plataforma.

export function FitAccessBadge({ hasAccess, hasPendingInvite }: { hasAccess: boolean; hasPendingInvite?: boolean }) {
  const meta = hasAccess
    ? { label: "Acesso ativo", color: "#22c5a4" }
    : hasPendingInvite
    ? { label: "Convite pendente", color: "#efb04a" }
    : { label: "Sem acesso", color: "#8ea3c0" };
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "3px 10px",
        borderRadius: 999,
        background: `${meta.color}22`,
        border: `1px solid ${meta.color}66`,
        color: meta.color,
        fontSize: ".72rem",
        fontWeight: 600,
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: meta.color }} />
      {meta.label}
    </span>
  );
}
