"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { FractaLogo } from "@/components/fracta/FractaLogo";
import { FractalTriangle } from "@/components/fracta/FractalTriangle";

// ─── DADOS MOCK ───────────────────────────────────────────
const PACIENTES = [
  { init:"LM", g:"linear-gradient(135deg,#00c9a7,#1e90ff)", nome:"Lucas M.", idade:"4a", prog:"Mando funcional",       pct:58, sessao:"Hoje 14h",    status:"Ativo" },
  { init:"SA", g:"linear-gradient(135deg,#1e90ff,#7c3aed)", nome:"Sofia A.", idade:"3a", prog:"Aten. compartilhada",   pct:72, sessao:"Amanhã 10h",  status:"Ativo" },
  { init:"PG", g:"linear-gradient(135deg,#f59e0b,#ef4444)", nome:"Pedro G.", idade:"5a", prog:"Generalização",         pct:91, sessao:"Sex 11h",     status:"Critério" },
  { init:"BN", g:"linear-gradient(135deg,#7bed9f,#00c9a7)", nome:"Beatriz N.", idade:"6a", prog:"Intraverbal",        pct:63, sessao:"Seg 9h",      status:"Ativo" },
  { init:"RF", g:"linear-gradient(135deg,#00c9a7,#1e90ff)", nome:"Rafael F.", idade:"7a", prog:"Autocuidado",          pct:45, sessao:"Ter 15h",     status:"Ativo" },
];

const SESSOES_HOJE = [
  { time:"10h", init:"SA", g:"linear-gradient(135deg,#1e90ff,#7c3aed)", nome:"Sofia A.",  prog:"Atenção compartilhada", badge:"Confirmada", on:false },
  { time:"14h", init:"LM", g:"linear-gradient(135deg,#00c9a7,#1e90ff)", nome:"Lucas M.",  prog:"Mando funcional",       badge:"Hoje",       on:true  },
  { time:"16h", init:"BN", g:"linear-gradient(135deg,#7bed9f,#00c9a7)", nome:"Beatriz N.",prog:"Intraverbal",           badge:"Confirmada", on:false },
];

const BARS = [42, 52, 58, 61, 70, 68, 76, 74];

const AF_FUNCOES = [
  { label:"Fuga",        pct:51, cor:"#00c9a7" },
  { label:"Atenção",     pct:28, cor:"#1e90ff" },
  { label:"Acesso",      pct:14, cor:"#7bed9f" },
  { label:"Automático",  pct: 7, cor:"rgba(255,255,255,.35)" },
];

const NOVOS_PACIENTES = [
  { init:"MC", g:"linear-gradient(135deg,#1e90ff,#7c3aed)", nome:"Maria C. · 5a", sub:"Indicado via FractaEngine" },
  { init:"JP", g:"linear-gradient(135deg,#00c9a7,#1e90ff)", nome:"João P. · 3a",  sub:"Indicado via FractaEngine" },
];

// ─── PARTICLE CANVAS ─────────────────────────────────────
function ParticleBg() {
  useEffect(() => {
    const cv = document.getElementById("clinic-bg-canvas") as HTMLCanvasElement | null;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const c = ctx as CanvasRenderingContext2D;
    let W = cv.width = window.innerWidth;
    let H = cv.height = window.innerHeight;
    const resize = () => { W = cv.width = window.innerWidth; H = cv.height = window.innerHeight; };
    window.addEventListener("resize", resize, { passive: true });
    const pts = Array.from({ length: 55 }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      vx: (Math.random() - .5) * .2, vy: (Math.random() - .5) * .2,
      r: Math.random() * 1.4 + .4,
    }));
    let raf = 0;
    function draw() {
      c.clearRect(0, 0, W, H);
      pts.forEach(p => { p.x += p.vx; p.y += p.vy; if (p.x < 0 || p.x > W) p.vx *= -1; if (p.y < 0 || p.y > H) p.vy *= -1; });
      for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
        const d = Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y);
        if (d < 110) { c.beginPath(); c.moveTo(pts[i].x, pts[i].y); c.lineTo(pts[j].x, pts[j].y); c.strokeStyle = `rgba(0,201,167,${.13 * (1 - d / 110)})`; c.lineWidth = .5; c.stroke(); }
      }
      pts.forEach(p => { c.beginPath(); c.arc(p.x, p.y, p.r, 0, Math.PI * 2); c.fillStyle = "rgba(0,201,167,.38)"; c.fill(); });
      raf = requestAnimationFrame(draw);
    }
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, []);
  return <canvas id="clinic-bg-canvas" style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, opacity: .28 }} />;
}

export default function ClinicDashboardPage() {
  const [tab, setTab]               = useState<"painel"|"pacientes"|"programas"|"dados">("painel");
  const [barsVisible, setBarsVisible] = useState(false);

  useEffect(() => { setTimeout(() => setBarsVisible(true), 300); }, []);

  const hora = new Date().getHours();
  const saudacao = hora < 12 ? "Bom dia" : hora < 18 ? "Boa tarde" : "Boa noite";

  const gcard: React.CSSProperties = {
    background: "rgba(13,32,64,.7)", backdropFilter: "blur(14px)",
    border: "1px solid rgba(255,255,255,.09)", borderRadius: 16,
    boxShadow: "0 2px 20px rgba(0,0,0,.3)",
  };

  return (
    <div style={{ fontFamily: "var(--font-sans)", background: "#07111f", color: "white", minHeight: "100vh", position: "relative", overflow: "hidden" }}>
      <ParticleBg />
      <div style={{ position: "relative", zIndex: 1 }}>

        {/* NAV */}
        <nav style={{ background: "rgba(7,17,31,.92)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,.08)", padding: "0 24px", height: 58, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100 }}>
          <Link href="/clinic" style={{ textDecoration: "none" }}>
            <FractaLogo logo="clinic" height={26} alt="FractaClinic" />
          </Link>
          <ul style={{ display: "flex", gap: 24, listStyle: "none" }}>
            {[["painel","Painel"],["pacientes","Pacientes"],["programas","Programas"],["dados","Dados"]].map(([k,l]) => (
              <li key={k}>
                <button onClick={() => setTab(k as typeof tab)} style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-sans)", fontSize: ".75rem", fontWeight: 500, color: tab === k ? "#00c9a7" : "rgba(255,255,255,.4)", textTransform: "uppercase", letterSpacing: ".06em", transition: "color .2s" }}>{l}</button>
              </li>
            ))}
          </ul>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* Nível badge */}
            <div style={{ background: "rgba(0,201,167,.1)", border: "1px solid rgba(0,201,167,.2)", borderRadius: 50, padding: "3px 12px", fontSize: ".65rem", fontWeight: 700, color: "#00c9a7" }}>Sênior</div>
            <div style={{ width: 30, height: 30, borderRadius: "50%", background: "linear-gradient(135deg,#00c9a7,#1e90ff)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".58rem", fontWeight: 800, color: "#07111f" }}>CA</div>
          </div>
        </nav>

        {/* LAYOUT */}
        <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", minHeight: "calc(100vh - 58px)" }}>

          {/* SIDEBAR */}
          <aside style={{ background: "rgba(7,17,31,.6)", backdropFilter: "blur(10px)", borderRight: "1px solid rgba(255,255,255,.08)", padding: "20px 0" }}>
            {/* Logo fractal */}
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 20, paddingBottom: 16, borderBottom: "1px solid rgba(255,255,255,.06)" }}>
              <FractalTriangle size={60} animate style={{ filter: "hue-rotate(160deg) saturate(1.1)" }} />
            </div>

            {[
              { k:"painel",    label:"Painel",      icon:"M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" },
              { k:"pacientes", label:"Pacientes",   icon:"M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" },
              { k:"programas", label:"Programas",   icon:"M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" },
              { k:"dados",     label:"Dados clínicos", icon:"M22 12h-4l-3 9L9 3l-3 9H2" },
            ].map(item => (
              <button key={item.k} onClick={() => setTab(item.k as typeof tab)} style={{
                display: "flex", alignItems: "center", gap: 10, width: "100%",
                padding: "10px 18px", border: "none",
                background: tab === item.k ? "rgba(0,201,167,.1)" : "transparent",
                color: tab === item.k ? "#00c9a7" : "rgba(255,255,255,.4)",
                fontFamily: "var(--font-sans)", fontSize: ".8rem", fontWeight: tab === item.k ? 600 : 400,
                cursor: "pointer", marginBottom: 2, transition: "all .2s",
                borderLeft: tab === item.k ? "3px solid #00c9a7" : "3px solid transparent",
              }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  {item.icon.split("M").filter(Boolean).map((d, i) => <path key={i} d={`M${d}`} />)}
                </svg>
                {item.label}
              </button>
            ))}

            <div style={{ margin: "12px 16px", height: 1, background: "rgba(255,255,255,.06)" }} />

            {[
              { k:"relatorios", label:"Relatórios",  icon:"M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" },
              { k:"avaliacoes", label:"Avaliações",  icon:"M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" },
            ].map(item => (
              <button key={item.k} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "10px 18px", border: "none", background: "transparent", color: "rgba(255,255,255,.35)", fontFamily: "var(--font-sans)", fontSize: ".8rem", cursor: "pointer", transition: "color .2s" }}
                onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,.7)")}
                onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,.35)")}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  {item.icon.split("M").filter(Boolean).map((d, i) => <path key={i} d={`M${d}`} />)}
                </svg>
                {item.label}
              </button>
            ))}

            {/* Nível */}
            <div style={{ margin: "14px 14px 0", background: "rgba(0,201,167,.08)", border: "1px solid rgba(0,201,167,.2)", borderRadius: 10, padding: "10px 12px" }}>
              <div style={{ fontSize: ".7rem", fontWeight: 700, color: "#00c9a7" }}>Nível Sênior</div>
              <div style={{ fontSize: ".62rem", color: "rgba(255,255,255,.35)", marginTop: 2 }}>+5 anos de prática ABA</div>
            </div>
          </aside>

          {/* MAIN */}
          <main style={{ padding: "24px 26px 60px", display: "flex", flexDirection: "column", gap: 18 }}>

            {/* HEADER */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
              <div>
                <div style={{ fontSize: ".75rem", color: "rgba(255,255,255,.35)", marginBottom: 3 }}>
                  {new Date().toLocaleDateString("pt-BR", { weekday:"long", day:"numeric", month:"long" })}
                </div>
                <div style={{ fontSize: "1.25rem", fontWeight: 800, letterSpacing: "-.02em" }}>{saudacao}, Dra. Carolina</div>
              </div>
              <Link href="/clinic/sessao" style={{ padding: "10px 22px", borderRadius: 6, border: "none", background: "linear-gradient(135deg,#00c9a7,#0f8f7a)", color: "#07111f", fontWeight: 800, fontSize: ".82rem", textDecoration: "none" }}>
                Iniciar sessão
              </Link>
            </div>

            {/* KPIs */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14 }}>
              {[
                { label:"Pacientes ativos",    val:"8",   t:"#00c9a7", sub:"2 via FractaEngine" },
                { label:"Sessões este mês",    val:"24",  t:"white",   sub:"Meta: 28 sessões" },
                { label:"Taxa de acerto média",val:"74%", t:"#00c9a7", sub:"+6% vs mês anterior" },
                { label:"Programas ativos",    val:"18",  t:"white",   sub:"3 próximos de critério" },
              ].map(k => (
                <div key={k.label} style={{ ...gcard, padding: 18 }}>
                  <div style={{ fontSize: ".6rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".09em", color: "rgba(255,255,255,.4)", marginBottom: 8 }}>{k.label}</div>
                  <div style={{ fontSize: "2rem", fontWeight: 800, color: k.t, lineHeight: 1 }}>{k.val}</div>
                  <div style={{ fontSize: ".68rem", color: "rgba(255,255,255,.35)", marginTop: 4 }}>{k.sub}</div>
                </div>
              ))}
            </div>

            {/* TABELA PACIENTES */}
            <div style={{ ...gcard, overflow: "hidden" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,.07)" }}>
                <div style={{ fontSize: ".85rem", fontWeight: 700 }}>Pacientes ativos</div>
                <Link href="/clinic/sessao" style={{ fontSize: ".7rem", color: "#00c9a7", textDecoration: "none" }}>Iniciar sessão →</Link>
              </div>
              {/* Header da tabela */}
              <div style={{ display: "grid", gridTemplateColumns: "34px 1fr 110px 70px 88px 80px", gap: 12, padding: "9px 20px", background: "rgba(0,201,167,.04)" }}>
                {["","Aprendiz","Programa","Acertos","Próx. sessão","Status"].map(h => (
                  <div key={h} style={{ fontSize: ".58rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: "rgba(255,255,255,.35)" }}>{h}</div>
                ))}
              </div>
              {PACIENTES.map(p => (
                <div key={p.nome} style={{ display: "grid", gridTemplateColumns: "34px 1fr 110px 70px 88px 80px", gap: 12, padding: "13px 20px", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,.04)", cursor: "pointer", transition: "background .15s" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,.04)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  <div style={{ width: 30, height: 30, borderRadius: "50%", background: p.g, display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".58rem", fontWeight: 800, color: "white" }}>{p.init}</div>
                  <div>
                    <div style={{ fontSize: ".82rem", fontWeight: 700 }}>{p.nome} · {p.idade}</div>
                    <div style={{ fontSize: ".68rem", color: "rgba(255,255,255,.4)" }}>{p.prog}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: ".75rem", color: "rgba(255,255,255,.65)" }}>{p.prog}</div>
                    <div style={{ height: 4, background: "rgba(255,255,255,.08)", borderRadius: 50, overflow: "hidden", marginTop: 4 }}>
                      <div style={{ height: "100%", width: `${p.pct}%`, background: "linear-gradient(90deg,#00c9a7,#7bed9f)" }} />
                    </div>
                  </div>
                  <div style={{ fontSize: ".78rem", color: "rgba(255,255,255,.65)" }}>{p.pct}%</div>
                  <div style={{ fontSize: ".75rem", color: "rgba(255,255,255,.65)" }}>{p.sessao}</div>
                  <div>
                    <span style={{
                      fontSize: ".62rem", fontWeight: 700, padding: "3px 9px", borderRadius: 50,
                      background: p.status === "Critério" ? "rgba(245,158,11,.12)" : "rgba(0,201,167,.12)",
                      color: p.status === "Critério" ? "#f59e0b" : "#00c9a7",
                    }}>{p.status}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* GRID INFERIOR */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>

              {/* SESSÕES HOJE + ANÁLISE FUNCIONAL */}
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ ...gcard, padding: 20 }}>
                  <div style={{ fontSize: ".62rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".09em", color: "rgba(255,255,255,.4)", marginBottom: 14 }}>Sessões de hoje</div>
                  {SESSOES_HOJE.map(s => (
                    <div key={s.nome} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,.05)" }}>
                      <div style={{ fontSize: ".72rem", fontWeight: 700, color: "#00c9a7", width: 36, flexShrink: 0 }}>{s.time}</div>
                      <div style={{ width: 26, height: 26, borderRadius: "50%", background: s.g, display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".54rem", fontWeight: 800, color: "white", flexShrink: 0 }}>{s.init}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: ".8rem", fontWeight: 600 }}>{s.nome}</div>
                        <div style={{ fontSize: ".65rem", color: "rgba(255,255,255,.4)" }}>{s.prog}</div>
                      </div>
                      <span style={{ fontSize: ".6rem", fontWeight: 700, padding: "2px 8px", borderRadius: 50, background: s.on ? "rgba(0,201,167,.12)" : "rgba(255,255,255,.08)", color: s.on ? "#00c9a7" : "rgba(255,255,255,.4)", flexShrink: 0 }}>{s.badge}</span>
                    </div>
                  ))}
                  <Link href="/clinic/sessao" style={{ display: "block", marginTop: 14, padding: "10px", borderRadius: 8, background: "linear-gradient(135deg,#00c9a7,#0f8f7a)", color: "#07111f", fontWeight: 800, fontSize: ".8rem", textAlign: "center", textDecoration: "none" }}>
                    Iniciar próxima sessão
                  </Link>
                </div>

                {/* ANÁLISE FUNCIONAL */}
                <div style={{ ...gcard, padding: 20 }}>
                  <div style={{ fontSize: ".62rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".09em", color: "rgba(255,255,255,.4)", marginBottom: 10 }}>Análise funcional — João S.</div>
                  <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
                    {["Fuga","Atenção","Acesso","Auto"].map((f, i) => (
                      <div key={f} style={{ flex: 1, textAlign: "center", padding: "7px 4px", borderRadius: 8, background: i === 0 ? "rgba(0,201,167,.12)" : "rgba(255,255,255,.06)", color: i === 0 ? "#00c9a7" : "rgba(255,255,255,.5)", fontSize: ".65rem", fontWeight: 700, border: i === 0 ? "1px solid rgba(0,201,167,.3)" : "1px solid transparent" }}>{f}</div>
                    ))}
                  </div>
                  {AF_FUNCOES.map(f => (
                    <div key={f.label} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                      <div style={{ fontSize: ".7rem", color: "rgba(255,255,255,.6)", width: 72, flexShrink: 0 }}>{f.label}</div>
                      <div style={{ flex: 1, height: 5, background: "rgba(255,255,255,.08)", borderRadius: 50, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: barsVisible ? `${f.pct}%` : "0%", background: f.cor, borderRadius: 50, transition: "width 1.2s ease" }} />
                      </div>
                      <div style={{ fontSize: ".68rem", fontWeight: 700, color: f.cor, width: 28, textAlign: "right" }}>{f.pct}%</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ENGINE + GRÁFICO + NOVOS */}
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

                {/* FRACTAENGINE */}
                <div style={{ background: "linear-gradient(135deg,rgba(0,201,167,.07),rgba(30,144,255,.04))", border: "1px solid rgba(0,201,167,.15)", borderRadius: 16, padding: 18 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    <FractaLogo logo="engine" height={20} alt="FractaEngine" />
                    <span style={{ fontSize: ".65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".09em", color: "#00c9a7" }}>FractaEngine</span>
                  </div>
                  <p style={{ fontSize: ".82rem", lineHeight: 1.65, color: "rgba(255,255,255,.65)", marginBottom: 12 }}>
                    <strong style={{ color: "white" }}>Pedro G.</strong> atingiu critério em mando funcional — 91% em 3 sessões consecutivas. Considerar avançar para generalização em novos contextos e pessoas.
                  </p>
                  <Link href="/clinic/sessao" style={{ fontSize: ".75rem", fontWeight: 700, color: "#00c9a7", textDecoration: "none" }}>Ver sugestão de programa →</Link>
                </div>

                {/* GRÁFICO ACERTOS */}
                <div style={{ ...gcard, padding: 20 }}>
                  <div style={{ fontSize: ".62rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".09em", color: "rgba(255,255,255,.4)", marginBottom: 12 }}>Taxa de acerto — 8 semanas</div>
                  <div style={{ display: "flex", alignItems: "flex-end", gap: 5, height: 60 }}>
                    {BARS.map((h, i) => (
                      <div key={i} style={{ flex: 1, borderRadius: "3px 3px 0 0", height: barsVisible ? `${h}%` : "0%", background: i % 2 === 0 ? "linear-gradient(to top,#00c9a7,rgba(0,201,167,.25))" : "linear-gradient(to top,#1e90ff,rgba(30,144,255,.25))", transition: `height 1.2s ease ${i * 0.08}s` }} />
                    ))}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                    <span style={{ fontSize: ".6rem", color: "rgba(255,255,255,.25)" }}>8 sem atrás</span>
                    <span style={{ fontSize: ".6rem", color: "#00c9a7", fontWeight: 700 }}>74% agora</span>
                  </div>
                </div>

                {/* NOVOS PACIENTES */}
                <div style={{ ...gcard, padding: 18 }}>
                  <div style={{ fontSize: ".62rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".09em", color: "rgba(255,255,255,.4)", marginBottom: 12 }}>Novos pacientes indicados</div>
                  {NOVOS_PACIENTES.map(p => (
                    <div key={p.nome} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                      <div style={{ width: 32, height: 32, borderRadius: "50%", background: p.g, display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".58rem", fontWeight: 800, color: "white", flexShrink: 0 }}>{p.init}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: ".8rem", fontWeight: 700 }}>{p.nome}</div>
                        <div style={{ fontSize: ".65rem", color: "#00c9a7" }}>{p.sub}</div>
                      </div>
                      <button style={{ fontSize: ".68rem", fontWeight: 700, color: "#00c9a7", background: "rgba(0,201,167,.1)", border: "1px solid rgba(0,201,167,.2)", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontFamily: "var(--font-sans)" }}>Ver perfil</button>
                    </div>
                  ))}
                </div>

              </div>
            </div>

          </main>
        </div>

        {/* MOBILE TAB BAR */}
        <nav style={{ display: "none", position: "fixed", bottom: 0, left: 0, right: 0, background: "rgba(7,17,31,.95)", backdropFilter: "blur(20px)", borderTop: "1px solid rgba(255,255,255,.08)", padding: "8px 0", zIndex: 100 }} className="clinic-tab-mobile">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)" }}>
            {[["painel","Painel"],["pacientes","Pacientes"],["programas","Programas"],["dados","Dados"]].map(([k,l]) => (
              <button key={k} onClick={() => setTab(k as typeof tab)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "6px 0", background: "none", border: "none", cursor: "pointer", color: tab === k ? "#00c9a7" : "rgba(255,255,255,.4)", fontFamily: "var(--font-sans)", fontSize: ".58rem", fontWeight: 600 }}>
                <div style={{ width: 20, height: 20, borderRadius: "50%", background: tab === k ? "rgba(0,201,167,.2)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor" }} />
                </div>
                {l}
              </button>
            ))}
          </div>
        </nav>

        <style>{`
          @media(max-width:768px){
            .desktop-grid-clinic { grid-template-columns:1fr !important; }
            aside { display:none !important; }
            .clinic-tab-mobile { display:block !important; }
            main { padding:16px 14px 80px !important; }
          }
        `}</style>
      </div>
    </div>
  );
}
