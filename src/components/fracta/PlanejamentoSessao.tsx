"use client"
// CM-01 — Planejamento da Sessão (substitui o antigo "Roteiro da sessão").
// Fica na fase de preparação. Campos em estado local (sem persistência nesta PR).
// "Programas Planejados" reutiliza exatamente a renderização existente
// (biblioteca.filter(b => b.planejado)), recebida via prop.

import { useState } from "react"

const OBJETIVOS = [
  "Avaliação", "Intervenção", "Generalização",
  "Reavaliação", "Observação", "Supervisão", "Outro",
] as const

export function PlanejamentoSessao({
  planejados,
}: {
  planejados: { id: string; nome: string }[]
}) {
  const [objetivoPredominante, setObjetivoPredominante] = useState("")
  const [objetivos, setObjetivos] = useState("")
  const [observacoesIniciais, setObservacoesIniciais] = useState("")

  return (
    <div style={card}>
      <div style={titulo}>Planejamento da sessão</div>

      {/* 1. Objetivo predominante */}
      <div style={{ marginBottom: 14 }}>
        <label style={rotulo}>Objetivo predominante</label>
        <select value={objetivoPredominante} onChange={e => setObjetivoPredominante(e.target.value)} style={campo}>
          <option value="">Selecione…</option>
          {OBJETIVOS.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>

      {/* 2. Objetivos da sessão */}
      <div style={{ marginBottom: 14 }}>
        <label style={rotulo}>Objetivos da sessão</label>
        <textarea value={objetivos} onChange={e => setObjetivos(e.target.value)} rows={3}
          placeholder="O que se pretende trabalhar nesta sessão…"
          style={{ ...campo, resize: "vertical", fontFamily: "var(--font-sans)" }} />
      </div>

      {/* 3. Programas planejados — reutiliza a renderização existente */}
      <div style={{ marginBottom: 14 }}>
        <label style={rotulo}>Programas planejados</label>
        {planejados.length === 0 ? (
          <div style={{ fontSize: ".7rem", color: "rgba(160,200,235,.4)" }}>Nenhum programa no plano.</div>
        ) : (
          <>
            <div style={{ fontSize: ".68rem", color: "rgba(170,210,245,.5)", marginBottom: 8 }}>
              {planejados.length} programa(s) no plano
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
              {planejados.map(p => (
                <span key={p.id} style={{ fontSize: ".7rem", padding: "3px 10px", borderRadius: 20, background: "rgba(29,158,117,.1)", border: "1px solid rgba(29,158,117,.2)", color: "#1D9E75" }}>{p.nome}</span>
              ))}
            </div>
          </>
        )}
      </div>

      {/* 4. Instrumentos previstos — placeholder */}
      <div style={{ marginBottom: 14 }}>
        <label style={rotulo}>Instrumentos previstos</label>
        <div style={{ fontSize: ".7rem", color: "rgba(160,200,235,.35)", padding: "9px 11px", borderRadius: 9, border: "1px dashed rgba(26,58,92,.5)" }}>
          Em breve.
        </div>
      </div>

      {/* 5. Observações iniciais */}
      <div>
        <label style={rotulo}>Observações iniciais</label>
        <textarea value={observacoesIniciais} onChange={e => setObservacoesIniciais(e.target.value)} rows={3}
          placeholder="Contexto, estado do paciente, ajustes previstos…"
          style={{ ...campo, resize: "vertical", fontFamily: "var(--font-sans)" }} />
      </div>
    </div>
  )
}

const card: React.CSSProperties = {
  background: "rgba(13,32,53,.6)", border: "1px solid rgba(26,58,92,.6)", borderRadius: 14, padding: 16,
}
const titulo: React.CSSProperties = {
  fontSize: ".65rem", color: "rgba(170,210,245,.5)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 14,
}
const rotulo: React.CSSProperties = {
  display: "block", fontSize: ".68rem", color: "rgba(170,210,245,.7)", marginBottom: 6,
}
const campo: React.CSSProperties = {
  width: "100%", boxSizing: "border-box", padding: "9px 11px", borderRadius: 9,
  border: "1px solid rgba(26,58,92,.4)", background: "rgba(13,32,53,.6)", color: "#e8f0f8",
  fontSize: ".8rem", outline: "none", fontFamily: "var(--font-sans)",
}
