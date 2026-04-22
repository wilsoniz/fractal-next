"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FractaLogo } from "@/components/fracta/FractaLogo";
import { FractalTriangle } from "@/components/fracta/FractalTriangle";
import { signUp, signIn, supabase } from "@/lib/supabase";

type DomKey = "comunicacao"|"social"|"atencao"|"regulacao"|"brincadeira"|"flexibilidade"|"autonomia"|"motivacao";

const DOMINIOS_CONFIG: { key: DomKey; nome: string; icon: string; cor: string }[] = [
  { key: "comunicacao",   nome: "Comunicação",    icon: "💬", cor: "#2BBFA4" },
  { key: "social",        nome: "Social",          icon: "🤝", cor: "#4FC3D8" },
  { key: "atencao",       nome: "Atenção",         icon: "🎯", cor: "#7AE040" },
  { key: "regulacao",     nome: "Regulação",       icon: "💙", cor: "#2A7BA8" },
  { key: "brincadeira",   nome: "Brincadeira",     icon: "🎨", cor: "#2BBFA4" },
  { key: "flexibilidade", nome: "Flexibilidade",   icon: "🔄", cor: "#4FC3D8" },
  { key: "autonomia",     nome: "Autonomia",       icon: "⭐", cor: "#7AE040" },
  { key: "motivacao",     nome: "Motivação",       icon: "🚀", cor: "#2A7BA8" },
];

const ATIVIDADES: { nome: string; domKey: DomKey; objetivo: string; tempo: string; tipo: string; cor: string; icon: string }[] = [
  { nome: "Pedir o que quer",              domKey: "comunicacao",   objetivo: "Iniciar comunicação funcional.", tempo: "3 min", tipo: "Principal",      cor: "#2BBFA4", icon: "💬" },
  { nome: "Mostrar objetos interessantes", domKey: "social",        objetivo: "Desenvolver atenção compartilhada.", tempo: "5 min", tipo: "Complementar", cor: "#4FC3D8", icon: "👀" },
  { nome: "Aumentar tempo em atividade",   domKey: "atencao",       objetivo: "Ampliar atenção sustentada.", tempo: "5 min", tipo: "Principal",      cor: "#7AE040", icon: "⏱️" },
  { nome: "Esperar alguns segundos",       domKey: "regulacao",     objetivo: "Tolerar pequenas esperas.", tempo: "3 min", tipo: "Vitória rápida", cor: "#2A7BA8", icon: "⏸️" },
  { nome: "Explorar brinquedos",           domKey: "brincadeira",   objetivo: "Ampliar brincadeira funcional.", tempo: "5 min", tipo: "Complementar",  cor: "#2BBFA4", icon: "🧩" },
  { nome: "Aceitar mudança de atividade",  domKey: "flexibilidade", objetivo: "Reduzir reação a mudanças.", tempo: "3 min", tipo: "Principal",      cor: "#4FC3D8", icon: "🔄" },
  { nome: "Guardar brinquedos",            domKey: "autonomia",     objetivo: "Desenvolver iniciativa cotidiana.", tempo: "3 min", tipo: "Vitória rápida", cor: "#7AE040", icon: "🗂️" },
  { nome: "Escolher atividade",            domKey: "motivacao",     objetivo: "Estimular curiosidade.", tempo: "2 min", tipo: "Complementar",  cor: "#2A7BA8", icon: "🎯" },
];

function RadarSVG({ scores }: { scores: Record<DomKey, number> }) {
  const cx = 180, cy = 180, maxR = 130, n = 8;
  const step = (2 * Math.PI) / n;
  const start = -Math.PI / 2;
  function pt(i: number, r: number): [number, number] {
    const a = start + i * step;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  }
  function pStr(pts: [number, number][]) { return pts.map(p => p.join(",")).join(" "); }
  const vals = DOMINIOS_CONFIG.map(d => scores[d.key] ?? 50);
  const valPts = vals.map((v, i) => pt(i, (v / 100) * maxR));
  return (
    <svg viewBox="0 0 360 360" width="280" height="280" style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id="rg-res" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#2BBFA4" stopOpacity={0.3} />
          <stop offset="100%" stopColor="#7AE040" stopOpacity={0.15} />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75, 1].map(f => (
        <polygon key={f} points={pStr(Array.from({ length: n }, (_, i) => pt(i, maxR * f)))}
          fill="none" stroke="rgba(43,191,164,0.15)" strokeWidth="1" />
      ))}
      {Array.from({ length: n }, (_, i) => {
        const [x2, y2] = pt(i, maxR);
        return <line key={i} x1={cx} y1={cy} x2={x2} y2={y2} stroke="rgba(43,191,164,0.15)" strokeWidth="1" />;
      })}
      <polygon points={pStr(valPts)} fill="url(#rg-res)" stroke="#2BBFA4" strokeWidth="2.5" />
      {vals.map((v, i) => {
        const d = DOMINIOS_CONFIG[i];
        const [x, y] = pt(i, (v / 100) * maxR);
        const [lx, ly] = pt(i, maxR + 26);
        const [px, py] = pt(i, (v / 100) * maxR - 16);
        return (
          <g key={d.key}>
            <circle cx={x} cy={y} r={6} fill={d.cor} stroke="white" strokeWidth="2.5" />
            <text x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" fontSize="10" fontFamily="var(--font-sans)" fontWeight="700" fill="#1E3A5F">{d.nome}</text>
            <text x={px} y={py} textAnchor="middle" dominantBaseline="middle" fontSize="8" fontFamily="var(--font-sans)" fontWeight="800" fill={d.cor}>{v}%</text>
          </g>
        );
      })}
    </svg>
  );
}

function gerarInterpretacao(scores: Record<DomKey, number>, nome: string): string {
  const sorted = DOMINIOS_CONFIG.map(d => ({ ...d, val: scores[d.key] ?? 50 })).sort((a, b) => a.val - b.val);
  const menores = sorted.slice(0, 2).map(d => d.nome.toLowerCase());
  const maiores = sorted.slice(-2).reverse().map(d => d.nome.toLowerCase());
  return `${nome} apresenta boas bases em ${maiores.join(" e ")} — ótimos pontos de apoio para o desenvolvimento. Algumas habilidades de ${menores.join(" e ")} parecem prontas para crescer ainda mais com pequenas práticas no dia a dia.`;
}


function calcularProgramas(
  scores: Record<string, number>,
  respostas: Record<string, number>,
  idadeMeses: number
): {titulo:string;dominio:string;prioridade:string;descricao:string;estrategia:string}[] {
  const progs: {titulo:string;dominio:string;prioridade:string;descricao:string;estrategia:string}[] = [];

  if (scores.comunicacao < 55) {
    if (idadeMeses < 24 || (respostas["com_mando_basico"] ?? 4) <= 1) {
      progs.push({ titulo:"Ensino de Mando", dominio:"Comunicação", prioridade:"alta",
        descricao:"Ensinar formas funcionais de pedir — gestos, sons ou palavras — para objetos e atividades preferidas.",
        estrategia:"Ofereça itens desejados apenas após uma tentativa comunicativa. Modele e reforce qualquer aproximação." });
    }
    if (idadeMeses >= 18 && (respostas["com_tato_objetos"] ?? 4) <= 2) {
      progs.push({ titulo:"Nomeação de Objetos", dominio:"Comunicação", prioridade:"alta",
        descricao:"Expandir vocabulário funcional — nomear objetos, pessoas e ações do cotidiano.",
        estrategia:"Comece com objetos de alta preferência. Use contextos naturais e reforce a nomeação espontânea." });
    }
    if ((respostas["com_atencao_conjunta"] ?? 4) <= 2) {
      progs.push({ titulo:"Atenção Conjunta", dominio:"Comunicação", prioridade:"alta",
        descricao:"Desenvolver o apontar para compartilhar e o olhar alternado entre objeto e pessoa.",
        estrategia:"Siga o interesse da criança, pause para criar expectativa e reforce o olhar alternado." });
    }
  }

  if (scores.social < 55) {
    if ((respostas["soc_imitacao"] ?? 4) <= 2) {
      progs.push({ titulo:"Imitação Motora e Vocal", dominio:"Social", prioridade:"alta",
        descricao:"Desenvolver imitação como base para aprendizagem social e linguagem.",
        estrategia:"Imite a criança primeiro (imitação mútua), depois introduza novos modelos com reforço." });
    }
    if (idadeMeses >= 30 && (respostas["soc_jogo_paralelo"] ?? 4) <= 2) {
      progs.push({ titulo:"Jogo Social", dominio:"Social", prioridade:"media",
        descricao:"Ampliar tolerância e interesse pela presença de outras pessoas durante brincadeiras.",
        estrategia:"Aproximação gradual, atividades de alta preferência compartilhadas, reforço da proximidade." });
    }
  }

  if (scores.regulacao < 50) {
    progs.push({ titulo:"Regulação Emocional", dominio:"Regulação", prioridade:"alta",
      descricao:"Desenvolver tolerância à frustração e espera em situações do dia a dia.",
      estrategia:"Use antecipação verbal, ofereça escolhas controladas e ensine comunicação alternativa à crise." });
  }

  if (scores.atencao < 50 && idadeMeses >= 30) {
    progs.push({ titulo:"Atenção Sustentada", dominio:"Atenção", prioridade:"media",
      descricao:"Aumentar gradualmente o tempo de engajamento em atividades.",
      estrategia:"Comece com atividades de alta preferência e aumente a duração progressivamente." });
  }

  if (scores.autonomia < 50 && idadeMeses >= 24) {
    progs.push({ titulo:"Habilidades de Autocuidado", dominio:"Autonomia", prioridade:"media",
      descricao:"Desenvolver independência nas rotinas de higiene, alimentação e organização.",
      estrategia:"Divida as tarefas em etapas pequenas e reforce as tentativas independentes." });
  }

  return progs.slice(0, 4);
}

function calcularComportamentos(respostas: Record<string, number>): {tipo:string;nivel:string;descricao:string;estrategia:string;alerta:boolean}[] {
  const comps: {tipo:string;nivel:string;descricao:string;estrategia:string;alerta:boolean}[] = [];

  const agressao = respostas["cp_agressao"] ?? 4;
  if (agressao <= 2) comps.push({
    tipo:"Agressão", nivel: agressao === 0 ? "severo" : agressao === 1 ? "moderado" : "leve",
    descricao:"Comportamentos de bater, morder ou agredir outras pessoas.",
    estrategia:"Identifique quando e por que acontece. Ensine uma forma diferente de comunicar a mesma necessidade.",
    alerta: agressao <= 1 });

  const autolesao = respostas["cp_autolesao"] ?? 4;
  if (autolesao <= 2) comps.push({
    tipo:"Autolesão", nivel: autolesao === 0 ? "severo" : autolesao === 1 ? "moderado" : "leve",
    descricao:"Comportamentos de bater a cabeça, morder a si mesmo ou se machucar.",
    estrategia:"Este comportamento precisa de avaliação por um profissional ABA o quanto antes.",
    alerta: true });

  const rigidez = respostas["cp_rigidez"] ?? 4;
  if (rigidez <= 1) comps.push({
    tipo:"Rigidez e rituais", nivel: rigidez === 0 ? "severo" : "moderado",
    descricao:"Insistência em rotinas rígidas que impedem o funcionamento do dia a dia.",
    estrategia:"Introduza variações pequenas e gradualmente. Antecipe mudanças com clareza.",
    alerta: rigidez === 0 });

  const movimentos = respostas["cp_movimentos"] ?? 4;
  if (movimentos <= 1) comps.push({
    tipo:"Movimentos repetitivos", nivel: movimentos === 0 ? "severo" : "moderado",
    descricao:"Movimentos repetitivos frequentes que podem interferir na aprendizagem.",
    estrategia:"Enriqueça o ambiente e garanta atividade física adequada ao longo do dia.",
    alerta: false });

  return comps;
}

export default function ResultadoPage() {
  const router = useRouter();
  const [scores,    setScores]    = useState<Record<DomKey, number> | null>(null);
  const [nome,      setNome]      = useState("seu filho");
  const [idade,     setIdade]     = useState("");
  const [nomeResp,  setNomeResp]  = useState("você");
  const [atividades, setAtividades] = useState<typeof ATIVIDADES>([]);
  const [cadNome,   setCadNome]   = useState("");
  const [cadEmail,  setCadEmail]  = useState("");
  const [cadSenha,  setCadSenha]  = useState("");
  const [loading,   setLoading]   = useState(false);
  const [erro,      setErro]      = useState("");
  const [cadastrado, setCadastrado] = useState(false);
  const [programas,  setProgramas]  = useState<{titulo:string;dominio:string;prioridade:string;descricao:string;estrategia:string}[]>([]);
  const [comportamentos, setComportamentos] = useState<{tipo:string;nivel:string;descricao:string;estrategia:string;alerta:boolean}[]>([]);
  const [genero, setGenero] = useState<"M"|"F"|"">("");

  useEffect(() => {
    const r    = sessionStorage.getItem("fracta_radar");
    const n    = sessionStorage.getItem("fracta_nome");
    const i    = sessionStorage.getItem("fracta_idade");
    const resp = sessionStorage.getItem("fracta_resp");
    const em   = sessionStorage.getItem("fracta_email");

    if (!r) { router.push("/captura/avaliacao"); return; }

    const parsed = JSON.parse(r) as Record<DomKey, number>;
    setScores(parsed);
    if (n) setNome(n);
    if (i) setIdade(i);
    if (resp) { setNomeResp(resp); setCadNome(resp); }
    if (em) setCadEmail(em);

    const sorted = DOMINIOS_CONFIG.map(d => ({ ...d, val: parsed[d.key] ?? 50 })).sort((a, b) => a.val - b.val);
    const prioridades = sorted.slice(0, 3).map(d => d.key);
    const selecionadas = prioridades.map(key => ATIVIDADES.find(a => a.domKey === key)).filter(Boolean) as typeof ATIVIDADES;
    setAtividades(selecionadas);

    // Output clínico
    const gen = sessionStorage.getItem("fracta_genero") as "M"|"F"|"" ?? "";
    setGenero(gen);
    const respsRaw = sessionStorage.getItem("fracta_resps");
    const idadeMesesRaw = sessionStorage.getItem("fracta_idade_meses");
    if (respsRaw && idadeMesesRaw) {
      const resps = JSON.parse(respsRaw) as Record<string, number>;
      const idadeMeses = parseInt(idadeMesesRaw);
      setProgramas(calcularProgramas(parsed, resps, idadeMeses));
      setComportamentos(calcularComportamentos(resps));
    }
  }, [router]);

  async function cadastrar() {
    setErro("");
    if (!cadNome.trim())         { setErro("Informe seu nome."); return; }
    if (!cadEmail.includes("@")) { setErro("E-mail inválido."); return; }
    if (cadSenha.length < 6)     { setErro("Senha com mínimo 6 caracteres."); return; }

    setLoading(true);

    // 1. Cria conta no Supabase Auth
    const { data, error } = await signUp(cadEmail, cadSenha, cadNome);
    if (error) {
      if (error.message.includes("already registered")) {
        // Tenta login direto
        const { data: loginData, error: loginErr } = await signIn(cadEmail, cadSenha);
        if (loginErr) { setErro("E-mail já cadastrado. Verifique sua senha."); setLoading(false); return; }
        await finalizarCadastro(loginData.user!.id);
        return;
      }
      setErro(error.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      await finalizarCadastro(data.user.id);
    }
  }

  async function finalizarCadastro(userId: string) {
    // 2. Cria perfil
    await supabase.from("profiles").upsert({ id: userId, nome: cadNome, email: cadEmail });

    // 3. Cria criança
    const idadeNum = parseInt(idade) || 3;
    const anoNasc  = new Date().getFullYear() - idadeNum;

    const { data: criancaData } = await supabase
      .from("criancas")
      .insert({ responsavel_id: userId, nome, data_nascimento: `${anoNasc}-01-01`, idade_anos: idadeNum })
      .select()
      .single();

    // 4. Salva radar
    if (criancaData && scores) {
      await supabase.from("radar_snapshots").insert({
        crianca_id:          criancaData.id,
        score_comunicacao:   scores.comunicacao   ?? null,
        score_social:        scores.social        ?? null,
        score_atencao:       scores.atencao       ?? null,
        score_regulacao:     scores.regulacao     ?? null,
        score_brincadeira:   scores.brincadeira   ?? null,
        score_flexibilidade: scores.flexibilidade ?? null,
        score_autonomia:     scores.autonomia     ?? null,
        score_motivacao:     scores.motivacao     ?? null,
      });

      // 5. Salva avaliação
      const avalId = sessionStorage.getItem("fracta_avaliacao_id");
      if (avalId) {
        await supabase.from("avaliacoes").update({ responsavel_id: userId, crianca_id: criancaData.id, convertido: true }).eq("id", avalId);
      }

      sessionStorage.setItem("fracta_crianca_id", criancaData.id);
    }

    setLoading(false);
    setCadastrado(true);
    setTimeout(() => window.location.href = "/care/dashboard", 1500);
  }

  if (!scores) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-sans)", background: "#f0f8ff" }}>
      <p style={{ color: "#8a9ab8" }}>Carregando resultado...</p>
    </div>
  );

  const bg: React.CSSProperties = {
    minHeight: "100vh",
    background: "radial-gradient(ellipse 80% 60% at 20% 10%, rgba(122,224,64,.10) 0%, transparent 55%), radial-gradient(ellipse 60% 70% at 80% 90%, rgba(43,191,164,.13) 0%, transparent 55%), linear-gradient(160deg,#e8f8ff 0%,#f0fdfb 35%,#edfff8 65%,#ddf4ff 100%)",
    fontFamily: "var(--font-sans)", color: "#1E3A5F",
  };
  const card: React.CSSProperties = {
    background: "rgba(255,255,255,.84)", backdropFilter: "blur(14px)",
    borderRadius: 24, border: "1px solid rgba(43,191,164,.18)",
    boxShadow: "0 4px 28px rgba(43,191,164,.07)",
  };
  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "12px 15px",
    border: "2px solid rgba(43,191,164,.2)", borderRadius: 12,
    fontFamily: "var(--font-sans)", fontSize: ".9rem", color: "#1E3A5F",
    background: "#f7fdff", outline: "none", boxSizing: "border-box",
  };
  const tipoColors: Record<string, { bg: string; color: string }> = {
    "Principal":      { bg: "rgba(43,191,164,.15)",  color: "#1a7a6a" },
    "Complementar":   { bg: "rgba(79,195,216,.15)",  color: "#1a5a6a" },
    "Vitória rápida": { bg: "rgba(122,224,64,.15)",  color: "#3a6a1a" },
  };

  return (
    <div style={bg}>
      {/* NAV */}
      <nav style={{ background: "rgba(255,255,255,.75)", backdropFilter: "blur(16px)", borderBottom: "1px solid rgba(43,191,164,.15)", padding: "0 20px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 50 }}>
        <Link href="/care" style={{ textDecoration: "none" }}>
          <FractaLogo logo="care" height={30} alt="FractaCare" />
        </Link>
        <span style={{ fontSize: ".75rem", color: "#8a9ab8" }}>Resultado da avaliação</span>
        <span style={{ fontSize: ".72rem", color: "#8a9ab8" }}>{nome}{idade ? ` · ${idade} ano${Number(idade) > 1 ? "s" : ""}` : ""}</span>
      </nav>

      <div style={{ maxWidth: 680, margin: "0 auto", padding: "28px 18px 80px", display: "flex", flexDirection: "column", gap: 18 }}>

        {/* CARD RADAR */}
        <div style={{ ...card, overflow: "hidden" }}>
          <div style={{ background: "linear-gradient(135deg,#1E3A5F,#2A7BA8)", padding: "24px 28px", color: "white", textAlign: "center" }}>
            <div style={{ fontSize: ".78rem", opacity: .75, marginBottom: 4 }}>Olá, {nomeResp}!</div>
            <h1 style={{ fontSize: "1.4rem", fontWeight: 800, marginBottom: 4 }}>Mapa de habilidades de {nome}</h1>
            <div style={{ fontSize: ".8rem", opacity: .7 }}>{nome}{idade ? ` · ${idade} ano${Number(idade)>1?"s":""}` : ""} · Resultado personalizado</div>
          </div>
          <div style={{ padding: "24px 28px" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 24 }}>
              <div style={{ fontSize: ".6rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", color: "#8a9ab8", marginBottom: 8 }}>Fracta Development Map — {nome}</div>
              <RadarSVG scores={scores} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
              {DOMINIOS_CONFIG.map(d => (
                <div key={d.key} style={{ background: "#f7fdff", border: "1px solid rgba(43,191,164,.1)", borderRadius: 12, padding: "10px 12px", display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: "1rem" }}>{d.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: ".74rem", fontWeight: 700, color: "#1E3A5F", marginBottom: 3 }}>{d.nome}</div>
                    <div style={{ height: 4, background: "rgba(43,191,164,.12)", borderRadius: 50, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${scores[d.key] ?? 50}%`, background: d.cor, borderRadius: 50 }} />
                    </div>
                  </div>
                  <div style={{ fontSize: ".78rem", fontWeight: 800, color: "#1E3A5F", minWidth: 32, textAlign: "right" }}>{scores[d.key] ?? 50}%</div>
                </div>
              ))}
            </div>
            <div style={{ background: "linear-gradient(145deg,#f0faff,#e8f9f4)", border: "1px solid rgba(43,191,164,.2)", borderLeft: "4px solid #2BBFA4", borderRadius: 14, padding: "16px 18px" }}>
              <div style={{ fontSize: ".65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: "#2BBFA4", marginBottom: 6 }}>💡 O que isso significa</div>
              <p style={{ fontSize: ".86rem", color: "#3a5a7a", lineHeight: 1.7, margin: 0 }}>{gerarInterpretacao(scores, nome)}</p>
            </div>
          </div>
        </div>

        {/* ATIVIDADES */}
        <div style={{ ...card, padding: "22px 24px" }}>
          <div style={{ fontSize: ".62rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", color: "#2BBFA4", marginBottom: 6 }}>🎯 Primeiros passos sugeridos</div>
          <h2 style={{ fontSize: "1rem", fontWeight: 800, color: "#1E3A5F", marginBottom: 14 }}>Atividades personalizadas para {nome}</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {atividades.map(a => {
              const tc = tipoColors[a.tipo] || tipoColors["Complementar"];
              return (
                <div key={a.nome} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "14px", background: "#f7fdff", border: "1px solid rgba(43,191,164,.1)", borderRadius: 14 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 11, background: `${a.cor}22`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem", flexShrink: 0 }}>{a.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: ".86rem", fontWeight: 800, color: "#1E3A5F", marginBottom: 2 }}>{a.nome}</div>
                    <div style={{ fontSize: ".72rem", color: "#8a9ab8", marginBottom: 4 }}>{a.domKey.charAt(0).toUpperCase()+a.domKey.slice(1)} · {a.tempo}</div>
                    <div style={{ fontSize: ".76rem", color: "#5a7a9a", lineHeight: 1.5 }}>{a.objetivo}</div>
                  </div>
                  <span style={{ fontSize: ".62rem", fontWeight: 700, padding: "3px 9px", borderRadius: 50, background: tc.bg, color: tc.color, flexShrink: 0 }}>{a.tipo}</span>
                </div>
              );
            })}
          </div>
        </div>


        {/* PROGRAMAS DE ENSINO */}
        {programas.length > 0 && (
          <div style={{ ...card, padding: "22px 24px" }}>
            <div style={{ fontSize: ".62rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", color: "#2BBFA4", marginBottom: 6 }}>📋 Habilidades prioritárias</div>
            <h2 style={{ fontSize: "1rem", fontWeight: 800, color: "#1E3A5F", marginBottom: 4 }}>O que trabalhar com {nome}</h2>
            <p style={{ fontSize: ".78rem", color: "#8a9ab8", marginBottom: 16, lineHeight: 1.6 }}>
              Com base na avaliação, estas são as habilidades com maior potencial de avanço agora.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {programas.map((p, i) => (
                <div key={p.titulo} style={{
                  padding: "16px", borderRadius: 14,
                  background: i === 0 ? "rgba(43,191,164,.06)" : "#f8faff",
                  border: `1px solid ${i === 0 ? "rgba(43,191,164,.25)" : "rgba(0,0,0,.06)"}`,
                  borderLeft: `3px solid ${i === 0 ? "#2BBFA4" : "#4FC3D8"}`,
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                    <div style={{ fontSize: ".88rem", fontWeight: 800, color: "#1E3A5F" }}>{p.titulo}</div>
                    <span style={{
                      fontSize: ".6rem", fontWeight: 700, padding: "2px 8px", borderRadius: 50, flexShrink: 0, marginLeft: 8,
                      background: p.prioridade === "alta" ? "rgba(43,191,164,.15)" : "rgba(79,195,216,.12)",
                      color: p.prioridade === "alta" ? "#1a7a6a" : "#2A7BA8",
                    }}>{p.prioridade === "alta" ? "Prioritário" : "Importante"}</span>
                  </div>
                  <div style={{ fontSize: ".68rem", fontWeight: 600, color: "#2BBFA4", marginBottom: 6 }}>{p.dominio}</div>
                  <p style={{ fontSize: ".78rem", color: "#5a7a9a", lineHeight: 1.65, margin: "0 0 8px" }}>{p.descricao}</p>
                  <div style={{ background: "rgba(43,191,164,.06)", borderRadius: 8, padding: "8px 12px" }}>
                    <div style={{ fontSize: ".65rem", fontWeight: 700, color: "#2BBFA4", marginBottom: 3 }}>💡 Como começar</div>
                    <p style={{ fontSize: ".75rem", color: "#3a5a7a", lineHeight: 1.6, margin: 0 }}>{p.estrategia}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* COMPORTAMENTOS PROBLEMA */}
        {comportamentos.length > 0 && (
          <div style={{ ...card, padding: "22px 24px" }}>
            <div style={{ fontSize: ".62rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", color: "#E05A4B", marginBottom: 6 }}>⚠️ Atenção especial</div>
            <h2 style={{ fontSize: "1rem", fontWeight: 800, color: "#1E3A5F", marginBottom: 4 }}>Comportamentos que merecem cuidado</h2>
            <p style={{ fontSize: ".78rem", color: "#8a9ab8", marginBottom: 16, lineHeight: 1.6 }}>
              A avaliação identificou alguns comportamentos que precisam de estratégias específicas.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {comportamentos.map(c => (
                <div key={c.tipo} style={{
                  padding: "16px", borderRadius: 14,
                  background: c.alerta ? "rgba(224,90,75,.04)" : "#f8faff",
                  border: `1px solid ${c.alerta ? "rgba(224,90,75,.2)" : "rgba(0,0,0,.06)"}`,
                  borderLeft: `3px solid ${c.alerta ? "#E05A4B" : "#EF9F27"}`,
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                    <div style={{ fontSize: ".88rem", fontWeight: 800, color: "#1E3A5F" }}>{c.tipo}</div>
                    <span style={{
                      fontSize: ".6rem", fontWeight: 700, padding: "2px 8px", borderRadius: 50, flexShrink: 0, marginLeft: 8,
                      background: c.nivel === "severo" ? "rgba(224,90,75,.12)" : c.nivel === "moderado" ? "rgba(239,159,39,.12)" : "rgba(0,0,0,.06)",
                      color: c.nivel === "severo" ? "#E05A4B" : c.nivel === "moderado" ? "#c47d0a" : "#5a7a9a",
                    }}>{c.nivel.charAt(0).toUpperCase()+c.nivel.slice(1)}</span>
                  </div>
                  <p style={{ fontSize: ".78rem", color: "#5a7a9a", lineHeight: 1.65, margin: "0 0 8px" }}>{c.descricao}</p>
                  {c.alerta && (
                    <div style={{ background: "rgba(224,90,75,.06)", border: "1px solid rgba(224,90,75,.15)", borderRadius: 8, padding: "8px 12px", marginBottom: 8 }}>
                      <p style={{ fontSize: ".75rem", color: "#E05A4B", fontWeight: 600, lineHeight: 1.6, margin: 0 }}>
                        🚨 Este comportamento precisa de acompanhamento profissional especializado.
                      </p>
                    </div>
                  )}
                  <div style={{ background: "rgba(239,159,39,.06)", borderRadius: 8, padding: "8px 12px" }}>
                    <div style={{ fontSize: ".65rem", fontWeight: 700, color: "#c47d0a", marginBottom: 3 }}>💡 Estratégia inicial</div>
                    <p style={{ fontSize: ".75rem", color: "#3a5a7a", lineHeight: 1.6, margin: 0 }}>{c.estrategia}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CTA */}
        <div style={{ background: "linear-gradient(135deg,#1E3A5F,#2A7BA8)", borderRadius: 22, padding: "28px", textAlign: "center", color: "white" }}>
          <div style={{ fontSize: "1.8rem", marginBottom: 10 }}>🚀</div>
          <h2 style={{ fontSize: "1.2rem", fontWeight: 800, marginBottom: 8 }}>Acesse o plano completo de {nome}</h2>
          <p style={{ fontSize: ".86rem", opacity: .8, lineHeight: 1.7, marginBottom: 20 }}>
            Crie sua conta gratuita para acessar todas as atividades, acompanhar o progresso e receber orientações personalizadas.
          </p>
          <a href="#cadastro" style={{ display: "inline-block", padding: "12px 28px", borderRadius: 50, background: "white", color: "#1E3A5F", fontWeight: 800, fontSize: ".9rem", textDecoration: "none" }}>
            ✦ Criar conta gratuita
          </a>
          <div style={{ fontSize: ".7rem", opacity: .5, marginTop: 8 }}>Grátis para começar · Sem cartão</div>
        </div>

        {/* CADASTRO */}
        <div id="cadastro" style={{ ...card, padding: "26px 28px" }}>
          <h3 style={{ fontSize: "1.05rem", fontWeight: 800, color: "#1E3A5F", marginBottom: 4 }}>Criar conta no FractaCare</h3>
          <p style={{ fontSize: ".8rem", color: "#8a9ab8", marginBottom: 20 }}>
            Já temos o perfil de {nome}. Finalize o cadastro para acessar seu plano.
          </p>

          {erro && (
            <div style={{ background: "rgba(239,68,68,.08)", border: "1px solid rgba(239,68,68,.2)", borderRadius: 10, padding: "10px 14px", marginBottom: 14, fontSize: ".82rem", color: "#dc2626" }}>
              {erro}
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={{ fontSize: ".76rem", fontWeight: 700, color: "#1E3A5F", display: "block", marginBottom: 5 }}>Seu nome</label>
              <input style={inputStyle} placeholder="Seu nome completo" value={cadNome} onChange={e => setCadNome(e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: ".76rem", fontWeight: 700, color: "#1E3A5F", display: "block", marginBottom: 5 }}>E-mail</label>
              <input style={inputStyle} type="email" placeholder="seu@email.com" value={cadEmail} onChange={e => setCadEmail(e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: ".76rem", fontWeight: 700, color: "#1E3A5F", display: "block", marginBottom: 5 }}>Criar senha</label>
              <input style={inputStyle} type="password" placeholder="Mínimo 6 caracteres" value={cadSenha} onChange={e => setCadSenha(e.target.value)} />
            </div>
            <button onClick={cadastrar} disabled={loading || cadastrado} style={{
              padding: "14px", borderRadius: 50, border: "none",
              background: cadastrado ? "linear-gradient(135deg,#7AE040,#2BBFA4)" : "linear-gradient(135deg,#2BBFA4,#7AE040)",
              color: "white", fontFamily: "var(--font-sans)", fontWeight: 800, fontSize: ".92rem",
              cursor: loading || cadastrado ? "not-allowed" : "pointer",
              boxShadow: "0 4px 18px rgba(43,191,164,.35)",
            }}>
              {cadastrado ? "✓ Conta criada! Entrando..." : loading ? "Criando conta..." : "Começar no FractaCare →"}
            </button>
            <p style={{ fontSize: ".7rem", color: "#8a9ab8", textAlign: "center", margin: 0 }}>
              🔒 Seus dados são protegidos. Nunca compartilhamos informações.
            </p>
          </div>

          <div style={{ textAlign: "center", marginTop: 16 }}>
            <span style={{ fontSize: ".78rem", color: "#8a9ab8" }}>Já tem conta? </span>
            <Link href="/care/login" style={{ fontSize: ".78rem", color: "#2BBFA4", fontWeight: 700, textDecoration: "none" }}>
              Fazer login
            </Link>
          </div>
        </div>

        {/* COMPARTILHAR */}
        <div style={{ textAlign: "center" }}>
          <p style={{ fontSize: ".78rem", color: "#8a9ab8", marginBottom: 10 }}>Conhece outros pais que podem se beneficiar?</p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
            <a href={`https://wa.me/?text=${encodeURIComponent(`Fiz a avaliação gratuita do desenvolvimento de ${nome} no FractaCare! 🧠💚 https://www.fractabehavior.com/captura/avaliacao`)}`}
              target="_blank" rel="noopener noreferrer"
              style={{ padding: "9px 18px", borderRadius: 50, border: "1.5px solid rgba(43,191,164,.2)", background: "rgba(255,255,255,.7)", color: "#1E3A5F", fontSize: ".78rem", fontWeight: 700, textDecoration: "none" }}>
              💬 WhatsApp
            </a>
            <button onClick={() => navigator.clipboard.writeText("https://www.fractabehavior.com/captura/avaliacao")}
              style={{ padding: "9px 18px", borderRadius: 50, border: "1.5px solid rgba(43,191,164,.2)", background: "rgba(255,255,255,.7)", color: "#1E3A5F", fontSize: ".78rem", fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-sans)" }}>
              🔗 Copiar link
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
