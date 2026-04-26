"use client";
import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useClinicContext } from "../layout";
import { LineChart, Line, ResponsiveContainer, Tooltip, ReferenceLine } from "recharts";

// ─── TIPOS ───────────────────────────────────────────────────────────────────
type Senioridade = "terapeuta" | "coordenador" | "supervisor";
type StageKey = "warmup_pairing" | "assent_checklist" | "preference_assessment" | "clinical_actions" | "break" | "closing_preparation";
type StageStatus = "pending" | "active" | "completed" | "skipped";
type PromptLevel = "independente" | "gestual" | "modelo" | "fisico_parcial" | "fisico_total";
type EventType = "assent_given" | "assent_revoked" | "assent_recovered" | "avoidance_signal" | "distress_signal" | "break_requested" | "session_paused" | "session_resumed";

interface Stage { key: StageKey; status: StageStatus; dbId?: string; concluido_em?: number }

interface Acao {
  id: string; dbId?: string
  itemId: string; itemNome: string; itemDominio: string
  tipo: "intervention" | "assessment"
  operantes: Operante[]
  taxaHistorica?: number
  operanteVerbal?: string // operante do programa para derivar hierarquia
  hierarquiaTipo?: "motora" | "verbal" | "generica"
}

// ─── HIERARQUIAS DE DICAS ─────────────────────────────────────────────────────
const OPERANTES_VERBAIS = ["tato","mando","intraverbal","echoico","textual","transcricao"]
const OPERANTES_MOTORES = ["imitacao","ouvinte"]

function deriveHierarquia(operante?: string): "motora" | "verbal" | "generica" {
  if (!operante) return "generica"
  if (OPERANTES_VERBAIS.includes(operante)) return "verbal"
  if (OPERANTES_MOTORES.includes(operante)) return "motora"
  return "generica"
}

interface HierarquiaItem {
  key: string; label: string; cor: string
  correto: boolean; nivel: number
}

function getHierarquia(tipo: "motora" | "verbal" | "generica"): HierarquiaItem[] {
  if (tipo === "verbal") return [
    { key: "independente",  label: "Independente",  cor: "#1D9E75", correto: true,  nivel: 5 },
    { key: "mov_oral",      label: "Mov. Oral",     cor: "#23c48f", correto: true,  nivel: 4 },
    { key: "intraverbal",   label: "Intraverbal",   cor: "#378ADD", correto: true,  nivel: 3 },
    { key: "ecoica",        label: "Ecóica",        cor: "#EF9F27", correto: true,  nivel: 2 },
    { key: "erro",          label: "Erro",          cor: "#E05A4B", correto: false, nivel: 0 },
  ]
  if (tipo === "motora") return [
    { key: "independente",   label: "Independente",   cor: "#1D9E75", correto: true,  nivel: 5 },
    { key: "gestual",        label: "Gestual",        cor: "#23c48f", correto: true,  nivel: 4 },
    { key: "fisico_parcial", label: "Fís. Parcial",   cor: "#EF9F27", correto: true,  nivel: 2 },
    { key: "fisico_total",   label: "Fís. Total",     cor: "#E05A4B40", correto: true, nivel: 1 },
    { key: "erro",           label: "Erro",           cor: "#E05A4B", correto: false, nivel: 0 },
  ]
  // generica
  return [
    { key: "independente",   label: "Independente",   cor: "#1D9E75", correto: true,  nivel: 5 },
    { key: "verbal",         label: "Verbal",         cor: "#23c48f", correto: true,  nivel: 4 },
    { key: "gestual",        label: "Gestual",        cor: "#378ADD", correto: true,  nivel: 3 },
    { key: "fisico_parcial", label: "Fís. Parcial",   cor: "#EF9F27", correto: true,  nivel: 2 },
    { key: "fisico_total",   label: "Fís. Total",     cor: "#8B7FE8", correto: true,  nivel: 1 },
    { key: "erro",           label: "Erro",           cor: "#E05A4B", correto: false, nivel: 0 },
  ]
}

interface Operante {
  id: string; sd: string; correto: boolean
  promptLevel: PromptLevel; ts: number
}

interface EventoSessao { id: string; tipo: EventType; timestamp: number }

interface LibItem {
  id: string; nome: string; dominio: string
  tipo: "programa" | "avaliacao"; planejado: boolean
  planoId?: string; taxaHistorica?: number
  operante?: string
}

// ─── CONSTANTES ──────────────────────────────────────────────────────────────
const STAGE_KEYS: StageKey[] = ["warmup_pairing", "assent_checklist", "preference_assessment", "clinical_actions", "break", "closing_preparation"]

const STAGES_CFG: Record<StageKey, { label: string; icone: string; cor: string; descricao: string }> = {
  warmup_pairing:        { label: "Vínculo",       icone: "🤝", cor: "#1D9E75", descricao: "Reduza exigências e estabeleça vínculo" },
  assent_checklist:      { label: "Assentimento",  icone: "✅", cor: "#378ADD", descricao: "Verifique aceitação da criança" },
  preference_assessment: { label: "Preferências",  icone: "⭐", cor: "#EF9F27", descricao: "Identifique reforçadores efetivos" },
  clinical_actions:      { label: "Ações",         icone: "🎯", cor: "#23c48f", descricao: "Avaliações e programas de intervenção" },
  break:                 { label: "Pausa",          icone: "⏸", cor: "#4d6d8a", descricao: "Intervalo e observação passiva" },
  closing_preparation:   { label: "Encerramento",  icone: "🏁", cor: "#E05A4B", descricao: "Finalize e comunique à família" },
}

const PROMPT_LABELS: Record<PromptLevel, string> = {
  independente: "Ind.", gestual: "Gest.", modelo: "Mod.",
  fisico_parcial: "F.Parc.", fisico_total: "F.Total",
}

const PROMPT_FULL: Record<PromptLevel, string> = {
  independente: "Independente", gestual: "Gestual", modelo: "Modelo",
  fisico_parcial: "Físico parcial", fisico_total: "Físico total",
}

const EVENT_CFG: Record<EventType, { label: string; cor: string; icone: string }> = {
  assent_given:     { label: "Assentimento",      cor: "#1D9E75", icone: "✓" },
  assent_revoked:   { label: "Revogado",          cor: "#E05A4B", icone: "✗" },
  assent_recovered: { label: "Recuperado",        cor: "#1D9E75", icone: "↺" },
  avoidance_signal: { label: "Esquiva",           cor: "#EF9F27", icone: "!" },
  distress_signal:  { label: "Desconforto",       cor: "#E05A4B", icone: "⚠" },
  break_requested:  { label: "Pausa",             cor: "#4d6d8a", icone: "⏸" },
  session_paused:   { label: "Sessão pausada",    cor: "#4d6d8a", icone: "⏸" },
  session_resumed:  { label: "Retomada",          cor: "#1D9E75", icone: "▶" },
}

const AVALIACOES_CAT = [
  { id: "vbmapp", nome: "VB-MAPP",  dominio: "Comportamento verbal" },
  { id: "peak",   nome: "PEAK",     dominio: "Equivalência de estímulos" },
  { id: "ablls",  nome: "ABLLS-R",  dominio: "Linguagem e aprendizagem" },
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

  // Estado geral
  const [fase,        setFase]        = useState<"preparacao"|"sessao"|"encerramento">("preparacao")
  const [paciente,    setPaciente]    = useState<{id:string;nome:string;iniciais:string;gradient:string;diagnostico:string}|null>(null)
  const [sessaoDbId,  setSessaoDbId]  = useState<string|null>(null)
  const [loading,     setLoading]     = useState(true)

  // Estágios
  const [stages, setStages] = useState<Stage[]>(STAGE_KEYS.map(key => ({ key, status: "pending" as StageStatus })))

  // Ações
  const [acoes,      setAcoes]      = useState<Acao[]>([])
  const [acaoAtiva,  setAcaoAtiva]  = useState<Acao|null>(null)
  const [opForm,     setOpForm]     = useState<{sd:string;correto:boolean|null;prompt:PromptLevel}>({sd:"",correto:null,prompt:"independente"})

  // Eventos
  const [eventos,    setEventos]    = useState<EventoSessao[]>([])

  // Biblioteca
  const [biblioteca, setBiblioteca] = useState<LibItem[]>([])
  const [libAberta,  setLibAberta]  = useState(false)
  const [libTab,     setLibTab]     = useState<"planejado"|"programas"|"avaliacoes">("planejado")
  const [libBusca,   setLibBusca]   = useState("")

  // Timer
  const [segundos,   setSegundos]   = useState(0)
  const [emPausa,    setEmPausa]    = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval>|null>(null)

  // Encerramento
  const [showEncModal,   setShowEncModal]   = useState(false)
  const [familiaComunic, setFamiliaComunic] = useState<boolean|null>(null)
  const [notaEncerr,     setNotaEncerr]     = useState("")

  // Drag
  const [dragOver, setDragOver] = useState(false)

  // ── Carregar ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!pacienteId) return
    async function carregar() {
      setLoading(true)
      const { data: c } = await supabase.from("criancas").select("id,nome,diagnostico").eq("id", pacienteId).single()
      if (c) setPaciente({ id: c.id, nome: c.nome, iniciais: iniciais(c.nome), gradient: "linear-gradient(135deg,#1D9E75,#378ADD)", diagnostico: c.diagnostico ?? "Não informado" })

      const { data: planos } = await supabase.from("planos").select("id,programas(id,nome,dominio,tipo)").eq("crianca_id", pacienteId).eq("status","ativo")
      const planejados: LibItem[] = []
      if (planos) {
        for (const pl of planos) {
          const prog = (pl as any).programas
          if (!prog) continue
          const { data: ops } = await supabase.from("operants").select("correto").limit(50)
          const taxa = ops&&ops.length>0?Math.round((ops.filter((o:any)=>o.correto).length/ops.length)*100):undefined
          planejados.push({ id: prog.id, nome: prog.nome, dominio: prog.dominio??"—", tipo:"programa", planejado:true, planoId:pl.id, taxaHistorica:taxa, operante:prog.tipo })
        }
      }

      const { data: todos } = await supabase.from("programas").select("id,nome,dominio,tipo").limit(30)
      const libGeral: LibItem[] = (todos??[]).filter(p=>!planejados.find(pl=>pl.id===p.id)).map(p=>({ id:p.id, nome:p.nome, dominio:p.dominio??"—", tipo:"programa" as const, planejado:false, operante:(p as any).tipo }))
      const libAvals: LibItem[] = AVALIACOES_CAT.map(a=>({...a,tipo:"avaliacao" as const,planejado:false}))
      setBiblioteca([...planejados,...libGeral,...libAvals])
      setLoading(false)
    }
    carregar()
  }, [pacienteId])

  // ── Timer ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (fase!=="sessao"||emPausa) return
    timerRef.current = setInterval(()=>setSegundos(s=>s+1),1000)
    return ()=>{ if(timerRef.current) clearInterval(timerRef.current) }
  }, [fase, emPausa])

  // ── Iniciar ────────────────────────────────────────────────────────────────
  async function iniciarSessao() {
    if (!paciente||!terapeuta) return
    const { data } = await supabase.from("sessoes_v2").insert({ crianca_id:paciente.id, terapeuta_id:terapeuta.id, status:"ativa", inicio:new Date().toISOString() }).select("id").single()
    if (data) {
      setSessaoDbId(data.id)
      for (const st of stages) {
        const { data: stDb } = await supabase.from("session_stages").insert({ sessao_id:data.id, stage:st.key, status:"pending" }).select("id").single()
        if (stDb) setStages(prev=>prev.map(s=>s.key===st.key?{...s,dbId:stDb.id}:s))
      }
    }
    setStages(prev=>prev.map((s,i)=>i===0?{...s,status:"active"}:s))
    setFase("sessao")
    await registrarEventoInterno("assent_given", data?.id)
  }

  // ── Avançar estágio ────────────────────────────────────────────────────────
  async function marcarStage(key: StageKey) {
    const idx = stages.findIndex(s=>s.key===key)
    const st  = stages[idx]
    if (st.status==="completed") return
    setStages(prev=>prev.map((s,i)=>{
      if(i===idx) return {...s,status:"completed",concluido_em:Date.now()}
      if(i===idx+1) return {...s,status:"active"}
      return s
    }))
    if (st.dbId) await supabase.from("session_stages").update({ status:"completed", concluido_em:new Date().toISOString() }).eq("id",st.dbId)
    if (idx===stages.length-1) setShowEncModal(true)
  }

  // ── Adicionar ação ─────────────────────────────────────────────────────────
  async function adicionarAcao(item: LibItem) {
    const hierTipo = deriveHierarquia(item.operante)
    const novaAcao: Acao = { id:uid(), tipo:item.tipo==="avaliacao"?"assessment":"intervention", itemId:item.id, itemNome:item.nome, itemDominio:item.dominio, operantes:[], taxaHistorica:item.taxaHistorica, operanteVerbal:item.operante, hierarquiaTipo:hierTipo }
    if (sessaoDbId) {
      const stAtual = stages.find(s=>s.status==="active")
      const { data: acDb } = await supabase.from("session_actions").insert({ sessao_id:sessaoDbId, stage_id:stAtual?.dbId??null, tipo:novaAcao.tipo, programa_id:item.tipo==="programa"?item.id:null, plano_id:item.planoId??null, status:"active", iniciado_em:new Date().toISOString() }).select("id").single()
      if (acDb) novaAcao.dbId = acDb.id
    }
    setAcoes(prev=>[...prev,novaAcao])
    setAcaoAtiva(novaAcao)
    setLibAberta(false)
  }

  // ── Registrar operante ─────────────────────────────────────────────────────
  async function registrarOperante(correto: boolean, nivelKey?: string) {
    if (!acaoAtiva) return
    const promptLevel = (nivelKey ?? "independente") as PromptLevel
    const op: Operante = { id:uid(), sd:opForm.sd, correto, promptLevel, ts:Date.now() }
    if (sessaoDbId&&acaoAtiva.dbId) {
      await supabase.from("operants").insert({ sessao_id:sessaoDbId, action_id:acaoAtiva.dbId, sd:op.sd||null, correto:op.correto, prompt_level:promptLevel, tipo:"tentativa" })
    }
    const atualizada = {...acaoAtiva, operantes:[...acaoAtiva.operantes,op]}
    setAcaoAtiva(atualizada)
    setAcoes(prev=>prev.map(a=>a.id===acaoAtiva.id?atualizada:a))
    setOpForm(p=>({...p,sd:""}))
  }

  // ── Registrar evento ───────────────────────────────────────────────────────
  async function registrarEvento(tipo: EventType) {
    await registrarEventoInterno(tipo, sessaoDbId)
  }

  async function registrarEventoInterno(tipo: EventType, sid: string|null|undefined) {
    const ev: EventoSessao = { id:uid(), tipo, timestamp:Date.now() }
    setEventos(prev=>[ev,...prev])
    if (sid) {
      const stAtual = stages.find(s=>s.status==="active")
      await supabase.from("session_events").insert({ sessao_id:sid, stage_id:stAtual?.dbId??null, tipo, timestamp:new Date().toISOString() })
    }
  }

  // ── Pausa ─────────────────────────────────────────────────────────────────
  function togglePausa() {
    if(emPausa){setEmPausa(false);registrarEvento("session_resumed")}
    else{setEmPausa(true);registrarEvento("session_paused")}
  }

  // ── Encerrar ─────────────────────────────────────────────────────────────
  async function confirmarEncerramento() {
    if (sessaoDbId) {
      await supabase.from("sessoes_v2").update({ status:"finalizada", fim:new Date().toISOString(), duracao_segundos:segundos, observacao_geral:notaEncerr||null }).eq("id",sessaoDbId)
    }
    setShowEncModal(false)
    setFase("encerramento")
  }

  // ── Gráfico em tempo real ─────────────────────────────────────────────────
  const grafData = acaoAtiva?.operantes.map((op,i) => ({
    n: i+1,
    taxa: Math.round((acaoAtiva.operantes.slice(0,i+1).filter(o=>o.correto).length/(i+1))*100),
    correto: op.correto?1:0,
  })) ?? []

  // ── Biblioteca filtrada ───────────────────────────────────────────────────
  const libFiltrada = biblioteca.filter(b=>{
    if(libTab==="planejado") return b.planejado
    if(libTab==="programas") return b.tipo==="programa"
    if(libTab==="avaliacoes") return b.tipo==="avaliacao"
    return true
  }).filter(b=>b.nome.toLowerCase().includes(libBusca.toLowerCase()))

  // ── Dados para relatório ──────────────────────────────────────────────────
  const totalOps     = acoes.reduce((a,ac)=>a+ac.operantes.length,0)
  const totalAcertos = acoes.reduce((a,ac)=>a+ac.operantes.filter(o=>o.correto).length,0)
  const taxaGeral    = totalOps>0?Math.round((totalAcertos/totalOps)*100):0

  // ── CSS ───────────────────────────────────────────────────────────────────
  const card: React.CSSProperties = { background:"rgba(13,32,53,.9)", border:"1px solid rgba(26,58,92,.6)", borderRadius:14 }

  if (loading) return <div style={{minHeight:"100vh",background:"#07111f",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"var(--font-sans)"}}><div style={{fontSize:13,color:"rgba(160,200,235,.6)"}}>Carregando...</div></div>

  // ══════════════════════════════════════════════════════════════════════════
  // PREPARAÇÃO
  // ══════════════════════════════════════════════════════════════════════════
  if (fase==="preparacao") return (
    <div style={{minHeight:"100vh",background:"#07111f",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"var(--font-sans)",padding:20}}>
      <div style={{width:"100%",maxWidth:480,display:"flex",flexDirection:"column",gap:14}}>
        <div style={{textAlign:"center",marginBottom:4}}>
          <h1 style={{fontSize:"1.3rem",fontWeight:800,color:"#e8f0f8",margin:0,marginBottom:10}}>Nova Sessão Clínica</h1>
          {paciente?(
            <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:10}}>
              <div style={{width:38,height:38,borderRadius:"50%",background:paciente.gradient,display:"flex",alignItems:"center",justifyContent:"center",fontSize:".7rem",fontWeight:800,color:"#fff"}}>{paciente.iniciais}</div>
              <div style={{textAlign:"left"}}>
                <div style={{fontSize:".95rem",fontWeight:700,color:"#e8f0f8"}}>{paciente.nome}</div>
                <div style={{fontSize:".7rem",color:"rgba(160,200,235,.5)"}}>{paciente.diagnostico}</div>
              </div>
            </div>
          ):<div style={{fontSize:".8rem",color:"rgba(160,200,235,.3)"}}>Nenhum paciente selecionado</div>}
        </div>

        <div style={{...card,padding:16}}>
          <div style={{fontSize:".68rem",color:"rgba(170,210,245,.5)",textTransform:"uppercase",letterSpacing:".08em",marginBottom:12}}>Roteiro da sessão</div>
          {STAGE_KEYS.map((key,i)=>{
            const cfg=STAGES_CFG[key]
            return(
              <div key={key} style={{display:"flex",alignItems:"center",gap:10,padding:"7px 0",borderBottom:i<5?"1px solid rgba(26,58,92,.2)":"none"}}>
                <span style={{fontSize:".85rem"}}>{cfg.icone}</span>
                <div style={{flex:1}}>
                  <div style={{fontSize:".78rem",fontWeight:600,color:"#e8f0f8"}}>{cfg.label}</div>
                  <div style={{fontSize:".63rem",color:"rgba(160,200,235,.4)"}}>{cfg.descricao}</div>
                </div>
                {["preference_assessment","break"].includes(key)&&<span style={{fontSize:".58rem",color:"rgba(160,200,235,.3)",background:"rgba(26,58,92,.4)",borderRadius:20,padding:"2px 7px"}}>opcional</span>}
              </div>
            )
          })}
        </div>

        {biblioteca.filter(b=>b.planejado).length>0&&(
          <div style={{...card,padding:12}}>
            <div style={{fontSize:".68rem",color:"rgba(170,210,245,.5)",marginBottom:8}}>{biblioteca.filter(b=>b.planejado).length} programa(s) planejado(s)</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
              {biblioteca.filter(b=>b.planejado).map(p=>(
                <span key={p.id} style={{fontSize:".7rem",padding:"3px 10px",borderRadius:20,background:"rgba(29,158,117,.1)",border:"1px solid rgba(29,158,117,.2)",color:"#1D9E75"}}>{p.nome}</span>
              ))}
            </div>
          </div>
        )}

        <button onClick={iniciarSessao} disabled={!paciente} style={{padding:14,borderRadius:12,border:"none",background:paciente?"linear-gradient(135deg,#1D9E75,#0f8f7a)":"rgba(26,58,92,.4)",color:paciente?"#07111f":"rgba(160,200,235,.3)",fontWeight:800,fontSize:".95rem",cursor:paciente?"pointer":"not-allowed",fontFamily:"var(--font-sans)"}}>
          Iniciar sessão clínica →
        </button>
      </div>
    </div>
  )

  // ══════════════════════════════════════════════════════════════════════════
  // SESSÃO ATIVA
  // ══════════════════════════════════════════════════════════════════════════
  if (fase==="sessao") {
    const stAtual = stages.find(s=>s.status==="active")
    const stCfg   = stAtual?STAGES_CFG[stAtual.key]:null

    return (
      <div style={{minHeight:"100vh",background:"#07111f",fontFamily:"var(--font-sans)",display:"flex",flexDirection:"column"}}>

        {/* ── TOPBAR compacto ── */}
        <div style={{display:"flex",alignItems:"center",gap:12,padding:"10px 16px",background:"rgba(7,17,31,.95)",borderBottom:"1px solid rgba(26,58,92,.4)",backdropFilter:"blur(10px)",position:"sticky",top:0,zIndex:30}}>
          {paciente&&<div style={{width:28,height:28,borderRadius:"50%",background:paciente.gradient,display:"flex",alignItems:"center",justifyContent:"center",fontSize:".58rem",fontWeight:800,color:"#fff",flexShrink:0}}>{paciente.iniciais}</div>}

          {/* Linha do tempo dos estágios — compacta */}
          <div style={{flex:1,display:"flex",alignItems:"center",gap:0}}>
            {stages.map((st,i)=>{
              const cfg=STAGES_CFG[st.key]
              const done=st.status==="completed"||st.status==="skipped"
              const ativo=st.status==="active"
              return(
                <div key={st.key} style={{display:"flex",alignItems:"center",flex:1}}>
                  <button
                    onClick={()=>marcarStage(st.key)}
                    title={cfg.label}
                    style={{width:28,height:28,borderRadius:"50%",border:`2px solid ${done?cfg.cor:ativo?cfg.cor:"rgba(26,58,92,.5)"}`,background:done?cfg.cor:ativo?`${cfg.cor}20`:"rgba(7,17,31,.8)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0,transition:"all .2s",fontSize:done?".65rem":".75rem",color:done?"#fff":ativo?cfg.cor:"rgba(160,200,235,.3)"}}
                  >
                    {done?"✓":cfg.icone}
                  </button>
                  {i<stages.length-1&&<div style={{flex:1,height:2,background:done?`${cfg.cor}60`:"rgba(26,58,92,.4)",transition:"background .3s"}}/>}
                </div>
              )
            })}
          </div>

          {/* Timer */}
          <div style={{fontSize:"1.3rem",fontWeight:800,color:emPausa?"#EF9F27":"#1D9E75",fontFamily:"monospace",flexShrink:0}}>{fmt(segundos)}</div>

          {/* Controles */}
          <div style={{display:"flex",gap:6,flexShrink:0}}>
            <button onClick={togglePausa} style={{padding:"5px 10px",borderRadius:7,border:`1px solid ${emPausa?"rgba(29,158,117,.3)":"rgba(239,159,39,.3)"}`,background:emPausa?"rgba(29,158,117,.08)":"rgba(239,159,39,.08)",color:emPausa?"#1D9E75":"#EF9F27",fontSize:".68rem",fontWeight:600,cursor:"pointer",fontFamily:"var(--font-sans)"}}>
              {emPausa?"▶":"⏸"}
            </button>
            <button onClick={()=>setShowEncModal(true)} style={{padding:"5px 10px",borderRadius:7,border:"1px solid rgba(224,90,75,.3)",background:"rgba(224,90,75,.08)",color:"#E05A4B",fontSize:".68rem",fontWeight:600,cursor:"pointer",fontFamily:"var(--font-sans)"}}>
              Encerrar
            </button>
            <button onClick={()=>{setLibAberta(p=>!p)}} style={{padding:"5px 10px",borderRadius:7,border:`1px solid ${libAberta?"rgba(139,127,232,.4)":"rgba(26,58,92,.5)"}`,background:libAberta?"rgba(139,127,232,.1)":"transparent",color:libAberta?"#8B7FE8":"rgba(160,200,235,.5)",fontSize:".68rem",fontWeight:600,cursor:"pointer",fontFamily:"var(--font-sans)"}}>
              + Programa
            </button>
          </div>
        </div>

        {/* ── CORPO ── */}
        <div style={{flex:1,display:"flex",overflow:"hidden"}}>

          {/* ─ ÁREA PRINCIPAL ─ */}
          <div style={{flex:1,overflowY:"auto",padding:"16px"}}>

            {/* Indicador do estágio atual */}
            {stAtual&&stCfg&&(
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14,padding:"8px 14px",background:`${stCfg.cor}10`,border:`1px solid ${stCfg.cor}25`,borderRadius:10}}>
                <span style={{fontSize:"1rem"}}>{stCfg.icone}</span>
                <div style={{flex:1}}>
                  <span style={{fontSize:".78rem",fontWeight:700,color:stCfg.cor}}>{stCfg.label}</span>
                  <span style={{fontSize:".7rem",color:"rgba(160,200,235,.4)",marginLeft:8}}>{stCfg.descricao}</span>
                </div>
                <button onClick={()=>marcarStage(stAtual.key)} style={{padding:"4px 12px",borderRadius:20,border:`1px solid ${stCfg.cor}44`,background:`${stCfg.cor}15`,color:stCfg.cor,fontSize:".68rem",fontWeight:600,cursor:"pointer",fontFamily:"var(--font-sans)"}}>
                  Concluir →
                </button>
              </div>
            )}

            {/* Área de drop */}
            <div
              onDragOver={e=>{e.preventDefault();setDragOver(true)}}
              onDragLeave={()=>setDragOver(false)}
              onDrop={e=>{e.preventDefault();setDragOver(false);const id=e.dataTransfer.getData("libItemId");const item=biblioteca.find(b=>b.id===id);if(item)adicionarAcao(item)}}
              style={{display:acoes.length===0?"flex":"none",alignItems:"center",justifyContent:"center",minHeight:80,border:`2px dashed ${dragOver?"#1D9E75":"rgba(26,58,92,.4)"}`,borderRadius:12,marginBottom:12,background:dragOver?"rgba(29,158,117,.04)":"transparent",transition:"all .2s"}}
            >
              <div style={{fontSize:".78rem",color:"rgba(160,200,235,.3)"}}>Arraste ou clique "+ Programa" para iniciar</div>
            </div>

            {/* Ações */}
            {acoes.map(acao=>{
              const isAtiva=acaoAtiva?.id===acao.id
              const ops=acao.operantes
              const acertos=ops.filter(o=>o.correto).length
              const taxa=ops.length>0?Math.round((acertos/ops.length)*100):null
              const grafOps=ops.map((op,i)=>({n:i+1,taxa:Math.round((ops.slice(0,i+1).filter(o=>o.correto).length/(i+1))*100)}))

              return(
                <div key={acao.id} style={{...card,marginBottom:10,border:`1px solid ${isAtiva?"rgba(35,196,143,.35)":"rgba(26,58,92,.5)"}`,overflow:"hidden"}}>

                  {/* Header da ação */}
                  <div onClick={()=>setAcaoAtiva(isAtiva?null:acao)} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 14px",cursor:"pointer"}}>
                    <div style={{flex:1}}>
                      <div style={{fontSize:".85rem",fontWeight:700,color:isAtiva?"#23c48f":"#e8f0f8"}}>{acao.itemNome}</div>
                      <div style={{display:"flex",alignItems:"center",gap:8,marginTop:2}}>
                        <span style={{fontSize:".62rem",color:"rgba(160,200,235,.4)"}}>{acao.itemDominio}</span>
                        {acao.taxaHistorica!==undefined&&<span style={{fontSize:".6rem",color:"#8B7FE8"}}>hist: {acao.taxaHistorica}%</span>}
                        <span style={{fontSize:".62rem",color:"rgba(160,200,235,.35)"}}>{ops.length} operantes</span>
                      </div>
                    </div>

                    {/* Mini gráfico de tentativas com nível de prompt */}
                    <div style={{display:"flex",gap:3,alignItems:"center",marginRight:10}}>
                      {ops.slice(-10).map((op,i)=>{
                        const hier = getHierarquia(acao.hierarquiaTipo??"generica")
                        const hItem = hier.find(h=>h.key===op.promptLevel) ?? hier[0]
                        return <div key={i} style={{width:8,height:14,borderRadius:2,background:op.correto?hItem.cor:"#E05A4B",opacity:.85}}/>
                      })}
                    </div>

                    <div style={{textAlign:"right",flexShrink:0}}>
                      <div style={{fontSize:"1.3rem",fontWeight:800,color:taxa===null?"rgba(160,200,235,.3)":taxa>=80?"#1D9E75":taxa>=50?"#EF9F27":"#E05A4B"}}>{taxa===null?"—":`${taxa}%`}</div>
                      <div style={{fontSize:".6rem",color:"rgba(160,200,235,.35)"}}>{acertos}/{ops.length}</div>
                    </div>
                  </div>

                  {/* Área de registro — ação ativa */}
                  {isAtiva&&(
                    <div style={{borderTop:"1px solid rgba(26,58,92,.3)",padding:"12px 14px"}}>

                      {/* Gráfico de curva de aprendizagem */}
                      {grafOps.length>=2&&(
                        <div style={{height:60,marginBottom:12}}>
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={grafOps}>
                              <Line type="monotone" dataKey="taxa" stroke="#23c48f" strokeWidth={2} dot={false} />
                              <ReferenceLine y={80} stroke="rgba(29,158,117,.3)" strokeDasharray="3 3" />
                              <Tooltip contentStyle={{background:"#0d2035",border:"1px solid rgba(26,58,92,.7)",borderRadius:8,color:"#e8f0f8",fontSize:10}} formatter={(v:unknown)=>[`${v}%`,"taxa"]} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      )}

                      {/* SD opcional */}
                      <input
                        value={opForm.sd}
                        onChange={e=>setOpForm(p=>({...p,sd:e.target.value}))}
                        placeholder="SD / estímulo (opcional)"
                        style={{width:"100%",padding:"7px 10px",borderRadius:8,border:"1px solid rgba(26,58,92,.4)",background:"rgba(13,32,53,.6)",color:"#e8f0f8",fontSize:".75rem",fontFamily:"var(--font-sans)",outline:"none",boxSizing:"border-box" as const,marginBottom:10}}
                      />

                      {/* Botões ✓ e ✗ — grandes e centrais */}
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
                        <button onClick={()=>registrarOperante(true)} style={{padding:"18px",borderRadius:10,border:"1px solid rgba(29,158,117,.4)",background:"rgba(29,158,117,.12)",color:"#1D9E75",fontWeight:800,fontSize:"1.1rem",cursor:"pointer",fontFamily:"var(--font-sans)",display:"flex",alignItems:"center",justifyContent:"center",gap:6,transition:"all .1s"}}>
                          ✓ <span style={{fontSize:".82rem"}}>Correto</span>
                        </button>
                        <button onClick={()=>registrarOperante(false)} style={{padding:"18px",borderRadius:10,border:"1px solid rgba(224,90,75,.4)",background:"rgba(224,90,75,.12)",color:"#E05A4B",fontWeight:800,fontSize:"1.1rem",cursor:"pointer",fontFamily:"var(--font-sans)",display:"flex",alignItems:"center",justifyContent:"center",gap:6,transition:"all .1s"}}>
                          ✗ <span style={{fontSize:".82rem"}}>Incorreto</span>
                        </button>
                      </div>

                      {/* Nível de prompt — compacto */}
                      <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                        {(Object.entries(PROMPT_LABELS) as [PromptLevel,string][]).map(([key,label])=>(
                          <button key={key} onClick={()=>setOpForm(p=>({...p,prompt:key}))} title={PROMPT_FULL[key]} style={{padding:"4px 9px",borderRadius:20,cursor:"pointer",fontFamily:"var(--font-sans)",fontSize:".65rem",border:`1px solid ${opForm.prompt===key?"#378ADD55":"rgba(26,58,92,.4)"}`,background:opForm.prompt===key?"rgba(55,138,221,.15)":"transparent",color:opForm.prompt===key?"#378ADD":"rgba(160,200,235,.4)"}}>
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* ─ LATERAL DIREITA — eventos rápidos ─ */}
          <div style={{width:100,borderLeft:"1px solid rgba(26,58,92,.35)",display:"flex",flexDirection:"column",padding:"10px 6px",gap:6,background:"rgba(7,17,31,.5)"}}>
            <div style={{fontSize:".55rem",color:"rgba(160,200,235,.3)",textTransform:"uppercase",letterSpacing:".06em",textAlign:"center",marginBottom:4}}>Eventos</div>
            {([
              ["assent_revoked",  "Revogado",  "low"  ],
              ["avoidance_signal","Esquiva",   "low"  ],
              ["distress_signal", "Desconf.",  "medium"],
              ["break_requested", "Pausa",     "low"  ],
              ["assent_recovered","Recuperou", "low"  ],
            ] as [EventType,string,string][]).map(([tipo,label])=>{
              const cfg=EVENT_CFG[tipo]
              return(
                <button key={tipo} onClick={()=>registrarEvento(tipo)} style={{padding:"8px 4px",borderRadius:8,border:`1px solid ${cfg.cor}22`,background:`${cfg.cor}0a`,color:cfg.cor,fontSize:".62rem",fontWeight:600,cursor:"pointer",fontFamily:"var(--font-sans)",textAlign:"center",display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
                  <span style={{fontSize:".9rem"}}>{cfg.icone}</span>
                  <span>{label}</span>
                </button>
              )
            })}

            {/* Eventos registrados */}
            {eventos.length>0&&(
              <div style={{marginTop:8,flex:1,overflowY:"auto"}}>
                <div style={{fontSize:".55rem",color:"rgba(160,200,235,.2)",textAlign:"center",marginBottom:4}}>{eventos.length}x</div>
                {eventos.slice(0,6).map(ev=>{
                  const cfg=EVENT_CFG[ev.tipo]
                  return(
                    <div key={ev.id} title={cfg.label} style={{width:20,height:20,borderRadius:"50%",background:`${cfg.cor}20`,border:`1px solid ${cfg.cor}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:".65rem",color:cfg.cor,margin:"0 auto 4px"}}>
                      {cfg.icone}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── BIBLIOTECA — painel retrátil ── */}
        {libAberta&&(
          <div style={{position:"fixed",right:0,top:0,bottom:0,width:300,background:"rgba(7,17,31,.97)",borderLeft:"1px solid rgba(26,58,92,.5)",display:"flex",flexDirection:"column",zIndex:40,boxShadow:"-10px 0 40px rgba(0,0,0,.5)"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 16px",borderBottom:"1px solid rgba(26,58,92,.4)"}}>
              <div style={{fontSize:".85rem",fontWeight:700,color:"#e8f0f8"}}>Biblioteca</div>
              <button onClick={()=>setLibAberta(false)} style={{background:"none",border:"none",color:"rgba(160,200,235,.5)",cursor:"pointer",fontSize:"1.2rem"}}>×</button>
            </div>

            <div style={{display:"flex",borderBottom:"1px solid rgba(26,58,92,.3)"}}>
              {([["planejado","Planejado"],["programas","Programas"],["avaliacoes","Avaliações"]] as const).map(([id,label])=>(
                <button key={id} onClick={()=>setLibTab(id)} style={{flex:1,padding:"8px 4px",background:"none",border:"none",borderBottom:`2px solid ${libTab===id?"#1D9E75":"transparent"}`,color:libTab===id?"#1D9E75":"rgba(160,200,235,.4)",fontSize:".65rem",fontWeight:libTab===id?700:400,cursor:"pointer",fontFamily:"var(--font-sans)"}}>
                  {label}
                </button>
              ))}
            </div>

            <div style={{padding:"8px"}}>
              <input value={libBusca} onChange={e=>setLibBusca(e.target.value)} placeholder="Buscar..." style={{width:"100%",padding:"7px 10px",borderRadius:8,border:"1px solid rgba(26,58,92,.4)",background:"rgba(13,32,53,.6)",color:"#e8f0f8",fontSize:".72rem",fontFamily:"var(--font-sans)",outline:"none",boxSizing:"border-box" as const}}/>
            </div>

            <div style={{flex:1,overflowY:"auto",padding:"0 8px 8px"}}>
              {libFiltrada.length===0&&<div style={{fontSize:".72rem",color:"rgba(160,200,235,.3)",textAlign:"center",padding:"20px 0"}}>Nenhum item</div>}
              {libFiltrada.map(item=>(
                <div key={item.id} draggable onDragStart={e=>e.dataTransfer.setData("libItemId",item.id)} style={{padding:"10px 12px",borderRadius:10,background:"rgba(26,58,92,.2)",border:`1px solid ${item.planejado?"rgba(29,158,117,.2)":"rgba(26,58,92,.35)"}`,marginBottom:6,cursor:"grab"}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4}}>
                    <div style={{fontSize:".78rem",fontWeight:600,color:"#e8f0f8"}}>{item.nome}</div>
                    <button onClick={()=>adicionarAcao(item)} style={{width:22,height:22,borderRadius:"50%",border:"1px solid rgba(29,158,117,.3)",background:"rgba(29,158,117,.1)",color:"#1D9E75",fontSize:".85rem",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>+</button>
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:5}}>
                    <span style={{fontSize:".62rem",color:"rgba(160,200,235,.4)"}}>{item.dominio}</span>
                    {item.planejado&&<span style={{fontSize:".58rem",color:"#1D9E75",background:"rgba(29,158,117,.1)",borderRadius:20,padding:"1px 6px"}}>planejado</span>}
                    {item.tipo==="avaliacao"&&<span style={{fontSize:".58rem",color:"#8B7FE8",background:"rgba(139,127,232,.1)",borderRadius:20,padding:"1px 6px"}}>avaliação</span>}
                    {item.taxaHistorica!==undefined&&<span style={{fontSize:".6rem",color:"#EF9F27",marginLeft:"auto"}}>{item.taxaHistorica}%</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── MODAL DE ENCERRAMENTO ── */}
        {showEncModal&&(
          <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.7)",backdropFilter:"blur(6px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:50,padding:20}}>
            <div style={{...card,padding:28,width:"100%",maxWidth:460}}>
              <div style={{fontSize:"1rem",fontWeight:800,color:"#e8f0f8",marginBottom:4}}>Encerrar sessão</div>
              <div style={{fontSize:".78rem",color:"rgba(160,200,235,.5)",marginBottom:20}}>
                {fmt(segundos)} · {totalOps} operantes · {taxaGeral}% de acerto
              </div>

              {/* Comunicação à família */}
              <div style={{marginBottom:16}}>
                <div style={{fontSize:".75rem",color:"rgba(170,210,245,.7)",marginBottom:10}}>A família/responsável foi comunicada sobre a sessão?</div>
                <div style={{display:"flex",gap:8}}>
                  {[{v:true,l:"✓ Sim, comunicada",c:"#1D9E75"},{v:false,l:"✗ Não comunicada",c:"#E05A4B"}].map(r=>(
                    <button key={String(r.v)} onClick={()=>setFamiliaComunic(r.v)} style={{flex:1,padding:"10px",borderRadius:9,cursor:"pointer",fontFamily:"var(--font-sans)",fontWeight:600,fontSize:".78rem",border:`1px solid ${familiaComunic===r.v?r.c:"rgba(26,58,92,.5)"}`,background:familiaComunic===r.v?`${r.c}18`:"transparent",color:familiaComunic===r.v?r.c:"rgba(160,200,235,.5)"}}>
                      {r.l}
                    </button>
                  ))}
                </div>
              </div>

              {/* Nota de encerramento */}
              <div style={{marginBottom:20}}>
                <div style={{fontSize:".75rem",color:"rgba(170,210,245,.7)",marginBottom:6}}>Observação de encerramento (opcional)</div>
                <textarea
                  value={notaEncerr}
                  onChange={e=>setNotaEncerr(e.target.value)}
                  placeholder="Comportamentos relevantes, intercorrências, próximos passos..."
                  rows={3}
                  style={{width:"100%",padding:"10px 12px",borderRadius:9,border:"1px solid rgba(26,58,92,.4)",background:"rgba(13,32,53,.6)",color:"#e8f0f8",fontSize:".78rem",fontFamily:"var(--font-sans)",resize:"none",outline:"none",boxSizing:"border-box" as const}}
                />
              </div>

              <div style={{display:"flex",gap:10}}>
                <button onClick={()=>setShowEncModal(false)} style={{flex:1,padding:"11px",borderRadius:10,border:"1px solid rgba(26,58,92,.5)",background:"transparent",color:"rgba(160,200,235,.6)",fontSize:".82rem",cursor:"pointer",fontFamily:"var(--font-sans)"}}>Cancelar</button>
                <button onClick={confirmarEncerramento} disabled={familiaComunic===null} style={{flex:2,padding:"11px",borderRadius:10,border:"none",background:familiaComunic!==null?"linear-gradient(135deg,#E05A4B,#c04030)":"rgba(26,58,92,.4)",color:familiaComunic!==null?"#fff":"rgba(160,200,235,.3)",fontWeight:800,fontSize:".82rem",cursor:familiaComunic!==null?"pointer":"not-allowed",fontFamily:"var(--font-sans)"}}>
                  Finalizar sessão →
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ENCERRAMENTO — relatório completo
  // ══════════════════════════════════════════════════════════════════════════
  const relatorio = `RELATÓRIO DE SESSÃO — ${new Date().toLocaleDateString("pt-BR")}
Paciente: ${paciente?.nome}
Duração: ${fmt(segundos)}
Terapeuta: ${terapeuta?.nome ?? "—"}
Família comunicada: ${familiaComunic?"Sim":"Não"}

PROGRAMAS APLICADOS (${acoes.length}):
${acoes.map(ac=>{
  const t=ac.operantes.length
  const c=ac.operantes.filter(o=>o.correto).length
  const tx=t>0?Math.round((c/t)*100):0
  const seq=ac.operantes.map(o=>o.correto?"C":"E").join(" ")
  return `• ${ac.itemNome} — ${tx}% (${c}/${t})\n  Sequência: ${seq}`
}).join("\n")}

EVENTOS CLÍNICOS (${eventos.length}):
${eventos.map(e=>EVENT_CFG[e.tipo].label).join(", ")||"Nenhum evento registrado"}

OBSERVAÇÕES DE ENCERRAMENTO:
${notaEncerr||"—"}`

  return (
    <div style={{minHeight:"100vh",background:"#07111f",fontFamily:"var(--font-sans)",padding:"20px"}}>
      <div style={{maxWidth:700,margin:"0 auto",display:"flex",flexDirection:"column",gap:14}}>

        {/* Header */}
        <div style={{textAlign:"center",padding:"12px 0"}}>
          <div style={{width:48,height:48,borderRadius:"50%",background:"rgba(29,158,117,.15)",border:"1px solid rgba(29,158,117,.3)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 10px",fontSize:18}}>✓</div>
          <div style={{fontSize:"1.2rem",fontWeight:800,color:"#e8f0f8",marginBottom:4}}>Sessão finalizada</div>
          <div style={{fontSize:".8rem",color:"rgba(160,200,235,.5)"}}>{paciente?.nome} · {fmt(segundos)} · {totalOps} operantes</div>
        </div>

        {/* KPIs */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8}}>
          {[
            {l:"Duração",      v:fmt(segundos),   c:"#e8f0f8"},
            {l:"Taxa geral",   v:`${taxaGeral}%`, c:taxaGeral>=80?"#1D9E75":taxaGeral>=50?"#EF9F27":"#E05A4B"},
            {l:"Operantes",    v:totalOps,        c:"#378ADD"},
            {l:"Eventos",      v:eventos.length,  c:"#8B7FE8"},
          ].map(k=>(
            <div key={k.l} style={{...card,padding:"12px 14px"}}>
              <div style={{fontSize:".58rem",color:"rgba(170,210,245,.5)",marginBottom:3}}>{k.l}</div>
              <div style={{fontSize:"1.2rem",fontWeight:800,color:k.c}}>{k.v}</div>
            </div>
          ))}
        </div>

        {/* Família comunicada */}
        <div style={{...card,padding:"12px 16px",border:`1px solid ${familiaComunic?"rgba(29,158,117,.25)":"rgba(224,90,75,.25)"}`}}>
          <div style={{fontSize:".75rem",color:familiaComunic?"#1D9E75":"#E05A4B",fontWeight:600}}>
            {familiaComunic?"✓ Família comunicada sobre a sessão":"✗ Família não foi comunicada"}
          </div>
          {notaEncerr&&<div style={{fontSize:".72rem",color:"rgba(160,200,235,.6)",marginTop:6}}>{notaEncerr}</div>}
        </div>

        {/* Programas */}
        {acoes.map(ac=>{
          const t=ac.operantes.length
          const c=ac.operantes.filter(o=>o.correto).length
          const tx=t>0?Math.round((c/t)*100):0
          const grafD=ac.operantes.map((op,i)=>({n:i+1,taxa:Math.round((ac.operantes.slice(0,i+1).filter(o=>o.correto).length/(i+1))*100)}))
          return(
            <div key={ac.id} style={{...card,padding:18}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
                <div>
                  <div style={{fontSize:".88rem",fontWeight:700,color:"#e8f0f8"}}>{ac.itemNome}</div>
                  <div style={{fontSize:".65rem",color:"rgba(160,200,235,.4)"}}>{ac.itemDominio} · {t} operantes</div>
                  {ac.taxaHistorica!==undefined&&<div style={{fontSize:".63rem",color:"#8B7FE8",marginTop:2}}>Histórico: {ac.taxaHistorica}% → Hoje: {tx}%</div>}
                </div>
                <div style={{fontSize:"1.6rem",fontWeight:800,color:tx>=80?"#1D9E75":tx>=50?"#EF9F27":"#E05A4B"}}>{tx}%</div>
              </div>
              {grafD.length>=2&&(
                <div style={{height:60,marginBottom:10}}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={grafD}>
                      <Line type="monotone" dataKey="taxa" stroke="#23c48f" strokeWidth={2} dot={false}/>
                      <ReferenceLine y={80} stroke="rgba(29,158,117,.3)" strokeDasharray="3 3"/>
                      <Tooltip contentStyle={{background:"#0d2035",border:"1px solid rgba(26,58,92,.7)",borderRadius:8,color:"#e8f0f8",fontSize:10}} formatter={(v:unknown)=>[`${v}%`]}/>
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
              <div style={{height:4,background:"rgba(26,58,92,.5)",borderRadius:50,overflow:"hidden",marginBottom:8}}>
                <div style={{height:"100%",width:`${tx}%`,background:tx>=80?"#1D9E75":tx>=50?"#EF9F27":"#E05A4B"}}/>
              </div>
              <div style={{display:"flex",gap:3,flexWrap:"wrap"}}>
                {ac.operantes.map((op,i)=>(
                  <div key={i} title={PROMPT_FULL[op.promptLevel]} style={{width:20,height:20,borderRadius:4,background:op.correto?"rgba(29,158,117,.2)":"rgba(224,90,75,.2)",border:`1px solid ${op.correto?"rgba(29,158,117,.4)":"rgba(224,90,75,.4)"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:".6rem",color:op.correto?"#1D9E75":"#E05A4B"}}>
                    {op.correto?"✓":"✗"}
                  </div>
                ))}
              </div>
            </div>
          )
        })}

        {/* Eventos */}
        {eventos.length>0&&(
          <div style={{...card,padding:16}}>
            <div style={{fontSize:".75rem",fontWeight:700,color:"rgba(170,210,245,.88)",marginBottom:10}}>Eventos clínicos ({eventos.length})</div>
            {[...eventos].reverse().map(ev=>{
              const cfg=EVENT_CFG[ev.tipo]
              return(
                <div key={ev.id} style={{display:"flex",gap:8,padding:"5px 0",borderBottom:"1px solid rgba(26,58,92,.2)"}}>
                  <span style={{color:cfg.cor,fontSize:".7rem"}}>{cfg.icone}</span>
                  <span style={{fontSize:".72rem",color:"rgba(160,200,235,.7)"}}>{cfg.label}</span>
                </div>
              )
            })}
          </div>
        )}

        {/* Relatório textual */}
        <div style={{...card,padding:16}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
            <div style={{fontSize:".75rem",fontWeight:700,color:"rgba(170,210,245,.88)"}}>Relatório de sessão</div>
            <button onClick={()=>navigator.clipboard.writeText(relatorio)} style={{padding:"5px 12px",borderRadius:8,border:"1px solid rgba(55,138,221,.3)",background:"rgba(55,138,221,.08)",color:"#378ADD",fontSize:".68rem",fontWeight:600,cursor:"pointer",fontFamily:"var(--font-sans)"}}>
              Copiar
            </button>
          </div>
          <pre style={{fontSize:".7rem",color:"rgba(160,200,235,.65)",lineHeight:1.65,whiteSpace:"pre-wrap",margin:0,background:"rgba(13,32,53,.5)",padding:12,borderRadius:9,border:"1px solid rgba(26,58,92,.3)"}}>
            {relatorio}
          </pre>
        </div>

        <div style={{display:"flex",gap:10,paddingBottom:20}}>
          <button onClick={()=>router.push(`/clinic/paciente/${paciente?.id}`)} style={{flex:1,padding:13,borderRadius:10,border:"1px solid rgba(70,120,180,.5)",background:"transparent",color:"rgba(160,200,235,.9)",fontWeight:600,fontSize:".82rem",cursor:"pointer",fontFamily:"var(--font-sans)"}}>Ver perfil</button>
          <button onClick={()=>router.push("/clinic/dashboard")} style={{flex:1,padding:13,borderRadius:10,border:"none",background:"linear-gradient(135deg,#1D9E75,#0f8f7a)",color:"#07111f",fontWeight:800,fontSize:".82rem",cursor:"pointer",fontFamily:"var(--font-sans)"}}>Voltar ao painel →</button>
        </div>
      </div>
    </div>
  )
}

export default function ClinicSessaoPage() {
  return (
    <Suspense fallback={<div style={{minHeight:"100vh",background:"#07111f",display:"flex",alignItems:"center",justifyContent:"center"}}><div style={{fontSize:13,color:"rgba(160,200,235,.6)"}}>Carregando...</div></div>}>
      <SessaoInner/>
    </Suspense>
  )
}
