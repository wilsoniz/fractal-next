"use client";
import Link from "next/link";
import { useState } from "react";
import { FractaLogo } from "@/components/fracta/FractaLogo";

const platforms = [
  {
    logo: "care" as const,
    label: "Para famílias",
    title: "FractaCare",
    desc: "Avaliação de desenvolvimento, atividades práticas diárias e acompanhamento do progresso em linguagem acessível.",
    href: "/captura",
    cta: "Fazer avaliação gratuita",
    accent: "#2BBFA4",
    features: ["Radar de habilidades em 8 domínios","Atividades personalizadas por dia","Progresso ao longo do tempo","Conexão com terapeuta via FractaEngine"],
  },
  {
    logo: "clinic" as const,
    label: "Para terapeutas ABA",
    title: "FractaClinic",
    desc: "Gestão clínica completa com registro por operante, análise funcional, protocolos e captação via FractaEngine.",
    href: "/clinic-landing",
    cta: "Quero captar pacientes",
    accent: "#2A7BA8",
    features: ["Registro de sessão em tempo real","Análise funcional estruturada","Programas de ensino e protocolos","Captação previsível via FractaEngine"],
  },
];

const engine_pillars = [
  { n:"01", title:"Avalia", desc:"Triagem inicial, anamnese, check-ins e instrumentos clínicos alimentam o perfil do aprendiz." },
  { n:"02", title:"Interpreta", desc:"O FractaEngine cruza repertório atual, cúspides comportamentais e comportamentos pivotais." },
  { n:"03", title:"Recomenda", desc:"Programas e estratégias são sugeridos com base no momento de desenvolvimento real." },
  { n:"04", title:"Conecta", desc:"Famílias são conectadas ao terapeuta compatível com o perfil completo antes da 1ª sessão." },
];

const stats = [
  { val: "4.800+", label: "Famílias ativas" },
  { val: "40+",    label: "Atividades práticas" },
  { val: "8",      label: "Domínios avaliados" },
  { val: "2 min",  label: "Para a avaliação" },
];

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div style={{ fontFamily: "var(--font-sans)", background: "#f8f9fb", color: "#1E3A5F", minHeight: "100vh" }}>

      {/* NAV */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 100,
        background: "rgba(255,255,255,.95)", backdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(0,0,0,.06)",
        padding: "0 20px", height: 62,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <Link href="/" style={{ textDecoration: "none" }}>
          <FractaLogo logo="fb" height={36} alt="Fracta Behavior" />
        </Link>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <Link href="/captura" style={{
            padding: "8px 16px", borderRadius: 8, fontSize: ".78rem", fontWeight: 700,
            background: "linear-gradient(135deg,#2BBFA4,#1e9e88)",
            color: "white", textDecoration: "none",
          }}>Começar grátis</Link>

          <button onClick={() => setMenuOpen(v => !v)} style={{
            background: "none", border: "none", cursor: "pointer", padding: 4,
            display: "flex", flexDirection: "column", gap: 4,
          }}>
            <span style={{ width: 20, height: 2, background: "#1E3A5F", borderRadius: 2, display: "block", transition: "all .2s", transform: menuOpen ? "rotate(45deg) translate(4px,4px)" : "none" }} />
            <span style={{ width: 20, height: 2, background: "#1E3A5F", borderRadius: 2, display: "block", opacity: menuOpen ? 0 : 1 }} />
            <span style={{ width: 20, height: 2, background: "#1E3A5F", borderRadius: 2, display: "block", transition: "all .2s", transform: menuOpen ? "rotate(-45deg) translate(4px,-4px)" : "none" }} />
          </button>
        </div>
      </nav>

      {menuOpen && (
        <div style={{
          position: "fixed", top: 62, left: 0, right: 0, zIndex: 99,
          background: "rgba(255,255,255,.98)", borderBottom: "1px solid rgba(0,0,0,.06)",
          padding: "16px 20px", display: "flex", flexDirection: "column", gap: 12,
        }}>
          {[["#plataformas","Plataformas"],["#engine","FractaEngine"],["#captura","Para famílias"],["#terapeutas","Para terapeutas"]].map(([href,label]) => (
            <a key={href} href={href} onClick={() => setMenuOpen(false)} style={{ fontSize: ".9rem", fontWeight: 600, color: "#1E3A5F", textDecoration: "none", padding: "8px 0", borderBottom: "1px solid rgba(0,0,0,.05)" }}>{label}</a>
          ))}
          <Link href="/captura" onClick={() => setMenuOpen(false)} style={{
            marginTop: 4, padding: "12px", borderRadius: 8, textAlign: "center",
            background: "linear-gradient(135deg,#2BBFA4,#1e9e88)",
            color: "white", fontWeight: 800, fontSize: ".88rem", textDecoration: "none",
          }}>Fazer avaliação gratuita</Link>
          <Link href="/clinic-landing" onClick={() => setMenuOpen(false)} style={{
            padding: "12px", borderRadius: 8, textAlign: "center",
            border: "1.5px solid rgba(42,123,168,.3)",
            color: "#2A7BA8", fontWeight: 700, fontSize: ".88rem", textDecoration: "none",
          }}>Sou terapeuta ABA</Link>
        </div>
      )}

      {/* HERO */}
      <section style={{
        padding: "52px 20px 40px",
        background: "linear-gradient(180deg,#ffffff 0%,#f0f8ff 100%)",
        borderBottom: "1px solid rgba(0,0,0,.05)",
      }}>
        <div style={{ maxWidth: 680, margin: "0 auto" }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: "rgba(43,191,164,.1)", border: "1px solid rgba(43,191,164,.25)",
            borderRadius: 50, padding: "5px 16px", marginBottom: 20,
            fontSize: ".65rem", fontWeight: 700, color: "#2BBFA4",
            textTransform: "uppercase", letterSpacing: ".12em",
          }}>
            Análise do Comportamento Aplicada
          </div>

          <h1 style={{ fontSize: "clamp(2rem,5vw,3.8rem)", fontWeight: 800, lineHeight: 1.06, letterSpacing: "-.03em", marginBottom: 18, color: "#0f1f3d" }}>
            Cada comportamento<br />tem uma história<br />
            <span style={{ color: "#2BBFA4" }}>Nós ajudamos a reescrevê-la.</span>
          </h1>

          <p style={{ fontSize: ".98rem", color: "#5a7a9a", lineHeight: 1.75, marginBottom: 28, maxWidth: 480 }}>
            Fracta Behavior conecta famílias e terapeutas ABA — com base científica real, interfaces distintas e uma base de dados unificada.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 340 }}>
            <Link href="/captura" style={{
              padding: "14px 28px", borderRadius: 10, textAlign: "center",
              background: "linear-gradient(135deg,#2BBFA4,#1e9e88)",
              color: "white", fontWeight: 800, fontSize: ".9rem", textDecoration: "none",
              boxShadow: "0 4px 20px rgba(43,191,164,.3)",
            }}>Fazer avaliação gratuita</Link>
            <Link href="/clinic-landing" style={{
              padding: "13px 28px", borderRadius: 10, textAlign: "center",
              border: "1.5px solid rgba(42,123,168,.3)",
              color: "#2A7BA8", fontWeight: 700, fontSize: ".9rem", textDecoration: "none",
            }}>Sou terapeuta ABA</Link>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 16, marginTop: 36, paddingTop: 28, borderTop: "1px solid rgba(0,0,0,.06)" }}>
            {stats.map(s => (
              <div key={s.label}>
                <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#0f1f3d" }}>{s.val}</div>
                <div style={{ fontSize: ".7rem", color: "#8a9ab8", marginTop: 3 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PLATAFORMAS */}
      <section id="plataformas" style={{ padding: "52px 20px", background: "#ffffff" }}>
        <div style={{ maxWidth: 680, margin: "0 auto" }}>
          <div style={{ fontSize: ".62rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".14em", color: "#2BBFA4", marginBottom: 8 }}>Ecossistema</div>
          <h2 style={{ fontSize: "clamp(1.6rem,4vw,2.6rem)", fontWeight: 800, letterSpacing: "-.02em", marginBottom: 10 }}>Uma base. Duas interfaces.</h2>
          <p style={{ fontSize: ".9rem", color: "#5a7a9a", lineHeight: 1.7, marginBottom: 28 }}>
            Os mesmos dados clínicos alimentam o FractaCare para pais e o FractaClinic para terapeutas.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {platforms.map(p => (
              <div key={p.title} style={{
                background: "#f8f9fb", border: "1px solid rgba(0,0,0,.06)",
                borderRadius: 20, padding: "28px 22px",
                display: "flex", flexDirection: "column", gap: 18,
              }}>
                <div>
                  <FractaLogo logo={p.logo} height={44} alt={p.title} />
                  <div style={{ fontSize: ".62rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", color: "#8a9ab8", marginTop: 8 }}>{p.label}</div>
                </div>
                <p style={{ fontSize: ".88rem", color: "#5a7a9a", lineHeight: 1.75 }}>{p.desc}</p>
                <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
                  {p.features.map(f => (
                    <li key={f} style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: ".82rem", color: "#3a5a7a" }}>
                      <span style={{ width: 5, height: 5, borderRadius: "50%", background: p.accent, flexShrink: 0, marginTop: 6 }} />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href={p.href} style={{
                  display: "block", padding: "12px 20px", borderRadius: 10, textAlign: "center",
                  background: `${p.accent}12`, border: `1.5px solid ${p.accent}30`,
                  color: p.accent, fontWeight: 700, fontSize: ".82rem", textDecoration: "none",
                }}>{p.cta}</Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FRACTAENGINE */}
      <section id="engine" style={{ padding: "52px 20px", background: "#f0f8ff" }}>
        <div style={{ maxWidth: 680, margin: "0 auto" }}>
          <div style={{ fontSize: ".62rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".14em", color: "#2BBFA4", marginBottom: 8 }}>Motor de inteligência</div>
          <h2 style={{ fontSize: "clamp(1.6rem,4vw,2.4rem)", fontWeight: 800, letterSpacing: "-.02em", marginBottom: 12 }}>FractaEngine</h2>
          <p style={{ fontSize: ".9rem", color: "#5a7a9a", lineHeight: 1.75, marginBottom: 20 }}>
            O cérebro do ecossistema. Avalia o repertório do aprendiz, identifica cúspides comportamentais emergentes, recomenda intervenções e conecta famílias ao terapeuta compatível.
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
            <FractaLogo logo="engine" height={40} alt="FractaEngine" />
            <span style={{ fontSize: ".78rem", color: "#8a9ab8" }}>Fracta Behavior · Motor proprietário</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {engine_pillars.map(p => (
              <div key={p.n} style={{
                display: "flex", gap: 16, alignItems: "flex-start",
                background: "white", border: "1px solid rgba(0,0,0,.06)",
                borderRadius: 16, padding: "16px 18px",
              }}>
                <div style={{ fontSize: "1rem", fontWeight: 800, color: "rgba(43,191,164,.4)", width: 32, flexShrink: 0 }}>{p.n}</div>
                <div>
                  <div style={{ fontSize: ".88rem", fontWeight: 700, color: "#0f1f3d", marginBottom: 4 }}>{p.title}</div>
                  <div style={{ fontSize: ".78rem", color: "#5a7a9a", lineHeight: 1.65 }}>{p.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section style={{
        padding: "60px 20px", textAlign: "center",
        background: "linear-gradient(180deg,#ffffff 0%,#e8f8ff 100%)",
        borderTop: "1px solid rgba(0,0,0,.05)",
      }}>
        <div style={{ maxWidth: 480, margin: "0 auto" }}>
          <FractaLogo logo="fb" height={64} alt="Fracta Behavior" style={{ margin: "0 auto 24px", display: "block" }} />
          <h2 style={{ fontSize: "clamp(1.6rem,4vw,2.6rem)", fontWeight: 800, letterSpacing: "-.02em", color: "#0f1f3d", marginBottom: 14 }}>
            Pronto para começar?
          </h2>
          <p style={{ fontSize: ".9rem", color: "#5a7a9a", marginBottom: 28, lineHeight: 1.75 }}>
            Faça a avaliação gratuita em 2 minutos e receba o mapa de habilidades do seu filho.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Link href="/captura" style={{
              padding: "14px 28px", borderRadius: 10, textAlign: "center",
              background: "linear-gradient(135deg,#2BBFA4,#1e9e88)",
              color: "white", fontWeight: 800, fontSize: ".9rem", textDecoration: "none",
              boxShadow: "0 4px 20px rgba(43,191,164,.3)",
            }}>Fazer avaliação gratuita</Link>
            <Link href="/clinic-landing" style={{
              padding: "13px 28px", borderRadius: 10, textAlign: "center",
              border: "1.5px solid rgba(42,123,168,.3)",
              color: "#2A7BA8", fontWeight: 700, fontSize: ".9rem", textDecoration: "none",
            }}>Sou terapeuta ABA</Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ padding: "40px 20px 28px", borderTop: "1px solid rgba(0,0,0,.07)", background: "#ffffff" }}>
        <div style={{ maxWidth: 680, margin: "0 auto" }}>
          <FractaLogo logo="fb" height={36} alt="Fracta Behavior" />
          <p style={{ fontSize: ".78rem", color: "#8a9ab8", marginTop: 10, lineHeight: 1.7, marginBottom: 24 }}>
            Desenvolvimento infantil guiado por ciência e amor.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 24 }}>
            {[
              { title: "Plataformas", links: [["/captura","FractaCare"],["/clinic-landing","FractaClinic"],["/captura/avaliacao","Avaliação gratuita"]] },
              { title: "Empresa", links: [["#","Sobre a Fracta"],["#","Base científica"],["#","Privacidade"]] },
            ].map(col => (
              <div key={col.title}>
                <div style={{ fontSize: ".6rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", color: "#aabbcc", marginBottom: 12 }}>{col.title}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {col.links.map(([href,label]) => (
                    <Link key={label} href={href} style={{ fontSize: ".8rem", color: "#5a7a9a", textDecoration: "none" }}>{label}</Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div style={{ borderTop: "1px solid rgba(0,0,0,.06)", paddingTop: 16, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
            <span style={{ fontSize: ".7rem", color: "#aabbcc" }}>© 2025 Fracta Behavior. Todos os direitos reservados.</span>
            <Link href="#" style={{ fontSize: ".7rem", color: "#aabbcc", textDecoration: "none" }}>Política de Privacidade</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
