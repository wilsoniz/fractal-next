"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { FractaLogo } from "@/components/fracta/FractaLogo";

// ── DADOS ────────────────────────────────────────────────────────────────────

const problemas = [
  {
    titulo: "Captação sem consistência",
    problema: "Um mês com agenda cheia, três com lacunas. Indicações esporádicas tornam a renda imprevisível.",
    solucao: "Demanda contínua de famílias qualificadas via FractaEngine.",
  },
  {
    titulo: "Dependência de clínicas",
    problema: "Clínicas cobram autonomia clínica, percentual alto e limitam suas condições de atendimento.",
    solucao: "Atendimento direto, com suas regras, sua agenda e sua abordagem.",
  },
  {
    titulo: "Gestão fragmentada",
    problema: "Prontuário em papel, dados em planilha, comunicação por WhatsApp. Nada pensa na lógica ABA.",
    solucao: "Programas, sessões, dados e relatórios em um único ambiente integrado.",
  },
];

const steps = [
  { n: "1", titulo: "Crie seu perfil e passe pela seleção", desc: "Informe especialidades, abordagens e disponibilidade. O processo define seu nível de senioridade." },
  { n: "2", titulo: "O engine sugere. A família confirma.", desc: "O FractaEngine cruza o perfil da criança com seu histórico e sugere terapeutas compatíveis." },
  { n: "3", titulo: "Atenda dentro da plataforma", desc: "Sessões, programas e comunicação com a família — tudo em um lugar." },
  { n: "4", titulo: "Cresça com o ecossistema", desc: "Mais experiência documentada = mais visibilidade no engine e mais indicações qualificadas." },
];

const levels = [
  { nivel: "Nível 1", nome: "Terapeuta Júnior", desc: "Formação em ABA, até 2 anos de prática supervisionada" },
  { nivel: "Nível 2", nome: "Terapeuta Pleno", desc: "2 a 5 anos de experiência, casos complexos documentados" },
  { nivel: "Nível 3", nome: "Terapeuta Sênior", desc: "Mais de 5 anos, capacidade de supervisão e formação contínua" },
  { nivel: "Nível 4", nome: "Supervisor / BCBA", desc: "Credencial BCBA ou equivalente, supervisão ativa" },
];

const ferramentas = [
  { icon: "🧠", titulo: "Registro por operante", desc: "SD, resposta, dica e latência. Dados reais." },
  { icon: "📊", titulo: "Análise funcional", desc: "Registro ABC estruturado, hipóteses de função." },
  { icon: "📋", titulo: "Programas de ensino", desc: "DTT, NET, MTS com critério de domínio e generalização." },
  { icon: "🔗", titulo: "Base unificada", desc: "Dados clínicos alimentam o radar do FractaCare." },
  { icon: "⚡", titulo: "Captação via Engine", desc: "Perfil completo antes da primeira sessão." },
  { icon: "📈", titulo: "Relatórios automáticos", desc: "Evolução por habilidade exportável para supervisão." },
];

const modelo = [
  { n: "01", titulo: "Pacientes via Fracta", desc: "O FractaEngine conecta famílias ao seu perfil. Comissão apenas sobre sessões realizadas. Sem mensalidade." },
  { n: "02", titulo: "Pacientes particulares", desc: "Use a plataforma para gerir seus pacientes por valor fixo por paciente ativo." },
  { n: "03", titulo: "Trilhas contextuais", desc: "Conteúdo de desenvolvimento ativado pelo que você está aplicando — não cursos genéricos." },
];

const depoimentos = [
  { texto: "Em seis semanas minha agenda estava cheia. Completei o perfil, passei pelo processo de seleção e o engine fez o trabalho.", nome: "Carolina Amaral", sub: "Terapeuta ABA · Belo Horizonte", init: "CA", g: "linear-gradient(135deg,#00c9a7,#1e90ff)" },
  { texto: "As famílias chegam já com o perfil preenchido, entendem o processo e reconhecem a abordagem. O vínculo terapêutico é diferente desde o início.", nome: "Rafael Ferreira", sub: "BCBA · São Paulo", init: "RF", g: "linear-gradient(135deg,#1e90ff,#7c3aed)" },
  { texto: "A estrutura de programas é o que eu sempre quis. Treino direto, generalização e equivalência com critérios claros.", nome: "Beatriz Nunes", sub: "Terapeuta Sênior · Recife", init: "BN", g: "linear-gradient(135deg,#7bed9f,#00c9a7)" },
];

// ── COMPONENTE PRINCIPAL ──────────────────────────────────────────────────────

export default function ClinicLandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  const bg = "#07111f";
  const card: React.CSSProperties = {
    background: "rgba(255,255,255,.05)",
    border: "1px solid rgba(255,255,255,.1)",
    borderRadius: 16,
    padding: "24px 20px",
  };

  return (
    <div style={{ fontFamily: "var(--font-sans)", background: bg, color: "white", minHeight: "100vh" }}>

      {/* ── NAV ── */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 100,
        background: scrolled ? "rgba(7,17,31,.97)" : "rgba(7,17,31,.85)",
        backdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(255,255,255,.08)",
        padding: "0 20px", height: 60,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <Link href="/" style={{ textDecoration: "none" }}>
          <FractaLogo logo="clinic" height={32} alt="FractaClinic" />
        </Link>

        {/* Desktop links */}
        <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
          <div className="desktop-nav" style={{ display: "flex", gap: 20 }}>
            {[["#proposta","Problema"],["#como","Como funciona"],["#modelo","Modelo"]].map(([href,label]) => (
              <a key={href} href={href} style={{ fontSize: ".78rem", fontWeight: 600, color: "rgba(255,255,255,.5)", textDecoration: "none" }}
                onMouseEnter={e => (e.currentTarget.style.color = "#00c9a7")}
                onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,.5)")}
              >{label}</a>
            ))}
          </div>
          <Link href="/login" style={{
            padding: "8px 18px", borderRadius: 8, fontSize: ".78rem", fontWeight: 700,
            background: "linear-gradient(135deg,#1D9E75,#0f8f7a)",
            color: "#07111f", textDecoration: "none",
          }}>Criar perfil</Link>
          {/* Hamburger */}
          <button onClick={() => setMenuOpen(v => !v)} style={{
            background: "none", border: "none", cursor: "pointer", padding: 4,
            display: "flex", flexDirection: "column", gap: 4,
          }}>
            <span style={{ width: 20, height: 2, background: "rgba(255,255,255,.7)", borderRadius: 2, display: "block", transition: "all .2s", transform: menuOpen ? "rotate(45deg) translate(4px,4px)" : "none" }} />
            <span style={{ width: 20, height: 2, background: "rgba(255,255,255,.7)", borderRadius: 2, display: "block", opacity: menuOpen ? 0 : 1 }} />
            <span style={{ width: 20, height: 2, background: "rgba(255,255,255,.7)", borderRadius: 2, display: "block", transition: "all .2s", transform: menuOpen ? "rotate(-45deg) translate(4px,-4px)" : "none" }} />
          </button>
        </div>
      </nav>

      {/* Mobile drawer */}
      {menuOpen && (
        <div style={{
          position: "fixed", top: 60, left: 0, right: 0, zIndex: 99,
          background: "rgba(7,17,31,.98)", borderBottom: "1px solid rgba(255,255,255,.1)",
          padding: "16px 20px", display: "flex", flexDirection: "column", gap: 12,
        }}>
          {[["#proposta","O problema"],["#como","Como funciona"],["#selecao","Seleção"],["#modelo","Modelo"]].map(([href,label]) => (
            <a key={href} href={href} onClick={() => setMenuOpen(false)} style={{ fontSize: ".9rem", fontWeight: 600, color: "rgba(255,255,255,.8)", textDecoration: "none", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,.06)" }}>{label}</a>
          ))}
          <Link href="/login" onClick={() => setMenuOpen(false)} style={{
            marginTop: 4, padding: "13px", borderRadius: 10, textAlign: "center",
            background: "linear-gradient(135deg,#1D9E75,#0f8f7a)",
            color: "#07111f", fontWeight: 800, fontSize: ".9rem", textDecoration: "none",
          }}>Criar perfil no FractaClinic</Link>
        </div>
      )}

      {/* ── HERO ── */}
      <section style={{ padding: "60px 20px 48px", maxWidth: 680, margin: "0 auto" }}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          background: "rgba(29,158,117,.12)", border: "1px solid rgba(29,158,117,.25)",
          borderRadius: 50, padding: "4px 14px", marginBottom: 20,
        }}>
          <span style={{ fontSize: ".65rem", fontWeight: 700, color: "#1D9E75", textTransform: "uppercase", letterSpacing: ".1em" }}>Para terapeutas ABA</span>
          <span style={{ fontSize: ".7rem", color: "rgba(255,255,255,.4)" }}>+320 já na plataforma</span>
        </div>

        <h1 style={{ fontSize: "clamp(2rem,5vw,3.5rem)", fontWeight: 800, lineHeight: 1.08, letterSpacing: "-.03em", marginBottom: 20 }}>
          Sem captação consistente, não há pacientes.<br />
          <span style={{ color: "#1D9E75" }}>Sem previsibilidade, não há controle</span>
        </h1>

        <p style={{ fontSize: "1rem", color: "rgba(255,255,255,.55)", lineHeight: 1.75, marginBottom: 32, maxWidth: 520 }}>
          O FractaClinic conecta você a famílias já preparadas pelo FractaCare — pais que buscam um terapeuta qualificado. Você atende com autonomia. Nós estruturamos o caminho.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 340 }}>
          <Link href="/login" style={{
            padding: "15px 28px", borderRadius: 10, textAlign: "center",
            background: "linear-gradient(135deg,#1D9E75,#0f8f7a)",
            color: "#07111f", fontWeight: 800, fontSize: ".95rem", textDecoration: "none",
            boxShadow: "0 6px 24px rgba(29,158,117,.35)",
          }}>Criar perfil no FractaClinic</Link>
          <a href="#proposta" style={{
            padding: "13px 28px", borderRadius: 10, textAlign: "center",
            border: "1px solid rgba(255,255,255,.15)",
            color: "rgba(255,255,255,.7)", fontWeight: 600, fontSize: ".88rem", textDecoration: "none",
          }}>Entender o modelo</a>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, marginTop: 40, paddingTop: 32, borderTop: "1px solid rgba(255,255,255,.08)" }}>
          {[["Sem mensalidade","para começar"],["Perfil completo","antes da 1ª sessão"],["Seleção por mérito","processo transparente"]].map(([v,l]) => (
            <div key={l}>
              <div style={{ fontSize: ".78rem", fontWeight: 700, color: "#1D9E75" }}>{v}</div>
              <div style={{ fontSize: ".65rem", color: "rgba(255,255,255,.3)", marginTop: 3 }}>{l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── O PROBLEMA ── */}
      <section id="proposta" style={{ padding: "60px 20px", background: "rgba(255,255,255,.02)" }}>
        <div style={{ maxWidth: 680, margin: "0 auto" }}>
          <div style={{ fontSize: ".62rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".14em", color: "#1D9E75", marginBottom: 10 }}>O problema que resolvemos</div>
          <h2 style={{ fontSize: "clamp(1.6rem,4vw,2.4rem)", fontWeight: 800, letterSpacing: "-.02em", marginBottom: 12 }}>
            Domínio técnico não garante agenda cheia.
          </h2>
          <p style={{ fontSize: ".9rem", color: "rgba(255,255,255,.45)", lineHeight: 1.75, marginBottom: 32 }}>
            Sem estrutura de captação consistente, terapeutas qualificados ficam à mercê de indicações esporádicas.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {problemas.map(p => (
              <div key={p.titulo} style={{ ...card, borderLeft: "3px solid rgba(29,158,117,.4)" }}>
                <div style={{ fontSize: ".62rem", fontWeight: 700, color: "rgba(255,100,100,.7)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 8 }}>Sem o FractaClinic</div>
                <div style={{ fontSize: ".95rem", fontWeight: 700, marginBottom: 8 }}>{p.titulo}</div>
                <div style={{ fontSize: ".82rem", color: "rgba(255,255,255,.45)", lineHeight: 1.7, marginBottom: 14 }}>{p.problema}</div>
                <div style={{ height: 1, background: "rgba(29,158,117,.2)", marginBottom: 12 }} />
                <div style={{ fontSize: ".82rem", color: "#1D9E75", lineHeight: 1.65 }}>Com o FractaClinic: {p.solucao}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── COMO FUNCIONA ── */}
      <section id="como" style={{ padding: "60px 20px" }}>
        <div style={{ maxWidth: 680, margin: "0 auto" }}>
          <div style={{ fontSize: ".62rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".14em", color: "#1D9E75", marginBottom: 10 }}>Como funciona</div>
          <h2 style={{ fontSize: "clamp(1.6rem,4vw,2.4rem)", fontWeight: 800, letterSpacing: "-.02em", marginBottom: 12 }}>
            Seu perfil. Suas regras.<br />Pacientes chegando.
          </h2>
          <p style={{ fontSize: ".9rem", color: "rgba(255,255,255,.45)", lineHeight: 1.75, marginBottom: 28 }}>
            O FractaEngine analisa o perfil clínico da criança e conecta a família ao terapeuta mais adequado.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {steps.map(s => (
              <div key={s.n} style={{ ...card, display: "flex", gap: 16, alignItems: "flex-start" }}>
                <div style={{
                  width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
                  background: "linear-gradient(135deg,#1D9E75,#0f8f7a)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontWeight: 800, fontSize: ".82rem", color: "#07111f",
                }}>{s.n}</div>
                <div>
                  <div style={{ fontSize: ".9rem", fontWeight: 700, marginBottom: 6 }}>{s.titulo}</div>
                  <div style={{ fontSize: ".8rem", color: "rgba(255,255,255,.45)", lineHeight: 1.65 }}>{s.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SELEÇÃO ── */}
      <section id="selecao" style={{ padding: "60px 20px", background: "rgba(255,255,255,.02)" }}>
        <div style={{ maxWidth: 680, margin: "0 auto" }}>
          <div style={{ fontSize: ".62rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".14em", color: "#1D9E75", marginBottom: 10 }}>Processo de seleção</div>
          <h2 style={{ fontSize: "clamp(1.6rem,4vw,2.4rem)", fontWeight: 800, letterSpacing: "-.02em", marginBottom: 12, textAlign: "center" }}>
            Qualidade clínica garantida com transparência.
          </h2>
          <p style={{ fontSize: ".88rem", color: "rgba(255,255,255,.45)", lineHeight: 1.75, marginBottom: 28, textAlign: "center" }}>
            Todo terapeuta passa por avaliação estruturada. Isso protege as famílias e valoriza quem tem formação sólida.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            {levels.map((l, i) => (
              <div key={l.nome} style={{ ...card, borderTop: `3px solid rgba(29,158,117,${0.25 + i * 0.2})` }}>
                <div style={{ fontSize: ".62rem", fontWeight: 700, color: "#1D9E75", marginBottom: 6 }}>{l.nivel}</div>
                <div style={{ fontSize: ".88rem", fontWeight: 700, marginBottom: 8 }}>{l.nome}</div>
                <div style={{ fontSize: ".75rem", color: "rgba(255,255,255,.4)", lineHeight: 1.6 }}>{l.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FERRAMENTAS ── */}
      <section style={{ padding: "60px 20px" }}>
        <div style={{ maxWidth: 680, margin: "0 auto" }}>
          <div style={{ fontSize: ".62rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".14em", color: "#1D9E75", marginBottom: 10, textAlign: "center" }}>Clínica completa</div>
          <h2 style={{ fontSize: "clamp(1.6rem,4vw,2.4rem)", fontWeight: 800, letterSpacing: "-.02em", marginBottom: 28, textAlign: "center" }}>
            Tudo que você precisa para atender
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            {ferramentas.map(f => (
              <div key={f.titulo} style={card}>
                <div style={{ fontSize: "1.4rem", marginBottom: 10 }}>{f.icon}</div>
                <div style={{ fontSize: ".88rem", fontWeight: 700, marginBottom: 6 }}>{f.titulo}</div>
                <div style={{ fontSize: ".75rem", color: "rgba(255,255,255,.45)", lineHeight: 1.6 }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── MODELO ── */}
      <section id="modelo" style={{ padding: "60px 20px", background: "rgba(255,255,255,.02)" }}>
        <div style={{ maxWidth: 680, margin: "0 auto" }}>
          <div style={{ fontSize: ".62rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".14em", color: "#1D9E75", marginBottom: 10 }}>Modelo transparente</div>
          <h2 style={{ fontSize: "clamp(1.6rem,4vw,2.4rem)", fontWeight: 800, letterSpacing: "-.02em", marginBottom: 12 }}>
            Sem mensalidade fixa.<br />Você escolhe como usar.
          </h2>
          <p style={{ fontSize: ".88rem", color: "rgba(255,255,255,.45)", lineHeight: 1.75, marginBottom: 28 }}>
            Ganhamos quando você atende.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {modelo.map(m => (
              <div key={m.n} style={card}>
                <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "rgba(29,158,117,.25)", marginBottom: 8, lineHeight: 1 }}>{m.n}</div>
                <div style={{ fontSize: ".9rem", fontWeight: 700, marginBottom: 8 }}>{m.titulo}</div>
                <div style={{ fontSize: ".8rem", color: "rgba(255,255,255,.45)", lineHeight: 1.7 }}>{m.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── DEPOIMENTOS ── */}
      <section id="depoimentos" style={{ padding: "60px 20px" }}>
        <div style={{ maxWidth: 680, margin: "0 auto" }}>
          <div style={{ fontSize: ".62rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".14em", color: "#1D9E75", marginBottom: 10, textAlign: "center" }}>Depoimentos</div>
          <h2 style={{ fontSize: "clamp(1.6rem,4vw,2.2rem)", fontWeight: 800, letterSpacing: "-.02em", marginBottom: 28, textAlign: "center" }}>
            O que terapeutas estão dizendo
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {depoimentos.map(d => (
              <div key={d.nome} style={card}>
                <div style={{ display: "flex", gap: 2, marginBottom: 14 }}>
                  {[...Array(5)].map((_,i) => <span key={i} style={{ color: "#1D9E75" }}>★</span>)}
                </div>
                <p style={{ fontSize: ".88rem", color: "rgba(255,255,255,.65)", lineHeight: 1.75, marginBottom: 18 }}>"{d.texto}"</p>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: d.g, display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".62rem", fontWeight: 800 }}>{d.init}</div>
                  <div>
                    <div style={{ fontSize: ".85rem", fontWeight: 700 }}>{d.nome}</div>
                    <div style={{ fontSize: ".7rem", color: "rgba(255,255,255,.35)" }}>{d.sub}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ── */}
      <section id="cadastro" style={{ padding: "60px 20px", background: "rgba(29,158,117,.06)", borderTop: "1px solid rgba(29,158,117,.15)" }}>
        <div style={{ maxWidth: 500, margin: "0 auto" }}>
          <div style={{ fontSize: ".62rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".14em", color: "#1D9E75", marginBottom: 14, textAlign: "center" }}>Entre agora</div>
          <h2 style={{ fontSize: "clamp(1.6rem,4vw,2.2rem)", fontWeight: 800, letterSpacing: "-.02em", lineHeight: 1.2, marginBottom: 20, textAlign: "center" }}>
            Sua agenda previsível.<br />Sua autonomia preservada.
          </h2>
          <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 10, marginBottom: 28 }}>
            {["Indicações de pacientes qualificados pelo FractaEngine","Seleção transparente com definição de nível de senioridade","Estrutura clínica completa: programas, sessões e relatórios","Sem mensalidade — comissão apenas sobre sessões realizadas"].map(b => (
              <li key={b} style={{ display: "flex", gap: 10, fontSize: ".82rem", color: "rgba(255,255,255,.65)" }}>
                <span style={{ color: "#1D9E75", fontWeight: 800, flexShrink: 0 }}>—</span>
                {b}
              </li>
            ))}
          </ul>
          <Link href="/login" style={{
            display: "block", padding: "15px", borderRadius: 12, textAlign: "center",
            background: "linear-gradient(135deg,#1D9E75,#0f8f7a)",
            color: "#07111f", fontWeight: 800, fontSize: ".95rem", textDecoration: "none",
            boxShadow: "0 6px 24px rgba(29,158,117,.35)",
          }}>Criar perfil no FractaClinic</Link>
          <p style={{ fontSize: ".7rem", color: "rgba(255,255,255,.25)", textAlign: "center", marginTop: 12 }}>
            Sem mensalidade obrigatória · Comissão apenas quando você atende
          </p>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ padding: "40px 20px 28px", borderTop: "1px solid rgba(255,255,255,.08)" }}>
        <div style={{ maxWidth: 680, margin: "0 auto" }}>
          <FractaLogo logo="clinic" height={32} alt="FractaClinic" />
          <p style={{ fontSize: ".78rem", color: "rgba(255,255,255,.3)", marginTop: 10, lineHeight: 1.7, marginBottom: 28 }}>
            Gestão clínica e captação para terapeutas ABA.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 28 }}>
            {[
              { title: "Plataforma", links: [["#proposta","O problema"],["#como","Como funciona"],["#selecao","Seleção"],["#modelo","Modelo"]] },
              { title: "Fracta", links: [["/","Fracta Behavior"],["/care","FractaCare"],["#","Privacidade"]] },
            ].map(col => (
              <div key={col.title}>
                <div style={{ fontSize: ".6rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", color: "rgba(255,255,255,.2)", marginBottom: 12 }}>{col.title}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {col.links.map(([href,label]) => (
                    <a key={label} href={href} style={{ fontSize: ".8rem", color: "rgba(255,255,255,.35)", textDecoration: "none" }}>{label}</a>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div style={{ borderTop: "1px solid rgba(255,255,255,.06)", paddingTop: 16, fontSize: ".7rem", color: "rgba(255,255,255,.2)" }}>
            © 2025 Fracta Behavior. Todos os direitos reservados.
          </div>
        </div>
      </footer>

    </div>
  );
}
