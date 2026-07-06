"use client";

// Item 1 do MVP — Login/Registro da Plataforma de Consultoria.
// Auth própria (superfície separada do Fracta), com seletor de papel no registro.
// UI 100% PT-BR; valores internos (role) em inglês.

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signInFit, signUpFit, getFitUser, resetPasswordFit } from "@/lib/fit/supabase-fit";
import { ensureProfile } from "@/lib/fit/fit-profiles";
import type { FitRole } from "@/lib/fit/types";

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const redirect = params.get("redirect") ?? "/consultoria";

  const [tab, setTab] = useState<"login" | "register">("login");
  const [role, setRole] = useState<FitRole>("professional");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteInput, setInviteInput] = useState("");

  function goToInvite() {
    const v = inviteInput.trim();
    if (!v) return;
    let tk = v;
    const m = v.match(/[?&]token=([^&\s]+)/);
    if (m) tk = decodeURIComponent(m[1]);
    router.push(`/consultoria/convite?token=${encodeURIComponent(tk)}`);
  }

  const fromInvite = redirect.includes("/consultoria/convite");
  const [forgot, setForgot] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);

  // Já autenticado → segue direto.
  useEffect(() => {
    getFitUser().then(({ user }) => {
      if (user) router.replace(redirect);
    });
  }, [router, redirect]);

  // Vindo de um convite → já cria conta como Paciente.
  useEffect(() => {
    if (fromInvite) {
      setTab("register");
      setRole("patient");
    }
  }, [fromInvite]);

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await resetPasswordFit(email);
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setForgotSent(true);
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await signInFit(email, password);
    if (error) {
      setError(
        error.message === "Invalid login credentials"
          ? "Email ou senha incorretos"
          : error.message,
      );
      setLoading(false);
      return;
    }
    await ensureProfile();
    window.location.href = redirect;
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    const { data, error } = await signUpFit(email, password, nome, role);
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    // Se a confirmação de email estiver desligada, já há sessão → segue.
    if (data.session) {
      await ensureProfile();
      window.location.href = redirect;
      return;
    }

    setSuccess("Conta criada! Verifique seu email para confirmar o cadastro.");
    setLoading(false);
  }

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

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 0,
          background:
            "radial-gradient(ellipse at 25% 15%, rgba(124,92,252,.14) 0%, transparent 60%), radial-gradient(ellipse at 75% 85%, rgba(34,197,164,.10) 0%, transparent 60%)",
          pointerEvents: "none",
        }}
      />

      <div style={{ width: "100%", maxWidth: 420, position: "relative", zIndex: 1 }}>
        {/* Marca */}
        <div style={{ textAlign: "center", marginBottom: 30 }}>
          <div style={{ fontSize: "1.55rem", fontWeight: 800, color: "#f2f6ff", letterSpacing: "-.02em" }}>
            Consultoria<span style={{ color: "#7c5cfc" }}>Fit</span>
          </div>
          <div style={{ fontSize: ".82rem", color: "#8ea3c0", marginTop: 6 }}>
            Acompanhamento de treino, performance e reabilitação
          </div>
        </div>

        {/* Card */}
        <div
          style={{
            background: "rgba(20,28,48,.85)",
            border: "1px solid rgba(90,110,160,.35)",
            borderRadius: 18,
            overflow: "hidden",
          }}
        >
          <div style={{ display: "flex", borderBottom: "1px solid rgba(90,110,160,.25)" }}>
            {(["login", "register"] as const).map((t) => (
              <button
                key={t}
                onClick={() => {
                  setTab(t);
                  setError(null);
                  setSuccess(null);
                }}
                style={{
                  flex: 1,
                  padding: "14px 0",
                  background: "none",
                  border: "none",
                  borderBottom: `2px solid ${tab === t ? "#7c5cfc" : "transparent"}`,
                  color: tab === t ? "#b7a6ff" : "#8ea3c0",
                  fontFamily: "var(--font-sans)",
                  fontWeight: tab === t ? 700 : 400,
                  fontSize: ".88rem",
                  cursor: "pointer",
                  marginBottom: -1,
                }}
              >
                {t === "login" ? "Entrar" : "Criar conta"}
              </button>
            ))}
          </div>

          <div style={{ padding: 28 }}>
            {error && (
              <div
                style={{
                  padding: "10px 14px",
                  marginBottom: 16,
                  background: "rgba(224,90,75,.1)",
                  border: "1px solid rgba(224,90,75,.3)",
                  borderRadius: 9,
                  fontSize: ".82rem",
                  color: "#f08070",
                }}
              >
                {error}
              </div>
            )}
            {success && (
              <div
                style={{
                  padding: "10px 14px",
                  marginBottom: 16,
                  background: "rgba(34,197,164,.1)",
                  border: "1px solid rgba(34,197,164,.3)",
                  borderRadius: 9,
                  fontSize: ".82rem",
                  color: "#3fd6ad",
                }}
              >
                {success}
              </div>
            )}

            {tab === "login" && forgot ? (
              <form onSubmit={handleForgot} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {forgotSent ? (
                  <div style={{ fontSize: ".85rem", color: "#3fd6ad", lineHeight: 1.5 }}>
                    Se existir uma conta com esse email, enviamos um link para redefinir a senha. Verifique sua caixa de entrada.
                  </div>
                ) : (
                  <>
                    <div style={{ fontSize: ".82rem", color: "#9fb2cf" }}>Informe seu email para receber o link de redefinição.</div>
                    <Field label="Email">
                      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" required style={inp} />
                    </Field>
                    <SubmitButton loading={loading} label="Enviar link" loadingLabel="Enviando..." />
                  </>
                )}
                <button type="button" onClick={() => { setForgot(false); setForgotSent(false); setError(null); }} style={{ background: "none", border: "none", color: "#8ea3c0", cursor: "pointer", fontSize: ".8rem", fontFamily: "var(--font-sans)" }}>
                  ← Voltar ao login
                </button>
              </form>
            ) : tab === "login" ? (
              <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <Field label="Email">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    required
                    style={inp}
                  />
                </Field>
                <Field label="Senha">
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    style={inp}
                  />
                </Field>
                <div style={{ textAlign: "right", marginTop: -6 }}>
                  <button type="button" onClick={() => { setForgot(true); setError(null); }} style={{ background: "none", border: "none", color: "#8ea3c0", cursor: "pointer", fontSize: ".76rem", fontFamily: "var(--font-sans)" }}>
                    Esqueci a senha
                  </button>
                </div>
                <SubmitButton loading={loading} label="Entrar" loadingLabel="Entrando..." />
              </form>
            ) : (
              <form onSubmit={handleRegister} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {fromInvite && (
                  <div style={{ padding: "9px 12px", background: "rgba(124,92,252,.1)", border: "1px solid rgba(124,92,252,.3)", borderRadius: 9, fontSize: ".8rem", color: "#b7a6ff" }}>
                    Você está criando sua conta de <strong>paciente</strong> para aceitar o convite.
                  </div>
                )}
                {/* Seletor de papel */}
                <div>
                  <label style={labelStyle}>Sou</label>
                  <div style={{ display: "flex", gap: 8 }}>
                    {(
                      [
                        { v: "professional", t: "Profissional" },
                        { v: "patient", t: "Paciente" },
                      ] as const
                    ).map((opt) => (
                      <button
                        type="button"
                        key={opt.v}
                        onClick={() => setRole(opt.v)}
                        style={{
                          flex: 1,
                          padding: "10px 0",
                          borderRadius: 10,
                          cursor: "pointer",
                          fontFamily: "var(--font-sans)",
                          fontSize: ".85rem",
                          fontWeight: 600,
                          border: `1px solid ${role === opt.v ? "#7c5cfc" : "rgba(90,110,160,.45)"}`,
                          background: role === opt.v ? "rgba(124,92,252,.16)" : "transparent",
                          color: role === opt.v ? "#b7a6ff" : "#9fb2cf",
                        }}
                      >
                        {opt.t}
                      </button>
                    ))}
                  </div>
                </div>
                <Field label="Nome completo">
                  <input
                    type="text"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Seu nome"
                    required
                    style={inp}
                  />
                </Field>
                <Field label="Email">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    required
                    style={inp}
                  />
                </Field>
                <Field label="Senha">
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="mínimo 8 caracteres"
                    required
                    minLength={8}
                    style={inp}
                  />
                </Field>
                <SubmitButton loading={loading} label="Criar conta" loadingLabel="Criando conta..." />
              </form>
            )}
          </div>
        </div>

        {/* Atalho paciente / convite */}
        <div style={{ textAlign: "center", marginTop: 18 }}>
          {!showInvite ? (
            <button
              onClick={() => setShowInvite(true)}
              style={{ background: "none", border: "none", color: "#8ea3c0", cursor: "pointer", fontSize: ".8rem", fontFamily: "var(--font-sans)", textDecoration: "underline" }}
            >
              Sou paciente / tenho um convite
            </button>
          ) : (
            <div style={{ display: "flex", gap: 8 }}>
              <input
                value={inviteInput}
                onChange={(e) => setInviteInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && goToInvite()}
                placeholder="Cole o link ou o token do convite"
                style={{ ...inp, flex: 1 }}
              />
              <button
                onClick={goToInvite}
                style={{ padding: "10px 16px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#7c5cfc,#5b8def)", color: "#0b1120", fontWeight: 800, fontSize: ".84rem", cursor: "pointer", fontFamily: "var(--font-sans)", whiteSpace: "nowrap" }}
              >
                Ir
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: ".75rem",
  fontWeight: 600,
  color: "#a7bad6",
  marginBottom: 6,
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  );
}

function SubmitButton({
  loading,
  label,
  loadingLabel,
}: {
  loading: boolean;
  label: string;
  loadingLabel: string;
}) {
  return (
    <button
      type="submit"
      disabled={loading}
      style={{
        marginTop: 6,
        padding: "13px",
        borderRadius: 10,
        border: "none",
        background: loading ? "rgba(124,92,252,.4)" : "linear-gradient(135deg,#7c5cfc,#5b8def)",
        color: "#0b1120",
        fontFamily: "var(--font-sans)",
        fontWeight: 800,
        fontSize: ".95rem",
        cursor: loading ? "default" : "pointer",
      }}
    >
      {loading ? loadingLabel : label}
    </button>
  );
}

export default function ConsultoriaLoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}
