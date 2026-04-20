"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  BarChart, Bar, Cell,
  ReferenceLine, Area, ComposedChart, ReferenceArea,
} from "recharts";
import { generateForecastFromProfile, type ForecastGoal, type ForecastResult } from "@/lib/forecast";
import { useClinicContext } from "../layout";

// ─── TIPOS ───────────────────────────────────────────────────────────────────
type Tab = "consolidado" | "individual";
type DominioKey = "communication" | "social" | "attention" | "regulation" | "autonomy" | "flexibility" | "play" | "motivation";

interface RadarSnapshot {
  date: string;
  realDate?: string;
  communication: number; social: number; attention: number; regulation: number;
  autonomy: number; flexibility: number; play: number; motivation: number;
}

interface PacienteData {
  id: string;
  nome: string;
  iniciais: string;
  gradient: string;
  cor: string;
  diagnostico: string;
  radar: RadarSnapshot[];
  skills: { id: string; name: string; domain: string; status: "absent" | "emerging" | "acquired" }[];
  programs: { id: string; name: string; domain: string; status: "active" | "completed" | "stalled"; success: number; independence: number }[];
  alerts: { id: string; title: string; description: string; level: "low" | "medium" | "high" }[];
}

// ─── CONSTANTES ──────────────────────────────────────────────────────────────
const DOMINIOS: { key: DominioKey; label: string; cor: string }[] = [
  { key: "communication", label: "Comunicação", cor: "#1D9E75" },
  { key: "social",        label: "Social",      cor: "#378ADD" },
  { key: "attention",     label: "Atenção",     cor: "#8B7FE8" },
  { key: "regulation",    label: "Regulação",   cor: "#EF9F27" },
  { key: "autonomy",      label: "Autonomia",   cor: "#E05A4B" },
  { key: "flexibility",   label: "Flexibilidade",cor:"#4d6d8a" },
  { key: "play",          label: "Brincadeira", cor: "#23c48f" },
  { key: "motivation",    label: "Motivação",   cor: "#378ADD" },
];

const FORECAST_GOALS: ForecastGoal[] = [
  { id: "g1", name: "Pedir o que quer",          type: "acquisition",   targetDomain: "communication" },
  { id: "g2", name: "Esperar 3 segundos",         type: "acquisition",   targetDomain: "regulation"    },
  { id: "g3", name: "Troca de turnos",            type: "acquisition",   targetDomain: "social"        },
  { id: "g4", name: "Seguir instrução de 1 passo",type: "acquisition",   targetDomain: "attention"     },
  { id: "g5", name: "Redução de fuga",            type: "reduction",     targetDomain: "regulation"    },
  { id: "g6", name: "Brincar 5 minutos",          type: "acquisition",   targetDomain: "play"          },
];

const HEALTH_CONFIG = {
  on_track:     { label: "Em curso",     cor: "#378ADD", bg: "rgba(55,138,221,.1)"   },
  watch:        { label: "Monitorar",    cor: "#EF9F27", bg: "rgba(239,159,39,.1)"   },
  stalled:      { label: "Travada",      cor: "#E05A4B", bg: "rgba(224,90,75,.1)"    },
  accelerating: { label: "Acelerando",   cor: "#1D9E75", bg: "rgba(29,158,117,.1)"   },
  consolidating:{ label: "Consolidando", cor: "#8B7FE8", bg: "rgba(139,127,232,.1)"  },
};

// ─── MOCK DATA ────────────────────────────────────────────────────────────────
const PACIENTES_DATA: PacienteData[] = [
  {
    id: "1", nome: "Lucas Carvalho", iniciais: "LC",
    gradient: "linear-gradient(135deg,#1D9E75,#378ADD)", cor: "#1D9E75",
    diagnostico: "TEA — Nível 2",
    radar: [
      { date: "Sem. 1",  realDate: "15 Jan 2025", communication: 42, social: 60, attention: 38, regulation: 45, autonomy: 70, flexibility: 40, play: 55, motivation: 62 },
      { date: "Sem. 4",  realDate: "05 Fev 2025", communication: 48, social: 63, attention: 44, regulation: 49, autonomy: 72, flexibility: 43, play: 58, motivation: 64 },
      { date: "Sem. 8",  realDate: "05 Mar 2025", communication: 55, social: 66, attention: 49, regulation: 53, autonomy: 74, flexibility: 46, play: 61, motivation: 67 },
      { date: "Sem. 12", realDate: "02 Abr 2025", communication: 61, social: 70, attention: 55, regulation: 58, autonomy: 76, flexibility: 50, play: 65, motivation: 70 },
      { date: "Sem. 16", realDate: "30 Abr 2025", communication: 68, social: 73, attention: 60, regulation: 62, autonomy: 77, flexibility: 54, play: 68, motivation: 72 },
    ],
    skills: [
      { id: "s1", name: "Contato visual",    domain: "Social",    status: "acquired" },
      { id: "s2", name: "Apontar para pedir",domain: "Comunicação",status: "emerging"},
      { id: "s3", name: "Imitação motora",   domain: "Aprendizagem",status:"emerging"},
    ],
    programs: [
      { id: "p1", name: "Pedir o que quer", domain: "Comunicação", status: "active",  success: 65, independence: 48 },
      { id: "p2", name: "Esperar 3s",       domain: "Regulação",   status: "active",  success: 40, independence: 30 },
      { id: "p3", name: "Troca de turnos",  domain: "Social",      status: "stalled", success: 22, independence: 18 },
    ],
    alerts: [
      { id: "a1", title: "Programa travado", description: "Troca de turnos abaixo de 25%", level: "high" },
    ],
  },
  {
    id: "2", nome: "Maria Santos", iniciais: "MS",
    gradient: "linear-gradient(135deg,#378ADD,#8B7FE8)", cor: "#378ADD",
    diagnostico: "TEA — Nível 1",
    radar: [
      { date: "Sem. 1",  realDate: "20 Jan 2025", communication: 58, social: 72, attention: 55, regulation: 60, autonomy: 75, flexibility: 55, play: 68, motivation: 70 },
      { date: "Sem. 4",  realDate: "10 Fev 2025", communication: 62, social: 74, attention: 59, regulation: 63, autonomy: 76, flexibility: 58, play: 70, motivation: 72 },
      { date: "Sem. 8",  realDate: "10 Mar 2025", communication: 67, social: 77, attention: 63, regulation: 67, autonomy: 78, flexibility: 61, play: 73, motivation: 74 },
      { date: "Sem. 12", realDate: "07 Abr 2025", communication: 72, social: 80, attention: 68, regulation: 71, autonomy: 80, flexibility: 65, play: 76, motivation: 77 },
    ],
    skills: [
      { id: "s1", name: "Contato visual",       domain: "Social",    status: "acquired" },
      { id: "s2", name: "Seguir 1 instrução",   domain: "Atenção",   status: "acquired" },
      { id: "s3", name: "Mando com 1 palavra",  domain: "Comunicação",status:"emerging" },
    ],
    programs: [
      { id: "p1", name: "Prontidão",  domain: "Atenção",    status: "active",    success: 78, independence: 65 },
      { id: "p2", name: "Mando",      domain: "Comunicação",status: "active",    success: 61, independence: 48 },
    ],
    alerts: [
      { id: "a1", title: "Atenção em crescimento", description: "Subiu 13pts", level: "low" },
    ],
  },
  {
    id: "3", nome: "Rafael Pinto", iniciais: "RP",
    gradient: "linear-gradient(135deg,#8B7FE8,#E05A4B)", cor: "#8B7FE8",
    diagnostico: "TEA — Nível 2",
    radar: [
      { date: "Sem. 1",  realDate: "08 Jan 2025", communication: 70, social: 75, attention: 68, regulation: 65, autonomy: 80, flexibility: 60, play: 72, motivation: 75 },
      { date: "Sem. 4",  realDate: "29 Jan 2025", communication: 74, social: 78, attention: 72, regulation: 68, autonomy: 82, flexibility: 63, play: 75, motivation: 77 },
      { date: "Sem. 8",  realDate: "26 Fev 2025", communication: 79, social: 81, attention: 76, regulation: 72, autonomy: 84, flexibility: 67, play: 78, motivation: 80 },
      { date: "Sem. 12", realDate: "26 Mar 2025", communication: 85, social: 84, attention: 80, regulation: 76, autonomy: 86, flexibility: 71, play: 81, motivation: 83 },
    ],
    skills: [
      { id: "s1", name: "Contato visual",     domain: "Social",   status: "acquired" },
      { id: "s2", name: "Tato de objetos",    domain: "Comunicação",status:"acquired" },
      { id: "s3", name: "Imitação avançada",  domain: "Aprendizagem",status:"emerging"},
    ],
    programs: [
      { id: "p1", name: "Tato complexo",    domain: "Comunicação", status: "active",    success: 85, independence: 72 },
      { id: "p2", name: "Atenção conjunta", domain: "Social",      status: "active",    success: 88, independence: 75 },
      { id: "p3", name: "Intraverbal",      domain: "Comunicação", status: "active",    success: 70, independence: 58 },
    ],
    alerts: [],
  },
  {
    id: "4", nome: "Beatriz Lima", iniciais: "BL",
    gradient: "linear-gradient(135deg,#4d6d8a,#378ADD)", cor: "#4d6d8a",
    diagnostico: "TEA — Nível 3",
    radar: [
      { date: "Sem. 1",  realDate: "13 Jan 2025", communication: 28, social: 35, attention: 25, regulation: 22, autonomy: 45, flexibility: 20, play: 32, motivation: 40 },
      { date: "Sem. 4",  realDate: "03 Fev 2025", communication: 32, social: 38, attention: 28, regulation: 25, autonomy: 47, flexibility: 22, play: 35, motivation: 42 },
      { date: "Sem. 8",  realDate: "03 Mar 2025", communication: 35, social: 40, attention: 30, regulation: 27, autonomy: 49, flexibility: 24, play: 37, motivation: 44 },
      { date: "Sem. 12", realDate: "31 Mar 2025", communication: 38, social: 43, attention: 33, regulation: 30, autonomy: 51, flexibility: 26, play: 40, motivation: 46 },
    ],
    skills: [
      { id: "s1", name: "Contato visual básico", domain: "Social", status: "emerging" },
    ],
    programs: [
      { id: "p1", name: "Prontidão básica", domain: "Atenção",   status: "active",  success: 35, independence: 20 },
      { id: "p2", name: "Redução de fuga",  domain: "Regulação", status: "stalled", success: 22, independence: 15 },
    ],
    alerts: [
      { id: "a1", title: "Programa travado", description: "Redução de fuga estagnada", level: "high" },
      { id: "a2", title: "Baixa adesão",     description: "4 sessões no mês",          level: "high" },
    ],
  },
  {
    id: "5", nome: "Pedro Gomes", iniciais: "PG",
    gradient: "linear-gradient(135deg,#EF9F27,#E05A4B)", cor: "#EF9F27",
    diagnostico: "TEA — Nível 2",
    radar: [
      { date: "Sem. 1",  realDate: "06 Jan 2025", communication: 78, social: 82, attention: 75, regulation: 70, autonomy: 85, flexibility: 68, play: 80, motivation: 83 },
      { date: "Sem. 4",  realDate: "27 Jan 2025", communication: 82, social: 85, attention: 79, regulation: 74, autonomy: 87, flexibility: 71, play: 83, motivation: 85 },
      { date: "Sem. 8",  realDate: "24 Fev 2025", communication: 87, social: 88, attention: 83, regulation: 78, autonomy: 89, flexibility: 75, play: 86, motivation: 88 },
      { date: "Sem. 12", realDate: "24 Mar 2025", communication: 91, social: 90, attention: 87, regulation: 82, autonomy: 91, flexibility: 79, play: 89, motivation: 90 },
    ],
    skills: [
      { id: "s1", name: "Mando funcional",   domain: "Comunicação", status: "acquired" },
      { id: "s2", name: "Tato de ações",     domain: "Comunicação", status: "acquired" },
      { id: "s3", name: "Intraverbal básico",domain: "Comunicação", status: "emerging" },
    ],
    programs: [
      { id: "p1", name: "Mando complexo",  domain: "Comunicação", status: "active",    success: 91, independence: 82 },
      { id: "p2", name: "Regulação emoc.", domain: "Regulação",   status: "active",    success: 78, independence: 65 },
    ],
    alerts: [
      { id: "a1", title: "Próximo de critério", description: "2 programas acima de 80%", level: "low" },
    ],
  },
];

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function mediaRadar(snapshots: RadarSnapshot[]): number {
  if (!snapshots.length) return 0;
  const last = snapshots[snapshots.length - 1];
  const vals = [last.communication, last.social, last.attention, last.regulation, last.autonomy, last.flexibility, last.play, last.motivation];
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
}

function deltaRadar(snapshots: RadarSnapshot[]): number {
  if (snapshots.length < 2) return 0;
  const first = snapshots[0], last = snapshots[snapshots.length - 1];
  const keys: DominioKey[] = ["communication","social","attention","regulation","autonomy","flexibility","play","motivation"];
  const avgFirst = Math.round(keys.reduce((a, k) => a + first[k], 0) / keys.length);
  const avgLast  = Math.round(keys.reduce((a, k) => a + last[k], 0) / keys.length);
  return avgLast - avgFirst;
}

// ─── PAGE ────────────────────────────────────────────────────────────────────
export default function EvolucaoPage() {
  const { terapeuta } = useClinicContext();
  const nivel = terapeuta?.nivel ?? "coordenador";

  const [tab,           setTab]           = useState<Tab>("consolidado");
  const [pacienteSel,   setPacienteSel]   = useState<string>("1");
  const [dominiosSel,   setDominiosSel]   = useState<DominioKey[]>(["communication","social","attention","regulation"]);

  const paciente = useMemo(() => PACIENTES_DATA.find(p => p.id === pacienteSel)!, [pacienteSel]);

  const forecastResults = useMemo<ForecastResult[]>(() => {
    if (!paciente) return [];
    return FORECAST_GOALS.map(goal => generateForecastFromProfile(goal, {
      radar: paciente.radar, skills: paciente.skills,
      programs: paciente.programs, alerts: paciente.alerts, adherence: 72,
    }));
  }, [paciente]);

  // Dados para visão consolidada — comparativo entre pacientes
  const consolidadoData = useMemo(() => {
    return PACIENTES_DATA.map(p => ({
      nome: p.nome.split(" ")[0],
      media: mediaRadar(p.radar),
      delta: deltaRadar(p.radar),
      cor: p.cor,
    }));
  }, []);

  // Dados de evolução com projeção futura
  const evolucaoData = useMemo(() => {
    if (!paciente) return [];

    // Pontos reais
    const reais = paciente.radar.map(r => {
      const obj: Record<string, string | number | null> = {
        date: r.date,
        realDate: r.realDate ?? r.date,
        projecao: null,
      };
      dominiosSel.forEach(d => { obj[d] = r[d]; });
      return obj;
    });

    // Gera projeção futura — 4 pontos à frente usando taxa de crescimento média
    const last = paciente.radar[paciente.radar.length - 1];
    const first = paciente.radar[0];
    const nSemanas = paciente.radar.length * 4;
    const semanaBase = nSemanas;

    // Calcula taxa de crescimento por semana por domínio
    const taxas: Record<string, number> = {};
    dominiosSel.forEach(d => {
      const delta = last[d as DominioKey] - first[d as DominioKey];
      taxas[d] = delta / nSemanas;
    });

    // Próximas 4 medições projetadas (a cada 4 semanas)
    const mesesFuturos = ["Mai 2025", "Jun 2025", "Jul 2025", "Ago 2025"];
    const projecoes = [4, 8, 12, 16].map((semOffset, i) => {
      const obj: Record<string, string | number | null | boolean> = {
        date: `Sem. ${semanaBase + semOffset}`,
        realDate: mesesFuturos[i],
        projecao: true,
      };
      dominiosSel.forEach(d => {
        const val = Math.min(100, Math.round(last[d as DominioKey] + taxas[d] * semOffset));
        obj[d] = null;           // linha real não continua
        obj[d + "_proj"] = val;  // linha de projeção
        obj[d + "_min"]  = Math.max(0, val - 8);   // banda inferior
        obj[d + "_max"]  = Math.min(100, val + 8); // banda superior
      });
      return obj;
    });

    // Ponto de transição — último ponto real também aparece na projeção para conectar
    const transicao: Record<string, unknown> = { ...reais[reais.length - 1], projecao: "transicao" };
    dominiosSel.forEach(d => {
      transicao[d + "_proj"] = last[d as DominioKey];
      transicao[d + "_min"]  = last[d as DominioKey];
      transicao[d + "_max"]  = last[d as DominioKey];
    });

    return [...reais, transicao, ...projecoes];
  }, [paciente, dominiosSel]);

  // Data range para o tooltip
  const primeiraData = paciente?.radar[0]?.realDate ?? "";
  const ultimaData   = paciente?.radar[paciente.radar.length - 1]?.realDate ?? "";

  // Dados do radar atual
  const radarAtual = useMemo(() => {
    if (!paciente) return [];
    const last = paciente.radar[paciente.radar.length - 1];
    return DOMINIOS.map(d => ({ domain: d.label, value: last[d.key] }));
  }, [paciente]);

  // ── CSS ────────────────────────────────────────────────────────────────────
  const card: React.CSSProperties = {
    background: "rgba(13,32,53,.75)",
    border: "1px solid rgba(70,120,180,.5)",
    borderRadius: 14,
    backdropFilter: "blur(8px)",
  };
  const lbl: React.CSSProperties = {
    fontSize: ".6rem", fontWeight: 700, textTransform: "uppercase" as const,
    letterSpacing: ".09em", color: "rgba(170,210,245,.88)", marginBottom: 8,
  };

  const tooltipStyle = {
    contentStyle: { background: "#0d2035", border: "1px solid rgba(26,58,92,.7)", borderRadius: 10, color: "#e8f0f8", fontSize: 11 },
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* ── HEADER ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: "1.2rem", fontWeight: 800, color: "#e8f0f8", margin: 0, marginBottom: 4 }}>Evolução & Forecast</h1>
          <div style={{ fontSize: ".72rem", color: "rgba(160,200,235,.84)" }}>Longitudinal por domínio · Previsibilidade de metas</div>
        </div>
        <Link href="/clinic/pacientes" style={{ fontSize: ".75rem", color: "rgba(160,200,235,.84)", textDecoration: "none", display: "flex", alignItems: "center", gap: 5 }}>
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M10 3L5 8l5 5"/></svg>
          Pacientes
        </Link>
      </div>

      {/* ── TABS ── */}
      <div style={{ display: "flex", borderBottom: "1px solid rgba(26,58,92,.4)", marginBottom: 4 }}>
        {([["consolidado","Visão consolidada"],["individual","Por paciente"]] as [Tab,string][]).map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: "10px 18px", background: "none", border: "none",
            borderBottom: `2px solid ${tab === t ? "#1D9E75" : "transparent"}`,
            color: tab === t ? "#1D9E75" : "rgba(160,200,235,.84)",
            fontFamily: "var(--font-sans)", fontWeight: tab === t ? 600 : 400,
            fontSize: ".82rem", cursor: "pointer", marginBottom: -1,
          }}>{label}</button>
        ))}
      </div>

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* TAB: VISÃO CONSOLIDADA */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      {tab === "consolidado" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* KPIs */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 10 }}>
            {[
              { l: "Pacientes ativos", v: PACIENTES_DATA.length, c: "#e8f0f8" },
              { l: "Média geral",      v: `${Math.round(PACIENTES_DATA.reduce((a, p) => a + mediaRadar(p.radar), 0) / PACIENTES_DATA.length)}%`, c: "#1D9E75" },
              { l: "Com alerta alto",  v: PACIENTES_DATA.filter(p => p.alerts.some(a => a.level === "high")).length, c: "#E05A4B" },
              { l: "Evolução média",   v: `+${Math.round(PACIENTES_DATA.reduce((a, p) => a + deltaRadar(p.radar), 0) / PACIENTES_DATA.length)}pts`, c: "#1D9E75" },
            ].map(k => (
              <div key={k.l} style={{ ...card, padding: "14px 16px" }}>
                <div style={{ fontSize: ".6rem", color: "rgba(170,210,245,.88)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 6 }}>{k.l}</div>
                <div style={{ fontSize: "1.6rem", fontWeight: 800, color: k.c, letterSpacing: "-.02em" }}>{k.v}</div>
              </div>
            ))}
          </div>

          {/* Comparativo de médias */}
          <div style={{ ...card, padding: 20 }}>
            <div style={{ fontSize: ".88rem", fontWeight: 700, color: "#e8f0f8", marginBottom: 4 }}>Média geral por paciente</div>
            <div style={{ fontSize: ".7rem", color: "rgba(160,200,235,.84)", marginBottom: 16 }}>Média dos 8 domínios na última medição</div>
            <div style={{ height: 200, minHeight: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={consolidadoData} barSize={32}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(26,58,92,.4)" vertical={false} />
                  <XAxis dataKey="nome" stroke="rgba(165,208,242,.85)" tick={{ fill: "rgba(160,200,235,.90)", fontSize: 11 }} />
                  <YAxis domain={[0, 100]} stroke="rgba(165,208,242,.85)" tick={{ fill: "rgba(160,200,235,.84)", fontSize: 10 }} />
                  <Tooltip {...tooltipStyle} formatter={(v: unknown) => [`${Number(v)}%`, "Média"] as [string, string]} />
                  <Bar dataKey="media" radius={[6, 6, 0, 0]}>
                    {consolidadoData.map((entry, i) => (
                      <Cell key={i} fill={entry.cor} fillOpacity={0.8} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Evolução por paciente — cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(320px,1fr))", gap: 12 }}>
            {PACIENTES_DATA.map(p => {
              const media  = mediaRadar(p.radar);
              const delta  = deltaRadar(p.radar);
              const last   = p.radar[p.radar.length - 1];
              const temAlerta = p.alerts.some(a => a.level === "high");
              return (
                <div key={p.id} style={{ ...card, padding: 18, border: `1px solid ${temAlerta ? "rgba(224,90,75,.25)" : "rgba(26,58,92,.5)"}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                    <div style={{ width: 36, height: 36, borderRadius: "50%", background: p.gradient, display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".68rem", fontWeight: 800, color: "#fff", flexShrink: 0 }}>{p.iniciais}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: ".85rem", fontWeight: 700, color: "#e8f0f8" }}>{p.nome}</div>
                      <div style={{ fontSize: ".68rem", color: "rgba(160,200,235,.84)" }}>{p.diagnostico}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "1.3rem", fontWeight: 800, color: media >= 70 ? "#1D9E75" : media >= 50 ? "#EF9F27" : "#E05A4B", lineHeight: 1 }}>{media}%</div>
                      <div style={{ fontSize: ".65rem", color: delta > 0 ? "#1D9E75" : "#E05A4B", fontWeight: 600 }}>{delta > 0 ? "+" : ""}{delta}pts</div>
                    </div>
                  </div>

                  {/* Mini linha de evolução */}
                  <div style={{ height: 60, minHeight: 60, marginBottom: 12 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={p.radar.map(r => ({ date: r.date, val: Math.round([r.communication,r.social,r.attention,r.regulation,r.autonomy,r.flexibility,r.play,r.motivation].reduce((a,b)=>a+b,0)/8) }))}>
                        <Line type="monotone" dataKey="val" stroke={p.cor} strokeWidth={2} dot={false} />
                        <Tooltip {...tooltipStyle} formatter={(v: unknown) => [`${Number(v)}%`, "Média"] as [string, string]} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Domínios mais fracos */}
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
                    {DOMINIOS.slice(0, 4).map(d => (
                      <div key={d.key} style={{ flex: 1, minWidth: 50 }}>
                        <div style={{ fontSize: ".58rem", color: "rgba(165,208,242,.85)", marginBottom: 2 }}>{d.label.slice(0,3)}</div>
                        <div style={{ height: 3, background: "rgba(26,58,92,.5)", borderRadius: 2, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${last[d.key]}%`, background: last[d.key] >= 70 ? "#1D9E75" : last[d.key] >= 50 ? "#EF9F27" : "#E05A4B" }} />
                        </div>
                        <div style={{ fontSize: ".58rem", color: "rgba(170,210,245,.88)", marginTop: 1 }}>{last[d.key]}</div>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => { setPacienteSel(p.id); setTab("individual"); }} style={{ flex: 1, padding: "7px", borderRadius: 7, border: "1px solid rgba(70,120,180,.5)", background: "transparent", color: "rgba(160,200,235,.90)", fontFamily: "var(--font-sans)", fontSize: ".72rem", cursor: "pointer" }}>
                      Ver evolução
                    </button>
                    <Link href={`/clinic/paciente/${p.id}`} style={{ flex: 1, padding: "7px", borderRadius: 7, border: "none", background: "rgba(29,158,117,.1)", color: "#1D9E75", fontFamily: "var(--font-sans)", fontWeight: 600, fontSize: ".72rem", textDecoration: "none", textAlign: "center" }}>
                      Ver perfil →
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* TAB: INDIVIDUAL */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      {tab === "individual" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Seletor de paciente */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {PACIENTES_DATA.map(p => (
              <button key={p.id} onClick={() => setPacienteSel(p.id)} style={{
                display: "flex", alignItems: "center", gap: 8, padding: "8px 14px",
                borderRadius: 9,
                border: `1px solid ${pacienteSel === p.id ? p.cor + "55" : "rgba(26,58,92,.5)"}`,
                background: pacienteSel === p.id ? p.cor + "11" : "transparent",
                cursor: "pointer", fontFamily: "var(--font-sans)",
              }}>
                <div style={{ width: 22, height: 22, borderRadius: "50%", background: p.gradient, display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".52rem", fontWeight: 800, color: "#fff" }}>{p.iniciais}</div>
                <span style={{ fontSize: ".78rem", color: pacienteSel === p.id ? p.cor : "rgba(160,200,235,.90)", fontWeight: pacienteSel === p.id ? 600 : 400 }}>{p.nome.split(" ")[0]}</span>
              </button>
            ))}
          </div>

          {/* KPIs do paciente */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 10 }}>
            {[
              { l: "Média atual",    v: `${mediaRadar(paciente.radar)}%`, c: "#e8f0f8" },
              { l: "Evolução total", v: `+${deltaRadar(paciente.radar)}pts`, c: "#1D9E75" },
              { l: "Programas",     v: paciente.programs.length, c: "#378ADD" },
              { l: "Alertas",       v: paciente.alerts.filter(a => a.level === "high").length, c: paciente.alerts.some(a => a.level === "high") ? "#E05A4B" : "#1D9E75" },
            ].map(k => (
              <div key={k.l} style={{ ...card, padding: "14px 16px" }}>
                <div style={{ fontSize: ".6rem", color: "rgba(170,210,245,.88)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 6 }}>{k.l}</div>
                <div style={{ fontSize: "1.6rem", fontWeight: 800, color: k.c, letterSpacing: "-.02em" }}>{k.v}</div>
              </div>
            ))}
          </div>

          {/* Seletor de domínios */}
          <div style={{ ...card, padding: "12px 16px" }}>
            <div style={{ ...lbl, marginBottom: 8 }}>Domínios no gráfico</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {DOMINIOS.map(d => {
                const ativo = dominiosSel.includes(d.key);
                return (
                  <button key={d.key} onClick={() => {
                    if (ativo && dominiosSel.length > 1) setDominiosSel(prev => prev.filter(x => x !== d.key));
                    else if (!ativo) setDominiosSel(prev => [...prev, d.key]);
                  }} style={{
                    padding: "5px 12px", borderRadius: 20,
                    border: `1px solid ${ativo ? d.cor + "55" : "rgba(26,58,92,.5)"}`,
                    background: ativo ? d.cor + "15" : "transparent",
                    color: ativo ? d.cor : "rgba(170,210,245,.88)",
                    fontFamily: "var(--font-sans)", fontSize: ".72rem", fontWeight: ativo ? 600 : 400, cursor: "pointer",
                  }}>{d.label}</button>
                );
              })}
            </div>
          </div>

          {/* Gráfico de evolução longitudinal com projeção */}
          <div style={{ ...card, padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
              <div>
                <div style={{ fontSize: ".88rem", fontWeight: 700, color: "#e8f0f8", marginBottom: 4 }}>Evolução longitudinal — {paciente.nome}</div>
                <div style={{ fontSize: ".7rem", color: "rgba(160,200,235,.84)" }}>
                  {primeiraData} → {ultimaData} · <span style={{ color: "rgba(139,127,232,.8)" }}>tracejado = projeção</span>
                </div>
              </div>
              <div style={{ display: "flex", gap: 12, fontSize: ".65rem", color: "rgba(160,200,235,.84)", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <div style={{ width: 16, height: 2, background: "rgba(160,200,235,.84)" }} />
                  <span>Real</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <div style={{ width: 16, height: 2, background: "rgba(139,127,232,.8)", borderTop: "2px dashed rgba(139,127,232,.8)" }} />
                  <span>Projeção</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <div style={{ width: 16, height: 8, background: "rgba(139,127,232,.1)", border: "1px solid rgba(139,127,232,.2)", borderRadius: 2 }} />
                  <span>Confiança</span>
                </div>
              </div>
            </div>

            <div style={{ height: 300, minHeight: 300, marginTop: 16 }}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={evolucaoData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(26,58,92,.4)" />
                  <XAxis
                    dataKey="date"
                    stroke="rgba(165,208,242,.85)"
                    tick={{ fill: "rgba(160,200,235,.84)", fontSize: 10 }}
                  />
                  <YAxis
                    domain={[0, 100]}
                    stroke="rgba(165,208,242,.85)"
                    tick={{ fill: "rgba(160,200,235,.84)", fontSize: 10 }}
                    tickFormatter={(v: number) => `${v}%`}
                  />
                  <Tooltip
                    {...tooltipStyle}
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      const point = evolucaoData.find(d => d.date === label);
                      const isProj = point?.projecao === true;
                      return (
                        <div style={{ background: "#0d2035", border: "1px solid rgba(26,58,92,.7)", borderRadius: 10, padding: "10px 14px", fontSize: 11 }}>
                          <div style={{ fontWeight: 700, color: "#e8f0f8", marginBottom: 4 }}>{label}</div>
                          <div style={{ color: "rgba(160,200,235,.84)", marginBottom: 6, fontSize: 10 }}>{String(point?.realDate ?? "")} {isProj ? "· Projeção" : "· Medição real"}</div>
                          {payload.filter(p => !String(p.dataKey).includes("_")).map(p => (
                            <div key={String(p.dataKey)} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                              <div style={{ width: 8, height: 8, borderRadius: "50%", background: String(p.color) }} />
                              <span style={{ color: "rgba(175,210,240,.95)" }}>{p.name}:</span>
                              <span style={{ color: "#e8f0f8", fontWeight: 600 }}>{p.value}%</span>
                            </div>
                          ))}
                        </div>
                      );
                    }}
                  />

                  {/* Linha de critério */}
                  <ReferenceLine y={80} stroke="rgba(255,255,255,.2)" strokeDasharray="6 3" label={{ value: "Critério 80%", position: "insideTopRight", fill: "rgba(255,255,255,.35)", fontSize: 10 }} />

                  {/* Área de confiança da projeção + linhas reais e projetadas */}
                  {dominiosSel.map(d => {
                    const dom = DOMINIOS.find(x => x.key === d)!;
                    return (
                      <Area
                        key={d + "_conf"}
                        type="monotone"
                        dataKey={d + "_max"}
                        stroke="none"
                        fill={dom.cor}
                        fillOpacity={0.06}
                        legendType="none"
                        name=""
                        activeDot={false}
                        connectNulls={false}
                      />
                    );
                  })}

                  {/* Linhas reais */}
                  {dominiosSel.map(d => {
                    const dom = DOMINIOS.find(x => x.key === d)!;
                    return (
                      <Line
                        key={d}
                        type="monotone"
                        dataKey={d}
                        name={dom.label}
                        stroke={dom.cor}
                        strokeWidth={2}
                        dot={(props: { cx?: number; cy?: number; payload?: Record<string, unknown> }) => {
                          if (!props.payload || props.payload.projecao) return <g key={`dot-${props.cx}-${props.cy}`} />;
                          return <circle key={`dot-${props.cx}-${props.cy}`} cx={props.cx} cy={props.cy} r={3} fill={dom.cor} stroke="none" />;
                        }}
                        connectNulls={false}
                      />
                    );
                  })}

                  {/* Linhas de projeção tracejadas */}
                  {dominiosSel.map(d => {
                    const dom = DOMINIOS.find(x => x.key === d)!;
                    return (
                      <Line
                        key={d + "_proj"}
                        type="monotone"
                        dataKey={d + "_proj"}
                        name={dom.label + " (proj.)"}
                        stroke={dom.cor}
                        strokeWidth={1.5}
                        strokeDasharray="5 4"
                        dot={false}
                        connectNulls
                        opacity={0.7}
                        legendType="none"
                      />
                    );
                  })}

                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* Legenda + info de período */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, flexWrap: "wrap", gap: 8 }}>
              <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                {dominiosSel.map(d => {
                  const dom = DOMINIOS.find(x => x.key === d)!;
                  return (
                    <div key={d} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <div style={{ width: 12, height: 3, background: dom.cor, borderRadius: 2 }} />
                      <span style={{ fontSize: ".68rem", color: "rgba(160,200,235,.90)" }}>{dom.label}</span>
                    </div>
                  );
                })}
              </div>
              <div style={{ fontSize: ".65rem", color: "rgba(165,208,242,.85)" }}>
                {paciente.radar.length} medições reais · +4 projeções
              </div>
            </div>
          </div>

          {/* Grade: Radar + Programas */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

            {/* Radar atual */}
            <div style={{ ...card, padding: 20 }}>
              <div style={{ fontSize: ".88rem", fontWeight: 700, color: "#e8f0f8", marginBottom: 4 }}>Radar atual</div>
              <div style={{ fontSize: ".7rem", color: "rgba(160,200,235,.84)", marginBottom: 8 }}>Semana {paciente.radar.length * 4}</div>
              <div style={{ height: 260, minHeight: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarAtual}>
                    <PolarGrid stroke="rgba(26,58,92,.5)" />
                    <PolarAngleAxis dataKey="domain" tick={{ fill: "rgba(160,200,235,.90)", fontSize: 10 }} />
                    <Radar name="Atual" dataKey="value" stroke={paciente.cor} fill={paciente.cor} fillOpacity={0.15} strokeWidth={1.5} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Performance por programa */}
            <div style={{ ...card, padding: 20 }}>
              <div style={{ fontSize: ".88rem", fontWeight: 700, color: "#e8f0f8", marginBottom: 14 }}>Programas em andamento</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {paciente.programs.map(p => {
                  const cor = p.success >= 80 ? "#1D9E75" : p.success >= 50 ? "#EF9F27" : "#E05A4B";
                  const st  = p.status === "active" ? { l: "Ativo", c: "#1D9E75" } : p.status === "completed" ? { l: "Concluído", c: "#378ADD" } : { l: "Travado", c: "#E05A4B" };
                  return (
                    <div key={p.id}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                        <div>
                          <div style={{ fontSize: ".8rem", fontWeight: 600, color: "#e8f0f8" }}>{p.name}</div>
                          <div style={{ fontSize: ".65rem", color: "rgba(170,210,245,.88)" }}>{p.domain}</div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: ".62rem", color: st.c, background: st.c + "15", border: `1px solid ${st.c}33`, borderRadius: 20, padding: "2px 7px", fontWeight: 600 }}>{st.l}</span>
                          <span style={{ fontSize: ".85rem", fontWeight: 700, color: cor }}>{p.success}%</span>
                        </div>
                      </div>
                      <div style={{ height: 4, background: "rgba(26,58,92,.5)", borderRadius: 2, overflow: "hidden", marginBottom: 2 }}>
                        <div style={{ height: "100%", width: `${p.success}%`, background: cor, transition: "width .5s" }} />
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ fontSize: ".6rem", color: "rgba(165,208,242,.85)" }}>Sucesso</span>
                        <span style={{ fontSize: ".6rem", color: "rgba(165,208,242,.85)" }}>Independência: {p.independence}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Forecast Matrix — só coordenador e supervisor */}
          {(nivel === "coordenador" || nivel === "supervisor") && (
            <div style={{ ...card, padding: 20 }}>
              <div style={{ fontSize: ".88rem", fontWeight: 700, color: "#e8f0f8", marginBottom: 4 }}>Forecast Matrix — {paciente.nome}</div>
              <div style={{ fontSize: ".7rem", color: "rgba(160,200,235,.84)", marginBottom: 16 }}>Previsibilidade de metas pelo FractaEngine</div>

              {/* Sumário */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 16 }}>
                {[
                  { l: "Metas", v: forecastResults.length, c: "#e8f0f8" },
                  { l: "Travadas", v: forecastResults.filter(r => r.goalHealth === "stalled").length, c: "#E05A4B" },
                  { l: "Acelerando", v: forecastResults.filter(r => r.goalHealth === "accelerating").length, c: "#1D9E75" },
                  { l: "Risco médio", v: Math.round(forecastResults.reduce((a, r) => a + r.riskScore, 0) / (forecastResults.length || 1)), c: "#EF9F27" },
                ].map(k => (
                  <div key={k.l} style={{ background: "rgba(26,58,92,.25)", borderRadius: 10, padding: "10px 12px" }}>
                    <div style={{ fontSize: ".6rem", color: "rgba(170,210,245,.88)", marginBottom: 4 }}>{k.l}</div>
                    <div style={{ fontSize: "1.2rem", fontWeight: 800, color: k.c }}>{k.v}</div>
                  </div>
                ))}
              </div>

              {/* Cards de forecast */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                {forecastResults.map(item => {
                  const hc = HEALTH_CONFIG[item.goalHealth] ?? HEALTH_CONFIG.watch;
                  const riskBg = item.riskScore >= 65 ? "#E05A4B" : item.riskScore >= 40 ? "#EF9F27" : "#1D9E75";
                  return (
                    <div key={item.goalId} style={{ background: "rgba(26,58,92,.25)", border: "1px solid rgba(70,120,180,.4)", borderRadius: 10, overflow: "hidden" }}>
                      <div style={{ height: 2, background: riskBg }} />
                      <div style={{ padding: "12px 14px" }}>
                        <div style={{ fontSize: ".75rem", fontWeight: 600, color: "#e8f0f8", marginBottom: 4, lineHeight: 1.3 }}>{item.goalName}</div>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                          <span style={{ fontSize: ".62rem", color: hc.cor, background: hc.bg, borderRadius: 20, padding: "2px 7px", fontWeight: 600 }}>{hc.label}</span>
                          <span style={{ fontSize: ".78rem", fontWeight: 700, color: "#1D9E75", fontFamily: "monospace" }}>{item.min}–{item.max}</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span style={{ fontSize: ".62rem", color: "rgba(170,210,245,.88)" }}>Risco: {item.riskScore}</span>
                          <span style={{ fontSize: ".62rem", color: "rgba(170,210,245,.88)" }}>Revisar: {item.reviewAfterSessions}s</span>
                        </div>
                        {nivel === "supervisor" && item.rationale[0] && (
                          <div style={{ marginTop: 8, fontSize: ".68rem", color: "rgba(160,200,235,.90)", lineHeight: 1.45, padding: "6px 8px", background: "rgba(20,55,110,.55)", borderRadius: 7 }}>
                            {item.rationale[0]}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      )}

    </div>
  );
}
