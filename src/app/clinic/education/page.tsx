"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useClinicContext } from "../layout";

// ─── TIPOS ───────────────────────────────────────────────────────────────────
type TabEdu     = "trilhas" | "cursos" | "certificacoes" | "meu-progresso";
type NivelCurso = "iniciante" | "intermediario" | "avancado";
type StatusCurso = "nao_iniciado" | "em_andamento" | "concluido";

interface Aula {
  id: string;
  titulo: string;
  duracao: string; // "12 min"
  tipo: "video" | "leitura" | "quiz" | "pratica";
  concluida: boolean;
}

interface Modulo {
  id: string;
  titulo: string;
  aulas: Aula[];
}

interface Curso {
  id: string;
  titulo: string;
  descricao: string;
  instrutor: string;
  nivel: NivelCurso;
  duracao: string;
  aulas: number;
  status: StatusCurso;
  progresso: number; // 0-100
  gratuito: boolean;
  preco?: number;
  tags: string[];
  certificado: boolean;
  modulos: Modulo[];
  cor: string;
  icone: string;
}

interface Trilha {
  id: string;
  titulo: string;
  descricao: string;
  nivel: NivelCurso;
  cursos: string[]; // ids dos cursos
  duracaoTotal: string;
  certificado: string;
  cor: string;
  progresso: number;
}

interface Certificacao {
  id: string;
  titulo: string;
  emissor: string;
  dataEmissao: string;
  cursoId: string;
  codigo: string;
}

// ─── MOCK DATA ────────────────────────────────────────────────────────────────
const CURSOS: Curso[] = [
  {
    id: "c1",
    titulo: "Fundamentos da ABA — Do Básico ao Essencial",
    descricao: "Princípios científicos do comportamento, tríplice contingência, reforçamento e punição. Base obrigatória para qualquer analista do comportamento.",
    instrutor: "Dr. Felipe Mendes — BCBA-D",
    nivel: "iniciante",
    duracao: "4h 30min",
    aulas: 18,
    status: "concluido",
    progresso: 100,
    gratuito: true,
    tags: ["ABA", "Fundamentos", "Comportamento"],
    certificado: true,
    cor: "#1D9E75",
    icone: "🧠",
    modulos: [
      { id: "m1", titulo: "Análise do Comportamento Aplicada", aulas: [
        { id: "a1", titulo: "O que é ABA e por que funciona", duracao: "14min", tipo: "video",   concluida: true },
        { id: "a2", titulo: "Tríplice contingência (SD → R → SR)", duracao: "18min", tipo: "video",  concluida: true },
        { id: "a3", titulo: "Quiz: Fundamentos", duracao: "10min", tipo: "quiz",   concluida: true },
      ]},
      { id: "m2", titulo: "Reforçamento e Punição", aulas: [
        { id: "a4", titulo: "Tipos de reforçamento", duracao: "16min", tipo: "video",   concluida: true },
        { id: "a5", titulo: "Esquemas de reforçamento", duracao: "20min", tipo: "video",  concluida: true },
        { id: "a6", titulo: "Prática: identificando contingências", duracao: "25min", tipo: "pratica", concluida: true },
      ]},
    ],
  },
  {
    id: "c2",
    titulo: "Operantes Verbais — De Skinner à Prática Clínica",
    descricao: "Mando, tato, intraverbal, echoico e ouvinte. Como ensinar linguagem funcional baseada na análise do comportamento verbal de Skinner.",
    instrutor: "Dra. Ana Beatriz Costa — BCBA",
    nivel: "intermediario",
    duracao: "6h 15min",
    aulas: 24,
    status: "em_andamento",
    progresso: 58,
    gratuito: false,
    preco: 197,
    tags: ["Verbal Behavior", "Linguagem", "Mando", "Tato"],
    certificado: true,
    cor: "#378ADD",
    icone: "💬",
    modulos: [
      { id: "m1", titulo: "Comportamento Verbal de Skinner", aulas: [
        { id: "a1", titulo: "Verbal Behavior — bases teóricas", duracao: "22min", tipo: "video",   concluida: true  },
        { id: "a2", titulo: "Mando — o comportamento de pedir", duracao: "25min", tipo: "video",   concluida: true  },
        { id: "a3", titulo: "Tato — nomeando o mundo",          duracao: "20min", tipo: "video",   concluida: true  },
        { id: "a4", titulo: "Quiz: Operantes Verbais Básicos",  duracao: "12min", tipo: "quiz",    concluida: true  },
      ]},
      { id: "m2", titulo: "Intraverbal e Ouvinte", aulas: [
        { id: "a5", titulo: "Intraverbal — conversação funcional",duracao: "28min", tipo: "video",  concluida: false },
        { id: "a6", titulo: "Comportamento de ouvinte",           duracao: "18min", tipo: "video",  concluida: false },
        { id: "a7", titulo: "Leitura: artigos clássicos VB",      duracao: "30min", tipo: "leitura",concluida: false },
      ]},
    ],
  },
  {
    id: "c3",
    titulo: "Análise Funcional do Comportamento",
    descricao: "Como identificar a função de comportamentos desafiadores. Entrevista funcional, observação descritiva e análise funcional experimental.",
    instrutor: "Dr. Rafael Torres — PhD ABA",
    nivel: "avancado",
    duracao: "8h 00min",
    aulas: 30,
    status: "nao_iniciado",
    progresso: 0,
    gratuito: false,
    preco: 297,
    tags: ["Análise Funcional", "Comportamentos Desafiadores", "FBA"],
    certificado: true,
    cor: "#8B7FE8",
    icone: "🔍",
    modulos: [],
  },
  {
    id: "c4",
    titulo: "DTT — Discrete Trial Training na Prática",
    descricao: "Estrutura de tentativas, hierarquia de dicas, transferência de controle de estímulo e critérios de domínio. Tudo que você precisa para aplicar DTT com excelência.",
    instrutor: "Dra. Lucia Ferreira — BCBA",
    nivel: "intermediario",
    duracao: "5h 30min",
    aulas: 21,
    status: "nao_iniciado",
    progresso: 0,
    gratuito: false,
    preco: 197,
    tags: ["DTT", "Técnicas", "Sessão estruturada"],
    certificado: true,
    cor: "#EF9F27",
    icone: "⚡",
    modulos: [],
  },
  {
    id: "c5",
    titulo: "Equivalência de Estímulos e MTS",
    descricao: "Matching-to-sample, relações condicionais, simetria, transitividade e equivalência. Como construir programas de ensino por relações condicionais.",
    instrutor: "Dr. Marcos Aguiar — BCBA-D",
    nivel: "avancado",
    duracao: "7h 00min",
    aulas: 26,
    status: "nao_iniciado",
    progresso: 0,
    gratuito: false,
    preco: 247,
    tags: ["MTS", "Equivalência", "Controle Condicional"],
    certificado: true,
    cor: "#E05A4B",
    icone: "🔗",
    modulos: [],
  },
  {
    id: "c6",
    titulo: "NET — Ensino em Ambiente Natural",
    descricao: "Como estruturar sessões naturais, usar motivação intrínseca e ensinar em contextos do dia a dia. Integração entre DTT e NET.",
    instrutor: "Dra. Camila Rocha — BCBA",
    nivel: "intermediario",
    duracao: "4h 45min",
    aulas: 19,
    status: "nao_iniciado",
    progresso: 0,
    gratuito: true,
    tags: ["NET", "Ambiente Natural", "Motivação"],
    certificado: false,
    cor: "#23c48f",
    icone: "🌿",
    modulos: [],
  },
];

const TRILHAS: Trilha[] = [
  {
    id: "t1",
    titulo: "Formação em ABA Aplicada ao TEA",
    descricao: "Trilha completa para terapeutas que desejam dominar a aplicação da ABA para crianças com TEA. Do básico ao avançado, com foco em prática clínica.",
    nivel: "iniciante",
    cursos: ["c1","c2","c4","c3"],
    duracaoTotal: "24h 15min",
    certificado: "Analista do Comportamento — Nível Pleno",
    cor: "#1D9E75",
    progresso: 35,
  },
  {
    id: "t2",
    titulo: "Especialização em Comportamento Verbal",
    descricao: "Aprofundamento em análise do comportamento verbal. Operantes, intraverbal avançado, equivalência de estímulos e molduras relacionais.",
    nivel: "avancado",
    cursos: ["c2","c5","c3"],
    duracaoTotal: "21h 15min",
    certificado: "Especialista em Verbal Behavior",
    cor: "#8B7FE8",
    progresso: 19,
  },
  {
    id: "t3",
    titulo: "Técnicas de Ensino Estruturado e Natural",
    descricao: "Combinação estratégica de DTT e NET. Como alternar entre ambientes estruturados e naturais para maximizar generalização.",
    nivel: "intermediario",
    cursos: ["c4","c6","c2"],
    duracaoTotal: "16h 15min",
    certificado: "Técnicas Integradas de Ensino ABA",
    cor: "#EF9F27",
    progresso: 0,
  },
];

const CERTIFICACOES: Certificacao[] = [
  {
    id: "cert1",
    titulo: "Fundamentos da ABA",
    emissor: "Fracta Academy",
    dataEmissao: "15 Mar 2025",
    cursoId: "c1",
    codigo: "FRACTA-ABA-2025-0847",
  },
];

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const NIVEL_CONFIG: Record<NivelCurso, { label: string; cor: string; bg: string }> = {
  iniciante:     { label: "Iniciante",     cor: "#1D9E75", bg: "rgba(29,158,117,.1)"  },
  intermediario: { label: "Intermediário", cor: "#EF9F27", bg: "rgba(239,159,39,.1)"  },
  avancado:      { label: "Avançado",      cor: "#E05A4B", bg: "rgba(224,90,75,.1)"   },
};

const STATUS_CONFIG: Record<StatusCurso, { label: string; cor: string }> = {
  nao_iniciado: { label: "Não iniciado", cor: "rgba(170,210,245,.88)" },
  em_andamento: { label: "Em andamento", cor: "#EF9F27"              },
  concluido:    { label: "Concluído",    cor: "#1D9E75"              },
};

const TIPO_AULA: Record<string, { icon: string; cor: string }> = {
  video:   { icon: "▶", cor: "#378ADD" },
  leitura: { icon: "📖", cor: "#8B7FE8" },
  quiz:    { icon: "❓", cor: "#EF9F27" },
  pratica: { icon: "⚡", cor: "#1D9E75" },
};

// ─── PAGE ────────────────────────────────────────────────────────────────────
export default function EducationPage() {
  const { terapeuta } = useClinicContext();
  const nivel = terapeuta?.nivel ?? "coordenador";

  const [tab,        setTab]        = useState<TabEdu>("trilhas");
  const [cursoAberto,setCursoAberto]= useState<Curso | null>(null);
  const [filtroNivel,setFiltroNivel]= useState<NivelCurso | "todos">("todos");

  const stats = useMemo(() => ({
    cursosFeitos:    CURSOS.filter(c => c.status === "concluido").length,
    horasEstudadas:  12.5,
    certificados:    CERTIFICACOES.length,
    emAndamento:     CURSOS.filter(c => c.status === "em_andamento").length,
  }), []);

  const cursosFiltrados = useMemo(() =>
    filtroNivel === "todos" ? CURSOS : CURSOS.filter(c => c.nivel === filtroNivel),
  [filtroNivel]);

  // ── CSS ────────────────────────────────────────────────────────────────────
  const card: React.CSSProperties = { background: "rgba(13,32,53,.75)", border: "1px solid rgba(70,120,180,.5)", borderRadius: 14, backdropFilter: "blur(8px)" };
  const lbl: React.CSSProperties  = { fontSize: ".6rem", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: ".09em", color: "rgba(170,210,245,.88)", marginBottom: 8 };

  const TABS = [
    { id: "trilhas"         as TabEdu, label: "Trilhas"       },
    { id: "cursos"          as TabEdu, label: "Cursos"        },
    { id: "certificacoes"   as TabEdu, label: "Certificações" },
    { id: "meu-progresso"   as TabEdu, label: "Meu progresso" },
  ];

  // ── Modal do curso ─────────────────────────────────────────────────────────
  if (cursoAberto) {
    const c = cursoAberto;
    const nc = NIVEL_CONFIG[c.nivel];
    const sc = STATUS_CONFIG[c.status];
    const totalAulas   = c.modulos.reduce((a, m) => a + m.aulas.length, 0);
    const aulasConcl   = c.modulos.reduce((a, m) => a + m.aulas.filter(au => au.concluida).length, 0);
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <button onClick={() => setCursoAberto(null)} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: "rgba(160,200,235,.90)", cursor: "pointer", fontFamily: "var(--font-sans)", fontSize: ".78rem", padding: 0, alignSelf: "flex-start" }}>
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 3L5 8l5 5"/></svg>
          Voltar
        </button>

        <div style={{ ...card, padding: 24 }}>
          <div style={{ display: "flex", gap: 16, alignItems: "flex-start", marginBottom: 16 }}>
            <div style={{ fontSize: 36, flexShrink: 0 }}>{c.icone}</div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                <h1 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#e8f0f8", margin: 0 }}>{c.titulo}</h1>
                <span style={{ fontSize: ".62rem", color: nc.cor, background: nc.bg, borderRadius: 20, padding: "2px 8px", fontWeight: 600 }}>{nc.label}</span>
                {c.gratuito ? <span style={{ fontSize: ".62rem", color: "#1D9E75", background: "rgba(29,158,117,.1)", borderRadius: 20, padding: "2px 8px", fontWeight: 600 }}>Gratuito</span>
                : <span style={{ fontSize: ".62rem", color: "#EF9F27", background: "rgba(239,159,39,.1)", borderRadius: 20, padding: "2px 8px", fontWeight: 600 }}>R$ {c.preco}</span>}
              </div>
              <div style={{ fontSize: ".78rem", color: "rgba(160,200,235,.90)", lineHeight: 1.6, marginBottom: 8 }}>{c.descricao}</div>
              <div style={{ fontSize: ".72rem", color: "rgba(170,210,245,.88)" }}>{c.instrutor} · {c.duracao} · {c.aulas} aulas</div>
            </div>
          </div>

          <div style={{ height: 6, background: "rgba(26,58,92,.5)", borderRadius: 3, overflow: "hidden", marginBottom: 8 }}>
            <div style={{ height: "100%", width: `${c.progresso}%`, background: c.progresso === 100 ? "#1D9E75" : c.cor, transition: "width .5s" }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
            <span style={{ fontSize: ".68rem", color: "rgba(170,210,245,.88)" }}>{aulasConcl}/{totalAulas} aulas concluídas</span>
            <span style={{ fontSize: ".68rem", color: sc.cor, fontWeight: 600 }}>{sc.label}</span>
          </div>

          {c.modulos.length > 0 ? (
            c.modulos.map(mod => (
              <div key={mod.id} style={{ marginBottom: 16 }}>
                <div style={{ ...lbl, marginBottom: 10 }}>{mod.titulo}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {mod.aulas.map(aula => {
                    const ta = TIPO_AULA[aula.tipo];
                    return (
                      <div key={aula.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: aula.concluida ? "rgba(29,158,117,.06)" : "rgba(26,58,92,.2)", borderRadius: 9, border: `1px solid ${aula.concluida ? "rgba(29,158,117,.2)" : "rgba(26,58,92,.4)"}` }}>
                        <div style={{ width: 28, height: 28, borderRadius: "50%", background: aula.concluida ? "rgba(29,158,117,.15)" : "rgba(26,58,92,.4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".75rem", flexShrink: 0 }}>
                          {aula.concluida ? "✓" : ta.icon}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: ".82rem", color: aula.concluida ? "rgba(160,200,235,.90)" : "#e8f0f8", fontWeight: 500, textDecoration: aula.concluida ? "line-through" : "none" }}>{aula.titulo}</div>
                          <div style={{ fontSize: ".65rem", color: "rgba(165,208,242,.85)", marginTop: 2 }}>{aula.tipo} · {aula.duracao}</div>
                        </div>
                        {!aula.concluida && (
                          <button style={{ padding: "5px 12px", borderRadius: 7, border: "none", background: c.cor, color: "#07111f", fontFamily: "var(--font-sans)", fontWeight: 700, fontSize: ".7rem", cursor: "pointer" }}>
                            Iniciar
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          ) : (
            <div style={{ padding: "24px 0", textAlign: "center", color: "rgba(170,210,245,.88)", fontSize: ".82rem" }}>
              {c.status === "nao_iniciado" ? "Inicie o curso para ver o conteúdo" : "Conteúdo carregando..."}
            </div>
          )}

          {c.status !== "concluido" && (
            <button style={{ width: "100%", marginTop: 8, padding: 14, borderRadius: 10, border: "none", background: `linear-gradient(135deg,${c.cor},${c.cor}99)`, color: "#07111f", fontFamily: "var(--font-sans)", fontWeight: 800, fontSize: ".9rem", cursor: "pointer" }}>
              {c.status === "nao_iniciado" ? (c.gratuito ? "Iniciar gratuitamente →" : `Adquirir por R$ ${c.preco} →`) : "Continuar curso →"}
            </button>
          )}
          {c.status === "concluido" && c.certificado && (
            <div style={{ marginTop: 8, padding: "12px 16px", background: "rgba(29,158,117,.08)", border: "1px solid rgba(29,158,117,.2)", borderRadius: 10, display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 20 }}>🏆</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: ".78rem", fontWeight: 600, color: "#1D9E75" }}>Certificado emitido</div>
                <div style={{ fontSize: ".68rem", color: "rgba(160,200,235,.84)" }}>Adicionado automaticamente ao seu perfil</div>
              </div>
              <Link href="/clinic/terapeuta" style={{ padding: "5px 12px", borderRadius: 7, border: "1px solid rgba(29,158,117,.3)", background: "transparent", color: "#1D9E75", fontFamily: "var(--font-sans)", fontWeight: 600, fontSize: ".72rem", textDecoration: "none" }}>Ver perfil →</Link>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* ── HEADER ── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <h1 style={{ fontSize: "1.2rem", fontWeight: 800, color: "#e8f0f8", margin: 0 }}>Fracta Academy</h1>
            <span style={{ fontSize: ".65rem", color: "#8B7FE8", background: "rgba(139,127,232,.1)", border: "1px solid rgba(139,127,232,.2)", borderRadius: 20, padding: "2px 8px", fontWeight: 600 }}>Beta</span>
          </div>
          <div style={{ fontSize: ".75rem", color: "rgba(160,200,235,.84)" }}>Formação contínua em ABA · Certificações que vão direto ao seu perfil</div>
        </div>
      </div>

      {/* ── KPIs ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 10 }}>
        {[
          { l: "Cursos concluídos", v: stats.cursosFeitos,                       c: "#1D9E75" },
          { l: "Em andamento",      v: stats.emAndamento,                         c: "#EF9F27" },
          { l: "Horas estudadas",   v: `${stats.horasEstudadas}h`,                c: "#378ADD" },
          { l: "Certificados",      v: stats.certificados,                        c: "#8B7FE8" },
        ].map(k => (
          <div key={k.l} style={{ ...card, padding: "14px 16px" }}>
            <div style={{ fontSize: ".58rem", color: "rgba(170,210,245,.88)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 6 }}>{k.l}</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 800, color: k.c, letterSpacing: "-.02em" }}>{k.v}</div>
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
      {/* TAB: TRILHAS */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      {tab === "trilhas" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {TRILHAS.map(t => {
            const nc   = NIVEL_CONFIG[t.nivel];
            const cursosDaTrilha = CURSOS.filter(c => t.cursos.includes(c.id));
            const concluidos = cursosDaTrilha.filter(c => c.status === "concluido").length;
            return (
              <div key={t.id} style={{ ...card, padding: 22, borderLeft: `3px solid ${t.cor}` }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <span style={{ fontSize: ".95rem", fontWeight: 700, color: "#e8f0f8" }}>{t.titulo}</span>
                      <span style={{ fontSize: ".62rem", color: nc.cor, background: nc.bg, borderRadius: 20, padding: "2px 8px", fontWeight: 600 }}>{nc.label}</span>
                    </div>
                    <div style={{ fontSize: ".78rem", color: "rgba(160,200,235,.90)", lineHeight: 1.6, marginBottom: 8 }}>{t.descricao}</div>
                    <div style={{ fontSize: ".72rem", color: "rgba(170,210,245,.88)" }}>
                      {t.cursos.length} cursos · {t.duracaoTotal} · 🏆 {t.certificado}
                    </div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontSize: "1.3rem", fontWeight: 800, color: t.cor }}>{t.progresso}%</div>
                    <div style={{ fontSize: ".65rem", color: "rgba(170,210,245,.88)" }}>{concluidos}/{t.cursos.length} cursos</div>
                  </div>
                </div>

                <div style={{ height: 5, background: "rgba(26,58,92,.5)", borderRadius: 3, overflow: "hidden", marginBottom: 14 }}>
                  <div style={{ height: "100%", width: `${t.progresso}%`, background: t.cor, transition: "width .5s" }} />
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {cursosDaTrilha.map((c, i) => (
                    <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 10px", background: c.status === "concluido" ? "rgba(29,158,117,.1)" : c.status === "em_andamento" ? "rgba(239,159,39,.08)" : "rgba(26,58,92,.3)", border: `1px solid ${c.status === "concluido" ? "rgba(29,158,117,.25)" : c.status === "em_andamento" ? "rgba(239,159,39,.2)" : "rgba(26,58,92,.5)"}`, borderRadius: 8 }}>
                      <span style={{ fontSize: ".65rem", color: "rgba(170,210,245,.88)" }}>{i + 1}</span>
                      <span style={{ fontSize: ".72rem", color: c.status === "concluido" ? "#1D9E75" : c.status === "em_andamento" ? "#EF9F27" : "rgba(160,200,235,.90)", fontWeight: 500 }}>{c.titulo.split("—")[0].trim()}</span>
                      {c.status === "concluido" && <span style={{ fontSize: ".62rem", color: "#1D9E75" }}>✓</span>}
                    </div>
                  ))}
                </div>

                <button onClick={() => setTab("cursos")} style={{ marginTop: 14, padding: "9px 18px", borderRadius: 9, border: `1px solid ${t.cor}44`, background: `${t.cor}11`, color: t.cor, fontFamily: "var(--font-sans)", fontWeight: 600, fontSize: ".78rem", cursor: "pointer" }}>
                  {t.progresso > 0 ? "Continuar trilha →" : "Iniciar trilha →"}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* TAB: CURSOS */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      {tab === "cursos" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          {/* Filtros */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {(["todos","iniciante","intermediario","avancado"] as const).map(f => {
              const cfg = f === "todos" ? { label: "Todos", cor: "rgba(160,200,235,.90)", bg: "transparent" } : NIVEL_CONFIG[f];
              return (
                <button key={f} onClick={() => setFiltroNivel(f)} style={{
                  padding: "6px 14px", borderRadius: 20,
                  border: `1px solid ${filtroNivel === f ? cfg.cor : "rgba(26,58,92,.4)"}`,
                  background: filtroNivel === f ? (f === "todos" ? "rgba(26,58,92,.3)" : cfg.bg) : "transparent",
                  color: filtroNivel === f ? cfg.cor : "rgba(170,210,245,.88)",
                  fontFamily: "var(--font-sans)", fontSize: ".75rem", fontWeight: filtroNivel === f ? 600 : 400, cursor: "pointer",
                }}>{cfg.label}</button>
              );
            })}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(320px,1fr))", gap: 14 }}>
            {cursosFiltrados.map(c => {
              const nc = NIVEL_CONFIG[c.nivel];
              const sc = STATUS_CONFIG[c.status];
              return (
                <div key={c.id} style={{ ...card, display: "flex", flexDirection: "column", border: `1px solid ${c.status === "concluido" ? "rgba(29,158,117,.25)" : "rgba(26,58,92,.5)"}` }}>
                  <div style={{ height: 4, background: c.cor, borderRadius: "14px 14px 0 0" }} />
                  <div style={{ padding: 18, flex: 1, display: "flex", flexDirection: "column" }}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>
                      <span style={{ fontSize: 24, flexShrink: 0 }}>{c.icone}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: ".85rem", fontWeight: 700, color: "#e8f0f8", marginBottom: 4, lineHeight: 1.3 }}>{c.titulo}</div>
                        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                          <span style={{ fontSize: ".6rem", color: nc.cor, background: nc.bg, borderRadius: 20, padding: "1px 7px", fontWeight: 600 }}>{nc.label}</span>
                          {c.gratuito ? <span style={{ fontSize: ".6rem", color: "#1D9E75", background: "rgba(29,158,117,.1)", borderRadius: 20, padding: "1px 7px", fontWeight: 600 }}>Gratuito</span>
                          : <span style={{ fontSize: ".6rem", color: "#EF9F27", background: "rgba(239,159,39,.1)", borderRadius: 20, padding: "1px 7px", fontWeight: 600 }}>R$ {c.preco}</span>}
                          {c.certificado && <span style={{ fontSize: ".6rem", color: "#8B7FE8", background: "rgba(139,127,232,.1)", borderRadius: 20, padding: "1px 7px" }}>🏆 Certificado</span>}
                        </div>
                      </div>
                    </div>

                    <div style={{ fontSize: ".75rem", color: "rgba(160,200,235,.90)", lineHeight: 1.55, marginBottom: 10, flex: 1 }}>{c.descricao.slice(0, 100)}...</div>

                    <div style={{ fontSize: ".68rem", color: "rgba(170,210,245,.88)", marginBottom: 10 }}>{c.instrutor.split("—")[0].trim()} · {c.duracao} · {c.aulas} aulas</div>

                    {c.status !== "nao_iniciado" && (
                      <>
                        <div style={{ height: 4, background: "rgba(26,58,92,.5)", borderRadius: 2, overflow: "hidden", marginBottom: 5 }}>
                          <div style={{ height: "100%", width: `${c.progresso}%`, background: c.progresso === 100 ? "#1D9E75" : c.cor }} />
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                          <span style={{ fontSize: ".65rem", color: sc.cor, fontWeight: 600 }}>{sc.label}</span>
                          <span style={{ fontSize: ".65rem", color: "rgba(170,210,245,.88)", fontFamily: "monospace" }}>{c.progresso}%</span>
                        </div>
                      </>
                    )}

                    <button onClick={() => setCursoAberto(c)} style={{
                      padding: "9px", borderRadius: 8, border: "none",
                      background: c.status === "concluido" ? "rgba(29,158,117,.15)" : c.status === "em_andamento" ? `${c.cor}22` : c.gratuito ? "rgba(29,158,117,.15)" : `${c.cor}22`,
                      color: c.status === "concluido" ? "#1D9E75" : c.cor,
                      fontFamily: "var(--font-sans)", fontWeight: 700, fontSize: ".78rem", cursor: "pointer",
                    }}>
                      {c.status === "concluido" ? "✓ Concluído — Ver conteúdo" : c.status === "em_andamento" ? "Continuar →" : c.gratuito ? "Iniciar gratuitamente →" : `Ver curso · R$ ${c.preco}`}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* TAB: CERTIFICAÇÕES */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      {tab === "certificacoes" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {CERTIFICACOES.length === 0 ? (
            <div style={{ ...card, padding: 40, textAlign: "center" }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>🏆</div>
              <div style={{ fontSize: ".88rem", color: "rgba(160,200,235,.90)", marginBottom: 8 }}>Nenhum certificado ainda</div>
              <div style={{ fontSize: ".75rem", color: "rgba(170,210,245,.88)", marginBottom: 20 }}>Complete cursos com certificado para vê-los aqui e no seu perfil</div>
              <button onClick={() => setTab("cursos")} style={{ padding: "9px 20px", borderRadius: 9, border: "none", background: "linear-gradient(135deg,#1D9E75,#0f8f7a)", color: "#07111f", fontFamily: "var(--font-sans)", fontWeight: 700, fontSize: ".82rem", cursor: "pointer" }}>Ver cursos disponíveis</button>
            </div>
          ) : CERTIFICACOES.map(cert => {
            const curso = CURSOS.find(c => c.id === cert.cursoId);
            return (
              <div key={cert.id} style={{ ...card, padding: 22, border: "1px solid rgba(29,158,117,.2)", background: "rgba(29,158,117,.04)" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
                  <div style={{ fontSize: 40, flexShrink: 0 }}>🏆</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: ".95rem", fontWeight: 700, color: "#e8f0f8", marginBottom: 4 }}>{cert.titulo}</div>
                    <div style={{ fontSize: ".78rem", color: "rgba(160,200,235,.90)", marginBottom: 2 }}>Emitido por {cert.emissor} · {cert.dataEmissao}</div>
                    <div style={{ fontSize: ".68rem", color: "rgba(165,208,242,.85)", fontFamily: "monospace", marginBottom: 12 }}>Código: {cert.codigo}</div>
                    {curso && <div style={{ fontSize: ".72rem", color: "rgba(160,200,235,.84)" }}>Curso: {curso.titulo}</div>}
                  </div>
                  <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                    <button style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid rgba(29,158,117,.3)", background: "rgba(29,158,117,.08)", color: "#1D9E75", fontFamily: "var(--font-sans)", fontWeight: 600, fontSize: ".72rem", cursor: "pointer" }}>
                      Baixar PDF
                    </button>
                    <Link href="/clinic/terapeuta" style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid rgba(55,138,221,.3)", background: "rgba(55,138,221,.08)", color: "#378ADD", fontFamily: "var(--font-sans)", fontWeight: 600, fontSize: ".72rem", textDecoration: "none" }}>
                      Ver no perfil
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Cursos com certificado ainda não concluídos */}
          <div style={{ ...card, padding: 20 }}>
            <div style={{ ...lbl }}>Certificados disponíveis para conquistar</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {CURSOS.filter(c => c.certificado && c.status !== "concluido").map(c => (
                <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "rgba(26,58,92,.2)", borderRadius: 9 }}>
                  <span style={{ fontSize: ".75rem" }}>🔒</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: ".78rem", fontWeight: 500, color: "rgba(175,210,240,.95)" }}>{c.titulo}</div>
                    <div style={{ fontSize: ".65rem", color: "rgba(165,208,242,.85)" }}>{c.status === "em_andamento" ? `${c.progresso}% concluído` : "Não iniciado"}</div>
                  </div>
                  <button onClick={() => { setTab("cursos"); setCursoAberto(c); }} style={{ padding: "4px 10px", borderRadius: 6, border: `1px solid ${c.cor}44`, background: `${c.cor}11`, color: c.cor, fontFamily: "var(--font-sans)", fontWeight: 600, fontSize: ".68rem", cursor: "pointer" }}>
                    {c.status === "em_andamento" ? "Continuar" : "Iniciar"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* TAB: MEU PROGRESSO */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      {tab === "meu-progresso" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          {/* Nível atual */}
          <div style={{ ...card, padding: 20, border: "1px solid rgba(139,127,232,.2)", background: "rgba(139,127,232,.04)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ fontSize: 40 }}>🎓</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: ".7rem", color: "rgba(170,210,245,.88)", marginBottom: 4 }}>Nível acadêmico atual</div>
                <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#8B7FE8" }}>Analista em Formação</div>
                <div style={{ fontSize: ".72rem", color: "rgba(160,200,235,.84)", marginTop: 2 }}>Complete mais 3 cursos para avançar para Analista Pleno</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "#8B7FE8" }}>35%</div>
                <div style={{ fontSize: ".62rem", color: "rgba(170,210,245,.88)" }}>da trilha principal</div>
              </div>
            </div>
            <div style={{ marginTop: 12, height: 6, background: "rgba(26,58,92,.5)", borderRadius: 3, overflow: "hidden" }}>
              <div style={{ height: "100%", width: "35%", background: "#8B7FE8" }} />
            </div>
          </div>

          {/* Progresso por curso */}
          <div style={{ ...card, padding: 20 }}>
            <div style={{ ...lbl }}>Progresso por curso</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {CURSOS.filter(c => c.status !== "nao_iniciado").map(c => (
                <div key={c.id}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: ".78rem", color: "#e8f0f8" }}>{c.titulo.split("—")[0].trim()}</span>
                    <span style={{ fontSize: ".72rem", color: c.progresso === 100 ? "#1D9E75" : "#EF9F27", fontWeight: 600 }}>{c.progresso}%</span>
                  </div>
                  <div style={{ height: 5, background: "rgba(26,58,92,.5)", borderRadius: 2, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${c.progresso}%`, background: c.progresso === 100 ? "#1D9E75" : c.cor, transition: "width .5s" }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Próximos passos */}
          <div style={{ ...card, padding: 20 }}>
            <div style={{ ...lbl }}>Próximos passos recomendados</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                { txt: "Continuar Operantes Verbais — 42% restante", acao: "Continuar", cor: "#378ADD", cursoId: "c2" },
                { txt: "Iniciar DTT na Prática para avançar na trilha", acao: "Iniciar", cor: "#EF9F27", cursoId: "c4" },
                { txt: "Solicitar supervisão após concluir Análise Funcional", acao: "Supervisão", cor: "#8B7FE8", cursoId: null },
              ].map((p, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "rgba(26,58,92,.2)", borderRadius: 9 }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: p.cor, flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: ".78rem", color: "rgba(160,200,235,.92)" }}>{p.txt}</span>
                  <button onClick={() => p.cursoId ? setCursoAberto(CURSOS.find(c => c.id === p.cursoId)!) : undefined} style={{ padding: "4px 10px", borderRadius: 6, border: `1px solid ${p.cor}44`, background: `${p.cor}11`, color: p.cor, fontFamily: "var(--font-sans)", fontWeight: 600, fontSize: ".7rem", cursor: "pointer" }}>{p.acao}</button>
                </div>
              ))}
            </div>
          </div>

          {/* Conexão com supervisão */}
          <div style={{ ...card, padding: 18, border: "1px solid rgba(139,127,232,.2)", background: "rgba(139,127,232,.04)", display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ fontSize: 28 }}>👨‍🏫</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: ".82rem", fontWeight: 600, color: "#e8f0f8", marginBottom: 4 }}>Supervisão clínica</div>
              <div style={{ fontSize: ".75rem", color: "rgba(160,200,235,.90)" }}>Combine sua formação teórica com revisão de casos reais por supervisores BCBA</div>
            </div>
            <Link href="/clinic/supervisao" style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "linear-gradient(135deg,#8B7FE8,#378ADD)", color: "#fff", fontFamily: "var(--font-sans)", fontWeight: 700, fontSize: ".78rem", textDecoration: "none" }}>
              Ver supervisão →
            </Link>
          </div>
        </div>
      )}

    </div>
  );
}
