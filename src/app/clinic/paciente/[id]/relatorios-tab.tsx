// src/app/clinic/paciente/[id]/relatorios-tab.tsx
// Aba "Relatórios" — geração retrospectiva de relatório de fase (Camada 1).
// Desacopla a geração do fluxo de avançar fase: o clínico escolhe um recorte
// temporal (por fase arquivada/atual ou por período livre), o modo e os campos
// clínicos, e gera o PDF consumindo a engine existente em src/lib.

"use client"

import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"
import type { ModoRelatorio } from "@/lib/relatorio-fase-v2"

// Rótulos de fase (FASE_LABEL da engine não é exportado).
const FASE_LABEL: Record<string, string> = {
  avaliacao: "Avaliação",
  intervencao: "Intervenção",
  generalizacao: "Generalização",
  reavaliacao: "Reavaliação",
  dominado: "Dominado",
  alta: "Alta",
  manutencao: "Manutenção",
}

const MODO_LABEL: Record<string, string> = {
  tecnico: "Técnico",
  familia: "Família",
  completo: "Completo",
}

type FaseOpcao = {
  key: string
  fase: string
  faseLabel: string
  numeroCiclo: number
  jornadaId: string
  jornadaRow: any
  dataInicio: string
  dataFim: string | null
  emAndamento: boolean
}

type PacienteEN = { name?: string; diagnosis?: string; age?: number } | null
type TerapeutaCtx = {
  nome?: string
  conselho_profissional?: string
  registro_profissional?: string
} | null

// ── estilos (padrão das outras abas) ──────────────────────────────────────────
const card: React.CSSProperties = {
  background: "rgba(13,32,53,.6)",
  border: "1px solid rgba(26,58,92,.5)",
  borderRadius: 14,
  padding: 20,
}
const labelStyle: React.CSSProperties = {
  fontSize: ".68rem",
  fontWeight: 600,
  color: "rgba(170,210,245,.88)",
  textTransform: "uppercase",
  letterSpacing: ".06em",
  marginBottom: 8,
}
const inputStyle: React.CSSProperties = {
  background: "rgba(8,20,34,.7)",
  border: "1px solid rgba(26,58,92,.6)",
  borderRadius: 10,
  color: "#e8f0f8",
  padding: "10px 12px",
  fontSize: ".82rem",
  fontFamily: "var(--font-sans)",
  width: "100%",
}

function mesAno(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("pt-BR", { month: "short", year: "numeric" })
  } catch {
    return ""
  }
}

function fmtData(iso?: string | null): string {
  if (!iso) return "—"
  try {
    return new Date(iso).toLocaleDateString("pt-BR")
  } catch {
    return "—"
  }
}

function fmtDataHora(iso?: string | null): string {
  if (!iso) return "—"
  try {
    return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })
  } catch {
    return "—"
  }
}

export function RelatoriosTab({
  criancaId,
  jornada,
  paciente,
  terapeuta,
}: {
  criancaId: string
  jornada: any
  paciente: PacienteEN
  terapeuta: TerapeutaCtx
}) {
  const [recorte, setRecorte] = useState<"fase" | "periodo">("fase")
  const [opcoesFase, setOpcoesFase] = useState<FaseOpcao[]>([])
  const [faseKey, setFaseKey] = useState("")
  const [iniLivre, setIniLivre] = useState("")
  const [fimLivre, setFimLivre] = useState("")
  const [modo, setModo] = useState<ModoRelatorio>("completo")
  const [analiseClinica, setAnalise] = useState("")
  const [recomendacoes, setRecom] = useState("")
  const [dataNascimento, setDN] = useState<string | null>(null)
  const [gerando, setGerando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  // Camada 2 — pré-visualização na tela (não persiste)
  const [previewHtml, setPreviewHtml] = useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  // Camada 3 — lista de relatórios salvos
  const [relatorios, setRelatorios] = useState<any[]>([])
  const [carregandoLista, setCarregandoLista] = useState(false)
  const [reabrindo, setReabrindo] = useState<string | null>(null)

  // Carrega: todas as jornadas (todos os ciclos) + data_nascimento.
  useEffect(() => {
    let ativo = true
    async function carregar() {
      const { data: jornadas } = await supabase
        .from("jornada_clinica")
        .select("id, fase_atual, data_inicio_fase, numero_ciclo, historico_fases")
        .eq("paciente_id", criancaId)
        .order("numero_ciclo", { ascending: false })

      const opcoes: FaseOpcao[] = []
      for (const j of jornadas ?? []) {
        // (a) fase atual — ainda não está no histórico
        if (j.fase_atual) {
          opcoes.push({
            key: `${j.id}:atual`,
            fase: j.fase_atual,
            faseLabel: FASE_LABEL[j.fase_atual] ?? j.fase_atual,
            numeroCiclo: j.numero_ciclo ?? 1,
            jornadaId: j.id,
            jornadaRow: j,
            dataInicio: j.data_inicio_fase,
            dataFim: null,
            emAndamento: true,
          })
        }
        // (b) fases arquivadas — mais recente → mais antiga
        ;[...((j.historico_fases ?? []) as any[])].reverse().forEach((h: any, i: number) => {
          opcoes.push({
            key: `${j.id}:${i}`,
            fase: h.fase,
            faseLabel: FASE_LABEL[h.fase] ?? h.fase,
            numeroCiclo: j.numero_ciclo ?? 1,
            jornadaId: j.id,
            jornadaRow: j,
            dataInicio: h.data_inicio,
            dataFim: h.data_fim ?? null,
            emAndamento: false,
          })
        })
      }

      const { data: cr } = await supabase
        .from("criancas")
        .select("data_nascimento")
        .eq("id", criancaId)
        .single()

      if (!ativo) return
      setOpcoesFase(opcoes)
      if (opcoes.length > 0) setFaseKey(opcoes[0].key)
      setDN(cr?.data_nascimento ?? null)
    }
    carregar()
    return () => {
      ativo = false
    }
  }, [criancaId])

  const mapaOpcoes = useMemo(
    () => new Map(opcoesFase.map((o) => [o.key, o])),
    [opcoesFase],
  )

  const podeGerar =
    !gerando && !previewLoading &&
    (recorte === "fase" ? !!faseKey : !!iniLivre && !!fimLivre)

  const podePreview =
    !gerando && !previewLoading &&
    (recorte === "fase" ? !!faseKey : !!iniLivre && !!fimLivre)

  // Montagem compartilhada por gerar() e previsualizar(): resolve o recorte,
  // normaliza o paciente e produz { dados, html }. NÃO persiste. Retorna null se
  // a validação do recorte falhar (e seta o erro).
  async function construirRelatorio(): Promise<
    | {
        dados: any
        html: string
        jornadaId: string | undefined
        fase: string
        numeroCiclo: number
        dataInicio: string
        dataFim: string | undefined
      }
    | null
  > {
    // 1. Resolve o recorte → campos explícitos para a engine.
    let jornadaCtx: any
    let dataInicio: string
    let dataFim: string | undefined
    let faseRotulo: string
    let numeroCiclo: number
    let jornadaId: string | undefined

    if (recorte === "fase") {
      const opt = mapaOpcoes.get(faseKey)
      if (!opt) {
        setErro("Selecione uma fase.")
        return null
      }
      jornadaCtx = opt.jornadaRow
      dataInicio = opt.dataInicio
      dataFim = opt.dataFim ?? undefined
      faseRotulo = opt.fase
      numeroCiclo = opt.numeroCiclo
      jornadaId = opt.jornadaId
    } else {
      if (!iniLivre || !fimLivre) {
        setErro("Informe início e fim do período.")
        return null
      }
      if (iniLivre > fimLivre) {
        setErro("A data de início não pode ser depois do fim.")
        return null
      }
      jornadaCtx = jornada
      dataInicio = new Date(iniLivre).toISOString()
      dataFim = new Date(fimLivre).toISOString()
      faseRotulo = "periodo_livre"
      numeroCiclo = jornada?.numero_ciclo ?? 1
      jornadaId = jornada?.id
    }

    // 2. Normaliza paciente EN→PT (data_nascimento vem do banco, nunca fabricado).
    const pacienteNorm = {
      nome: paciente?.name ?? "—",
      diagnostico: paciente?.diagnosis,
      data_nascimento: dataNascimento ?? undefined,
    }

    // 3. Monta + gera o HTML.
    const { montarDadosRelatorioFase } = await import("@/lib/montar-relatorio-fase")
    const { gerarHTMLRelatorioFase } = await import("@/lib/relatorio-fase-v2")

    const dados = await montarDadosRelatorioFase({
      criancaId,
      jornada: jornadaCtx,
      paciente: pacienteNorm,
      terapeuta: {
        nome: terapeuta?.nome ?? "—",
        conselho_profissional: terapeuta?.conselho_profissional,
        registro_profissional: terapeuta?.registro_profissional,
      },
      dataInicio,
      dataFim,
      faseRotulo,
      numeroCiclo,
      analiseClinica,
      recomendacoes,
    })
    dados.sinteseNarrativa = analiseClinica || undefined
    dados.recomendacoes = recomendacoes || undefined

    const html = gerarHTMLRelatorioFase(dados, modo)
    return { dados, html, jornadaId, fase: faseRotulo, numeroCiclo, dataInicio, dataFim }
  }

  async function gerar() {
    setGerando(true)
    setErro(null)
    try {
      const r = await construirRelatorio()
      if (!r) return

      // Carimba no snapshot qual modo foi gerado (jsonb livre; não toca a engine).
      ;(r.dados as any).modoGerado = modo

      // Abre o PDF em nova aba.
      const win = window.open("", "_blank")
      if (win) {
        win.document.write(r.html)
        win.document.close()
      }

      // Persiste (snapshot dos dados).
      const { data: userData } = await supabase.auth.getUser()
      await supabase.from("relatorios_fase").insert({
        jornada_id: r.jornadaId,
        crianca_id: criancaId,
        terapeuta_id: userData.user?.id,
        fase: r.fase,
        numero_ciclo: r.numeroCiclo,
        data_inicio_fase: r.dataInicio,
        data_fim_fase: r.dataFim ?? new Date().toISOString(),
        total_sessoes: r.dados.cabecalho.totalSessoes,
        analise_clinica: analiseClinica || null,
        recomendacoes: recomendacoes || null,
        dados_snapshot: r.dados as any,
      })

      await carregarRelatorios()
    } catch (err: any) {
      console.error("Erro ao gerar relatório:", err)
      setErro("Não foi possível gerar o relatório. Tente novamente.")
    } finally {
      setGerando(false)
    }
  }

  async function previsualizar() {
    setPreviewLoading(true)
    setErro(null)
    try {
      const r = await construirRelatorio()
      if (r) setPreviewHtml(r.html)
    } catch (err: any) {
      console.error("Erro na pré-visualização:", err)
      setErro("Não foi possível gerar a pré-visualização.")
    } finally {
      setPreviewLoading(false)
    }
  }

  async function carregarRelatorios() {
    setCarregandoLista(true)
    const { data } = await supabase
      .from("relatorios_fase")
      .select(
        "id, fase, numero_ciclo, data_inicio_fase, data_fim_fase, total_sessoes, criado_em, dados_snapshot",
      )
      .eq("crianca_id", criancaId)
      .order("criado_em", { ascending: false })
    setRelatorios(data ?? [])
    setCarregandoLista(false)
  }

  // Reabre do snapshot congelado — não reprocessa o banco.
  async function reabrir(item: any) {
    setReabrindo(item.id)
    setErro(null)
    try {
      const { gerarHTMLRelatorioFase } = await import("@/lib/relatorio-fase-v2")
      const snap = item.dados_snapshot
      setPreviewHtml(gerarHTMLRelatorioFase(snap, snap?.modoGerado ?? "completo"))
    } catch (err: any) {
      console.error("Erro ao reabrir relatório:", err)
      setErro("Não foi possível reabrir este relatório.")
    } finally {
      setReabrindo(null)
    }
  }

  useEffect(() => {
    carregarRelatorios()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [criancaId])

  const semJornadas = opcoesFase.length === 0

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 760 }}>
      <div style={card}>
        <div style={{ fontSize: ".9rem", fontWeight: 700, color: "#e8f0f8", marginBottom: 4 }}>
          Gerar relatório de fase
        </div>
        <div style={{ fontSize: ".72rem", color: "rgba(160,200,235,.84)", marginBottom: 18 }}>
          Escolha um recorte temporal e o modo do relatório. O PDF abre em nova aba e fica
          registrado no histórico do paciente.
        </div>

        {/* Toggle de recorte */}
        <div style={labelStyle}>Recorte temporal</div>
        <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
          {([
            { id: "fase", label: "Por fase" },
            { id: "periodo", label: "Por período livre" },
          ] as const).map((r) => {
            const ativo = recorte === r.id
            return (
              <button
                key={r.id}
                onClick={() => setRecorte(r.id)}
                style={{
                  padding: "8px 16px",
                  borderRadius: 20,
                  border: `1px solid ${ativo ? "#1D9E75" : "rgba(26,58,92,.6)"}`,
                  background: ativo ? "rgba(29,158,117,.14)" : "transparent",
                  color: ativo ? "#1D9E75" : "rgba(160,200,235,.84)",
                  fontWeight: ativo ? 700 : 400,
                  fontSize: ".78rem",
                  cursor: "pointer",
                  fontFamily: "var(--font-sans)",
                }}
              >
                {r.label}
              </button>
            )
          })}
        </div>

        {/* Seletor por fase */}
        {recorte === "fase" && (
          <div style={{ marginBottom: 18 }}>
            <div style={labelStyle}>Fase</div>
            {semJornadas ? (
              <div style={{ fontSize: ".78rem", color: "rgba(160,200,235,.7)" }}>
                Nenhuma jornada clínica registrada para este paciente.
              </div>
            ) : (
              <select
                value={faseKey}
                onChange={(e) => setFaseKey(e.target.value)}
                style={inputStyle}
              >
                {opcoesFase.map((o) => (
                  <option key={o.key} value={o.key}>
                    {o.faseLabel} · Ciclo {o.numeroCiclo}
                    {o.emAndamento ? " (em andamento)" : ` (${mesAno(o.dataInicio)})`}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        {/* Seletor por período livre */}
        {recorte === "periodo" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 18 }}>
            <div>
              <div style={labelStyle}>Início</div>
              <input
                type="date"
                value={iniLivre}
                onChange={(e) => setIniLivre(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <div style={labelStyle}>Fim</div>
              <input
                type="date"
                value={fimLivre}
                onChange={(e) => setFimLivre(e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>
        )}

        {/* Modo do relatório */}
        <div style={labelStyle}>Modo</div>
        <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
          {([
            { id: "tecnico", label: "Técnico" },
            { id: "familia", label: "Família" },
            { id: "completo", label: "Completo" },
          ] as const).map((m) => {
            const ativo = modo === m.id
            return (
              <button
                key={m.id}
                onClick={() => setModo(m.id)}
                style={{
                  padding: "8px 16px",
                  borderRadius: 20,
                  border: `1px solid ${ativo ? "#1D9E75" : "rgba(26,58,92,.6)"}`,
                  background: ativo ? "rgba(29,158,117,.14)" : "transparent",
                  color: ativo ? "#1D9E75" : "rgba(160,200,235,.84)",
                  fontWeight: ativo ? 700 : 400,
                  fontSize: ".78rem",
                  cursor: "pointer",
                  fontFamily: "var(--font-sans)",
                }}
              >
                {m.label}
              </button>
            )
          })}
        </div>

        {/* Campos clínicos opcionais */}
        <div style={labelStyle}>Análise clínica da fase (opcional)</div>
        <textarea
          value={analiseClinica}
          onChange={(e) => setAnalise(e.target.value)}
          rows={4}
          style={{ ...inputStyle, resize: "vertical", marginBottom: 14 }}
          placeholder="Síntese clínica do período…"
        />

        <div style={labelStyle}>Recomendações (opcional)</div>
        <textarea
          value={recomendacoes}
          onChange={(e) => setRecom(e.target.value)}
          rows={4}
          style={{ ...inputStyle, resize: "vertical", marginBottom: 18 }}
          placeholder="Encaminhamentos e próximos passos…"
        />

        {erro && (
          <div style={{ fontSize: ".76rem", color: "#E05A4B", marginBottom: 12 }}>{erro}</div>
        )}

        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={previsualizar}
            disabled={!podePreview}
            style={{
              padding: "11px 22px",
              borderRadius: 10,
              border: `1px solid ${podePreview ? "#1D9E75" : "rgba(29,158,117,.3)"}`,
              background: "transparent",
              color: podePreview ? "#1D9E75" : "rgba(29,158,117,.5)",
              fontWeight: 700,
              fontSize: ".82rem",
              cursor: podePreview ? "pointer" : "not-allowed",
              fontFamily: "var(--font-sans)",
            }}
          >
            {previewLoading ? "Montando…" : "Pré-visualizar"}
          </button>
          <button
            onClick={gerar}
            disabled={!podeGerar}
            style={{
              padding: "11px 22px",
              borderRadius: 10,
              border: "none",
              background: podeGerar ? "#1D9E75" : "rgba(29,158,117,.3)",
              color: "#fff",
              fontWeight: 700,
              fontSize: ".82rem",
              cursor: podeGerar ? "pointer" : "not-allowed",
              fontFamily: "var(--font-sans)",
            }}
          >
            {gerando ? "Gerando…" : "Gerar relatório PDF"}
          </button>
        </div>
      </div>

      {/* ── Pré-visualização (Camada 2) ── */}
      {previewHtml && (
        <div style={card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ fontSize: ".9rem", fontWeight: 700, color: "#e8f0f8" }}>Pré-visualização</div>
            <button
              onClick={() => setPreviewHtml(null)}
              style={{
                padding: "6px 14px",
                borderRadius: 8,
                border: "1px solid rgba(70,120,180,.4)",
                background: "transparent",
                color: "rgba(160,200,235,.9)",
                fontWeight: 600,
                fontSize: ".72rem",
                cursor: "pointer",
                fontFamily: "var(--font-sans)",
              }}
            >
              Fechar
            </button>
          </div>
          <iframe
            srcDoc={previewHtml}
            title="Pré-visualização do relatório"
            style={{
              width: "100%",
              height: "70vh",
              border: "1px solid rgba(70,120,180,.3)",
              borderRadius: 8,
              background: "#fff",
            }}
          />
        </div>
      )}

      {/* ── Relatórios gerados (Camada 3) ── */}
      <div style={card}>
        <div style={{ fontSize: ".9rem", fontWeight: 700, color: "#e8f0f8", marginBottom: 4 }}>
          Relatórios gerados
        </div>
        <div style={{ fontSize: ".72rem", color: "rgba(160,200,235,.84)", marginBottom: 16 }}>
          Cada item reabre a versão congelada no momento da geração.
        </div>

        {carregandoLista ? (
          <div style={{ fontSize: ".78rem", color: "rgba(160,200,235,.7)" }}>Carregando…</div>
        ) : relatorios.length === 0 ? (
          <div style={{ fontSize: ".78rem", color: "rgba(160,200,235,.7)" }}>
            Nenhum relatório gerado ainda.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {relatorios.map((r) => {
              const ehLivre = r.fase === "periodo_livre"
              const titulo = ehLivre ? "Período livre" : FASE_LABEL[r.fase] ?? r.fase
              const modoSnap = r.dados_snapshot?.modoGerado
              return (
                <div
                  key={r.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 12,
                    padding: "12px 14px",
                    borderRadius: 10,
                    background: "rgba(8,20,34,.5)",
                    border: "1px solid rgba(26,58,92,.5)",
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: ".82rem", fontWeight: 600, color: "#e8f0f8", marginBottom: 3 }}>
                      {titulo} · Ciclo {r.numero_ciclo ?? "—"}
                      {modoSnap && (
                        <span
                          style={{
                            marginLeft: 8,
                            fontSize: ".62rem",
                            fontWeight: 700,
                            color: "#1D9E75",
                            background: "rgba(29,158,117,.12)",
                            borderRadius: 20,
                            padding: "2px 8px",
                          }}
                        >
                          {MODO_LABEL[modoSnap] ?? modoSnap}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: ".7rem", color: "rgba(160,200,235,.78)" }}>
                      {fmtData(r.data_inicio_fase)} – {fmtData(r.data_fim_fase)} · {r.total_sessoes ?? 0} sessões
                    </div>
                    <div style={{ fontSize: ".66rem", color: "rgba(160,200,235,.55)", marginTop: 2 }}>
                      Gerado em {fmtDataHora(r.criado_em)}
                    </div>
                  </div>
                  <button
                    onClick={() => reabrir(r)}
                    disabled={reabrindo === r.id}
                    style={{
                      flexShrink: 0,
                      padding: "7px 14px",
                      borderRadius: 8,
                      border: "1px solid rgba(29,158,117,.4)",
                      background: "transparent",
                      color: "#1D9E75",
                      fontWeight: 600,
                      fontSize: ".72rem",
                      cursor: reabrindo === r.id ? "default" : "pointer",
                      fontFamily: "var(--font-sans)",
                    }}
                  >
                    {reabrindo === r.id ? "Abrindo…" : "Reabrir"}
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
