"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useClinicContext } from "../layout";

// ─── TIPOS ───────────────────────────────────────────────────────────────────
type TabAval       = "protocolos" | "analise-funcional" | "historico";
type TipoAF        = "indireta" | "descritiva" | "experimental";
type StatusAval    = "nao_iniciada" | "em_andamento" | "concluida";
type FuncaoComport = "atencao" | "fuga" | "tangivel" | "automatica" | "indefinida";

interface Protocolo {
  id: string;
  nome: string;
  sigla: string;
  descricao: string;
  dominios: DominioProtocolo[];
  faixaEtaria: string;
  tempoMedio: string;
  cor: string;
  icone: string;
  disponivel: boolean;
}

interface DominioProtocolo {
  id: string;
  nome: string;
  itens: number;
  cor: string;
}

interface AvaliacaoRegistrada {
  id: string;
  protocoloSigla: string;
  protocoloCor: string;
  pacienteNome: string;
  pacienteIniciais: string;
  gradient: string;
  dataAplicacao: string;
  aplicador: string;
  status: StatusAval;
  pontuacaoTotal?: number;
  pontuacaoMaxima?: number;
  nivelGeral?: string;
  proximaRevisao?: string;
}

interface RegistroABC {
  id: string;
  horario: string;
  antecedente: string;
  comportamento: string;
  consequencia: string;
  duracao: string;
  intensidade: "leve" | "moderada" | "intensa";
}

interface CondicaoExperimental {
  id: string;
  nome: string;
  cor: string;
  descricao: string;
  registros: number[]; // frequência por intervalo (cada item = 1 intervalo de 10min)
}

// ─── MOCK DATA ────────────────────────────────────────────────────────────────
const PROTOCOLOS: Protocolo[] = [
  {
    id: "vbmapp",
    nome: "Verbal Behavior Milestones Assessment and Placement Program",
    sigla: "VB-MAPP",
    descricao: "Avaliação de marcos comportamentais verbais baseada na análise do comportamento verbal de Skinner. Avalia 170 marcos em 16 domínios distribuídos em 3 níveis de desenvolvimento.",
    faixaEtaria: "0–4 anos (nível de desenvolvimento)",
    tempoMedio: "2–4 horas",
    cor: "#1D9E75",
    icone: "🗣",
    disponivel: true,
    dominios: [
      { id: "mando",       nome: "Mando",               itens: 15, cor: "#1D9E75" },
      { id: "tato",        nome: "Tato",                itens: 15, cor: "#378ADD" },
      { id: "ouvinte",     nome: "Ouvinte",             itens: 15, cor: "#8B7FE8" },
      { id: "visual",      nome: "Habilidades visuais",  itens: 15, cor: "#EF9F27" },
      { id: "intraverbal", nome: "Intraverbal",          itens: 15, cor: "#E05A4B" },
      { id: "social",      nome: "Social/Brincar",       itens: 15, cor: "#23c48f" },
      { id: "imitacao",    nome: "Imitação motora",      itens: 10, cor: "#4d6d8a" },
      { id: "leitura",     nome: "Leitura",              itens: 10, cor: "#EF9F27" },
    ],
  },
  {
    id: "peak",
    nome: "PEAK Relational Training System",
    sigla: "PEAK",
    descricao: "Sistema de avaliação e treinamento baseado em equivalência de estímulos e molduras relacionais. Avalia controle direto, generalização, equivalência e transformação funcional.",
    faixaEtaria: "Todas as idades",
    tempoMedio: "3–6 horas",
    cor: "#8B7FE8",
    icone: "🔗",
    disponivel: true,
    dominios: [
      { id: "direto",       nome: "Controle direto (DT)",      itens: 50, cor: "#1D9E75" },
      { id: "generalizacao",nome: "Generalização (G)",         itens: 50, cor: "#378ADD" },
      { id: "equivalencia", nome: "Equivalência (E)",          itens: 50, cor: "#8B7FE8" },
      { id: "transformacao",nome: "Transformação funcional (T)",itens: 50, cor: "#EF9F27" },
    ],
  },
  {
    id: "ablls",
    nome: "Assessment of Basic Language and Learning Skills",
    sigla: "ABLLS-R",
    descricao: "Avaliação de habilidades básicas de linguagem e aprendizagem. Cobre 25 domínios incluindo cooperação, imitação visual, controle motor e habilidades acadêmicas.",
    faixaEtaria: "2–12 anos",
    tempoMedio: "2–3 horas",
    cor: "#378ADD",
    icone: "📋",
    disponivel: true,
    dominios: [
      { id: "cooperacao",  nome: "Cooperação e reforçamento",  itens: 10, cor: "#1D9E75" },
      { id: "imitacao_v",  nome: "Imitação visual",            itens: 10, cor: "#378ADD" },
      { id: "instrucoes",  nome: "Seguir instruções",          itens: 15, cor: "#8B7FE8" },
      { id: "mando_a",     nome: "Mando",                      itens: 10, cor: "#EF9F27" },
      { id: "nomeacao",    nome: "Nomeação",                   itens: 10, cor: "#E05A4B" },
      { id: "intraverbal_a",nome: "Intraverbal",               itens: 10, cor: "#23c48f" },
    ],
  },
  {
    id: "afls",
    nome: "Assessment of Functional Living Skills",
    sigla: "AFLS",
    descricao: "Avaliação de habilidades funcionais de vida independente. Foco em autocuidado, habilidades domésticas, comunidade e vocacional.",
    faixaEtaria: "5+ anos",
    tempoMedio: "1–2 horas",
    cor: "#EF9F27",
    icone: "🏠",
    disponivel: false,
    dominios: [
      { id: "autocuidado", nome: "Autocuidado",    itens: 30, cor: "#1D9E75" },
      { id: "domestico",   nome: "Doméstico",      itens: 25, cor: "#EF9F27" },
      { id: "comunidade",  nome: "Comunidade",     itens: 20, cor: "#378ADD" },
      { id: "vocacional",  nome: "Vocacional",     itens: 15, cor: "#8B7FE8" },
    ],
  },
];

// AVALIACOES_HIST — carregado do Supabase no componente

const REGISTROS_ABC: RegistroABC[] = [
  { id: "abc1", horario: "09:12", antecedente: "Solicitação de tarefa acadêmica (pareamento de figuras)", comportamento: "Jogou o material no chão e vocalizou loudly", consequencia: "Terapeuta removeu o material e aguardou 30s", duracao: "45s", intensidade: "moderada" },
  { id: "abc2", horario: "09:28", antecedente: "Transição de atividade (fim do NET)", comportamento: "Birra com choro e tentativa de fuga da cadeira", consequencia: "Terapeuta manteve instrução com suporte físico parcial", duracao: "2min", intensidade: "intensa" },
  { id: "abc3", horario: "09:45", antecedente: "Acesso a reforçador preferido foi encerrado", comportamento: "Autolesão leve (bater mãos na cabeça, 3x)", consequencia: "Terapeuta bloqueou sem atenção verbal, redirecionou", duracao: "15s", intensidade: "leve" },
  { id: "abc4", horario: "10:02", antecedente: "Sem instrução — período de pausa", comportamento: "Estereotipia motora (balançar o corpo) por período prolongado", consequencia: "Sem consequência externa", duracao: "3min", intensidade: "leve" },
];

const CONDICOES_EXPERIMENTAIS: CondicaoExperimental[] = [
  { id: "atencao",   nome: "Atenção",   cor: "#378ADD", descricao: "Atenção contingente ao comportamento-alvo", registros: [2, 3, 4, 3, 5, 4, 6, 5, 4, 3] },
  { id: "fuga",      nome: "Fuga",      cor: "#E05A4B", descricao: "Remoção de demanda contingente ao comportamento", registros: [8, 9, 7, 10, 9, 8, 11, 9, 10, 8] },
  { id: "tangivel",  nome: "Tangível",  cor: "#EF9F27", descricao: "Acesso a item preferido contingente ao comportamento", registros: [3, 2, 3, 4, 2, 3, 2, 3, 2, 3] },
  { id: "controle",  nome: "Controle",  cor: "#1D9E75", descricao: "Acesso livre a reforçadores, sem demandas", registros: [1, 0, 1, 1, 0, 1, 0, 0, 1, 0] },
];

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const STATUS_AVAL: Record<StatusAval, { label: string; cor: string; bg: string }> = {
  nao_iniciada: { label: "Não iniciada", cor: "rgba(170,210,245,.88)", bg: "rgba(26,58,92,.2)"  },
  em_andamento: { label: "Em andamento", cor: "#EF9F27",              bg: "rgba(239,159,39,.1)" },
  concluida:    { label: "Concluída",    cor: "#1D9E75",              bg: "rgba(29,158,117,.1)" },
};

const FUNCAO_CONFIG: Record<FuncaoComport, { label: string; cor: string; descricao: string }> = {
  atencao:    { label: "Atenção social",    cor: "#378ADD", descricao: "Comportamento mantido por atenção de outras pessoas" },
  fuga:       { label: "Fuga/Esquiva",      cor: "#E05A4B", descricao: "Comportamento mantido pela remoção de estímulos aversivos" },
  tangivel:   { label: "Acesso a tangível", cor: "#EF9F27", descricao: "Comportamento mantido por acesso a objetos/atividades" },
  automatica: { label: "Automática",        cor: "#8B7FE8", descricao: "Comportamento mantido por estimulação sensorial intrínseca" },
  indefinida: { label: "Indefinida",        cor: "rgba(160,200,235,.84)", descricao: "Função não determinada — mais dados necessários" },
};

function funcaoIdentificada(condicoes: CondicaoExperimental[]): FuncaoComport {
  const maxima = condicoes.reduce((a, b) =>
    b.registros.reduce((s, n) => s + n, 0) > a.registros.reduce((s, n) => s + n, 0) ? b : a
  );
  const mediaMaxima = maxima.registros.reduce((s, n) => s + n, 0) / maxima.registros.length;
  const mediaControle = condicoes.find(c => c.id === "controle")?.registros.reduce((s, n) => s + n, 0)! / 10;
  if (mediaMaxima < mediaControle * 1.5) return "indefinida";
  const map: Record<string, FuncaoComport> = { fuga: "fuga", atencao: "atencao", tangivel: "tangivel", controle: "automatica" };
  return map[maxima.id] ?? "indefinida";
}

// ─── PAGE ────────────────────────────────────────────────────────────────────
export default function AvaliacoesPage() {
  const { terapeuta } = useClinicContext();
  const nivel = terapeuta?.nivel ?? "coordenador";

  const [tab,          setTab]          = useState<TabAval>("protocolos");
  const [tipoAF,       setTipoAF]       = useState<TipoAF>("indireta");
  const [protocoloSel, setProtocoloSel] = useState<Protocolo | null>(null);
  const [abcNovo,      setAbcNovo]      = useState({ ant: "", comp: "", cons: "", dur: "", int: "moderada" as const });
  const [avaliacoesHist, setAvaliacoesHist] = useState<AvaliacaoRegistrada[]>([]);
  const [pacientesAval,  setPacientesAval]  = useState<{ id: string; nome: string }[]>([]);

  useEffect(() => {
    if (!terapeuta) return;
    async function carregar() {
      // Pacientes do terapeuta
      const { data: planos } = await supabase
        .from("planos")
        .select("criancas ( id, nome )")
        .eq("terapeuta_id", terapeuta!.id)
        .eq("status", "ativo");
      if (planos) {
        const map = new Map<string, string>();
        for (const pl of planos) {
          const c = (pl as any).criancas as any;
          if (c && !map.has(c.id)) map.set(c.id, c.nome);
        }
        setPacientesAval(Array.from(map.entries()).map(([id, nome]) => ({ id, nome })));
      }

      // Avaliações do banco
      const { data: avals } = await supabase
        .from("avaliacoes")
        .select("id, nome_crianca, criado_em, score_geral, tipo, dominio_prioritario, convertido")
        .order("criado_em", { ascending: false })
        .limit(20);

      if (avals && avals.length > 0) {
        const GRADIENTS_AV = [
          "linear-gradient(135deg,#1D9E75,#378ADD)",
          "linear-gradient(135deg,#378ADD,#8B7FE8)",
          "linear-gradient(135deg,#8B7FE8,#E05A4B)",
          "linear-gradient(135deg,#4d6d8a,#378ADD)",
          "linear-gradient(135deg,#EF9F27,#E05A4B)",
        ];
        const result: AvaliacaoRegistrada[] = avals.map((av: any, i: number) => {
          const nome = av.nome_crianca ?? "Paciente";
          const partes = nome.trim().split(" ");
          const inic = partes.length >= 2
            ? `${partes[0][0]}${partes[partes.length-1][0]}`.toUpperCase()
            : nome.slice(0,2).toUpperCase();
          const scoreGeral = av.score_geral ?? 0;
          return {
            id:             av.id,
            protocoloSigla: av.tipo?.toUpperCase() ?? "FRACTA",
            protocoloCor:   "#1D9E75",
            pacienteNome:   nome,
            pacienteIniciais: inic,
            gradient:       GRADIENTS_AV[i % GRADIENTS_AV.length],
            dataAplicacao:  new Date(av.criado_em).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }),
            aplicador:      terapeuta!.nome,
            status:         av.convertido ? "concluida" : "em_andamento" as any,
            pontuacaoTotal: scoreGeral,
            pontuacaoMaxima: 100,
            nivelGeral:     av.dominio_prioritario ?? "—",
          };
        });
        setAvaliacoesHist(result);
      }
    }
    carregar();
  }, [terapeuta]);

  const funcaoIdent = useMemo(() => funcaoIdentificada(CONDICOES_EXPERIMENTAIS), []);
  const fc          = FUNCAO_CONFIG[funcaoIdent];

  const card: React.CSSProperties = { background: "rgba(13,32,53,.75)", border: "1px solid rgba(70,120,180,.5)", borderRadius: 14, backdropFilter: "blur(8px)" };
  const lbl:  React.CSSProperties = { fontSize: ".6rem", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: ".09em", color: "rgba(170,210,245,.88)", marginBottom: 8 };
  const inp:  React.CSSProperties = { background: "rgba(20,55,110,.55)", border: "1px solid rgba(26,58,92,.6)", borderRadius: 8, padding: "9px 12px", color: "#e8f0f8", fontFamily: "var(--font-sans)", fontSize: ".82rem", outline: "none", width: "100%", boxSizing: "border-box" as const };

  const TABS = [
    { id: "protocolos"        as TabAval, label: "Protocolos"       },
    { id: "analise-funcional" as TabAval, label: "Análise Funcional"},
    { id: "historico"         as TabAval, label: "Histórico"        },
  ];

  // ── Modal de protocolo ────────────────────────────────────────────────────
  if (protocoloSel) {
    const p = protocoloSel;
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <button onClick={() => setProtocoloSel(null)} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: "rgba(160,200,235,.90)", cursor: "pointer", fontFamily: "var(--font-sans)", fontSize: ".78rem", padding: 0, alignSelf: "flex-start" }}>
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 3L5 8l5 5"/></svg>
          Voltar
        </button>

        <div style={{ ...card, padding: 24, borderLeft: `3px solid ${p.cor}` }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 20 }}>
            <span style={{ fontSize: 36 }}>{p.icone}</span>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                <h1 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#e8f0f8", margin: 0 }}>{p.sigla}</h1>
                <span style={{ fontSize: ".68rem", color: "rgba(160,200,235,.84)" }}>{p.faixaEtaria}</span>
                <span style={{ fontSize: ".68rem", color: "rgba(160,200,235,.84)" }}>~{p.tempoMedio}</span>
              </div>
              <div style={{ fontSize: ".82rem", color: "rgba(160,200,235,.90)", lineHeight: 1.65, marginBottom: 6 }}>{p.nome}</div>
              <div style={{ fontSize: ".78rem", color: "rgba(160,200,235,.84)", lineHeight: 1.6 }}>{p.descricao}</div>
            </div>
          </div>

          {/* Selecionar paciente */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ ...lbl }}>Aplicar para qual paciente?</div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {pacientesAval.length === 0 ? (
                <div style={{ fontSize: ".75rem", color: "rgba(255,255,255,.3)" }}>Nenhum paciente vinculado</div>
              ) : pacientesAval.map(p => (
                <button key={p.id} style={{ padding: "8px 14px", borderRadius: 9, border: "1px solid rgba(70,120,180,.5)", background: "rgba(26,58,92,.25)", color: "rgba(160,200,235,.92)", fontFamily: "var(--font-sans)", fontSize: ".75rem", cursor: "pointer" }}>
                  {p.nome.split(" ")[0]}
                </button>
              ))}
            </div>
          </div>

          {/* Domínios */}
          <div style={{ ...lbl }}>Domínios da avaliação</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 10, marginBottom: 20 }}>
            {p.dominios.map(d => (
              <div key={d.id} style={{ padding: "12px 14px", background: "rgba(26,58,92,.25)", borderRadius: 10, border: `1px solid ${d.cor}22` }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: ".78rem", fontWeight: 600, color: "#e8f0f8" }}>{d.nome}</span>
                  <span style={{ fontSize: ".65rem", color: "rgba(170,210,245,.88)" }}>{d.itens} itens</span>
                </div>
                <div style={{ height: 4, background: "rgba(26,58,92,.5)", borderRadius: 2, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: "0%", background: d.cor }} />
                </div>
                <div style={{ fontSize: ".62rem", color: "rgba(165,208,242,.85)", marginTop: 4 }}>Não iniciado</div>
              </div>
            ))}
          </div>

          <button style={{ width: "100%", padding: 14, borderRadius: 10, border: "none", background: `linear-gradient(135deg,${p.cor},${p.cor}99)`, color: "#07111f", fontFamily: "var(--font-sans)", fontWeight: 800, fontSize: ".9rem", cursor: "pointer" }}>
            Iniciar avaliação {p.sigla} →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* ── HEADER ── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: "1.2rem", fontWeight: 800, color: "#e8f0f8", margin: 0, marginBottom: 4 }}>Avaliações</h1>
          <div style={{ fontSize: ".72rem", color: "rgba(160,200,235,.84)" }}>Protocolos padronizados · Análise Funcional · Histórico clínico</div>
        </div>
        <button style={{ padding: "9px 16px", borderRadius: 9, border: "none", background: "linear-gradient(135deg,#1D9E75,#0f8f7a)", color: "#07111f", fontWeight: 700, fontSize: ".82rem", cursor: "pointer", fontFamily: "var(--font-sans)", display: "flex", alignItems: "center", gap: 6 }}>
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3v10M3 8h10"/></svg>
          Nova avaliação
        </button>
      </div>

      {/* ── KPIs ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 10 }}>
        {[
          { l: "Avaliações concluídas", v: avaliacoesHist.filter(a => a.status === "concluida").length,    c: "#1D9E75" },
          { l: "Em andamento",          v: avaliacoesHist.filter(a => a.status === "em_andamento").length, c: "#EF9F27" },
          { l: "Protocolos disponíveis",v: PROTOCOLOS.filter(p => p.disponivel).length,                    c: "#378ADD" },
          { l: "AFs realizadas",        v: 3,                                                               c: "#8B7FE8" },
        ].map(k => (
          <div key={k.l} style={{ ...card, padding: "14px 16px" }}>
            <div style={{ fontSize: ".58rem", color: "rgba(170,210,245,.88)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 6 }}>{k.l}</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 800, color: k.c }}>{k.v}</div>
          </div>
        ))}
      </div>

      {/* ── TABS ── */}
      <div style={{ display: "flex", borderBottom: "1px solid rgba(26,58,92,.4)" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: "10px 18px", background: "none", border: "none",
            borderBottom: `2px solid ${tab === t.id ? "#1D9E75" : "transparent"}`,
            color: tab === t.id ? "#1D9E75" : "rgba(160,200,235,.84)",
            fontFamily: "var(--font-sans)", fontWeight: tab === t.id ? 600 : 400,
            fontSize: ".82rem", cursor: "pointer", marginBottom: -1,
          }}>{t.label}</button>
        ))}
      </div>

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* TAB: PROTOCOLOS */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      {tab === "protocolos" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 14 }}>
            {PROTOCOLOS.map(p => (
              <div key={p.id} style={{ ...card, display: "flex", flexDirection: "column", border: `1px solid ${p.disponivel ? p.cor + "33" : "rgba(26,58,92,.4)"}`, opacity: p.disponivel ? 1 : 0.6 }}>
                <div style={{ height: 4, background: p.disponivel ? p.cor : "rgba(26,58,92,.5)", borderRadius: "14px 14px 0 0" }} />
                <div style={{ padding: 18, flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <span style={{ fontSize: 28, flexShrink: 0 }}>{p.icone}</span>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                        <span style={{ fontSize: "1rem", fontWeight: 800, color: p.cor }}>{p.sigla}</span>
                        {!p.disponivel && <span style={{ fontSize: ".6rem", color: "rgba(170,210,245,.88)", background: "rgba(20,55,110,.55)", borderRadius: 20, padding: "1px 7px" }}>Em breve</span>}
                      </div>
                      <div style={{ fontSize: ".7rem", color: "rgba(160,200,235,.84)", lineHeight: 1.4 }}>{p.nome}</div>
                    </div>
                  </div>

                  <div style={{ fontSize: ".75rem", color: "rgba(160,200,235,.90)", lineHeight: 1.55 }}>{p.descricao.slice(0, 110)}...</div>

                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontSize: ".62rem", color: "rgba(170,210,245,.88)", background: "rgba(20,55,110,.55)", borderRadius: 20, padding: "2px 8px" }}>{p.faixaEtaria}</span>
                    <span style={{ fontSize: ".62rem", color: "rgba(170,210,245,.88)", background: "rgba(20,55,110,.55)", borderRadius: 20, padding: "2px 8px" }}>⏱ {p.tempoMedio}</span>
                    <span style={{ fontSize: ".62rem", color: "rgba(170,210,245,.88)", background: "rgba(20,55,110,.55)", borderRadius: 20, padding: "2px 8px" }}>{p.dominios.length} domínios</span>
                  </div>

                  {/* Mini barras de domínio */}
                  <div style={{ display: "flex", gap: 3 }}>
                    {p.dominios.map(d => (
                      <div key={d.id} style={{ flex: 1, height: 4, background: d.cor, borderRadius: 2, opacity: .7 }} title={d.nome} />
                    ))}
                  </div>

                  <button onClick={() => p.disponivel && setProtocoloSel(p)} style={{ marginTop: "auto", padding: "9px", borderRadius: 8, border: "none", background: p.disponivel ? `${p.cor}22` : "rgba(26,58,92,.2)", color: p.disponivel ? p.cor : "rgba(165,208,242,.85)", fontFamily: "var(--font-sans)", fontWeight: 700, fontSize: ".78rem", cursor: p.disponivel ? "pointer" : "default" }}>
                    {p.disponivel ? `Aplicar ${p.sigla} →` : "Em breve"}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Nota sobre personalização */}
          <div style={{ ...card, padding: 16, border: "1px solid rgba(55,138,221,.2)", background: "rgba(55,138,221,.04)", display: "flex", alignItems: "center", gap: 12 }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#378ADD" strokeWidth="1.5"><circle cx="8" cy="8" r="6"/><path d="M8 7v4M8 5h.01"/></svg>
            <span style={{ fontSize: ".75rem", color: "rgba(160,200,235,.92)" }}>
              Os protocolos serão expandidos com os itens completos conforme o material clínico for integrado. Por enquanto, a estrutura de domínios já permite iniciar e registrar avaliações.
            </span>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* TAB: ANÁLISE FUNCIONAL */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      {tab === "analise-funcional" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          {/* Seletor de tipo */}
          <div style={{ display: "flex", gap: 0, ...card, padding: 4, borderRadius: 12, alignSelf: "flex-start" }}>
            {([
              { id: "indireta"     as TipoAF, label: "Indireta",      sub: "Via FractaCare" },
              { id: "descritiva"   as TipoAF, label: "Descritiva",    sub: "ABC em sessão"  },
              { id: "experimental" as TipoAF, label: "Experimental",  sub: "Condições ctrl" },
            ]).map(t => (
              <button key={t.id} onClick={() => setTipoAF(t.id)} style={{
                padding: "8px 18px", borderRadius: 9, border: "none",
                background: tipoAF === t.id ? "rgba(29,158,117,.2)" : "transparent",
                cursor: "pointer", fontFamily: "var(--font-sans)",
              }}>
                <div style={{ fontSize: ".78rem", fontWeight: tipoAF === t.id ? 700 : 400, color: tipoAF === t.id ? "#1D9E75" : "rgba(160,200,235,.84)" }}>{t.label}</div>
                <div style={{ fontSize: ".6rem", color: "rgba(165,208,242,.85)", marginTop: 2 }}>{t.sub}</div>
              </button>
            ))}
          </div>

          {/* ── INDIRETA ── */}
          {tipoAF === "indireta" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ ...card, padding: 20, border: "1px solid rgba(55,138,221,.2)", background: "rgba(55,138,221,.04)" }}>
                <div style={{ fontSize: ".62rem", color: "#378ADD", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".09em", marginBottom: 10 }}>Como funciona a AF Indireta</div>
                <div style={{ fontSize: ".8rem", color: "rgba(160,200,235,.92)", lineHeight: 1.7 }}>
                  O formulário é enviado ao responsável via <strong style={{ color: "#378ADD" }}>FractaCare</strong>. A família responde sobre antecedentes, consequências e contextos associados ao comportamento-alvo em casa. As respostas voltam automaticamente para este painel.
                </div>
              </div>

              <div style={{ ...card, padding: 20 }}>
                <div style={{ ...lbl }}>Instrumentos disponíveis</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {[
                    { sigla: "MAS",  nome: "Motivation Assessment Scale",         itens: 16, cor: "#1D9E75", descricao: "Avalia motivação por atenção, fuga, tangível e sensorial" },
                    { sigla: "FAST", nome: "Functional Analysis Screening Tool",  itens: 27, cor: "#378ADD", descricao: "Triagem das possíveis funções do comportamento" },
                    { sigla: "FAI",  nome: "Functional Assessment Interview",     itens: 11, cor: "#8B7FE8", descricao: "Entrevista estruturada sobre antecedentes e consequências" },
                  ].map(inst => (
                    <div key={inst.sigla} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: "rgba(26,58,92,.2)", borderRadius: 10, border: `1px solid ${inst.cor}22` }}>
                      <div style={{ width: 44, height: 44, borderRadius: 10, background: `${inst.cor}15`, border: `1px solid ${inst.cor}33`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <span style={{ fontSize: ".7rem", fontWeight: 800, color: inst.cor }}>{inst.sigla}</span>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: ".82rem", fontWeight: 600, color: "#e8f0f8", marginBottom: 2 }}>{inst.nome}</div>
                        <div style={{ fontSize: ".7rem", color: "rgba(160,200,235,.84)" }}>{inst.descricao} · {inst.itens} itens</div>
                      </div>
                      <button style={{ padding: "7px 14px", borderRadius: 8, border: `1px solid ${inst.cor}44`, background: `${inst.cor}11`, color: inst.cor, fontFamily: "var(--font-sans)", fontWeight: 600, fontSize: ".72rem", cursor: "pointer", flexShrink: 0 }}>
                        Enviar via Care
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Respostas pendentes */}
              <div style={{ ...card, padding: 18, border: "1px solid rgba(239,159,39,.2)", background: "rgba(239,159,39,.04)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#EF9F27" }} />
                  <span style={{ fontSize: ".72rem", fontWeight: 600, color: "#EF9F27" }}>1 formulário aguardando resposta</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "rgba(26,58,92,.25)", borderRadius: 9 }}>
                  <div style={{ width: 30, height: 30, borderRadius: "50%", background: "linear-gradient(135deg,#4d6d8a,#378ADD)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".58rem", fontWeight: 800, color: "#fff" }}>BL</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: ".78rem", color: "#e8f0f8", fontWeight: 500 }}>Beatriz Lima — MAS</div>
                    <div style={{ fontSize: ".65rem", color: "rgba(170,210,245,.88)" }}>Enviado em 10 Abr · Prazo: 20 Abr</div>
                  </div>
                  <button style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid rgba(239,159,39,.3)", background: "transparent", color: "#EF9F27", fontFamily: "var(--font-sans)", fontSize: ".68rem", fontWeight: 600, cursor: "pointer" }}>Reenviar</button>
                </div>
              </div>
            </div>
          )}

          {/* ── DESCRITIVA (ABC) ── */}
          {tipoAF === "descritiva" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ ...card, padding: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <div>
                    <div style={{ fontSize: ".88rem", fontWeight: 700, color: "#e8f0f8", marginBottom: 4 }}>Registro ABC — Beatriz Lima</div>
                    <div style={{ fontSize: ".7rem", color: "rgba(160,200,235,.84)" }}>Sessão 14/04/2025 · Antecedente → Comportamento → Consequência</div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <span style={{ padding: "4px 10px", borderRadius: 20, background: "rgba(224,90,75,.1)", border: "1px solid rgba(224,90,75,.2)", fontSize: ".65rem", color: "#E05A4B", fontWeight: 600 }}>Fuga/Esquiva provável</span>
                  </div>
                </div>

                {/* Tabela ABC */}
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: ".75rem" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid rgba(26,58,92,.4)" }}>
                        {["Horário","Antecedente (A)","Comportamento (B)","Consequência (C)","Duração","Int."].map(h => (
                          <th key={h} style={{ padding: "8px 10px", textAlign: "left", fontSize: ".6rem", color: "rgba(170,210,245,.88)", textTransform: "uppercase", letterSpacing: ".07em", fontWeight: 600, whiteSpace: "nowrap" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {REGISTROS_ABC.map((r, i) => (
                        <tr key={r.id} style={{ borderBottom: i < REGISTROS_ABC.length - 1 ? "1px solid rgba(26,58,92,.2)" : "none" }}>
                          <td style={{ padding: "10px 10px", color: "rgba(160,200,235,.84)", fontFamily: "monospace", whiteSpace: "nowrap" }}>{r.horario}</td>
                          <td style={{ padding: "10px 10px", color: "rgba(175,210,240,.95)", lineHeight: 1.5 }}>{r.antecedente}</td>
                          <td style={{ padding: "10px 10px", color: "#e8f0f8", fontWeight: 500, lineHeight: 1.5 }}>{r.comportamento}</td>
                          <td style={{ padding: "10px 10px", color: "rgba(160,200,235,.92)", lineHeight: 1.5 }}>{r.consequencia}</td>
                          <td style={{ padding: "10px 10px", color: "rgba(160,200,235,.84)", whiteSpace: "nowrap" }}>{r.duracao}</td>
                          <td style={{ padding: "10px 10px" }}>
                            <span style={{ fontSize: ".62rem", color: r.intensidade === "intensa" ? "#E05A4B" : r.intensidade === "moderada" ? "#EF9F27" : "#1D9E75", fontWeight: 600 }}>
                              {r.intensidade === "intensa" ? "Alta" : r.intensidade === "moderada" ? "Mod." : "Leve"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Formulário novo registro */}
                <div style={{ marginTop: 16, padding: "14px 16px", background: "rgba(26,58,92,.2)", borderRadius: 10, border: "1px dashed rgba(26,58,92,.5)" }}>
                  <div style={{ ...lbl, marginBottom: 10 }}>Novo registro</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 10 }}>
                    <div>
                      <label style={{ ...lbl }}>Antecedente</label>
                      <input value={abcNovo.ant} onChange={e => setAbcNovo(v => ({ ...v, ant: e.target.value }))} placeholder="O que aconteceu antes..." style={inp} />
                    </div>
                    <div>
                      <label style={{ ...lbl }}>Comportamento</label>
                      <input value={abcNovo.comp} onChange={e => setAbcNovo(v => ({ ...v, comp: e.target.value }))} placeholder="Descreva o comportamento..." style={inp} />
                    </div>
                    <div>
                      <label style={{ ...lbl }}>Consequência</label>
                      <input value={abcNovo.cons} onChange={e => setAbcNovo(v => ({ ...v, cons: e.target.value }))} placeholder="O que aconteceu depois..." style={inp} />
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
                    <div style={{ width: 100 }}>
                      <label style={{ ...lbl }}>Duração</label>
                      <input value={abcNovo.dur} onChange={e => setAbcNovo(v => ({ ...v, dur: e.target.value }))} placeholder="ex: 30s" style={inp} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ ...lbl }}>Intensidade</label>
                      <select value={abcNovo.int} onChange={e => setAbcNovo(v => ({ ...v, int: e.target.value as any }))} style={{ ...inp }}>
                        <option value="leve">Leve</option>
                        <option value="moderada">Moderada</option>
                        <option value="intensa">Intensa</option>
                      </select>
                    </div>
                    <button style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: "#1D9E75", color: "#07111f", fontFamily: "var(--font-sans)", fontWeight: 700, fontSize: ".8rem", cursor: "pointer", flexShrink: 0 }}>
                      + Registrar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── EXPERIMENTAL ── */}
          {tipoAF === "experimental" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

              {/* Resultado */}
              <div style={{ ...card, padding: 20, border: `1px solid ${fc.cor}44`, background: `${fc.cor}06` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ width: 48, height: 48, borderRadius: "50%", background: `${fc.cor}20`, border: `2px solid ${fc.cor}55`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <div style={{ width: 14, height: 14, borderRadius: "50%", background: fc.cor }} />
                  </div>
                  <div>
                    <div style={{ fontSize: ".62rem", color: "rgba(170,210,245,.88)", marginBottom: 3 }}>Função identificada</div>
                    <div style={{ fontSize: "1.1rem", fontWeight: 800, color: fc.cor }}>{fc.label}</div>
                    <div style={{ fontSize: ".72rem", color: "rgba(160,200,235,.84)", marginTop: 2 }}>{fc.descricao}</div>
                  </div>
                </div>
              </div>

              {/* Gráfico de condições */}
              <div style={{ ...card, padding: 20 }}>
                <div style={{ fontSize: ".88rem", fontWeight: 700, color: "#e8f0f8", marginBottom: 4 }}>Análise Funcional Experimental — Beatriz Lima</div>
                <div style={{ fontSize: ".7rem", color: "rgba(160,200,235,.84)", marginBottom: 16 }}>Frequência de comportamento-alvo por condição · 10 intervalos de 10min</div>

                {CONDICOES_EXPERIMENTAIS.map(cond => {
                  const media = Math.round(cond.registros.reduce((a, b) => a + b, 0) / cond.registros.length * 10) / 10;
                  const max   = Math.max(...CONDICOES_EXPERIMENTAIS.flatMap(c => c.registros));
                  return (
                    <div key={cond.id} style={{ marginBottom: 16 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                        <div>
                          <span style={{ fontSize: ".78rem", fontWeight: 600, color: cond.cor }}>{cond.nome}</span>
                          <span style={{ fontSize: ".65rem", color: "rgba(170,210,245,.88)", marginLeft: 8 }}>{cond.descricao}</span>
                        </div>
                        <span style={{ fontSize: ".72rem", color: cond.cor, fontWeight: 700, fontFamily: "monospace" }}>média: {media}/intervalo</span>
                      </div>
                      <div style={{ display: "flex", gap: 3, alignItems: "flex-end", height: 60 }}>
                        {cond.registros.map((val, i) => (
                          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", gap: 2 }}>
                            <div style={{ height: `${(val / max) * 52}px`, background: cond.cor, borderRadius: "3px 3px 0 0", opacity: .8, minHeight: val > 0 ? 3 : 0, transition: "height .3s" }} />
                            <span style={{ fontSize: ".5rem", color: "rgba(165,208,242,.85)", textAlign: "center" }}>{i + 1}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}

                <div style={{ marginTop: 14, padding: "10px 14px", background: "rgba(26,58,92,.25)", borderRadius: 9, fontSize: ".75rem", color: "rgba(160,200,235,.92)", lineHeight: 1.6 }}>
                  <strong style={{ color: "#e8f0f8" }}>Interpretação:</strong> A condição de <strong style={{ color: FUNCAO_CONFIG.fuga.cor }}>Fuga</strong> apresentou frequência significativamente maior em todos os intervalos, sugerindo que o comportamento-alvo é mantido por reforçamento negativo (remoção de demanda). Recomendação: revisar procedimento de fuga de tarefas e implementar FCT (Functional Communication Training) com mando de pausa.
                </div>
              </div>

              {/* Condições */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 10 }}>
                {CONDICOES_EXPERIMENTAIS.map(c => (
                  <div key={c.id} style={{ ...card, padding: 16, border: `1px solid ${c.cor}22` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontSize: ".82rem", fontWeight: 700, color: c.cor }}>{c.nome}</span>
                      <span style={{ fontSize: ".72rem", color: "rgba(160,200,235,.84)", fontFamily: "monospace" }}>{c.registros.reduce((a, b) => a + b, 0)} ocorrências</span>
                    </div>
                    <div style={{ fontSize: ".72rem", color: "rgba(160,200,235,.84)", lineHeight: 1.5 }}>{c.descricao}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* TAB: HISTÓRICO */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      {tab === "historico" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {avaliacoesHist.map(av => {
            const st  = STATUS_AVAL[av.status];
            const pct = av.pontuacaoTotal && av.pontuacaoMaxima ? Math.round((av.pontuacaoTotal / av.pontuacaoMaxima) * 100) : 0;
            return (
              <div key={av.id} style={{ ...card, padding: 20 }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: "50%", background: av.gradient, display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".68rem", fontWeight: 800, color: "#fff", flexShrink: 0 }}>
                    {av.pacienteIniciais}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                      <span style={{ fontSize: ".9rem", fontWeight: 700, color: "#e8f0f8" }}>{av.pacienteNome}</span>
                      <span style={{ fontSize: ".72rem", color: av.protocoloCor, fontWeight: 700 }}>{av.protocoloSigla}</span>
                      <span style={{ fontSize: ".62rem", color: st.cor, background: st.bg, borderRadius: 20, padding: "2px 8px", fontWeight: 600 }}>{st.label}</span>
                    </div>
                    <div style={{ fontSize: ".72rem", color: "rgba(160,200,235,.84)", marginBottom: av.status === "concluida" ? 10 : 0 }}>
                      {av.dataAplicacao} · {av.aplicador}
                    </div>
                    {av.status === "concluida" && av.pontuacaoTotal && (
                      <>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                          <span style={{ fontSize: ".72rem", color: "rgba(160,200,235,.90)" }}>{av.pontuacaoTotal} / {av.pontuacaoMaxima} pontos · {av.nivelGeral}</span>
                          <span style={{ fontSize: ".72rem", color: av.protocoloCor, fontWeight: 600 }}>{pct}%</span>
                        </div>
                        <div style={{ height: 5, background: "rgba(26,58,92,.5)", borderRadius: 2, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${pct}%`, background: av.protocoloCor }} />
                        </div>
                        {av.proximaRevisao && (
                          <div style={{ marginTop: 6, fontSize: ".68rem", color: "rgba(170,210,245,.88)" }}>Próxima revisão: {av.proximaRevisao}</div>
                        )}
                      </>
                    )}
                    {av.status === "em_andamento" && (
                      <button style={{ marginTop: 8, padding: "6px 14px", borderRadius: 7, border: `1px solid ${av.protocoloCor}44`, background: `${av.protocoloCor}11`, color: av.protocoloCor, fontFamily: "var(--font-sans)", fontWeight: 600, fontSize: ".72rem", cursor: "pointer" }}>
                        Continuar avaliação →
                      </button>
                    )}
                  </div>
                  <Link href={`/clinic/paciente/${avaliacoesHist.find(a => a.pacienteNome === av.pacienteNome)?.id ?? "1"}`} style={{ padding: "6px 12px", borderRadius: 7, border: "1px solid rgba(70,120,180,.5)", background: "transparent", color: "rgba(160,200,235,.90)", fontFamily: "var(--font-sans)", fontWeight: 500, fontSize: ".72rem", textDecoration: "none", flexShrink: 0 }}>
                    Ver perfil
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
