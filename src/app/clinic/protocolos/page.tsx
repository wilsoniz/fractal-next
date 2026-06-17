"use client"
import { useEffect, useState } from "react"
import { createClient } from "@supabase/supabase-js"
import { useClinicContext, useAcesso } from "../layout"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Protocolo = {
  id: string
  nome: string
  definicao_topografica: string | null
  hipotese_funcional: "atencao" | "fuga" | "acesso" | "automatico" | "misto" | null
  antecedentes: string | null
  estrategia_prevencao: string | null
  estrategia_manejo: string | null
  comportamento_substituto: string | null
  criterio_melhora: string | null
  tipo_registro: "frequencia" | "duracao" | "intervalo" | "intensidade" | null
  unidade_registro: string | null
  restricao_aversivo: string | null
  base_etica: string | null
  plano_da_plataforma: boolean
  ativo: boolean
  criado_por: string | null
}

const FUNCAO_CONFIG: Record<string, { label: string; cor: string; bg: string }> = {
  atencao: { label: "Atenção", cor: "#378ADD", bg: "rgba(55,138,221,.12)" },
  fuga: { label: "Fuga", cor: "#EF9F27", bg: "rgba(239,159,39,.12)" },
  acesso: { label: "Acesso", cor: "#8B7FE8", bg: "rgba(139,127,232,.12)" },
  automatico: { label: "Automático", cor: "#1D9E75", bg: "rgba(29,158,117,.12)" },
  misto: { label: "Misto", cor: "#E05A4B", bg: "rgba(224,90,75,.12)" },
}

const REGISTRO_CONFIG: Record<string, { label: string; cor: string }> = {
  frequencia: { label: "Frequência", cor: "#378ADD" },
  duracao: { label: "Duração", cor: "#8B7FE8" },
  intervalo: { label: "Intervalo", cor: "#EF9F27" },
  intensidade: { label: "Intensidade", cor: "#E05A4B" },
}

const ESTADO_INICIAL: Omit<Protocolo, "id" | "plano_da_plataforma" | "ativo" | "criado_por"> = {
  nome: "",
  definicao_topografica: "",
  hipotese_funcional: null,
  antecedentes: "",
  estrategia_prevencao: "",
  estrategia_manejo: "",
  comportamento_substituto: "",
  criterio_melhora: "",
  tipo_registro: "frequencia",
  unidade_registro: "",
  restricao_aversivo: "Nenhuma forma de controle aversivo é utilizada neste protocolo. A intervenção é baseada exclusivamente em reforço diferencial, extinção planejada e enriquecimento do ambiente.",
  base_etica: "Protocolo baseado em ABA contemporânea. A compaixão é parte integrante da intervenção — a 8ª dimensão da ABA.",
}

export default function ProtocolosPage() {
  const { terapeuta } = useClinicContext()
  const acesso = useAcesso()

  const [protocolos, setProtocolos] = useState<Protocolo[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState("")
  const [filtroFuncao, setFiltroFuncao] = useState("todos")
  const [filtroAba, setFiltroAba] = useState<"plataforma" | "meus">("plataforma")
  const [expandido, setExpandido] = useState<string | null>(null)
  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState<Protocolo | null>(null)
  const [form, setForm] = useState(ESTADO_INICIAL)
  const [salvando, setSalvando] = useState(false)
  const [excluindo, setExcluindo] = useState<string | null>(null)

  useEffect(() => { carregar() }, [terapeuta?.id, filtroAba])

  async function carregar() {
    setLoading(true)
    let query = supabase
      .from("protocolos_conduta")
      .select("*")
      .eq("ativo", true)
      .order("nome")

    if (filtroAba === "plataforma") {
      query = query.eq("plano_da_plataforma", true)
    } else {
      query = query.eq("criado_por", terapeuta?.id ?? "").eq("plano_da_plataforma", false)
    }

    const { data } = await query
    setProtocolos(data ?? [])
    setLoading(false)
  }

  function abrirNovo() {
    setEditando(null)
    setForm(ESTADO_INICIAL)
    setModalAberto(true)
  }

  function abrirEditar(p: Protocolo) {
    setEditando(p)
    setForm({
      nome: p.nome,
      definicao_topografica: p.definicao_topografica ?? "",
      hipotese_funcional: p.hipotese_funcional,
      antecedentes: p.antecedentes ?? "",
      estrategia_prevencao: p.estrategia_prevencao ?? "",
      estrategia_manejo: p.estrategia_manejo ?? "",
      comportamento_substituto: p.comportamento_substituto ?? "",
      criterio_melhora: p.criterio_melhora ?? "",
      tipo_registro: p.tipo_registro ?? "frequencia",
      unidade_registro: p.unidade_registro ?? "",
      restricao_aversivo: p.restricao_aversivo ?? ESTADO_INICIAL.restricao_aversivo,
      base_etica: p.base_etica ?? ESTADO_INICIAL.base_etica,
    })
    setModalAberto(true)
  }

  async function salvar() {
    if (!terapeuta?.id || !form.nome.trim()) return
    setSalvando(true)
    if (editando) {
      const { error } = await supabase.from("protocolos_conduta").update({
        ...form, ativo: true,
      }).eq("id", editando.id)
      if (error) {
        console.error("Erro ao atualizar protocolo:", error)
        alert("Não foi possível atualizar o protocolo: " + error.message)
        setSalvando(false)
        return
      }
      setProtocolos(prev => prev.map(p => p.id === editando.id ? { ...p, ...form } : p))
    } else {
      const { data, error } = await supabase.from("protocolos_conduta").insert({
        ...form,
        criado_por: terapeuta.id,
        plano_da_plataforma: false,
        ativo: true,
      }).select().single()
      if (error) {
        console.error("Erro ao salvar protocolo:", error)
        alert("Não foi possível salvar o protocolo: " + error.message)
        setSalvando(false)
        return
      }
      if (data) setProtocolos(prev => [...prev, data])
    }
    setSalvando(false)
    setModalAberto(false)
  }

  async function excluir(id: string) {
    setExcluindo(id)
    await supabase.from("protocolos_conduta").update({ ativo: false }).eq("id", id)
    setProtocolos(prev => prev.filter(p => p.id !== id))
    setExcluindo(null)
  }

  const filtrados = protocolos.filter(p => {
    const matchBusca = p.nome.toLowerCase().includes(busca.toLowerCase())
    const matchFuncao = filtroFuncao === "todos" || p.hipotese_funcional === filtroFuncao
    return matchBusca && matchFuncao
  })

  const card: React.CSSProperties = {
    background: "rgba(13,32,53,.75)",
    border: "1px solid rgba(70,120,180,.5)",
    borderRadius: 14,
    backdropFilter: "blur(8px)",
  }

  const inp: React.CSSProperties = {
    width: "100%", padding: "9px 12px", borderRadius: 8,
    border: "1px solid rgba(26,58,92,.5)",
    background: "rgba(13,32,53,.6)", color: "#e8f0f8",
    fontSize: ".82rem", fontFamily: "var(--font-sans)",
    outline: "none", boxSizing: "border-box" as const,
  }

  const lbl: React.CSSProperties = {
    fontSize: ".6rem", fontWeight: 700,
    textTransform: "uppercase" as const,
    letterSpacing: ".09em", color: "rgba(170,210,245,.6)",
    display: "block", marginBottom: 5,
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: "1.3rem", fontWeight: 800, color: "#e8f0f8", margin: 0, letterSpacing: "-.01em" }}>
            Protocolos de Conduta
          </h1>
          <div style={{ fontSize: ".78rem", color: "rgba(160,200,235,.6)", marginTop: 4 }}>
            Planos de manejo comportamental baseados em análise funcional
          </div>
        </div>
        {acesso.podeEditarProgramas && (
          <button onClick={abrirNovo} style={{
            padding: "9px 18px", borderRadius: 9, border: "none",
            background: "linear-gradient(135deg,#E05A4B,#c94d40)",
            color: "#fff", fontFamily: "var(--font-sans)", fontWeight: 700,
            fontSize: ".82rem", cursor: "pointer",
            display: "flex", alignItems: "center", gap: 6,
          }}>
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M8 3v10M3 8h10" /></svg>
            Novo protocolo
          </button>
        )}
      </div>

      {/* Abas */}
      <div style={{ display: "flex", gap: 4, background: "rgba(13,32,53,.5)", borderRadius: 10, padding: 4, width: "fit-content" }}>
        {([["plataforma", "Plataforma Fracta"], ["meus", "Meus protocolos"]] as const).map(([id, label]) => (
          <button key={id} onClick={() => setFiltroAba(id)} style={{
            padding: "7px 16px", borderRadius: 7, border: "none",
            background: filtroAba === id ? "rgba(224,90,75,.15)" : "transparent",
            color: filtroAba === id ? "#E05A4B" : "rgba(160,200,235,.5)",
            fontSize: ".78rem", fontWeight: filtroAba === id ? 700 : 400,
            cursor: "pointer", fontFamily: "var(--font-sans)",
            borderBottom: filtroAba === id ? "2px solid #E05A4B" : "2px solid transparent",
          }}>{label}</button>
        ))}
      </div>

      {/* Filtros */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <input
          placeholder="Buscar protocolo..."
          value={busca}
          onChange={e => setBusca(e.target.value)}
          style={{ ...inp, maxWidth: 280 }}
        />
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {[["todos", "Todos"], ...Object.entries(FUNCAO_CONFIG).map(([k, v]) => [k, v.label])].map(([k, label]) => (
            <button key={k} onClick={() => setFiltroFuncao(k)} style={{
              padding: "6px 14px", borderRadius: 20, border: `1px solid ${filtroFuncao === k ? "rgba(224,90,75,.4)" : "rgba(26,58,92,.4)"}`,
              background: filtroFuncao === k ? "rgba(224,90,75,.1)" : "transparent",
              color: filtroFuncao === k ? "#E05A4B" : "rgba(160,200,235,.4)",
              fontSize: ".72rem", fontWeight: filtroFuncao === k ? 700 : 400,
              cursor: "pointer", fontFamily: "var(--font-sans)",
            }}>{label}</button>
          ))}
        </div>
      </div>

      {/* Lista */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 40, color: "rgba(160,200,235,.3)", fontSize: ".85rem" }}>
          Carregando protocolos...
        </div>
      ) : filtrados.length === 0 ? (
        <div style={{ ...card, padding: 40, textAlign: "center", color: "rgba(160,200,235,.3)", fontSize: ".85rem" }}>
          {filtroAba === "meus" ? "Nenhum protocolo criado ainda — clique em \"Novo protocolo\" para começar" : "Nenhum protocolo encontrado"}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtrados.map(p => {
            const funcao = FUNCAO_CONFIG[p.hipotese_funcional ?? ""]
            const registro = REGISTRO_CONFIG[p.tipo_registro ?? ""]
            const aberto = expandido === p.id
            const ehMeu = p.criado_por === terapeuta?.id && !p.plano_da_plataforma

            return (
              <div key={p.id} style={{ ...card, overflow: "hidden", border: aberto ? "1px solid rgba(224,90,75,.3)" : "1px solid rgba(70,120,180,.3)" }}>
                {/* Cabeçalho clicável */}
                <button
                  onClick={() => setExpandido(aberto ? null : p.id)}
                  style={{ width: "100%", display: "flex", alignItems: "center", gap: 14, padding: "16px 20px", background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-sans)", textAlign: "left" }}
                >
                  {/* Indicador de função */}
                  {funcao && (
                    <div style={{ width: 4, height: 36, borderRadius: 2, background: funcao.cor, flexShrink: 0 }} />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: ".88rem", fontWeight: 700, color: "#e8f0f8", marginBottom: 5 }}>{p.nome}</div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {funcao && (
                        <span style={{ fontSize: ".62rem", color: funcao.cor, background: funcao.bg, borderRadius: 20, padding: "2px 8px", fontWeight: 600 }}>
                          Função: {funcao.label}
                        </span>
                      )}
                      {registro && (
                        <span style={{ fontSize: ".62rem", color: registro.cor, background: "rgba(26,58,92,.3)", borderRadius: 20, padding: "2px 8px" }}>
                          {registro.label}
                        </span>
                      )}
                      {p.plano_da_plataforma && (
                        <span style={{ fontSize: ".62rem", color: "#8B7FE8", background: "rgba(139,127,232,.1)", borderRadius: 20, padding: "2px 8px", fontWeight: 600 }}>
                          Plataforma Fracta
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
                    {ehMeu && acesso.podeEditarProgramas && (
                      <>
                        <button onClick={e => { e.stopPropagation(); abrirEditar(p) }}
                          style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid rgba(55,138,221,.3)", background: "transparent", color: "#378ADD", fontSize: ".68rem", cursor: "pointer", fontFamily: "var(--font-sans)" }}>
                          Editar
                        </button>
                        <button onClick={e => { e.stopPropagation(); excluir(p.id) }}
                          disabled={excluindo === p.id}
                          style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid rgba(224,90,75,.3)", background: "transparent", color: "#E05A4B", fontSize: ".68rem", cursor: "pointer", fontFamily: "var(--font-sans)" }}>
                          {excluindo === p.id ? "..." : "Excluir"}
                        </button>
                      </>
                    )}
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="rgba(160,200,235,.4)" strokeWidth="1.5"
                      style={{ transform: aberto ? "rotate(180deg)" : "rotate(0)", transition: "transform .2s" }}>
                      <path d="M3 6l5 5 5-5" />
                    </svg>
                  </div>
                </button>

                {/* Conteúdo expandido */}
                {aberto && (
                  <div style={{ padding: "0 20px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
                    <div style={{ height: 1, background: "rgba(70,120,180,.2)", marginBottom: 4 }} />

                    {/* Grade de campos clínicos */}
                    {[
                      ["Definição topográfica", p.definicao_topografica],
                      ["Antecedentes identificados", p.antecedentes],
                      ["Estratégia de prevenção", p.estrategia_prevencao],
                      ["Estratégia de manejo", p.estrategia_manejo],
                      ["Comportamento substituto", p.comportamento_substituto],
                      ["Critério de melhora", p.criterio_melhora],
                    ].filter(([_, v]) => v).map(([label, valor]) => (
                      <div key={label as string}>
                        <div style={{ fontSize: ".6rem", fontWeight: 700, color: "rgba(170,210,245,.5)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 5 }}>{label}</div>
                        <div style={{ fontSize: ".8rem", color: "rgba(160,200,235,.9)", lineHeight: 1.65 }}>{valor}</div>
                      </div>
                    ))}

                    {p.unidade_registro && (
                      <div>
                        <div style={{ fontSize: ".6rem", fontWeight: 700, color: "rgba(170,210,245,.5)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 5 }}>Unidade de registro</div>
                        <div style={{ fontSize: ".8rem", color: "rgba(160,200,235,.9)" }}>{p.unidade_registro}</div>
                      </div>
                    )}

                    {/* Base ética e restrição ao aversivo */}
                    {p.restricao_aversivo && (
                      <div style={{ background: "rgba(224,90,75,.05)", border: "1px solid rgba(224,90,75,.2)", borderRadius: 10, padding: "12px 14px" }}>
                        <div style={{ fontSize: ".6rem", fontWeight: 700, color: "#E05A4B", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 5 }}>
                          Restrição ao controle aversivo
                        </div>
                        <div style={{ fontSize: ".75rem", color: "rgba(224,90,75,.8)", lineHeight: 1.65 }}>{p.restricao_aversivo}</div>
                      </div>
                    )}

                    {p.base_etica && (
                      <div style={{ background: "rgba(139,127,232,.05)", border: "1px solid rgba(139,127,232,.2)", borderRadius: 10, padding: "12px 14px" }}>
                        <div style={{ fontSize: ".6rem", fontWeight: 700, color: "#8B7FE8", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 5 }}>
                          Base ética
                        </div>
                        <div style={{ fontSize: ".75rem", color: "rgba(139,127,232,.8)", lineHeight: 1.65 }}>{p.base_etica}</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Modal criar/editar */}
      {modalAberto && (
        <div onClick={() => setModalAberto(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.75)", backdropFilter: "blur(4px)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "rgba(7,17,31,.97)", border: "1px solid rgba(70,120,180,.4)", borderRadius: 16, padding: 28, width: "100%", maxWidth: 600, maxHeight: "90vh", overflowY: "auto", display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ fontSize: "1rem", fontWeight: 700, color: "#e8f0f8" }}>
              {editando ? "Editar protocolo" : "Novo protocolo de conduta"}
            </div>

            {/* Nome */}
            <div>
              <label style={lbl}>Nome do protocolo *</label>
              <input value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))}
                placeholder="Ex: Protocolo de Transição entre Atividades"
                style={inp} />
            </div>

            {/* Hipótese funcional */}
            <div>
              <label style={lbl}>Hipótese funcional</label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 6 }}>
                {Object.entries(FUNCAO_CONFIG).map(([k, v]) => (
                  <button key={k} onClick={() => setForm(p => ({ ...p, hipotese_funcional: k as any }))}
                    style={{ padding: "7px 4px", borderRadius: 8, border: `1px solid ${form.hipotese_funcional === k ? v.cor + "55" : "rgba(26,58,92,.4)"}`, background: form.hipotese_funcional === k ? v.bg : "transparent", color: form.hipotese_funcional === k ? v.cor : "rgba(160,200,235,.4)", fontSize: ".68rem", fontWeight: form.hipotese_funcional === k ? 700 : 400, cursor: "pointer", fontFamily: "var(--font-sans)" }}>
                    {v.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tipo de registro */}
            <div>
              <label style={lbl}>Tipo de registro</label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
                {Object.entries(REGISTRO_CONFIG).map(([k, v]) => (
                  <button key={k} onClick={() => setForm(p => ({ ...p, tipo_registro: k as any }))}
                    style={{ padding: "7px 4px", borderRadius: 8, border: `1px solid ${form.tipo_registro === k ? v.cor + "55" : "rgba(26,58,92,.4)"}`, background: form.tipo_registro === k ? "rgba(26,58,92,.3)" : "transparent", color: form.tipo_registro === k ? v.cor : "rgba(160,200,235,.4)", fontSize: ".68rem", fontWeight: form.tipo_registro === k ? 700 : 400, cursor: "pointer", fontFamily: "var(--font-sans)" }}>
                    {v.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Campos clínicos */}
            {[
              ["Definição topográfica", "definicao_topografica", "Descreva o comportamento de forma objetiva e observável..."],
              ["Antecedentes identificados", "antecedentes", "O que geralmente precede o comportamento..."],
              ["Estratégia de prevenção", "estrategia_prevencao", "Como modificar os antecedentes para reduzir a ocorrência..."],
              ["Estratégia de manejo", "estrategia_manejo", "O que fazer quando o comportamento ocorrer..."],
              ["Comportamento substituto", "comportamento_substituto", "O que ensinar no lugar do comportamento interferente..."],
              ["Critério de melhora", "criterio_melhora", "Como saber que o protocolo está funcionando..."],
              ["Unidade de registro", "unidade_registro", "Ex: ocorrências por sessão, segundos por episódio..."],
            ].map(([label, field, placeholder]) => (
              <div key={field}>
                <label style={lbl}>{label}</label>
                <textarea
                  value={(form as any)[field] ?? ""}
                  onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))}
                  placeholder={placeholder}
                  rows={field === "unidade_registro" ? 1 : 2}
                  style={{ ...inp, resize: "none" as const }}
                />
              </div>
            ))}

            {/* Botões */}
            <div style={{ display: "flex", gap: 10, paddingTop: 4 }}>
              <button onClick={() => setModalAberto(false)}
                style={{ flex: 1, padding: 10, borderRadius: 9, border: "1px solid rgba(70,120,180,.4)", background: "transparent", color: "rgba(160,200,235,.5)", fontSize: ".8rem", cursor: "pointer", fontFamily: "var(--font-sans)" }}>
                Cancelar
              </button>
              <button onClick={salvar} disabled={salvando || !form.nome.trim()}
                style={{ flex: 2, padding: 10, borderRadius: 9, border: "none", background: "linear-gradient(135deg,#E05A4B,#c94d40)", color: "#fff", fontSize: ".82rem", fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-sans)", opacity: salvando ? 0.7 : 1 }}>
                {salvando ? "Salvando..." : editando ? "Salvar alterações" : "Criar protocolo"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
