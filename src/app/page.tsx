"use client";
import Link from "next/link";
import { NavBar } from "@/components/fracta/NavBar";
import { FractaLogo } from "@/components/fracta/FractaLogo";



const platforms = [
  {
    logo: "care" as const,
    label: "Para famílias",
    title: "FractaCare",
    desc: "Avaliação de desenvolvimento, atividades práticas diárias e acompanhamento do progresso em linguagem acessível para pais e responsáveis.",
    href: "/care",
    cta: "Fazer avaliação gratuita",
    accent: "#2BBFA4",
    features: ["Radar de habilidades em 8 domínios","Atividades personalizadas por dia","Progresso e conquistas ao longo do tempo","Conexão com terapeuta via FractaEngine"],
  },
  {
    logo: "clinic" as const,
    label: "Para terapeutas ABA",
    title: "FractaClinic",
    desc: "Gestão clínica completa com registro por operante, análise funcional, protocolos comportamentais e captação de pacientes via FractaEngine.",
    href: "/clinic",
    cta: "Quero captar pacientes",
    accent: "#2A7BA8",
    features: ["Registro de sessão em tempo real","Análise funcional estruturada","Programas de ensino e protocolos","Captação previsível via FractaEngine"],
  },
];

const engine_pillars = [
  { n:"01", title:"Avalia", desc:"Triagem inicial, anamnese, check-ins e instrumentos clínicos formais alimentam o perfil do aprendiz." },
  { n:"02", title:"Interpreta", desc:"O FractaEngine cruza repertório atual, cúspides comportamentais e comportamentos pivotais." },
  { n:"03", title:"Recomenda", desc:"Programas de ensino e estratégias são sugeridos com base no momento de desenvolvimento real." },
  { n:"04", title:"Conecta", desc:"Famílias são conectadas ao terapeuta compatível. Terapeuta recebe o perfil completo antes da primeira sessão." },
];

const stats = [
  { val: "4.800+", label: "Famílias ativas" },
  { val: "40+",    label: "Atividades práticas" },
  { val: "8",      label: "Domínios avaliados" },
  { val: "2 min",  label: "Para a avaliação inicial" },
];

export default function Home() {
  return (
    <div style={{ fontFamily: "var(--font-sans)", background: "#f8f9fb", color: "#1E3A5F", minHeight: "100vh" }}>
      <NavBar />

      {/* ── HERO ── */}
      <section style={{
        padding: "100px 40px 80px",
        background: "linear-gradient(180deg, #ffffff 0%, #f0f8ff 100%)",
        borderBottom: "1px solid rgba(0,0,0,0.05)",
      }}>
        <div style={{ maxWidth: 1040, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr auto", gap: 64, alignItems: "center" }}>
          <div>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              background: "rgba(43,191,164,.1)", border: "1px solid rgba(43,191,164,.25)",
              borderRadius: 50, padding: "5px 16px", marginBottom: 24,
              fontSize: ".68rem", fontWeight: 700, color: "#2BBFA4",
              textTransform: "uppercase", letterSpacing: ".12em",
            }}>
              Análise do Comportamento Aplicada
            </div>

            <h1 style={{
              fontSize: "clamp(2.4rem,4.5vw,4rem)", fontWeight: 800,
              lineHeight: 1.06, letterSpacing: "-.03em", marginBottom: 20, color: "#0f1f3d",
            }}>
              Cada comportamento tem uma história <br />
              <span style={{ color: "#2BBFA4" }}>Nós ajudamos a reescrevê-la.</span>
            </h1>

            <p style={{
              fontSize: "1.05rem", color: "#5a7a9a", lineHeight: 1.75,
              marginBottom: 36, maxWidth: 480,
            }}>
              Fracta Behavior é o ecossistema que conecta famílias e terapeutas ABA — com base científica real, interfaces distintas e uma base de dados unificada.
            </p>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <Link href="/care" style={{
                padding: "14px 30px", borderRadius: 10,
                background: "linear-gradient(135deg,#2BBFA4,#1e9e88)",
                color: "white", fontWeight: 800, fontSize: ".9rem",
                textDecoration: "none", boxShadow: "0 4px 20px rgba(43,191,164,.3)",
              }}>
                Sou responsável →
              </Link>
              <Link href="/clinic" style={{
                padding: "14px 30px", borderRadius: 10,
                border: "1.5px solid rgba(42,123,168,.3)",
                color: "#2A7BA8", fontWeight: 700, fontSize: ".9rem",
                textDecoration: "none", background: "white",
              }}>
                Sou terapeuta ABA
              </Link>
            </div>

            {/* Stats */}
            <div style={{ display: "flex", gap: 40, marginTop: 52, paddingTop: 40, borderTop: "1px solid rgba(0,0,0,0.06)" }}>
              {stats.map(s => (
                <div key={s.label}>
                  <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "#0f1f3d" }}>{s.val}</div>
                  <div style={{ fontSize: ".72rem", color: "#8a9ab8", marginTop: 3 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ position: "relative" }}>
            <div style={{
              position: "absolute", inset: -24,
              background: "radial-gradient(ellipse at center, rgba(43,191,164,.1) 0%, transparent 70%)",
              borderRadius: "50%",
            }} />
            <FractaLogo logo="fb" height={120} alt="Fracta Behavior" style={{ position: "relative" }} />
          </div>
        </div>
      </section>

      {/* ── PLATAFORMAS ── */}
      <section style={{ padding: "96px 40px", background: "#ffffff" }}>
        <div style={{ maxWidth: 1040, margin: "0 auto" }}>
          <div style={{ marginBottom: 56 }}>
            <div style={{ fontSize: ".65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".14em", color: "#2BBFA4", marginBottom: 10 }}>
              Ecossistema
            </div>
            <h2 style={{ fontSize: "clamp(1.8rem,3vw,2.8rem)", fontWeight: 800, letterSpacing: "-.02em", color: "#0f1f3d", marginBottom: 12 }}>
              Uma base. Duas interfaces.
            </h2>
            <p style={{ fontSize: ".95rem", color: "#5a7a9a", maxWidth: 520, lineHeight: 1.7 }}>
              Os mesmos dados clínicos alimentam o FractaCare para pais e o FractaClinic para terapeutas — cada um com a interface e linguagem adequadas.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            {platforms.map(p => (
              <div key={p.title} style={{
                background: "#f8f9fb", border: "1px solid rgba(0,0,0,0.06)",
                borderRadius: 24, padding: "36px", display: "flex", flexDirection: "column", gap: 22,
                transition: "all .25s",
              }}
              onMouseEnter={e => {
                e.currentTarget.style.boxShadow = `0 8px 40px ${p.accent}18`;
                e.currentTarget.style.borderColor = `${p.accent}44`;
                e.currentTarget.style.background = "#ffffff";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.boxShadow = "none";
                e.currentTarget.style.borderColor = "rgba(0,0,0,0.06)";
                e.currentTarget.style.background = "#f8f9fb";
              }}
              >
                <div>
                  <FractaLogo logo={p.logo} height={38} alt={p.title} />
                  <div style={{ fontSize: ".65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", color: "#8a9ab8", marginTop: 8 }}>{p.label}</div>
                </div>
                <p style={{ fontSize: ".88rem", color: "#5a7a9a", lineHeight: 1.75 }}>{p.desc}</p>
                <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 9 }}>
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
                  transition: "all .2s",
                }}>
                  {p.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FRACTAENGINE ── */}
      <section style={{ padding: "96px 40px", background: "#f0f8ff" }}>
        <div style={{ maxWidth: 1040, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 64, alignItems: "center" }}>
            <div>
              <div style={{ fontSize: ".65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".14em", color: "#2BBFA4", marginBottom: 10 }}>
                Motor de inteligência
              </div>
              <h2 style={{ fontSize: "clamp(1.8rem,3vw,2.6rem)", fontWeight: 800, letterSpacing: "-.02em", color: "#0f1f3d", marginBottom: 16 }}>
                FractaEngine
              </h2>
              <p style={{ fontSize: ".92rem", color: "#5a7a9a", lineHeight: 1.75, marginBottom: 32 }}>
                O cérebro do ecossistema. Avalia o repertório do aprendiz, identifica cúspides comportamentais emergentes, recomenda intervenções e conecta famílias ao terapeuta compatível.
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <FractaLogo logo="engine" height={28} alt="FractaEngine" />
                <span style={{ fontSize: ".78rem", color: "#8a9ab8" }}>Fracta Behavior · Motor proprietário</span>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {engine_pillars.map(p => (
                <div key={p.n} style={{
                  display: "flex", gap: 16, alignItems: "flex-start",
                  background: "white", border: "1px solid rgba(0,0,0,0.06)",
                  borderRadius: 16, padding: "18px 20px",
                }}>
                  <div style={{
                    fontSize: "1.1rem", fontWeight: 800, color: "rgba(43,191,164,.35)",
                    width: 36, flexShrink: 0, lineHeight: 1,
                  }}>{p.n}</div>
                  <div>
                    <div style={{ fontSize: ".88rem", fontWeight: 700, color: "#0f1f3d", marginBottom: 4 }}>{p.title}</div>
                    <div style={{ fontSize: ".78rem", color: "#5a7a9a", lineHeight: 1.65 }}>{p.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ── */}
      <section style={{
        padding: "100px 40px", textAlign: "center",
        background: "linear-gradient(180deg, #ffffff 0%, #e8f8ff 100%)",
        borderTop: "1px solid rgba(0,0,0,0.05)",
      }}>
        <div style={{ maxWidth: 560, margin: "0 auto" }}>
          <FractaLogo logo="fb" height={56} alt="Fracta Behavior" style={{ margin: "0 auto 28px", display: "block" }} />
          <h2 style={{ fontSize: "clamp(1.8rem,3.5vw,2.8rem)", fontWeight: 800, letterSpacing: "-.02em", color: "#0f1f3d", marginBottom: 16 }}>
            Pronto para começar?
          </h2>
          <p style={{ fontSize: ".92rem", color: "#5a7a9a", marginBottom: 36, lineHeight: 1.75 }}>
            Faça a avaliação gratuita em 2 minutos e receba o mapa de habilidades do seu filho.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/care" style={{
              padding: "14px 32px", borderRadius: 10,
              background: "linear-gradient(135deg,#2BBFA4,#1e9e88)",
              color: "white", fontWeight: 800, fontSize: ".9rem",
              textDecoration: "none", boxShadow: "0 4px 20px rgba(43,191,164,.3)",
            }}>
              Sou responsável
            </Link>
            <Link href="/clinic" style={{
              padding: "14px 32px", borderRadius: 10,
              border: "1.5px solid rgba(42,123,168,.3)",
              color: "#2A7BA8", fontWeight: 700, fontSize: ".9rem",
              textDecoration: "none", background: "white",
            }}>
              Sou terapeuta ABA
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{
        padding: "48px 40px 32px",
        borderTop: "1px solid rgba(0,0,0,0.07)",
        background: "#ffffff",
      }}>
        <div style={{ maxWidth: 1040, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 32, marginBottom: 40 }}>
            <div>
              <FractaLogo logo="fb" height={28} alt="Fracta Behavior" />
              <p style={{ fontSize: ".78rem", color: "#8a9ab8", marginTop: 10, maxWidth: 240, lineHeight: 1.7 }}>
                Desenvolvimento infantil guiado por ciência e amor.
              </p>
            </div>
            <div style={{ display: "flex", gap: 56 }}>
              {[
                { title: "Plataformas", links: [{href:"/care",l:"FractaCare"},{href:"/clinic",l:"FractaClinic"},{href:"/captura/avaliacao",l:"Avaliação gratuita"}] },
                { title: "Empresa", links: [{href:"#",l:"Sobre a Fracta"},{href:"#",l:"Base científica"},{href:"#",l:"Privacidade"}] },
              ].map(col => (
                <div key={col.title}>
                  <div style={{ fontSize: ".6rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", color: "#aabbcc", marginBottom: 14 }}>{col.title}</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {col.links.map(lk => (
                      <Link key={lk.l} href={lk.href} style={{ fontSize: ".8rem", color: "#5a7a9a", textDecoration: "none" }}>{lk.l}</Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ borderTop: "1px solid rgba(0,0,0,0.06)", paddingTop: 20, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
            <span style={{ fontSize: ".72rem", color: "#aabbcc" }}>© 2025 Fracta Behavior. Todos os direitos reservados.</span>
            <Link href="#" style={{ fontSize: ".72rem", color: "#aabbcc", textDecoration: "none" }}>Política de Privacidade</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
