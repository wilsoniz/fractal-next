"use client"
// Treatment-001 — Modal "Adicionar programa ao plano ativo do paciente".
// Tema escuro (página do paciente). Adiciona do catálogo `programas` ao
// plano ativo, criando registro real em plano_programas (+ RPC baseline).

import { useEffect, useState, useCallback } from "react"
import {
  obterPlanoAtivoDoPaciente,
  listarProgramasCatalogoDisponiveis,
  adicionarProgramaAoPlano,
  type ProgramaCatalogo,
} from "@/lib/plano-programas"

export function AdicionarProgramaModal({
  patientId, onFechar, onAdicionado,
}: {
  patientId: string
  onFechar: () => void
  onAdicionado: () => void   // refresca a lista "Programas do plano" na aba
}) {
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [semPlano, setSemPlano] = useState(false)
  const [planoId, setPlanoId] = useState<string | null>(null)
  const [disponiveis, setDisponiveis] = useState<ProgramaCatalogo[]>([])
  const [busca, setBusca] = useState("")
  const [addingId, setAddingId] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    setLoading(true); setErro(null); setSemPlano(false)
    const plano = await obterPlanoAtivoDoPaciente(patientId)
    if (plano.error !== null) { setErro(plano.error); setLoading(false); return }
    if (plano.data === null) { setSemPlano(true); setLoading(false); return }

    setPlanoId(plano.data.id)
    const disp = await listarProgramasCatalogoDisponiveis(plano.data.id)
    if (disp.error !== null) { setErro(disp.error); setLoading(false); return }
    setDisponiveis(disp.data)
    setLoading(false)
  }, [patientId])

  useEffect(() => { carregar() }, [carregar])

  async function adicionar(programaId: string) {
    if (!planoId) return
    setAddingId(programaId); setErro(null)
    const res = await adicionarProgramaAoPlano({ planoId, programaId, patientId })
    setAddingId(null)
    if (res.error !== null) { setErro(res.error); return }
    // remove dos disponíveis e refresca a aba
    setDisponiveis(prev => prev.filter(p => p.programaId !== programaId))
    onAdicionado()
  }

  const filtrados = busca.trim()
    ? disponiveis.filter(p => p.nome.toLowerCase().includes(busca.trim().toLowerCase()))
    : disponiveis

  return (
    <div style={overlay} onClick={onFechar}>
      <div onClick={e => e.stopPropagation()} style={caixa}>
        <div style={{ fontSize: "1rem", fontWeight: 800, color: "#e8f0f8", marginBottom: 4 }}>
          Adicionar programa ao plano
        </div>
        <div style={{ fontSize: ".72rem", color: "rgba(160,200,235,.5)", marginBottom: 16 }}>
          Programas do catálogo ativados no plano ativo do paciente.
        </div>

        {loading ? (
          <div style={{ padding: "24px 0", textAlign: "center", color: "rgba(160,200,235,.5)", fontSize: ".82rem" }}>Carregando…</div>
        ) : semPlano ? (
          <div style={aviso}>Nenhum plano ativo para este paciente.</div>
        ) : (
          <>
            <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar programa…"
              style={campoBusca} autoFocus />

            <div style={{ maxHeight: 320, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6, marginTop: 12 }}>
              {filtrados.length === 0 ? (
                <div style={{ padding: "16px 0", textAlign: "center", color: "rgba(160,200,235,.4)", fontSize: ".78rem" }}>
                  {disponiveis.length === 0 ? "Todos os programas do catálogo já estão no plano." : "Nenhum programa encontrado."}
                </div>
              ) : (
                filtrados.map(p => (
                  <div key={p.programaId} style={item}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: ".82rem", fontWeight: 600, color: "#e8f0f8" }}>{p.nome}</div>
                      {p.dominio && <div style={{ fontSize: ".66rem", color: "rgba(160,200,235,.45)" }}>{p.dominio}</div>}
                    </div>
                    <button onClick={() => adicionar(p.programaId)} disabled={addingId === p.programaId} style={btnAdd}>
                      {addingId === p.programaId ? "Adicionando…" : "+ Adicionar"}
                    </button>
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {erro && <div style={{ ...aviso, color: "#E05A4B", background: "rgba(224,90,75,.08)", borderColor: "rgba(224,90,75,.2)", marginTop: 12 }}>{erro}</div>}

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 18 }}>
          <button onClick={onFechar} style={btnFechar}>Concluir</button>
        </div>
      </div>
    </div>
  )
}

const overlay: React.CSSProperties = {
  position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", backdropFilter: "blur(6px)",
  display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60, padding: 20,
}
const caixa: React.CSSProperties = {
  background: "rgba(13,32,53,.96)", border: "1px solid rgba(26,58,92,.6)", borderRadius: 14,
  padding: 24, width: "100%", maxWidth: 460,
}
const campoBusca: React.CSSProperties = {
  width: "100%", padding: "9px 12px", borderRadius: 9, border: "1px solid rgba(26,58,92,.4)",
  background: "rgba(7,17,31,.6)", color: "#e8f0f8", fontSize: ".82rem",
  fontFamily: "var(--font-sans)", outline: "none", boxSizing: "border-box",
}
const item: React.CSSProperties = {
  display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
  padding: "9px 11px", borderRadius: 9, background: "rgba(255,255,255,0.02)",
  border: "1px solid rgba(26,58,92,.45)",
}
const btnAdd: React.CSSProperties = {
  flexShrink: 0, padding: "6px 12px", borderRadius: 7, border: "1px solid rgba(29,158,117,.35)",
  background: "rgba(29,158,117,.10)", color: "#1D9E75", fontSize: ".7rem", fontWeight: 700,
  cursor: "pointer", fontFamily: "var(--font-sans)",
}
const btnFechar: React.CSSProperties = {
  padding: "9px 18px", borderRadius: 9, border: "1px solid rgba(26,58,92,.5)",
  background: "transparent", color: "rgba(160,200,235,.7)", fontSize: ".8rem",
  cursor: "pointer", fontFamily: "var(--font-sans)",
}
const aviso: React.CSSProperties = {
  fontSize: ".78rem", color: "rgba(160,200,235,.6)", padding: "10px 12px", borderRadius: 8,
  background: "rgba(255,255,255,0.03)", border: "1px solid rgba(26,58,92,.4)",
}
