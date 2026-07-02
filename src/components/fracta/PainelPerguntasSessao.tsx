"use client"
// FCRM-004 — Painel "O que estamos investigando" (fase de preparação da sessão).
// Read-only: mantém as Perguntas Clínicas ativas à vista antes de iniciar o
// atendimento. Tema escuro (contexto da sessão). Some quando não há perguntas.

import { PRIORIDADE_LABEL, type ClinicalInvestigation } from "@/lib/clinical-investigations"

function corPrioridade(p: string): string {
  switch (p) {
    case 'Critical': return '#E05A4B'
    case 'High': return '#EF9F27'
    case 'Low': return '#1D9E75'
    default: return 'rgba(160,200,235,.7)' // Medium
  }
}

export function PainelPerguntasSessao({ investigacoes }: { investigacoes: ClinicalInvestigation[] }) {
  if (investigacoes.length === 0) return null
  return (
    <div style={{ background: "rgba(13,32,53,.6)", border: "1px solid rgba(29,158,117,.25)", borderRadius: 14, padding: 14 }}>
      <div style={{ fontSize: ".65rem", color: "#1D9E75", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 10 }}>
        O que estamos investigando
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {investigacoes.map(inv => {
          const cor = corPrioridade(inv.priority)
          return (
            <div key={inv.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: cor, flexShrink: 0 }} />
              <span style={{ fontSize: ".82rem", color: "rgba(220,235,250,.9)", fontWeight: 600, flex: 1, minWidth: 0 }}>{inv.title}</span>
              <span style={{ fontSize: ".62rem", color: cor, background: `${cor}18`, borderRadius: 20, padding: "2px 9px", fontWeight: 700, flexShrink: 0 }}>
                {PRIORIDADE_LABEL[inv.priority] ?? inv.priority}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
