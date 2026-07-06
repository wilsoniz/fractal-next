"use client";

// Guard + shell da área do paciente. Faz o auto-vínculo (fn_fit_link_self) no 1º acesso.
// Se não vinculado → estado "aguardando vínculo". role='professional' → área do profissional.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getFitUser, signOutFit } from "@/lib/fit/supabase-fit";
import { ensureProfile } from "@/lib/fit/fit-profiles";
import { ensurePatientLink, getLinkedPatient } from "@/lib/fit/fit-linking";
import { FitPatientNav } from "@/components/fit/FitPatientNav";
import { PatientProvider } from "./_context";
import type { FitPatient } from "@/lib/fit/types";

type State = { phase: "loading" } | { phase: "unlinked" } | { phase: "ready"; patient: FitPatient };

export default function PatientLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<State>({ phase: "loading" });
  const [inviteInput, setInviteInput] = useState("");

  function goToInvite() {
    const v = inviteInput.trim();
    if (!v) return;
    let token = v;
    const m = v.match(/[?&]token=([^&\s]+)/);
    if (m) token = decodeURIComponent(m[1]);
    router.push(`/consultoria/convite?token=${encodeURIComponent(token)}`);
  }

  useEffect(() => {
    (async () => {
      const { user } = await getFitUser();
      if (!user) {
        router.replace("/consultoria/login");
        return;
      }
      const profile = await ensureProfile();
      if (!profile) {
        router.replace("/consultoria/login");
        return;
      }
      if (profile.role === "professional") {
        router.replace("/consultoria/professional/dashboard");
        return;
      }
      await ensurePatientLink();
      const patient = await getLinkedPatient();
      setState(patient ? { phase: "ready", patient } : { phase: "unlinked" });
    })();
  }, [router]);

  async function handleLogout() {
    await signOutFit();
    router.replace("/consultoria/login");
  }

  if (state.phase === "loading") {
    return <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", color: "#8ea3c0" }}>Carregando…</div>;
  }

  if (state.phase === "unlinked") {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
        <div style={{ maxWidth: 420, textAlign: "center" }}>
          <h1 style={{ fontSize: "1.3rem", fontWeight: 800, color: "#f2f6ff", margin: 0 }}>Conta ainda não vinculada</h1>
          <p style={{ fontSize: ".88rem", color: "#9fb2cf", marginTop: 12, lineHeight: 1.5 }}>
            Não encontramos uma ficha de paciente para o seu email. Use o link de convite do seu
            profissional — ou peça para ele cadastrar você com este mesmo email (vínculo automático).
          </p>

          <div style={{ marginTop: 18, textAlign: "left" }}>
            <label style={{ display: "block", fontSize: ".74rem", fontWeight: 600, color: "#a7bad6", marginBottom: 6 }}>Tenho um convite</label>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                value={inviteInput}
                onChange={(e) => setInviteInput(e.target.value)}
                placeholder="Cole o link ou o token"
                style={{ flex: 1, padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(90,110,160,.4)", background: "rgba(15,22,40,.7)", color: "#e6edf6", fontFamily: "var(--font-sans)", fontSize: ".85rem", outline: "none", boxSizing: "border-box" }}
              />
              <button onClick={goToInvite} style={{ padding: "10px 16px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#7c5cfc,#5b8def)", color: "#0b1120", fontWeight: 800, fontSize: ".84rem", cursor: "pointer", fontFamily: "var(--font-sans)", whiteSpace: "nowrap" }}>Usar</button>
            </div>
          </div>

          <button onClick={handleLogout} style={{ marginTop: 20, padding: "10px 16px", borderRadius: 10, border: "1px solid rgba(224,90,75,.35)", background: "transparent", color: "#f0857a", cursor: "pointer", fontFamily: "var(--font-sans)", fontSize: ".85rem", fontWeight: 600 }}>Sair</button>
        </div>
      </div>
    );
  }

  return (
    <PatientProvider patient={state.patient}>
      <div style={{ minHeight: "100vh", paddingBottom: 78 }}>
        <main style={{ maxWidth: 560, margin: "0 auto", padding: "20px 16px 24px" }}>{children}</main>
        <FitPatientNav />
      </div>
    </PatientProvider>
  );
}
