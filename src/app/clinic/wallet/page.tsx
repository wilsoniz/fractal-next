"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { useClinicContext } from "../layout";

// ─── TIPOS ───────────────────────────────────────────────────────────────────
type TabWallet    = "visao-geral" | "contratos" | "historico" | "projecao";
type StatusPagamento = "pago" | "pendente" | "atrasado" | "cancelado";
type Modalidade   = "presencial" | "domiciliar" | "teleconsulta";

interface ContratoFinanceiro {
  id: string;
  pacienteId: string;
  pacienteNome: string;
  pacienteIniciais: string;
  gradient: string;
  cor: string;
  modalidade: Modalidade;
  sessoesPorMes: number;
  valorSessao: number;
  valorMensal: number;
  diaVencimento: number;
  inicioContrato: string;
  fimContrato: string;
  planoSaude: boolean;
  nomePlano?: string;
  sessoesRealizadas: number;
  sessoesPagas: number;
  sessoesPendentes: number;
  sessoesCanceladas: number;
  valorRecebido: number;
  valorPendente: number;
  statusPagamento: StatusPagamento;
  ultimoPagamento?: string;
  observacoes?: string;
}

interface MesHistorico {
  mes: string;
  mesLabel: string;
  receitaRealizada: number;
  receitaPrevista: number;
  sessoes: number;
  inadimplencia: number;
}

// ─── MOCK DATA ────────────────────────────────────────────────────────────────
const CONTRATOS: ContratoFinanceiro[] = [
  {
    id: "c1", pacienteId: "1",
    pacienteNome: "Lucas Carvalho", pacienteIniciais: "LC",
    gradient: "linear-gradient(135deg,#1D9E75,#378ADD)", cor: "#1D9E75",
    modalidade: "presencial",
    sessoesPorMes: 12, valorSessao: 250, valorMensal: 3000,
    diaVencimento: 5,
    inicioContrato: "2025-01-15", fimContrato: "2026-01-15",
    planoSaude: false,
    sessoesRealizadas: 10, sessoesPagas: 10, sessoesPendentes: 0, sessoesCanceladas: 2,
    valorRecebido: 2500, valorPendente: 0,
    statusPagamento: "pago",
    ultimoPagamento: "05 Abr 2025",
  },
  {
    id: "c2", pacienteId: "2",
    pacienteNome: "Maria Santos", pacienteIniciais: "MS",
    gradient: "linear-gradient(135deg,#378ADD,#8B7FE8)", cor: "#378ADD",
    modalidade: "teleconsulta",
    sessoesPorMes: 8, valorSessao: 250, valorMensal: 2000,
    diaVencimento: 10,
    inicioContrato: "2025-02-01", fimContrato: "2025-08-01",
    planoSaude: false,
    sessoesRealizadas: 7, sessoesPagas: 5, sessoesPendentes: 2, sessoesCanceladas: 1,
    valorRecebido: 1250, valorPendente: 500,
    statusPagamento: "pendente",
    ultimoPagamento: "28 Mar 2025",
    observacoes: "Responsável solicitou parcelamento em 2x",
  },
  {
    id: "c3", pacienteId: "3",
    pacienteNome: "Rafael Pinto", pacienteIniciais: "RP",
    gradient: "linear-gradient(135deg,#8B7FE8,#E05A4B)", cor: "#8B7FE8",
    modalidade: "domiciliar",
    sessoesPorMes: 12, valorSessao: 280, valorMensal: 3360,
    diaVencimento: 1,
    inicioContrato: "2025-01-08", fimContrato: "2026-01-08",
    planoSaude: true, nomePlano: "Unimed",
    sessoesRealizadas: 11, sessoesPagas: 11, sessoesPendentes: 0, sessoesCanceladas: 1,
    valorRecebido: 3080, valorPendente: 0,
    statusPagamento: "pago",
    ultimoPagamento: "01 Abr 2025",
    observacoes: "Reembolso via plano — prazo 30 dias",
  },
  {
    id: "c4", pacienteId: "4",
    pacienteNome: "Beatriz Lima", pacienteIniciais: "BL",
    gradient: "linear-gradient(135deg,#4d6d8a,#378ADD)", cor: "#4d6d8a",
    modalidade: "presencial",
    sessoesPorMes: 8, valorSessao: 250, valorMensal: 2000,
    diaVencimento: 15,
    inicioContrato: "2025-01-13", fimContrato: "2026-01-13",
    planoSaude: false,
    sessoesRealizadas: 4, sessoesPagas: 2, sessoesPendentes: 2, sessoesCanceladas: 4,
    valorRecebido: 500, valorPendente: 500,
    statusPagamento: "atrasado",
    ultimoPagamento: "15 Mar 2025",
    observacoes: "Baixa adesão — responsável não responde. Considerar suspensão.",
  },
  {
    id: "c5", pacienteId: "5",
    pacienteNome: "Pedro Gomes", pacienteIniciais: "PG",
    gradient: "linear-gradient(135deg,#EF9F27,#E05A4B)", cor: "#EF9F27",
    modalidade: "presencial",
    sessoesPorMes: 12, valorSessao: 300, valorMensal: 3600,
    diaVencimento: 3,
    inicioContrato: "2025-01-06", fimContrato: "2026-01-06",
    planoSaude: false,
    sessoesRealizadas: 12, sessoesPagas: 12, sessoesPendentes: 0, sessoesCanceladas: 0,
    valorRecebido: 3600, valorPendente: 0,
    statusPagamento: "pago",
    ultimoPagamento: "03 Abr 2025",
  },
];

const HISTORICO: MesHistorico[] = [
  { mes: "2024-11", mesLabel: "Nov", receitaRealizada: 9800,  receitaPrevista: 11960, sessoes: 39, inadimplencia: 1200 },
  { mes: "2024-12", mesLabel: "Dez", receitaRealizada: 8200,  receitaPrevista: 11960, sessoes: 33, inadimplencia: 1800 },
  { mes: "2025-01", mesLabel: "Jan", receitaRealizada: 10500, receitaPrevista: 11960, sessoes: 42, inadimplencia: 800  },
  { mes: "2025-02", mesLabel: "Fev", receitaRealizada: 11200, receitaPrevista: 11960, sessoes: 44, inadimplencia: 500  },
  { mes: "2025-03", mesLabel: "Mar", receitaRealizada: 10800, receitaPrevista: 11960, sessoes: 43, inadimplencia: 600  },
  { mes: "2025-04", mesLabel: "Abr", receitaRealizada: 10930, receitaPrevista: 11960, sessoes: 44, inadimplencia: 1000 },
];

const PROJECAO_MESES = [
  { mes: "Mai 2025", previsto: 11960, otimista: 13200, conservador: 10800 },
  { mes: "Jun 2025", previsto: 11960, otimista: 13500, conservador: 10500 },
  { mes: "Jul 2025", previsto: 10760, otimista: 12000, conservador: 9500  }, // fim contrato Maria
  { mes: "Ago 2025", previsto: 8760,  otimista: 10000, conservador: 8000  }, // fim contrato Maria
  { mes: "Set 2025", previsto: 8760,  otimista: 10000, conservador: 8000  },
  { mes: "Out 2025", previsto: 8760,  otimista: 10000, conservador: 8000  },
];

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const STATUS_PAG_CONFIG: Record<StatusPagamento, { label: string; cor: string; bg: string; borda: string }> = {
  pago:      { label: "Em dia",    cor: "#1D9E75", bg: "rgba(29,158,117,.1)",  borda: "rgba(29,158,117,.25)" },
  pendente:  { label: "Pendente",  cor: "#EF9F27", bg: "rgba(239,159,39,.1)",  borda: "rgba(239,159,39,.25)" },
  atrasado:  { label: "Atrasado",  cor: "#E05A4B", bg: "rgba(224,90,75,.1)",   borda: "rgba(224,90,75,.25)"  },
  cancelado: { label: "Cancelado", cor: "#4d6d8a", bg: "rgba(77,109,138,.1)",  borda: "rgba(26,58,92,.4)"    },
};

function fmtBRL(val: number): string {
  return `R$ ${val.toLocaleString("pt-BR")}`;
}
function fmtK(val: number): string {
  return val >= 1000 ? `R$ ${(val / 1000).toFixed(1)}k` : fmtBRL(val);
}

const tooltipStyle = {
  contentStyle: { background: "#0d2035", border: "1px solid rgba(26,58,92,.7)", borderRadius: 10, color: "#e8f0f8", fontSize: 11 },
};

// ─── PAGE ────────────────────────────────────────────────────────────────────
export default function ClinicWalletPage() {
  const { terapeuta } = useClinicContext();
  const nivel = terapeuta?.nivel ?? "coordenador";

  const [tab,          setTab]          = useState<TabWallet>("visao-geral");
  const [contratoSel,  setContratoSel]  = useState<ContratoFinanceiro | null>(null);

  // ── Métricas do mês atual ──────────────────────────────────────────────────
  const metricas = useMemo(() => {
    const receitaRealizada  = CONTRATOS.reduce((a, c) => a + c.valorRecebido, 0);
    const receitaPrevista   = CONTRATOS.reduce((a, c) => a + c.valorMensal, 0);
    const inadimplencia     = CONTRATOS.reduce((a, c) => a + c.valorPendente, 0);
    const totalSessoes      = CONTRATOS.reduce((a, c) => a + c.sessoesRealizadas, 0);
    const taxaAdimplencia   = Math.round((receitaRealizada / receitaPrevista) * 100);
    const contratosAtivos   = CONTRATOS.length;
    const contratosAtrasados= CONTRATOS.filter(c => c.statusPagamento === "atrasado").length;
    const ticketMedio       = Math.round(receitaRealizada / contratosAtivos);
    return { receitaRealizada, receitaPrevista, inadimplencia, totalSessoes, taxaAdimplencia, contratosAtivos, contratosAtrasados, ticketMedio };
  }, []);

  // ── CSS ────────────────────────────────────────────────────────────────────
  const card: React.CSSProperties = {
    background: "rgba(13,32,53,.75)",
    border: "1px solid rgba(70,120,180,.5)",
    borderRadius: 14,
    backdropFilter: "blur(8px)",
  };
  const lbl: React.CSSProperties = {
    fontSize: ".6rem", fontWeight: 700, textTransform: "uppercase" as const,
    letterSpacing: ".09em", color: "rgba(170,210,245,.88)", marginBottom: 8,
  };

  const TABS: { id: TabWallet; label: string }[] = [
    { id: "visao-geral", label: "Visão geral" },
    { id: "contratos",   label: "Contratos"   },
    { id: "historico",   label: "Histórico"   },
    { id: "projecao",    label: "Projeção"    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* ── HEADER ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: "1.2rem", fontWeight: 800, color: "#e8f0f8", margin: 0, marginBottom: 4 }}>Clinic Wallet</h1>
          <div style={{ fontSize: ".72rem", color: "rgba(160,200,235,.84)" }}>Abril 2025 · {metricas.contratosAtivos} contratos ativos</div>
        </div>
        {nivel === "supervisor" && (
          <button style={{ padding: "9px 16px", borderRadius: 9, border: "none", background: "linear-gradient(135deg,#1D9E75,#0f8f7a)", color: "#07111f", fontWeight: 700, fontSize: ".82rem", cursor: "pointer", fontFamily: "var(--font-sans)", display: "flex", alignItems: "center", gap: 6 }}>
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 10h12M8 4v8M4 7l4-4 4 4"/></svg>
            Exportar relatório
          </button>
        )}
      </div>

      {/* ── KPIs PRINCIPAIS ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 10 }}>
        {[
          { l: "Receita realizada",  v: fmtK(metricas.receitaRealizada), c: "#1D9E75", sub: `de ${fmtK(metricas.receitaPrevista)} previstos` },
          { l: "Taxa de adimplência",v: `${metricas.taxaAdimplencia}%`,  c: metricas.taxaAdimplencia >= 90 ? "#1D9E75" : metricas.taxaAdimplencia >= 75 ? "#EF9F27" : "#E05A4B", sub: `${metricas.contratosAtrasados} contrato(s) atrasado(s)` },
          { l: "Inadimplência",      v: fmtK(metricas.inadimplencia),    c: metricas.inadimplencia > 0 ? "#E05A4B" : "#1D9E75", sub: "valor em aberto" },
          { l: "Ticket médio",       v: fmtK(metricas.ticketMedio),      c: "#e8f0f8", sub: `${metricas.totalSessoes} sessões realizadas` },
        ].map(k => (
          <div key={k.l} style={{ ...card, padding: "16px 18px" }}>
            <div style={{ fontSize: ".6rem", color: "rgba(170,210,245,.88)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 6 }}>{k.l}</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 800, color: k.c, letterSpacing: "-.02em", lineHeight: 1, marginBottom: 4 }}>{k.v}</div>
            <div style={{ fontSize: ".65rem", color: "rgba(170,210,245,.88)" }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Barra de receita realizada vs prevista */}
      <div style={{ ...card, padding: "12px 18px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ fontSize: ".72rem", color: "rgba(160,200,235,.90)" }}>Progresso do mês</span>
          <span style={{ fontSize: ".72rem", color: "#1D9E75", fontWeight: 600 }}>{fmtBRL(metricas.receitaRealizada)} / {fmtBRL(metricas.receitaPrevista)}</span>
        </div>
        <div style={{ height: 8, background: "rgba(26,58,92,.5)", borderRadius: 50, overflow: "hidden", marginBottom: 6 }}>
          <div style={{ height: "100%", width: `${metricas.taxaAdimplencia}%`, background: "linear-gradient(90deg,#1D9E75,#23c48f)", transition: "width .5s" }} />
        </div>
        <div style={{ display: "flex", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: "#1D9E75" }} />
            <span style={{ fontSize: ".65rem", color: "rgba(160,200,235,.84)" }}>Recebido: {fmtK(metricas.receitaRealizada)}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: "#E05A4B" }} />
            <span style={{ fontSize: ".65rem", color: "rgba(160,200,235,.84)" }}>Pendente: {fmtK(metricas.inadimplencia)}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: "rgba(26,58,92,.6)" }} />
            <span style={{ fontSize: ".65rem", color: "rgba(160,200,235,.84)" }}>Restante: {fmtK(metricas.receitaPrevista - metricas.receitaRealizada - metricas.inadimplencia)}</span>
          </div>
        </div>
      </div>

      {/* Alerta de inadimplência */}
      {metricas.contratosAtrasados > 0 && (
        <div style={{ background: "rgba(224,90,75,.08)", border: "1px solid rgba(224,90,75,.25)", borderRadius: 10, padding: "10px 16px", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#E05A4B", flexShrink: 0 }} />
          <span style={{ fontSize: ".78rem", color: "rgba(175,210,240,.95)", flex: 1 }}>
            <strong style={{ color: "#E05A4B" }}>{metricas.contratosAtrasados} contrato(s) com pagamento atrasado</strong> — total de {fmtBRL(metricas.inadimplencia)} em aberto
          </span>
          <button style={{ padding: "4px 12px", borderRadius: 6, border: "1px solid rgba(224,90,75,.3)", background: "transparent", color: "#E05A4B", fontFamily: "var(--font-sans)", fontWeight: 600, fontSize: ".72rem", cursor: "pointer" }}>
            Ver contratos
          </button>
        </div>
      )}

      {/* ── TABS ── */}
      <div style={{ display: "flex", borderBottom: "1px solid rgba(26,58,92,.4)", marginBottom: 4 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: "10px 18px", background: "none", border: "none",
            borderBottom: `2px solid ${tab === t.id ? "#1D9E75" : "transparent"}`,
            color: tab === t.id ? "#1D9E75" : "rgba(160,200,235,.84)",
            fontFamily: "var(--font-sans)", fontWeight: tab === t.id ? 600 : 400,
            fontSize: ".82rem", cursor: "pointer", marginBottom: -1,
          }}>{t.label}</button>
        ))}
      </div>

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* TAB: VISÃO GERAL */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      {tab === "visao-geral" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

          {/* Receita por contrato — barras */}
          <div style={{ ...card, padding: 20 }}>
            <div style={{ fontSize: ".88rem", fontWeight: 700, color: "#e8f0f8", marginBottom: 4 }}>Receita por paciente</div>
            <div style={{ fontSize: ".7rem", color: "rgba(160,200,235,.84)", marginBottom: 16 }}>Recebido vs previsto em abril</div>
            <div style={{ height: 220, minHeight: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={CONTRATOS.map(c => ({ nome: c.pacienteNome.split(" ")[0], recebido: c.valorRecebido, pendente: c.valorPendente, cor: c.cor }))} barSize={20}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(26,58,92,.4)" vertical={false} />
                  <XAxis dataKey="nome" stroke="rgba(165,208,242,.85)" tick={{ fill: "rgba(160,200,235,.90)", fontSize: 11 }} />
                  <YAxis stroke="rgba(165,208,242,.85)" tick={{ fill: "rgba(160,200,235,.84)", fontSize: 10 }} tickFormatter={v => `${v/1000}k`} />
                  <Tooltip {...tooltipStyle} formatter={(v: number) => [fmtBRL(v)]} />
                  <Bar dataKey="recebido" name="Recebido" stackId="a" radius={[0,0,0,0]}>
                    {CONTRATOS.map((c, i) => <Cell key={i} fill={c.cor} fillOpacity={0.8} />)}
                  </Bar>
                  <Bar dataKey="pendente" name="Pendente" stackId="a" radius={[4,4,0,0]}>
                    {CONTRATOS.map((_, i) => <Cell key={i} fill="#E05A4B" fillOpacity={0.5} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Status dos contratos */}
          <div style={{ ...card, padding: 20 }}>
            <div style={{ fontSize: ".88rem", fontWeight: 700, color: "#e8f0f8", marginBottom: 14 }}>Status dos contratos</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {CONTRATOS.map(c => {
                const st = STATUS_PAG_CONFIG[c.statusPagamento];
                const pct = c.valorMensal > 0 ? Math.round((c.valorRecebido / c.valorMensal) * 100) : 0;
                return (
                  <button key={c.id} onClick={() => setContratoSel(c)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "rgba(26,58,92,.2)", borderRadius: 10, border: `1px solid ${c.statusPagamento === "atrasado" ? "rgba(224,90,75,.25)" : "rgba(26,58,92,.4)"}`, cursor: "pointer", textAlign: "left", fontFamily: "var(--font-sans)", width: "100%" }}>
                    <div style={{ width: 30, height: 30, borderRadius: "50%", background: c.gradient, display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".58rem", fontWeight: 800, color: "#fff", flexShrink: 0 }}>{c.pacienteIniciais}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <span style={{ fontSize: ".78rem", fontWeight: 600, color: "#e8f0f8" }}>{c.pacienteNome.split(" ")[0]}</span>
                        <span style={{ fontSize: ".72rem", color: c.cor, fontWeight: 700 }}>{pct}%</span>
                      </div>
                      <div style={{ height: 4, background: "rgba(26,58,92,.5)", borderRadius: 2, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${pct}%`, background: pct >= 100 ? "#1D9E75" : pct >= 50 ? "#EF9F27" : "#E05A4B" }} />
                      </div>
                    </div>
                    <span style={{ fontSize: ".62rem", color: st.cor, background: st.bg, border: `1px solid ${st.borda}`, borderRadius: 20, padding: "2px 8px", fontWeight: 600, flexShrink: 0 }}>{st.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sessões do mês */}
          <div style={{ ...card, padding: 20 }}>
            <div style={{ fontSize: ".88rem", fontWeight: 700, color: "#e8f0f8", marginBottom: 14 }}>Sessões — abril</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 16 }}>
              {[
                { l: "Realizadas",  v: CONTRATOS.reduce((a,c) => a+c.sessoesRealizadas, 0),  c: "#1D9E75" },
                { l: "Pagas",       v: CONTRATOS.reduce((a,c) => a+c.sessoesPagas, 0),        c: "#1D9E75" },
                { l: "Pendentes",   v: CONTRATOS.reduce((a,c) => a+c.sessoesPendentes, 0),    c: "#EF9F27" },
                { l: "Canceladas",  v: CONTRATOS.reduce((a,c) => a+c.sessoesCanceladas, 0),   c: "#4d6d8a" },
              ].map(k => (
                <div key={k.l} style={{ background: "rgba(26,58,92,.25)", borderRadius: 9, padding: "10px 12px", textAlign: "center" }}>
                  <div style={{ fontSize: ".58rem", color: "rgba(170,210,245,.88)", marginBottom: 4 }}>{k.l}</div>
                  <div style={{ fontSize: "1.4rem", fontWeight: 800, color: k.c }}>{k.v}</div>
                </div>
              ))}
            </div>
            <div style={{ ...lbl }}>Breakdown por paciente</div>
            {CONTRATOS.map(c => (
              <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: c.cor, flexShrink: 0 }} />
                <span style={{ fontSize: ".75rem", color: "rgba(160,200,235,.92)", flex: 1 }}>{c.pacienteNome.split(" ")[0]}</span>
                <span style={{ fontSize: ".72rem", color: "#1D9E75", fontFamily: "monospace" }}>{c.sessoesRealizadas}</span>
                <span style={{ fontSize: ".65rem", color: "rgba(165,208,242,.85)" }}>/ {c.sessoesPorMes}</span>
                {c.sessoesCanceladas > 0 && <span style={{ fontSize: ".62rem", color: "#4d6d8a" }}>({c.sessoesCanceladas} cancel.)</span>}
              </div>
            ))}
          </div>

          {/* Planos de saúde */}
          <div style={{ ...card, padding: 20 }}>
            <div style={{ fontSize: ".88rem", fontWeight: 700, color: "#e8f0f8", marginBottom: 14 }}>Modalidade de pagamento</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { l: "Particular",      v: CONTRATOS.filter(c => !c.planoSaude).length, val: CONTRATOS.filter(c => !c.planoSaude).reduce((a,c) => a+c.valorMensal,0), cor: "#1D9E75" },
                { l: "Plano de saúde",  v: CONTRATOS.filter(c => c.planoSaude).length,  val: CONTRATOS.filter(c => c.planoSaude).reduce((a,c) => a+c.valorMensal,0),  cor: "#378ADD" },
              ].map(m => (
                <div key={m.l} style={{ padding: "12px 14px", background: "rgba(26,58,92,.25)", borderRadius: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: ".8rem", fontWeight: 600, color: "#e8f0f8" }}>{m.l}</span>
                    <span style={{ fontSize: ".78rem", color: m.cor, fontWeight: 700 }}>{fmtK(m.val)}/mês</span>
                  </div>
                  <div style={{ fontSize: ".7rem", color: "rgba(160,200,235,.84)" }}>{m.v} contrato(s) · {Math.round(m.val / metricas.receitaPrevista * 100)}% da receita</div>
                  <div style={{ marginTop: 8, height: 4, background: "rgba(26,58,92,.5)", borderRadius: 2, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${Math.round(m.val / metricas.receitaPrevista * 100)}%`, background: m.cor }} />
                  </div>
                </div>
              ))}
              {CONTRATOS.filter(c => c.planoSaude).map(c => (
                <div key={c.id} style={{ padding: "8px 12px", background: "rgba(55,138,221,.06)", border: "1px solid rgba(55,138,221,.15)", borderRadius: 8 }}>
                  <div style={{ fontSize: ".72rem", color: "#378ADD", fontWeight: 600 }}>{c.pacienteNome.split(" ")[0]} — {c.nomePlano}</div>
                  <div style={{ fontSize: ".65rem", color: "rgba(160,200,235,.84)", marginTop: 2 }}>{c.observacoes}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* TAB: CONTRATOS */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      {tab === "contratos" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {CONTRATOS.map(c => {
            const st  = STATUS_PAG_CONFIG[c.statusPagamento];
            const pct = Math.round((c.valorRecebido / c.valorMensal) * 100);
            const mesesRestantes = Math.round((new Date(c.fimContrato).getTime() - new Date("2025-04-16").getTime()) / (1000 * 60 * 60 * 24 * 30));
            const valorRestanteContrato = mesesRestantes * c.valorMensal;
            return (
              <div key={c.id} style={{ ...card, padding: 22, border: `1px solid ${c.statusPagamento === "atrasado" ? "rgba(224,90,75,.3)" : "rgba(26,58,92,.5)"}` }}>
                {/* Header */}
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 18 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 44, height: 44, borderRadius: "50%", background: c.gradient, display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".75rem", fontWeight: 800, color: "#fff" }}>{c.pacienteIniciais}</div>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                        <span style={{ fontSize: ".95rem", fontWeight: 700, color: "#e8f0f8" }}>{c.pacienteNome}</span>
                        <span style={{ fontSize: ".62rem", color: st.cor, background: st.bg, border: `1px solid ${st.borda}`, borderRadius: 20, padding: "2px 8px", fontWeight: 600 }}>{st.label}</span>
                        {c.planoSaude && <span style={{ fontSize: ".62rem", color: "#378ADD", background: "rgba(55,138,221,.1)", border: "1px solid rgba(55,138,221,.2)", borderRadius: 20, padding: "2px 8px", fontWeight: 600 }}>{c.nomePlano}</span>}
                      </div>
                      <div style={{ fontSize: ".72rem", color: "rgba(160,200,235,.84)" }}>
                        {c.modalidade === "presencial" ? "Presencial" : c.modalidade === "domiciliar" ? "Domiciliar" : "Teleconsulta"} · {c.sessoesPorMes} sessões/mês · Vence dia {c.diaVencimento}
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "#1D9E75", lineHeight: 1 }}>{fmtBRL(c.valorMensal)}</div>
                    <div style={{ fontSize: ".65rem", color: "rgba(170,210,245,.88)", marginTop: 2 }}>/mês · {fmtBRL(c.valorSessao)}/sessão</div>
                  </div>
                </div>

                {/* Grid de métricas */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 16 }}>
                  {[
                    { l: "Recebido (mês)",    v: fmtBRL(c.valorRecebido),  c: "#1D9E75" },
                    { l: "Pendente (mês)",    v: fmtBRL(c.valorPendente),  c: c.valorPendente > 0 ? "#E05A4B" : "rgba(170,210,245,.88)" },
                    { l: "Sessões realizadas",v: `${c.sessoesRealizadas}/${c.sessoesPorMes}`, c: "#e8f0f8" },
                    { l: "Valor restante",    v: fmtK(valorRestanteContrato), c: "#EF9F27" },
                  ].map(m => (
                    <div key={m.l} style={{ background: "rgba(26,58,92,.25)", borderRadius: 9, padding: "10px 12px" }}>
                      <div style={{ fontSize: ".58rem", color: "rgba(170,210,245,.88)", marginBottom: 4 }}>{m.l}</div>
                      <div style={{ fontSize: ".88rem", fontWeight: 700, color: m.c }}>{m.v}</div>
                    </div>
                  ))}
                </div>

                {/* Progresso do mês */}
                <div style={{ marginBottom: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                    <span style={{ fontSize: ".68rem", color: "rgba(160,200,235,.84)" }}>Pagamento do mês</span>
                    <span style={{ fontSize: ".68rem", color: pct >= 100 ? "#1D9E75" : "#EF9F27", fontWeight: 600 }}>{pct}%</span>
                  </div>
                  <div style={{ height: 6, background: "rgba(26,58,92,.5)", borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${Math.min(100, pct)}%`, background: pct >= 100 ? "#1D9E75" : pct >= 50 ? "#EF9F27" : "#E05A4B", transition: "width .5s" }} />
                  </div>
                </div>

                {/* Período do contrato */}
                <div style={{ display: "flex", gap: 16, marginBottom: 14 }}>
                  <div style={{ fontSize: ".68rem", color: "rgba(170,210,245,.88)" }}>
                    Início: <strong style={{ color: "#e8f0f8" }}>{new Date(c.inicioContrato + "T12:00:00").toLocaleDateString("pt-BR")}</strong>
                  </div>
                  <div style={{ fontSize: ".68rem", color: "rgba(170,210,245,.88)" }}>
                    Término: <strong style={{ color: "#e8f0f8" }}>{new Date(c.fimContrato + "T12:00:00").toLocaleDateString("pt-BR")}</strong>
                  </div>
                  <div style={{ fontSize: ".68rem", color: "rgba(170,210,245,.88)" }}>
                    Restam: <strong style={{ color: mesesRestantes <= 3 ? "#E05A4B" : "#EF9F27" }}>{mesesRestantes} mes(es)</strong>
                  </div>
                  {c.ultimoPagamento && (
                    <div style={{ fontSize: ".68rem", color: "rgba(170,210,245,.88)" }}>
                      Último pag.: <strong style={{ color: "#1D9E75" }}>{c.ultimoPagamento}</strong>
                    </div>
                  )}
                </div>

                {c.observacoes && (
                  <div style={{ padding: "8px 12px", background: "rgba(26,58,92,.25)", border: "1px solid rgba(70,120,180,.4)", borderRadius: 8, fontSize: ".72rem", color: "rgba(160,200,235,.92)", marginBottom: 14 }}>
                    {c.observacoes}
                  </div>
                )}

                {/* Ações */}
                <div style={{ display: "flex", gap: 8 }}>
                  <Link href={`/clinic/paciente/${c.pacienteId}`} style={{ padding: "7px 14px", borderRadius: 8, border: "1px solid rgba(70,120,180,.5)", background: "transparent", color: "rgba(160,200,235,.90)", fontFamily: "var(--font-sans)", fontWeight: 500, fontSize: ".75rem", textDecoration: "none" }}>
                    Ver perfil
                  </Link>
                  <Link href="/clinic/agenda" style={{ padding: "7px 14px", borderRadius: 8, border: "1px solid rgba(70,120,180,.5)", background: "transparent", color: "rgba(160,200,235,.90)", fontFamily: "var(--font-sans)", fontWeight: 500, fontSize: ".75rem", textDecoration: "none" }}>
                    Ver agenda
                  </Link>
                  {c.statusPagamento === "atrasado" && (
                    <button style={{ padding: "7px 14px", borderRadius: 8, border: "1px solid rgba(224,90,75,.3)", background: "rgba(224,90,75,.08)", color: "#E05A4B", fontFamily: "var(--font-sans)", fontWeight: 600, fontSize: ".75rem", cursor: "pointer" }}>
                      Cobrar responsável
                    </button>
                  )}
                  {c.statusPagamento === "pendente" && (
                    <button style={{ padding: "7px 14px", borderRadius: 8, border: "1px solid rgba(239,159,39,.3)", background: "rgba(239,159,39,.08)", color: "#EF9F27", fontFamily: "var(--font-sans)", fontWeight: 600, fontSize: ".75rem", cursor: "pointer" }}>
                      Registrar pagamento
                    </button>
                  )}
                  {mesesRestantes <= 2 && (
                    <button style={{ padding: "7px 14px", borderRadius: 8, border: "1px solid rgba(55,138,221,.3)", background: "rgba(55,138,221,.08)", color: "#378ADD", fontFamily: "var(--font-sans)", fontWeight: 600, fontSize: ".75rem", cursor: "pointer" }}>
                      Renovar contrato
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* TAB: HISTÓRICO */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      {tab === "historico" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Gráfico de receita histórica */}
          <div style={{ ...card, padding: 20 }}>
            <div style={{ fontSize: ".88rem", fontWeight: 700, color: "#e8f0f8", marginBottom: 4 }}>Receita mensal — últimos 6 meses</div>
            <div style={{ fontSize: ".7rem", color: "rgba(160,200,235,.84)", marginBottom: 16 }}>Realizada vs prevista por contrato</div>
            <div style={{ height: 260, minHeight: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={HISTORICO} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(26,58,92,.4)" vertical={false} />
                  <XAxis dataKey="mesLabel" stroke="rgba(165,208,242,.85)" tick={{ fill: "rgba(160,200,235,.90)", fontSize: 11 }} />
                  <YAxis stroke="rgba(165,208,242,.85)" tick={{ fill: "rgba(160,200,235,.84)", fontSize: 10 }} tickFormatter={v => `${v/1000}k`} />
                  <Tooltip {...tooltipStyle} formatter={(v: number) => [fmtBRL(v)]} />
                  <Bar dataKey="receitaPrevista" name="Prevista" fill="rgba(26,58,92,.6)" radius={[4,4,0,0]} barSize={16} />
                  <Bar dataKey="receitaRealizada" name="Realizada" fill="#1D9E75" radius={[4,4,0,0]} barSize={16} fillOpacity={0.85} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Linha de inadimplência */}
          <div style={{ ...card, padding: 20 }}>
            <div style={{ fontSize: ".88rem", fontWeight: 700, color: "#e8f0f8", marginBottom: 4 }}>Inadimplência mensal</div>
            <div style={{ fontSize: ".7rem", color: "rgba(160,200,235,.84)", marginBottom: 16 }}>Valor em aberto por mês</div>
            <div style={{ height: 180, minHeight: 180 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={HISTORICO}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(26,58,92,.4)" />
                  <XAxis dataKey="mesLabel" stroke="rgba(165,208,242,.85)" tick={{ fill: "rgba(160,200,235,.90)", fontSize: 11 }} />
                  <YAxis stroke="rgba(165,208,242,.85)" tick={{ fill: "rgba(160,200,235,.84)", fontSize: 10 }} tickFormatter={v => `${v/1000}k`} />
                  <Tooltip {...tooltipStyle} formatter={(v: number) => [fmtBRL(v), "Inadimplência"]} />
                  <Line type="monotone" dataKey="inadimplencia" stroke="#E05A4B" strokeWidth={2} dot={{ r: 4, fill: "#E05A4B" }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Tabela histórica */}
          <div style={{ ...card, overflow: "hidden" }}>
            <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(26,58,92,.4)" }}>
              <div style={{ fontSize: ".88rem", fontWeight: 700, color: "#e8f0f8" }}>Resumo mensal</div>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: ".78rem" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(26,58,92,.3)" }}>
                    {["Mês","Previsto","Realizado","Inadimp.","Sessões","Taxa"].map(h => (
                      <th key={h} style={{ padding: "10px 16px", textAlign: h === "Mês" ? "left" : "right", fontSize: ".62rem", color: "rgba(170,210,245,.88)", textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...HISTORICO].reverse().map((m, i) => {
                    const taxa = Math.round((m.receitaRealizada / m.receitaPrevista) * 100);
                    return (
                      <tr key={m.mes} style={{ borderBottom: i < HISTORICO.length - 1 ? "1px solid rgba(26,58,92,.2)" : "none", background: i === 0 ? "rgba(29,158,117,.03)" : "transparent" }}>
                        <td style={{ padding: "12px 16px", color: i === 0 ? "#1D9E75" : "#e8f0f8", fontWeight: i === 0 ? 600 : 400 }}>{m.mesLabel} {m.mes.split("-")[0]}</td>
                        <td style={{ padding: "12px 16px", textAlign: "right", color: "rgba(160,200,235,.90)", fontFamily: "monospace" }}>{fmtBRL(m.receitaPrevista)}</td>
                        <td style={{ padding: "12px 16px", textAlign: "right", color: "#1D9E75", fontFamily: "monospace", fontWeight: 600 }}>{fmtBRL(m.receitaRealizada)}</td>
                        <td style={{ padding: "12px 16px", textAlign: "right", color: m.inadimplencia > 0 ? "#E05A4B" : "rgba(170,210,245,.88)", fontFamily: "monospace" }}>{fmtBRL(m.inadimplencia)}</td>
                        <td style={{ padding: "12px 16px", textAlign: "right", color: "rgba(160,200,235,.90)" }}>{m.sessoes}</td>
                        <td style={{ padding: "12px 16px", textAlign: "right", color: taxa >= 90 ? "#1D9E75" : taxa >= 75 ? "#EF9F27" : "#E05A4B", fontWeight: 600 }}>{taxa}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* TAB: PROJEÇÃO */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      {tab === "projecao" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Gráfico de projeção */}
          <div style={{ ...card, padding: 20 }}>
            <div style={{ fontSize: ".88rem", fontWeight: 700, color: "#e8f0f8", marginBottom: 4 }}>Projeção de receita — próximos 6 meses</div>
            <div style={{ fontSize: ".7rem", color: "rgba(160,200,235,.84)", marginBottom: 16 }}>Baseada nos contratos ativos · Inclui vencimento do contrato Maria Santos em Jul/2025</div>
            <div style={{ height: 260, minHeight: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={PROJECAO_MESES}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(26,58,92,.4)" />
                  <XAxis dataKey="mes" stroke="rgba(165,208,242,.85)" tick={{ fill: "rgba(160,200,235,.90)", fontSize: 10 }} />
                  <YAxis stroke="rgba(165,208,242,.85)" tick={{ fill: "rgba(160,200,235,.84)", fontSize: 10 }} tickFormatter={v => `${v/1000}k`} domain={[6000, 15000]} />
                  <Tooltip {...tooltipStyle} formatter={(v: number) => [fmtBRL(v)]} />
                  <Line type="monotone" dataKey="otimista"    name="Otimista"    stroke="#1D9E75" strokeWidth={1.5} strokeDasharray="4 3" dot={false} />
                  <Line type="monotone" dataKey="previsto"    name="Previsto"    stroke="#EF9F27" strokeWidth={2.5} dot={{ r: 4, fill: "#EF9F27" }} />
                  <Line type="monotone" dataKey="conservador" name="Conservador" stroke="#E05A4B" strokeWidth={1.5} strokeDasharray="4 3" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div style={{ display: "flex", gap: 20, marginTop: 12 }}>
              {[["#1D9E75","Otimista"],["#EF9F27","Previsto"],["#E05A4B","Conservador"]].map(([c,l]) => (
                <div key={l} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <div style={{ width: 12, height: 3, background: c, borderRadius: 2 }} />
                  <span style={{ fontSize: ".68rem", color: "rgba(160,200,235,.90)" }}>{l}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Alertas de vencimento */}
          <div style={{ ...card, padding: 20 }}>
            <div style={{ fontSize: ".88rem", fontWeight: 700, color: "#e8f0f8", marginBottom: 14 }}>Contratos com vencimento próximo</div>
            {CONTRATOS
              .map(c => {
                const meses = Math.round((new Date(c.fimContrato).getTime() - new Date("2025-04-16").getTime()) / (1000 * 60 * 60 * 24 * 30));
                return { ...c, mesesRestantes: meses };
              })
              .sort((a, b) => a.mesesRestantes - b.mesesRestantes)
              .map(c => {
                const urgente = c.mesesRestantes <= 2;
                const atencao = c.mesesRestantes <= 4;
                return (
                  <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: urgente ? "rgba(224,90,75,.07)" : atencao ? "rgba(239,159,39,.07)" : "rgba(26,58,92,.2)", border: `1px solid ${urgente ? "rgba(224,90,75,.25)" : atencao ? "rgba(239,159,39,.2)" : "rgba(26,58,92,.4)"}`, borderRadius: 10, marginBottom: 8 }}>
                    <div style={{ width: 32, height: 32, borderRadius: "50%", background: c.gradient, display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".6rem", fontWeight: 800, color: "#fff", flexShrink: 0 }}>{c.pacienteIniciais}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: ".82rem", fontWeight: 600, color: "#e8f0f8" }}>{c.pacienteNome}</div>
                      <div style={{ fontSize: ".68rem", color: "rgba(160,200,235,.84)" }}>Término: {new Date(c.fimContrato + "T12:00:00").toLocaleDateString("pt-BR")} · {fmtBRL(c.valorMensal)}/mês</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: ".85rem", fontWeight: 700, color: urgente ? "#E05A4B" : atencao ? "#EF9F27" : "#1D9E75" }}>{c.mesesRestantes} mes(es)</div>
                      <div style={{ fontSize: ".62rem", color: "rgba(170,210,245,.88)" }}>{urgente ? "Renovar urgente" : atencao ? "Planejar renovação" : "Em dia"}</div>
                    </div>
                    <button style={{ padding: "6px 12px", borderRadius: 7, border: `1px solid ${urgente ? "rgba(224,90,75,.3)" : "rgba(55,138,221,.3)"}`, background: urgente ? "rgba(224,90,75,.08)" : "rgba(55,138,221,.08)", color: urgente ? "#E05A4B" : "#378ADD", fontFamily: "var(--font-sans)", fontWeight: 600, fontSize: ".72rem", cursor: "pointer" }}>
                      Renovar
                    </button>
                  </div>
                );
              })}
          </div>

          {/* Resumo de projeção */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
            {[
              { l: "Receita projetada (12m)", v: fmtK(CONTRATOS.reduce((a,c) => a + c.valorMensal * 12, 0) * 0.88), c: "#1D9E75", sub: "estimativa com 88% adimplência" },
              { l: "Impacto renovação Maria", v: fmtK(2000 * 5), c: "#EF9F27", sub: "se não renovar (jul–dez)" },
              { l: "Potencial com novo paciente",v: fmtK(2500), c: "#378ADD", sub: "receita estimada/mês" },
            ].map(k => (
              <div key={k.l} style={{ ...card, padding: 18 }}>
                <div style={{ fontSize: ".6rem", color: "rgba(170,210,245,.88)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 6 }}>{k.l}</div>
                <div style={{ fontSize: "1.4rem", fontWeight: 800, color: k.c, marginBottom: 4 }}>{k.v}</div>
                <div style={{ fontSize: ".65rem", color: "rgba(170,210,245,.88)" }}>{k.sub}</div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
