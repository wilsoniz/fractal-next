"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { FractaLogo } from "@/components/fracta/FractaLogo";
import { FractalTriangle } from "@/components/fracta/FractalTriangle";

type DomKey = "comunicacao"|"social"|"atencao"|"regulacao"|"brincadeira"|"flexibilidade"|"autonomia"|"motivacao";

const DOMINIOS = [
  { key: "comunicacao"   as DomKey, nome: "Comunicação",    cor: "linear-gradient(90deg,#2BBFA4,#7AE040)", tag: "Crescendo", tc: "rgba(43,191,164,.15)", tt: "#1a7a6a" },
  { key: "social"        as DomKey, nome: "Social",          cor: "linear-gradient(90deg,#2A7BA8,#2BBFA4)", tag: "Adequada",  tc: "rgba(42,123,168,.12)", tt: "#1a4a6a" },
  { key: "atencao"       as DomKey, nome: "Atenção",         cor: "linear-gradient(90deg,#4FC3D8,#2BBFA4)", tag: "Em foco",   tc: "rgba(79,195,216,.15)", tt: "#1a5a6a" },
  { key: "regulacao"     as DomKey, nome: "Regulação",       cor: "linear-gradient(90deg,#2A7BA8,#4FC3D8)", tag: "Estável",   tc: "rgba(42,123,168,.1)",  tt: "#1a4a6a" },
  { key: "brincadeira"   as DomKey, nome: "Brincadeira",     cor: "linear-gradient(90deg,#7AE040,#2BBFA4)", tag: "Forte",     tc: "rgba(122,224,64,.15)", tt: "#3a6a1a" },
  { key: "flexibilidade" as DomKey, nome: "Flexibilidade",   cor: "linear-gradient(90deg,#4FC3D8,#7AE040)", tag: "Em foco",   tc: "rgba(79,195,216,.15)", tt: "#1a5a6a" },
  { key: "autonomia"     as DomKey, nome: "Autonomia",       cor: "linear-gradient(90deg,#2BBFA4,#7AE040)", tag: "Crescendo", tc: "rgba(43,191,164,.12)", tt: "#1a7a6a" },
  { key: "motivacao"     as DomKey, nome: "Motivação",       cor: "linear-gradient(90deg,#7AE040,#4FC3D8)", tag: "Forte",     tc: "rgba(122,224,64,.15)", tt: "#3a6a1a" },
];

const ATIVIDADES = [
  { id: "pedir-o-que-quer",          nome: "Pedir o que quer",         dominio: "Comunicação", tempo: "3 min", cor: "#2BBFA4", icon: "💬" },
  { id: "aumentar-tempo-atividade",  nome: "Aumentar tempo em atividade", dominio: "Atenção",  tempo: "5 min", cor: "#7AE040", icon: "⏱️" },
  { id: "esperar-alguns-segundos",   nome: "Esperar alguns segundos",  dominio: "Regulação",  tempo: "3 min", cor: "#2A7BA8", icon: "🌊" },
];

const PROG_BARS = [42, 55, 50, 68, 62, 74, 79];

export default function AppPage() {
  const [nomeResp,    setNomeResp]    = useState("Ana");
  const [nomeCrianca, setNomeCrianca] = useState("Lucas");
  const [idade,       setIdade]       = useState("4");
  const [scores,      setScores]      = useState<Record<DomKey, number>>({
    comunicacao: 58, social: 72, atencao: 44, regulacao: 60,
    brincadeira: 78, flexibilidade: 38, autonomia: 65, motivacao: 82,
  });
  const [barsVisible, setBarsVisible] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [tab, setTab] = useState<"home"|"atividades"|"progresso"|"filho">("home");

  useEffect(() => {
    // Carregar dados da sessão se existirem
    const n  = sessionStorage.getItem("fracta_nome");
    const i  = sessionStorage.getItem("fracta_idade");
    const r  = sessionStorage.getItem("fracta_resp");
    const sc = sessionStorage.getItem("fracta_radar");
    if (n) setNomeCrianca(n);
    if (i) setIdade(i);
    if (r) setNomeResp(r);
    if (sc) {
      try { setScores(JSON.parse(sc)); } catch (_) {}
    }
    // Animar barras
    setTimeout(() => setBarsVisible(true), 300);
  }, []);

  const hora = new Date().getHours();
  const saudacao = hora < 12 ? "Bom dia" : hora < 18 ? "Boa tarde" : "Boa noite";

  const card: React.CSSProperties = {
    background: "rgba(255,255,255,.84)",
    backdropFilter: "blur(14px)",
    borderRadius: 22,
    border: "1px solid rgba(43,191,164,.18)",
    boxShadow: "0 4px 28px rgba(43,191,164,.06)",
    padding: 22,
  };

  return (
    <div style={{
      fontFamily: "var(--font-sans)", color: "#1E3A5F", minHeight: "100vh",
      background: "radial-gradient(ellipse 80% 60% at 20% 10%, rgba(122,224,64,.10) 0%, transparent 55%), radial-gradient(ellipse 60% 70% at 80% 90%, rgba(43,191,164,.13) 0%, transparent 55%), linear-gradient(160deg,#e8f8ff 0%,#f0fdfb 35%,#edfff8 65%,#ddf4ff 100%)",
    }}>

      {/* NAV */}
      <nav style={{ background: "rgba(255,255,255,.78)", backdropFilter: "blur(18px)", borderBottom: "1px solid rgba(43,191,164,.15)", padding: "0 24px", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100 }}>
        <Link href="/care" style={{ textDecoration: "none" }}>
          <FractaLogo logo="care" height={32} alt="FractaCare" />
        </Link>
        {/* Desktop links */}
        <ul style={{ display: "flex", gap: 28, listStyle: "none" }} className="hide-mobile">
          {[["home","Início"],["atividades","Atividades"],["progresso","Progresso"],["filho","Meu filho"]].map(([k,l]) => (
            <li key={k}>
              <button onClick={() => setTab(k as typeof tab)} style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-sans)", fontSize: ".82rem", fontWeight: 600, color: tab === k ? "#2BBFA4" : "#5a7a9a", transition: "color .2s" }}>
                {l}
              </button>
            </li>
          ))}
        </ul>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg,#2BBFA4,#2A7BA8)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".6rem", fontWeight: 800, color: "white" }}>
            {nomeResp.slice(0,2).toUpperCase()}
          </div>
          <span style={{ fontSize: ".82rem", fontWeight: 600, color: "#1E3A5F" }} className="hide-mobile">{nomeResp}</span>
        </div>
      </nav>

      {/* DESKTOP LAYOUT */}
      <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", minHeight: "calc(100vh - 60px)" }} className="desktop-grid">

        {/* SIDEBAR */}
        <aside style={{ background: "rgba(255,255,255,.55)", backdropFilter: "blur(10px)", borderRight: "1px solid rgba(43,191,164,.12)", padding: "24px 14px" }} className="sidebar-desktop">
          {/* Criança */}
          <div style={{ background: "rgba(255,255,255,.84)", borderRadius: 16, padding: "14px", marginBottom: 20, border: "1px solid rgba(43,191,164,.15)", textAlign: "center" }}>
            <FractalTriangle size={50} animate />
            <div style={{ fontSize: ".95rem", fontWeight: 800, color: "#1E3A5F", marginTop: 6 }}>{nomeCrianca}</div>
            <div style={{ fontSize: ".72rem", color: "#8a9ab8" }}>{idade} anos · Perfil ativo</div>
          </div>

          {[
            { k:"home",        label:"Início",      icon:"M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" },
            { k:"atividades",  label:"Atividades",  icon:"M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" },
            { k:"progresso",   label:"Progresso",   icon:"M22 12h-4l-3 9L9 3l-3 9H2" },
            { k:"filho",       label:"Meu filho",   icon:"M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" },
          ].map(item => (
            <button key={item.k} onClick={() => setTab(item.k as typeof tab)} style={{
              display: "flex", alignItems: "center", gap: 10, width: "100%",
              padding: "10px 12px", borderRadius: 12, border: "none",
              background: tab === item.k ? "linear-gradient(135deg,rgba(43,191,164,.15),rgba(122,224,64,.1))" : "transparent",
              color: tab === item.k ? "#2BBFA4" : "#5a7a9a",
              fontFamily: "var(--font-sans)", fontSize: ".83rem", fontWeight: tab === item.k ? 700 : 500,
              cursor: "pointer", marginBottom: 2, transition: "all .2s",
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d={item.icon} />
              </svg>
              {item.label}
            </button>
          ))}

          <div style={{ marginTop: 16, borderTop: "1px solid rgba(43,191,164,.1)", paddingTop: 16 }}>
            <button onClick={() => setTab("filho")} style={{
              display: "flex", alignItems: "center", gap: 10, width: "100%",
              padding: "10px 12px", borderRadius: 12, border: "none", background: "transparent",
              color: "#5a7a9a", fontFamily: "var(--font-sans)", fontSize: ".83rem", fontWeight: 500, cursor: "pointer",
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              Terapeuta
            </button>
          </div>
        </aside>

        {/* MAIN */}
        <main style={{ padding: "28px 28px 80px", display: "flex", flexDirection: "column", gap: 20 }}>

          {/* HEADER */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <div>
              <div style={{ fontSize: ".78rem", color: "#8a9ab8", marginBottom: 3 }}>{saudacao}, {nomeResp}</div>
              <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "#1E3A5F", letterSpacing: "-.02em" }}>Painel de {nomeCrianca}</div>
            </div>
            <Link href="/dashboard/atividade" style={{
              padding: "12px 24px", borderRadius: 50, border: "none",
              background: "linear-gradient(135deg,#2BBFA4,#7AE040)",
              color: "white", fontWeight: 800, fontSize: ".85rem",
              textDecoration: "none", boxShadow: "0 4px 16px rgba(43,191,164,.35)",
            }}>
              Registrar atividade de hoje
            </Link>
          </div>

          {/* STATS */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
            {[
              { label: "Atividades este mês", val: "18", sub: "+3 em relação ao mês anterior", acc: true },
              { label: "Média de acertos",    val: "74%", sub: "Crescimento constante",         acc: true },
              { label: "Próxima sessão",       val: "Quinta", sub: "14h · Dra. Carolina",       acc: false, subCor: "#2BBFA4" },
            ].map(s => (
              <div key={s.label} style={card}>
                <div style={{ fontSize: ".62rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".09em", color: "#8a9ab8", marginBottom: 8 }}>{s.label}</div>
                <div style={{ fontSize: s.acc ? "2.2rem" : "1.3rem", fontWeight: 800, color: s.acc ? "#2BBFA4" : "#1E3A5F", lineHeight: 1, marginBottom: 4 }}>{s.val}</div>
                <div style={{ fontSize: ".72rem", color: s.subCor ?? "#8a9ab8" }}>{s.sub}</div>
              </div>
            ))}
          </div>

          {/* GRID PRINCIPAL */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>

            {/* RADAR + DOMÍNIOS */}
            <div style={card}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <div style={{ fontSize: ".88rem", fontWeight: 800, color: "#1E3A5F" }}>Mapa de habilidades</div>
                <div style={{ fontSize: ".68rem", color: "#8a9ab8" }}>Atualizado hoje</div>
              </div>

              {/* Triângulo fractal */}
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
                <FractalTriangle size={100} animate />
              </div>

              {/* Barras de domínio */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {DOMINIOS.map(d => (
                  <div key={d.key} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ fontSize: ".76rem", fontWeight: 600, color: "#1E3A5F", width: 92, flexShrink: 0 }}>{d.nome}</div>
                    <div style={{ flex: 1, height: 7, background: "rgba(43,191,164,.12)", borderRadius: 50, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: barsVisible ? `${scores[d.key] ?? 50}%` : "0%", background: d.cor, borderRadius: 50, transition: "width 1.2s ease" }} />
                    </div>
                    <div style={{ fontSize: ".72rem", fontWeight: 700, color: "#1E3A5F", width: 32, textAlign: "right" }}>{scores[d.key] ?? 50}%</div>
                    <div style={{ fontSize: ".6rem", fontWeight: 700, padding: "2px 8px", borderRadius: 50, background: d.tc, color: d.tt, flexShrink: 0, width: 70, textAlign: "center" }}>{d.tag}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* COLUNA DIREITA */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

              {/* ENGINE */}
              <div style={{ background: "linear-gradient(135deg,rgba(43,191,164,.1),rgba(42,123,168,.07))", border: "1px solid rgba(43,191,164,.2)", borderRadius: 22, padding: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <FractaLogo logo="engine" height={20} alt="FractaEngine" />
                  <span style={{ fontSize: ".62rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".09em", color: "#2BBFA4" }}>FractaEngine</span>
                </div>
                <p style={{ fontSize: ".85rem", color: "#1E3A5F", lineHeight: 1.65, marginBottom: 12 }}>
                  {nomeCrianca} está em um ótimo momento para ampliar <strong style={{ color: "#2BBFA4" }}>comunicação funcional</strong>. Os dados das últimas 3 semanas indicam que ele está pronto para combinar palavras.
                </p>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {["Próxima habilidade","Combinar 2 palavras"].map(chip => (
                    <span key={chip} style={{ fontSize: ".65rem", fontWeight: 700, padding: "4px 12px", borderRadius: 50, background: "rgba(43,191,164,.15)", color: "#2BBFA4", border: "1px solid rgba(43,191,164,.25)" }}>{chip}</span>
                  ))}
                </div>
              </div>

              {/* TERAPEUTA */}
              <div style={card}>
                <div style={{ fontSize: ".62rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".09em", color: "#8a9ab8", marginBottom: 12 }}>Sua terapeuta</div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                  <div style={{ width: 44, height: 44, borderRadius: "50%", background: "linear-gradient(135deg,#2BBFA4,#2A7BA8)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".75rem", fontWeight: 800, color: "white", flexShrink: 0 }}>CA</div>
                  <div>
                    <div style={{ fontSize: ".92rem", fontWeight: 800, color: "#1E3A5F" }}>Dra. Carolina Amaral</div>
                    <div style={{ fontSize: ".7rem", color: "#8a9ab8" }}>Terapeuta ABA · Nível Sênior</div>
                  </div>
                </div>
                <div style={{ background: "rgba(43,191,164,.08)", border: "1px solid rgba(43,191,164,.2)", borderRadius: 12, padding: "11px 14px" }}>
                  <div style={{ fontSize: ".6rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: "#8a9ab8", marginBottom: 4 }}>Próxima sessão</div>
                  <div style={{ fontSize: ".88rem", fontWeight: 700, color: "#1E3A5F" }}>Quinta-feira, 10 de abril</div>
                  <div style={{ fontSize: ".72rem", color: "#2BBFA4", fontWeight: 600, marginTop: 2 }}>14h00 · Online via FractaClinic</div>
                </div>
              </div>

              {/* PROGRESSO SEMANAL */}
              <div style={card}>
                <div style={{ fontSize: ".62rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".09em", color: "#8a9ab8", marginBottom: 12 }}>Acertos por semana</div>
                <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 60 }}>
                  {PROG_BARS.map((h, i) => (
                    <div key={i} style={{ flex: 1, borderRadius: "4px 4px 0 0", height: barsVisible ? `${h}%` : "0%", background: i % 2 === 0 ? "linear-gradient(to top,#2BBFA4,rgba(43,191,164,.3))" : "linear-gradient(to top,#2A7BA8,rgba(42,123,168,.3))", transition: `height 1.2s ease ${i * 0.1}s` }} />
                  ))}
                </div>
              </div>

            </div>
          </div>

          {/* ATIVIDADES DO DIA */}
          <div style={{ ...card, padding: 0, overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 22px", borderBottom: "1px solid rgba(43,191,164,.1)" }}>
              <div style={{ fontSize: ".88rem", fontWeight: 800, color: "#1E3A5F" }}>Atividades de hoje</div>
              <Link href="/dashboard/atividade" style={{ fontSize: ".72rem", fontWeight: 600, color: "#2BBFA4", textDecoration: "none" }}>Ver todas</Link>
            </div>
            {ATIVIDADES.map(a => (
              <Link key={a.id} href="/dashboard/atividade" style={{
                display: "flex", alignItems: "center", gap: 14, padding: "14px 22px",
                borderBottom: "1px solid rgba(43,191,164,.06)", textDecoration: "none",
                transition: "background .2s",
              }}
              onMouseEnter={e => (e.currentTarget.style.background = "rgba(43,191,164,.04)")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                <div style={{ width: 40, height: 40, borderRadius: 12, background: `${a.cor}22`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem", flexShrink: 0 }}>{a.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: ".88rem", fontWeight: 700, color: "#1E3A5F", marginBottom: 2 }}>{a.nome}</div>
                  <div style={{ fontSize: ".72rem", color: "#8a9ab8" }}>{a.dominio} · {a.tempo}</div>
                </div>
                <div style={{ fontSize: ".68rem", fontWeight: 700, padding: "3px 10px", borderRadius: 50, background: "rgba(43,191,164,.12)", color: "#2BBFA4" }}>Hoje</div>
                <span style={{ color: "#2BBFA4", fontSize: ".9rem" }}>›</span>
              </Link>
            ))}
          </div>

        </main>
      </div>

      {/* MOBILE TAB BAR */}
      <nav style={{ display: "none", position: "fixed", bottom: 0, left: 0, right: 0, background: "rgba(255,255,255,.92)", backdropFilter: "blur(16px)", borderTop: "1px solid rgba(43,191,164,.15)", padding: "10px 0", zIndex: 100 }} className="tab-bar-mobile">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)" }}>
          {[
            { k:"home",       label:"Home",      icon:"M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" },
            { k:"atividades", label:"Atividades", icon:"M9 11l3 3L22 4" },
            { k:"progresso",  label:"Progresso",  icon:"M22 12h-4l-3 9L9 3l-3 9H2" },
            { k:"filho",      label:"Meu filho",  icon:"M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" },
          ].map(item => (
            <button key={item.k} onClick={() => setTab(item.k as typeof tab)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "6px 0", background: "none", border: "none", cursor: "pointer", color: tab === item.k ? "#2BBFA4" : "#8a9ab8", fontFamily: "var(--font-sans)", fontSize: ".6rem", fontWeight: 600, transition: "color .2s" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d={item.icon} />
              </svg>
              {item.label}
            </button>
          ))}
        </div>
      </nav>

      <style>{`
        @media(max-width:768px){
          .desktop-grid { grid-template-columns:1fr !important; }
          .sidebar-desktop { display:none !important; }
          .tab-bar-mobile { display:block !important; }
          .hide-mobile { display:none !important; }
          main { padding:16px 14px 84px !important; }
        }
      `}</style>
    </div>
  );
}
