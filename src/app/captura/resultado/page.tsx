"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FractaLogo } from "@/components/fracta/FractaLogo";
import { FractalTriangle } from "@/components/fracta/FractalTriangle";

// ─── TIPOS ────────────────────────────────────────────────
type DomKey = "comunicacao"|"social"|"atencao"|"regulacao"|"brincadeira"|"flexibilidade"|"autonomia"|"motivacao";

const DOMINIOS_CONFIG: { key: DomKey; nome: string; icon: string; cor: string }[] = [
  { key: "comunicacao",   nome: "Comunicação",    icon: "💬", cor: "#2BBFA4" },
  { key: "social",        nome: "Social",          icon: "🤝", cor: "#4FC3D8" },
  { key: "atencao",       nome: "Atenção",         icon: "🎯", cor: "#7AE040" },
  { key: "regulacao",     nome: "Regulação",       icon: "💙", cor: "#2A7BA8" },
  { key: "brincadeira",   nome: "Brincadeira",     icon: "🎨", cor: "#2BBFA4" },
  { key: "flexibilidade", nome: "Flexibilidade",   icon: "🔄", cor: "#4FC3D8" },
  { key: "autonomia",     nome: "Autonomia",       icon: "⭐", cor: "#7AE040" },
  { key: "motivacao",     nome: "Motivação",       icon: "🚀", cor: "#2A7BA8" },
];

// ─── BANCO DE ATIVIDADES ─────────────────────────────────
const ATIVIDADES: { nome: string; domKey: DomKey; objetivo: string; tempo: string; tipo: string; cor: string; icon: string }[] = [
  { nome: "Pedir o que quer",              domKey: "comunicacao",   objetivo: "Iniciar comunicação funcional — solicitar objetos e ações.", tempo: "3 min", tipo: "Principal",      cor: "#2BBFA4", icon: "💬" },
  { nome: "Mostrar objetos interessantes", domKey: "social",        objetivo: "Desenvolver atenção compartilhada — compartilhar foco com um adulto.", tempo: "5 min", tipo: "Complementar",  cor: "#4FC3D8", icon: "👀" },
  { nome: "Aumentar tempo em atividade",   domKey: "atencao",       objetivo: "Ampliar atenção sustentada em atividades dirigidas.", tempo: "5 min", tipo: "Principal",      cor: "#7AE040", icon: "⏱️" },
  { nome: "Esperar alguns segundos",       domKey: "regulacao",     objetivo: "Tolerar pequenas frustrações e esperas curtas.", tempo: "3 min", tipo: "Vitória rápida", cor: "#2A7BA8", icon: "⏸️" },
  { nome: "Explorar brinquedos",           domKey: "brincadeira",   objetivo: "Ampliar repertório de brincadeira funcional e simbólica.", tempo: "5 min", tipo: "Complementar",  cor: "#2BBFA4", icon: "🧩" },
  { nome: "Aceitar mudança de atividade",  domKey: "flexibilidade", objetivo: "Reduzir reação a mudanças de rotina e atividades.", tempo: "3 min", tipo: "Principal",      cor: "#4FC3D8", icon: "🔄" },
  { nome: "Guardar brinquedos",            domKey: "autonomia",     objetivo: "Desenvolver iniciativa em pequenas tarefas cotidianas.", tempo: "3 min", tipo: "Vitória rápida", cor: "#7AE040", icon: "🗂️" },
  { nome: "Escolher atividade",            domKey: "motivacao",     objetivo: "Estimular curiosidade e tomada de decisão.", tempo: "2 min", tipo: "Complementar",  cor: "#2A7BA8", icon: "🎯" },
  { nome: "Pedir ajuda",                   domKey: "comunicacao",   objetivo: "Reduzir frustração ensinando a solicitar ajuda de forma funcional.", tempo: "3 min", tipo: "Principal",      cor: "#2BBFA4", icon: "🤲" },
  { nome: "Imitar ações simples",          domKey: "social",        objetivo: "Desenvolver imitação generalizada como base para aprendizagem.", tempo: "4 min", tipo: "Principal",      cor: "#4FC3D8", icon: "🪞" },
];

// ─── RADAR SVG ────────────────────────────────────────────
function RadarSVG({ scores }: { scores: Record<DomKey, number> }) {
  const cx = 180, cy = 180, maxR = 130, n = 8;
  const step = (2 * Math.PI) / n;
  const start = -Math.PI / 2;
  function pt(i: number, r: number): [number, number] {
    const a = start + i * step;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  }
  function pStr(pts: [number, number][]) { return pts.map(p => p.join(",")).join(" "); }
  const vals = DOMINIOS_CONFIG.map(d => scores[d.key] ?? 50);
  const valPts = vals.map((v, i) => pt(i, (v / 100) * maxR));

  return (
    <svg viewBox="0 0 360 360" width="300" height="300" style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id="rg-res" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#2BBFA4" stopOpacity={0.3} />
          <stop offset="100%" stopColor="#7AE040" stopOpacity={0.15} />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75, 1].map(f => (
        <polygon key={f} points={pStr(Array.from({ length: n }, (_, i) => pt(i, maxR * f)))}
          fill="none" stroke="rgba(43,191,164,0.15)" strokeWidth="1" />
      ))}
      {Array.from({ length: n }, (_, i) => {
        const [x2, y2] = pt(i, maxR);
        return <line key={i} x1={cx} y1={cy} x2={x2} y2={y2} stroke="rgba(43,191,164,0.15)" strokeWidth="1" />;
      })}
      <polygon points={pStr(valPts)} fill="url(#rg-res)" stroke="#2BBFA4" strokeWidth="2.5" />
      {vals.map((v, i) => {
        const d = DOMINIOS_CONFIG[i];
        const [x, y] = pt(i, (v / 100) * maxR);
        const [lx, ly] = pt(i, maxR + 26);
        const [px, py] = pt(i, (v / 100) * maxR - 16);
        return (
          <g key={d.key}>
            <circle cx={x} cy={y} r={6} fill={d.cor} stroke="white" strokeWidth="2.5" />
            <text x={lx} y={ly} textAnchor="middle" dominantBaseline="middle"
              fontSize="10.5" fontFamily="Plus Jakarta Sans, sans-serif" fontWeight="700" fill="#1E3A5F">
              {d.nome}
            </text>
            <text x={px} y={py} textAnchor="middle" dominantBaseline="middle"
              fontSize="8.5" fontFamily="Plus Jakarta Sans, sans-serif" fontWeight="800" fill={d.cor}>
              {v}%
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ─── INTERPRETAÇÃO INTELIGENTE ────────────────────────────
function gerarInterpretacao(scores: Record<DomKey, number>, nome: string): string {
  const sorted = DOMINIOS_CONFIG.map(d => ({ ...d, val: scores[d.key] ?? 50 }))
    .sort((a, b) => a.val - b.val);
  const menores = sorted.slice(0, 2).map(d => d.nome.toLowerCase());
  const maiores = sorted.slice(-2).reverse().map(d => d.nome.toLowerCase());
  return `${nome} apresenta boas bases em ${maiores.join(" e ")} — ótimos pontos de apoio para o desenvolvimento. Algumas habilidades de ${menores.join(" e ")} parecem prontas para crescer ainda mais com pequenas práticas no dia a dia. Isso é muito positivo: significa que ${nome} está em um momento favorável para avançar.`;
}

function gerarMensagemEngine(scores: Record<DomKey, number>, nome: string): string {
  const sorted = DOMINIOS_CONFIG.map(d => ({ ...d, val: scores[d.key] ?? 50 })).sort((a, b) => a.val - b.val);
  const menor = sorted[0];
  const media = Object.values(scores).reduce((a, b) => a + b, 0) / 8;
  if (media >= 70) return `${nome} apresenta um perfil de desenvolvimento muito sólido. O FractaEngine identificou que ele está pronto para avançar em <strong>${menor.nome.toLowerCase()}</strong> — um passo que vai abrir novas habilidades rapidamente.`;
  if (media >= 50) return `O FractaEngine identificou habilidades emergentes em <strong>${menor.nome.toLowerCase()}</strong>. Com práticas simples e consistentes no dia a dia, ${nome} tem grande potencial de avanço nas próximas semanas.`;
  return `${nome} está em um momento importante do desenvolvimento. O FractaEngine sugere focar em <strong>${menor.nome.toLowerCase()}</strong> como ponto de entrada — uma habilidade-chave que, quando desenvolvida, tende a desbloquear outras rapidamente.`;
}

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────
export default function ResultadoPage() {
  const router = useRouter();
  const [scores,    setScores]    = useState<Record<DomKey, number> | null>(null);
  const [nome,      setNome]      = useState("seu filho");
  const [idade,     setIdade]     = useState("");
  const [nomeResp,  setNomeResp]  = useState("você");
  const [email,     setEmail]     = useState("");
  const [atividades, setAtividades] = useState<typeof ATIVIDADES>([]);
  const [cadNome,   setCadNome]   = useState("");
  const [cadEmail,  setCadEmail]  = useState("");
  const [cadSenha,  setCadSenha]  = useState("");
  const [loading,   setLoading]   = useState(false);
  const [cadastrado, setCadastrado] = useState(false);

  useEffect(() => {
    const r = sessionStorage.getItem("fracta_radar");
    const n = sessionStorage.getItem("fracta_nome");
    const i = sessionStorage.getItem("fracta_idade");
    const resp = sessionStorage.getItem("fracta_resp");
    const em = sessionStorage.getItem("fracta_email");

    if (!r) { router.push("/captura/avaliacao"); return; }
    const parsed = JSON.parse(r) as Record<DomKey, number>;
    setScores(parsed);
    if (n) { setNome(n); setCadNome(resp || ""); }
    if (i) setIdade(i);
    if (resp) setNomeResp(resp);
    if (em) { setEmail(em); setCadEmail(em); }

    // Selecionar 3 atividades prioritárias (domínios com menor score)
    const sorted = DOMINIOS_CONFIG
      .map(d => ({ ...d, val: parsed[d.key] ?? 50 }))
      .sort((a, b) => a.val - b.val);
    const prioridades = sorted.slice(0, 3).map(d => d.key);
    const selecionadas = prioridades
      .map(key => ATIVIDADES.find(a => a.domKey === key))
      .filter(Boolean) as typeof ATIVIDADES;
    setAtividades(selecionadas);
  }, [router]);

  async function cadastrar() {
    if (!cadNome.trim())  { alert("Informe seu nome."); return; }
    if (!cadEmail.includes("@")) { alert("Informe um e-mail válido."); return; }
    if (cadSenha.length < 6) { alert("A senha deve ter pelo menos 6 caracteres."); return; }
    setLoading(true);
    try {
      const res = await fetch("https://fractal-behavior-production.up.railway.app/api/auth/cadastro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: cadNome, email: cadEmail, senha: cadSenha,
          avaliacao_id: sessionStorage.getItem("fracta_avaliacao_id"),
        }),
      });
      if (res.ok) {
        const login = await fetch("https://fractal-behavior-production.up.railway.app/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: cadEmail, senha: cadSenha }),
        });
        const ld = await login.json();
        if (ld.token) localStorage.setItem("fracta_token", ld.token);
        setCadastrado(true);
        setTimeout(() => router.push("/app"), 1500);
      } else {
        const err = await res.json();
        alert(err.erro || "Erro ao criar conta.");
      }
    } catch { alert("Erro de conexão. Tente novamente."); }
    finally { setLoading(false); }
  }

  if (!scores) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-sans)", background: "#f0f8ff" }}>
      <p style={{ color: "#8a9ab8" }}>Carregando resultado...</p>
    </div>
  );

  const bg = {
    minHeight: "100vh",
    background: "radial-gradient(ellipse 80% 60% at 20% 10%, rgba(122,224,64,.10) 0%, transparent 55%), radial-gradient(ellipse 60% 70% at 80% 90%, rgba(43,191,164,.13) 0%, transparent 55%), linear-gradient(160deg,#e8f8ff 0%,#f0fdfb 35%,#edfff8 65%,#ddf4ff 100%)",
    fontFamily: "var(--font-sans)",
    color: "#1E3A5F",
  };
  const card = {
    background: "rgba(255,255,255,.84)", backdropFilter: "blur(14px)",
    borderRadius: 24, border: "1px solid rgba(43,191,164,.18)",
    boxShadow: "0 4px 28px rgba(43,191,164,.07)",
  };
  const input = {
    width: "100%", padding: "12px 15px",
    border: "2px solid rgba(43,191,164,.2)", borderRadius: 12,
    fontFamily: "var(--font-sans)", fontSize: ".9rem", color: "#1E3A5F",
    background: "#f7fdff", outline: "none", boxSizing: "border-box" as const,
  };

  const tipoColors: Record<string, { bg: string; color: string }> = {
    "Principal":      { bg: "rgba(43,191,164,.15)",  color: "#1a7a6a" },
    "Complementar":   { bg: "rgba(79,195,216,.15)",  color: "#1a5a6a" },
    "Vitória rápida": { bg: "rgba(122,224,64,.15)",  color: "#3a6a1a" },
  };

  return (
    <div style={bg}>

      {/* NAV */}
      <nav style={{ background: "rgba(255,255,255,.75)", backdropFilter: "blur(16px)", borderBottom: "1px solid rgba(43,191,164,.15)", padding: "0 20px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 50 }}>
        <Link href="/care" style={{ textDecoration: "none" }}>
          <FractaLogo logo="care" height={30} alt="FractaCare" />
        </Link>
        <span style={{ fontSize: ".75rem", color: "#8a9ab8" }}>Resultado da avaliação</span>
        <span style={{ fontSize: ".72rem", color: "#8a9ab8" }}>{nome} · {idade} ano{Number(idade) > 1 ? "s" : ""}</span>
      </nav>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "32px 18px 80px", display: "flex", flexDirection: "column", gap: 20 }}>

        {/* CARD PRINCIPAL — RADAR */}
        <div style={{ ...card, overflow: "hidden" }}>
          {/* Header colorido */}
          <div style={{ background: "linear-gradient(135deg,#1E3A5F,#2A7BA8)", padding: "28px 32px", color: "white", textAlign: "center" }}>
            <div style={{ fontSize: ".8rem", opacity: .75, marginBottom: 5 }}>Olá, {nomeResp}!</div>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 800, marginBottom: 4 }}>Mapa de habilidades de {nome}</h1>
            <div style={{ fontSize: ".82rem", opacity: .75 }}>{nome} · {idade} ano{Number(idade) > 1 ? "s" : ""} · Resultado personalizado</div>
          </div>

          <div style={{ padding: "28px 32px" }}>
            {/* Radar */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 28 }}>
              <div style={{ fontSize: ".65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", color: "#8a9ab8", marginBottom: 10 }}>
                Fracta Development Map — {nome}
              </div>
              <RadarSVG scores={scores} />
            </div>

            {/* Score bars */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
              {DOMINIOS_CONFIG.map(d => (
                <div key={d.key} style={{ background: "#f7fdff", border: "1px solid rgba(43,191,164,.1)", borderRadius: 14, padding: "12px 14px", display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: "1.1rem" }}>{d.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: ".78rem", fontWeight: 700, color: "#1E3A5F", marginBottom: 4 }}>{d.nome}</div>
                    <div style={{ height: 5, background: "rgba(43,191,164,.12)", borderRadius: 50, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${scores[d.key] ?? 50}%`, background: d.cor, borderRadius: 50 }} />
                    </div>
                  </div>
                  <div style={{ fontSize: ".82rem", fontWeight: 800, color: "#1E3A5F", minWidth: 34, textAlign: "right" }}>{scores[d.key] ?? 50}%</div>
                </div>
              ))}
            </div>

            {/* Interpretação */}
            <div style={{ background: "linear-gradient(145deg,#f0faff,#e8f9f4)", border: "1px solid rgba(43,191,164,.2)", borderLeft: "4px solid #2BBFA4", borderRadius: 16, padding: "18px 20px" }}>
              <div style={{ fontSize: ".72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: "#2BBFA4", marginBottom: 8 }}>💡 O que isso significa</div>
              <p style={{ fontSize: ".88rem", color: "#3a5a7a", lineHeight: 1.7 }}>{gerarInterpretacao(scores, nome)}</p>
            </div>
          </div>
        </div>

        {/* ATIVIDADES SUGERIDAS */}
        <div style={{ ...card, padding: "26px 28px" }}>
          <div style={{ fontSize: ".65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", color: "#2BBFA4", marginBottom: 6 }}>
            🎯 Primeiros passos sugeridos
          </div>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#1E3A5F", marginBottom: 16 }}>
            Atividades personalizadas para {nome}
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {atividades.map(a => {
              const tc = tipoColors[a.tipo] || tipoColors["Complementar"];
              return (
                <div key={a.nome} style={{ display: "flex", alignItems: "flex-start", gap: 14, padding: "16px", background: "#f7fdff", border: "1px solid rgba(43,191,164,.1)", borderRadius: 16, cursor: "pointer", transition: "all .2s" }}
                  onMouseEnter={e => { e.currentTarget.style.transform = "translateX(4px)"; e.currentTarget.style.borderColor = "rgba(43,191,164,.3)"; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.borderColor = "rgba(43,191,164,.1)"; }}
                >
                  <div style={{ width: 42, height: 42, borderRadius: 13, background: `${a.cor}22`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem", flexShrink: 0 }}>{a.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: ".9rem", fontWeight: 800, color: "#1E3A5F", marginBottom: 3 }}>{a.nome}</div>
                    <div style={{ fontSize: ".75rem", color: "#8a9ab8", marginBottom: 5 }}>{a.domKey.charAt(0).toUpperCase() + a.domKey.slice(1)} · {a.tempo}</div>
                    <div style={{ fontSize: ".78rem", color: "#5a7a9a", lineHeight: 1.55 }}>{a.objetivo}</div>
                  </div>
                  <div style={{ flexShrink: 0 }}>
                    <span style={{ fontSize: ".65rem", fontWeight: 700, padding: "3px 10px", borderRadius: 50, background: tc.bg, color: tc.color }}>{a.tipo}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ENGINE */}
        <div style={{ background: "linear-gradient(135deg,rgba(43,191,164,.1),rgba(42,123,168,.07))", border: "1px solid rgba(43,191,164,.2)", borderRadius: 22, padding: "22px 26px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <FractaLogo logo="engine" height={22} alt="FractaEngine" />
            <span style={{ fontSize: ".65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", color: "#2BBFA4" }}>FractaEngine</span>
          </div>
          <p style={{ fontSize: ".88rem", color: "#1E3A5F", lineHeight: 1.7 }}
            dangerouslySetInnerHTML={{ __html: gerarMensagemEngine(scores, nome) }} />
        </div>

        {/* CTA */}
        <div style={{ background: "linear-gradient(135deg,#1E3A5F,#2A7BA8)", borderRadius: 24, padding: "32px", textAlign: "center", color: "white" }}>
          <div style={{ fontSize: "2rem", marginBottom: 12 }}>🚀</div>
          <h2 style={{ fontSize: "1.3rem", fontWeight: 800, marginBottom: 10 }}>Acesse o plano completo de {nome}</h2>
          <p style={{ fontSize: ".88rem", opacity: .8, lineHeight: 1.7, marginBottom: 22 }}>
            Crie sua conta gratuita para acessar todas as atividades, acompanhar o progresso ao longo do tempo e receber orientações personalizadas.
          </p>
          <a href="#cadastro" style={{ display: "inline-block", padding: "13px 30px", borderRadius: 50, background: "white", color: "#1E3A5F", fontWeight: 800, fontSize: ".92rem", textDecoration: "none" }}>
            ✦ Criar conta gratuita
          </a>
          <div style={{ fontSize: ".72rem", opacity: .5, marginTop: 10 }}>Grátis para começar · Sem cartão de crédito</div>
        </div>

        {/* CADASTRO */}
        <div id="cadastro" style={{ ...card, padding: "28px 32px" }}>
          <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#1E3A5F", marginBottom: 6 }}>Criar conta no FractaCare</h3>
          <p style={{ fontSize: ".82rem", color: "#8a9ab8", marginBottom: 22 }}>
            Já temos o perfil de {nome}. Finalize o cadastro para acessar seu plano personalizado.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={{ fontSize: ".78rem", fontWeight: 700, color: "#1E3A5F", display: "block", marginBottom: 5 }}>Seu nome</label>
              <input style={input} placeholder="Seu nome completo" value={cadNome} onChange={e => setCadNome(e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: ".78rem", fontWeight: 700, color: "#1E3A5F", display: "block", marginBottom: 5 }}>E-mail</label>
              <input style={input} type="email" placeholder="seu@email.com" value={cadEmail} onChange={e => setCadEmail(e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: ".78rem", fontWeight: 700, color: "#1E3A5F", display: "block", marginBottom: 5 }}>Criar senha</label>
              <input style={input} type="password" placeholder="Mínimo 6 caracteres" value={cadSenha} onChange={e => setCadSenha(e.target.value)} />
            </div>
            <button onClick={cadastrar} disabled={loading || cadastrado} style={{
              padding: "15px", borderRadius: 50, border: "none",
              background: cadastrado ? "linear-gradient(135deg,#7AE040,#2BBFA4)" : "linear-gradient(135deg,#2BBFA4,#7AE040)",
              color: "white", fontFamily: "var(--font-sans)", fontWeight: 800, fontSize: ".95rem",
              cursor: loading || cadastrado ? "not-allowed" : "pointer",
              boxShadow: "0 4px 18px rgba(43,191,164,.35)",
            }}>
              {cadastrado ? "✓ Conta criada! Redirecionando..." : loading ? "Criando conta..." : "Começar no FractaCare →"}
            </button>
            <p style={{ fontSize: ".72rem", color: "#8a9ab8", textAlign: "center" }}>
              🔒 Seus dados são protegidos. Nunca compartilhamos informações pessoais.
            </p>
          </div>
        </div>

        {/* COMPARTILHAR */}
        <div style={{ textAlign: "center" }}>
          <p style={{ fontSize: ".8rem", color: "#8a9ab8", marginBottom: 12 }}>Conhece outros pais que podem se beneficiar?</p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            <a href={`https://wa.me/?text=${encodeURIComponent(`Fiz a avaliação gratuita do desenvolvimento de ${nome} no FractaCare e recebi um mapa personalizado de habilidades! 🧠💚`)}`}
              target="_blank" rel="noopener noreferrer"
              style={{ padding: "10px 20px", borderRadius: 50, border: "1.5px solid rgba(43,191,164,.2)", background: "rgba(255,255,255,.7)", color: "#1E3A5F", fontSize: ".8rem", fontWeight: 700, textDecoration: "none" }}>
              💬 WhatsApp
            </a>
            <button onClick={() => navigator.clipboard.writeText(window.location.origin + "/care")}
              style={{ padding: "10px 20px", borderRadius: 50, border: "1.5px solid rgba(43,191,164,.2)", background: "rgba(255,255,255,.7)", color: "#1E3A5F", fontSize: ".8rem", fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-sans)" }}>
              🔗 Copiar link
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
