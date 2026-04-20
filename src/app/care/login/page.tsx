"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { FractaLogo } from "@/components/fracta/FractaLogo";
import { supabase } from "@/lib/supabase";

type Aba = "login" | "cadastro";

function LoginPageInner() {
  const searchParams = useSearchParams();
  const redirect     = searchParams.get("redirect") || "/care";

  const [aba,      setAba]      = useState<Aba>("login");
  const [email,    setEmail]    = useState("");
  const [senha,    setSenha]    = useState("");
  const [nome,     setNome]     = useState("");
  const [loading,  setLoading]  = useState(false);
  const [erro,     setErro]     = useState("");
  const [checking, setChecking] = useState(true);

  // Verifica sessão — se já logado vai direto
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        window.location.replace(redirect);
      } else {
        setChecking(false);
      }
    });
  }, [redirect]);

  // ── Login ────────────────────────────────────────────────
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setErro(""); setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: senha,
    });

    if (error) {
      setErro(
        error.message.includes("Invalid login")
          ? "E-mail ou senha incorretos."
          : error.message.includes("Email not confirmed")
          ? "Confirme seu e-mail antes de entrar."
          : "Erro ao entrar. Tente novamente."
      );
      setLoading(false);
      return;
    }

    if (data.session) {
      // Sessão confirmada — redirect completo
      window.location.replace(redirect);
    }
  }

  // ── Cadastro ─────────────────────────────────────────────
  async function handleCadastro(e: React.FormEvent) {
    e.preventDefault();
    setErro(""); setLoading(true);

    if (!nome.trim())         { setErro("Informe seu nome."); setLoading(false); return; }
    if (!email.includes("@")) { setErro("E-mail inválido."); setLoading(false); return; }
    if (senha.length < 6)     { setErro("Senha com mínimo 6 caracteres."); setLoading(false); return; }

    const { data, error } = await supabase.auth.signUp({
      email,
      password: senha,
      options: { data: { nome } },
    });

    if (error) {
      setErro(
        error.message.includes("already registered")
          ? "E-mail já cadastrado. Faça login."
          : "Erro ao criar conta. Tente novamente."
      );
      setLoading(false);
      return;
    }

    // Cria perfil e dados da criança em paralelo
    if (data.user) {
      const userId = data.user.id;
      await supabase.from("perfis").upsert({ id: userId, nome, email });

      const nomeCrianca  = sessionStorage.getItem("fracta_nome");
      const idadeCrianca = sessionStorage.getItem("fracta_idade");
      const radarStr     = sessionStorage.getItem("fracta_radar");
      const avalId       = sessionStorage.getItem("fracta_avaliacao_id");

      if (nomeCrianca && idadeCrianca) {
        const anoNasc = new Date().getFullYear() - parseInt(idadeCrianca);
        const { data: criancaData } = await supabase
          .from("criancas")
          .insert({
            responsavel_id: userId,
            nome: nomeCrianca,
            data_nascimento: `${anoNasc}-01-01`,
            idade_anos: parseInt(idadeCrianca),
          })
          .select()
          .single();

        if (criancaData && radarStr) {
          const r = JSON.parse(radarStr);
          await supabase.from("radar_snapshots").insert({
            crianca_id:          criancaData.id,
            avaliacao_id:        avalId || null,
            score_comunicacao:   r.comunicacao   ?? null,
            score_social:        r.social        ?? null,
            score_atencao:       r.atencao       ?? null,
            score_regulacao:     r.regulacao     ?? null,
            score_brincadeira:   r.brincadeira   ?? null,
            score_flexibilidade: r.flexibilidade ?? null,
            score_autonomia:     r.autonomia     ?? null,
            score_motivacao:     r.motivacao     ?? null,
          });
          sessionStorage.setItem("fracta_crianca_id", criancaData.id);
        }

        if (avalId) {
          await supabase.from("avaliacoes")
            .update({ responsavel_id: userId, convertido: true })
            .eq("id", avalId);
        }
      }
    }

    if (data.session) {
      // Confirmação de email desativada — vai direto
      window.location.replace(redirect);
    } else {
      // Confirmação de email ativada — mostra mensagem
      setLoading(false);
      setErro(""); 
      // Mostra mensagem inline trocando o form
      setAba("login");
      setErro("Conta criada! Verifique seu e-mail para confirmar antes de entrar.");
    }
  }

  // ── Loading inicial ──────────────────────────────────────
  if (checking) {
    return (
      <div style={{
        minHeight: "100vh", display: "flex", alignItems: "center",
        justifyContent: "center", fontFamily: "var(--font-sans)",
        background: "radial-gradient(ellipse 80% 60% at 20% 10%, rgba(122,224,64,.10) 0%, transparent 55%), linear-gradient(160deg,#e8f8ff 0%,#f0fdfb 50%,#ddf4ff 100%)",
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 36, height: 36, border: "3px solid rgba(43,191,164,.2)", borderTop: "3px solid #2BBFA4", borderRadius: "50%", animation: "spin .8s linear infinite", margin: "0 auto 12px" }} />
          <p style={{ color: "#8a9ab8", fontSize: ".85rem", fontFamily: "var(--font-sans)" }}>Carregando...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ── Estilos ──────────────────────────────────────────────
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
        {/* Abas */}
        <div style={{ display: "flex", background: "rgba(43,191,164,.08)", borderRadius: 14, padding: 4, marginBottom: 28 }}>
          {(["login","cadastro"] as Aba[]).map(a => (
            <button key={a} onClick={() => { setAba(a); setErro(""); }} style={{
              flex: 1, padding: "10px", borderRadius: 11, border: "none",
              background: aba === a ? "white" : "transparent",
              color: aba === a ? "#1E3A5F" : "#8a9ab8",
              fontFamily: "var(--font-sans)", fontWeight: 700, fontSize: ".88rem",
              cursor: "pointer", boxShadow: aba === a ? "0 2px 8px rgba(43,191,164,.15)" : "none",
              transition: "all .2s",
            }}>
              {a === "login" ? "Entrar" : "Criar conta"}
            </button>
          ))}
        </div>

        {/* Mensagem de erro/info */}
        {erro && (
          <div style={{
            background: erro.includes("Conta criada") ? "rgba(43,191,164,.08)" : "rgba(239,68,68,.08)",
            border: `1px solid ${erro.includes("Conta criada") ? "rgba(43,191,164,.2)" : "rgba(239,68,68,.2)"}`,
            borderRadius: 12, padding: "12px 16px", marginBottom: 18,
            fontSize: ".85rem", color: erro.includes("Conta criada") ? "#1a7a6a" : "#dc2626",
            display: "flex", gap: 8, alignItems: "flex-start", lineHeight: 1.5,
          }}>
            <span style={{ flexShrink: 0 }}>{erro.includes("Conta criada") ? "✅" : "⚠️"}</span>
            {erro}
          </div>
        )}

        {/* ── LOGIN ── */}
        {aba === "login" && (
          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={{ display: "block", fontSize: ".82rem", fontWeight: 700, color: "#1E3A5F", marginBottom: 6 }}>E-mail</label>
              <input style={inputStyle} type="email" placeholder="seu@email.com"
                value={email} onChange={e => setEmail(e.target.value)} required
                onFocus={e => (e.target.style.borderColor = "#2BBFA4")}
                onBlur={e  => (e.target.style.borderColor = "rgba(43,191,164,.2)")}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: ".82rem", fontWeight: 700, color: "#1E3A5F", marginBottom: 6 }}>Senha</label>
              <input style={inputStyle} type="password" placeholder="Sua senha"
                value={senha} onChange={e => setSenha(e.target.value)} required
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
                  Entrando...
                </>
              ) : "Entrar no FractaCare →"}
            </button>
            <div style={{ textAlign: "right", marginTop: -4 }}>
              <Link href="/care/esqueci-senha" style={{ fontSize: ".75rem", color: "#8a9ab8", textDecoration: "none" }}>
                Esqueci minha senha
              </Link>
            </div>
            <p style={{ textAlign: "center", fontSize: ".78rem", color: "#8a9ab8", margin: 0 }}>
              Não tem conta?{" "}
              <button type="button" onClick={() => { setAba("cadastro"); setErro(""); }} style={{ background: "none", border: "none", color: "#2BBFA4", fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-sans)", fontSize: ".78rem" }}>
                Criar gratuitamente
              </button>
            </p>
          </form>
        )}

        {/* ── CADASTRO ── */}
        {aba === "cadastro" && (
          <form onSubmit={handleCadastro} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={{ display: "block", fontSize: ".82rem", fontWeight: 700, color: "#1E3A5F", marginBottom: 6 }}>Seu nome</label>
              <input style={inputStyle} type="text" placeholder="Ex: Ana, Ricardo..."
                value={nome} onChange={e => setNome(e.target.value)} required
                onFocus={e => (e.target.style.borderColor = "#2BBFA4")}
                onBlur={e  => (e.target.style.borderColor = "rgba(43,191,164,.2)")}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: ".82rem", fontWeight: 700, color: "#1E3A5F", marginBottom: 6 }}>E-mail</label>
              <input style={inputStyle} type="email" placeholder="seu@email.com"
                value={email} onChange={e => setEmail(e.target.value)} required
                onFocus={e => (e.target.style.borderColor = "#2BBFA4")}
                onBlur={e  => (e.target.style.borderColor = "rgba(43,191,164,.2)")}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: ".82rem", fontWeight: 700, color: "#1E3A5F", marginBottom: 6 }}>Criar senha</label>
              <input style={inputStyle} type="password" placeholder="Mínimo 6 caracteres"
                value={senha} onChange={e => setSenha(e.target.value)} required
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
                  Criando conta...
                </>
              ) : "Começar no FractaCare →"}
            </button>
            <p style={{ textAlign: "center", fontSize: ".75rem", color: "#8a9ab8", margin: 0 }}>
              🔒 Sem cartão de crédito. Seus dados são protegidos.
            </p>
          </form>
        )}
      </div>

      <Link href="/captura/avaliacao" style={{ marginTop: 20, fontSize: ".8rem", color: "#8a9ab8", textDecoration: "none" }}>
        ← Fazer avaliação gratuita primeiro
      </Link>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default function LoginPage() {
  return <Suspense fallback={null}><LoginPageInner /></Suspense>;
}
