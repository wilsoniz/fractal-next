"use client";
import { useState, useMemo, useEffect, useCallback } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useClinicContext } from "../layout";

// ─── TIPOS ───────────────────────────────────────────────────────────────────
type Visao        = "semana" | "dia" | "mes";
type StatusSessao = "agendado" | "em_andamento" | "realizado" | "pendente" | "aguardando_responsavel" | "confirmada" | "realizada" | "cancelada" | "faltou";
type Modalidade   = "presencial" | "domiciliar" | "teleconsulta";
type TipoSessao   = "atendimento" | "acompanhamento_terapeutico" | "supervisao";

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
  tipoSessao: TipoSessao;
  local: string;
  status: StatusSessao;
  confirmadoTerapeuta: boolean;
  confirmadoResponsavel: boolean;
  motivoCancelamento?: string;
  precisaReposicao: boolean;
  observacoes?: string;
  programas: string[];
  horasPorSemana: number;
  duracaoMeses: number;
  valorSessao: number;
}

interface Paciente {
  id: string;
  nome: string;
  planoId: string;
}

// ─── CONSTANTES ──────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<StatusSessao, { label: string; cor: string; bg: string; borda: string }> = {
  agendado:               { label: "Agendado",        cor: "#4d6d8a", bg: "rgba(77,109,138,.15)",  borda: "rgba(77,109,138,.3)"  },
  em_andamento:           { label: "Em andamento",    cor: "#1D9E75", bg: "rgba(29,158,117,.15)",  borda: "rgba(29,158,117,.3)"  },
  realizado:              { label: "Realizado",        cor: "#378ADD", bg: "rgba(55,138,221,.15)",  borda: "rgba(55,138,221,.3)"  },
  pendente:               { label: "Pendente",        cor: "#4d6d8a", bg: "rgba(77,109,138,.15)",  borda: "rgba(77,109,138,.3)"  },
  aguardando_responsavel: { label: "Aguard. família", cor: "#EF9F27", bg: "rgba(239,159,39,.15)",  borda: "rgba(239,159,39,.3)"  },
  confirmada:             { label: "Confirmada",       cor: "#1D9E75", bg: "rgba(29,158,117,.15)",  borda: "rgba(29,158,117,.3)"  },
  realizada:              { label: "Realizada",        cor: "#378ADD", bg: "rgba(55,138,221,.15)",  borda: "rgba(55,138,221,.3)"  },
  cancelada:              { label: "Cancelada",        cor: "#E05A4B", bg: "rgba(224,90,75,.12)",   borda: "rgba(224,90,75,.3)"   },
  faltou:                 { label: "Faltou",           cor: "#8B7FE8", bg: "rgba(139,127,232,.12)", borda: "rgba(139,127,232,.3)" },
};

const TIPO_SESSAO_CONFIG: Record<TipoSessao, { label: string; cor: string }> = {
  atendimento:               { label: "Atendimento",  cor: "#1D9E75" },
  acompanhamento_terapeutico:{ label: "AT",           cor: "#378ADD" },
  supervisao:                { label: "Supervisão",   cor: "#8B7FE8" },
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

// Detecta conflito de horário: mesmo terapeuta, sobreposição de tempo
function temConflito(sessoes: Sessao[], data: string, horario: string, duracaoMin: number, excluirId?: string): Sessao | null {
  const novoInicio = new Date(`${data}T${horario}:00`)
  const novoFim    = new Date(novoInicio.getTime() + duracaoMin * 60000)
  for (const s of sessoes) {
    if (s.id === excluirId) continue
    if (s.data !== data) continue
    const sInicio = new Date(`${s.data}T${s.horario}:00`)
    const sFim    = new Date(sInicio.getTime() + s.duracaoMin * 60000)
    if (novoInicio < sFim && novoFim > sInicio) return s
  }
  return null
}

// ─── PAGE ────────────────────────────────────────────────────────────────────
export default function AgendaPage() {
  const { terapeuta } = useClinicContext();
  const [visao,          setVisao]         = useState<Visao>("semana");
  const [dataReferencia, setDataRef]       = useState(new Date());
  const [sessaoAberta,   setSessaoAberta]  = useState<Sessao | null>(null);
  const [filtroStatus,   setFiltroStatus]  = useState<StatusSessao | "todos">("todos");
  const [todasSessoes,   setTodasSessoes]  = useState<Sessao[]>([]);
  const [loading,        setLoading]       = useState(true);
  const [pacientes,      setPacientes]     = useState<Paciente[]>([]);

  // Modal de nova recorrência
  const [modalRecorr,    setModalRecorr]   = useState(false);
  const [salvandoRecorr, setSalvandoRecorr]= useState(false);
  const [erroRecorr,     setErroRecorr]    = useState<string | null>(null);
  const [form, setForm] = useState({
    pacienteId:  "",
    tipoSessao:  "atendimento" as TipoSessao,
    local:       "presencial" as "presencial" | "remoto" | "ambiente_natural",
    diasSemana:  [] as number[],
    horario:     "14:00",
    duracaoMin:  60,
    dataInicio:  isoDate(new Date()),
    dataFim:     "",
    semanas:     12, // gerar eventos para N semanas
  });

  const semanaInicio = useMemo(() => inicioSemana(dataReferencia), [dataReferencia]);
  const diasSemana   = useMemo(() => Array.from({ length: 7 }, (_, i) => addDias(semanaInicio, i)), [semanaInicio]);

  const carregarSessoes = useCallback(async () => {
    if (!terapeuta) return;
    setLoading(true);
    try {
      const inicio = new Date(); inicio.setDate(inicio.getDate() - 30);
      const fim    = new Date(); fim.setDate(fim.getDate() + 90);

      // 1. Planos ativos
      const { data: planos } = await supabase
        .from("planos")
        .select("id, terapeuta_id, criancas ( id, nome ), programas ( nome, dominio )")
        .eq("terapeuta_id", terapeuta.id)
        .eq("status", "ativo");

      if (!planos || planos.length === 0) {
        setTodasSessoes([]);
        setPacientes([]);
        setLoading(false);
        return;
      }

      // Lista de pacientes para o form
      const pacs: Paciente[] = [];
      const criancaMap = new Map<string, { nome: string; planos: any[] }>();
      for (const pl of planos) {
        const c = pl.criancas as any;
        if (!c) continue;
        if (!criancaMap.has(c.id)) {
          criancaMap.set(c.id, { nome: c.nome, planos: [] });
          pacs.push({ id: c.id, nome: c.nome, planoId: pl.id });
        }
        criancaMap.get(c.id)!.planos.push(pl);
      }
      setPacientes(pacs);

      const criancaIds = Array.from(criancaMap.keys());

      // 2. Sessões realizadas
      const { data: sessoes } = await supabase
        .from("sessoes_clinicas")
        .select("id, crianca_id, plano_id, concluida, observacao, criado_em, duracao_segundos")
        .in("crianca_id", criancaIds)
        .gte("criado_em", inicio.toISOString())
        .lte("criado_em", fim.toISOString())
        .order("criado_em", { ascending: true });

      // 3. Eventos agendados
      const { data: eventos } = await supabase
        .from("agenda_eventos")
        .select("id, crianca_id, tipo, titulo, data_hora, duracao_minutos, status, tipo_sessao, local, confirmado_responsavel, confirmado_terapeuta")
        .in("crianca_id", criancaIds)
        .gte("data_hora", inicio.toISOString())
        .lte("data_hora", fim.toISOString())
        .order("data_hora", { ascending: true });

      const criancaColorMap = new Map<string, number>();
      let colorIdx = 0;
      for (const cid of criancaIds) {
        criancaColorMap.set(cid, colorIdx % CORES.length);
        colorIdx++;
      }

      const resultado: Sessao[] = [];

      // Mapear sessões realizadas
      for (const s of (sessoes ?? [])) {
        const cri = criancaMap.get(s.crianca_id);
        if (!cri) continue;
        const ci = criancaColorMap.get(s.crianca_id) ?? 0;
        const planosSessao = cri.planos.filter((pl: any) => pl.id === s.plano_id);
        const prog = planosSessao[0]?.programas as any;
        const dataHora = new Date(s.criado_em);
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
          tipoSessao: "atendimento",
          local: "Clínica",
          status: s.concluida ? "realizada" : "confirmada",
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

      // Mapear eventos agendados
      for (const ev of (eventos ?? [])) {
        const cri = criancaMap.get(ev.crianca_id);
        if (!cri) continue;
        if (resultado.some(r => r.id === ev.id)) continue;
        const ci = criancaColorMap.get(ev.crianca_id) ?? 0;
        const dataHora = new Date(ev.data_hora);
        const hoje = isoDate(new Date());
        const dataEv = isoDate(dataHora);
        let status: StatusSessao = ev.status ?? "pendente";
        if (!ev.status) {
          if (dataEv < hoje) status = "realizada";
          else if (dataEv === hoje) status = "confirmada";
          else status = ev.confirmado_responsavel ? "confirmada" : "aguardando_responsavel";
        }
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
          tipoSessao: (ev.tipo_sessao as TipoSessao) ?? "atendimento",
          local: ev.local ?? "Clínica",
          status,
          confirmadoTerapeuta: ev.confirmado_terapeuta ?? true,
          confirmadoResponsavel: ev.confirmado_responsavel ?? false,
          precisaReposicao: false,
          programas: [],
          horasPorSemana: 2,
          duracaoMeses: 12,
          valorSessao: 250,
        });
      }

      resultado.sort((a, b) => `${a.data}${a.horario}`.localeCompare(`${b.data}${b.horario}`));
      setTodasSessoes(resultado);
    } catch (err) {
      console.error("Erro ao carregar agenda:", err);
    }
    setLoading(false);
  }, [terapeuta]);

  useEffect(() => { carregarSessoes(); }, [carregarSessoes]);

  // ── Criar recorrência ──────────────────────────────────────────────────────
  async function criarRecorrencia() {
    if (!terapeuta) return;
    if (!form.pacienteId) { setErroRecorr("Selecione um paciente."); return; }
    if (form.diasSemana.length === 0) { setErroRecorr("Selecione pelo menos um dia da semana."); return; }

    setSalvandoRecorr(true);
    setErroRecorr(null);

    try {
      const pac = pacientes.find(p => p.id === form.pacienteId);
      if (!pac) throw new Error("Paciente não encontrado");

      // 1. Criar regra de recorrência
      const { data: recorr, error: errRecorr } = await supabase
        .from("agenda_recorrencias")
        .insert({
          plano_id:     pac.planoId,
          terapeuta_id: terapeuta.id,
          crianca_id:   form.pacienteId,
          tipo_sessao:  form.tipoSessao,
          local:        form.local,
          dias_semana:  form.diasSemana,
          horario:      form.horario,
          duracao_min:  form.duracaoMin,
          data_inicio:  form.dataInicio,
          data_fim:     form.dataFim || null,
          ativo:        true,
        })
        .select("id")
        .single();

      if (errRecorr) throw errRecorr;

      // 2. Gerar eventos para as próximas N semanas
      const eventos: any[] = [];
      const dataInicio = new Date(form.dataInicio + "T12:00:00");
      const dataFimGer = form.dataFim
        ? new Date(form.dataFim + "T23:59:59")
        : new Date(dataInicio.getTime() + form.semanas * 7 * 24 * 60 * 60 * 1000);

      const cursor = new Date(dataInicio);
      let conflitos = 0;

      while (cursor <= dataFimGer) {
        const diaSemana = cursor.getDay();
        if (form.diasSemana.includes(diaSemana)) {
          const [h, m] = form.horario.split(":").map(Number);
          const dataHora = new Date(cursor);
          dataHora.setHours(h, m, 0, 0);

          const dataStr   = isoDate(dataHora);
          const horarioStr = `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`;

          // Verificar conflito
          const conflito = temConflito(todasSessoes, dataStr, horarioStr, form.duracaoMin);
          if (conflito) {
            conflitos++;
          } else {
            eventos.push({
              crianca_id:            form.pacienteId,
              tipo:                  "sessao_clinica",
              titulo:                `Sessão — ${pac.nome}`,
              data_hora:             dataHora.toISOString(),
              duracao_minutos:       form.duracaoMin,
              status:                "agendado",
              tipo_sessao:           form.tipoSessao,
              local:                 form.local,
              confirmado_terapeuta:  true,
              confirmado_responsavel:false,
              recorrencia_id:        recorr?.id ?? null,
            });
          }
        }
        cursor.setDate(cursor.getDate() + 1);
      }

      if (eventos.length > 0) {
        const { error: errEv } = await supabase.from("agenda_eventos").insert(eventos);
        if (errEv) throw errEv;
      }

      setModalRecorr(false);
      setForm({ pacienteId: "", tipoSessao: "atendimento", local: "presencial", diasSemana: [], horario: "14:00", duracaoMin: 60, dataInicio: isoDate(new Date()), dataFim: "", semanas: 12 });

      if (conflitos > 0) {
        alert(`${eventos.length} sessão(ões) agendada(s). ${conflitos} sessão(ões) ignorada(s) por conflito de horário.`);
      }

      await carregarSessoes();
    } catch (err: any) {
      setErroRecorr(err?.message ?? "Erro ao criar recorrência.");
    }
    setSalvandoRecorr(false);
  }

  // ── Filtros e stats ────────────────────────────────────────────────────────
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

  // ── CSS ──────────────────────────────────────────────────────────────────────
  const card: React.CSSProperties = { background: "rgba(13,32,53,.75)", border: "1px solid rgba(70,120,180,.5)", borderRadius: 14, backdropFilter: "blur(8px)" };
  const inp: React.CSSProperties  = { width: "100%", padding: "9px 11px", borderRadius: 8, border: "1px solid rgba(26,58,92,.5)", background: "rgba(13,32,53,.6)", color: "#e8f0f8", fontSize: 13, fontFamily: "var(--font-sans)", outline: "none", boxSizing: "border-box" as const };
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
          {/* Nova recorrência */}
          <button onClick={() => { setModalRecorr(true); setErroRecorr(null); }} style={{ padding: "8px 16px", borderRadius: 9, border: "none", background: "linear-gradient(135deg,#1D9E75,#0f8f7a)", color: "#07111f", fontFamily: "var(--font-sans)", fontWeight: 700, fontSize: ".78rem", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="8" y1="2" x2="8" y2="14"/><line x1="2" y1="8" x2="14" y2="8"/></svg>
            Novo agendamento
          </button>
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
          { l: "Confirmadas",  v: stats.confirmadas,    c: "#1D9E75" },
          { l: "Pendentes",    v: stats.pendentes,      c: "#EF9F27" },
          { l: "Canceladas",   v: stats.canceladas,     c: "#E05A4B" },
          { l: "Reposições",   v: stats.reposicoes,     c: "#8B7FE8" },
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
          const cfg  = st === "todos" ? null : STATUS_CONFIG[st];
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
                        const st  = STATUS_CONFIG[s.status];
                        const tip = TIPO_SESSAO_CONFIG[s.tipoSessao];
                        return (
                          <button key={s.id} onClick={() => setSessaoAberta(s)} style={{ width: "100%", padding: "6px 8px", borderRadius: 7, border: `1px solid ${st.borda}`, background: st.bg, cursor: "pointer", textAlign: "left", marginBottom: 2, fontFamily: "var(--font-sans)" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 2 }}>
                              <div style={{ width: 16, height: 16, borderRadius: "50%", background: s.gradient, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".45rem", fontWeight: 800, color: "#fff" }}>{s.pacienteIniciais}</div>
                              <span style={{ fontSize: ".68rem", fontWeight: 600, color: "#e8f0f8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.pacienteNome.split(" ")[0]}</span>
                            </div>
                            <div style={{ fontSize: ".58rem", color: tip.cor, fontWeight: 600 }}>{tip.label}</div>
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
              <div style={{ fontSize: 13, color: "rgba(255,255,255,.3)", marginBottom: 16 }}>Nenhuma sessão para este dia</div>
              <button onClick={() => setModalRecorr(true)} style={{ padding: "8px 20px", borderRadius: 8, border: "1px solid rgba(29,158,117,.3)", background: "rgba(29,158,117,.08)", color: "#1D9E75", fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                + Agendar sessão
              </button>
            </div>
          ) : (
            sessoesFiltradas.filter(s => s.data === isoDate(dataReferencia)).map(s => {
              const st  = STATUS_CONFIG[s.status];
              const tip = TIPO_SESSAO_CONFIG[s.tipoSessao];
              return (
                <button key={s.id} onClick={() => setSessaoAberta(s)} style={{ ...card, padding: "14px 18px", cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 14, border: `1px solid ${st.borda}` }}>
                  <div style={{ width: 40, height: 40, borderRadius: "50%", background: s.gradient, display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".72rem", fontWeight: 800, color: "#fff", flexShrink: 0 }}>{s.pacienteIniciais}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: ".88rem", fontWeight: 700, color: "#e8f0f8", marginBottom: 2 }}>{s.pacienteNome}</div>
                    <div style={{ fontSize: ".72rem", color: "rgba(160,200,235,.84)" }}>{s.horario} · {s.duracaoMin}min · <span style={{ color: tip.cor, fontWeight: 600 }}>{tip.label}</span></div>
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
              const diasNoMes  = new Date(ano, mes + 1, 0).getDate();
              const cells = [];
              for (let i = 0; i < primeiroDia; i++) cells.push(<div key={`e${i}`} />);
              for (let d = 1; d <= diasNoMes; d++) {
                const ds = `${ano}-${String(mes+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
                const count = todasSessoes.filter(s => s.data === ds).length;
                const hoje  = isHoje(ds);
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

      {/* ── MODAL DETALHES SESSÃO ── */}
      {sessaoAberta && (
        <div onClick={() => setSessaoAberta(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 20 }}>
          <div style={{ background: "#0d2035", border: "1px solid rgba(26,58,92,.7)", borderRadius: 18, padding: 28, width: "100%", maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            {(() => {
              const s   = sessaoAberta;
              const st  = STATUS_CONFIG[s.status];
              const tip = TIPO_SESSAO_CONFIG[s.tipoSessao];
              return (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                    <div style={{ width: 44, height: 44, borderRadius: "50%", background: s.gradient, display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".75rem", fontWeight: 800, color: "#fff" }}>{s.pacienteIniciais}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "1rem", fontWeight: 700, color: "#e8f0f8" }}>{s.pacienteNome}</div>
                      <div style={{ fontSize: ".72rem", color: "rgba(160,200,235,.84)" }}>{fmtData(s.data)} · {s.horario} · {s.duracaoMin}min</div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end" }}>
                      <span style={{ fontSize: ".65rem", color: st.cor, background: st.bg, border: `1px solid ${st.borda}`, borderRadius: 20, padding: "3px 10px", fontWeight: 700 }}>{st.label}</span>
                      <span style={{ fontSize: ".6rem", color: tip.cor, background: tip.cor + "15", border: `1px solid ${tip.cor}33`, borderRadius: 20, padding: "2px 8px", fontWeight: 600 }}>{tip.label}</span>
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
                    {[
                      { l: "Local",    v: s.local },
                      { l: "Duração",  v: `${s.duracaoMin} min` },
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
                        { l: "Terapeuta",   ok: s.confirmadoTerapeuta,   sub: s.confirmadoTerapeuta ? "Confirmado" : "Aguardando" },
                        { l: "Responsável", ok: s.confirmadoResponsavel, sub: s.confirmadoResponsavel ? "Confirmado via FractaCare" : "Aguardando no FractaCare" },
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

                  {s.observacoes && (
                    <div style={{ marginBottom: 16, padding: "10px 14px", background: "rgba(26,58,92,.25)", borderRadius: 9, fontSize: ".78rem", color: "rgba(160,200,235,.84)", lineHeight: 1.5 }}>
                      {s.observacoes}
                    </div>
                  )}

                  <div style={{ display: "flex", gap: 10 }}>
                    {(s.status === "confirmada" || s.status === "agendado") && (
                      <Link
                        href={`/clinic/sessao?pacienteId=${s.pacienteId}&duracao=${s.duracaoMin}&tipo=${s.tipoSessao}&local=${s.local === "Clínica" ? "presencial" : s.local}&agendaId=${s.id}`}
                        style={{ flex: 1, padding: 11, borderRadius: 9, border: "none", background: "linear-gradient(135deg,#1D9E75,#0f8f7a)", color: "#07111f", fontFamily: "var(--font-sans)", fontWeight: 700, fontSize: ".82rem", textDecoration: "none", textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center" }}
                      >
                        Iniciar sessão →
                      </Link>
                    )}
                    {(s.status === "pendente") && (
                      <button style={{ flex: 1, padding: 11, borderRadius: 9, border: "none", background: "linear-gradient(135deg,#1D9E75,#0f8f7a)", color: "#07111f", fontFamily: "var(--font-sans)", fontWeight: 700, fontSize: ".82rem", cursor: "pointer" }}>
                        Confirmar sessão
                      </button>
                    )}
                    {s.status === "aguardando_responsavel" && (
                      <button style={{ flex: 1, padding: 11, borderRadius: 9, border: "1px solid rgba(239,159,39,.3)", background: "rgba(239,159,39,.08)", color: "#EF9F27", fontFamily: "var(--font-sans)", fontWeight: 600, fontSize: ".82rem", cursor: "pointer" }}>
                        Reenviar notificação
                      </button>
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
                      Esta sessão precisa de reposição dentro do contrato
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* ── MODAL NOVA RECORRÊNCIA ── */}
      {modalRecorr && (
        <div onClick={() => setModalRecorr(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.65)", backdropFilter: "blur(5px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#0d2035", border: "1px solid rgba(26,58,92,.7)", borderRadius: 18, padding: 28, width: "100%", maxWidth: 520, maxHeight: "90vh", overflowY: "auto" }}>

            <div style={{ fontSize: "1rem", fontWeight: 700, color: "#e8f0f8", marginBottom: 4 }}>Novo agendamento recorrente</div>
            <div style={{ fontSize: ".72rem", color: "rgba(160,200,235,.5)", marginBottom: 24 }}>
              O sistema gerará automaticamente as sessões no calendário e alertará sobre conflitos de horário.
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

              {/* Paciente */}
              <div>
                <div style={{ fontSize: ".62rem", color: "rgba(170,210,245,.88)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 6 }}>Paciente</div>
                <select value={form.pacienteId} onChange={e => setForm(f => ({ ...f, pacienteId: e.target.value }))} style={inp}>
                  <option value="">Selecionar paciente...</option>
                  {pacientes.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                </select>
              </div>

              {/* Tipo de sessão */}
              <div>
                <div style={{ fontSize: ".62rem", color: "rgba(170,210,245,.88)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 6 }}>Tipo de sessão</div>
                <div style={{ display: "flex", gap: 6 }}>
                  {(["atendimento","acompanhamento_terapeutico","supervisao"] as TipoSessao[]).map(t => {
                    const cfg = TIPO_SESSAO_CONFIG[t];
                    const ativo = form.tipoSessao === t;
                    return (
                      <button key={t} onClick={() => setForm(f => ({ ...f, tipoSessao: t }))} style={{ flex: 1, padding: "8px 6px", borderRadius: 8, border: `1px solid ${ativo ? cfg.cor + "55" : "rgba(26,58,92,.4)"}`, background: ativo ? cfg.cor + "15" : "transparent", color: ativo ? cfg.cor : "rgba(160,200,235,.4)", fontSize: ".7rem", fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-sans)" }}>
                        {cfg.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Local */}
              <div>
                <div style={{ fontSize: ".62rem", color: "rgba(170,210,245,.88)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 6 }}>Local</div>
                <div style={{ display: "flex", gap: 6 }}>
                  {([["presencial","Presencial"],["remoto","Remoto"],["ambiente_natural","Amb. Natural"]] as const).map(([val, label]) => {
                    const ativo = form.local === val;
                    return (
                      <button key={val} onClick={() => setForm(f => ({ ...f, local: val }))} style={{ flex: 1, padding: "8px 6px", borderRadius: 8, border: `1px solid ${ativo ? "rgba(55,138,221,.5)" : "rgba(26,58,92,.4)"}`, background: ativo ? "rgba(55,138,221,.15)" : "transparent", color: ativo ? "#378ADD" : "rgba(160,200,235,.4)", fontSize: ".7rem", fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-sans)" }}>
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Dias da semana */}
              <div>
                <div style={{ fontSize: ".62rem", color: "rgba(170,210,245,.88)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 6 }}>Dias da semana</div>
                <div style={{ display: "flex", gap: 6 }}>
                  {DIAS_SEMANA.map((d, i) => {
                    const ativo = form.diasSemana.includes(i);
                    return (
                      <button key={i} onClick={() => setForm(f => ({ ...f, diasSemana: ativo ? f.diasSemana.filter(x => x !== i) : [...f.diasSemana, i] }))} style={{ flex: 1, padding: "8px 4px", borderRadius: 8, border: `1px solid ${ativo ? "rgba(29,158,117,.5)" : "rgba(26,58,92,.4)"}`, background: ativo ? "rgba(29,158,117,.15)" : "transparent", color: ativo ? "#1D9E75" : "rgba(160,200,235,.4)", fontSize: ".68rem", fontWeight: ativo ? 700 : 400, cursor: "pointer", fontFamily: "var(--font-sans)" }}>
                        {d}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Horário e duração */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <div style={{ fontSize: ".62rem", color: "rgba(170,210,245,.88)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 6 }}>Horário</div>
                  <input type="time" value={form.horario} onChange={e => setForm(f => ({ ...f, horario: e.target.value }))} style={inp} />
                </div>
                <div>
                  <div style={{ fontSize: ".62rem", color: "rgba(170,210,245,.88)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 6 }}>Duração (min)</div>
                  <input type="number" min={15} max={240} step={15} value={form.duracaoMin} onChange={e => setForm(f => ({ ...f, duracaoMin: parseInt(e.target.value) }))} style={inp} />
                </div>
              </div>

              {/* Período */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <div style={{ fontSize: ".62rem", color: "rgba(170,210,245,.88)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 6 }}>Data de início</div>
                  <input type="date" value={form.dataInicio} onChange={e => setForm(f => ({ ...f, dataInicio: e.target.value }))} style={inp} />
                </div>
                <div>
                  <div style={{ fontSize: ".62rem", color: "rgba(170,210,245,.88)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 6 }}>Data de fim (opcional)</div>
                  <input type="date" value={form.dataFim} onChange={e => setForm(f => ({ ...f, dataFim: e.target.value }))} style={inp} />
                </div>
              </div>

              {/* Semanas de geração (se sem data fim) */}
              {!form.dataFim && (
                <div>
                  <div style={{ fontSize: ".62rem", color: "rgba(170,210,245,.88)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 6 }}>Gerar para as próximas (semanas)</div>
                  <input type="number" min={1} max={52} value={form.semanas} onChange={e => setForm(f => ({ ...f, semanas: parseInt(e.target.value) }))} style={inp} />
                </div>
              )}

              {/* Aviso de conflito */}
              <div style={{ padding: "10px 12px", background: "rgba(239,159,39,.06)", border: "1px solid rgba(239,159,39,.2)", borderRadius: 9, fontSize: ".72rem", color: "rgba(239,159,39,.8)", lineHeight: 1.55 }}>
                Sessões com conflito de horário serão ignoradas automaticamente. Você receberá um aviso com o total gerado.
              </div>

              {erroRecorr && (
                <div style={{ padding: "10px 12px", background: "rgba(224,90,75,.08)", border: "1px solid rgba(224,90,75,.2)", borderRadius: 9, fontSize: ".72rem", color: "#E05A4B" }}>
                  {erroRecorr}
                </div>
              )}

              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setModalRecorr(false)} style={{ flex: 1, padding: 11, borderRadius: 9, border: "1px solid rgba(70,120,180,.4)", background: "transparent", color: "rgba(160,200,235,.6)", fontFamily: "var(--font-sans)", fontSize: 13, cursor: "pointer" }}>
                  Cancelar
                </button>
                <button onClick={criarRecorrencia} disabled={salvandoRecorr} style={{ flex: 2, padding: 11, borderRadius: 9, border: "none", background: salvandoRecorr ? "rgba(29,158,117,.4)" : "linear-gradient(135deg,#1D9E75,#0f8f7a)", color: "#07111f", fontFamily: "var(--font-sans)", fontWeight: 700, fontSize: 13, cursor: salvandoRecorr ? "not-allowed" : "pointer" }}>
                  {salvandoRecorr ? "Agendando..." : `Agendar sessões recorrentes`}
                </button>
              </div>
            </div>
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
      </div>

    </div>
  );
}
