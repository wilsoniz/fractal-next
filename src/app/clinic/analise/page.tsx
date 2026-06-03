"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useClinicContext } from "../layout";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ReferenceLine, CartesianGrid, Legend,
} from "recharts";

// ─── TIPOS ───────────────────────────────────────────────────────────────────

interface Paciente { id: string; nome: string; diagnostico: string | null }

interface SessaoRow {
  id: string
  inicio: string
  tipo: string
  fase_jornada: string | null
  taxa_geral: number | null
  total_operantes: number | null
  programas_json: ProgramaJson[]
  familia_comunicada: boolean
}

interface ProgramaJson {
  nome: string
  dominio: string
  taxa: number
  total: number
  acertos: number
  independencia: number
  criterio: boolean
  seq: string
  nivelPredominante?: string
}

interface ProgramaAgregado {
  nome: string
  dominio: string
  sessoes: { data: string; taxa: number; independencia: number; criterio: boolean }[]
  taxaMedia: number
  taxaUltima: number
  independenciaMedia: number
  sessoesTotal: number
  sessoesCriterio: number
  atingiuCriterio: boolean
  tendencia: "subindo" | "descendo" | "estavel"
}

// ─── CONSTANTES ──────────────────────────────────────────────────────────────

const FASES = [
  { id: "avaliacao",     label: "Avaliação",      cor: "#8B7FE8" },
  { id: "intervencao",   label: "Intervenção",     cor: "#1D9E75" },
  { id: "generalizacao", label: "Generalização",   cor: "#378ADD" },
  { id: "manutencao",    label: "Manutenção",      cor: "#EF9F27" },
  { id: "dominado",      label: "Dominado",        cor: "#23c48f" },
]

const CORES_LINHA = [
  "#1D9E75","#378ADD","#8B7FE8","#EF9F27","#E05A4B","#23c48f","#f472b6","#60a5fa",
]

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function fmtData(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
}

function fmtDataCurta(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })
}

function tendencia(sessoes: { taxa: number }[]): "subindo" | "descendo" | "estavel" {
  if (sessoes.length < 2) return "estavel"
  const metade = Math.floor(sessoes.length / 2)
  const mediaAntes = sessoes.slice(0, metade).reduce((a, s) => a + s.taxa, 0) / metade
  const mediaDepois = sessoes.slice(metade).reduce((a, s) => a + s.taxa, 0) / (sessoes.length - metade)
  const diff = mediaDepois - mediaAntes
  if (diff > 5) return "subindo"
  if (diff < -5) return "descendo"
  return "estavel"
}

// ─── PAGE ────────────────────────────────────────────────────────────────────

export default function AnalisePage() {
  const { terapeuta } = useClinicContext()
  const router = useRouter()

  // Filtros
  const [pacientes,        setPacientes]        = useState<Paciente[]>([])
  const [pacienteSel,      setPacienteSel]      = useState<string>("")
  const [faseSel,          setFaseSel]          = useState<string>("todas")
  const [dataInicio,       setDataInicio]        = useState<string>("")
  const [dataFim,          setDataFim]           = useState<string>("")
  const [programaSel,      setProgramaSel]       = useState<string>("todos")

  // Dados
  const [sessoes,          setSessoes]           = useState<SessaoRow[]>([])
  const [loading,          setLoading]           = useState(false)
  const [carregado,        setCarregado]         = useState(false)

  // UI
  const [tabAtiva,         setTabAtiva]          = useState<"evolucao"|"programas"|"fases"|"sessoes">("evolucao")
  const [programaDestaque, setProgramaDestaque]  = useState<string | null>(null)

  // Carregar pacientes do terapeuta
  useEffect(() => {
    if (!terapeuta) return
    supabase
      .from("planos_com_crianca")
      .select("crianca_id, crianca_nome, crianca_diagnostico")
      .eq("terapeuta_id", terapeuta.id)
      .then(({ data }) => {
        const unicos = new Map<string, Paciente>()
        for (const row of (data ?? [])) {
          if (!unicos.has(row.crianca_id)) {
            unicos.set(row.crianca_id, {
              id: row.crianca_id,
              nome: row.crianca_nome,
              diagnostico: row.crianca_diagnostico,
            })
          }
        }
        setPacientes([...unicos.values()])
      })
  }, [terapeuta])

  // Buscar sessões com filtros
  async function buscar() {
    if (!pacienteSel) return
    setLoading(true)
    setCarregado(false)

    let q = supabase
      .from("session_summary")
      .select(`
        id, sessao_id, taxa_geral, total_operantes,
        programas_json, familia_comunicada, criado_em,
        sessoes_v2 ( id, inicio, tipo, fase_jornada )
      `)
      .eq("crianca_id", pacienteSel)
      .order("criado_em", { ascending: true })
      .limit(200)

    if (dataInicio) q = q.gte("criado_em", dataInicio)
    if (dataFim)    q = q.lte("criado_em", dataFim + "T23:59:59")

    const { data } = await q

    let rows: SessaoRow[] = (data ?? []).map((sm: any) => ({
      id:               sm.sessao_id ?? sm.id,
      inicio:           sm.sessoes_v2?.inicio ?? sm.criado_em,
      tipo:             sm.sessoes_v2?.tipo ?? "atendimento",
      fase_jornada:     sm.sessoes_v2?.fase_jornada ?? null,
      taxa_geral:       sm.taxa_geral,
      total_operantes:  sm.total_operantes,
      programas_json:   sm.programas_json ?? [],
      familia_comunicada: sm.familia_comunicada ?? false,
    }))

    if (faseSel !== "todas") {
      rows = rows.filter(s => s.fase_jornada === faseSel)
    }

    setSessoes(rows)
    setLoading(false)
    setCarregado(true)
  }

  // Agregar dados por programa
  const programasAgregados = useMemo<ProgramaAgregado[]>(() => {
    const map = new Map<string, ProgramaAgregado>()

    for (const sessao of sessoes) {
      const progs = sessao.programas_json.filter(
        p => !["assessment", "avaliacao"].includes((p as any).tipo ?? "")
      )
      for (const prog of progs) {
        if (!map.has(prog.nome)) {
          map.set(prog.nome, {
            nome: prog.nome, dominio: prog.dominio,
            sessoes: [], taxaMedia: 0, taxaUltima: 0,
            independenciaMedia: 0, sessoesTotal: 0,
            sessoesCriterio: 0, atingiuCriterio: false,
            tendencia: "estavel",
          })
        }
        const agg = map.get(prog.nome)!
        agg.sessoes.push({
          data: sessao.inicio,
          taxa: prog.taxa,
          independencia: prog.independencia,
          criterio: prog.criterio,
        })
        if (prog.criterio) {
          agg.sessoesCriterio++
          agg.atingiuCriterio = true
        }
      }
    }

    for (const agg of map.values()) {
      const n = agg.sessoes.length
      agg.sessoesTotal    = n
      agg.taxaMedia       = n > 0 ? Math.round(agg.sessoes.reduce((a, s) => a + s.taxa, 0) / n) : 0
      agg.taxaUltima      = n > 0 ? agg.sessoes[n - 1].taxa : 0
      agg.independenciaMedia = n > 0 ? Math.round(agg.sessoes.reduce((a, s) => a + s.independencia, 0) / n) : 0
      agg.tendencia       = tendencia(agg.sessoes)
    }

    return [...map.values()].sort((a, b) => b.sessoesTotal - a.sessoesTotal)
  }, [sessoes])

  // Filtrar por programa selecionado
  const programasFiltrados = useMemo(() =>
    programaSel === "todos"
      ? programasAgregados
      : programasAgregados.filter(p => p.nome === programaSel),
    [programasAgregados, programaSel]
  )

  // Dados para gráfico de evolução
  const dadosGrafico = useMemo(() => {
    const programasParaGrafico = programaDestaque
      ? programasAgregados.filter(p => p.nome === programaDestaque)
      : programasAgregados.slice(0, 6)

    // União de todas as datas
    const datasSet = new Set<string>()
    for (const p of programasParaGrafico) {
      for (const s of p.sessoes) datasSet.add(s.data)
    }
    const datas = [...datasSet].sort()

    return datas.map(data => {
      const ponto: Record<string, any> = { data: fmtData(data) }
      for (const prog of programasParaGrafico) {
        const sessao = prog.sessoes.find(s => s.data === data)
        if (sessao) ponto[prog.nome] = sessao.taxa
      }
      return ponto
    })
  }, [programasAgregados, programaDestaque])

  // KPIs gerais
  const kpis = useMemo(() => {
    const taxas = sessoes.map(s => s.taxa_geral).filter(t => t !== null) as number[]
    return {
      totalSessoes:    sessoes.length,
      taxaMedia:       taxas.length > 0 ? Math.round(taxas.reduce((a, b) => a + b, 0) / taxas.length) : 0,
      totalProgramas:  programasAgregados.length,
      programasCriterio: programasAgregados.filter(p => p.atingiuCriterio).length,
      totalOperantes:  sessoes.reduce((a, s) => a + (s.total_operantes ?? 0), 0),
    }
  }, [sessoes, programasAgregados])

  // Distribuição por fase
  const porFase = useMemo(() => {
    const map: Record<string, number> = {}
    for (const s of sessoes) {
      const fase = s.fase_jornada ?? "sem_fase"
      map[fase] = (map[fase] ?? 0) + 1
    }
    return map
  }, [sessoes])

  // ── CSS ──────────────────────────────────────────────────────────────────────
  const card: React.CSSProperties = {
    background: "rgba(13,32,53,.75)",
    border: "1px solid rgba(26,58,92,.5)",
    borderRadius: 14,
    backdropFilter: "blur(8px)",
  }
  const inp: React.CSSProperties = {
    background: "rgba(20,55,110,.55)",
    border: "1px solid rgba(26,58,92,.6)",
    borderRadius: 8, padding: "8px 12px",
    color: "#e8f0f8", fontFamily: "var(--font-sans)",
    fontSize: ".82rem", outline: "none",
    width: "100%", boxSizing: "border-box" as const,
  }
  const lbl: React.CSSProperties = {
    fontSize: ".6rem", fontWeight: 700,
    textTransform: "uppercase" as const,
    letterSpacing: ".09em", color: "rgba(170,210,245,.6)",
    marginBottom: 6, display: "block",
  }

  const TABS = [
    { id: "evolucao",   label: "Evolução por programa" },
    { id: "programas",  label: "Programas"             },
    { id: "fases",      label: "Por fase"              },
    { id: "sessoes",    label: "Sessões"               },
  ] as const

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* Cabeçalho */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#e8f0f8", margin: 0 }}>
            Análise Longitudinal
          </h1>
          <div style={{ fontSize: ".72rem", color: "rgba(160,200,235,.4)", marginTop: 3 }}>
            Cruzamento de dados clínicos por período, fase e programa
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div style={{ ...card, padding: 20 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, alignItems: "flex-end" }}>

          <div>
            <label style={lbl}>Paciente</label>
            <select value={pacienteSel} onChange={e => setPacienteSel(e.target.value)} style={{ ...inp, appearance: "none" as const }}>
              <option value="">Selecionar...</option>
              {pacientes.map(p => (
                <option key={p.id} value={p.id}>{p.nome}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={lbl}>Fase da jornada</label>
            <select value={faseSel} onChange={e => setFaseSel(e.target.value)} style={{ ...inp, appearance: "none" as const }}>
              <option value="todas">Todas as fases</option>
              {FASES.map(f => (
                <option key={f.id} value={f.id}>{f.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={lbl}>Data início</label>
            <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} style={inp} />
          </div>

          <div>
            <label style={lbl}>Data fim</label>
            <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} style={inp} />
          </div>

          <button
            onClick={buscar}
            disabled={!pacienteSel || loading}
            style={{
              padding: "9px 20px", borderRadius: 9, border: "none",
              background: pacienteSel ? "linear-gradient(135deg,#1D9E75,#0f8f7a)" : "rgba(26,58,92,.4)",
              color: pacienteSel ? "#07111f" : "rgba(160,200,235,.3)",
              fontWeight: 800, fontSize: ".82rem", cursor: pacienteSel ? "pointer" : "not-allowed",
              fontFamily: "var(--font-sans)", whiteSpace: "nowrap" as const,
            }}
          >
            {loading ? "Buscando..." : "Buscar"}
          </button>
        </div>
      </div>

      {/* Estado vazio */}
      {!carregado && !loading && (
        <div style={{ ...card, padding: 48, textAlign: "center" }}>
          <div style={{ fontSize: "2rem", marginBottom: 12, opacity: .3 }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="rgba(160,200,235,.4)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto" }}>
              <path d="M3 3v18h18"/><path d="M7 16l4-4 4 4 4-4"/>
            </svg>
          </div>
          <div style={{ fontSize: ".85rem", color: "rgba(160,200,235,.3)" }}>
            Selecione um paciente e clique em Buscar para visualizar a análise
          </div>
        </div>
      )}

      {/* Resultados */}
      {carregado && (
        <>
          {/* KPIs */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
            {[
              { l: "Sessões",          v: kpis.totalSessoes,       c: "#e8f0f8" },
              { l: "Taxa média",       v: `${kpis.taxaMedia}%`,    c: kpis.taxaMedia >= 80 ? "#1D9E75" : kpis.taxaMedia >= 50 ? "#EF9F27" : "#E05A4B" },
              { l: "Programas",        v: kpis.totalProgramas,     c: "#378ADD" },
              { l: "Com critério",     v: kpis.programasCriterio,  c: "#1D9E75" },
              { l: "Operantes",        v: kpis.totalOperantes,     c: "#8B7FE8" },
            ].map(k => (
              <div key={k.l} style={{ ...card, padding: "14px 16px" }}>
                <div style={{ fontSize: ".58rem", color: "rgba(170,210,245,.5)", marginBottom: 4, textTransform: "uppercase" as const, letterSpacing: ".07em" }}>{k.l}</div>
                <div style={{ fontSize: "1.4rem", fontWeight: 800, color: k.c }}>{k.v}</div>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", borderBottom: "1px solid rgba(26,58,92,.4)" }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTabAtiva(t.id)} style={{
                padding: "10px 18px", background: "none", border: "none",
                borderBottom: `2px solid ${tabAtiva === t.id ? "#1D9E75" : "transparent"}`,
                color: tabAtiva === t.id ? "#1D9E75" : "rgba(160,200,235,.5)",
                fontFamily: "var(--font-sans)", fontWeight: tabAtiva === t.id ? 700 : 400,
                fontSize: ".78rem", cursor: "pointer", marginBottom: -1,
              }}>{t.label}</button>
            ))}
          </div>

          {/* ── TAB EVOLUÇÃO ── */}
          {tabAtiva === "evolucao" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

              {/* Seletor de programa */}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" as const }}>
                <button onClick={() => setProgramaDestaque(null)} style={{
                  padding: "5px 14px", borderRadius: 20,
                  border: `1px solid ${!programaDestaque ? "rgba(29,158,117,.5)" : "rgba(26,58,92,.4)"}`,
                  background: !programaDestaque ? "rgba(29,158,117,.15)" : "transparent",
                  color: !programaDestaque ? "#1D9E75" : "rgba(160,200,235,.4)",
                  fontSize: ".68rem", fontWeight: !programaDestaque ? 700 : 400,
                  cursor: "pointer", fontFamily: "var(--font-sans)",
                }}>Todos (top 6)</button>
                {programasAgregados.map((p, i) => (
                  <button key={p.nome} onClick={() => setProgramaDestaque(p.nome === programaDestaque ? null : p.nome)} style={{
                    padding: "5px 14px", borderRadius: 20,
                    border: `1px solid ${programaDestaque === p.nome ? CORES_LINHA[i % CORES_LINHA.length] + "88" : "rgba(26,58,92,.4)"}`,
                    background: programaDestaque === p.nome ? CORES_LINHA[i % CORES_LINHA.length] + "20" : "transparent",
                    color: programaDestaque === p.nome ? CORES_LINHA[i % CORES_LINHA.length] : "rgba(160,200,235,.4)",
                    fontSize: ".68rem", fontWeight: programaDestaque === p.nome ? 700 : 400,
                    cursor: "pointer", fontFamily: "var(--font-sans)",
                  }}>{p.nome}</button>
                ))}
              </div>

              {/* Gráfico */}
              {dadosGrafico.length > 1 ? (
                <div style={{ ...card, padding: 20 }}>
                  <div style={{ fontSize: ".72rem", color: "rgba(170,210,245,.5)", marginBottom: 16 }}>
                    Taxa de acerto por sessão — linha de referência em 80% (critério)
                  </div>
                  <ResponsiveContainer width="100%" height={320}>
                    <LineChart data={dadosGrafico} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(26,58,92,.3)" />
                      <XAxis dataKey="data" tick={{ fill: "rgba(160,200,235,.4)", fontSize: 10 }} />
                      <YAxis domain={[0, 100]} tick={{ fill: "rgba(160,200,235,.4)", fontSize: 10 }} tickFormatter={v => `${v}%`} />
                      <Tooltip
                        contentStyle={{ background: "#0d2035", border: "1px solid rgba(26,58,92,.7)", borderRadius: 8, color: "#e8f0f8", fontSize: 11 }}
                        formatter={(v: any) => [`${v}%`]}
                      />
                      <ReferenceLine y={80} stroke="rgba(29,158,117,.4)" strokeDasharray="4 4" label={{ value: "Critério 80%", fill: "rgba(29,158,117,.5)", fontSize: 10, position: "right" }} />
                      <Legend wrapperStyle={{ fontSize: 11, color: "rgba(160,200,235,.6)" }} />
                      {(programaDestaque
                        ? programasAgregados.filter(p => p.nome === programaDestaque)
                        : programasAgregados.slice(0, 6)
                      ).map((p, i) => (
                        <Line
                          key={p.nome}
                          type="monotone"
                          dataKey={p.nome}
                          stroke={CORES_LINHA[i % CORES_LINHA.length]}
                          strokeWidth={2}
                          dot={{ r: 3, fill: CORES_LINHA[i % CORES_LINHA.length] }}
                          connectNulls
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div style={{ ...card, padding: 32, textAlign: "center" }}>
                  <div style={{ fontSize: ".78rem", color: "rgba(160,200,235,.3)" }}>
                    Dados insuficientes para gerar o gráfico — são necessárias ao menos 2 sessões
                  </div>
                </div>
              )}

              {/* Mini cards de tendência */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
                {programasAgregados.slice(0, 6).map((p, i) => {
                  const cor = CORES_LINHA[i % CORES_LINHA.length]
                  const iconeTend = p.tendencia === "subindo" ? "↑" : p.tendencia === "descendo" ? "↓" : "→"
                  const corTend   = p.tendencia === "subindo" ? "#1D9E75" : p.tendencia === "descendo" ? "#E05A4B" : "#EF9F27"
                  return (
                    <div key={p.nome} style={{ ...card, padding: 14, border: `1px solid ${cor}22`, cursor: "pointer" }}
                      onClick={() => setProgramaDestaque(p.nome === programaDestaque ? null : p.nome)}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                        <div style={{ fontSize: ".7rem", fontWeight: 600, color: "#e8f0f8", lineHeight: 1.4, flex: 1, marginRight: 8 }}>{p.nome}</div>
                        <span style={{ fontSize: ".9rem", color: corTend, fontWeight: 800 }}>{iconeTend}</span>
                      </div>
                      <div style={{ display: "flex", gap: 12 }}>
                        <div>
                          <div style={{ fontSize: ".55rem", color: "rgba(170,210,245,.4)", marginBottom: 2 }}>Última sessão</div>
                          <div style={{ fontSize: "1rem", fontWeight: 800, color: p.taxaUltima >= 80 ? "#1D9E75" : p.taxaUltima >= 50 ? "#EF9F27" : "#E05A4B" }}>{p.taxaUltima}%</div>
                        </div>
                        <div>
                          <div style={{ fontSize: ".55rem", color: "rgba(170,210,245,.4)", marginBottom: 2 }}>Média</div>
                          <div style={{ fontSize: "1rem", fontWeight: 800, color: cor }}>{p.taxaMedia}%</div>
                        </div>
                        <div>
                          <div style={{ fontSize: ".55rem", color: "rgba(170,210,245,.4)", marginBottom: 2 }}>Sessões</div>
                          <div style={{ fontSize: "1rem", fontWeight: 800, color: "#e8f0f8" }}>{p.sessoesTotal}</div>
                        </div>
                      </div>
                      {p.atingiuCriterio && (
                        <div style={{ marginTop: 8, fontSize: ".6rem", color: "#1D9E75", background: "rgba(29,158,117,.1)", borderRadius: 20, padding: "2px 8px", display: "inline-block" }}>
                          Critério atingido
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── TAB PROGRAMAS ── */}
          {tabAtiva === "programas" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>

              {/* Filtro por programa */}
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <select value={programaSel} onChange={e => setProgramaSel(e.target.value)}
                  style={{ ...inp, width: 280, appearance: "none" as const }}>
                  <option value="todos">Todos os programas</option>
                  {programasAgregados.map(p => (
                    <option key={p.nome} value={p.nome}>{p.nome}</option>
                  ))}
                </select>
                <div style={{ fontSize: ".72rem", color: "rgba(160,200,235,.4)" }}>
                  {programasFiltrados.length} programa(s) no recorte
                </div>
              </div>

              {/* Tabela */}
              <div style={{ ...card, overflow: "hidden" }}>
                <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" as any }}>
              <div style={{ display: "grid", gridTemplateColumns: "minmax(160px,2fr) minmax(80px,1fr) minmax(70px,1fr) minmax(70px,1fr) minmax(70px,1fr) minmax(60px,1fr) minmax(90px,1fr)", gap: 0, minWidth: 560 }}>
                  {/* Header */}
                  {["Programa","Domínio","Taxa média","Última","Independ.","Sessões","Status"].map(h => (
                    <div key={h} style={{ padding: "10px 14px", fontSize: ".6rem", fontWeight: 700, color: "rgba(170,210,245,.5)", textTransform: "uppercase" as const, letterSpacing: ".07em", borderBottom: "1px solid rgba(26,58,92,.4)", background: "rgba(13,32,53,.5)" }}>
                      {h}
                    </div>
                  ))}

                  {/* Linhas */}
                  {programasFiltrados.map((p, i) => {
                    const corTaxa = p.taxaMedia >= 80 ? "#1D9E75" : p.taxaMedia >= 50 ? "#EF9F27" : "#E05A4B"
                    const corUlt  = p.taxaUltima >= 80 ? "#1D9E75" : p.taxaUltima >= 50 ? "#EF9F27" : "#E05A4B"
                    const bg      = i % 2 === 0 ? "rgba(13,32,53,.3)" : "transparent"
                    return (
                      <>
                        <div key={`n${i}`} style={{ padding: "12px 14px", background: bg, borderBottom: "1px solid rgba(26,58,92,.2)", display: "flex", alignItems: "center" }}>
                          <div>
                            <div style={{ fontSize: ".78rem", fontWeight: 600, color: "#e8f0f8" }}>{p.nome}</div>
                            <div style={{ display: "flex", gap: 4, marginTop: 3 }}>
                              {p.tendencia === "subindo"  && <span style={{ fontSize: ".58rem", color: "#1D9E75" }}>↑ subindo</span>}
                              {p.tendencia === "descendo" && <span style={{ fontSize: ".58rem", color: "#E05A4B" }}>↓ descendo</span>}
                              {p.tendencia === "estavel"  && <span style={{ fontSize: ".58rem", color: "#EF9F27" }}>→ estável</span>}
                            </div>
                          </div>
                        </div>
                        <div key={`d${i}`} style={{ padding: "12px 14px", background: bg, borderBottom: "1px solid rgba(26,58,92,.2)", fontSize: ".72rem", color: "rgba(160,200,235,.5)", display: "flex", alignItems: "center" }}>{p.dominio}</div>
                        <div key={`tm${i}`} style={{ padding: "12px 14px", background: bg, borderBottom: "1px solid rgba(26,58,92,.2)", display: "flex", alignItems: "center" }}>
                          <span style={{ fontSize: ".88rem", fontWeight: 700, color: corTaxa }}>{p.taxaMedia}%</span>
                        </div>
                        <div key={`tu${i}`} style={{ padding: "12px 14px", background: bg, borderBottom: "1px solid rgba(26,58,92,.2)", display: "flex", alignItems: "center" }}>
                          <span style={{ fontSize: ".88rem", fontWeight: 700, color: corUlt }}>{p.taxaUltima}%</span>
                        </div>
                        <div key={`in${i}`} style={{ padding: "12px 14px", background: bg, borderBottom: "1px solid rgba(26,58,92,.2)", display: "flex", alignItems: "center" }}>
                          <span style={{ fontSize: ".88rem", fontWeight: 700, color: "rgba(160,200,235,.8)" }}>{p.independenciaMedia}%</span>
                        </div>
                        <div key={`st${i}`} style={{ padding: "12px 14px", background: bg, borderBottom: "1px solid rgba(26,58,92,.2)", display: "flex", alignItems: "center" }}>
                          <span style={{ fontSize: ".88rem", fontWeight: 700, color: "#e8f0f8" }}>{p.sessoesTotal}</span>
                        </div>
                        <div key={`ss${i}`} style={{ padding: "12px 14px", background: bg, borderBottom: "1px solid rgba(26,58,92,.2)", display: "flex", alignItems: "center" }}>
                          {p.atingiuCriterio
                            ? <span style={{ fontSize: ".65rem", color: "#1D9E75", background: "rgba(29,158,117,.1)", border: "1px solid rgba(29,158,117,.2)", borderRadius: 20, padding: "2px 8px", fontWeight: 700 }}>Critério</span>
                            : <span style={{ fontSize: ".65rem", color: "#EF9F27", background: "rgba(239,159,39,.08)", border: "1px solid rgba(239,159,39,.2)", borderRadius: 20, padding: "2px 8px" }}>Em aquisição</span>
                          }
                        </div>
                      </>
                    )
                  })}
                </div>

                {programasFiltrados.length === 0 && (
                  <div style={{ padding: 32, textAlign: "center", fontSize: ".78rem", color: "rgba(160,200,235,.3)" }}>
                    Nenhum programa no recorte selecionado
                  </div>
                )}
              </div>
              </div>
            </div>
          )}

          {/* ── TAB FASES ── */}
          {tabAtiva === "fases" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {Object.entries(porFase).length === 0 ? (
                <div style={{ ...card, padding: 32, textAlign: "center", fontSize: ".78rem", color: "rgba(160,200,235,.3)" }}>
                  Nenhuma sessão com fase registrada no período. As sessões realizadas antes da atualização não têm tag de fase.
                </div>
              ) : (
                Object.entries(porFase).map(([fase, qtd]) => {
                  const cfg = FASES.find(f => f.id === fase)
                  const cor = cfg?.cor ?? "rgba(160,200,235,.4)"
                  const label = cfg?.label ?? fase
                  const pct = sessoes.length > 0 ? Math.round(qtd / sessoes.length * 100) : 0
                  return (
                    <div key={fase} style={{ ...card, padding: 16, border: `1px solid ${cor}22` }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                        <div style={{ width: 10, height: 10, borderRadius: "50%", background: cor, flexShrink: 0 }} />
                        <span style={{ fontSize: ".82rem", fontWeight: 700, color: cor }}>{label}</span>
                        <span style={{ fontSize: ".72rem", color: "rgba(160,200,235,.4)", marginLeft: "auto" }}>{qtd} sessão(ões) · {pct}% do total</span>
                      </div>
                      <div style={{ height: 6, background: "rgba(26,58,92,.4)", borderRadius: 3, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${pct}%`, background: cor, transition: "width .5s" }} />
                      </div>
                      {/* Programas mais trabalhados nessa fase */}
                      <div style={{ marginTop: 12 }}>
                        <div style={{ fontSize: ".6rem", color: "rgba(170,210,245,.4)", textTransform: "uppercase" as const, letterSpacing: ".07em", marginBottom: 8 }}>
                          Programas nesta fase
                        </div>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" as const }}>
                          {(() => {
                            const sessFase = sessoes.filter(s => (s.fase_jornada ?? "sem_fase") === fase)
                            const progMap = new Map<string, number>()
                            for (const s of sessFase) {
                              for (const p of s.programas_json) {
                                progMap.set(p.nome, (progMap.get(p.nome) ?? 0) + 1)
                              }
                            }
                            return [...progMap.entries()]
                              .sort((a, b) => b[1] - a[1])
                              .slice(0, 8)
                              .map(([nome, cnt]) => (
                                <span key={nome} style={{ fontSize: ".65rem", padding: "2px 10px", borderRadius: 20, background: `${cor}10`, border: `1px solid ${cor}25`, color: cor }}>
                                  {nome} ({cnt})
                                </span>
                              ))
                          })()}
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          )}

          {/* ── TAB SESSÕES ── */}
          {tabAtiva === "sessoes" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ fontSize: ".72rem", color: "rgba(160,200,235,.4)" }}>
                {sessoes.length} sessão(ões) no recorte · ordenadas por data
              </div>
              {[...sessoes].reverse().map((s, i) => {
                const fase = FASES.find(f => f.id === s.fase_jornada)
                const corFase = fase?.cor ?? "rgba(160,200,235,.2)"
                const taxa = s.taxa_geral
                return (
                  <div key={s.id} style={{ ...card, padding: "12px 16px", display: "flex", alignItems: "center", gap: 14 }}>
                    <div style={{ textAlign: "center", width: 44, flexShrink: 0 }}>
                      <div style={{ fontSize: ".6rem", color: "rgba(160,200,235,.4)", fontWeight: 700, textTransform: "uppercase" as const }}>
                        {new Date(s.inicio).toLocaleDateString("pt-BR", { month: "short" })}
                      </div>
                      <div style={{ fontSize: "1.3rem", fontWeight: 800, color: "#e8f0f8", lineHeight: 1 }}>
                        {new Date(s.inicio).getDate()}
                      </div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                        <span style={{ fontSize: ".65rem", color: corFase, background: `${corFase}15`, borderRadius: 20, padding: "2px 8px", fontWeight: 600 }}>
                          {fase?.label ?? "Sem fase"}
                        </span>
                        <span style={{ fontSize: ".65rem", color: "rgba(160,200,235,.35)" }}>
                          {new Date(s.inicio).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                        <span style={{ fontSize: ".65rem", color: "rgba(160,200,235,.35)" }}>· {s.tipo}</span>
                      </div>
                      <div style={{ display: "flex", gap: 5, flexWrap: "wrap" as const }}>
                        {s.programas_json.slice(0, 4).map((p, pi) => (
                          <span key={pi} style={{ fontSize: ".62rem", color: "rgba(160,200,235,.5)", background: "rgba(26,58,92,.3)", borderRadius: 4, padding: "1px 7px" }}>
                            {p.nome}
                          </span>
                        ))}
                        {s.programas_json.length > 4 && (
                          <span style={{ fontSize: ".62rem", color: "rgba(160,200,235,.35)" }}>+{s.programas_json.length - 4}</span>
                        )}
                      </div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      {taxa !== null ? (
                        <>
                          <div style={{ fontSize: "1.2rem", fontWeight: 800, color: taxa >= 80 ? "#1D9E75" : taxa >= 50 ? "#EF9F27" : "#E05A4B" }}>
                            {taxa}%
                          </div>
                          <div style={{ fontSize: ".58rem", color: "rgba(160,200,235,.35)" }}>acerto</div>
                        </>
                      ) : <div style={{ fontSize: ".72rem", color: "rgba(160,200,235,.2)" }}>—</div>}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

        </>
      )}
    </div>
  )
}
