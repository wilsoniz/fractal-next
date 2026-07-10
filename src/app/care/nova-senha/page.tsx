"use client";

// Definir nova senha — destino do link de recuperação (/care/nova-senha).
// O Supabase cria a sessão de recuperação ao abrir o link; aqui salvamos a senha.
// PB-004 CM-A1: fluxo de reset estava quebrado (página não existia).

import { useEffect, useState } from "react";
import Link from "next/link";
import { FractaLogo } from "@/components/fracta/FractaLogo";
import { supabase } from "@/lib/supabase";

export default function NovaSenhaPage() {
  const [ready, setReady] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [senha, setSenha] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    // Dá um instante para o Supabase processar o token do link antes de checar a sessão.
    const t = setTimeout(async () => {
      const { data } = await supabase.auth.getSession();
      setHasSession(!!data.session);
      setReady(true);
    }, 600);
    return () => clearTimeout(t);
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (senha.length < 6) {
      setErro("A senha deve ter ao menos 6 caracteres.");
      return;
    }
    setSalvando(true);
    setErro(null);
    const { error } = await supabase.auth.updateUser({ password: senha });
    setSalvando(false);
    if (error) {
      setErro("Não foi possível salvar a nova senha. Tente novamente.");
      return;
    }
    setDone(true);
    setTimeout(() => { window.location.href = "/care/dashboard"; }, 1500);
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "13px 16px",
    border: "2px solid rgba(43,191,164,.2)", borderRadius: 14,
    fontFamily: "var(--font-sans)", fontSize: "1rem",
    color: "#1E3A5F", background: "#f7fdff",
    outline: "none", boxSizing: "border-box",
  };

  return (
    <div style={{
      minHeight: "100vh", fontFamily: "var(--font-sans)", color: "#1E3A5F",
      background: "radial-gradient(ellipse 80% 60% at 20% 10%, rgba(122,224,64,.10) 0%, transparent 55%), radial-gradient(ellipse 60% 70% at 80% 90%, rgba(43,191,164,.13) 0%, transparent 55%), linear-gradient(160deg,#e8f8ff 0%,#f0fdfb 35%,#edfff8 65%,#ddf4ff 100%)",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 18px",
    }}>
      <Link href="/" style={{ textDecoration: "none", marginBottom: 28 }}>
        <FractaLogo logo="care" height={36} alt="FractaCare" />
      </Link>

      <div style={{
        background: "rgba(255,255,255,.88)", backdropFilter: "blur(14px)",
        borderRadius: 24, border: "1px solid rgba(43,191,164,.18)",
        boxShadow: "0 8px 40px rgba(43,191,164,.10)",
        padding: "36px 32px", width: "100%", maxWidth: 420,
      }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: "2rem", marginBottom: 10 }}>🔒</div>
          <h1 style={{ fontSize: "1.2rem", fontWeight: 800, margin: 0 }}>Definir nova senha</h1>
        </div>

        {!ready ? (
          <p style={{ color: "#8a9ab8", fontSize: ".88rem", textAlign: "center" }}>Verificando o link...</p>
        ) : done ? (
          <div style={{
            background: "rgba(43,191,164,.08)", border: "1px solid rgba(43,191,164,.2)",
            borderRadius: 12, padding: "14px 16px", fontSize: ".88rem", color: "#1a7a6a", textAlign: "center",
          }}>
            ✅ Senha atualizada! Entrando no FractaCare...
          </div>
        ) : !hasSession ? (
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: ".88rem", color: "#dc2626", lineHeight: 1.6, marginBottom: 20 }}>
              Este link é inválido ou expirou. Peça um novo link de recuperação.
            </p>
            <Link href="/care/esqueci-senha" style={{
              display: "inline-block", padding: "12px 28px", borderRadius: 50,
              background: "linear-gradient(135deg,#2BBFA4,#7AE040)", color: "white",
              fontWeight: 700, fontSize: ".88rem", textDecoration: "none",
            }}>
              Pedir novo link
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {erro && (
              <div style={{
                background: "rgba(239,68,68,.08)", border: "1px solid rgba(239,68,68,.2)",
                borderRadius: 12, padding: "12px 16px", fontSize: ".85rem", color: "#dc2626",
              }}>
                ⚠️ {erro}
              </div>
            )}
            <div>
              <label style={{ display: "block", fontSize: ".82rem", fontWeight: 700, marginBottom: 6 }}>Nova senha</label>
              <input
                style={inputStyle} type="password" placeholder="Mínimo 6 caracteres"
                value={senha} onChange={e => setSenha(e.target.value)} minLength={6} required
              />
            </div>
            <button type="submit" disabled={salvando} style={{
              padding: "15px", borderRadius: 50, border: "none",
              background: salvando ? "rgba(43,191,164,.4)" : "linear-gradient(135deg,#2BBFA4,#7AE040)",
              color: "white", fontFamily: "var(--font-sans)", fontWeight: 800, fontSize: ".95rem",
              cursor: salvando ? "default" : "pointer",
              boxShadow: salvando ? "none" : "0 4px 18px rgba(43,191,164,.35)",
            }}>
              {salvando ? "Salvando..." : "Salvar nova senha"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
