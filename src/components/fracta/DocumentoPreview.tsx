"use client"
// FCRM-007 — Renderer genérico de DocumentoClinico (tela, sem PDF).
// Escrito UMA vez; serve qualquer tipo de documento do Document Engine.
// Consome o modelo (seções tipadas) e desenha em "papel" claro.

import { useEffect, useState } from "react"
import { montarDocumento, type DocumentoClinico, type DocumentoTipo, type Secao } from "@/lib/document-engine"

const INK = '#1a2e44', TEAL = '#1D9E75', RED = '#E05A4B'

function fmtData(iso: string): string {
  const d = new Date(iso)
  return isNaN(d.getTime()) ? iso : d.toLocaleDateString("pt-BR")
}

export function DocumentoPreview({
  tipo, id, onFechar,
}: { tipo: DocumentoTipo; id: string; onFechar: () => void }) {
  const [doc, setDoc] = useState<DocumentoClinico | null>(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    let cancel = false
    setLoading(true); setErro(null)
    montarDocumento(tipo, { id }).then(res => {
      if (cancel) return
      if (res.error !== null) setErro(res.error)
      else setDoc(res.data)
      setLoading(false)
    })
    return () => { cancel = true }
  }, [tipo, id])

  return (
    <div style={overlay} onClick={onFechar}>
      <div onClick={e => e.stopPropagation()} style={papel}>
        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "#6b7a8d", fontSize: 14 }}>Montando documento…</div>
        ) : erro ? (
          <div style={{ padding: 20, color: RED, fontSize: 14 }}>{erro}</div>
        ) : !doc ? null : (
          <>
            {/* Cabeçalho do documento */}
            <div style={{ borderBottom: `2px solid ${TEAL}`, paddingBottom: 12, marginBottom: 20 }}>
              <div style={{ fontSize: 19, fontWeight: 800, color: INK }}>{doc.titulo}</div>
              <div style={{ fontSize: 12, color: '#6b7a8d', marginTop: 4 }}>
                {[doc.meta.pacienteNome, `Gerado em ${fmtData(doc.meta.geradoEm)}`].filter(Boolean).join(" · ")}
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
              {doc.secoes.map(secao => <SecaoView key={secao.id} secao={secao} />)}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function SecaoView({ secao }: { secao: Secao }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, color: TEAL, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 10 }}>
        {secao.titulo}
      </div>
      {secao.tipo === "campos" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 12 }}>
          {secao.campos.map((c, i) => (
            <div key={i}>
              <div style={{ fontSize: 11, color: '#8595a6', fontWeight: 600 }}>{c.rotulo}</div>
              <div style={{ fontSize: 14, color: INK, fontWeight: 600, marginTop: 1 }}>{c.valor}</div>
            </div>
          ))}
        </div>
      )}
      {secao.tipo === "texto" && (
        <div style={{ fontSize: 13.5, color: INK, lineHeight: 1.55, whiteSpace: "pre-wrap" }}>{secao.texto}</div>
      )}
      {secao.tipo === "lista" && (
        secao.itens.length === 0 ? (
          <Vazio texto={secao.vazio ?? "—"} />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {secao.itens.map((it, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 11px", borderRadius: 8, background: 'rgba(26,46,68,.03)', border: '1px solid rgba(26,46,68,.08)' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: INK }}>{it.titulo}</div>
                  {it.descricao && <div style={{ fontSize: 11.5, color: '#5a6b7d' }}>{it.descricao}</div>}
                </div>
                {(it.badges ?? []).map((b, bi) => (
                  <span key={bi} style={{ fontSize: 11, fontWeight: 700, color: TEAL, background: 'rgba(29,158,117,.10)', borderRadius: 999, padding: '2px 9px' }}>{b}</span>
                ))}
              </div>
            ))}
          </div>
        )
      )}
      {secao.tipo === "timeline" && (
        secao.eventos.length === 0 ? (
          <Vazio texto={secao.vazio ?? "—"} />
        ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {secao.eventos.map((ev, i) => {
              const ultimo = i === secao.eventos.length - 1
              return (
                <div key={i} style={{ display: "flex", gap: 12 }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                    <span style={{ width: 9, height: 9, borderRadius: "50%", background: TEAL, marginTop: 4 }} />
                    {!ultimo && <span style={{ flex: 1, width: 2, background: 'rgba(26,46,68,.10)', marginTop: 2 }} />}
                  </div>
                  <div style={{ paddingBottom: ultimo ? 0 : 14, minWidth: 0 }}>
                    <div style={{ fontSize: 11, color: '#8595a6', fontWeight: 600 }}>{fmtData(ev.data)}</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: INK }}>{ev.titulo}</div>
                    {ev.detalhe && <div style={{ fontSize: 12, color: '#5a6b7d' }}>{ev.detalhe}</div>}
                  </div>
                </div>
              )
            })}
          </div>
        )
      )}
    </div>
  )
}

function Vazio({ texto }: { texto: string }) {
  return <div style={{ fontSize: 12.5, color: '#8595a6' }}>{texto}</div>
}

const overlay: React.CSSProperties = {
  position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", backdropFilter: "blur(4px)",
  display: "flex", alignItems: "flex-start", justifyContent: "center", zIndex: 70, padding: "40px 20px", overflowY: "auto",
}
const papel: React.CSSProperties = {
  background: "#fff", borderRadius: 12, padding: "32px 36px", width: "100%", maxWidth: 640,
  boxShadow: "0 20px 60px rgba(0,0,0,.35)",
}
