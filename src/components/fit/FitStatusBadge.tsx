// FitStatusBadge — pílula de status do paciente.
// Suporta os 4 estados de UI; hoje só active/archived vêm de dados reais.

import { UI_STATUS_META, type FitPatientUiStatus } from "@/lib/fit/types";

export function FitStatusBadge({ status }: { status: FitPatientUiStatus }) {
  const meta = UI_STATUS_META[status];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "3px 10px",
        borderRadius: 999,
        background: meta.bg,
        border: `1px solid ${meta.color}55`,
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
