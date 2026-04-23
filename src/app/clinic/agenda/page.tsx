"use client";
import { useState, useMemo, useEffect, useCallback } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useClinicContext } from "../layout";

// ─── TIPOS ───────────────────────────────────────────────────────────────────
type Visao        = "semana" | "dia" | "mes";
type StatusSessao = "pendente" | "aguardando_responsavel" | "confirmada" | "realizada" | "cancelada" | "faltou";
type Modalidade   = "presencial" | "domiciliar" | "teleconsulta";
interface Sessao {
  id: string;
  contratoId: string;
  pacienteId: string;
  pacienteNome: string;
  pacienteIniciais: string;
  gradient: string;
  cor: string;
  data: string;
  horario: string;
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
  // extras para o modal
  horasPorSemana: number;
  duracaoMeses: number;
  valorSessao: number;
}

// ─── CONSTANTES ──────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<StatusSessao, { label: string; cor: string; bg: string; borda: string }> = {
  pendente:               { label: "Pendente",       cor: "#4d6d8a", bg: "rgba(77,109,138,.15)",  borda: "rgba(77,109,138,.3)"   },
  aguardando_responsavel: { label: "Aguard. família", cor: "#EF9F27", bg: "rgba(239,159,39,.15)",  borda: "rgba(239,159,39,.3)"   },
  confirmada:             { label: "Confirmada",      cor: "#1D9E75", bg: "rgba(29,158,117,.15)",  borda: "rgba(29,158,117,.3)"   },
  realizada:              { label: "Realizada",       cor: "#378ADD", bg: "rgba(55,138,221,.15)",  borda: "rgba(55,138,221,.3)"   },
  cancelada:              { label: "Cancelada",       cor: "#E05A4B", bg: "rgba(224,90,75,.12)",   borda: "rgba(224,90,75,.3)"    },
  faltou:                 { label: "Faltou",          cor: "#8B7FE8", bg: "rgba(139,127,232,.12)", borda: "rgba(139,127,232,.3)"  },
};
const MODALIDADE_ICON: Record<Modalidade, string> = {
  presencial:   "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
  domiciliar:   "M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7",
  teleconsulta: "M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z",
};
const DIAS_SEMANA  = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];
const MESES_PT     = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const MESES_CURTO  = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
const GRADIENTS    = [
  "linear-gradient(135deg,#1D9E75,#378ADD)",
  "linear-gradient(135deg,#378ADD,#8B7FE8)",
  "linear-gradient(135deg,#8B7FE8,#E05A4B)",
  "linear-gradient(135deg,#4d6d8a,#378ADD)",
  "linear-gradient(135deg,#EF9F27,#E05A4B)",
];
const CORES = ["#1D9E75","#378ADD","#8B7FE8","#4d6d8a","#EF9F27"];

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function fmtData(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return `${d.getDate()} ${MESES_CURTO[d.getMonth()]}`;
}
function addDias(date: Date, n: number): Date {
  const d = new Date(date); d.setDate(d.getDate() + n); return d;
}
function inicioSemana(date: Date): Date {
  const d = new Date(date); d.setDate(d.getDate() - d.getDay()); return d;
}
function isoDate(d: Date): string { return d.toISOString().slice(0, 10); }
function isHoje(dateStr: string): boolean { return dateStr === isoDate(new Date()); }
function iniciais(nome: string): string {
  const p = nome.trim().split(" ");
  return p.length >= 2 ? `${p[0][0]}${p[p.length-1][0]}`.toUpperCase() : nome.slice(0,2).toUpperCase();
}

// ─── PAGE ────────────────────────────────────────────────────────────────────
export default function AgendaPage() {
  const { terapeuta } = useClinicContext();
  const [visao,         setVisao]         = useState<Visao>("semana");
  const [dataReferencia, setDataRef]      = useState(new Date());
  const [sessaoAberta,  setSessaoAberta]  = useState<Sessao | null>(null);
  const [filtroStatus,  setFiltroStatus]  = useState<StatusSessao | "todos">("todos");
  const [todasSessoes,  setTodasSessoes]  = useState<Sessao[]>([]);
  const [loading,       setLoading]       = useState(true);

  const semanaInicio = useMemo(() => inicioSemana(dataReferencia), [dataReferencia]);
  const diasSemana   = useMemo(() => Array.from({ length: 7 }, (_, i) => addDias(semanaInicio, i)), [semanaInicio]);

  const carregarSessoes = useCallback(async () => {
    if (!terapeuta) return;
    setLoading(true);
    try {
      // Janela: 30 dias atrás até 60 dias à frente
      const inicio = new Date(); inicio.setDate(inicio.getDate() - 30);
      const fim    = new Date(); fim.setDate(fim.getDate() + 60);

      // 1. Sessões clínicas do terapeuta via planos
      const { data: planos } = await supabase
        .from("planos")
        .select("id, terapeuta_id, criancas ( id, nome ), programas ( nome, dominio )")
        .eq("terapeuta_id", terapeuta.id)
        .eq("status", "ativo");

      if (!planos || planos.length === 0) {
        setTodasSessoes([]);
        setLoading(false);
        return;
      }

      const criancaIds = planos
        .map(pl => (pl.criancas as any)?.id)
        .filter(Boolean);

      // 2. Sessões clínicas dessas crianças
      const { data: sessoes } = await supabase
        .from("sessoes_clinicas")
        .select("id, crianca_id, plano_id, concluida, observacao, criado_em, duracao_segundos")
        .in("crianca_id", criancaIds)
        .gte("criado_em", inicio.toISOString())
        .lte("criado_em", fim.toISOString())
        .order("criado_em", { ascending: true });

      // 3. Eventos de agenda (sessões agendadas futuras)
      const { data: eventos } = await supabase
        .from("agenda_eventos")
        .select("id, crianca_id, tipo, titulo, data_hora, duracao_minutos, status")
        .in("crianca_id", criancaIds)
        .eq("tipo", "sessao_clinica")
        .gte("data_hora", inicio.toISOString())
        .lte("data_hora", fim.toISOString())
        .order("data_hora", { ascending: true });

      // Mapa criança → dados
      const criancaMap = new Map<string, { nome: string; planos: any[] }>();
      for (const pl of planos) {
        const c = pl.criancas as any;
        if (!c) continue;
        if (!criancaMap.has(c.id)) criancaMap.set(c.id, { nome: c.nome, planos: [] });
        criancaMap.get(c.id)!.planos.push(pl);
      }

      const resultado: Sessao[] = [];
      let colorIdx = 0;
      const criancaColorMap = new Map<string, number>();
      for (const cid of criancaIds) {
        criancaColorMap.set(cid, colorIdx % CORES.length);
        colorIdx++;
      }

      // Sessões realizadas (de sessoes_clinicas)
      for (const s of (sessoes ?? [])) {
        const cri = criancaMap.get(s.crianca_id);
        if (!cri) continue;
        const ci = criancaColorMap.get(s.crianca_id) ?? 0;
        const planosSessao = cri.planos.filter((pl: any) => pl.id === s.plano_id);
        const prog = planosSessao[0]?.programas as any;
        const dataHora = new Date(s.criado_em);
        const status: StatusSessao = s.concluida ? "realizada" : "confirmada";
        resultado.push({
          id: s.id,
          contratoId: s.plano_id,
          pacienteId: s.crianca_id,
          pacienteNome: cri.nome,
          pacienteIniciais: iniciais(cri.nome),
          gradient: GRADIENTS[ci],
          cor: CORES[ci],
          data: isoDate(dataHora),
          horario: dataHora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
          duracaoMin: s.duracao_segundos ? Math.round(s.duracao_segundos / 60) : 60,
          modalidade: "presencial",
          local: "Clínica Fracta",
          status,
          confirmadoTerapeuta: true,
          confirmadoResponsavel: s.concluida,
          precisaReposicao: false,
          observacoes: s.observacao ?? undefined,
          programas: prog ? [prog.nome] : [],
          horasPorSemana: 2,
          duracaoMeses: 12,
          valorSessao: 250,
        });
      }

      // Eventos agendados futuros (de agenda_eventos)
      for (const ev of (eventos ?? [])) {
        const cri = criancaMap.get(ev.crianca_id);
        if (!cri) continue;
        // Não duplicar com sessoes_clinicas
        if (resultado.some(r => r.id === ev.id)) continue;
        const ci = criancaColorMap.get(ev.crianca_id) ?? 0;
        const dataHora = new Date(ev.data_hora);
        const hoje = isoDate(new Date());
        const dataEv = isoDate(dataHora);
        let status: StatusSessao = "pendente";
        if (dataEv < hoje) status = "realizada";
        else if (dataEv === hoje) status = "confirmada";
        else status = "aguardando_responsavel";
        resultado.push({
          id: ev.id,
          contratoId: "",
          pacienteId: ev.crianca_id,
          pacienteNome: cri.nome,
          pacienteIniciais: iniciais(cri.nome),
          gradient: GRADIENTS[ci],
          cor: CORES[ci],
          data: dataEv,
          horario: dataHora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
          duracaoMin: ev.duracao_minutos ?? 60,
          modalidade: "presencial",
          local: "Clínica Fracta",
          status,
          confirmadoTerapeuta: true,
          confirmadoResponsavel: dataEv < hoje,
          precisaReposicao: false,
          programas: [],
          horasPorSemana: 2,
          duracaoMeses: 12,
          valorSessao: 250,
        });
      }

      // Ordenar por horário
      resultado.sort((a, b) => `${a.data}${a.horario}`.localeCompare(`${b.data}${b.horario}`));
      setTodasSessoes(resultado);
    } catch (err) {
      console.error("Erro ao carregar agenda:", err);
    }
    setLoading(false);
  }, [terapeuta]);

  useEffect(() => { carregarSessoes(); }, [carregarSessoes]);

  // Filtrar por semana atual
  const sessoesSemana = useMemo(() => {
    const inicio = isoDate(semanaInicio);
    const fim    = isoDate(addDias(semanaInicio, 6));
    return todasSessoes.filter(s => s.data >= inicio && s.data <= fim);
  }, [todasSessoes, semanaInicio]);

  const sessoesFiltradas = useMemo(() => {
    if (filtroStatus === "todos") return sessoesSemana;
    return sessoesSemana.filter(s => s.status === filtroStatus);
  }, [sessoesSemana, filtroStatus]);

  const stats = useMemo(() => {
    const confirmadas     = sessoesSemana.filter(s => s.status === "confirmada" || s.status === "realizada").length;
    const pendentes       = sessoesSemana.filter(s => s.status === "pendente" || s.status === "aguardando_responsavel").length;
    const canceladas      = sessoesSemana.filter(s => s.status === "cancelada" || s.status === "faltou").length;
    const reposicoes      = sessoesSemana.filter(s => s.precisaReposicao).length;
    const receitaPrevista = sessoesSemana.filter(s => s.status !== "cancelada" && s.status !== "faltou").length * 250;
    return { confirmadas, pendentes, canceladas, reposicoes, receitaPrevista };
  }, [sessoesSemana]);

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
    if (visao === "dia") return `${dataReferencia.getDate()} de ${MESES_PT[dataReferencia.getMonth()]} ${dataReferencia.getFullYear()}`;
    return `${MESES_PT[dataReferencia.getMonth()]} ${dataReferencia.getFullYear()}`;
  }

  // ── CSS ─────────────────────────────────────────────────────────────────────
  const card: React.CSSProperties = { background: "rgba(13,32,53,.75)", border: "1px solid rgba(70,120,180,.5)", borderRadius: 14, backdropFilter: "blur(8px)" };
  const lbl: React.CSSProperties  = { fontSize: ".6rem", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: ".09em", color: "rgba(170,210,245,.88)", marginBottom: 6 };
  const HORAS = ["08:00","09:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00","18:00"];

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 400 }}>
      <div style={{ fontSize: 13, color: "rgba(160,200,235,.9)" }}>Carregando agenda...</div>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* ── HEADER ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: "1.2rem", fontWeight: 800, color: "#e8f0f8", margin: 0, marginBottom: 4 }}>Agenda</h1>
          <div style={{ fontSize: ".72rem", color: "rgba(160,200,235,.84)" }}>Sessões · Controle de confirmações</div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {/* Seletor de visão */}
          <div style={{ display: "flex", background: "rgba(13,32,53,.75)", border: "1px solid rgba(70,120,180,.4)", borderRadius: 9, overflow: "hidden" }}>
            {(["semana","dia","mes"] as Visao[]).map(v => (
              <button key={v} onClick={() => setVisao(v)} style={{ padding: "7px 14px", background: visao === v ? "rgba(29,158,117,.2)" : "transparent", border: "none", color: visao === v ? "#1D9E75" : "rgba(160,200,235,.84)", fontFamily: "var(--font-sans)", fontWeight: visao === v ? 600 : 400, fontSize: ".75rem", cursor: "pointer" }}>
                {v === "semana" ? "Semana" : v === "dia" ? "Dia" : "Mês"}
              </button>
            ))}
          </div>
          {/* Navegação */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(13,32,53,.75)", border: "1px solid rgba(70,120,180,.4)", borderRadius: 9, padding: "6px 12px" }}>
            <button onClick={() => navegar(-1)} style={{ background: "none", border: "none", color: "rgba(160,200,235,.84)", cursor: "pointer", padding: 2 }}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 3L5 8l5 5"/></svg>
            </button>
            <span style={{ fontSize: ".78rem", color: "#e8f0f8", fontWeight: 600, minWidth: 160, textAlign: "center" }}>{tituloNav()}</span>
            <button onClick={() => navegar(1)} style={{ background: "none", border: "none", color: "rgba(160,200,235,.84)", cursor: "pointer", padding: 2 }}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 3l5 5-5 5"/></svg>
            </button>
          </div>
          <button onClick={() => setDataRef(new Date())} style={{ padding: "7px 14px", borderRadius: 9, border: "1px solid rgba(70,120,180,.4)", background: "transparent", color: "rgba(160,200,235,.84)", fontFamily: "var(--font-sans)", fontSize: ".75rem", cursor: "pointer" }}>Hoje</button>
        </div>
      </div>

      {/* ── STATS ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 10 }}>
        {[
          { l: "Confirmadas", v: stats.confirmadas,    c: "#1D9E75" },
          { l: "Pendentes",   v: stats.pendentes,      c: "#EF9F27" },
          { l: "Canceladas",  v: stats.canceladas,     c: "#E05A4B" },
          { l: "Reposições",  v: stats.reposicoes,     c: "#8B7FE8" },
          { l: "Receita prev.",v: `R$ ${stats.receitaPrevista.toLocaleString("pt-BR")}`, c: "#378ADD" },
        ].map(s => (
          <div key={s.l} style={{ ...card, padding: "12px 14px" }}>
            <div style={{ fontSize: ".58rem", color: "rgba(170,210,245,.88)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 4 }}>{s.l}</div>
            <div style={{ fontSize: "1.3rem", fontWeight: 800, color: s.c }}>{s.v}</div>
          </div>
        ))}
      </div>

      {/* ── FILTRO STATUS ── */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {(["todos", ...Object.keys(STATUS_CONFIG)] as (StatusSessao | "todos")[]).map(st => {
          const cfg = st === "todos" ? null : STATUS_CONFIG[st];
          const ativo = filtroStatus === st;
          return (
            <button key={st} onClick={() => setFiltroStatus(st)} style={{ padding: "5px 12px", borderRadius: 20, border: `1px solid ${ativo ? (cfg?.cor ?? "#1D9E75") + "55" : "rgba(26,58,92,.5)"}`, background: ativo ? (cfg?.cor ?? "#1D9E75") + "15" : "transparent", color: ativo ? (cfg?.cor ?? "#1D9E75") : "rgba(160,200,235,.84)", fontFamily: "var(--font-sans)", fontSize: ".72rem", fontWeight: ativo ? 600 : 400, cursor: "pointer" }}>
              {st === "todos" ? "Todos" : STATUS_CONFIG[st].label}
            </button>
          );
        })}
      </div>

      {/* ── VISÃO SEMANA ── */}
      {visao === "semana" && (
        <div style={{ ...card, padding: 0, overflow: "hidden" }}>
          {/* Cabeçalho dos dias */}
          <div style={{ display: "grid", gridTemplateColumns: "60px repeat(7,1fr)", borderBottom: "1px solid rgba(26,58,92,.4)" }}>
            <div style={{ padding: "10px 0", borderRight: "1px solid rgba(26,58,92,.3)" }} />
            {diasSemana.map((d, i) => {
              const ds = isoDate(d);
              const hoje = isHoje(ds);
              return (
                <div key={i} style={{ padding: "10px 8px", textAlign: "center", background: hoje ? "rgba(29,158,117,.08)" : "transparent", borderRight: i < 6 ? "1px solid rgba(26,58,92,.3)" : "none" }}>
                  <div style={{ fontSize: ".62rem", color: "rgba(170,210,245,.88)", marginBottom: 2 }}>{DIAS_SEMANA[d.getDay()]}</div>
                  <div style={{ fontSize: ".95rem", fontWeight: hoje ? 800 : 500, color: hoje ? "#1D9E75" : "#e8f0f8" }}>{d.getDate()}</div>
                </div>
              );
            })}
          </div>

          {/* Grade horária */}
          <div style={{ overflowY: "auto", maxHeight: 480 }}>
            {HORAS.map(hora => (
              <div key={hora} style={{ display: "grid", gridTemplateColumns: "60px repeat(7,1fr)", borderBottom: "1px solid rgba(26,58,92,.2)", minHeight: 56 }}>
                <div style={{ padding: "6px 8px", fontSize: ".65rem", color: "rgba(170,210,245,.88)", borderRight: "1px solid rgba(26,58,92,.3)", display: "flex", alignItems: "flex-start", paddingTop: 8 }}>{hora}</div>
                {diasSemana.map((d, i) => {
                  const ds = isoDate(d);
                  const sessoesDia = sessoesFiltradas.filter(s => s.data === ds && s.horario.startsWith(hora.slice(0,2)));
                  return (
                    <div key={i} style={{ borderRight: i < 6 ? "1px solid rgba(26,58,92,.2)" : "none", padding: "4px", background: isHoje(ds) ? "rgba(29,158,117,.03)" : "transparent" }}>
                      {sessoesDia.map(s => {
                        const st = STATUS_CONFIG[s.status];
                        return (
                          <button key={s.id} onClick={() => setSessaoAberta(s)} style={{ width: "100%", padding: "6px 8px", borderRadius: 7, border: `1px solid ${st.borda}`, background: st.bg, cursor: "pointer", textAlign: "left", marginBottom: 2, fontFamily: "var(--font-sans)" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 2 }}>
                              <div style={{ width: 16, height: 16, borderRadius: "50%", background: s.gradient, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".45rem", fontWeight: 800, color: "#fff" }}>{s.pacienteIniciais}</div>
                              <span style={{ fontSize: ".68rem", fontWeight: 600, color: "#e8f0f8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.pacienteNome.split(" ")[0]}</span>
                            </div>
                            <div style={{ fontSize: ".58rem", color: st.cor, fontWeight: 600 }}>{st.label}</div>
                            <div style={{ display: "flex", gap: 3, marginTop: 3 }}>
                              <div style={{ width: 5, height: 5, borderRadius: "50%", background: s.confirmadoTerapeuta ? "#1D9E75" : "rgba(165,208,242,.3)" }} />
                              <div style={{ width: 5, height: 5, borderRadius: "50%", background: s.confirmadoResponsavel ? "#1D9E75" : "rgba(165,208,242,.3)" }} />
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

      {/* ── VISÃO DIA ── */}
      {visao === "dia" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {sessoesFiltradas.filter(s => s.data === isoDate(dataReferencia)).length === 0 ? (
            <div style={{ ...card, padding: "40px 24px", textAlign: "center" }}>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,.3)" }}>Nenhuma sessão para este dia</div>
            </div>
          ) : (
            sessoesFiltradas.filter(s => s.data === isoDate(dataReferencia)).map(s => {
              const st = STATUS_CONFIG[s.status];
              return (
                <button key={s.id} onClick={() => setSessaoAberta(s)} style={{ ...card, padding: "14px 18px", cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 14, border: `1px solid ${st.borda}` }}>
                  <div style={{ width: 40, height: 40, borderRadius: "50%", background: s.gradient, display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".72rem", fontWeight: 800, color: "#fff", flexShrink: 0 }}>{s.pacienteIniciais}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: ".88rem", fontWeight: 700, color: "#e8f0f8", marginBottom: 2 }}>{s.pacienteNome}</div>
                    <div style={{ fontSize: ".72rem", color: "rgba(160,200,235,.84)" }}>{s.horario} · {s.duracaoMin}min · {s.modalidade}</div>
                  </div>
                  <span style={{ fontSize: ".65rem", color: st.cor, background: st.bg, border: `1px solid ${st.borda}`, borderRadius: 20, padding: "3px 10px", fontWeight: 700 }}>{st.label}</span>
                </button>
              );
            })
          )}
        </div>
      )}

      {/* ── VISÃO MÊS ── */}
      {visao === "mes" && (
        <div style={{ ...card, padding: 20 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4, marginBottom: 8 }}>
            {DIAS_SEMANA.map(d => <div key={d} style={{ textAlign: "center", fontSize: ".62rem", color: "rgba(170,210,245,.88)", padding: "4px 0" }}>{d}</div>)}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4 }}>
            {(() => {
              const ano = dataReferencia.getFullYear();
              const mes = dataReferencia.getMonth();
              const primeiroDia = new Date(ano, mes, 1).getDay();
              const diasNoMes = new Date(ano, mes + 1, 0).getDate();
              const cells = [];
              for (let i = 0; i < primeiroDia; i++) cells.push(<div key={`e${i}`} />);
              for (let d = 1; d <= diasNoMes; d++) {
                const ds = `${ano}-${String(mes+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
                const count = todasSessoes.filter(s => s.data === ds).length;
                const hoje = isHoje(ds);
                cells.push(
                  <div key={d} style={{ padding: "8px 4px", borderRadius: 8, background: hoje ? "rgba(29,158,117,.12)" : "transparent", border: hoje ? "1px solid rgba(29,158,117,.3)" : "1px solid transparent", textAlign: "center", cursor: count > 0 ? "pointer" : "default" }}
                    onClick={() => { if (count > 0) { setDataRef(new Date(ds)); setVisao("dia"); } }}>
                    <div style={{ fontSize: ".78rem", fontWeight: hoje ? 800 : 400, color: hoje ? "#1D9E75" : "#e8f0f8" }}>{d}</div>
                    {count > 0 && <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#1D9E75", margin: "2px auto 0" }} />}
                  </div>
                );
              }
              return cells;
            })()}
          </div>
        </div>
      )}

      {/* ── MODAL SESSÃO ── */}
      {sessaoAberta && (
        <div onClick={() => setSessaoAberta(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 20 }}>
          <div style={{ background: "#0d2035", border: "1px solid rgba(26,58,92,.7)", borderRadius: 18, padding: 28, width: "100%", maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            {(() => {
              const s = sessaoAberta;
              const st = STATUS_CONFIG[s.status];
              return (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                    <div style={{ width: 44, height: 44, borderRadius: "50%", background: s.gradient, display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".75rem", fontWeight: 800, color: "#fff" }}>{s.pacienteIniciais}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "1rem", fontWeight: 700, color: "#e8f0f8" }}>{s.pacienteNome}</div>
                      <div style={{ fontSize: ".72rem", color: "rgba(160,200,235,.84)" }}>{fmtData(s.data)} · {s.horario} · {s.duracaoMin}min</div>
                    </div>
                    <span style={{ fontSize: ".65rem", color: st.cor, background: st.bg, border: `1px solid ${st.borda}`, borderRadius: 20, padding: "3px 10px", fontWeight: 700 }}>{st.label}</span>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
                    {[
                      { l: "Modalidade", v: s.modalidade === "presencial" ? "Presencial" : s.modalidade === "domiciliar" ? "Domiciliar" : "Teleconsulta" },
                      { l: "Local",      v: s.local },
                      { l: "Contrato",   v: `${s.horasPorSemana}h/sem · ${s.duracaoMeses}m` },
                      { l: "Valor",      v: `R$ ${s.valorSessao}` },
                    ].map(r => (
                      <div key={r.l} style={{ padding: "9px 12px", background: "rgba(26,58,92,.25)", borderRadius: 9 }}>
                        <div style={{ fontSize: ".58rem", color: "rgba(170,210,245,.88)", marginBottom: 3 }}>{r.l}</div>
                        <div style={{ fontSize: ".8rem", color: "#e8f0f8", fontWeight: 500 }}>{r.v}</div>
                      </div>
                    ))}
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: ".62rem", color: "rgba(170,210,245,.88)", textTransform: "uppercase", letterSpacing: ".09em", marginBottom: 8 }}>Confirmações</div>
                    <div style={{ display: "flex", gap: 10 }}>
                      {[
                        { l: "Terapeuta",    ok: s.confirmadoTerapeuta,    sub: s.confirmadoTerapeuta ? "Confirmado" : "Aguardando" },
                        { l: "Responsável",  ok: s.confirmadoResponsavel,  sub: s.confirmadoResponsavel ? "Confirmado via FractaCare" : "Aguardando no FractaCare" },
                      ].map(c => (
                        <div key={c.l} style={{ flex: 1, padding: "10px 12px", background: c.ok ? "rgba(29,158,117,.1)" : "rgba(26,58,92,.25)", border: `1px solid ${c.ok ? "rgba(29,158,117,.3)" : "rgba(26,58,92,.5)"}`, borderRadius: 9 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <div style={{ width: 8, height: 8, borderRadius: "50%", background: c.ok ? "#1D9E75" : "rgba(165,208,242,.85)" }} />
                            <span style={{ fontSize: ".72rem", color: c.ok ? "#1D9E75" : "rgba(160,200,235,.84)", fontWeight: 600 }}>{c.l}</span>
                          </div>
                          <div style={{ fontSize: ".65rem", color: "rgba(170,210,245,.88)", marginTop: 3 }}>{c.sub}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {s.programas.length > 0 && (
                    <div style={{ marginBottom: 20 }}>
                      <div style={{ fontSize: ".62rem", color: "rgba(170,210,245,.88)", textTransform: "uppercase", letterSpacing: ".09em", marginBottom: 8 }}>Programas desta sessão</div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {s.programas.map(p => (
                          <span key={p} style={{ fontSize: ".68rem", background: "rgba(20,55,110,.65)", border: "1px solid rgba(26,58,92,.6)", color: "rgba(160,200,235,.92)", borderRadius: 20, padding: "3px 10px" }}>{p}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {s.observacoes && (
                    <div style={{ marginBottom: 16, padding: "10px 14px", background: "rgba(26,58,92,.25)", borderRadius: 9, fontSize: ".78rem", color: "rgba(160,200,235,.84)", lineHeight: 1.5 }}>
                      {s.observacoes}
                    </div>
                  )}

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
                    {s.status === "confirmada" && (
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

      {/* Legenda */}
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
