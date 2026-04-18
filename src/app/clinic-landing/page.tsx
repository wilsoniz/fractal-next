"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { FractaLogo } from "@/components/fracta/FractaLogo";
import { FractalTriangle } from "@/components/fracta/FractalTriangle";
import {
  BarChart3,
  Brain,
  Target,
  Timer,
  User,
  Users,
  Activity,
  CheckCircle,
  AlertCircle,
  Cpu,
  ClipboardList,
  TrendingUp,
  Link2
} from "lucide-react";
import { ReactNode } from "react";


function ParticleCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const context = ctx as CanvasRenderingContext2D;
    let W = (cv.width = window.innerWidth);
    let H = (cv.height = window.innerHeight);
    const resize = () => { W = cv.width = window.innerWidth; H = cv.height = window.innerHeight; };
    window.addEventListener("resize", resize, { passive: true });
    const pts = Array.from({ length: 65 }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      vx: (Math.random() - .5) * .22, vy: (Math.random() - .5) * .22,
      r: Math.random() * 1.4 + .5,
    }));
    let raf = 0;
    function draw() {
      context.clearRect(0, 0, W, H);
      pts.forEach(p => { p.x += p.vx; p.y += p.vy; if (p.x < 0 || p.x > W) p.vx *= -1; if (p.y < 0 || p.y > H) p.vy *= -1; });
      for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
        const d = Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y);
        if (d < 120) { context.beginPath(); context.moveTo(pts[i].x, pts[i].y); context.lineTo(pts[j].x, pts[j].y); context.strokeStyle = `rgba(0,201,167,${.15*(1-d/120)})`; context.lineWidth = .5; context.stroke(); }
      }
      pts.forEach(p => { context.beginPath(); context.arc(p.x, p.y, p.r, 0, Math.PI*2); context.fillStyle = "rgba(0,201,167,0.4)"; context.fill(); });
      raf = requestAnimationFrame(draw);
    }
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, []);
  return <canvas ref={ref} style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, opacity: .28 }} />;
}

const problemas = [
  { titulo: "Captação sem consistência", problema: "Um mês com a agenda cheia, três com lacunas. Depender de indicação isolada torna a renda imprevisível e o planejamento profissional inviável a longo prazo.", solucao: "Com o FractaClinic: demanda contínua de famílias qualificadas e alinhadas com a abordagem." },
  { titulo: "Dependência de clínicas", problema: "Clínicas oferecem fluxo de pacientes, mas cobram autonomia clínica, percentual alto e limitam suas condições de atendimento.", solucao: "Com o FractaClinic: atendimento direto, com suas regras, sua agenda e sua abordagem." },
  { titulo: "Gestão clínica fragmentada", problema: "Prontuário em papel, dados em planilha, comunicação por WhatsApp. Nenhum sistema pensa na lógica real da prática ABA.", solucao: "Com o FractaClinic: programas, sessões, dados e relatórios em um único ambiente integrado." },
];

const steps = [
  { n: "1", titulo: "Crie seu perfil clínico e passe pela seleção", desc: "Informe especialidades, abordagens, disponibilidade e região. O processo de seleção identifica seu nível de senioridade e garante qualidade para as famílias e para você." },
  { n: "2", titulo: "O engine sugere. A família confirma.", desc: "O FractaEngine cruza o perfil da criança com seu histórico clínico e sugere terapeutas compatíveis. A família confirma o vínculo — você é notificado e recebe o perfil completo antes da primeira sessão." },
  { n: "3", titulo: "Atenda dentro da plataforma", desc: "Sessões, programas, registro por operante e comunicação com a família — tudo em um lugar. Cada sessão alimenta o radar do FractaCare, que a família acompanha em tempo real." },
  { n: "4", titulo: "Cresça com o ecossistema", desc: "Seu nível de senioridade aumenta conforme sua experiência documentada. Mais visibilidade no engine, mais indicações qualificadas, mais autonomia clínica." },
];

const levels = [
  { n: "Terapeuta Júnior",    desc: "Formação em ABA, até 2 anos de prática supervisionada",               nivel: "Nível 1" },
  { n: "Terapeuta Pleno",     desc: "2 a 5 anos de experiência, casos complexos documentados",              nivel: "Nível 2" },
  { n: "Terapeuta Sênior",    desc: "Mais de 5 anos, capacidade de supervisão e formação contínua",         nivel: "Nível 3" },
  { n: "Supervisor / BCBA",   desc: "Credencial BCBA ou equivalente reconhecido, supervisão ativa",         nivel: "Nível 4" },
];

const modelo = [
  { n: "01", titulo: "Pacientes via Fracta", desc: "O FractaEngine conecta famílias do FractaCare ao seu perfil. Você atende dentro da plataforma e pagamos comissão por sessão realizada. Sem mensalidade. Sem risco de entrada." },
  { n: "02", titulo: "Pacientes particulares na plataforma", desc: "Já tem pacientes fora da Fracta? Use a plataforma de gestão por um valor fixo por paciente — ou convide-os a integrar o FractaCare, conectando a família ao ecossistema completo." },
  { n: "03", titulo: "Desenvolvimento com trilhas contextuais", desc: "Supervisões e trilhas de conhecimento ativadas pelo que você está aplicando — não cursos genéricos, mas conteúdo diretamente ligado à demanda clínica real do seu paciente." },
];



type Ferramenta = {
  icon: ReactNode;
  titulo: string;
  desc: string;
};

const ferramentas: Ferramenta[] = [
  {
    icon: <Brain size={18} strokeWidth={2} />,
    titulo: "Registro por operante",
    desc: "Cada tentativa com SD, resposta, dica e latência. Dados reais, não estimativas.",
  },
  {
    icon: <BarChart3 size={18} strokeWidth={2} />,
    titulo: "Análise funcional",
    desc: "Registro ABC estruturado, hipóteses de função e procedimentos de redução integrados.",
  },
  {
    icon: <ClipboardList size={18} strokeWidth={2} />,
    titulo: "Programas de ensino",
    desc: "DTT, NET, MTS, encadeamento — com critério de domínio, hierarquia de dicas e generalização.",
  },
  {
    icon: <Link2 size={18} strokeWidth={2} />,
    titulo: "Base unificada Care + Clinic",
    desc: "Os dados clínicos alimentam o radar do FractaCare. Uma base, duas interfaces.",
  },
  {
    icon: <Cpu size={18} strokeWidth={2} />,
    titulo: "Captação via FractaEngine",
    desc: "Motor que conecta famílias ao terapeuta compatível. Perfil completo antes da primeira sessão.",
  },
  {
    icon: <TrendingUp size={18} strokeWidth={2} />,
    titulo: "Relatórios automáticos",
    desc: "Evolução por habilidade, taxa de acerto, frequência de comportamentos — exportável para supervisão.",
  }
];

const depoimentos = [
  { texto: "Em seis semanas minha agenda estava cheia. Completei o perfil, passei pelo processo de seleção e o engine fez o trabalho. Nunca imaginei que conseguiria oito pacientes tão rápido atuando de forma autônoma.", nome: "Carolina Amaral", sub: "Terapeuta ABA · Belo Horizonte", init: "CA", g: "linear-gradient(135deg,#00c9a7,#1e90ff)" },
  { texto: "O que me convenceu foi a integração com o FractaCare. As famílias chegam já com o perfil preenchido, entendem o processo e reconhecem a abordagem. A qualidade do vínculo terapêutico é diferente desde o início.", nome: "Rafael Ferreira", sub: "BCBA · São Paulo", init: "RF", g: "linear-gradient(135deg,#1e90ff,#7c3aed)" },
  { texto: "A estrutura de programas dentro da plataforma é o que eu sempre quis. Treino direto, generalização e equivalência com critérios claros. O processo de seleção me fez sentir que faço parte de uma comunidade clínica séria.", nome: "Beatriz Nunes", sub: "Terapeuta Sênior · Recife", init: "BN", g: "linear-gradient(135deg,#7bed9f,#00c9a7)" },
];

const faqs = [
  { q: "Como funciona o processo de seleção?", a: "Após o cadastro, você passa por uma avaliação estruturada que considera sua formação, credenciais, experiência documentada e alinhamento com os princípios da prática baseada em evidências. Com base nessa avaliação, seu nível de senioridade é definido — o que determina sua visibilidade nas indicações do FractaEngine. O processo é transparente e pode ser revisado à medida que sua experiência avança." },
  { q: "Como as famílias chegam até mim?", a: "O FractaEngine analisa o perfil clínico da criança no FractaCare — incluindo radar de habilidades, histórico de avaliações e preferências da família — e sugere os terapeutas mais compatíveis. A família escolhe e confirma. Você recebe uma notificação com o perfil completo do aprendiz antes mesmo da primeira conversa." },
  { q: "Quanto é cobrado pela comissão por sessão?", a: "A comissão é cobrada apenas sobre sessões realizadas via plataforma com pacientes indicados pelo FractaEngine. O percentual é definido por nível de senioridade e comunicado de forma transparente no processo de seleção. Não há mensalidade obrigatória para terapeutas." },
  { q: "Posso trazer meus pacientes atuais para a plataforma?", a: "Sim. Você pode usar o FractaClinic para gerir pacientes particulares por um valor fixo por paciente ativo. Também pode convidá-los a integrar o FractaCare, conectando a família ao ecossistema completo e enriquecendo o perfil clínico da criança com dados de casa." },
  { q: "O que são as trilhas de conhecimento contextual?", a: "São conteúdos de supervisão e desenvolvimento clínico ativados pelo que você está aplicando naquele momento — não cursos genéricos, mas orientações diretamente ligadas à demanda real do seu paciente. Se você está aplicando um programa de mando, o sistema pode sugerir revisões sobre hierarquia de dicas ou critérios de domínio." },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 16, overflow: "hidden" }}>
      <button onClick={() => setOpen(!open)} style={{
        width: "100%", textAlign: "left", padding: "18px 22px", background: "none", border: "none",
        cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center",
        color: "white", fontFamily: "var(--font-sans)", fontSize: ".9rem", fontWeight: 700,
      }}>
        {q}
        <span style={{ color: "#00c9a7", fontSize: "1.2rem", flexShrink: 0, marginLeft: 12, transition: "transform .2s", transform: open ? "rotate(45deg)" : "none" }}>+</span>
      </button>
      {open && (
        <div style={{ padding: "0 22px 18px", fontSize: ".85rem", color: "rgba(255,255,255,.55)", lineHeight: 1.75 }}>{a}</div>
      )}
    </div>
  );
}

const cadastro_bullets = [
  "Indicações de pacientes qualificados pelo FractaEngine",
  "Processo de seleção transparente com definição de nível de senioridade",
  "Estrutura clínica completa: programas, sessões, dados e relatórios",
  "Sem mensalidade — comissão apenas sobre sessões realizadas via plataforma",
  "Supervisão e trilhas contextuais ao momento clínico do seu paciente",
  "Integração com o FractaCare — família e terapeuta no mesmo ecossistema",
];

export default function ClinicPage() {
  return (
    <div style={{ fontFamily: "var(--font-sans)", background: `
  radial-gradient(circle at 20% 20%, rgba(175, 233, 224, 0.08), transparent 40%),
  radial-gradient(circle at 80% 30%, rgba(30,144,255,0.08), transparent 40%),
  #111629
`, color: "white", minHeight: "100vh", position: "relative", overflow: "hidden" }}>
      <ParticleCanvas />
      <div style={{ position: "relative", zIndex: 1 }}>

        {/* NAV */}
        <nav style={{
          position: "sticky", top: 0, zIndex: 100,
          background: "rgba(7,17,31,.92)", backdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(255,255,255,.08)",
          padding: "0 32px", height: "60px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <Link href="/" style={{ textDecoration: "none" }}>
            <FractaLogo logo="clinic" height={28} alt="FractaClinic" />
          </Link>
          <ul style={{ display: "flex", gap: 28, listStyle: "none" }}>
            {[["#proposta","O problema"],["#como","Como funciona"],["#selecao","Seleção"],["#modelo","Modelo"],["#depoimentos","Depoimentos"]].map(([href,label]) => (
              <li key={href}><a href={href} style={{ fontSize: ".75rem", fontWeight: 500, textDecoration: "none", color: "rgba(255,255,255,.4)", textTransform: "uppercase", letterSpacing: ".06em", transition: "color .2s" }}
                onMouseEnter={e=>(e.currentTarget.style.color="#00c9a7")}
                onMouseLeave={e=>(e.currentTarget.style.color="rgba(255,255,255,.4)")}
              >{label}</a></li>
            ))}
          </ul>
          <div style={{ display: "flex", gap: 10 }}>
            <Link href="/" style={{ padding: "8px 16px", borderRadius: 6, border: "1px solid rgba(255,255,255,.12)", color: "rgba(255,255,255,.6)", fontSize: ".75rem", fontWeight: 600, textDecoration: "none" }}>Voltar</Link>
            <Link href="#cadastro" style={{ padding: "8px 18px", borderRadius: 6, background: "linear-gradient(135deg,#00c9a7,#0f8f7a)", color: "#07111f", fontSize: ".78rem", fontWeight: 800, textDecoration: "none" }}>Quero me cadastrar</Link>
          </div>
        </nav>

        {/* HERO */}
        <section style={{ padding: "100px 40px 80px", maxWidth: 1040, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 64, alignItems: "center" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
                <div style={{ background: "rgba(0,201,167,.1)", border: "1px solid rgba(0,201,167,.2)", borderRadius: 50, padding: "4px 14px", fontSize: ".68rem", fontWeight: 700, color: "#00c9a7", textTransform: "uppercase", letterSpacing: ".1em" }}>Para terapeutas ABA</div>
                <div style={{ fontSize: ".8rem", color: "rgba(255,255,255,.35)" }}>+320 terapeutas já na plataforma</div>
              </div>
              <h1 style={{ fontSize: "clamp(2.2rem,4.5vw,3.8rem)", fontWeight: 800, lineHeight: 1.07, letterSpacing: "-.03em", marginBottom: 20 }}>
                Sem captação consistente, <br />não há pacientes.<br />
                <span style={{ color: "#00c9a7" }}>Sem previsibilidade, não há controle</span>
              </h1>
              <p style={{ fontSize: "1rem", color: "rgba(255,255,255,.58)", lineHeight: 1.78, marginBottom: 36, maxWidth: 480 }}>
                O FractaClinic conecta você a famílias já preparadas pelo FractaCare — pais que buscam ativamente um terapeuta qualificado e alinhado com a ciência do comportamento. Você atende com autonomia. Nós estruturamos o caminho.
              </p>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 48 }}>
                <Link href="#cadastro" style={{ padding: "15px 32px", borderRadius: 8, background: "linear-gradient(135deg,#00c9a7,#0f8f7a)", color: "#07111f", fontWeight: 800, fontSize: ".95rem", textDecoration: "none", boxShadow: "0 6px 24px rgba(0,201,167,.35)" }}>
                  Criar perfil no FractaClinic
                </Link>
                <a href="#proposta" style={{ padding: "15px 28px", borderRadius: 8, border: "1px solid rgba(255,255,255,.12)", color: "rgba(255,255,255,.7)", fontWeight: 600, fontSize: ".88rem", textDecoration: "none" }}>
                  Entender o modelo
                </a>
              </div>
              <div style={{ display: "flex", gap: 36, paddingTop: 32, borderTop: "1px solid rgba(255,255,255,.08)" }}>
                {[["Sem mensalidade","para começar"],["Perfil completo","antes da 1ª sessão"],["Seleção por mérito","processo transparente"]].map(([n,l]) => (
                  <div key={l}>
                    <div style={{ fontSize: ".82rem", fontWeight: 700, color: "#00c9a7" }}>{n}</div>
                    <div style={{ fontSize: ".68rem", color: "rgba(255,255,255,.3)", marginTop: 3 }}>{l}</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ position: "relative" }}>
              <div style={{ position: "absolute", inset: -30, background: "radial-gradient(ellipse at center, rgba(0,201,167,.1) 0%, transparent 70%)", borderRadius: "50%" }} />
              <FractalTriangle size={280} animate style={{ position: "relative", filter: "hue-rotate(160deg) saturate(1.1)" }} />
            </div>
          </div>
        </section>

        {/* PROPOSTA — O PROBLEMA */}
        <section id="proposta" style={{ padding: "96px 40px", background: "rgba(255,255,255,.02)" }}>
          <div style={{ maxWidth: 1040, margin: "0 auto" }}>
            <div style={{ marginBottom: 52 }}>
              <div style={{ fontSize: ".65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".14em", color: "#00c9a7", marginBottom: 10 }}>O problema que resolvemos</div>
              <h2 style={{ fontSize: "clamp(1.8rem,3vw,2.6rem)", fontWeight: 800, letterSpacing: "-.02em", maxWidth: 600 }}>
                Domínio técnico não garante agenda cheia.
              </h2>
              <p style={{ fontSize: ".92rem", color: "rgba(255,255,255,.5)", lineHeight: 1.75, maxWidth: 520, marginTop: 14 }}>
                Sem uma estrutura de captação consistente, terapeutas qualificados ficam à mercê de indicações esporádicas — ou dependentes de clínicas que limitam sua autonomia.
              </p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 20 }}>
              {problemas.map(p => (
                <div key={p.titulo} style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 20, padding: "26px 24px" }}>
                  <div style={{ fontSize: ".72rem", fontWeight: 700, color: "rgba(255,100,100,.6)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 10 }}>Sem o FractaClinic</div>
                  <div style={{ fontSize: ".9rem", fontWeight: 700, marginBottom: 10 }}>{p.titulo}</div>
                  <div style={{ fontSize: ".8rem", color: "rgba(255,255,255,.45)", lineHeight: 1.7, marginBottom: 16 }}>{p.problema}</div>
                  <div style={{ height: 1, background: "rgba(0,201,167,.2)", marginBottom: 14 }} />
                  <div style={{ fontSize: ".8rem", color: "#00c9a7", lineHeight: 1.65 }}>{p.solucao}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* COMO FUNCIONA */}
        <section id="como" style={{ padding: "96px 40px" }}>
          <div style={{ maxWidth: 1040, margin: "0 auto" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 64 }}>
              <div>
                <div style={{ fontSize: ".65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".14em", color: "#00c9a7", marginBottom: 10 }}>Como funciona</div>
                <h2 style={{ fontSize: "clamp(1.8rem,3vw,2.4rem)", fontWeight: 800, letterSpacing: "-.02em", marginBottom: 14 }}>
                  Seu perfil. Suas regras.<br />Pacientes chegando.
                </h2>
                <p style={{ fontSize: ".9rem", color: "rgba(255,255,255,.5)", lineHeight: 1.75 }}>
                  O FractaEngine analisa o perfil clínico da criança no FractaCare e conecta a família ao terapeuta mais adequado — com base em especialidade, senioridade e disponibilidade.
                </p>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {steps.map(s => (
                  <div key={s.n} style={{ display: "flex", gap: 16, background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 16, padding: "18px 20px" }}>
                    <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg,#00c9a7,#0f8f7a)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: ".78rem", color: "#07111f", flexShrink: 0 }}>{s.n}</div>
                    <div>
                      <div style={{ fontSize: ".88rem", fontWeight: 700, marginBottom: 5 }}>{s.titulo}</div>
                      <div style={{ fontSize: ".78rem", color: "rgba(255,255,255,.45)", lineHeight: 1.65 }}>{s.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* SELEÇÃO */}
        <section id="selecao" style={{ padding: "96px 40px", background: "rgba(255,255,255,.02)" }}>
          <div style={{ maxWidth: 1040, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 52 }}>
              <div style={{ fontSize: ".65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".14em", color: "#00c9a7", marginBottom: 10 }}>Processo de seleção</div>
              <h2 style={{ fontSize: "clamp(1.8rem,3vw,2.6rem)", fontWeight: 800, letterSpacing: "-.02em" }}>Qualidade clínica garantida com transparência.</h2>
              <p style={{ fontSize: ".88rem", color: "rgba(255,255,255,.5)", lineHeight: 1.75, maxWidth: 560, margin: "14px auto 0" }}>
                Todo terapeuta que ingressa no FractaClinic passa por um processo de avaliação estruturado. Isso protege as famílias, valoriza quem tem formação sólida e distingue o FractaClinic de plataformas genéricas.
              </p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16 }}>
              {levels.map((l, i) => (
                <div key={l.n} style={{
                  background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)",
                  borderRadius: 18, padding: "24px 20px",
                  borderTop: `3px solid rgba(0,201,167,${0.25 + i * 0.25})`,
                }}>
                  <div style={{ fontSize: ".65rem", fontWeight: 700, color: "#00c9a7", marginBottom: 8 }}>{l.nivel}</div>
                  <div style={{ fontSize: ".9rem", fontWeight: 700, marginBottom: 8 }}>{l.n}</div>
                  <div style={{ fontSize: ".78rem", color: "rgba(255,255,255,.45)", lineHeight: 1.65 }}>{l.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* MODELO */}
        <section id="modelo" style={{ padding: "96px 40px" }}>
          <div style={{ maxWidth: 1040, margin: "0 auto" }}>
            <div style={{ marginBottom: 52 }}>
              <div style={{ fontSize: ".65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".14em", color: "#00c9a7", marginBottom: 10 }}>Modelo transparente</div>
              <h2 style={{ fontSize: "clamp(1.8rem,3vw,2.6rem)", fontWeight: 800, letterSpacing: "-.02em" }}>Sem mensalidade fixa obrigatória.<br />Você escolhe como usar.</h2>
              <p style={{ fontSize: ".88rem", color: "rgba(255,255,255,.5)", lineHeight: 1.75, maxWidth: 480, marginTop: 14 }}>
                Ganhamos quando você atende. Se já tem pacientes particulares, eles também podem ingressar no ecossistema.
              </p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 20 }}>
              {modelo.map(m => (
                <div key={m.n} style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 20, padding: "28px 24px" }}>
                  <div style={{ fontSize: "2rem", fontWeight: 800, color: "rgba(0,201,167,.25)", marginBottom: 12, lineHeight: 1 }}>{m.n}</div>
                  <div style={{ fontSize: ".9rem", fontWeight: 700, marginBottom: 10 }}>{m.titulo}</div>
                  <div style={{ fontSize: ".8rem", color: "rgba(255,255,255,.45)", lineHeight: 1.7 }}>{m.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FERRAMENTAS */}
        <section style={{ padding: "96px 40px", background: "rgba(255,255,255,.02)" }}>
          <div style={{ maxWidth: 1040, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 52 }}>
              <div style={{ fontSize: ".65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".14em", color: "#00c9a7", marginBottom: 10 }}>Clínica completa</div>
              <h2 style={{ fontSize: "clamp(1.8rem,3vw,2.6rem)", fontWeight: 800, letterSpacing: "-.02em" }}>Tudo que você precisa para atender</h2>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 18 }}>
              {ferramentas.map(f => (
                <div key={f.titulo} style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 20, padding: "24px", transition: "all .25s" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(0,201,167,.25)"; e.currentTarget.style.background = "rgba(0,201,167,.05)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,.08)"; e.currentTarget.style.background = "rgba(255,255,255,.04)"; }}
                >
                  <div style={{ fontSize: "1.5rem", marginBottom: 12 }}>{f.icon}</div>
                  <div style={{ fontSize: ".9rem", fontWeight: 700, marginBottom: 8 }}>{f.titulo}</div>
                  <div style={{ fontSize: ".78rem", color: "rgba(255,255,255,.5)", lineHeight: 1.65 }}>{f.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* DEPOIMENTOS */}
        <section id="depoimentos" style={{ padding: "96px 40px" }}>
          <div style={{ maxWidth: 1040, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 48 }}>
              <div style={{ fontSize: ".65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".14em", color: "#00c9a7", marginBottom: 10 }}>Depoimentos</div>
              <h2 style={{ fontSize: "clamp(1.8rem,3vw,2.4rem)", fontWeight: 800, letterSpacing: "-.02em" }}>O que terapeutas estão dizendo</h2>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 20 }}>
              {depoimentos.map(d => (
                <div key={d.nome} style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 22, padding: "26px" }}>
                  <div style={{ display: "flex", gap: 2, marginBottom: 16 }}>
                    {[...Array(5)].map((_,i) => <span key={i} style={{ color: "#00c9a7", fontSize: ".85rem" }}>★</span>)}
                  </div>
                  <p style={{ fontSize: ".85rem", color: "rgba(255,255,255,.6)", lineHeight: 1.78, marginBottom: 20 }}>"{d.texto}"</p>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: "50%", background: d.g, display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".62rem", fontWeight: 800, color: "white" }}>{d.init}</div>
                    <div>
                      <div style={{ fontSize: ".82rem", fontWeight: 700 }}>{d.nome}</div>
                      <div style={{ fontSize: ".68rem", color: "rgba(255,255,255,.35)" }}>{d.sub}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" style={{ padding: "96px 40px", background: "rgba(255,255,255,.02)" }}>
          <div style={{ maxWidth: 720, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 48 }}>
              <h2 style={{ fontSize: "clamp(1.8rem,3vw,2.4rem)", fontWeight: 800, letterSpacing: "-.02em" }}>Perguntas frequentes</h2>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {faqs.map(f => <FaqItem key={f.q} q={f.q} a={f.a} />)}
            </div>
          </div>
        </section>

        {/* CADASTRO */}
        <section id="cadastro" style={{ padding: "96px 40px", background: "radial-gradient(ellipse 60% 80% at 50% 50%, rgba(0,201,167,.08) 0%, transparent 70%)" }}>
          <div style={{ maxWidth: 780, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48, alignItems: "center" }}>
            <div>
              <div style={{ fontSize: ".65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".14em", color: "#00c9a7", marginBottom: 14 }}>Entre agora</div>
              <h2 style={{ fontSize: "clamp(1.6rem,3vw,2.2rem)", fontWeight: 800, letterSpacing: "-.02em", lineHeight: 1.2, marginBottom: 24 }}>
                Sua agenda previsível.<br />Sua autonomia preservada.<br />Sua prática reconhecida.
              </h2>
              <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
                {cadastro_bullets.map(b => (
                  <li key={b} style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: ".82rem", color: "rgba(255,255,255,.6)" }}>
                    <span style={{ color: "#00c9a7", fontWeight: 800, flexShrink: 0 }}>—</span>
                    {b}
                  </li>
                ))}
              </ul>
            </div>
            <div style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(0,201,167,.2)", borderRadius: 20, padding: "28px" }}>
              <div style={{ fontSize: ".9rem", fontWeight: 700, marginBottom: 20 }}>Criar perfil no FractaClinic</div>
              {["Nome","Sobrenome","E-mail profissional"].map(label => (
                <div key={label} style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: ".72rem", fontWeight: 600, color: "rgba(255,255,255,.4)", display: "block", marginBottom: 5 }}>{label}</label>
                  <input placeholder={label} style={{ width: "100%", padding: "11px 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.06)", color: "white", fontFamily: "var(--font-sans)", fontSize: ".85rem", outline: "none" }} />
                </div>
              ))}
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: ".72rem", fontWeight: 600, color: "rgba(255,255,255,.4)", display: "block", marginBottom: 5 }}>Tipo de atuação</label>
                <select style={{ width: "100%", padding: "11px 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,.12)", background: "rgba(13,32,64,0.9)", color: "rgba(255,255,255,.7)", fontFamily: "var(--font-sans)", fontSize: ".85rem", outline: "none" }}>
                  <option value="">Selecione...</option>
                  {["Terapeuta ABA","Psicólogo comportamental","Fonoaudiólogo com formação em ABA","Supervisor / BCBA"].map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
              <button style={{ width: "100%", padding: "14px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#00c9a7,#0f8f7a)", color: "#07111f", fontWeight: 800, fontSize: ".9rem", cursor: "pointer", marginTop: 4, fontFamily: "var(--font-sans)" }}>
                Criar perfil no FractaClinic
              </button>
              <div style={{ fontSize: ".7rem", color: "rgba(255,255,255,.25)", textAlign: "center", marginTop: 12 }}>
                Sem mensalidade obrigatória · Comissão apenas quando você atende
              </div>
            </div>
          </div>
        </section>

        {/* FOOTER */}
        <footer style={{ padding: "48px 40px 32px", borderTop: "1px solid rgba(255,255,255,.08)" }}>
          <div style={{ maxWidth: 1040, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 32, marginBottom: 32 }}>
            <div>
              <FractaLogo logo="clinic" height={26} alt="FractaClinic" />
              <p style={{ fontSize: ".78rem", color: "rgba(255,255,255,.3)", marginTop: 10, maxWidth: 240, lineHeight: 1.7 }}>
                Gestão clínica e captação para terapeutas ABA. Uma plataforma da Fracta Behavior.
              </p>
            </div>
            <div style={{ display: "flex", gap: 48 }}>
              {[
                { title: "Plataforma", links: [{href:"#proposta",l:"O problema"},{href:"#como",l:"Como funciona"},{href:"#selecao",l:"Seleção"},{href:"#modelo",l:"Modelo"}] },
                { title: "Fracta", links: [{href:"/",l:"Fracta Behavior"},{href:"/care",l:"FractaCare"},{href:"#",l:"Privacidade"}] },
              ].map(col => (
                <div key={col.title}>
                  <div style={{ fontSize: ".6rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", color: "rgba(255,255,255,.2)", marginBottom: 14 }}>{col.title}</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {col.links.map(lk => <a key={lk.l} href={lk.href} style={{ fontSize: ".8rem", color: "rgba(255,255,255,.35)", textDecoration: "none" }}>{lk.l}</a>)}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ borderTop: "1px solid rgba(255,255,255,.06)", paddingTop: 20, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
            <span style={{ fontSize: ".72rem", color: "rgba(255,255,255,.2)" }}>© 2025 Fracta Behavior. Todos os direitos reservados.</span>
            <a href="#" style={{ fontSize: ".72rem", color: "rgba(255,255,255,.2)", textDecoration: "none" }}>Política de Privacidade</a>
          </div>
        </footer>

      </div>
    </div>
  );
}
