"use client"
// Treatment-003 — Program Workspace (modal). Concentra o estado clínico de UMA
// instância de programa (plano_programa). Read-only + ações reusadas.
// Estrutura: Programa → Situação Atual → Perguntas Clínicas → Fase Atual →
//            Critérios → SD → Hierarquia de Dicas → Resumo das Sessões → Botões.

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import {
  obterProgramaWorkspace,
  avancarFaseWorkspace,
  type ProgramaWorkspaceDados,
} from "@/lib/programa-workspace"

const TIPO_FASE: Record<string, string> = {
  baseline: "Linha de base", intervention: "Intervenção",
  maintenance: "Manutenção", generalization: "Generalização",
}
const PRIORIDADE: Record<string, string> = { Low: "Baixa", Medium: "Média", High: "Alta", Critical: "Crítica" }
const STATUS_PC: Record<string, string> = { Active: "Ativa", Paused: "Pausada", Closed: "Encerrada" }

function fmtData(iso: string | null): string {
  if (!iso) return "—"
  const d = new Date(iso)
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("pt-BR")
}

export function ProgramaWorkspace({
  planoProgramaId, onFechar,
}: { planoProgramaId: string; onFechar: () => void }) {
  const [dados, setDados] = useState<ProgramaWorkspaceDados | null>(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [avancando, setAvancando] = useState(false)

  const carregar = useCallback(async () => {
    setLoading(true); setErro(null)
    const res = await obterProgramaWorkspace(planoProgramaId)
    if (res.error !== null) setErro(res.error)
    else setDados(res.data)
    setLoading(false)
  }, [planoProgramaId])

  useEffect(() => { carregar() }, [carregar])

  async function avancarFase() {
    if (!dados?.faseAtiva) return
    const motivo = window.prompt("Motivo da transição de fase (opcional):") ?? ""
    setAvancando(true); setErro(null)
    const res = await avancarFaseWorkspace(dados.faseAtiva.id, motivo)
    setAvancando(false)
    if (res.error !== null) { setErro(res.error); return }
    await carregar()
  }

  return (
    <div style={overlay} onClick={onFechar}>
      <div onClick={e => e.stopPropagation()} style={caixa}>
        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "rgba(160,200,235,.5)", fontSize: ".85rem" }}>Carregando workspace…</div>
        ) : erro ? (
          <div style={{ ...aviso, color: "#E05A4B" }}>{erro}</div>
        ) : !dados ? null : (
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

            {/* ── PROGRAMA (header) ── */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: "1.05rem", fontWeight: 800, color: "#e8f0f8" }}>{dados.nome}</div>
                <div style={{ fontSize: ".72rem", color: "rgba(160,200,235,.5)", marginTop: 2 }}>
                  {[dados.dominio, dados.operante].filter(Boolean).join(" · ") || "—"}
                </div>
              </div>
              <button onClick={onFechar} style={btnFechar}>×</button>
            </div>

            {/* ── SITUAÇÃO ATUAL ── */}
            <Secao titulo="Situação Atual" destaque>
              <div style={grid}>
                <Campo rotulo="Fase atual" valor={dados.faseAtiva?.rotulo ?? "—"} />
                <Campo rotulo="Status" valor={dados.faseAtiva ? (TIPO_FASE[dados.faseAtiva.tipo] ?? dados.faseAtiva.tipo) : "—"} />
                <Campo rotulo="Sessões coletadas" valor={dados.faseAtiva?.sessoesColetadas != null ? String(dados.faseAtiva.sessoesColetadas) : "—"} />
                <Campo rotulo="Percentual atual" valor={dados.percentualAtual != null ? `${dados.percentualAtual}%` : "—"} />
                <Campo rotulo="Mastery" valor={
                  dados.dominadoEm ? `Dominado em ${fmtData(dados.dominadoEm)}`
                  : dados.masteryMinIndependence != null ? `${dados.masteryMinIndependence}% independência`
                  : (dados.criterioMaestria ?? "Em andamento")} />
                <Campo rotulo="Última sessão" valor={fmtData(dados.ultimaSessao)} />
                <Campo rotulo="Perguntas clínicas" valor={String(dados.perguntas.length)} />
              </div>
            </Secao>

            {/* ── PERGUNTAS CLÍNICAS RELACIONADAS ── */}
            <Secao titulo="Perguntas Clínicas relacionadas">
              {dados.perguntas.length === 0 ? (
                <Vazio texto="Nenhuma pergunta clínica vinculada a este programa." />
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {dados.perguntas.map(p => (
                    <div key={p.id} style={linha}>
                      <span style={{ fontSize: ".8rem", color: "#e8f0f8", flex: 1, minWidth: 0 }}>{p.title}</span>
                      <span style={chip}>{PRIORIDADE[p.priority] ?? p.priority}</span>
                      <span style={chip}>{STATUS_PC[p.status] ?? p.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </Secao>

            {/* ── FASE ATUAL ── */}
            <Secao titulo="Fase Atual">
              {!dados.faseAtiva ? (
                <Vazio texto="Nenhuma fase ativa." />
              ) : (
                <>
                  <div style={grid}>
                    <Campo rotulo="Rótulo" valor={dados.faseAtiva.rotulo ?? "—"} />
                    <Campo rotulo="Tipo" valor={TIPO_FASE[dados.faseAtiva.tipo] ?? dados.faseAtiva.tipo} />
                    <Campo rotulo="Média" valor={dados.faseAtiva.media != null ? String(dados.faseAtiva.media) : "—"} />
                    <Campo rotulo="CV" valor={dados.faseAtiva.coeficienteVariacao != null ? `${dados.faseAtiva.coeficienteVariacao}%` : "—"} />
                    <Campo rotulo="Tendência" valor={dados.faseAtiva.tendenciaSlope != null ? (Math.abs(dados.faseAtiva.tendenciaSlope) < 0.5 ? "estável" : dados.faseAtiva.tendenciaSlope > 0 ? "↑" : "↓") : "—"} />
                    <Campo rotulo="Estabilidade" valor={dados.faseAtiva.estabilidadePct != null ? `${dados.faseAtiva.estabilidadePct}%` : "—"} />
                  </div>
                  {dados.faseAtiva.sistemaSugeriuAvanco && dados.faseAtiva.sistemaMotivo && (
                    <div style={{ marginTop: 10, fontSize: ".72rem", color: "rgba(29,158,117,.85)", background: "rgba(29,158,117,.08)", border: "1px solid rgba(29,158,117,.2)", borderRadius: 8, padding: "9px 11px" }}>
                      {dados.faseAtiva.sistemaMotivo}
                    </div>
                  )}
                </>
              )}
            </Secao>

            {/* ── CRITÉRIOS ── */}
            <Secao titulo="Critérios de aprendizagem">
              <div style={grid}>
                <Campo rotulo="Critério (texto)" valor={dados.criterioMaestria ?? "—"} />
                <Campo rotulo="Acurácia" valor={dados.criterioPercentual != null ? `${dados.criterioPercentual}%` : "—"} />
                <Campo rotulo="Independência (mastery)" valor={dados.masteryMinIndependence != null ? `${dados.masteryMinIndependence}%` : "—"} />
                <Campo rotulo="Sessões no critério" valor={dados.sessoesNoCriterio != null ? String(dados.sessoesNoCriterio) : "—"} />
              </div>
            </Secao>

            {/* ── SD ── */}
            <Secao titulo="SD (estímulo discriminativo)">
              {dados.sd ? <div style={{ fontSize: ".82rem", color: "#e8f0f8", whiteSpace: "pre-wrap" }}>{dados.sd}</div> : <Vazio texto="SD não definido." />}
            </Secao>

            {/* ── HIERARQUIA DE DICAS ── */}
            <Secao titulo="Hierarquia de Dicas">
              {dados.hierarquiaDicas.length === 0 ? (
                <Vazio texto="Hierarquia de dicas não definida." />
              ) : (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {dados.hierarquiaDicas.map((h, i) => (
                    <span key={i} style={{ ...chip, color: "#8B7FE8", background: "rgba(139,127,232,.12)" }}>{i + 1}. {h}</span>
                  ))}
                </div>
              )}
            </Secao>

            {/* ── RESUMO DAS SESSÕES ── */}
            <Secao titulo="Resumo das Sessões">
              <div style={grid}>
                <Campo rotulo="Sessões" valor={String(dados.numSessoes)} />
                <Campo rotulo="Tentativas" valor={String(dados.totalTentativas)} />
                <Campo rotulo="Independência" valor={dados.percentualIndependencia != null ? `${dados.percentualIndependencia}%` : "—"} />
                <Campo rotulo="Última sessão" valor={fmtData(dados.ultimaSessao)} />
              </div>
            </Secao>

            {/* ── BOTÕES ── */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, paddingTop: 4 }}>
              {dados.faseAtiva && (
                <button onClick={avancarFase} disabled={avancando} style={btnSec}>
                  {avancando ? "Avançando…" : "Avançar fase"}
                </button>
              )}
              {dados.criancaId && (
                <Link href={`/clinic/sessao?pacienteId=${dados.criancaId}&programaId=${dados.programaId}`}
                  style={btnPrimarioLink}>
                  Executar sessão →
                </Link>
              )}
            </div>

            {erro && <div style={{ ...aviso, color: "#E05A4B" }}>{erro}</div>}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Subcomponentes ─────────────────────────────────────────────────────────
function Secao({ titulo, children, destaque }: { titulo: string; children: React.ReactNode; destaque?: boolean }) {
  return (
    <div style={{ background: destaque ? "rgba(29,158,117,.06)" : "rgba(255,255,255,0.02)", border: `1px solid ${destaque ? "rgba(29,158,117,.25)" : "rgba(26,58,92,.45)"}`, borderRadius: 12, padding: 14 }}>
      <div style={{ fontSize: ".62rem", color: destaque ? "#1D9E75" : "rgba(160,200,235,.5)", textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 700, marginBottom: 10 }}>{titulo}</div>
      {children}
    </div>
  )
}
function Campo({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div>
      <div style={{ fontSize: ".62rem", color: "rgba(160,200,235,.45)", fontWeight: 600 }}>{rotulo}</div>
      <div style={{ fontSize: ".82rem", color: "#e8f0f8", fontWeight: 600, marginTop: 1 }}>{valor}</div>
    </div>
  )
}
function Vazio({ texto }: { texto: string }) {
  return <div style={{ fontSize: ".74rem", color: "rgba(160,200,235,.4)" }}>{texto}</div>
}

// ─── Estilos ────────────────────────────────────────────────────────────────
const overlay: React.CSSProperties = {
  position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", backdropFilter: "blur(6px)",
  display: "flex", alignItems: "flex-start", justifyContent: "center", zIndex: 60, padding: "40px 20px", overflowY: "auto",
}
const caixa: React.CSSProperties = {
  background: "rgba(13,32,53,.97)", border: "1px solid rgba(26,58,92,.6)", borderRadius: 16,
  padding: 24, width: "100%", maxWidth: 560,
}
const grid: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 12 }
const linha: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 8, padding: "8px 11px", borderRadius: 8,
  background: "rgba(255,255,255,0.02)", border: "1px solid rgba(26,58,92,.45)",
}
const chip: React.CSSProperties = {
  flexShrink: 0, fontSize: ".62rem", fontWeight: 700, color: "rgba(160,200,235,.7)",
  background: "rgba(255,255,255,0.04)", borderRadius: 20, padding: "2px 9px",
}
const aviso: React.CSSProperties = {
  fontSize: ".78rem", padding: "10px 12px", borderRadius: 8,
  background: "rgba(224,90,75,.08)", border: "1px solid rgba(224,90,75,.2)",
}
const btnFechar: React.CSSProperties = {
  flexShrink: 0, background: "transparent", border: "1px solid rgba(26,58,92,.5)", borderRadius: 8,
  width: 30, height: 30, color: "rgba(160,200,235,.7)", fontSize: 18, lineHeight: 1, cursor: "pointer",
}
const btnSec: React.CSSProperties = {
  padding: "9px 16px", borderRadius: 9, border: "1px solid rgba(239,159,39,.35)",
  background: "rgba(239,159,39,.10)", color: "#EF9F27", fontSize: ".78rem", fontWeight: 700,
  cursor: "pointer", fontFamily: "var(--font-sans)",
}
const btnPrimarioLink: React.CSSProperties = {
  padding: "9px 16px", borderRadius: 9, border: "none",
  background: "linear-gradient(135deg,#1D9E75,#0f8f7a)", color: "#07111f", fontSize: ".78rem",
  fontWeight: 800, textDecoration: "none", fontFamily: "var(--font-sans)",
}
