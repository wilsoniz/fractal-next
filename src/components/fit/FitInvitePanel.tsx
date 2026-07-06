"use client";

// FitInvitePanel — seção "Acesso do paciente" no workspace (profissional).
// Gera / copia / revoga o convite por token. Convive com o auto-vínculo por email.

import { useEffect, useState } from "react";
import { createInvite, latestInvite, revokeInvite, isInvitePending } from "@/lib/fit/fit-invites";
import { FitSection } from "./FitSection";
import type { FitPatientInvite } from "@/lib/fit/types";

function fmtDate(d: string): string {
  const dt = new Date(d);
  return dt.toLocaleDateString("pt-BR");
}

export function FitInvitePanel({
  patientId,
  patientEmail,
  hasAccess,
}: {
  patientId: string;
  patientEmail: string | null;
  hasAccess: boolean;
}) {
  const [invite, setInvite] = useState<FitPatientInvite | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  async function load() {
    const inv = await latestInvite(patientId);
    setInvite(inv);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

  const pending = isInvitePending(invite);
  const link = invite ? `${typeof window !== "undefined" ? window.location.origin : ""}/consultoria/convite?token=${invite.token}` : "";

  async function handleGenerate() {
    setBusy(true);
    await createInvite(patientId, patientEmail);
    await load();
    setBusy(false);
  }

  async function handleRevoke() {
    if (!invite) return;
    setBusy(true);
    await revokeInvite(invite.id);
    await load();
    setBusy(false);
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard indisponível */
    }
  }

  return (
    <FitSection title="Acesso do paciente" subtitle="Convide o paciente para acompanhar treinos e fazer check-ins.">
      {loading ? (
        <div style={{ fontSize: ".82rem", color: "#8ea3c0" }}>Carregando…</div>
      ) : hasAccess ? (
        <div style={{ fontSize: ".85rem", color: "#3fd6ad" }}>✓ Paciente com acesso ativo.</div>
      ) : pending ? (
        <div>
          <div style={{ fontSize: ".8rem", color: "#efb04a", marginBottom: 8 }}>
            Convite pendente · expira em {fmtDate(invite!.expires_at)}
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <input
              readOnly
              value={link}
              onFocus={(e) => e.currentTarget.select()}
              style={{ flex: "1 1 240px", padding: "8px 10px", borderRadius: 9, border: "1px solid rgba(90,110,160,.4)", background: "rgba(15,22,40,.7)", color: "#c5d2e6", fontFamily: "monospace", fontSize: ".78rem" }}
            />
            <button onClick={handleCopy} style={btnPrimary}>{copied ? "Copiado!" : "Copiar link"}</button>
            <button onClick={handleRevoke} disabled={busy} style={btnDanger}>Revogar</button>
          </div>
          <div style={{ fontSize: ".74rem", color: "#8ea3c0", marginTop: 8 }}>
            Envie este link ao paciente. Ele cria a conta (qualquer email) e o vínculo é automático ao aceitar.
          </div>
        </div>
      ) : (
        <div>
          <div style={{ fontSize: ".82rem", color: "#8ea3c0", marginBottom: 10 }}>
            {invite ? "O convite anterior não está mais válido." : "Este paciente ainda não tem acesso."}
          </div>
          <button onClick={handleGenerate} disabled={busy} style={btnPrimary}>
            {busy ? "Gerando…" : "Gerar convite"}
          </button>
        </div>
      )}
    </FitSection>
  );
}

const btnPrimary: React.CSSProperties = {
  padding: "9px 16px",
  borderRadius: 9,
  border: "none",
  background: "linear-gradient(135deg,#7c5cfc,#5b8def)",
  color: "#0b1120",
  fontWeight: 800,
  fontSize: ".82rem",
  cursor: "pointer",
  fontFamily: "var(--font-sans)",
  whiteSpace: "nowrap",
};
const btnDanger: React.CSSProperties = {
  padding: "9px 14px",
  borderRadius: 9,
  border: "1px solid rgba(224,90,75,.35)",
  background: "transparent",
  color: "#f0857a",
  fontWeight: 600,
  fontSize: ".82rem",
  cursor: "pointer",
  fontFamily: "var(--font-sans)",
  whiteSpace: "nowrap",
};
