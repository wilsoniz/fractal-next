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

// ─── TIPOS ───────────────────────────────────────────────────────────────────
type RadarSnapshot = {
  date: string;
  communication: number; social: number; attention: number;
  regulation: number; autonomy: number; flexibility: number;
  play: number; motivation: number;
};
type Skill = { id: string; name: string; domain: string; status: "absent" | "emerging" | "acquired" };
type Program = { id: string; name: string; domain: string; status: "active" | "completed" | "stalled"; success: number; independence: number; relatedPrograms?: string[] };
type ClinicalAlert = { id: string; title: string; description: string; level: "low" | "medium" | "high" };
type LearnerProfile = { id: string; name: string; age: number; diagnosis?: string; radar: RadarSnapshot[]; skills: Skill[]; programs: Program[]; alerts: ClinicalAlert[] };

type Tab = "visao-geral" | "programas" | "skill-graph" | "forecast" | "avaliacoes";

// ─── FORECAST GOALS ──────────────────────────────────────────────────────────
const FORECAST_GOALS: ForecastGoal[] = [
  { id: "g1", name: "Pedir o que quer (mando básico)", type: "acquisition",    targetDomain: "communication", requiredSkills: [],       relatedPrograms: ["Atenção conjunta"] },
  { id: "g2", name: "Esperar 3 segundos",              type: "acquisition",    targetDomain: "regulation",    requiredSkills: ["g1"],   relatedPrograms: ["Troca de turnos"] },
  { id: "g3", name: "Troca de turnos simples",         type: "acquisition",    targetDomain: "social",        requiredSkills: ["g1"],   relatedPrograms: ["Pedir o que quer"] },
  { id: "g4", name: "Seguir instrução de 1 passo",     type: "acquisition",    targetDomain: "attention",     requiredSkills: [],       relatedPrograms: [] },
  { id: "g5", name: "Redução de fuga de demanda",      type: "reduction",      targetDomain: "regulation",    requiredSkills: ["g2"],   relatedPrograms: ["Esperar 3 segundos"] },
  { id: "g6", name: "Brincar funcionalmente por 5 min",type: "acquisition",    targetDomain: "play",          requiredSkills: ["g1"],   relatedPrograms: ["Troca de turnos"] },
];

// ─── MOCK DATA ────────────────────────────────────────────────────────────────
const MOCK_PROFILE: LearnerProfile = {
  id: "1", name: "Lucas Marques", age: 4, diagnosis: "TEA — Nível 2 de suporte",
  radar: [
    { date: "Semana 1",  communication: 42, social: 60, attention: 38, regulation: 45, autonomy: 70, flexibility: 40, play: 55, motivation: 62 },
    { date: "Semana 4",  communication: 48, social: 63, attention: 44, regulation: 49, autonomy: 72, flexibility: 43, play: 58, motivation: 64 },
    { date: "Semana 8",  communication: 55, social: 66, attention: 49, regulation: 53, autonomy: 74, flexibility: 46, play: 61, motivation: 67 },
    { date: "Semana 12", communication: 61, social: 70, attention: 55, regulation: 58, autonomy: 76, flexibility: 50, play: 65, motivation: 70 },
  ],
  skills: [
    { id: "s1", name: "Contato visual", domain: "Social", status: "acquired" },
    { id: "s2", name: "Apontar para pedir", domain: "Comunicação", status: "emerging" },
    { id: "s3", name: "Imitação motora simples", domain: "Aprendizagem", status: "emerging" },
    { id: "s4", name: "Seguir instrução simples", domain: "Atenção", status: "absent" },
    { id: "s5", name: "Esperar por alguns segundos", domain: "Regulação", status: "emerging" },
    { id: "s6", name: "Brincadeira funcional", domain: "Brincadeira", status: "acquired" },
    { id: "s7", name: "Troca de turnos", domain: "Social", status: "absent" },
    { id: "s8", name: "Nomear objetos familiares", domain: "Comunicação", status: "emerging" },
  ],
  programs: [
    { id: "p1", name: "Pedir o que quer", domain: "Comunicação", status: "active",    success: 65, independence: 48, relatedPrograms: ["Atenção conjunta"] },
    { id: "p2", name: "Esperar 3 segundos", domain: "Regulação",  status: "active",    success: 40, independence: 30, relatedPrograms: ["Troca de turnos"] },
    { id: "p3", name: "Troca de turnos",    domain: "Social",     status: "stalled",   success: 22, independence: 18, relatedPrograms: ["Pedir o que quer"] },
    { id: "p4", name: "Atenção ao nome",    domain: "Atenção",    status: "active",    success: 78, independence: 62, relatedPrograms: [] },
    { id: "p5", name: "Imitação motora",    domain: "Aprendizagem",status: "completed",success: 88, independence: 80, relatedPrograms: ["Pedir o que quer"] },
  ],
  alerts: [
    { id: "a1", title: "Programa travado", description: "Troca de turnos abaixo de 25% de sucesso nas últimas 3 sessões. Revisar protocolo.", level: "high" },
    { id: "a2", title: "Janela de emergência", description: "Apontar para pedir próximo de consolidar — pode destravar comunicação funcional.", level: "medium" },
    { id: "a3", title: "Atenção em crescimento", description: "Domínio de atenção subiu 17pts nas últimas semanas. Sustenta programas mais estruturados.", level: "low" },
  ],
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const STATUS_SKILL = {
  acquired: { label: "Consolidada", cor: "#1D9E75", bg: "rgba(29,158,117,.12)", borda: "rgba(29,158,117,.25)" },
  emerging: { label: "Emergente",   cor: "#EF9F27", bg: "rgba(239,159,39,.12)", borda: "rgba(239,159,39,.25)" },
  absent:   { label: "Ausente",     cor: "#4d6d8a", bg: "rgba(77,109,138,.12)", borda: "rgba(26,58,92,.4)"    },
};
const STATUS_PROG = {
  active:    { label: "Ativo",     cor: "#1D9E75", bg: "rgba(29,158,117,.12)", borda: "rgba(29,158,117,.25)" },
  completed: { label: "Concluído", cor: "#378ADD", bg: "rgba(55,138,221,.12)", borda: "rgba(55,138,221,.25)" },
  stalled:   { label: "Travado",   cor: "#E05A4B", bg: "rgba(224,90,75,.12)",  borda: "rgba(224,90,75,.25)"  },
};
const ALERT_COR = { high: "#E05A4B", medium: "#EF9F27", low: "#1D9E75" };
const ALERT_BG  = { high: "rgba(224,90,75,.08)", medium: "rgba(239,159,39,.08)", low: "rgba(29,158,117,.08)" };
const ALERT_BORDA = { high: "rgba(224,90,75,.25)", medium: "rgba(239,159,39,.2)", low: "rgba(29,158,117,.2)" };
const DOMINIO_PT: Record<string, string> = {
  communication:"Comunicação", social:"Social", attention:"Atenção",
  regulation:"Regulação", autonomy:"Autonomia", flexibility:"Flexibilidade",
  play:"Brincadeira", motivation:"Motivação",
};
const FORECAST_HEALTH_PT: Record<string, string> = {
  on_track:"em curso", watch:"monitorar", stalled:"travada",
  accelerating:"acelerando", consolidating:"consolidando",
};

// ─── PAGE ────────────────────────────────────────────────────────────────────
export default function PerfilPacientePage() {
  const { terapeuta } = useClinicContext();
  const params = useParams();
  const nivel = terapeuta?.nivel ?? "coordenador";

  const [data, setData]   = useState<LearnerProfile | null>(null);
  const [tab, setTab]     = useState<Tab>("visao-geral");
  const [loading, setLoading] = useState(true);
  const [responsaveis, setResponsaveis] = useState<{ id: string; nome: string; email: string; tipo: string }[]>([]);

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

        // 2. Radar snapshots (ordenado por data)
        const { data: radares } = await supabase
          .from("radar_snapshots")
          .select("score_comunicacao, score_social, score_atencao, score_regulacao, score_brincadeira, score_flexibilidade, score_autonomia, score_motivacao, criado_em")
          .eq("crianca_id", criancaId)
          .order("criado_em", { ascending: true });

        // 3. Planos ativos com programa
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

        // Mapear radar
        const radarFormatado: RadarSnapshot[] = (radares ?? []).map((r: any, i: number) => ({
          date: `Semana ${(i + 1) * 4}`,
          communication: r.score_comunicacao   ?? 50,
          social:        r.score_social        ?? 50,
          attention:     r.score_atencao       ?? 50,
          regulation:    r.score_regulacao     ?? 50,
          autonomy:      r.score_autonomia     ?? 50,
          flexibility:   r.score_flexibilidade ?? 50,
          play:          r.score_brincadeira   ?? 50,
          motivation:    r.score_motivacao     ?? 50,
        }));

        if (radarFormatado.length === 0) {
          radarFormatado.push({ date: "Semana 1", communication:50, social:50, attention:50, regulation:50, autonomy:50, flexibility:50, play:50, motivation:50 });
        }

        // Mapear programas
        const programs: Program[] = (planos ?? [])
          .filter((pl: any) => pl.programas)
          .map((pl: any) => {
            const prog = pl.programas as any;
            const score = pl.score_atual ?? 50;
            return {
              id: pl.id,
              name: prog.nome,
              domain: prog.dominio,
              status: pl.status === "pausado" ? "stalled" : score >= 80 ? "completed" : "active",
              success: score,
              independence: Math.max(0, score - 15),
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

        // Idade
        const idade = crianca?.data_nascimento
          ? Math.floor((Date.now() - new Date(crianca.data_nascimento).getTime()) / (1000*60*60*24*365.25))
          : 0;

        setData({
          id:        criancaId,
          name:      crianca?.nome ?? "Paciente",
          age:       idade,
          diagnosis: crianca?.diagnostico ?? "Não informado",
          radar:     radarFormatado,
          skills:    [],
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

  const latest = data?.radar[data.radar.length - 1];

  const radarData = useMemo(() => {
    if (!latest) return [];
    return [
      { domain: "Comunicação", value: latest.communication },
      { domain: "Social",      value: latest.social        },
      { domain: "Atenção",     value: latest.attention      },
      { domain: "Regulação",   value: latest.regulation     },
      { domain: "Autonomia",   value: latest.autonomy       },
      { domain: "Flexibilidade",value:latest.flexibility    },
      { domain: "Brincadeira", value: latest.play           },
      { domain: "Motivação",   value: latest.motivation     },
    ];
  }, [latest]);

  const evolutionData = useMemo(() => {
    if (!data) return [];
    return data.radar.map(r => ({
      date: r.date,
      Comunicação: r.communication,
      Atenção:     r.attention,
      Regulação:   r.regulation,
      Social:      r.social,
    }));
  }, [data]);

  const summary = useMemo(() => {
    if (!data || !latest) return null;
    const acquired      = data.skills.filter(s => s.status === "acquired").length;
    const emerging      = data.skills.filter(s => s.status === "emerging").length;
    const activeProgs   = data.programs.filter(p => p.status === "active").length;
    const avgSuccess    = Math.round(data.programs.reduce((a, p) => a + p.success, 0) / data.programs.length);
    const radarValues   = [latest.communication, latest.social, latest.attention, latest.regulation, latest.autonomy, latest.flexibility, latest.play, latest.motivation];
    const avg           = Math.round(radarValues.reduce((a, b) => a + b, 0) / radarValues.length);
    const weakest       = Object.entries({ Comunicação: latest.communication, Atenção: latest.attention, Regulação: latest.regulation, Flexibilidade: latest.flexibility }).sort((a, b) => a[1] - b[1])[0];
    const strongest     = Object.entries({ Autonomia: latest.autonomy, Social: latest.social, Motivação: latest.motivation, Brincadeira: latest.play }).sort((a, b) => b[1] - a[1])[0];
    return { acquired, emerging, activeProgs, avgSuccess, avg, weakest, strongest };
  }, [data, latest]);

  const insights = useMemo(() => {
    if (!data || !latest || !summary) return [];
    const out: string[] = [];
    if (latest.communication < 60 && latest.social >= 60) out.push("Boa base social disponível para ampliar comunicação funcional com alta chance de ganho clínico.");
    if (latest.attention >= 50) out.push("Atenção sustentada já sustenta programas mais estruturados e instruções de 1–2 passos.");
    if (summary.weakest[0] === "Flexibilidade") out.push("Flexibilidade é o domínio mais sensível — deve entrar como alvo transversal na rotina clínica.");
    if (data.programs.some(p => p.status === "stalled")) out.push("Existe programa em estagnação — revisar critério, nível de dica ou reforçadores.");
    return out.slice(0, 4);
  }, [data, latest, summary]);

  const forecastResults = useMemo<ForecastResult[]>(() => {
    if (!data) return [];
    return FORECAST_GOALS.map(goal => generateForecastFromProfile(goal, {
      radar: data.radar, skills: data.skills, programs: data.programs,
      alerts: data.alerts, adherence: 68,
    }));
  }, [data]);

  // ── CSS ────────────────────────────────────────────────────────────────────
  const card: React.CSSProperties = { background: "rgba(13,32,53,.75)", border: "1px solid rgba(70,120,180,.5)", borderRadius: 14, backdropFilter: "blur(8px)" };
  const lbl: React.CSSProperties  = { fontSize: ".6rem", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: ".09em", color: "rgba(170,210,245,.88)", marginBottom: 8 };

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 400 }}>
      <div style={{ fontSize: ".85rem", color: "rgba(160,200,235,.84)" }}>Carregando perfil...</div>
    </div>
  );
  if (!data || !latest || !summary) return null;

  // ── TABS ───────────────────────────────────────────────────────────────────
  const TABS: { id: Tab; label: string }[] = [
    { id: "visao-geral", label: "Visão geral"   },
    { id: "programas",   label: "Programas"     },
    { id: "skill-graph", label: "Skill Graph"   },
    { id: "forecast",    label: "Forecast"      },
    { id: "avaliacoes",  label: "Avaliações"    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>

      {/* ── HEADER ── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 52, height: 52, borderRadius: "50%", background: "linear-gradient(135deg,#1D9E75,#378ADD)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".88rem", fontWeight: 800, color: "#fff", flexShrink: 0 }}>LM</div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <h1 style={{ fontSize: "1.3rem", fontWeight: 800, color: "#e8f0f8", letterSpacing: "-.01em", margin: 0 }}>{data.name}</h1>
              <span style={{ fontSize: ".68rem", background: "rgba(55,138,221,.12)", border: "1px solid rgba(55,138,221,.25)", color: "#378ADD", borderRadius: 20, padding: "2px 9px", fontWeight: 600 }}>FractaCare ativo</span>
            </div>
            <div style={{ fontSize: ".78rem", color: "rgba(160,200,235,.90)" }}>{data.age} anos · {data.diagnosis}</div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link href="/clinic/dashboard" style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, border: "1px solid rgba(70,120,180,.5)", background: "transparent", color: "rgba(160,200,235,.90)", fontSize: ".78rem", fontWeight: 500, textDecoration: "none" }}>
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M10 3L5 8l5 5"/></svg>
            Dashboard
          </Link>
          <Link href={`/clinic/sessao?pacienteId=${data.id}`} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 18px", borderRadius: 8, border: "none", background: "linear-gradient(135deg,#1D9E75,#0f8f7a)", color: "#07111f", fontSize: ".82rem", fontWeight: 800, textDecoration: "none" }}>
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="8" cy="8" r="6"/><path d="M8 5v3l2 1.5"/></svg>
            Iniciar sessão
          </Link>
        </div>
      </div>

      {/* ── KPIs ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 10, marginBottom: 20 }}>
        {[
          { l: "Média geral",        v: `${summary.avg}%`,         c: summary.avg >= 70 ? "#1D9E75" : summary.avg >= 50 ? "#EF9F27" : "#E05A4B" },
          { l: "Habs. consolidadas", v: summary.acquired,          c: "#1D9E75" },
          { l: "Habs. emergentes",   v: summary.emerging,          c: "#EF9F27" },
          { l: "Programas ativos",   v: summary.activeProgs,       c: "#378ADD" },
        ].map(k => (
          <div key={k.l} style={{ ...card, padding: "14px 16px" }}>
            <div style={{ fontSize: ".6rem", color: "rgba(170,210,245,.88)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 6 }}>{k.l}</div>
            <div style={{ fontSize: "1.6rem", fontWeight: 800, color: k.c, letterSpacing: "-.02em", lineHeight: 1 }}>{k.v}</div>
          </div>
        ))}
      </div>

      {/* ── TABS ── */}
      <div style={{ display: "flex", gap: 0, borderBottom: "1px solid rgba(26,58,92,.4)", marginBottom: 20 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: "10px 18px", background: "none", border: "none",
            borderBottom: `2px solid ${tab === t.id ? "#1D9E75" : "transparent"}`,
            color: tab === t.id ? "#1D9E75" : "rgba(160,200,235,.84)",
            fontFamily: "var(--font-sans)", fontWeight: tab === t.id ? 600 : 400,
            fontSize: ".82rem", cursor: "pointer", transition: "color .15s",
            marginBottom: -1,
          }}>{t.label}</button>
        ))}
      </div>

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* TAB: VISÃO GERAL */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      {tab === "visao-geral" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 16 }}>

          {/* Coluna esquerda */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* Radar */}
            <div style={{ ...card, padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: ".88rem", fontWeight: 700, color: "#e8f0f8" }}>Mapa de desenvolvimento</div>
                  <div style={{ fontSize: ".7rem", color: "rgba(160,200,235,.84)", marginTop: 2 }}>Leitura atual dos domínios do repertório</div>
                </div>
                <div style={{ fontSize: ".7rem", color: "rgba(170,210,245,.88)", fontFamily: "monospace" }}>Semana 12</div>
              </div>
              <div style={{ height: 320 }}>
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
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: ".88rem", fontWeight: 700, color: "#e8f0f8" }}>Evolução longitudinal</div>
                <div style={{ fontSize: ".7rem", color: "rgba(160,200,235,.84)", marginTop: 2 }}>Mudança observada nas últimas medições</div>
              </div>
              <div style={{ height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={evolutionData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(26,58,92,.5)" />
                    <XAxis dataKey="date" stroke="rgba(165,208,242,.85)" tick={{ fill: "rgba(160,200,235,.84)", fontSize: 10 }} />
                    <YAxis domain={[0,100]} stroke="rgba(165,208,242,.85)" tick={{ fill: "rgba(160,200,235,.84)", fontSize: 10 }} />
                    <Tooltip contentStyle={{ background: "#0d2035", border: "1px solid rgba(26,58,92,.7)", borderRadius: 10, color: "#e8f0f8", fontSize: 12 }} />
                    <Line type="monotone" dataKey="Comunicação" stroke="#1D9E75" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="Atenção"     stroke="#378ADD" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="Regulação"   stroke="#EF9F27" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="Social"      stroke="#8B7FE8" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div style={{ display: "flex", gap: 14, marginTop: 10, flexWrap: "wrap" }}>
                {[["#1D9E75","Comunicação"],["#378ADD","Atenção"],["#EF9F27","Regulação"],["#8B7FE8","Social"]].map(([c,l]) => (
                  <div key={l} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <div style={{ width: 10, height: 3, background: c, borderRadius: 2 }} />
                    <span style={{ fontSize: ".68rem", color: "rgba(160,200,235,.84)" }}>{l}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Coluna direita */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

            {/* Prioridades clínicas */}
            <div style={{ ...card, padding: 16 }}>
              <div style={{ ...lbl }}>Prioridades clínicas</div>
              {[
                { l: "Ponto mais forte",   v: `${summary.strongest[0]} (${summary.strongest[1]})` },
                { l: "Ponto mais sensível",v: `${summary.weakest[0]} (${summary.weakest[1]})`    },
                { l: "Cúspide provável",   v: "Comunicação funcional"                             },
                { l: "Foco recomendado",   v: "Mandos + regulação + transições"                   },
              ].map(r => (
                <div key={r.l} style={{ padding: "9px 12px", background: "rgba(26,58,92,.25)", borderRadius: 9, marginBottom: 6 }}>
                  <div style={{ fontSize: ".6rem", color: "rgba(170,210,245,.88)", marginBottom: 2 }}>{r.l}</div>
                  <div style={{ fontSize: ".8rem", fontWeight: 500, color: "#e8f0f8" }}>{r.v}</div>
                </div>
              ))}
            </div>

            {/* Alertas clínicos */}
            <div style={{ ...card, padding: 16 }}>
              <div style={{ ...lbl }}>Alertas clínicos</div>
              {data.alerts.map(a => (
                <div key={a.id} style={{ background: ALERT_BG[a.level], border: `1px solid ${ALERT_BORDA[a.level]}`, borderRadius: 10, padding: "12px 14px", marginBottom: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 5 }}>
                    <div style={{ width: 7, height: 7, borderRadius: "50%", background: ALERT_COR[a.level], flexShrink: 0 }} />
                    <span style={{ fontSize: ".78rem", fontWeight: 600, color: "#e8f0f8" }}>{a.title}</span>
                    <span style={{ marginLeft: "auto", fontSize: ".6rem", color: ALERT_COR[a.level], fontWeight: 600, background: `${ALERT_COR[a.level]}22`, borderRadius: 20, padding: "2px 7px" }}>
                      {a.level === "high" ? "Alta" : a.level === "medium" ? "Atenção" : "Baixa"}
                    </span>
                  </div>
                  <div style={{ fontSize: ".75rem", color: "rgba(160,200,235,.92)", lineHeight: 1.55 }}>{a.description}</div>
                </div>
              ))}
            </div>

            {/* Insights — só coordenador e supervisor */}
            {(nivel === "coordenador" || nivel === "supervisor") && insights.length > 0 && (
              <div style={{ ...card, padding: 16 }}>
                <div style={{ ...lbl }}>Insights do Engine</div>
                {insights.map((ins, i) => (
                  <div key={i} style={{ padding: "10px 12px", background: "rgba(29,158,117,.06)", border: "1px solid rgba(29,158,117,.15)", borderRadius: 9, marginBottom: 6, fontSize: ".78rem", color: "rgba(160,200,235,.92)", lineHeight: 1.55 }}>
                    {ins}
                  </div>
                ))}
              </div>
            )}

          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* TAB: PROGRAMAS */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      {tab === "programas" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {data.programs.map(p => {
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
                  {[{ l: "Taxa de sucesso", v: p.success },{ l: "Independência", v: p.independence }].map(m => (
                    <div key={m.l}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                        <span style={{ fontSize: ".72rem", color: "rgba(160,200,235,.84)" }}>{m.l}</span>
                        <span style={{ fontSize: ".72rem", color: m.v >= 80 ? "#1D9E75" : m.v >= 50 ? "#EF9F27" : "#E05A4B", fontWeight: 600 }}>{m.v}%</span>
                      </div>
                      <div style={{ height: 5, background: "rgba(26,58,92,.5)", borderRadius: 50, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${m.v}%`, background: m.v >= 80 ? "#1D9E75" : m.v >= 50 ? "#EF9F27" : "#E05A4B", transition: "width .5s" }} />
                      </div>
                    </div>
                  ))}
                </div>

                {p.status === "stalled" && (
                  <div style={{ background: "rgba(224,90,75,.07)", border: "1px solid rgba(224,90,75,.2)", borderRadius: 8, padding: "8px 12px", fontSize: ".75rem", color: "#E05A4B" }}>
                    ⚠ Programa travado — revisar critério, nível de dica ou reforçadores
                  </div>
                )}
                {p.status === "completed" && (
                  <div style={{ background: "rgba(55,138,221,.07)", border: "1px solid rgba(55,138,221,.2)", borderRadius: 8, padding: "8px 12px", fontSize: ".75rem", color: "#378ADD" }}>
                    ✓ Programa concluído — considerar generalização
                  </div>
                )}
                {p.success >= 80 && p.status === "active" && (
                  <div style={{ background: "rgba(29,158,117,.07)", border: "1px solid rgba(29,158,117,.2)", borderRadius: 8, padding: "8px 12px", fontSize: ".75rem", color: "#1D9E75" }}>
                    ✓ Próximo de critério — considerar avançar nível de dica
                  </div>
                )}

                {p.relatedPrograms && p.relatedPrograms.length > 0 && (
                  <div style={{ marginTop: 10, display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <span style={{ fontSize: ".62rem", color: "rgba(165,208,242,.85)" }}>Relacionado:</span>
                    {p.relatedPrograms.map(r => (
                      <span key={r} style={{ fontSize: ".65rem", background: "rgba(20,55,110,.65)", border: "1px solid rgba(26,58,92,.6)", color: "rgba(160,200,235,.90)", borderRadius: 20, padding: "2px 8px" }}>{r}</span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* TAB: SKILL GRAPH */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      {tab === "skill-graph" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {(["acquired","emerging","absent"] as const).map(status => {
            const st = STATUS_SKILL[status];
            const skills = data.skills.filter(s => s.status === status);
            if (skills.length === 0) return null;
            return (
              <div key={status} style={{ ...card, padding: 18, gridColumn: status === "acquired" ? "1 / -1" : undefined }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: st.cor }} />
                  <span style={{ fontSize: ".7rem", fontWeight: 700, color: st.cor, textTransform: "uppercase", letterSpacing: ".08em" }}>{st.label}</span>
                  <span style={{ fontSize: ".65rem", color: "rgba(165,208,242,.85)", marginLeft: 4 }}>{skills.length} habilidade{skills.length > 1 ? "s" : ""}</span>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {skills.map(s => (
                    <div key={s.id} style={{ background: st.bg, border: `1px solid ${st.borda}`, borderRadius: 9, padding: "8px 12px", minWidth: 140 }}>
                      <div style={{ fontSize: ".8rem", fontWeight: 500, color: "#e8f0f8", marginBottom: 2 }}>{s.name}</div>
                      <div style={{ fontSize: ".65rem", color: "rgba(170,210,245,.88)" }}>{s.domain}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* TAB: FORECAST */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      {tab === "forecast" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          {/* Sumário */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 10 }}>
            {[
              { l: "Metas ativas",   v: forecastResults.length,                                                   c: "#e8f0f8" },
              { l: "Travadas",       v: forecastResults.filter(r => r.goalHealth === "stalled").length,           c: "#E05A4B" },
              { l: "Ganhos rápidos", v: forecastResults.filter(r => r.riskScore <= 45 && r.effort !== "high").length, c: "#1D9E75" },
              { l: "Risco médio",    v: Math.round(forecastResults.reduce((a, r) => a + r.riskScore, 0) / (forecastResults.length || 1)), c: "#EF9F27" },
            ].map(k => (
              <div key={k.l} style={{ ...card, padding: "14px 16px" }}>
                <div style={{ fontSize: ".6rem", color: "rgba(170,210,245,.88)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 6 }}>{k.l}</div>
                <div style={{ fontSize: "1.6rem", fontWeight: 800, color: k.c, letterSpacing: "-.02em" }}>{k.v}</div>
              </div>
            ))}
          </div>

          {/* Cards de forecast */}
          {forecastResults.map(item => {
            const healthCor: Record<string,string> = { on_track:"#378ADD", watch:"#EF9F27", stalled:"#E05A4B", accelerating:"#1D9E75", consolidating:"#8B7FE8" };
            const riskBg = item.riskScore >= 65 ? "#E05A4B" : item.riskScore >= 40 ? "#EF9F27" : "#1D9E75";
            return (
              <div key={item.goalId} style={{ ...card, overflow: "hidden" }}>
                <div style={{ height: 3, background: riskBg }} />
                <div style={{ padding: 18 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                        <span style={{ fontSize: ".9rem", fontWeight: 700, color: "#e8f0f8" }}>{item.goalName}</span>
                        <span style={{ fontSize: ".62rem", background: `${healthCor[item.goalHealth] ?? "#4d6d8a"}22`, border: `1px solid ${healthCor[item.goalHealth] ?? "#4d6d8a"}44`, color: healthCor[item.goalHealth] ?? "#4d6d8a", borderRadius: 20, padding: "2px 8px", fontWeight: 600 }}>
                          {FORECAST_HEALTH_PT[item.goalHealth] ?? item.goalHealth}
                        </span>
                      </div>
                      <div style={{ fontSize: ".68rem", color: "rgba(170,210,245,.88)", textTransform: "uppercase", letterSpacing: ".08em" }}>{DOMINIO_PT[item.goalType] ?? item.goalType}</div>
                    </div>
                    <div style={{ background: "rgba(26,58,92,.35)", border: "1px solid rgba(70,120,180,.5)", borderRadius: 10, padding: "10px 16px", textAlign: "right" }}>
                      <div style={{ fontSize: ".6rem", color: "rgba(170,210,245,.88)", textTransform: "uppercase", letterSpacing: ".08em" }}>Previsão</div>
                      <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#1D9E75", marginTop: 2 }}>{item.min}–{item.max} sessões</div>
                      <div style={{ fontSize: ".65rem", color: "rgba(170,210,245,.88)" }}>esforço {item.effort === "low" ? "baixo" : item.effort === "moderate" ? "moderado" : "alto"}</div>
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(5,minmax(0,1fr))", gap: 8, marginBottom: 12 }}>
                    {[
                      { l:"Risco",      v: item.riskScore },
                      { l:"Revisar em", v: `${item.reviewAfterSessions} sessões` },
                      { l:"Tendência",  v: item.progressDelta >= 4 ? "↑ melhora" : item.progressDelta === 0 ? "estável" : "↓ queda" },
                      { l:"Confiança",  v: item.confidence === "high" ? "alta" : item.confidence === "medium" ? "média" : "baixa" },
                      { l:"Ação",       v: item.recommendedAction === "continue" ? "manter" : item.recommendedAction === "generalize" ? "generalizar" : item.recommendedAction.replace(/_/g, " ") },
                    ].map(m => (
                      <div key={m.l} style={{ background: "rgba(20,55,110,.55)", borderRadius: 8, padding: "7px 10px" }}>
                        <div style={{ fontSize: ".58rem", color: "rgba(165,208,242,.85)", textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 3 }}>{m.l}</div>
                        <div style={{ fontSize: ".78rem", fontWeight: 600, color: "#e8f0f8" }}>{m.v}</div>
                      </div>
                    ))}
                  </div>

                  {/* Rationale — só para coordenador e supervisor */}
                  {(nivel === "coordenador" || nivel === "supervisor") && item.rationale.slice(0, 2).map((r, i) => (
                    <div key={i} style={{ padding: "7px 10px", background: "rgba(26,58,92,.2)", border: "1px solid rgba(70,120,180,.4)", borderRadius: 8, fontSize: ".75rem", color: "rgba(160,200,235,.92)", lineHeight: 1.5, marginBottom: 5 }}>
                      {r}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* TAB: AVALIAÇÕES */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      {tab === "avaliacoes" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 20 }}>

          {/* Protocolos aplicados */}
          <div style={{ ...card, padding: 20 }}>
            <div style={{ fontSize: ".88rem", fontWeight: 700, color: "#e8f0f8", marginBottom: 14 }}>Protocolos aplicados</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { sigla: "VB-MAPP", cor: "#1D9E75", data: "15 Jan 2025", pontos: 68, max: 170, nivel: "Nível 1–2", revisao: "Jul 2025" },
              ].map(av => {
                const pct = Math.round((av.pontos / av.max) * 100);
                return (
                  <div key={av.sigla} style={{ padding: "14px 16px", background: "rgba(26,58,92,.25)", borderRadius: 11, border: `1px solid ${av.cor}33` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                          <span style={{ fontSize: ".9rem", fontWeight: 800, color: av.cor }}>{av.sigla}</span>
                          <span style={{ fontSize: ".65rem", color: "#1D9E75", background: "rgba(29,158,117,.1)", borderRadius: 20, padding: "2px 8px", fontWeight: 600 }}>✓ Concluída</span>
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

          {/* Análise Funcional */}
          <div style={{ ...card, padding: 20 }}>
            <div style={{ fontSize: ".88rem", fontWeight: 700, color: "#e8f0f8", marginBottom: 4 }}>Análise Funcional</div>
            <div style={{ fontSize: ".7rem", color: "rgba(160,200,235,.84)", marginBottom: 14 }}>Função comportamental identificada e instrumentos aplicados</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { tipo: "Experimental", resultado: "Fuga/Esquiva", cor: "#E05A4B", data: "10 Abr 2025", instrumento: "AF Experimental — 4 condições", descricao: "Comportamento mantido por reforçamento negativo. FCT com mando de pausa recomendado." },
                { tipo: "Indireta",     resultado: "Pendente",      cor: "#EF9F27", data: "10 Abr 2025", instrumento: "MAS — enviado via FractaCare",   descricao: "Aguardando resposta da família." },
              ].map(af => (
                <div key={af.tipo} style={{ padding: "12px 14px", background: "rgba(26,58,92,.2)", borderRadius: 10, border: `1px solid ${af.cor}33` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                    <span style={{ fontSize: ".75rem", fontWeight: 700, color: "#e8f0f8" }}>AF {af.tipo}</span>
                    <span style={{ fontSize: ".65rem", color: af.cor, background: `${af.cor}15`, borderRadius: 20, padding: "2px 8px", fontWeight: 600 }}>{af.resultado}</span>
                    <span style={{ fontSize: ".62rem", color: "rgba(170,210,245,.88)", marginLeft: "auto" }}>{af.data}</span>
                  </div>
                  <div style={{ fontSize: ".72rem", color: "rgba(160,200,235,.90)", marginBottom: 3 }}>{af.instrumento}</div>
                  <div style={{ fontSize: ".72rem", color: "rgba(160,200,235,.92)", lineHeight: 1.55 }}>{af.descricao}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Domínios do radar vs avaliação */}
          <div style={{ ...card, padding: 20 }}>
            <div style={{ fontSize: ".88rem", fontWeight: 700, color: "#e8f0f8", marginBottom: 4 }}>Domínios VB-MAPP — último resultado</div>
            <div style={{ fontSize: ".7rem", color: "rgba(160,200,235,.84)", marginBottom: 14 }}>Pontuação por domínio · Jan 2025</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                { nome: "Mando",               pts: 7,  max: 15, cor: "#1D9E75" },
                { nome: "Tato",                pts: 5,  max: 15, cor: "#378ADD" },
                { nome: "Ouvinte",             pts: 9,  max: 15, cor: "#8B7FE8" },
                { nome: "Habilidades visuais", pts: 11, max: 15, cor: "#EF9F27" },
                { nome: "Intraverbal",         pts: 3,  max: 15, cor: "#E05A4B" },
                { nome: "Social/Brincar",      pts: 8,  max: 15, cor: "#23c48f" },
                { nome: "Imitação motora",     pts: 6,  max: 10, cor: "#4d6d8a" },
              ].map(d => {
                const pct = Math.round((d.pts / d.max) * 100);
                return (
                  <div key={d.nome} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: ".72rem", color: "rgba(160,200,235,.90)", width: 140, flexShrink: 0 }}>{d.nome}</span>
                    <div style={{ flex: 1, height: 6, background: "rgba(26,58,92,.5)", borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${pct}%`, background: d.cor, borderRadius: 3 }} />
                    </div>
                    <span style={{ fontSize: ".68rem", color: d.cor, fontWeight: 700, fontFamily: "monospace", width: 36, textAlign: "right" }}>{d.pts}/{d.max}</span>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
