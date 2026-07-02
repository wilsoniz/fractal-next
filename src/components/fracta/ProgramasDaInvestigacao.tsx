"use client"
// FCRM-005 — "Intervenções em uso": Programas de Ensino vinculados a uma
// Pergunta Clínica. Vínculo explícito (declarado), não inferido de sessões.
// Lazy: só monta quando o card é expandido.

import { useEffect, useState, useCallback } from "react"
import {
  listarProgramasDaInvestigacao,
  listarProgramasDisponiveisDoPaciente,
  vincularPrograma,
  desvincularPrograma,
  type ProgramaVinculado,
  type ProgramaDisponivel,
} from "@/lib/clinical-investigation-programs"

const INK = '#1a2e44', TEAL = '#1D9E75', RED = '#E05A4B'

export function ProgramasDaInvestigacao({
  investigationId, patientId,
}: { investigationId: string; patientId: string }) {
  const [vinculados, setVinculados] = useState<ProgramaVinculado[]>([])
  const [disponiveis, setDisponiveis] = useState<ProgramaDisponivel[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [adicionando, setAdicionando] = useState(false)   // mostra o seletor
  const [ocupadoId, setOcupadoId] = useState<string | null>(null) // planoProgramaId em ação

  const carregar = useCallback(async () => {
    setLoading(true); setErro(null)
    const [vinc, disp] = await Promise.all([
      listarProgramasDaInvestigacao(investigationId),
      listarProgramasDisponiveisDoPaciente(patientId),
    ])
    if (vinc.error !== null) { setErro(vinc.error); setLoading(false); return }
    if (disp.error !== null) { setErro(disp.error); setLoading(false); return }
    setVinculados(vinc.data)
    setDisponiveis(disp.data)
    setLoading(false)
  }, [investigationId, patientId])

  useEffect(() => { carregar() }, [carregar])

  async function vincular(planoProgramaId: string) {
    setOcupadoId(planoProgramaId); setErro(null)
    const res = await vincularPrograma(investigationId, planoProgramaId)
    setOcupadoId(null)
    if (res.error) { setErro(res.error); return }
    setAdicionando(false)
    await carregar()
  }

  async function desvincular(planoProgramaId: string) {
    setOcupadoId(planoProgramaId); setErro(null)
    const res = await desvincularPrograma(investigationId, planoProgramaId)
    setOcupadoId(null)
    if (res.error) { setErro(res.error); return }
    await carregar()
  }

  // disponíveis que ainda não foram vinculados
  const jaVinculados = new Set(vinculados.map(v => v.planoProgramaId))
  const candidatos = disponiveis.filter(d => !jaVinculados.has(d.planoProgramaId))

  return (
    <div style={caixa}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={rotulo}>Intervenções em uso</div>
        {!loading && !adicionando && (
          <button onClick={() => setAdicionando(true)} style={btnVincular}>+ Vincular programa</button>
        )}
      </div>

      {loading ? (
        <div style={{ fontSize: 13, color: '#6b7a8d' }}>Carregando…</div>
      ) : (
        <>
          {vinculados.length === 0 ? (
            <div style={{ fontSize: 13, color: '#6b7a8d' }}>
              Nenhum programa vinculado a esta pergunta ainda.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {vinculados.map(p => (
                <div key={p.vinculoId} style={item}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: INK }}>{p.nome}</div>
                    {p.dominio && <div style={{ fontSize: 11, color: '#8595a6' }}>{p.dominio}</div>}
                  </div>
                  <button onClick={() => desvincular(p.planoProgramaId)} disabled={ocupadoId === p.planoProgramaId}
                    title="Desvincular" style={btnRemover}>
                    {ocupadoId === p.planoProgramaId ? '…' : '×'}
                  </button>
                </div>
              ))}
            </div>
          )}

          {adicionando && (
            <div style={{ marginTop: 8 }}>
              {candidatos.length === 0 ? (
                <div style={{ fontSize: 12, color: '#8595a6' }}>Nenhum programa ativo no plano deste paciente para vincular.</div>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {candidatos.map(c => (
                    <button key={c.planoProgramaId} onClick={() => vincular(c.planoProgramaId)}
                      disabled={ocupadoId === c.planoProgramaId} style={chipAdd}>
                      + {c.nome}
                    </button>
                  ))}
                </div>
              )}
              <button onClick={() => setAdicionando(false)} style={{ ...btnLink, color: '#8595a6', marginTop: 8 }}>
                Fechar
              </button>
            </div>
          )}

          {erro && <div style={{ fontSize: 12, color: RED, marginTop: 8 }}>{erro}</div>}
        </>
      )}
    </div>
  )
}

const caixa: React.CSSProperties = {
  marginTop: 10, padding: '12px 14px', borderRadius: 10,
  background: 'rgba(29,158,117,.04)', border: '1px solid rgba(29,158,117,.15)',
}
const rotulo: React.CSSProperties = { fontSize: 11, color: '#8595a6', fontWeight: 600 }
const item: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
  padding: '7px 10px', borderRadius: 8, background: '#fff', border: '1px solid rgba(26,46,68,.08)',
}
const btnLink: React.CSSProperties = {
  background: 'transparent', color: TEAL, border: 'none', padding: 0, fontSize: 12, fontWeight: 600, cursor: 'pointer',
}
const btnVincular: React.CSSProperties = {
  background: 'rgba(29,158,117,.10)', color: TEAL, border: '1px solid rgba(29,158,117,.30)',
  borderRadius: 8, padding: '5px 11px', fontSize: 12, fontWeight: 700, cursor: 'pointer',
}
const btnRemover: React.CSSProperties = {
  background: 'transparent', color: '#8595a6', border: '1px solid rgba(26,46,68,.14)', borderRadius: 6,
  width: 24, height: 24, flexShrink: 0, fontSize: 15, lineHeight: 1, cursor: 'pointer',
}
const chipAdd: React.CSSProperties = {
  background: 'rgba(29,158,117,.08)', color: TEAL, border: '1px solid rgba(29,158,117,.25)',
  borderRadius: 999, padding: '5px 11px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
}
