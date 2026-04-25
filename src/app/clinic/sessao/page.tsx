"use client";
import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useClinicContext } from "../layout";

// ─── TIPOS ───────────────────────────────────────────────────────────────────
type Senioridade = "terapeuta" | "coordenador" | "supervisor";
type StageKey =
  | "warmup_pairing"
  | "assent_checklist"
  | "preference_assessment"
  | "initial_functional_analysis"
  | "clinical_actions"
  | "break"
  | "closing_preparation";

type StageStatus = "pending" | "active" | "completed" | "skipped";
type ActionType = "assessment" | "intervention" | "observation" | "caregiver_guidance";
type PromptLevel = "independente" | "gestual" | "modelo" | "fisico_parcial" | "fisico_total";
type Resultado = "correta" | "incorreta" | "aproximacao" | "nao_respondeu";
type EventType =
  | "assent_given" | "assent_revoked" | "assent_recovered"
  | "preference_selected" | "avoidance_signal" | "distress_signal"
  | "break_requested" | "transition_difficulty"
  | "session_paused" | "session_resumed"
  | "program_completed" | "program_skipped";

interface Stage {
  key: StageKey
  label: string
  descricao: string
  status: StageStatus
  dbId?: string
  iniciado_em?: number
  concluido_em?: number
  checklist: Record<string, boolean>
  notas: string
}

interface Acao {
  id: string
  dbId?: string
  tipo: ActionType
  programaId?: string
  programaNome?: string
  programaDominio?: string
  status: "pending" | "active" | "completed" | "skipped"
  operantes: Operante[]
}

interface Operante {
  id: string
  sd: string
  resposta: string
  correto: boolean | null
  promptLevel: PromptLevel
  latencia_ms?: number
  reforco: string
  tipo: "tentativa" | "espontaneo" | "problema"
  ts: number
}

interface EventoSessao {
  id: string
  tipo: EventType
  timestamp: number
  intensidade?: "low" | "medium" | "high"
  contexto?: string
  programaId?: string
}

interface PacienteAtivo {
  id: string
  nome: string
  iniciais: string
  gradient: string
  diagnostico: string
}

interface ProgramaDisponivel {
  id: string
  nome: string
  dominio: string
  objetivo: string
  planoId: string
}

// ─── CONSTANTES ──────────────────────────────────────────────────────────────
const STAGES_CONFIG: Record<StageKey, {
  label: string
  descricao: string
  cor: string
  icone: string
  checklist_items: { key: string; label: string }[]
  obrigatorio: boolean
}> = {
  warmup_pairing: {
    label: "Aquecimento & Vínculo",
    descricao: "Reduza exigências, observe motivadores e estabeleça segurança com a criança.",
    cor: "#1D9E75",
    icone: "🤝",
    obrigatorio: true,
    checklist_items: [
      { key: "aceitou_entrar",    label: "Criança aceitou entrar no espaço?" },
      { key: "aproximou_terapeuta", label: "Aproximou-se do terapeuta?" },
      { key: "interesse_item",    label: "Demonstrou interesse por algum item?" },
      { key: "sem_desconforto",   label: "Sem sinais visíveis de recusa ou desconforto?" },
    ],
  },
  assent_checklist: {
    label: "Assentimento",
    descricao: "Verifique sinais de aceitação antes de aumentar demandas clínicas.",
    cor: "#378ADD",
    icone: "✅",
    obrigatorio: true,
    checklist_items: [
      { key: "aceitou_interacao",  label: "Aceitou interação direta?" },
      { key: "permaneceu_proximo", label: "Permaneceu próxima ao terapeuta?" },
      { key: "escolheu_atividade", label: "Escolheu ou aceitou atividade?" },
      { key: "sem_recusa_ativa",   label: "Sem recusa ativa ou fuga?" },
      { key: "sem_sinais_distress",label: "Sem sinais de angústia ou desconforto?" },
    ],
  },
  preference_assessment: {
    label: "Análise de Preferências",
    descricao: "Identifique reforçadores efetivos para a sessão de hoje.",
    cor: "#EF9F27",
    icone: "⭐",
    obrigatorio: false,
    checklist_items: [
      { key: "reforcos_identificados", label: "Reforçadores identificados?" },
      { key: "preferencia_alta",       label: "Pelo menos 1 item de alta preferência?" },
      { key: "hierarquia_definida",    label: "Hierarquia de reforços definida?" },
    ],
  },
  initial_functional_analysis: {
    label: "Análise Funcional Inicial",
    descricao: "Observe padrões comportamentais antes de iniciar programas.",
    cor: "#8B7FE8",
    icone: "🔍",
    obrigatorio: false,
    checklist_items: [
      { key: "comportamentos_observados", label: "Comportamentos-alvo observados?" },
      { key: "antecedentes_mapeados",     label: "Antecedentes relevantes identificados?" },
      { key: "funcao_hipotese",           label: "Hipótese de função definida?" },
    ],
  },
  clinical_actions: {
    label: "Ações Clínicas",
    descricao: "Execute avaliações ou programas de intervenção.",
    cor: "#23c48f",
    icone: "🎯",
    obrigatorio: true,
    checklist_items: [],
  },
  break: {
    label: "Pausa / Intervalo",
    descricao: "Momento de descanso. Mantenha observação passiva.",
    cor: "#4d6d8a",
    icone: "⏸",
    obrigatorio: false,
    checklist_items: [
      { key: "recuperou_assentimento", label: "Criança recuperou assentimento?" },
      { key: "pronta_retomar",         label: "Sinaliza estar pronta para retomar?" },
    ],
  },
  closing_preparation: {
    label: "Encerramento",
    descricao: "Prepare a transição e finalize os registros.",
    cor: "#E05A4B",
    icone: "🏁",
    obrigatorio: true,
    checklist_items: [
      { key: "transicao_comunicada",   label: "Transição comunicada à criança?" },
      { key: "reforco_final",          label: "Reforço de alta qualidade oferecido?" },
      { key: "observacoes_registradas",label: "Observações gerais registradas?" },
    ],
  },
}

const MODO_CONFIG: Record<Senioridade, {
  label: string
  cor: string
  mostrarDicas: boolean
  podePularEstagios: boolean
  podePularOperantes: boolean
  mostrarForecast: boolean
}> = {
  terapeuta:   { label: "Modo Guiado",      cor: "#1D9E75", mostrarDicas: true,  podePularEstagios: false, podePularOperantes: false, mostrarForecast: false },
  coordenador: { label: "Modo Semi-guiado", cor: "#EF9F27", mostrarDicas: true,  podePularEstagios: true,  podePularOperantes: true,  mostrarForecast: true  },
  supervisor:  { label: "Modo Livre",       cor: "#8B7FE8", mostrarDicas: false, podePularEstagios: true,  podePularOperantes: true,  mostrarForecast: true  },
}

const EVENT_LABELS: Record<EventType, { label: string; cor: string; icone: string }> = {
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
  independente:   "Independente",
  gestual:        "Gestual",
  modelo:         "Modelo",
  fisico_parcial: "Físico parcial",
  fisico_total:   "Físico total",
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function fmt(s: number) {
  const m = Math.floor(s / 60).toString().padStart(2, "0");
  const sec = (s % 60).toString().padStart(2, "0");
  return `${m}:${sec}`;
}
function uid() { return Math.random().toString(36).slice(2, 9); }
function iniciais(nome: string) {
  const p = nome.trim().split(" ");
  return p.length >= 2 ? `${p[0][0]}${p[p.length-1][0]}`.toUpperCase() : nome.slice(0,2).toUpperCase();
}

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────
function SessaoPageInner() {
  const { terapeuta } = useClinicContext();
  const searchParams  = useSearchParams();
  const router        = useRouter();
  const pacienteId    = searchParams.get("pacienteId");
  const nivel: Senioridade = terapeuta?.nivel ?? "coordenador";
  const modo = MODO_CONFIG[nivel];

  // ── Estado da sessão ───────────────────────────────────────────────────────
  const [sessaoDbId,   setSessaoDbId]   = useState<string | null>(null);
  const [fase,         setFase]         = useState<"preparacao" | "sessao" | "encerramento">("preparacao");
  const [paciente,     setPaciente]     = useState<PacienteAtivo | null>(null);
  const [programasDisp,setProgramasDisp]= useState<ProgramaDisponivel[]>([]);
  const [acoes,        setAcoes]        = useState<Acao[]>([]);
  const [eventos,      setEventos]      = useState<EventoSessao[]>([]);

  // Estágios
  const [stages, setStages] = useState<Stage[]>(
    (Object.entries(STAGES_CONFIG) as [StageKey, typeof STAGES_CONFIG[StageKey]][]).map(([key, cfg]) => ({
      key,
      label:       cfg.label,
      descricao:   cfg.descricao,
      status:      key === "warmup_pairing" ? "pending" : "pending",
      checklist:   Object.fromEntries(cfg.checklist_items.map(i => [i.key, false])),
      notas:       "",
    }))
  );
  const [stageAtual, setStageAtual] = useState<number>(0);

  // Ação ativa
  const [acaoAtiva,   setAcaoAtiva]   = useState<Acao | null>(null);
  const [operanteNovo,setOperanteNovo]= useState({
    sd: "", correto: null as boolean | null, promptLevel: "independente" as PromptLevel,
    reforco: "", tipo: "tentativa" as "tentativa" | "espontaneo" | "problema", notas: "",
  });

  // Timer
  const [segundos,  setSegundos]  = useState(0);
  const [emPausa,   setEmPausa]   = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // UI
  const [loading,        setLoading]        = useState(true);
  const [mostrarEventos, setMostrarEventos] = useState(false);
  const [mostrarNovaProg,setMostrarNovaProg]= useState(false);
  const [dragOver,       setDragOver]       = useState(false);

  // ── Carregar paciente e programas ──────────────────────────────────────────
  useEffect(() => {
    if (!pacienteId || !terapeuta) return;
    async function carregar() {
      setLoading(true);
      const { data: crianca } = await supabase
        .from("criancas")
        .select("id, nome, data_nascimento, diagnostico")
        .eq("id", pacienteId).single();

      if (crianca) {
        setPaciente({
          id:          crianca.id,
          nome:        crianca.nome,
          iniciais:    iniciais(crianca.nome),
          gradient:    "linear-gradient(135deg,#1D9E75,#378ADD)",
          diagnostico: crianca.diagnostico ?? "Não informado",
        });
      }

      const { data: planos } = await supabase
        .from("planos")
        .select("id, programas ( id, nome, dominio, objetivo )")
        .eq("crianca_id", pacienteId)
        .eq("terapeuta_id", terapeuta!.id)
        .eq("status", "ativo");

      if (planos) {
        setProgramasDisp(
          planos.filter((pl: any) => pl.programas).map((pl: any) => ({
            id:       pl.programas.id,
            nome:     pl.programas.nome,
            dominio:  pl.programas.dominio,
            objetivo: pl.programas.objetivo ?? "",
            planoId:  pl.id,
          }))
        );
      }
      setLoading(false);
    }
    carregar();
  }, [pacienteId, terapeuta]);

  // ── Timer ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (fase !== "sessao" || emPausa) return;
    timerRef.current = setInterval(() => setSegundos(s => s + 1), 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [fase, emPausa]);

  // ── Iniciar sessão no banco ────────────────────────────────────────────────
  async function iniciarSessao() {
    if (!paciente || !terapeuta) return;
    const { data } = await supabase.from("sessoes_v2").insert({
      crianca_id:  paciente.id,
      terapeuta_id: terapeuta.id,
      status:       "ativa",
      inicio:       new Date().toISOString(),
    }).select("id").single();

    if (data) {
      setSessaoDbId(data.id);
      // Criar estágios no banco
      for (const st of stages) {
        const { data: stDb } = await supabase.from("session_stages").insert({
          sessao_id: data.id,
          stage:     st.key,
          status:    "pending",
        }).select("id").single();
        if (stDb) {
          setStages(prev => prev.map(s => s.key === st.key ? { ...s, dbId: stDb.id } : s));
        }
      }
    }
    // Ativar primeiro estágio
    ativarStage(0);
    setFase("sessao");
  }

  // ── Ativar estágio ─────────────────────────────────────────────────────────
  async function ativarStage(idx: number) {
    setStages(prev => prev.map((s, i) => ({
      ...s,
      status: i === idx ? "active" : i < idx ? "completed" : s.status,
      iniciado_em: i === idx ? Date.now() : s.iniciado_em,
    })));
    setStageAtual(idx);

    // Atualizar banco
    const stage = stages[idx];
    if (stage.dbId && sessaoDbId) {
      await supabase.from("session_stages").update({
        status:      "active",
        iniciado_em: new Date().toISOString(),
      }).eq("id", stage.dbId);
    }

    // Registrar evento de assentimento se for estágio de assentimento
    if (stages[idx].key === "assent_checklist") {
      registrarEvento("assent_given");
    }
  }

  // ── Concluir estágio ───────────────────────────────────────────────────────
  async function concluirStage(idx: number, pular = false) {
    const stage = stages[idx];
    setStages(prev => prev.map((s, i) => i === idx ? {
      ...s, status: pular ? "skipped" : "completed",
      concluido_em: Date.now(),
    } : s));

    if (stage.dbId) {
      await supabase.from("session_stages").update({
        status:       pular ? "skipped" : "completed",
        concluido_em: new Date().toISOString(),
        checklist:    stage.checklist,
        notas:        stage.notas || null,
      }).eq("id", stage.dbId);
    }

    // Avançar para próximo
    const proximo = idx + 1;
    if (proximo < stages.length) {
      ativarStage(proximo);
    } else {
      encerrarSessao();
    }
  }

  // ── Checklist ─────────────────────────────────────────────────────────────
  function toggleChecklist(stageIdx: number, key: string) {
    setStages(prev => prev.map((s, i) => i === stageIdx ? {
      ...s, checklist: { ...s.checklist, [key]: !s.checklist[key] }
    } : s));
  }

  // ── Adicionar ação (programa arrastado ou clicado) ─────────────────────────
  async function adicionarAcao(prog: ProgramaDisponivel, tipo: ActionType = "intervention") {
    const novaAcao: Acao = {
      id:            uid(),
      tipo,
      programaId:    prog.id,
      programaNome:  prog.nome,
      programaDominio: prog.dominio,
      status:        "active",
      operantes:     [],
    };

    // Salvar no banco
    if (sessaoDbId) {
      const stageAtualObj = stages[stageAtual];
      const { data: acDb } = await supabase.from("session_actions").insert({
        sessao_id:   sessaoDbId,
        stage_id:    stageAtualObj.dbId ?? null,
        tipo,
        programa_id: prog.id,
        plano_id:    prog.planoId,
        status:      "active",
        iniciado_em: new Date().toISOString(),
      }).select("id").single();
      if (acDb) novaAcao.dbId = acDb.id;
    }

    setAcoes(prev => [...prev, novaAcao]);
    setAcaoAtiva(novaAcao);
    setMostrarNovaProg(false);
  }

  // ── Registrar operante ─────────────────────────────────────────────────────
  async function registrarOperante() {
    if (!acaoAtiva || operanteNovo.correto === null) return;

    const op: Operante = {
      id:          uid(),
      sd:          operanteNovo.sd,
      resposta:    operanteNovo.correto ? "Correto" : "Incorreto",
      correto:     operanteNovo.correto,
      promptLevel: operanteNovo.promptLevel,
      reforco:     operanteNovo.reforco,
      tipo:        operanteNovo.tipo,
      ts:          Date.now(),
    };

    // Salvar no banco
    if (sessaoDbId && acaoAtiva.dbId) {
      await supabase.from("operants").insert({
        sessao_id:    sessaoDbId,
        action_id:    acaoAtiva.dbId,
        sd:           op.sd || null,
        resposta:     op.resposta,
        correto:      op.correto,
        prompt_level: op.promptLevel,
        reforco:      op.reforco || null,
        tipo:         op.tipo,
      });
    }

    // Atualizar ação com novo operante
    const acaoAtualizada = { ...acaoAtiva, operantes: [...acaoAtiva.operantes, op] };
    setAcaoAtiva(acaoAtualizada);
    setAcoes(prev => prev.map(a => a.id === acaoAtiva.id ? acaoAtualizada : a));

    // Reset form
    setOperanteNovo(prev => ({ ...prev, correto: null, sd: "", reforco: "" }));
  }

  // ── Registrar evento ───────────────────────────────────────────────────────
  async function registrarEvento(
    tipo: EventType,
    intensidade?: "low" | "medium" | "high",
    contexto?: string,
    programaId?: string
  ) {
    const ev: EventoSessao = { id: uid(), tipo, timestamp: Date.now(), intensidade, contexto, programaId };
    setEventos(prev => [ev, ...prev]);

    if (sessaoDbId) {
      const stageAtualObj = stages[stageAtual];
      await supabase.from("session_events").insert({
        sessao_id:   sessaoDbId,
        stage_id:    stageAtualObj.dbId ?? null,
        action_id:   acaoAtiva?.dbId ?? null,
        programa_id: programaId ?? null,
        tipo,
        intensidade: intensidade ?? null,
        contexto:    contexto ?? null,
        timestamp:   new Date().toISOString(),
      });
    }
  }

  // ── Pausa/retomada ─────────────────────────────────────────────────────────
  function togglePausa() {
    if (emPausa) {
      setEmPausa(false);
      registrarEvento("session_resumed");
    } else {
      setEmPausa(true);
      registrarEvento("session_paused");
    }
  }

  // ── Encerrar sessão ────────────────────────────────────────────────────────
  async function encerrarSessao() {
    if (sessaoDbId) {
      await supabase.from("sessoes_v2").update({
        status:           "finalizada",
        fim:              new Date().toISOString(),
        duracao_segundos: segundos,
      }).eq("id", sessaoDbId);
    }
    setFase("encerramento");
  }

  // ── CSS ────────────────────────────────────────────────────────────────────
  const card: React.CSSProperties = {
    background: "rgba(13,32,53,.85)",
    border: "1px solid rgba(26,58,92,.6)",
    borderRadius: 14,
  };

  // ── LOADING ────────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#07111f", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ fontSize: 13, color: "rgba(160,200,235,.6)" }}>Carregando sessão...</div>
    </div>
  );

  // ══════════════════════════════════════════════════════════════════════════
  // FASE: PREPARAÇÃO
  // ══════════════════════════════════════════════════════════════════════════
  if (fase === "preparacao") return (
    <div style={{ minHeight: "100vh", background: "#07111f", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-sans)", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 560, display: "flex", flexDirection: "column", gap: 16 }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 8 }}>
          <div style={{ fontSize: 11, color: "rgba(160,200,235,.4)", textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 8 }}>
            {modo.label} · {nivel === "terapeuta" ? "Terapeuta" : nivel === "coordenador" ? "Coordenador" : "Supervisor"}
          </div>
          <h1 style={{ fontSize: "1.4rem", fontWeight: 800, color: "#e8f0f8", margin: 0, marginBottom: 6 }}>
            Nova Sessão Clínica
          </h1>
          {paciente ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: paciente.gradient, display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".7rem", fontWeight: 800, color: "#fff" }}>{paciente.iniciais}</div>
              <div style={{ textAlign: "left" }}>
                <div style={{ fontSize: ".95rem", fontWeight: 700, color: "#e8f0f8" }}>{paciente.nome}</div>
                <div style={{ fontSize: ".72rem", color: "rgba(160,200,235,.6)" }}>{paciente.diagnostico}</div>
              </div>
            </div>
          ) : (
            <div style={{ fontSize: ".8rem", color: "rgba(160,200,235,.4)" }}>Nenhum paciente selecionado</div>
          )}
        </div>

        {/* Roteiro da sessão */}
        <div style={{ ...card, padding: 20 }}>
          <div style={{ fontSize: ".75rem", fontWeight: 700, color: "rgba(170,210,245,.88)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 14 }}>
            Roteiro clínico — {stages.length} estágios
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {stages.map((st, i) => {
              const cfg = STAGES_CONFIG[st.key];
              return (
                <div key={st.key} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", background: "rgba(26,58,92,.2)", borderRadius: 9 }}>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: `${cfg.cor}22`, border: `1px solid ${cfg.cor}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".8rem", flexShrink: 0 }}>
                    {cfg.icone}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: ".78rem", fontWeight: 600, color: "#e8f0f8" }}>{cfg.label}</div>
                    {modo.mostrarDicas && <div style={{ fontSize: ".65rem", color: "rgba(160,200,235,.5)" }}>{cfg.descricao}</div>}
                  </div>
                  {!cfg.obrigatorio && (
                    <span style={{ fontSize: ".6rem", color: "rgba(160,200,235,.35)", background: "rgba(26,58,92,.4)", borderRadius: 20, padding: "2px 8px" }}>opcional</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Programas disponíveis */}
        {programasDisp.length > 0 && (
          <div style={{ ...card, padding: 16 }}>
            <div style={{ fontSize: ".72rem", color: "rgba(170,210,245,.6)", marginBottom: 10 }}>
              {programasDisp.length} programa(s) disponível(is) para esta sessão
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {programasDisp.map(p => (
                <span key={p.id} style={{ fontSize: ".7rem", padding: "3px 10px", borderRadius: 20, background: "rgba(29,158,117,.1)", border: "1px solid rgba(29,158,117,.2)", color: "#1D9E75" }}>
                  {p.nome}
                </span>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={iniciarSessao}
          disabled={!paciente}
          style={{ padding: "14px", borderRadius: 12, border: "none", background: paciente ? "linear-gradient(135deg,#1D9E75,#0f8f7a)" : "rgba(26,58,92,.4)", color: paciente ? "#07111f" : "rgba(160,200,235,.3)", fontWeight: 800, fontSize: ".95rem", cursor: paciente ? "pointer" : "not-allowed", fontFamily: "var(--font-sans)" }}
        >
          Iniciar sessão clínica →
        </button>
      </div>
    </div>
  );

  // ══════════════════════════════════════════════════════════════════════════
  // FASE: SESSÃO ATIVA
  // ══════════════════════════════════════════════════════════════════════════
  if (fase === "sessao") {
    const stageAtualObj = stages[stageAtual];
    const stageConfig   = STAGES_CONFIG[stageAtualObj.key];
    const checklistCompleto = Object.values(stageAtualObj.checklist).every(v => v === true) ||
      stageConfig.checklist_items.length === 0;

    return (
      <div style={{ minHeight: "100vh", background: "#07111f", fontFamily: "var(--font-sans)", display: "flex", flexDirection: "column" }}>

        {/* ── TOPBAR ── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 24px", background: "rgba(7,17,31,.8)", borderBottom: "1px solid rgba(26,58,92,.4)", backdropFilter: "blur(10px)", position: "sticky", top: 0, zIndex: 20 }}>
          {/* Paciente */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {paciente && (
              <>
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: paciente.gradient, display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".62rem", fontWeight: 800, color: "#fff" }}>{paciente.iniciais}</div>
                <div>
                  <div style={{ fontSize: ".82rem", fontWeight: 700, color: "#e8f0f8" }}>{paciente.nome}</div>
                  <div style={{ fontSize: ".65rem", color: "rgba(160,200,235,.5)" }}>{stageConfig.icone} {stageConfig.label}</div>
                </div>
              </>
            )}
          </div>

          {/* Timer */}
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "1.6rem", fontWeight: 800, color: emPausa ? "#EF9F27" : "#1D9E75", fontFamily: "monospace", letterSpacing: ".05em" }}>{fmt(segundos)}</div>
            <div style={{ fontSize: ".6rem", color: "rgba(160,200,235,.4)", textTransform: "uppercase", letterSpacing: ".08em" }}>{emPausa ? "pausada" : "em andamento"}</div>
          </div>

          {/* Ações rápidas */}
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={togglePausa} style={{ padding: "7px 14px", borderRadius: 8, border: `1px solid ${emPausa ? "rgba(29,158,117,.3)" : "rgba(239,159,39,.3)"}`, background: emPausa ? "rgba(29,158,117,.1)" : "rgba(239,159,39,.1)", color: emPausa ? "#1D9E75" : "#EF9F27", fontSize: ".75rem", fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-sans)" }}>
              {emPausa ? "▶ Retomar" : "⏸ Pausar"}
            </button>
            <button onClick={() => concluirStage(stageAtual)} style={{ padding: "7px 14px", borderRadius: 8, border: "1px solid rgba(224,90,75,.3)", background: "rgba(224,90,75,.08)", color: "#E05A4B", fontSize: ".75rem", fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-sans)" }}>
              Encerrar sessão
            </button>
          </div>
        </div>

        {/* ── CORPO PRINCIPAL ── */}
        <div style={{ flex: 1, display: "grid", gridTemplateColumns: "200px 1fr 280px", gap: 0, height: "calc(100vh - 65px)" }}>

          {/* ─ COLUNA ESQUERDA: Linha do tempo dos estágios ─ */}
          <div style={{ borderRight: "1px solid rgba(26,58,92,.4)", padding: "16px 12px", overflowY: "auto", background: "rgba(7,17,31,.4)" }}>
            <div style={{ fontSize: ".6rem", color: "rgba(160,200,235,.4)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 12 }}>Estágios</div>
            {stages.map((st, i) => {
              const cfg  = STAGES_CONFIG[st.key];
              const ativo = i === stageAtual;
              const concluido = st.status === "completed" || st.status === "skipped";
              return (
                <div key={st.key} style={{ display: "flex", gap: 8, marginBottom: 4 }}>
                  {/* Linha timeline */}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 20 }}>
                    <div style={{
                      width: 18, height: 18, borderRadius: "50%", flexShrink: 0,
                      background: concluido ? cfg.cor : ativo ? `${cfg.cor}33` : "rgba(26,58,92,.5)",
                      border: `2px solid ${concluido ? cfg.cor : ativo ? cfg.cor : "rgba(26,58,92,.6)"}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: ".55rem", color: concluido ? "#fff" : ativo ? cfg.cor : "rgba(160,200,235,.3)",
                    }}>
                      {concluido ? "✓" : ativo ? "●" : i + 1}
                    </div>
                    {i < stages.length - 1 && (
                      <div style={{ width: 1, flex: 1, minHeight: 16, background: concluido ? `${cfg.cor}44` : "rgba(26,58,92,.4)", margin: "2px 0" }} />
                    )}
                  </div>
                  {/* Label */}
                  <button
                    onClick={() => (modo.podePularEstagios || concluido) ? setStageAtual(i) : undefined}
                    style={{
                      flex: 1, textAlign: "left", background: ativo ? `${cfg.cor}12` : "transparent",
                      border: `1px solid ${ativo ? `${cfg.cor}33` : "transparent"}`,
                      borderRadius: 8, padding: "6px 8px", cursor: modo.podePularEstagios ? "pointer" : "default",
                      marginBottom: 4,
                    }}
                  >
                    <div style={{ fontSize: ".65rem", color: ativo ? cfg.cor : concluido ? "rgba(160,200,235,.5)" : "rgba(160,200,235,.35)", fontWeight: ativo ? 700 : 400, lineHeight: 1.3 }}>
                      {cfg.icone} {cfg.label}
                    </div>
                    {st.status === "skipped" && <div style={{ fontSize: ".55rem", color: "rgba(160,200,235,.3)" }}>pulado</div>}
                  </button>
                </div>
              );
            })}
          </div>

          {/* ─ COLUNA CENTRAL: Conteúdo do estágio ─ */}
          <div style={{ overflowY: "auto", padding: "20px 24px" }}>

            {/* Header do estágio */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                <span style={{ fontSize: "1.3rem" }}>{stageConfig.icone}</span>
                <div>
                  <h2 style={{ fontSize: "1rem", fontWeight: 800, color: "#e8f0f8", margin: 0 }}>{stageConfig.label}</h2>
                  {modo.mostrarDicas && (
                    <div style={{ fontSize: ".72rem", color: "rgba(160,200,235,.5)", marginTop: 2 }}>{stageConfig.descricao}</div>
                  )}
                </div>
              </div>
            </div>

            {/* ── Checklist do estágio ── */}
            {stageConfig.checklist_items.length > 0 && (
              <div style={{ ...card, padding: 18, marginBottom: 16 }}>
                <div style={{ fontSize: ".68rem", color: "rgba(170,210,245,.88)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 12 }}>Checklist clínico</div>
                {stageConfig.checklist_items.map(item => (
                  <button
                    key={item.key}
                    onClick={() => toggleChecklist(stageAtual, item.key)}
                    style={{
                      display: "flex", alignItems: "center", gap: 10, width: "100%",
                      padding: "10px 12px", borderRadius: 9, marginBottom: 6,
                      background: stageAtualObj.checklist[item.key] ? "rgba(29,158,117,.1)" : "rgba(26,58,92,.2)",
                      border: `1px solid ${stageAtualObj.checklist[item.key] ? "rgba(29,158,117,.3)" : "rgba(26,58,92,.4)"}`,
                      cursor: "pointer", fontFamily: "var(--font-sans)", textAlign: "left",
                    }}
                  >
                    <div style={{
                      width: 18, height: 18, borderRadius: 5, flexShrink: 0,
                      background: stageAtualObj.checklist[item.key] ? "#1D9E75" : "transparent",
                      border: `2px solid ${stageAtualObj.checklist[item.key] ? "#1D9E75" : "rgba(26,58,92,.6)"}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: ".65rem", color: "#fff",
                    }}>
                      {stageAtualObj.checklist[item.key] ? "✓" : ""}
                    </div>
                    <span style={{ fontSize: ".78rem", color: stageAtualObj.checklist[item.key] ? "#1D9E75" : "rgba(160,200,235,.8)" }}>
                      {item.label}
                    </span>
                  </button>
                ))}

                {/* Notas do estágio */}
                <textarea
                  value={stageAtualObj.notas}
                  onChange={e => setStages(prev => prev.map((s, i) => i === stageAtual ? { ...s, notas: e.target.value } : s))}
                  placeholder="Observações deste estágio..."
                  rows={2}
                  style={{ width: "100%", marginTop: 8, padding: "8px 10px", borderRadius: 8, border: "1px solid rgba(26,58,92,.5)", background: "rgba(13,32,53,.6)", color: "#e8f0f8", fontSize: ".75rem", fontFamily: "var(--font-sans)", resize: "none", outline: "none", boxSizing: "border-box" }}
                />
              </div>
            )}

            {/* ── Ações clínicas (estágio clinical_actions) ── */}
            {stageAtualObj.key === "clinical_actions" && (
              <div style={{ marginBottom: 16 }}>

                {/* Área de drop para programas */}
                <div
                  onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={e => {
                    e.preventDefault();
                    setDragOver(false);
                    const progId = e.dataTransfer.getData("programaId");
                    const prog = programasDisp.find(p => p.id === progId);
                    if (prog) adicionarAcao(prog);
                  }}
                  style={{
                    border: `2px dashed ${dragOver ? "#1D9E75" : "rgba(26,58,92,.5)"}`,
                    borderRadius: 12, padding: "16px", marginBottom: 16, textAlign: "center",
                    background: dragOver ? "rgba(29,158,117,.05)" : "transparent",
                    transition: "all .2s",
                  }}
                >
                  <div style={{ fontSize: ".75rem", color: "rgba(160,200,235,.4)" }}>
                    Arraste um programa aqui ou clique em + na lista →
                  </div>
                </div>

                {/* Ações adicionadas */}
                {acoes.map(acao => {
                  const isAtiva  = acaoAtiva?.id === acao.id;
                  const acertos  = acao.operantes.filter(o => o.correto).length;
                  const total    = acao.operantes.length;
                  const taxa     = total > 0 ? Math.round((acertos / total) * 100) : 0;
                  return (
                    <div key={acao.id} style={{ ...card, marginBottom: 12, border: isAtiva ? "1px solid rgba(29,158,117,.4)" : "1px solid rgba(26,58,92,.6)" }}>
                      <div
                        onClick={() => setAcaoAtiva(isAtiva ? null : acao)}
                        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", cursor: "pointer" }}
                      >
                        <div>
                          <div style={{ fontSize: ".82rem", fontWeight: 700, color: "#e8f0f8" }}>{acao.programaNome}</div>
                          <div style={{ fontSize: ".65rem", color: "rgba(160,200,235,.5)" }}>{acao.tipo === "intervention" ? "Intervenção" : "Avaliação"} · {total} operantes</div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: "1.2rem", fontWeight: 800, color: taxa >= 80 ? "#1D9E75" : taxa >= 50 ? "#EF9F27" : "#E05A4B" }}>{total > 0 ? `${taxa}%` : "—"}</div>
                          <div style={{ fontSize: ".6rem", color: "rgba(160,200,235,.4)" }}>{acertos}/{total} corretos</div>
                        </div>
                      </div>

                      {/* Registro de operante */}
                      {isAtiva && (
                        <div style={{ padding: "0 16px 16px", borderTop: "1px solid rgba(26,58,92,.3)" }}>
                          <div style={{ paddingTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>

                            {/* SD */}
                            <input
                              value={operanteNovo.sd}
                              onChange={e => setOperanteNovo(p => ({ ...p, sd: e.target.value }))}
                              placeholder="SD / estímulo (opcional)"
                              style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid rgba(26,58,92,.5)", background: "rgba(13,32,53,.6)", color: "#e8f0f8", fontSize: ".75rem", fontFamily: "var(--font-sans)", outline: "none" }}
                            />

                            {/* Resultado */}
                            <div>
                              <div style={{ fontSize: ".65rem", color: "rgba(170,210,245,.6)", marginBottom: 6 }}>Resultado</div>
                              <div style={{ display: "flex", gap: 8 }}>
                                {[
                                  { val: true,  label: "✓ Correto",   cor: "#1D9E75" },
                                  { val: false, label: "✗ Incorreto", cor: "#E05A4B" },
                                ].map(r => (
                                  <button
                                    key={String(r.val)}
                                    onClick={() => setOperanteNovo(p => ({ ...p, correto: r.val }))}
                                    style={{
                                      flex: 1, padding: "10px", borderRadius: 9, cursor: "pointer", fontFamily: "var(--font-sans)", fontWeight: 700, fontSize: ".82rem",
                                      border: `1px solid ${operanteNovo.correto === r.val ? r.cor : "rgba(26,58,92,.5)"}`,
                                      background: operanteNovo.correto === r.val ? `${r.cor}22` : "transparent",
                                      color: operanteNovo.correto === r.val ? r.cor : "rgba(160,200,235,.6)",
                                    }}
                                  >{r.label}</button>
                                ))}
                              </div>
                            </div>

                            {/* Nível de prompt */}
                            <div>
                              <div style={{ fontSize: ".65rem", color: "rgba(170,210,245,.6)", marginBottom: 6 }}>Nível de dica</div>
                              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                                {(Object.entries(PROMPT_LABELS) as [PromptLevel, string][]).map(([key, label]) => (
                                  <button
                                    key={key}
                                    onClick={() => setOperanteNovo(p => ({ ...p, promptLevel: key }))}
                                    style={{
                                      padding: "5px 10px", borderRadius: 20, cursor: "pointer", fontFamily: "var(--font-sans)", fontSize: ".68rem",
                                      border: `1px solid ${operanteNovo.promptLevel === key ? "#378ADD55" : "rgba(26,58,92,.5)"}`,
                                      background: operanteNovo.promptLevel === key ? "rgba(55,138,221,.15)" : "transparent",
                                      color: operanteNovo.promptLevel === key ? "#378ADD" : "rgba(160,200,235,.6)",
                                    }}
                                  >{label}</button>
                                ))}
                              </div>
                            </div>

                            <button
                              onClick={registrarOperante}
                              disabled={operanteNovo.correto === null}
                              style={{
                                padding: "10px", borderRadius: 9, border: "none", fontFamily: "var(--font-sans)", fontWeight: 700, fontSize: ".82rem", cursor: operanteNovo.correto !== null ? "pointer" : "not-allowed",
                                background: operanteNovo.correto !== null ? "linear-gradient(135deg,#1D9E75,#0f8f7a)" : "rgba(26,58,92,.4)",
                                color: operanteNovo.correto !== null ? "#07111f" : "rgba(160,200,235,.3)",
                              }}
                            >Registrar operante</button>

                            {/* Histórico de operantes */}
                            {acao.operantes.length > 0 && (
                              <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 4 }}>
                                {acao.operantes.map((op, i) => (
                                  <div key={op.id} title={`${PROMPT_LABELS[op.promptLevel]} · ${op.sd || "sem SD"}`} style={{
                                    width: 28, height: 28, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center",
                                    background: op.correto ? "rgba(29,158,117,.2)" : "rgba(224,90,75,.2)",
                                    border: `1px solid ${op.correto ? "rgba(29,158,117,.4)" : "rgba(224,90,75,.4)"}`,
                                    fontSize: ".7rem", color: op.correto ? "#1D9E75" : "#E05A4B", fontWeight: 700,
                                  }}>
                                    {op.correto ? "✓" : "✗"}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── Botões de navegação do estágio ── */}
            <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
              {modo.podePularEstagios && stageAtualObj.key !== "clinical_actions" && (
                <button
                  onClick={() => concluirStage(stageAtual, true)}
                  style={{ padding: "9px 16px", borderRadius: 9, border: "1px solid rgba(26,58,92,.5)", background: "transparent", color: "rgba(160,200,235,.5)", fontSize: ".75rem", cursor: "pointer", fontFamily: "var(--font-sans)" }}
                >
                  Pular estágio →
                </button>
              )}
              <button
                onClick={() => concluirStage(stageAtual)}
                disabled={stageConfig.checklist_items.length > 0 && !checklistCompleto && !modo.podePularEstagios}
                style={{
                  flex: 1, padding: "11px", borderRadius: 9, border: "none",
                  background: (checklistCompleto || modo.podePularEstagios || stageConfig.checklist_items.length === 0)
                    ? `linear-gradient(135deg,${stageConfig.cor},${stageConfig.cor}99)` : "rgba(26,58,92,.4)",
                  color: (checklistCompleto || modo.podePularEstagios || stageConfig.checklist_items.length === 0) ? "#07111f" : "rgba(160,200,235,.3)",
                  fontWeight: 700, fontSize: ".82rem", cursor: "pointer", fontFamily: "var(--font-sans)",
                }}
              >
                {stageAtual === stages.length - 1 ? "Finalizar sessão" : `Próximo: ${STAGES_CONFIG[stages[Math.min(stageAtual + 1, stages.length-1)].key].label} →`}
              </button>
            </div>
          </div>

          {/* ─ COLUNA DIREITA: Programas + Eventos ─ */}
          <div style={{ borderLeft: "1px solid rgba(26,58,92,.4)", display: "flex", flexDirection: "column", background: "rgba(7,17,31,.4)" }}>

            {/* Programas disponíveis */}
            <div style={{ flex: 1, overflowY: "auto", padding: "16px 12px" }}>
              <div style={{ fontSize: ".6rem", color: "rgba(160,200,235,.4)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 10 }}>
                Programas disponíveis
              </div>
              {programasDisp.map(prog => (
                <div
                  key={prog.id}
                  draggable
                  onDragStart={e => e.dataTransfer.setData("programaId", prog.id)}
                  style={{ padding: "10px 12px", borderRadius: 9, background: "rgba(26,58,92,.2)", border: "1px solid rgba(26,58,92,.4)", marginBottom: 6, cursor: "grab" }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                    <div style={{ fontSize: ".75rem", fontWeight: 600, color: "#e8f0f8" }}>{prog.nome}</div>
                    <button
                      onClick={() => adicionarAcao(prog)}
                      style={{ width: 22, height: 22, borderRadius: "50%", border: "1px solid rgba(29,158,117,.3)", background: "rgba(29,158,117,.1)", color: "#1D9E75", fontSize: ".8rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
                    >+</button>
                  </div>
                  <div style={{ fontSize: ".62rem", color: "rgba(160,200,235,.4)" }}>{prog.dominio}</div>
                </div>
              ))}

              {/* Eventos rápidos */}
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: ".6rem", color: "rgba(160,200,235,.4)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 10 }}>
                  Registrar evento
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  {([
                    ["assent_revoked",  "Assentimento revogado", "medium"],
                    ["avoidance_signal","Sinal de esquiva",      "low"   ],
                    ["distress_signal", "Sinal de desconforto",  "medium"],
                    ["break_requested", "Pausa solicitada",      "low"   ],
                    ["assent_recovered","Assentimento recuperado","low"  ],
                  ] as [EventType, string, "low"|"medium"|"high"][]).map(([tipo, label, int]) => {
                    const cfg = EVENT_LABELS[tipo];
                    return (
                      <button
                        key={tipo}
                        onClick={() => registrarEvento(tipo, int)}
                        style={{
                          padding: "7px 10px", borderRadius: 8, border: `1px solid ${cfg.cor}22`,
                          background: `${cfg.cor}0a`, color: cfg.cor,
                          fontSize: ".68rem", fontWeight: 600, cursor: "pointer",
                          fontFamily: "var(--font-sans)", textAlign: "left",
                          display: "flex", alignItems: "center", gap: 6,
                        }}
                      >
                        <span>{cfg.icone}</span> {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Timeline de eventos */}
            <div style={{ borderTop: "1px solid rgba(26,58,92,.4)", padding: "12px", maxHeight: 200, overflowY: "auto" }}>
              <div style={{ fontSize: ".6rem", color: "rgba(160,200,235,.4)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 8 }}>
                Eventos ({eventos.length})
              </div>
              {eventos.slice(0, 10).map(ev => {
                const cfg = EVENT_LABELS[ev.tipo];
                const min = Math.floor((ev.timestamp - (Date.now() - segundos * 1000)) / 60000);
                const sec = Math.floor(((ev.timestamp - (Date.now() - segundos * 1000)) % 60000) / 1000);
                return (
                  <div key={ev.id} style={{ display: "flex", gap: 6, marginBottom: 5, alignItems: "flex-start" }}>
                    <span style={{ fontSize: ".65rem", color: cfg.cor, flexShrink: 0 }}>{cfg.icone}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: ".65rem", color: "rgba(160,200,235,.7)" }}>{cfg.label}</div>
                      <div style={{ fontSize: ".58rem", color: "rgba(160,200,235,.3)" }}>{fmt(segundos)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // FASE: ENCERRAMENTO
  // ══════════════════════════════════════════════════════════════════════════
  const totalOperantes = acoes.reduce((a, ac) => a + ac.operantes.length, 0);
  const totalAcertos   = acoes.reduce((a, ac) => a + ac.operantes.filter(o => o.correto).length, 0);
  const taxaGeral      = totalOperantes > 0 ? Math.round((totalAcertos / totalOperantes) * 100) : 0;
  const eventoAssent   = eventos.filter(e => e.tipo === "assent_given" || e.tipo === "assent_revoked");
  const assentRevogado = eventos.find(e => e.tipo === "assent_revoked");

  return (
    <div style={{ minHeight: "100vh", background: "#07111f", fontFamily: "var(--font-sans)", padding: "24px 28px" }}>
      <div style={{ maxWidth: 680, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 }}>

        {/* Header encerramento */}
        <div style={{ textAlign: "center", padding: "16px 0" }}>
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(29,158,117,.15)", border: "1px solid rgba(29,158,117,.3)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px", fontSize: 22 }}>✓</div>
          <div style={{ fontSize: "1.3rem", fontWeight: 800, color: "#e8f0f8", marginBottom: 4 }}>Sessão finalizada</div>
          <div style={{ fontSize: ".82rem", color: "rgba(160,200,235,.6)" }}>
            {paciente?.nome} · {fmt(segundos)} · {totalOperantes} operantes
          </div>
        </div>

        {/* KPIs */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
          {[
            { l: "Duração",        v: fmt(segundos),       c: "#e8f0f8" },
            { l: "Taxa de acerto", v: `${taxaGeral}%`,     c: taxaGeral >= 80 ? "#1D9E75" : taxaGeral >= 50 ? "#EF9F27" : "#E05A4B" },
            { l: "Operantes",      v: totalOperantes,      c: "#378ADD" },
            { l: "Eventos",        v: eventos.length,      c: "#8B7FE8" },
          ].map(k => (
            <div key={k.l} style={{ ...card, padding: "14px 16px" }}>
              <div style={{ fontSize: ".58rem", color: "rgba(170,210,245,.88)", marginBottom: 4 }}>{k.l}</div>
              <div style={{ fontSize: "1.3rem", fontWeight: 800, color: k.c }}>{k.v}</div>
            </div>
          ))}
        </div>

        {/* Resumo por programa */}
        {acoes.map(ac => {
          const ac_total  = ac.operantes.length;
          const ac_certos = ac.operantes.filter(o => o.correto).length;
          const ac_taxa   = ac_total > 0 ? Math.round((ac_certos / ac_total) * 100) : 0;
          return (
            <div key={ac.id} style={{ ...card, padding: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: ".88rem", fontWeight: 700, color: "#e8f0f8" }}>{ac.programaNome}</div>
                  <div style={{ fontSize: ".68rem", color: "rgba(160,200,235,.5)" }}>{ac.programaDominio} · {ac_total} operantes</div>
                </div>
                <div style={{ fontSize: "1.6rem", fontWeight: 800, color: ac_taxa >= 80 ? "#1D9E75" : ac_taxa >= 50 ? "#EF9F27" : "#E05A4B" }}>{ac_taxa}%</div>
              </div>
              <div style={{ height: 5, background: "rgba(26,58,92,.5)", borderRadius: 50, overflow: "hidden", marginBottom: 10 }}>
                <div style={{ height: "100%", width: `${ac_taxa}%`, background: ac_taxa >= 80 ? "#1D9E75" : ac_taxa >= 50 ? "#EF9F27" : "#E05A4B" }} />
              </div>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {ac.operantes.map(op => (
                  <div key={op.id} title={PROMPT_LABELS[op.promptLevel]} style={{
                    width: 24, height: 24, borderRadius: 5,
                    background: op.correto ? "rgba(29,158,117,.2)" : "rgba(224,90,75,.2)",
                    border: `1px solid ${op.correto ? "rgba(29,158,117,.4)" : "rgba(224,90,75,.4)"}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: ".65rem", color: op.correto ? "#1D9E75" : "#E05A4B",
                  }}>{op.correto ? "✓" : "✗"}</div>
                ))}
              </div>
            </div>
          );
        })}

        {/* Dados de assentimento */}
        {eventoAssent.length > 0 && (
          <div style={{ ...card, padding: 18 }}>
            <div style={{ fontSize: ".72rem", fontWeight: 700, color: "#8B7FE8", marginBottom: 10 }}>Dados de assentimento</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div style={{ background: "rgba(26,58,92,.25)", borderRadius: 9, padding: "10px 12px" }}>
                <div style={{ fontSize: ".6rem", color: "rgba(170,210,245,.6)", marginBottom: 4 }}>Assentimento inicial</div>
                <div style={{ fontSize: ".85rem", fontWeight: 600, color: "#1D9E75" }}>
                  {eventos.find(e => e.tipo === "assent_given") ? `${fmt(Math.floor((eventos.find(e => e.tipo === "assent_given")!.timestamp - Date.now() + segundos * 1000) / 1000))} min` : "—"}
                </div>
              </div>
              <div style={{ background: "rgba(26,58,92,.25)", borderRadius: 9, padding: "10px 12px" }}>
                <div style={{ fontSize: ".6rem", color: "rgba(170,210,245,.6)", marginBottom: 4 }}>Revogações</div>
                <div style={{ fontSize: ".85rem", fontWeight: 600, color: assentRevogado ? "#E05A4B" : "#1D9E75" }}>
                  {eventos.filter(e => e.tipo === "assent_revoked").length}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Eventos registrados */}
        {eventos.length > 0 && (
          <div style={{ ...card, padding: 18 }}>
            <div style={{ fontSize: ".72rem", fontWeight: 700, color: "rgba(170,210,245,.88)", marginBottom: 10 }}>Timeline de eventos ({eventos.length})</div>
            {[...eventos].reverse().map(ev => {
              const cfg = EVENT_LABELS[ev.tipo];
              return (
                <div key={ev.id} style={{ display: "flex", gap: 8, padding: "7px 0", borderBottom: "1px solid rgba(26,58,92,.2)" }}>
                  <span style={{ color: cfg.cor, fontSize: ".75rem", flexShrink: 0 }}>{cfg.icone}</span>
                  <span style={{ fontSize: ".75rem", color: "rgba(160,200,235,.7)", flex: 1 }}>{cfg.label}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Conexão FractaCare */}
        <div style={{ background: "rgba(29,158,117,.06)", border: "1px solid rgba(29,158,117,.2)", borderRadius: 14, padding: 16 }}>
          <div style={{ fontSize: ".72rem", color: "#1D9E75", fontWeight: 700, marginBottom: 6 }}>FractaCare — dados sincronizados</div>
          <div style={{ fontSize: ".78rem", color: "rgba(160,200,235,.8)", lineHeight: 1.6 }}>
            Operantes e eventos desta sessão foram salvos. O radar de {paciente?.nome} será atualizado automaticamente.
          </div>
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          <button
            onClick={() => router.push(`/clinic/paciente/${paciente?.id}`)}
            style={{ flex: 1, padding: 14, borderRadius: 10, border: "1px solid rgba(70,120,180,.5)", background: "transparent", color: "rgba(160,200,235,.9)", fontWeight: 600, fontSize: ".85rem", cursor: "pointer", fontFamily: "var(--font-sans)" }}
          >
            Ver perfil do paciente
          </button>
          <button
            onClick={() => router.push("/clinic/dashboard")}
            style={{ flex: 1, padding: 14, borderRadius: 10, border: "none", background: "linear-gradient(135deg,#1D9E75,#0f8f7a)", color: "#07111f", fontWeight: 800, fontSize: ".85rem", cursor: "pointer", fontFamily: "var(--font-sans)" }}
          >
            Voltar ao painel →
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ClinicSessaoPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", background: "#07111f", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontSize: 13, color: "rgba(160,200,235,.6)" }}>Carregando...</div>
      </div>
    }>
      <SessaoPageInner />
    </Suspense>
  );
}
