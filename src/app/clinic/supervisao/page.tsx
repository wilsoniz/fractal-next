"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useClinicContext } from "../layout";

// ─── TIPOS ───────────────────────────────────────────────────────────────────
type TabSup       = "casos" | "feedback" | "senioridade" | "agendar";
type StatusCaso   = "aguardando" | "em_revisao" | "aprovado" | "requer_ajuste";
type NivelFeedback= "elogio" | "observacao" | "correcao" | "critico";
type NivelSen     = "terapeuta" | "coordenador" | "supervisor";

interface CasoRevisao {
  id: string;
  pacienteNome: string;
  pacienteIniciais: string;
  gradient: string;
  cor: string;
  tipoRevisao: "sessao" | "programa" | "plano";
  descricao: string;
  dataEnvio: string;
  status: StatusCaso;
  supervisorNome?: string;
  urgente: boolean;
  programas: string[];
}

interface FeedbackSupervisor {
  id: string;
  casoId: string;
  pacienteNome: string;
  pacienteIniciais: string;
  gradient: string;
  supervisorNome: string;
  supervisorIniciais: string;
  data: string;
  nivel: NivelFeedback;
  categoria: string;
  comentario: string;
  sugestao?: string;
  respondido: boolean;
  resposta?: string;
}

interface CriterioAvaliacao {
  id: string;
  categoria: string;
  descricao: string;
  concluido: boolean;
  evidencia?: string;
}

interface SessaoSupervisao {
  id: string;
  supervisorNome: string;
  supervisorIniciais: string;
  supervisorTitulo: string;
  data: string;
  horario: string;
  duracao: string;
  modalidade: "presencial" | "teleconsulta";
  status: "agendada" | "realizada" | "disponivel";
  pauta?: string[];
  valor: number;
}

// ─── MOCK DATA ────────────────────────────────────────────────────────────────
const CASOS: CasoRevisao[] = [
  {
    id: "cr1",
    pacienteNome: "Lucas Carvalho", pacienteIniciais: "LC",
    gradient: "linear-gradient(135deg,#1D9E75,#378ADD)", cor: "#1D9E75",
    tipoRevisao: "programa",
    descricao: "Programa de Mando Funcional — critério de 80% atingido. Solicito validação para avançar para Intraverbal.",
    dataEnvio: "15 Abr 2025",
    status: "em_revisao",
    supervisorNome: "Dr. Felipe Mendes — BCBA-D",
    urgente: false,
    programas: ["Mando funcional", "Atenção ao nome"],
  },
  {
    id: "cr2",
    pacienteNome: "Beatriz Lima", pacienteIniciais: "BL",
    gradient: "linear-gradient(135deg,#4d6d8a,#378ADD)", cor: "#4d6d8a",
    tipoRevisao: "sessao",
    descricao: "Sessão 14/04 — comportamento de fuga intensificou durante DTT. Precisando de orientação para ajuste de procedimento.",
    dataEnvio: "14 Abr 2025",
    status: "aguardando",
    urgente: true,
    programas: ["Redução de fuga", "Tolerância à espera"],
  },
  {
    id: "cr3",
    pacienteNome: "Rafael Pinto", pacienteIniciais: "RP",
    gradient: "linear-gradient(135deg,#8B7FE8,#E05A4B)", cor: "#8B7FE8",
    tipoRevisao: "plano",
    descricao: "Plano terapêutico semestral — revisão dos domínios e metas para o segundo semestre de 2025.",
    dataEnvio: "10 Abr 2025",
    status: "aprovado",
    supervisorNome: "Dra. Ana Beatriz Costa — BCBA",
    urgente: false,
    programas: ["Atenção conjunta", "Habilidades sociais", "Comunicação funcional"],
  },
  {
    id: "cr4",
    pacienteNome: "Maria Santos", pacienteIniciais: "MS",
    gradient: "linear-gradient(135deg,#378ADD,#8B7FE8)", cor: "#378ADD",
    tipoRevisao: "programa",
    descricao: "Programa de Intraverbal nível 2 — baixo desempenho nas últimas 3 sessões. Solicito revisão do critério.",
    dataEnvio: "08 Abr 2025",
    status: "requer_ajuste",
    supervisorNome: "Dr. Felipe Mendes — BCBA-D",
    urgente: false,
    programas: ["Intraverbal nível 2"],
  },
];

const FEEDBACKS: FeedbackSupervisor[] = [
  {
    id: "f1", casoId: "cr3",
    pacienteNome: "Rafael Pinto", pacienteIniciais: "RP",
    gradient: "linear-gradient(135deg,#8B7FE8,#E05A4B)",
    supervisorNome: "Dra. Ana Beatriz Costa", supervisorIniciais: "AB",
    data: "12 Abr 2025",
    nivel: "elogio",
    categoria: "Planejamento clínico",
    comentario: "Excelente elaboração do plano semestral. A análise funcional dos comportamentos-alvo está bem fundamentada e os critérios de domínio são realistas para o perfil do Rafael.",
    sugestao: "Considere adicionar um programa de generalização para os mandos já adquiridos — o Rafael tem potencial para expandir em ambiente escolar.",
    respondido: true,
    resposta: "Obrigada pela validação! Vou incluir o programa de generalização na próxima sessão.",
  },
  {
    id: "f2", casoId: "cr4",
    pacienteNome: "Maria Santos", pacienteIniciais: "MS",
    gradient: "linear-gradient(135deg,#378ADD,#8B7FE8)",
    supervisorNome: "Dr. Felipe Mendes", supervisorIniciais: "FM",
    data: "10 Abr 2025",
    nivel: "correcao",
    categoria: "Procedimento de ensino",
    comentario: "O baixo desempenho no Intraverbal nível 2 sugere que o critério foi avançado prematuramente. A Maria precisava de mais 3–4 sessões de consolidação no nível 1 antes de progredir.",
    sugestao: "Retroceda ao nível 1 com critério mais conservador (70%) por 2 sessões antes de reavançar. Reduza também o número de relações condicionais por tentativa de 4 para 2.",
    respondido: false,
  },
  {
    id: "f3", casoId: "cr1",
    pacienteNome: "Lucas Carvalho", pacienteIniciais: "LC",
    gradient: "linear-gradient(135deg,#1D9E75,#378ADD)",
    supervisorNome: "Dr. Felipe Mendes", supervisorIniciais: "FM",
    data: "16 Abr 2025",
    nivel: "observacao",
    categoria: "Transição de programa",
    comentario: "O Lucas atingiu critério consistente em Mando Funcional — parabéns pelo trabalho! Antes de avançar para Intraverbal, verifique se os mandos generalizam para pelo menos 2 contextos diferentes além da sessão.",
    respondido: false,
  },
];

const CRITERIOS_SENIORIDADE: CriterioAvaliacao[] = [
  { id: "cs1", categoria: "Formação", descricao: "Concluir trilha de Formação em ABA Aplicada ao TEA", concluido: true, evidencia: "Certificado emitido em Mar 2025" },
  { id: "cs2", categoria: "Formação", descricao: "Curso de Análise Funcional do Comportamento", concluido: false },
  { id: "cs3", categoria: "Prática clínica", descricao: "Mínimo 200 horas de sessões registradas na plataforma", concluido: true, evidencia: "847 sessões registradas" },
  { id: "cs4", categoria: "Prática clínica", descricao: "Pelo menos 5 pacientes com plano terapêutico completo", concluido: true, evidencia: "5 pacientes ativos com plano" },
  { id: "cs5", categoria: "Supervisão", descricao: "10 sessões de supervisão realizadas", concluido: true, evidencia: "12 sessões com Dr. Felipe Mendes" },
  { id: "cs6", categoria: "Supervisão", descricao: "Nenhum feedback crítico não respondido nos últimos 60 dias", concluido: true, evidencia: "Todos os feedbacks respondidos" },
  { id: "cs7", categoria: "Avaliação", descricao: "Aprovação em avaliação de competências pelo supervisor", concluido: false },
  { id: "cs8", categoria: "Avaliação", descricao: "Apresentação de caso clínico supervisionado", concluido: false },
];

const SESSOES_SUPERVISAO: SessaoSupervisao[] = [
  {
    id: "ss1",
    supervisorNome: "Dr. Felipe Mendes", supervisorIniciais: "FM",
    supervisorTitulo: "BCBA-D · 15 anos de experiência",
    data: "2025-04-22", horario: "14:00", duracao: "1h",
    modalidade: "teleconsulta",
    status: "agendada",
    pauta: ["Revisão do caso Lucas — transição para Intraverbal", "Ajuste do programa Maria — Intraverbal nível 2"],
    valor: 350,
  },
  {
    id: "ss2",
    supervisorNome: "Dra. Ana Beatriz Costa", supervisorIniciais: "AB",
    supervisorTitulo: "BCBA · Especialista em Verbal Behavior",
    data: "2025-04-10", horario: "10:00", duracao: "1h",
    modalidade: "teleconsulta",
    status: "realizada",
    pauta: ["Revisão plano Rafael", "Discussão sobre generalização"],
    valor: 300,
  },
  {
    id: "ss3",
    supervisorNome: "Dr. Marcos Aguiar", supervisorIniciais: "MA",
    supervisorTitulo: "BCBA-D · Especialista em Equivalência",
    data: "2025-04-28", horario: "15:00", duracao: "1h",
    modalidade: "teleconsulta",
    status: "disponivel",
    valor: 380,
  },
];

// ─── CONFIGS ─────────────────────────────────────────────────────────────────
const STATUS_CASO: Record<StatusCaso, { label: string; cor: string; bg: string; borda: string }> = {
  aguardando:    { label: "Aguardando",    cor: "#EF9F27", bg: "rgba(239,159,39,.1)",  borda: "rgba(239,159,39,.25)"  },
  em_revisao:    { label: "Em revisão",    cor: "#378ADD", bg: "rgba(55,138,221,.1)",  borda: "rgba(55,138,221,.25)"  },
  aprovado:      { label: "Aprovado",      cor: "#1D9E75", bg: "rgba(29,158,117,.1)",  borda: "rgba(29,158,117,.25)"  },
  requer_ajuste: { label: "Requer ajuste", cor: "#E05A4B", bg: "rgba(224,90,75,.1)",   borda: "rgba(224,90,75,.25)"   },
};

const NIVEL_FEEDBACK: Record<NivelFeedback, { label: string; cor: string; bg: string; icone: string }> = {
  elogio:      { label: "Elogio",      cor: "#1D9E75", bg: "rgba(29,158,117,.08)",  icone: "🌟" },
  observacao:  { label: "Observação",  cor: "#EF9F27", bg: "rgba(239,159,39,.08)",  icone: "👁" },
  correcao:    { label: "Correção",    cor: "#E05A4B", bg: "rgba(224,90,75,.08)",   icone: "🔧" },
  critico:     { label: "Crítico",     cor: "#8B7FE8", bg: "rgba(139,127,232,.08)", icone: "⚠️" },
};

const NIVEL_SEN_CONFIG: Record<NivelSen, { label: string; cor: string; bg: string; next?: string }> = {
  terapeuta:   { label: "Terapeuta / RBT",   cor: "#1D9E75", bg: "rgba(29,158,117,.1)",  next: "Coordenador ABA"   },
  coordenador: { label: "Coordenador ABA",   cor: "#EF9F27", bg: "rgba(239,159,39,.1)",  next: "Supervisor / BCBA" },
  supervisor:  { label: "Supervisor / BCBA", cor: "#8B7FE8", bg: "rgba(139,127,232,.1)", next: undefined           },
};

// ─── PAGE ────────────────────────────────────────────────────────────────────
export default function SupervisaoPage() {
  const { terapeuta } = useClinicContext();
  const nivelAtual: NivelSen = (terapeuta?.nivel as NivelSen) ?? "coordenador";

  const [tab,           setTab]           = useState<TabSup>("casos");
  const [feedbackAberto,setFeedbackAberto]= useState<FeedbackSupervisor | null>(null);
  const [resposta,      setResposta]      = useState("");

  const stats = useMemo(() => ({
    aguardando:    CASOS.filter(c => c.status === "aguardando").length,
    emRevisao:     CASOS.filter(c => c.status === "em_revisao").length,
    aprovados:     CASOS.filter(c => c.status === "aprovado").length,
    feedbackPend:  FEEDBACKS.filter(f => !f.respondido).length,
  }), []);

  const criteriosConcluidos = CRITERIOS_SENIORIDADE.filter(c => c.concluido).length;
  const pctSenioridade      = Math.round((criteriosConcluidos / CRITERIOS_SENIORIDADE.length) * 100);
  const nc                  = NIVEL_SEN_CONFIG[nivelAtual];

  const card: React.CSSProperties = { background: "rgba(13,32,53,.75)", border: "1px solid rgba(70,120,180,.5)", borderRadius: 14, backdropFilter: "blur(8px)" };
  const lbl:  React.CSSProperties = { fontSize: ".6rem", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: ".09em", color: "rgba(170,210,245,.88)", marginBottom: 8 };
  const inp:  React.CSSProperties = { background: "rgba(20,55,110,.55)", border: "1px solid rgba(26,58,92,.6)", borderRadius: 8, padding: "9px 12px", color: "#e8f0f8", fontFamily: "var(--font-sans)", fontSize: ".82rem", outline: "none", width: "100%", boxSizing: "border-box" as const };

  const TABS = [
    { id: "casos"       as TabSup, label: "Casos"        },
    { id: "feedback"    as TabSup, label: `Feedback${stats.feedbackPend > 0 ? ` (${stats.feedbackPend})` : ""}` },
    { id: "senioridade" as TabSup, label: "Senioridade"  },
    { id: "agendar"     as TabSup, label: "Agendar"      },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* ── HEADER ── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: "1.2rem", fontWeight: 800, color: "#e8f0f8", margin: 0, marginBottom: 4 }}>Supervisão Clínica</h1>
          <div style={{ fontSize: ".72rem", color: "rgba(160,200,235,.84)" }}>
            {stats.aguardando + stats.emRevisao} caso(s) em aberto · {stats.feedbackPend} feedback(s) pendente(s) de resposta
          </div>
        </div>
        <button onClick={() => setTab("agendar")} style={{ padding: "9px 16px", borderRadius: 9, border: "none", background: "linear-gradient(135deg,#8B7FE8,#378ADD)", color: "#fff", fontWeight: 700, fontSize: ".82rem", cursor: "pointer", fontFamily: "var(--font-sans)", display: "flex", alignItems: "center", gap: 6 }}>
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3v10M3 8h10"/></svg>
          Agendar supervisão
        </button>
      </div>

      {/* ── KPIs ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 10 }}>
        {[
          { l: "Aguardando",       v: stats.aguardando,   c: "#EF9F27" },
          { l: "Em revisão",       v: stats.emRevisao,    c: "#378ADD" },
          { l: "Aprovados (mês)",  v: stats.aprovados,    c: "#1D9E75" },
          { l: "Feedback pendente",v: stats.feedbackPend, c: stats.feedbackPend > 0 ? "#E05A4B" : "#1D9E75" },
        ].map(k => (
          <div key={k.l} style={{ ...card, padding: "14px 16px" }}>
            <div style={{ fontSize: ".58rem", color: "rgba(170,210,245,.88)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 6 }}>{k.l}</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 800, color: k.c }}>{k.v}</div>
          </div>
        ))}
      </div>

      {/* Nível atual + progresso */}
      <div style={{ ...card, padding: "14px 18px", display: "flex", alignItems: "center", gap: 14, border: `1px solid ${nc.cor}33` }}>
        <div style={{ width: 38, height: 38, borderRadius: "50%", background: nc.bg, border: `2px solid ${nc.cor}55`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: nc.cor }} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: ".78rem", fontWeight: 600, color: "#e8f0f8" }}>Nível atual:</span>
            <span style={{ fontSize: ".75rem", color: nc.cor, fontWeight: 700 }}>{nc.label}</span>
            {nc.next && <span style={{ fontSize: ".65rem", color: "rgba(170,210,245,.88)" }}>→ próximo: {nc.next}</span>}
          </div>
          <div style={{ height: 4, background: "rgba(26,58,92,.5)", borderRadius: 2, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${pctSenioridade}%`, background: nc.cor, transition: "width .5s" }} />
          </div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontSize: "1rem", fontWeight: 800, color: nc.cor }}>{pctSenioridade}%</div>
          <div style={{ fontSize: ".6rem", color: "rgba(170,210,245,.88)" }}>{criteriosConcluidos}/{CRITERIOS_SENIORIDADE.length} critérios</div>
        </div>
        <button onClick={() => setTab("senioridade")} style={{ padding: "6px 12px", borderRadius: 7, border: `1px solid ${nc.cor}44`, background: nc.bg, color: nc.cor, fontFamily: "var(--font-sans)", fontWeight: 600, fontSize: ".72rem", cursor: "pointer", flexShrink: 0 }}>
          Ver progresso
        </button>
      </div>

      {/* ── TABS ── */}
      <div style={{ display: "flex", borderBottom: "1px solid rgba(26,58,92,.4)" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: "10px 18px", background: "none", border: "none",
            borderBottom: `2px solid ${tab === t.id ? "#8B7FE8" : "transparent"}`,
            color: tab === t.id ? "#8B7FE8" : "rgba(160,200,235,.84)",
            fontFamily: "var(--font-sans)", fontWeight: tab === t.id ? 600 : 400,
            fontSize: ".82rem", cursor: "pointer", marginBottom: -1,
          }}>{t.label}</button>
        ))}
      </div>

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* TAB: CASOS */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      {tab === "casos" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

          {CASOS.sort((a, b) => (b.urgente ? 1 : 0) - (a.urgente ? 1 : 0)).map(caso => {
            const st = STATUS_CASO[caso.status];
            return (
              <div key={caso.id} style={{ ...card, padding: 20, border: `1px solid ${caso.urgente ? "rgba(224,90,75,.35)" : st.borda}`, background: caso.urgente ? "rgba(224,90,75,.04)" : "rgba(13,32,53,.75)" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: "50%", background: caso.gradient, display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".68rem", fontWeight: 800, color: "#fff", flexShrink: 0 }}>
                    {caso.pacienteIniciais}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                      <span style={{ fontSize: ".88rem", fontWeight: 700, color: "#e8f0f8" }}>{caso.pacienteNome}</span>
                      <span style={{ fontSize: ".62rem", color: st.cor, background: st.bg, border: `1px solid ${st.borda}`, borderRadius: 20, padding: "2px 8px", fontWeight: 600 }}>{st.label}</span>
                      <span style={{ fontSize: ".62rem", color: "rgba(160,200,235,.84)", background: "rgba(20,55,110,.55)", borderRadius: 20, padding: "2px 8px" }}>
                        {caso.tipoRevisao === "sessao" ? "Sessão" : caso.tipoRevisao === "programa" ? "Programa" : "Plano terapêutico"}
                      </span>
                      {caso.urgente && <span style={{ fontSize: ".62rem", color: "#E05A4B", background: "rgba(224,90,75,.1)", border: "1px solid rgba(224,90,75,.25)", borderRadius: 20, padding: "2px 8px", fontWeight: 700 }}>⚡ Urgente</span>}
                    </div>
                    <div style={{ fontSize: ".78rem", color: "rgba(160,200,235,.92)", lineHeight: 1.6, marginBottom: 8 }}>{caso.descricao}</div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                      {caso.programas.map(p => (
                        <span key={p} style={{ fontSize: ".65rem", color: caso.cor, background: `${caso.cor}11`, border: `1px solid ${caso.cor}33`, borderRadius: 20, padding: "2px 8px" }}>{p}</span>
                      ))}
                    </div>
                    <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                      <span style={{ fontSize: ".68rem", color: "rgba(170,210,245,.88)" }}>Enviado em {caso.dataEnvio}</span>
                      {caso.supervisorNome && <span style={{ fontSize: ".68rem", color: "rgba(160,200,235,.84)" }}>Supervisor: {caso.supervisorNome.split("—")[0].trim()}</span>}
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}>
                    <Link href={`/clinic/paciente/${caso.id}`} style={{ padding: "6px 12px", borderRadius: 7, border: "1px solid rgba(70,120,180,.5)", background: "transparent", color: "rgba(160,200,235,.90)", fontFamily: "var(--font-sans)", fontWeight: 500, fontSize: ".72rem", textDecoration: "none", textAlign: "center" }}>
                      Ver perfil
                    </Link>
                    {caso.status === "requer_ajuste" && (
                      <button style={{ padding: "6px 12px", borderRadius: 7, border: "1px solid rgba(224,90,75,.3)", background: "rgba(224,90,75,.08)", color: "#E05A4B", fontFamily: "var(--font-sans)", fontWeight: 600, fontSize: ".72rem", cursor: "pointer" }}>
                        Ver ajuste
                      </button>
                    )}
                    {caso.status === "aguardando" && (
                      <button style={{ padding: "6px 12px", borderRadius: 7, border: "1px solid rgba(239,159,39,.3)", background: "rgba(239,159,39,.08)", color: "#EF9F27", fontFamily: "var(--font-sans)", fontWeight: 600, fontSize: ".72rem", cursor: "pointer" }}>
                        Reenviar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Novo envio */}
          <div style={{ ...card, padding: 20, border: "1px dashed rgba(139,127,232,.3)", background: "rgba(139,127,232,.03)", display: "flex", alignItems: "center", gap: 14, cursor: "pointer" }}>
            <div style={{ width: 40, height: 40, borderRadius: "50%", background: "rgba(139,127,232,.15)", border: "1px solid rgba(139,127,232,.3)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#8B7FE8" strokeWidth="2"><path d="M8 3v10M3 8h10"/></svg>
            </div>
            <div>
              <div style={{ fontSize: ".82rem", fontWeight: 600, color: "#8B7FE8" }}>Enviar novo caso para supervisão</div>
              <div style={{ fontSize: ".72rem", color: "rgba(160,200,235,.84)" }}>Sessão, programa ou plano terapêutico</div>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* TAB: FEEDBACK */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      {tab === "feedback" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

          {feedbackAberto ? (
            /* ── Detalhe do feedback ── */
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <button onClick={() => { setFeedbackAberto(null); setResposta(""); }} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: "rgba(160,200,235,.90)", cursor: "pointer", fontFamily: "var(--font-sans)", fontSize: ".78rem", padding: 0, alignSelf: "flex-start" }}>
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 3L5 8l5 5"/></svg>
                Voltar
              </button>
              <div style={{ ...card, padding: 24 }}>
                {(() => {
                  const nf = NIVEL_FEEDBACK[feedbackAberto.nivel];
                  return (
                    <>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                        <span style={{ fontSize: 20 }}>{nf.icone}</span>
                        <div>
                          <div style={{ fontSize: ".88rem", fontWeight: 700, color: "#e8f0f8" }}>{feedbackAberto.categoria}</div>
                          <div style={{ fontSize: ".68rem", color: "rgba(170,210,245,.88)" }}>{feedbackAberto.supervisorNome} · {feedbackAberto.data} · Paciente: {feedbackAberto.pacienteNome}</div>
                        </div>
                        <span style={{ marginLeft: "auto", fontSize: ".65rem", color: nf.cor, background: nf.bg, borderRadius: 20, padding: "3px 10px", fontWeight: 600 }}>{nf.label}</span>
                      </div>
                      <div style={{ padding: "14px 16px", background: nf.bg, border: `1px solid ${nf.cor}33`, borderRadius: 10, marginBottom: 14 }}>
                        <div style={{ fontSize: ".8rem", color: "rgba(175,210,240,.95)", lineHeight: 1.7 }}>{feedbackAberto.comentario}</div>
                      </div>
                      {feedbackAberto.sugestao && (
                        <div style={{ padding: "12px 16px", background: "rgba(55,138,221,.08)", border: "1px solid rgba(55,138,221,.2)", borderRadius: 10, marginBottom: 16 }}>
                          <div style={{ fontSize: ".62rem", color: "#378ADD", fontWeight: 700, marginBottom: 5, textTransform: "uppercase", letterSpacing: ".08em" }}>Sugestão do supervisor</div>
                          <div style={{ fontSize: ".78rem", color: "rgba(160,200,235,.92)", lineHeight: 1.6 }}>{feedbackAberto.sugestao}</div>
                        </div>
                      )}
                      {feedbackAberto.respondido ? (
                        <div style={{ padding: "12px 16px", background: "rgba(29,158,117,.08)", border: "1px solid rgba(29,158,117,.2)", borderRadius: 10 }}>
                          <div style={{ fontSize: ".62rem", color: "#1D9E75", fontWeight: 700, marginBottom: 5, textTransform: "uppercase", letterSpacing: ".08em" }}>Sua resposta</div>
                          <div style={{ fontSize: ".78rem", color: "rgba(160,200,235,.92)", lineHeight: 1.6 }}>{feedbackAberto.resposta}</div>
                        </div>
                      ) : (
                        <div>
                          <div style={{ ...lbl }}>Responder ao supervisor</div>
                          <textarea value={resposta} onChange={e => setResposta(e.target.value)} rows={4} placeholder="Escreva sua resposta ou plano de ação..." style={{ ...inp, resize: "vertical", marginBottom: 10 }} />
                          <button style={{ padding: "10px 20px", borderRadius: 9, border: "none", background: "linear-gradient(135deg,#8B7FE8,#378ADD)", color: "#fff", fontFamily: "var(--font-sans)", fontWeight: 700, fontSize: ".82rem", cursor: "pointer" }}>
                            Enviar resposta
                          </button>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          ) : (
            /* ── Lista de feedbacks ── */
            FEEDBACKS.map(fb => {
              const nf = NIVEL_FEEDBACK[fb.nivel];
              return (
                <div key={fb.id} style={{ ...card, padding: 18, border: `1px solid ${!fb.respondido ? nf.cor + "44" : "rgba(26,58,92,.5)"}`, cursor: "pointer" }} onClick={() => setFeedbackAberto(fb)}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg,#378ADD,#8B7FE8)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".62rem", fontWeight: 800, color: "#fff", flexShrink: 0 }}>
                      {fb.supervisorIniciais}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                        <span style={{ fontSize: ".82rem", fontWeight: 600, color: "#e8f0f8" }}>{fb.supervisorNome}</span>
                        <span style={{ fontSize: ".62rem", color: nf.cor, background: nf.bg, borderRadius: 20, padding: "2px 8px", fontWeight: 600 }}>{nf.icone} {nf.label}</span>
                        {!fb.respondido && <span style={{ fontSize: ".6rem", color: "#E05A4B", background: "rgba(224,90,75,.1)", borderRadius: 20, padding: "2px 8px", fontWeight: 600 }}>Aguardando resposta</span>}
                      </div>
                      <div style={{ fontSize: ".72rem", color: "rgba(160,200,235,.84)", marginBottom: 6 }}>{fb.categoria} · Paciente: {fb.pacienteNome} · {fb.data}</div>
                      <div style={{ fontSize: ".78rem", color: "rgba(160,200,235,.92)", lineHeight: 1.5 }}>{fb.comentario.slice(0, 120)}...</div>
                    </div>
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="rgba(165,208,242,.85)" strokeWidth="1.5" style={{ flexShrink: 0, marginTop: 4 }}><path d="M6 3l5 5-5 5"/></svg>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* TAB: SENIORIDADE */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      {tab === "senioridade" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          {/* Nível atual → próximo */}
          <div style={{ ...card, padding: 22 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 20 }}>
              {(["terapeuta","coordenador","supervisor"] as NivelSen[]).map((n, i) => {
                const nc2 = NIVEL_SEN_CONFIG[n];
                const ativo = n === nivelAtual;
                const passado = ["terapeuta","coordenador","supervisor"].indexOf(n) < ["terapeuta","coordenador","supervisor"].indexOf(nivelAtual);
                return (
                  <div key={n} style={{ display: "flex", alignItems: "center", flex: 1 }}>
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                      <div style={{ width: 36, height: 36, borderRadius: "50%", background: passado ? nc2.bg : ativo ? nc2.bg : "rgba(26,58,92,.3)", border: `2px solid ${passado || ativo ? nc2.cor : "rgba(26,58,92,.5)"}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {passado ? <span style={{ color: nc2.cor, fontSize: ".9rem" }}>✓</span>
                        : ativo ? <div style={{ width: 10, height: 10, borderRadius: "50%", background: nc2.cor }} />
                        : <div style={{ width: 8, height: 8, borderRadius: "50%", background: "rgba(26,58,92,.6)" }} />}
                      </div>
                      <div style={{ fontSize: ".65rem", color: ativo ? nc2.cor : "rgba(170,210,245,.88)", fontWeight: ativo ? 700 : 400, textAlign: "center" }}>{nc2.label}</div>
                    </div>
                    {i < 2 && <div style={{ width: 40, height: 2, background: passado ? NIVEL_SEN_CONFIG["coordenador"].cor : "rgba(26,58,92,.4)", flexShrink: 0 }} />}
                  </div>
                );
              })}
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: ".75rem", color: "rgba(160,200,235,.90)" }}>Progresso para {nc.next ?? "nível máximo"}</span>
              <span style={{ fontSize: ".75rem", color: nc.cor, fontWeight: 600 }}>{pctSenioridade}%</span>
            </div>
            <div style={{ height: 8, background: "rgba(26,58,92,.5)", borderRadius: 4, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${pctSenioridade}%`, background: `linear-gradient(90deg,${nc.cor},${nc.cor}99)`, transition: "width .5s" }} />
            </div>
          </div>

          {/* Critérios agrupados por categoria */}
          {["Formação","Prática clínica","Supervisão","Avaliação"].map(cat => {
            const criterios = CRITERIOS_SENIORIDADE.filter(c => c.categoria === cat);
            const concl = criterios.filter(c => c.concluido).length;
            return (
              <div key={cat} style={{ ...card, padding: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                  <div style={{ ...lbl, marginBottom: 0 }}>{cat}</div>
                  <span style={{ fontSize: ".68rem", color: concl === criterios.length ? "#1D9E75" : "rgba(170,210,245,.88)", fontWeight: 600 }}>{concl}/{criterios.length}</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {criterios.map(c => (
                    <div key={c.id} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 12px", background: c.concluido ? "rgba(29,158,117,.06)" : "rgba(26,58,92,.2)", borderRadius: 9, border: `1px solid ${c.concluido ? "rgba(29,158,117,.2)" : "rgba(26,58,92,.4)"}` }}>
                      <div style={{ width: 20, height: 20, borderRadius: "50%", background: c.concluido ? "rgba(29,158,117,.2)" : "rgba(26,58,92,.4)", border: `1px solid ${c.concluido ? "#1D9E75" : "rgba(26,58,92,.6)"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                        {c.concluido && <span style={{ color: "#1D9E75", fontSize: ".65rem" }}>✓</span>}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: ".78rem", color: c.concluido ? "rgba(160,200,235,.90)" : "#e8f0f8", textDecoration: c.concluido ? "line-through" : "none" }}>{c.descricao}</div>
                        {c.evidencia && <div style={{ fontSize: ".65rem", color: "#1D9E75", marginTop: 3 }}>✓ {c.evidencia}</div>}
                        {!c.concluido && cat === "Formação" && (
                          <Link href="/clinic/education" style={{ fontSize: ".65rem", color: "#378ADD", marginTop: 3, display: "inline-block" }}>Ir para Education →</Link>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {/* CTA de solicitação */}
          {pctSenioridade >= 75 && (
            <div style={{ ...card, padding: 20, border: "1px solid rgba(139,127,232,.25)", background: "rgba(139,127,232,.05)", display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ fontSize: 28 }}>🎓</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: ".88rem", fontWeight: 700, color: "#8B7FE8", marginBottom: 4 }}>Você está próximo de avançar!</div>
                <div style={{ fontSize: ".75rem", color: "rgba(160,200,235,.90)" }}>Complete os critérios restantes e solicite avaliação formal ao seu supervisor para avançar para {nc.next}</div>
              </div>
              <button onClick={() => setTab("agendar")} style={{ padding: "9px 16px", borderRadius: 9, border: "none", background: "linear-gradient(135deg,#8B7FE8,#378ADD)", color: "#fff", fontFamily: "var(--font-sans)", fontWeight: 700, fontSize: ".78rem", cursor: "pointer", flexShrink: 0 }}>
                Solicitar avaliação
              </button>
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* TAB: AGENDAR */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      {tab === "agendar" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          {/* Próxima sessão agendada */}
          {SESSOES_SUPERVISAO.filter(s => s.status === "agendada").map(s => (
            <div key={s.id} style={{ ...card, padding: 20, border: "1px solid rgba(29,158,117,.25)", background: "rgba(29,158,117,.04)" }}>
              <div style={{ fontSize: ".62rem", color: "#1D9E75", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".09em", marginBottom: 12 }}>Próxima sessão agendada</div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: "50%", background: "linear-gradient(135deg,#378ADD,#8B7FE8)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".75rem", fontWeight: 800, color: "#fff", flexShrink: 0 }}>{s.supervisorIniciais}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: ".9rem", fontWeight: 700, color: "#e8f0f8" }}>{s.supervisorNome}</div>
                  <div style={{ fontSize: ".72rem", color: "rgba(160,200,235,.84)" }}>{s.supervisorTitulo}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: ".88rem", fontWeight: 700, color: "#1D9E75" }}>{new Date(s.data + "T12:00:00").toLocaleDateString("pt-BR", { day: "numeric", month: "short" })}</div>
                  <div style={{ fontSize: ".72rem", color: "rgba(160,200,235,.84)" }}>{s.horario} · {s.duracao} · {s.modalidade === "teleconsulta" ? "Video" : "Presencial"}</div>
                </div>
              </div>
              {s.pauta && s.pauta.length > 0 && (
                <div style={{ marginTop: 14, padding: "10px 14px", background: "rgba(20,55,110,.55)", borderRadius: 9 }}>
                  <div style={{ ...lbl, marginBottom: 6 }}>Pauta</div>
                  {s.pauta.map((p, i) => (
                    <div key={i} style={{ fontSize: ".75rem", color: "rgba(160,200,235,.92)", marginBottom: 3, display: "flex", gap: 6 }}>
                      <span style={{ color: "rgba(165,208,242,.85)" }}>{i + 1}.</span> {p}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* Supervisores disponíveis */}
          <div style={{ ...card, padding: 20 }}>
            <div style={{ ...lbl }}>Supervisores disponíveis</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {SESSOES_SUPERVISAO.filter(s => s.status === "disponivel").map(s => (
                <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", background: "rgba(26,58,92,.2)", borderRadius: 11, border: "1px solid rgba(70,120,180,.4)" }}>
                  <div style={{ width: 40, height: 40, borderRadius: "50%", background: "linear-gradient(135deg,#8B7FE8,#E05A4B)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".7rem", fontWeight: 800, color: "#fff", flexShrink: 0 }}>{s.supervisorIniciais}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: ".85rem", fontWeight: 600, color: "#e8f0f8", marginBottom: 2 }}>{s.supervisorNome}</div>
                    <div style={{ fontSize: ".7rem", color: "rgba(160,200,235,.84)", marginBottom: 4 }}>{s.supervisorTitulo}</div>
                    <div style={{ fontSize: ".68rem", color: "rgba(170,210,245,.88)" }}>Próxima disponibilidade: {new Date(s.data + "T12:00:00").toLocaleDateString("pt-BR", { day: "numeric", month: "short" })} às {s.horario}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: ".88rem", fontWeight: 700, color: "#e8f0f8" }}>R$ {s.valor}</div>
                    <div style={{ fontSize: ".62rem", color: "rgba(170,210,245,.88)", marginBottom: 8 }}>por sessão</div>
                    <button style={{ padding: "6px 14px", borderRadius: 8, border: "none", background: "linear-gradient(135deg,#8B7FE8,#378ADD)", color: "#fff", fontFamily: "var(--font-sans)", fontWeight: 700, fontSize: ".72rem", cursor: "pointer" }}>
                      Agendar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Histórico */}
          <div style={{ ...card, padding: 20 }}>
            <div style={{ ...lbl }}>Histórico de supervisões</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {SESSOES_SUPERVISAO.filter(s => s.status === "realizada").map(s => (
                <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "rgba(26,58,92,.2)", borderRadius: 9 }}>
                  <div style={{ width: 30, height: 30, borderRadius: "50%", background: "linear-gradient(135deg,#378ADD,#8B7FE8)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".58rem", fontWeight: 800, color: "#fff", flexShrink: 0 }}>{s.supervisorIniciais}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: ".78rem", fontWeight: 500, color: "rgba(175,210,240,.95)" }}>{s.supervisorNome.split(" ")[1]}</div>
                    <div style={{ fontSize: ".65rem", color: "rgba(170,210,245,.88)" }}>{new Date(s.data + "T12:00:00").toLocaleDateString("pt-BR")} · {s.duracao}</div>
                  </div>
                  <span style={{ fontSize: ".65rem", color: "#1D9E75", background: "rgba(29,158,117,.1)", borderRadius: 20, padding: "2px 8px", fontWeight: 600 }}>✓ Realizada</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
