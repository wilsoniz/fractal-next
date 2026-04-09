"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FractaLogo } from "@/components/fracta/FractaLogo";

// ─── TIPOS ────────────────────────────────────────────────
type DomKey = "comunicacao"|"social"|"atencao"|"regulacao"|"brincadeira"|"flexibilidade"|"autonomia"|"motivacao";
type Escala = { texto: string; valor: number }[];

const ESCALA_POS: Escala = [
  { texto: "Sempre",         valor: 4 },
  { texto: "Frequentemente", valor: 3 },
  { texto: "Às vezes",       valor: 2 },
  { texto: "Raramente",      valor: 1 },
  { texto: "Ainda não",      valor: 0 },
];
const ESCALA_INV: Escala = [
  { texto: "Nunca",          valor: 4 },
  { texto: "Raramente",      valor: 3 },
  { texto: "Às vezes",       valor: 2 },
  { texto: "Frequentemente", valor: 1 },
  { texto: "Quase sempre",   valor: 0 },
];

// ─── PERGUNTAS ────────────────────────────────────────────
// peso_idade: multiplicador que aumenta importância com a idade
// idadeMin: a partir de qual idade a pergunta é mais relevante
interface Pergunta {
  dominio: string;
  domKey: DomKey;
  peso: number;
  idadeMin?: number; // ajuste dinâmico por idade
  escala?: Escala;
  tipo?: "escolha";
  texto: (n: string) => string;
  exemplo: string;
  opcoes?: { texto: string; valor: number }[];
}

const PERGUNTAS: Pergunta[] = [
  {
    dominio: "Comunicação", domKey: "comunicacao", peso: 1.2, idadeMin: 1,
    escala: ESCALA_POS,
    texto: n => `${n} consegue pedir o que quer de alguma forma?`,
    exemplo: "Por palavras, gestos, apontar ou levá-lo até o objeto.",
  },
  {
    dominio: "Comunicação Social", domKey: "social", peso: 1.0, idadeMin: 1,
    escala: ESCALA_POS,
    texto: n => `${n} costuma mostrar coisas que acha interessantes para você?`,
    exemplo: "Um brinquedo, um desenho, algo que encontrou.",
  },
  {
    dominio: "Atenção", domKey: "atencao", peso: 1.0, idadeMin: 1,
    escala: ESCALA_POS,
    texto: n => `${n} consegue ficar alguns minutos envolvido em uma atividade?`,
    exemplo: "Desenhar, montar algo, brincar com brinquedos.",
  },
  {
    dominio: "Atenção · Telas", domKey: "atencao", peso: 0.8, idadeMin: 2,
    escala: ESCALA_INV,
    texto: n => `Depois de usar telas, ${n} tem dificuldade para se concentrar em outras atividades?`,
    exemplo: "Fica agitado, irritado ou com dificuldade de mudar o foco.",
  },
  {
    dominio: "Interação Social", domKey: "social", peso: 1.0, idadeMin: 1,
    escala: ESCALA_POS,
    texto: n => `Quando você chama ${n} pelo nome, ele costuma responder ou olhar para você?`,
    exemplo: "Vira a cabeça, para o que está fazendo, responde de alguma forma.",
  },
  {
    dominio: "Brincadeira", domKey: "brincadeira", peso: 1.0, idadeMin: 1,
    escala: ESCALA_POS,
    texto: n => `${n} costuma brincar explorando brinquedos de diferentes formas?`,
    exemplo: "Empilhar, montar, fingir que objetos são outra coisa.",
  },
  {
    dominio: "Flexibilidade", domKey: "flexibilidade", peso: 1.0, idadeMin: 2,
    escala: ESCALA_INV,
    texto: n => `Mudanças pequenas na rotina costumam deixar ${n} muito irritado?`,
    exemplo: "Trocar de atividade, uma rota diferente, mudança de plano.",
  },
  {
    dominio: "Regulação Emocional", domKey: "regulacao", peso: 1.0, idadeMin: 1,
    escala: ESCALA_POS,
    texto: n => `Quando algo não acontece como espera, ${n} consegue se acalmar depois de um tempo?`,
    exemplo: "Volta à atividade, se distrai, aceita ajuda.",
  },
  {
    dominio: "Autonomia", domKey: "autonomia", peso: 1.0, idadeMin: 2,
    escala: ESCALA_POS,
    texto: n => `${n} costuma tentar fazer pequenas coisas sozinho?`,
    exemplo: "Pegar objetos, guardar brinquedos, comer sozinho.",
  },
  {
    dominio: "Imitação", domKey: "social", peso: 0.8, idadeMin: 1,
    escala: ESCALA_POS,
    texto: n => `${n} gosta de imitar coisas que você faz?`,
    exemplo: "Bater palmas, fazer gestos, copiar brincadeiras.",
  },
  {
    dominio: "Motivação", domKey: "motivacao", peso: 1.0, idadeMin: 1,
    escala: ESCALA_POS,
    texto: n => `${n} demonstra curiosidade por novas atividades ou brinquedos?`,
    exemplo: "Se aproxima, quer explorar, faz perguntas.",
  },
  {
    dominio: "Engajamento Social", domKey: "social", peso: 0.8, idadeMin: 1,
    escala: ESCALA_POS,
    texto: n => `${n} gosta de brincar com você ou outras pessoas?`,
    exemplo: "Procura interação, ri junto, convida para brincar.",
  },
  {
    dominio: "Percepção dos pais", domKey: "motivacao", peso: 0.5, tipo: "escolha",
    texto: () => "Qual dessas situações se parece mais com o seu dia a dia?",
    exemplo: "",
    opcoes: [
      { texto: "Meu filho aprende coisas novas com facilidade", valor: 4 },
      { texto: "Algumas habilidades parecem um pouco mais difíceis", valor: 3 },
      { texto: "Tenho dúvidas sobre o desenvolvimento dele", valor: 2 },
      { texto: "Estou buscando formas de estimulá-lo melhor", valor: 1 },
    ],
  },
  {
    dominio: "Rotina · Telas", domKey: "atencao", peso: 0.6, tipo: "escolha",
    texto: n => `Quanto tempo por dia ${n} passa em telas?`,
    exemplo: "",
    opcoes: [
      { texto: "Menos de 30 minutos", valor: 4 },
      { texto: "30 a 60 minutos",     valor: 3 },
      { texto: "1 a 2 horas",         valor: 2 },
      { texto: "2 a 3 horas",         valor: 1 },
      { texto: "Mais de 3 horas",     valor: 0 },
    ],
  },
];

// ─── CÁLCULO DE SCORE COM AJUSTE POR IDADE ────────────────
function calcularScores(
  respostas: Record<number, number>,
  idade: number
): Record<DomKey, number> {
  const somas: Record<DomKey, number> = {
    comunicacao: 0, social: 0, atencao: 0, regulacao: 0,
    brincadeira: 0, flexibilidade: 0, autonomia: 0, motivacao: 0,
  };
  const pesos: Record<DomKey, number> = { ...somas };

  PERGUNTAS.forEach((p, i) => {
    const val = respostas[i];
    if (val === undefined) return;
    // Ajuste dinâmico: perguntas com idadeMin têm peso maior para crianças mais velhas
    const ajusteIdade = p.idadeMin
      ? 1 + Math.min((idade - p.idadeMin) * 0.08, 0.4)
      : 1;
    const pesoFinal = p.peso * ajusteIdade;
    somas[p.domKey] += val * pesoFinal;
    pesos[p.domKey] += 4 * pesoFinal;
  });

  const scores = {} as Record<DomKey, number>;
  (Object.keys(somas) as DomKey[]).forEach(k => {
    scores[k] = pesos[k] > 0 ? Math.round((somas[k] / pesos[k]) * 100) : 50;
  });
  return scores;
}

// ─── ESTILOS COMPARTILHADOS ───────────────────────────────
const S = {
  bg: {
    minHeight: "100vh",
    background: "radial-gradient(ellipse 80% 60% at 20% 10%, rgba(122,224,64,.10) 0%, transparent 55%), radial-gradient(ellipse 60% 70% at 80% 90%, rgba(43,191,164,.13) 0%, transparent 55%), linear-gradient(160deg,#e8f8ff 0%,#f0fdfb 35%,#edfff8 65%,#ddf4ff 100%)",
    fontFamily: "var(--font-sans)",
    color: "#1E3A5F",
  } as React.CSSProperties,
  card: {
    background: "rgba(255,255,255,0.84)",
    backdropFilter: "blur(14px)",
    borderRadius: 24,
    border: "1px solid rgba(43,191,164,.18)",
    boxShadow: "0 4px 28px rgba(43,191,164,.07)",
    padding: "36px",
    width: "100%",
    maxWidth: 600,
  } as React.CSSProperties,
  input: {
    width: "100%",
    padding: "13px 16px",
    border: "2px solid rgba(43,191,164,.2)",
    borderRadius: 14,
    fontFamily: "var(--font-sans)",
    fontSize: "1rem",
    color: "#1E3A5F",
    background: "#f7fdff",
    outline: "none",
    transition: "border-color .2s",
    boxSizing: "border-box" as const,
  } as React.CSSProperties,
  btnPrimary: {
    background: "linear-gradient(135deg,#2BBFA4,#7AE040)",
    border: "none",
    borderRadius: 50,
    color: "white",
    fontFamily: "var(--font-sans)",
    fontWeight: 800,
    fontSize: ".95rem",
    padding: "14px 32px",
    cursor: "pointer",
    boxShadow: "0 4px 18px rgba(43,191,164,.35)",
    transition: "all .25s",
  } as React.CSSProperties,
};

// ─── COMPONENTE PRINCIPAL ────────────────────────────────
export default function AvaliacaoPage() {
  const router = useRouter();
  const [fase, setFase] = useState<"intro"|"perguntas"|"loading">("intro");
  const [nomeCrianca, setNomeCrianca]       = useState("");
  const [idadeCrianca, setIdadeCrianca]     = useState("");
  const [nomeResp, setNomeResp]             = useState("");
  const [emailResp, setEmailResp]           = useState("");
  const [pergAtual, setPergAtual]           = useState(0);
  const [respostas, setRespostas]           = useState<Record<number, number>>({});
  const [progresso, setProgresso]           = useState(0);

  const total = PERGUNTAS.length;
  const perg  = PERGUNTAS[pergAtual];
  const opcoes = perg?.tipo === "escolha" ? perg.opcoes! : perg?.escala ?? ESCALA_POS;
  const pct   = fase === "intro" ? 0 : Math.round((pergAtual / total) * 100);

  // ── INTRO ────────────────────────────────────────────────
  function comecar() {
    if (!nomeCrianca.trim()) { alert("Por favor, informe o nome da criança."); return; }
    if (!idadeCrianca)       { alert("Por favor, selecione a idade."); return; }
    setFase("perguntas");
  }

  // ── REGISTRAR RESPOSTA ───────────────────────────────────
  function responder(valor: number) {
    const novas = { ...respostas, [pergAtual]: valor };
    setRespostas(novas);
    if (pergAtual < total - 1) {
      setPergAtual(i => i + 1);
    } else {
      irParaResultado(novas);
    }
  }

  // ── VOLTAR ───────────────────────────────────────────────
  function voltar() {
    if (pergAtual === 0) { setFase("intro"); return; }
    setPergAtual(i => i - 1);
  }

  // ── RESULTADO ────────────────────────────────────────────
  async function irParaResultado(resps: Record<number, number>) {
    setFase("loading");
    const idade = parseInt(idadeCrianca);
    const scores = calcularScores(resps, idade);

    // Salvar no sessionStorage para a página de resultado
    sessionStorage.setItem("fracta_nome",   nomeCrianca);
    sessionStorage.setItem("fracta_idade",  idadeCrianca);
    sessionStorage.setItem("fracta_resp",   nomeResp || "você");
    sessionStorage.setItem("fracta_email",  emailResp);
    sessionStorage.setItem("fracta_radar",  JSON.stringify(scores));
    sessionStorage.setItem("fracta_resps",  JSON.stringify(resps));

    // Tenta enviar ao backend
    try {
      const res = await fetch("https://fractal-behavior-production.up.railway.app/api/avaliacao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nomeCrianca, idadeCrianca, nomeResponsavel: nomeResp,
          emailResponsavel: emailResp, respostas: resps,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.avaliacao_id) sessionStorage.setItem("fracta_avaliacao_id", data.avaliacao_id);
        if (data.radar) sessionStorage.setItem("fracta_radar", JSON.stringify(data.radar));
      }
    } catch (_) { /* usa scores locais */ }

    setTimeout(() => router.push("/captura/resultado"), 2800);
  }

  // ─── RENDER ──────────────────────────────────────────────
  return (
    <div style={S.bg}>

      {/* NAV */}
      <nav style={{ background: "rgba(255,255,255,.75)", backdropFilter: "blur(16px)", borderBottom: "1px solid rgba(43,191,164,.15)", padding: "0 20px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 50 }}>
        <Link href="/care" style={{ textDecoration: "none" }}>
          <FractaLogo logo="care" height={30} alt="FractaCare" />
        </Link>
        <span style={{ fontSize: ".75rem", color: "#8a9ab8" }}>
          {fase === "intro" ? "Identificação" : fase === "perguntas" ? `Pergunta ${pergAtual + 1} de ${total}` : "Gerando resultado..."}
        </span>
        <span style={{ fontSize: ".72rem", color: "#8a9ab8" }}>Gratuito · Sem cartão</span>
      </nav>

      {/* BARRA DE PROGRESSO */}
      <div style={{ height: 4, background: "rgba(43,191,164,.15)" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: "linear-gradient(90deg,#2BBFA4,#7AE040)", borderRadius: "0 2px 2px 0", transition: "width .5s ease" }} />
      </div>

      {/* CONTEÚDO */}
      <div style={{ minHeight: "calc(100vh - 60px)", display: "flex", flexDirection: "column", alignItems: "center", padding: "40px 18px 80px" }}>

        {/* FASE INDICATOR */}
        {fase === "perguntas" && (
          <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 28 }}>
            {["Identificação", "Perguntas", "Resultado"].map((label, i) => {
              const step = i + 1;
              const current = 2; // sempre na fase perguntas
              const done = step < current;
              const active = step === current;
              return (
                <div key={label} style={{ display: "flex", alignItems: "center" }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: "50%",
                      background: done ? "linear-gradient(135deg,#2BBFA4,#7AE040)" : active ? "#1E3A5F" : "rgba(43,191,164,.12)",
                      color: done || active ? "white" : "#8a9ab8",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: ".68rem", fontWeight: 800,
                      boxShadow: active ? "0 0 0 3px rgba(43,191,164,.25)" : "none",
                    }}>{done ? "✓" : step}</div>
                    <span style={{ fontSize: ".6rem", color: active ? "#2BBFA4" : "#8a9ab8", marginTop: 4, fontWeight: active ? 700 : 400 }}>{label}</span>
                  </div>
                  {i < 2 && <div style={{ width: 48, height: 2, background: done ? "#2BBFA4" : "rgba(43,191,164,.2)", margin: "0 4px 16px" }} />}
                </div>
              );
            })}
          </div>
        )}

        {/* ── INTRO ── */}
        {fase === "intro" && (
          <div style={S.card}>
            <div style={{ textAlign: "center", marginBottom: 28 }}>
              <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>👶</div>
              <h2 style={{ fontSize: "1.4rem", fontWeight: 800, color: "#1E3A5F", marginBottom: 8 }}>Vamos começar!</h2>
              <p style={{ fontSize: ".88rem", color: "#5a7a9a", lineHeight: 1.65 }}>
                Conte um pouco sobre seu filho para personalizar a avaliação. Leva menos de 2 minutos.
              </p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: ".82rem", fontWeight: 700, color: "#1E3A5F", marginBottom: 6 }}>Nome da criança</label>
                <input style={S.input} placeholder="Ex: Lucas, Sofia, Pedro..." value={nomeCrianca} onChange={e => setNomeCrianca(e.target.value)}
                  onFocus={e => (e.target.style.borderColor = "#2BBFA4")}
                  onBlur={e => (e.target.style.borderColor = "rgba(43,191,164,.2)")}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: ".82rem", fontWeight: 700, color: "#1E3A5F", marginBottom: 6 }}>Idade</label>
                <select style={{ ...S.input, appearance: "none", cursor: "pointer" }} value={idadeCrianca} onChange={e => setIdadeCrianca(e.target.value)}>
                  <option value="">Selecione a idade</option>
                  {Array.from({ length: 8 }, (_, i) => i + 1).map(a => (
                    <option key={a} value={a}>{a} ano{a > 1 ? "s" : ""}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: ".82rem", fontWeight: 700, color: "#1E3A5F", marginBottom: 6 }}>Seu nome (responsável)</label>
                <input style={S.input} placeholder="Ex: Ana, Ricardo..." value={nomeResp} onChange={e => setNomeResp(e.target.value)}
                  onFocus={e => (e.target.style.borderColor = "#2BBFA4")}
                  onBlur={e => (e.target.style.borderColor = "rgba(43,191,164,.2)")}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: ".82rem", fontWeight: 700, color: "#1E3A5F", marginBottom: 6 }}>Seu e-mail</label>
                <input style={S.input} type="email" placeholder="seu@email.com" value={emailResp} onChange={e => setEmailResp(e.target.value)}
                  onFocus={e => (e.target.style.borderColor = "#2BBFA4")}
                  onBlur={e => (e.target.style.borderColor = "rgba(43,191,164,.2)")}
                />
              </div>
              <button style={{ ...S.btnPrimary, marginTop: 8 }} onClick={comecar}>
                Começar avaliação →
              </button>
            </div>
          </div>
        )}

        {/* ── PERGUNTAS ── */}
        {fase === "perguntas" && perg && (
          <div style={S.card}>
            {/* Tag do domínio */}
            <div style={{ display: "inline-block", background: "rgba(43,191,164,.1)", color: "#2BBFA4", fontSize: ".65rem", fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", padding: "4px 12px", borderRadius: 50, marginBottom: 16 }}>
              {perg.dominio}
            </div>

            {/* Texto da pergunta com nome em destaque */}
            <div style={{ fontSize: "1.15rem", fontWeight: 800, color: "#1E3A5F", lineHeight: 1.35, marginBottom: 8 }}>
              {perg.texto(nomeCrianca).split(nomeCrianca).map((part, i, arr) =>
                i < arr.length - 1
                  ? <span key={i}>{part}<span style={{ color: "#2BBFA4" }}>{nomeCrianca}</span></span>
                  : <span key={i}>{part}</span>
              )}
            </div>

            {perg.exemplo && (
              <p style={{ fontSize: ".82rem", color: "#8a9ab8", marginBottom: 24, lineHeight: 1.55 }}>
                Exemplo: {perg.exemplo}
              </p>
            )}

            {/* Opções */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {opcoes.map(op => (
                <button key={op.texto} onClick={() => responder(op.valor)} style={{
                  display: "flex", alignItems: "center", gap: 14,
                  padding: "15px 18px", border: "2px solid rgba(43,191,164,.15)",
                  borderRadius: 14, background: "white", cursor: "pointer",
                  fontFamily: "var(--font-sans)", fontWeight: 700, fontSize: ".92rem",
                  color: "#1E3A5F", textAlign: "left", transition: "all .2s",
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "#2BBFA4"; e.currentTarget.style.background = "rgba(43,191,164,.06)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(43,191,164,.15)"; e.currentTarget.style.background = "white"; }}
                >
                  <div style={{ width: 20, height: 20, borderRadius: "50%", border: "2px solid rgba(43,191,164,.3)", flexShrink: 0 }} />
                  {op.texto}
                </button>
              ))}
            </div>

            {/* Nav */}
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 28 }}>
              <button onClick={voltar} style={{ background: "none", border: "none", cursor: "pointer", color: "#8a9ab8", fontFamily: "var(--font-sans)", fontWeight: 600, fontSize: ".88rem", padding: "10px 14px", borderRadius: 10 }}>
                ← Voltar
              </button>
              <span style={{ fontSize: ".78rem", color: "#8a9ab8", alignSelf: "center" }}>
                {pergAtual + 1} / {total}
              </span>
            </div>
          </div>
        )}

        {/* ── LOADING ── */}
        {fase === "loading" && (
          <div style={{ ...S.card, textAlign: "center" }}>
            <div style={{ fontSize: "3rem", marginBottom: 20 }}>🧠</div>
            <h3 style={{ fontSize: "1.3rem", fontWeight: 800, color: "#1E3A5F", marginBottom: 10 }}>
              Analisando as habilidades de {nomeCrianca}...
            </h3>
            <p style={{ fontSize: ".88rem", color: "#8a9ab8", marginBottom: 28, lineHeight: 1.65 }}>
              O FractaEngine está mapeando as habilidades emergentes e gerando o radar personalizado.
            </p>
            <div style={{ height: 6, background: "rgba(43,191,164,.15)", borderRadius: 50, overflow: "hidden", maxWidth: 300, margin: "0 auto" }}>
              <div style={{ height: "100%", background: "linear-gradient(90deg,#2BBFA4,#7AE040)", borderRadius: 50, animation: "loadbar 2.5s ease forwards" }} />
            </div>
            <style>{`@keyframes loadbar { from{width:0%} to{width:100%} }`}</style>
          </div>
        )}

        {/* Garantia */}
        {fase !== "loading" && (
          <p style={{ fontSize: ".72rem", color: "#8a9ab8", marginTop: 18, textAlign: "center" }}>
            🔒 Suas respostas são confidenciais e usadas apenas para personalizar a experiência do seu filho.
          </p>
        )}
      </div>
    </div>
  );
}
