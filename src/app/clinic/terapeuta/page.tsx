"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useClinicContext } from "../layout";
import { supabase } from "@/lib/supabase"

// ─── TIPOS ───────────────────────────────────────────────────────────────────
type TabPerfil = "vitrine" | "formacao" | "disponibilidade" | "avaliacoes" | "configuracoes" | "supervisao";
type Nivel = "terapeuta" | "coordenador" | "senior" | "supervisor";

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
  nota: number;
  comentario: string;
  data: string;
  verificada: boolean;
}

interface DisponibilidadeSlot {
  dia: number;
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
  visivel: boolean;
  destaque: boolean;
  conselhoProfissional: string;
  registroProfissional: string;
}

// ─── MOCK ─────────────────────────────────────────────────────────────────────
const PERFIL_INICIAL: PerfilData = {
  nome: "", sobrenome: "", iniciais: "",
  titulo: "Analista do Comportamento · BCBA",
  nivel: "supervisor",
  anosExperiencia: 0,
  cidade: "", estado: "",
  bio: "",
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
    ...([1, 2, 3, 4, 5] as number[]).flatMap(dia =>
      (["manha", "tarde", "noite"] as const).map(turno => ({
        dia, turno, disponivel: turno !== "noite" && !(dia === 5 && turno === "tarde"),
      }))
    ),
    ...([0, 6] as number[]).flatMap(dia =>
      (["manha", "tarde", "noite"] as const).map(turno => ({
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
  conselhoProfissional: "",
  registroProfissional: "",
};

// ─── CONSTANTES ──────────────────────────────────────────────────────────────
const NIVEL_CONFIG: Record<string, { label: string; cor: string; bg: string; modo: string }> = {
  abat: { label: "ABAT — Atendimento Júnior", cor: "#1D9E75", bg: "rgba(29,158,117,.1)", modo: "Atendimento sob supervisão obrigatória" },
  qasp_s: { label: "QASP-S — Pleno", cor: "#EF9F27", bg: "rgba(239,159,39,.1)", modo: "Atendimento + Coordenação de casos" },
  qba: { label: "QBA — Sênior", cor: "#8B7FE8", bg: "rgba(139,127,232,.1)", modo: "Atendimento + Supervisão clínica" },
  terapeuta: { label: "ABAT — Atendimento Júnior", cor: "#1D9E75", bg: "rgba(29,158,117,.1)", modo: "Atendimento sob supervisão obrigatória" },
  coordenador: { label: "QASP-S — Pleno", cor: "#EF9F27", bg: "rgba(239,159,39,.1)", modo: "Atendimento + Coordenação de casos" },
  senior: { label: "QBA — Sênior", cor: "#8B7FE8", bg: "rgba(139,127,232,.1)", modo: "Atendimento + Supervisão clínica" },
  supervisor: { label: "QBA — Supervisor", cor: "#8B7FE8", bg: "rgba(139,127,232,.1)", modo: "Atendimento + Supervisão clínica" },
}

const TIPO_CERT_CONFIG = {
  graduacao: { label: "Graduação", cor: "#378ADD", icon: "🎓" },
  especializacao: { label: "Especialização", cor: "#8B7FE8", icon: "📚" },
  certificacao: { label: "Certificação", cor: "#1D9E75", icon: "🏆" },
  curso: { label: "Curso", cor: "#EF9F27", icon: "📋" },
};

const DIAS_LABEL = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const TURNOS_LABEL = { manha: "Manhã (8–12h)", tarde: "Tarde (13–18h)", noite: "Noite (18–21h)" };

// Opções de conselho profissional
const CONSELHOS = ["CRP", "CRA", "CREFITO", "CFP", "BACB", "ABPMC", "Outro"];

function Stars({ nota, size = 14 }: { nota: number; size?: number }) {
  return (
    <div style={{ display: "flex", gap: 2 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <svg key={i} width={size} height={size} viewBox="0 0 16 16" fill={i <= nota ? "#EF9F27" : "rgba(138,168,200,.2)"}>
          <path d="M8 1l1.9 3.8 4.2.6-3 3 .7 4.2L8 11l-3.8 2 .7-4.2-3-3 4.2-.6z" />
        </svg>
      ))}
    </div>
  );
}

// ─── PAGE ────────────────────────────────────────────────────────────────────
export default function TerapeutaPerfilPage() {
  const { terapeuta: terapeutaCtx } = useClinicContext();
  const nivelCtx = terapeutaCtx?.nivel ?? "supervisor";

  const [tab, setTab] = useState<TabPerfil>("vitrine")
  const [perfil, setPerfil] = useState<PerfilData>(PERFIL_INICIAL)
  const [loading, setLoading] = useState(true)
  const [editBio, setEditBio] = useState(false)
  const [bioDraft, setBioDraft] = useState("")
  const [salvando, setSalvando] = useState(false)
  const [modalAvaliacao, setModalAvaliacao] = useState(false)
  const [avalForm, setAvalForm] = useState({ familiaNome: "", pacienteIniciais: "", nota: 5, comentario: "" })
  const [salvandoAval, setSalvandoAval] = useState(false)

  async function salvarAvaliacao() {
    if (!terapeutaCtx?.id || !avalForm.familiaNome.trim()) return
    setSalvandoAval(true)
    const { data } = await supabase.from("terapeuta_avaliacoes").insert({
      terapeuta_id: terapeutaCtx.id,
      familia_nome: avalForm.familiaNome,
      paciente_iniciais: avalForm.pacienteIniciais || null,
      nota: avalForm.nota,
      comentario: avalForm.comentario || null,
      verificada: false,
    }).select().single()
    if (data) {
      setPerfil(prev => ({
        ...prev,
        avaliacoes: [{
          id: data.id,
          familiaNome: data.familia_nome,
          pacienteIniciais: data.paciente_iniciais ?? "",
          nota: data.nota,
          comentario: data.comentario ?? "",
          data: new Date(data.data_avaliacao).toLocaleDateString("pt-BR", { month: "short", year: "numeric" }),
          verificada: false,
        }, ...prev.avaliacoes],
      }))
    }
    setSalvandoAval(false)
    setModalAvaliacao(false)
    setAvalForm({ familiaNome: "", pacienteIniciais: "", nota: 5, comentario: "" })
  }
  const [modalCert, setModalCert] = useState(false)
  const [editCert, setEditCert] = useState<Certificacao | null>(null)
  const [certForm, setCertForm] = useState({ titulo: "", instituicao: "", ano: new Date().getFullYear(), tipo: "certificacao" as "graduacao" | "especializacao" | "certificacao" | "curso", verificada: false, url: "" })
  const [salvandoCert, setSalvandoCert] = useState(false)
  const [excluindoCert, setExcluindoCert] = useState<string | null>(null)

  useEffect(() => {
    async function carregar() {
      if (!terapeutaCtx?.id) { setLoading(false); return }
      const { data } = await supabase.from("profiles").select("*").eq("id", terapeutaCtx.id).single()
      if (data) {
        const nomeParts = (data.nome ?? "").split(" ")
        const nome = nomeParts[0] ?? ""
        const sobrenome = nomeParts.slice(1).join(" ") ?? ""
        const iniciais = nomeParts.map((n: string) => n[0]).slice(0, 2).join("").toUpperCase()
        setPerfil(prev => ({
          ...prev, nome, sobrenome, iniciais,
          titulo: data.titulo ?? "", nivel: (data.nivel_senioridade as Nivel) ?? "terapeuta",
          cidade: data.cidade ?? "", estado: data.estado ?? "", bio: data.bio ?? "",
          especialidades: data.especialidades ?? [], abordagens: data.abordagens ?? [],
          modalidades: data.modalidades ?? ["presencial"], valorSessao: data.valor_sessao ?? 0,
          anosExperiencia: data.anos_experiencia ?? 0, tempoResposta: data.tempo_resposta ?? "< 24 horas",
          aceitaPlano: data.aceita_plano ?? false, planosAceitos: data.planos_aceitos ?? [],
          visivel: data.visivel_fractacare ?? false, destaque: data.destaque ?? false,
          disponibilidade: data.disponibilidade?.length > 0 ? data.disponibilidade : prev.disponibilidade,
          conselhoProfissional: data.conselho_profissional ?? "",
          registroProfissional: data.registro_profissional ?? "",
        }))
        setBioDraft(data.bio ?? "")
      }
      // Busca certificações do banco
      const { data: certs } = await supabase
        .from("terapeuta_certificacoes")
        .select("*")
        .eq("terapeuta_id", terapeutaCtx.id)
        .order("ano", { ascending: false })

      // Busca avaliações do banco
      const { data: avals } = await supabase
        .from("terapeuta_avaliacoes")
        .select("*")
        .eq("terapeuta_id", terapeutaCtx.id)
        .order("criado_em", { ascending: false })

      if (certs || avals) {
        setPerfil(prev => ({
          ...prev,
          certificacoes: certs ? certs.map(c => ({
            id: c.id,
            titulo: c.titulo,
            instituicao: c.instituicao,
            ano: c.ano,
            tipo: c.tipo as "graduacao" | "especializacao" | "certificacao" | "curso",
            verificada: c.verificada,
            url: c.url,
          })) : prev.certificacoes,
          avaliacoes: avals ? avals.map(a => ({
            id: a.id,
            familiaNome: a.familia_nome,
            pacienteIniciais: a.paciente_iniciais ?? "",
            nota: a.nota,
            comentario: a.comentario ?? "",
            data: new Date(a.data_avaliacao).toLocaleDateString("pt-BR", { month: "short", year: "numeric" }),
            verificada: a.verificada,
          })) : prev.avaliacoes,
        }))
      }

      setLoading(false)
    }
    carregar()
  }, [terapeutaCtx?.id])

  async function salvarPerfil(campos: Partial<PerfilData>) {
    if (!terapeutaCtx?.id) return
    setSalvando(true)
    await supabase.from("profiles").update({
      titulo: campos.titulo ?? perfil.titulo, cidade: campos.cidade ?? perfil.cidade,
      estado: campos.estado ?? perfil.estado, bio: campos.bio ?? perfil.bio,
      especialidades: campos.especialidades ?? perfil.especialidades,
      abordagens: campos.abordagens ?? perfil.abordagens,
      modalidades: campos.modalidades ?? perfil.modalidades,
      valor_sessao: campos.valorSessao ?? perfil.valorSessao,
      anos_experiencia: campos.anosExperiencia ?? perfil.anosExperiencia,
      tempo_resposta: campos.tempoResposta ?? perfil.tempoResposta,
      aceita_plano: campos.aceitaPlano ?? perfil.aceitaPlano,
      planos_aceitos: campos.planosAceitos ?? perfil.planosAceitos,
      visivel_fractacare: campos.visivel ?? perfil.visivel,
      destaque: campos.destaque ?? perfil.destaque,
      disponibilidade: campos.disponibilidade ?? perfil.disponibilidade,
      conselho_profissional: campos.conselhoProfissional ?? perfil.conselhoProfissional,
      registro_profissional: campos.registroProfissional ?? perfil.registroProfissional,
      atualizado_em: new Date().toISOString(),
    }).eq("id", terapeutaCtx.id)
    setPerfil(prev => ({ ...prev, ...campos }))
    setSalvando(false)
  }

  async function salvarDisponibilidade() {
    await salvarPerfil({ disponibilidade: perfil.disponibilidade })
  }

  function abrirNovaCert() {
    setEditCert(null)
    setCertForm({ titulo: "", instituicao: "", ano: new Date().getFullYear(), tipo: "certificacao", verificada: false, url: "" })
    setModalCert(true)
  }

  function abrirEditarCert(c: Certificacao) {
    setEditCert(c)
    setCertForm({ titulo: c.titulo, instituicao: c.instituicao, ano: c.ano ?? new Date().getFullYear(), tipo: c.tipo, verificada: c.verificada, url: c.url ?? "" })
    setModalCert(true)
  }

  async function salvarCertificacao() {
    if (!terapeutaCtx?.id || !certForm.titulo.trim() || !certForm.instituicao.trim()) return
    setSalvandoCert(true)
    if (editCert) {
      await supabase.from("terapeuta_certificacoes").update({
        titulo: certForm.titulo, instituicao: certForm.instituicao,
        ano: certForm.ano, tipo: certForm.tipo,
        verificada: certForm.verificada, url: certForm.url || null,
      }).eq("id", editCert.id)
      setPerfil(prev => ({ ...prev, certificacoes: prev.certificacoes.map(c => c.id === editCert.id ? { ...c, ...certForm } : c) }))
    } else {
      const { data } = await supabase.from("terapeuta_certificacoes").insert({
        terapeuta_id: terapeutaCtx.id, titulo: certForm.titulo,
        instituicao: certForm.instituicao, ano: certForm.ano,
        tipo: certForm.tipo, verificada: certForm.verificada,
        url: certForm.url || null,
      }).select().single()
      if (data) setPerfil(prev => ({ ...prev, certificacoes: [{ id: data.id, titulo: data.titulo, instituicao: data.instituicao, ano: data.ano, tipo: data.tipo, verificada: data.verificada, url: data.url }, ...prev.certificacoes] }))
    }
    setSalvandoCert(false)
    setModalCert(false)
  }

  async function excluirCertificacao(id: string) {
    setExcluindoCert(id)
    await supabase.from("terapeuta_certificacoes").delete().eq("id", id)
    setPerfil(prev => ({ ...prev, certificacoes: prev.certificacoes.filter(c => c.id !== id) }))
    setExcluindoCert(null)
  }

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
  const inp: React.CSSProperties = { background: "rgba(20,55,110,.55)", border: "1px solid rgba(26,58,92,.6)", borderRadius: 8, padding: "9px 12px", color: "#e8f0f8", fontFamily: "var(--font-sans)", fontSize: ".82rem", outline: "none", width: "100%", boxSizing: "border-box" as const };
  const lbl: React.CSSProperties = { fontSize: ".6rem", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: ".09em", color: "rgba(170,210,245,.88)", marginBottom: 8 };

  const TABS: { id: TabPerfil; label: string }[] = [
    { id: "vitrine", label: "Vitrine" },
    { id: "formacao", label: "Formação" },
    { id: "disponibilidade", label: "Disponibilidade" },
    { id: "avaliacoes", label: `Avaliações (${perfil.avaliacoes.length})` },
    { id: "configuracoes", label: "Configurações" },
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
              {perfil.destaque && <span style={{ fontSize: ".62rem", color: "#8B7FE8", background: "rgba(139,127,232,.1)", border: "1px solid rgba(139,127,232,.2)", borderRadius: 20, padding: "2px 8px", fontWeight: 600 }}>Destaque</span>}
            </div>
            <div style={{ fontSize: ".82rem", color: "rgba(160,200,235,.92)", marginBottom: 4 }}>{perfil.titulo}</div>
            {/* Registro profissional no header quando preenchido */}
            {perfil.conselhoProfissional && perfil.registroProfissional && (
              <div style={{ fontSize: ".72rem", color: "rgba(170,210,245,.7)", marginBottom: 4 }}>
                {perfil.conselhoProfissional} {perfil.registroProfissional}
              </div>
            )}
            <div style={{ fontSize: ".75rem", color: "rgba(160,200,235,.84)" }}>
              {perfil.cidade}, {perfil.estado} · {perfil.anosExperiencia} anos de experiência
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" as const }}>
            {[
              { l: "Pacientes", v: perfil.pacientesAtivos, c: "#1D9E75" },
              { l: "Sessões", v: perfil.sessoesTotais, c: "#378ADD" },
              { l: "Sucesso", v: `${perfil.taxaSucesso}%`, c: "#EF9F27" },
              { l: "Resposta", v: perfil.tempoResposta, c: "#e8f0f8" },
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
            <span key={e} onClick={() => { setPerfil(p => ({ ...p, especialidades: p.especialidades.filter(x => x !== e) })); salvarPerfil({ especialidades: perfil.especialidades.filter(x => x !== e) }) }}
              style={{ fontSize: ".68rem", background: "rgba(29,158,117,.1)", border: "1px solid rgba(29,158,117,.2)", color: "#1D9E75", borderRadius: 20, padding: "3px 10px", fontWeight: 500, cursor: "pointer" }}
              title="Clique para remover">{e} ×</span>
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
      <div style={{ display: "flex", borderBottom: "1px solid rgba(26,58,92,.4)", overflowX: "auto", WebkitOverflowScrolling: "touch" as any, scrollbarWidth: "none" as any }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: "10px 14px", background: "none", border: "none",
            borderBottom: `2px solid ${tab === t.id ? "#1D9E75" : "transparent"}`,
            color: tab === t.id ? "#1D9E75" : "rgba(160,200,235,.84)",
            fontFamily: "var(--font-sans)", fontWeight: tab === t.id ? 600 : 400,
            fontSize: ".75rem", cursor: "pointer", marginBottom: -1, whiteSpace: "nowrap" as const, flexShrink: 0,
          }}>{t.label}</button>
        ))}
      </div>

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* TAB: VITRINE */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      {tab === "vitrine" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 16 }}>

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

            {/* Especialidades — edição */}
            <div style={{ ...card, padding: 20 }}>
              <div style={{ ...lbl }}>Especialidades clínicas</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                {perfil.especialidades.map(e => (
                  <div key={e} onClick={() => { const nova = perfil.especialidades.filter(x => x !== e); setPerfil(p => ({ ...p, especialidades: nova })); salvarPerfil({ especialidades: nova }) }}
                    style={{ padding: "6px 12px", background: "rgba(29,158,117,.08)", border: "1px solid rgba(29,158,117,.2)", borderRadius: 20, fontSize: ".75rem", color: "#1D9E75", fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                    {e} <span style={{ opacity: .5, fontSize: ".7rem" }}>×</span>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <input id="nova-esp" placeholder="Ex: TEA, TDAH, Comunicação funcional..."
                  onKeyDown={e => { if (e.key === "Enter") { const v = (e.target as HTMLInputElement).value.trim(); if (v && !perfil.especialidades.includes(v)) { const nova = [...perfil.especialidades, v]; setPerfil(p => ({ ...p, especialidades: nova })); salvarPerfil({ especialidades: nova }); (e.target as HTMLInputElement).value = "" } } }}
                  style={{ flex: 1, padding: "7px 10px", borderRadius: 8, border: "1px solid rgba(26,58,92,.4)", background: "rgba(13,32,53,.6)", color: "#e8f0f8", fontSize: ".75rem", fontFamily: "var(--font-sans)", outline: "none" }} />
                <button onClick={() => { const inp = document.getElementById("nova-esp") as HTMLInputElement; const v = inp?.value.trim(); if (v && !perfil.especialidades.includes(v)) { const nova = [...perfil.especialidades, v]; setPerfil(p => ({ ...p, especialidades: nova })); salvarPerfil({ especialidades: nova }); inp.value = "" } }}
                  style={{ padding: "7px 14px", borderRadius: 8, border: "1px solid rgba(29,158,117,.3)", background: "rgba(29,158,117,.08)", color: "#1D9E75", fontSize: ".75rem", fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-sans)" }}>
                  + Adicionar
                </button>
              </div>
            </div>

            {/* Abordagens — edição */}
            <div style={{ ...card, padding: 20 }}>
              <div style={{ ...lbl }}>Abordagens terapêuticas</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                {perfil.abordagens.map(a => (
                  <div key={a} onClick={() => { const nova = perfil.abordagens.filter(x => x !== a); setPerfil(p => ({ ...p, abordagens: nova })); salvarPerfil({ abordagens: nova }) }}
                    style={{ padding: "6px 12px", background: "rgba(55,138,221,.08)", border: "1px solid rgba(55,138,221,.2)", borderRadius: 20, fontSize: ".75rem", color: "#378ADD", fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                    {a} <span style={{ opacity: .5, fontSize: ".7rem" }}>×</span>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <input id="nova-abord" placeholder="Ex: DTT, NET, Análise Funcional, PRT..."
                  onKeyDown={e => { if (e.key === "Enter") { const v = (e.target as HTMLInputElement).value.trim(); if (v && !perfil.abordagens.includes(v)) { const nova = [...perfil.abordagens, v]; setPerfil(p => ({ ...p, abordagens: nova })); salvarPerfil({ abordagens: nova }); (e.target as HTMLInputElement).value = "" } } }}
                  style={{ flex: 1, padding: "7px 10px", borderRadius: 8, border: "1px solid rgba(26,58,92,.4)", background: "rgba(13,32,53,.6)", color: "#e8f0f8", fontSize: ".75rem", fontFamily: "var(--font-sans)", outline: "none" }} />
                <button onClick={() => { const inp = document.getElementById("nova-abord") as HTMLInputElement; const v = inp?.value.trim(); if (v && !perfil.abordagens.includes(v)) { const nova = [...perfil.abordagens, v]; setPerfil(p => ({ ...p, abordagens: nova })); salvarPerfil({ abordagens: nova }); inp.value = "" } }}
                  style={{ padding: "7px 14px", borderRadius: 8, border: "1px solid rgba(55,138,221,.3)", background: "rgba(55,138,221,.08)", color: "#378ADD", fontSize: ".75rem", fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-sans)" }}>
                  + Adicionar
                </button>
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
                { l: "Pacientes ativos", v: perfil.pacientesAtivos, c: "#1D9E75" },
                { l: "Sessões realizadas", v: perfil.sessoesTotais, c: "#378ADD" },
                { l: "Taxa de sucesso", v: `${perfil.taxaSucesso}%`, c: "#EF9F27" },
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
            <button onClick={abrirNovaCert} style={{ padding: "7px 14px", borderRadius: 8, border: "1px solid rgba(29,158,117,.3)", background: "rgba(29,158,117,.08)", color: "#1D9E75", fontFamily: "var(--font-sans)", fontWeight: 600, fontSize: ".75rem", cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
              <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3v10M3 8h10" /></svg>
              Adicionar certificação
            </button>
          </div>

          {(["certificacao", "graduacao", "especializacao", "curso"] as const).map(tipo => {
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
                            <span style={{ fontSize: ".58rem", color: "#1D9E75", background: "rgba(29,158,117,.1)", border: "1px solid rgba(29,158,117,.2)", borderRadius: 20, padding: "1px 6px", fontWeight: 700 }}>Verificado</span>
                          )}
                        </div>
                        <div style={{ fontSize: ".75rem", color: "rgba(160,200,235,.90)" }}>{c.instituicao} · {c.ano}</div>
                      </div>
                      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                        {c.url && <a href={c.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: ".68rem", color: "#378ADD", textDecoration: "none", padding: "3px 8px", border: "1px solid rgba(55,138,221,.2)", borderRadius: 6 }}>Ver →</a>}
                        <button onClick={() => abrirEditarCert(c)} style={{ fontSize: ".68rem", color: "#378ADD", background: "transparent", border: "1px solid rgba(55,138,221,.2)", borderRadius: 6, padding: "3px 8px", cursor: "pointer", fontFamily: "var(--font-sans)" }}>Editar</button>
                        <button onClick={() => excluirCertificacao(c.id)} disabled={excluindoCert === c.id} style={{ fontSize: ".68rem", color: "rgba(224,90,75,.6)", background: "transparent", border: "1px solid rgba(224,90,75,.2)", borderRadius: 6, padding: "3px 8px", cursor: "pointer", fontFamily: "var(--font-sans)" }}>
                          {excluindoCert === c.id ? "..." : "Excluir"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Modal adicionar/editar certificação */}
          {modalCert && (
            <div onClick={() => setModalCert(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", backdropFilter: "blur(4px)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
              <div onClick={e => e.stopPropagation()} style={{ background: "rgba(13,32,53,.97)", border: "1px solid rgba(26,58,92,.5)", borderRadius: 16, padding: 28, width: "100%", maxWidth: 440, display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ fontSize: "1rem", fontWeight: 700, color: "#e8f0f8" }}>{editCert ? "Editar certificação" : "Adicionar certificação"}</div>
                {[
                  ["Título *", "titulo", "text", "Ex: BCBA — Board Certified Behavior Analyst"],
                  ["Instituição *", "instituicao", "text", "Ex: BACB, USP, IBAC..."],
                  ["Ano", "ano", "number", "2024"],
                  ["URL (opcional)", "url", "text", "https://..."],
                ].map(([label, field, type, placeholder]) => (
                  <div key={field}>
                    <div style={{ fontSize: ".6rem", color: "rgba(170,210,245,.5)", textTransform: "uppercase" as const, letterSpacing: ".07em", marginBottom: 5 }}>{label}</div>
                    <input type={type} value={(certForm as any)[field]} onChange={e => setCertForm(prev => ({ ...prev, [field]: type === "number" ? Number(e.target.value) : e.target.value }))}
                      placeholder={placeholder}
                      style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid rgba(26,58,92,.5)", background: "rgba(20,55,110,.4)", color: "#e8f0f8", fontSize: ".82rem", fontFamily: "var(--font-sans)", outline: "none", boxSizing: "border-box" as const }} />
                  </div>
                ))}
                <div>
                  <div style={{ fontSize: ".6rem", color: "rgba(170,210,245,.5)", textTransform: "uppercase" as const, letterSpacing: ".07em", marginBottom: 5 }}>Tipo</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                    {(["certificacao", "graduacao", "especializacao", "curso"] as const).map(t => (
                      <button key={t} onClick={() => setCertForm(prev => ({ ...prev, tipo: t }))}
                        style={{ padding: "7px", borderRadius: 8, border: `1px solid ${certForm.tipo === t ? "rgba(29,158,117,.4)" : "rgba(26,58,92,.4)"}`, background: certForm.tipo === t ? "rgba(29,158,117,.1)" : "transparent", color: certForm.tipo === t ? "#1D9E75" : "rgba(160,200,235,.4)", fontSize: ".72rem", fontWeight: certForm.tipo === t ? 700 : 400, cursor: "pointer", fontFamily: "var(--font-sans)", textTransform: "capitalize" as const }}>
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={() => setModalCert(false)} style={{ flex: 1, padding: "10px", borderRadius: 9, border: "1px solid rgba(70,120,180,.4)", background: "transparent", color: "rgba(160,200,235,.6)", fontSize: ".8rem", cursor: "pointer", fontFamily: "var(--font-sans)" }}>Cancelar</button>
                  <button onClick={salvarCertificacao} disabled={salvandoCert || !certForm.titulo.trim() || !certForm.instituicao.trim()}
                    style={{ flex: 2, padding: "10px", borderRadius: 9, border: "none", background: "linear-gradient(135deg,#1D9E75,#0f8f7a)", color: "#07111f", fontSize: ".82rem", fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-sans)", opacity: salvandoCert ? 0.7 : 1 }}>
                    {salvandoCert ? "Salvando..." : editCert ? "Salvar alterações" : "Adicionar"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Link para Education */}
          <div style={{ ...card, padding: 18, border: "1px solid rgba(55,138,221,.2)", background: "rgba(55,138,221,.04)", display: "flex", alignItems: "center", gap: 14 }}>
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
              {(["manha", "tarde", "noite"] as const).map(turno => (
                <>
                  <div key={turno} style={{ fontSize: ".68rem", color: "rgba(160,200,235,.84)", display: "flex", alignItems: "center" }}>{TURNOS_LABEL[turno]}</div>
                  {[0, 1, 2, 3, 4, 5, 6].map(dia => {
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

          <button onClick={salvarDisponibilidade} style={{ padding: "12px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#1D9E75,#0f8f7a)", color: "#07111f", fontFamily: "var(--font-sans)", fontWeight: 800, fontSize: ".85rem", cursor: "pointer" }}>
            {salvando ? "Salvando..." : "Salvar disponibilidade"}
          </button>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* TAB: AVALIAÇÕES */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      {tab === "avaliacoes" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

          <div style={{ padding: "8px 14px", background: "rgba(26,58,92,.2)", borderRadius: 9, fontSize: ".72rem", color: "rgba(160,200,235,.4)", lineHeight: 1.6 }}>
            As avaliações são enviadas pelas famílias via FractaCare após as sessões realizadas.
          </div>

          {/* Resumo de nota */}
          <div style={{ ...card, padding: 20, display: "flex", alignItems: "center", gap: 24 }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "3rem", fontWeight: 800, color: "#EF9F27", lineHeight: 1 }}>{notaMedia}</div>
              <Stars nota={Math.round(notaMedia)} size={16} />
              <div style={{ fontSize: ".68rem", color: "rgba(170,210,245,.88)", marginTop: 4 }}>{perfil.avaliacoes.length} avaliações</div>
            </div>
            <div style={{ flex: 1 }}>
              {[5, 4, 3, 2, 1].map(n => {
                const qtd = perfil.avaliacoes.filter(a => a.nota === n).length;
                const pct = perfil.avaliacoes.length > 0 ? Math.round((qtd / perfil.avaliacoes.length) * 100) : 0;
                return (
                  <div key={n} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                    <span style={{ fontSize: ".68rem", color: "rgba(160,200,235,.84)", width: 8 }}>{n}</span>
                    <svg width="10" height="10" viewBox="0 0 16 16" fill="#EF9F27"><path d="M8 1l1.9 3.8 4.2.6-3 3 .7 4.2L8 11l-3.8 2 .7-4.2-3-3 4.2-.6z" /></svg>
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
                    {av.verificada && <span style={{ fontSize: ".58rem", color: "#1D9E75", background: "rgba(29,158,117,.1)", borderRadius: 20, padding: "1px 6px", fontWeight: 600 }}>Verificada</span>}
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

          {/* Visibilidade */}
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

          {/* ── REGISTRO PROFISSIONAL ── */}
          <div style={{ ...card, padding: 20 }}>
            <div style={{ ...lbl }}>Registro profissional</div>
            <div style={{ fontSize: ".75rem", color: "rgba(160,200,235,.7)", marginBottom: 14, lineHeight: 1.55 }}>
              Usado na assinatura de relatórios e documentos clínicos exportados pela plataforma.
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: 12 }}>
              <div>
                <label style={{ ...lbl }}>Conselho</label>
                <select
                  value={perfil.conselhoProfissional}
                  onChange={e => setPerfil(p => ({ ...p, conselhoProfissional: e.target.value }))}
                  style={{ ...inp, appearance: "none" as const, cursor: "pointer" }}
                >
                  <option value="">Selecionar</option>
                  {CONSELHOS.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ ...lbl }}>Número de registro</label>
                <input
                  type="text"
                  placeholder="Ex: 06/12345-SP"
                  value={perfil.registroProfissional}
                  onChange={e => setPerfil(p => ({ ...p, registroProfissional: e.target.value }))}
                  style={inp}
                />
              </div>
            </div>
            {/* Preview da assinatura */}
            {(perfil.conselhoProfissional || perfil.registroProfissional) && (
              <div style={{ marginTop: 14, padding: "10px 14px", background: "rgba(26,58,92,.2)", borderRadius: 8, border: "1px solid rgba(70,120,180,.2)" }}>
                <div style={{ fontSize: ".6rem", color: "rgba(170,210,245,.7)", fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 4 }}>Prévia da assinatura nos relatórios</div>
                <div style={{ fontSize: ".82rem", color: "#e8f0f8", fontWeight: 600 }}>
                  {perfil.nome} {perfil.sobrenome}
                  {perfil.conselhoProfissional && perfil.registroProfissional && (
                    <span style={{ fontWeight: 400, color: "rgba(160,200,235,.84)" }}> · {perfil.conselhoProfissional} {perfil.registroProfissional}</span>
                  )}
                </div>
                {perfil.titulo && (
                  <div style={{ fontSize: ".72rem", color: "rgba(160,200,235,.7)", marginTop: 2 }}>{perfil.titulo}</div>
                )}
              </div>
            )}
          </div>

          {/* Valor e modalidades */}
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
              <div>
                <label style={{ ...lbl }}>Anos de experiência</label>
                <input type="number" min={0} max={50} value={perfil.anosExperiencia} onChange={e => setPerfil(p => ({ ...p, anosExperiencia: Number(e.target.value) }))} style={inp} />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={{ ...lbl }}>Modalidades de atendimento</label>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" as const, marginTop: 4 }}>
                  {(["presencial", "domiciliar", "teleconsulta"] as const).map(m => {
                    const ativo = perfil.modalidades.includes(m)
                    const label = m === "presencial" ? "Presencial" : m === "domiciliar" ? "Domiciliar" : "Teleconsulta"
                    return (
                      <button key={m} onClick={() => {
                        const nova = ativo ? perfil.modalidades.filter(x => x !== m) : [...perfil.modalidades, m]
                        setPerfil(p => ({ ...p, modalidades: nova }))
                      }}
                        style={{ padding: "7px 16px", borderRadius: 20, border: `1px solid ${ativo ? "rgba(55,138,221,.4)" : "rgba(26,58,92,.4)"}`, background: ativo ? "rgba(55,138,221,.12)" : "transparent", color: ativo ? "#378ADD" : "rgba(160,200,235,.4)", fontSize: ".75rem", fontWeight: ativo ? 600 : 400, cursor: "pointer", fontFamily: "var(--font-sans)", transition: "all .15s" }}>
                        {label}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
          {/* Nível de senioridade — somente leitura */}
          <div style={{ ...card, padding: 20 }}>
            <div style={{ ...lbl }}>Certificação e nível de serviço</div>
            <div style={{ padding: "14px 16px", background: NIVEL_CONFIG[perfil.nivel]?.bg ?? "rgba(26,58,92,.2)", border: `1px solid ${(NIVEL_CONFIG[perfil.nivel]?.cor ?? "#1D9E75") + "55"}`, borderRadius: 10, marginBottom: 12 }}>
              <div style={{ fontSize: ".82rem", fontWeight: 700, color: NIVEL_CONFIG[perfil.nivel]?.cor ?? "#1D9E75" }}>{NIVEL_CONFIG[perfil.nivel]?.label ?? perfil.nivel}</div>
              <div style={{ fontSize: ".68rem", color: "rgba(165,208,242,.85)", marginTop: 3 }}>{NIVEL_CONFIG[perfil.nivel]?.modo ?? "—"}</div>
            </div>
            <div style={{ background: "rgba(55,138,221,.06)", border: "1px solid rgba(55,138,221,.15)", borderRadius: 9, padding: "10px 14px", fontSize: ".72rem", color: "rgba(160,200,235,.6)", lineHeight: 1.6 }}>
              O nível de certificação é validado pela equipe Fracta ou pelo seu supervisor. Para solicitar upgrade, entre em contato pelo suporte.
            </div>
          </div>

          {/* Link para supervisão */}
          <div style={{ ...card, padding: 18, border: "1px solid rgba(139,127,232,.2)", background: "rgba(139,127,232,.04)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14 }}>
            <div>
              <div style={{ fontSize: ".82rem", fontWeight: 600, color: "#e8f0f8", marginBottom: 3 }}>Supervisão clínica</div>
              <div style={{ fontSize: ".72rem", color: "rgba(160,200,235,.5)" }}>Gerencie sua supervisão, equipe e histórico de horas</div>
            </div>
            <Link href="/clinic/supervisao" style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "linear-gradient(135deg,#8B7FE8,#6c63d4)", color: "#fff", fontFamily: "var(--font-sans)", fontWeight: 700, fontSize: ".78rem", textDecoration: "none", flexShrink: 0 }}>
              Acessar →
            </Link>
          </div>

          <button onClick={() => salvarPerfil(perfil)} style={{ padding: 14, borderRadius: 10, border: "none", background: "linear-gradient(135deg,#1D9E75,#0f8f7a)", color: "#07111f", fontFamily: "var(--font-sans)", fontWeight: 800, fontSize: ".9rem", cursor: "pointer" }}>
            {salvando ? "Salvando..." : "Salvar configurações"}
          </button>
        </div>
      )}

      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>

      {/* Modal nova avaliação */}
      {modalAvaliacao && (
        <div onClick={() => setModalAvaliacao(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", backdropFilter: "blur(4px)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "rgba(13,32,53,.97)", border: "1px solid rgba(239,159,39,.3)", borderRadius: 16, padding: 28, width: "100%", maxWidth: 440, display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ fontSize: "1rem", fontWeight: 700, color: "#e8f0f8" }}>Adicionar avaliação</div>
            <div>
              <div style={{ fontSize: ".6rem", color: "rgba(170,210,245,.5)", textTransform: "uppercase" as const, letterSpacing: ".07em", marginBottom: 5 }}>Nome da família *</div>
              <input value={avalForm.familiaNome} onChange={e => setAvalForm(p => ({ ...p, familiaNome: e.target.value }))} placeholder="Ex: Família Silva"
                style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid rgba(26,58,92,.5)", background: "rgba(20,55,110,.4)", color: "#e8f0f8", fontSize: ".82rem", fontFamily: "var(--font-sans)", outline: "none", boxSizing: "border-box" as const }} />
            </div>
            <div>
              <div style={{ fontSize: ".6rem", color: "rgba(170,210,245,.5)", textTransform: "uppercase" as const, letterSpacing: ".07em", marginBottom: 5 }}>Iniciais do paciente</div>
              <input value={avalForm.pacienteIniciais} onChange={e => setAvalForm(p => ({ ...p, pacienteIniciais: e.target.value }))} placeholder="Ex: JS" maxLength={3}
                style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid rgba(26,58,92,.5)", background: "rgba(20,55,110,.4)", color: "#e8f0f8", fontSize: ".82rem", fontFamily: "var(--font-sans)", outline: "none", boxSizing: "border-box" as const }} />
            </div>
            <div>
              <div style={{ fontSize: ".6rem", color: "rgba(170,210,245,.5)", textTransform: "uppercase" as const, letterSpacing: ".07em", marginBottom: 8 }}>Nota</div>
              <div style={{ display: "flex", gap: 8 }}>
                {[1, 2, 3, 4, 5].map(n => (
                  <button key={n} onClick={() => setAvalForm(p => ({ ...p, nota: n }))}
                    style={{ flex: 1, padding: "8px", borderRadius: 8, border: `1px solid ${avalForm.nota >= n ? "rgba(239,159,39,.5)" : "rgba(26,58,92,.4)"}`, background: avalForm.nota >= n ? "rgba(239,159,39,.15)" : "transparent", color: avalForm.nota >= n ? "#EF9F27" : "rgba(160,200,235,.3)", fontSize: ".82rem", cursor: "pointer", fontFamily: "var(--font-sans)", fontWeight: 700 }}>
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div style={{ fontSize: ".6rem", color: "rgba(170,210,245,.5)", textTransform: "uppercase" as const, letterSpacing: ".07em", marginBottom: 5 }}>Comentário</div>
              <textarea value={avalForm.comentario} onChange={e => setAvalForm(p => ({ ...p, comentario: e.target.value }))} rows={3} placeholder="Feedback da família..."
                style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid rgba(26,58,92,.5)", background: "rgba(20,55,110,.4)", color: "#e8f0f8", fontSize: ".82rem", fontFamily: "var(--font-sans)", outline: "none", resize: "none" as const, boxSizing: "border-box" as const }} />
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setModalAvaliacao(false)} style={{ flex: 1, padding: "10px", borderRadius: 9, border: "1px solid rgba(70,120,180,.4)", background: "transparent", color: "rgba(160,200,235,.6)", fontSize: ".8rem", cursor: "pointer", fontFamily: "var(--font-sans)" }}>Cancelar</button>
              <button onClick={salvarAvaliacao} disabled={salvandoAval || !avalForm.familiaNome.trim()}
                style={{ flex: 2, padding: "10px", borderRadius: 9, border: "none", background: "linear-gradient(135deg,#EF9F27,#d4890f)", color: "#07111f", fontSize: ".82rem", fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-sans)", opacity: salvandoAval ? 0.7 : 1 }}>
                {salvandoAval ? "Salvando..." : "Adicionar avaliação"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
