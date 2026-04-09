"use client";
import { useState } from "react";
import Link from "next/link";
import { FractaLogo } from "@/components/fracta/FractaLogo";

// ─── TIPOS ────────────────────────────────────────────────
type Resultado = "correta" | "incorreta" | "aproximacao" | "nao_respondeu";
type Fase = "preparacao" | "sessao" | "encerramento";

const RESULTADO_CONFIG: Record<Resultado, { label: string; cor: string; bg: string }> = {
  correta:       { label: "Correta",       cor: "#00c9a7", bg: "rgba(0,201,167,.12)"   },
  incorreta:     { label: "Incorreta",     cor: "#ef4444", bg: "rgba(239,68,68,.12)"   },
  aproximacao:   { label: "Aproximação",   cor: "#f59e0b", bg: "rgba(245,158,11,.12)"  },
  nao_respondeu: { label: "Sem resposta",  cor: "#94a3b8", bg: "rgba(148,163,184,.12)" },
};

// ─── DADOS DA SESSÃO ──────────────────────────────────────
const PACIENTE = {
  init: "LM", g: "linear-gradient(135deg,#00c9a7,#1e90ff)",
  nome: "Lucas M.", idade: "4 anos",
  terapeuta: "Dra. Carolina Amaral",
};

const PROGRAMAS = [
  {
    id: "prog-1",
    nome: "Mando funcional — palavra isolada",
    operante: "Mando",
    objetivo: "Emitir palavra isolada para solicitar item ou ação desejada na presença do SD.",
    sd: "Item desejado visível fora do alcance",
    criterio: "80% de respostas corretas em 3 sessões consecutivas",
    nivel_dica: ["Independente","Gestual","Modelo","Física"],
    nivel_atual: 0,
    estimulos: ["Bola","Suco","Biscoito","Tablet","Massinha"],
    total_tentativas: 10,
    tentativas: [] as { estimulo: string; resultado: Resultado; dica: number; obs?: string }[],
  },
  {
    id: "prog-2",
    nome: "Atenção ao nome",
    operante: "Ouvinte",
    objetivo: "Orientar o olhar para o terapeuta em até 3s após ser chamado pelo nome.",
    sd: "Nome da criança chamado em tom neutro",
    criterio: "90% em 2 sessões consecutivas",
    nivel_dica: ["Independente","Gestual","Física"],
    nivel_atual: 0,
    estimulos: ["Tentativa 1","Tentativa 2","Tentativa 3","Tentativa 4","Tentativa 5"],
    total_tentativas: 5,
    tentativas: [] as { estimulo: string; resultado: Resultado; dica: number; obs?: string }[],
  },
];

export default function ClinicSessaoPage() {
  const [fase,          setFase]          = useState<Fase>("preparacao");
  const [progAtual,     setProgAtual]     = useState(0);
  const [programas,     setProgramas]     = useState(PROGRAMAS);
  const [tentAtual,     setTentAtual]     = useState<{ estimulo: string; resultado?: Resultado; dica: number; obs: string }>({ estimulo: "", dica: 0, obs: "" });
  const [showEstimulo,  setShowEstimulo]  = useState(false);
  const [iniciou,       setIniciou]       = useState<Date | null>(null);
  const [encerrou,      setEncerrou]      = useState<Date | null>(null);
  const [obsGeral,      setObsGeral]      = useState("");

  const prog = programas[progAtual];
  const concluidas = prog?.tentativas.length ?? 0;
  const total = prog?.total_tentativas ?? 10;
  const pctProg = total > 0 ? Math.round((concluidas / total) * 100) : 0;

  // Métricas do programa atual
  const acertos    = prog?.tentativas.filter(t => t.resultado === "correta").length ?? 0;
  const erros      = prog?.tentativas.filter(t => t.resultado === "incorreta").length ?? 0;
  const aprox      = prog?.tentativas.filter(t => t.resultado === "aproximacao").length ?? 0;
  const taxaAcerto = concluidas > 0 ? Math.round((acertos / concluidas) * 100) : 0;

  function iniciarSessao() {
    setIniciou(new Date());
    setFase("sessao");
    const novoEstimulo = prog.estimulos[0];
    setTentAtual({ estimulo: novoEstimulo, dica: prog.nivel_atual, obs: "" });
  }

  function registrarTentativa(resultado: Resultado) {
    if (!tentAtual.estimulo) return;
    const nova = { estimulo: tentAtual.estimulo, resultado, dica: tentAtual.dica, obs: tentAtual.obs };
    const novosProg = [...programas];
    novosProg[progAtual].tentativas.push(nova);
    setProgramas(novosProg);

    const proxIdx = novosProg[progAtual].tentativas.length;
    if (proxIdx < total) {
      const proxEstimulo = prog.estimulos[proxIdx % prog.estimulos.length];
      setTentAtual({ estimulo: proxEstimulo, dica: prog.nivel_atual, obs: "" });
    } else {
      setTentAtual({ estimulo: "", dica: prog.nivel_atual, obs: "" });
    }
  }

  function proximoPrograma() {
    if (progAtual < programas.length - 1) {
      setProgAtual(p => p + 1);
      const proximo = programas[progAtual + 1];
      setTentAtual({ estimulo: proximo.estimulos[0], dica: proximo.nivel_atual, obs: "" });
    }
  }

  function encerrarSessao() {
    setEncerrou(new Date());
    setFase("encerramento");
  }

  const duracao = iniciou && encerrou
    ? Math.round((encerrou.getTime() - iniciou.getTime()) / 60000)
    : iniciou ? Math.round((Date.now() - iniciou.getTime()) / 60000) : 0;

  const gcard: React.CSSProperties = {
    background: "rgba(13,32,64,.7)", backdropFilter: "blur(14px)",
    border: "1px solid rgba(255,255,255,.09)", borderRadius: 16,
  };

  const input: React.CSSProperties = {
    background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.1)",
    borderRadius: 8, padding: "9px 12px", color: "white",
    fontFamily: "var(--font-sans)", fontSize: ".82rem", outline: "none", width: "100%",
    boxSizing: "border-box",
  };

  return (
    <div style={{ fontFamily: "var(--font-sans)", background: "#07111f", color: "white", minHeight: "100vh" }}>

      {/* NAV */}
      <nav style={{ background: "rgba(7,17,31,.92)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,.08)", padding: "0 20px", height: 54, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 50 }}>
        <Link href="/clinic/dashboard" style={{ display: "flex", alignItems: "center", gap: 7, textDecoration: "none", color: "#00c9a7", fontSize: ".8rem", fontWeight: 600 }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          Dashboard
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 26, height: 26, borderRadius: "50%", background: PACIENTE.g, display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".55rem", fontWeight: 800, color: "white" }}>{PACIENTE.init}</div>
          <span style={{ fontSize: ".8rem", fontWeight: 700 }}>{PACIENTE.nome} · {PACIENTE.idade}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {iniciou && fase === "sessao" && (
            <div style={{ fontSize: ".72rem", color: "#00c9a7", fontWeight: 700 }}>
              ⏱ {duracao} min
            </div>
          )}
          <FractaLogo logo="clinic" height={24} alt="FractaClinic" />
        </div>
      </nav>

      {/* BARRA DE PROGRESSO DA SESSÃO */}
      {fase === "sessao" && (
        <div style={{ height: 3, background: "rgba(255,255,255,.08)" }}>
          <div style={{
            height: "100%",
            width: `${((progAtual / programas.length) + (pctProg / 100 / programas.length)) * 100}%`,
            background: "linear-gradient(90deg,#00c9a7,#7bed9f)",
            transition: "width .5s ease",
          }} />
        </div>
      )}

      <div style={{ maxWidth: 860, margin: "0 auto", padding: "24px 18px 60px" }}>

        {/* ── FASE 1: PREPARAÇÃO ── */}
        {fase === "preparacao" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <div style={{ fontSize: ".72rem", color: "rgba(255,255,255,.35)", marginBottom: 4 }}>Preparação da sessão</div>
              <div style={{ fontSize: "1.2rem", fontWeight: 800 }}>Sessão com {PACIENTE.nome}</div>
            </div>

            {/* Info do paciente */}
            <div style={{ ...gcard, padding: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
                <div style={{ width: 48, height: 48, borderRadius: "50%", background: PACIENTE.g, display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".8rem", fontWeight: 800, color: "white", flexShrink: 0 }}>{PACIENTE.init}</div>
                <div>
                  <div style={{ fontSize: "1rem", fontWeight: 800 }}>{PACIENTE.nome}</div>
                  <div style={{ fontSize: ".72rem", color: "rgba(255,255,255,.45)" }}>{PACIENTE.idade} · FractaCare ativo</div>
                </div>
                <div style={{ marginLeft: "auto", background: "rgba(0,201,167,.1)", border: "1px solid rgba(0,201,167,.2)", borderRadius: 8, padding: "6px 12px", fontSize: ".68rem", fontWeight: 700, color: "#00c9a7" }}>
                  Radar: 58% Comunicação
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {[
                  { label:"Última sessão", val:"3 dias atrás" },
                  { label:"Taxa média",    val:"72%" },
                  { label:"Programas",     val:`${programas.length} ativos` },
                  { label:"Próx. critério",val:"Pedro G. (91%)" },
                ].map(item => (
                  <div key={item.label} style={{ background: "rgba(255,255,255,.04)", borderRadius: 10, padding: "10px 12px" }}>
                    <div style={{ fontSize: ".62rem", color: "rgba(255,255,255,.35)", marginBottom: 3 }}>{item.label}</div>
                    <div style={{ fontSize: ".85rem", fontWeight: 700 }}>{item.val}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Programas planejados */}
            <div style={{ ...gcard, padding: 20 }}>
              <div style={{ fontSize: ".65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".09em", color: "rgba(255,255,255,.4)", marginBottom: 14 }}>Programas desta sessão</div>
              {programas.map((p, i) => (
                <div key={p.id} style={{ display: "flex", gap: 14, padding: "14px 0", borderBottom: i < programas.length - 1 ? "1px solid rgba(255,255,255,.05)" : "none" }}>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(0,201,167,.15)", border: "1px solid rgba(0,201,167,.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".7rem", fontWeight: 800, color: "#00c9a7", flexShrink: 0 }}>{i + 1}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: ".88rem", fontWeight: 700, marginBottom: 3 }}>{p.nome}</div>
                    <div style={{ fontSize: ".72rem", color: "rgba(255,255,255,.45)", marginBottom: 4 }}>{p.operante} · {p.total_tentativas} tentativas</div>
                    <div style={{ fontSize: ".75rem", color: "rgba(255,255,255,.5)", lineHeight: 1.5 }}>{p.objetivo}</div>
                  </div>
                  <div style={{ flexShrink: 0, fontSize: ".65rem", color: "rgba(255,255,255,.35)", textAlign: "right" }}>
                    <div>Critério:</div>
                    <div style={{ color: "#00c9a7", marginTop: 2 }}>{p.criterio.split(" ").slice(0, 2).join(" ")}...</div>
                  </div>
                </div>
              ))}
            </div>

            <button onClick={iniciarSessao} style={{ padding: "15px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#00c9a7,#0f8f7a)", color: "#07111f", fontWeight: 800, fontSize: ".95rem", cursor: "pointer", fontFamily: "var(--font-sans)", boxShadow: "0 4px 20px rgba(0,201,167,.3)" }}>
              Iniciar sessão
            </button>
          </div>
        )}

        {/* ── FASE 2: SESSÃO ── */}
        {fase === "sessao" && prog && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 18, alignItems: "start" }}>

            {/* PAINEL PRINCIPAL */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

              {/* Header do programa */}
              <div style={{ ...gcard, padding: 20 }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
                  <div>
                    <div style={{ display: "inline-block", background: "rgba(0,201,167,.1)", border: "1px solid rgba(0,201,167,.2)", borderRadius: 50, padding: "3px 10px", fontSize: ".62rem", fontWeight: 700, color: "#00c9a7", marginBottom: 8 }}>{prog.operante}</div>
                    <div style={{ fontSize: "1rem", fontWeight: 800, marginBottom: 4 }}>{prog.nome}</div>
                    <div style={{ fontSize: ".78rem", color: "rgba(255,255,255,.5)", lineHeight: 1.55 }}>{prog.objetivo}</div>
                  </div>
                  <div style={{ fontSize: ".72rem", color: "rgba(255,255,255,.35)", textAlign: "right", flexShrink: 0, marginLeft: 14 }}>
                    <div>Programa {progAtual + 1} / {programas.length}</div>
                    <div style={{ color: "#00c9a7", fontWeight: 700, marginTop: 3 }}>{concluidas} / {total} tentativas</div>
                  </div>
                </div>

                {/* Barra de progresso do programa */}
                <div style={{ height: 6, background: "rgba(255,255,255,.08)", borderRadius: 50, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${pctProg}%`, background: "linear-gradient(90deg,#00c9a7,#7bed9f)", transition: "width .4s ease" }} />
                </div>
              </div>

              {/* SD e estímulo atual */}
              <div style={{ ...gcard, padding: 20 }}>
                <div style={{ fontSize: ".62rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".09em", color: "rgba(255,255,255,.4)", marginBottom: 8 }}>Estímulo discriminativo (SD)</div>
                <div style={{ fontSize: ".85rem", color: "rgba(255,255,255,.65)", marginBottom: 18, lineHeight: 1.55 }}>{prog.sd}</div>

                {concluidas < total ? (
                  <>
                    <div style={{ fontSize: ".62rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".09em", color: "rgba(255,255,255,.4)", marginBottom: 8 }}>Estímulo desta tentativa</div>
                    <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#00c9a7", marginBottom: 18, padding: "12px 16px", background: "rgba(0,201,167,.08)", border: "1px solid rgba(0,201,167,.15)", borderRadius: 10 }}>
                      {tentAtual.estimulo}
                    </div>

                    {/* Nível de dica */}
                    <div style={{ fontSize: ".62rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".09em", color: "rgba(255,255,255,.4)", marginBottom: 8 }}>Nível de dica</div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 20 }}>
                      {prog.nivel_dica.map((d, i) => (
                        <button key={d} onClick={() => setTentAtual(t => ({ ...t, dica: i }))} style={{
                          padding: "6px 12px", borderRadius: 6, border: `1px solid ${tentAtual.dica === i ? "#00c9a7" : "rgba(255,255,255,.1)"}`,
                          background: tentAtual.dica === i ? "rgba(0,201,167,.12)" : "transparent",
                          color: tentAtual.dica === i ? "#00c9a7" : "rgba(255,255,255,.45)",
                          fontSize: ".72rem", fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-sans)",
                        }}>{d}</button>
                      ))}
                    </div>

                    {/* Botões de registro */}
                    <div style={{ fontSize: ".62rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".09em", color: "rgba(255,255,255,.4)", marginBottom: 10 }}>Registrar resposta</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                      {(Object.entries(RESULTADO_CONFIG) as [Resultado, typeof RESULTADO_CONFIG[Resultado]][]).map(([key, cfg]) => (
                        <button key={key} onClick={() => registrarTentativa(key)} style={{
                          padding: "14px", borderRadius: 10, border: `1px solid ${cfg.cor}44`,
                          background: cfg.bg, color: cfg.cor,
                          fontFamily: "var(--font-sans)", fontWeight: 700, fontSize: ".82rem",
                          cursor: "pointer", transition: "all .2s",
                        }}
                        onMouseEnter={e => (e.currentTarget.style.borderColor = cfg.cor)}
                        onMouseLeave={e => (e.currentTarget.style.borderColor = `${cfg.cor}44`)}
                        >{cfg.label}</button>
                      ))}
                    </div>

                    {/* Obs da tentativa */}
                    <div style={{ marginTop: 14 }}>
                      <div style={{ fontSize: ".62rem", fontWeight: 600, color: "rgba(255,255,255,.35)", marginBottom: 5 }}>Observação (opcional)</div>
                      <input value={tentAtual.obs} onChange={e => setTentAtual(t => ({ ...t, obs: e.target.value }))} placeholder="Comportamento observado..." style={input} />
                    </div>
                  </>
                ) : (
                  <div style={{ textAlign: "center", padding: "20px 0" }}>
                    <div style={{ fontSize: "2rem", marginBottom: 10 }}>✓</div>
                    <div style={{ fontSize: ".9rem", fontWeight: 700, color: "#00c9a7", marginBottom: 8 }}>Programa concluído</div>
                    <div style={{ fontSize: ".8rem", color: "rgba(255,255,255,.5)", marginBottom: 20 }}>Taxa de acerto: {taxaAcerto}%</div>
                    {progAtual < programas.length - 1 ? (
                      <button onClick={proximoPrograma} style={{ padding: "12px 24px", borderRadius: 8, border: "none", background: "linear-gradient(135deg,#00c9a7,#0f8f7a)", color: "#07111f", fontWeight: 800, fontSize: ".85rem", cursor: "pointer", fontFamily: "var(--font-sans)" }}>
                        Próximo programa →
                      </button>
                    ) : (
                      <button onClick={encerrarSessao} style={{ padding: "12px 24px", borderRadius: 8, border: "none", background: "linear-gradient(135deg,#1e90ff,#7c3aed)", color: "white", fontWeight: 800, fontSize: ".85rem", cursor: "pointer", fontFamily: "var(--font-sans)" }}>
                        Encerrar sessão
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Ações da sessão */}
              {concluidas < total && (
                <div style={{ display: "flex", gap: 10 }}>
                  {progAtual < programas.length - 1 && (
                    <button onClick={proximoPrograma} style={{ flex: 1, padding: "11px", borderRadius: 8, border: "1px solid rgba(255,255,255,.12)", background: "transparent", color: "rgba(255,255,255,.6)", fontFamily: "var(--font-sans)", fontWeight: 600, fontSize: ".8rem", cursor: "pointer" }}>
                      Pular para próximo
                    </button>
                  )}
                  <button onClick={encerrarSessao} style={{ flex: 1, padding: "11px", borderRadius: 8, border: "1px solid rgba(239,68,68,.2)", background: "rgba(239,68,68,.06)", color: "#f87171", fontFamily: "var(--font-sans)", fontWeight: 600, fontSize: ".8rem", cursor: "pointer" }}>
                    Encerrar sessão
                  </button>
                </div>
              )}
            </div>

            {/* PAINEL LATERAL */}
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

              {/* Métricas em tempo real */}
              <div style={{ ...gcard, padding: 18 }}>
                <div style={{ fontSize: ".62rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".09em", color: "rgba(255,255,255,.4)", marginBottom: 12 }}>Métricas — {prog.nome.split(" ")[0]}</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
                  {[
                    { label:"Tentativas",  val:`${concluidas}/${total}`, cor:"white" },
                    { label:"Taxa acerto", val:`${taxaAcerto}%`,         cor:"#00c9a7" },
                    { label:"Corretas",    val:acertos,                  cor:"#00c9a7" },
                    { label:"Erros",       val:erros,                    cor:"#ef4444" },
                    { label:"Aproximação", val:aprox,                    cor:"#f59e0b" },
                    { label:"Dica atual",  val:prog.nivel_dica[prog.nivel_atual], cor:"#7bed9f" },
                  ].map(m => (
                    <div key={m.label} style={{ background: "rgba(255,255,255,.04)", borderRadius: 8, padding: "8px 10px" }}>
                      <div style={{ fontSize: ".58rem", color: "rgba(255,255,255,.3)", marginBottom: 2 }}>{m.label}</div>
                      <div style={{ fontSize: ".95rem", fontWeight: 800, color: m.cor }}>{m.val}</div>
                    </div>
                  ))}
                </div>

                {/* Dots de tentativas */}
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                  {prog.tentativas.map((t, i) => (
                    <div key={i} title={`${t.estimulo}: ${RESULTADO_CONFIG[t.resultado].label}`} style={{
                      width: 20, height: 20, borderRadius: "50%",
                      background: RESULTADO_CONFIG[t.resultado].cor,
                      opacity: .85, cursor: "help",
                    }} />
                  ))}
                  {Array.from({ length: total - concluidas }, (_, i) => (
                    <div key={`empty-${i}`} style={{ width: 20, height: 20, borderRadius: "50%", background: "rgba(255,255,255,.1)" }} />
                  ))}
                </div>
              </div>

              {/* Histórico de tentativas */}
              {concluidas > 0 && (
                <div style={{ ...gcard, padding: 18 }}>
                  <div style={{ fontSize: ".62rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".09em", color: "rgba(255,255,255,.4)", marginBottom: 12 }}>Tentativas registradas</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 220, overflowY: "auto" }}>
                    {[...prog.tentativas].reverse().map((t, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", background: "rgba(255,255,255,.03)", borderRadius: 8 }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: RESULTADO_CONFIG[t.resultado].cor, flexShrink: 0 }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: ".72rem", fontWeight: 600 }}>{t.estimulo}</div>
                          <div style={{ fontSize: ".62rem", color: "rgba(255,255,255,.35)" }}>Dica: {prog.nivel_dica[t.dica]}</div>
                        </div>
                        <div style={{ fontSize: ".65rem", color: RESULTADO_CONFIG[t.resultado].cor, flexShrink: 0 }}>{RESULTADO_CONFIG[t.resultado].label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Critério de domínio */}
              <div style={{ ...gcard, padding: 16 }}>
                <div style={{ fontSize: ".62rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".09em", color: "rgba(255,255,255,.4)", marginBottom: 8 }}>Critério de domínio</div>
                <div style={{ fontSize: ".78rem", color: "rgba(255,255,255,.6)", lineHeight: 1.55 }}>{prog.criterio}</div>
                <div style={{ marginTop: 10, height: 5, background: "rgba(255,255,255,.08)", borderRadius: 50, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${taxaAcerto}%`, background: taxaAcerto >= 80 ? "#00c9a7" : taxaAcerto >= 50 ? "#f59e0b" : "#ef4444", transition: "width .4s" }} />
                </div>
                <div style={{ fontSize: ".65rem", color: "rgba(255,255,255,.35)", marginTop: 4, textAlign: "right" }}>{taxaAcerto}% / 80%</div>
              </div>

            </div>
          </div>
        )}

        {/* ── FASE 3: ENCERRAMENTO ── */}
        {fase === "encerramento" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 600, margin: "0 auto" }}>
            <div style={{ textAlign: "center", padding: "10px 0 20px" }}>
              <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>✓</div>
              <div style={{ fontSize: "1.4rem", fontWeight: 800, marginBottom: 6 }}>Sessão encerrada</div>
              <div style={{ fontSize: ".85rem", color: "rgba(255,255,255,.5)" }}>{PACIENTE.nome} · {duracao} minutos</div>
            </div>

            {/* Resumo por programa */}
            {programas.map(p => {
              const ac = p.tentativas.filter(t => t.resultado === "correta").length;
              const tot = p.tentativas.length;
              const tx = tot > 0 ? Math.round((ac / tot) * 100) : 0;
              return (
                <div key={p.id} style={{ ...gcard, padding: 18 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                    <div>
                      <div style={{ fontSize: ".88rem", fontWeight: 700 }}>{p.nome}</div>
                      <div style={{ fontSize: ".72rem", color: "rgba(255,255,255,.45)" }}>{p.operante} · {tot} tentativas</div>
                    </div>
                    <div style={{ fontSize: "1.4rem", fontWeight: 800, color: tx >= 80 ? "#00c9a7" : tx >= 50 ? "#f59e0b" : "#ef4444" }}>{tx}%</div>
                  </div>
                  <div style={{ height: 5, background: "rgba(255,255,255,.08)", borderRadius: 50, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${tx}%`, background: tx >= 80 ? "#00c9a7" : tx >= 50 ? "#f59e0b" : "#ef4444" }} />
                  </div>
                  {tx >= 80 && (
                    <div style={{ marginTop: 8, fontSize: ".72rem", color: "#00c9a7", fontWeight: 700 }}>
                      ✓ Próximo de critério — considerar avançar o nível
                    </div>
                  )}
                </div>
              );
            })}

            {/* Observações gerais */}
            <div style={{ ...gcard, padding: 18 }}>
              <div style={{ fontSize: ".65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".09em", color: "rgba(255,255,255,.4)", marginBottom: 8 }}>Observações gerais da sessão</div>
              <textarea value={obsGeral} onChange={e => setObsGeral(e.target.value)} rows={3} placeholder="Comportamento geral, humor, adesão, eventos relevantes..." style={{ ...input, resize: "none" }} />
            </div>

            {/* Dados atualizados no Care */}
            <div style={{ background: "linear-gradient(135deg,rgba(0,201,167,.07),rgba(30,144,255,.04))", border: "1px solid rgba(0,201,167,.15)", borderRadius: 14, padding: 16 }}>
              <div style={{ fontSize: ".72rem", color: "#00c9a7", fontWeight: 700, marginBottom: 6 }}>🔗 FractaCare atualizado</div>
              <div style={{ fontSize: ".8rem", color: "rgba(255,255,255,.55)", lineHeight: 1.65 }}>
                Os dados desta sessão alimentaram o radar de {PACIENTE.nome} no FractaCare. A família poderá ver o progresso atualizado em tempo real.
              </div>
            </div>

            <div style={{ display: "flex", gap: 12 }}>
              <button style={{ flex: 1, padding: "14px", borderRadius: 10, border: "1px solid rgba(255,255,255,.12)", background: "transparent", color: "rgba(255,255,255,.7)", fontFamily: "var(--font-sans)", fontWeight: 700, fontSize: ".88rem", cursor: "pointer" }}>
                Salvar e exportar PDF
              </button>
              <Link href="/clinic/dashboard" style={{ flex: 1, padding: "14px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#00c9a7,#0f8f7a)", color: "#07111f", fontWeight: 800, fontSize: ".88rem", textDecoration: "none", textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center" }}>
                Voltar ao painel
              </Link>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
