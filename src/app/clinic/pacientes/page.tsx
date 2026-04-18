"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useClinicContext } from "../layout";

// ─── TIPOS ───────────────────────────────────────────────────────────────────
type StatusPaciente = "ativo" | "alerta" | "pausado";
type FiltroAtivo    = "todos" | "alerta" | "hoje" | "pausado";

interface Paciente {
  id: string;
  nome: string;
  iniciais: string;
  gradient: string;
  idade: number;
  diagnostico: string;
  taxaGeral: number;
  sessoesMes: number;
  programasAtivos: number;
  dominios: string[];
  ultimaSessao: string;
  proximaSessao: string | null;
  status: StatusPaciente;
  alertas: { nivel: "high" | "medium" | "low"; texto: string }[];
  radarMini: { label: string; val: number }[];
  semSupervisor: boolean;
  cuidadorAtivo: boolean;
}

// ─── MOCK ─────────────────────────────────────────────────────────────────────
const PACIENTES: Paciente[] = [
  {
    id: "1",
    nome: "Lucas Carvalho",
    iniciais: "LC",
    gradient: "linear-gradient(135deg,#1D9E75,#378ADD)",
    idade: 4,
    diagnostico: "TEA — Nível 2",
    taxaGeral: 78,
    sessoesMes: 8,
    programasAtivos: 3,
    dominios: ["Comunicação", "Espera", "Tato"],
    ultimaSessao: "hoje",
    proximaSessao: "09:00",
    status: "alerta",
    alertas: [
      { nivel: "high",   texto: "Sem evolução em Espera há 3 sessões" },
      { nivel: "medium", texto: "Mando próximo de critério — avaliar avanço" },
    ],
    radarMini: [
      { label: "Com", val: 78 }, { label: "Soc", val: 65 },
      { label: "Ate", val: 55 }, { label: "Reg", val: 42 },
    ],
    semSupervisor: false,
    cuidadorAtivo: true,
  },
  {
    id: "2",
    nome: "Maria Santos",
    iniciais: "MS",
    gradient: "linear-gradient(135deg,#378ADD,#8B7FE8)",
    idade: 6,
    diagnostico: "TEA — Nível 1",
    taxaGeral: 61,
    sessoesMes: 6,
    programasAtivos: 2,
    dominios: ["Prontidão", "Mando"],
    ultimaSessao: "2 dias atrás",
    proximaSessao: "14:00",
    status: "ativo",
    alertas: [
      { nivel: "low", texto: "Atenção em crescimento — boa janela para novos programas" },
    ],
    radarMini: [
      { label: "Com", val: 61 }, { label: "Soc", val: 70 },
      { label: "Ate", val: 58 }, { label: "Reg", val: 50 },
    ],
    semSupervisor: true,
    cuidadorAtivo: true,
  },
  {
    id: "3",
    nome: "Rafael Pinto",
    iniciais: "RP",
    gradient: "linear-gradient(135deg,#8B7FE8,#E05A4B)",
    idade: 5,
    diagnostico: "TEA — Nível 2",
    taxaGeral: 85,
    sessoesMes: 10,
    programasAtivos: 4,
    dominios: ["Atenção", "Tato", "Social"],
    ultimaSessao: "ontem",
    proximaSessao: "16:30",
    status: "ativo",
    alertas: [],
    radarMini: [
      { label: "Com", val: 85 }, { label: "Soc", val: 80 },
      { label: "Ate", val: 75 }, { label: "Reg", val: 68 },
    ],
    semSupervisor: false,
    cuidadorAtivo: false,
  },
  {
    id: "4",
    nome: "Beatriz Lima",
    iniciais: "BL",
    gradient: "linear-gradient(135deg,#4d6d8a,#378ADD)",
    idade: 7,
    diagnostico: "TEA — Nível 3",
    taxaGeral: 52,
    sessoesMes: 4,
    programasAtivos: 2,
    dominios: ["Fuga", "NET"],
    ultimaSessao: "5 dias atrás",
    proximaSessao: null,
    status: "pausado",
    alertas: [
      { nivel: "high",   texto: "Programa travado há 4 sessões — revisar protocolo" },
      { nivel: "high",   texto: "Baixa adesão da família — 4 sessões no mês" },
    ],
    radarMini: [
      { label: "Com", val: 38 }, { label: "Soc", val: 45 },
      { label: "Ate", val: 32 }, { label: "Reg", val: 28 },
    ],
    semSupervisor: true,
    cuidadorAtivo: false,
  },
  {
    id: "5",
    nome: "Pedro Gomes",
    iniciais: "PG",
    gradient: "linear-gradient(135deg,#EF9F27,#E05A4B)",
    idade: 3,
    diagnostico: "TEA — Nível 2",
    taxaGeral: 91,
    sessoesMes: 9,
    programasAtivos: 3,
    dominios: ["Mando", "Imitação", "Regulação"],
    ultimaSessao: "hoje",
    proximaSessao: null,
    status: "ativo",
    alertas: [
      { nivel: "medium", texto: "2 programas próximos de critério — planejar próxima fase" },
    ],
    radarMini: [
      { label: "Com", val: 91 }, { label: "Soc", val: 88 },
      { label: "Ate", val: 82 }, { label: "Reg", val: 79 },
    ],
    semSupervisor: false,
    cuidadorAtivo: true,
  },
];

// ─── CONSTANTES ──────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  ativo:   { label: "Ativo",   cor: "#1D9E75", bg: "rgba(29,158,117,.1)",  borda: "rgba(29,158,117,.25)" },
  alerta:  { label: "Alerta",  cor: "#EF9F27", bg: "rgba(239,159,39,.1)",  borda: "rgba(239,159,39,.25)" },
  pausado: { label: "Pausado", cor: "#4d6d8a", bg: "rgba(77,109,138,.1)",  borda: "rgba(26,58,92,.4)"    },
};
const ALERTA_COR = { high: "#E05A4B", medium: "#EF9F27", low: "#1D9E75" };

// ─── PAGE ────────────────────────────────────────────────────────────────────
export default function PacientesPage() {
  const { terapeuta } = useClinicContext();
  const nivel = terapeuta?.nivel ?? "coordenador";

  const [busca,   setBusca]   = useState("");
  const [filtro,  setFiltro]  = useState<FiltroAtivo>("todos");

  const pacientesFiltrados = useMemo(() => {
    return PACIENTES.filter(p => {
      const matchBusca = p.nome.toLowerCase().includes(busca.toLowerCase()) ||
                         p.diagnostico.toLowerCase().includes(busca.toLowerCase()) ||
                         p.dominios.some(d => d.toLowerCase().includes(busca.toLowerCase()));
      const matchFiltro =
        filtro === "todos"   ? true :
        filtro === "alerta"  ? p.alertas.some(a => a.nivel === "high" || a.nivel === "medium") :
        filtro === "hoje"    ? p.ultimaSessao === "hoje" :
        filtro === "pausado" ? p.status === "pausado" : true;
      return matchBusca && matchFiltro;
    });
  }, [busca, filtro]);

  const stats = useMemo(() => ({
    total:   PACIENTES.length,
    alertas: PACIENTES.filter(p => p.alertas.some(a => a.nivel === "high")).length,
    hoje:    PACIENTES.filter(p => p.ultimaSessao === "hoje").length,
    pausados:PACIENTES.filter(p => p.status === "pausado").length,
  }), []);

  // ── CSS ────────────────────────────────────────────────────────────────────
  const card: React.CSSProperties = {
    background: "rgba(13,32,53,.75)",
    border: "1px solid rgba(70,120,180,.5)",
    borderRadius: 14,
    backdropFilter: "blur(8px)",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* ── HEADER ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#e8f0f8", margin: 0, marginBottom: 4 }}>Pacientes</h1>
          <div style={{ fontSize: ".75rem", color: "rgba(138,168,200,.5)" }}>{stats.total} pacientes · {stats.hoje} com sessão hoje</div>
        </div>
        {nivel === "supervisor" && (
          <button style={{ padding: "9px 18px", borderRadius: 9, border: "none", background: "linear-gradient(135deg,#1D9E75,#0f8f7a)", color: "#07111f", fontWeight: 700, fontSize: ".82rem", cursor: "pointer", fontFamily: "var(--font-sans)" }}>
            + Novo paciente
          </button>
        )}
      </div>

      {/* ── KPIs ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 10 }}>
        {[
          { l: "Total",          v: stats.total,    c: "#e8f0f8", filtro: "todos"   as FiltroAtivo },
          { l: "Com alerta",     v: stats.alertas,  c: "#E05A4B", filtro: "alerta"  as FiltroAtivo },
          { l: "Sessão hoje",    v: stats.hoje,     c: "#1D9E75", filtro: "hoje"    as FiltroAtivo },
          { l: "Pausados",       v: stats.pausados, c: "#4d6d8a", filtro: "pausado" as FiltroAtivo },
        ].map(k => (
          <button key={k.l} onClick={() => setFiltro(filtro === k.filtro ? "todos" : k.filtro)} style={{
            ...card,
            padding: "14px 16px", border: `1px solid ${filtro === k.filtro ? k.c + "44" : "rgba(26,58,92,.5)"}`,
            background: filtro === k.filtro ? `${k.c}11` : "rgba(13,32,53,.75)",
            cursor: "pointer", textAlign: "left", fontFamily: "var(--font-sans)",
            transition: "all .15s",
          }}>
            <div style={{ fontSize: ".65rem", color: "rgba(170,210,245,.88)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 6 }}>{k.l}</div>
            <div style={{ fontSize: "1.6rem", fontWeight: 800, color: k.c, letterSpacing: "-.02em", lineHeight: 1 }}>{k.v}</div>
          </button>
        ))}
      </div>

      {/* ── BUSCA + FILTROS ── */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
          <svg style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", opacity: .4 }} width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#e8f0f8" strokeWidth="1.5"><circle cx="6.5" cy="6.5" r="5"/><path d="M11 11l3 3"/></svg>
          <input
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Buscar por nome, diagnóstico ou domínio..."
            style={{
              width: "100%", boxSizing: "border-box" as const,
              background: "rgba(13,32,53,.75)", border: "1px solid rgba(70,120,180,.5)",
              borderRadius: 9, padding: "9px 12px 9px 32px",
              color: "#e8f0f8", fontFamily: "var(--font-sans)", fontSize: ".82rem",
              outline: "none",
            }}
          />
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {(["todos","alerta","hoje","pausado"] as FiltroAtivo[]).map(f => (
            <button key={f} onClick={() => setFiltro(f)} style={{
              padding: "8px 14px", borderRadius: 8,
              border: `1px solid ${filtro === f ? "rgba(29,158,117,.4)" : "rgba(26,58,92,.5)"}`,
              background: filtro === f ? "rgba(29,158,117,.1)" : "transparent",
              color: filtro === f ? "#1D9E75" : "rgba(138,168,200,.5)",
              fontFamily: "var(--font-sans)", fontWeight: filtro === f ? 600 : 400,
              fontSize: ".78rem", cursor: "pointer",
            }}>
              {f === "todos" ? "Todos" : f === "alerta" ? "Com alerta" : f === "hoje" ? "Hoje" : "Pausados"}
            </button>
          ))}
        </div>
      </div>

      {/* ── RESULTADO ── */}
      {pacientesFiltrados.length === 0 ? (
        <div style={{ ...card, padding: 40, textAlign: "center" }}>
          <div style={{ fontSize: "2rem", marginBottom: 12 }}>🔍</div>
          <div style={{ fontSize: ".88rem", color: "rgba(138,168,200,.5)" }}>Nenhum paciente encontrado para "{busca}"</div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 14 }}>
          {pacientesFiltrados.map(p => {
            const st = STATUS_CONFIG[p.status];
            const temAlertaAlto = p.alertas.some(a => a.nivel === "high");
            return (
              <div key={p.id} style={{
                ...card,
                border: `1px solid ${temAlertaAlto ? "rgba(224,90,75,.3)" : "rgba(26,58,92,.5)"}`,
                display: "flex", flexDirection: "column",
                transition: "border-color .15s",
              }}>

                {/* Topo do card */}
                <div style={{ padding: "18px 18px 14px", display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <div style={{ width: 44, height: 44, borderRadius: "50%", background: p.gradient, display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".78rem", fontWeight: 800, color: "#fff", flexShrink: 0 }}>
                    {p.iniciais}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                      <span style={{ fontSize: ".92rem", fontWeight: 700, color: "#e8f0f8", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.nome}</span>
                      <span style={{ flexShrink: 0, fontSize: ".6rem", background: st.bg, border: `1px solid ${st.borda}`, color: st.cor, borderRadius: 20, padding: "2px 7px", fontWeight: 600 }}>{st.label}</span>
                    </div>
                    <div style={{ fontSize: ".72rem", color: "rgba(138,168,200,.5)" }}>{p.idade} anos · {p.diagnostico}</div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontSize: "1.4rem", fontWeight: 800, color: p.taxaGeral >= 80 ? "#1D9E75" : p.taxaGeral >= 60 ? "#EF9F27" : "#E05A4B", lineHeight: 1 }}>{p.taxaGeral}%</div>
                    <div style={{ fontSize: ".6rem", color: "rgba(160,200,235,.75)", marginTop: 2 }}>taxa geral</div>
                  </div>
                </div>

                {/* Barra de progresso */}
                <div style={{ padding: "0 18px", marginBottom: 14 }}>
                  <div style={{ height: 4, background: "rgba(26,58,92,.5)", borderRadius: 50, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${p.taxaGeral}%`, background: p.taxaGeral >= 80 ? "#1D9E75" : p.taxaGeral >= 60 ? "#EF9F27" : "#E05A4B", transition: "width .5s ease" }} />
                  </div>
                </div>

                {/* Mini radar bars */}
                <div style={{ padding: "0 18px", marginBottom: 14, display: "flex", gap: 8 }}>
                  {p.radarMini.map(r => (
                    <div key={r.label} style={{ flex: 1, textAlign: "center" }}>
                      <div style={{ height: 28, background: "rgba(20,55,110,.55)", borderRadius: 4, overflow: "hidden", display: "flex", alignItems: "flex-end", marginBottom: 3 }}>
                        <div style={{ width: "100%", height: `${r.val}%`, background: r.val >= 70 ? "rgba(29,158,117,.6)" : r.val >= 50 ? "rgba(239,159,39,.6)" : "rgba(224,90,75,.5)", transition: "height .5s" }} />
                      </div>
                      <div style={{ fontSize: ".68rem", color: "rgba(180,215,245,.9)", fontWeight: 700 }}>{r.label}</div>
                    </div>
                  ))}
                </div>

                {/* Domínios */}
                <div style={{ padding: "0 18px", marginBottom: 14, display: "flex", gap: 5, flexWrap: "wrap" }}>
                  {p.dominios.map(d => (
                    <span key={d} style={{ fontSize: ".65rem", background: "rgba(20,55,110,.65)", border: "1px solid rgba(26,58,92,.6)", color: "rgba(180,215,245,.92)", borderRadius: 20, padding: "2px 8px" }}>{d}</span>
                  ))}
                  <span style={{ fontSize: ".65rem", color: "rgba(160,200,235,.82)", padding: "2px 4px" }}>{p.programasAtivos} prog. · {p.sessoesMes} sessões/mês</span>
                </div>

                {/* Alertas */}
                {p.alertas.length > 0 && (
                  <div style={{ padding: "0 18px", marginBottom: 14, display: "flex", flexDirection: "column", gap: 5 }}>
                    {p.alertas.slice(0, nivel === "terapeuta" ? 1 : 2).map((a, i) => (
                      <div key={i} style={{ display: "flex", gap: 7, alignItems: "flex-start", padding: "6px 10px", background: `${ALERTA_COR[a.nivel]}0d`, border: `1px solid ${ALERTA_COR[a.nivel]}33`, borderRadius: 8 }}>
                        <div style={{ width: 6, height: 6, borderRadius: "50%", background: ALERTA_COR[a.nivel], flexShrink: 0, marginTop: 4 }} />
                        <span style={{ fontSize: ".72rem", color: "rgba(138,168,200,.75)", lineHeight: 1.45 }}>{a.texto}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Info sessão */}
                <div style={{ padding: "0 18px", marginBottom: 16, display: "flex", gap: 14 }}>
                  <div>
                    <div style={{ fontSize: ".58rem", color: "rgba(138,168,200,.35)", marginBottom: 2 }}>Última sessão</div>
                    <div style={{ fontSize: ".75rem", color: p.ultimaSessao === "hoje" ? "#1D9E75" : "#e8f0f8", fontWeight: p.ultimaSessao === "hoje" ? 600 : 400 }}>{p.ultimaSessao}</div>
                  </div>
                  {p.proximaSessao && (
                    <div>
                      <div style={{ fontSize: ".58rem", color: "rgba(138,168,200,.35)", marginBottom: 2 }}>Próxima</div>
                      <div style={{ fontSize: ".75rem", color: "#378ADD", fontWeight: 600 }}>{p.proximaSessao}</div>
                    </div>
                  )}
                  <div style={{ marginLeft: "auto", display: "flex", gap: 5, alignItems: "center" }}>
                    {p.cuidadorAtivo && (
                      <span style={{ fontSize: ".6rem", background: "rgba(55,138,221,.1)", border: "1px solid rgba(55,138,221,.2)", color: "#378ADD", borderRadius: 20, padding: "2px 7px" }}>Care ativo</span>
                    )}
                    {p.semSupervisor && nivel !== "terapeuta" && (
                      <span style={{ fontSize: ".6rem", background: "rgba(239,159,39,.08)", border: "1px solid rgba(239,159,39,.2)", color: "#EF9F27", borderRadius: 20, padding: "2px 7px" }}>Sem supervisor</span>
                    )}
                  </div>
                </div>

                {/* Ações */}
                <div style={{ padding: "12px 18px", borderTop: "1px solid rgba(26,58,92,.3)", display: "flex", gap: 8 }}>
                  <Link href={`/clinic/paciente/${p.id}`} style={{
                    flex: 1, padding: "8px", borderRadius: 8,
                    border: "1px solid rgba(80,140,200,.5)", background: "rgba(20,55,100,.5)",
                    color: "#c8e4f8", fontFamily: "var(--font-sans)",
                    fontWeight: 600, fontSize: ".78rem", textDecoration: "none",
                    textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                  }}>
                    <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="6" r="3"/><path d="M2 14c0-3 2.7-5 6-5s6 2 6 5"/></svg>
                    Ver perfil
                  </Link>
                  <Link href={`/clinic/sessao?pacienteId=${p.id}`} style={{
                    flex: 1, padding: "8px", borderRadius: 8,
                    border: "none", background: "linear-gradient(135deg,#1D9E75,#0f8f7a)",
                    color: "#07111f", fontFamily: "var(--font-sans)",
                    fontWeight: 700, fontSize: ".78rem", textDecoration: "none",
                    textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                  }}>
                    <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="8" cy="8" r="6"/><path d="M8 5v3l2 1.5"/></svg>
                    Iniciar sessão
                  </Link>
                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
