"use client";

// Resgate de convite de paciente — /consultoria/convite?token=<uuid>
// Fora do guard da área do paciente (funciona com conta ainda não vinculada).

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getFitUser, signOutFit } from "@/lib/fit/supabase-fit";
import { ensureProfile } from "@/lib/fit/fit-profiles";
import { getInviteInfo, redeemInvite } from "@/lib/fit/fit-invites";
import type { FitInviteInfo } from "@/lib/fit/types";

const REASON_LABEL: Record<string, string> = {
  invalid: "Convite inválido ou não encontrado.",
  expired: "Este convite expirou. Peça um novo ao seu profissional.",
  revoked: "Este convite foi revogado.",
  used: "Este convite já foi utilizado.",
  already_linked: "Sua conta já está vinculada a um paciente.",
  patient_already_linked: "Este paciente já tem uma conta vinculada.",
  is_professional: "Você está logado como profissional. Saia e entre com sua conta de paciente para aceitar.",
  unauthenticated: "Faça login para aceitar o convite.",
  error: "Não foi possível processar o convite. Tente novamente.",
};

const cardStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: 440,
  background: "rgba(20,28,48,.85)",
  border: "1px solid rgba(90,110,160,.35)",
  borderRadius: 18,
  padding: 28,
};

function ConviteInner() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") ?? "";

  const [info, setInfo] = useState<FitInviteInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [isProfessional, setIsProfessional] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (!token) {
        setError("Link de convite sem token.");
        setLoading(false);
        return;
      }
      const { user } = await getFitUser();
      if (!user) {
        router.replace(`/consultoria/login?redirect=${encodeURIComponent(`/consultoria/convite?token=${token}`)}`);
        return;
      }
      const profile = await ensureProfile();
      if (profile?.role === "professional") {
        setIsProfessional(true);
        setLoading(false);
        return;
      }
      const i = await getInviteInfo(token);
      if (i === null) setLoadFailed(true);
      setInfo(i);
      setLoading(false);
    })();
  }, [token, router]);

  async function handleLogout() {
    await signOutFit();
    router.replace(`/consultoria/login?redirect=${encodeURIComponent(`/consultoria/convite?token=${token}`)}`);
  }

  async function handleAccept() {
    setAccepting(true);
    setError(null);
    const res = await redeemInvite(token);
    if (res.ok) {
      window.location.href = "/consultoria/patient/inicio";
      return;
    }
    setError(REASON_LABEL[res.reason ?? "error"] ?? REASON_LABEL.error);
    setAccepting(false);
  }

  function body() {
    if (loading) return <div style={{ color: "#8ea3c0", fontSize: ".9rem", padding: "16px 0" }}>Carregando…</div>;

    if (isProfessional) {
      return (
        <div>
          <div style={{ color: "#efb04a", fontSize: ".9rem", marginTop: 6, lineHeight: 1.5 }}>{REASON_LABEL.is_professional}</div>
          <button onClick={handleLogout} style={dangerBtn}>Sair e entrar como paciente</button>
        </div>
      );
    }

    if (error && !info) return <div style={{ color: "#f08070", fontSize: ".88rem", padding: "8px 0" }}>{error}</div>;

    if (loadFailed) {
      return (
        <div>
          <div style={{ color: "#f08070", fontSize: ".9rem", marginTop: 6 }}>Não foi possível carregar o convite. Tente novamente em instantes.</div>
          <button onClick={() => location.reload()} style={ghostBtn}>Tentar de novo</button>
        </div>
      );
    }

    if (info && info.status !== "pending") {
      const key = info.status === "expired" ? "expired" : info.status === "revoked" ? "revoked" : info.status === "invalid" ? "invalid" : "used";
      return <div style={{ color: "#f08070", fontSize: ".9rem", marginTop: 6 }}>{REASON_LABEL[key]}</div>;
    }

    if (info) {
      return (
        <div>
          <h1 style={{ margin: "6px 0 0", fontSize: "1.3rem", fontWeight: 800, color: "#f2f6ff" }}>Você foi convidado(a)</h1>
          <p style={{ fontSize: ".9rem", color: "#c5d2e6", marginTop: 12, lineHeight: 1.5 }}>
            <strong style={{ color: "#b7a6ff" }}>{info.professional_name ?? "Seu profissional"}</strong> convidou você
            {info.patient_name ? <> como <strong style={{ color: "#e6edf6" }}>{info.patient_name}</strong></> : null} para
            acompanhar seus treinos e check-ins.
          </p>
          {error && (
            <div style={{ padding: "9px 12px", margin: "12px 0", background: "rgba(224,90,75,.1)", border: "1px solid rgba(224,90,75,.3)", borderRadius: 8, fontSize: ".82rem", color: "#f08070" }}>{error}</div>
          )}
          <button onClick={handleAccept} disabled={accepting} style={{ ...primaryBtn, opacity: accepting ? 0.6 : 1, cursor: accepting ? "default" : "pointer" }}>
            {accepting ? "Aceitando…" : "Aceitar convite"}
          </button>
        </div>
      );
    }

    return <div style={{ color: "#f08070", fontSize: ".88rem" }}>{REASON_LABEL.invalid}</div>;
  }

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 20 }}>
      <div style={cardStyle}>
        <div style={{ fontSize: ".8rem", color: "#8ea3c0", marginBottom: 6 }}>Convite — ConsultoriaFit</div>
        {body()}
      </div>
    </div>
  );
}

const primaryBtn: React.CSSProperties = {
  marginTop: 18, width: "100%", padding: "13px", borderRadius: 10, border: "none",
  background: "linear-gradient(135deg,#7c5cfc,#5b8def)", color: "#0b1120", fontWeight: 800, fontSize: ".92rem", fontFamily: "var(--font-sans)",
};
const dangerBtn: React.CSSProperties = {
  marginTop: 18, padding: "11px 16px", borderRadius: 10, border: "1px solid rgba(224,90,75,.35)",
  background: "transparent", color: "#f0857a", cursor: "pointer", fontFamily: "var(--font-sans)", fontSize: ".85rem", fontWeight: 600,
};
const ghostBtn: React.CSSProperties = {
  marginTop: 14, padding: "9px 14px", borderRadius: 10, border: "1px solid rgba(90,110,160,.4)",
  background: "transparent", color: "#c5d2e6", cursor: "pointer", fontFamily: "var(--font-sans)", fontSize: ".82rem", fontWeight: 600,
};

export default function ConvitePage() {
  return (
    <Suspense fallback={null}>
      <ConviteInner />
    </Suspense>
  );
}
