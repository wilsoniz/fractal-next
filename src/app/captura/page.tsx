"use client";
import Link from "next/link";
import { useState } from "react";
import { FractaLogo } from "@/components/fracta/FractaLogo";
import { FractalTriangle } from "@/components/fracta/FractalTriangle";

const steps = [
  { n: "1", titulo: "Você responde a avaliação", desc: "14 perguntas simples sobre o dia a dia do seu filho. Leva menos de 2 minutos." },
  { n: "2", titulo: "Geramos o mapa de habilidades", desc: "O FractaEngine analisa as respostas e cria um radar personalizado de desenvolvimento." },
  { n: "3", titulo: "Você recebe atividades personalizadas", desc: "Planos de atividade simples, em linguagem acessível, para praticar em casa." },
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

// Valores do radar Lucas 3 anos (do HTML original)
const radarVals = [0.45, 0.65, 0.38, 0.52, 0.70, 0.40, 0.72, 0.60];

const paraQuem = [
  {
    icon: "📈", titulo: "Desenvolver novas habilidades",
    desc: "Atividades práticas alinhadas ao momento do seu filho — do que ele já sabe para o que está prestes a aprender.",
    items: ['Comunicação funcional e linguagem','Interação social e brincadeira','Atenção e aprendizagem','Autonomia e autocuidado'],
    bg: "linear-gradient(145deg,#f0faff,#e8f9f4)", border: "rgba(43,191,164,.15)", cor: "#2BBFA4",
  },
  {
    icon: "🌿", titulo: "Melhorar momentos difíceis",
    desc: "Estratégias práticas para lidar com os desafios do dia a dia com mais leveza e eficácia.",
    items: ["Dificuldade em aceitar 'não'","Parar telas sem conflito","Lidar com frustrações e birras","Transições mais tranquilas"],
    bg: "linear-gradient(145deg,#fff8f0,#fff3ee)", border: "rgba(255,160,100,.15)", cor: "#e07040",
  },
];

const depoimentos = [
  {
    texto: 'Em 3 semanas meu filho começou a pedir as coisas de forma diferente. As atividades são simples mas fazem toda a diferença no dia a dia.',
    nome: 'Mariana A.', sub: 'Mãe do Lucas, 4 anos', init: 'MA',
    g: 'linear-gradient(135deg,#2BBFA4,#2A7BA8)',
  },
  {
    texto: 'Finalmente um app que não me faz sentir que estou errando. O mapa de habilidades me mostrou o que o meu filho já tem e onde pode crescer.',
    nome: 'Ricardo F.', sub: 'Pai da Sofia, 3 anos', init: 'RF',
    g: 'linear-gradient(135deg,#4FC3D8,#2A7BA8)',
  },
  {
    texto: 'A parte de momentos difíceis foi um divisor de águas para nós. As birras diminuíram muito depois que comecei a aplicar as estratégias.',
    nome: 'Camila S.', sub: 'Mãe do Pedro, 5 anos', init: 'CS',
    g: 'linear-gradient(135deg,#7AE040,#2BBFA4)',
  },
];

const faqs = [
  {
    q: 'O FractaCare substitui o acompanhamento profissional?',
    a: 'Não. O FractaCare é um complemento poderoso para o trabalho em casa, mas não substitui o acompanhamento de profissionais como psicólogos, fonoaudiólogos e terapeutas. Indicamos sempre que as famílias busquem suporte especializado quando necessário.',
  },
  {
    q: 'Preciso ter conhecimento em ABA para usar?',
    a: 'De jeito nenhum. Toda a linguagem técnica é traduzida para o dia a dia. Você vai ler "atividade de hoje", "como foi?", "próximo passo" — sem jargões. O FractaCare foi feito para pais, não para especialistas.',
  },
  {
    q: 'Para qual faixa etária o FractaCare funciona?',
    a: 'O sistema foi desenvolvido para crianças de 1 a 8 anos. As atividades e o radar se adaptam automaticamente à idade informada.',
  },
  {
    q: 'A avaliação inicial é mesmo gratuita?',
    a: 'Sim, 100% gratuita e sem cartão de crédito. Você responde 14 perguntas, recebe o radar de desenvolvimento do seu filho e as primeiras atividades personalizadas — tudo sem precisar pagar nada.',
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ background: "rgba(255,255,255,.84)", border: "1px solid rgba(43,191,164,.15)", borderRadius: 16, overflow: "hidden", boxShadow: "0 2px 12px rgba(30,58,95,.06)" }}>
      <button onClick={() => setOpen(!open)} style={{
        width: "100%", textAlign: "left", padding: "22px 24px", background: "none", border: "none",
        cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center",
        fontFamily: "var(--font-sans)", fontWeight: 800, fontSize: ".95rem", color: "#1E3A5F",
      }}>
        {q}
        <span style={{ color: "#2BBFA4", fontSize: "1.2rem", flexShrink: 0, marginLeft: 12, transition: "transform .2s", transform: open ? "rotate(45deg)" : "none" }}>+</span>
      </button>
      {open && (
        <div style={{ padding: "0 24px 22px", fontSize: ".9rem", color: "#5a7a9a", lineHeight: 1.7 }}>{a}</div>
      )}
    </div>
  );
}

function RadarSVG() {
  const cx = 180, cy = 180, maxR = 130, n = 8;
  const step = (2 * Math.PI) / n;
  const start = -Math.PI / 2;
  function pt(i: number, r: number): [number, number] {
    const a = start + i * step;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  }
  function pStr(pts: [number,number][]) { return pts.map(p => p.join(",")).join(" "); }
  const gridLevels = [0.25, 0.5, 0.75, 1];
  const valPts = radarVals.map((v, i) => pt(i, v * maxR));

  return (
    <svg viewBox="0 0 360 360" width="320" height="320" style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id="rg-care" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#2BBFA4" stopOpacity={0.25} />
          <stop offset="100%" stopColor="#7AE040" stopOpacity={0.15} />
        </linearGradient>
      </defs>
      {/* Grid */}
      {gridLevels.map(f => (
        <polygon key={f}
          points={pStr(Array.from({length:n}, (_,i) => pt(i, maxR*f)))}
          fill="none" stroke="rgba(43,191,164,0.15)" strokeWidth="1"
        />
      ))}
      {/* Eixos */}
      {Array.from({length:n}, (_,i) => {
        const [x2,y2] = pt(i, maxR);
        return <line key={i} x1={cx} y1={cy} x2={x2} y2={y2} stroke="rgba(43,191,164,0.15)" strokeWidth="1" />;
      })}
      {/* Polígono de valores */}
      <polygon points={pStr(valPts)} fill="url(#rg-care)" stroke="#2BBFA4" strokeWidth="2.5" />
      {/* Pontos e labels */}
      {radarVals.map((v, i) => {
        const [x, y] = pt(i, v * maxR);
        const [lx, ly] = pt(i, maxR + 28);
        const [px, py] = pt(i, v * maxR - 14);
        return (
          <g key={i}>
            <circle cx={x} cy={y} r={6} fill="#2BBFA4" stroke="white" strokeWidth="2.5" />
            <text x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" fontSize="11" fontFamily="Plus Jakarta Sans, sans-serif" fontWeight="700" fill="#1E3A5F">{domains[i].nome}</text>
            <text x={px} y={py} textAnchor="middle" dominantBaseline="middle" fontSize="9" fontFamily="Plus Jakarta Sans, sans-serif" fontWeight="800" fill="#2BBFA4">{Math.round(v*100)}%</text>
          </g>
        );
      })}
    </svg>
  );
}

export default function CarePage() {
  return (
    <div style={{
      fontFamily: "var(--font-sans)", minHeight: "100vh", color: "#1E3A5F",
      background: "radial-gradient(ellipse 80% 60% at 20% 10%, rgba(122,224,64,.10) 0%, transparent 55%), radial-gradient(ellipse 60% 70% at 80% 90%, rgba(43,191,164,.13) 0%, transparent 55%), radial-gradient(ellipse 100% 80% at 50% 50%, rgba(79,195,216,.08) 0%, transparent 70%), linear-gradient(160deg,#e8f8ff 0%,#f0fdfb 35%,#edfff8 65%,#ddf4ff 100%)",
    }}>

      {/* NAV */}
      <nav style={{ position: "sticky", top: 0, zIndex: 100, background: "rgba(255,255,255,.78)", backdropFilter: "blur(18px)", borderBottom: "1px solid rgba(43,191,164,.15)", padding: "0 32px", height: "60px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Link href="/" style={{ textDecoration: "none" }}>
          <FractaLogo logo="care" height={34} alt="FractaCare" />
        </Link>
        <ul style={{ display: "flex", gap: 28, listStyle: "none" }}>
          {[["#como-funciona","Como funciona"],["#dominios","Habilidades"],["#depoimentos","Depoimentos"],["#faq","Dúvidas"]].map(([href,label]) => (
            <li key={href}><a href={href} style={{ fontSize: ".8rem", fontWeight: 600, textDecoration: "none", color: "#5a7a9a", transition: "color .2s" }}
              onMouseEnter={e=>(e.currentTarget.style.color="#2BBFA4")}
              onMouseLeave={e=>(e.currentTarget.style.color="#5a7a9a")}
            >{label}</a></li>
          ))}
        </ul>
        <div style={{ display: "flex", gap: 10 }}>
          <Link href="/captura/avaliacao" style={{ padding: "9px 20px", borderRadius: 50, border: "1.5px solid rgba(43,191,164,.3)", color: "#2BBFA4", fontSize: ".8rem", fontWeight: 700, textDecoration: "none" }}>Fazer avaliação</Link>
          <Link href="/captura/avaliacao" style={{ padding: "9px 20px", borderRadius: 50, background: "linear-gradient(135deg,#2BBFA4,#7AE040)", color: "white", fontSize: ".8rem", fontWeight: 800, textDecoration: "none", boxShadow: "0 3px 14px rgba(43,191,164,.35)" }}>Começar grátis →</Link>
        </div>
      </nav>

      {/* HERO */}
      <section style={{ padding: "96px 40px 80px", maxWidth: 1080, margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 64, alignItems: "center" }}>
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(43,191,164,.12)", border: "1px solid rgba(43,191,164,.25)", borderRadius: 50, padding: "5px 16px", marginBottom: 22, fontSize: ".68rem", fontWeight: 700, color: "#2BBFA4", textTransform: "uppercase", letterSpacing: ".12em" }}>
              Baseado em Análise do Comportamento Aplicada
            </div>
            <h1 style={{ fontSize: "clamp(2.2rem,4.5vw,3.8rem)", fontWeight: 800, lineHeight: 1.07, letterSpacing: "-.03em", marginBottom: 20 }}>
              Desenvolvimento infantil<br />
              <span style={{ color: "#2BBFA4" }}>guiado por ciência</span><br />
              e amor.
            </h1>
            <p style={{ fontSize: "1rem", color: "#5a7a9a", lineHeight: 1.75, marginBottom: 36, maxWidth: 460 }}>
              Descubra as habilidades do seu filho que estão prontas para crescer. Receba atividades personalizadas para aplicar no dia a dia, com base na ciência do desenvolvimento.
            </p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 48 }}>
              <Link href="/captura/avaliacao" style={{ padding: "15px 32px", borderRadius: 50, background: "linear-gradient(135deg,#2BBFA4,#7AE040)", color: "white", fontWeight: 800, fontSize: ".95rem", textDecoration: "none", boxShadow: "0 6px 24px rgba(43,191,164,.4)" }}>
                ✦ Começar avaliação gratuita
              </Link>
              <a href="#como-funciona" style={{ padding: "15px 28px", borderRadius: 50, border: "1.5px solid rgba(43,191,164,.25)", color: "#2A7BA8", fontWeight: 600, fontSize: ".88rem", textDecoration: "none", background: "rgba(255,255,255,.6)" }}>
                Como funciona
              </a>
            </div>
            <div style={{ display: "flex", gap: 36 }}>
              {[["4.800+","Famílias ativas"],["40+","Atividades personalizadas"],["2 min","Para fazer a avaliação"]].map(([n,l]) => (
                <div key={l}>
                  <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "#1E3A5F" }}>{n}</div>
                  <div style={{ fontSize: ".7rem", color: "#8a9ab8", marginTop: 3 }}>{l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Mockup do app */}
          <div style={{ position: "relative" }}>
            {/* Float cards */}
            <div style={{ position: "absolute", top: -16, left: -20, background: "white", borderRadius: 14, padding: "10px 16px", boxShadow: "0 4px 20px rgba(0,0,0,.1)", border: "1px solid rgba(43,191,164,.15)", display: "flex", alignItems: "center", gap: 10, zIndex: 2 }}>
              <span style={{ fontSize: "1.1rem" }}>🧠</span>
              <div>
                <div style={{ fontSize: ".72rem", fontWeight: 700, color: "#1E3A5F" }}>Nova habilidade!</div>
                <div style={{ fontSize: ".62rem", color: "#8a9ab8" }}>Lucas pediu ajuda pela 1ª vez</div>
              </div>
            </div>
            <div style={{ position: "absolute", bottom: -12, right: -16, background: "white", borderRadius: 14, padding: "10px 16px", boxShadow: "0 4px 20px rgba(0,0,0,.1)", border: "1px solid rgba(43,191,164,.15)", display: "flex", alignItems: "center", gap: 10, zIndex: 2 }}>
              <span style={{ fontSize: "1.1rem" }}>📈</span>
              <div>
                <div style={{ fontSize: ".72rem", fontWeight: 700, color: "#1E3A5F" }}>+23% em comunicação</div>
                <div style={{ fontSize: ".62rem", color: "#8a9ab8" }}>Últimas 3 semanas</div>
              </div>
            </div>
            {/* Mockup card */}
            <div style={{ background: "rgba(255,255,255,.88)", backdropFilter: "blur(12px)", borderRadius: 28, border: "1px solid rgba(43,191,164,.2)", boxShadow: "0 20px 60px rgba(43,191,164,.12), 0 4px 20px rgba(0,0,0,.06)", overflow: "hidden" }}>
              <div style={{ background: "linear-gradient(135deg,#1E3A5F,#2A7BA8)", padding: "22px 22px 18px" }}>
                <div style={{ fontSize: ".7rem", color: "rgba(255,255,255,.6)", marginBottom: 3 }}>Bom dia, Ana 👋</div>
                <div style={{ fontSize: ".95rem", fontWeight: 800, color: "white" }}>Lucas <span style={{ color: "rgba(255,255,255,.5)", fontWeight: 400, fontSize: ".78rem" }}>· 3 anos</span></div>
              </div>
              <div style={{ padding: "18px 22px 10px", display: "flex", flexDirection: "column", alignItems: "center" }}>
                <div style={{ fontSize: ".62rem", fontWeight: 700, color: "#8a9ab8", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 10 }}>Mapa de habilidades</div>
                <FractalTriangle size={110} animate />
                <div style={{ fontSize: ".72rem", color: "#5a7a9a", textAlign: "center", marginTop: 10, lineHeight: 1.55 }}>
                  Lucas está em um ótimo momento para desenvolver <strong style={{ color: "#2BBFA4" }}>comunicação funcional</strong> e ampliar atenção.
                </div>
              </div>
              <div style={{ padding: "8px 18px 20px" }}>
                <div style={{ fontSize: ".62rem", fontWeight: 700, color: "#8a9ab8", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 10 }}>Hoje você pode praticar</div>
                {[
                  { icon: "💬", name: "Pedir o que quer", sub: "Comunicação · 3 min", c: "#2BBFA4" },
                  { icon: "⏱️", name: "Aumentar tempo em atividade", sub: "Atenção · 5 min", c: "#4FC3D8" },
                  { icon: "🌊", name: "Esperar alguns segundos", sub: "Regulação · 3 min", c: "#2A7BA8" },
                ].map(a => (
                  <div key={a.name} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 11px", borderRadius: 12, marginBottom: 7, background: "rgba(43,191,164,.06)", border: "1px solid rgba(43,191,164,.1)" }}>
                    <div style={{ width: 30, height: 30, borderRadius: 9, background: `${a.c}22`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".85rem", flexShrink: 0 }}>{a.icon}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: ".75rem", fontWeight: 700, color: "#1E3A5F" }}>{a.name}</div>
                      <div style={{ fontSize: ".62rem", color: "#8a9ab8" }}>{a.sub}</div>
                    </div>
                    <span style={{ color: "#2BBFA4", fontSize: ".9rem" }}>›</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* COMO FUNCIONA */}
      <section id="como-funciona" style={{ padding: "96px 40px", background: "rgba(255,255,255,.6)", backdropFilter: "blur(8px)" }}>
        <div style={{ maxWidth: 1040, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <div style={{ fontSize: ".65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".14em", color: "#2BBFA4", marginBottom: 10 }}>Simples e poderoso</div>
            <h2 style={{ fontSize: "clamp(1.8rem,3vw,2.6rem)", fontWeight: 800, letterSpacing: "-.02em" }}>Como o FractaCare funciona</h2>
            <p style={{ fontSize: ".88rem", color: "#5a7a9a", lineHeight: 1.75, maxWidth: 520, margin: "12px auto 0" }}>
              Em poucos minutos você tem um mapa personalizado e sabe exatamente o que praticar com seu filho.
            </p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 20 }}>
            {steps.map(s => (
              <div key={s.n} style={{ background: "rgba(255,255,255,.84)", border: "1px solid rgba(43,191,164,.15)", borderRadius: 22, padding: "26px 22px", boxShadow: "0 4px 20px rgba(43,191,164,.06)" }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg,#2BBFA4,#7AE040)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: ".82rem", color: "white", marginBottom: 14 }}>{s.n}</div>
                <div style={{ fontSize: ".9rem", fontWeight: 700, color: "#1E3A5F", marginBottom: 8 }}>{s.titulo}</div>
                <div style={{ fontSize: ".8rem", color: "#5a7a9a", lineHeight: 1.65 }}>{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DOMÍNIOS — FRACTA DEVELOPMENT MAP */}
      <section id="dominios" style={{ padding: "96px 40px" }}>
        <div style={{ maxWidth: 1040, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 64, alignItems: "center" }}>
            {/* Radar */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{ fontSize: ".65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".14em", color: "#2BBFA4", marginBottom: 6 }}>Fracta Development Map</div>
              <h2 style={{ fontSize: "clamp(1.6rem,2.5vw,2.2rem)", fontWeight: 800, letterSpacing: "-.02em", textAlign: "center", marginBottom: 8 }}>O mapa de desenvolvimento do seu filho</h2>
              <p style={{ fontSize: ".82rem", color: "#5a7a9a", lineHeight: 1.7, textAlign: "center", marginBottom: 20, maxWidth: 360 }}>
                Baseado em marcos do desenvolvimento, cúspides comportamentais e comportamentos pivotais — traduzidos para pais.
              </p>
              <RadarSVG />
              <div style={{ fontSize: ".75rem", color: "#8a9ab8", marginTop: 8 }}>Exemplo de radar — Lucas, 3 anos</div>
            </div>
            {/* Domínios lista */}
            <div>
              <div style={{ fontSize: ".65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".14em", color: "#2BBFA4", marginBottom: 10 }}>8 domínios avaliados</div>
              <h2 style={{ fontSize: "clamp(1.6rem,2.5vw,2.2rem)", fontWeight: 800, letterSpacing: "-.02em", marginBottom: 8 }}>Habilidades que moldam o futuro do seu filho</h2>
              <p style={{ fontSize: ".82rem", color: "#5a7a9a", lineHeight: 1.7, marginBottom: 24 }}>
                Cada domínio conecta pequenas habilidades que, juntas, criam grandes repertórios de desenvolvimento.
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {domains.map(d => (
                  <div key={d.nome} style={{ background: "rgba(255,255,255,.84)", border: "1px solid rgba(43,191,164,.15)", borderRadius: 16, padding: "14px 16px", display: "flex", gap: 12, alignItems: "flex-start" }}>
                    <span style={{ fontSize: "1.1rem", flexShrink: 0 }}>{d.icon}</span>
                    <div>
                      <div style={{ fontSize: ".82rem", fontWeight: 700, color: "#1E3A5F", marginBottom: 2 }}>{d.nome}</div>
                      <div style={{ fontSize: ".72rem", color: "#8a9ab8", lineHeight: 1.5 }}>{d.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PARA QUEM É */}
      <section style={{ padding: "96px 40px", background: "white" }}>
        <div style={{ maxWidth: 1040, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <div style={{ fontSize: ".65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".14em", color: "#2BBFA4", marginBottom: 10 }}>Para quem é o FractaCare</div>
            <h2 style={{ fontSize: "clamp(1.8rem,3vw,2.4rem)", fontWeight: 800, letterSpacing: "-.02em" }}>O FractaCare ajuda com dois desafios reais dos pais</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 28 }}>
            {paraQuem.map(card => (
              <div key={card.titulo} style={{ background: card.bg, border: `1px solid ${card.border}`, borderRadius: 24, padding: "36px" }}>
                <div style={{ fontSize: "2.5rem", marginBottom: 16 }}>{card.icon}</div>
                <h3 style={{ fontSize: "1.2rem", fontWeight: 800, color: "#1E3A5F", marginBottom: 12 }}>{card.titulo}</h3>
                <p style={{ fontSize: ".88rem", color: "#5a7a9a", lineHeight: 1.75, marginBottom: 22 }}>{card.desc}</p>
                <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
                  {card.items.map(item => (
                    <li key={item} style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: ".88rem", color: "#3a5a7a" }}>
                      <span style={{ color: card.cor, fontWeight: 800, flexShrink: 0 }}>✓</span>
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
      <section id="depoimentos" style={{ padding: "96px 40px" }}>
        <div style={{ maxWidth: 1040, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <div style={{ fontSize: ".65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".14em", color: "#2BBFA4", marginBottom: 10 }}>O que os pais dizem</div>
            <h2 style={{ fontSize: "clamp(1.8rem,3vw,2.4rem)", fontWeight: 800, letterSpacing: "-.02em" }}>Famílias que já sentiram a diferença</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 20 }}>
            {depoimentos.map(d => (
              <div key={d.nome} style={{ background: "rgba(255,255,255,.84)", border: "1px solid rgba(43,191,164,.15)", borderRadius: 22, padding: "26px", boxShadow: "0 4px 20px rgba(43,191,164,.06)" }}>
                <div style={{ display: "flex", gap: 2, marginBottom: 14 }}>
                  {[...Array(5)].map((_,i) => <span key={i} style={{ color: "#2BBFA4", fontSize: ".9rem" }}>★</span>)}
                </div>
                <p style={{ fontSize: ".88rem", color: "#3a5a7a", lineHeight: 1.78, marginBottom: 20 }}>"{d.texto}"</p>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: d.g, display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".62rem", fontWeight: 800, color: "white" }}>{d.init}</div>
                  <div>
                    <div style={{ fontSize: ".82rem", fontWeight: 700, color: "#1E3A5F" }}>{d.nome}</div>
                    <div style={{ fontSize: ".68rem", color: "#8a9ab8" }}>{d.sub}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" style={{ padding: "96px 40px", background: "rgba(255,255,255,.5)", backdropFilter: "blur(8px)" }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <div style={{ fontSize: ".65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".14em", color: "#2BBFA4", marginBottom: 10 }}>Perguntas frequentes</div>
            <h2 style={{ fontSize: "clamp(1.8rem,3vw,2.4rem)", fontWeight: 800, letterSpacing: "-.02em" }}>Dúvidas dos pais</h2>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {faqs.map(f => <FaqItem key={f.q} q={f.q} a={f.a} />)}
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section style={{ padding: "100px 40px", textAlign: "center", background: "linear-gradient(135deg,#1E3A5F,#2A7BA8)" }}>
        <div style={{ maxWidth: 560, margin: "0 auto" }}>
          <h2 style={{ fontSize: "clamp(1.8rem,3.5vw,2.8rem)", fontWeight: 800, letterSpacing: "-.02em", color: "white", marginBottom: 16 }}>
            Seu filho tem habilidades<br />prontas para crescer.
          </h2>
          <p style={{ fontSize: ".92rem", color: "rgba(255,255,255,.7)", marginBottom: 36, lineHeight: 1.75 }}>
            Descubra quais são em 2 minutos. Grátis, sem cartão de crédito.
          </p>
          <Link href="/captura/avaliacao" style={{ display: "inline-block", padding: "16px 36px", borderRadius: 50, background: "white", color: "#1E3A5F", fontWeight: 800, fontSize: "1rem", textDecoration: "none", boxShadow: "0 6px 28px rgba(0,0,0,.2)" }}>
            ✦ Começar avaliação gratuita
          </Link>
          <div style={{ fontSize: ".75rem", color: "rgba(255,255,255,.4)", marginTop: 14 }}>
            Gratuito para começar · Sem cartão · 2 minutos
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ padding: "48px 40px 32px", background: "rgba(255,255,255,.7)", backdropFilter: "blur(10px)", borderTop: "1px solid rgba(43,191,164,.12)" }}>
        <div style={{ maxWidth: 1040, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 32, marginBottom: 32 }}>
          <div>
            <FractaLogo logo="care" height={30} alt="FractaCare" />
            <p style={{ fontSize: ".78rem", color: "#8a9ab8", marginTop: 10, maxWidth: 240, lineHeight: 1.7 }}>
              Desenvolvimento infantil guiado por ciência e amor. Uma plataforma da Fracta Behavior.
            </p>
          </div>
          <div style={{ display: "flex", gap: 48 }}>
            {[
              { title: "Plataforma", links: [{href:"#como-funciona",l:"Como funciona"},{href:"#dominios",l:"Habilidades"},{href:"/captura/avaliacao",l:"Fazer avaliação"}] },
              { title: "Empresa", links: [{href:"/",l:"Fracta Behavior"},{href:"#",l:"Privacidade"},{href:"#",l:"Contato"}] },
            ].map(col => (
              <div key={col.title}>
                <div style={{ fontSize: ".6rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", color: "#aabbcc", marginBottom: 14 }}>{col.title}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {col.links.map(lk => <a key={lk.l} href={lk.href} style={{ fontSize: ".8rem", color: "#5a7a9a", textDecoration: "none" }}>{lk.l}</a>)}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ borderTop: "1px solid rgba(43,191,164,.1)", paddingTop: 20, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          <span style={{ fontSize: ".72rem", color: "#aabbcc" }}>© 2025 Fracta Behavior. Todos os direitos reservados.</span>
          <a href="#" style={{ fontSize: ".72rem", color: "#aabbcc", textDecoration: "none" }}>Política de Privacidade</a>
        </div>
      </footer>
    </div>
  );
}
