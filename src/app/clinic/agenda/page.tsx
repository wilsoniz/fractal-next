"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useClinicContext } from "../layout";

// ─── TIPOS ───────────────────────────────────────────────────────────────────
type Visao       = "semana" | "dia" | "mes";
type StatusSessao = "pendente" | "aguardando_responsavel" | "confirmada" | "realizada" | "cancelada" | "faltou";
type Modalidade  = "presencial" | "domiciliar" | "teleconsulta";

interface Contrato {
  id: string;
  pacienteId: string;
  pacienteNome: string;
  pacienteIniciais: string;
  gradient: string;
  cor: string;
  horasPorSemana: number;
  duracaoMeses: number;
  inicioContrato: string; // ISO date
  valorSessao: number;
  modalidade: Modalidade;
  diasSemana: number[]; // 0=dom, 1=seg...
  horario: string; // "HH:MM"
  duracaoMin: number;
  terapeuta: string;
  supervisorVinculado: boolean;
}

interface Sessao {
  id: string;
  contratoId: string;
  pacienteId: string;
  pacienteNome: string;
  pacienteIniciais: string;
  gradient: string;
  cor: string;
  data: string; // "YYYY-MM-DD"
  horario: string; // "HH:MM"
  duracaoMin: number;
  modalidade: Modalidade;
  local: string;
  status: StatusSessao;
  confirmadoTerapeuta: boolean;
  confirmadoResponsavel: boolean;
  motivoCancelamento?: string;
  precisaReposicao: boolean;
  observacoes?: string;
  programas: string[];
}

// ─── CONSTANTES ──────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<StatusSessao, { label: string; cor: string; bg: string; borda: string }> = {
  pendente:               { label: "Pendente",        cor: "#4d6d8a", bg: "rgba(77,109,138,.15)",  borda: "rgba(77,109,138,.3)"   },
  aguardando_responsavel: { label: "Aguard. família",  cor: "#EF9F27", bg: "rgba(239,159,39,.15)",  borda: "rgba(239,159,39,.3)"   },
  confirmada:             { label: "Confirmada",       cor: "#1D9E75", bg: "rgba(29,158,117,.15)",  borda: "rgba(29,158,117,.3)"   },
  realizada:              { label: "Realizada",        cor: "#378ADD", bg: "rgba(55,138,221,.15)",  borda: "rgba(55,138,221,.3)"   },
  cancelada:              { label: "Cancelada",        cor: "#E05A4B", bg: "rgba(224,90,75,.12)",   borda: "rgba(224,90,75,.3)"    },
  faltou:                 { label: "Faltou",           cor: "#8B7FE8", bg: "rgba(139,127,232,.12)", borda: "rgba(139,127,232,.3)"  },
};

const MODALIDADE_ICON: Record<Modalidade, string> = {
  presencial:    "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
  domiciliar:    "M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7",
  teleconsulta:  "M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z",
};

const DIAS_SEMANA = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];
const MESES_PT = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const MESES_CURTO = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

// ─── MOCK DATA ────────────────────────────────────────────────────────────────
const CONTRATOS: Contrato[] = [
  { id: "c1", pacienteId: "1", pacienteNome: "Lucas Carvalho",  pacienteIniciais: "LC", gradient: "linear-gradient(135deg,#1D9E75,#378ADD)", cor: "#1D9E75", horasPorSemana: 4, duracaoMeses: 12, inicioContrato: "2025-01-15", valorSessao: 250, modalidade: "presencial",   diasSemana: [1,3,5], horario: "09:00", duracaoMin: 60, terapeuta: "Dra. Carolina Amaral", supervisorVinculado: true  },
  { id: "c2", pacienteId: "2", pacienteNome: "Maria Santos",    pacienteIniciais: "MS", gradient: "linear-gradient(135deg,#378ADD,#8B7FE8)", cor: "#378ADD", horasPorSemana: 2, duracaoMeses: 6,  inicioContrato: "2025-02-01", valorSessao: 250, modalidade: "teleconsulta", diasSemana: [2,4],   horario: "14:00", duracaoMin: 60, terapeuta: "Dra. Carolina Amaral", supervisorVinculado: false },
  { id: "c3", pacienteId: "3", pacienteNome: "Rafael Pinto",    pacienteIniciais: "RP", gradient: "linear-gradient(135deg,#8B7FE8,#E05A4B)", cor: "#8B7FE8", horasPorSemana: 3, duracaoMeses: 12, inicioContrato: "2025-01-08", valorSessao: 280, modalidade: "domiciliar",  diasSemana: [1,3,5], horario: "16:30", duracaoMin: 60, terapeuta: "Dra. Carolina Amaral", supervisorVinculado: true  },
  { id: "c4", pacienteId: "4", pacienteNome: "Beatriz Lima",    pacienteIniciais: "BL", gradient: "linear-gradient(135deg,#4d6d8a,#378ADD)", cor: "#4d6d8a", horasPorSemana: 2, duracaoMeses: 12, inicioContrato: "2025-01-13", valorSessao: 250, modalidade: "presencial",   diasSemana: [2,4],   horario: "08:00", duracaoMin: 60, terapeuta: "Dra. Carolina Amaral", supervisorVinculado: false },
  { id: "c5", pacienteId: "5", pacienteNome: "Pedro Gomes",     pacienteIniciais: "PG", gradient: "linear-gradient(135deg,#EF9F27,#E05A4B)", cor: "#EF9F27", horasPorSemana: 4, duracaoMeses: 12, inicioContrato: "2025-01-06", valorSessao: 300, modalidade: "presencial",   diasSemana: [1,3,5], horario: "10:30", duracaoMin: 60, terapeuta: "Dra. Carolina Amaral", supervisorVinculado: true  },
];

// Gera sessões para a semana de 14-20 Abr 2025
function gerarSessoesSemana(dataInicio: Date): Sessao[] {
  const sessoes: Sessao[] = [];
  CONTRATOS.forEach(c => {
    for (let i = 0; i < 7; i++) {
      const dia = new Date(dataInicio);
      dia.setDate(dia.getDate() + i);
      const diaSemana = dia.getDay();
      if (!c.diasSemana.includes(diaSemana)) continue;

      const dataStr = dia.toISOString().slice(0, 10);
      const id = `${c.id}-${dataStr}`;

      // Simula statuses variados
      let status: StatusSessao = "pendente";
      let confT = false, confR = false;
      const hoje = new Date("2025-04-16");
      const sessaoDia = new Date(dataStr);

      if (sessaoDia < hoje) {
        // Passado — maioria realizada
        const rand = Math.abs(c.pacienteId.charCodeAt(0) + i) % 5;
        if (rand === 0) { status = "cancelada"; confT = true; confR = false; }
        else if (rand === 1) { status = "faltou"; confT = true; confR = true; }
        else { status = "realizada"; confT = true; confR = true; }
      } else if (sessaoDia.toDateString() === hoje.toDateString()) {
        // Hoje
        if (c.pacienteId === "1") { status = "confirmada"; confT = true; confR = true; }
        else if (c.pacienteId === "3") { status = "confirmada"; confT = true; confR = true; }
        else { status = "aguardando_responsavel"; confT = true; confR = false; }
      } else {
        // Futuro
        if (c.pacienteId === "2" || c.pacienteId === "4") {
          status = "pendente"; confT = false; confR = false;
        } else {
          status = "aguardando_responsavel"; confT = true; confR = false;
        }
      }

      const localMap: Record<Modalidade, string> = {
        presencial:   "Clínica Fracta — Sala 3",
        domiciliar:   "Residência do paciente",
        teleconsulta: "Google Meet / Link enviado",
      };

      sessoes.push({
        id,
        contratoId: c.id,
        pacienteId: c.pacienteId,
        pacienteNome: c.pacienteNome,
        pacienteIniciais: c.pacienteIniciais,
        gradient: c.gradient,
        cor: c.cor,
        data: dataStr,
        horario: c.horario,
        duracaoMin: c.duracaoMin,
        modalidade: c.modalidade,
        local: localMap[c.modalidade],
        status,
        confirmadoTerapeuta: confT,
        confirmadoResponsavel: confR,
        precisaReposicao: status === "cancelada" || status === "faltou",
        programas: ["Mando funcional", "Atenção ao nome"],
      });
    }
  });
  return sessoes.sort((a, b) => a.horario.localeCompare(b.horario));
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function fmtData(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return `${d.getDate()} ${MESES_CURTO[d.getMonth()]}`;
}
function addDias(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}
function inicioSemana(date: Date): Date {
  const d = new Date(date);
  const dia = d.getDay();
  d.setDate(d.getDate() - dia);
  return d;
}
function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}
function isHoje(dateStr: string): boolean {
  return dateStr === "2025-04-16";
}

// ─── PAGE ────────────────────────────────────────────────────────────────────
export default function AgendaPage() {
  const { terapeuta } = useClinicContext();
  const nivel = terapeuta?.nivel ?? "coordenador";

  const [visao,        setVisao]        = useState<Visao>("semana");
  const [dataReferencia, setDataRef]    = useState(new Date("2025-04-14")); // segunda 14 abr
  const [sessaoAberta,  setSessaoAberta] = useState<Sessao | null>(null);
  const [filtroStatus,  setFiltroStatus] = useState<StatusSessao | "todos">("todos");

  const semanaInicio = useMemo(() => inicioSemana(dataReferencia), [dataReferencia]);
  const diasSemana   = useMemo(() => Array.from({ length: 7 }, (_, i) => addDias(semanaInicio, i)), [semanaInicio]);
  const todasSessoes = useMemo(() => gerarSessoesSemana(semanaInicio), [semanaInicio]);

  const sessoesFiltradas = useMemo(() => {
    if (filtroStatus === "todos") return todasSessoes;
    return todasSessoes.filter(s => s.status === filtroStatus);
  }, [todasSessoes, filtroStatus]);

  // Estatísticas da semana
  const stats = useMemo(() => {
    const confirmadas      = todasSessoes.filter(s => s.status === "confirmada" || s.status === "realizada").length;
    const pendentes        = todasSessoes.filter(s => s.status === "pendente" || s.status === "aguardando_responsavel").length;
    const canceladas       = todasSessoes.filter(s => s.status === "cancelada" || s.status === "faltou").length;
    const reposicoes       = todasSessoes.filter(s => s.precisaReposicao).length;
    const receitaPrevista  = todasSessoes.filter(s => s.status !== "cancelada" && s.status !== "faltou").length * 250;
    return { confirmadas, pendentes, canceladas, reposicoes, receitaPrevista };
  }, [todasSessoes]);

  function navegar(delta: number) {
    if (visao === "semana") setDataRef(d => addDias(d, delta * 7));
    else if (visao === "dia") setDataRef(d => addDias(d, delta));
    else setDataRef(d => { const n = new Date(d); n.setMonth(n.getMonth() + delta); return n; });
  }

  function tituloNav(): string {
    if (visao === "semana") {
      const fim = addDias(semanaInicio, 6);
      return `${fmtData(isoDate(semanaInicio))} – ${fmtData(isoDate(fim))} ${semanaInicio.getFullYear()}`;
    }
    if (visao === "dia") return `${diasSemana[0].getDate()} de ${MESES_PT[dataReferencia.getMonth()]} ${dataReferencia.getFullYear()}`;
    return `${MESES_PT[dataReferencia.getMonth()]} ${dataReferencia.getFullYear()}`;
  }

  // ── CSS ────────────────────────────────────────────────────────────────────
  const card: React.CSSProperties = { background: "rgba(13,32,53,.75)", border: "1px solid rgba(70,120,180,.5)", borderRadius: 14, backdropFilter: "blur(8px)" };
  const lbl: React.CSSProperties  = { fontSize: ".6rem", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: ".09em", color: "rgba(170,210,245,.88)", marginBottom: 6 };

  const HORAS = ["08:00","09:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00","18:00"];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* ── HEADER ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: "1.2rem", fontWeight: 800, color: "#e8f0f8", margin: 0, marginBottom: 4 }}>Agenda</h1>
          <div style={{ fontSize: ".72rem", color: "rgba(160,200,235,.84)" }}>{todasSessoes.length} sessões esta semana · {stats.reposicoes > 0 ? `${stats.reposicoes} reposição(ões) pendente(s)` : "sem reposições pendentes"}</div>
        </div>
        {(nivel === "coordenador" || nivel === "supervisor") && (
          <button style={{ padding: "9px 16px", borderRadius: 9, border: "none", background: "linear-gradient(135deg,#1D9E75,#0f8f7a)", color: "#07111f", fontWeight: 700, fontSize: ".82rem", cursor: "pointer", fontFamily: "var(--font-sans)", display: "flex", alignItems: "center", gap: 6 }}>
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3v10M3 8h10"/></svg>
            Nova sessão avulsa
          </button>
        )}
      </div>

      {/* ── KPIs ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,minmax(0,1fr))", gap: 10 }}>
        {[
          { l: "Confirmadas", v: stats.confirmadas,                      c: "#1D9E75" },
          { l: "Pendentes",   v: stats.pendentes,                        c: "#EF9F27" },
          { l: "Canceladas",  v: stats.canceladas,                       c: "#E05A4B" },
          { l: "Reposições",  v: stats.reposicoes,                       c: stats.reposicoes > 0 ? "#E05A4B" : "#4d6d8a" },
          { l: "Receita prev.",v:`R$ ${stats.receitaPrevista.toLocaleString("pt-BR")}`, c: "#1D9E75" },
        ].map(k => (
          <div key={k.l} style={{ ...card, padding: "12px 14px" }}>
            <div style={{ fontSize: ".58rem", color: "rgba(170,210,245,.88)", textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 5 }}>{k.l}</div>
            <div style={{ fontSize: "1.3rem", fontWeight: 800, color: k.c, letterSpacing: "-.02em" }}>{k.v}</div>
          </div>
        ))}
      </div>

      {/* Alerta de reposições */}
      {stats.reposicoes > 0 && (
        <div style={{ background: "rgba(224,90,75,.08)", border: "1px solid rgba(224,90,75,.25)", borderRadius: 10, padding: "10px 16px", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#E05A4B", flexShrink: 0 }} />
          <span style={{ fontSize: ".78rem", color: "rgba(175,210,240,.95)" }}>
            <strong style={{ color: "#E05A4B" }}>{stats.reposicoes} sessão(ões)</strong> cancelada(s) ou falta — reposição pendente dentro do contrato
          </span>
          <button style={{ marginLeft: "auto", padding: "4px 12px", borderRadius: 6, border: "1px solid rgba(224,90,75,.3)", background: "transparent", color: "#E05A4B", fontFamily: "var(--font-sans)", fontWeight: 600, fontSize: ".72rem", cursor: "pointer" }}>
            Agendar reposição
          </button>
        </div>
      )}

      {/* ── CONTROLES ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>

        {/* Navegação de período */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, ...card, padding: "6px 10px" }}>
          <button onClick={() => navegar(-1)} style={{ width: 28, height: 28, borderRadius: 6, border: "1px solid rgba(70,120,180,.5)", background: "transparent", color: "rgba(160,200,235,.92)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 3L5 8l5 5"/></svg>
          </button>
          <span style={{ fontSize: ".82rem", fontWeight: 600, color: "#e8f0f8", minWidth: 160, textAlign: "center" }}>{tituloNav()}</span>
          <button onClick={() => navegar(1)} style={{ width: 28, height: 28, borderRadius: 6, border: "1px solid rgba(70,120,180,.5)", background: "transparent", color: "rgba(160,200,235,.92)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 3l5 5-5 5"/></svg>
          </button>
          <button onClick={() => setDataRef(new Date("2025-04-14"))} style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid rgba(29,158,117,.3)", background: "rgba(29,158,117,.08)", color: "#1D9E75", fontFamily: "var(--font-sans)", fontWeight: 600, fontSize: ".7rem", cursor: "pointer", marginLeft: 4 }}>
            Hoje
          </button>
        </div>

        {/* Visão */}
        <div style={{ display: "flex", gap: 0, ...card, padding: 4, borderRadius: 10 }}>
          {(["semana","dia","mes"] as Visao[]).map(v => (
            <button key={v} onClick={() => setVisao(v)} style={{
              padding: "6px 14px", borderRadius: 7,
              background: visao === v ? "rgba(29,158,117,.2)" : "transparent",
              border: "none", color: visao === v ? "#1D9E75" : "rgba(160,200,235,.84)",
              fontFamily: "var(--font-sans)", fontWeight: visao === v ? 600 : 400,
              fontSize: ".78rem", cursor: "pointer",
            }}>
              {v === "semana" ? "Semana" : v === "dia" ? "Dia" : "Mês"}
            </button>
          ))}
        </div>

        {/* Filtro de status */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {(["todos", "confirmada", "aguardando_responsavel", "pendente", "realizada", "cancelada"] as (StatusSessao | "todos")[]).map(s => {
            const cfg = s === "todos" ? { label: "Todos", cor: "rgba(160,200,235,.90)", bg: "transparent", borda: "rgba(26,58,92,.5)" } : STATUS_CONFIG[s];
            const ativo = filtroStatus === s;
            return (
              <button key={s} onClick={() => setFiltroStatus(s)} style={{
                padding: "5px 11px", borderRadius: 20,
                border: `1px solid ${ativo ? cfg.cor : "rgba(26,58,92,.4)"}`,
                background: ativo ? cfg.bg : "transparent",
                color: ativo ? cfg.cor : "rgba(170,210,245,.88)",
                fontFamily: "var(--font-sans)", fontSize: ".7rem", fontWeight: ativo ? 600 : 400, cursor: "pointer",
              }}>{s === "todos" ? "Todos" : cfg.label}</button>
            );
          })}
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* VISÃO: SEMANA */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      {visao === "semana" && (
        <div style={{ ...card, overflow: "hidden" }}>
          {/* Header dos dias */}
          <div style={{ display: "grid", gridTemplateColumns: "60px repeat(7,1fr)", borderBottom: "1px solid rgba(26,58,92,.4)" }}>
            <div />
            {diasSemana.map((dia, i) => {
              const dateStr = isoDate(dia);
              const hoje = isHoje(dateStr);
              return (
                <div key={i} style={{ padding: "12px 8px", textAlign: "center", borderLeft: "1px solid rgba(26,58,92,.3)", background: hoje ? "rgba(29,158,117,.06)" : "transparent" }}>
                  <div style={{ fontSize: ".65rem", color: "rgba(170,210,245,.88)", marginBottom: 3 }}>{DIAS_SEMANA[dia.getDay()]}</div>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: hoje ? "#1D9E75" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto", fontSize: ".85rem", fontWeight: hoje ? 700 : 400, color: hoje ? "#07111f" : "#e8f0f8" }}>
                    {dia.getDate()}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Grade de horários */}
          <div style={{ maxHeight: 520, overflowY: "auto" }}>
            {HORAS.map(hora => (
              <div key={hora} style={{ display: "grid", gridTemplateColumns: "60px repeat(7,1fr)", minHeight: 72, borderBottom: "1px solid rgba(26,58,92,.15)" }}>
                <div style={{ padding: "6px 8px", fontSize: ".65rem", color: "rgba(165,208,242,.85)", fontFamily: "monospace", paddingTop: 8 }}>{hora}</div>
                {diasSemana.map((dia, i) => {
                  const dateStr = isoDate(dia);
                  const hoje = isHoje(dateStr);
                  const sessoesDoDia = sessoesFiltradas.filter(s => s.data === dateStr && s.horario === hora);
                  return (
                    <div key={i} style={{ borderLeft: "1px solid rgba(26,58,92,.2)", padding: "4px 5px", background: hoje ? "rgba(29,158,117,.02)" : "transparent", display: "flex", flexDirection: "column", gap: 3 }}>
                      {sessoesDoDia.map(s => {
                        const st = STATUS_CONFIG[s.status];
                        return (
                          <button key={s.id} onClick={() => setSessaoAberta(s)} style={{
                            padding: "5px 8px", borderRadius: 7, border: `1px solid ${st.borda}`,
                            background: st.bg, cursor: "pointer", textAlign: "left",
                            fontFamily: "var(--font-sans)", width: "100%",
                          }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 2 }}>
                              <div style={{ width: 16, height: 16, borderRadius: "50%", background: s.gradient, display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".42rem", fontWeight: 800, color: "#fff", flexShrink: 0 }}>{s.pacienteIniciais}</div>
                              <span style={{ fontSize: ".7rem", fontWeight: 600, color: "#e8f0f8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.pacienteNome.split(" ")[0]}</span>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                              <svg width="8" height="8" viewBox="0 0 16 16" fill="none" stroke={st.cor} strokeWidth="1.5"><path d={MODALIDADE_ICON[s.modalidade]}/></svg>
                              <span style={{ fontSize: ".62rem", color: st.cor, fontWeight: 600 }}>{st.label}</span>
                            </div>
                            {/* Indicador de confirmação */}
                            <div style={{ display: "flex", gap: 3, marginTop: 3 }}>
                              <div style={{ width: 5, height: 5, borderRadius: "50%", background: s.confirmadoTerapeuta ? "#1D9E75" : "rgba(138,168,200,.25)" }} title="Terapeuta" />
                              <div style={{ width: 5, height: 5, borderRadius: "50%", background: s.confirmadoResponsavel ? "#1D9E75" : "rgba(138,168,200,.25)" }} title="Responsável" />
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* VISÃO: DIA */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      {visao === "dia" && (
        <div style={{ ...card, padding: 20 }}>
          <div style={{ fontSize: ".88rem", fontWeight: 700, color: "#e8f0f8", marginBottom: 16 }}>
            {DIAS_SEMANA[dataReferencia.getDay()]}, {dataReferencia.getDate()} de {MESES_PT[dataReferencia.getMonth()]}
            {isHoje(isoDate(dataReferencia)) && <span style={{ marginLeft: 10, fontSize: ".65rem", color: "#1D9E75", fontWeight: 600, background: "rgba(29,158,117,.1)", borderRadius: 20, padding: "2px 8px" }}>Hoje</span>}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {HORAS.map(hora => {
              const sessoesDaHora = sessoesFiltradas.filter(s => s.data === isoDate(dataReferencia) && s.horario === hora);
              return (
                <div key={hora} style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                  <div style={{ width: 44, fontSize: ".72rem", color: "rgba(170,210,245,.88)", fontFamily: "monospace", paddingTop: 8, flexShrink: 0, textAlign: "right" }}>{hora}</div>
                  <div style={{ flex: 1, borderLeft: "2px solid rgba(26,58,92,.3)", paddingLeft: 14, minHeight: 44 }}>
                    {sessoesDaHora.length === 0 ? (
                      <div style={{ height: 44 }} />
                    ) : sessoesDaHora.map(s => {
                      const st = STATUS_CONFIG[s.status];
                      return (
                        <button key={s.id} onClick={() => setSessaoAberta(s)} style={{ width: "100%", padding: "12px 16px", borderRadius: 10, border: `1px solid ${st.borda}`, background: st.bg, cursor: "pointer", textAlign: "left", fontFamily: "var(--font-sans)", marginBottom: 6 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <div style={{ width: 36, height: 36, borderRadius: "50%", background: s.gradient, display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".65rem", fontWeight: 800, color: "#fff", flexShrink: 0 }}>{s.pacienteIniciais}</div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: ".88rem", fontWeight: 700, color: "#e8f0f8" }}>{s.pacienteNome}</div>
                              <div style={{ fontSize: ".7rem", color: "rgba(160,200,235,.90)" }}>{s.horario} · {s.duracaoMin}min · {s.local}</div>
                            </div>
                            <div>
                              <div style={{ fontSize: ".65rem", color: st.cor, background: st.bg, border: `1px solid ${st.borda}`, borderRadius: 20, padding: "3px 9px", fontWeight: 600, marginBottom: 4 }}>{st.label}</div>
                              <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 3, fontSize: ".6rem", color: s.confirmadoTerapeuta ? "#1D9E75" : "rgba(165,208,242,.85)" }}>
                                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor" }} />T
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: 3, fontSize: ".6rem", color: s.confirmadoResponsavel ? "#1D9E75" : "rgba(165,208,242,.85)" }}>
                                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor" }} />R
                                </div>
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* VISÃO: MÊS */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      {visao === "mes" && (
        <div style={{ ...card, overflow: "hidden" }}>
          {/* Header */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", borderBottom: "1px solid rgba(26,58,92,.4)" }}>
            {DIAS_SEMANA.map(d => (
              <div key={d} style={{ padding: "10px 0", textAlign: "center", fontSize: ".65rem", color: "rgba(170,210,245,.88)", fontWeight: 600 }}>{d}</div>
            ))}
          </div>
          {/* Grade */}
          {(() => {
            const ano = dataReferencia.getFullYear();
            const mes = dataReferencia.getMonth();
            const primeiroDia = new Date(ano, mes, 1);
            const ultimoDia   = new Date(ano, mes + 1, 0);
            const offset = primeiroDia.getDay();
            const totalCelulas = offset + ultimoDia.getDate();
            const semanas = Math.ceil(totalCelulas / 7);
            const today = "2025-04-16";

            return Array.from({ length: semanas }, (_, semIdx) => (
              <div key={semIdx} style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", borderBottom: semIdx < semanas - 1 ? "1px solid rgba(26,58,92,.15)" : "none" }}>
                {Array.from({ length: 7 }, (_, diaIdx) => {
                  const celIdx = semIdx * 7 + diaIdx;
                  const diaNum = celIdx - offset + 1;
                  if (diaNum < 1 || diaNum > ultimoDia.getDate()) {
                    return <div key={diaIdx} style={{ minHeight: 80, borderLeft: diaIdx > 0 ? "1px solid rgba(26,58,92,.15)" : "none", background: "rgba(7,17,31,.3)" }} />;
                  }
                  const dateStr = `${ano}-${String(mes + 1).padStart(2, "0")}-${String(diaNum).padStart(2, "0")}`;
                  const sessDia = sessoesFiltradas.filter(s => s.data === dateStr);
                  const isToday = dateStr === today;
                  return (
                    <div key={diaIdx} style={{ minHeight: 80, padding: "6px 7px", borderLeft: diaIdx > 0 ? "1px solid rgba(26,58,92,.15)" : "none", background: isToday ? "rgba(29,158,117,.04)" : "transparent" }}>
                      <div style={{ width: 22, height: 22, borderRadius: "50%", background: isToday ? "#1D9E75" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".72rem", fontWeight: isToday ? 700 : 400, color: isToday ? "#07111f" : "rgba(160,200,235,.90)", marginBottom: 4 }}>
                        {diaNum}
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        {sessDia.slice(0, 3).map(s => {
                          const st = STATUS_CONFIG[s.status];
                          return (
                            <button key={s.id} onClick={() => setSessaoAberta(s)} style={{ padding: "2px 6px", borderRadius: 4, background: st.bg, border: `1px solid ${st.borda}`, cursor: "pointer", textAlign: "left", fontFamily: "var(--font-sans)", width: "100%" }}>
                              <div style={{ fontSize: ".6rem", color: "#e8f0f8", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.pacienteNome.split(" ")[0]}</div>
                            </button>
                          );
                        })}
                        {sessDia.length > 3 && <div style={{ fontSize: ".58rem", color: "rgba(170,210,245,.88)" }}>+{sessDia.length - 3} mais</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            ));
          })()}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* MODAL: DETALHE DA SESSÃO */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      {sessaoAberta && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(7,17,31,.85)", backdropFilter: "blur(6px)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={() => setSessaoAberta(null)}>
          <div style={{ background: "#0d2035", border: "1px solid rgba(26,58,92,.7)", borderRadius: 18, padding: 28, width: "100%", maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            {(() => {
              const s = sessaoAberta;
              const st = STATUS_CONFIG[s.status];
              const contrato = CONTRATOS.find(c => c.id === s.contratoId)!;
              return (
                <>
                  {/* Header */}
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                    <div style={{ width: 44, height: 44, borderRadius: "50%", background: s.gradient, display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".75rem", fontWeight: 800, color: "#fff" }}>{s.pacienteIniciais}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "1rem", fontWeight: 700, color: "#e8f0f8" }}>{s.pacienteNome}</div>
                      <div style={{ fontSize: ".72rem", color: "rgba(160,200,235,.84)" }}>{fmtData(s.data)} · {s.horario} · {s.duracaoMin}min</div>
                    </div>
                    <span style={{ fontSize: ".65rem", color: st.cor, background: st.bg, border: `1px solid ${st.borda}`, borderRadius: 20, padding: "3px 10px", fontWeight: 700 }}>{st.label}</span>
                  </div>

                  {/* Info */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
                    {[
                      { l: "Modalidade",  v: s.modalidade === "presencial" ? "Presencial" : s.modalidade === "domiciliar" ? "Domiciliar" : "Teleconsulta" },
                      { l: "Local",       v: s.local },
                      { l: "Contrato",    v: `${contrato.horasPorSemana}h/sem · ${contrato.duracaoMeses}m` },
                      { l: "Valor",       v: `R$ ${contrato.valorSessao}` },
                    ].map(r => (
                      <div key={r.l} style={{ padding: "9px 12px", background: "rgba(26,58,92,.25)", borderRadius: 9 }}>
                        <div style={{ fontSize: ".58rem", color: "rgba(170,210,245,.88)", marginBottom: 3 }}>{r.l}</div>
                        <div style={{ fontSize: ".8rem", color: "#e8f0f8", fontWeight: 500 }}>{r.v}</div>
                      </div>
                    ))}
                  </div>

                  {/* Confirmações */}
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: ".62rem", color: "rgba(170,210,245,.88)", textTransform: "uppercase", letterSpacing: ".09em", marginBottom: 8 }}>Confirmações</div>
                    <div style={{ display: "flex", gap: 10 }}>
                      <div style={{ flex: 1, padding: "10px 12px", background: s.confirmadoTerapeuta ? "rgba(29,158,117,.1)" : "rgba(26,58,92,.25)", border: `1px solid ${s.confirmadoTerapeuta ? "rgba(29,158,117,.3)" : "rgba(26,58,92,.5)"}`, borderRadius: 9 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <div style={{ width: 8, height: 8, borderRadius: "50%", background: s.confirmadoTerapeuta ? "#1D9E75" : "rgba(165,208,242,.85)" }} />
                          <span style={{ fontSize: ".72rem", color: s.confirmadoTerapeuta ? "#1D9E75" : "rgba(160,200,235,.84)", fontWeight: 600 }}>Terapeuta</span>
                        </div>
                        <div style={{ fontSize: ".65rem", color: "rgba(170,210,245,.88)", marginTop: 3 }}>{s.confirmadoTerapeuta ? "Confirmado" : "Aguardando"}</div>
                      </div>
                      <div style={{ flex: 1, padding: "10px 12px", background: s.confirmadoResponsavel ? "rgba(29,158,117,.1)" : "rgba(26,58,92,.25)", border: `1px solid ${s.confirmadoResponsavel ? "rgba(29,158,117,.3)" : "rgba(26,58,92,.5)"}`, borderRadius: 9 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <div style={{ width: 8, height: 8, borderRadius: "50%", background: s.confirmadoResponsavel ? "#1D9E75" : "rgba(165,208,242,.85)" }} />
                          <span style={{ fontSize: ".72rem", color: s.confirmadoResponsavel ? "#1D9E75" : "rgba(160,200,235,.84)", fontWeight: 600 }}>Responsável</span>
                        </div>
                        <div style={{ fontSize: ".65rem", color: "rgba(170,210,245,.88)", marginTop: 3 }}>{s.confirmadoResponsavel ? "Confirmado via FractaCare" : "Aguardando no FractaCare"}</div>
                      </div>
                    </div>
                  </div>

                  {/* Programas */}
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: ".62rem", color: "rgba(170,210,245,.88)", textTransform: "uppercase", letterSpacing: ".09em", marginBottom: 8 }}>Programas desta sessão</div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {s.programas.map(p => (
                        <span key={p} style={{ fontSize: ".68rem", background: "rgba(20,55,110,.65)", border: "1px solid rgba(26,58,92,.6)", color: "rgba(160,200,235,.92)", borderRadius: 20, padding: "3px 10px" }}>{p}</span>
                      ))}
                    </div>
                  </div>

                  {/* Ações */}
                  <div style={{ display: "flex", gap: 10 }}>
                    {s.status === "pendente" && (
                      <button style={{ flex: 1, padding: 11, borderRadius: 9, border: "none", background: "linear-gradient(135deg,#1D9E75,#0f8f7a)", color: "#07111f", fontFamily: "var(--font-sans)", fontWeight: 700, fontSize: ".82rem", cursor: "pointer" }}>
                        ✓ Confirmar sessão
                      </button>
                    )}
                    {s.status === "aguardando_responsavel" && (
                      <button style={{ flex: 1, padding: 11, borderRadius: 9, border: "1px solid rgba(239,159,39,.3)", background: "rgba(239,159,39,.08)", color: "#EF9F27", fontFamily: "var(--font-sans)", fontWeight: 600, fontSize: ".82rem", cursor: "pointer" }}>
                        Reenviar notificação
                      </button>
                    )}
                    {(s.status === "confirmada") && (
                      <Link href={`/clinic/sessao?pacienteId=${s.pacienteId}`} style={{ flex: 1, padding: 11, borderRadius: 9, border: "none", background: "linear-gradient(135deg,#1D9E75,#0f8f7a)", color: "#07111f", fontFamily: "var(--font-sans)", fontWeight: 700, fontSize: ".82rem", textDecoration: "none", textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        Iniciar sessão →
                      </Link>
                    )}
                    {s.status !== "cancelada" && s.status !== "realizada" && s.status !== "faltou" && (
                      <button style={{ padding: 11, borderRadius: 9, border: "1px solid rgba(224,90,75,.25)", background: "rgba(224,90,75,.07)", color: "#E05A4B", fontFamily: "var(--font-sans)", fontWeight: 600, fontSize: ".78rem", cursor: "pointer" }}>
                        Cancelar
                      </button>
                    )}
                    <button onClick={() => setSessaoAberta(null)} style={{ padding: 11, borderRadius: 9, border: "1px solid rgba(70,120,180,.5)", background: "transparent", color: "rgba(160,200,235,.90)", fontFamily: "var(--font-sans)", fontWeight: 500, fontSize: ".78rem", cursor: "pointer" }}>
                      Fechar
                    </button>
                  </div>

                  {/* Alerta de reposição */}
                  {s.precisaReposicao && (
                    <div style={{ marginTop: 12, padding: "8px 12px", background: "rgba(224,90,75,.08)", border: "1px solid rgba(224,90,75,.2)", borderRadius: 8, fontSize: ".72rem", color: "#E05A4B" }}>
                      ⚠ Esta sessão precisa de reposição dentro do contrato
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Legenda de status */}
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", padding: "8px 0" }}>
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
          <div key={key} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: cfg.cor }} />
            <span style={{ fontSize: ".65rem", color: "rgba(170,210,245,.88)" }}>{cfg.label}</span>
          </div>
        ))}
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <div style={{ display: "flex", gap: 2 }}>
            <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#1D9E75" }} />
            <div style={{ width: 5, height: 5, borderRadius: "50%", background: "rgba(138,168,200,.25)" }} />
          </div>
          <span style={{ fontSize: ".65rem", color: "rgba(170,210,245,.88)" }}>T = Terapeuta · R = Responsável confirmados</span>
        </div>
      </div>

    </div>
  );
}
