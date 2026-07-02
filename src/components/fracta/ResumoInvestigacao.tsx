"use client"
// FCRM-003 — Resumo da Investigação (exibição). Lazy: só monta quando o card
// é expandido, e busca o resumo ao montar. Read-only, sem preenchimento novo.

import { useEffect, useState } from "react"
import {
  obterResumoInvestigacao,
  type ResumoInvestigacao as Resumo,
} from "@/lib/clinical-investigation-summary"

const INK = '#1a2e44', TEAL = '#1D9E75', RED = '#E05A4B'

function fmtData(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('pt-BR')
}

export function ResumoInvestigacao({ investigationId }: { investigationId: string }) {
  const [resumo, setResumo] = useState<Resumo | null>(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    let cancelado = false
    setLoading(true); setErro(null)
    obterResumoInvestigacao(investigationId).then(res => {
      if (cancelado) return
      if (res.error !== null) setErro(res.error)
      else setResumo(res.data)
      setLoading(false)
    })
    return () => { cancelado = true }
  }, [investigationId])

  if (loading) return <div style={caixa}>Carregando resumo…</div>
  if (erro) return <div style={{ ...caixa, color: RED }}>{erro}</div>
  if (!resumo) return null
  if (resumo.totalEvidencias === 0)
    return <div style={caixa}>Sem evidências ainda. Vincule sessões no encerramento.</div>

  return (
    <div style={{ ...caixa, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 12 }}>
        <Metrica rotulo="Evidências" valor={String(resumo.totalEvidencias)} />
        <Metrica rotulo="Sessões relacionadas" valor={String(resumo.totalSessoes)} />
        <Metrica rotulo="Primeira sessão" valor={fmtData(resumo.primeiraSessao)} />
        <Metrica rotulo="Última sessão" valor={fmtData(resumo.ultimaSessao)} />
      </div>

      <div>
        <div style={rotuloEstilo}>Programas relacionados</div>
        {resumo.programas.length === 0 ? (
          <div style={{ fontSize: 13, color: '#6b7a8d', marginTop: 2 }}>—</div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
            {resumo.programas.map(nome => (
              <span key={nome} style={chip}>{nome}</span>
            ))}
          </div>
        )}
      </div>

      <div style={{ fontSize: 11, color: '#8595a6' }}>
        Última atualização: {fmtData(resumo.ultimaAtualizacao)}
      </div>
    </div>
  )
}

function Metrica({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: '#8595a6', fontWeight: 600 }}>{rotulo}</div>
      <div style={{ fontSize: 15, color: INK, fontWeight: 700, marginTop: 1 }}>{valor}</div>
    </div>
  )
}

const caixa: React.CSSProperties = {
  marginTop: 10, padding: '12px 14px', borderRadius: 10, fontSize: 13, color: '#5a6b7d',
  background: 'rgba(26,46,68,.03)', border: '1px solid rgba(26,46,68,.08)',
}
const rotuloEstilo: React.CSSProperties = {
  fontSize: 11, color: '#8595a6', fontWeight: 600,
}
const chip: React.CSSProperties = {
  fontSize: 12, fontWeight: 600, color: TEAL, background: 'rgba(29,158,117,.10)',
  padding: '3px 9px', borderRadius: 999,
}
