"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FractaLogo } from "@/components/fracta/FractaLogo";
import { FractalTriangle } from "@/components/fracta/FractalTriangle";

// ─── DADOS DA ATIVIDADE ───────────────────────────────────
const ATIVIDADE = {
  nome: "Pedir o que quer",
  dominio: "Comunicação",
  objetivo: "Ensine Lucas a solicitar objetos ou ações de forma funcional — usando palavras, gestos ou aproximações vocais.",
  operantes: ["Mando funcional", "Iniciativa de comunicação", "Contato visual"],
  passos: [
    "Apresente um objeto que Lucas goste bastante — um brinquedo favorito, um lanche ou atividade preferida.",
    "Segure o objeto de forma visível mas fora do alcance dele. Aguarde alguns segundos a iniciativa.",
    "Se não responder, modele dizendo o nome do objeto ou fazendo o gesto de apontar.",
    "Assim que Lucas tentar pedir — de qualquer forma — entregue imediatamente com elogio.",
  ],
  dica: "Qualquer tentativa conta: um som, um olhar, um gesto. O objetivo agora é a iniciativa de comunicação, não a perfeição da resposta.",
  totalTentativas: 5,
  proximas: [
    { nome: "Esperar alguns segundos", dominio: "Regulação", tempo: "3 min", icon: "⏸️", cor: "#2A7BA8" },
    { nome: "Mostrar objetos interessantes", dominio: "Social", tempo: "5 min", icon: "👀", cor: "#2BBFA4" },
  ],
};

type Resultado = "acerto" | "ajuda" | "nao";
type Fase = "instrucao" | "pratica" | "resultado";

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

function gerarMensagem(tentativas: (Resultado|null)[]): { titulo: string; texto: string; engine: string } {
  const total = tentativas.filter(Boolean).length;
  const acertos = tentativas.filter(t => t === "acerto").length;
  const pct = total > 0 ? Math.round((acertos / total) * 100) : 0;

  if (pct >= 80) return {
    titulo: "Excelente!",
    texto: "Lucas teve um desempenho excepcional. Continue assim — ele está dominando esta habilidade.",
    engine: `Lucas atingiu <strong>${pct}% de acertos</strong> hoje. O FractaEngine sugere introduzir a combinação de duas palavras na próxima sessão para ampliar o mando.`,
  };
  if (pct >= 60) return {
    titulo: "Muito bem!",
    texto: "Bom progresso. Com mais prática, Lucas vai dominar esta habilidade em breve.",
    engine: `Lucas demonstrou <strong>${pct}% de acertos</strong>. Continue com este programa por mais 3 dias antes de aumentar a exigência.`,
  };
  if (pct >= 40) return {
    titulo: "Bom começo!",
    texto: "Lucas está aprendendo. Continue praticando diariamente — a consistência é o que faz a diferença.",
    engine: `Lucas teve <strong>${pct}% de acertos</strong>. Tente com atividades em momentos de maior motivação.`,
  };
  return {
    titulo: "Continue tentando!",
    texto: "Esta atividade ainda é desafiadora para Lucas. Tente com objetos que ele goste ainda mais.",
    engine: `Lucas teve <strong>${pct}% de acertos</strong>. Tente usar reforçadores de maior valor — itens que ele prefira muito — para aumentar a motivação.`,
  };
}

export default function AtividadePage() {
  const router = useRouter();
  const [fase, setFase]           = useState<Fase>("instrucao");
  const [tentativas, setTentativas] = useState<(Resultado|null)[]>(Array(ATIVIDADE.totalTentativas).fill(null));
  const [obs, setObs]             = useState("");
  const [pressed, setPressed]     = useState<Resultado|null>(null);

  const concluidas = tentativas.filter(Boolean).length;
  const todas = concluidas === ATIVIDADE.totalTentativas;
  const pct = fase === "instrucao" ? 33 : fase === "pratica" ? 66 : 100;

  function registrar(tipo: Resultado) {
    if (concluidas >= ATIVIDADE.totalTentativas) return;
    const novas = [...tentativas];
    novas[concluidas] = tipo;
    setTentativas(novas);
    setPressed(tipo);
    setTimeout(() => setPressed(null), 300);
    if (novas.filter(Boolean).length === ATIVIDADE.totalTentativas) {
      // Última tentativa — não avança automaticamente, deixa ver o obs
    }
  }

  function avancar() {
    if (fase === "instrucao") { setFase("pratica"); return; }
    if (fase === "pratica" && todas) { setFase("resultado"); return; }
    if (fase === "resultado") { router.push("/app"); }
  }

  const acertos = tentativas.filter(t => t === "acerto").length;
  const ajudas  = tentativas.filter(t => t === "ajuda").length;
  const naoResp = tentativas.filter(t => t === "nao").length;
  const msg = gerarMensagem(tentativas);

  const card: React.CSSProperties = {
    background: "rgba(255,255,255,.84)", backdropFilter: "blur(14px)",
    borderRadius: 24, border: "1px solid rgba(43,191,164,.18)",
    boxShadow: "0 4px 28px rgba(43,191,164,.06)", padding: "26px",
    marginBottom: 16,
  };

  return (
    <div style={{
      fontFamily: "var(--font-sans)", color: "#1E3A5F", minHeight: "100vh",
      background: "radial-gradient(ellipse 80% 60% at 20% 10%, rgba(122,224,64,.10) 0%, transparent 55%), radial-gradient(ellipse 60% 70% at 80% 90%, rgba(43,191,164,.13) 0%, transparent 55%), linear-gradient(160deg,#e8f8ff 0%,#f0fdfb 35%,#edfff8 65%,#ddf4ff 100%)",
    }}>

      {/* NAV */}
      <nav style={{ background: "rgba(255,255,255,.75)", backdropFilter: "blur(16px)", borderBottom: "1px solid rgba(43,191,164,.15)", padding: "0 20px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 50 }}>
        <Link href="/app" style={{ display: "flex", alignItems: "center", gap: 7, textDecoration: "none", color: "#2BBFA4", fontSize: ".82rem", fontWeight: 600 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          Atividades
        </Link>
        <FractaLogo logo="care" height={28} alt="FractaCare" />
        <span style={{ fontSize: ".72rem", color: "#8a9ab8" }}>Passo {fase === "instrucao" ? 1 : fase === "pratica" ? 2 : 3} de 3</span>
      </nav>

      {/* BARRA DE PROGRESSO */}
      <div style={{ height: 4, background: "rgba(43,191,164,.15)" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: "linear-gradient(90deg,#2BBFA4,#7AE040)", borderRadius: "0 2px 2px 0", transition: "width .6s ease" }} />
      </div>

      {/* FASE INDICATOR */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0, padding: "24px 0 4px" }}>
        {["Instrução","Praticar","Resultado"].map((label, i) => {
          const step = i + 1;
          const current = fase === "instrucao" ? 1 : fase === "pratica" ? 2 : 3;
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

      {/* CONTEÚDO */}
      <div style={{ maxWidth: 540, margin: "0 auto", padding: "16px 18px 120px" }}>

        {/* ── FASE 1: INSTRUÇÃO ── */}
        {fase === "instrucao" && (
          <>
            <div style={card}>
              <div style={{ display: "inline-block", background: "rgba(43,191,164,.1)", color: "#2BBFA4", fontSize: ".62rem", fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", padding: "4px 12px", borderRadius: 50, marginBottom: 12 }}>
                {ATIVIDADE.dominio}
              </div>
              <h1 style={{ fontSize: "1.35rem", fontWeight: 800, color: "#1E3A5F", marginBottom: 8 }}>{ATIVIDADE.nome}</h1>
              <p style={{ fontSize: ".88rem", color: "#5a7a9a", lineHeight: 1.65, marginBottom: 22 }}>{ATIVIDADE.objetivo}</p>

              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, fontSize: ".75rem", fontWeight: 700, color: "#1E3A5F" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2BBFA4" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
                Como fazer
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {ATIVIDADE.passos.map((p, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                    <div style={{ width: 24, height: 24, borderRadius: "50%", background: "linear-gradient(135deg,rgba(43,191,164,.2),rgba(122,224,64,.15))", border: "1.5px solid rgba(43,191,164,.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".65rem", fontWeight: 800, color: "#2BBFA4", flexShrink: 0, marginTop: 1 }}>{i + 1}</div>
                    <p style={{ fontSize: ".88rem", color: "#1E3A5F", lineHeight: 1.6, margin: 0 }}>{p}</p>
                  </div>
                ))}
              </div>

              <div style={{ background: "linear-gradient(135deg,rgba(43,191,164,.08),rgba(122,224,64,.05))", border: "1px solid rgba(43,191,164,.2)", borderRadius: 14, padding: "14px 16px", marginTop: 20 }}>
                <div style={{ fontSize: ".6rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: "#2BBFA4", marginBottom: 5 }}>Dica importante</div>
                <p style={{ fontSize: ".82rem", color: "#1E3A5F", lineHeight: 1.65, margin: 0 }}>{ATIVIDADE.dica}</p>
              </div>
            </div>

            <div style={card}>
              <div style={{ fontSize: ".62rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", color: "#2BBFA4", marginBottom: 10 }}>Esta atividade treina</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {ATIVIDADE.operantes.map(op => (
                  <span key={op} style={{ background: "rgba(43,191,164,.12)", color: "#1a7a6a", borderRadius: 50, padding: "4px 13px", fontSize: ".72rem", fontWeight: 700 }}>{op}</span>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ── FASE 2: PRÁTICA ── */}
        {fase === "pratica" && (
          <div style={card}>
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <div style={{ fontSize: "1.15rem", fontWeight: 800, color: "#1E3A5F", marginBottom: 4 }}>Registre cada tentativa</div>
              <div style={{ fontSize: ".82rem", color: "#8a9ab8" }}>Faça {ATIVIDADE.totalTentativas} tentativas e registre o resultado de cada uma</div>
            </div>

            {/* Dots de tentativas */}
            <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginBottom: 18 }}>
              {tentativas.map((t, i) => (
                <div key={i} style={{
                  width: 34, height: 34, borderRadius: "50%",
                  border: `2px solid ${t ? "transparent" : "rgba(43,191,164,.25)"}`,
                  background: t === "acerto" ? "linear-gradient(135deg,#2BBFA4,#7AE040)" : t === "ajuda" ? "linear-gradient(135deg,#f59e0b,#fbbf24)" : t === "nao" ? "linear-gradient(135deg,#e0e7ef,#c8d6e5)" : "rgba(255,255,255,.6)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all .3s",
                }}>
                  {t === "acerto" && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                  {t === "ajuda"  && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>}
                  {t === "nao"    && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(100,116,139,.6)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>}
                  {!t && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "rgba(43,191,164,.2)" }} />}
                </div>
              ))}
            </div>

            <div style={{ fontSize: ".72rem", fontWeight: 700, color: "#8a9ab8", textAlign: "center", marginBottom: 22 }}>
              Tentativa <span style={{ color: "#1E3A5F", fontSize: ".9rem" }}>{Math.min(concluidas + 1, ATIVIDADE.totalTentativas)}</span> de {ATIVIDADE.totalTentativas}
            </div>

            {/* Botões de registro */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
              {(["acerto","ajuda","nao"] as Resultado[]).map(tipo => (
                <button key={tipo} onClick={() => registrar(tipo)} disabled={concluidas >= ATIVIDADE.totalTentativas} style={{
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
                  padding: "16px 8px", borderRadius: 18,
                  border: `2px solid ${pressed === tipo ? COR_RESULTADO[tipo] : tipo === "acerto" ? "rgba(43,191,164,.3)" : tipo === "ajuda" ? "rgba(245,158,11,.3)" : "rgba(100,116,139,.2)"}`,
                  background: pressed === tipo
                    ? tipo === "acerto" ? "rgba(43,191,164,.18)" : tipo === "ajuda" ? "rgba(245,158,11,.18)" : "rgba(100,116,139,.18)"
                    : tipo === "acerto" ? "rgba(43,191,164,.08)" : tipo === "ajuda" ? "rgba(245,158,11,.08)" : "rgba(100,116,139,.06)",
                  cursor: concluidas >= ATIVIDADE.totalTentativas ? "not-allowed" : "pointer",
                  fontFamily: "var(--font-sans)", fontWeight: 700, fontSize: ".82rem",
                  color: tipo === "acerto" ? "#2BBFA4" : tipo === "ajuda" ? "#b45309" : "#5a7a9a",
                  transition: "all .2s", opacity: concluidas >= ATIVIDADE.totalTentativas ? 0.5 : 1,
                }}>
                  <div style={{ width: 40, height: 40, borderRadius: "50%", background: tipo === "acerto" ? "linear-gradient(135deg,#2BBFA4,#7AE040)" : tipo === "ajuda" ? "linear-gradient(135deg,#f59e0b,#fbbf24)" : "linear-gradient(135deg,#94a3b8,#64748b)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {tipo === "acerto" && <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                    {tipo === "ajuda"  && <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>}
                    {tipo === "nao"    && <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>}
                  </div>
                  {LABEL_RESULTADO[tipo]}
                </button>
              ))}
            </div>

            {/* Mini resumo após 2+ tentativas */}
            {concluidas >= 2 && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginTop: 20 }}>
                {[
                  { label: "Acertos", val: acertos, cor: "#2BBFA4" },
                  { label: "Com ajuda", val: ajudas, cor: "#f59e0b" },
                  { label: "Sem resposta", val: naoResp, cor: "#94a3b8" },
                ].map(s => (
                  <div key={s.label} style={{ background: "rgba(255,255,255,.6)", border: "1px solid rgba(43,191,164,.1)", borderRadius: 14, padding: "10px", textAlign: "center" }}>
                    <div style={{ fontSize: "1.3rem", fontWeight: 800, color: s.cor }}>{s.val}</div>
                    <div style={{ fontSize: ".6rem", fontWeight: 700, color: "#8a9ab8", textTransform: "uppercase", letterSpacing: ".06em", marginTop: 2 }}>{s.label}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Campo de observação — só aparece após todas as tentativas */}
            {todas && (
              <div style={{ marginTop: 18 }}>
                <div style={{ fontSize: ".68rem", fontWeight: 600, color: "#8a9ab8", marginBottom: 6 }}>Observação (opcional)</div>
                <textarea value={obs} onChange={e => setObs(e.target.value)} rows={2} placeholder="O que você observou nesta atividade?" style={{ width: "100%", padding: "10px 13px", border: "1.5px solid rgba(43,191,164,.18)", borderRadius: 12, fontFamily: "var(--font-sans)", fontSize: ".82rem", color: "#1E3A5F", background: "rgba(255,255,255,.7)", resize: "none", outline: "none", boxSizing: "border-box" }} />
              </div>
            )}
          </div>
        )}

        {/* ── FASE 3: RESULTADO ── */}
        {fase === "resultado" && (
          <>
            <div style={{ ...card, textAlign: "center" }}>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
                <FractalTriangle size={110} animate />
              </div>
              <h2 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#1E3A5F", marginBottom: 8 }}>{msg.titulo}</h2>
              <p style={{ fontSize: ".9rem", color: "#5a7a9a", lineHeight: 1.65, marginBottom: 22 }}>{msg.texto}</p>

              {/* Métricas */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 0 }}>
                {[
                  { label: "Acertos",    val: acertos, cor: "#2BBFA4" },
                  { label: "Com ajuda",  val: ajudas,  cor: "#f59e0b" },
                  { label: "Taxa",       val: `${Math.round((acertos/ATIVIDADE.totalTentativas)*100)}%`, cor: "#1E3A5F" },
                ].map(s => (
                  <div key={s.label} style={{ background: "#f7fdff", border: "1px solid rgba(43,191,164,.1)", borderRadius: 16, padding: "14px" }}>
                    <div style={{ fontSize: "1.8rem", fontWeight: 800, color: s.cor }}>{s.val}</div>
                    <div style={{ fontSize: ".62rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em", color: "#8a9ab8", marginTop: 3 }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Engine */}
            <div style={{ background: "linear-gradient(135deg,rgba(43,191,164,.1),rgba(42,123,168,.07))", border: "1px solid rgba(43,191,164,.2)", borderRadius: 22, padding: "20px 22px", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <FractaLogo logo="engine" height={20} alt="FractaEngine" />
                <span style={{ fontSize: ".62rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", color: "#2BBFA4" }}>FractaEngine</span>
              </div>
              <p style={{ fontSize: ".85rem", color: "#1E3A5F", lineHeight: 1.7, margin: 0 }} dangerouslySetInnerHTML={{ __html: msg.engine }} />
            </div>

            {/* Próximas atividades */}
            <div style={card}>
              <div style={{ fontSize: ".62rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", color: "#2BBFA4", marginBottom: 12 }}>Continue praticando</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {ATIVIDADE.proximas.map(a => (
                  <Link key={a.nome} href="/dashboard/atividade" style={{
                    display: "flex", alignItems: "center", gap: 12, padding: "13px 16px",
                    background: "rgba(255,255,255,.7)", border: "1px solid rgba(43,191,164,.1)",
                    borderRadius: 16, textDecoration: "none", transition: "all .2s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.transform = "translateX(4px)"; e.currentTarget.style.borderColor = "rgba(43,191,164,.3)"; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.borderColor = "rgba(43,191,164,.1)"; }}
                  >
                    <div style={{ width: 36, height: 36, borderRadius: 11, background: `${a.cor}22`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem", flexShrink: 0 }}>{a.icon}</div>
                    <div>
                      <div style={{ fontSize: ".85rem", fontWeight: 700, color: "#1E3A5F" }}>{a.nome}</div>
                      <div style={{ fontSize: ".7rem", color: "#8a9ab8" }}>{a.dominio} · {a.tempo}</div>
                    </div>
                    <span style={{ marginLeft: "auto", color: "#2BBFA4" }}>›</span>
                  </Link>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* CTA FIXO NA BASE */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "rgba(255,255,255,.88)", backdropFilter: "blur(16px)", borderTop: "1px solid rgba(43,191,164,.15)", padding: "14px 20px", zIndex: 50 }}>
        <div style={{ maxWidth: 540, margin: "0 auto", display: "flex", gap: 10, alignItems: "center" }}>
          {fase !== "instrucao" && fase !== "resultado" && (
            <button onClick={() => { if (fase === "pratica") setFase("instrucao"); }} style={{
              padding: "13px 20px", borderRadius: 50, border: "2px solid rgba(43,191,164,.3)",
              background: "transparent", color: "#2BBFA4", fontFamily: "var(--font-sans)",
              fontWeight: 700, fontSize: ".88rem", cursor: "pointer",
            }}>← Voltar</button>
          )}
          <button onClick={avancar}
            disabled={fase === "pratica" && !todas}
            style={{
              flex: 1, padding: "15px", borderRadius: 50, border: "none",
              background: fase === "pratica" && !todas ? "rgba(43,191,164,.3)" : "linear-gradient(135deg,#2BBFA4,#7AE040)",
              color: "white", fontFamily: "var(--font-sans)", fontWeight: 800, fontSize: ".95rem",
              cursor: fase === "pratica" && !todas ? "not-allowed" : "pointer",
              boxShadow: fase === "pratica" && !todas ? "none" : "0 4px 18px rgba(43,191,164,.35)",
              transition: "all .25s",
            }}>
            {fase === "instrucao" ? "Começar atividade" : fase === "pratica" ? (todas ? "Ver resultado →" : `Registre todas as tentativas (${concluidas}/${ATIVIDADE.totalTentativas})`) : "Voltar ao painel"}
          </button>
        </div>
      </div>
    </div>
  );
}
