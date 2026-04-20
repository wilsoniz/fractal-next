"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { FractalTriangle } from "@/components/fracta/FractalTriangle";

function ClinicLoginPageInner() {
  const router      = useRouter();
  const params      = useSearchParams();
  const redirect    = params.get("redirect") ?? "/clinic/dashboard";

  const [tab,       setTab]     = useState<"login" | "register">("login");
  const [email,     setEmail]   = useState("");
  const [password,  setPass]    = useState("");
  const [nome,      setNome]    = useState("");
  const [loading,   setLoading] = useState(false);
  const [error,     setError]   = useState<string | null>(null);
  const [success,   setSuccess] = useState<string | null>(null);

  // Se já tem sessão ativa, redireciona direto
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setTimeout(() => { window.location.href = redirect; }, 500);
    });
  }, []);

  async function handleLogin(e: React.FormEvent) {
  e.preventDefault();
  setLoading(true);
  setError(null);

  const { error, data } = await supabase.auth.signInWithPassword({ email, password });
  
  console.log("LOGIN RESULT:", { data, error }); // adiciona essa linha
  
  if (error) {
      setError(
        error.message === "Invalid login credentials"
          ? "Email ou senha incorretos"
          : error.message
      );
      setLoading(false);
      return;
    }

    setTimeout(() => { window.location.href = redirect; }, 500);
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { nome } },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    // Cria perfil na tabela profiles
    if (data.user) {
      await supabase.from("profiles").upsert({
        id: data.user.id,
        nome,
        email,
        nivel_senioridade: "terapeuta",
      });
    }

    setSuccess("Conta criada! Verifique seu email para confirmar o cadastro.");
    setLoading(false);
  }

  // ── CSS ──────────────────────────────────────────────────────────────────
  const inp: React.CSSProperties = {
    width: "100%",
    padding: "12px 14px",
    borderRadius: 10,
    border: "1px solid rgba(70,120,180,.5)",
    background: "rgba(15,40,75,.7)",
    color: "#daeeff",
    fontFamily: "var(--font-sans)",
    fontSize: ".9rem",
    outline: "none",
    boxSizing: "border-box",
    transition: "border-color .2s",
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#07111f",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "var(--font-sans)",
      padding: 20,
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Gradiente de fundo */}
      <div style={{
        position: "absolute", inset: 0, zIndex: 0,
        background: "radial-gradient(ellipse at 30% 20%, rgba(29,158,117,.12) 0%, transparent 60%), radial-gradient(ellipse at 70% 80%, rgba(55,138,221,.1) 0%, transparent 60%)",
        pointerEvents: "none",
      }} />

      <div style={{ width: "100%", maxWidth: 420, position: "relative", zIndex: 1 }}>

        {/* Logo */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 36 }}>
          <FractalTriangle size={52} animate style={{ filter: "hue-rotate(160deg) saturate(1.2)", marginBottom: 14 }} />
          <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "#f0f6ff", letterSpacing: "-.02em" }}>
            Fracta<span style={{ color: "#1D9E75" }}>Clinic</span>
          </div>
          <div style={{ fontSize: ".82rem", color: "#8ab8d8", marginTop: 6 }}>
            Plataforma clínica para terapeutas ABA
          </div>
        </div>

        {/* Card */}
        <div style={{
          background: "rgba(13,32,53,.85)",
          border: "1px solid rgba(55,90,130,.45)",
          borderRadius: 18,
          backdropFilter: "blur(20px)",
          overflow: "hidden",
        }}>
          {/* Tabs */}
          <div style={{ display: "flex", borderBottom: "1px solid rgba(55,90,130,.3)" }}>
            {(["login", "register"] as const).map(t => (
              <button key={t} onClick={() => { setTab(t); setError(null); setSuccess(null); }} style={{
                flex: 1, padding: "14px 0",
                background: "none", border: "none",
                borderBottom: `2px solid ${tab === t ? "#1D9E75" : "transparent"}`,
                color: tab === t ? "#1D9E75" : "#8ab8d8",
                fontFamily: "var(--font-sans)", fontWeight: tab === t ? 700 : 400,
                fontSize: ".88rem", cursor: "pointer", marginBottom: -1,
                transition: "color .2s",
              }}>
                {t === "login" ? "Entrar" : "Criar conta"}
              </button>
            ))}
          </div>

          <div style={{ padding: 28 }}>

            {/* Erro */}
            {error && (
              <div style={{ padding: "10px 14px", marginBottom: 16, background: "rgba(224,90,75,.1)", border: "1px solid rgba(224,90,75,.3)", borderRadius: 9, fontSize: ".82rem", color: "#f08070" }}>
                {error}
              </div>
            )}

            {/* Sucesso */}
            {success && (
              <div style={{ padding: "10px 14px", marginBottom: 16, background: "rgba(29,158,117,.1)", border: "1px solid rgba(29,158,117,.3)", borderRadius: 9, fontSize: ".82rem", color: "#1D9E75" }}>
                {success}
              </div>
            )}

            {/* ── LOGIN ── */}
            {tab === "login" && (
              <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <label style={{ display: "block", fontSize: ".75rem", fontWeight: 600, color: "#a8ccec", marginBottom: 6 }}>Email</label>
                  <input
                    type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="seu@email.com" required style={inp}
                    onFocus={e => e.target.style.borderColor = "rgba(29,158,117,.7)"}
                    onBlur={e => e.target.style.borderColor = "rgba(70,120,180,.5)"}
                  />
                </div>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <label style={{ fontSize: ".75rem", fontWeight: 600, color: "#a8ccec" }}>Senha</label>
                    <button type="button" style={{ fontSize: ".72rem", color: "#1D9E75", background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-sans)" }}>
                      Esqueci a senha
                    </button>
                  </div>
                  <input
                    type="password" value={password} onChange={e => setPass(e.target.value)}
                    placeholder="••••••••" required style={inp}
                    onFocus={e => e.target.style.borderColor = "rgba(29,158,117,.7)"}
                    onBlur={e => e.target.style.borderColor = "rgba(70,120,180,.5)"}
                  />
                </div>
                <button type="submit" disabled={loading} style={{
                  marginTop: 6, padding: "13px", borderRadius: 10, border: "none",
                  background: loading ? "rgba(29,158,117,.4)" : "linear-gradient(135deg,#1D9E75,#0f8f7a)",
                  color: "#07111f", fontFamily: "var(--font-sans)",
                  fontWeight: 800, fontSize: ".95rem", cursor: loading ? "default" : "pointer",
                  transition: "opacity .2s",
                }}>
                  {loading ? "Entrando..." : "Entrar no FractaClinic"}
                </button>
              </form>
            )}

            {/* ── REGISTER ── */}
            {tab === "register" && (
              <form onSubmit={handleRegister} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <label style={{ display: "block", fontSize: ".75rem", fontWeight: 600, color: "#a8ccec", marginBottom: 6 }}>Nome completo</label>
                  <input
                    type="text" value={nome} onChange={e => setNome(e.target.value)}
                    placeholder="Dr. Carolina Amaral" required style={inp}
                    onFocus={e => e.target.style.borderColor = "rgba(29,158,117,.7)"}
                    onBlur={e => e.target.style.borderColor = "rgba(70,120,180,.5)"}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: ".75rem", fontWeight: 600, color: "#a8ccec", marginBottom: 6 }}>Email</label>
                  <input
                    type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="seu@email.com" required style={inp}
                    onFocus={e => e.target.style.borderColor = "rgba(29,158,117,.7)"}
                    onBlur={e => e.target.style.borderColor = "rgba(70,120,180,.5)"}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: ".75rem", fontWeight: 600, color: "#a8ccec", marginBottom: 6 }}>Senha</label>
                  <input
                    type="password" value={password} onChange={e => setPass(e.target.value)}
                    placeholder="mínimo 8 caracteres" required minLength={8} style={inp}
                    onFocus={e => e.target.style.borderColor = "rgba(29,158,117,.7)"}
                    onBlur={e => e.target.style.borderColor = "rgba(70,120,180,.5)"}
                  />
                </div>
                <div style={{ padding: "10px 14px", background: "rgba(29,158,117,.06)", border: "1px solid rgba(29,158,117,.2)", borderRadius: 9 }}>
                  <div style={{ fontSize: ".72rem", color: "#1D9E75", fontWeight: 600, marginBottom: 3 }}>Nível inicial: Terapeuta</div>
                  <div style={{ fontSize: ".7rem", color: "#8ab8d8" }}>Você pode avançar para Coordenador e Supervisor via módulo de Supervisão</div>
                </div>
                <button type="submit" disabled={loading} style={{
                  marginTop: 6, padding: "13px", borderRadius: 10, border: "none",
                  background: loading ? "rgba(29,158,117,.4)" : "linear-gradient(135deg,#1D9E75,#0f8f7a)",
                  color: "#07111f", fontFamily: "var(--font-sans)",
                  fontWeight: 800, fontSize: ".95rem", cursor: loading ? "default" : "pointer",
                }}>
                  {loading ? "Criando conta..." : "Criar conta"}
                </button>
              </form>
            )}

          </div>
        </div>

        {/* Rodapé */}
        <div style={{ textAlign: "center", marginTop: 20, fontSize: ".72rem", color: "#8ab8d8" }}>
          Parte do ecossistema{" "}
          <Link href="/" style={{ color: "#1D9E75", textDecoration: "none", fontWeight: 600 }}>
            Fracta Behavior
          </Link>
        </div>

      </div>
    </div>
  );
}

export default function ClinicLoginPage() {
  return <Suspense fallback={null}><ClinicLoginPageInner /></Suspense>;
}
