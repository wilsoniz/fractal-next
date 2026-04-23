"use client";
import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useClinicContext } from "../layout";

// ─── TIPOS ───────────────────────────────────────────────────────────────────
type Resultado   = "correta" | "incorreta" | "aproximacao" | "nao_respondeu";
type Fase        = "preparacao" | "sessao" | "encerramento";
type Senioridade = "terapeuta" | "coordenador" | "supervisor";

interface Tentativa {
  estimulo: string;
  resultado: Resultado;
  dica: number;
  obs?: string;
  ts: number;
}

interface Pausa {
  inicio: number;
  fim?: number;
  motivo: string;
  duracaoSegundos?: number;
}

interface EventoComportamental {
  id: string;
  tipo: string;
  descricao: string;
  ts: number;
}

interface Programa {
  id: string;
  nome: string;
  operante: string;
  objetivo: string;
  sd: string;
  criterio: string;
  nivel_dica: string[];
  nivel_atual: number;
  estimulos: string[];
  total_tentativas: number;
  tentativas: Tentativa[];
}

// Estado do encerramento antecipado
interface EncerramentoAntecipado {
  motivo: string;
  aguardandoResponsavel: boolean;
  responsavelConfirmou: boolean | null;
  supervisorNotificado: boolean;
}

// ─── CONSTANTES ──────────────────────────────────────────────────────────────
const DURACAO_PREVISTA_MIN = 60; // 1 hora padrão
const TEMPO_MINIMO_MIN     = 45; // mínimo sem justificativa pesada

const RESULTADO_CONFIG: Record<Resultado, { label: string; cor: string; bg: string; key: string }> = {
  correta:       { label: "Correta",      cor: "#1D9E75", bg: "rgba(29,158,117,.13)",  key: "1" },
  incorreta:     { label: "Incorreta",    cor: "#E05A4B", bg: "rgba(224,90,75,.13)",   key: "2" },
  aproximacao:   { label: "Aproximação",  cor: "#EF9F27", bg: "rgba(239,159,39,.13)",  key: "3" },
  nao_respondeu: { label: "Sem resposta", cor: "#4d6d8a", bg: "rgba(77,109,138,.13)",  key: "4" },
};

const MOTIVOS_PAUSA = [
  "Criança precisou ir ao banheiro",
  "Interrupção externa (barulho, entrada de pessoa)",
  "Criança em crise comportamental",
  "Problema técnico / material",
  "Pausa para reforçador",
  "Outro motivo",
];

const MOTIVOS_ENCERRAMENTO = [
  "Criança em crise — impossível continuar com segurança",
  "Responsável solicitou encerramento",
  "Problema de saúde da criança",
  "Problema de saúde do terapeuta",
  "Emergência no local",
  "Outro motivo",
];

const EVENTOS_RAPIDOS = [
  { tipo: "fuga",        label: "Fuga",               cor: "#E05A4B" },
  { tipo: "agressao",    label: "Agressão",            cor: "#E05A4B" },
  { tipo: "autoestimul", label: "Autoestimulação",     cor: "#EF9F27" },
  { tipo: "choro",       label: "Choro",               cor: "#EF9F27" },
  { tipo: "riso",        label: "Resposta afetiva",    cor: "#1D9E75" },
  { tipo: "iniciativa",  label: "Iniciativa",          cor: "#1D9E75" },
  { tipo: "transicao",   label: "Dific. transição",    cor: "#8B7FE8" },
  { tipo: "outro",       label: "Outro",               cor: "#4d6d8a" },
];

const PROGRAMAS_MOCK: Programa[] = [
  {
    id: "p1", nome: "Mando funcional — palavra isolada", operante: "Mando",
    objetivo: "Emitir palavra isolada para solicitar item ou ação desejada na presença do SD.",
    sd: "Item desejado visível fora do alcance",
    criterio: "80% de respostas corretas em 3 sessões consecutivas",
    nivel_dica: ["Independente","Gestual","Modelo","Física"], nivel_atual: 0,
    estimulos: ["Bola","Suco","Biscoito","Tablet","Massinha"],
    total_tentativas: 10, tentativas: [],
  },
  {
    id: "p2", nome: "Atenção ao nome", operante: "Ouvinte",
    objetivo: "Orientar o olhar para o terapeuta em até 3s após ser chamado pelo nome.",
    sd: "Nome da criança chamado em tom neutro",
    criterio: "90% em 2 sessões consecutivas",
    nivel_dica: ["Independente","Gestual","Física"], nivel_atual: 0,
    estimulos: ["Tentativa 1","Tentativa 2","Tentativa 3","Tentativa 4","Tentativa 5"],
    total_tentativas: 5, tentativas: [],
  },
  {
    id: "p3", nome: "Imitação motora simples", operante: "Imitação",
    objetivo: "Imitar ação motora grossa demonstrada pelo terapeuta imediatamente após o modelo.",
    sd: "Terapeuta executa ação + 'Faça assim'",
    criterio: "85% em 2 sessões consecutivas",
    nivel_dica: ["Independente","Gestual","Físico parcial","Físico total"], nivel_atual: 1,
    estimulos: ["Bater palma","Levantar braço","Bater mesa","Apontar"],
    total_tentativas: 8, tentativas: [],
  },
];

const PACIENTE_MOCK = {
  init: "LM", gradient: "linear-gradient(135deg,#1D9E75,#378ADD)",
  nome: "Lucas Marques", primeiroNome: "Lucas",
  idade: "4 anos", cuidadorAtivo: true,
  taxaMedia: 72, ultimaSessao: "3 dias atrás",
  temSupervisor: false, // sem supervisor vinculado no Fracta
};

interface ModoConfig {
  label: string;
  cor: string;
  bg: string;
  borda: string;
  // Dicas e critério
  podeAjustarCriterio: boolean;   // ajustar nível de dica durante tentativa
  podeVerCriterioCompleto: boolean; // ver critério completo vs resumido
  // Navegação
  podePularPrograma: boolean;     // pular para próximo programa
  // Encerramento
  motivoEncerramento: "lista_fixa" | "lista_livre"; // lista fixa ou campo livre
  // Eventos comportamentais
  podeRegistrarEventoLivre: boolean; // campo livre vs só lista rápida
  // Métricas
  nivelMetricas: "basico" | "completo" | "avancado"; // o que aparece no painel lateral
  // Observações
  podeObsPrograma: boolean;       // observação por tentativa
  podeObsGeral: boolean;          // observação geral no encerramento
  // Engine
  podeVerInsightsEngine: boolean; // bloco de insights do FractaEngine na sessão
}

const MODO_CONFIG: Record<Senioridade, ModoConfig> = {
  terapeuta: {
    label: "Modo guiado",
    cor: "#1D9E75", bg: "rgba(29,158,117,.08)", borda: "rgba(29,158,117,.25)",
    podeAjustarCriterio:      false,
    podeVerCriterioCompleto:  false,
    podePularPrograma:        false,
    motivoEncerramento:       "lista_fixa",
    podeRegistrarEventoLivre: false,
    nivelMetricas:            "basico",
    podeObsPrograma:          false,
    podeObsGeral:             true,
    podeVerInsightsEngine:    false,
  },
  coordenador: {
    label: "Modo semi-guiado",
    cor: "#EF9F27", bg: "rgba(239,159,39,.08)", borda: "rgba(239,159,39,.25)",
    podeAjustarCriterio:      true,
    podeVerCriterioCompleto:  true,
    podePularPrograma:        true,
    motivoEncerramento:       "lista_livre",
    podeRegistrarEventoLivre: true,
    nivelMetricas:            "completo",
    podeObsPrograma:          true,
    podeObsGeral:             true,
    podeVerInsightsEngine:    false,
  },
  supervisor: {
    label: "Modo livre",
    cor: "#8B7FE8", bg: "rgba(139,127,232,.08)", borda: "rgba(139,127,232,.25)",
    podeAjustarCriterio:      true,
    podeVerCriterioCompleto:  true,
    podePularPrograma:        true,
    motivoEncerramento:       "lista_livre",
    podeRegistrarEventoLivre: true,
    nivelMetricas:            "avancado",
    podeObsPrograma:          true,
    podeObsGeral:             true,
    podeVerInsightsEngine:    true,
  },
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function fmt(s: number) {
  const m = Math.floor(s / 60).toString().padStart(2,"0");
  const sec = (s % 60).toString().padStart(2,"0");
  return `${m}:${sec}`;
}
function uid() { return Math.random().toString(36).slice(2,9); }

// ─── PAGE ────────────────────────────────────────────────────────────────────
function ClinicSessaoPageInner() {
  const { terapeuta }    = useClinicContext();
  const nivel: Senioridade = terapeuta?.nivel ?? "coordenador";
  const modo             = MODO_CONFIG[nivel];
  const searchParams     = useSearchParams();
  const pacienteIdParam  = searchParams.get("pacienteId");

  // Estado real do paciente
  const [pacienteReal, setPacienteReal] = useState<{
    id: string; nome: string; primeiroNome: string; init: string;
    gradient: string; idade: string; cuidadorAtivo: boolean; temSupervisor: boolean; taxaMedia: number;
  } | null>(null);
  // Fases e dados
  const [fase,         setFase]         = useState<Fase>("preparacao");
  const [programas,    setProgramas]    = useState<Programa[]>(PROGRAMAS_MOCK);
  const [progAtual,    setProgAtual]    = useState(0);
  const [tentAtual,    setTentAtual]    = useState({ estimulo: "", dica: 0, obs: "" });
  const [obsGeral,     setObsGeral]     = useState("");
  const [eventos,      setEventos]      = useState<EventoComportamental[]>([]);

  // Timer
  const [segundos,     setSegundos]     = useState(0);
  const [emPausa,      setEmPausa]      = useState(false);
  const [pausas,       setPausas]       = useState<Pausa[]>([]);
  const [segPausados,  setSegPausados]  = useState(0); // total acumulado de pausa
  // Carregar paciente e programas reais
  useEffect(() => {
    if (!pacienteIdParam) return;
    async function carregarPaciente() {
      try {
        const { data: crianca } = await supabase
          .from("criancas")
          .select("id, nome, data_nascimento")
          .eq("id", pacienteIdParam)
          .single();
        if (!crianca) return;

        const { data: planos } = await supabase
          .from("planos")
          .select("id, programas ( id, nome, dominio, objetivo )")
          .eq("crianca_id", pacienteIdParam)
          .eq("status", "ativo")
          .limit(5);

        if (planos && planos.length > 0) {
          const progsReais: Programa[] = planos
            .filter((pl: any) => pl.programas)
            .map((pl: any) => {
              const prog = pl.programas as any;
              return {
                id: pl.id,
                nome: prog.nome,
                operante: prog.dominio ?? "Operante",
                objetivo: prog.objetivo ?? `Trabalhar ${prog.nome}`,
                sd: "Estímulo discriminativo conforme programa",
                criterio: "80% em 2 sessões consecutivas",
                nivel_dica: ["Independente","Gestual","Modelo","Física"],
                nivel_atual: 0,
                estimulos: ["Tentativa 1","Tentativa 2","Tentativa 3","Tentativa 4","Tentativa 5"],
                total_tentativas: 10,
                tentativas: [],
              };
            });
          setProgramas(progsReais);
        }

        const idade = crianca.data_nascimento
          ? `${Math.floor((Date.now() - new Date(crianca.data_nascimento).getTime()) / (1000*60*60*24*365.25))} anos`
          : "Idade não informada";

        const { data: radar } = await supabase
          .from("radar_snapshots")
          .select("score_comunicacao, score_social, score_atencao, score_regulacao")
          .eq("crianca_id", pacienteIdParam)
          .order("criado_em", { ascending: false })
          .limit(1)
          .single();

        const scores = radar
          ? [radar.score_comunicacao, radar.score_social, radar.score_atencao, radar.score_regulacao].filter(Boolean)
          : [];
        const taxaMedia = scores.length > 0
          ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length)
          : 0;

        const partes = crianca.nome.trim().split(" ");
        const init = partes.length >= 2
          ? `${partes[0][0]}${partes[partes.length-1][0]}`.toUpperCase()
          : crianca.nome.slice(0,2).toUpperCase();

        setPacienteReal({
          id: crianca.id, nome: crianca.nome, primeiroNome: partes[0], init,
          gradient: "linear-gradient(135deg,#1D9E75,#378ADD)",
          idade, cuidadorAtivo: true, temSupervisor: false, taxaMedia,
        });
      } catch (err) {
        console.error("Erro ao carregar paciente:", err);
      }
    }
    carregarPaciente();
  }, [pacienteIdParam]);

  const pacienteAtivo = pacienteReal ?? PACIENTE_MOCK;

  const salvarSessaoSupabase = useCallback(async () => {
    if (!pacienteReal || !terapeuta) return;
    try {
      const totalTent   = programas.reduce((a, p) => a + p.tentativas.length, 0);
      const acertosTot  = programas.reduce((a, p) => a + p.tentativas.filter(t => t.resultado === "correta").length, 0);
      const taxaFinal   = totalTent > 0 ? Math.round((acertosTot / totalTent) * 100) : 0;
      const planoId     = programas[0]?.id ?? null;
      await supabase.from("sessoes_clinicas").insert({
        crianca_id:       pacienteReal.id,
        responsavel_id:   terapeuta.id,
        plano_id:         planoId,
        tentativas:       programas.flatMap(p => p.tentativas.map(t => t.resultado)),
        total_tentativas: totalTent,
        acertos:          acertosTot,
        taxa_acerto:      taxaFinal,
        duracao_segundos: segundos,
        observacao:       obsGeral || null,
        concluida:        true,
      });
    } catch (err) {
      console.error("Erro ao salvar sessão:", err);
    }
  }, [pacienteReal, terapeuta, programas, segundos, obsGeral]);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pausaRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Modais
  const [modalPausa,       setModalPausa]       = useState(false);
  const [modalEncerrar,    setModalEncerrar]     = useState(false);
  const [modalEventos,     setModalEventos]      = useState(false);
  const [motivoPausa,      setMotivoPausa]       = useState("");
  const [motivoEncerrar,   setMotivoEncerrar]    = useState("");
  const [encerramentoData, setEncerramentoData]  = useState<EncerramentoAntecipado | null>(null);

  // Timer principal (tempo de sessão real, sem pausas)
  const iniciarTimer = useCallback(() => {
    if (timerRef.current) return;
    timerRef.current = setInterval(() => setSegundos(s => s + 1), 1000);
  }, []);
  const pararTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  // Timer de pausa
  const iniciarTimerPausa = useCallback(() => {
    if (pausaRef.current) return;
    pausaRef.current = setInterval(() => setSegPausados(s => s + 1), 1000);
  }, []);
  const pararTimerPausa = useCallback(() => {
    if (pausaRef.current) { clearInterval(pausaRef.current); pausaRef.current = null; }
  }, []);

  useEffect(() => () => { pararTimer(); pararTimerPausa(); }, [pararTimer, pararTimerPausa]);

  // Atalhos de teclado
  useEffect(() => {
    if (fase !== "sessao" || emPausa || modalPausa || modalEncerrar) return;
    const handler = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT") return;
      const map: Record<string, Resultado> = { "1":"correta","2":"incorreta","3":"aproximacao","4":"nao_respondeu" };
      if (map[e.key]) registrarTentativa(map[e.key] as Resultado);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fase, emPausa, modalPausa, modalEncerrar, tentAtual, progAtual]);

  // ── Ações principais ──────────────────────────────────────────────────────
  function iniciarSessao() {
    setFase("sessao");
    iniciarTimer();
    const p = programas[0];
    setTentAtual({ estimulo: p.estimulos[0], dica: p.nivel_atual, obs: "" });
  }

  function registrarTentativa(resultado: Resultado) {
    const prog = programas[progAtual];
    if (!tentAtual.estimulo || emPausa) return;
    const nova: Tentativa = { estimulo: tentAtual.estimulo, resultado, dica: tentAtual.dica, obs: tentAtual.obs, ts: Date.now() };
    setProgramas(prev => {
      const next = prev.map((p, i) => i === progAtual ? { ...p, tentativas: [...p.tentativas, nova] } : p);
      const proxIdx = next[progAtual].tentativas.length;
      if (proxIdx < next[progAtual].total_tentativas) {
        setTentAtual({ estimulo: prog.estimulos[proxIdx % prog.estimulos.length], dica: prog.nivel_atual, obs: "" });
      } else {
        setTentAtual({ estimulo: "", dica: prog.nivel_atual, obs: "" });
      }
      return next;
    });
  }

  function proximoPrograma() {
    if (progAtual >= programas.length - 1) return;
    const prox = programas[progAtual + 1];
    setProgAtual(i => i + 1);
    setTentAtual({ estimulo: prox.estimulos[0], dica: prox.nivel_atual, obs: "" });
  }

  // ── Pausa ─────────────────────────────────────────────────────────────────
  function solicitarPausa() {
    setMotivoPausa("");
    setModalPausa(true);
  }

  function confirmarPausa() {
    if (!motivoPausa.trim()) return;
    pararTimer();
    iniciarTimerPausa();
    setEmPausa(true);
    setPausas(prev => [...prev, { inicio: Date.now(), motivo: motivoPausa }]);
    setModalPausa(false);
  }

  function retomar() {
    pararTimerPausa();
    const duracao = segPausados - pausas.slice(0, -1).reduce((a, p) => a + (p.duracaoSegundos ?? 0), 0);
    setPausas(prev => prev.map((p, i) => i === prev.length - 1 ? { ...p, fim: Date.now(), duracaoSegundos: duracao } : p));
    setEmPausa(false);
    iniciarTimer();
  }

  // ── Encerrar ──────────────────────────────────────────────────────────────
  const minutosEfetivos = Math.floor(segundos / 60);
  const encerrandoAntes = minutosEfetivos < TEMPO_MINIMO_MIN;

  function solicitarEncerramento() {
    setMotivoEncerrar("");
    setModalEncerrar(true);
  }

  function confirmarEncerramento() {
    if (!motivoEncerrar.trim()) return;
    pararTimer();
    pararTimerPausa();

    if (encerrandoAntes) {
      // Encerramento antecipado — precisa de autorização do responsável
      setEncerramentoData({
        motivo: motivoEncerrar,
        aguardandoResponsavel: true,
        responsavelConfirmou: null,
        supervisorNotificado: pacienteAtivo.temSupervisor,
      });
      setModalEncerrar(false);
      salvarSessaoSupabase();
      setFase("encerramento");
    } else {
      setModalEncerrar(false);
      salvarSessaoSupabase();
      setFase("encerramento");
    }
  }

  // Simula confirmação do responsável (na prática vem via Supabase realtime)
  function simularConfirmacaoResponsavel(confirmou: boolean) {
    setEncerramentoData(prev => prev ? { ...prev, aguardandoResponsavel: false, responsavelConfirmou: confirmou } : prev);
  }

  function registrarEvento(tipo: string, descricao: string) {
    setEventos(prev => [{ id: uid(), tipo, descricao, ts: Date.now() }, ...prev]);
  }

  // ── Métricas ──────────────────────────────────────────────────────────────
  const prog         = programas[progAtual];
  const concluidas   = prog?.tentativas.length ?? 0;
  const total        = prog?.total_tentativas ?? 10;
  const pctProg      = total > 0 ? Math.round((concluidas / total) * 100) : 0;
  const acertos      = prog?.tentativas.filter(t => t.resultado === "correta").length ?? 0;
  const erros        = prog?.tentativas.filter(t => t.resultado === "incorreta").length ?? 0;
  const aprox        = prog?.tentativas.filter(t => t.resultado === "aproximacao").length ?? 0;
  const semResp      = prog?.tentativas.filter(t => t.resultado === "nao_respondeu").length ?? 0;
  const taxaAcerto   = concluidas > 0 ? Math.round((acertos / concluidas) * 100) : 0;
  const totalSessao  = programas.reduce((a, p) => a + p.tentativas.length, 0);
  const acertosSessao= programas.reduce((a, p) => a + p.tentativas.filter(t => t.resultado === "correta").length, 0);
  const taxaSessao   = totalSessao > 0 ? Math.round((acertosSessao / totalSessao) * 100) : 0;
  const progsConcl   = programas.filter(p => p.tentativas.length >= p.total_tentativas).length;
  const totalPausaSeg= pausas.reduce((a, p) => a + (p.duracaoSegundos ?? 0), 0) + (emPausa ? segPausados - pausas.filter(p => p.fim).reduce((a, p) => a + (p.duracaoSegundos ?? 0), 0) : 0);
  const pctTempo     = Math.min(100, Math.round((minutosEfetivos / DURACAO_PREVISTA_MIN) * 100));

  // ── CSS ───────────────────────────────────────────────────────────────────
  const card: React.CSSProperties = {
    background: "rgba(13,32,53,.75)",
    border: "1px solid rgba(70,120,180,.5)",
    borderRadius: 14,
    backdropFilter: "blur(8px)",
  };
  const inp: React.CSSProperties = {
    background: "rgba(20,55,110,.55)",
    border: "1px solid rgba(26,58,92,.6)",
    borderRadius: 8,
    padding: "9px 12px",
    color: "#e8f0f8",
    fontFamily: "var(--font-sans)",
    fontSize: ".82rem",
    outline: "none",
    width: "100%",
    boxSizing: "border-box" as const,
  };
  const lbl: React.CSSProperties = {
    fontSize: ".6rem", fontWeight: 700,
    textTransform: "uppercase" as const,
    letterSpacing: ".09em",
    color: "rgba(170,210,245,.88)",
    marginBottom: 8,
  };
  const overlay: React.CSSProperties = {
    position: "fixed" as const, inset: 0,
    background: "rgba(7,17,31,.82)",
    backdropFilter: "blur(6px)",
    zIndex: 100,
    display: "flex", alignItems: "center", justifyContent: "center",
    padding: 20,
  };
  const modalBox: React.CSSProperties = {
    background: "#0d2035",
    border: "1px solid rgba(26,58,92,.7)",
    borderRadius: 18,
    padding: 28,
    width: "100%",
    maxWidth: 440,
  };

  // ═════════════════════════════════════════════════════════════════════════
  // MODAL: PAUSA
  // ═════════════════════════════════════════════════════════════════════════
  const ModalPausa = modalPausa && (
    <div style={overlay}>
      <div style={modalBox}>
        <div style={{ fontSize: ".65rem", color: "#EF9F27", fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 8 }}>Registrar interrupção</div>
        <div style={{ fontSize: "1rem", fontWeight: 700, color: "#e8f0f8", marginBottom: 4 }}>Qual o motivo da pausa?</div>
        <div style={{ fontSize: ".78rem", color: "rgba(160,200,235,.90)", marginBottom: 18, lineHeight: 1.55 }}>
          O tempo de pausa será registrado separadamente e <strong style={{ color: "#e8f0f8" }}>não contará</strong> como tempo de sessão.
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
          {MOTIVOS_PAUSA.map(m => (
            <button key={m} onClick={() => setMotivoPausa(m)} style={{
              padding: "10px 14px", borderRadius: 9, textAlign: "left",
              border: `1px solid ${motivoPausa === m ? "rgba(239,159,39,.5)" : "rgba(26,58,92,.5)"}`,
              background: motivoPausa === m ? "rgba(239,159,39,.1)" : "rgba(26,58,92,.25)",
              color: motivoPausa === m ? "#EF9F27" : "rgba(160,200,235,.92)",
              fontSize: ".82rem", cursor: "pointer", fontFamily: "var(--font-sans)",
            }}>{m}</button>
          ))}
        </div>
        <input value={motivoPausa.startsWith("Outro") || !MOTIVOS_PAUSA.includes(motivoPausa) ? motivoPausa : ""} onChange={e => setMotivoPausa(e.target.value)} placeholder="Descreva o motivo..." style={{ ...inp, marginBottom: 16 }} />
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => setModalPausa(false)} style={{ flex: 1, padding: 12, borderRadius: 9, border: "1px solid rgba(70,120,180,.5)", background: "transparent", color: "rgba(160,200,235,.90)", fontFamily: "var(--font-sans)", fontWeight: 600, fontSize: ".82rem", cursor: "pointer" }}>Cancelar</button>
          <button onClick={confirmarPausa} disabled={!motivoPausa.trim()} style={{ flex: 1, padding: 12, borderRadius: 9, border: "none", background: motivoPausa.trim() ? "#EF9F27" : "rgba(26,58,92,.4)", color: motivoPausa.trim() ? "#07111f" : "rgba(165,208,242,.85)", fontFamily: "var(--font-sans)", fontWeight: 800, fontSize: ".82rem", cursor: motivoPausa.trim() ? "pointer" : "not-allowed" }}>Pausar sessão</button>
        </div>
      </div>
    </div>
  );

  // ═════════════════════════════════════════════════════════════════════════
  // MODAL: ENCERRAR
  // ═════════════════════════════════════════════════════════════════════════
  const ModalEncerrar = modalEncerrar && (
    <div style={overlay}>
      <div style={modalBox}>
        <div style={{ fontSize: ".65rem", color: encerrandoAntes ? "#E05A4B" : "#EF9F27", fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 8 }}>
          {encerrandoAntes ? "⚠ Encerramento antecipado" : "Encerrar sessão"}
        </div>
        <div style={{ fontSize: "1rem", fontWeight: 700, color: "#e8f0f8", marginBottom: 4 }}>Qual o motivo do encerramento?</div>

        {encerrandoAntes && (
          <div style={{ background: "rgba(224,90,75,.1)", border: "1px solid rgba(224,90,75,.25)", borderRadius: 10, padding: "12px 14px", marginBottom: 16 }}>
            <div style={{ fontSize: ".78rem", color: "#E05A4B", fontWeight: 600, marginBottom: 4 }}>Sessão com {minutosEfetivos} min — mínimo é {TEMPO_MINIMO_MIN} min</div>
            <div style={{ fontSize: ".75rem", color: "rgba(160,200,235,.92)", lineHeight: 1.55 }}>
              Como a sessão está abaixo do tempo contratado, o motivo será registrado no prontuário e o responsável receberá uma notificação para confirmar o encerramento.
              {pacienteAtivo.temSupervisor && " O supervisor também será notificado."}
              {!pacienteAtivo.temSupervisor && " (Sem supervisor vinculado neste caso)"}
            </div>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
          {MOTIVOS_ENCERRAMENTO.map(m => (
            <button key={m} onClick={() => setMotivoEncerrar(m)} style={{
              padding: "10px 14px", borderRadius: 9, textAlign: "left",
              border: `1px solid ${motivoEncerrar === m ? "rgba(224,90,75,.5)" : "rgba(26,58,92,.5)"}`,
              background: motivoEncerrar === m ? "rgba(224,90,75,.1)" : "rgba(26,58,92,.25)",
              color: motivoEncerrar === m ? "#E05A4B" : "rgba(160,200,235,.92)",
              fontSize: ".82rem", cursor: "pointer", fontFamily: "var(--font-sans)",
            }}>{m}</button>
          ))}
        </div>
        <textarea value={motivoEncerrar} onChange={e => setMotivoEncerrar(e.target.value)} rows={2} placeholder="Descreva o motivo com detalhes..." style={{ ...inp, resize: "none", marginBottom: 16 }} />
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => setModalEncerrar(false)} style={{ flex: 1, padding: 12, borderRadius: 9, border: "1px solid rgba(70,120,180,.5)", background: "transparent", color: "rgba(160,200,235,.90)", fontFamily: "var(--font-sans)", fontWeight: 600, fontSize: ".82rem", cursor: "pointer" }}>Cancelar</button>
          <button onClick={confirmarEncerramento} disabled={!motivoEncerrar.trim()} style={{ flex: 1, padding: 12, borderRadius: 9, border: "none", background: motivoEncerrar.trim() ? "#E05A4B" : "rgba(26,58,92,.4)", color: motivoEncerrar.trim() ? "#fff" : "rgba(165,208,242,.85)", fontFamily: "var(--font-sans)", fontWeight: 800, fontSize: ".82rem", cursor: motivoEncerrar.trim() ? "pointer" : "not-allowed" }}>
            {encerrandoAntes ? "Encerrar e notificar responsável" : "Encerrar sessão"}
          </button>
        </div>
      </div>
    </div>
  );

  // ═════════════════════════════════════════════════════════════════════════
  // FASE: PREPARAÇÃO
  // ═════════════════════════════════════════════════════════════════════════
  if (fase === "preparacao") return (
    <div style={{ background: "#07111f", minHeight: "100vh", color: "#e8f0f8", fontFamily: "var(--font-sans)", padding: "24px 28px 60px" }}>
      <div style={{ maxWidth: 720, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 }}>

        <div style={{ display: "flex", alignItems: "center", gap: 10, background: modo.bg, border: `1px solid ${modo.borda}`, borderRadius: 10, padding: "10px 14px" }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: modo.cor }} />
          <span style={{ fontSize: 12, fontWeight: 500, color: modo.cor }}>{modo.label}</span>
          <span style={{ fontSize: 11, color: "rgba(160,200,235,.84)", marginLeft: 4 }}>
            {nivel === "terapeuta" && "Siga o roteiro guiado · sem alterações de protocolo"}
            {nivel === "coordenador" && "Você pode ajustar dicas e critérios durante a sessão"}
            {nivel === "supervisor" && "Acesso completo · edite programas e lógica do Engine"}
          </span>
        </div>

        <div>
          <div style={{ fontSize: ".7rem", color: "rgba(170,210,245,.88)", marginBottom: 4 }}>Preparação</div>
          <div style={{ fontSize: "1.25rem", fontWeight: 800 }}>Sessão com {pacienteAtivo.primeiroNome}</div>
        </div>

        <div style={{ ...card, padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
            <div style={{ width: 48, height: 48, borderRadius: "50%", background: pacienteAtivo.gradient, display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".8rem", fontWeight: 800, color: "#fff", flexShrink: 0 }}>{pacienteAtivo.init}</div>
            <div>
              <div style={{ fontSize: "1rem", fontWeight: 700 }}>{pacienteAtivo.nome}</div>
              <div style={{ fontSize: ".72rem", color: "rgba(160,200,235,.84)", marginTop: 2 }}>{pacienteAtivo.idade} · {pacienteAtivo.cuidadorAtivo ? "FractaCare ativo" : "Sem Care vinculado"}</div>
            </div>
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ background: "rgba(29,158,117,.1)", border: "1px solid rgba(29,158,117,.2)", borderRadius: 8, padding: "6px 12px", fontSize: ".68rem", fontWeight: 700, color: "#1D9E75" }}>Taxa média: {pacienteAtivo.taxaMedia}%</div>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
            {[
              { l: "Duração prevista",   v: `${DURACAO_PREVISTA_MIN} min` },
              { l: "Última sessão",      v: PACIENTE_MOCK.ultimaSessao    },
              { l: "Programas",          v: `${programas.length} ativos`  },
              { l: "Supervisor",         v: pacienteAtivo.temSupervisor ? "Vinculado" : "Sem vínculo" },
            ].map(i => (
              <div key={i.l} style={{ background: "rgba(20,55,110,.55)", borderRadius: 10, padding: "10px 12px" }}>
                <div style={{ fontSize: ".6rem", color: "rgba(170,210,245,.88)", marginBottom: 3 }}>{i.l}</div>
                <div style={{ fontSize: ".85rem", fontWeight: 700 }}>{i.v}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ ...card, padding: 20 }}>
          <div style={{ ...lbl }}>Programas desta sessão</div>
          {programas.map((p, i) => (
            <div key={p.id} style={{ display: "flex", gap: 14, padding: "14px 0", borderBottom: i < programas.length - 1 ? "1px solid rgba(26,58,92,.3)" : "none" }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(29,158,117,.15)", border: "1px solid rgba(29,158,117,.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".7rem", fontWeight: 800, color: "#1D9E75", flexShrink: 0 }}>{i + 1}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: ".88rem", fontWeight: 700, marginBottom: 3 }}>{p.nome}</div>
                <div style={{ fontSize: ".72rem", color: "rgba(160,200,235,.84)" }}>{p.operante} · {p.total_tentativas} tentativas · Dica inicial: {p.nivel_dica[p.nivel_atual]}</div>
              </div>
              <div style={{ fontSize: ".65rem", color: "rgba(165,208,242,.85)", textAlign: "right", flexShrink: 0 }}>
                <div>{p.criterio.split(" ").slice(0,3).join(" ")}…</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ background: "rgba(26,58,92,.2)", border: "1px solid rgba(70,120,180,.4)", borderRadius: 10, padding: "10px 14px" }}>
          <div style={{ fontSize: ".62rem", color: "rgba(170,210,245,.88)", fontWeight: 600, marginBottom: 6 }}>Atalhos — teclas 1–4 registram a resposta durante a sessão</div>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
            {Object.entries(RESULTADO_CONFIG).map(([,v]) => (
              <div key={v.key} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <kbd style={{ background: "rgba(26,58,92,.5)", border: "1px solid rgba(26,58,92,.7)", borderRadius: 4, padding: "2px 6px", fontSize: ".65rem", fontFamily: "monospace", color: "#e8f0f8" }}>{v.key}</kbd>
                <span style={{ fontSize: ".7rem", color: "rgba(160,200,235,.84)" }}>{v.label}</span>
              </div>
            ))}
          </div>
        </div>

        <button onClick={iniciarSessao} style={{ padding: 16, borderRadius: 12, border: "none", background: "linear-gradient(135deg,#1D9E75,#0f8f7a)", color: "#07111f", fontWeight: 800, fontSize: "1rem", cursor: "pointer", fontFamily: "var(--font-sans)" }}>
          Iniciar sessão →
        </button>
      </div>
    </div>
  );

  // ═════════════════════════════════════════════════════════════════════════
  // FASE: SESSÃO ATIVA
  // ═════════════════════════════════════════════════════════════════════════
  if (fase === "sessao" && prog) return (
    <div style={{ background: "#07111f", minHeight: "100vh", color: "#e8f0f8", fontFamily: "var(--font-sans)", padding: "20px 28px 60px" }}>
      {ModalPausa}
      {ModalEncerrar}

      {/* Overlay de pausa ativa */}
      {emPausa && (
        <div style={{ ...overlay, zIndex: 90 }}>
          <div style={{ ...modalBox, textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>⏸</div>
            <div style={{ fontSize: "1.1rem", fontWeight: 800, marginBottom: 6 }}>Sessão em pausa</div>
            <div style={{ fontFamily: "monospace", fontSize: "2rem", fontWeight: 700, color: "#EF9F27", marginBottom: 8 }}>{fmt(segPausados - pausas.filter(p => p.fim).reduce((a,p) => a + (p.duracaoSegundos ?? 0), 0))}</div>
            <div style={{ fontSize: ".78rem", color: "rgba(160,200,235,.90)", marginBottom: 6, lineHeight: 1.5 }}>
              Motivo: <strong style={{ color: "#e8f0f8" }}>{pausas[pausas.length - 1]?.motivo}</strong>
            </div>
            <div style={{ fontSize: ".72rem", color: "rgba(170,210,245,.88)", marginBottom: 20 }}>Tempo de pausa não conta como tempo de sessão</div>
            <button onClick={retomar} style={{ padding: "12px 32px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#1D9E75,#0f8f7a)", color: "#07111f", fontWeight: 800, fontSize: ".9rem", cursor: "pointer", fontFamily: "var(--font-sans)" }}>
              ▶ Retomar sessão
            </button>
          </div>
        </div>
      )}

      {/* Modal de eventos comportamentais */}
      {modalEventos && (
        <div style={{ ...overlay, zIndex: 95 }}>
          <div style={{ ...modalBox }}>
            <div style={{ ...lbl, color: "#E05A4B" }}>Registrar evento comportamental</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
              {EVENTOS_RAPIDOS.map(ev => (
                <button key={ev.tipo} onClick={() => { registrarEvento(ev.tipo, ev.label); setModalEventos(false); }} style={{ padding: "7px 12px", borderRadius: 7, border: `1px solid ${ev.cor}44`, background: `${ev.cor}11`, color: ev.cor, fontSize: ".72rem", fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-sans)" }}>
                  {ev.label}
                </button>
              ))}
            </div>
            {modo.podeRegistrarEventoLivre ? (
              <div style={{ display: "flex", gap: 8 }}>
                <input autoFocus placeholder="Descreva o comportamento..." style={{ ...inp, flex: 1 }} onKeyDown={e => { if (e.key === "Enter" && (e.target as HTMLInputElement).value.trim()) { registrarEvento("personalizado", (e.target as HTMLInputElement).value); setModalEventos(false); } }} />
                <button onClick={() => setModalEventos(false)} style={{ padding: "9px 14px", borderRadius: 8, border: "1px solid rgba(70,120,180,.5)", background: "transparent", color: "rgba(160,200,235,.90)", fontFamily: "var(--font-sans)", fontSize: ".78rem", cursor: "pointer" }}>Fechar</button>
              </div>
            ) : (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                <span style={{ fontSize: ".68rem", color: "rgba(165,208,242,.85)" }}>Modo guiado — use os atalhos acima</span>
                <button onClick={() => setModalEventos(false)} style={{ padding: "6px 12px", borderRadius: 7, border: "1px solid rgba(70,120,180,.5)", background: "transparent", color: "rgba(160,200,235,.84)", fontFamily: "var(--font-sans)", fontSize: ".72rem", cursor: "pointer" }}>Fechar</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TOPBAR ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>

        {/* Timer principal */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(29,158,117,.08)", border: "1px solid rgba(29,158,117,.25)", borderRadius: 10, padding: "8px 16px" }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#1D9E75", animation: "pulse 1.5s ease infinite" }} />
          <span style={{ fontFamily: "monospace", fontSize: 20, fontWeight: 700, color: "#1D9E75", letterSpacing: ".05em" }}>{fmt(segundos)}</span>
          <span style={{ fontSize: ".62rem", color: "rgba(170,210,245,.88)" }}>/ {DURACAO_PREVISTA_MIN}:00</span>
        </div>

        {/* Barra de progresso de tempo */}
        <div style={{ flex: 1, minWidth: 120 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ fontSize: ".6rem", color: "rgba(170,210,245,.88)" }}>Tempo efetivo</span>
            <span style={{ fontSize: ".6rem", color: pctTempo >= 75 ? "#1D9E75" : "#EF9F27", fontWeight: 600 }}>{pctTempo}%</span>
          </div>
          <div style={{ height: 5, background: "rgba(26,58,92,.5)", borderRadius: 4, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${pctTempo}%`, background: pctTempo >= 75 ? "linear-gradient(90deg,#1D9E75,#23c48f)" : "linear-gradient(90deg,#EF9F27,#f59e0b)", transition: "width .5s ease" }} />
          </div>
        </div>

        {/* Pausas */}
        {totalPausaSeg > 0 && (
          <div style={{ fontSize: ".7rem", color: "#EF9F27", fontFamily: "monospace", background: "rgba(239,159,39,.08)", border: "1px solid rgba(239,159,39,.2)", borderRadius: 8, padding: "6px 10px" }}>
            ⏸ {fmt(totalPausaSeg)} pausado
          </div>
        )}

        {/* Prog geral */}
        <div style={{ fontSize: ".7rem", color: "rgba(160,200,235,.84)" }}>
          Prog. {progAtual + 1}/{programas.length} · <span style={{ color: "#1D9E75", fontWeight: 600 }}>{progsConcl} concluídos</span>
        </div>

        {/* Paciente */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 26, height: 26, borderRadius: "50%", background: pacienteAtivo.gradient, display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".55rem", fontWeight: 800, color: "#fff" }}>{pacienteAtivo.init}</div>
          <span style={{ fontSize: ".75rem", fontWeight: 600 }}>{pacienteAtivo.primeiroNome}</span>
        </div>

        {/* Ações */}
        <div style={{ display: "flex", gap: 7, marginLeft: "auto" }}>
          <button onClick={() => setModalEventos(true)} style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 11px", borderRadius: 8, border: `1px solid ${eventos.length > 0 ? "rgba(224,90,75,.35)" : "rgba(26,58,92,.5)"}`, background: "transparent", color: eventos.length > 0 ? "#E05A4B" : "rgba(160,200,235,.90)", fontSize: ".7rem", fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-sans)" }}>
            <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M8 3v5l3 2"/><circle cx="8" cy="8" r="6"/></svg>
            Evento {eventos.length > 0 && `(${eventos.length})`}
          </button>
          <button onClick={solicitarPausa} style={{ padding: "7px 11px", borderRadius: 8, border: "1px solid rgba(239,159,39,.3)", background: "rgba(239,159,39,.07)", color: "#EF9F27", fontSize: ".7rem", fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-sans)" }}>
            ⏸ Pausar
          </button>
          <button onClick={solicitarEncerramento} style={{ padding: "7px 11px", borderRadius: 8, border: "1px solid rgba(224,90,75,.25)", background: "rgba(224,90,75,.07)", color: "#E05A4B", fontSize: ".7rem", fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-sans)" }}>
            Encerrar
          </button>
        </div>
      </div>

      {/* ── GRADE PRINCIPAL ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 310px", gap: 16, alignItems: "start" }}>

        {/* Coluna esquerda */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          <div style={{ ...card, padding: 18 }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
              <div>
                <div style={{ display: "inline-block", background: "rgba(29,158,117,.1)", border: "1px solid rgba(29,158,117,.2)", borderRadius: 50, padding: "3px 10px", fontSize: ".6rem", fontWeight: 700, color: "#1D9E75", marginBottom: 8 }}>{prog.operante}</div>
                <div style={{ fontSize: ".98rem", fontWeight: 800, marginBottom: 4 }}>{prog.nome}</div>
                <div style={{ fontSize: ".77rem", color: "rgba(160,200,235,.84)", lineHeight: 1.55 }}>{prog.objetivo}</div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 14 }}>
                <div style={{ fontSize: ".62rem", color: "rgba(165,208,242,.85)" }}>Prog. {progAtual+1}/{programas.length}</div>
                <div style={{ fontSize: ".8rem", color: "#1D9E75", fontWeight: 700, marginTop: 3 }}>{concluidas}/{total}</div>
              </div>
            </div>
            <div style={{ height: 5, background: "rgba(26,58,92,.5)", borderRadius: 50, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${pctProg}%`, background: "linear-gradient(90deg,#1D9E75,#23c48f)", transition: "width .35s ease" }} />
            </div>
          </div>

          <div style={{ ...card, padding: 20 }}>
            <div style={{ ...lbl }}>SD — Estímulo discriminativo</div>
            <div style={{ fontSize: ".85rem", color: "rgba(160,200,235,.90)", marginBottom: 20, lineHeight: 1.6, padding: "10px 14px", background: "rgba(26,58,92,.25)", borderRadius: 8, borderLeft: "3px solid rgba(55,138,221,.4)" }}>{prog.sd}</div>

            {concluidas < total ? (
              <>
                <div style={{ ...lbl }}>Estímulo — Tentativa {concluidas+1}</div>
                <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "#1D9E75", marginBottom: 20, padding: "16px 20px", background: "rgba(29,158,117,.07)", border: "1px solid rgba(29,158,117,.2)", borderRadius: 12, textAlign: "center" }}>
                  {tentAtual.estimulo}
                </div>

                <div style={{ ...lbl }}>Nível de dica</div>
                <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
                  {prog.nivel_dica.map((d,i) => (
                    <button key={d} onClick={() => modo.podeAjustarCriterio && setTentAtual(t => ({ ...t, dica: i }))} style={{
                      padding: "7px 14px", borderRadius: 7,
                      border: `1px solid ${tentAtual.dica === i ? "#1D9E75" : "rgba(26,58,92,.5)"}`,
                      background: tentAtual.dica === i ? "rgba(29,158,117,.12)" : "transparent",
                      color: tentAtual.dica === i ? "#1D9E75" : "rgba(170,210,245,.88)",
                      fontSize: ".73rem", fontWeight: tentAtual.dica === i ? 700 : 400,
                      cursor: modo.podeAjustarCriterio ? "pointer" : "default",
                      fontFamily: "var(--font-sans)",
                    }}>{d}</button>
                  ))}
                </div>

                <div style={{ ...lbl }}>Registrar resposta <span style={{ color: "rgba(165,208,242,.85)", fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(ou tecla 1–4)</span></div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
                  {(Object.entries(RESULTADO_CONFIG) as [Resultado, typeof RESULTADO_CONFIG[Resultado]][]).map(([key,cfg]) => (
                    <button key={key} onClick={() => registrarTentativa(key)} style={{
                      padding: "16px 12px", borderRadius: 12,
                      border: `1.5px solid ${cfg.cor}44`,
                      background: cfg.bg, color: cfg.cor,
                      fontFamily: "var(--font-sans)", fontWeight: 700, fontSize: ".85rem",
                      cursor: "pointer", transition: "border-color .15s",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = cfg.cor)}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = `${cfg.cor}44`)}
                    >
                      <kbd style={{ background: `${cfg.cor}22`, border: `1px solid ${cfg.cor}44`, borderRadius: 4, padding: "1px 5px", fontSize: ".62rem", fontFamily: "monospace" }}>{cfg.key}</kbd>
                      {cfg.label}
                    </button>
                  ))}
                </div>
                {modo.podeObsPrograma && (
                <input value={tentAtual.obs} onChange={e => setTentAtual(t => ({ ...t, obs: e.target.value }))} placeholder="Observação desta tentativa (opcional)..." style={{...inp, marginTop: 4}} />
              )}
              </>
            ) : (
              <div style={{ textAlign: "center", padding: "28px 0" }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>✓</div>
                <div style={{ fontSize: ".95rem", fontWeight: 700, color: "#1D9E75", marginBottom: 6 }}>Programa concluído — {taxaAcerto}%</div>
                {progAtual < programas.length - 1 ? (
                  <button onClick={proximoPrograma} style={{ padding: "12px 28px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#1D9E75,#0f8f7a)", color: "#07111f", fontWeight: 800, fontSize: ".88rem", cursor: "pointer", fontFamily: "var(--font-sans)" }}>
                    Próximo programa →
                  </button>
                ) : (
                  <button onClick={solicitarEncerramento} style={{ padding: "12px 28px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#378ADD,#8B7FE8)", color: "#fff", fontWeight: 800, fontSize: ".88rem", cursor: "pointer", fontFamily: "var(--font-sans)" }}>
                    Todos os programas concluídos — Encerrar
                  </button>
                )}
              </div>
            )}
          </div>

          {concluidas < total && progAtual < programas.length - 1 && modo.podePularPrograma && (
            <button onClick={proximoPrograma} style={{ padding: 11, borderRadius: 8, border: "1px solid rgba(70,120,180,.5)", background: "transparent", color: "rgba(160,200,235,.84)", fontFamily: "var(--font-sans)", fontWeight: 500, fontSize: ".78rem", cursor: "pointer" }}>
              Pular para próximo programa
            </button>
          )}
        </div>

        {/* Coluna direita */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

          <div style={{ ...card, padding: 16 }}>
            <div style={{ ...lbl }}>Métricas em tempo real</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
              {[
                { l:"Tentativas",  v:`${concluidas}/${total}`, c:"#e8f0f8",                                                          sempre: true  },
                { l:"Taxa acerto", v:`${taxaAcerto}%`,         c: taxaAcerto >= 80 ? "#1D9E75" : taxaAcerto >= 50 ? "#EF9F27" : "#E05A4B", sempre: true  },
                { l:"Corretas",    v:acertos,                  c:"#1D9E75",                                                          sempre: true  },
                { l:"Incorretas",  v:erros,                    c:"#E05A4B",                                                          sempre: true  },
                { l:"Aprox.",      v:aprox,                    c:"#EF9F27",                                                          sempre: false },
                { l:"Sem resp.",   v:semResp,                  c:"#4d6d8a",                                                          sempre: false },
                ...(modo.nivelMetricas === "avancado" ? [
                  { l:"% Independente", v: concluidas > 0 ? `${Math.round((prog.tentativas.filter(t => t.dica === 0).length / concluidas) * 100)}%` : "—", c:"#8B7FE8", sempre: false },
                  { l:"Dica atual",     v: prog.nivel_dica[prog.nivel_atual], c:"#EF9F27", sempre: false },
                ] : []),
              ].filter(m => m.sempre || modo.nivelMetricas !== "basico").map(m => (
                <div key={m.l} style={{ background: "rgba(26,58,92,.25)", borderRadius: 8, padding: "8px 10px" }}>
                  <div style={{ fontSize: ".58rem", color: "rgba(165,208,242,.85)", marginBottom: 2 }}>{m.l}</div>
                  <div style={{ fontSize: ".95rem", fontWeight: 800, color: m.c }}>{m.v}</div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {prog.tentativas.map((t,i) => (
                <div key={i} title={`${t.estimulo}: ${RESULTADO_CONFIG[t.resultado].label}`} style={{ width: 18, height: 18, borderRadius: "50%", background: RESULTADO_CONFIG[t.resultado].cor, opacity: .85, cursor: "help" }} />
              ))}
              {Array.from({ length: total - concluidas }, (_,i) => (
                <div key={`e${i}`} style={{ width: 18, height: 18, borderRadius: "50%", background: "rgba(26,58,92,.5)", border: "1px solid rgba(26,58,92,.7)" }} />
              ))}
            </div>
          </div>

          <div style={{ ...card, padding: 14 }}>
            <div style={{ ...lbl }}>Critério de domínio</div>
            <div style={{ fontSize: ".78rem", color: "rgba(160,200,235,.90)", lineHeight: 1.55, marginBottom: 10 }}>
              {modo.podeVerCriterioCompleto
                ? prog.criterio
                : prog.criterio.split(" ").slice(0, 4).join(" ") + "…"}
            </div>
            <div style={{ height: 5, background: "rgba(26,58,92,.5)", borderRadius: 50, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${taxaAcerto}%`, background: taxaAcerto >= 80 ? "#1D9E75" : taxaAcerto >= 50 ? "#EF9F27" : "#E05A4B", transition: "width .4s" }} />
            </div>
            <div style={{ fontSize: ".62rem", color: "rgba(165,208,242,.85)", marginTop: 4, textAlign: "right" }}>{taxaAcerto}% / 80%</div>
          </div>

          {concluidas > 0 && (
            <div style={{ ...card, padding: 14 }}>
              <div style={{ ...lbl }}>Tentativas registradas</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 5, maxHeight: 180, overflowY: "auto" }}>
                {[...prog.tentativas].reverse().map((t,i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 8px", background: "rgba(26,58,92,.2)", borderRadius: 7 }}>
                    <div style={{ width: 7, height: 7, borderRadius: "50%", background: RESULTADO_CONFIG[t.resultado].cor, flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: ".72rem", fontWeight: 600 }}>{t.estimulo}</div>
                      <div style={{ fontSize: ".6rem", color: "rgba(165,208,242,.85)" }}>{prog.nivel_dica[t.dica]}</div>
                    </div>
                    <div style={{ fontSize: ".65rem", color: RESULTADO_CONFIG[t.resultado].cor, flexShrink: 0 }}>{RESULTADO_CONFIG[t.resultado].label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ ...card, padding: 14 }}>
            <div style={{ ...lbl }}>Sessão geral</div>
            {[
              { l:"Taxa geral",    v:`${taxaSessao}%`,        c: taxaSessao >= 80 ? "#1D9E75" : taxaSessao >= 50 ? "#EF9F27" : "#E05A4B" },
              { l:"Total tentativas", v:totalSessao,          c:"#e8f0f8" },
              { l:"Eventos",      v:eventos.length,            c: eventos.length > 0 ? "#E05A4B" : "rgba(165,208,242,.85)" },
              { l:"Pausas",       v:`${pausas.length}x · ${fmt(totalPausaSeg)}`, c: pausas.length > 0 ? "#EF9F27" : "rgba(165,208,242,.85)" },
            ].map(r => (
              <div key={r.l} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid rgba(26,58,92,.2)" }}>
                <span style={{ fontSize: ".72rem", color: "rgba(160,200,235,.84)" }}>{r.l}</span>
                <span style={{ fontSize: ".72rem", fontWeight: 600, color: r.c as string, fontFamily: "monospace" }}>{r.v}</span>
              </div>
            ))}
          </div>

          {modo.podeVerInsightsEngine && (
            <div style={{ background: "rgba(139,127,232,.07)", border: "1px solid rgba(139,127,232,.2)", borderRadius: 14, padding: 14 }}>
              <div style={{ ...lbl, color: "#8B7FE8" }}>FractaEngine — insights</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {taxaAcerto < 50 && (
                  <div style={{ fontSize: ".75rem", color: "rgba(160,200,235,.92)", lineHeight: 1.55, padding: "7px 10px", background: "rgba(224,90,75,.07)", borderRadius: 8 }}>
                    Taxa abaixo de 50% — considerar reduzir critério ou revisar reforçadores
                  </div>
                )}
                {prog.tentativas.filter(t => t.dica > 0).length > concluidas * 0.6 && (
                  <div style={{ fontSize: ".75rem", color: "rgba(160,200,235,.92)", lineHeight: 1.55, padding: "7px 10px", background: "rgba(239,159,39,.07)", borderRadius: 8 }}>
                    Alta dependência de dica (&gt;60%) — avaliar fading gradual
                  </div>
                )}
                {taxaAcerto >= 80 && (
                  <div style={{ fontSize: ".75rem", color: "rgba(160,200,235,.92)", lineHeight: 1.55, padding: "7px 10px", background: "rgba(29,158,117,.07)", borderRadius: 8 }}>
                    Performance acima de 80% — programa próximo de critério de domínio
                  </div>
                )}
                {taxaAcerto >= 50 && taxaAcerto < 80 && (
                  <div style={{ fontSize: ".75rem", color: "rgba(160,200,235,.92)", lineHeight: 1.55, padding: "7px 10px", background: "rgba(20,55,110,.55)", borderRadius: 8 }}>
                    Progresso consistente — manter protocolo atual
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>

      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.35}}`}</style>
    </div>
  );

  // ═════════════════════════════════════════════════════════════════════════
  // FASE: ENCERRAMENTO
  // ═════════════════════════════════════════════════════════════════════════
  return (
    <div style={{ background: "#07111f", minHeight: "100vh", color: "#e8f0f8", fontFamily: "var(--font-sans)", padding: "24px 28px 60px" }}>
      <div style={{ maxWidth: 680, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 }}>

        <div style={{ textAlign: "center", padding: "10px 0 20px" }}>
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: encerrandoAntes ? "rgba(224,90,75,.15)" : "rgba(29,158,117,.15)", border: `1px solid ${encerrandoAntes ? "rgba(224,90,75,.3)" : "rgba(29,158,117,.3)"}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px", fontSize: 22 }}>
            {encerrandoAntes ? "⚠" : "✓"}
          </div>
          <div style={{ fontSize: "1.4rem", fontWeight: 800, marginBottom: 6 }}>Sessão encerrada</div>
          <div style={{ fontSize: ".85rem", color: "rgba(160,200,235,.84)" }}>
            {pacienteAtivo.primeiroNome} · {fmt(segundos)} efetivos · {totalSessao} tentativas
          </div>
        </div>

        {/* Status de encerramento antecipado */}
        {encerramentoData && (
          <div style={{ background: "rgba(224,90,75,.08)", border: "1px solid rgba(224,90,75,.25)", borderRadius: 14, padding: 18 }}>
            <div style={{ fontSize: ".65rem", color: "#E05A4B", fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 10 }}>Encerramento antecipado — aguardando confirmação</div>

            <div style={{ fontSize: ".82rem", color: "rgba(160,200,235,.92)", marginBottom: 10 }}>
              Motivo registrado: <strong style={{ color: "#e8f0f8" }}>{encerramentoData.motivo}</strong>
            </div>

            {encerramentoData.aguardandoResponsavel && encerramentoData.responsavelConfirmou === null && (
              <div style={{ background: "rgba(20,55,110,.65)", borderRadius: 10, padding: 14, marginBottom: 12 }}>
                <div style={{ fontSize: ".78rem", color: "#EF9F27", fontWeight: 600, marginBottom: 4 }}>Notificação enviada ao responsável</div>
                <div style={{ fontSize: ".75rem", color: "rgba(160,200,235,.90)", marginBottom: 12 }}>
                  O responsável precisa confirmar o encerramento. A sessão ficará como <strong style={{ color: "#e8f0f8" }}>incompleta — aguardando confirmação</strong> até a resposta.
                </div>
                {/* Simulação — em produção isso vem via Supabase realtime */}
                <div style={{ fontSize: ".65rem", color: "rgba(165,208,242,.85)", marginBottom: 8 }}>Simular resposta do responsável (dev only):</div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => simularConfirmacaoResponsavel(true)} style={{ flex: 1, padding: "8px", borderRadius: 8, border: "1px solid rgba(29,158,117,.4)", background: "rgba(29,158,117,.1)", color: "#1D9E75", fontFamily: "var(--font-sans)", fontWeight: 600, fontSize: ".75rem", cursor: "pointer" }}>Responsável confirmou</button>
                  <button onClick={() => simularConfirmacaoResponsavel(false)} style={{ flex: 1, padding: "8px", borderRadius: 8, border: "1px solid rgba(224,90,75,.3)", background: "rgba(224,90,75,.08)", color: "#E05A4B", fontFamily: "var(--font-sans)", fontWeight: 600, fontSize: ".75rem", cursor: "pointer" }}>Responsável contestou</button>
                </div>
              </div>
            )}

            {encerramentoData.responsavelConfirmou === true && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: "rgba(29,158,117,.1)", border: "1px solid rgba(29,158,117,.25)", borderRadius: 10 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#1D9E75" }} />
                <span style={{ fontSize: ".78rem", color: "#1D9E75", fontWeight: 600 }}>Responsável confirmou o encerramento antecipado</span>
              </div>
            )}

            {encerramentoData.responsavelConfirmou === false && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: "rgba(224,90,75,.1)", border: "1px solid rgba(224,90,75,.25)", borderRadius: 10 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#E05A4B" }} />
                <span style={{ fontSize: ".78rem", color: "#E05A4B", fontWeight: 600 }}>Responsável contestou — caso encaminhado para supervisão</span>
              </div>
            )}

            {encerramentoData.supervisorNotificado && (
              <div style={{ fontSize: ".72rem", color: "rgba(170,210,245,.88)", marginTop: 8 }}>✓ Supervisor notificado</div>
            )}
          </div>
        )}

        {/* Resumo por programa */}
        {programas.map((p, idx) => {
          const ac  = p.tentativas.filter(t => t.resultado === "correta").length;
          const inc = p.tentativas.filter(t => t.resultado === "incorreta").length;
          const ap  = p.tentativas.filter(t => t.resultado === "aproximacao").length;
          const tot = p.tentativas.length;
          const tx  = tot > 0 ? Math.round((ac / tot) * 100) : 0;
          return (
            <div key={p.id} style={{ ...card, padding: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: ".62rem", color: "rgba(165,208,242,.85)", marginBottom: 3 }}>Programa {idx+1}</div>
                  <div style={{ fontSize: ".9rem", fontWeight: 700 }}>{p.nome}</div>
                  <div style={{ fontSize: ".72rem", color: "rgba(170,210,245,.88)" }}>{p.operante} · {tot} tentativas</div>
                </div>
                <div style={{ fontSize: "1.8rem", fontWeight: 800, color: tx >= 80 ? "#1D9E75" : tx >= 50 ? "#EF9F27" : "#E05A4B" }}>{tx}%</div>
              </div>
              <div style={{ height: 5, background: "rgba(26,58,92,.5)", borderRadius: 50, overflow: "hidden", marginBottom: 10 }}>
                <div style={{ height: "100%", width: `${tx}%`, background: tx >= 80 ? "#1D9E75" : tx >= 50 ? "#EF9F27" : "#E05A4B" }} />
              </div>
              <div style={{ display: "flex", gap: 16 }}>
                {[["Corretas",ac,"#1D9E75"],["Incorretas",inc,"#E05A4B"],["Aprox.",ap,"#EF9F27"],["Sem resp.",tot-ac-inc-ap,"#4d6d8a"]].map(([l,v,c]) => (
                  <div key={String(l)} style={{ textAlign: "center" }}>
                    <div style={{ fontSize: ".65rem", color: "rgba(165,208,242,.85)" }}>{l}</div>
                    <div style={{ fontSize: ".85rem", fontWeight: 700, color: c as string }}>{v}</div>
                  </div>
                ))}
              </div>
              {tx >= 80 && <div style={{ marginTop: 10, fontSize: ".72rem", color: "#1D9E75", fontWeight: 600 }}>✓ Próximo de critério — considerar avançar nível</div>}
            </div>
          );
        })}

        {/* Pausas */}
        {pausas.length > 0 && (
          <div style={{ ...card, padding: 18 }}>
            <div style={{ ...lbl, color: "#EF9F27" }}>Interrupções registradas ({pausas.length})</div>
            {pausas.map((p, i) => (
              <div key={i} style={{ display: "flex", gap: 10, padding: "8px 0", borderBottom: i < pausas.length - 1 ? "1px solid rgba(26,58,92,.2)" : "none" }}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#EF9F27", marginTop: 5, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: ".78rem", color: "#e8f0f8" }}>{p.motivo}</div>
                  {p.duracaoSegundos && <div style={{ fontSize: ".65rem", color: "rgba(170,210,245,.88)", marginTop: 2 }}>{fmt(p.duracaoSegundos)} de pausa</div>}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Eventos comportamentais */}
        {eventos.length > 0 && (
          <div style={{ ...card, padding: 18 }}>
            <div style={{ ...lbl, color: "#E05A4B" }}>Eventos comportamentais ({eventos.length})</div>
            {eventos.map(ev => (
              <div key={ev.id} style={{ display: "flex", gap: 8, padding: "7px 10px", background: "rgba(224,90,75,.07)", borderRadius: 8, marginBottom: 5, border: "1px solid rgba(224,90,75,.15)" }}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#E05A4B", marginTop: 4, flexShrink: 0 }} />
                <span style={{ fontSize: ".78rem", color: "rgba(175,210,240,.95)" }}>{ev.descricao}</span>
              </div>
            ))}
          </div>
        )}

        {/* Obs gerais */}
        <div style={{ ...card, padding: 18 }}>
          <div style={{ ...lbl }}>Observações gerais</div>
          <textarea value={obsGeral} onChange={e => setObsGeral(e.target.value)} rows={3} placeholder="Comportamento geral, humor, adesão, transições, pontos relevantes para a família..." style={{ ...inp, resize: "none" }} />
        </div>

        {/* Conexão Care */}
        <div style={{ background: "rgba(29,158,117,.06)", border: "1px solid rgba(29,158,117,.2)", borderRadius: 14, padding: 16 }}>
          <div style={{ fontSize: ".72rem", color: "#1D9E75", fontWeight: 700, marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 8h10M9 4l4 4-4 4"/></svg>
            FractaCare — dados sincronizados
          </div>
          <div style={{ fontSize: ".8rem", color: "rgba(160,200,235,.90)", lineHeight: 1.65 }}>
            Os dados desta sessão alimentaram o radar de <strong style={{ color: "#e8f0f8" }}>{pacienteAtivo.primeiroNome}</strong>.
            A família verá o progresso atualizado e receberá sugestões de continuidade para o dia a dia.
          </div>
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          <button style={{ flex: 1, padding: 14, borderRadius: 10, border: "1px solid rgba(70,120,180,.5)", background: "transparent", color: "rgba(160,200,235,.90)", fontFamily: "var(--font-sans)", fontWeight: 700, fontSize: ".88rem", cursor: "pointer" }}>
            Exportar relatório
          </button>
          <Link href="/clinic/dashboard" style={{ flex: 1, padding: 14, borderRadius: 10, border: "none", background: "linear-gradient(135deg,#1D9E75,#0f8f7a)", color: "#07111f", fontWeight: 800, fontSize: ".88rem", textDecoration: "none", textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center" }}>
            Voltar ao painel
          </Link>
        </div>

      </div>
    </div>
  );
}

export default function ClinicSessaoPage() {
  return (
    <Suspense fallback={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#07111f', color: 'rgba(160,200,235,.9)', fontSize: 13 }}>Carregando sessão...</div>}>
      <ClinicSessaoPageInner />
    </Suspense>
  )
}