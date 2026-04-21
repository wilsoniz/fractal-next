"use client";
import Link from "next/link";
import { useState } from "react";
import { FractaLogo } from "@/components/fracta/FractaLogo";

const steps = [
  { n: "1", titulo: "Você responde a avaliação", desc: "14 perguntas simples sobre o dia a dia do seu filho. Leva menos de 2 minutos." },
  { n: "2", titulo: "Geramos o mapa de habilidades", desc: "O FractaEngine analisa as respostas e cria um radar personalizado de desenvolvimento." },
  { n: "3", titulo: "Você recebe atividades personalizadas", desc: "Planos simples, em linguagem acessível, para praticar em casa." },
  { n: "4", titulo: "Acompanhamos o progresso", desc: "O sistema se adapta ao seu filho e registra cada avanço ao longo do tempo." },
];

const domains = [
  { nome: "Comunicação",     icon: "💬", desc: "Pedir, nomear, conversar e se expressar." },
  { nome: "Interação Social", icon: "🤝", desc: "Compartilhar, brincar e se relacionar." },
  { nome: "Atenção",         icon: "🎯", desc: "Focar, sustentar e retornar a atenção." },
  { nome: "Regulação",       icon: "💙", desc: "Lidar com frustrações e emoções." },
  { nome: "Brincadeira",     icon: "🎨", desc: "Explorar, criar e brincar com propósito." },
  { nome: "Flexibilidade",   icon: "🔄", desc: "Adaptar-se a mudanças e novidades." },
  { nome: "Autonomia",       icon: "⭐", desc: "Fazer, organizar e cuidar de si mesmo." },
  { nome: "Motivação",       icon: "🚀", desc: "Curiosidade, persistência e engajamento." },
];

const paraQuem = [
  {
    icon: "📈", titulo: "Desenvolver novas habilidades",
    desc: "Atividades práticas alinhadas ao momento do seu filho.",
    items: ["Comunicação funcional e linguagem", "Interação social e brincadeira", "Atenção e aprendizagem", "Autonomia e autocuidado"],
    cor: "#2BBFA4",
  },
  {
    icon: "🌿", titulo: "Melhorar momentos difíceis",
    desc: "Estratégias práticas para lidar com os desafios do dia a dia.",
    items: ["Dificuldade em aceitar 'não'", "Parar telas sem conflito", "Lidar com frustrações e birras", "Transições mais tranquilas"],
    cor: "#e07040",
  },
];

const depoimentos = [
  { texto: "Em 3 semanas meu filho começou a pedir as coisas de forma diferente. As atividades são simples mas fazem toda a diferença.", nome: "Mariana A.", sub: "Mãe do Lucas, 4 anos", init: "MA", g: "linear-gradient(135deg,#2BBFA4,#2A7BA8)" },
  { texto: "Finalmente algo que não me faz sentir que estou errando. O mapa mostrou o que meu filho já tem e onde pode crescer.", nome: "Ricardo F.", sub: "Pai da Sofia, 3 anos", init: "RF", g: "linear-gradient(135deg,#4FC3D8,#2A7BA8)" },
  { texto: "As birras diminuíram muito depois que comecei a aplicar as estratégias. Um divisor de águas para nós.", nome: "Camila S.", sub: "Mãe do Pedro, 5 anos", init: "CS", g: "linear-gradient(135deg,#7AE040,#2BBFA4)" },
];

const faqs = [
  { q: "O FractaCare substitui o acompanhamento profissional?", a: "Não. É um complemento poderoso para o trabalho em casa, mas não substitui profissionais como psicólogos e terapeutas." },
  { q: "Preciso ter conhecimento em ABA para usar?", a: "De jeito nenhum. Toda linguagem técnica é traduzida para o dia a dia. Feito para pais, não especialistas." },
  { q: "Para qual faixa etária funciona?", a: "Desenvolvido para crianças de 1 a 8 anos. As atividades e o radar se adaptam à idade informada." },
  { q: "A avaliação inicial é mesmo gratuita?", a: "Sim, 100% gratuita e sem cartão de crédito. 14 perguntas, radar de desenvolvimento e primeiras atividades — sem pagar nada." },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ background: "rgba(255,255,255,.84)", border: "1px solid rgba(43,191,164,.15)", borderRadius: 16, overflow: "hidden" }}>
      <button onClick={() => setOpen(!open)} style={{
        width: "100%", textAlign: "left", padding: "18px 20px", background: "none", border: "none",
        cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center",
        fontFamily: "var(--font-sans)", fontWeight: 700, fontSize: ".88rem", color: "#1E3A5F",
      }}>
        {q}
        <span style={{ color: "#2BBFA4", fontSize: "1.2rem", flexShrink: 0, marginLeft: 12, transition: "transform .2s", transform: open ? "rotate(45deg)" : "none" }}>+</span>
      </button>
      {open && <div style={{ padding: "0 20px 18px", fontSize: ".85rem", color: "#5a7a9a", lineHeight: 1.7 }}>{a}</div>}
    </div>
  );
}

export default function CapturePage() {
  const [menuOpen, setMenuOpen] = useState(false);

  const card: React.CSSProperties = {
    background: "rgba(255,255,255,.84)",
    border: "1px solid rgba(43,191,164,.15)",
    borderRadius: 20,
    padding: "24px 20px",
  };

  return (
    <div style={{
      fontFamily: "var(--font-sans)", minHeight: "100vh", color: "#1E3A5F",
      background: "linear-gradient(160deg,#e8f8ff 0%,#f0fdfb 35%,#edfff8 65%,#ddf4ff 100%)",
    }}>

      {/* NAV */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 100,
        background: "rgba(255,255,255,.9)", backdropFilter: "blur(18px)",
        borderBottom: "1px solid rgba(43,191,164,.15)",
        padding: "0 20px", height: 60,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <Link href="/" style={{ textDecoration: "none" }}>
          <FractaLogo logo="care" height={32} alt="FractaCare" />
        </Link>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link href="/captura/avaliacao" style={{
            padding: "9px 20px", borderRadius: 50,
            background: "linear-gradient(135deg,#2BBFA4,#7AE040)",
            color: "white", fontSize: ".8rem", fontWeight: 800,
            textDecoration: "none", boxShadow: "0 3px 14px rgba(43,191,164,.35)",
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
          position: "fixed", top: 60, left: 0, right: 0, zIndex: 99,
          background: "rgba(255,255,255,.98)", borderBottom: "1px solid rgba(43,191,164,.15)",
          padding: "16px 20px", display: "flex", flexDirection: "column", gap: 12,
        }}>
          {[["#como-funciona","Como funciona"],["#dominios","Habilidades"],["#depoimentos","Depoimentos"],["#faq","Dúvidas"]].map(([href,label]) => (
            <a key={href} href={href} onClick={() => setMenuOpen(false)} style={{ fontSize: ".9rem", fontWeight: 600, color: "#1E3A5F", textDecoration: "none", padding: "8px 0", borderBottom: "1px solid rgba(0,0,0,.05)" }}>{label}</a>
          ))}
          <Link href="/care/login" onClick={() => setMenuOpen(false)} style={{ fontSize: ".9rem", fontWeight: 600, color: "#2BBFA4", textDecoration: "none", padding: "8px 0" }}>Entrar na minha conta</Link>
        </div>
      )}

      {/* HERO */}
      <section style={{ padding: "52px 20px 40px", maxWidth: 680, margin: "0 auto" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(43,191,164,.12)", border: "1px solid rgba(43,191,164,.25)", borderRadius: 50, padding: "5px 16px", marginBottom: 20, fontSize: ".65rem", fontWeight: 700, color: "#2BBFA4", textTransform: "uppercase", letterSpacing: ".12em" }}>
          Baseado em ABA
        </div>

        <h1 style={{ fontSize: "clamp(2rem,5vw,3.5rem)", fontWeight: 800, lineHeight: 1.07, letterSpacing: "-.03em", marginBottom: 18 }}>
          Desenvolvimento infantil<br />
          <span style={{ color: "#2BBFA4" }}>guiado por ciência</span><br />
          e amor.
        </h1>

        <p style={{ fontSize: ".98rem", color: "#5a7a9a", lineHeight: 1.75, marginBottom: 28, maxWidth: 480 }}>
          Descubra as habilidades do seu filho prontas para crescer. Receba atividades personalizadas para o dia a dia, com base na ciência do desenvolvimento.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 340 }}>
          <Link href="/captura/avaliacao" style={{
            padding: "15px 28px", borderRadius: 50, textAlign: "center",
            background: "linear-gradient(135deg,#2BBFA4,#7AE040)",
            color: "white", fontWeight: 800, fontSize: ".95rem", textDecoration: "none",
            boxShadow: "0 6px 24px rgba(43,191,164,.4)",
          }}>✦ Começar avaliação gratuita</Link>
          <a href="#como-funciona" style={{
            padding: "13px 28px", borderRadius: 50, textAlign: "center",
            border: "1.5px solid rgba(43,191,164,.25)",
            color: "#2A7BA8", fontWeight: 600, fontSize: ".88rem", textDecoration: "none",
          }}>Como funciona</a>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, marginTop: 36, paddingTop: 28, borderTop: "1px solid rgba(43,191,164,.15)" }}>
          {[["4.800+","Famílias ativas"],["40+","Atividades"],["2 min","Para avaliar"]].map(([v,l]) => (
            <div key={l}>
              <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "#1E3A5F" }}>{v}</div>
              <div style={{ fontSize: ".65rem", color: "#8a9ab8", marginTop: 3 }}>{l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* COMO FUNCIONA */}
      <section id="como-funciona" style={{ padding: "52px 20px", background: "rgba(255,255,255,.6)" }}>
        <div style={{ maxWidth: 680, margin: "0 auto" }}>
          <div style={{ fontSize: ".62rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".14em", color: "#2BBFA4", marginBottom: 8, textAlign: "center" }}>Simples e poderoso</div>
          <h2 style={{ fontSize: "clamp(1.6rem,4vw,2.4rem)", fontWeight: 800, letterSpacing: "-.02em", textAlign: "center", marginBottom: 8 }}>Como o FractaCare funciona</h2>
          <p style={{ fontSize: ".88rem", color: "#5a7a9a", lineHeight: 1.75, textAlign: "center", marginBottom: 28, maxWidth: 480, margin: "0 auto 28px" }}>
            Em poucos minutos você tem um mapa personalizado e sabe exatamente o que praticar.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {steps.map(s => (
              <div key={s.n} style={{ ...card, display: "flex", gap: 16, alignItems: "flex-start" }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", flexShrink: 0, background: "linear-gradient(135deg,#2BBFA4,#7AE040)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: ".82rem", color: "white" }}>{s.n}</div>
                <div>
                  <div style={{ fontSize: ".9rem", fontWeight: 700, color: "#1E3A5F", marginBottom: 6 }}>{s.titulo}</div>
                  <div style={{ fontSize: ".8rem", color: "#5a7a9a", lineHeight: 1.65 }}>{s.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DOMÍNIOS */}
      <section id="dominios" style={{ padding: "52px 20px" }}>
        <div style={{ maxWidth: 680, margin: "0 auto" }}>
          <div style={{ fontSize: ".62rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".14em", color: "#2BBFA4", marginBottom: 8, textAlign: "center" }}>8 domínios avaliados</div>
          <h2 style={{ fontSize: "clamp(1.6rem,4vw,2.4rem)", fontWeight: 800, letterSpacing: "-.02em", textAlign: "center", marginBottom: 24 }}>Habilidades que moldam o futuro do seu filho</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {domains.map(d => (
              <div key={d.nome} style={{ ...card, display: "flex", gap: 12, alignItems: "flex-start" }}>
                <span style={{ fontSize: "1.1rem", flexShrink: 0 }}>{d.icon}</span>
                <div>
                  <div style={{ fontSize: ".82rem", fontWeight: 700, color: "#1E3A5F", marginBottom: 2 }}>{d.nome}</div>
                  <div style={{ fontSize: ".72rem", color: "#8a9ab8", lineHeight: 1.5 }}>{d.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PARA QUEM */}
      <section style={{ padding: "52px 20px", background: "rgba(255,255,255,.6)" }}>
        <div style={{ maxWidth: 680, margin: "0 auto" }}>
          <div style={{ fontSize: ".62rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".14em", color: "#2BBFA4", marginBottom: 8, textAlign: "center" }}>Para quem é</div>
          <h2 style={{ fontSize: "clamp(1.6rem,4vw,2.2rem)", fontWeight: 800, letterSpacing: "-.02em", textAlign: "center", marginBottom: 24 }}>O FractaCare ajuda com dois desafios reais dos pais</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {paraQuem.map(p => (
              <div key={p.titulo} style={{ ...card, borderLeft: `3px solid ${p.cor}` }}>
                <div style={{ fontSize: "1.8rem", marginBottom: 12 }}>{p.icon}</div>
                <div style={{ fontSize: ".95rem", fontWeight: 800, color: "#1E3A5F", marginBottom: 8 }}>{p.titulo}</div>
                <p style={{ fontSize: ".85rem", color: "#5a7a9a", lineHeight: 1.7, marginBottom: 16 }}>{p.desc}</p>
                <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
                  {p.items.map(item => (
                    <li key={item} style={{ display: "flex", gap: 10, fontSize: ".83rem", color: "#3a5a7a" }}>
                      <span style={{ color: p.cor, fontWeight: 800, flexShrink: 0 }}>✓</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DEPOIMENTOS */}
      <section id="depoimentos" style={{ padding: "52px 20px" }}>
        <div style={{ maxWidth: 680, margin: "0 auto" }}>
          <div style={{ fontSize: ".62rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".14em", color: "#2BBFA4", marginBottom: 8, textAlign: "center" }}>O que os pais dizem</div>
          <h2 style={{ fontSize: "clamp(1.6rem,4vw,2.2rem)", fontWeight: 800, letterSpacing: "-.02em", textAlign: "center", marginBottom: 24 }}>Famílias que já sentiram a diferença</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {depoimentos.map(d => (
              <div key={d.nome} style={card}>
                <div style={{ display: "flex", gap: 2, marginBottom: 12 }}>
                  {[...Array(5)].map((_,i) => <span key={i} style={{ color: "#2BBFA4" }}>★</span>)}
                </div>
                <p style={{ fontSize: ".88rem", color: "#3a5a7a", lineHeight: 1.75, marginBottom: 16 }}>"{d.texto}"</p>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: d.g, display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".62rem", fontWeight: 800, color: "white" }}>{d.init}</div>
                  <div>
                    <div style={{ fontSize: ".82rem", fontWeight: 700 }}>{d.nome}</div>
                    <div style={{ fontSize: ".68rem", color: "#8a9ab8" }}>{d.sub}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" style={{ padding: "52px 20px", background: "rgba(255,255,255,.5)" }}>
        <div style={{ maxWidth: 680, margin: "0 auto" }}>
          <div style={{ fontSize: ".62rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".14em", color: "#2BBFA4", marginBottom: 8, textAlign: "center" }}>Perguntas frequentes</div>
          <h2 style={{ fontSize: "clamp(1.6rem,4vw,2.2rem)", fontWeight: 800, letterSpacing: "-.02em", textAlign: "center", marginBottom: 24 }}>Dúvidas dos pais</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {faqs.map(f => <FaqItem key={f.q} q={f.q} a={f.a} />)}
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section style={{ padding: "60px 20px", textAlign: "center", background: "linear-gradient(135deg,#1E3A5F,#2A7BA8)" }}>
        <div style={{ maxWidth: 480, margin: "0 auto" }}>
          <h2 style={{ fontSize: "clamp(1.6rem,4vw,2.4rem)", fontWeight: 800, letterSpacing: "-.02em", color: "white", marginBottom: 14 }}>
            Seu filho tem habilidades<br />prontas para crescer.
          </h2>
          <p style={{ fontSize: ".9rem", color: "rgba(255,255,255,.7)", marginBottom: 28, lineHeight: 1.75 }}>
            Descubra quais são em 2 minutos. Grátis, sem cartão de crédito.
          </p>
          <Link href="/captura/avaliacao" style={{
            display: "block", padding: "15px 32px", borderRadius: 50,
            background: "white", color: "#1E3A5F", fontWeight: 800, fontSize: ".95rem",
            textDecoration: "none", boxShadow: "0 6px 28px rgba(0,0,0,.2)",
          }}>✦ Começar avaliação gratuita</Link>
          <div style={{ fontSize: ".72rem", color: "rgba(255,255,255,.4)", marginTop: 12 }}>
            Gratuito · Sem cartão · 2 minutos
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ padding: "40px 20px 28px", background: "rgba(255,255,255,.7)", borderTop: "1px solid rgba(43,191,164,.12)" }}>
        <div style={{ maxWidth: 680, margin: "0 auto" }}>
          <FractaLogo logo="care" height={30} alt="FractaCare" />
          <p style={{ fontSize: ".78rem", color: "#8a9ab8", marginTop: 10, lineHeight: 1.7, marginBottom: 24 }}>
            Desenvolvimento infantil guiado por ciência e amor.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 24 }}>
            {[
              { title: "Plataforma", links: [["#como-funciona","Como funciona"],["#dominios","Habilidades"],["#faq","Dúvidas"]] },
              { title: "Fracta", links: [["/","Fracta Behavior"],["/clinic-landing","Para terapeutas"],["#","Privacidade"]] },
            ].map(col => (
              <div key={col.title}>
                <div style={{ fontSize: ".6rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", color: "#aabbcc", marginBottom: 12 }}>{col.title}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {col.links.map(([href,label]) => (
                    <a key={label} href={href} style={{ fontSize: ".8rem", color: "#5a7a9a", textDecoration: "none" }}>{label}</a>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div style={{ borderTop: "1px solid rgba(43,191,164,.1)", paddingTop: 16, fontSize: ".7rem", color: "#aabbcc" }}>
            © 2025 Fracta Behavior. Todos os direitos reservados.
          </div>
        </div>
      </footer>
    </div>
  );
}
