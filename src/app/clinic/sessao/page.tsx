"use client";
import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useClinicContext } from "../layout";
import { LineChart, Line, ResponsiveContainer, Tooltip, ReferenceLine } from "recharts";

// ─── TIPOS ───────────────────────────────────────────────────────────────────
type Senioridade  = "terapeuta" | "coordenador" | "supervisor" | "abat" | "qasp_s" | "qba";
type TipoSessao   = "atendimento" | "acompanhamento_terapeutico" | "supervisao";
type StageKey     = "warmup_pairing" | "assent_checklist" | "preference_assessment" | "clinical_actions" | "break" | "closing_preparation";
type StageStatus  = "pending" | "active" | "completed" | "skipped";
type PromptLevel  = "independente" | "gestual" | "modelo" | "fisico_parcial" | "fisico_total";
type EventType    = "assent_given" | "assent_revoked" | "assent_recovered" | "avoidance_signal" | "distress_signal" | "break_requested" | "session_paused" | "session_resumed";
type AreaAtiva    = "intervencao" | "avaliacao";

interface Stage    { key: StageKey; status: StageStatus; dbId?: string; concluido_em?: number }
interface Operante { id: string; sd: string; correto: boolean; promptLevel: PromptLevel; ts: number }
interface EventoSessao { id: string; tipo: EventType; timestamp: number }

interface Acao {
  id: string; dbId?: string
  itemId: string; itemNome: string; itemDominio: string
  tipo: "intervention" | "assessment"
  area: AreaAtiva
  operantes: Operante[]
  totalTentativas?: number
  taxaHistorica?: number
  operanteVerbal?: string
  hierarquiaTipo?: "motora" | "verbal" | "generica"
  planoId?: string
}

interface LibItem {
  id: string; nome: string; dominio: string
  tipo: "programa" | "avaliacao"; planejado: boolean
  planoId?: string; taxaHistorica?: number
  operante?: string; totalTentativas?: number
}

interface Encaminhamento {
  id: string
  programaId: string | null
  programaNome: string
  acao: string
  prioridade: "alta" | "media" | "baixa"
}

// ─── HIERARQUIAS ─────────────────────────────────────────────────────────────
const OPERANTES_VERBAIS = ["tato","mando","intraverbal","echoico","textual","transcricao"]
const OPERANTES_MOTORES = ["imitacao","ouvinte"]

function deriveHierarquia(op?: string): "motora" | "verbal" | "generica" {
  if (!op) return "generica"
  if (OPERANTES_VERBAIS.includes(op)) return "verbal"
  if (OPERANTES_MOTORES.includes(op)) return "motora"
  return "generica"
}

interface HItem { key: string; label: string; cor: string; correto: boolean; nivel: number }

function getHierarquia(tipo: "motora" | "verbal" | "generica"): HItem[] {
  if (tipo === "verbal") return [
    { key: "independente", label: "Independente", cor: "#1D9E75", correto: true,  nivel: 5 },
    { key: "mov_oral",     label: "Mov. Oral",    cor: "#23c48f", correto: true,  nivel: 4 },
    { key: "intraverbal",  label: "Intraverbal",  cor: "#378ADD", correto: true,  nivel: 3 },
    { key: "ecoica",       label: "Ecóica",       cor: "#EF9F27", correto: true,  nivel: 2 },
    { key: "erro",         label: "Erro",         cor: "#E05A4B", correto: false, nivel: 0 },
  ]
  if (tipo === "motora") return [
    { key: "independente",   label: "Independente",  cor: "#1D9E75", correto: true,  nivel: 5 },
    { key: "gestual",        label: "Gestual",       cor: "#23c48f", correto: true,  nivel: 4 },
    { key: "fisico_parcial", label: "Fís. Parcial",  cor: "#EF9F27", correto: true,  nivel: 2 },
    { key: "fisico_total",   label: "Fís. Total",    cor: "#E05A4B", correto: true,  nivel: 1 },
    { key: "erro",           label: "Erro",          cor: "#E05A4B", correto: false, nivel: 0 },
  ]
  return [
    { key: "independente",   label: "Independente",  cor: "#1D9E75", correto: true,  nivel: 5 },
    { key: "verbal",         label: "Verbal",        cor: "#23c48f", correto: true,  nivel: 4 },
    { key: "gestual",        label: "Gestual",       cor: "#378ADD", correto: true,  nivel: 3 },
    { key: "fisico_parcial", label: "Fís. Parcial",  cor: "#EF9F27", correto: true,  nivel: 2 },
    { key: "fisico_total",   label: "Fís. Total",    cor: "#8B7FE8", correto: true,  nivel: 1 },
    { key: "erro",           label: "Erro",          cor: "#E05A4B", correto: false, nivel: 0 },
  ]
}

// ─── CONSTANTES ──────────────────────────────────────────────────────────────
const STAGE_KEYS: StageKey[] = ["warmup_pairing","assent_checklist","preference_assessment","clinical_actions","break","closing_preparation"]

const STAGES_CFG: Record<StageKey, { label: string; icone: string; cor: string; descricao: string }> = {
  warmup_pairing:        { label: "Vínculo",      icone: "🤝", cor: "#1D9E75", descricao: "Reduza exigências e estabeleça vínculo"    },
  assent_checklist:      { label: "Assentimento", icone: "✅", cor: "#378ADD", descricao: "Verifique aceitação da criança"             },
  preference_assessment: { label: "Preferências", icone: "⭐", cor: "#EF9F27", descricao: "Identifique reforçadores efetivos"          },
  clinical_actions:      { label: "Ações",        icone: "🎯", cor: "#23c48f", descricao: "Avaliações e programas de intervenção"      },
  break:                 { label: "Pausa",         icone: "⏸", cor: "#4d6d8a", descricao: "Intervalo e observação passiva"             },
  closing_preparation:   { label: "Encerrament.", icone: "🏁", cor: "#E05A4B", descricao: "Finalize e comunique à família"             },
}

const EVENT_CFG: Record<EventType, { label: string; cor: string; icone: string }> = {
  assent_given:     { label: "Assentimento",   cor: "#1D9E75", icone: "✓" },
  assent_revoked:   { label: "Revogado",       cor: "#E05A4B", icone: "✗" },
  assent_recovered: { label: "Recuperado",     cor: "#1D9E75", icone: "↺" },
  avoidance_signal: { label: "Esquiva",        cor: "#EF9F27", icone: "!" },
  distress_signal:  { label: "Desconforto",    cor: "#E05A4B", icone: "⚠" },
  break_requested:  { label: "Pausa",          cor: "#4d6d8a", icone: "⏸" },
  session_paused:   { label: "Pausada",        cor: "#4d6d8a", icone: "⏸" },
  session_resumed:  { label: "Retomada",       cor: "#1D9E75", icone: "▶" },
}

const COMISSAO: Record<string, number> = {
  terapeuta: 0.08, abat: 0.08, qasp_s: 0.08,
  coordenador: 0.10, qba: 0.10,
  supervisor: 0.12,
}

const AVALIACOES_CAT = [
  { id: "vbmapp", nome: "VB-MAPP",   dominio: "Comportamento verbal"        },
  { id: "peak",   nome: "PEAK",      dominio: "Equivalência de estímulos"   },
  { id: "ablls",  nome: "ABLLS-R",   dominio: "Linguagem e aprendizagem"    },
  { id: "af_exp", nome: "AF Experimental", dominio: "Análise Funcional"     },
  { id: "af_ind", nome: "AF Indireta",     dominio: "Análise Funcional"     },
]

const CHECKLIST_GUIADO: Record<string, { item: string; obrigatorio: boolean }[]> = {
  warmup_pairing:        [
    { item: "Cumprimentar a criança pelo nome",           obrigatorio: true  },
    { item: "Oferecer item preferido sem exigências",     obrigatorio: true  },
    { item: "Seguir a liderança da criança por 2 min",   obrigatorio: true  },
    { item: "Verificar estado emocional e disposição",   obrigatorio: false },
  ],
  assent_checklist:      [
    { item: "Explicar a atividade de forma acessível",               obrigatorio: true  },
    { item: "Verificar sinais de aceitação (verbal ou não-verbal)",  obrigatorio: true  },
    { item: "Confirmar que pode encerrar quando quiser",             obrigatorio: true  },
    { item: "Registrar forma de assentimento obtida",                obrigatorio: false },
  ],
  preference_assessment: [
    { item: "Apresentar 3 a 5 itens preferidos",          obrigatorio: true  },
    { item: "Observar hierarquia de escolha",             obrigatorio: true  },
    { item: "Selecionar reforçador primário da sessão",   obrigatorio: true  },
    { item: "Verificar saciação de sessões anteriores",   obrigatorio: false },
  ],
  clinical_actions:      [
    { item: "Revisar programa antes de iniciar",          obrigatorio: true  },
    { item: "Posicionar materiais fora do alcance",       obrigatorio: false },
    { item: "Aplicar SD com clareza e volume adequado",   obrigatorio: true  },
    { item: "Registrar cada tentativa imediatamente",     obrigatorio: true  },
  ],
  break:                 [
    { item: "Sinalizar pausa de forma clara",             obrigatorio: true  },
    { item: "Remover exigências completamente",           obrigatorio: true  },
    { item: "Observar comportamento passivamente",        obrigatorio: false },
  ],
  closing_preparation:   [
    { item: "Encerrar com atividade preferida",           obrigatorio: true  },
    { item: "Registrar observações da sessão",            obrigatorio: true  },
    { item: "Comunicar evolução ao responsável",          obrigatorio: false },
    { item: "Planejar próxima sessão",                    obrigatorio: false },
  ],
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function uid() { return Math.random().toString(36).slice(2,9) }
function fmt(s: number) { return `${Math.floor(s/60).toString().padStart(2,"0")}:${(s%60).toString().padStart(2,"0")}` }
function iniciais(nome: string) {
  const p = nome.trim().split(" ")
  return p.length >= 2 ? `${p[0][0]}${p[p.length-1][0]}`.toUpperCase() : nome.slice(0,2).toUpperCase()
}

// ─── CHECKLIST COMPONENT ──────────────────────────────────────────────────────
function ChecklistGuiado({ stageKey, nivel }: { stageKey: string; nivel: string }) {
  const itens = CHECKLIST_GUIADO[stageKey] ?? []
  const [checks, setChecks] = useState<boolean[]>(itens.map(() => false))
  const obrigatorios = itens.filter(i => i.obrigatorio).length
  const marcados     = itens.filter((i, idx) => i.obrigatorio && checks[idx]).length
  const completo     = marcados === obrigatorios
  const isGuiado     = nivel === "abat" || nivel === "terapeuta"
  if (itens.length === 0) return null
  return (
    <div style={{ marginBottom: 14, padding: "12px 14px", background: "rgba(0,0,0,.2)", borderRadius: 10, border: `1px solid ${completo ? "rgba(29,158,117,.25)" : "rgba(239,159,39,.2)"}` }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <span style={{ fontSize: 11, color: "rgba(160,200,235,.6)", textTransform: "uppercase", letterSpacing: "0.07em" }}>{isGuiado ? "Checklist obrigatório" : "Checklist sugerido"}</span>
        <span style={{ fontSize: 11, color: completo ? "#1D9E75" : "#EF9F27", fontWeight: 600 }}>{marcados}/{obrigatorios} obrigatórios</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {itens.map((item, idx) => (
          <div key={idx} onClick={() => setChecks(prev => prev.map((v,i) => i===idx ? !v : v))}
            style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", padding: "6px 8px", borderRadius: 7, background: checks[idx] ? "rgba(29,158,117,.06)" : "transparent" }}>
            <div style={{ width: 16, height: 16, borderRadius: 4, flexShrink: 0, border: `1.5px solid ${checks[idx] ? "#1D9E75" : item.obrigatorio ? "rgba(239,159,39,.5)" : "rgba(160,200,235,.2)"}`, background: checks[idx] ? "#1D9E75" : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {checks[idx] && <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5L8 3" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/></svg>}
            </div>
            <span style={{ fontSize: 12, color: checks[idx] ? "rgba(232,238,244,.8)" : "rgba(160,200,235,.6)", flex: 1 }}>{item.item}</span>
            {item.obrigatorio && !checks[idx] && <span style={{ fontSize: 9, color: "#EF9F27", textTransform: "uppercase" }}>req</span>}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────
function SessaoInner() {
  const { terapeuta }  = useClinicContext()
  const searchParams   = useSearchParams()
  const router         = useRouter()
  const pacienteId     = searchParams.get("pacienteId")
  const agendaId       = searchParams.get("agendaId")
  const tipoParam      = (searchParams.get("tipo") ?? "atendimento") as TipoSessao
  const duracaoParam   = parseInt(searchParams.get("duracao") ?? "60")
  const localParam     = searchParams.get("local") ?? "presencial"
  const nivel: Senioridade = (terapeuta?.nivel as Senioridade) ?? "coordenador"

  // ── Estado geral ────────────────────────────────────────────────────────────
  const [fase,       setFase]       = useState<"preparacao"|"sessao"|"encerramento">("preparacao")
  const [tipoSessao, setTipoSessao] = useState<TipoSessao>(tipoParam)
  const [localSessao,setLocalSessao]= useState(localParam)
  const [duracaoMin, setDuracaoMin] = useState(duracaoParam)
  const [paciente,   setPaciente]   = useState<{id:string;nome:string;iniciais:string;gradient:string;diagnostico:string}|null>(null)
  const [sessaoDbId, setSessaoDbId] = useState<string|null>(null)
  const [loading,    setLoading]    = useState(true)

  // ── Estágios (só para atendimento e AT) ─────────────────────────────────────
  const [stages, setStages] = useState<Stage[]>(STAGE_KEYS.map(key => ({ key, status: "pending" as StageStatus })))

  // ── Ações — duas áreas ───────────────────────────────────────────────────────
  const [areaAtiva,  setAreaAtiva]  = useState<AreaAtiva>("intervencao")
  const [acoes,      setAcoes]      = useState<Acao[]>([])
  const [acaoAtiva,  setAcaoAtiva]  = useState<Acao|null>(null)
  const [opForm,     setOpForm]     = useState<{sd:string}>({sd:""})

  // ── Eventos clínicos ─────────────────────────────────────────────────────────
  const [eventos, setEventos] = useState<EventoSessao[]>([])

  // ── Biblioteca ───────────────────────────────────────────────────────────────
  const [biblioteca, setBiblioteca] = useState<LibItem[]>([])
  const [libAberta,  setLibAberta]  = useState(false)
  const [libTab,     setLibTab]     = useState<"planejado"|"programas"|"avaliacoes">("planejado")
  const [libBusca,   setLibBusca]   = useState("")

  // ── Timer ─────────────────────────────────────────────────────────────────────
  const [segundos,           setSegundos]           = useState(0)
  const [emPausa,            setEmPausa]            = useState(false)
  const [avisoTempoExibido,  setAvisoTempoExibido]  = useState(false)
  const [showAvisoTempo,     setShowAvisoTempo]     = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval>|null>(null)
  const duracaoContratadaSeg = duracaoMin * 60

  // ── Persistência localStorage ─────────────────────────────────────────────────
  const STORAGE_KEY = "fracta_sessao_ativa"

  // Salva estado crítico sempre que muda
  useEffect(() => {
    if (fase !== "sessao" || !sessaoDbId) return
    const state = {
      sessaoDbId, fase, tipoSessao, localSessao, duracaoMin,
      pacienteId, stages, acoes, eventos, segundos,
      familiaComunic, notaEncerr,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [sessaoDbId, fase, stages, acoes, eventos, segundos])

  // Restaura ao montar se existe sessão salva
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (!saved) return
      const s = JSON.parse(saved)
      // Só restaura se for o mesmo paciente
      if (s.pacienteId !== pacienteId) return
      if (s.fase === "sessao" && s.sessaoDbId) {
        setSessaoDbId(s.sessaoDbId)
        setFase("sessao")
        setTipoSessao(s.tipoSessao ?? tipoParam)
        setLocalSessao(s.localSessao ?? localParam)
        setDuracaoMin(s.duracaoMin ?? duracaoParam)
        setStages(s.stages ?? STAGE_KEYS.map(key => ({ key, status: "pending" as StageStatus })))
        setAcoes(s.acoes ?? [])
        setEventos(s.eventos ?? [])
        setSegundos(s.segundos ?? 0)
        if (s.familiaComunic !== undefined) setFamiliaComunic(s.familiaComunic)
        if (s.notaEncerr) setNotaEncerr(s.notaEncerr)
      }
    } catch { /* ignora erro de parse */ }
  }, [])

  // ── Encerramento ──────────────────────────────────────────────────────────────
  const [showEncModal,    setShowEncModal]    = useState(false)
  const [familiaComunic,  setFamiliaComunic]  = useState<boolean|null>(null)
  const [notaEncerr,      setNotaEncerr]      = useState("")
  const [salvandoEnc,     setSalvandoEnc]     = useState(false)
  const [dragOver,        setDragOver]        = useState(false)

  // ── Supervisão ────────────────────────────────────────────────────────────────
  const [encaminhamentos, setEncaminhamentos] = useState<Encaminhamento[]>([])
  const [novoEnc,         setNovoEnc]         = useState({ programaNome: "", acao: "", prioridade: "media" as "alta"|"media"|"baixa" })
  const [assinaturaSup,   setAssinaturaSup]   = useState(false)
  const [assinaturaSupv,  setAssinaturaSupv]  = useState(false)

  // ── Carregar dados ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!pacienteId) { setLoading(false); return }
    async function carregar() {
      setLoading(true)
      const { data: c } = await supabase.from("criancas").select("id,nome,diagnostico").eq("id", pacienteId).single()
      if (c) setPaciente({ id: c.id, nome: c.nome, iniciais: iniciais(c.nome), gradient: "linear-gradient(135deg,#1D9E75,#378ADD)", diagnostico: c.diagnostico ?? "Não informado" })

      // Programas planejados do plano ativo
      const { data: planos } = await supabase
        .from("planos")
        .select("id, programas(id, nome, dominio, operante, total_tentativas)")
        .eq("crianca_id", pacienteId)
        .eq("status", "ativo")

      const planejados: LibItem[] = []
      if (planos) {
        for (const pl of planos) {
          const prog = (pl as any).programas
          if (!prog) continue
          // Taxa histórica real do programa para este paciente
          const { data: opsHist } = await supabase
            .from("operants")
            .select("correto")
            .eq("action_id", prog.id) // aproximação — melhorar com join futuro
            .limit(100)
          const taxa = opsHist && opsHist.length > 0
            ? Math.round(opsHist.filter((o:any) => o.correto).length / opsHist.length * 100)
            : undefined
          planejados.push({
            id: prog.id, nome: prog.nome, dominio: prog.dominio ?? "—",
            tipo: "programa", planejado: true, planoId: pl.id,
            taxaHistorica: taxa, operante: prog.operante,
            totalTentativas: prog.total_tentativas ?? 10,
          })
        }
      }

      // Biblioteca geral de programas
      const { data: todos } = await supabase.from("programas").select("id,nome,dominio,operante,total_tentativas").limit(50)
      const libGeral: LibItem[] = (todos ?? [])
        .filter(p => !planejados.find(pl => pl.id === p.id))
        .map(p => ({ id: p.id, nome: p.nome, dominio: p.dominio ?? "—", tipo: "programa" as const, planejado: false, operante: (p as any).operante, totalTentativas: (p as any).total_tentativas ?? 10 }))

      const libAvals: LibItem[] = AVALIACOES_CAT.map(a => ({ ...a, tipo: "avaliacao" as const, planejado: false }))
      setBiblioteca([...planejados, ...libGeral, ...libAvals])
      setLoading(false)
    }
    carregar()
  }, [pacienteId])

  // ── Timer ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (fase !== "sessao" || emPausa) return
    timerRef.current = setInterval(() => setSegundos(s => {
      const novo = s + 1
      if (novo >= duracaoContratadaSeg && !avisoTempoExibido) {
        setAvisoTempoExibido(true)
        setShowAvisoTempo(true)
      }
      return novo
    }), 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [fase, emPausa, avisoTempoExibido, duracaoContratadaSeg])

  // ── Iniciar sessão ──────────────────────────────────────────────────────────
  async function iniciarSessao() {
    if (!paciente || !terapeuta) return

    // Validação de horário — verifica se existe agendamento para hoje ±30min
    if (!agendaId) {
      const agora       = new Date()
      const trintaMin   = 30 * 60 * 1000
      const inicioJan   = new Date(agora.getTime() - trintaMin).toISOString()
      const fimJan      = new Date(agora.getTime() + trintaMin).toISOString()
      const { data: eventosHoje } = await supabase
        .from("agenda_eventos")
        .select("id, data_hora, status")
        .eq("crianca_id", paciente.id)
        .gte("data_hora", inicioJan)
        .lte("data_hora", fimJan)
        .neq("status", "cancelado")
        .neq("status", "realizado")
      if (!eventosHoje || eventosHoje.length === 0) {
        const confirmar = window.confirm(
          `Não há agendamento para ${paciente.nome} nos próximos 30 minutos.\n\nDeseja iniciar uma sessão avulsa mesmo assim?`
        )
        if (!confirmar) return
      }
    }
    const { data } = await supabase.from("sessoes_v2").insert({
      crianca_id:           paciente.id,
      terapeuta_id:         terapeuta.id,
      status:               "ativa",
      inicio:               new Date().toISOString(),
      duracao_contratada_min: duracaoMin,
      tipo:                 tipoSessao,
      local:                localSessao,
      concluida:            false,
    }).select("id").single()

    if (data) {
      setSessaoDbId(data.id)
      // Cria estágios apenas para atendimento e AT
      if (tipoSessao !== "supervisao") {
        for (const st of stages) {
          const { data: stDb } = await supabase.from("session_stages")
            .insert({ sessao_id: data.id, stage: st.key, status: "pending" }).select("id").single()
          if (stDb) setStages(prev => prev.map(s => s.key === st.key ? { ...s, dbId: stDb.id } : s))
        }
        setStages(prev => prev.map((s,i) => i === 0 ? { ...s, status: "active" } : s))
      }
    }
    // Atualizar slot da agenda para em_andamento
    if (agendaId) {
      await supabase.from("agenda_eventos").update({ status: "em_andamento", sessao_id: data?.id ?? null }).eq("id", agendaId)
    }
    setFase("sessao")
    if (tipoSessao !== "supervisao") {
      await registrarEventoInterno("assent_given", data?.id)
    }
  }

  // ── Avançar estágio ─────────────────────────────────────────────────────────
  async function marcarStage(key: StageKey) {
    const idx = stages.findIndex(s => s.key === key)
    const st  = stages[idx]
    if (st.status === "completed") return
    setStages(prev => prev.map((s,i) => {
      if (i === idx)   return { ...s, status: "completed", concluido_em: Date.now() }
      if (i === idx+1) return { ...s, status: "active" }
      return s
    }))
    if (st.dbId) await supabase.from("session_stages").update({ status: "completed", concluido_em: new Date().toISOString() }).eq("id", st.dbId)
    if (idx === stages.length - 1) setShowEncModal(true)
  }

  // ── Adicionar ação ──────────────────────────────────────────────────────────
  async function adicionarAcao(item: LibItem) {
    const area: AreaAtiva   = item.tipo === "avaliacao" ? "avaliacao" : areaAtiva
    const hierTipo          = deriveHierarquia(item.operante)
    const novaAcao: Acao    = {
      id: uid(), tipo: item.tipo === "avaliacao" ? "assessment" : "intervention",
      area, itemId: item.id, itemNome: item.nome, itemDominio: item.dominio,
      operantes: [], taxaHistorica: item.taxaHistorica,
      totalTentativas: item.totalTentativas ?? 10,
      operanteVerbal: item.operante, hierarquiaTipo: hierTipo,
    }
    if (sessaoDbId) {
      const stAtual = stages.find(s => s.status === "active")
      const { data: acDb } = await supabase.from("session_actions").insert({
        sessao_id:    sessaoDbId,
        stage_id:     stAtual?.dbId ?? null,
        tipo:         novaAcao.tipo,
        programa_id:  item.tipo === "programa" ? item.id : null,
        plano_id:     item.planoId ?? null,
        status:       "active",
        iniciado_em:  new Date().toISOString(),
      }).select("id").single()
      if (acDb) novaAcao.dbId = acDb.id
    }
    setAcoes(prev => [...prev, novaAcao])
    setAcaoAtiva(novaAcao)
    setLibAberta(false)
  }

  // ── Registrar operante ──────────────────────────────────────────────────────
  async function registrarOperante(correto: boolean, nivelKey?: string) {
    if (!acaoAtiva) return
    const promptLevel = (nivelKey ?? "independente") as PromptLevel
    const op: Operante = { id: uid(), sd: opForm.sd, correto, promptLevel, ts: Date.now() }
    if (sessaoDbId && acaoAtiva.dbId) {
      await supabase.from("operants").insert({
        sessao_id:    sessaoDbId,
        action_id:    acaoAtiva.dbId,
        sd:           op.sd || null,
        correto:      op.correto,
        prompt_level: promptLevel,
        tipo:         "tentativa",
      })
    }
    const atualizada = { ...acaoAtiva, operantes: [...acaoAtiva.operantes, op] }
    setAcaoAtiva(atualizada)
    setAcoes(prev => prev.map(a => a.id === acaoAtiva.id ? atualizada : a))
    setOpForm({ sd: "" })
  }

  // ── Registrar evento ────────────────────────────────────────────────────────
  async function registrarEvento(tipo: EventType) { await registrarEventoInterno(tipo, sessaoDbId) }
  async function registrarEventoInterno(tipo: EventType, sid: string|null|undefined) {
    const ev: EventoSessao = { id: uid(), tipo, timestamp: Date.now() }
    setEventos(prev => [ev, ...prev])
    if (sid) {
      const stAtual = stages.find(s => s.status === "active")
      await supabase.from("session_events").insert({ sessao_id: sid, stage_id: stAtual?.dbId ?? null, tipo, timestamp: new Date().toISOString() })
    }
  }

  function togglePausa() {
    if (emPausa) { setEmPausa(false); registrarEvento("session_resumed") }
    else         { setEmPausa(true);  registrarEvento("session_paused")  }
  }

  // ── CASCATA DE ENCERRAMENTO ─────────────────────────────────────────────────
  async function confirmarEncerramento() {
    if (!sessaoDbId || !paciente || !terapeuta) return
    setSalvandoEnc(true)

    const duracaoRealMin = Math.floor(segundos / 60)
    const acrescimo      = Math.max(0, duracaoRealMin - duracaoMin)
    const totalOps       = acoes.reduce((a,ac) => a + ac.operantes.length, 0)
    const totalAcertos   = acoes.reduce((a,ac) => a + ac.operantes.filter(o => o.correto).length, 0)
    const taxaGeral      = totalOps > 0 ? Math.round(totalAcertos / totalOps * 100) : 0

    try {
      // 1. Finalizar sessão em sessoes_v2
      await supabase.from("sessoes_v2").update({
        status:           "finalizada",
        fim:              new Date().toISOString(),
        duracao_segundos: segundos,
        observacao_geral: notaEncerr || null,
        concluida:        true,
        acrescimo_min:    acrescimo,
        humor_crianca:    taxaGeral > 70 ? 3 : taxaGeral > 40 ? 2 : 1,
      }).eq("id", sessaoDbId)

      // 2. Registrar também em sessoes_clinicas (financeiro e histórico)
      await supabase.from("sessoes_clinicas").insert({
        crianca_id:      paciente.id,
        terapeuta_id:    terapeuta.id,
        responsavel_id:  terapeuta.id,
        agendado_para:   new Date().toISOString(),
        status:          "realizada",
        timer_segundos:  segundos,
        observacoes:     notaEncerr || null,
        concluida:       true,
        taxa_id:         taxaGeral,
        valor_sessao:    duracaoMin * 4, // R$4/min como base; ajustar quando tiver contrato real
      })

      // 3. Atualizar score_atual dos planos com base na taxa de cada programa
      const acoesIntervencao = acoes.filter(a => a.tipo === "intervention" && a.planoId)
      for (const acao of acoesIntervencao) {
        const ops     = acao.operantes
        const taxa    = ops.length > 0 ? Math.round(ops.filter(o => o.correto).length / ops.length * 100) : null
        if (taxa !== null && acao.planoId) {
          await supabase.from("planos").update({ score_atual: taxa, atualizado_em: new Date().toISOString() }).eq("id", acao.planoId)
        }
      }

      // 4. Inserir radar_snapshot para alimentar o Forecast
      // Calcula score por domínio a partir das ações da sessão
      const dominioScores: Record<string, number[]> = {}
      for (const acao of acoes) {
        const dom = acao.itemDominio.toLowerCase()
        const ops = acao.operantes
        if (ops.length === 0) continue
        const taxa = Math.round(ops.filter(o => o.correto).length / ops.length * 100)
        if (!dominioScores[dom]) dominioScores[dom] = []
        dominioScores[dom].push(taxa)
      }
      const media = (arr: number[]) => arr.length > 0 ? Math.round(arr.reduce((a,b) => a+b,0) / arr.length) : 50

      await supabase.from("radar_snapshots").insert({
        crianca_id:           paciente.id,
        score_comunicacao:    media(dominioScores["comunicação"] ?? dominioScores["comunicacao"] ?? []),
        score_social:         media(dominioScores["social"] ?? []),
        score_atencao:        media(dominioScores["atenção"] ?? dominioScores["atencao"] ?? []),
        score_regulacao:      media(dominioScores["regulação"] ?? dominioScores["regulacao"] ?? []),
        score_brincadeira:    media(dominioScores["brincadeira"] ?? []),
        score_flexibilidade:  media(dominioScores["flexibilidade"] ?? []),
        score_autonomia:      media(dominioScores["autonomia"] ?? []),
        score_motivacao:      media(dominioScores["motivação"] ?? dominioScores["motivacao"] ?? []),
        criado_em:            new Date().toISOString(),
      })

      // 5. Gerar movimentação financeira
      const comissaoPct   = COMISSAO[nivel] ?? 0.10
      const valorBruto    = duracaoMin * 4 // base simples; substituir por valor do contrato
      const valorComissao = Math.round(valorBruto * comissaoPct * 100) / 100
      const valorRepasse  = valorBruto - valorComissao

      await supabase.from("financial_transactions").insert({
        sessao_id:     sessaoDbId,
        terapeuta_id:  terapeuta.id,
        crianca_id:    paciente.id,
        tipo_origem:   "care",
        valor_bruto:   valorBruto,
        comissao_pct:  comissaoPct * 100,
        valor_comissao: valorComissao,
        valor_repasse:  valorRepasse,
        duracao_min:   duracaoMin,
        acrescimo_min: acrescimo,
        status:        "pendente",
      })

      // 6. Gerar session_summary para histórico e FractaCare
      const programasJson = acoes.map(ac => {
        const ops   = ac.operantes
        const total = ops.length
        const acert = ops.filter(o => o.correto).length
        const taxa  = total > 0 ? Math.round(acert / total * 100) : 0
        return {
          nome:     ac.itemNome,
          dominio:  ac.itemDominio,
          tipo:     ac.tipo,
          area:     ac.area,
          taxa,
          total,
          acertos:  acert,
          criterio: taxa >= 80,
          seq:      ops.map(o => o.correto ? "C" : "E").join(""),
          // Independência: % de tentativas independentes (sem dica)
          independencia: total > 0
            ? Math.round(ops.filter(o => o.promptLevel === "independente").length / total * 100)
            : 0,
        }
      })

      const eventosJson = eventos.map(e => ({ tipo: e.tipo, label: EVENT_CFG[e.tipo].label, timestamp: e.timestamp }))

      await supabase.from("session_summary").insert({
        sessao_id:          sessaoDbId,
        crianca_id:         paciente.id,
        terapeuta_id:       terapeuta.id,
        taxa_geral:         taxaGeral,
        total_operantes:    totalOps,
        programas_json:     programasJson,
        eventos_json:       eventosJson,
        familia_comunicada: familiaComunic ?? false,
        nota_encerramento:  notaEncerr || null,
      })

      // 7. Para supervisão: registrar encaminhamentos
      if (tipoSessao === "supervisao" && encaminhamentos.length > 0) {
        await supabase.from("sessoes_v2").update({
          encaminhamentos: encaminhamentos,
          assinatura_supervisor:      assinaturaSup,
          assinatura_supervisionado:  assinaturaSupv,
          horas_supervisao_validas:   assinaturaSup && assinaturaSupv,
        }).eq("id", sessaoDbId)
      }

    } catch (err) {
      console.error("Erro no encerramento:", err)
    }

    setSalvandoEnc(false)
    setShowEncModal(false)
    // Atualizar slot da agenda para realizado
    if (agendaId) {
      await supabase.from("agenda_eventos").update({ status: "realizado" }).eq("id", agendaId)
    }
    localStorage.removeItem(STORAGE_KEY)
    setFase("encerramento")
  }

  // ── Dados para relatório ────────────────────────────────────────────────────
  const totalOps     = acoes.reduce((a,ac) => a + ac.operantes.length, 0)
  const totalAcertos = acoes.reduce((a,ac) => a + ac.operantes.filter(o => o.correto).length, 0)
  const taxaGeral    = totalOps > 0 ? Math.round(totalAcertos / totalOps * 100) : 0

  // ── Biblioteca filtrada ─────────────────────────────────────────────────────
  const libFiltrada = biblioteca.filter(b => {
    if (libTab === "planejado")   return b.planejado
    if (libTab === "programas")   return b.tipo === "programa"
    if (libTab === "avaliacoes")  return b.tipo === "avaliacao"
    return true
  }).filter(b => b.nome.toLowerCase().includes(libBusca.toLowerCase()))

  const card: React.CSSProperties = { background: "rgba(13,32,53,.9)", border: "1px solid rgba(26,58,92,.6)", borderRadius: 14 }

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#07111f", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-sans)" }}>
      <div style={{ fontSize: 13, color: "rgba(160,200,235,.6)" }}>Carregando...</div>
    </div>
  )

  // ══════════════════════════════════════════════════════════════════════════
  // PREPARAÇÃO
  // ══════════════════════════════════════════════════════════════════════════
  if (fase === "preparacao") {
    const TIPO_LABELS: Record<TipoSessao, string> = {
      atendimento:               "Atendimento",
      acompanhamento_terapeutico:"Acomp. Terapêutico",
      supervisao:                "Supervisão",
    }
    const LOCAL_LABELS: Record<string, string> = {
      presencial:       "Presencial",
      remoto:           "Remoto",
      ambiente_natural: "Amb. Natural",
    }
    return (
      <div style={{ minHeight: "100vh", background: "#07111f", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-sans)", padding: 20 }}>
        <div style={{ width: "100%", maxWidth: 500, display: "flex", flexDirection: "column", gap: 14 }}>

          <div style={{ textAlign: "center", marginBottom: 4 }}>
            <h1 style={{ fontSize: "1.3rem", fontWeight: 800, color: "#e8f0f8", margin: 0, marginBottom: 10 }}>Nova Sessão</h1>
            {paciente ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
                <div style={{ width: 38, height: 38, borderRadius: "50%", background: paciente.gradient, display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".7rem", fontWeight: 800, color: "#fff" }}>{paciente.iniciais}</div>
                <div style={{ textAlign: "left" }}>
                  <div style={{ fontSize: ".95rem", fontWeight: 700, color: "#e8f0f8" }}>{paciente.nome}</div>
                  <div style={{ fontSize: ".7rem", color: "rgba(160,200,235,.5)" }}>{paciente.diagnostico}</div>
                </div>
              </div>
            ) : <div style={{ fontSize: ".8rem", color: "rgba(160,200,235,.3)" }}>Nenhum paciente selecionado</div>}
          </div>

          {/* Tipo de sessão */}
          <div style={{ ...card, padding: 16 }}>
            <div style={{ fontSize: ".65rem", color: "rgba(170,210,245,.5)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 10 }}>Tipo de sessão</div>
            <div style={{ display: "flex", gap: 6 }}>
              {(["atendimento","acompanhamento_terapeutico","supervisao"] as TipoSessao[]).map(t => (
                <button key={t} onClick={() => setTipoSessao(t)} style={{ flex: 1, padding: "9px 6px", borderRadius: 9, border: `1px solid ${tipoSessao === t ? "rgba(29,158,117,.5)" : "rgba(26,58,92,.4)"}`, background: tipoSessao === t ? "rgba(29,158,117,.15)" : "transparent", color: tipoSessao === t ? "#1D9E75" : "rgba(160,200,235,.4)", fontSize: ".68rem", fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-sans)" }}>
                  {TIPO_LABELS[t]}
                </button>
              ))}
            </div>
          </div>

          {/* Local e duração */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div style={{ ...card, padding: 14 }}>
              <div style={{ fontSize: ".65rem", color: "rgba(170,210,245,.5)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 8 }}>Local</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {["presencial","remoto","ambiente_natural"].map(l => (
                  <button key={l} onClick={() => setLocalSessao(l)} style={{ padding: "7px 10px", borderRadius: 7, border: `1px solid ${localSessao === l ? "rgba(55,138,221,.5)" : "rgba(26,58,92,.4)"}`, background: localSessao === l ? "rgba(55,138,221,.15)" : "transparent", color: localSessao === l ? "#378ADD" : "rgba(160,200,235,.4)", fontSize: ".68rem", fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-sans)", textAlign: "left" }}>
                    {LOCAL_LABELS[l]}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ ...card, padding: 14 }}>
              <div style={{ fontSize: ".65rem", color: "rgba(170,210,245,.5)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 8 }}>Duração (min)</div>
              <input type="number" min={15} max={240} step={15} value={duracaoMin}
                onChange={e => setDuracaoMin(parseInt(e.target.value))}
                style={{ width: "100%", padding: "10px", borderRadius: 8, border: "1px solid rgba(26,58,92,.4)", background: "rgba(13,32,53,.6)", color: "#e8f0f8", fontSize: "1.1rem", fontWeight: 700, textAlign: "center", fontFamily: "var(--font-sans)", outline: "none", boxSizing: "border-box" }}
              />
              <div style={{ fontSize: ".62rem", color: "rgba(160,200,235,.3)", marginTop: 6, textAlign: "center" }}>
                Aviso ao atingir {duracaoMin} min
              </div>
            </div>
          </div>

          {/* Roteiro — só para atendimento e AT */}
          {tipoSessao !== "supervisao" && (
            <div style={{ ...card, padding: 16 }}>
              <div style={{ fontSize: ".65rem", color: "rgba(170,210,245,.5)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 12 }}>Roteiro da sessão</div>
              {STAGE_KEYS.map((key,i) => {
                const cfg = STAGES_CFG[key]
                return (
                  <div key={key} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", borderBottom: i < 5 ? "1px solid rgba(26,58,92,.2)" : "none" }}>
                    <span style={{ fontSize: ".85rem" }}>{cfg.icone}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: ".78rem", fontWeight: 600, color: "#e8f0f8" }}>{cfg.label}</div>
                      <div style={{ fontSize: ".63rem", color: "rgba(160,200,235,.4)" }}>{cfg.descricao}</div>
                    </div>
                    {["preference_assessment","break"].includes(key) && <span style={{ fontSize: ".58rem", color: "rgba(160,200,235,.3)", background: "rgba(26,58,92,.4)", borderRadius: 20, padding: "2px 7px" }}>opcional</span>}
                  </div>
                )
              })}
            </div>
          )}

          {/* Supervisão: contexto */}
          {tipoSessao === "supervisao" && (
            <div style={{ ...card, padding: 16, border: "1px solid rgba(139,127,232,.2)" }}>
              <div style={{ fontSize: ".65rem", color: "#8B7FE8", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 8 }}>Sessão de supervisão</div>
              <div style={{ fontSize: ".78rem", color: "rgba(160,200,235,.6)", lineHeight: 1.6 }}>
                Esta sessão será registrada com assinatura digital de ambas as partes e contará para o histórico de horas de supervisão válidas para certificação.
              </div>
            </div>
          )}

          {/* Programas planejados */}
          {biblioteca.filter(b => b.planejado).length > 0 && tipoSessao !== "supervisao" && (
            <div style={{ ...card, padding: 12 }}>
              <div style={{ fontSize: ".68rem", color: "rgba(170,210,245,.5)", marginBottom: 8 }}>
                {biblioteca.filter(b => b.planejado).length} programa(s) no plano
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                {biblioteca.filter(b => b.planejado).map(p => (
                  <span key={p.id} style={{ fontSize: ".7rem", padding: "3px 10px", borderRadius: 20, background: "rgba(29,158,117,.1)", border: "1px solid rgba(29,158,117,.2)", color: "#1D9E75" }}>{p.nome}</span>
                ))}
              </div>
            </div>
          )}

          <button onClick={iniciarSessao} disabled={!paciente} style={{ padding: 14, borderRadius: 12, border: "none", background: paciente ? "linear-gradient(135deg,#1D9E75,#0f8f7a)" : "rgba(26,58,92,.4)", color: paciente ? "#07111f" : "rgba(160,200,235,.3)", fontWeight: 800, fontSize: ".95rem", cursor: paciente ? "pointer" : "not-allowed", fontFamily: "var(--font-sans)" }}>
            Iniciar sessão →
          </button>
        </div>
      </div>
    )
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SESSÃO DE SUPERVISÃO
  // ══════════════════════════════════════════════════════════════════════════
  if (fase === "sessao" && tipoSessao === "supervisao") {
    return (
      <div style={{ minHeight: "100vh", background: "#07111f", fontFamily: "var(--font-sans)", display: "flex", flexDirection: "column" }}>

        {/* Topbar */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 16px", background: "rgba(7,17,31,.95)", borderBottom: "1px solid rgba(139,127,232,.3)", position: "sticky", top: 0, zIndex: 30 }}>
          {paciente && <div style={{ width: 28, height: 28, borderRadius: "50%", background: paciente.gradient, display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".58rem", fontWeight: 800, color: "#fff", flexShrink: 0 }}>{paciente.iniciais}</div>}
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: ".82rem", fontWeight: 700, color: "#8B7FE8" }}>Supervisão</span>
            <span style={{ fontSize: ".72rem", color: "rgba(160,200,235,.4)", marginLeft: 8 }}>{paciente?.nome}</span>
          </div>
          <div style={{ fontSize: "1.2rem", fontWeight: 800, color: emPausa ? "#EF9F27" : "#8B7FE8", fontFamily: "monospace" }}>{fmt(segundos)}</div>
          <button onClick={togglePausa} style={{ padding: "5px 10px", borderRadius: 7, border: "1px solid rgba(239,159,39,.3)", background: "rgba(239,159,39,.08)", color: "#EF9F27", fontSize: ".68rem", fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-sans)" }}>
            {emPausa ? "▶" : "⏸"}
          </button>
          <button onClick={() => setShowEncModal(true)} style={{ padding: "5px 10px", borderRadius: 7, border: "1px solid rgba(224,90,75,.3)", background: "rgba(224,90,75,.08)", color: "#E05A4B", fontSize: ".68rem", fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-sans)" }}>
            Encerrar
          </button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: 16, maxWidth: 720, margin: "0 auto", width: "100%" }}>

          {/* Encaminhamentos estruturados */}
          <div style={{ ...card, padding: 18, marginBottom: 14 }}>
            <div style={{ fontSize: ".78rem", fontWeight: 700, color: "#8B7FE8", marginBottom: 14 }}>Encaminhamentos clínicos</div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
              {encaminhamentos.length === 0 && (
                <div style={{ fontSize: ".72rem", color: "rgba(160,200,235,.3)", textAlign: "center", padding: "12px 0" }}>Nenhum encaminhamento registrado ainda</div>
              )}
              {encaminhamentos.map(enc => {
                const corPrior = enc.prioridade === "alta" ? "#E05A4B" : enc.prioridade === "media" ? "#EF9F27" : "#1D9E75"
                return (
                  <div key={enc.id} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 12px", background: "rgba(26,58,92,.2)", borderRadius: 9, border: `1px solid ${corPrior}22` }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: corPrior, flexShrink: 0, marginTop: 5 }} />
                    <div style={{ flex: 1 }}>
                      {enc.programaNome && <div style={{ fontSize: ".72rem", color: "#8B7FE8", fontWeight: 600, marginBottom: 2 }}>{enc.programaNome}</div>}
                      <div style={{ fontSize: ".78rem", color: "#e8f0f8" }}>{enc.acao}</div>
                    </div>
                    <button onClick={() => setEncaminhamentos(prev => prev.filter(e => e.id !== enc.id))} style={{ background: "none", border: "none", color: "rgba(224,90,75,.5)", cursor: "pointer", fontSize: ".8rem" }}>×</button>
                  </div>
                )
              })}
            </div>

            {/* Adicionar encaminhamento */}
            <div style={{ border: "1px solid rgba(139,127,232,.2)", borderRadius: 10, padding: 14, background: "rgba(139,127,232,.04)" }}>
              <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                <input value={novoEnc.programaNome} onChange={e => setNovoEnc(p => ({ ...p, programaNome: e.target.value }))}
                  placeholder="Programa (opcional)"
                  style={{ flex: 1, padding: "7px 10px", borderRadius: 7, border: "1px solid rgba(26,58,92,.4)", background: "rgba(13,32,53,.6)", color: "#e8f0f8", fontSize: ".75rem", fontFamily: "var(--font-sans)", outline: "none" }}
                />
                <select value={novoEnc.prioridade} onChange={e => setNovoEnc(p => ({ ...p, prioridade: e.target.value as any }))}
                  style={{ padding: "7px 10px", borderRadius: 7, border: "1px solid rgba(26,58,92,.4)", background: "rgba(13,32,53,.6)", color: "#e8f0f8", fontSize: ".75rem", fontFamily: "var(--font-sans)", outline: "none" }}>
                  <option value="alta">Alta</option>
                  <option value="media">Média</option>
                  <option value="baixa">Baixa</option>
                </select>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <input value={novoEnc.acao} onChange={e => setNovoEnc(p => ({ ...p, acao: e.target.value }))}
                  placeholder="Ação: ex. Revisar critério de mastery, introduzir variação de contexto..."
                  style={{ flex: 1, padding: "7px 10px", borderRadius: 7, border: "1px solid rgba(26,58,92,.4)", background: "rgba(13,32,53,.6)", color: "#e8f0f8", fontSize: ".75rem", fontFamily: "var(--font-sans)", outline: "none" }}
                />
                <button onClick={() => {
                  if (!novoEnc.acao.trim()) return
                  setEncaminhamentos(prev => [...prev, { id: uid(), programaId: null, programaNome: novoEnc.programaNome, acao: novoEnc.acao, prioridade: novoEnc.prioridade }])
                  setNovoEnc({ programaNome: "", acao: "", prioridade: "media" })
                }} style={{ padding: "7px 14px", borderRadius: 7, border: "none", background: "rgba(139,127,232,.2)", color: "#8B7FE8", fontSize: ".75rem", fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-sans)" }}>
                  + Add
                </button>
              </div>
            </div>
          </div>

          {/* Revisão de dados clínicos */}
          {acoes.length > 0 && (
            <div style={{ ...card, padding: 18, marginBottom: 14 }}>
              <div style={{ fontSize: ".78rem", fontWeight: 700, color: "#8B7FE8", marginBottom: 12 }}>Dados em discussão</div>
              {acoes.map(ac => (
                <div key={ac.id} style={{ padding: "10px 12px", background: "rgba(26,58,92,.2)", borderRadius: 9, marginBottom: 6 }}>
                  <div style={{ fontSize: ".78rem", fontWeight: 600, color: "#e8f0f8" }}>{ac.itemNome}</div>
                  <div style={{ fontSize: ".68rem", color: "rgba(160,200,235,.4)" }}>{ac.itemDominio}</div>
                </div>
              ))}
              <button onClick={() => setLibAberta(p => !p)} style={{ marginTop: 8, padding: "7px 14px", borderRadius: 7, border: "1px solid rgba(139,127,232,.3)", background: "rgba(139,127,232,.08)", color: "#8B7FE8", fontSize: ".72rem", fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-sans)" }}>
                + Adicionar caso em pauta
              </button>
            </div>
          )}

          {acoes.length === 0 && (
            <div style={{ ...card, padding: 18, marginBottom: 14, textAlign: "center" }}>
              <div style={{ fontSize: ".78rem", color: "rgba(160,200,235,.3)", marginBottom: 10 }}>Adicione casos clínicos em pauta para discussão</div>
              <button onClick={() => setLibAberta(true)} style={{ padding: "8px 18px", borderRadius: 8, border: "1px solid rgba(139,127,232,.3)", background: "rgba(139,127,232,.08)", color: "#8B7FE8", fontSize: ".75rem", fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-sans)" }}>
                + Adicionar caso
              </button>
            </div>
          )}

          {/* Assinaturas digitais */}
          <div style={{ ...card, padding: 18 }}>
            <div style={{ fontSize: ".78rem", fontWeight: 700, color: "#8B7FE8", marginBottom: 14 }}>Assinaturas digitais</div>
            <div style={{ fontSize: ".72rem", color: "rgba(160,200,235,.5)", marginBottom: 14, lineHeight: 1.6 }}>
              Ambas as assinaturas validam esta sessão para fins de certificação BACB/ABPMC e comprovação de horas de supervisão.
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              {[
                { label: "Supervisor", state: assinaturaSup, set: setAssinaturaSup },
                { label: "Supervisionado", state: assinaturaSupv, set: setAssinaturaSupv },
              ].map(a => (
                <button key={a.label} onClick={() => a.set(!a.state)} style={{ flex: 1, padding: "12px", borderRadius: 10, border: `1px solid ${a.state ? "rgba(29,158,117,.4)" : "rgba(139,127,232,.3)"}`, background: a.state ? "rgba(29,158,117,.1)" : "rgba(139,127,232,.06)", color: a.state ? "#1D9E75" : "#8B7FE8", fontSize: ".78rem", fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-sans)" }}>
                  {a.state ? `✓ ${a.label} assinou` : `Assinar como ${a.label}`}
                </button>
              ))}
            </div>
            {assinaturaSup && assinaturaSupv && (
              <div style={{ marginTop: 12, padding: "8px 12px", background: "rgba(29,158,117,.08)", border: "1px solid rgba(29,158,117,.2)", borderRadius: 8, fontSize: ".72rem", color: "#1D9E75" }}>
                Sessão validada — {fmt(segundos)} de supervisão serão registrados no histórico de certificação.
              </div>
            )}
          </div>
        </div>

        {/* Aviso de tempo e modal de encerramento (compartilhados) */}
        {showAvisoTempo && <AvisoTempo onContinuar={() => setShowAvisoTempo(false)} onEncerrar={() => { setShowAvisoTempo(false); setShowEncModal(true) }} />}
        {showEncModal && (
          <ModalEncerramento
            segundos={segundos} totalOps={totalOps} taxaGeral={taxaGeral}
            familiaComunic={familiaComunic} setFamiliaComunic={setFamiliaComunic}
            notaEncerr={notaEncerr} setNotaEncerr={setNotaEncerr}
            salvando={salvandoEnc}
            tipoSessao={tipoSessao}
            onCancelar={() => setShowEncModal(false)}
            onConfirmar={confirmarEncerramento}
          />
        )}

        {/* Biblioteca */}
        {libAberta && <Biblioteca itens={libFiltrada} tab={libTab} setTab={setLibTab} busca={libBusca} setBusca={setLibBusca} onAdd={adicionarAcao} onFechar={() => setLibAberta(false)} />}
      </div>
    )
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SESSÃO ATIVA — ATENDIMENTO / AT
  // ══════════════════════════════════════════════════════════════════════════
  if (fase === "sessao") {
    const stAtual = stages.find(s => s.status === "active")
    const stCfg   = stAtual ? STAGES_CFG[stAtual.key] : null
    const acoesArea = acoes.filter(a => a.area === areaAtiva)

    return (
      <div style={{ minHeight: "100vh", background: "#07111f", fontFamily: "var(--font-sans)", display: "flex", flexDirection: "column" }}>

        {/* Topbar */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 16px", background: "rgba(7,17,31,.95)", borderBottom: "1px solid rgba(26,58,92,.4)", backdropFilter: "blur(10px)", position: "sticky", top: 0, zIndex: 30 }}>
          {paciente && <div style={{ width: 28, height: 28, borderRadius: "50%", background: paciente.gradient, display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".58rem", fontWeight: 800, color: "#fff", flexShrink: 0 }}>{paciente.iniciais}</div>}

          {/* Estágios */}
          <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 0 }}>
            {stages.map((st, i) => {
              const cfg  = STAGES_CFG[st.key]
              const done = st.status === "completed" || st.status === "skipped"
              const ativo= st.status === "active"
              return (
                <div key={st.key} style={{ display: "flex", alignItems: "center", flex: 1 }}>
                  <button onClick={() => marcarStage(st.key)} title={cfg.label}
                    style={{ width: 28, height: 28, borderRadius: "50%", border: `2px solid ${done ? cfg.cor : ativo ? cfg.cor : "rgba(26,58,92,.5)"}`, background: done ? cfg.cor : ativo ? `${cfg.cor}20` : "rgba(7,17,31,.8)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0, fontSize: done ? ".65rem" : ".75rem", color: done ? "#fff" : ativo ? cfg.cor : "rgba(160,200,235,.3)" }}>
                    {done ? "✓" : cfg.icone}
                  </button>
                  {i < stages.length-1 && <div style={{ flex: 1, height: 2, background: done ? `${cfg.cor}60` : "rgba(26,58,92,.4)" }} />}
                </div>
              )
            })}
          </div>

          <div style={{ fontSize: "1.3rem", fontWeight: 800, color: emPausa ? "#EF9F27" : "#1D9E75", fontFamily: "monospace", flexShrink: 0 }}>{fmt(segundos)}</div>

          <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
            <button onClick={togglePausa} style={{ padding: "5px 10px", borderRadius: 7, border: `1px solid ${emPausa ? "rgba(29,158,117,.3)" : "rgba(239,159,39,.3)"}`, background: emPausa ? "rgba(29,158,117,.08)" : "rgba(239,159,39,.08)", color: emPausa ? "#1D9E75" : "#EF9F27", fontSize: ".68rem", fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-sans)" }}>
              {emPausa ? "▶" : "⏸"}
            </button>
            <button onClick={() => setShowEncModal(true)} style={{ padding: "5px 10px", borderRadius: 7, border: "1px solid rgba(224,90,75,.3)", background: "rgba(224,90,75,.08)", color: "#E05A4B", fontSize: ".68rem", fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-sans)" }}>
              Encerrar
            </button>
            <button onClick={() => setLibAberta(p => !p)} style={{ padding: "5px 10px", borderRadius: 7, border: `1px solid ${libAberta ? "rgba(139,127,232,.4)" : "rgba(26,58,92,.5)"}`, background: libAberta ? "rgba(139,127,232,.1)" : "transparent", color: libAberta ? "#8B7FE8" : "rgba(160,200,235,.5)", fontSize: ".68rem", fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-sans)" }}>
              + Programa
            </button>
          </div>
        </div>

        {/* Seletor de área */}
        <div style={{ display: "flex", gap: 0, borderBottom: "1px solid rgba(26,58,92,.4)", background: "rgba(7,17,31,.7)" }}>
          {([["intervencao","Intervenção","#1D9E75"],["avaliacao","Avaliação","#8B7FE8"]] as const).map(([area, label, cor]) => (
            <button key={area} onClick={() => setAreaAtiva(area)} style={{ flex: 1, padding: "10px", background: "none", border: "none", borderBottom: `2px solid ${areaAtiva === area ? cor : "transparent"}`, color: areaAtiva === area ? cor : "rgba(160,200,235,.4)", fontFamily: "var(--font-sans)", fontWeight: areaAtiva === area ? 700 : 400, fontSize: ".82rem", cursor: "pointer", marginBottom: -1 }}>
              {label}
              {acoes.filter(a => a.area === area).length > 0 && (
                <span style={{ marginLeft: 6, fontSize: ".65rem", background: cor + "20", color: cor, borderRadius: 20, padding: "1px 7px", fontWeight: 700 }}>
                  {acoes.filter(a => a.area === area).length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Corpo */}
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

          {/* Área principal */}
          <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>

            {/* Indicador do estágio */}
            {stAtual && stCfg && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, padding: "8px 14px", background: `${stCfg.cor}10`, border: `1px solid ${stCfg.cor}25`, borderRadius: 10 }}>
                <span style={{ fontSize: "1rem" }}>{stCfg.icone}</span>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: ".78rem", fontWeight: 700, color: stCfg.cor }}>{stCfg.label}</span>
                  <span style={{ fontSize: ".7rem", color: "rgba(160,200,235,.4)", marginLeft: 8 }}>{stCfg.descricao}</span>
                </div>
                <button onClick={() => marcarStage(stAtual.key)} style={{ padding: "4px 12px", borderRadius: 20, border: `1px solid ${stCfg.cor}44`, background: `${stCfg.cor}15`, color: stCfg.cor, fontSize: ".68rem", fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-sans)" }}>
                  Concluir →
                </button>
              </div>
            )}

            {/* Checklist guiado */}
            {stAtual && ["abat","terapeuta","qasp_s","coordenador"].includes(nivel) && (
              <ChecklistGuiado stageKey={stAtual.key} nivel={nivel} />
            )}

            {/* Drop zone */}
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); const id = e.dataTransfer.getData("libItemId"); const item = biblioteca.find(b => b.id === id); if (item) adicionarAcao(item) }}
              style={{ display: acoesArea.length === 0 ? "flex" : "none", alignItems: "center", justifyContent: "center", minHeight: 80, border: `2px dashed ${dragOver ? "#1D9E75" : "rgba(26,58,92,.4)"}`, borderRadius: 12, marginBottom: 12, background: dragOver ? "rgba(29,158,117,.04)" : "transparent" }}>
              <div style={{ fontSize: ".78rem", color: "rgba(160,200,235,.3)" }}>
                {areaAtiva === "intervencao" ? "Arraste ou clique + Programa para adicionar intervenção" : "Clique + Programa e selecione na aba Avaliações"}
              </div>
            </div>

            {/* Ações da área ativa */}
            {acoesArea.map(acao => {
              const isAtiva = acaoAtiva?.id === acao.id
              const ops     = acao.operantes
              const acertos = ops.filter(o => o.correto).length
              const taxa    = ops.length > 0 ? Math.round(acertos / ops.length * 100) : null
              const grafOps = ops.map((op,i) => ({ n: i+1, taxa: Math.round(ops.slice(0,i+1).filter(o=>o.correto).length/(i+1)*100) }))
              const criterio= taxa !== null && taxa >= 80

              return (
                <div key={acao.id} style={{ ...card, marginBottom: 10, border: `1px solid ${isAtiva ? "rgba(35,196,143,.35)" : "rgba(26,58,92,.5)"}`, overflow: "hidden" }}>

                  {/* Header */}
                  <div onClick={() => setAcaoAtiva(isAtiva ? null : acao)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", cursor: "pointer" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: ".85rem", fontWeight: 700, color: isAtiva ? "#23c48f" : "#e8f0f8" }}>{acao.itemNome}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 2 }}>
                        <span style={{ fontSize: ".62rem", color: "rgba(160,200,235,.4)" }}>{acao.itemDominio}</span>
                        {acao.taxaHistorica !== undefined && <span style={{ fontSize: ".6rem", color: "#8B7FE8" }}>hist: {acao.taxaHistorica}%</span>}
                        <span style={{ fontSize: ".62rem", color: "rgba(160,200,235,.35)" }}>{ops.length}/{acao.totalTentativas ?? 10} tentativas</span>
                        {criterio && <span style={{ fontSize: ".62rem", color: "#1D9E75", background: "rgba(29,158,117,.1)", borderRadius: 20, padding: "1px 8px", fontWeight: 700 }}>✓ Critério</span>}
                      </div>
                    </div>

                    {/* Mini gráfico de tentativas */}
                    <div style={{ display: "flex", gap: 2, alignItems: "center", marginRight: 10 }}>
                      {ops.slice(-12).map((op, i) => {
                        const hier  = getHierarquia(acao.hierarquiaTipo ?? "generica")
                        const hItem = hier.find(h => h.key === op.promptLevel) ?? hier[0]
                        return <div key={i} style={{ width: 7, height: 13, borderRadius: 2, background: op.correto ? hItem.cor : "#E05A4B", opacity: .85 }} />
                      })}
                    </div>

                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontSize: "1.3rem", fontWeight: 800, color: taxa === null ? "rgba(160,200,235,.3)" : taxa >= 80 ? "#1D9E75" : taxa >= 50 ? "#EF9F27" : "#E05A4B" }}>
                        {taxa === null ? "—" : `${taxa}%`}
                      </div>
                      <div style={{ fontSize: ".6rem", color: "rgba(160,200,235,.35)" }}>{acertos}/{ops.length}</div>
                    </div>
                  </div>

                  {/* Área de registro */}
                  {isAtiva && (
                    <div style={{ borderTop: "1px solid rgba(26,58,92,.3)", padding: "12px 14px" }}>

                      {grafOps.length >= 2 && (
                        <div style={{ height: 60, marginBottom: 12 }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={grafOps}>
                              <Line type="monotone" dataKey="taxa" stroke="#23c48f" strokeWidth={2} dot={false} />
                              <ReferenceLine y={80} stroke="rgba(29,158,117,.3)" strokeDasharray="3 3" />
                              <Tooltip contentStyle={{ background: "#0d2035", border: "1px solid rgba(26,58,92,.7)", borderRadius: 8, color: "#e8f0f8", fontSize: 10 }} formatter={(v:unknown) => [`${v}%`, "taxa"]} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      )}

                      <input value={opForm.sd} onChange={e => setOpForm({ sd: e.target.value })}
                        placeholder="SD / estímulo (opcional)"
                        style={{ width: "100%", padding: "7px 10px", borderRadius: 8, border: "1px solid rgba(26,58,92,.4)", background: "rgba(13,32,53,.6)", color: "#e8f0f8", fontSize: ".75rem", fontFamily: "var(--font-sans)", outline: "none", boxSizing: "border-box", marginBottom: 10 }}
                      />

                      {/* Hierarquia de dicas */}
                      {(() => {
                        const hier = getHierarquia(acao.hierarquiaTipo ?? "generica")
                        return (
                          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                            <div style={{ fontSize: ".62rem", color: "rgba(160,200,235,.35)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 2 }}>
                              Hierarquia {acao.hierarquiaTipo === "verbal" ? "verbal" : acao.hierarquiaTipo === "motora" ? "motora" : "genérica"}
                              {acao.operanteVerbal && <span style={{ marginLeft: 6, color: "rgba(160,200,235,.25)" }}>({acao.operanteVerbal})</span>}
                            </div>
                            {hier.map((h, hi) => {
                              const isErro = !h.correto
                              return (
                                <button key={h.key} onClick={() => registrarOperante(h.correto, h.key)}
                                  style={{ padding: isErro ? "10px 14px" : "13px 14px", borderRadius: 10, border: `1px solid ${h.cor}${isErro ? "" : "44"}`, background: `${h.cor}12`, color: isErro ? "#E05A4B" : h.cor, fontWeight: 700, fontSize: isErro ? ".78rem" : ".85rem", cursor: "pointer", fontFamily: "var(--font-sans)", display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: isErro ? 4 : 0 }}>
                                  <span style={{ display: "flex", alignItems: "center", gap: 6 }}>{isErro ? "✗" : "✓"}<span>{h.label}</span></span>
                                  <span style={{ fontSize: ".62rem", opacity: .45 }}>{isErro ? "sem resposta" : hi === 0 ? "sem dica" : `nível ${hi}`}</span>
                                </button>
                              )
                            })}
                          </div>
                        )
                      })()}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Lateral — eventos rápidos */}
          <div style={{ width: 100, borderLeft: "1px solid rgba(26,58,92,.35)", display: "flex", flexDirection: "column", padding: "10px 6px", gap: 6, background: "rgba(7,17,31,.5)" }}>
            <div style={{ fontSize: ".55rem", color: "rgba(160,200,235,.3)", textTransform: "uppercase", letterSpacing: ".06em", textAlign: "center", marginBottom: 4 }}>Eventos</div>
            {([
              ["assent_revoked",  "Revogado",  ],
              ["avoidance_signal","Esquiva",   ],
              ["distress_signal", "Desconf.",  ],
              ["break_requested", "Pausa",     ],
              ["assent_recovered","Recuperou", ],
            ] as [EventType, string][]).map(([tipo, label]) => {
              const cfg = EVENT_CFG[tipo]
              return (
                <button key={tipo} onClick={() => registrarEvento(tipo)} style={{ padding: "8px 4px", borderRadius: 8, border: `1px solid ${cfg.cor}22`, background: `${cfg.cor}0a`, color: cfg.cor, fontSize: ".62rem", fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-sans)", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                  <span style={{ fontSize: ".9rem" }}>{cfg.icone}</span>
                  <span>{label}</span>
                </button>
              )
            })}
            {eventos.length > 0 && (
              <div style={{ marginTop: 8, flex: 1, overflowY: "auto" }}>
                <div style={{ fontSize: ".55rem", color: "rgba(160,200,235,.2)", textAlign: "center", marginBottom: 4 }}>{eventos.length}x</div>
                {eventos.slice(0,6).map(ev => {
                  const cfg = EVENT_CFG[ev.tipo]
                  return <div key={ev.id} title={cfg.label} style={{ width: 20, height: 20, borderRadius: "50%", background: `${cfg.cor}20`, border: `1px solid ${cfg.cor}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".65rem", color: cfg.cor, margin: "0 auto 4px" }}>{cfg.icone}</div>
                })}
              </div>
            )}
          </div>
        </div>

        {/* Biblioteca */}
        {libAberta && <Biblioteca itens={libFiltrada} tab={libTab} setTab={setLibTab} busca={libBusca} setBusca={setLibBusca} onAdd={adicionarAcao} onFechar={() => setLibAberta(false)} />}

        {/* Pop-ups */}
        {showAvisoTempo && <AvisoTempo onContinuar={() => setShowAvisoTempo(false)} onEncerrar={() => { setShowAvisoTempo(false); setShowEncModal(true) }} />}
        {showEncModal && (
          <ModalEncerramento
            segundos={segundos} totalOps={totalOps} taxaGeral={taxaGeral}
            familiaComunic={familiaComunic} setFamiliaComunic={setFamiliaComunic}
            notaEncerr={notaEncerr} setNotaEncerr={setNotaEncerr}
            salvando={salvandoEnc}
            tipoSessao={tipoSessao}
            onCancelar={() => setShowEncModal(false)}
            onConfirmar={confirmarEncerramento}
          />
        )}
      </div>
    )
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ENCERRAMENTO — relatório longitudinal completo
  // ══════════════════════════════════════════════════════════════════════════
  const relatorio = `RELATÓRIO DE SESSÃO — ${new Date().toLocaleDateString("pt-BR")}
Paciente: ${paciente?.nome ?? "—"}
Tipo: ${tipoSessao}
Duração: ${fmt(segundos)} (contratado: ${duracaoMin}min)
Terapeuta: ${terapeuta?.nome ?? "—"}
Local: ${localSessao}
Família comunicada: ${familiaComunic ? "Sim" : "Não"}

PROGRAMAS APLICADOS (${acoes.filter(a=>a.area==="intervencao").length}):
${acoes.filter(a=>a.area==="intervencao").map(ac => {
  const t = ac.operantes.length
  const c = ac.operantes.filter(o => o.correto).length
  const tx = t > 0 ? Math.round(c/t*100) : 0
  const ind= t > 0 ? Math.round(ac.operantes.filter(o=>o.promptLevel==="independente").length/t*100) : 0
  const seq= ac.operantes.map(o => o.correto ? "C" : "E").join(" ")
  return `• ${ac.itemNome} — ${tx}% acerto, ${ind}% independência (${c}/${t})\n  Sequência: ${seq}`
}).join("\n") || "Nenhum programa aplicado"}

AVALIAÇÕES (${acoes.filter(a=>a.area==="avaliacao").length}):
${acoes.filter(a=>a.area==="avaliacao").map(ac => `• ${ac.itemNome} — ${ac.operantes.length} registros`).join("\n") || "Nenhuma avaliação aplicada"}

EVENTOS CLÍNICOS (${eventos.length}):
${eventos.map(e => EVENT_CFG[e.tipo].label).join(", ") || "Nenhum evento registrado"}

${tipoSessao === "supervisao" && encaminhamentos.length > 0 ? `ENCAMINHAMENTOS (${encaminhamentos.length}):\n${encaminhamentos.map(e => `• [${e.prioridade.toUpperCase()}] ${e.programaNome ? e.programaNome + ": " : ""}${e.acao}`).join("\n")}` : ""}

OBSERVAÇÕES:
${notaEncerr || "—"}`

  return (
    <div style={{ minHeight: "100vh", background: "#07111f", fontFamily: "var(--font-sans)", padding: "20px" }}>
      <div style={{ maxWidth: 700, margin: "0 auto", display: "flex", flexDirection: "column", gap: 14 }}>

        {/* Header */}
        <div style={{ textAlign: "center", padding: "12px 0" }}>
          <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(29,158,117,.15)", border: "1px solid rgba(29,158,117,.3)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px", fontSize: 18 }}>✓</div>
          <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "#e8f0f8", marginBottom: 4 }}>Sessão finalizada</div>
          <div style={{ fontSize: ".8rem", color: "rgba(160,200,235,.5)" }}>{paciente?.nome} · {fmt(segundos)} · {totalOps} operantes</div>
        </div>

        {/* KPIs */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
          {[
            { l: "Duração",    v: fmt(segundos),  c: "#e8f0f8" },
            { l: "Taxa geral", v: `${taxaGeral}%`, c: taxaGeral >= 80 ? "#1D9E75" : taxaGeral >= 50 ? "#EF9F27" : "#E05A4B" },
            { l: "Operantes",  v: totalOps,        c: "#378ADD" },
            { l: "Eventos",    v: eventos.length,  c: "#8B7FE8" },
          ].map(k => (
            <div key={k.l} style={{ ...card, padding: "12px 14px" }}>
              <div style={{ fontSize: ".58rem", color: "rgba(170,210,245,.5)", marginBottom: 3 }}>{k.l}</div>
              <div style={{ fontSize: "1.2rem", fontWeight: 800, color: k.c }}>{k.v}</div>
            </div>
          ))}
        </div>

        {/* Comunicação família */}
        <div style={{ ...card, padding: "12px 16px", border: `1px solid ${familiaComunic ? "rgba(29,158,117,.25)" : "rgba(224,90,75,.25)"}` }}>
          <div style={{ fontSize: ".75rem", color: familiaComunic ? "#1D9E75" : "#E05A4B", fontWeight: 600 }}>
            {familiaComunic ? "Família comunicada sobre a sessão" : "Família não foi comunicada"}
          </div>
          {notaEncerr && <div style={{ fontSize: ".72rem", color: "rgba(160,200,235,.6)", marginTop: 6 }}>{notaEncerr}</div>}
        </div>

        {/* Intervenções */}
        {acoes.filter(a => a.area === "intervencao").map(ac => {
          const t  = ac.operantes.length
          const c  = ac.operantes.filter(o => o.correto).length
          const tx = t > 0 ? Math.round(c/t*100) : 0
          const ind= t > 0 ? Math.round(ac.operantes.filter(o=>o.promptLevel==="independente").length/t*100) : 0
          const grafD = ac.operantes.map((op,i) => ({ n: i+1, taxa: Math.round(ac.operantes.slice(0,i+1).filter(o=>o.correto).length/(i+1)*100) }))
          return (
            <div key={ac.id} style={{ ...card, padding: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: ".88rem", fontWeight: 700, color: "#e8f0f8" }}>{ac.itemNome}</div>
                  <div style={{ fontSize: ".65rem", color: "rgba(160,200,235,.4)" }}>{ac.itemDominio} · {t} operantes</div>
                  <div style={{ fontSize: ".63rem", color: "rgba(160,200,235,.4)", marginTop: 2 }}>
                    Independência: <span style={{ color: ind >= 70 ? "#1D9E75" : "#EF9F27", fontWeight: 600 }}>{ind}%</span>
                    {ac.taxaHistorica !== undefined && <span style={{ marginLeft: 8, color: "#8B7FE8" }}>hist: {ac.taxaHistorica}% → agora: {tx}%</span>}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "1.6rem", fontWeight: 800, color: tx >= 80 ? "#1D9E75" : tx >= 50 ? "#EF9F27" : "#E05A4B" }}>{tx}%</div>
                  {tx >= 80 && <div style={{ fontSize: ".65rem", color: "#1D9E75", fontWeight: 600 }}>Critério atingido</div>}
                </div>
              </div>
              {grafD.length >= 2 && (
                <div style={{ height: 60, marginBottom: 10 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={grafD}>
                      <Line type="monotone" dataKey="taxa" stroke="#23c48f" strokeWidth={2} dot={false} />
                      <ReferenceLine y={80} stroke="rgba(29,158,117,.3)" strokeDasharray="3 3" />
                      <Tooltip contentStyle={{ background: "#0d2035", border: "1px solid rgba(26,58,92,.7)", borderRadius: 8, color: "#e8f0f8", fontSize: 10 }} formatter={(v:unknown) => [`${v}%`]} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
              <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
                {ac.operantes.map((op,i) => (
                  <div key={i} title={op.promptLevel} style={{ width: 20, height: 20, borderRadius: 4, background: op.correto ? "rgba(29,158,117,.2)" : "rgba(224,90,75,.2)", border: `1px solid ${op.correto ? "rgba(29,158,117,.4)" : "rgba(224,90,75,.4)"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".6rem", color: op.correto ? "#1D9E75" : "#E05A4B" }}>
                    {op.correto ? "C" : "E"}
                  </div>
                ))}
              </div>
            </div>
          )
        })}

        {/* Encaminhamentos — supervisão */}
        {tipoSessao === "supervisao" && encaminhamentos.length > 0 && (
          <div style={{ ...card, padding: 18 }}>
            <div style={{ fontSize: ".78rem", fontWeight: 700, color: "#8B7FE8", marginBottom: 12 }}>Encaminhamentos registrados</div>
            {encaminhamentos.map(enc => {
              const corPrior = enc.prioridade === "alta" ? "#E05A4B" : enc.prioridade === "media" ? "#EF9F27" : "#1D9E75"
              return (
                <div key={enc.id} style={{ display: "flex", gap: 10, padding: "8px 12px", background: "rgba(26,58,92,.2)", borderRadius: 8, marginBottom: 6, border: `1px solid ${corPrior}22` }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: corPrior, flexShrink: 0, marginTop: 5 }} />
                  <div>
                    {enc.programaNome && <div style={{ fontSize: ".7rem", color: "#8B7FE8", fontWeight: 600 }}>{enc.programaNome}</div>}
                    <div style={{ fontSize: ".78rem", color: "#e8f0f8" }}>{enc.acao}</div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Eventos */}
        {eventos.length > 0 && (
          <div style={{ ...card, padding: 16 }}>
            <div style={{ fontSize: ".75rem", fontWeight: 700, color: "rgba(170,210,245,.88)", marginBottom: 10 }}>Eventos clínicos ({eventos.length})</div>
            {[...eventos].reverse().map(ev => {
              const cfg = EVENT_CFG[ev.tipo]
              return (
                <div key={ev.id} style={{ display: "flex", gap: 8, padding: "5px 0", borderBottom: "1px solid rgba(26,58,92,.2)" }}>
                  <span style={{ color: cfg.cor, fontSize: ".7rem" }}>{cfg.icone}</span>
                  <span style={{ fontSize: ".72rem", color: "rgba(160,200,235,.7)" }}>{cfg.label}</span>
                </div>
              )
            })}
          </div>
        )}

        {/* Relatório */}
        <div style={{ ...card, padding: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <div style={{ fontSize: ".75rem", fontWeight: 700, color: "rgba(170,210,245,.88)" }}>Relatório de sessão</div>
            <button onClick={() => navigator.clipboard.writeText(relatorio)} style={{ padding: "5px 12px", borderRadius: 8, border: "1px solid rgba(55,138,221,.3)", background: "rgba(55,138,221,.08)", color: "#378ADD", fontSize: ".68rem", fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-sans)" }}>
              Copiar
            </button>
          </div>
          <pre style={{ fontSize: ".7rem", color: "rgba(160,200,235,.65)", lineHeight: 1.65, whiteSpace: "pre-wrap", margin: 0, background: "rgba(13,32,53,.5)", padding: 12, borderRadius: 9, border: "1px solid rgba(26,58,92,.3)" }}>
            {relatorio}
          </pre>
        </div>

        <div style={{ display: "flex", gap: 10, paddingBottom: 20 }}>
          <button onClick={() => router.push(`/clinic/paciente/${paciente?.id}`)} style={{ flex: 1, padding: 13, borderRadius: 10, border: "1px solid rgba(70,120,180,.5)", background: "transparent", color: "rgba(160,200,235,.9)", fontWeight: 600, fontSize: ".82rem", cursor: "pointer", fontFamily: "var(--font-sans)" }}>
            Ver histórico do paciente
          </button>
          <button onClick={() => router.push("/clinic/dashboard")} style={{ flex: 1, padding: 13, borderRadius: 10, border: "none", background: "linear-gradient(135deg,#1D9E75,#0f8f7a)", color: "#07111f", fontWeight: 800, fontSize: ".82rem", cursor: "pointer", fontFamily: "var(--font-sans)" }}>
            Voltar ao painel →
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── COMPONENTES AUXILIARES ──────────────────────────────────────────────────

function AvisoTempo({ onContinuar, onEncerrar }: { onContinuar: () => void; onEncerrar: () => void }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60, padding: 20 }}>
      <div style={{ background: "rgba(13,32,53,.95)", border: "1px solid rgba(239,159,39,.35)", borderRadius: 16, padding: 28, maxWidth: 400, width: "100%", textAlign: "center" }}>
        <div style={{ width: 48, height: 48, borderRadius: 12, background: "rgba(239,159,39,.15)", border: "1px solid rgba(239,159,39,.3)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#EF9F27" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        </div>
        <div style={{ fontSize: "1rem", fontWeight: 700, color: "rgba(255,255,255,.95)", marginBottom: 8 }}>Tempo de sessão encerrado</div>
        <div style={{ fontSize: ".82rem", color: "rgba(255,255,255,.5)", lineHeight: 1.6, marginBottom: 24 }}>
          O tempo contratado chegou ao fim. Deseja encerrar agora ou continuar por mais alguns minutos?
          <br /><span style={{ fontSize: ".72rem", color: "rgba(255,255,255,.3)", marginTop: 6, display: "block" }}>Minutos extras não são cobrados de nenhuma das partes.</span>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onContinuar} style={{ flex: 1, padding: "11px", borderRadius: 10, border: "1px solid rgba(255,255,255,.1)", background: "transparent", color: "rgba(255,255,255,.6)", fontSize: ".82rem", fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-sans)" }}>
            Continuar sessão
          </button>
          <button onClick={onEncerrar} style={{ flex: 1, padding: "11px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#EF9F27,#e08a1a)", color: "#07111f", fontSize: ".82rem", fontWeight: 800, cursor: "pointer", fontFamily: "var(--font-sans)" }}>
            Encerrar agora
          </button>
        </div>
      </div>
    </div>
  )
}

function ModalEncerramento({ segundos, totalOps, taxaGeral, familiaComunic, setFamiliaComunic, notaEncerr, setNotaEncerr, salvando, tipoSessao, onCancelar, onConfirmar }: {
  segundos: number; totalOps: number; taxaGeral: number
  familiaComunic: boolean|null; setFamiliaComunic: (v: boolean) => void
  notaEncerr: string; setNotaEncerr: (v: string) => void
  salvando: boolean; tipoSessao: TipoSessao
  onCancelar: () => void; onConfirmar: () => void
}) {
  const card: React.CSSProperties = { background: "rgba(13,32,53,.9)", border: "1px solid rgba(26,58,92,.6)", borderRadius: 14 }
  const ehSupervisao = tipoSessao === "supervisao"
  const podeFinalizar = ehSupervisao || familiaComunic !== null

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 20 }}>
      <div style={{ ...card, padding: 28, width: "100%", maxWidth: 460 }}>
        <div style={{ fontSize: "1rem", fontWeight: 800, color: "#e8f0f8", marginBottom: 4 }}>Encerrar sessão</div>
        <div style={{ fontSize: ".78rem", color: "rgba(160,200,235,.5)", marginBottom: 20 }}>
          {fmt(segundos)} · {totalOps} operantes · {taxaGeral}% acerto
        </div>

        {!ehSupervisao && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: ".75rem", color: "rgba(170,210,245,.7)", marginBottom: 10 }}>A família foi comunicada sobre a sessão?</div>
            <div style={{ display: "flex", gap: 8 }}>
              {[{ v: true, l: "Sim, comunicada", c: "#1D9E75" }, { v: false, l: "Não comunicada", c: "#E05A4B" }].map(r => (
                <button key={String(r.v)} onClick={() => setFamiliaComunic(r.v)}
                  style={{ flex: 1, padding: "10px", borderRadius: 9, cursor: "pointer", fontFamily: "var(--font-sans)", fontWeight: 600, fontSize: ".78rem", border: `1px solid ${familiaComunic === r.v ? r.c : "rgba(26,58,92,.5)"}`, background: familiaComunic === r.v ? `${r.c}18` : "transparent", color: familiaComunic === r.v ? r.c : "rgba(160,200,235,.5)" }}>
                  {r.l}
                </button>
              ))}
            </div>
          </div>
        )}

        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: ".75rem", color: "rgba(170,210,245,.7)", marginBottom: 6 }}>
            {ehSupervisao ? "Encaminhamentos e observações finais" : "Observação de encerramento (opcional)"}
          </div>
          <textarea value={notaEncerr} onChange={e => setNotaEncerr(e.target.value)}
            placeholder={ehSupervisao ? "Resumo da supervisão, pontos principais discutidos..." : "Comportamentos relevantes, intercorrências, próximos passos..."}
            rows={3}
            style={{ width: "100%", padding: "10px 12px", borderRadius: 9, border: "1px solid rgba(26,58,92,.4)", background: "rgba(13,32,53,.6)", color: "#e8f0f8", fontSize: ".78rem", fontFamily: "var(--font-sans)", resize: "none", outline: "none", boxSizing: "border-box" }}
          />
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onCancelar} style={{ flex: 1, padding: "11px", borderRadius: 10, border: "1px solid rgba(26,58,92,.5)", background: "transparent", color: "rgba(160,200,235,.6)", fontSize: ".82rem", cursor: "pointer", fontFamily: "var(--font-sans)" }}>
            Cancelar
          </button>
          <button onClick={onConfirmar} disabled={!podeFinalizar || salvando}
            style={{ flex: 2, padding: "11px", borderRadius: 10, border: "none", background: podeFinalizar && !salvando ? "linear-gradient(135deg,#E05A4B,#c04030)" : "rgba(26,58,92,.4)", color: podeFinalizar && !salvando ? "#fff" : "rgba(160,200,235,.3)", fontWeight: 800, fontSize: ".82rem", cursor: podeFinalizar && !salvando ? "pointer" : "not-allowed", fontFamily: "var(--font-sans)" }}>
            {salvando ? "Finalizando..." : "Finalizar sessão →"}
          </button>
        </div>
      </div>
    </div>
  )
}

function Biblioteca({ itens, tab, setTab, busca, setBusca, onAdd, onFechar }: {
  itens: LibItem[]; tab: string; setTab: (t: any) => void
  busca: string; setBusca: (v: string) => void
  onAdd: (item: LibItem) => void; onFechar: () => void
}) {
  return (
    <div style={{ position: "fixed", right: 0, top: 0, bottom: 0, width: 300, background: "rgba(7,17,31,.97)", borderLeft: "1px solid rgba(26,58,92,.5)", display: "flex", flexDirection: "column", zIndex: 40, boxShadow: "-10px 0 40px rgba(0,0,0,.5)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderBottom: "1px solid rgba(26,58,92,.4)" }}>
        <div style={{ fontSize: ".85rem", fontWeight: 700, color: "#e8f0f8" }}>Biblioteca</div>
        <button onClick={onFechar} style={{ background: "none", border: "none", color: "rgba(160,200,235,.5)", cursor: "pointer", fontSize: "1.2rem" }}>×</button>
      </div>
      <div style={{ display: "flex", borderBottom: "1px solid rgba(26,58,92,.3)" }}>
        {([["planejado","Planejado"],["programas","Programas"],["avaliacoes","Avaliações"]] as const).map(([id,label]) => (
          <button key={id} onClick={() => setTab(id)} style={{ flex: 1, padding: "8px 4px", background: "none", border: "none", borderBottom: `2px solid ${tab === id ? "#1D9E75" : "transparent"}`, color: tab === id ? "#1D9E75" : "rgba(160,200,235,.4)", fontSize: ".65rem", fontWeight: tab === id ? 700 : 400, cursor: "pointer", fontFamily: "var(--font-sans)" }}>
            {label}
          </button>
        ))}
      </div>
      <div style={{ padding: "8px" }}>
        <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar..." style={{ width: "100%", padding: "7px 10px", borderRadius: 8, border: "1px solid rgba(26,58,92,.4)", background: "rgba(13,32,53,.6)", color: "#e8f0f8", fontSize: ".72rem", fontFamily: "var(--font-sans)", outline: "none", boxSizing: "border-box" }} />
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "0 8px 8px" }}>
        {itens.length === 0 && <div style={{ fontSize: ".72rem", color: "rgba(160,200,235,.3)", textAlign: "center", padding: "20px 0" }}>Nenhum item</div>}
        {itens.map(item => (
          <div key={item.id} draggable onDragStart={e => e.dataTransfer.setData("libItemId", item.id)}
            style={{ padding: "10px 12px", borderRadius: 10, background: "rgba(26,58,92,.2)", border: `1px solid ${item.planejado ? "rgba(29,158,117,.2)" : "rgba(26,58,92,.35)"}`, marginBottom: 6, cursor: "grab" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
              <div style={{ fontSize: ".78rem", fontWeight: 600, color: "#e8f0f8" }}>{item.nome}</div>
              <button onClick={() => onAdd(item)} style={{ width: 22, height: 22, borderRadius: "50%", border: "1px solid rgba(29,158,117,.3)", background: "rgba(29,158,117,.1)", color: "#1D9E75", fontSize: ".85rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>+</button>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ fontSize: ".62rem", color: "rgba(160,200,235,.4)" }}>{item.dominio}</span>
              {item.planejado && <span style={{ fontSize: ".58rem", color: "#1D9E75", background: "rgba(29,158,117,.1)", borderRadius: 20, padding: "1px 6px" }}>planejado</span>}
              {item.tipo === "avaliacao" && <span style={{ fontSize: ".58rem", color: "#8B7FE8", background: "rgba(139,127,232,.1)", borderRadius: 20, padding: "1px 6px" }}>avaliação</span>}
              {item.taxaHistorica !== undefined && <span style={{ fontSize: ".6rem", color: "#EF9F27", marginLeft: "auto" }}>{item.taxaHistorica}%</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── EXPORT ───────────────────────────────────────────────────────────────────
export default function ClinicSessaoPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "#07111f", display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ fontSize: 13, color: "rgba(160,200,235,.6)" }}>Carregando...</div></div>}>
      <SessaoInner />
    </Suspense>
  )
}
