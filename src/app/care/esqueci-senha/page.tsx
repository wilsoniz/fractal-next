"use client";
import { useState } from "react";
import Link from "next/link";
import { FractaLogo } from "@/components/fracta/FractaLogo";
import { supabase } from "@/lib/supabase";

type Fase = "form" | "enviado";

export default function EsqueciSenhaPage() {
  const [email,  setEmail]  = useState("");
  const [loading, setLoading] = useState(false);
  const [erro,   setErro]   = useState("");
  const [fase,   setFase]   = useState<Fase>("form");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(""); setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/care/nova-senha`,
    });

    setLoading(false);

    if (error) {
      setErro("Não foi possível enviar o e-mail. Verifique o endereço.");
      return;
    }

    setFase("enviado");
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "13px 16px",
    border: "2px solid rgba(43,191,164,.2)", borderRadius: 14,
    fontFamily: "var(--font-sans)", fontSize: "1rem",
    color: "#1E3A5F", background: "#f7fdff",
    outline: "none", boxSizing: "border-box", transition: "border-color .2s",
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
        {fase === "form" ? (
          <>
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <div style={{ fontSize: "2rem", marginBottom: 10 }}>🔑</div>
              <h2 style={{ fontSize: "1.3rem", fontWeight: 800, color: "#1E3A5F", marginBottom: 6 }}>Esqueceu a senha?</h2>
              <p style={{ fontSize: ".85rem", color: "#8a9ab8", lineHeight: 1.6 }}>
                Informe seu e-mail e enviaremos um link para criar uma nova senha.
              </p>
            </div>

            {erro && (
              <div style={{ background: "rgba(239,68,68,.08)", border: "1px solid rgba(239,68,68,.2)", borderRadius: 12, padding: "12px 16px", marginBottom: 18, fontSize: ".85rem", color: "#dc2626", display: "flex", gap: 8 }}>
                <span>⚠️</span> {erro}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: ".82rem", fontWeight: 700, color: "#1E3A5F", marginBottom: 6 }}>E-mail</label>
                <input style={inputStyle} type="email" placeholder="seu@email.com"
                  value={email} onChange={e => setEmail(e.target.value)} required
                  onFocus={e => (e.target.style.borderColor = "#2BBFA4")}
                  onBlur={e  => (e.target.style.borderColor = "rgba(43,191,164,.2)")}
                />
              </div>
              <button type="submit" disabled={loading} style={{
                padding: "15px", borderRadius: 50, border: "none",
                background: loading ? "rgba(43,191,164,.4)" : "linear-gradient(135deg,#2BBFA4,#7AE040)",
                color: "white", fontFamily: "var(--font-sans)", fontWeight: 800, fontSize: ".95rem",
                cursor: loading ? "default" : "pointer",
                boxShadow: loading ? "none" : "0 4px 18px rgba(43,191,164,.35)",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              }}>
                {loading ? (
                  <>
                    <div style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,.3)", borderTop: "2px solid white", borderRadius: "50%", animation: "spin .7s linear infinite" }} />
                    Enviando...
                  </>
                ) : "Enviar link de recuperação"}
              </button>
            </form>
          </>
        ) : (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: 14 }}>📬</div>
            <h2 style={{ fontSize: "1.2rem", fontWeight: 800, color: "#1E3A5F", marginBottom: 10 }}>E-mail enviado!</h2>
            <p style={{ fontSize: ".88rem", color: "#8a9ab8", lineHeight: 1.7, marginBottom: 24 }}>
              Enviamos um link para <strong style={{ color: "#1E3A5F" }}>{email}</strong>. Verifique sua caixa de entrada e clique no link para criar uma nova senha.
            </p>
            <p style={{ fontSize: ".75rem", color: "#aabbcc" }}>Não recebeu? Verifique o spam ou tente novamente.</p>
          </div>
        )}
      </div>

      <Link href="/care/login" style={{ marginTop: 20, fontSize: ".8rem", color: "#8a9ab8", textDecoration: "none" }}>
        ← Voltar para o login
      </Link>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
