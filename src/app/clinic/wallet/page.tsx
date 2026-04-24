"use client";
import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { supabase } from "@/lib/supabase";
import { useClinicContext } from "../layout";

// ─── TIPOS ───────────────────────────────────────────────────────────────────
type TabWallet = "visao-geral" | "contratos" | "historico" | "projecao" | "simulador";

interface PacienteFinanceiro {
  id: string
  nome: string
  iniciais: string
  gradient: string
  cor: string
  modelo: "ffs" | "care"
  sessoesMes: number
  sessoesRealizadas: number
  sessoesCanceladas: number
  valorSessao: number
  // FFS
  mensalidadeFFS: number
  // Care
  comissaoCare: number
  comissaoCareEfetiva: number // com teto aplicado
  // Financeiro
  receitaBruta: number
  custoPlataforma: number
  receitaLiquida: number
}

interface MesHistorico {
  mes: string
  mesLabel: string
  receitaRealizada: number
  receitaPrevista: number
  sessoes: number
  inadimplencia: number
}

// ─── CONSTANTES ──────────────────────────────────────────────────────────────
const FFS_MENSAL     = 39    // legado — mantido para compatibilidade

// Modelo Care — % por senioridade (sobre valor real da sessão)
const CARE_COMISSAO: Record<string, number> = {
  terapeuta:   0.08,  // 8%
  coordenador: 0.10,  // 10%
  supervisor:  0.12,  // 12%
}

// Modelo FFS — assinatura mensal por faixa de sessões
const FFS_PLANOS = [
  { nome: "Starter",       sessoes: 20,   valor: 49,  desc: "até 20 sessões/mês"   },
  { nome: "Profissional",  sessoes: 60,   valor: 89,  desc: "até 60 sessões/mês"   },
  { nome: "Clínica",       sessoes: 9999, valor: 149, desc: "sessões ilimitadas"    },
]

function planoFFS(sessoes: number) {
  return FFS_PLANOS.find(p => sessoes <= p.sessoes) ?? FFS_PLANOS[FFS_PLANOS.length - 1]
}
const GRADIENTS = [
  "linear-gradient(135deg,#1D9E75,#378ADD)",
  "linear-gradient(135deg,#378ADD,#8B7FE8)",
  "linear-gradient(135deg,#8B7FE8,#E05A4B)",
  "linear-gradient(135deg,#4d6d8a,#378ADD)",
  "linear-gradient(135deg,#EF9F27,#E05A4B)",
]
const CORES = ["#1D9E75","#378ADD","#8B7FE8","#4d6d8a","#EF9F27"]

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function fmtBRL(val: number): string {
  return `R$ ${val.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}
function fmtK(val: number): string {
  return val >= 1000 ? `R$ ${(val / 1000).toFixed(1)}k` : fmtBRL(val)
}
function iniciais(nome: string): string {
  const p = nome.trim().split(" ")
  return p.length >= 2 ? `${p[0][0]}${p[p.length-1][0]}`.toUpperCase() : nome.slice(0,2).toUpperCase()
}

// Regra do teto: comissão Care nunca ultrapassa FFS mensal
function calcularComissaoCare(sessoes: number, valorSessao: number): { bruta: number; efetiva: number } {
  const bruta    = sessoes * valorSessao * COMISSAO_CARE
  const efetiva  = Math.min(bruta, FFS_MENSAL)
  return { bruta, efetiva }
}

const tooltipStyle = {
  contentStyle: { background: "#0d2035", border: "1px solid rgba(26,58,92,.7)", borderRadius: 10, color: "#e8f0f8", fontSize: 11 },
}

// ─── PAGE ────────────────────────────────────────────────────────────────────
export default function ClinicWalletPage() {
  const { terapeuta } = useClinicContext()
  const nivel = terapeuta?.nivel ?? "coordenador"

  const [tab,       setTab]       = useState<TabWallet>("visao-geral")
  const [pacientes, setPacientes] = useState<PacienteFinanceiro[]>([])
  const [historico, setHistorico] = useState<MesHistorico[]>([])
  const [loading,   setLoading]   = useState(true)
  const [pacSel,    setPacSel]    = useState<PacienteFinanceiro | null>(null)

  // Simulador multi-paciente
  type SimPaciente = { id: string; nome: string; sessoes: number; valorSessao: number; modelo: "ffs" | "care" }
  const [simNivel,     setSimNivel]     = useState<"terapeuta"|"coordenador"|"supervisor">("coordenador")
  const [simPacientes, setSimPacientes] = useState<SimPaciente[]>([
    { id: "1", nome: "Paciente A", sessoes: 12, valorSessao: 250, modelo: "care" },
    { id: "2", nome: "Paciente B", sessoes: 4,  valorSessao: 100, modelo: "ffs"  },
  ])
  const [simEscala,    setSimEscala]    = useState(10)

  useEffect(() => {
    if (!terapeuta) return
    carregar()
  }, [terapeuta])

  async function carregar() {
    setLoading(true)
    try {
      // 1. Planos ativos do terapeuta com criança
      const { data: planos } = await supabase
        .from("planos")
        .select("id, criancas ( id, nome ), programas ( nome, dominio )")
        .eq("terapeuta_id", terapeuta!.id)
        .eq("status", "ativo")

      if (!planos || planos.length === 0) {
        setPacientes([])
        setLoading(false)
        return
      }

      // Agrupar por criança
      const criancaMap = new Map<string, { nome: string; planos: any[] }>()
      for (const pl of planos) {
        const c = pl.criancas as any
        if (!c) continue
        if (!criancaMap.has(c.id)) criancaMap.set(c.id, { nome: c.nome, planos: [] })
        criancaMap.get(c.id)!.planos.push(pl)
      }

      const criancaIds = Array.from(criancaMap.keys())

      // 2. Sessões do mês atual por criança
      const inicioMes = new Date(); inicioMes.setDate(1); inicioMes.setHours(0,0,0,0)
      const { data: sessoesMes } = await supabase
        .from("sessoes_clinicas")
        .select("crianca_id, concluida, taxa_acerto, criado_em")
        .in("crianca_id", criancaIds)
        .gte("criado_em", inicioMes.toISOString())

      // 3. Montar pacientes financeiros
      const result: PacienteFinanceiro[] = Array.from(criancaMap.entries()).map(([id, { nome, planos: cPlanos }], i) => {
        const sessoesC     = (sessoesMes ?? []).filter(s => s.crianca_id === id)
        const realizadas   = sessoesC.filter(s => s.concluida).length
        const canceladas   = sessoesC.filter(s => !s.concluida).length
        const valorSessao  = 250 // valor padrão — futuramente vem do contrato
        const modelo: "ffs" | "care" = "ffs" // padrão FFS — futuramente configurável

        const { bruta, efetiva } = calcularComissaoCare(realizadas, valorSessao)
        const receitaBruta    = realizadas * valorSessao
        const custoPlataforma = modelo === "ffs" ? FFS_MENSAL : efetiva
        const receitaLiquida  = receitaBruta - custoPlataforma

        return {
          id, nome,
          iniciais:             iniciais(nome),
          gradient:             GRADIENTS[i % GRADIENTS.length],
          cor:                  CORES[i % CORES.length],
          modelo,
          sessoesMes:           cPlanos.length * 4, // estimativa
          sessoesRealizadas:    realizadas,
          sessoesCanceladas:    canceladas,
          valorSessao,
          mensalidadeFFS:       FFS_MENSAL,
          comissaoCare:         bruta,
          comissaoCareEfetiva:  efetiva,
          receitaBruta,
          custoPlataforma,
          receitaLiquida,
        }
      })
      setPacientes(result)

      // 4. Histórico — últimos 6 meses
      const hist: MesHistorico[] = []
      for (let i = 5; i >= 0; i--) {
        const d     = new Date(); d.setMonth(d.getMonth() - i)
        const inicio = new Date(d.getFullYear(), d.getMonth(), 1).toISOString()
        const fim    = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString()
        const mes    = d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" })
        const mesLabel = d.toLocaleDateString("pt-BR", { month: "short" })

        const { data: sessMes } = await supabase
          .from("sessoes_clinicas")
          .select("concluida, crianca_id")
          .in("crianca_id", criancaIds)
          .gte("criado_em", inicio).lte("criado_em", fim)

        const realizadasMes   = (sessMes ?? []).filter(s => s.concluida).length
        const receitaMes      = realizadasMes * 250
        const previstaMes     = result.length * 8 * 250 // estimativa

        hist.push({
          mes, mesLabel,
          receitaRealizada: receitaMes,
          receitaPrevista:  previstaMes,
          sessoes:          realizadasMes,
          inadimplencia:    Math.max(0, previstaMes - receitaMes),
        })
      }
      setHistorico(hist)

    } catch (err) {
      console.error("Erro ao carregar wallet:", err)
    }
    setLoading(false)
  }

  // ── Métricas agregadas ───────────────────────────────────────────────────
  const metricas = useMemo(() => {
    const receitaRealizada   = pacientes.reduce((a, p) => a + p.receitaBruta, 0)
    const receitaLiquida     = pacientes.reduce((a, p) => a + p.receitaLiquida, 0)
    const custoTotal         = pacientes.reduce((a, p) => a + p.custoPlataforma, 0)
    const totalSessoes       = pacientes.reduce((a, p) => a + p.sessoesRealizadas, 0)
    const totalCanceladas    = pacientes.reduce((a, p) => a + p.sessoesCanceladas, 0)
    const pacFFS             = pacientes.filter(p => p.modelo === "ffs").length
    const pacCare            = pacientes.filter(p => p.modelo === "care").length
    return { receitaRealizada, receitaLiquida, custoTotal, totalSessoes, totalCanceladas, pacFFS, pacCare, totalPac: pacientes.length }
  }, [pacientes])

  // ── Simulador multi-paciente ─────────────────────────────────────────────
  const simResultado = useMemo(() => {
    const comissao = CARE_COMISSAO[simNivel] ?? 0.10
    const pacs = simPacientes.map(p => {
      const receitaBruta   = p.sessoes * p.valorSessao
      const custoFFS       = planoFFS(p.sessoes).valor
      const custoCare      = receitaBruta * comissao
      const lucroFFS       = receitaBruta - custoFFS
      const lucroCare      = receitaBruta - custoCare
      const plano          = planoFFS(p.sessoes)
      return { ...p, receitaBruta, custoFFS, custoCare, lucroFFS, lucroCare, plano,
        custoEfetivo: p.modelo === "ffs" ? custoFFS : custoCare,
        lucroEfetivo: p.modelo === "ffs" ? lucroFFS : lucroCare,
      }
    })
    const totalBruto       = pacs.reduce((a, p) => a + p.receitaBruta, 0)
    const totalFFS         = pacs.reduce((a, p) => a + p.custoFFS, 0)
    const totalCare        = pacs.reduce((a, p) => a + p.custoCare, 0)
    const totalEfetivo     = pacs.reduce((a, p) => a + p.custoEfetivo, 0)
    const totalLiquido     = pacs.reduce((a, p) => a + p.lucroEfetivo, 0)
    const receitaFracta    = totalEfetivo
    // Escala
    const ticketMedioLiq   = pacs.length > 0 ? totalLiquido / pacs.length : 0
    const escalaLiquido    = ticketMedioLiq * simEscala
    const escalaFracta     = (totalEfetivo / (pacs.length || 1)) * simEscala
    return { pacs, totalBruto, totalFFS, totalCare, totalEfetivo, totalLiquido, receitaFracta, escalaLiquido, escalaFracta, comissao }
  }, [simPacientes, simNivel, simEscala])

  function adicionarPacSim() {
    const novo = { id: Date.now().toString(), nome: `Paciente ${simPacientes.length + 1}`, sessoes: 8, valorSessao: 200, modelo: "care" as const }
    setSimPacientes(p => [...p, novo])
  }
  function removerPacSim(id: string) { setSimPacientes(p => p.filter(x => x.id !== id)) }
  function atualizarPacSim(id: string, campo: string, val: string | number) {
    setSimPacientes(p => p.map(x => x.id === id ? { ...x, [campo]: val } : x))
  }

  // Projeção próximos 6 meses baseada em dados reais
  const projecaoMeses = useMemo(() => {
    const baseReceita = metricas.receitaRealizada || pacientes.length * 8 * 250
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(); d.setMonth(d.getMonth() + i + 1)
      const mes = d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" })
      return {
        mes,
        otimista:    Math.round(baseReceita * (1 + 0.05 * (i + 1))),
        previsto:    Math.round(baseReceita * (1 + 0.02 * (i + 1))),
        conservador: Math.round(baseReceita * (1 - 0.03 * i)),
      }
    })
  }, [metricas, pacientes])

  // ── CSS ──────────────────────────────────────────────────────────────────
  const card: React.CSSProperties = {
    background: "rgba(13,32,53,.75)", border: "1px solid rgba(70,120,180,.5)",
    borderRadius: 14, backdropFilter: "blur(8px)",
  }
  const lbl: React.CSSProperties = {
    fontSize: ".6rem", fontWeight: 700, textTransform: "uppercase" as const,
    letterSpacing: ".09em", color: "rgba(170,210,245,.88)", marginBottom: 8,
  }
  const inp: React.CSSProperties = {
    padding: "8px 12px", borderRadius: 8, border: "1px solid rgba(70,120,180,.4)",
    background: "rgba(13,32,53,.6)", color: "#e8f0f8", fontSize: 13,
    fontFamily: "var(--font-sans)", outline: "none", width: "100%", boxSizing: "border-box" as const,
  }

  const TABS: { id: TabWallet; label: string }[] = [
    { id: "visao-geral", label: "Visão geral"  },
    { id: "contratos",   label: "Contratos"    },
    { id: "historico",   label: "Histórico"    },
    { id: "projecao",    label: "Projeção"      },
    { id: "simulador",   label: "Simulador FFS/Care" },
  ]

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 400 }}>
      <div style={{ fontSize: 13, color: "rgba(160,200,235,.9)" }}>Carregando wallet...</div>
    </div>
  )

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* HEADER */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: "1.2rem", fontWeight: 800, color: "#e8f0f8", margin: 0, marginBottom: 4 }}>Clinic Wallet</h1>
          <div style={{ fontSize: ".72rem", color: "rgba(160,200,235,.84)" }}>
            {new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" })} · {metricas.totalPac} pacientes · FFS + Care
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
        {[
          { l: "Receita bruta",    v: fmtK(metricas.receitaRealizada), c: "#1D9E75", sub: "sessões realizadas" },
          { l: "Receita líquida",  v: fmtK(metricas.receitaLiquida),   c: "#378ADD", sub: "após custo plataforma" },
          { l: "Custo plataforma", v: fmtK(metricas.custoTotal),        c: "#EF9F27", sub: `FFS R$${FFS_MENSAL}/pac` },
          { l: "Sessões realizadas",v: metricas.totalSessoes,           c: "#8B7FE8", sub: `${metricas.totalCanceladas} canceladas` },
        ].map(k => (
          <div key={k.l} style={{ ...card, padding: "16px 18px" }}>
            <div style={{ fontSize: ".6rem", color: "rgba(170,210,245,.88)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 6 }}>{k.l}</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 800, color: k.c, letterSpacing: "-.02em" }}>{k.v}</div>
            <div style={{ fontSize: ".62rem", color: "rgba(170,210,245,.6)", marginTop: 4 }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* TABS */}
      <div style={{ display: "flex", borderBottom: "1px solid rgba(26,58,92,.4)", marginBottom: 4 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: "10px 16px", background: "none", border: "none",
            borderBottom: `2px solid ${tab === t.id ? "#1D9E75" : "transparent"}`,
            color: tab === t.id ? "#1D9E75" : "rgba(160,200,235,.84)",
            fontFamily: "var(--font-sans)", fontWeight: tab === t.id ? 600 : 400,
            fontSize: ".8rem", cursor: "pointer", marginBottom: -1, whiteSpace: "nowrap",
          }}>{t.label}</button>
        ))}
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* TAB: VISÃO GERAL */}
      {tab === "visao-geral" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

          {/* Receita por paciente */}
          <div style={{ ...card, padding: 20 }}>
            <div style={{ fontSize: ".88rem", fontWeight: 700, color: "#e8f0f8", marginBottom: 4 }}>Receita por paciente</div>
            <div style={{ fontSize: ".7rem", color: "rgba(160,200,235,.84)", marginBottom: 16 }}>Bruta vs custo plataforma este mês</div>
            {pacientes.length === 0 ? (
              <div style={{ fontSize: 12, color: "rgba(255,255,255,.3)", textAlign: "center", padding: "32px 0" }}>Nenhum paciente vinculado</div>
            ) : (
              <div style={{ height: 220, minHeight: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={pacientes.map(p => ({ nome: p.nome.split(" ")[0], bruta: p.receitaBruta, custo: p.custoPlataforma, cor: p.cor }))} barSize={20}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(26,58,92,.4)" vertical={false} />
                    <XAxis dataKey="nome" stroke="rgba(165,208,242,.85)" tick={{ fill: "rgba(160,200,235,.90)", fontSize: 11 }} />
                    <YAxis stroke="rgba(165,208,242,.85)" tick={{ fill: "rgba(160,200,235,.84)", fontSize: 10 }} tickFormatter={v => `${v/1000}k`} />
                    <Tooltip {...tooltipStyle} formatter={(v: unknown) => [fmtBRL(Number(v))] as [string]} />
                    <Bar dataKey="bruta" name="Bruta" stackId="a" radius={[0,0,0,0]}>
                      {pacientes.map((p, i) => <Cell key={i} fill={p.cor} fillOpacity={0.8} />)}
                    </Bar>
                    <Bar dataKey="custo" name="Custo" stackId="b" radius={[4,4,0,0]}>
                      {pacientes.map((_, i) => <Cell key={i} fill="#E05A4B" fillOpacity={0.5} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Breakdown por paciente */}
          <div style={{ ...card, padding: 20 }}>
            <div style={{ fontSize: ".88rem", fontWeight: 700, color: "#e8f0f8", marginBottom: 14 }}>Breakdown financeiro</div>
            {pacientes.length === 0 ? (
              <div style={{ fontSize: 12, color: "rgba(255,255,255,.3)", textAlign: "center", padding: "32px 0" }}>Sem dados</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {pacientes.map(p => (
                  <button key={p.id} onClick={() => setPacSel(p)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "rgba(26,58,92,.2)", borderRadius: 10, border: "1px solid rgba(26,58,92,.4)", cursor: "pointer", textAlign: "left", fontFamily: "var(--font-sans)", width: "100%" }}>
                    <div style={{ width: 30, height: 30, borderRadius: "50%", background: p.gradient, display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".58rem", fontWeight: 800, color: "#fff", flexShrink: 0 }}>{p.iniciais}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                        <span style={{ fontSize: ".78rem", fontWeight: 600, color: "#e8f0f8" }}>{p.nome.split(" ")[0]}</span>
                        <span style={{ fontSize: ".72rem", color: "#1D9E75", fontWeight: 700 }}>{fmtBRL(p.receitaLiquida)}</span>
                      </div>
                      <div style={{ fontSize: ".65rem", color: "rgba(160,200,235,.5)" }}>
                        {p.sessoesRealizadas} sessões · custo {fmtBRL(p.custoPlataforma)} ({p.modelo.toUpperCase()})
                      </div>
                    </div>
                    <span style={{ fontSize: ".62rem", color: p.modelo === "ffs" ? "#1D9E75" : "#378ADD", background: p.modelo === "ffs" ? "rgba(29,158,117,.12)" : "rgba(55,138,221,.12)", border: `1px solid ${p.modelo === "ffs" ? "rgba(29,158,117,.3)" : "rgba(55,138,221,.3)"}`, borderRadius: 20, padding: "2px 8px", fontWeight: 700, flexShrink: 0 }}>
                      {p.modelo.toUpperCase()}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Sessões do mês */}
          <div style={{ ...card, padding: 20 }}>
            <div style={{ fontSize: ".88rem", fontWeight: 700, color: "#e8f0f8", marginBottom: 14 }}>Sessões do mês</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 16 }}>
              {[
                { l: "Realizadas",  v: metricas.totalSessoes,   c: "#1D9E75" },
                { l: "Canceladas",  v: metricas.totalCanceladas, c: "#E05A4B" },
                { l: "Pacientes",   v: metricas.totalPac,        c: "#378ADD" },
              ].map(k => (
                <div key={k.l} style={{ background: "rgba(26,58,92,.25)", borderRadius: 9, padding: "10px 12px", textAlign: "center" }}>
                  <div style={{ fontSize: ".58rem", color: "rgba(170,210,245,.88)", marginBottom: 4 }}>{k.l}</div>
                  <div style={{ fontSize: "1.4rem", fontWeight: 800, color: k.c }}>{k.v}</div>
                </div>
              ))}
            </div>
            {pacientes.map(p => (
              <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: p.cor, flexShrink: 0 }} />
                <span style={{ fontSize: ".75rem", color: "rgba(160,200,235,.92)", flex: 1 }}>{p.nome.split(" ")[0]}</span>
                <span style={{ fontSize: ".72rem", color: "#1D9E75", fontFamily: "monospace" }}>{p.sessoesRealizadas}</span>
                {p.sessoesCanceladas > 0 && <span style={{ fontSize: ".62rem", color: "#4d6d8a" }}>({p.sessoesCanceladas} cancel.)</span>}
              </div>
            ))}
          </div>

          {/* Modelo FFS vs Care */}
          <div style={{ ...card, padding: 20 }}>
            <div style={{ fontSize: ".88rem", fontWeight: 700, color: "#e8f0f8", marginBottom: 14 }}>Distribuição FFS vs Care</div>
            {[
              { l: "FFS", v: metricas.pacFFS, val: metricas.pacFFS * FFS_MENSAL, cor: "#1D9E75", desc: `R$${FFS_MENSAL}/pac/mês` },
              { l: "Care", v: metricas.pacCare, val: pacientes.filter(p => p.modelo === "care").reduce((a, p) => a + p.comissaoCareEfetiva, 0), cor: "#378ADD", desc: "5% por sessão (com teto)" },
            ].map(m => (
              <div key={m.l} style={{ padding: "12px 14px", background: "rgba(26,58,92,.25)", borderRadius: 10, marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: ".8rem", fontWeight: 700, color: "#e8f0f8" }}>{m.l}</span>
                  <span style={{ fontSize: ".78rem", color: m.cor, fontWeight: 700 }}>{fmtBRL(m.val)}</span>
                </div>
                <div style={{ fontSize: ".7rem", color: "rgba(160,200,235,.84)", marginBottom: 8 }}>{m.v} paciente(s) · {m.desc}</div>
                <div style={{ height: 4, background: "rgba(26,58,92,.5)", borderRadius: 2, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: metricas.totalPac > 0 ? `${Math.round(m.v / metricas.totalPac * 100)}%` : "0%", background: m.cor }} />
                </div>
              </div>
            ))}
            <div style={{ padding: "10px 12px", background: "rgba(29,158,117,.06)", border: "1px solid rgba(29,158,117,.15)", borderRadius: 9, fontSize: ".72rem", color: "rgba(160,200,235,.8)", lineHeight: 1.55 }}>
              Teto do Care: comissão nunca ultrapassa R${FFS_MENSAL}/mês por paciente — mesmo com alto volume de sessões.
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* TAB: CONTRATOS */}
      {tab === "contratos" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {pacientes.length === 0 ? (
            <div style={{ ...card, padding: "48px 24px", textAlign: "center", fontSize: 13, color: "rgba(255,255,255,.3)" }}>
              Nenhum paciente vinculado ainda. Vincule via planos no Supabase.
            </div>
          ) : pacientes.map(p => (
            <div key={p.id} style={{ ...card, padding: 22 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                <div style={{ width: 44, height: 44, borderRadius: "50%", background: p.gradient, display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".75rem", fontWeight: 800, color: "#fff" }}>{p.iniciais}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                    <span style={{ fontSize: ".95rem", fontWeight: 700, color: "#e8f0f8" }}>{p.nome}</span>
                    <span style={{ fontSize: ".65rem", color: p.modelo === "ffs" ? "#1D9E75" : "#378ADD", background: p.modelo === "ffs" ? "rgba(29,158,117,.12)" : "rgba(55,138,221,.12)", border: `1px solid ${p.modelo === "ffs" ? "rgba(29,158,117,.25)" : "rgba(55,138,221,.25)"}`, borderRadius: 20, padding: "2px 9px", fontWeight: 700 }}>
                      Modelo {p.modelo.toUpperCase()}
                    </span>
                  </div>
                  <div style={{ fontSize: ".72rem", color: "rgba(160,200,235,.6)" }}>
                    {p.sessoesRealizadas} sessões este mês · R${p.valorSessao}/sessão
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "#1D9E75" }}>{fmtBRL(p.receitaLiquida)}</div>
                  <div style={{ fontSize: ".65rem", color: "rgba(170,210,245,.6)" }}>líquido este mês</div>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
                {[
                  { l: "Receita bruta",    v: fmtBRL(p.receitaBruta),       c: "#e8f0f8" },
                  { l: "Custo plataforma", v: fmtBRL(p.custoPlataforma),    c: "#EF9F27" },
                  { l: "Receita líquida",  v: fmtBRL(p.receitaLiquida),     c: "#1D9E75" },
                  { l: p.modelo === "ffs" ? "Mensalidade FFS" : "Comissão Care", v: p.modelo === "ffs" ? fmtBRL(p.mensalidadeFFS) : fmtBRL(p.comissaoCareEfetiva), c: "#378ADD" },
                ].map(k => (
                  <div key={k.l} style={{ background: "rgba(26,58,92,.25)", borderRadius: 9, padding: "10px 12px" }}>
                    <div style={{ fontSize: ".58rem", color: "rgba(170,210,245,.88)", marginBottom: 4 }}>{k.l}</div>
                    <div style={{ fontSize: ".9rem", fontWeight: 700, color: k.c }}>{k.v}</div>
                  </div>
                ))}
              </div>
              {p.modelo === "care" && p.comissaoCare > FFS_MENSAL && (
                <div style={{ marginTop: 12, padding: "8px 12px", background: "rgba(29,158,117,.06)", border: "1px solid rgba(29,158,117,.15)", borderRadius: 8, fontSize: ".72rem", color: "#1D9E75" }}>
                  ✓ Teto aplicado: comissão real foi {fmtBRL(p.comissaoCareEfetiva)} (seria {fmtBRL(p.comissaoCare)} sem teto)
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* TAB: HISTÓRICO */}
      {tab === "historico" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ ...card, padding: 20 }}>
            <div style={{ fontSize: ".88rem", fontWeight: 700, color: "#e8f0f8", marginBottom: 4 }}>Receita histórica — últimos 6 meses</div>
            <div style={{ fontSize: ".7rem", color: "rgba(160,200,235,.84)", marginBottom: 16 }}>Realizado vs previsto · baseado em sessões clínicas reais</div>
            <div style={{ height: 220, minHeight: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={historico} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(26,58,92,.4)" vertical={false} />
                  <XAxis dataKey="mesLabel" stroke="rgba(165,208,242,.85)" tick={{ fill: "rgba(160,200,235,.90)", fontSize: 11 }} />
                  <YAxis stroke="rgba(165,208,242,.85)" tick={{ fill: "rgba(160,200,235,.84)", fontSize: 10 }} tickFormatter={v => `${v/1000}k`} />
                  <Tooltip {...tooltipStyle} formatter={(v: unknown) => [fmtBRL(Number(v))] as [string]} />
                  <Bar dataKey="receitaRealizada" name="Realizado" fill="#1D9E75" fillOpacity={0.8} radius={[4,4,0,0]} />
                  <Bar dataKey="receitaPrevista"  name="Previsto"  fill="#378ADD" fillOpacity={0.3} radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div style={{ ...card, padding: 20, overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(26,58,92,.4)" }}>
                  {["Mês","Realizado","Previsto","Sessões","Inadimplência"].map(h => (
                    <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontSize: ".6rem", color: "rgba(170,210,245,.88)", textTransform: "uppercase", letterSpacing: ".08em" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...historico].reverse().map((m, i) => (
                  <tr key={m.mes} style={{ borderBottom: i < historico.length - 1 ? "1px solid rgba(26,58,92,.2)" : "none" }}>
                    <td style={{ padding: "10px 12px", color: "#e8f0f8", fontWeight: 600 }}>{m.mesLabel}</td>
                    <td style={{ padding: "10px 12px", color: "#1D9E75", fontWeight: 700 }}>{fmtBRL(m.receitaRealizada)}</td>
                    <td style={{ padding: "10px 12px", color: "rgba(160,200,235,.6)" }}>{fmtBRL(m.receitaPrevista)}</td>
                    <td style={{ padding: "10px 12px", color: "#378ADD" }}>{m.sessoes}</td>
                    <td style={{ padding: "10px 12px", color: m.inadimplencia > 0 ? "#E05A4B" : "#1D9E75" }}>{fmtBRL(m.inadimplencia)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* TAB: PROJEÇÃO */}
      {tab === "projecao" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ ...card, padding: 20 }}>
            <div style={{ fontSize: ".88rem", fontWeight: 700, color: "#e8f0f8", marginBottom: 4 }}>Projeção de receita — próximos 6 meses</div>
            <div style={{ fontSize: ".7rem", color: "rgba(160,200,235,.84)", marginBottom: 16 }}>Baseada nos dados reais de sessões e pacientes ativos</div>
            <div style={{ height: 260, minHeight: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={projecaoMeses}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(26,58,92,.4)" />
                  <XAxis dataKey="mes" stroke="rgba(165,208,242,.85)" tick={{ fill: "rgba(160,200,235,.90)", fontSize: 10 }} />
                  <YAxis stroke="rgba(165,208,242,.85)" tick={{ fill: "rgba(160,200,235,.84)", fontSize: 10 }} tickFormatter={v => `${v/1000}k`} />
                  <Tooltip {...tooltipStyle} formatter={(v: unknown) => [fmtBRL(Number(v))] as [string]} />
                  <Line type="monotone" dataKey="otimista"    name="Otimista"    stroke="#1D9E75" strokeWidth={1.5} strokeDasharray="4 3" dot={false} />
                  <Line type="monotone" dataKey="previsto"    name="Previsto"    stroke="#EF9F27" strokeWidth={2.5} dot={{ r: 4, fill: "#EF9F27" }} />
                  <Line type="monotone" dataKey="conservador" name="Conservador" stroke="#E05A4B" strokeWidth={1.5} strokeDasharray="4 3" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div style={{ display: "flex", gap: 20, marginTop: 12 }}>
              {[["#1D9E75","Otimista (+5%/mês)"],["#EF9F27","Previsto (+2%/mês)"],["#E05A4B","Conservador (-3%/mês)"]].map(([c,l]) => (
                <div key={l} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <div style={{ width: 12, height: 3, background: c, borderRadius: 2 }} />
                  <span style={{ fontSize: ".68rem", color: "rgba(160,200,235,.90)" }}>{l}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
            {[
              { l: "Projeção 12m (previsto)", v: fmtK(metricas.receitaLiquida * 12), c: "#1D9E75", sub: "base atual × 12" },
              { l: "Potencial novo paciente",  v: fmtK(8 * 250 - FFS_MENSAL),        c: "#378ADD", sub: "líquido/mês estimado" },
              { l: "Custo plataforma anual",   v: fmtK(metricas.custoTotal * 12),     c: "#EF9F27", sub: "FFS × 12 meses" },
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

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* TAB: SIMULADOR FFS vs CARE */}
      {tab === "simulador" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Explicação do modelo */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={{ background: "rgba(29,158,117,.06)", border: "1px solid rgba(29,158,117,.2)", borderRadius: 12, padding: "14px 18px" }}>
              <div style={{ fontSize: ".75rem", fontWeight: 700, color: "#1D9E75", marginBottom: 8 }}>Care — Paciente da plataforma</div>
              <div style={{ fontSize: ".72rem", color: "rgba(160,200,235,.75)", lineHeight: 1.65 }}>
                Família paga pelo FractaCare. O Fracta processa o pagamento e repassa descontando a comissão por senioridade:
              </div>
              <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 4 }}>
                {[
                  { n: "Terapeuta/RBT", v: "8%", cor: "#1D9E75" },
                  { n: "Coordenador",   v: "10%", cor: "#EF9F27" },
                  { n: "Supervisor",    v: "12%", cor: "#8B7FE8" },
                ].map(r => (
                  <div key={r.n} style={{ display: "flex", justifyContent: "space-between", fontSize: ".72rem" }}>
                    <span style={{ color: "rgba(160,200,235,.6)" }}>{r.n}</span>
                    <span style={{ fontWeight: 700, color: r.cor }}>{r.v} por sessão</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ background: "rgba(55,138,221,.06)", border: "1px solid rgba(55,138,221,.2)", borderRadius: 12, padding: "14px 18px" }}>
              <div style={{ fontSize: ".75rem", fontWeight: 700, color: "#378ADD", marginBottom: 8 }}>FFS — Carteira própria</div>
              <div style={{ fontSize: ".72rem", color: "rgba(160,200,235,.75)", lineHeight: 1.65, marginBottom: 10 }}>
                Terapeuta usa o FractaClinic como SaaS de gestão. Assinatura mensal por volume de sessões:
              </div>
              {FFS_PLANOS.map(p => (
                <div key={p.nome} style={{ display: "flex", justifyContent: "space-between", fontSize: ".72rem", padding: "4px 0", borderBottom: "1px solid rgba(55,138,221,.08)" }}>
                  <span style={{ color: "rgba(160,200,235,.6)" }}>{p.nome} — {p.desc}</span>
                  <span style={{ fontWeight: 700, color: "#378ADD" }}>R${p.valor}/mês</span>
                </div>
              ))}
            </div>
          </div>

          {/* Configuração do simulador */}
          <div style={{ ...card, padding: 22 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div style={{ fontSize: ".88rem", fontWeight: 700, color: "#e8f0f8" }}>Monte sua carteira</div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ ...lbl, marginBottom: 0 }}>Senioridade:</div>
                <select value={simNivel} onChange={e => setSimNivel(e.target.value as any)} style={{ ...inp, width: "auto", padding: "6px 10px" }}>
                  <option value="terapeuta">Terapeuta/RBT (8%)</option>
                  <option value="coordenador">Coordenador (10%)</option>
                  <option value="supervisor">Supervisor/BCBA (12%)</option>
                </select>
              </div>
            </div>

            {/* Lista de pacientes */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
              {/* Header */}
              <div style={{ display: "grid", gridTemplateColumns: "1.5fr 80px 100px 80px 80px 80px 32px", gap: 8, padding: "0 4px" }}>
                {["Paciente","Sessões/mês","Valor/sessão","Modelo","Custo","Líquido",""].map(h => (
                  <div key={h} style={{ fontSize: ".58rem", color: "rgba(170,210,245,.5)", textTransform: "uppercase", letterSpacing: ".06em" }}>{h}</div>
                ))}
              </div>

              {simPacientes.map(p => {
                const res = simResultado.pacs.find(r => r.id === p.id)
                return (
                  <div key={p.id} style={{ display: "grid", gridTemplateColumns: "1.5fr 80px 100px 80px 80px 80px 32px", gap: 8, alignItems: "center", padding: "10px 4px", background: "rgba(26,58,92,.2)", borderRadius: 9 }}>
                    <input value={p.nome} onChange={e => atualizarPacSim(p.id, "nome", e.target.value)} style={{ ...inp, padding: "5px 8px", fontSize: ".78rem" }} />
                    <input type="number" min={1} max={200} value={p.sessoes} onChange={e => atualizarPacSim(p.id, "sessoes", Number(e.target.value))} style={{ ...inp, padding: "5px 8px", fontSize: ".78rem" }} />
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <span style={{ fontSize: ".72rem", color: "rgba(170,210,245,.5)" }}>R$</span>
                      <input type="number" min={10} max={2000} step={10} value={p.valorSessao} onChange={e => atualizarPacSim(p.id, "valorSessao", Number(e.target.value))} style={{ ...inp, padding: "5px 8px", fontSize: ".78rem" }} />
                    </div>
                    <select value={p.modelo} onChange={e => atualizarPacSim(p.id, "modelo", e.target.value)} style={{ ...inp, padding: "5px 8px", fontSize: ".72rem" }}>
                      <option value="care">Care</option>
                      <option value="ffs">FFS</option>
                    </select>
                    <div style={{ fontSize: ".78rem", fontWeight: 600, color: "#EF9F27" }}>{res ? fmtBRL(res.custoEfetivo) : "—"}</div>
                    <div style={{ fontSize: ".78rem", fontWeight: 700, color: "#1D9E75" }}>{res ? fmtBRL(res.lucroEfetivo) : "—"}</div>
                    <button onClick={() => removerPacSim(p.id)} style={{ padding: "4px 6px", borderRadius: 6, border: "1px solid rgba(224,90,75,.2)", background: "rgba(224,90,75,.06)", color: "#E05A4B", cursor: "pointer", fontSize: ".7rem" }}>✕</button>
                  </div>
                )
              })}

              <button onClick={adicionarPacSim} style={{ padding: "9px", borderRadius: 9, border: "1px dashed rgba(99,179,237,.2)", background: "transparent", color: "rgba(160,200,235,.5)", fontSize: ".78rem", cursor: "pointer", fontFamily: "var(--font-sans)" }}>
                + Adicionar paciente
              </button>
            </div>

            {/* Totais */}
            <div style={{ borderTop: "1px solid rgba(26,58,92,.4)", paddingTop: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
                {[
                  { l: "Receita bruta total", v: fmtBRL(simResultado.totalBruto),   c: "#e8f0f8" },
                  { l: "Custo plataforma",    v: fmtBRL(simResultado.totalEfetivo),  c: "#EF9F27" },
                  { l: "Receita líquida",     v: fmtBRL(simResultado.totalLiquido),  c: "#1D9E75" },
                  { l: "Fracta recebe",       v: fmtBRL(simResultado.receitaFracta), c: "#8B7FE8" },
                ].map(k => (
                  <div key={k.l} style={{ background: "rgba(26,58,92,.25)", borderRadius: 9, padding: "10px 12px" }}>
                    <div style={{ fontSize: ".58rem", color: "rgba(170,210,245,.7)", marginBottom: 5 }}>{k.l}</div>
                    <div style={{ fontSize: "1.1rem", fontWeight: 800, color: k.c }}>{k.v}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Projeção de escala */}
          <div style={{ ...card, padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div style={{ fontSize: ".88rem", fontWeight: 700, color: "#e8f0f8" }}>Projeção de escala</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ fontSize: ".72rem", color: "rgba(170,210,245,.6)" }}>Nº de terapeutas:</div>
                <input type="number" min={1} max={10000} value={simEscala} onChange={e => setSimEscala(Number(e.target.value))} style={{ ...inp, width: 80, padding: "5px 8px", fontSize: ".78rem" }} />
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
              {[
                { l: `Receita líquida total (${simEscala} terapeutas)`, v: fmtK(simResultado.escalaLiquido),  c: "#1D9E75", sub: "receita dos terapeutas" },
                { l: `Fracta recebe (${simEscala} terapeutas)`,          v: fmtK(simResultado.escalaFracta),   c: "#8B7FE8", sub: "receita da plataforma" },
                { l: "Ticket médio por terapeuta",                        v: fmtBRL(simResultado.totalLiquido), c: "#378ADD", sub: "líquido mensal" },
              ].map(k => (
                <div key={k.l} style={{ background: "rgba(26,58,92,.25)", borderRadius: 10, padding: "14px 16px" }}>
                  <div style={{ fontSize: ".6rem", color: "rgba(170,210,245,.7)", marginBottom: 6, lineHeight: 1.4 }}>{k.l}</div>
                  <div style={{ fontSize: "1.3rem", fontWeight: 800, color: k.c }}>{k.v}</div>
                  <div style={{ fontSize: ".62rem", color: "rgba(170,210,245,.5)", marginTop: 4 }}>{k.sub}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Sugestão do Engine */}
          <div style={{ background: "rgba(29,158,117,.06)", border: "1px solid rgba(29,158,117,.2)", borderRadius: 12, padding: "16px 18px" }}>
            <div style={{ fontSize: ".78rem", fontWeight: 700, color: "#1D9E75", marginBottom: 8 }}>Sugestão do FractaEngine</div>
            <div style={{ fontSize: ".78rem", color: "rgba(160,200,235,.8)", lineHeight: 1.65 }}>
              {simResultado.pacs.filter(p => p.modelo === "ffs" && p.sessoes <= 20).length > 0 &&
                `${simResultado.pacs.filter(p => p.modelo === "ffs" && p.sessoes <= 20).length} paciente(s) FFS com até 20 sessões — plano Starter R$49/mês é suficiente. `}
              {simResultado.pacs.filter(p => p.modelo === "care").length > 0 &&
                `${simResultado.pacs.filter(p => p.modelo === "care").length} paciente(s) Care com comissão de ${(simResultado.comissao * 100).toFixed(0)}% (${simNivel}). `}
              {simResultado.totalLiquido > 5000
                ? "Carteira saudável — receita líquida acima de R$5.000/mês."
                : "Considere adicionar mais pacientes Care para aumentar a receita líquida."}
            </div>
          </div>
        </div>
      )}

      {/* Modal detalhes paciente */}
      {pacSel && (
        <div onClick={() => setPacSel(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ ...card, padding: 28, width: "100%", maxWidth: 440 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
              <div style={{ width: 44, height: 44, borderRadius: "50%", background: pacSel.gradient, display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".75rem", fontWeight: 800, color: "#fff" }}>{pacSel.iniciais}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "1rem", fontWeight: 700, color: "#e8f0f8" }}>{pacSel.nome}</div>
                <div style={{ fontSize: ".72rem", color: "rgba(160,200,235,.6)" }}>Modelo {pacSel.modelo.toUpperCase()} · {pacSel.sessoesRealizadas} sessões este mês</div>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
              {[
                { l: "Receita bruta",    v: fmtBRL(pacSel.receitaBruta)    },
                { l: "Custo plataforma", v: fmtBRL(pacSel.custoPlataforma) },
                { l: "Receita líquida",  v: fmtBRL(pacSel.receitaLiquida)  },
                { l: "Valor/sessão",     v: fmtBRL(pacSel.valorSessao)     },
              ].map(r => (
                <div key={r.l} style={{ background: "rgba(26,58,92,.25)", borderRadius: 9, padding: "10px 12px" }}>
                  <div style={{ fontSize: ".58rem", color: "rgba(170,210,245,.88)", marginBottom: 3 }}>{r.l}</div>
                  <div style={{ fontSize: ".88rem", fontWeight: 700, color: "#e8f0f8" }}>{r.v}</div>
                </div>
              ))}
            </div>
            <button onClick={() => setPacSel(null)} style={{ width: "100%", padding: "10px", borderRadius: 9, border: "1px solid rgba(70,120,180,.5)", background: "transparent", color: "rgba(160,200,235,.6)", fontSize: 13, cursor: "pointer", fontFamily: "var(--font-sans)" }}>
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
