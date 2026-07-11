"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { FractaLogo } from "@/components/fracta/FractaLogo";

// ── DADOS ────────────────────────────────────────────────────────────────────

// CM-LP-A1 T5: soluções que dependem do Marketplace são marcadas como futuras.
const problemas = [
  {
    titulo: "Captação sem consistência",
    problema: "Um mês com agenda cheia, três com lacunas. Indicações esporádicas tornam a renda imprevisível.",
    solucao: "Estamos construindo o Marketplace que conectará famílias preparadas pelo FractaCare ao seu perfil.",
    futuro: true,
  },
  {
    titulo: "Dependência de clínicas",
    problema: "Clínicas cobram autonomia clínica, percentual alto e limitam suas condições de atendimento.",
    solucao: "Atendimento direto, com suas regras, sua agenda e sua abordagem.",
    futuro: false,
  },
  {
    titulo: "Gestão fragmentada",
    problema: "Prontuário em papel, dados em planilha, comunicação por WhatsApp. Nada pensa na lógica ABA.",
    solucao: "Programas, sessões, dados e relatórios em um único ambiente integrado.",
    futuro: false,
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

// CM-LP-A1 T8/T9: só ferramentas que existem hoje; claims de integração/marketplace saíram.
const ferramentas = [
  { icon: "🧠", titulo: "Registro por operante", desc: "SD, resposta, dica e latência. Dados reais." },
  { icon: "📊", titulo: "Análise funcional", desc: "Registro ABC estruturado, hipóteses de função." },
  { icon: "📋", titulo: "Programas de ensino", desc: "DTT, NET, MTS com critério de domínio e generalização." },
  { icon: "🔗", titulo: "Base unificada", desc: "Todos os dados clínicos da criança em um só lugar." },
  { icon: "🎯", titulo: "Planejamento de sessão", desc: "Objetivos e programas organizados antes de atender." },
  { icon: "📈", titulo: "Relatórios automáticos", desc: "Evolução por habilidade exportável para supervisão." },
];

// CM-LP-A1 T11/T12: itens dependentes de Marketplace/produto futuro marcados.
const modelo = [
  { n: "01", titulo: "Pacientes via Fracta", desc: "Quando o Marketplace estiver disponível: o FractaEngine conectará famílias ao seu perfil, com comissão apenas sobre sessões realizadas. Sem mensalidade.", futuro: true },
  { n: "02", titulo: "Pacientes particulares", desc: "Use a plataforma para gerir seus pacientes por valor fixo por paciente ativo.", futuro: false },
  { n: "03", titulo: "Trilhas contextuais", desc: "Conteúdo de desenvolvimento ativado pelo que você está aplicando — não cursos genéricos.", futuro: true },
];

// CM-LP-A1 T2: depoimentos fictícios removidos — jamais atribuir credencial
// profissional (ex.: BCBA) a pessoas inexistentes. Voltam apenas com depoimentos
// reais e autorizados.

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
        {/* CM-LP-A1 T1: métrica fabricada removida do selo */}
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          background: "rgba(29,158,117,.12)", border: "1px solid rgba(29,158,117,.25)",
          borderRadius: 50, padding: "4px 14px", marginBottom: 20,
        }}>
          <span style={{ fontSize: ".65rem", fontWeight: 700, color: "#1D9E75", textTransform: "uppercase", letterSpacing: ".1em" }}>Para terapeutas ABA</span>
        </div>

        <h1 style={{ fontSize: "clamp(2rem,5vw,3.5rem)", fontWeight: 800, lineHeight: 1.08, letterSpacing: "-.03em", marginBottom: 20 }}>
          Sem captação consistente, não há pacientes.<br />
          <span style={{ color: "#1D9E75" }}>Sem previsibilidade, não há controle.</span>
        </h1>

        {/* CM-LP-A1 T3: presente e futuro separados com honestidade */}
        <p style={{ fontSize: "1rem", color: "rgba(255,255,255,.55)", lineHeight: 1.75, marginBottom: 32, maxWidth: 520 }}>
          O FractaClinic estrutura sua prática hoje — programas, sessões, dados e relatórios pensados na lógica ABA. E estamos construindo o Marketplace que conectará famílias preparadas pelo FractaCare a terapeutas qualificados. Você atende com autonomia. Nós estruturamos o caminho.
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

        {/* CM-LP-A1 T4: trio reescrito — hoje vs. em desenvolvimento */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, marginTop: 40, paddingTop: 32, borderTop: "1px solid rgba(255,255,255,.08)" }}>
          {[["Gestão clínica completa","disponível hoje"],["Lógica ABA de ponta a ponta","programas, sessões, dados"],["Marketplace de famílias","em desenvolvimento"]].map(([v,l]) => (
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
                <div style={{ fontSize: ".82rem", color: "#1D9E75", lineHeight: 1.65 }}>
                  {p.futuro ? "Em desenvolvimento: " : "Com o FractaClinic: "}{p.solucao}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── COMO FUNCIONA ── */}
      <section id="como" style={{ padding: "60px 20px" }}>
        <div style={{ maxWidth: 680, margin: "0 auto" }}>
          {/* CM-LP-A1 T6: fluxo do Marketplace = visão futura, declarada como tal */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <span style={{ fontSize: ".62rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".14em", color: "#1D9E75" }}>Como vai funcionar</span>
            <span style={{ fontSize: ".6rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: "rgba(255,255,255,.45)", border: "1px solid rgba(255,255,255,.15)", borderRadius: 50, padding: "3px 10px" }}>Marketplace · em desenvolvimento</span>
          </div>
          <h2 style={{ fontSize: "clamp(1.6rem,4vw,2.4rem)", fontWeight: 800, letterSpacing: "-.02em", marginBottom: 12 }}>
            Seu perfil. Suas regras.<br />Pacientes chegando.
          </h2>
          <p style={{ fontSize: ".9rem", color: "rgba(255,255,255,.45)", lineHeight: 1.75, marginBottom: 28 }}>
            A visão que estamos construindo: o FractaEngine analisará o perfil clínico da criança e conectará a família ao terapeuta mais adequado. Crie seu perfil hoje para entrar na lista de interesse.
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
          {/* CM-LP-A1 T7: senioridade ligada à distribuição = Marketplace futuro */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 10 }}>
            <span style={{ fontSize: ".62rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".14em", color: "#1D9E75" }}>Processo de seleção</span>
            <span style={{ fontSize: ".6rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: "rgba(255,255,255,.45)", border: "1px solid rgba(255,255,255,.15)", borderRadius: 50, padding: "3px 10px" }}>Em desenvolvimento</span>
          </div>
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
          {/* CM-LP-A1 T10: ferramentas reais, marcadas como disponíveis hoje */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 10 }}>
            <span style={{ fontSize: ".62rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".14em", color: "#1D9E75" }}>Clínica completa</span>
            <span style={{ fontSize: ".6rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: "#07111f", background: "#1D9E75", borderRadius: 50, padding: "3px 10px" }}>Disponível hoje</span>
          </div>
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
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: ".9rem", fontWeight: 700 }}>{m.titulo}</span>
                  {m.futuro && (
                    <span style={{ fontSize: ".58rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: "rgba(255,255,255,.45)", border: "1px solid rgba(255,255,255,.15)", borderRadius: 50, padding: "2px 8px" }}>Em desenvolvimento</span>
                  )}
                </div>
                <div style={{ fontSize: ".8rem", color: "rgba(255,255,255,.45)", lineHeight: 1.7 }}>{m.desc}</div>
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
          {/* CM-LP-A1 T13: bullets do que existe hoje + futuro declarado */}
          <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 10, marginBottom: 28 }}>
            {["Estrutura clínica completa: programas, sessões, dados e relatórios","Pensado na lógica ABA, do registro por operante ao relatório","Sem mensalidade para começar","Prioridade na lista de interesse do Marketplace (em desenvolvimento)"].map(b => (
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
            Sem mensalidade obrigatória para começar
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
              { title: "Fracta", links: [["/","Fracta Behavior"],["/care","FractaCare"],["/privacidade","Privacidade"],["/termos","Termos"]] },
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
            © 2026 Fracta Behavior. Todos os direitos reservados.
          </div>
        </div>
      </footer>

    </div>
  );
}
