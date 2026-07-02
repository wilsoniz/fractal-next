"use client"
// FCRM-006 — Timeline Clínica: a história cronológica de uma Pergunta Clínica.
// Read-only, lazy (só monta quando o card é expandido). Ordem ascendente.

import { useEffect, useState } from "react"
import {
  montarTimelineInvestigacao,
  type TimelineInvestigacao as Timeline,
  type TimelineEventType,
} from "@/lib/clinical-investigation-timeline"

const INK = '#1a2e44', TEAL = '#1D9E75', AMBER = '#EF9F27', RED = '#E05A4B', ROXO = '#8B7FE8'

function corEvento(t: TimelineEventType): string {
  switch (t) {
    case 'criada': return TEAL
    case 'encerrada': return RED
    case 'programa_vinculado': return ROXO
    case 'sessao_evidencia': return AMBER
    default: return '#8595a6'
  }
}

function fmtData(iso: string): string {
  const d = new Date(iso)
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('pt-BR')
}

export function TimelineInvestigacao({ investigationId }: { investigationId: string }) {
  const [timeline, setTimeline] = useState<Timeline | null>(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    let cancelado = false
    setLoading(true); setErro(null)
    montarTimelineInvestigacao(investigationId).then(res => {
      if (cancelado) return
      if (res.error !== null) setErro(res.error)
      else setTimeline(res.data)
      setLoading(false)
    })
    return () => { cancelado = true }
  }, [investigationId])

  if (loading) return <div style={caixa}>Carregando timeline…</div>
  if (erro) return <div style={{ ...caixa, color: RED }}>{erro}</div>
  if (!timeline) return null
  if (timeline.eventos.length === 0)
    return <div style={caixa}>Sem eventos registrados ainda.</div>

  return (
    <div style={caixa}>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {timeline.eventos.map((ev, i) => {
          const cor = corEvento(ev.tipo)
          const ultimo = i === timeline.eventos.length - 1
          return (
            <div key={i} style={{ display: 'flex', gap: 12 }}>
              {/* trilho: nó + linha */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: cor, marginTop: 4 }} />
                {!ultimo && <span style={{ flex: 1, width: 2, background: 'rgba(26,46,68,.10)', marginTop: 2 }} />}
              </div>
              {/* conteúdo */}
              <div style={{ paddingBottom: ultimo ? 0 : 16, minWidth: 0 }}>
                <div style={{ fontSize: 11, color: '#8595a6', fontWeight: 600 }}>{fmtData(ev.data)}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: INK }}>{ev.titulo}</div>
                {ev.detalhe && <div style={{ fontSize: 12, color: '#5a6b7d' }}>{ev.detalhe}</div>}
              </div>
            </div>
          )
        })}
      </div>

      {timeline.ultimaAtualizacao && (
        <div style={{ fontSize: 11, color: '#8595a6', marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(26,46,68,.07)' }}>
          Última atualização: {fmtData(timeline.ultimaAtualizacao)}
        </div>
      )}
    </div>
  )
}

const caixa: React.CSSProperties = {
  marginTop: 10, padding: '14px 16px', borderRadius: 10, fontSize: 13, color: '#5a6b7d',
  background: 'rgba(26,46,68,.03)', border: '1px solid rgba(26,46,68,.08)',
}
