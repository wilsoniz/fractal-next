"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { useClinicContext } from "../../layout"
import { supabase } from "@/lib/supabase"
import {
  iniciarSessaoPA,
  registrarTrialPA,
  finalizarSessaoPA,
  type TipoPA,
} from "@/lib/preference-assessment"

// ─── Tipos de avaliação (catálogo) ───────────────────────────────────────────
interface OpcaoTipo {
  id: TipoPA
  nome: string
  sigla: string
  descricao: string
  indicacao: string
  implementado: boolean
}

const TIPOS: OpcaoTipo[] = [
  {
    id: "mswo",
    nome: "Multiple Stimulus Without Replacement",
    sigla: "MSWO",
    descricao: "Múltiplos itens são dispostos em linha. O paciente toca/pega o preferido; o item escolhido é removido e os restantes são reorganizados. O ciclo repete até restar um item.",
    indicacao: "Gera hierarquia de preferência com menos ensaios que o Paired Stimulus. Recomendado como primeira escolha na maioria dos casos.",
    implementado: true,
  },
  {
    id: "paired",
    nome: "Paired Stimulus",
    sigla: "PS",
    descricao: "Dois itens são apresentados simultaneamente em todas as combinações possíveis. O paciente escolhe um. Cada par é testado múltiplas vezes.",
    indicacao: "Alta confiabilidade e discriminação entre reforçadores de valor próximo. Indicado quando a precisão do ranking é crítica. Mais demorado com muitos itens.",
    implementado: false,
  },
  {
    id: "single",
    nome: "Single Stimulus",
    sigla: "SS",
    descricao: "Um item é apresentado por vez. Registra-se se o paciente se aproxima, pega ou engaja com o estímulo dentro de um intervalo de tempo definido.",
    indicacao: "Útil quando o repertório é muito limitado ou o paciente tem dificuldade em tolerar múltiplos estímulos. Menos discriminativo que MSWO e PS.",
    implementado: false,
  },
  {
    id: "free_operant",
    nome: "Free Operant",
    sigla: "FO",
    descricao: "O paciente tem acesso livre a múltiplos itens por um período definido (ex: 5 min). Mede-se o tempo total de engajamento com cada estímulo.",
    indicacao: "Naturalístico e de baixa intrusividade. Ideal para mapeamento inicial de interesses em ambiente não-estruturado.",
    implementado: false,
  },
  {
    id: "response_restriction",
    nome: "Response Restriction",
    sigla: "RR",
    descricao: "Variação do Free Operant em que o acesso a alguns itens é restrito para observar a resposta de aproximação ou esquiva.",
    indicacao: "Útil para identificar a função motivacional de restrição de acesso e distinguir preferência real de reforço condicionado por novidade.",
    implementado: false,
  },
]

// ─── Utilitário ───────────────────────────────────────────────────────────────
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// ─── Componente principal ─────────────────────────────────────────────────────
type Fase = "selecionar_tipo" | "placeholder" | "configurar" | "avaliando" | "concluida"

export default function PreferenceAssessmentPage() {
  const { terapeuta } = useClinicContext()

  // ── estado compartilhado
  const [fase, setFase] = useState<Fase>("selecionar_tipo")
  const [tipoSelecionado, setTipoSelecionado] = useState<TipoPA | null>(null)

  // ── fase: configurar
  const [pacientes, setPacientes] = useState<{ id: string; nome: string }[]>([])
  const [pacienteId, setPacienteId] = useState("")
  const [itens, setItens] = useState<string[]>([])
  const [itemInput, setItemInput] = useState("")
  const [observacoes, setObservacoes] = useState("")
  const [iniciando, setIniciando] = useState(false)
  const [erroConfig, setErroConfig] = useState<string | null>(null)

  // ── fase: avaliando
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [itensOrdenados, setItensOrdenados] = useState<string[]>([])
  const [historico, setHistorico] = useState<string[]>([])
  const [rodadaAtual, setRodadaAtual] = useState(1)
  const [totalItens, setTotalItens] = useState(0)
  const [pacienteNome, setPacienteNome] = useState("")
  const [salvando, setSalvando] = useState(false)
  const [erroAvaliando, setErroAvaliando] = useState<string | null>(null)

  // ── fase: concluida
  const [ranking, setRanking] = useState<string[]>([])

  // Carrega pacientes ao entrar em configurar
  useEffect(() => {
    if (fase !== "configurar" || !terapeuta) return
    async function load() {
      const { data } = await supabase
        .from("planos_com_crianca")
        .select("crianca_id, crianca_nome")
        .eq("terapeuta_id", terapeuta!.id)
        .eq("status", "ativo")
      if (!data) return
      const map = new Map<string, string>()
      for (const p of data) {
        if (p.crianca_id && !map.has(p.crianca_id))
          map.set(p.crianca_id, p.crianca_nome)
      }
      setPacientes(Array.from(map.entries()).map(([id, nome]) => ({ id, nome })))
    }
    load()
  }, [fase, terapeuta])

  // ── handlers: configurar
  function adicionarItem() {
    const item = itemInput.trim()
    if (!item || itens.includes(item) || itens.length >= 20) return
    setItens(prev => [...prev, item])
    setItemInput("")
  }

  function handleItemKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") { e.preventDefault(); adicionarItem() }
  }

  async function iniciarAvaliacao() {
    if (!pacienteId || itens.length < 3 || tipoSelecionado !== "mswo") return
    setIniciando(true)
    setErroConfig(null)

    const res = await iniciarSessaoPA(pacienteId, "mswo", itens, observacoes || undefined)
    if (res.error) { setErroConfig(res.error); setIniciando(false); return }

    const session = res.data!
    const shuffled = shuffle(itens)
    const nome = pacientes.find(p => p.id === pacienteId)?.nome ?? ""

    setSessionId(session.id)
    setItensOrdenados(shuffled)
    setHistorico([])
    setRodadaAtual(1)
    setTotalItens(itens.length)
    setPacienteNome(nome)
    setFase("avaliando")
    setIniciando(false)
  }

  // ── handler: registrar escolha (avaliando)
  const registrarEscolha = useCallback(async (item: string) => {
    if (!sessionId || salvando) return
    setSalvando(true)
    setErroAvaliando(null)

    const ordemApresentacao = itensOrdenados.indexOf(item) + 1
    const itensApresentados = [...itensOrdenados]

    const res = await registrarTrialPA(
      sessionId, rodadaAtual, itensApresentados, item, ordemApresentacao
    )
    if (res.error) { setErroAvaliando(res.error); setSalvando(false); return }

    const novosItens = shuffle(itensOrdenados.filter(i => i !== item))
    const novoHistorico = [...historico, item]

    if (novosItens.length <= 1) {
      // Última rodada — finaliza
      const rankingFinal = novosItens.length === 1
        ? [...novoHistorico, novosItens[0]]
        : novoHistorico

      const fin = await finalizarSessaoPA(sessionId)
      if (fin.error) { setErroAvaliando(fin.error); setSalvando(false); return }

      setRanking(rankingFinal)
      setFase("concluida")
    } else {
      setItensOrdenados(novosItens)
      setHistorico(novoHistorico)
      setRodadaAtual(r => r + 1)
    }
    setSalvando(false)
  }, [sessionId, salvando, itensOrdenados, rodadaAtual, historico])

  // ── reset para nova avaliação
  function novaAvaliacao() {
    setFase("configurar")
    setPacienteId("")
    setItens([])
    setItemInput("")
    setObservacoes("")
    setSessionId(null)
    setHistorico([])
    setRanking([])
    setErroConfig(null)
    setErroAvaliando(null)
  }

  // ── renderização por fase
  if (fase === "selecionar_tipo" || fase === "placeholder") {
    const opcaoAtual = TIPOS.find(t => t.id === tipoSelecionado)
    return (
      <ViewSelecionarTipo
        tipos={TIPOS}
        tipoSelecionado={tipoSelecionado}
        onSelectTipo={setTipoSelecionado}
        mostrarPlaceholder={fase === "placeholder"}
        opcaoAtual={opcaoAtual ?? null}
        onIniciar={() => {
          if (!tipoSelecionado) return
          if (tipoSelecionado === "mswo") setFase("configurar")
          else setFase("placeholder")
        }}
        onVoltarDoPlaceholder={() => setFase("selecionar_tipo")}
      />
    )
  }

  if (fase === "configurar") {
    return (
      <ViewConfigurar
        pacientes={pacientes}
        pacienteId={pacienteId}
        onPacienteChange={setPacienteId}
        itens={itens}
        itemInput={itemInput}
        onItemInputChange={setItemInput}
        onItemKeyDown={handleItemKeyDown}
        onAdicionarItem={adicionarItem}
        onRemoverItem={item => setItens(prev => prev.filter(i => i !== item))}
        observacoes={observacoes}
        onObservacoesChange={setObservacoes}
        iniciando={iniciando}
        erro={erroConfig}
        onIniciar={iniciarAvaliacao}
        onVoltar={() => setFase("selecionar_tipo")}
      />
    )
  }

  if (fase === "avaliando") {
    return (
      <ViewAvaliando
        pacienteNome={pacienteNome}
        itensOrdenados={itensOrdenados}
        rodadaAtual={rodadaAtual}
        totalRodadas={totalItens - 1}
        historico={historico}
        salvando={salvando}
        erro={erroAvaliando}
        onEscolher={registrarEscolha}
      />
    )
  }

  // fase === "concluida"
  return (
    <ViewConcluida
      pacienteNome={pacienteNome}
      ranking={ranking}
      onNovaAvaliacao={novaAvaliacao}
    />
  )
}

// ─── View: Selecionar Tipo ────────────────────────────────────────────────────
function ViewSelecionarTipo({
  tipos, tipoSelecionado, onSelectTipo, mostrarPlaceholder, opcaoAtual,
  onIniciar, onVoltarDoPlaceholder,
}: {
  tipos: OpcaoTipo[]
  tipoSelecionado: TipoPA | null
  onSelectTipo: (t: TipoPA) => void
  mostrarPlaceholder: boolean
  opcaoAtual: OpcaoTipo | null
  onIniciar: () => void
  onVoltarDoPlaceholder: () => void
}) {
  if (mostrarPlaceholder && opcaoAtual) {
    return (
      <div style={{ maxWidth: 860, margin: "0 auto" }}>
        <Breadcrumb extra={opcaoAtual.sigla} onExtraClick={onVoltarDoPlaceholder} />
        <div style={{
          background: "rgba(13,32,53,.6)", border: "1px solid rgba(29,158,117,.3)",
          borderRadius: 16, padding: 40, textAlign: "center",
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: "50%",
            background: "rgba(29,158,117,.1)", border: "1px solid rgba(29,158,117,.3)",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 20px", fontFamily: "monospace", fontSize: 18, fontWeight: 800, color: "#1D9E75",
          }}>{opcaoAtual.sigla}</div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#e8f0f8", marginBottom: 8 }}>
            {opcaoAtual.nome}
          </h2>
          <p style={{ fontSize: 13, color: "rgba(160,200,235,.6)", lineHeight: 1.6, maxWidth: 480, margin: "0 auto 28px" }}>
            A estrutura de coleta para {opcaoAtual.sigla} estará disponível em uma próxima sprint.
          </p>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "10px 18px", borderRadius: 10,
            background: "rgba(239,159,39,.06)", border: "1px solid rgba(239,159,39,.2)",
            fontSize: 12, color: "rgba(239,159,39,.8)", marginBottom: 28,
          }}>Em desenvolvimento</div>
          <div>
            <button onClick={onVoltarDoPlaceholder} style={btnSecondary}>
              ← Voltar à seleção
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 860, margin: "0 auto" }}>
      <Breadcrumb />
      <HeaderInstrumento />

      <div style={{ marginBottom: 24 }}>
        <div style={labelSecao}>Tipo de Avaliação</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {tipos.map(tipo => {
            const sel = tipoSelecionado === tipo.id
            return (
              <button
                key={tipo.id}
                onClick={() => onSelectTipo(tipo.id)}
                style={{
                  background: sel ? "rgba(29,158,117,.08)" : "rgba(13,32,53,.5)",
                  border: sel ? "1.5px solid rgba(29,158,117,.55)" : "1px solid rgba(26,58,92,.4)",
                  borderRadius: 12, padding: "14px 16px",
                  cursor: "pointer", textAlign: "left", width: "100%",
                  fontFamily: "var(--font-sans)",
                  display: "flex", alignItems: "flex-start", gap: 14,
                  transition: "border-color .15s, background .15s",
                }}
                onMouseEnter={e => {
                  if (!sel) { e.currentTarget.style.borderColor = "rgba(29,158,117,.3)"; e.currentTarget.style.background = "rgba(13,32,53,.7)" }
                }}
                onMouseLeave={e => {
                  if (!sel) { e.currentTarget.style.borderColor = "rgba(26,58,92,.4)"; e.currentTarget.style.background = "rgba(13,32,53,.5)" }
                }}
              >
                <div style={{
                  width: 18, height: 18, borderRadius: "50%", flexShrink: 0, marginTop: 2,
                  border: sel ? "5px solid #1D9E75" : "1.5px solid rgba(80,120,160,.4)",
                  transition: "border .15s",
                }} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 5 }}>
                    <span style={{ fontFamily: "monospace", fontSize: 13, fontWeight: 800, color: sel ? "#1D9E75" : "rgba(160,200,235,.6)" }}>
                      {tipo.sigla}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: sel ? "#e8f0f8" : "rgba(160,200,235,.75)" }}>
                      {tipo.nome}
                    </span>
                    {tipo.implementado && (
                      <span style={{ fontSize: 10, color: "#1D9E75", padding: "1px 7px", background: "rgba(29,158,117,.1)", border: "1px solid rgba(29,158,117,.2)", borderRadius: 20 }}>
                        Disponível
                      </span>
                    )}
                    {!tipo.implementado && (
                      <span style={{ fontSize: 10, color: "rgba(160,200,235,.35)", padding: "1px 7px", background: "rgba(26,58,92,.2)", borderRadius: 20 }}>
                        Em breve
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: 12, color: "rgba(160,200,235,.6)", margin: "0 0 6px", lineHeight: 1.5 }}>
                    {tipo.descricao}
                  </p>
                  <p style={{ fontSize: 11, color: "rgba(239,159,39,.6)", margin: 0, lineHeight: 1.4, fontStyle: "italic" }}>
                    {tipo.indicacao}
                  </p>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button
          onClick={onIniciar}
          disabled={!tipoSelecionado}
          style={{
            padding: "12px 28px", borderRadius: 10, border: "none",
            background: tipoSelecionado ? "#1D9E75" : "rgba(26,58,92,.4)",
            color: tipoSelecionado ? "#fff" : "rgba(160,200,235,.3)",
            fontSize: 14, fontWeight: 600,
            cursor: tipoSelecionado ? "pointer" : "default",
            fontFamily: "var(--font-sans)", transition: "background .15s",
            display: "flex", alignItems: "center", gap: 8,
          }}
          onMouseEnter={e => { if (tipoSelecionado) e.currentTarget.style.background = "#18896a" }}
          onMouseLeave={e => { if (tipoSelecionado) e.currentTarget.style.background = "#1D9E75" }}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" stroke="none">
            <path d="M5 3l8 5-8 5V3z" />
          </svg>
          {tipoSelecionado === "mswo" ? "Configurar avaliação" : "Iniciar Avaliação"}
        </button>
        {!tipoSelecionado && (
          <span style={{ fontSize: 12, color: "rgba(160,200,235,.35)" }}>
            Selecione o tipo acima
          </span>
        )}
      </div>
    </div>
  )
}

// ─── View: Configurar ─────────────────────────────────────────────────────────
function ViewConfigurar({
  pacientes, pacienteId, onPacienteChange,
  itens, itemInput, onItemInputChange, onItemKeyDown, onAdicionarItem, onRemoverItem,
  observacoes, onObservacoesChange,
  iniciando, erro, onIniciar, onVoltar,
}: {
  pacientes: { id: string; nome: string }[]
  pacienteId: string
  onPacienteChange: (id: string) => void
  itens: string[]
  itemInput: string
  onItemInputChange: (v: string) => void
  onItemKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void
  onAdicionarItem: () => void
  onRemoverItem: (item: string) => void
  observacoes: string
  onObservacoesChange: (v: string) => void
  iniciando: boolean
  erro: string | null
  onIniciar: () => void
  onVoltar: () => void
}) {
  const podeIniciar = !!pacienteId && itens.length >= 3 && !iniciando

  return (
    <div style={{ maxWidth: 680, margin: "0 auto" }}>
      <Breadcrumb extra="MSWO" />

      <div style={{ marginBottom: 20 }}>
        <div style={labelSecao}>MSWO — Configuração</div>
        <p style={{ fontSize: 13, color: "rgba(160,200,235,.55)", margin: 0, lineHeight: 1.5 }}>
          Defina o paciente e os itens candidatos antes de iniciar a avaliação.
          Mínimo de 3 itens. Os itens serão reorganizados aleatoriamente a cada rodada.
        </p>
      </div>

      {/* Paciente */}
      <div style={secao}>
        <label style={rotulo}>Paciente</label>
        <select
          value={pacienteId}
          onChange={e => onPacienteChange(e.target.value)}
          style={campoSelect}
        >
          <option value="">Selecione o paciente…</option>
          {pacientes.map(p => (
            <option key={p.id} value={p.id}>{p.nome}</option>
          ))}
        </select>
        {pacientes.length === 0 && (
          <p style={{ fontSize: 11, color: "rgba(160,200,235,.35)", margin: "6px 0 0" }}>
            Nenhum paciente com plano ativo encontrado.
          </p>
        )}
      </div>

      {/* Itens candidatos */}
      <div style={secao}>
        <label style={rotulo}>
          Itens candidatos
          <span style={{ marginLeft: 8, fontSize: 11, color: "rgba(160,200,235,.35)", fontWeight: 400 }}>
            {itens.length} item(s) · mínimo 3
          </span>
        </label>

        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <input
            type="text"
            value={itemInput}
            onChange={e => onItemInputChange(e.target.value)}
            onKeyDown={onItemKeyDown}
            placeholder="Ex: Carro, Bolinha, Livro…"
            maxLength={60}
            style={{ ...campoInput, flex: 1 }}
          />
          <button
            onClick={onAdicionarItem}
            disabled={!itemInput.trim() || itens.length >= 20}
            style={{
              padding: "9px 16px", borderRadius: 9, border: "none",
              background: itemInput.trim() ? "rgba(29,158,117,.2)" : "rgba(26,58,92,.3)",
              color: itemInput.trim() ? "#1D9E75" : "rgba(160,200,235,.3)",
              fontSize: 13, fontWeight: 600, cursor: itemInput.trim() ? "pointer" : "default",
              fontFamily: "var(--font-sans)", flexShrink: 0,
              transition: "background .15s",
            }}
          >
            + Adicionar
          </button>
        </div>

        {itens.length === 0 ? (
          <div style={{ fontSize: 12, color: "rgba(160,200,235,.3)", padding: "10px 0" }}>
            Nenhum item adicionado ainda.
          </div>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
            {itens.map((item, idx) => (
              <div key={item} style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "5px 10px 5px 12px", borderRadius: 20,
                background: "rgba(29,158,117,.08)", border: "1px solid rgba(29,158,117,.2)",
              }}>
                <span style={{ fontSize: 11, color: "rgba(160,200,235,.5)", fontFamily: "monospace", marginRight: 2 }}>
                  {idx + 1}.
                </span>
                <span style={{ fontSize: 13, color: "#e8f0f8" }}>{item}</span>
                <button
                  onClick={() => onRemoverItem(item)}
                  style={{
                    background: "none", border: "none", cursor: "pointer",
                    color: "rgba(160,200,235,.35)", padding: "0 0 0 4px",
                    display: "flex", alignItems: "center", lineHeight: 1,
                    fontFamily: "var(--font-sans)", fontSize: 14,
                  }}
                  title="Remover item"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Observações */}
      <div style={secao}>
        <label style={rotulo}>Observações (opcional)</label>
        <textarea
          value={observacoes}
          onChange={e => onObservacoesChange(e.target.value)}
          rows={2}
          placeholder="Contexto da sessão, estado do paciente, ajustes previstos…"
          style={{ ...campoInput, resize: "vertical", fontFamily: "var(--font-sans)" }}
        />
      </div>

      {/* Erro */}
      {erro && (
        <div style={{
          marginBottom: 16, padding: "10px 14px", borderRadius: 9,
          background: "rgba(224,90,75,.08)", border: "1px solid rgba(224,90,75,.25)",
          fontSize: 12, color: "#E05A4B",
        }}>
          {erro}
        </div>
      )}

      {/* Ações */}
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <button
          onClick={onIniciar}
          disabled={!podeIniciar}
          style={{
            padding: "12px 28px", borderRadius: 10, border: "none",
            background: podeIniciar ? "#1D9E75" : "rgba(26,58,92,.4)",
            color: podeIniciar ? "#fff" : "rgba(160,200,235,.3)",
            fontSize: 14, fontWeight: 600,
            cursor: podeIniciar ? "pointer" : "default",
            fontFamily: "var(--font-sans)", transition: "background .15s",
            display: "flex", alignItems: "center", gap: 8,
          }}
          onMouseEnter={e => { if (podeIniciar) e.currentTarget.style.background = "#18896a" }}
          onMouseLeave={e => { if (podeIniciar) e.currentTarget.style.background = "#1D9E75" }}
        >
          {iniciando ? "Iniciando…" : "Iniciar avaliação"}
        </button>
        <button onClick={onVoltar} style={btnSecondary}>
          ← Voltar
        </button>
      </div>
      {!podeIniciar && !iniciando && (
        <p style={{ fontSize: 11, color: "rgba(160,200,235,.35)", marginTop: 8 }}>
          {!pacienteId ? "Selecione um paciente. " : ""}
          {itens.length < 3 ? `Adicione pelo menos ${3 - itens.length} item(s) mais.` : ""}
        </p>
      )}
    </div>
  )
}

// ─── View: Avaliando ──────────────────────────────────────────────────────────
function ViewAvaliando({
  pacienteNome, itensOrdenados, rodadaAtual, totalRodadas,
  historico, salvando, erro, onEscolher,
}: {
  pacienteNome: string
  itensOrdenados: string[]
  rodadaAtual: number
  totalRodadas: number
  historico: string[]
  salvando: boolean
  erro: string | null
  onEscolher: (item: string) => void
}) {
  const progresso = historico.length / totalRodadas

  return (
    <div style={{ maxWidth: 720, margin: "0 auto" }}>
      <Breadcrumb extra="MSWO — Em andamento" />

      {/* Cabeçalho da avaliação */}
      <div style={{
        background: "rgba(13,32,53,.6)", border: "1px solid rgba(29,158,117,.25)",
        borderRadius: 14, padding: "16px 20px", marginBottom: 24,
      }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 11, color: "rgba(160,200,235,.45)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 4 }}>
              Preference Assessment — MSWO
            </div>
            <div style={{ fontSize: 15, fontWeight: 600, color: "#e8f0f8" }}>
              {pacienteNome}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 11, color: "rgba(160,200,235,.45)" }}>Rodada</div>
            <div style={{ fontFamily: "monospace", fontSize: 20, fontWeight: 800, color: "#1D9E75" }}>
              {rodadaAtual} <span style={{ fontSize: 13, color: "rgba(160,200,235,.4)" }}>/ {totalRodadas}</span>
            </div>
          </div>
        </div>

        {/* Barra de progresso */}
        <div style={{ height: 4, background: "rgba(26,58,92,.5)", borderRadius: 2, overflow: "hidden" }}>
          <div style={{
            height: "100%", borderRadius: 2,
            background: "linear-gradient(90deg, #1D9E75, #23c48f)",
            width: `${progresso * 100}%`,
            transition: "width .4s ease",
          }} />
        </div>
        <div style={{ fontSize: 11, color: "rgba(160,200,235,.4)", marginTop: 6 }}>
          {historico.length} de {totalRodadas} rodadas concluídas
        </div>
      </div>

      {/* Instrução */}
      <div style={{
        textAlign: "center", marginBottom: 28,
        fontSize: 15, fontWeight: 600, color: "rgba(232,240,248,.8)",
      }}>
        Qual item o paciente escolheu?
      </div>

      {/* Itens clicáveis */}
      {erro && (
        <div style={{
          marginBottom: 16, padding: "10px 14px", borderRadius: 9,
          background: "rgba(224,90,75,.08)", border: "1px solid rgba(224,90,75,.25)",
          fontSize: 12, color: "#E05A4B",
        }}>
          {erro} — tente novamente.
        </div>
      )}

      <div style={{
        display: "grid",
        gridTemplateColumns: `repeat(auto-fill, minmax(${itensOrdenados.length <= 4 ? 160 : 130}px, 1fr))`,
        gap: 12, marginBottom: 28,
      }}>
        {itensOrdenados.map((item, idx) => (
          <button
            key={item}
            onClick={() => onEscolher(item)}
            disabled={salvando}
            style={{
              padding: "20px 14px", borderRadius: 12,
              background: salvando ? "rgba(13,32,53,.3)" : "rgba(13,32,53,.7)",
              border: salvando ? "1px solid rgba(26,58,92,.3)" : "1.5px solid rgba(55,138,221,.3)",
              color: salvando ? "rgba(160,200,235,.3)" : "#e8f0f8",
              cursor: salvando ? "default" : "pointer",
              fontFamily: "var(--font-sans)",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
              transition: "border-color .12s, background .12s, transform .1s",
            }}
            onMouseEnter={e => {
              if (!salvando) {
                e.currentTarget.style.borderColor = "rgba(29,158,117,.7)"
                e.currentTarget.style.background = "rgba(29,158,117,.1)"
                e.currentTarget.style.transform = "translateY(-2px)"
              }
            }}
            onMouseLeave={e => {
              if (!salvando) {
                e.currentTarget.style.borderColor = "rgba(55,138,221,.3)"
                e.currentTarget.style.background = "rgba(13,32,53,.7)"
                e.currentTarget.style.transform = "translateY(0)"
              }
            }}
          >
            <div style={{
              width: 32, height: 32, borderRadius: "50%",
              background: "rgba(55,138,221,.1)", border: "1px solid rgba(55,138,221,.25)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: "monospace", fontSize: 12, fontWeight: 800,
              color: "rgba(160,200,235,.6)",
            }}>
              {idx + 1}
            </div>
            <span style={{ fontSize: 14, fontWeight: 600, textAlign: "center", lineHeight: 1.3 }}>
              {item}
            </span>
          </button>
        ))}
      </div>

      {salvando && (
        <div style={{ textAlign: "center", fontSize: 13, color: "rgba(160,200,235,.5)" }}>
          Registrando…
        </div>
      )}

      {/* Histórico desta sessão */}
      {historico.length > 0 && (
        <div style={{
          background: "rgba(10,24,40,.5)", border: "1px solid rgba(26,58,92,.4)",
          borderRadius: 10, padding: "12px 14px",
        }}>
          <div style={{ fontSize: 11, color: "rgba(160,200,235,.4)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 8 }}>
            Histórico desta sessão
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {historico.map((item, idx) => (
              <span key={idx} style={{
                fontSize: 12, padding: "3px 10px", borderRadius: 20,
                background: "rgba(29,158,117,.08)", border: "1px solid rgba(29,158,117,.15)",
                color: "rgba(160,200,235,.7)",
              }}>
                <span style={{ fontFamily: "monospace", color: "#1D9E75", marginRight: 5 }}>{idx + 1}º</span>
                {item}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── View: Concluída ──────────────────────────────────────────────────────────
function ViewConcluida({
  pacienteNome, ranking, onNovaAvaliacao,
}: {
  pacienteNome: string
  ranking: string[]
  onNovaAvaliacao: () => void
}) {
  const MEDALHAS = ["🥇", "🥈", "🥉"]

  return (
    <div style={{ maxWidth: 680, margin: "0 auto" }}>
      <Breadcrumb extra="MSWO — Concluído" />

      {/* Header */}
      <div style={{
        textAlign: "center", marginBottom: 32,
        background: "rgba(13,32,53,.6)", border: "1px solid rgba(29,158,117,.3)",
        borderRadius: 16, padding: "28px 24px",
      }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>✓</div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: "#e8f0f8", marginBottom: 6 }}>
          Avaliação concluída
        </h2>
        <p style={{ fontSize: 13, color: "rgba(160,200,235,.55)", margin: 0 }}>
          Preference Assessment — MSWO · {pacienteNome}
        </p>
        <div style={{
          display: "inline-block", marginTop: 10, padding: "4px 12px", borderRadius: 20,
          background: "rgba(29,158,117,.1)", border: "1px solid rgba(29,158,117,.25)",
          fontSize: 12, color: "#1D9E75",
        }}>
          Dados salvos no banco
        </div>
      </div>

      {/* Ranking */}
      <div style={{ marginBottom: 28 }}>
        <div style={labelSecao}>Hierarquia de preferências</div>
        <div style={{
          background: "rgba(13,32,53,.6)", border: "1px solid rgba(26,58,92,.4)",
          borderRadius: 14, overflow: "hidden",
        }}>
          {ranking.map((item, idx) => {
            const isMaisPreferido = idx === 0
            const isMenosPreferido = idx === ranking.length - 1
            return (
              <div
                key={idx}
                style={{
                  display: "flex", alignItems: "center", gap: 14,
                  padding: "14px 18px",
                  borderBottom: idx < ranking.length - 1 ? "1px solid rgba(26,58,92,.35)" : "none",
                  background: isMaisPreferido
                    ? "rgba(29,158,117,.06)"
                    : isMenosPreferido
                    ? "rgba(26,58,92,.15)"
                    : "transparent",
                }}
              >
                {/* Posição */}
                <div style={{
                  width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
                  background: isMaisPreferido
                    ? "rgba(29,158,117,.15)"
                    : isMenosPreferido
                    ? "rgba(26,58,92,.4)"
                    : "rgba(26,58,92,.25)",
                  border: isMaisPreferido ? "1px solid rgba(29,158,117,.35)" : "1px solid rgba(26,58,92,.4)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: "monospace", fontSize: 13, fontWeight: 800,
                  color: isMaisPreferido ? "#1D9E75" : "rgba(160,200,235,.5)",
                }}>
                  {idx + 1}
                </div>

                {/* Nome do item */}
                <div style={{ flex: 1 }}>
                  <span style={{
                    fontSize: 15, fontWeight: isMaisPreferido ? 700 : 500,
                    color: isMaisPreferido ? "#e8f0f8" : "rgba(160,200,235,.8)",
                  }}>
                    {item}
                  </span>
                </div>

                {/* Label */}
                <div style={{ fontSize: 11, color: "rgba(160,200,235,.35)", flexShrink: 0 }}>
                  {isMaisPreferido ? "mais preferido" : isMenosPreferido ? "menos preferido" : ""}
                </div>
              </div>
            )
          })}
        </div>
        <p style={{ fontSize: 11, color: "rgba(160,200,235,.35)", marginTop: 10, lineHeight: 1.5 }}>
          O ranking reflete a ordem de seleção do paciente. O item escolhido primeiro é o mais preferido.
          Use os reforçadores dos primeiros lugares para novos programas.
        </p>
      </div>

      {/* Ações */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button onClick={onNovaAvaliacao} style={{
          padding: "11px 24px", borderRadius: 10, border: "none",
          background: "#1D9E75", color: "#fff",
          fontSize: 13, fontWeight: 600, cursor: "pointer",
          fontFamily: "var(--font-sans)", transition: "background .15s",
        }}
          onMouseEnter={e => e.currentTarget.style.background = "#18896a"}
          onMouseLeave={e => e.currentTarget.style.background = "#1D9E75"}
        >
          + Nova avaliação
        </button>
        <Link href="/clinic/biblioteca" style={{
          padding: "11px 24px", borderRadius: 10,
          background: "rgba(13,32,53,.6)", border: "1px solid rgba(26,58,92,.5)",
          color: "rgba(160,200,235,.7)", fontSize: 13, fontWeight: 500,
          textDecoration: "none", display: "inline-flex", alignItems: "center",
          transition: "background .15s",
        }}>
          Voltar à Biblioteca
        </Link>
      </div>
    </div>
  )
}

// ─── Componentes auxiliares ───────────────────────────────────────────────────
function Breadcrumb({ extra, onExtraClick }: { extra?: string; onExtraClick?: () => void } = {}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 24, fontSize: 12, flexWrap: "wrap" }}>
      <Link href="/clinic/biblioteca" style={{ color: "rgba(160,200,235,.5)", textDecoration: "none" }}>
        Biblioteca Científica
      </Link>
      <Chevron />
      <span style={{ color: "rgba(160,200,235,.8)" }}>Preference Assessment</span>
      {extra && (
        <>
          <Chevron />
          {onExtraClick
            ? <button onClick={onExtraClick} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(160,200,235,.8)", fontSize: 12, fontFamily: "var(--font-sans)", padding: 0 }}>{extra}</button>
            : <span style={{ color: "rgba(160,200,235,.5)" }}>{extra}</span>
          }
        </>
      )}
    </div>
  )
}

function Chevron() {
  return (
    <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="rgba(160,200,235,.3)" strokeWidth="1.5">
      <path d="M5 3l6 5-6 5" />
    </svg>
  )
}

function HeaderInstrumento() {
  return (
    <div style={{
      background: "rgba(13,32,53,.6)", border: "1px solid rgba(29,158,117,.25)",
      borderRadius: 14, padding: 20, marginBottom: 24,
      display: "flex", alignItems: "flex-start", gap: 16,
    }}>
      <div style={{
        width: 48, height: 48, borderRadius: 12,
        background: "rgba(29,158,117,.1)", border: "1px solid rgba(29,158,117,.25)",
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        fontFamily: "monospace", fontSize: 16, fontWeight: 800, color: "#1D9E75",
      }}>PA</div>
      <div>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: "#e8f0f8", margin: "0 0 6px" }}>
          Preference Assessment
        </h1>
        <p style={{ fontSize: 13, color: "rgba(160,200,235,.7)", margin: 0, lineHeight: 1.55 }}>
          Procedimento sistemático para identificar a hierarquia de preferências de estímulos
          (reforçadores potenciais). Essencial antes de iniciar qualquer programa de ensino.
        </p>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 6, marginTop: 10,
          fontSize: 11, color: "rgba(239,159,39,.75)", padding: "3px 10px",
          background: "rgba(239,159,39,.06)", border: "1px solid rgba(239,159,39,.15)", borderRadius: 20,
        }}>
          <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="8" cy="8" r="6" /><path d="M8 5v4M8 11v.5" />
          </svg>
          Instrumento de avaliação — não é programa de ensino
        </div>
      </div>
    </div>
  )
}

// ─── Estilos compartilhados ───────────────────────────────────────────────────
const labelSecao: React.CSSProperties = {
  fontSize: 11, fontWeight: 600, letterSpacing: ".08em",
  textTransform: "uppercase", color: "rgba(160,200,235,.45)", marginBottom: 14,
}

const secao: React.CSSProperties = { marginBottom: 20 }

const rotulo: React.CSSProperties = {
  display: "block", fontSize: 12, fontWeight: 500,
  color: "rgba(160,200,235,.7)", marginBottom: 8,
}

const campoBase: React.CSSProperties = {
  width: "100%", boxSizing: "border-box", padding: "9px 11px",
  borderRadius: 9, border: "1px solid rgba(26,58,92,.45)",
  background: "rgba(13,32,53,.65)", color: "#e8f0f8",
  fontSize: 13, outline: "none",
}

const campoInput: React.CSSProperties = { ...campoBase }
const campoSelect: React.CSSProperties = { ...campoBase, cursor: "pointer" }

const btnSecondary: React.CSSProperties = {
  padding: "11px 20px", borderRadius: 10, cursor: "pointer",
  background: "rgba(13,32,53,.6)", border: "1px solid rgba(26,58,92,.5)",
  color: "rgba(160,200,235,.7)", fontSize: 13, fontWeight: 500,
  fontFamily: "var(--font-sans)", transition: "background .15s",
}
