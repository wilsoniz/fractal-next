"use client";
import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useClinicContext } from "../layout";

// ─── TIPOS ───────────────────────────────────────────────────────────────────
type Senioridade = "terapeuta" | "coordenador" | "supervisor";
type StageKey = "warmup_pairing" | "assent_checklist" | "preference_assessment" | "initial_functional_analysis" | "clinical_actions" | "break" | "closing_preparation";
type StageStatus = "pending" | "active" | "completed" | "skipped";
type PromptLevel = "independente" | "gestual" | "modelo" | "fisico_parcial" | "fisico_total";
type EventType = "assent_given" | "assent_revoked" | "assent_recovered" | "preference_selected" | "avoidance_signal" | "distress_signal" | "break_requested" | "transition_difficulty" | "session_paused" | "session_resumed" | "program_completed" | "program_skipped";
type LibTab = "planejado" | "programas" | "avaliacoes";

interface Stage {
  key: StageKey
  label: string
  status: StageStatus
  dbId?: string
  checklist: Record<string, boolean>
  notas: string
  aberto: boolean
}

interface Acao {
  id: string
  dbId?: string
  tipo: "assessment" | "intervention"
  itemId: string
  itemNome: string
  itemDominio: string
  status: "active" | "completed"
  operantes: Operante[]
  taxaHistorica?: number
}

interface Operante {
  id: string
  sd: string
  correto: boolean
  promptLevel: PromptLevel
  ts: number
}

interface EventoSessao {
  id: string
  tipo: EventType
  timestamp: number
  intensidade?: "low" | "medium" | "high"
}

interface LibItem {
  id: string
  nome: string
  dominio: string
  tipo: "programa" | "avaliacao"
  planejado: boolean
  planoId?: string
  taxaHistorica?: number
  ultimaAplicacao?: string
}

// ─── CONSTANTES ──────────────────────────────────────────────────────────────
const STAGES_CONFIG: Record<StageKey, {
  label: string; descricao: string; cor: string; icone: string
  checklist: { key: string; label: string }[]
}> = {
  warmup_pairing:              { label: "Aquecimento & Vínculo",    descricao: "Reduza exigências e estabeleça vínculo.", cor: "#1D9E75", icone: "🤝", checklist: [{ key: "aceitou_entrar", label: "Aceitou entrar?" }, { key: "aproximou", label: "Aproximou-se?" }, { key: "interesse", label: "Demonstrou interesse?" }, { key: "sem_desconforto", label: "Sem sinais de desconforto?" }] },
  assent_checklist:            { label: "Assentimento",             descricao: "Verifique aceitação antes de aumentar demandas.", cor: "#378ADD", icone: "✅", checklist: [{ key: "aceitou_interacao", label: "Aceitou interação?" }, { key: "permaneceu", label: "Permaneceu próxima?" }, { key: "escolheu_atividade", label: "Escolheu atividade?" }, { key: "sem_recusa", label: "Sem recusa ativa?" }, { key: "sem_distress", label: "Sem sinais de angústia?" }] },
  preference_assessment:       { label: "Análise de Preferências",  descricao: "Identifique reforçadores efetivos.", cor: "#EF9F27", icone: "⭐", checklist: [{ key: "reforcos", label: "Reforçadores identificados?" }, { key: "alta_pref", label: "1 item de alta preferência?" }, { key: "hierarquia", label: "Hierarquia definida?" }] },
  initial_functional_analysis: { label: "Análise Funcional",        descricao: "Observe padrões antes de iniciar programas.", cor: "#8B7FE8", icone: "🔍", checklist: [{ key: "comportamentos", label: "Comportamentos-alvo observados?" }, { key: "antecedentes", label: "Antecedentes identificados?" }, { key: "hipotese", label: "Hipótese de função definida?" }] },
  clinical_actions:            { label: "Ações Clínicas",           descricao: "Execute avaliações ou programas.", cor: "#23c48f", icone: "🎯", checklist: [] },
  break:                       { label: "Pausa / Intervalo",        descricao: "Descanso e observação passiva.", cor: "#4d6d8a", icone: "⏸", checklist: [{ key: "recuperou", label: "Recuperou assentimento?" }, { key: "pronta", label: "Sinaliza estar pronta para retomar?" }] },
  closing_preparation:         { label: "Encerramento",             descricao: "Prepare a transição e finalize.", cor: "#E05A4B", icone: "🏁", checklist: [{ key: "transicao", label: "Transição comunicada?" }, { key: "reforco_final", label: "Reforço de alta qualidade oferecido?" }, { key: "obs_registradas", label: "Observações registradas?" }] },
}

const STAGE_KEYS: StageKey[] = ["warmup_pairing", "assent_checklist", "preference_assessment", "initial_functional_analysis", "clinical_actions", "break", "closing_preparation"]

const MODO_CONFIG: Record<Senioridade, { label: string; cor: string; podePular: boolean; mostrarDicas: boolean }> = {
  terapeuta:   { label: "Modo Guiado",      cor: "#1D9E75", podePular: false, mostrarDicas: true  },
  coordenador: { label: "Modo Semi-guiado", cor: "#EF9F27", podePular: true,  mostrarDicas: true  },
  supervisor:  { label: "Modo Livre",       cor: "#8B7FE8", podePular: true,  mostrarDicas: false },
}

const EVENT_CFG: Record<EventType, { label: string; cor: string; icone: string }> = {
  assent_given:          { label: "Assentimento dado",       cor: "#1D9E75", icone: "✓" },
  assent_revoked:        { label: "Assentimento revogado",   cor: "#E05A4B", icone: "✗" },
  assent_recovered:      { label: "Assentimento recuperado", cor: "#1D9E75", icone: "↺" },
  preference_selected:   { label: "Preferência selecionada", cor: "#EF9F27", icone: "⭐" },
  avoidance_signal:      { label: "Sinal de esquiva",        cor: "#EF9F27", icone: "!" },
  distress_signal:       { label: "Sinal de desconforto",    cor: "#E05A4B", icone: "⚠" },
  break_requested:       { label: "Pausa solicitada",        cor: "#4d6d8a", icone: "⏸" },
  transition_difficulty: { label: "Dificuldade de transição",cor: "#EF9F27", icone: "↔" },
  session_paused:        { label: "Sessão pausada",          cor: "#4d6d8a", icone: "⏸" },
  session_resumed:       { label: "Sessão retomada",         cor: "#1D9E75", icone: "▶" },
  program_completed:     { label: "Programa concluído",      cor: "#1D9E75", icone: "✓" },
  program_skipped:       { label: "Programa pulado",         cor: "#4d6d8a", icone: "→" },
}

const PROMPT_LABELS: Record<PromptLevel, string> = {
  independente: "Independente", gestual: "Gestual", modelo: "Modelo",
  fisico_parcial: "Físico parcial", fisico_total: "Físico total",
}

const AVALIACOES_CATALOGO = [
  { id: "vbmapp", nome: "VB-MAPP", dominio: "Comportamento verbal" },
  { id: "peak",   nome: "PEAK",    dominio: "Equivalência de estímulos" },
  { id: "ablls",  nome: "ABLLS-R", dominio: "Linguagem e aprendizagem" },
]

function fmt(s: number) { return `${Math.floor(s/60).toString().padStart(2,"0")}:${(s%60).toString().padStart(2,"0")}` }
function uid() { return Math.random().toString(36).slice(2,9) }
function iniciais(nome: string) { const p = nome.trim().split(" "); return p.length>=2?`${p[0][0]}${p[p.length-1][0]}`.toUpperCase():nome.slice(0,2).toUpperCase() }

// ─── COMPONENTE ───────────────────────────────────────────────────────────────
function SessaoInner() {
  const { terapeuta } = useClinicContext()
  const searchParams  = useSearchParams()
  const router        = useRouter()
  const pacienteId    = searchParams.get("pacienteId")
  const nivel: Senioridade = (terapeuta?.nivel as Senioridade) ?? "coordenador"
  const modo = MODO_CONFIG[nivel]

  // Estado sessão
  const [sessaoDbId,  setSessaoDbId]  = useState<string|null>(null)
  const [fase,        setFase]        = useState<"preparacao"|"sessao"|"encerramento">("preparacao")
  const [paciente,    setPaciente]    = useState<{id:string;nome:string;iniciais:string;gradient:string;diagnostico:string}|null>(null)
  const [loading,     setLoading]     = useState(true)

  // Estágios
  const [stages, setStages] = useState<Stage[]>(
    STAGE_KEYS.map((key, i) => ({
      key, label: STAGES_CONFIG[key].label, status: "pending" as StageStatus,
      checklist: Object.fromEntries(STAGES_CONFIG[key].checklist.map(c => [c.key, false])),
      notas: "", aberto: i === 0,
    }))
  )
  const stageAtualIdx = stages.findIndex(s => s.status === "active") ?? 0

  // Ações e operantes
  const [acoes,       setAcoes]       = useState<Acao[]>([])
  const [acaoAtiva,   setAcaoAtiva]   = useState<Acao|null>(null)
  const [opForm,      setOpForm]      = useState<{sd:string;correto:boolean|null;prompt:PromptLevel}>({sd:"",correto:null,prompt:"independente"})

  // Eventos
  const [eventos,     setEventos]     = useState<EventoSessao[]>([])

  // Biblioteca
  const [biblioteca,  setBiblioteca]  = useState<LibItem[]>([])
  const [libTab,      setLibTab]      = useState<LibTab>("planejado")
  const [libBusca,    setLibBusca]    = useState("")
  const [dragOver,    setDragOver]    = useState(false)

  // Timer
  const [segundos,    setSegundos]    = useState(0)
  const [emPausa,     setEmPausa]     = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval>|null>(null)

  // ── Carregar dados ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!pacienteId) return
    async function carregar() {
      setLoading(true)
      const { data: crianca } = await supabase.from("criancas").select("id,nome,diagnostico").eq("id", pacienteId).single()
      if (crianca) setPaciente({ id: crianca.id, nome: crianca.nome, iniciais: iniciais(crianca.nome), gradient: "linear-gradient(135deg,#1D9E75,#378ADD)", diagnostico: crianca.diagnostico ?? "Não informado" })

      // Programas planejados
      const { data: planos } = await supabase.from("planos").select("id, programas(id,nome,dominio,objetivo)").eq("crianca_id", pacienteId).eq("status", "ativo")
      const planejados: LibItem[] = []
      if (planos) {
        for (const pl of planos) {
          const prog = (pl as any).programas
          if (!prog) continue
          // Buscar histórico de sessões para taxa
          const { data: ops } = await supabase.from("operants").select("correto").eq("action_id", pl.id).limit(50)
          const taxa = ops && ops.length > 0 ? Math.round((ops.filter((o:any) => o.correto).length / ops.length) * 100) : undefined
          planejados.push({ id: prog.id, nome: prog.nome, dominio: prog.dominio ?? "—", tipo: "programa", planejado: true, planoId: pl.id, taxaHistorica: taxa })
        }
      }

      // Programas do catálogo geral
      const { data: todosProgramas } = await supabase.from("programas").select("id,nome,dominio").limit(30)
      const libGeral: LibItem[] = (todosProgramas ?? [])
        .filter(p => !planejados.find(pl => pl.id === p.id))
        .map(p => ({ id: p.id, nome: p.nome, dominio: p.dominio ?? "—", tipo: "programa" as const, planejado: false }))

      // Avaliações do catálogo
      const libAvals: LibItem[] = AVALIACOES_CATALOGO.map(a => ({ ...a, tipo: "avaliacao" as const, planejado: false }))

      setBiblioteca([...planejados, ...libGeral, ...libAvals])
      setLoading(false)
    }
    carregar()
  }, [pacienteId])

  // ── Timer ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (fase !== "sessao" || emPausa) return
    timerRef.current = setInterval(() => setSegundos(s => s+1), 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [fase, emPausa])

  // ── Iniciar sessão ─────────────────────────────────────────────────────────
  async function iniciarSessao() {
    if (!paciente || !terapeuta) return
    const { data } = await supabase.from("sessoes_v2").insert({ crianca_id: paciente.id, terapeuta_id: terapeuta.id, status: "ativa", inicio: new Date().toISOString() }).select("id").single()
    if (data) {
      setSessaoDbId(data.id)
      for (const st of stages) {
        const { data: stDb } = await supabase.from("session_stages").insert({ sessao_id: data.id, stage: st.key, status: "pending" }).select("id").single()
        if (stDb) setStages(prev => prev.map(s => s.key === st.key ? { ...s, dbId: stDb.id } : s))
      }
    }
    setStages(prev => prev.map((s,i) => i===0 ? {...s, status:"active", aberto:true} : s))
    setFase("sessao")
    registrarEvento("assent_given")
  }

  // ── Toggle estágio ─────────────────────────────────────────────────────────
  function toggleStage(idx: number) {
    setStages(prev => prev.map((s,i) => ({ ...s, aberto: i===idx ? !s.aberto : s.aberto })))
  }

  // ── Avançar estágio ────────────────────────────────────────────────────────
  async function avancarStage(idx: number, pular=false) {
    const stage = stages[idx]
    setStages(prev => prev.map((s,i) => {
      if (i === idx) return { ...s, status: pular ? "skipped" : "completed", aberto: false }
      if (i === idx+1) return { ...s, status: "active", aberto: true }
      return s
    }))
    if (stage.dbId) await supabase.from("session_stages").update({ status: pular?"skipped":"completed", concluido_em: new Date().toISOString(), checklist: stage.checklist, notas: stage.notas||null }).eq("id", stage.dbId)
    if (idx === stages.length-1) encerrarSessao()
  }

  // ── Checklist ──────────────────────────────────────────────────────────────
  function toggleCheck(stageIdx: number, key: string) {
    setStages(prev => prev.map((s,i) => i===stageIdx ? {...s, checklist:{...s.checklist,[key]:!s.checklist[key]}} : s))
  }

  // ── Adicionar ação ─────────────────────────────────────────────────────────
  async function adicionarAcao(item: LibItem) {
    const novaAcao: Acao = {
      id: uid(), tipo: item.tipo==="avaliacao"?"assessment":"intervention",
      itemId: item.id, itemNome: item.nome, itemDominio: item.dominio,
      status: "active", operantes: [], taxaHistorica: item.taxaHistorica,
    }
    if (sessaoDbId) {
      const stAtual = stages.find(s => s.status==="active")
      const { data: acDb } = await supabase.from("session_actions").insert({
        sessao_id: sessaoDbId, stage_id: stAtual?.dbId??null,
        tipo: novaAcao.tipo, programa_id: item.tipo==="programa"?item.id:null,
        plano_id: item.planoId??null, status:"active", iniciado_em: new Date().toISOString(),
      }).select("id").single()
      if (acDb) novaAcao.dbId = acDb.id
    }
    setAcoes(prev => [...prev, novaAcao])
    setAcaoAtiva(novaAcao)
  }

  // ── Registrar operante ─────────────────────────────────────────────────────
  async function registrarOperante() {
    if (!acaoAtiva || opForm.correto===null) return
    const op: Operante = { id: uid(), sd: opForm.sd, correto: opForm.correto, promptLevel: opForm.prompt, ts: Date.now() }
    if (sessaoDbId && acaoAtiva.dbId) {
      await supabase.from("operants").insert({ sessao_id: sessaoDbId, action_id: acaoAtiva.dbId, sd: op.sd||null, correto: op.correto, prompt_level: op.promptLevel, tipo: "tentativa" })
    }
    const atualizada = { ...acaoAtiva, operantes: [...acaoAtiva.operantes, op] }
    setAcaoAtiva(atualizada)
    setAcoes(prev => prev.map(a => a.id===acaoAtiva.id ? atualizada : a))
    setOpForm(p => ({...p, correto:null, sd:""}))
  }

  // ── Registrar evento ───────────────────────────────────────────────────────
  async function registrarEvento(tipo: EventType, intensidade?: "low"|"medium"|"high") {
    const ev: EventoSessao = { id: uid(), tipo, timestamp: Date.now(), intensidade }
    setEventos(prev => [ev, ...prev])
    if (sessaoDbId) {
      const stAtual = stages.find(s => s.status==="active")
      await supabase.from("session_events").insert({ sessao_id: sessaoDbId, stage_id: stAtual?.dbId??null, action_id: acaoAtiva?.dbId??null, tipo, intensidade: intensidade??null, timestamp: new Date().toISOString() })
    }
  }

  // ── Pausa ─────────────────────────────────────────────────────────────────
  function togglePausa() {
    if (emPausa) { setEmPausa(false); registrarEvento("session_resumed") }
    else { setEmPausa(true); registrarEvento("session_paused") }
  }

  // ── Encerrar ──────────────────────────────────────────────────────────────
  async function encerrarSessao() {
    if (sessaoDbId) await supabase.from("sessoes_v2").update({ status:"finalizada", fim: new Date().toISOString(), duracao_segundos: segundos }).eq("id", sessaoDbId)
    setFase("encerramento")
  }

  // ── Biblioteca filtrada ────────────────────────────────────────────────────
  const libFiltrada = biblioteca.filter(item => {
    if (libTab === "planejado") return item.planejado
    if (libTab === "programas") return item.tipo === "programa"
    if (libTab === "avaliacoes") return item.tipo === "avaliacao"
    return true
  }).filter(item => item.nome.toLowerCase().includes(libBusca.toLowerCase()))

  // ── CSS base ───────────────────────────────────────────────────────────────
  const card: React.CSSProperties = { background: "rgba(13,32,53,.85)", border: "1px solid rgba(26,58,92,.6)", borderRadius: 14 }

  if (loading) return <div style={{ minHeight:"100vh", background:"#07111f", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"var(--font-sans)" }}><div style={{ fontSize:13, color:"rgba(160,200,235,.6)" }}>Carregando sessão...</div></div>

  // ══════════════════════════════════════════════════════════════════════════
  // PREPARAÇÃO
  // ══════════════════════════════════════════════════════════════════════════
  if (fase === "preparacao") return (
    <div style={{ minHeight:"100vh", background:"#07111f", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"var(--font-sans)", padding:24 }}>
      <div style={{ width:"100%", maxWidth:520, display:"flex", flexDirection:"column", gap:14 }}>
        <div style={{ textAlign:"center", marginBottom:8 }}>
          <div style={{ fontSize:11, color:`${modo.cor}`, fontWeight:700, textTransform:"uppercase", letterSpacing:".1em", marginBottom:8 }}>{modo.label} · {nivel}</div>
          <h1 style={{ fontSize:"1.4rem", fontWeight:800, color:"#e8f0f8", margin:0, marginBottom:12 }}>Nova Sessão Clínica</h1>
          {paciente ? (
            <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:10 }}>
              <div style={{ width:40, height:40, borderRadius:"50%", background:paciente.gradient, display:"flex", alignItems:"center", justifyContent:"center", fontSize:".7rem", fontWeight:800, color:"#fff" }}>{paciente.iniciais}</div>
              <div style={{ textAlign:"left" }}>
                <div style={{ fontSize:"1rem", fontWeight:700, color:"#e8f0f8" }}>{paciente.nome}</div>
                <div style={{ fontSize:".72rem", color:"rgba(160,200,235,.5)" }}>{paciente.diagnostico}</div>
              </div>
            </div>
          ) : <div style={{ fontSize:".8rem", color:"rgba(160,200,235,.3)" }}>Nenhum paciente selecionado</div>}
        </div>

        <div style={{ ...card, padding:18 }}>
          <div style={{ fontSize:".7rem", color:"rgba(170,210,245,.6)", textTransform:"uppercase", letterSpacing:".08em", marginBottom:12 }}>Roteiro clínico — 7 estágios</div>
          {STAGE_KEYS.map((key, i) => {
            const cfg = STAGES_CONFIG[key]
            return (
              <div key={key} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 0", borderBottom: i<6?"1px solid rgba(26,58,92,.2)":"none" }}>
                <span style={{ fontSize:".9rem" }}>{cfg.icone}</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:".78rem", fontWeight:600, color:"#e8f0f8" }}>{cfg.label}</div>
                  {modo.mostrarDicas && <div style={{ fontSize:".65rem", color:"rgba(160,200,235,.4)" }}>{cfg.descricao}</div>}
                </div>
                {["preference_assessment","initial_functional_analysis","break"].includes(key) && (
                  <span style={{ fontSize:".6rem", color:"rgba(160,200,235,.3)", background:"rgba(26,58,92,.4)", borderRadius:20, padding:"2px 8px" }}>opcional</span>
                )}
              </div>
            )
          })}
        </div>

        {biblioteca.filter(b => b.planejado).length > 0 && (
          <div style={{ ...card, padding:14 }}>
            <div style={{ fontSize:".7rem", color:"rgba(170,210,245,.6)", marginBottom:8 }}>{biblioteca.filter(b=>b.planejado).length} programa(s) planejado(s)</div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
              {biblioteca.filter(b => b.planejado).map(p => (
                <span key={p.id} style={{ fontSize:".7rem", padding:"3px 10px", borderRadius:20, background:"rgba(29,158,117,.1)", border:"1px solid rgba(29,158,117,.2)", color:"#1D9E75" }}>{p.nome}</span>
              ))}
            </div>
          </div>
        )}

        <button onClick={iniciarSessao} disabled={!paciente} style={{ padding:14, borderRadius:12, border:"none", background:paciente?"linear-gradient(135deg,#1D9E75,#0f8f7a)":"rgba(26,58,92,.4)", color:paciente?"#07111f":"rgba(160,200,235,.3)", fontWeight:800, fontSize:".95rem", cursor:paciente?"pointer":"not-allowed", fontFamily:"var(--font-sans)" }}>
          Iniciar sessão clínica →
        </button>
      </div>
    </div>
  )

  // ══════════════════════════════════════════════════════════════════════════
  // SESSÃO ATIVA
  // ══════════════════════════════════════════════════════════════════════════
  if (fase === "sessao") {
    const stageAtual = stages.find(s => s.status==="active") ?? stages[0]
    const stageIdx   = stages.findIndex(s => s.key===stageAtual.key)
    const stageCfg   = STAGES_CONFIG[stageAtual.key]
    const checkOk    = stageCfg.checklist.length===0 || Object.values(stageAtual.checklist).every(v=>v)

    return (
      <div style={{ minHeight:"100vh", background:"#07111f", fontFamily:"var(--font-sans)", display:"flex", flexDirection:"column" }}>

        {/* ── TOPBAR ── */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 20px", background:"rgba(7,17,31,.9)", borderBottom:"1px solid rgba(26,58,92,.4)", backdropFilter:"blur(10px)", position:"sticky", top:0, zIndex:20 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            {paciente && <>
              <div style={{ width:30, height:30, borderRadius:"50%", background:paciente.gradient, display:"flex", alignItems:"center", justifyContent:"center", fontSize:".6rem", fontWeight:800, color:"#fff" }}>{paciente.iniciais}</div>
              <div>
                <div style={{ fontSize:".82rem", fontWeight:700, color:"#e8f0f8" }}>{paciente.nome}</div>
                <div style={{ fontSize:".62rem", color:`${stageCfg.cor}` }}>{stageCfg.icone} {stageCfg.label}</div>
              </div>
            </>}
          </div>
          <div style={{ textAlign:"center" }}>
            <div style={{ fontSize:"1.5rem", fontWeight:800, color:emPausa?"#EF9F27":"#1D9E75", fontFamily:"monospace" }}>{fmt(segundos)}</div>
            <div style={{ fontSize:".6rem", color:"rgba(160,200,235,.4)", textTransform:"uppercase", letterSpacing:".08em" }}>{emPausa?"pausada":"em andamento"}</div>
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <button onClick={togglePausa} style={{ padding:"6px 14px", borderRadius:8, border:`1px solid ${emPausa?"rgba(29,158,117,.3)":"rgba(239,159,39,.3)"}`, background:emPausa?"rgba(29,158,117,.1)":"rgba(239,159,39,.1)", color:emPausa?"#1D9E75":"#EF9F27", fontSize:".72rem", fontWeight:600, cursor:"pointer", fontFamily:"var(--font-sans)" }}>
              {emPausa?"▶ Retomar":"⏸ Pausar"}
            </button>
            <button onClick={encerrarSessao} style={{ padding:"6px 14px", borderRadius:8, border:"1px solid rgba(224,90,75,.3)", background:"rgba(224,90,75,.08)", color:"#E05A4B", fontSize:".72rem", fontWeight:600, cursor:"pointer", fontFamily:"var(--font-sans)" }}>
              Encerrar
            </button>
          </div>
        </div>

        {/* ── CORPO ── */}
        <div style={{ flex:1, display:"grid", gridTemplateColumns:"1fr 300px", gap:0, overflow:"hidden" }}>

          {/* ─ CENTRO ─ */}
          <div style={{ overflowY:"auto", padding:"16px 20px", display:"flex", flexDirection:"column", gap:12 }}>

            {/* Progresso dos estágios */}
            <div style={{ display:"flex", gap:4, marginBottom:4 }}>
              {stages.map((st, i) => {
                const cfg = STAGES_CONFIG[st.key]
                const concluido = st.status==="completed"||st.status==="skipped"
                const ativo = st.status==="active"
                return (
                  <div key={st.key} title={cfg.label} style={{ flex:1, height:3, borderRadius:2, background:concluido?cfg.cor:ativo?`${cfg.cor}55`:"rgba(26,58,92,.4)", transition:"background .3s" }} />
                )
              })}
            </div>

            {/* Estágios — accordion dinâmico */}
            {stages.map((st, i) => {
              const cfg = STAGES_CONFIG[st.key]
              const concluido = st.status==="completed"||st.status==="skipped"
              const ativo = st.status==="active"
              const pendente = st.status==="pending"
              if (!ativo && !concluido && cfg.checklist.length > 0) return null // esconde futuros com checklist

              return (
                <div key={st.key} style={{ ...card, border:`1px solid ${ativo?`${cfg.cor}33`:concluido?"rgba(29,158,117,.15)":"rgba(26,58,92,.4)"}`, overflow:"hidden" }}>
                  {/* Header do estágio */}
                  <button
                    onClick={() => toggleStage(i)}
                    style={{ display:"flex", alignItems:"center", gap:10, width:"100%", padding:"12px 16px", background:"transparent", border:"none", cursor:"pointer", fontFamily:"var(--font-sans)", textAlign:"left" }}
                  >
                    <div style={{ width:24, height:24, borderRadius:"50%", background:concluido?cfg.cor:ativo?`${cfg.cor}22`:"rgba(26,58,92,.4)", border:`2px solid ${concluido?cfg.cor:ativo?cfg.cor:"rgba(26,58,92,.5)"}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:".65rem", color:concluido?"#fff":ativo?cfg.cor:"rgba(160,200,235,.3)", flexShrink:0 }}>
                      {concluido?"✓":cfg.icone}
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:".82rem", fontWeight:600, color:ativo?"#e8f0f8":concluido?"rgba(160,200,235,.5)":"rgba(160,200,235,.3)" }}>{cfg.label}</div>
                      {ativo && cfg.checklist.length>0 && (
                        <div style={{ fontSize:".65rem", color:"rgba(160,200,235,.4)", marginTop:2 }}>
                          {Object.values(st.checklist).filter(v=>v).length}/{cfg.checklist.length} itens
                        </div>
                      )}
                    </div>
                    {ativo && cfg.checklist.length>0 && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(160,200,235,.4)" strokeWidth="2" style={{ transform:st.aberto?"rotate(180deg)":"rotate(0)", transition:"transform .2s" }}><polyline points="6 9 12 15 18 9"/></svg>
                    )}
                    {ativo && <span style={{ fontSize:".62rem", color:cfg.cor, background:`${cfg.cor}15`, border:`1px solid ${cfg.cor}33`, borderRadius:20, padding:"2px 8px", fontWeight:700 }}>ativo</span>}
                    {concluido && st.status==="skipped" && <span style={{ fontSize:".6rem", color:"rgba(160,200,235,.3)" }}>pulado</span>}
                  </button>

                  {/* Checklist expandível */}
                  {ativo && st.aberto && cfg.checklist.length>0 && (
                    <div style={{ padding:"0 16px 14px" }}>
                      {cfg.checklist.map(item => (
                        <button key={item.key} onClick={() => toggleCheck(i, item.key)} style={{ display:"flex", alignItems:"center", gap:8, width:"100%", padding:"8px 10px", borderRadius:8, marginBottom:5, background:st.checklist[item.key]?"rgba(29,158,117,.08)":"rgba(26,58,92,.15)", border:`1px solid ${st.checklist[item.key]?"rgba(29,158,117,.25)":"rgba(26,58,92,.3)"}`, cursor:"pointer", fontFamily:"var(--font-sans)", textAlign:"left" }}>
                          <div style={{ width:16, height:16, borderRadius:4, flexShrink:0, background:st.checklist[item.key]?"#1D9E75":"transparent", border:`2px solid ${st.checklist[item.key]?"#1D9E75":"rgba(26,58,92,.6)"}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:".6rem", color:"#fff" }}>
                            {st.checklist[item.key]?"✓":""}
                          </div>
                          <span style={{ fontSize:".75rem", color:st.checklist[item.key]?"#1D9E75":"rgba(160,200,235,.7)" }}>{item.label}</span>
                        </button>
                      ))}
                      <textarea value={st.notas} onChange={e => setStages(prev => prev.map((s,idx) => idx===i?{...s,notas:e.target.value}:s))} placeholder="Observações..." rows={2} style={{ width:"100%", marginTop:6, padding:"7px 10px", borderRadius:8, border:"1px solid rgba(26,58,92,.4)", background:"rgba(13,32,53,.5)", color:"#e8f0f8", fontSize:".72rem", fontFamily:"var(--font-sans)", resize:"none", outline:"none", boxSizing:"border-box" as const }} />
                      <div style={{ display:"flex", gap:8, marginTop:10 }}>
                        {modo.podePular && (
                          <button onClick={() => avancarStage(i, true)} style={{ padding:"7px 14px", borderRadius:8, border:"1px solid rgba(26,58,92,.5)", background:"transparent", color:"rgba(160,200,235,.4)", fontSize:".72rem", cursor:"pointer", fontFamily:"var(--font-sans)" }}>Pular →</button>
                        )}
                        <button onClick={() => avancarStage(i)} disabled={!checkOk&&!modo.podePular} style={{ flex:1, padding:"8px", borderRadius:8, border:"none", background:(checkOk||modo.podePular)?`linear-gradient(135deg,${cfg.cor},${cfg.cor}99)`:"rgba(26,58,92,.4)", color:(checkOk||modo.podePular)?"#07111f":"rgba(160,200,235,.3)", fontWeight:700, fontSize:".78rem", cursor:"pointer", fontFamily:"var(--font-sans)" }}>
                          {i===stages.length-1?"Finalizar sessão":`Próximo: ${STAGES_CONFIG[stages[Math.min(i+1,stages.length-1)].key].label} →`}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Botão avançar para estágios sem checklist */}
                  {ativo && cfg.checklist.length===0 && (
                    <div style={{ padding:"0 16px 14px", display:"flex", gap:8 }}>
                      {modo.podePular && (
                        <button onClick={() => avancarStage(i, true)} style={{ padding:"7px 14px", borderRadius:8, border:"1px solid rgba(26,58,92,.5)", background:"transparent", color:"rgba(160,200,235,.4)", fontSize:".72rem", cursor:"pointer", fontFamily:"var(--font-sans)" }}>Pular →</button>
                      )}
                      <button onClick={() => avancarStage(i)} style={{ flex:1, padding:"8px", borderRadius:8, border:"none", background:`linear-gradient(135deg,${cfg.cor},${cfg.cor}99)`, color:"#07111f", fontWeight:700, fontSize:".78rem", cursor:"pointer", fontFamily:"var(--font-sans)" }}>
                        {i===stages.length-1?"Finalizar sessão":`Próximo: ${STAGES_CONFIG[stages[Math.min(i+1,stages.length-1)].key].label} →`}
                      </button>
                    </div>
                  )}
                </div>
              )
            })}

            {/* ── ÁREA DE AÇÕES — sempre visível ── */}
            <div style={{ ...card, padding:0, overflow:"hidden" }}>
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => {
                  e.preventDefault(); setDragOver(false)
                  const itemId = e.dataTransfer.getData("libItemId")
                  const item = biblioteca.find(b => b.id===itemId)
                  if (item) adicionarAcao(item)
                }}
                style={{ padding:"12px 16px", borderBottom:"1px solid rgba(26,58,92,.3)", background:dragOver?"rgba(29,158,117,.05)":"transparent", border:dragOver?"2px dashed rgba(29,158,117,.4)":"none", borderRadius:dragOver?12:0, transition:"all .15s" }}
              >
                <div style={{ fontSize:".7rem", color:"rgba(170,210,245,.5)", textAlign:"center" }}>
                  {acoes.length===0?"Arraste um programa ou avaliação aqui, ou clique em + na biblioteca →":""}
                </div>
              </div>

              {acoes.map(acao => {
                const isAtiva  = acaoAtiva?.id===acao.id
                const acertos  = acao.operantes.filter(o=>o.correto).length
                const total    = acao.operantes.length
                const taxa     = total>0?Math.round((acertos/total)*100):null
                return (
                  <div key={acao.id} style={{ borderBottom:"1px solid rgba(26,58,92,.25)" }}>
                    <button onClick={() => setAcaoAtiva(isAtiva?null:acao)} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", width:"100%", padding:"12px 16px", background:"transparent", border:"none", cursor:"pointer", fontFamily:"var(--font-sans)", textAlign:"left" }}>
                      <div>
                        <div style={{ fontSize:".82rem", fontWeight:700, color:"#e8f0f8" }}>{acao.itemNome}</div>
                        <div style={{ fontSize:".65rem", color:"rgba(160,200,235,.4)" }}>
                          {acao.tipo==="intervention"?"Intervenção":"Avaliação"} · {total} operantes
                          {acao.taxaHistorica!==undefined && <span style={{ marginLeft:8, color:"#8B7FE8" }}>hist: {acao.taxaHistorica}%</span>}
                        </div>
                      </div>
                      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                        {total>0 && <div style={{ display:"flex", gap:3 }}>
                          {acao.operantes.slice(-8).map(op => (
                            <div key={op.id} style={{ width:10, height:10, borderRadius:2, background:op.correto?"#1D9E75":"#E05A4B", opacity:.8 }} />
                          ))}
                        </div>}
                        <div style={{ fontSize:"1rem", fontWeight:800, color:taxa===null?"rgba(160,200,235,.3)":taxa>=80?"#1D9E75":taxa>=50?"#EF9F27":"#E05A4B" }}>{taxa===null?"—":`${taxa}%`}</div>
                      </div>
                    </button>

                    {isAtiva && (
                      <div style={{ padding:"0 16px 16px" }}>
                        <input value={opForm.sd} onChange={e => setOpForm(p=>({...p,sd:e.target.value}))} placeholder="SD / estímulo (opcional)" style={{ width:"100%", padding:"8px 10px", borderRadius:8, border:"1px solid rgba(26,58,92,.4)", background:"rgba(13,32,53,.5)", color:"#e8f0f8", fontSize:".75rem", fontFamily:"var(--font-sans)", outline:"none", boxSizing:"border-box" as const, marginBottom:10 }} />

                        <div style={{ display:"flex", gap:8, marginBottom:10 }}>
                          {[{val:true,label:"✓ Correto",cor:"#1D9E75"},{val:false,label:"✗ Incorreto",cor:"#E05A4B"}].map(r => (
                            <button key={String(r.val)} onClick={() => setOpForm(p=>({...p,correto:r.val}))} style={{ flex:1, padding:"10px", borderRadius:9, cursor:"pointer", fontFamily:"var(--font-sans)", fontWeight:700, fontSize:".82rem", border:`1px solid ${opForm.correto===r.val?r.cor:"rgba(26,58,92,.4)"}`, background:opForm.correto===r.val?`${r.cor}22`:"transparent", color:opForm.correto===r.val?r.cor:"rgba(160,200,235,.5)" }}>
                              {r.label}
                            </button>
                          ))}
                        </div>

                        <div style={{ display:"flex", flexWrap:"wrap", gap:5, marginBottom:10 }}>
                          {(Object.entries(PROMPT_LABELS) as [PromptLevel,string][]).map(([key,label]) => (
                            <button key={key} onClick={() => setOpForm(p=>({...p,prompt:key}))} style={{ padding:"4px 10px", borderRadius:20, cursor:"pointer", fontFamily:"var(--font-sans)", fontSize:".68rem", border:`1px solid ${opForm.prompt===key?"#378ADD55":"rgba(26,58,92,.4)"}`, background:opForm.prompt===key?"rgba(55,138,221,.15)":"transparent", color:opForm.prompt===key?"#378ADD":"rgba(160,200,235,.5)" }}>
                              {label}
                            </button>
                          ))}
                        </div>

                        <button onClick={registrarOperante} disabled={opForm.correto===null} style={{ width:"100%", padding:"10px", borderRadius:9, border:"none", background:opForm.correto!==null?"linear-gradient(135deg,#1D9E75,#0f8f7a)":"rgba(26,58,92,.4)", color:opForm.correto!==null?"#07111f":"rgba(160,200,235,.3)", fontWeight:700, fontSize:".82rem", cursor:opForm.correto!==null?"pointer":"not-allowed", fontFamily:"var(--font-sans)" }}>
                          Registrar operante
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* ─ LATERAL DIREITA ─ */}
          <div style={{ borderLeft:"1px solid rgba(26,58,92,.4)", display:"flex", flexDirection:"column", background:"rgba(7,17,31,.5)", overflow:"hidden" }}>

            {/* Tabs da biblioteca */}
            <div style={{ display:"flex", borderBottom:"1px solid rgba(26,58,92,.4)" }}>
              {([["planejado","Planejado"],["programas","Programas"],["avaliacoes","Avaliações"]] as [LibTab,string][]).map(([id,label]) => (
                <button key={id} onClick={() => setLibTab(id)} style={{ flex:1, padding:"8px 4px", background:"none", border:"none", borderBottom:`2px solid ${libTab===id?"#1D9E75":"transparent"}`, color:libTab===id?"#1D9E75":"rgba(160,200,235,.5)", fontSize:".65rem", fontWeight:libTab===id?700:400, cursor:"pointer", fontFamily:"var(--font-sans)" }}>
                  {label}
                </button>
              ))}
            </div>

            {/* Busca */}
            <div style={{ padding:"8px 10px", borderBottom:"1px solid rgba(26,58,92,.25)" }}>
              <input value={libBusca} onChange={e => setLibBusca(e.target.value)} placeholder="Buscar..." style={{ width:"100%", padding:"6px 10px", borderRadius:8, border:"1px solid rgba(26,58,92,.4)", background:"rgba(13,32,53,.6)", color:"#e8f0f8", fontSize:".72rem", fontFamily:"var(--font-sans)", outline:"none", boxSizing:"border-box" as const }} />
            </div>

            {/* Lista da biblioteca */}
            <div style={{ flex:1, overflowY:"auto", padding:"8px" }}>
              {libFiltrada.length===0 && (
                <div style={{ fontSize:".72rem", color:"rgba(160,200,235,.3)", textAlign:"center", padding:"20px 0" }}>
                  {libTab==="planejado"?"Nenhum programa planejado para esta sessão":"Nenhum item encontrado"}
                </div>
              )}
              {libFiltrada.map(item => (
                <div
                  key={item.id}
                  draggable
                  onDragStart={e => e.dataTransfer.setData("libItemId", item.id)}
                  style={{ padding:"9px 10px", borderRadius:9, background:"rgba(26,58,92,.2)", border:`1px solid ${item.planejado?"rgba(29,158,117,.2)":"rgba(26,58,92,.35)"}`, marginBottom:6, cursor:"grab" }}
                >
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:3 }}>
                    <div style={{ fontSize:".75rem", fontWeight:600, color:"#e8f0f8" }}>{item.nome}</div>
                    <button onClick={() => adicionarAcao(item)} style={{ width:20, height:20, borderRadius:"50%", border:"1px solid rgba(29,158,117,.3)", background:"rgba(29,158,117,.1)", color:"#1D9E75", fontSize:".8rem", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>+</button>
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                    <span style={{ fontSize:".62rem", color:"rgba(160,200,235,.4)" }}>{item.dominio}</span>
                    {item.planejado && <span style={{ fontSize:".58rem", color:"#1D9E75", background:"rgba(29,158,117,.1)", borderRadius:20, padding:"1px 6px" }}>planejado</span>}
                    {item.tipo==="avaliacao" && <span style={{ fontSize:".58rem", color:"#8B7FE8", background:"rgba(139,127,232,.1)", borderRadius:20, padding:"1px 6px" }}>avaliação</span>}
                    {item.taxaHistorica!==undefined && <span style={{ fontSize:".6rem", color:"#EF9F27", marginLeft:"auto" }}>{item.taxaHistorica}%</span>}
                  </div>
                </div>
              ))}
            </div>

            {/* Registrar evento rápido */}
            <div style={{ borderTop:"1px solid rgba(26,58,92,.4)", padding:"10px" }}>
              <div style={{ fontSize:".6rem", color:"rgba(160,200,235,.35)", textTransform:"uppercase", letterSpacing:".08em", marginBottom:8 }}>Evento rápido</div>
              <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                {([
                  ["assent_revoked",  "Assentimento revogado","medium"],
                  ["avoidance_signal","Sinal de esquiva",      "low"  ],
                  ["distress_signal", "Desconforto",           "medium"],
                  ["break_requested", "Pausa",                 "low"  ],
                  ["assent_recovered","Assentimento recuperado","low" ],
                ] as [EventType,string,"low"|"medium"|"high"][]).map(([tipo,label,int]) => {
                  const cfg = EVENT_CFG[tipo]
                  return (
                    <button key={tipo} onClick={() => registrarEvento(tipo, int)} style={{ padding:"6px 8px", borderRadius:7, border:`1px solid ${cfg.cor}22`, background:`${cfg.cor}0a`, color:cfg.cor, fontSize:".68rem", fontWeight:600, cursor:"pointer", fontFamily:"var(--font-sans)", textAlign:"left", display:"flex", alignItems:"center", gap:5 }}>
                      <span>{cfg.icone}</span>{label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Timeline de eventos */}
            {eventos.length>0 && (
              <div style={{ borderTop:"1px solid rgba(26,58,92,.4)", padding:"10px", maxHeight:150, overflowY:"auto" }}>
                <div style={{ fontSize:".6rem", color:"rgba(160,200,235,.35)", textTransform:"uppercase", letterSpacing:".08em", marginBottom:6 }}>Eventos ({eventos.length})</div>
                {eventos.slice(0,8).map(ev => {
                  const cfg = EVENT_CFG[ev.tipo]
                  return (
                    <div key={ev.id} style={{ display:"flex", gap:5, marginBottom:4, alignItems:"center" }}>
                      <span style={{ fontSize:".65rem", color:cfg.cor }}>{cfg.icone}</span>
                      <span style={{ fontSize:".65rem", color:"rgba(160,200,235,.6)" }}>{cfg.label}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ENCERRAMENTO
  // ══════════════════════════════════════════════════════════════════════════
  const totalOps    = acoes.reduce((a,ac) => a+ac.operantes.length, 0)
  const totalAcertos = acoes.reduce((a,ac) => a+ac.operantes.filter(o=>o.correto).length, 0)
  const taxaGeral   = totalOps>0?Math.round((totalAcertos/totalOps)*100):0

  return (
    <div style={{ minHeight:"100vh", background:"#07111f", fontFamily:"var(--font-sans)", padding:"24px 28px" }}>
      <div style={{ maxWidth:680, margin:"0 auto", display:"flex", flexDirection:"column", gap:16 }}>
        <div style={{ textAlign:"center", padding:"16px 0" }}>
          <div style={{ width:52, height:52, borderRadius:"50%", background:"rgba(29,158,117,.15)", border:"1px solid rgba(29,158,117,.3)", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 12px", fontSize:20 }}>✓</div>
          <div style={{ fontSize:"1.3rem", fontWeight:800, color:"#e8f0f8", marginBottom:4 }}>Sessão finalizada</div>
          <div style={{ fontSize:".82rem", color:"rgba(160,200,235,.5)" }}>{paciente?.nome} · {fmt(segundos)} · {totalOps} operantes</div>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10 }}>
          {[
            { l:"Duração",        v:fmt(segundos),    c:"#e8f0f8" },
            { l:"Taxa de acerto", v:`${taxaGeral}%`,  c:taxaGeral>=80?"#1D9E75":taxaGeral>=50?"#EF9F27":"#E05A4B" },
            { l:"Operantes",      v:totalOps,         c:"#378ADD" },
            { l:"Eventos",        v:eventos.length,   c:"#8B7FE8" },
          ].map(k => (
            <div key={k.l} style={{ background:"rgba(13,32,53,.85)", border:"1px solid rgba(26,58,92,.6)", borderRadius:12, padding:"12px 14px" }}>
              <div style={{ fontSize:".58rem", color:"rgba(170,210,245,.6)", marginBottom:4 }}>{k.l}</div>
              <div style={{ fontSize:"1.2rem", fontWeight:800, color:k.c }}>{k.v}</div>
            </div>
          ))}
        </div>

        {acoes.map(ac => {
          const t = ac.operantes.length
          const c = ac.operantes.filter(o=>o.correto).length
          const tx = t>0?Math.round((c/t)*100):0
          return (
            <div key={ac.id} style={{ background:"rgba(13,32,53,.85)", border:"1px solid rgba(26,58,92,.6)", borderRadius:14, padding:18 }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                <div>
                  <div style={{ fontSize:".88rem", fontWeight:700, color:"#e8f0f8" }}>{ac.itemNome}</div>
                  <div style={{ fontSize:".65rem", color:"rgba(160,200,235,.4)" }}>{ac.itemDominio} · {t} operantes</div>
                </div>
                <div style={{ fontSize:"1.5rem", fontWeight:800, color:tx>=80?"#1D9E75":tx>=50?"#EF9F27":"#E05A4B" }}>{tx}%</div>
              </div>
              <div style={{ height:4, background:"rgba(26,58,92,.5)", borderRadius:50, overflow:"hidden", marginBottom:8 }}>
                <div style={{ height:"100%", width:`${tx}%`, background:tx>=80?"#1D9E75":tx>=50?"#EF9F27":"#E05A4B" }} />
              </div>
              <div style={{ display:"flex", gap:3, flexWrap:"wrap" }}>
                {ac.operantes.map(op => (
                  <div key={op.id} title={PROMPT_LABELS[op.promptLevel]} style={{ width:22, height:22, borderRadius:4, background:op.correto?"rgba(29,158,117,.2)":"rgba(224,90,75,.2)", border:`1px solid ${op.correto?"rgba(29,158,117,.4)":"rgba(224,90,75,.4)"}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:".65rem", color:op.correto?"#1D9E75":"#E05A4B" }}>{op.correto?"✓":"✗"}</div>
                ))}
              </div>
            </div>
          )
        })}

        {eventos.length>0 && (
          <div style={{ background:"rgba(13,32,53,.85)", border:"1px solid rgba(26,58,92,.6)", borderRadius:14, padding:18 }}>
            <div style={{ fontSize:".72rem", fontWeight:700, color:"rgba(170,210,245,.88)", marginBottom:10 }}>Timeline de eventos ({eventos.length})</div>
            {[...eventos].reverse().map(ev => {
              const cfg = EVENT_CFG[ev.tipo]
              return (
                <div key={ev.id} style={{ display:"flex", gap:8, padding:"6px 0", borderBottom:"1px solid rgba(26,58,92,.2)" }}>
                  <span style={{ color:cfg.cor, fontSize:".72rem" }}>{cfg.icone}</span>
                  <span style={{ fontSize:".72rem", color:"rgba(160,200,235,.7)" }}>{cfg.label}</span>
                </div>
              )
            })}
          </div>
        )}

        <div style={{ background:"rgba(29,158,117,.06)", border:"1px solid rgba(29,158,117,.2)", borderRadius:12, padding:14 }}>
          <div style={{ fontSize:".72rem", color:"#1D9E75", fontWeight:700, marginBottom:4 }}>FractaCare — dados sincronizados</div>
          <div style={{ fontSize:".75rem", color:"rgba(160,200,235,.7)" }}>Operantes e eventos salvos. O radar de {paciente?.nome} será atualizado automaticamente.</div>
        </div>

        <div style={{ display:"flex", gap:12 }}>
          <button onClick={() => router.push(`/clinic/paciente/${paciente?.id}`)} style={{ flex:1, padding:14, borderRadius:10, border:"1px solid rgba(70,120,180,.5)", background:"transparent", color:"rgba(160,200,235,.9)", fontWeight:600, fontSize:".85rem", cursor:"pointer", fontFamily:"var(--font-sans)" }}>Ver perfil do paciente</button>
          <button onClick={() => router.push("/clinic/dashboard")} style={{ flex:1, padding:14, borderRadius:10, border:"none", background:"linear-gradient(135deg,#1D9E75,#0f8f7a)", color:"#07111f", fontWeight:800, fontSize:".85rem", cursor:"pointer", fontFamily:"var(--font-sans)" }}>Voltar ao painel →</button>
        </div>
      </div>
    </div>
  )
}

export default function ClinicSessaoPage() {
  return (
    <Suspense fallback={<div style={{ minHeight:"100vh", background:"#07111f", display:"flex", alignItems:"center", justifyContent:"center" }}><div style={{ fontSize:13, color:"rgba(160,200,235,.6)" }}>Carregando...</div></div>}>
      <SessaoInner />
    </Suspense>
  )
}
