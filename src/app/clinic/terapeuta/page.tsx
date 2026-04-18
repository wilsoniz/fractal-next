"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useClinicContext } from "../layout";

// ─── TIPOS ───────────────────────────────────────────────────────────────────
type TabPerfil = "vitrine" | "formacao" | "disponibilidade" | "avaliacoes" | "configuracoes";
type Nivel     = "terapeuta" | "coordenador" | "supervisor";

interface Certificacao {
  id: string;
  titulo: string;
  instituicao: string;
  ano: number;
  tipo: "graduacao" | "especializacao" | "certificacao" | "curso";
  verificada: boolean;
  url?: string;
}

interface Avaliacao {
  id: string;
  familiaNome: string;
  pacienteIniciais: string;
  nota: number; // 1-5
  comentario: string;
  data: string;
  verificada: boolean;
}

interface DisponibilidadeSlot {
  dia: number; // 0=dom
  turno: "manha" | "tarde" | "noite";
  disponivel: boolean;
}

interface PerfilData {
  nome: string;
  sobrenome: string;
  iniciais: string;
  titulo: string;
  nivel: Nivel;
  anosExperiencia: number;
  cidade: string;
  estado: string;
  bio: string;
  especialidades: string[];
  abordagens: string[];
  modalidades: ("presencial" | "domiciliar" | "teleconsulta")[];
  valorSessao: number;
  aceitaPlano: boolean;
  planosAceitos: string[];
  certificacoes: Certificacao[];
  avaliacoes: Avaliacao[];
  disponibilidade: DisponibilidadeSlot[];
  pacientesAtivos: number;
  sessoesTotais: number;
  taxaSucesso: number;
  tempoResposta: string;
  visivel: boolean; // visível no FractaCare
  destaque: boolean;
}

// ─── MOCK ─────────────────────────────────────────────────────────────────────
const PERFIL_INICIAL: PerfilData = {
  nome: "Carolina", sobrenome: "Amaral", iniciais: "CA",
  titulo: "Analista do Comportamento · BCBA",
  nivel: "supervisor",
  anosExperiencia: 8,
  cidade: "São Paulo", estado: "SP",
  bio: "Especialista em intervenção comportamental intensiva para crianças com TEA e TDAH. Formada em Psicologia pela USP com especialização em ABA pelo IBAC. Mais de 8 anos de experiência com crianças de 2 a 12 anos, com foco em comunicação funcional, habilidades sociais e redução de comportamentos desafiadores.\n\nTrabalho com abordagem baseada em evidências, integrando DTT, NET e Análise Funcional para construir programas personalizados que respeitam o ritmo e as necessidades de cada aprendiz.",
  especialidades: ["TEA", "TDAH", "Comunicação funcional", "Comportamentos desafiadores", "Habilidades sociais"],
  abordagens: ["DTT", "NET", "Análise Funcional", "Equivalência de Estímulos", "PRT"],
  modalidades: ["presencial", "domiciliar", "teleconsulta"],
  valorSessao: 280,
  aceitaPlano: true,
  planosAceitos: ["Unimed", "Amil", "SulAmérica"],
  certificacoes: [
    { id: "c1", titulo: "BCBA — Board Certified Behavior Analyst", instituicao: "BACB", ano: 2019, tipo: "certificacao", verificada: true, url: "https://bacb.com" },
    { id: "c2", titulo: "Especialização em ABA Aplicada ao TEA", instituicao: "IBAC", ano: 2018, tipo: "especializacao", verificada: true },
    { id: "c3", titulo: "Graduação em Psicologia", instituicao: "Universidade de São Paulo (USP)", ano: 2016, tipo: "graduacao", verificada: true },
    { id: "c4", titulo: "Verbal Behavior Approach — AVBA", instituicao: "VB-MAPP Institute", ano: 2020, tipo: "curso", verificada: true },
    { id: "c5", titulo: "Análise Funcional Avançada", instituicao: "ABPMC", ano: 2022, tipo: "curso", verificada: false },
  ],
  avaliacoes: [
    { id: "a1", familiaNome: "Família Carvalho", pacienteIniciais: "LC", nota: 5, comentario: "A Dra. Carolina transformou a vida do nosso filho. Em 8 meses Lucas passou a se comunicar de forma funcional. Profissional incrível, muito dedicada e sempre disponível para tirar dúvidas.", data: "Mar 2025", verificada: true },
    { id: "a2", familiaNome: "Família Gomes", pacienteIniciais: "PG", nota: 5, comentario: "Profissional excepcional. O Pedro evoluiu muito além do que esperávamos. Os relatórios são detalhados e ela sempre explica tudo de forma clara para os pais.", data: "Fev 2025", verificada: true },
    { id: "a3", familiaNome: "Família Pinto", pacienteIniciais: "RP", nota: 5, comentario: "Excelente terapeuta. Muito comprometida e os resultados falam por si. Rafael adorava as sessões.", data: "Jan 2025", verificada: true },
    { id: "a4", familiaNome: "Família Santos", pacienteIniciais: "MS", nota: 4, comentario: "Muito boa profissional, cuidadosa e atenciosa. Às vezes demora um pouco para responder mensagens, mas o trabalho é de altíssima qualidade.", data: "Abr 2025", verificada: true },
  ],
  disponibilidade: [
    ...([1,2,3,4,5] as number[]).flatMap(dia =>
      (["manha","tarde","noite"] as const).map(turno => ({
        dia, turno, disponivel: turno !== "noite" && !(dia === 5 && turno === "tarde"),
      }))
    ),
    ...([0,6] as number[]).flatMap(dia =>
      (["manha","tarde","noite"] as const).map(turno => ({
        dia, turno, disponivel: false,
      }))
    ),
  ],
  pacientesAtivos: 5,
  sessoesTotais: 847,
  taxaSucesso: 89,
  tempoResposta: "< 2 horas",
  visivel: true,
  destaque: true,
};

// ─── CONSTANTES ──────────────────────────────────────────────────────────────
const NIVEL_CONFIG: Record<Nivel, { label: string; cor: string; bg: string }> = {
  terapeuta:   { label: "Terapeuta / RBT",  cor: "#1D9E75", bg: "rgba(29,158,117,.1)"  },
  coordenador: { label: "Coordenador ABA",  cor: "#EF9F27", bg: "rgba(239,159,39,.1)"  },
  supervisor:  { label: "Supervisor / BCBA",cor: "#8B7FE8", bg: "rgba(139,127,232,.1)" },
};

const TIPO_CERT_CONFIG = {
  graduacao:       { label: "Graduação",       cor: "#378ADD", icon: "🎓" },
  especializacao:  { label: "Especialização",  cor: "#8B7FE8", icon: "📚" },
  certificacao:    { label: "Certificação",    cor: "#1D9E75", icon: "🏆" },
  curso:           { label: "Curso",           cor: "#EF9F27", icon: "📋" },
};

const DIAS_LABEL = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];
const TURNOS_LABEL = { manha: "Manhã (8–12h)", tarde: "Tarde (13–18h)", noite: "Noite (18–21h)" };

function Stars({ nota, size = 14 }: { nota: number; size?: number }) {
  return (
    <div style={{ display: "flex", gap: 2 }}>
      {[1,2,3,4,5].map(i => (
        <svg key={i} width={size} height={size} viewBox="0 0 16 16" fill={i <= nota ? "#EF9F27" : "rgba(138,168,200,.2)"}>
          <path d="M8 1l1.9 3.8 4.2.6-3 3 .7 4.2L8 11l-3.8 2 .7-4.2-3-3 4.2-.6z"/>
        </svg>
      ))}
    </div>
  );
}

// ─── PAGE ────────────────────────────────────────────────────────────────────
export default function TerapeutaPerfilPage() {
  const { terapeuta: terapeutaCtx } = useClinicContext();
  const nivelCtx = terapeutaCtx?.nivel ?? "supervisor";

  const [tab,     setTab]     = useState<TabPerfil>("vitrine");
  const [perfil,  setPerfil]  = useState<PerfilData>(PERFIL_INICIAL);
  const [editBio, setEditBio] = useState(false);
  const [bioDraft,setBioDraft]= useState(perfil.bio);
  const [salvando,setSalvando]= useState(false);

  const notaMedia = useMemo(() => {
    if (!perfil.avaliacoes.length) return 0;
    return Math.round((perfil.avaliacoes.reduce((a, av) => a + av.nota, 0) / perfil.avaliacoes.length) * 10) / 10;
  }, [perfil.avaliacoes]);

  function salvarBio() {
    setSalvando(true);
    setTimeout(() => { setPerfil(p => ({ ...p, bio: bioDraft })); setEditBio(false); setSalvando(false); }, 800);
  }

  function toggleDisponibilidade(dia: number, turno: "manha" | "tarde" | "noite") {
    setPerfil(p => ({
      ...p,
      disponibilidade: p.disponibilidade.map(s =>
        s.dia === dia && s.turno === turno ? { ...s, disponivel: !s.disponivel } : s
      ),
    }));
  }

  const nc = NIVEL_CONFIG[perfil.nivel];

  // ── CSS ────────────────────────────────────────────────────────────────────
  const card: React.CSSProperties = { background: "rgba(13,32,53,.75)", border: "1px solid rgba(70,120,180,.5)", borderRadius: 14, backdropFilter: "blur(8px)" };
  const inp: React.CSSProperties  = { background: "rgba(20,55,110,.55)", border: "1px solid rgba(26,58,92,.6)", borderRadius: 8, padding: "9px 12px", color: "#e8f0f8", fontFamily: "var(--font-sans)", fontSize: ".82rem", outline: "none", width: "100%", boxSizing: "border-box" as const };
  const lbl: React.CSSProperties  = { fontSize: ".6rem", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: ".09em", color: "rgba(170,210,245,.88)", marginBottom: 8 };

  const TABS: { id: TabPerfil; label: string }[] = [
    { id: "vitrine",          label: "Vitrine"        },
    { id: "formacao",         label: "Formação"       },
    { id: "disponibilidade",  label: "Disponibilidade"},
    { id: "avaliacoes",       label: `Avaliações (${perfil.avaliacoes.length})` },
    { id: "configuracoes",    label: "Configurações"  },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* ── HEADER CARD ── */}
      <div style={{ ...card, padding: 24, border: perfil.destaque ? "1px solid rgba(139,127,232,.3)" : "1px solid rgba(26,58,92,.5)" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 18, flexWrap: "wrap" }}>

          {/* Avatar */}
          <div style={{ position: "relative", flexShrink: 0 }}>
            <div style={{ width: 72, height: 72, borderRadius: "50%", background: "linear-gradient(135deg,#1D9E75,#378ADD)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem", fontWeight: 800, color: "#fff" }}>
              {perfil.iniciais}
            </div>
            {perfil.visivel && (
              <div style={{ position: "absolute", bottom: 2, right: 2, width: 14, height: 14, borderRadius: "50%", background: "#1D9E75", border: "2px solid #07111f" }} title="Visível no FractaCare" />
            )}
          </div>

          {/* Info principal */}
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4, flexWrap: "wrap" }}>
              <h1 style={{ fontSize: "1.2rem", fontWeight: 800, color: "#e8f0f8", margin: 0 }}>{perfil.nome} {perfil.sobrenome}</h1>
              <span style={{ fontSize: ".65rem", color: nc.cor, background: nc.bg, borderRadius: 20, padding: "3px 10px", fontWeight: 700 }}>{nc.label}</span>
              {perfil.destaque && <span style={{ fontSize: ".62rem", color: "#8B7FE8", background: "rgba(139,127,232,.1)", border: "1px solid rgba(139,127,232,.2)", borderRadius: 20, padding: "2px 8px", fontWeight: 600 }}>⭐ Destaque</span>}
            </div>
            <div style={{ fontSize: ".82rem", color: "rgba(160,200,235,.92)", marginBottom: 8 }}>{perfil.titulo}</div>
            <div style={{ fontSize: ".75rem", color: "rgba(160,200,235,.84)" }}>
              {perfil.cidade}, {perfil.estado} · {perfil.anosExperiencia} anos de experiência
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            {[
              { l: "Pacientes",  v: perfil.pacientesAtivos, c: "#1D9E75"  },
              { l: "Sessões",    v: perfil.sessoesTotais,   c: "#378ADD"  },
              { l: "Sucesso",    v: `${perfil.taxaSucesso}%`, c: "#EF9F27" },
              { l: "Resposta",   v: perfil.tempoResposta,  c: "#e8f0f8"  },
            ].map(s => (
              <div key={s.l} style={{ textAlign: "center" }}>
                <div style={{ fontSize: "1.1rem", fontWeight: 800, color: s.c, lineHeight: 1 }}>{s.v}</div>
                <div style={{ fontSize: ".6rem", color: "rgba(170,210,245,.88)", marginTop: 2 }}>{s.l}</div>
              </div>
            ))}
          </div>

          {/* Nota */}
          <div style={{ textAlign: "center", ...card, padding: "12px 16px", minWidth: 90 }}>
            <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "#EF9F27", lineHeight: 1 }}>{notaMedia}</div>
            <Stars nota={Math.round(notaMedia)} size={12} />
            <div style={{ fontSize: ".6rem", color: "rgba(170,210,245,.88)", marginTop: 3 }}>{perfil.avaliacoes.length} avaliações</div>
          </div>
        </div>

        {/* Tags de especialidade */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 16 }}>
          {perfil.especialidades.map(e => (
            <span key={e} style={{ fontSize: ".68rem", background: "rgba(29,158,117,.1)", border: "1px solid rgba(29,158,117,.2)", color: "#1D9E75", borderRadius: 20, padding: "3px 10px", fontWeight: 500 }}>{e}</span>
          ))}
          {perfil.modalidades.map(m => (
            <span key={m} style={{ fontSize: ".68rem", background: "rgba(55,138,221,.08)", border: "1px solid rgba(55,138,221,.2)", color: "#378ADD", borderRadius: 20, padding: "3px 10px" }}>
              {m === "presencial" ? "Presencial" : m === "domiciliar" ? "Domiciliar" : "Teleconsulta"}
            </span>
          ))}
          {perfil.aceitaPlano && <span style={{ fontSize: ".68rem", background: "rgba(139,127,232,.08)", border: "1px solid rgba(139,127,232,.2)", color: "#8B7FE8", borderRadius: 20, padding: "3px 10px" }}>Aceita plano de saúde</span>}
        </div>
      </div>

      {/* Status de visibilidade */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, ...card, padding: "10px 16px", border: perfil.visivel ? "1px solid rgba(29,158,117,.25)" : "1px solid rgba(224,90,75,.25)", background: perfil.visivel ? "rgba(29,158,117,.06)" : "rgba(224,90,75,.06)" }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: perfil.visivel ? "#1D9E75" : "#E05A4B", animation: perfil.visivel ? "pulse 2s ease infinite" : "none" }} />
        <span style={{ fontSize: ".78rem", color: perfil.visivel ? "#1D9E75" : "#E05A4B", fontWeight: 600 }}>
          {perfil.visivel ? "Perfil visível no FractaCare" : "Perfil oculto — famílias não conseguem te encontrar"}
        </span>
        <button onClick={() => setPerfil(p => ({ ...p, visivel: !p.visivel }))} style={{ marginLeft: "auto", padding: "4px 12px", borderRadius: 6, border: `1px solid ${perfil.visivel ? "rgba(224,90,75,.3)" : "rgba(29,158,117,.3)"}`, background: "transparent", color: perfil.visivel ? "#E05A4B" : "#1D9E75", fontFamily: "var(--font-sans)", fontWeight: 600, fontSize: ".72rem", cursor: "pointer" }}>
          {perfil.visivel ? "Ocultar perfil" : "Tornar visível"}
        </button>
      </div>

      {/* ── TABS ── */}
      <div style={{ display: "flex", borderBottom: "1px solid rgba(26,58,92,.4)" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: "10px 16px", background: "none", border: "none",
            borderBottom: `2px solid ${tab === t.id ? "#1D9E75" : "transparent"}`,
            color: tab === t.id ? "#1D9E75" : "rgba(160,200,235,.84)",
            fontFamily: "var(--font-sans)", fontWeight: tab === t.id ? 600 : 400,
            fontSize: ".78rem", cursor: "pointer", marginBottom: -1, whiteSpace: "nowrap",
          }}>{t.label}</button>
        ))}
      </div>

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* TAB: VITRINE */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      {tab === "vitrine" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 16 }}>

          {/* Coluna principal */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

            {/* Bio */}
            <div style={{ ...card, padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div style={{ ...lbl, marginBottom: 0 }}>Sobre mim</div>
                {!editBio ? (
                  <button onClick={() => { setBioDraft(perfil.bio); setEditBio(true); }} style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid rgba(70,120,180,.5)", background: "transparent", color: "rgba(160,200,235,.90)", fontFamily: "var(--font-sans)", fontSize: ".7rem", cursor: "pointer" }}>
                    Editar
                  </button>
                ) : (
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => setEditBio(false)} style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid rgba(70,120,180,.5)", background: "transparent", color: "rgba(160,200,235,.84)", fontFamily: "var(--font-sans)", fontSize: ".7rem", cursor: "pointer" }}>Cancelar</button>
                    <button onClick={salvarBio} style={{ padding: "4px 12px", borderRadius: 6, border: "none", background: "#1D9E75", color: "#07111f", fontFamily: "var(--font-sans)", fontWeight: 700, fontSize: ".7rem", cursor: "pointer" }}>
                      {salvando ? "Salvando..." : "Salvar"}
                    </button>
                  </div>
                )}
              </div>
              {editBio ? (
                <textarea value={bioDraft} onChange={e => setBioDraft(e.target.value)} rows={7} style={{ ...inp, resize: "vertical", lineHeight: 1.65 }} />
              ) : (
                <div style={{ fontSize: ".82rem", color: "rgba(160,200,235,.92)", lineHeight: 1.75, whiteSpace: "pre-line" }}>{perfil.bio}</div>
              )}
            </div>

            {/* Abordagens */}
            <div style={{ ...card, padding: 20 }}>
              <div style={{ ...lbl }}>Abordagens terapêuticas</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {perfil.abordagens.map(a => (
                  <div key={a} style={{ padding: "8px 14px", background: "rgba(55,138,221,.08)", border: "1px solid rgba(55,138,221,.2)", borderRadius: 9, fontSize: ".78rem", color: "#378ADD", fontWeight: 500 }}>{a}</div>
                ))}
              </div>
            </div>

            {/* Preview como aparece no FractaCare */}
            <div style={{ ...card, padding: 20, border: "1px solid rgba(139,127,232,.2)", background: "rgba(139,127,232,.04)" }}>
              <div style={{ fontSize: ".62rem", color: "#8B7FE8", fontWeight: 700, letterSpacing: ".09em", textTransform: "uppercase", marginBottom: 12 }}>Preview — como aparece no FractaCare</div>
              <div style={{ background: "rgba(255,255,255,.03)", borderRadius: 12, padding: 16, border: "1px solid rgba(255,255,255,.06)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                  <div style={{ width: 48, height: 48, borderRadius: "50%", background: "linear-gradient(135deg,#1D9E75,#378ADD)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".82rem", fontWeight: 800, color: "#fff" }}>{perfil.iniciais}</div>
                  <div>
                    <div style={{ fontSize: ".92rem", fontWeight: 700, color: "#e8f0f8" }}>{perfil.nome} {perfil.sobrenome}</div>
                    <div style={{ fontSize: ".7rem", color: "rgba(160,200,235,.90)" }}>{perfil.titulo}</div>
                  </div>
                  <div style={{ marginLeft: "auto", textAlign: "right" }}>
                    <Stars nota={Math.round(notaMedia)} size={11} />
                    <div style={{ fontSize: ".62rem", color: "rgba(170,210,245,.88)", marginTop: 2 }}>{notaMedia} · {perfil.avaliacoes.length} avaliações</div>
                  </div>
                </div>
                <div style={{ fontSize: ".75rem", color: "rgba(160,200,235,.90)", lineHeight: 1.6, marginBottom: 12 }}>{perfil.bio.slice(0, 180)}...</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                  {perfil.especialidades.slice(0, 3).map(e => (
                    <span key={e} style={{ fontSize: ".62rem", background: "rgba(29,158,117,.1)", color: "#1D9E75", borderRadius: 20, padding: "2px 8px" }}>{e}</span>
                  ))}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ fontSize: ".72rem", color: "rgba(160,200,235,.84)" }}>A partir de R$ {perfil.valorSessao}/sessão</div>
                  <div style={{ padding: "6px 14px", borderRadius: 8, background: "linear-gradient(135deg,#1D9E75,#0f8f7a)", color: "#07111f", fontSize: ".72rem", fontWeight: 700 }}>Contatar →</div>
                </div>
              </div>
            </div>
          </div>

          {/* Coluna lateral */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

            {/* Valor e modalidades */}
            <div style={{ ...card, padding: 18 }}>
              <div style={{ ...lbl }}>Atendimento</div>
              <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "#1D9E75", marginBottom: 4 }}>R$ {perfil.valorSessao}<span style={{ fontSize: ".7rem", fontWeight: 400, color: "rgba(160,200,235,.84)" }}>/sessão</span></div>
              <div style={{ fontSize: ".72rem", color: "rgba(160,200,235,.84)", marginBottom: 14 }}>Tempo de resposta: {perfil.tempoResposta}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {perfil.modalidades.map(m => (
                  <div key={m} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: ".75rem", color: "rgba(160,200,235,.92)" }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#1D9E75" }} />
                    {m === "presencial" ? "Atendimento presencial" : m === "domiciliar" ? "Atendimento domiciliar" : "Teleconsulta"}
                  </div>
                ))}
                {perfil.aceitaPlano && (
                  <div style={{ marginTop: 8, padding: "6px 10px", background: "rgba(139,127,232,.07)", border: "1px solid rgba(139,127,232,.15)", borderRadius: 7, fontSize: ".7rem", color: "#8B7FE8" }}>
                    Planos: {perfil.planosAceitos.join(", ")}
                  </div>
                )}
              </div>
            </div>

            {/* Métricas clínicas */}
            <div style={{ ...card, padding: 18 }}>
              <div style={{ ...lbl }}>Métricas clínicas</div>
              {[
                { l: "Pacientes ativos",    v: perfil.pacientesAtivos, c: "#1D9E75" },
                { l: "Sessões realizadas",  v: perfil.sessoesTotais,   c: "#378ADD" },
                { l: "Taxa de sucesso",     v: `${perfil.taxaSucesso}%`, c: "#EF9F27" },
                { l: "Anos de experiência", v: perfil.anosExperiencia, c: "#e8f0f8" },
              ].map(m => (
                <div key={m.l} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid rgba(26,58,92,.2)" }}>
                  <span style={{ fontSize: ".75rem", color: "rgba(160,200,235,.84)" }}>{m.l}</span>
                  <span style={{ fontSize: ".78rem", fontWeight: 700, color: m.c, fontFamily: "monospace" }}>{m.v}</span>
                </div>
              ))}
            </div>

            {/* Última avaliação */}
            {perfil.avaliacoes[0] && (
              <div style={{ ...card, padding: 18 }}>
                <div style={{ ...lbl }}>Avaliação recente</div>
                <Stars nota={perfil.avaliacoes[0].nota} />
                <div style={{ fontSize: ".78rem", color: "rgba(160,200,235,.92)", lineHeight: 1.6, margin: "8px 0" }}>"{perfil.avaliacoes[0].comentario.slice(0, 120)}..."</div>
                <div style={{ fontSize: ".65rem", color: "rgba(170,210,245,.88)" }}>{perfil.avaliacoes[0].familiaNome} · {perfil.avaliacoes[0].data}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* TAB: FORMAÇÃO */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      {tab === "formacao" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: ".8rem", color: "rgba(160,200,235,.90)" }}>{perfil.certificacoes.filter(c => c.verificada).length} de {perfil.certificacoes.length} certificações verificadas</div>
            <button style={{ padding: "7px 14px", borderRadius: 8, border: "1px solid rgba(29,158,117,.3)", background: "rgba(29,158,117,.08)", color: "#1D9E75", fontFamily: "var(--font-sans)", fontWeight: 600, fontSize: ".75rem", cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
              <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3v10M3 8h10"/></svg>
              Adicionar certificação
            </button>
          </div>

          {(["certificacao","graduacao","especializacao","curso"] as const).map(tipo => {
            const certs = perfil.certificacoes.filter(c => c.tipo === tipo);
            if (!certs.length) return null;
            const tc = TIPO_CERT_CONFIG[tipo];
            return (
              <div key={tipo} style={{ ...card, padding: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                  <span style={{ fontSize: 16 }}>{tc.icon}</span>
                  <span style={{ fontSize: ".72rem", fontWeight: 700, color: tc.cor, textTransform: "uppercase", letterSpacing: ".09em" }}>{tc.label}</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {certs.map(c => (
                    <div key={c.id} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 14px", background: "rgba(26,58,92,.2)", borderRadius: 10, border: `1px solid ${c.verificada ? "rgba(29,158,117,.2)" : "rgba(26,58,92,.4)"}` }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                          <span style={{ fontSize: ".85rem", fontWeight: 600, color: "#e8f0f8" }}>{c.titulo}</span>
                          {c.verificada && (
                            <span style={{ fontSize: ".58rem", color: "#1D9E75", background: "rgba(29,158,117,.1)", border: "1px solid rgba(29,158,117,.2)", borderRadius: 20, padding: "1px 6px", fontWeight: 700 }}>✓ Verificado</span>
                          )}
                        </div>
                        <div style={{ fontSize: ".75rem", color: "rgba(160,200,235,.90)" }}>{c.instituicao} · {c.ano}</div>
                      </div>
                      {c.url && (
                        <a href={c.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: ".68rem", color: "#378ADD", textDecoration: "none", padding: "3px 8px", border: "1px solid rgba(55,138,221,.2)", borderRadius: 6 }}>Ver →</a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Link para Education */}
          <div style={{ ...card, padding: 18, border: "1px solid rgba(55,138,221,.2)", background: "rgba(55,138,221,.04)", display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ fontSize: 24 }}>📚</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: ".82rem", fontWeight: 600, color: "#e8f0f8", marginBottom: 4 }}>FractaClinic Education</div>
              <div style={{ fontSize: ".75rem", color: "rgba(160,200,235,.90)" }}>Complete trilhas de formação e adicione certificações automaticamente ao seu perfil</div>
            </div>
            <Link href="/clinic/education" style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "linear-gradient(135deg,#378ADD,#8B7FE8)", color: "#fff", fontFamily: "var(--font-sans)", fontWeight: 700, fontSize: ".78rem", textDecoration: "none" }}>
              Acessar Education →
            </Link>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* TAB: DISPONIBILIDADE */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      {tab === "disponibilidade" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ fontSize: ".78rem", color: "rgba(160,200,235,.90)" }}>
            Clique nos slots para marcar sua disponibilidade. Isso aparece para as famílias no FractaCare ao buscar um terapeuta.
          </div>
          <div style={{ ...card, padding: 20 }}>
            <div style={{ display: "grid", gridTemplateColumns: "80px repeat(7,1fr)", gap: 8 }}>
              <div />
              {DIAS_LABEL.map(d => (
                <div key={d} style={{ textAlign: "center", fontSize: ".65rem", color: "rgba(160,200,235,.84)", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".06em" }}>{d}</div>
              ))}
              {(["manha","tarde","noite"] as const).map(turno => (
                <>
                  <div key={turno} style={{ fontSize: ".68rem", color: "rgba(160,200,235,.84)", display: "flex", alignItems: "center" }}>{TURNOS_LABEL[turno]}</div>
                  {[0,1,2,3,4,5,6].map(dia => {
                    const slot = perfil.disponibilidade.find(s => s.dia === dia && s.turno === turno);
                    const disp = slot?.disponivel ?? false;
                    return (
                      <button key={dia} onClick={() => toggleDisponibilidade(dia, turno)} style={{
                        height: 40, borderRadius: 8,
                        border: `1px solid ${disp ? "rgba(29,158,117,.4)" : "rgba(26,58,92,.4)"}`,
                        background: disp ? "rgba(29,158,117,.15)" : "rgba(26,58,92,.2)",
                        cursor: "pointer",
                        transition: "all .15s",
                      }}>
                        {disp && <span style={{ fontSize: ".6rem", color: "#1D9E75", fontWeight: 700 }}>✓</span>}
                      </button>
                    );
                  })}
                </>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", gap: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 16, height: 16, borderRadius: 4, background: "rgba(29,158,117,.15)", border: "1px solid rgba(29,158,117,.4)" }} />
              <span style={{ fontSize: ".72rem", color: "rgba(160,200,235,.84)" }}>Disponível</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 16, height: 16, borderRadius: 4, background: "rgba(26,58,92,.2)", border: "1px solid rgba(70,120,180,.4)" }} />
              <span style={{ fontSize: ".72rem", color: "rgba(160,200,235,.84)" }}>Indisponível</span>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* TAB: AVALIAÇÕES */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      {tab === "avaliacoes" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

          {/* Resumo de nota */}
          <div style={{ ...card, padding: 20, display: "flex", alignItems: "center", gap: 24 }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "3rem", fontWeight: 800, color: "#EF9F27", lineHeight: 1 }}>{notaMedia}</div>
              <Stars nota={Math.round(notaMedia)} size={16} />
              <div style={{ fontSize: ".68rem", color: "rgba(170,210,245,.88)", marginTop: 4 }}>{perfil.avaliacoes.length} avaliações</div>
            </div>
            <div style={{ flex: 1 }}>
              {[5,4,3,2,1].map(n => {
                const qtd = perfil.avaliacoes.filter(a => a.nota === n).length;
                const pct = perfil.avaliacoes.length > 0 ? Math.round((qtd / perfil.avaliacoes.length) * 100) : 0;
                return (
                  <div key={n} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                    <span style={{ fontSize: ".68rem", color: "rgba(160,200,235,.84)", width: 8 }}>{n}</span>
                    <svg width="10" height="10" viewBox="0 0 16 16" fill="#EF9F27"><path d="M8 1l1.9 3.8 4.2.6-3 3 .7 4.2L8 11l-3.8 2 .7-4.2-3-3 4.2-.6z"/></svg>
                    <div style={{ flex: 1, height: 6, background: "rgba(26,58,92,.5)", borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${pct}%`, background: "#EF9F27", opacity: .8 }} />
                    </div>
                    <span style={{ fontSize: ".65rem", color: "rgba(170,210,245,.88)", width: 24 }}>{qtd}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Cards de avaliação */}
          {perfil.avaliacoes.map(av => (
            <div key={av.id} style={{ ...card, padding: 18 }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg,#378ADD,#8B7FE8)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".55rem", fontWeight: 800, color: "#fff" }}>{av.pacienteIniciais}</div>
                    <span style={{ fontSize: ".82rem", fontWeight: 600, color: "#e8f0f8" }}>{av.familiaNome}</span>
                    {av.verificada && <span style={{ fontSize: ".58rem", color: "#1D9E75", background: "rgba(29,158,117,.1)", borderRadius: 20, padding: "1px 6px", fontWeight: 600 }}>✓ Verificada</span>}
                  </div>
                  <Stars nota={av.nota} size={12} />
                </div>
                <span style={{ fontSize: ".68rem", color: "rgba(170,210,245,.88)" }}>{av.data}</span>
              </div>
              <div style={{ fontSize: ".8rem", color: "rgba(160,200,235,.92)", lineHeight: 1.65, fontStyle: "italic" }}>"{av.comentario}"</div>
            </div>
          ))}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* TAB: CONFIGURAÇÕES */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      {tab === "configuracoes" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          <div style={{ ...card, padding: 20 }}>
            <div style={{ ...lbl }}>Visibilidade no FractaCare</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { l: "Perfil visível para famílias", v: perfil.visivel, k: "visivel" as const },
                { l: "Perfil em destaque", v: perfil.destaque, k: "destaque" as const },
              ].map(opt => (
                <div key={opt.k} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "rgba(26,58,92,.2)", borderRadius: 9 }}>
                  <span style={{ fontSize: ".82rem", color: "#e8f0f8" }}>{opt.l}</span>
                  <button onClick={() => setPerfil(p => ({ ...p, [opt.k]: !p[opt.k] }))} style={{
                    width: 44, height: 24, borderRadius: 12,
                    background: opt.v ? "#1D9E75" : "rgba(26,58,92,.6)",
                    border: "none", cursor: "pointer", position: "relative", transition: "background .2s",
                  }}>
                    <div style={{ position: "absolute", top: 3, left: opt.v ? 23 : 3, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left .2s" }} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div style={{ ...card, padding: 20 }}>
            <div style={{ ...lbl }}>Valor e modalidades</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ ...lbl }}>Valor por sessão (R$)</label>
                <input type="number" value={perfil.valorSessao} onChange={e => setPerfil(p => ({ ...p, valorSessao: Number(e.target.value) }))} style={inp} />
              </div>
              <div>
                <label style={{ ...lbl }}>Tempo de resposta</label>
                <input value={perfil.tempoResposta} onChange={e => setPerfil(p => ({ ...p, tempoResposta: e.target.value }))} style={inp} />
              </div>
            </div>
          </div>

          <div style={{ ...card, padding: 20 }}>
            <div style={{ ...lbl }}>Nível de senioridade</div>
            <div style={{ display: "flex", gap: 10 }}>
              {(Object.entries(NIVEL_CONFIG) as [Nivel, typeof NIVEL_CONFIG[Nivel]][]).map(([key, nc]) => (
                <div key={key} style={{ flex: 1, padding: "12px 14px", background: perfil.nivel === key ? nc.bg : "rgba(26,58,92,.2)", border: `1px solid ${perfil.nivel === key ? nc.cor + "55" : "rgba(26,58,92,.4)"}`, borderRadius: 10 }}>
                  <div style={{ fontSize: ".75rem", fontWeight: 700, color: perfil.nivel === key ? nc.cor : "rgba(160,200,235,.84)" }}>{nc.label}</div>
                  <div style={{ fontSize: ".62rem", color: "rgba(165,208,242,.85)", marginTop: 2 }}>
                    {key === "terapeuta" ? "Modo guiado" : key === "coordenador" ? "Modo semi-guiado" : "Modo livre · BCBA"}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 10, fontSize: ".72rem", color: "rgba(170,210,245,.88)" }}>
              O nível é validado pela supervisão. Para avançar, solicite avaliação ao seu supervisor.
            </div>
          </div>

          <button style={{ padding: 14, borderRadius: 10, border: "none", background: "linear-gradient(135deg,#1D9E75,#0f8f7a)", color: "#07111f", fontFamily: "var(--font-sans)", fontWeight: 800, fontSize: ".9rem", cursor: "pointer" }}>
            Salvar configurações
          </button>
        </div>
      )}

      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
    </div>
  );
}
