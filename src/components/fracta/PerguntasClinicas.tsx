"use client"
// FCRM-001 — Card "Perguntas Clínicas" (interno: ClinicalInvestigation).
// CRUD: criar, editar, listar, encerrar, reabrir. Clínico-only.
// Nunca expor o nome interno ("investigação" / reasoning_stage) na UI.

import { useEffect, useState, useCallback } from "react"
import { Modal } from "@/components/fracta/Modal"
import {
  listarInvestigacoes, criarInvestigacao, editarInvestigacao,
  fecharInvestigacao, reabrirInvestigacao,
  PRIORIDADE_LABEL, STATUS_LABEL,
  type ClinicalInvestigation, type InvestigationPriority,
} from "@/lib/clinical-investigations"

// ─── Tokens visuais (Petróleo Clínico) ─────────────────────────────────────
const TEAL = '#1D9E75', AMBER = '#EF9F27', INK = '#1a2e44', RED = '#E05A4B'

function corPrioridade(p: InvestigationPriority): { fg: string; bg: string } {
  switch (p) {
    case 'Critical': return { fg: RED, bg: 'rgba(224,90,75,.10)' }
    case 'High': return { fg: '#B5760A', bg: 'rgba(239,159,39,.14)' }
    case 'Medium': return { fg: INK, bg: 'rgba(26,46,68,.07)' }
    default: return { fg: TEAL, bg: 'rgba(29,158,117,.10)' } // Low
  }
}
function corStatus(s: ClinicalInvestigation['status']): { fg: string; bg: string } {
  switch (s) {
    case 'Active': return { fg: TEAL, bg: 'rgba(29,158,117,.10)' }
    case 'Paused': return { fg: '#B5760A', bg: 'rgba(239,159,39,.14)' }
    default: return { fg: '#6b7a8d', bg: 'rgba(26,46,68,.06)' } // Closed
  }
}

const PRIORIDADES: InvestigationPriority[] = ['Low', 'Medium', 'High', 'Critical']

type ModoModal = { tipo: 'fechado' } | { tipo: 'criar' } | { tipo: 'editar'; alvo: ClinicalInvestigation }

export function PerguntasClinicas({ criancaId }: { criancaId: string }) {
  const [itens, setItens] = useState<ClinicalInvestigation[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  const [modal, setModal] = useState<ModoModal>({ tipo: 'fechado' })
  const [fTitulo, setFTitulo] = useState('')
  const [fProblema, setFProblema] = useState('')
  const [fPrioridade, setFPrioridade] = useState<InvestigationPriority>('Medium')
  const [salvando, setSalvando] = useState(false)
  const [erroModal, setErroModal] = useState<string | null>(null)

  const [confirmFechar, setConfirmFechar] = useState<ClinicalInvestigation | null>(null)
  const [acaoId, setAcaoId] = useState<string | null>(null) // id em ação (fechar/reabrir)

  const carregar = useCallback(async () => {
    setLoading(true); setErro(null)
    const res = await listarInvestigacoes(criancaId)
    if (res.error !== null) setErro(res.error)
    else setItens(res.data)
    setLoading(false)
  }, [criancaId])

  useEffect(() => { carregar() }, [carregar])

  function abrirCriar() {
    setFTitulo(''); setFProblema(''); setFPrioridade('Medium')
    setErroModal(null); setModal({ tipo: 'criar' })
  }
  function abrirEditar(inv: ClinicalInvestigation) {
    setFTitulo(inv.title); setFProblema(inv.clinical_problem ?? ''); setFPrioridade(inv.priority)
    setErroModal(null); setModal({ tipo: 'editar', alvo: inv })
  }
  function fecharModal() { if (!salvando) setModal({ tipo: 'fechado' }) }

  async function salvar() {
    if (!fTitulo.trim()) { setErroModal('Informe um título para a pergunta clínica.'); return }
    setSalvando(true); setErroModal(null)
    const payload = { title: fTitulo.trim(), clinicalProblem: fProblema, priority: fPrioridade }
    const res = modal.tipo === 'editar'
      ? await editarInvestigacao(modal.alvo.id, payload)
      : await criarInvestigacao({ patientId: criancaId, ...payload })
    setSalvando(false)
    if (res.error) { setErroModal(res.error); return }
    setModal({ tipo: 'fechado' })
    await carregar()
  }

  async function encerrar(inv: ClinicalInvestigation) {
    setAcaoId(inv.id); setErro(null)
    const { error } = await fecharInvestigacao(inv.id)
    setAcaoId(null); setConfirmFechar(null)
    if (error) { setErro(error); return }
    await carregar()
  }
  async function reabrir(inv: ClinicalInvestigation) {
    setAcaoId(inv.id); setErro(null)
    const { error } = await reabrirInvestigacao(inv.id)
    setAcaoId(null)
    if (error) { setErro(error); return }
    await carregar()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Cabeçalho */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, color: INK, fontWeight: 700 }}>Perguntas Clínicas</h2>
          <p style={{ margin: '2px 0 0', fontSize: 13, color: '#6b7a8d' }}>
            Perguntas que orientam o raciocínio clínico deste paciente.
          </p>
        </div>
        <button onClick={abrirCriar} style={btnPrimario}>+ Nova pergunta</button>
      </div>

      {erro && <div style={caixaErro}>{erro}</div>}

      {/* Lista */}
      {loading ? (
        <div style={{ padding: 24, textAlign: 'center', color: '#6b7a8d', fontSize: 14 }}>Carregando…</div>
      ) : itens.length === 0 ? (
        <div style={caixaVazia}>Nenhuma pergunta clínica registrada ainda.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {itens.map(inv => {
            const encerrada = inv.status === 'Closed'
            const cp = corPrioridade(inv.priority), cs = corStatus(inv.status)
            return (
              <div key={inv.id} style={{ ...cartao, opacity: encerrada ? 0.6 : 1 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
                      <span style={{ ...badge, color: cp.fg, background: cp.bg }}>
                        {PRIORIDADE_LABEL[inv.priority] ?? inv.priority}
                      </span>
                      <span style={{ ...badge, color: cs.fg, background: cs.bg }}>
                        {STATUS_LABEL[inv.status] ?? inv.status}
                      </span>
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: INK }}>{inv.title}</div>
                    {inv.clinical_problem && (
                      <div style={{ fontSize: 13, color: '#5a6b7d', marginTop: 4, whiteSpace: 'pre-wrap' }}>
                        {inv.clinical_problem}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    {encerrada ? (
                      <button onClick={() => reabrir(inv)} disabled={acaoId === inv.id} style={btnSec}>
                        {acaoId === inv.id ? '…' : 'Reabrir'}
                      </button>
                    ) : (
                      <>
                        <button onClick={() => abrirEditar(inv)} style={btnSec}>Editar</button>
                        <button onClick={() => setConfirmFechar(inv)} style={btnSec}>Encerrar</button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal criar / editar */}
      <Modal aberto={modal.tipo === 'criar' || modal.tipo === 'editar'} onFechar={fecharModal}>
        <div style={caixaModal}>
          <h3 style={{ margin: '0 0 14px', fontSize: 17, color: INK, fontWeight: 700 }}>
            {modal.tipo === 'editar' ? 'Editar pergunta clínica' : 'Nova pergunta clínica'}
          </h3>

          <label style={rotulo}>Título *</label>
          <input value={fTitulo} onChange={e => setFTitulo(e.target.value)}
            placeholder="Ex.: Por que a birra aumenta nas transições?" style={campo} autoFocus />

          <label style={rotulo}>Problema clínico</label>
          <textarea value={fProblema} onChange={e => setFProblema(e.target.value)} rows={4}
            placeholder="Contexto, observações iniciais, o que motivou a pergunta…"
            style={{ ...campo, resize: 'vertical', fontFamily: 'inherit' }} />

          <label style={rotulo}>Prioridade</label>
          <select value={fPrioridade} onChange={e => setFPrioridade(e.target.value as InvestigationPriority)} style={campo}>
            {PRIORIDADES.map(p => <option key={p} value={p}>{PRIORIDADE_LABEL[p] ?? p}</option>)}
          </select>

          {erroModal && <div style={{ ...caixaErro, marginTop: 12 }}>{erroModal}</div>}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}>
            <button onClick={fecharModal} disabled={salvando} style={btnSec}>Cancelar</button>
            <button onClick={salvar} disabled={salvando} style={btnPrimario}>
              {salvando ? 'Salvando…' : (modal.tipo === 'editar' ? 'Salvar' : 'Criar')}
            </button>
          </div>
        </div>
      </Modal>

      {/* Confirmação de encerrar */}
      <Modal aberto={!!confirmFechar} onFechar={() => { if (!acaoId) setConfirmFechar(null) }}>
        <div style={{ ...caixaModal, maxWidth: 380 }}>
          <h3 style={{ margin: '0 0 10px', fontSize: 16, color: INK, fontWeight: 700 }}>Encerrar pergunta clínica?</h3>
          <p style={{ margin: '0 0 18px', fontSize: 14, color: '#5a6b7d' }}>
            “{confirmFechar?.title}” será marcada como encerrada. Você pode reabri-la depois.
          </p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button onClick={() => setConfirmFechar(null)} disabled={!!acaoId} style={btnSec}>Cancelar</button>
            <button onClick={() => confirmFechar && encerrar(confirmFechar)} disabled={!!acaoId} style={btnPrimario}>
              {acaoId ? 'Encerrando…' : 'Encerrar'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

// ─── Estilos ─────────────────────────────────────────────────────────────
const cartao: React.CSSProperties = {
  background: '#fff', border: '1px solid rgba(26,46,68,.10)', borderRadius: 12, padding: '14px 16px',
}
const badge: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999, letterSpacing: .2,
}
const btnPrimario: React.CSSProperties = {
  background: TEAL, color: '#fff', border: 'none', borderRadius: 8,
  padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
}
const btnSec: React.CSSProperties = {
  background: '#fff', color: INK, border: '1px solid rgba(26,46,68,.16)', borderRadius: 8,
  padding: '7px 12px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
}
const caixaErro: React.CSSProperties = {
  fontSize: 13, padding: '9px 12px', borderRadius: 8, color: RED,
  background: 'rgba(224,90,75,.08)', border: '1px solid rgba(224,90,75,.2)',
}
const caixaVazia: React.CSSProperties = {
  padding: '28px 16px', textAlign: 'center', fontSize: 14, color: '#6b7a8d',
  background: 'rgba(26,46,68,.03)', border: '1px dashed rgba(26,46,68,.14)', borderRadius: 12,
}
const caixaModal: React.CSSProperties = {
  background: '#fff', borderRadius: 14, padding: 22, width: '92vw', maxWidth: 460,
  boxShadow: '0 20px 60px rgba(0,0,0,.3)',
}
const rotulo: React.CSSProperties = {
  display: 'block', fontSize: 12, fontWeight: 600, color: INK, margin: '12px 0 5px',
}
const campo: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', padding: '9px 11px', fontSize: 14, color: INK,
  border: '1px solid rgba(26,46,68,.18)', borderRadius: 8, outline: 'none', background: '#fff',
}
