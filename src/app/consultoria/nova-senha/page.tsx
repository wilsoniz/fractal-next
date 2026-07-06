"use client";

// Definir nova senha — destino do link de recuperação (/consultoria/nova-senha).
// O Supabase cria a sessão de recuperação ao abrir o link; aqui salvamos a senha.

import { useEffect, useState } from "react";
import { getFitUser, updatePasswordFit } from "@/lib/fit/supabase-fit";

const card: React.CSSProperties = {
  width: "100%",
  maxWidth: 420,
  background: "rgba(20,28,48,.85)",
  border: "1px solid rgba(90,110,160,.35)",
  borderRadius: 18,
  padding: 28,
};
const inp: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 10,
  border: "1px solid rgba(90,110,160,.45)",
  background: "rgba(15,22,40,.7)",
  color: "#e6edf6",
  fontFamily: "var(--font-sans)",
  fontSize: ".9rem",
  outline: "none",
  boxSizing: "border-box",
};

export default function NovaSenhaPage() {
  const [ready, setReady] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    // Dá um instante para o Supabase processar o token do link antes de checar a sessão.
    const t = setTimeout(async () => {
      const { user } = await getFitUser();
      setHasSession(!!user);
      setReady(true);
    }, 600);
    return () => clearTimeout(t);
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      setError("A senha deve ter ao menos 8 caracteres.");
      return;
    }
    setSaving(true);
    setError(null);
    const { error } = await updatePasswordFit(password);
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    setDone(true);
    setTimeout(() => { window.location.href = "/consultoria"; }, 1500);
  }

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 20 }}>
      <div style={card}>
        <div style={{ fontSize: ".8rem", color: "#8ea3c0", marginBottom: 6 }}>ConsultoriaFit</div>
        <h1 style={{ margin: "2px 0 14px", fontSize: "1.3rem", fontWeight: 800, color: "#f2f6ff" }}>Definir nova senha</h1>

        {!ready ? (
          <div style={{ color: "#8ea3c0", fontSize: ".88rem" }}>Carregando…</div>
        ) : done ? (
          <div style={{ color: "#3fd6ad", fontSize: ".9rem" }}>Senha atualizada! Redirecionando…</div>
        ) : !hasSession ? (
          <div style={{ color: "#f08070", fontSize: ".88rem", lineHeight: 1.5 }}>
            Link inválido ou expirado. Volte ao login e use “Esqueci a senha” novamente.
          </div>
        ) : (
          <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {error && (
              <div style={{ padding: "10px 14px", background: "rgba(224,90,75,.1)", border: "1px solid rgba(224,90,75,.3)", borderRadius: 9, fontSize: ".82rem", color: "#f08070" }}>{error}</div>
            )}
            <div>
              <label style={{ display: "block", fontSize: ".75rem", fontWeight: 600, color: "#a7bad6", marginBottom: 6 }}>Nova senha</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="mínimo 8 caracteres" minLength={8} required style={inp} />
            </div>
            <button type="submit" disabled={saving} style={{ padding: "13px", borderRadius: 10, border: "none", background: saving ? "rgba(124,92,252,.4)" : "linear-gradient(135deg,#7c5cfc,#5b8def)", color: "#0b1120", fontWeight: 800, fontSize: ".95rem", cursor: saving ? "default" : "pointer", fontFamily: "var(--font-sans)" }}>
              {saving ? "Salvando…" : "Salvar nova senha"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
