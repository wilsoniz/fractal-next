"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";
import { generateForecastFromProfile, type ForecastGoal, type ForecastResult } from "@/lib/forecast";
import { useClinicContext } from "../../layout";
import { supabase } from "@/lib/supabase";
import { HistoricoSessoes, ContratoTab } from "./tabs";

// ─── TIPOS ───────────────────────────────────────────────────────────────────
type RadarSnapshot = {
  date: string;
  communication: number; social: number; attention: number;
  regulation: number; autonomy: number; flexibility: number;
  play: number; motivation: number;
};

type Program = {
  id: string; name: string; domain: string;
  status: "active" | "completed" | "stalled";
  success: number; independence: number; relatedPrograms?: string[]
};

type ClinicalAlert = { id: string; title: string; description: string; level: "low" | "medium" | "high" };

type LearnerProfile = {
  id: string; name: string; age: number; diagnosis?: string;
  radar: RadarSnapshot[]; programs: Program[]; alerts: ClinicalAlert[];
};

// Repertório
type Habilidade = {
  id: string; dominio: string; habilidade: string; operante: string | null;
  status: "ausente" | "emergente" | "em_aquisicao" | "dominada";
  score: number; independencia: number; generalizacao: number; manutencao: number;
  fonte: string | null;
};

type Comportamento = {
  id: string; nome: string; comportamento: string | null; topografia: string | null; funcao: string | null;
  frequencia: string | null; intensidade: string | null; contexto: string | null;
  status: "ativo" | "reduzindo" | "controlado" | "monitorado" | "em_intervencao" | "resolvido";
  fonte: string | null;
};

type VariaveisClinicas = {
  assentimento_pct: number; tempo_medio_assentimento: number;
  revogacoes_por_sessao: number; tolerancia_exigencia: number; responsividade_reforco: number;
};

type Tab = "visao-geral" | "programas" | "skill-graph" | "forecast" | "avaliacoes" | "contrato" | "historico" | "jornada";

// ─── FORECAST GOALS ──────────────────────────────────────────────────────────
const FORECAST_GOALS: ForecastGoal[] = [
  { id: "g1", name: "Pedir o que quer (mando básico)", type: "acquisition", targetDomain: "communication", requiredSkills: [], relatedPrograms: ["Atenção conjunta"] },
  { id: "g2", name: "Esperar 3 segundos", type: "acquisition", targetDomain: "regulation", requiredSkills: ["g1"], relatedPrograms: ["Troca de turnos"] },
  { id: "g3", name: "Troca de turnos simples", type: "acquisition", targetDomain: "social", requiredSkills: ["g1"], relatedPrograms: ["Pedir o que quer"] },
  { id: "g4", name: "Seguir instrução de 1 passo", type: "acquisition", targetDomain: "attention", requiredSkills: [], relatedPrograms: [] },
  { id: "g5", name: "Redução de fuga de demanda", type: "reduction", targetDomain: "regulation", requiredSkills: ["g2"], relatedPrograms: ["Esperar 3 segundos"] },
  { id: "g6", name: "Brincar funcionalmente por 5 min", type: "acquisition", targetDomain: "play", requiredSkills: ["g1"], relatedPrograms: ["Troca de turnos"] },
];

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const STATUS_PROG = {
  active: { label: "Ativo", cor: "#1D9E75", bg: "rgba(29,158,117,.12)", borda: "rgba(29,158,117,.25)" },
  completed: { label: "Concluído", cor: "#378ADD", bg: "rgba(55,138,221,.12)", borda: "rgba(55,138,221,.25)" },
  stalled: { label: "Travado", cor: "#E05A4B", bg: "rgba(224,90,75,.12)", borda: "rgba(224,90,75,.25)" },
};
const ALERT_COR = { high: "#E05A4B", medium: "#EF9F27", low: "#1D9E75" };
const ALERT_BG = { high: "rgba(224,90,75,.08)", medium: "rgba(239,159,39,.08)", low: "rgba(29,158,117,.08)" };
const ALERT_BORDA = { high: "rgba(224,90,75,.25)", medium: "rgba(239,159,39,.2)", low: "rgba(29,158,117,.2)" };

const DOMINIO_PT: Record<string, string> = {
  comunicacao: "Comunicação", social: "Social", atencao: "Atenção",
  regulacao: "Regulação", autonomia: "Autonomia", flexibilidade: "Flexibilidade",
  brincadeira: "Brincadeira", cognicao: "Cognição", motricidade: "Motricidade",
  communication: "Comunicação", attention: "Atenção", regulation: "Regulação",
  autonomy: "Autonomia", flexibility: "Flexibilidade", play: "Brincadeira", motivation: "Motivação",
};

const STATUS_HAB: Record<string, { label: string; cor: string; bg: string }> = {
  ausente: { label: "Ausente", cor: "#4d6d8a", bg: "rgba(77,109,138,.12)" },
  emergente: { label: "Emergente", cor: "#EF9F27", bg: "rgba(239,159,39,.12)" },
  em_aquisicao: { label: "Em aquisição", cor: "#378ADD", bg: "rgba(55,138,221,.12)" },
  dominada: { label: "Dominada", cor: "#1D9E75", bg: "rgba(29,158,117,.12)" },
};

const STATUS_COMP: Record<string, { label: string; cor: string }> = {
  monitorado: { label: "Monitorado", cor: "#EF9F27" },
  em_intervencao: { label: "Em intervenção", cor: "#E05A4B" },
  resolvido: { label: "Resolvido", cor: "#1D9E75" },
  ativo: { label: "Ativo", cor: "#E05A4B" },
  reduzindo: { label: "Reduzindo", cor: "#EF9F27" },
  controlado: { label: "Controlado", cor: "#1D9E75" },
};

const DOMINIOS = ["comunicacao", "social", "atencao", "regulacao", "brincadeira", "cognicao", "autonomia", "flexibilidade", "motricidade"];

function JornadaClinica({ jornada, jornadaAnterior, dominios, paciente, criancaId, onJornadaCriada }: {
  jornada: any
  jornadaAnterior: any
  dominios: any[]
  paciente: any
  criancaId: string
  onJornadaCriada: (j: any) => void
}) {
  const [criando, setCriando] = useState(false)
  const [modalNovaJornada, setModalNovaJornada] = useState(false)
  const [motivoNovo, setMotivoNovo] = useState("")
  const [modalRelatorio, setModalRelatorio] = useState(false)
  const [faseParaAvançar, setFaseParaAvançar] = useState<string>("")
  const [analiseClinica, setAnaliseClinica] = useState("")
  const [recomendacoes, setRecomendacoes] = useState("")
  const [gerandoRelatorio, setGerandoRelatorio] = useState(false)

  const FASES = [
    { id: "avaliacao", label: "Avaliação", icone: "📋" },
    { id: "intervencao", label: "Intervenção", icone: "🎯" },
    { id: "reavaliacao", label: "Reavaliação", icone: "🔄" },
    { id: "alta", label: "Alta", icone: "🏆" },
  ]

  const FASE_TAG: Record<string, { label: string; cor: string; bg: string }> = {
    avaliacao: { label: "Avaliação", cor: "#EF9F27", bg: "rgba(239,159,39,.12)" },
    intervencao: { label: "Intervenção", cor: "#378ADD", bg: "rgba(55,138,221,.12)" },
    generalizacao: { label: "Generalização", cor: "#8B7FE8", bg: "rgba(139,127,232,.12)" },
    dominado: { label: "Dominado", cor: "#1D9E75", bg: "rgba(29,158,117,.12)" },
  }

  const DOMINIO_PT: Record<string, string> = {
    comunicacao: "Comunicação", social: "Social", atencao: "Atenção",
    regulacao: "Regulação", autonomia: "Autonomia", flexibilidade: "Flexibilidade",
    brincadeira: "Brincadeira", cognicao: "Cognição", motivacao: "Motivação",
  }

  const card: React.CSSProperties = {
    background: "rgba(13,32,53,.75)",
    border: "1px solid rgba(70,120,180,.5)",
    borderRadius: 14,
    backdropFilter: "blur(8px)",
  }

  const inp: React.CSSProperties = {
    width: "100%", padding: "9px 12px", borderRadius: 8,
    border: "1px solid rgba(26,58,92,.5)",
    background: "rgba(13,32,53,.6)", color: "#e8f0f8",
    fontSize: 13, fontFamily: "var(--font-sans)",
    outline: "none", boxSizing: "border-box" as const,
  }

  async function criarPrimeiraJornada() {
    setCriando(true)
    const { data } = await supabase
      .from("jornada_clinica")
      .insert({
        paciente_id: criancaId,
        terapeuta_id: (await supabase.auth.getUser()).data.user?.id,
        fase_atual: "avaliacao",
        origem: "ffs",
        numero_ciclo: 1,
        status: "ativo",
      })
      .select()
      .single()
    if (data) onJornadaCriada(data)
    setCriando(false)
  }

  async function avancarFase(novaFase: string) {
    if (!jornada) return
    const historico = [...(jornada.historico_fases ?? []), {
      fase: jornada.fase_atual,
      data_inicio: jornada.data_inicio_fase,
      data_fim: new Date().toISOString(),
    }]
    await supabase
      .from("jornada_clinica")
      .update({
        fase_atual: novaFase,
        data_inicio_fase: new Date().toISOString(),
        historico_fases: historico,
        atualizado_em: new Date().toISOString(),
      })
      .eq("id", jornada.id)
    onJornadaCriada({ ...jornada, fase_atual: novaFase, historico_fases: historico })
  }

  async function gerarEAvancar(comRelatorio: boolean) {
    if (!jornada) return
    setGerandoRelatorio(true)
    try {
      if (comRelatorio) {
        // Busca dados para o relatório
        const { data: sessoes } = await supabase
          .from("sessoes_v2")
          .select("id, inicio, fim, duracao_segundos")
          .eq("crianca_id", criancaId)
          .eq("status", "finalizada")
          .gte("inicio", jornada.data_inicio_fase)
          .order("inicio", { ascending: false })

        const { data: summaries } = await supabase
          .from("session_summary")
          .select("taxa_geral, programas_json")
          .in("sessao_id", (sessoes ?? []).map((s: any) => s.id))

        const { data: habilidades } = await supabase
          .from("repertorio_habilidades")
          .select("dominio, habilidade, status, score, fonte")
          .eq("crianca_id", criancaId)
          .order("dominio")

        const { data: comportamentos } = await supabase
          .from("planos_comportamento_interferente")
          .select("comportamento, intensidade, status")
          .eq("crianca_id", criancaId)

        const { data: radares } = await supabase
          .from("radar_snapshots")
          .select("*")
          .eq("crianca_id", criancaId)
          .order("criado_em", { ascending: true })

        const radarInicio = radares?.[0] ? {
          comunicacao: radares[0].score_comunicacao, social: radares[0].score_social,
          atencao: radares[0].score_atencao, regulacao: radares[0].score_regulacao,
          brincadeira: radares[0].score_brincadeira, flexibilidade: radares[0].score_flexibilidade,
          autonomia: radares[0].score_autonomia, motivacao: radares[0].score_motivacao,
        } : undefined
        const radarFim = radares?.[radares.length - 1] ? {
          comunicacao: radares[radares.length - 1].score_comunicacao, social: radares[radares.length - 1].score_social,
          atencao: radares[radares.length - 1].score_atencao, regulacao: radares[radares.length - 1].score_regulacao,
          brincadeira: radares[radares.length - 1].score_brincadeira, flexibilidade: radares[radares.length - 1].score_flexibilidade,
          autonomia: radares[radares.length - 1].score_autonomia, motivacao: radares[radares.length - 1].score_motivacao,
        } : undefined

        // Agrega programas
        const progMap: Record<string, { taxas: number[]; sessoes: number }> = {}
        for (const s of summaries ?? []) {
          for (const p of (s.programas_json ?? [])) {
            if (!progMap[p.nome]) progMap[p.nome] = { taxas: [], sessoes: 0 }
            progMap[p.nome].taxas.push(p.taxa)
            progMap[p.nome].sessoes++
          }
        }
        const programas = Object.entries(progMap).map(([nome, d]) => ({
          nome, dominio: "—", sessoes: d.sessoes,
          taxaMedia: Math.round(d.taxas.reduce((a, b) => a + b, 0) / d.taxas.length),
          criterio: d.taxas.filter(t => t >= 80).length >= 3,
          status: "em_andamento",
        }))

        const taxaMedia = summaries && summaries.length > 0
          ? summaries.reduce((a, s) => a + (s.taxa_geral ?? 0), 0) / summaries.length
          : 0

        const { abrirRelatorioFasePDF } = await import("@/lib/relatorio-fase")
        abrirRelatorioFasePDF({
          pacienteNome: paciente?.nome ?? "—",
          pacienteDiagnostico: paciente?.diagnostico ?? "—",
          pacienteIdade: paciente?.data_nascimento
            ? `${Math.floor((Date.now() - new Date(paciente.data_nascimento).getTime()) / (1000 * 60 * 60 * 24 * 365.25))} anos`
            : "—",
          terapeutaNome: (await supabase.auth.getUser()).data.user?.email ?? "—",
          fase: jornada.fase_atual,
          numeroCiclo: jornada.numero_ciclo ?? 1,
          dataInicioFase: new Date(jornada.data_inicio_fase).toLocaleDateString("pt-BR"),
          dataFimFase: new Date().toLocaleDateString("pt-BR"),
          totalSessoes: sessoes?.length ?? 0,
          taxaMedia: Math.round(taxaMedia),
          analiseClinica,
          recomendacoes,
          programas,
          habilidades: (habilidades ?? []).map(h => ({ dominio: h.dominio, habilidade: h.habilidade, status: h.status, score: h.score, fonte: h.fonte ?? "" })),
          comportamentosInterferentes: (comportamentos ?? []).map(c => ({ comportamento: c.comportamento, intensidade: c.intensidade, status: c.status })),
          radarInicio,
          radarFim,
          avaliacoes: [],
        })

        // Salva relatório no banco
        await supabase.from("relatorios_fase").insert({
          jornada_id: jornada.id,
          crianca_id: criancaId,
          terapeuta_id: (await supabase.auth.getUser()).data.user?.id,
          fase: jornada.fase_atual,
          numero_ciclo: jornada.numero_ciclo ?? 1,
          data_inicio_fase: jornada.data_inicio_fase,
          data_fim_fase: new Date().toISOString(),
          total_sessoes: sessoes?.length ?? 0,
          taxa_media: Math.round(taxaMedia),
          analise_clinica: analiseClinica,
          recomendacoes,
        })
      }
      await avancarFase(faseParaAvançar)
    } finally {
      setGerandoRelatorio(false)
      setModalRelatorio(false)
      setAnaliseClinica("")
      setRecomendacoes("")
    }
  }

  async function iniciarNovoCirclo() {
    if (!jornada || !motivoNovo.trim()) return
    setCriando(true)

    // Encerra jornada atual
    await supabase
      .from("jornada_clinica")
      .update({ status: "concluido", atualizado_em: new Date().toISOString() })
      .eq("id", jornada.id)

    // Cria nova jornada
    const { data } = await supabase
      .from("jornada_clinica")
      .insert({
        paciente_id: criancaId,
        terapeuta_id: (await supabase.auth.getUser()).data.user?.id,
        fase_atual: "avaliacao",
        origem: jornada.origem,
        numero_ciclo: (jornada.numero_ciclo ?? 1) + 1,
        jornada_anterior_id: jornada.id,
        motivo_novo_ciclo: motivoNovo,
        status: "ativo",
      })
      .select()
      .single()

    if (data) onJornadaCriada(data)
    setModalNovaJornada(false)
    setMotivoNovo("")
    setCriando(false)
  }

  const faseAtualIdx = FASES.findIndex(f => f.id === jornada?.fase_atual)

  // Sem jornada ainda
  if (!jornada) return (
    <div style={{ ...card, padding: 32, textAlign: "center" }}>
      <div style={{ fontSize: 32, marginBottom: 16 }}>🗺️</div>
      <div style={{ fontSize: 15, fontWeight: 600, color: "#e8f0f8", marginBottom: 8 }}>
        Jornada Clínica não iniciada
      </div>
      <div style={{ fontSize: 13, color: "rgba(160,200,235,.7)", marginBottom: 24, lineHeight: 1.6 }}>
        Inicie a jornada clínica para organizar o tratamento em fases — avaliação, intervenção, reavaliação e alta.
      </div>
      <button
        onClick={criarPrimeiraJornada}
        disabled={criando}
        style={{ padding: "10px 24px", borderRadius: 9, border: "none", background: "linear-gradient(135deg,#1D9E75,#0f8f7a)", color: "#07111f", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "var(--font-sans)" }}
      >
        {criando ? "Criando..." : "Iniciar Jornada Clínica →"}
      </button>
    </div>
  )

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

      {/* Modal novo ciclo */}
      {modalNovaJornada && (
        <div onClick={() => setModalNovaJornada(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.65)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div onClick={e => e.stopPropagation()} style={{ ...card, padding: 28, width: "100%", maxWidth: 440 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: "#e8f0f8", marginBottom: 4 }}>Iniciar nova jornada</div>
            <div style={{ fontSize: 13, color: "rgba(160,200,235,.6)", marginBottom: 20, lineHeight: 1.6 }}>
              A jornada atual será concluída e um novo ciclo será iniciado na Fase de Avaliação.
            </div>
            <label style={{ fontSize: 11, color: "rgba(170,210,245,.5)", textTransform: "uppercase" as const, letterSpacing: ".08em", display: "block", marginBottom: 6 }}>
              Motivo do novo ciclo
            </label>
            <textarea
              value={motivoNovo}
              onChange={e => setMotivoNovo(e.target.value)}
              placeholder="Ex: Reavaliação identificou novos alvos em Regulação e Social avançado..."
              rows={3}
              style={{ ...inp, resize: "none" as const, marginBottom: 20 }}
            />
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setModalNovaJornada(false)} style={{ flex: 1, padding: 10, borderRadius: 9, border: "1px solid rgba(26,58,92,.5)", background: "transparent", color: "rgba(160,200,235,.5)", fontSize: 13, cursor: "pointer", fontFamily: "var(--font-sans)" }}>
                Cancelar
              </button>
              <button
                onClick={iniciarNovoCirclo}
                disabled={criando || !motivoNovo.trim()}
                style={{ flex: 2, padding: 10, borderRadius: 9, border: "none", background: motivoNovo.trim() ? "linear-gradient(135deg,#1D9E75,#0f8f7a)" : "rgba(26,58,92,.4)", color: motivoNovo.trim() ? "#07111f" : "rgba(160,200,235,.3)", fontWeight: 700, fontSize: 13, cursor: motivoNovo.trim() ? "pointer" : "not-allowed", fontFamily: "var(--font-sans)" }}
              >
                {criando ? "Criando..." : "Iniciar Jornada " + ((jornada.numero_ciclo ?? 1) + 1)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal relatório de fase */}
      {modalRelatorio && (
        <div onClick={() => setModalRelatorio(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", backdropFilter: "blur(4px)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div onClick={e => e.stopPropagation()} style={{ ...card, padding: 28, width: "100%", maxWidth: 500, maxHeight: "90vh", overflowY: "auto" as const }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#e8f0f8", marginBottom: 4 }}>
              Encerrar fase — {FASE_TAG[jornada?.fase_atual]?.label ?? jornada?.fase_atual}
            </div>
            <div style={{ fontSize: 12, color: "rgba(160,200,235,.5)", marginBottom: 20, lineHeight: 1.6 }}>
              Avançando para {FASE_TAG[faseParaAvançar]?.label ?? faseParaAvançar}. Você pode gerar um relatório clínico desta fase antes de avançar.
            </div>
            <label style={{ fontSize: 11, color: "rgba(170,210,245,.5)", textTransform: "uppercase" as const, letterSpacing: ".08em", display: "block", marginBottom: 6 }}>
              Análise clínica da fase
            </label>
            <textarea
              value={analiseClinica}
              onChange={e => setAnaliseClinica(e.target.value)}
              placeholder="Descreva os principais achados, progressos e observações clínicas desta fase..."
              rows={4}
              style={{ ...inp, resize: "none" as const, marginBottom: 16 }}
            />
            <label style={{ fontSize: 11, color: "rgba(170,210,245,.5)", textTransform: "uppercase" as const, letterSpacing: ".08em", display: "block", marginBottom: 6 }}>
              Recomendações para próxima fase
            </label>
            <textarea
              value={recomendacoes}
              onChange={e => setRecomendacoes(e.target.value)}
              placeholder="Alvos prioritários, ajustes de procedimento, encaminhamentos..."
              rows={3}
              style={{ ...inp, resize: "none" as const, marginBottom: 20 }}
            />
            <div style={{ display: "flex", flexDirection: "column" as const, gap: 8 }}>
              <button
                onClick={() => gerarEAvancar(true)}
                disabled={gerandoRelatorio}
                style={{ padding: "12px", borderRadius: 9, border: "none", background: "linear-gradient(135deg,#1D9E75,#0f8f7a)", color: "#07111f", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "var(--font-sans)", opacity: gerandoRelatorio ? 0.7 : 1 }}
              >
                {gerandoRelatorio ? "Gerando..." : "Gerar relatório PDF e avançar fase"}
              </button>
              <button
                onClick={() => gerarEAvancar(false)}
                disabled={gerandoRelatorio}
                style={{ padding: "10px", borderRadius: 9, border: "1px solid rgba(70,120,180,.4)", background: "transparent", color: "rgba(160,200,235,.5)", fontSize: 12, cursor: "pointer", fontFamily: "var(--font-sans)" }}
              >
                Avançar fase sem relatório
              </button>
              <button
                onClick={() => setModalRelatorio(false)}
                style={{ padding: "8px", borderRadius: 9, border: "none", background: "transparent", color: "rgba(160,200,235,.3)", fontSize: 12, cursor: "pointer", fontFamily: "var(--font-sans)" }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header — ciclo atual */}
      <div style={{ ...card, padding: 20 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <span style={{ fontSize: 15, fontWeight: 600, color: "#e8f0f8" }}>
                Jornada {jornada.numero_ciclo}
              </span>
              <span style={{ fontSize: 12, color: "rgba(160,200,235,.5)" }}>
                — ciclo atual
              </span>
            </div>
            <div style={{ fontSize: 12, color: "rgba(160,200,235,.5)" }}>
              Iniciada em {new Date(jornada.data_inicio).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
              {jornada.motivo_novo_ciclo && (
                <span style={{ marginLeft: 8, color: "rgba(160,200,235,.4)" }}>
                  · {jornada.motivo_novo_ciclo}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={() => setModalNovaJornada(true)}
            style={{ padding: "7px 14px", borderRadius: 8, border: "1px solid rgba(139,127,232,.3)", background: "rgba(139,127,232,.08)", color: "#8B7FE8", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-sans)" }}
          >
            + Nova jornada
          </button>
        </div>

        {/* Barra de fases */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 0, marginBottom: 16 }}>
          {FASES.map((fase, idx) => {
            const concluida = idx < faseAtualIdx
            const ativa = idx === faseAtualIdx
            const cor = ativa ? "#EF9F27" : concluida ? "#1D9E75" : "rgba(26,58,92,.5)"
            return (
              <div key={fase.id} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, position: "relative" }}>
                {idx < FASES.length - 1 && (
                  <div style={{ position: "absolute", top: 14, left: "60%", width: "80%", height: 2, background: concluida ? "#1D9E75" : "rgba(26,58,92,.4)", zIndex: 0 }} />
                )}
                <div style={{ width: 28, height: 28, borderRadius: "50%", border: `2px solid ${cor}`, background: concluida ? "#1D9E75" : ativa ? "transparent" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: concluida ? "#fff" : cor, zIndex: 1, position: "relative" }}>
                  {concluida ? "✓" : fase.icone}
                </div>
                <div style={{ fontSize: 11, color: cor, textAlign: "center", fontWeight: ativa ? 600 : 400 }}>
                  {fase.label}
                </div>
                {ativa && (
                  <button
                    onClick={() => { setFaseParaAvançar(FASES[idx + 1]?.id ?? ""); setModalRelatorio(true) }}
                    style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, border: "1px solid rgba(239,159,39,.3)", background: "rgba(239,159,39,.08)", color: "#EF9F27", cursor: "pointer", fontFamily: "var(--font-sans)" }}
                  >
                    Avançar →
                  </button>
                )}
              </div>
            )
          })}
        </div>

        {/* Previsão */}
        <div style={{ padding: "10px 14px", background: "rgba(239,159,39,.08)", border: "1px solid rgba(239,159,39,.2)", borderRadius: 9, fontSize: 13, color: "#EF9F27" }}>
          Fase atual: <strong>{FASES[faseAtualIdx]?.label ?? "—"}</strong>
          {jornada.previsao_proxima_fase && (
            <span style={{ color: "rgba(239,159,39,.7)", marginLeft: 8 }}>
              · Próxima fase prevista: {new Date(jornada.previsao_proxima_fase).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
            </span>
          )}
        </div>
      </div>

      {/* Domínios desta jornada */}
      {dominios.length > 0 && (
        <div style={{ ...card, padding: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#e8f0f8", marginBottom: 14 }}>
            Domínios — Jornada {jornada.numero_ciclo}
          </div>
          {dominios.map(d => {
            const ft = FASE_TAG[d.fase] ?? FASE_TAG.avaliacao
            const pct = d.score_atual ?? 0
            return (
              <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                <div style={{ width: 110, fontSize: 13, color: "#e8f0f8", flexShrink: 0 }}>
                  {DOMINIO_PT[d.dominio] ?? d.dominio}
                </div>
                <div style={{ flex: 1, height: 6, background: "rgba(26,58,92,.5)", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${pct}%`, background: pct >= 80 ? "#1D9E75" : pct >= 50 ? "#EF9F27" : "#E05A4B", borderRadius: 3 }} />
                </div>
                <div style={{ width: 36, fontSize: 12, color: "rgba(160,200,235,.5)", textAlign: "right", flexShrink: 0 }}>
                  {Math.round(pct)}%
                </div>
                <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: ft.bg, color: ft.cor, flexShrink: 0, fontWeight: 500 }}>
                  {ft.label}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {/* Jornada anterior */}
      {jornadaAnterior && (
        <div style={{ ...card, padding: 20, opacity: 0.85 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <div style={{ width: 26, height: 26, borderRadius: "50%", background: "rgba(26,58,92,.5)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "rgba(160,200,235,.7)", fontWeight: 600 }}>
              {jornadaAnterior.numero_ciclo}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#e8f0f8" }}>
                Jornada {jornadaAnterior.numero_ciclo} — concluída
              </div>
              <div style={{ fontSize: 12, color: "rgba(160,200,235,.5)" }}>
                {new Date(jornadaAnterior.data_inicio).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
                {jornadaAnterior.atualizado_em && ` – ${new Date(jornadaAnterior.atualizado_em).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}`}
              </div>
            </div>
            <span style={{ marginLeft: "auto", fontSize: 11, padding: "2px 8px", borderRadius: 20, background: "rgba(29,158,117,.12)", color: "#1D9E75", fontWeight: 500 }}>
              Concluída
            </span>
          </div>

          {jornadaAnterior.dominios?.length > 0 && (
            <div>
              <div style={{ fontSize: 12, color: "rgba(160,200,235,.5)", marginBottom: 10 }}>Domínios trabalhados</div>
              {jornadaAnterior.dominios.map((d: any) => {
                const ft = FASE_TAG[d.fase] ?? FASE_TAG.avaliacao
                const pct = d.score_atual ?? 0
                return (
                  <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                    <div style={{ width: 110, fontSize: 12, color: "rgba(160,200,235,.7)", flexShrink: 0 }}>
                      {DOMINIO_PT[d.dominio] ?? d.dominio}
                    </div>
                    <div style={{ flex: 1, height: 5, background: "rgba(26,58,92,.5)", borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${pct}%`, background: pct >= 80 ? "#1D9E75" : pct >= 50 ? "#EF9F27" : "#E05A4B", borderRadius: 3 }} />
                    </div>
                    <div style={{ width: 36, fontSize: 11, color: "rgba(160,200,235,.4)", textAlign: "right", flexShrink: 0 }}>
                      {Math.round(pct)}%
                    </div>
                    <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, background: ft.bg, color: ft.cor, flexShrink: 0 }}>
                      {ft.label}
                    </span>
                  </div>
                )
              })}
            </div>
          )}

          {jornadaAnterior.motivo_novo_ciclo && (
            <div style={{ marginTop: 12, padding: "10px 12px", background: "rgba(26,58,92,.2)", borderRadius: 9, fontSize: 12, color: "rgba(160,200,235,.6)", lineHeight: 1.6 }}>
              <span style={{ color: "rgba(160,200,235,.4)" }}>Motivo do novo ciclo: </span>
              {jornadaAnterior.motivo_novo_ciclo}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── PAGE ────────────────────────────────────────────────────────────────────
export default function PerfilPacientePage() {
  const { terapeuta } = useClinicContext();
  const params = useParams();
  const nivel = terapeuta?.nivel ?? "coordenador";

  //Jornada clínica
  const [jornada, setJornada] = useState<any>(null)
  const [jornadaAnterior, setJornadaAnterior] = useState<any>(null)
  const [jornadaDominios, setJornadaDominios] = useState<any[]>([])


  const [sugestoes, setSugestoes] = useState<any[]>([])
  const [aprovando, setAprovando] = useState<string | null>(null)


  const [data, setData] = useState<LearnerProfile | null>(null);
  const [habilidades, setHabilidades] = useState<Habilidade[]>([]);
  const [comportamentos, setComportamentos] = useState<Comportamento[]>([]);
  const [variaveis, setVariaveis] = useState<VariaveisClinicas | null>(null);
  const [tab, setTab] = useState<Tab>("visao-geral");
  const [loading, setLoading] = useState(true);
  const [responsaveis, setResponsaveis] = useState<{ id: string; nome: string; email: string; tipo: string }[]>([]);

  // Modal de adicionar habilidade
  const [modalHab, setModalHab] = useState(false);
  const [novaHab, setNovaHab] = useState({ dominio: "comunicacao", habilidade: "", operante: "", status: "ausente" as Habilidade["status"] });
  const [salvandoHab, setSalvandoHab] = useState(false);

  // Modal de adicionar comportamento
  const [modalComp, setModalComp] = useState(false);
  const [dominiosExpandidos, setDominiosExpandidos] = useState<string[]>([]);
  const [novoComp, setNovoComp] = useState({ nome: "", topografia: "", funcao: "fuga", intensidade: "leve", contexto: "" });
  const [salvandoComp, setSalvandoComp] = useState(false);

  useEffect(() => {
    async function carregar() {
      setLoading(true);
      try {
        const criancaId = params.id as string;

        // 1. Dados da criança
        const { data: crianca } = await supabase
          .from("criancas")
          .select("id, nome, data_nascimento, diagnostico")
          .eq("id", criancaId)
          .single();

        // 2. Radar snapshots
        const { data: radares } = await supabase
          .from("radar_snapshots")
          .select("score_comunicacao, score_social, score_atencao, score_regulacao, score_brincadeira, score_flexibilidade, score_autonomia, score_motivacao, criado_em")
          .eq("crianca_id", criancaId)
          .order("criado_em", { ascending: true });

        // 3. Planos ativos
        const { data: planos } = await supabase
          .from("planos")
          .select("id, status, score_atual, programas ( id, nome, dominio )")
          .eq("crianca_id", criancaId)
          .order("criado_em", { ascending: false });

        // 4. Responsáveis vinculados
        const { data: vinculos } = await supabase
          .from("crianca_responsaveis")
          .select("tipo, responsavel_id")
          .eq("crianca_id", criancaId);

        if (vinculos && vinculos.length > 0) {
          const respIds = vinculos.map((v: any) => v.responsavel_id);
          const { data: perfis } = await supabase
            .from("profiles")
            .select("id, nome, email")
            .in("id", respIds);
          if (perfis) {
            setResponsaveis(perfis.map((p: any) => ({
              id: p.id,
              nome: p.nome ?? p.email ?? "Responsável",
              email: p.email ?? "",
              tipo: vinculos.find((v: any) => v.responsavel_id === p.id)?.tipo ?? "primario",
            })));
          }
        }

        // 5. Repertório de habilidades
        const { data: habs } = await supabase
          .from("repertorio_habilidades")
          .select("*")
          .eq("crianca_id", criancaId)
          .order("dominio");
        setHabilidades(habs ?? []);

        // 6. Comportamentos interferentes
        const { data: comps } = await supabase
          .from("planos_comportamento_interferente")
          .select("*")
          .eq("crianca_id", criancaId)
          .order("intensidade");
        setComportamentos(comps ?? []);

        // 7. Variáveis clínicas
        const { data: vars } = await supabase
          .from("variaveis_clinicas")
          .select("*")
          .eq("crianca_id", criancaId)
          .single();
        if (vars) setVariaveis(vars);


        // 8. Jornada clínica
        const { data: jornadaAtiva } = await supabase
          .from("jornada_clinica")
          .select("*")
          .eq("paciente_id", criancaId)
          .eq("status", "ativo")
          .single()

        if (jornadaAtiva) {
          setJornada(jornadaAtiva)

          const { data: dominiosJ } = await supabase
            .from("jornada_dominios")
            .select("*")
            .eq("jornada_id", jornadaAtiva.id)
            .order("score_atual", { ascending: true })
          setJornadaDominios(dominiosJ ?? [])

          if (jornadaAtiva.jornada_anterior_id) {
            const { data: anterior } = await supabase
              .from("jornada_clinica")
              .select("*")
              .eq("id", jornadaAtiva.jornada_anterior_id)
              .single()

            if (anterior) {
              const { data: dominiosAnt } = await supabase
                .from("jornada_dominios")
                .select("*")
                .eq("jornada_id", anterior.id)
              setJornadaAnterior({ ...anterior, dominios: dominiosAnt ?? [] })
            }
          }
        }

        // 9. Sugestões pendentes
        const { data: sugestoesData, error: sugestoesError } = await supabase
          .from("plano_sugestoes")
          .select("*")
          .eq("crianca_id", criancaId)
          .eq("status", "pendente")
          .order("criado_em", { ascending: false })

        setSugestoes(sugestoesData ?? [])

        // Mapear radar
        const radarFormatado: RadarSnapshot[] = (radares ?? []).map((r: any, i: number) => ({
          date: `Semana ${(i + 1) * 4}`,
          communication: r.score_comunicacao ?? 0,
          social: r.score_social ?? 0,
          attention: r.score_atencao ?? 0,
          regulation: r.score_regulacao ?? 0,
          autonomy: r.score_autonomia ?? 0,
          flexibility: r.score_flexibilidade ?? 0,
          play: r.score_brincadeira ?? 0,
          motivation: r.score_motivacao ?? 0,
        }));

        if (radarFormatado.length === 0) {
          // sem radar ainda — não injeta dados falsos
        }

        // Mapear programas
        const programs: Program[] = (planos ?? [])
          .filter((pl: any) => pl.programas)
          .map((pl: any) => {
            const prog = pl.programas as any;
            const score = pl.score_atual ?? 50;
            return {
              id: pl.id, name: prog.nome, domain: prog.dominio,
              status: pl.status === "pausado" ? "stalled" : score >= 80 ? "completed" : "active",
              success: score, independence: Math.max(0, score - 15),
            };
          });

        // Alertas automáticos
        const alerts: ClinicalAlert[] = [];
        for (const pl of (planos ?? [])) {
          const prog = (pl as any).programas as any;
          if (!prog) continue;
          const score = (pl as any).score_atual ?? 0;
          if (score > 0 && score < 50) alerts.push({ id: pl.id + "_h", title: "Score baixo", description: `${prog.nome} com ${score}%`, level: "high" });
          else if (score >= 80) alerts.push({ id: pl.id + "_l", title: "Próximo de critério", description: `${prog.nome} atingiu ${score}%`, level: "low" });
        }

        const idade = crianca?.data_nascimento
          ? Math.floor((Date.now() - new Date(crianca.data_nascimento).getTime()) / (1000 * 60 * 60 * 24 * 365.25))
          : 0;

        setData({
          id: criancaId,
          name: crianca?.nome ?? "Paciente",
          age: idade,
          diagnosis: crianca?.diagnostico ?? "Não informado",
          radar: radarFormatado,
          programs,
          alerts,
        });
      } catch (err) {
        console.error("Erro ao carregar perfil:", err);
      }
      setLoading(false);
    }
    carregar();
  }, [params.id]);

  // Adicionar habilidade
  async function adicionarHabilidade() {
    if (!novaHab.habilidade.trim()) return;
    setSalvandoHab(true);
    await supabase.from("repertorio_habilidades").insert({
      crianca_id: params.id,
      dominio: novaHab.dominio,
      habilidade: novaHab.habilidade,
      operante: novaHab.operante || null,
      status: novaHab.status,
      score: novaHab.status === "dominada" ? 100 : novaHab.status === "em_aquisicao" ? 50 : novaHab.status === "emergente" ? 20 : 0,
    });
    const { data: habs } = await supabase.from("repertorio_habilidades").select("*").eq("crianca_id", params.id).order("dominio");
    setHabilidades(habs ?? []);
    setModalHab(false);
    setNovaHab({ dominio: "comunicacao", habilidade: "", operante: "", status: "ausente" });
    setSalvandoHab(false);
  }

  // Adicionar comportamento
  async function adicionarComportamento() {
    if (!novoComp.nome.trim()) return;
    setSalvandoComp(true);
    await supabase.from("planos_comportamento_interferente").insert({
      crianca_id: params.id,
      nome: novoComp.nome,
      topografia: novoComp.topografia || null,
      funcao: novoComp.funcao,
      intensidade: novoComp.intensidade,
      contexto: novoComp.contexto || null,
      status: "ativo",
    });
    const { data: comps } = await supabase.from("planos_comportamento_interferente").select("*").eq("crianca_id", params.id).order("intensidade");
    setComportamentos(comps ?? []);
    setModalComp(false);
    setNovoComp({ nome: "", topografia: "", funcao: "fuga", intensidade: "leve", contexto: "" });
    setSalvandoComp(false);
  }

  const latest = data?.radar && data.radar.length > 0 ? data.radar[data.radar.length - 1] : undefined;

  const radarData = useMemo(() => {
    if (!latest) return [];
    return [
      { domain: "Comunicação", value: latest?.communication ?? 0 },
      { domain: "Social", value: latest?.social ?? 0 },
      { domain: "Atenção", value: latest?.attention ?? 0 },
      { domain: "Regulação", value: latest?.regulation ?? 0 },
      { domain: "Autonomia", value: latest?.autonomy ?? 0 },
      { domain: "Flexibilidade", value: latest?.flexibility ?? 0 },
      { domain: "Brincadeira", value: latest?.play ?? 0 },
      { domain: "Motivação", value: latest?.motivation ?? 0 },
    ];
  }, [latest]);

  const evolutionData = useMemo(() => {
    if (!data) return [];
    return (data.radar ?? []).map(r => ({
      date: r?.date ?? '',
      Comunicação: r?.communication ?? 0,
      Atenção: r?.attention ?? 0,
      Regulação: r?.regulation ?? 0,
      Social: r?.social ?? 0,
    }));
  }, [data]);

  const summary = useMemo(() => {
    if (!data || !latest) return null;
    const activeProgs = data.programs.filter(p => p.status === "active").length;
    const avgSuccess = data.programs.length > 0
      ? Math.round(data.programs.reduce((a, p) => a + p.success, 0) / data.programs.length)
      : 0;
    const radarValues = [latest?.communication ?? 0, latest?.social ?? 0, latest?.attention ?? 0, latest?.regulation ?? 0, latest?.autonomy ?? 0, latest?.flexibility ?? 0, latest?.play ?? 0, latest?.motivation ?? 0];
    const avg = Math.round(radarValues.reduce((a, b) => a + b, 0) / radarValues.length);
    const weakest = Object.entries({ Comunicação: latest?.communication ?? 0, Atenção: latest?.attention ?? 0, Regulação: latest?.regulation ?? 0, Flexibilidade: latest?.flexibility ?? 0 }).sort((a, b) => a[1] - b[1])[0];
    const strongest = Object.entries({ Autonomia: latest?.autonomy ?? 0, Social: latest?.social ?? 0, Motivação: latest?.motivation ?? 0, Brincadeira: latest?.play ?? 0 }).sort((a, b) => b[1] - a[1])[0];
    const habDominadas = habilidades.filter(h => h.status === "dominada").length;
    const habEmerg = habilidades.filter(h => h.status === "emergente" || h.status === "em_aquisicao").length;
    return { activeProgs, avgSuccess, avg, weakest, strongest, habDominadas, habEmerg };
  }, [data, latest, habilidades]);

  const insights = useMemo(() => {
    if (!data || !latest || !summary) return [];
    const out: string[] = [];
    if ((latest?.communication ?? 0) < 60 && (latest?.social ?? 0) >= 60) out.push("Boa base social disponível para ampliar comunicação funcional com alta chance de ganho clínico.");
    if ((latest?.attention ?? 0) >= 50) out.push("Atenção sustentada já sustenta programas mais estruturados e instruções de 1–2 passos.");
    if (summary.weakest[0] === "Flexibilidade") out.push("Flexibilidade é o domínio mais sensível — deve entrar como alvo transversal na rotina clínica.");
    if (data.programs.some(p => p.status === "stalled")) out.push("Existe programa em estagnação — revisar critério, nível de dica ou reforçadores.");
    if (habilidades.filter(h => h.status === "em_aquisicao").length > 0) out.push(`${habilidades.filter(h => h.status === "em_aquisicao").length} habilidade(s) em aquisição — sessões frequentes aumentam velocidade de consolidação.`);
    return out.slice(0, 4);
  }, [data, latest, summary, habilidades]);

  const forecastResults = useMemo<ForecastResult[]>(() => {
    if (!data) return [];
    return FORECAST_GOALS.map(goal => generateForecastFromProfile(goal, {
      radar: data.radar, skills: [], programs: data.programs, alerts: data.alerts, adherence: 68,
    }));
  }, [data]);

  // CSS
  const card: React.CSSProperties = { background: "rgba(13,32,53,.75)", border: "1px solid rgba(70,120,180,.5)", borderRadius: 14, backdropFilter: "blur(8px)" };
  const lbl: React.CSSProperties = { fontSize: ".6rem", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: ".09em", color: "rgba(170,210,245,.88)", marginBottom: 8 };
  const inp: React.CSSProperties = { width: "100%", padding: "9px 11px", borderRadius: 8, border: "1px solid rgba(26,58,92,.5)", background: "rgba(13,32,53,.6)", color: "#e8f0f8", fontSize: 13, fontFamily: "var(--font-sans)", outline: "none", boxSizing: "border-box" as const };

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 400 }}>
      <div style={{ fontSize: ".85rem", color: "rgba(160,200,235,.84)" }}>Carregando perfil...</div>
    </div>
  );
  if (!data) return null;

  const TABS: { id: Tab; label: string }[] = [
    { id: "visao-geral", label: "Visão geral" },
    { id: "jornada", label: "Jornada Clínica" }, // ← nova
    { id: "programas", label: "Programas" },
    { id: "skill-graph", label: "Skill Graph" },
    { id: "forecast", label: "Forecast" },
    { id: "avaliacoes", label: "Avaliações" },
    { id: "historico", label: "Histórico" },
    { id: "contrato", label: "Contrato" },
  ];

  // Habilidades agrupadas por domínio
  const habsPorDominio = DOMINIOS.reduce((acc, dom) => {
    const habs = habilidades.filter(h => h.dominio === dom);
    if (habs.length > 0) acc[dom] = habs;
    return acc;
  }, {} as Record<string, Habilidade[]>);

  async function aprovarSugestao(sugestao: any) {
    setAprovando(sugestao.id)

    const { data: planoAtivo, error: errPlano } = await supabase
      .from("planos")
      .select("id")
      .eq("crianca_id", params.id as string)
      .eq("status", "ativo")
      .maybeSingle()

    let planoId = planoAtivo?.id
    if (!planoId) { setAprovando(null); return }

    // 3. Cria programa se não existir
    const { data: progExistente, error: errProg } = await supabase
      .from("programas")
      .select("id")
      .eq("nome", sugestao.nome_programa)
      .maybeSingle()

    let programaId: string | null = progExistente?.id ?? null

    if (!programaId) {
      const { data: novoProg, error: errNovo } = await supabase
        .from("programas")
        .insert({
          nome: sugestao.nome_programa,
          dominio: sugestao.dominio ?? "",
          operante: sugestao.operante ?? "",
          tipo_registro: sugestao.tipo_registro ?? "dtt",
          objetivo: `Desenvolver ${sugestao.nome_programa}`,  // ← adicione
          ativo: true,
        })
        .select("id")
        .single()
      programaId = novoProg?.id ?? null
    }

    if (!programaId) { setAprovando(null); return }

    const { data: planoProg, error: errPP } = await supabase
      .from("plano_programas")
      .insert({
        plano_id: planoId,
        programa_id: programaId,
        status: "ativo",
      })
      .select("id")
      .single()

    await supabase
      .from("plano_sugestoes")
      .update({
        status: "aprovado",
        aprovado_por: terapeuta?.id,
        aprovado_em: new Date().toISOString(),
        plano_programa_id: planoProg?.id ?? null,
      })
      .eq("id", sugestao.id)

    setSugestoes(prev => prev.filter(s => s.id !== sugestao.id))
    setAprovando(null)
  }

  async function rejeitarSugestao(id: string) {
    await supabase
      .from("plano_sugestoes")
      .update({ status: "rejeitado", atualizado_em: new Date().toISOString() })
      .eq("id", id)
    setSugestoes(prev => prev.filter(s => s.id !== id))
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 52, height: 52, borderRadius: "50%", background: "linear-gradient(135deg,#1D9E75,#378ADD)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".88rem", fontWeight: 800, color: "#fff", flexShrink: 0 }}>
            {data.name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase()}
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <h1 style={{ fontSize: "1.3rem", fontWeight: 800, color: "#e8f0f8", letterSpacing: "-.01em", margin: 0 }}>{data.name}</h1>
              {responsaveis.length > 0 && <span style={{ fontSize: ".68rem", background: "rgba(55,138,221,.12)", border: "1px solid rgba(55,138,221,.25)", color: "#378ADD", borderRadius: 20, padding: "2px 9px", fontWeight: 600 }}>FractaCare ativo</span>}
            </div>
            <div style={{ fontSize: ".78rem", color: "rgba(160,200,235,.90)" }}>{data.age} anos · {data.diagnosis}</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link href="/clinic/dashboard" style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, border: "1px solid rgba(70,120,180,.5)", background: "transparent", color: "rgba(160,200,235,.90)", fontSize: ".78rem", fontWeight: 500, textDecoration: "none" }}>
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M10 3L5 8l5 5" /></svg>
            Dashboard
          </Link>
          <Link href={`/clinic/sessao?pacienteId=${data.id}`} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 18px", borderRadius: 8, border: "none", background: "linear-gradient(135deg,#1D9E75,#0f8f7a)", color: "#07111f", fontSize: ".82rem", fontWeight: 800, textDecoration: "none" }}>
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="8" cy="8" r="6" /><path d="M8 5v3l2 1.5" /></svg>
            Iniciar sessão
          </Link>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 10, marginBottom: 20 }}>
        {[
          { l: "Média radar", v: summary ? `${summary.avg}%` : "—", c: summary && summary.avg >= 70 ? "#1D9E75" : summary && summary.avg >= 50 ? "#EF9F27" : "#E05A4B" },
          { l: "Habs. dominadas", v: summary?.habDominadas ?? 0, c: "#1D9E75" },
          { l: "Em aquisição", v: summary?.habEmerg ?? 0, c: "#EF9F27" },
          { l: "Programas ativos", v: summary?.activeProgs ?? 0, c: "#378ADD" },
        ].map(k => (
          <div key={k.l} style={{ ...card, padding: "14px 16px" }}>
            <div style={{ fontSize: ".6rem", color: "rgba(170,210,245,.88)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 6 }}>{k.l}</div>
            <div style={{ fontSize: "1.6rem", fontWeight: 800, color: k.c, letterSpacing: "-.02em", lineHeight: 1 }}>{k.v}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 0, borderBottom: "1px solid rgba(26,58,92,.4)", marginBottom: 20, overflowX: "auto" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: "10px 18px", background: "none", border: "none", whiteSpace: "nowrap",
            borderBottom: `2px solid ${tab === t.id ? "#1D9E75" : "transparent"}`,
            color: tab === t.id ? "#1D9E75" : "rgba(160,200,235,.84)",
            fontFamily: "var(--font-sans)", fontWeight: tab === t.id ? 600 : 400,
            fontSize: ".82rem", cursor: "pointer", transition: "color .15s", marginBottom: -1,
          }}>{t.label}</button>
        ))}
      </div>

      {/* ── VISÃO GERAL ── */}
      {tab === "visao-geral" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Radar + Evolução */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

            {/* Radar */}
            <div style={{ ...card, padding: 20 }}>
              <div style={{ fontSize: ".88rem", fontWeight: 700, color: "#e8f0f8", marginBottom: 4 }}>Mapa de desenvolvimento</div>
              <div style={{ fontSize: ".7rem", color: "rgba(160,200,235,.84)", marginBottom: 16 }}>Leitura atual dos domínios do repertório</div>
              <div style={{ height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="rgba(26,58,92,.6)" />
                    <PolarAngleAxis dataKey="domain" tick={{ fill: "rgba(160,200,235,.92)", fontSize: 11 }} />
                    <Radar name="Desenvolvimento" dataKey="value" stroke="#1D9E75" fill="#1D9E75" fillOpacity={0.15} strokeWidth={1.5} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Evolução longitudinal */}
            <div style={{ ...card, padding: 20 }}>
              <div style={{ fontSize: ".88rem", fontWeight: 700, color: "#e8f0f8", marginBottom: 4 }}>Evolução longitudinal</div>
              <div style={{ fontSize: ".7rem", color: "rgba(160,200,235,.84)", marginBottom: 16 }}>Mudança observada nas últimas medições</div>
              <div style={{ height: 200, marginBottom: 10 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={evolutionData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(26,58,92,.5)" />
                    <XAxis dataKey="date" stroke="rgba(165,208,242,.85)" tick={{ fill: "rgba(160,200,235,.84)", fontSize: 10 }} />
                    <YAxis domain={[0, 100]} stroke="rgba(165,208,242,.85)" tick={{ fill: "rgba(160,200,235,.84)", fontSize: 10 }} />
                    <Tooltip contentStyle={{ background: "#0d2035", border: "1px solid rgba(26,58,92,.7)", borderRadius: 10, color: "#e8f0f8", fontSize: 12 }} />
                    <Line type="monotone" dataKey="Comunicação" stroke="#1D9E75" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="Atenção" stroke="#378ADD" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="Regulação" stroke="#EF9F27" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="Social" stroke="#8B7FE8" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                {[["#1D9E75", "Comunicação"], ["#378ADD", "Atenção"], ["#EF9F27", "Regulação"], ["#8B7FE8", "Social"]].map(([c, l]) => (
                  <div key={l} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <div style={{ width: 10, height: 3, background: c, borderRadius: 2 }} />
                    <span style={{ fontSize: ".68rem", color: "rgba(160,200,235,.84)" }}>{l}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Repertório de habilidades */}
          <div style={{ ...card, padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: ".88rem", fontWeight: 700, color: "#e8f0f8" }}>Repertório de habilidades</div>
                <div style={{ fontSize: ".7rem", color: "rgba(160,200,235,.84)", marginTop: 2 }}>Estado atual por domínio — atualizado por sessões e avaliações</div>
              </div>
              <button onClick={() => setModalHab(true)} style={{ padding: "7px 14px", borderRadius: 8, border: "1px solid rgba(29,158,117,.3)", background: "rgba(29,158,117,.08)", color: "#1D9E75", fontSize: ".75rem", fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-sans)" }}>
                + Habilidade
              </button>
            </div>

            {habilidades.length === 0 ? (
              <div style={{ textAlign: "center", padding: "24px 0", color: "rgba(160,200,235,.3)", fontSize: ".82rem" }}>
                Nenhuma habilidade registrada ainda — adicione ou finalize uma sessão para popular o repertório
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {Object.entries(habsPorDominio).map(([dom, habs]) => {
                  const dominadas = habs.filter(h => h.status === "dominada").length;
                  const emAquisicao = habs.filter(h => h.status === "em_aquisicao").length;
                  const scoreMedia = habs.length > 0 ? Math.round(habs.reduce((acc, h) => acc + h.score, 0) / habs.length) : 0;
                  const expandido = dominiosExpandidos.includes(dom);
                  return (
                    <div key={dom} style={{ background: "rgba(26,58,92,.15)", borderRadius: 10, border: "1px solid rgba(26,58,92,.4)", overflow: "hidden" }}>
                      {/* Header do domínio — clicável */}
                      <button
                        onClick={() => setDominiosExpandidos(prev => prev.includes(dom) ? prev.filter(d => d !== dom) : [...prev, dom])}
                        style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-sans)", textAlign: "left" }}
                      >
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                            <span style={{ fontSize: ".78rem", fontWeight: 700, color: "#e8f0f8", textTransform: "uppercase", letterSpacing: ".06em" }}>{DOMINIO_PT[dom] ?? dom}</span>
                            <span style={{ fontSize: ".62rem", color: "rgba(170,210,245,.5)" }}>{habs.length} habilidades</span>
                          </div>
                          <div style={{ display: "flex", gap: 8 }}>
                            {dominadas > 0 && <span style={{ fontSize: ".6rem", color: "#1D9E75", background: "rgba(29,158,117,.1)", borderRadius: 20, padding: "1px 7px" }}>{dominadas} dominadas</span>}
                            {emAquisicao > 0 && <span style={{ fontSize: ".6rem", color: "#378ADD", background: "rgba(55,138,221,.1)", borderRadius: 20, padding: "1px 7px" }}>{emAquisicao} em aquisição</span>}
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                          <div style={{ textAlign: "right" }}>
                            <div style={{ fontSize: ".82rem", fontWeight: 700, color: scoreMedia >= 70 ? "#1D9E75" : scoreMedia >= 40 ? "#EF9F27" : "#E05A4B" }}>{scoreMedia}%</div>
                            <div style={{ width: 60, height: 3, background: "rgba(26,58,92,.5)", borderRadius: 2, overflow: "hidden", marginTop: 3 }}>
                              <div style={{ height: "100%", width: `${scoreMedia}%`, background: scoreMedia >= 70 ? "#1D9E75" : scoreMedia >= 40 ? "#EF9F27" : "#E05A4B" }} />
                            </div>
                          </div>
                          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="rgba(160,200,235,.5)" strokeWidth="1.5" style={{ transform: expandido ? "rotate(180deg)" : "rotate(0deg)", transition: "transform .2s" }}>
                            <path d="M3 6l5 5 5-5" />
                          </svg>
                        </div>
                      </button>
                      {/* Itens expandidos */}
                      {expandido && (
                        <div style={{ padding: "0 14px 14px", display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {habs.map(h => {
                            const st = STATUS_HAB[h.status];
                            return (
                              <div key={h.id} style={{ padding: "8px 12px", background: st.bg, border: `1px solid ${st.cor}33`, borderRadius: 9, minWidth: 140 }}>
                                <div style={{ fontSize: ".75rem", fontWeight: 600, color: "#e8f0f8", marginBottom: 4 }}>{h.habilidade}</div>
                                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                  <span style={{ fontSize: ".62rem", color: st.cor, fontWeight: 600 }}>{st.label}</span>
                                  {h.operante && <span style={{ fontSize: ".58rem", color: "rgba(160,200,235,.35)" }}>{h.operante}</span>}
                                  {h.fonte && <span style={{ fontSize: ".58rem", color: "rgba(160,200,235,.25)", background: "rgba(26,58,92,.3)", borderRadius: 4, padding: "1px 5px" }}>{h.fonte.toUpperCase()}</span>}
                                </div>
                                {h.score > 0 && (
                                  <div style={{ marginTop: 6, height: 3, background: "rgba(26,58,92,.5)", borderRadius: 2, overflow: "hidden" }}>
                                    <div style={{ height: "100%", width: `${h.score}%`, background: st.cor }} />
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Comportamentos interferentes */}
          <div style={{ ...card, padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: ".88rem", fontWeight: 700, color: "#e8f0f8" }}>Comportamentos interferentes</div>
                <div style={{ fontSize: ".7rem", color: "rgba(160,200,235,.84)", marginTop: 2 }}>Protocolos de redução e comportamentos monitorados</div>
              </div>
              <button onClick={() => setModalComp(true)} style={{ padding: "7px 14px", borderRadius: 8, border: "1px solid rgba(224,90,75,.3)", background: "rgba(224,90,75,.06)", color: "#E05A4B", fontSize: ".75rem", fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-sans)" }}>
                + Comportamento
              </button>
            </div>

            {comportamentos.length === 0 ? (
              <div style={{ textAlign: "center", padding: "16px 0", color: "rgba(160,200,235,.3)", fontSize: ".82rem" }}>
                Nenhum comportamento registrado
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {comportamentos.map(c => {
                  const st = STATUS_COMP[c.status];
                  return (
                    <div key={c.id} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 14px", background: "rgba(26,58,92,.2)", borderRadius: 10, border: `1px solid ${st.cor}22` }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: st.cor, flexShrink: 0, marginTop: 4 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                          <span style={{ fontSize: ".82rem", fontWeight: 600, color: "#e8f0f8" }}>{c.comportamento ?? c.nome}</span>
                          <span style={{ fontSize: ".62rem", color: st.cor, background: st.cor + "15", borderRadius: 20, padding: "1px 7px", fontWeight: 600 }}>{st.label}</span>
                          {c.intensidade && <span style={{ fontSize: ".62rem", color: "rgba(160,200,235,.4)" }}>{c.intensidade}</span>}
                        </div>
                        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                          {c.topografia && <span style={{ fontSize: ".68rem", color: "rgba(160,200,235,.5)" }}>Topografia: {c.topografia}</span>}
                          {c.funcao && <span style={{ fontSize: ".68rem", color: "rgba(160,200,235,.5)" }}>Função: {c.funcao}</span>}
                          {c.contexto && <span style={{ fontSize: ".68rem", color: "rgba(160,200,235,.5)" }}>Contexto: {c.contexto}</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Variáveis clínicas + Alertas + Insights */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>

            {/* Variáveis clínicas */}
            <div style={{ ...card, padding: 16 }}>
              <div style={{ ...lbl }}>Variáveis clínicas</div>
              {variaveis ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {[
                    { l: "Assentimento", v: variaveis.assentimento_pct, suf: "%", cor: variaveis.assentimento_pct >= 70 ? "#1D9E75" : "#EF9F27" },
                    { l: "Tolerância à exigência", v: variaveis.tolerancia_exigencia, suf: "/100", cor: "#378ADD" },
                    { l: "Responsividade ao reforço", v: variaveis.responsividade_reforco, suf: "/100", cor: "#8B7FE8" },
                    { l: "Revogações/sessão", v: variaveis.revogacoes_por_sessao, suf: "x", cor: variaveis.revogacoes_por_sessao > 2 ? "#E05A4B" : "#1D9E75" },
                  ].map(r => (
                    <div key={r.l} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 10px", background: "rgba(26,58,92,.2)", borderRadius: 8 }}>
                      <span style={{ fontSize: ".72rem", color: "rgba(160,200,235,.7)" }}>{r.l}</span>
                      <span style={{ fontSize: ".88rem", fontWeight: 700, color: r.cor }}>{r.v}{r.suf}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: ".75rem", color: "rgba(160,200,235,.3)", textAlign: "center", padding: "12px 0" }}>
                  Dados disponíveis após sessões concluídas
                </div>
              )}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {/* Alertas */}
              {data.alerts.length > 0 && (
                <div style={{ ...card, padding: 16 }}>
                  <div style={{ ...lbl }}>Alertas clínicos</div>
                  {data.alerts.map(a => (
                    <div key={a.id} style={{ background: ALERT_BG[a.level], border: `1px solid ${ALERT_BORDA[a.level]}`, borderRadius: 10, padding: "10px 12px", marginBottom: 6 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                        <div style={{ width: 6, height: 6, borderRadius: "50%", background: ALERT_COR[a.level], flexShrink: 0 }} />
                        <span style={{ fontSize: ".75rem", fontWeight: 600, color: "#e8f0f8" }}>{a.title}</span>
                      </div>
                      <div style={{ fontSize: ".72rem", color: "rgba(160,200,235,.9)", lineHeight: 1.5 }}>{a.description}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Insights */}
              {(nivel === "coordenador" || nivel === "supervisor") && insights.length > 0 && (
                <div style={{ ...card, padding: 16 }}>
                  <div style={{ ...lbl }}>Insights do Engine</div>
                  {insights.map((ins, i) => (
                    <div key={i} style={{ padding: "9px 12px", background: "rgba(29,158,117,.06)", border: "1px solid rgba(29,158,117,.15)", borderRadius: 9, marginBottom: 6, fontSize: ".75rem", color: "rgba(160,200,235,.92)", lineHeight: 1.55 }}>
                      {ins}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── PROGRAMAS ── */}
      {tab === "programas" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

          {/* Sugestões pendentes */}
          {sugestoes.length > 0 && (
            <div style={{ ...card, padding: 20, border: "1px solid rgba(239,159,39,.25)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#EF9F27" }} />
                <span style={{ fontSize: ".85rem", fontWeight: 700, color: "#EF9F27" }}>
                  {sugestoes.length} sugestão{sugestoes.length > 1 ? "ões" : ""} de programa{sugestoes.length > 1 ? "s" : ""}
                </span>
                <span style={{ fontSize: ".7rem", color: "rgba(160,200,235,.4)" }}>— geradas pela avaliação</span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {sugestoes.map(s => (
                  <div key={s.id} style={{ padding: "14px 16px", background: "rgba(239,159,39,.05)", border: "1px solid rgba(239,159,39,.15)", borderRadius: 11 }}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: ".82rem", fontWeight: 700, color: "#e8f0f8", marginBottom: 4 }}>
                          {s.nome_programa}
                        </div>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" as const }}>
                          {s.dominio && <span style={{ fontSize: ".65rem", color: "rgba(160,200,235,.5)" }}>{s.dominio}</span>}
                          {s.operante && <span style={{ fontSize: ".65rem", color: "#8B7FE8" }}>{s.operante}</span>}
                          {s.tipo_registro && <span style={{ fontSize: ".65rem", color: "#378ADD", background: "rgba(55,138,221,.1)", borderRadius: 20, padding: "1px 7px" }}>{s.tipo_registro}</span>}
                          {s.score_avaliado !== null && (
                            <span style={{ fontSize: ".65rem", color: "#E05A4B" }}>
                              score: {s.score_avaliado}%
                            </span>
                          )}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                        <button
                          onClick={() => rejeitarSugestao(s.id)}
                          style={{ padding: "6px 12px", borderRadius: 7, border: "1px solid rgba(224,90,75,.3)", background: "transparent", color: "#E05A4B", fontSize: ".68rem", fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-sans)" }}>
                          Rejeitar
                        </button>
                        <button
                          onClick={() => aprovarSugestao(s)}
                          disabled={aprovando === s.id}
                          style={{ padding: "6px 14px", borderRadius: 7, border: "none", background: "linear-gradient(135deg,#1D9E75,#0f8f7a)", color: "#07111f", fontSize: ".68rem", fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-sans)", opacity: aprovando === s.id ? 0.6 : 1 }}>
                          {aprovando === s.id ? "Aprovando..." : "Aprovar →"}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Programas ativos */}
          {data.programs.length === 0 && sugestoes.length === 0 ? (
            <div style={{ ...card, padding: 32, textAlign: "center", color: "rgba(160,200,235,.3)", fontSize: ".82rem" }}>
              Nenhum plano ativo para este paciente
            </div>
          ) : data.programs.map(p => {
            const st = STATUS_PROG[p.status];
            return (
              <div key={p.id} style={{ ...card, padding: 20 }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                      <span style={{ fontSize: ".92rem", fontWeight: 700, color: "#e8f0f8" }}>{p.name}</span>
                      <span style={{ fontSize: ".65rem", background: st.bg, border: `1px solid ${st.borda}`, color: st.cor, borderRadius: 20, padding: "2px 8px", fontWeight: 600 }}>{st.label}</span>
                    </div>
                    <div style={{ fontSize: ".72rem", color: "rgba(160,200,235,.84)" }}>{p.domain}</div>
                  </div>
                  {nivel !== "terapeuta" && (
                    <Link href={`/clinic/sessao?pacienteId=${data.id}&programaId=${p.id}`} style={{ padding: "7px 14px", borderRadius: 8, border: "1px solid rgba(29,158,117,.3)", background: "rgba(29,158,117,.08)", color: "#1D9E75", fontSize: ".72rem", fontWeight: 600, textDecoration: "none" }}>
                      Executar →
                    </Link>
                  )}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                  {[{ l: "Taxa de sucesso", v: p.success }, { l: "Independência", v: p.independence }].map(m => (
                    <div key={m.l}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                        <span style={{ fontSize: ".72rem", color: "rgba(160,200,235,.84)" }}>{m.l}</span>
                        <span style={{ fontSize: ".72rem", color: m.v >= 80 ? "#1D9E75" : m.v >= 50 ? "#EF9F27" : "#E05A4B", fontWeight: 600 }}>{m.v}%</span>
                      </div>
                      <div style={{ height: 5, background: "rgba(26,58,92,.5)", borderRadius: 50, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${m.v}%`, background: m.v >= 80 ? "#1D9E75" : m.v >= 50 ? "#EF9F27" : "#E05A4B" }} />
                      </div>
                    </div>
                  ))}
                </div>
                {p.status === "stalled" && <div style={{ background: "rgba(224,90,75,.07)", border: "1px solid rgba(224,90,75,.2)", borderRadius: 8, padding: "8px 12px", fontSize: ".75rem", color: "#E05A4B" }}>Programa travado — revisar critério, nível de dica ou reforçadores</div>}
                {p.status === "completed" && <div style={{ background: "rgba(55,138,221,.07)", border: "1px solid rgba(55,138,221,.2)", borderRadius: 8, padding: "8px 12px", fontSize: ".75rem", color: "#378ADD" }}>Programa concluído — considerar generalização</div>}
                {p.success >= 80 && p.status === "active" && <div style={{ background: "rgba(29,158,117,.07)", border: "1px solid rgba(29,158,117,.2)", borderRadius: 8, padding: "8px 12px", fontSize: ".75rem", color: "#1D9E75" }}>Próximo de critério — considerar avançar nível de dica</div>}
              </div>
            );
          })}
        </div>
      )}
      {/* ── SKILL GRAPH ── */}
      {tab === "skill-graph" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {habilidades.length === 0 ? (
            <div style={{ ...card, padding: 32, textAlign: "center", color: "rgba(160,200,235,.3)", fontSize: ".82rem" }}>
              Nenhuma habilidade no repertório ainda — adicione pela aba Visão Geral
            </div>
          ) : (
            <>
              {/* Resumo por status */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
                {(["dominada", "em_aquisicao", "emergente", "ausente"] as const).map(st => {
                  const cfg = STATUS_HAB[st];
                  const count = habilidades.filter(h => h.status === st).length;
                  return (
                    <div key={st} style={{ ...card, padding: "12px 14px" }}>
                      <div style={{ fontSize: ".6rem", color: cfg.cor, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 4 }}>{cfg.label}</div>
                      <div style={{ fontSize: "1.6rem", fontWeight: 800, color: cfg.cor }}>{count}</div>
                    </div>
                  );
                })}
              </div>

              {/* Por domínio */}
              {Object.entries(habsPorDominio).map(([dom, habs]) => (
                <div key={dom} style={{ ...card, padding: 18 }}>
                  <div style={{ fontSize: ".78rem", fontWeight: 700, color: "#e8f0f8", marginBottom: 12 }}>{DOMINIO_PT[dom] ?? dom}</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {habs.map(h => {
                      const st = STATUS_HAB[h.status];
                      return (
                        <div key={h.id} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <div style={{ width: 120, flexShrink: 0 }}>
                            <div style={{ fontSize: ".75rem", color: "#e8f0f8" }}>{h.habilidade}</div>
                            {h.operante && <div style={{ fontSize: ".62rem", color: "rgba(160,200,235,.35)" }}>{h.operante}</div>}
                          </div>
                          <div style={{ flex: 1, height: 6, background: "rgba(26,58,92,.5)", borderRadius: 3, overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${h.score}%`, background: st.cor }} />
                          </div>
                          <div style={{ width: 80, display: "flex", gap: 6, alignItems: "center" }}>
                            <span style={{ fontSize: ".65rem", color: st.cor, fontWeight: 600, background: st.cor + "15", borderRadius: 20, padding: "1px 7px" }}>{st.label}</span>
                          </div>
                          <div style={{ width: 40, textAlign: "right", fontSize: ".72rem", color: st.cor, fontWeight: 700 }}>{h.score}%</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* ── FORECAST ── */}
      {tab === "forecast" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ ...card, padding: 16, border: "1px solid rgba(139,127,232,.2)" }}>
            <div style={{ fontSize: ".7rem", color: "#8B7FE8", marginBottom: 2, fontWeight: 600 }}>FractaEngine — Forecast preditivo</div>
            <div style={{ fontSize: ".68rem", color: "rgba(160,200,235,.5)", lineHeight: 1.6 }}>
              Baseado nos dados de sessão, radar e repertório atual. Atualizado a cada sessão encerrada.
            </div>
          </div>
          {forecastResults.map(f => {
            const corSaude = f.goalHealth === "stalled" ? "#E05A4B" : f.goalHealth === "watch" ? "#EF9F27" : "#1D9E75"
            const labelSaude = f.goalHealth === "on_track" ? "Em curso" : f.goalHealth === "watch" ? "Monitorar" : f.goalHealth === "stalled" ? "Travada" : f.goalHealth === "accelerating" ? "Acelerando" : "Consolidando"
            return (
              <div key={f.goalId} style={{ ...card, padding: 20, border: `1px solid ${f.goalHealth === "stalled" ? "rgba(224,90,75,.2)" : f.goalHealth === "watch" ? "rgba(239,159,39,.15)" : "rgba(29,158,117,.15)"}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                  <div>
                    <div style={{ fontSize: ".88rem", fontWeight: 700, color: "#e8f0f8", marginBottom: 4 }}>{f.goalName}</div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontSize: ".65rem", color: corSaude, fontWeight: 600 }}>{labelSaude}</span>
                      <span style={{ fontSize: ".65rem", color: "rgba(160,200,235,.4)" }}>Confiança: {f.confidence}</span>
                    </div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontSize: ".68rem", color: "rgba(170,210,245,.88)", marginBottom: 2 }}>Estimativa</div>
                    <div style={{ fontSize: "1rem", fontWeight: 800, color: "#EF9F27" }}>{f.min}–{f.max} sessões</div>
                  </div>
                </div>
                <div style={{ height: 5, background: "rgba(26,58,92,.5)", borderRadius: 50, overflow: "hidden", marginBottom: 10 }}>
                  <div style={{ height: "100%", width: `${Math.min(100, Math.round(f.min / Math.max(f.max, 1) * 100))}%`, background: corSaude }} />
                </div>
                <div style={{ display: "flex", gap: 14, marginBottom: f.rationale.length > 0 ? 10 : 0 }}>
                  <div style={{ fontSize: ".68rem", color: "rgba(160,200,235,.84)" }}>Barreiras: <strong style={{ color: f.inferredBarriers > 1 ? "#E05A4B" : "#e8f0f8" }}>{f.inferredBarriers}</strong></div>
                  <div style={{ fontSize: ".68rem", color: "rgba(160,200,235,.84)" }}>Ação: <strong style={{ color: "#e8f0f8" }}>{f.recommendedAction.replace(/_/g, " ")}</strong></div>
                </div>
                {f.rationale.length > 0 && (
                  <div style={{ background: "rgba(26,58,92,.2)", border: "1px solid rgba(26,58,92,.4)", borderRadius: 9, padding: "10px 12px" }}>
                    {f.rationale.map((b: string, i: number) => (
                      <div key={i} style={{ fontSize: ".72rem", color: "rgba(160,200,235,.84)", marginBottom: 3 }}>• {b}</div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── AVALIAÇÕES ── */}
      {tab === "avaliacoes" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 20 }}>
          <div style={{ ...card, padding: 20 }}>
            <div style={{ fontSize: ".88rem", fontWeight: 700, color: "#e8f0f8", marginBottom: 14 }}>Protocolos aplicados</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[{ sigla: "VB-MAPP", cor: "#1D9E75", data: "15 Jan 2025", pontos: 68, max: 170, nivel: "Nível 1–2", revisao: "Jul 2025" }].map(av => {
                const pct = Math.round((av.pontos / av.max) * 100);
                return (
                  <div key={av.sigla} style={{ padding: "14px 16px", background: "rgba(26,58,92,.25)", borderRadius: 11, border: `1px solid ${av.cor}33` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                          <span style={{ fontSize: ".9rem", fontWeight: 800, color: av.cor }}>{av.sigla}</span>
                          <span style={{ fontSize: ".65rem", color: "#1D9E75", background: "rgba(29,158,117,.1)", borderRadius: 20, padding: "2px 8px", fontWeight: 600 }}>Concluída</span>
                        </div>
                        <div style={{ fontSize: ".7rem", color: "rgba(160,200,235,.84)" }}>Aplicada em {av.data} · Nível: {av.nivel}</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: "1.1rem", fontWeight: 800, color: av.cor }}>{pct}%</div>
                        <div style={{ fontSize: ".62rem", color: "rgba(170,210,245,.88)" }}>{av.pontos}/{av.max} pts</div>
                      </div>
                    </div>
                    <div style={{ height: 5, background: "rgba(26,58,92,.5)", borderRadius: 2, overflow: "hidden", marginBottom: 6 }}>
                      <div style={{ height: "100%", width: `${pct}%`, background: av.cor }} />
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ fontSize: ".65rem", color: "rgba(165,208,242,.85)" }}>Próxima revisão: {av.revisao}</span>
                      <a href="/clinic/avaliacoes" style={{ fontSize: ".65rem", color: av.cor, textDecoration: "none", fontWeight: 600 }}>Ver detalhes →</a>
                    </div>
                  </div>
                );
              })}
              <a href="/clinic/avaliacoes" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px", borderRadius: 10, border: "1px dashed rgba(26,58,92,.5)", background: "transparent", color: "rgba(160,200,235,.84)", textDecoration: "none", fontSize: ".75rem", cursor: "pointer" }}>
                + Nova avaliação
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ── HISTÓRICO ── */}
      {tab === "historico" && <HistoricoSessoes criancaId={params.id as string} criancaNome={data?.name ?? '—'} />}

      {/* ── JORNADA CLÍNICA ── */}
      {tab === "jornada" && (
        <JornadaClinica
          jornada={jornada}
          jornadaAnterior={jornadaAnterior}
          dominios={jornadaDominios}
          paciente={data}
          criancaId={params.id as string}
          onJornadaCriada={(j) => setJornada(j)}
        />
        // <div>Jornada temporariamente desabilitada</div>
      )}


      {/* ── CONTRATO ── */}
      {tab === "historico" && <HistoricoSessoes criancaId={params.id as string} criancaNome={data?.name ?? '—'} />}
      {tab === "contrato" && <ContratoTab criancaId={params.id as string} terapeutaId={terapeuta?.id ?? ""} />}

      {/* Modal adicionar habilidade */}
      {modalHab && (
        <div onClick={() => setModalHab(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.65)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ ...card, padding: 28, width: "100%", maxWidth: 440, border: "1px solid rgba(29,158,117,.2)" }}>
            <div style={{ fontSize: "1rem", fontWeight: 700, color: "#e8f0f8", marginBottom: 20 }}>Nova habilidade</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ fontSize: ".62rem", color: "rgba(170,210,245,.5)", textTransform: "uppercase", letterSpacing: ".08em", display: "block", marginBottom: 6 }}>Domínio</label>
                <select value={novaHab.dominio} onChange={e => setNovaHab(p => ({ ...p, dominio: e.target.value }))} style={inp}>
                  {DOMINIOS.map(d => <option key={d} value={d}>{DOMINIO_PT[d] ?? d}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: ".62rem", color: "rgba(170,210,245,.5)", textTransform: "uppercase", letterSpacing: ".08em", display: "block", marginBottom: 6 }}>Habilidade</label>
                <input value={novaHab.habilidade} onChange={e => setNovaHab(p => ({ ...p, habilidade: e.target.value }))} placeholder="Ex: Mando simples com PECS" style={inp} />
              </div>
              <div>
                <label style={{ fontSize: ".62rem", color: "rgba(170,210,245,.5)", textTransform: "uppercase", letterSpacing: ".08em", display: "block", marginBottom: 6 }}>Operante (opcional)</label>
                <input value={novaHab.operante} onChange={e => setNovaHab(p => ({ ...p, operante: e.target.value }))} placeholder="Ex: mando, tato, intraverbal" style={inp} />
              </div>
              <div>
                <label style={{ fontSize: ".62rem", color: "rgba(170,210,245,.5)", textTransform: "uppercase", letterSpacing: ".08em", display: "block", marginBottom: 6 }}>Status inicial</label>
                <div style={{ display: "flex", gap: 6 }}>
                  {(["ausente", "emergente", "em_aquisicao", "dominada"] as const).map(s => {
                    const cfg = STATUS_HAB[s];
                    return (
                      <button key={s} onClick={() => setNovaHab(p => ({ ...p, status: s }))}
                        style={{ flex: 1, padding: "7px 4px", borderRadius: 7, border: `1px solid ${novaHab.status === s ? cfg.cor + "55" : "rgba(26,58,92,.4)"}`, background: novaHab.status === s ? cfg.bg : "transparent", color: novaHab.status === s ? cfg.cor : "rgba(160,200,235,.4)", fontSize: ".6rem", fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-sans)" }}>
                        {cfg.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setModalHab(false)} style={{ flex: 1, padding: 11, borderRadius: 9, border: "1px solid rgba(26,58,92,.5)", background: "transparent", color: "rgba(160,200,235,.5)", fontSize: 13, cursor: "pointer", fontFamily: "var(--font-sans)" }}>Cancelar</button>
                <button onClick={adicionarHabilidade} disabled={salvandoHab || !novaHab.habilidade.trim()} style={{ flex: 2, padding: 11, borderRadius: 9, border: "none", background: "linear-gradient(135deg,#1D9E75,#0f8f7a)", color: "#07111f", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-sans)", opacity: salvandoHab ? 0.6 : 1 }}>
                  {salvandoHab ? "Salvando..." : "Adicionar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal adicionar comportamento */}
      {modalComp && (
        <div onClick={() => setModalComp(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.65)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ ...card, padding: 28, width: "100%", maxWidth: 440, border: "1px solid rgba(224,90,75,.2)" }}>
            <div style={{ fontSize: "1rem", fontWeight: 700, color: "#e8f0f8", marginBottom: 20 }}>Novo comportamento interferente</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ fontSize: ".62rem", color: "rgba(170,210,245,.5)", textTransform: "uppercase", letterSpacing: ".08em", display: "block", marginBottom: 6 }}>Nome</label>
                <input value={novoComp.nome} onChange={e => setNovoComp(p => ({ ...p, nome: e.target.value }))} placeholder="Ex: Agressão física, Estereotipia vocal" style={inp} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={{ fontSize: ".62rem", color: "rgba(170,210,245,.5)", textTransform: "uppercase", letterSpacing: ".08em", display: "block", marginBottom: 6 }}>Função</label>
                  <select value={novoComp.funcao} onChange={e => setNovoComp(p => ({ ...p, funcao: e.target.value }))} style={inp}>
                    <option value="fuga">Fuga/Esquiva</option>
                    <option value="atencao">Atenção</option>
                    <option value="tangivel">Tangível</option>
                    <option value="automatico">Automático</option>
                    <option value="multipla">Múltipla</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: ".62rem", color: "rgba(170,210,245,.5)", textTransform: "uppercase", letterSpacing: ".08em", display: "block", marginBottom: 6 }}>Intensidade</label>
                  <select value={novoComp.intensidade} onChange={e => setNovoComp(p => ({ ...p, intensidade: e.target.value }))} style={inp}>
                    <option value="leve">Leve</option>
                    <option value="moderada">Moderada</option>
                    <option value="severa">Severa</option>
                  </select>
                </div>
              </div>
              <div>
                <label style={{ fontSize: ".62rem", color: "rgba(170,210,245,.5)", textTransform: "uppercase", letterSpacing: ".08em", display: "block", marginBottom: 6 }}>Topografia (opcional)</label>
                <input value={novoComp.topografia} onChange={e => setNovoComp(p => ({ ...p, topografia: e.target.value }))} placeholder="Como o comportamento se manifesta fisicamente" style={inp} />
              </div>
              <div>
                <label style={{ fontSize: ".62rem", color: "rgba(170,210,245,.5)", textTransform: "uppercase", letterSpacing: ".08em", display: "block", marginBottom: 6 }}>Contexto (opcional)</label>
                <input value={novoComp.contexto} onChange={e => setNovoComp(p => ({ ...p, contexto: e.target.value }))} placeholder="Quando/onde ocorre com maior frequência" style={inp} />
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setModalComp(false)} style={{ flex: 1, padding: 11, borderRadius: 9, border: "1px solid rgba(26,58,92,.5)", background: "transparent", color: "rgba(160,200,235,.5)", fontSize: 13, cursor: "pointer", fontFamily: "var(--font-sans)" }}>Cancelar</button>
                <button onClick={adicionarComportamento} disabled={salvandoComp || !novoComp.nome.trim()} style={{ flex: 2, padding: 11, borderRadius: 9, border: "none", background: "linear-gradient(135deg,#E05A4B,#c04030)", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-sans)", opacity: salvandoComp ? 0.6 : 1 }}>
                  {salvandoComp ? "Salvando..." : "Registrar comportamento"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
