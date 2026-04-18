"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FractaLogo } from "@/components/fracta/FractaLogo";
import { FractalTriangle } from "@/components/fracta/FractalTriangle";
import { supabase } from "@/lib/supabase";

// ─── TIPOS ────────────────────────────────────────────────
type Resultado = "acerto" | "ajuda" | "nao";
type Fase = "loading" | "instrucao" | "pratica" | "resultado";

interface PassoPrograma {
  titulo?: string;
  descricao?: string;
  texto?: string;
}

interface Programa {
  id: string;
  codigo: string;
  nome: string;
  dominio: string;
  tipo: string;
  nivel: string;
  objetivo: string;
  subtitulo: string | null;
  materiais: string | null;
  passos: (string | PassoPrograma)[];
  dica: string | null;
  tempo_minutos: number;
}

// Normaliza passo para string independente do formato
function normalizarPasso(passo: string | PassoPrograma): string {
  if (typeof passo === "string") return passo;
  return passo.descricao || passo.titulo || passo.texto || "";
}

interface Plano {
  id: string;
  programa_id: string;
  status: string;
  tipo_plano: string;
  score_inicio: number | null;
}

const COR_RESULTADO: Record<Resultado, string> = {
  acerto: "#2BBFA4",
  ajuda:  "#f59e0b",
  nao:    "#94a3b8",
};
const LABEL_RESULTADO: Record<Resultado, string> = {
  acerto: "Acertou",
  ajuda:  "Com ajuda",
  nao:    "Não respondeu",
};

const TOTAL_TENTATIVAS = 5;

function gerarMensagem(tentativas: (Resultado|null)[], nome: string) {
  const total   = tentativas.filter(Boolean).length;
  const acertos = tentativas.filter(t => t === "acerto").length;
  const pct     = total > 0 ? Math.round((acertos / total) * 100) : 0;

  if (pct >= 80) return {
    titulo: "Excelente!",
    texto: `${nome} teve um desempenho incrível. Continue assim!`,
    engine: `${nome} atingiu <strong>${pct}% de acertos</strong>. O FractaEngine sugere avançar para o próximo nível na próxima sessão.`,
  };
  if (pct >= 60) return {
    titulo: "Muito bem!",
    texto: `Bom progresso. Com mais prática, ${nome} vai dominar esta habilidade em breve.`,
    engine: `${nome} demonstrou <strong>${pct}% de acertos</strong>. Continue com este programa por mais 3 dias antes de aumentar a exigência.`,
  };
  if (pct >= 40) return {
    titulo: "Bom começo!",
    texto: `${nome} está aprendendo. A consistência diária faz toda a diferença.`,
    engine: `${nome} teve <strong>${pct}% de acertos</strong>. Tente em momentos de maior motivação e energia.`,
  };
  return {
    titulo: "Continue tentando!",
    texto: `Esta atividade ainda é desafiadora. Tente com objetos que ${nome} goste ainda mais.`,
    engine: `${nome} teve <strong>${pct}% de acertos</strong>. Considere usar reforçadores de maior valor para aumentar a motivação.`,
  };
}

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────
export default function AtividadePage() {
  const router = useRouter();

  const searchParams = useSearchParams();
  const programaIdUrl = searchParams.get("programaId");
  const planoIdUrl = searchParams.get("planoId") 

  const [fase,        setFase]        = useState<Fase>("loading");
  const [programa,    setPrograma]    = useState<Programa | null>(null);
  const [plano,       setPlano]       = useState<Plano | null>(null);
  const [criancaId,   setCriancaId]   = useState<string | null>(null);
  const [userId,      setUserId]      = useState<string | null>(null);
  const [nomeCrianca, setNomeCrianca] = useState("seu filho");
  const [tentativas,  setTentativas]  = useState<(Resultado|null)[]>(Array(TOTAL_TENTATIVAS).fill(null));
  const [obs,         setObs]         = useState("");
  const [humor,       setHumor]       = useState<number>(3);
  const [pressed,     setPressed]     = useState<Resultado|null>(null);
  const [salvando,    setSalvando]    = useState(false);
  const [erroMsg,     setErroMsg]     = useState("");

  useEffect(() => { carregarAtividade(); }, []);

  async function carregarAtividade() {
    // 1. Auth
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.replace("/care/login"); return; }
    setUserId(user.id);

    // 2. Criança
    const { data: crianca } = await supabase
      .from("criancas")
      .select("id, nome")
      .eq("responsavel_id", user.id)
      .eq("ativo", true)
      .single();

    if (!crianca) { router.replace("/care"); return; }
    setCriancaId(crianca.id);
    setNomeCrianca(crianca.nome);

    // 3. Busca ou cria plano para o programa selecionado
    let planoAtivo: Plano | null = null;

    if (planoIdUrl) {
  // Busca diretamente pelo ID do plano
  const { data: planoExistente } = await supabase
    .from("planos")
    .select("id, programa_id, status, tipo_plano, score_inicio")
    .eq("id", planoIdUrl)
    .single()
  planoAtivo = planoExistente ?? null

} else if (programaIdUrl) {
  // Busca por programa_id (compatibilidade com links antigos)
  const { data: planoExistente } = await supabase
    .from("planos")
    .select("id, programa_id, status, tipo_plano, score_inicio")
    .eq("crianca_id", crianca.id)
    .eq("programa_id", programaIdUrl)
    .eq("status", "ativo")
    .single()
  if (planoExistente) {
    planoAtivo = planoExistente
  } else {
    const { data: novoPlano } = await supabase
      .from("planos")
      .insert({
        crianca_id: crianca.id,
        programa_id: programaIdUrl,
        status: "ativo",
        prioridade: 2,
        tipo_plano: "principal",
        gerado_por: "engine",
        iniciado_em: new Date().toISOString(),
      })
      .select("id, programa_id, status, tipo_plano, score_inicio")
      .single()
    planoAtivo = novoPlano ?? null
  }
}

    // 4. Se ainda nao tiver plano, cria baseado no radar
    if (!planoAtivo) {
      planoAtivo = await criarPlanoInicial(crianca.id, user.id);
    }

    if (!planoAtivo) {
      setErroMsg("Não foi possível carregar uma atividade. Volte ao painel e faça a avaliação primeiro.");
      setFase("instrucao");
      return;
    }

    setPlano(planoAtivo);

    // 5. Busca o programa
    const { data: prog } = await supabase
      .from("programas")
      .select("*")
      .eq("id", planoAtivo.programa_id)
      .single();

    if (!prog) {
      setErroMsg("Programa não encontrado.");
      setFase("instrucao");
      return;
    }

    // Garante que passos é array
    const passos = Array.isArray(prog.passos)
      ? prog.passos
      : typeof prog.passos === "string"
      ? JSON.parse(prog.passos)
      : [];

    setPrograma({ ...prog, passos });
    setFase("instrucao");
  }

  async function criarPlanoInicial(criancaId: string, userId: string): Promise<Plano | null> {
    // Pega o radar mais recente
    const { data: radar } = await supabase
      .from("radar_snapshots")
      .select("*")
      .eq("crianca_id", criancaId)
      .order("criado_em", { ascending: false })
      .limit(1)
      .single();

    // Determina domínio prioritário
    let dominioPrioritario = "comunicacao";
    if (radar) {
      const scores: Record<string, number> = {
        comunicacao:   radar.score_comunicacao   ?? 50,
        social:        radar.score_social        ?? 50,
        atencao:       radar.score_atencao       ?? 50,
        regulacao:     radar.score_regulacao     ?? 50,
        brincadeira:   radar.score_brincadeira   ?? 50,
        flexibilidade: radar.score_flexibilidade ?? 50,
        autonomia:     radar.score_autonomia     ?? 50,
        motivacao:     radar.score_motivacao     ?? 50,
      };
      dominioPrioritario = Object.entries(scores).sort(([,a],[,b]) => a - b)[0][0];
    }

    // Pega programa do domínio prioritário de nível iniciante
    const { data: prog } = await supabase
      .from("programas")
      .select("id")
      .eq("dominio", dominioPrioritario)
      .eq("nivel", "iniciante")
      .eq("ativo", true)
      .limit(1)
      .single();

    if (!prog) return null;

    // Cria o plano
    const { data: novoPlano } = await supabase
      .from("planos")
      .insert({
        crianca_id:   criancaId,
        programa_id:  prog.id,
        status:       "ativo",
        prioridade:   1,
        tipo_plano:   "principal",
        gerado_por:   "engine",
        iniciado_em:  new Date().toISOString(),
      })
      .select("id, programa_id, status, tipo_plano, score_inicio")
      .single();

    return novoPlano ?? null;
  }

  function registrar(tipo: Resultado) {
    const concluidas = tentativas.filter(Boolean).length;
    if (concluidas >= TOTAL_TENTATIVAS) return;
    const novas = [...tentativas];
    novas[concluidas] = tipo;
    setTentativas(novas);
    setPressed(tipo);
    setTimeout(() => setPressed(null), 300);
  }

  async function avancar() {
    if (fase === "instrucao") { setFase("pratica"); return; }

    if (fase === "pratica") {
      const todas = tentativas.filter(Boolean).length === TOTAL_TENTATIVAS;
      if (!todas) return;
      setFase("resultado");
      await salvarSessao();
      return;
    }

    if (fase === "resultado") {
      router.push("/care");
    }
  }

  async function salvarSessao() {
    if (!criancaId || !userId || !plano) return;
    setSalvando(true);

    const tentativasStr = tentativas
      .filter((t): t is Resultado => t !== null)
      .map(t => t);

    const acertos = tentativasStr.filter(t => t === "acerto").length;

    const { error } = await supabase.from("sessoes").insert({
      plano_id:         plano.id,
      crianca_id:       criancaId,
      responsavel_id:   userId,
      tentativas:       tentativasStr,
      acertos,
      observacao:       obs || null,
      humor_crianca:    humor,
      duracao_segundos: null,
      concluida:        true,
    });

    if (error) console.error("Erro ao salvar sessão:", error);

    // Atualiza score_atual no plano
    const taxaAcerto = Math.round((acertos / TOTAL_TENTATIVAS) * 100);
    await supabase
      .from("planos")
      .update({ score_atual: taxaAcerto, atualizado_em: new Date().toISOString() })
      .eq("id", plano.id);

    setSalvando(false);
  }

  const concluidas = tentativas.filter(Boolean).length;
  const todas      = concluidas === TOTAL_TENTATIVAS;
  const acertos    = tentativas.filter(t => t === "acerto").length;
  const ajudas     = tentativas.filter(t => t === "ajuda").length;
  const naoResp    = tentativas.filter(t => t === "nao").length;
  const msg        = gerarMensagem(tentativas, nomeCrianca);
  const pct        = fase === "instrucao" ? 33 : fase === "pratica" ? 66 : 100;

  const card: React.CSSProperties = {
    background: "rgba(255,255,255,.84)", backdropFilter: "blur(14px)",
    borderRadius: 24, border: "1px solid rgba(43,191,164,.18)",
    boxShadow: "0 4px 28px rgba(43,191,164,.06)", padding: "26px", marginBottom: 16,
  };

  // ── LOADING ──────────────────────────────────────────────
  if (fase === "loading") {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(160deg,#e8f8ff,#f0fdfb)", fontFamily: "var(--font-sans)" }}>
        <div style={{ textAlign: "center" }}>
          <FractaLogo logo="care" height={60} alt="FractaCare" style={{ opacity: 0.8 }} />
          <p style={{ color: "#8a9ab8", fontSize: ".9rem", marginTop: 16 }}>Preparando atividade...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "var(--font-sans)", color: "#1E3A5F", minHeight: "100vh", background: "radial-gradient(ellipse 80% 60% at 20% 10%, rgba(122,224,64,.10) 0%, transparent 55%), radial-gradient(ellipse 60% 70% at 80% 90%, rgba(43,191,164,.13) 0%, transparent 55%), linear-gradient(160deg,#e8f8ff 0%,#f0fdfb 35%,#edfff8 65%,#ddf4ff 100%)" }}>

      {/* NAV */}
      <nav style={{ background: "rgba(255,255,255,.75)", backdropFilter: "blur(16px)", borderBottom: "1px solid rgba(43,191,164,.15)", padding: "0 20px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 50 }}>
        <Link href="/care" style={{ display: "flex", alignItems: "center", gap: 7, textDecoration: "none", color: "#2BBFA4", fontSize: ".82rem", fontWeight: 600 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          Painel
        </Link>
        <FractaLogo logo="care" height={28} alt="FractaCare" />
        <span style={{ fontSize: ".72rem", color: "#8a9ab8" }}>
          Passo {fase === "instrucao" ? 1 : fase === "pratica" ? 2 : 3} de 3
        </span>
      </nav>

      {/* PROGRESSO */}
      <div style={{ height: 4, background: "rgba(43,191,164,.15)" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: "linear-gradient(90deg,#2BBFA4,#7AE040)", borderRadius: "0 2px 2px 0", transition: "width .6s ease" }} />
      </div>

      {/* FASE INDICATOR */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0, padding: "24px 0 4px" }}>
        {["Instrução","Praticar","Resultado"].map((label, i) => {
          const step    = i + 1;
          const current = fase === "instrucao" ? 1 : fase === "pratica" ? 2 : 3;
          const done    = step < current;
          const active  = step === current;
          return (
            <div key={label} style={{ display: "flex", alignItems: "center" }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: done ? "linear-gradient(135deg,#2BBFA4,#7AE040)" : active ? "#1E3A5F" : "rgba(43,191,164,.12)", color: done || active ? "white" : "#8a9ab8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".68rem", fontWeight: 800, boxShadow: active ? "0 0 0 3px rgba(43,191,164,.25)" : "none" }}>
                  {done ? "✓" : step}
                </div>
                <span style={{ fontSize: ".6rem", color: active ? "#2BBFA4" : "#8a9ab8", marginTop: 4, fontWeight: active ? 700 : 400 }}>{label}</span>
              </div>
              {i < 2 && <div style={{ width: 48, height: 2, background: done ? "#2BBFA4" : "rgba(43,191,164,.2)", margin: "0 4px 16px" }} />}
            </div>
          );
        })}
      </div>

      {/* CONTEÚDO */}
      <div style={{ maxWidth: 540, margin: "0 auto", padding: "16px 18px 120px" }}>

        {/* ERRO */}
        {erroMsg && (
          <div style={{ background: "rgba(239,68,68,.08)", border: "1px solid rgba(239,68,68,.2)", borderRadius: 16, padding: "16px 20px", marginBottom: 16, fontSize: ".88rem", color: "#dc2626" }}>
            {erroMsg}
            <br />
            <Link href="/care" style={{ color: "#2BBFA4", fontWeight: 700, textDecoration: "none", fontSize: ".82rem", marginTop: 8, display: "inline-block" }}>← Voltar ao painel</Link>
          </div>
        )}

        {/* ── FASE 1: INSTRUÇÃO ── */}
        {fase === "instrucao" && programa && (
          <>
            <div style={card}>
              <div style={{ display: "inline-block", background: "rgba(43,191,164,.1)", color: "#2BBFA4", fontSize: ".62rem", fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", padding: "4px 12px", borderRadius: 50, marginBottom: 12 }}>
                {programa.dominio.charAt(0).toUpperCase() + programa.dominio.slice(1)}
              </div>
              <h1 style={{ fontSize: "1.35rem", fontWeight: 800, color: "#1E3A5F", marginBottom: 6 }}>{programa.nome}</h1>
              {programa.subtitulo && <p style={{ fontSize: ".82rem", color: "#2BBFA4", fontWeight: 600, marginBottom: 10 }}>{programa.subtitulo}</p>}
              <p style={{ fontSize: ".88rem", color: "#5a7a9a", lineHeight: 1.65, marginBottom: 20 }}>{programa.objetivo}</p>

              {programa.materiais && (
                <div style={{ background: "rgba(43,191,164,.06)", border: "1px solid rgba(43,191,164,.15)", borderRadius: 12, padding: "12px 14px", marginBottom: 18 }}>
                  <div style={{ fontSize: ".65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: "#2BBFA4", marginBottom: 5 }}>Materiais necessários</div>
                  <p style={{ fontSize: ".82rem", color: "#1E3A5F", margin: 0 }}>{programa.materiais}</p>
                </div>
              )}

              {programa.passos.length > 0 && (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, fontSize: ".75rem", fontWeight: 700, color: "#1E3A5F" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2BBFA4" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
                    Como fazer
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {programa.passos.map((passo, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                        <div style={{ width: 24, height: 24, borderRadius: "50%", background: "linear-gradient(135deg,rgba(43,191,164,.2),rgba(122,224,64,.15))", border: "1.5px solid rgba(43,191,164,.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".65rem", fontWeight: 800, color: "#2BBFA4", flexShrink: 0, marginTop: 1 }}>
                          {i + 1}
                        </div>
                        <p style={{ fontSize: ".88rem", color: "#1E3A5F", lineHeight: 1.6, margin: 0 }}>{normalizarPasso(passo)}</p>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {programa.dica && (
                <div style={{ background: "linear-gradient(135deg,rgba(43,191,164,.08),rgba(122,224,64,.05))", border: "1px solid rgba(43,191,164,.2)", borderRadius: 14, padding: "14px 16px", marginTop: 20 }}>
                  <div style={{ fontSize: ".6rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: "#2BBFA4", marginBottom: 5 }}>Dica importante</div>
                  <p style={{ fontSize: ".82rem", color: "#1E3A5F", lineHeight: 1.65, margin: 0 }}>{programa.dica}</p>
                </div>
              )}
            </div>

            <div style={card}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: ".62rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", color: "#2BBFA4", marginBottom: 4 }}>Detalhes</div>
                  <div style={{ fontSize: ".82rem", color: "#5a7a9a" }}>{programa.tempo_minutos} min · {programa.nivel} · {programa.tipo === "habilidade" ? "Habilidade" : "Desafio diário"}</div>
                </div>
                <div style={{ fontSize: ".72rem", fontWeight: 700, padding: "4px 12px", borderRadius: 50, background: "rgba(43,191,164,.12)", color: "#2BBFA4" }}>
                  {programa.codigo}
                </div>
              </div>
            </div>
          </>
        )}

        {/* ── FASE 2: PRÁTICA ── */}
        {fase === "pratica" && programa && (
          <div style={card}>
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <div style={{ fontSize: "1.15rem", fontWeight: 800, color: "#1E3A5F", marginBottom: 4 }}>Registre cada tentativa</div>
              <div style={{ fontSize: ".82rem", color: "#8a9ab8" }}>Faça {TOTAL_TENTATIVAS} tentativas com {nomeCrianca} e registre o resultado de cada uma</div>
            </div>

            {/* Dots */}
            <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginBottom: 18 }}>
              {tentativas.map((t, i) => (
                <div key={i} style={{ width: 34, height: 34, borderRadius: "50%", border: `2px solid ${t ? "transparent" : "rgba(43,191,164,.25)"}`, background: t === "acerto" ? "linear-gradient(135deg,#2BBFA4,#7AE040)" : t === "ajuda" ? "linear-gradient(135deg,#f59e0b,#fbbf24)" : t === "nao" ? "linear-gradient(135deg,#e0e7ef,#c8d6e5)" : "rgba(255,255,255,.6)", display: "flex", alignItems: "center", justifyContent: "center", transition: "all .3s" }}>
                  {t === "acerto" && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                  {t === "ajuda"  && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>}
                  {t === "nao"    && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(100,116,139,.6)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>}
                  {!t && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "rgba(43,191,164,.2)" }} />}
                </div>
              ))}
            </div>

            <div style={{ fontSize: ".72rem", fontWeight: 700, color: "#8a9ab8", textAlign: "center", marginBottom: 22 }}>
              Tentativa <span style={{ color: "#1E3A5F", fontSize: ".9rem" }}>{Math.min(concluidas + 1, TOTAL_TENTATIVAS)}</span> de {TOTAL_TENTATIVAS}
            </div>

            {/* Botões */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
              {(["acerto","ajuda","nao"] as Resultado[]).map(tipo => (
                <button key={tipo} onClick={() => registrar(tipo)} disabled={concluidas >= TOTAL_TENTATIVAS} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: "16px 8px", borderRadius: 18, border: `2px solid ${pressed === tipo ? COR_RESULTADO[tipo] : tipo === "acerto" ? "rgba(43,191,164,.3)" : tipo === "ajuda" ? "rgba(245,158,11,.3)" : "rgba(100,116,139,.2)"}`, background: pressed === tipo ? (tipo === "acerto" ? "rgba(43,191,164,.18)" : tipo === "ajuda" ? "rgba(245,158,11,.18)" : "rgba(100,116,139,.18)") : (tipo === "acerto" ? "rgba(43,191,164,.08)" : tipo === "ajuda" ? "rgba(245,158,11,.08)" : "rgba(100,116,139,.06)"), cursor: concluidas >= TOTAL_TENTATIVAS ? "not-allowed" : "pointer", fontFamily: "var(--font-sans)", fontWeight: 700, fontSize: ".82rem", color: tipo === "acerto" ? "#2BBFA4" : tipo === "ajuda" ? "#b45309" : "#5a7a9a", transition: "all .2s", opacity: concluidas >= TOTAL_TENTATIVAS ? 0.5 : 1 }}>
                  <div style={{ width: 40, height: 40, borderRadius: "50%", background: tipo === "acerto" ? "linear-gradient(135deg,#2BBFA4,#7AE040)" : tipo === "ajuda" ? "linear-gradient(135deg,#f59e0b,#fbbf24)" : "linear-gradient(135deg,#94a3b8,#64748b)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {tipo === "acerto" && <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                    {tipo === "ajuda"  && <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>}
                    {tipo === "nao"    && <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>}
                  </div>
                  {LABEL_RESULTADO[tipo]}
                </button>
              ))}
            </div>

            {/* Mini resumo */}
            {concluidas >= 2 && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginTop: 20 }}>
                {[{ label:"Acertos", val:acertos, cor:"#2BBFA4" },{ label:"Com ajuda", val:ajudas, cor:"#f59e0b" },{ label:"Sem resposta", val:naoResp, cor:"#94a3b8" }].map(s => (
                  <div key={s.label} style={{ background: "rgba(255,255,255,.6)", border: "1px solid rgba(43,191,164,.1)", borderRadius: 14, padding: "10px", textAlign: "center" }}>
                    <div style={{ fontSize: "1.3rem", fontWeight: 800, color: s.cor }}>{s.val}</div>
                    <div style={{ fontSize: ".6rem", fontWeight: 700, color: "#8a9ab8", textTransform: "uppercase", letterSpacing: ".06em", marginTop: 2 }}>{s.label}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Observação + humor — só após todas as tentativas */}
            {todas && (
              <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 14 }}>
                {/* Humor */}
                <div>
                  <div style={{ fontSize: ".68rem", fontWeight: 700, color: "#8a9ab8", marginBottom: 8 }}>Como estava {nomeCrianca} hoje?</div>
                  <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                    {[["1","😤"],["2","😕"],["3","😐"],["4","😊"],["5","🤩"]].map(([val, emoji]) => (
                      <button key={val} onClick={() => setHumor(Number(val))} style={{ width: 44, height: 44, borderRadius: 12, border: `2px solid ${humor === Number(val) ? "#2BBFA4" : "rgba(43,191,164,.15)"}`, background: humor === Number(val) ? "rgba(43,191,164,.12)" : "rgba(255,255,255,.6)", fontSize: "1.3rem", cursor: "pointer", transition: "all .2s" }}>
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Obs */}
                <div>
                  <div style={{ fontSize: ".68rem", fontWeight: 600, color: "#8a9ab8", marginBottom: 6 }}>Observação (opcional)</div>
                  <textarea value={obs} onChange={e => setObs(e.target.value)} rows={2} placeholder="O que você observou nesta atividade?" style={{ width: "100%", padding: "10px 13px", border: "1.5px solid rgba(43,191,164,.18)", borderRadius: 12, fontFamily: "var(--font-sans)", fontSize: ".82rem", color: "#1E3A5F", background: "rgba(255,255,255,.7)", resize: "none", outline: "none", boxSizing: "border-box" }} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── FASE 3: RESULTADO ── */}
        {fase === "resultado" && programa && (
          <>
            <div style={{ ...card, textAlign: "center" }}>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
                <FractaLogo logo="care" height={110} alt="FractaCare" />
              </div>
              <h2 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#1E3A5F", marginBottom: 8 }}>{msg.titulo}</h2>
              <p style={{ fontSize: ".9rem", color: "#5a7a9a", lineHeight: 1.65, marginBottom: 22 }}>{msg.texto}</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
                {[{ label:"Acertos", val:acertos, cor:"#2BBFA4" },{ label:"Com ajuda", val:ajudas, cor:"#f59e0b" },{ label:"Taxa", val:`${Math.round((acertos/TOTAL_TENTATIVAS)*100)}%`, cor:"#1E3A5F" }].map(s => (
                  <div key={s.label} style={{ background: "#f7fdff", border: "1px solid rgba(43,191,164,.1)", borderRadius: 16, padding: "14px" }}>
                    <div style={{ fontSize: "1.8rem", fontWeight: 800, color: s.cor }}>{s.val}</div>
                    <div style={{ fontSize: ".62rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em", color: "#8a9ab8", marginTop: 3 }}>{s.label}</div>
                  </div>
                ))}
              </div>
              {salvando && <p style={{ fontSize: ".72rem", color: "#8a9ab8", marginTop: 14 }}>Salvando resultado...</p>}
            </div>

            {/* Engine */}
            <div style={{ background: "linear-gradient(135deg,rgba(43,191,164,.1),rgba(42,123,168,.07))", border: "1px solid rgba(43,191,164,.2)", borderRadius: 22, padding: "20px 22px", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <FractaLogo logo="engine" height={20} alt="FractaEngine" />
                <span style={{ fontSize: ".62rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", color: "#2BBFA4" }}>FractaEngine</span>
              </div>
              <p style={{ fontSize: ".85rem", color: "#1E3A5F", lineHeight: 1.7, margin: 0 }} dangerouslySetInnerHTML={{ __html: msg.engine }} />
            </div>
          </>
        )}
      </div>

      {/* BOTÃO FIXO */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "rgba(255,255,255,.88)", backdropFilter: "blur(16px)", borderTop: "1px solid rgba(43,191,164,.15)", padding: "14px 20px", zIndex: 50 }}>
        <div style={{ maxWidth: 540, margin: "0 auto", display: "flex", gap: 10, alignItems: "center" }}>
          {fase === "pratica" && (
            <button onClick={() => setFase("instrucao")} style={{ padding: "13px 20px", borderRadius: 50, border: "2px solid rgba(43,191,164,.3)", background: "transparent", color: "#2BBFA4", fontFamily: "var(--font-sans)", fontWeight: 700, fontSize: ".88rem", cursor: "pointer" }}>
              ← Voltar
            </button>
          )}
          {!erroMsg && (
            <button onClick={avancar} disabled={fase === "pratica" && !todas} style={{ flex: 1, padding: "15px", borderRadius: 50, border: "none", background: fase === "pratica" && !todas ? "rgba(43,191,164,.3)" : "linear-gradient(135deg,#2BBFA4,#7AE040)", color: "white", fontFamily: "var(--font-sans)", fontWeight: 800, fontSize: ".95rem", cursor: fase === "pratica" && !todas ? "not-allowed" : "pointer", boxShadow: fase === "pratica" && !todas ? "none" : "0 4px 18px rgba(43,191,164,.35)", transition: "all .25s" }}>
              {fase === "instrucao"
                ? "Começar atividade →"
                : fase === "pratica"
                ? todas ? "Ver resultado →" : `Registre todas as tentativas (${concluidas}/${TOTAL_TENTATIVAS})`
                : "Voltar ao painel"}
            </button>
          )}
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
