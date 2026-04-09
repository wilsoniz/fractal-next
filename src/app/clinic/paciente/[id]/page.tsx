"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import {
  Brain,
  Sparkles,
  Activity,
  Target,
  TriangleAlert,
  CheckCircle2,
  ArrowUpRight,
} from "lucide-react";
import {
  generateForecastFromProfile,
  type ForecastGoal,
  type ForecastResult,
} from "@/lib/forecast";

type RadarSnapshot = {
  date: string;
  communication: number;
  social: number;
  attention: number;
  regulation: number;
  autonomy: number;
  flexibility: number;
  play: number;
  motivation: number;
};

type Skill = {
  id: string;
  name: string;
  domain: string;
  status: "absent" | "emerging" | "acquired";
};

type Program = {
  id: string;
  name: string;
  domain: string;
  status: "active" | "completed" | "stalled";
  success: number;
  independence: number;
};

type ClinicalAlert = {
  id: string;
  title: string;
  description: string;
  level: "low" | "medium" | "high";
};

type LearnerProfile = {
  id: string;
  name: string;
  age: number;
  diagnosis?: string;
  radar: RadarSnapshot[];
  skills: Skill[];
  programs: Program[];
  alerts: ClinicalAlert[];
};

const FORECAST_GOALS: ForecastGoal[] = [
  {
    id: "g1",
    name: "Pedir o que quer",
    type: "acquisition",
    targetDomain: "communication",
    requiredSkills: ["Contato visual", "Apontar para pedir"],
  },
  {
    id: "g2",
    name: "Esperar 5 segundos",
    type: "replacement",
    targetDomain: "regulation",
    requiredSkills: ["Esperar por alguns segundos"],
  },
  {
    id: "g3",
    name: "Transições mais tranquilas",
    type: "reduction",
    targetDomain: "flexibility",
    relatedPrograms: ["Troca de turnos"],
  },
];

export default function LearnerProfilePage() {
  const [data, setData] = useState<LearnerProfile | null>(null);

  useEffect(() => {
    setData({
      id: "1",
      name: "Lucas",
      age: 3,
      diagnosis: "Perfil em acompanhamento",
      radar: [
        {
          date: "Dia 1",
          communication: 42,
          social: 60,
          attention: 38,
          regulation: 45,
          autonomy: 70,
          flexibility: 40,
          play: 55,
          motivation: 62,
        },
        {
          date: "Dia 15",
          communication: 48,
          social: 63,
          attention: 44,
          regulation: 49,
          autonomy: 72,
          flexibility: 43,
          play: 58,
          motivation: 64,
        },
        {
          date: "Dia 30",
          communication: 58,
          social: 68,
          attention: 50,
          regulation: 55,
          autonomy: 75,
          flexibility: 49,
          play: 63,
          motivation: 69,
        },
      ],
      skills: [
        {
          id: "s1",
          name: "Contato visual",
          domain: "Interação social",
          status: "acquired",
        },
        {
          id: "s2",
          name: "Apontar para pedir",
          domain: "Comunicação",
          status: "emerging",
        },
        {
          id: "s3",
          name: "Imitação motora",
          domain: "Aprendizagem",
          status: "emerging",
        },
        {
          id: "s4",
          name: "Seguir instruções simples",
          domain: "Atenção e aprendizagem",
          status: "absent",
        },
        {
          id: "s5",
          name: "Esperar por alguns segundos",
          domain: "Regulação",
          status: "emerging",
        },
        {
          id: "s6",
          name: "Brincadeira funcional",
          domain: "Brincadeira",
          status: "acquired",
        },
      ],
      programs: [
        {
          id: "p1",
          name: "Pedir o que quer",
          domain: "Comunicação",
          status: "active",
          success: 65,
          independence: 48,
        },
        {
          id: "p2",
          name: "Esperar 3 segundos",
          domain: "Regulação",
          status: "active",
          success: 40,
          independence: 30,
        },
        {
          id: "p3",
          name: "Troca de turnos",
          domain: "Interação social",
          status: "stalled",
          success: 22,
          independence: 18,
        },
      ],
      alerts: [
        {
          id: "a1",
          title: "Habilidade travada",
          description:
            "Troca de turnos permanece abaixo de 25% de sucesso nas últimas tentativas.",
          level: "high",
        },
        {
          id: "a2",
          title: "Janela de emergência",
          description:
            "Apontar para pedir parece próximo de consolidar e pode destravar comunicação funcional.",
          level: "medium",
        },
        {
          id: "a3",
          title: "Atenção em crescimento",
          description:
            "O domínio de atenção subiu nas últimas medições e pode sustentar programas mais estruturados.",
          level: "low",
        },
      ],
    });
  }, []);

  const latest = data?.radar[data.radar.length - 1];

  const radarData = useMemo(() => {
    if (!latest) return [];
    return [
      { domain: "Comunicação", value: latest.communication },
      { domain: "Social", value: latest.social },
      { domain: "Atenção", value: latest.attention },
      { domain: "Regulação", value: latest.regulation },
      { domain: "Autonomia", value: latest.autonomy },
      { domain: "Flexibilidade", value: latest.flexibility },
      { domain: "Brincadeira", value: latest.play },
      { domain: "Motivação", value: latest.motivation },
    ];
  }, [latest]);

  const evolutionData = useMemo(() => {
    if (!data) return [];
    return data.radar.map((item) => ({
      date: item.date,
      Comunicação: item.communication,
      Atenção: item.attention,
      Regulação: item.regulation,
      Social: item.social,
    }));
  }, [data]);

  const summary = useMemo(() => {
    if (!data || !latest) return null;

    const acquired = data.skills.filter((s) => s.status === "acquired").length;
    const emerging = data.skills.filter((s) => s.status === "emerging").length;
    const activePrograms = data.programs.filter((p) => p.status === "active").length;
    const avgProgramSuccess = Math.round(
      data.programs.reduce((acc, p) => acc + p.success, 0) / data.programs.length
    );

    const weakestDomain = [
      { name: "Comunicação", value: latest.communication },
      { name: "Atenção", value: latest.attention },
      { name: "Regulação", value: latest.regulation },
      { name: "Flexibilidade", value: latest.flexibility },
    ].sort((a, b) => a.value - b.value)[0];

    const strongestDomain = [
      { name: "Autonomia", value: latest.autonomy },
      { name: "Social", value: latest.social },
      { name: "Motivação", value: latest.motivation },
      { name: "Brincadeira", value: latest.play },
    ].sort((a, b) => b.value - a.value)[0];

    return {
      acquired,
      emerging,
      activePrograms,
      avgProgramSuccess,
      weakestDomain,
      strongestDomain,
    };
  }, [data, latest]);

  const insights = useMemo(() => {
    if (!data || !latest || !summary) return [];

    const result: string[] = [];

    if (latest.communication < 60 && latest.social >= 60) {
      result.push(
        "Há boa base social para ampliar comunicação funcional com alta chance de ganho clínico."
      );
    }

    if (latest.attention >= 50) {
      result.push(
        "Atenção sustentada já mostra base suficiente para programas mais estruturados e instruções curtas."
      );
    }

    if (summary.weakestDomain.name === "Flexibilidade") {
      result.push(
        "Flexibilidade aparece como ponto de maior sensibilidade e deve entrar como alvo transversal da rotina clínica."
      );
    }

    if (data.programs.some((p) => p.status === "stalled")) {
      result.push(
        "Existe ao menos um programa em estagnação e isso sugere ajuste de critério, prompting ou reforçadores."
      );
    }

    return result.slice(0, 4);
  }, [data, latest, summary]);

  const forecastResults = useMemo<ForecastResult[]>(() => {
    if (!data) return [];
    return FORECAST_GOALS.map((goal) =>
      generateForecastFromProfile(goal, {
        radar: data.radar,
        skills: data.skills,
        programs: data.programs,
        alerts: data.alerts,
        adherence: 68,
      })
    );
  }, [data]);

  if (!data || !latest || !summary) return null;

  return (
    <div className="min-h-screen bg-[#07111f] text-white">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <header className="mb-6 rounded-[28px] border border-white/10 bg-white/5 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.25)] backdrop-blur">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-300">
                <Brain className="h-3.5 w-3.5" />
                FractaClinic · Learner Profile
              </div>

              <div>
                <h1 className="text-4xl font-semibold tracking-tight">{data.name}</h1>
                <p className="mt-1 text-sm text-white/60">
                  {data.age} anos • {data.diagnosis}
                </p>
              </div>

              <p className="max-w-2xl text-sm leading-6 text-white/70">
                Visão integrada do caso clínico com evolução longitudinal,
                prioridades terapêuticas, habilidades emergentes e performance dos programas.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <MetricCard
                label="Consolidadas"
                value={String(summary.acquired)}
                icon={<CheckCircle2 className="h-4 w-4" />}
              />
              <MetricCard
                label="Emergentes"
                value={String(summary.emerging)}
                icon={<Sparkles className="h-4 w-4" />}
              />
              <MetricCard
                label="Programas ativos"
                value={String(summary.activePrograms)}
                icon={<Target className="h-4 w-4" />}
              />
              <MetricCard
                label="Sucesso médio"
                value={`${summary.avgProgramSuccess}%`}
                icon={<Activity className="h-4 w-4" />}
              />
            </div>
          </div>
        </header>

        <div className="grid gap-6 xl:grid-cols-12">
          <div className="space-y-6 xl:col-span-8">
            <SectionCard
              title="Mapa atual de desenvolvimento"
              subtitle="Leitura atual dos principais domínios do repertório"
            >
              <div className="h-[380px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="rgba(255,255,255,0.12)" />
                    <PolarAngleAxis
                      dataKey="domain"
                      tick={{ fill: "rgba(255,255,255,0.75)", fontSize: 12 }}
                    />
                    <Radar
                      name="Desenvolvimento"
                      dataKey="value"
                      stroke="#22c55e"
                      fill="#22c55e"
                      fillOpacity={0.18}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </SectionCard>

            <SectionCard
              title="Evolução longitudinal"
              subtitle="Mudança observada nas últimas medições"
            >
              <div className="h-[320px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={evolutionData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                    <XAxis dataKey="date" stroke="rgba(255,255,255,0.45)" />
                    <YAxis domain={[0, 100]} stroke="rgba(255,255,255,0.45)" />
                    <Tooltip
                      contentStyle={{
                        background: "#08101c",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: 16,
                        color: "#fff",
                      }}
                    />
                    <Line type="monotone" dataKey="Comunicação" stroke="#22c55e" strokeWidth={3} dot={false} />
                    <Line type="monotone" dataKey="Atenção" stroke="#38bdf8" strokeWidth={3} dot={false} />
                    <Line type="monotone" dataKey="Regulação" stroke="#f59e0b" strokeWidth={3} dot={false} />
                    <Line type="monotone" dataKey="Social" stroke="#a78bfa" strokeWidth={3} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </SectionCard>

            <SectionCard
              title="Programas em andamento"
              subtitle="Leitura operacional dos alvos ativos"
            >
              <div className="space-y-4">
                {data.programs.map((program) => (
                  <div
                    key={program.id}
                    className="rounded-2xl border border-white/10 bg-white/5 p-4"
                  >
                    <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-white">{program.name}</p>
                          <ArrowUpRight className="h-4 w-4 text-white/30" />
                        </div>
                        <p className="text-sm text-white/55">{program.domain}</p>
                      </div>

                      <StatusBadge status={program.status} />
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <ProgressBlock label="Taxa de sucesso" value={program.success} />
                      <ProgressBlock label="Independência" value={program.independence} />
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>

          <div className="space-y-6 xl:col-span-4">
            <SectionCard
              title="Prioridades clínicas"
              subtitle="Direção tática para supervisão"
            >
              <div className="space-y-3">
                <PriorityRow
                  label="Ponto mais forte"
                  value={`${summary.strongestDomain.name} (${summary.strongestDomain.value})`}
                />
                <PriorityRow
                  label="Ponto mais sensível"
                  value={`${summary.weakestDomain.name} (${summary.weakestDomain.value})`}
                />
                <PriorityRow
                  label="Cúspide provável"
                  value="Comunicação funcional"
                />
                <PriorityRow
                  label="Foco recomendado"
                  value="Mandos iniciais + regulação + transições"
                />
              </div>
            </SectionCard>

            <SectionCard
              title="Alertas clínicos"
              subtitle="Sinais que exigem decisão"
            >
              <div className="space-y-3">
                {data.alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="rounded-2xl border border-white/10 bg-white/5 p-4"
                  >
                    <div className="mb-2 flex gap-3">
                      <div className="mt-0.5">
                        <TriangleAlert className="h-4 w-4 text-amber-300" />
                      </div>
                      <div className="space-y-1">
                        <p className="font-medium text-white">{alert.title}</p>
                        <p className="text-sm leading-6 text-white/60">
                          {alert.description}
                        </p>
                      </div>
                    </div>
                    <SeverityBadge level={alert.level} />
                  </div>
                ))}
              </div>
            </SectionCard>

            <SectionCard
              title="Skill graph resumido"
              subtitle="Estado atual de habilidades-chave"
            >
              <div className="space-y-3">
                {data.skills.map((skill) => (
                  <div
                    key={skill.id}
                    className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-3"
                  >
                    <div>
                      <p className="font-medium text-white">{skill.name}</p>
                      <p className="text-xs text-white/45">{skill.domain}</p>
                    </div>
                    <StatusBadge status={skill.status} />
                  </div>
                ))}
              </div>
            </SectionCard>

            <SectionCard
              title="Insights automáticos"
              subtitle="Leituras clínicas sugeridas pelo sistema"
            >
              <div className="space-y-3">
                {insights.map((item, index) => (
                  <div
                    key={index}
                    className="rounded-2xl border border-emerald-400/10 bg-emerald-400/5 p-4 text-sm leading-6 text-white/70"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>
        </div>

        {/* ── Forecast Section (full width) ── */}
        <section className="rounded-[28px] border border-white/10 bg-white/5 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.18)] backdrop-blur">
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-white">Previsibilidade de metas</h2>
            <p className="mt-1 text-sm text-white/50">
              Forecast clínico dinâmico com priorização visual e revisão automática
            </p>
          </div>

          <div className="space-y-5">
            <ForecastSummaryGrid results={forecastResults} />

            <div className="grid gap-4 xl:grid-cols-3">
              <ForecastBucket
                title="Ganhos rápidos"
                subtitle="Metas com menor esforço e boa chance de avanço"
                items={forecastResults.filter(
                  (r) =>
                    (r.goalHealth === "accelerating" || r.goalHealth === "on_track") &&
                    r.effort !== "high" &&
                    r.riskScore <= 45
                )}
                emptyMessage="Nenhuma meta com perfil claro de ganho rápido no momento."
              />
              <ForecastBucket
                title="Pontos críticos"
                subtitle="Metas que pedem revisão clínica mais breve"
                items={forecastResults.filter(
                  (r) =>
                    r.goalHealth === "stalled" ||
                    r.riskScore >= 65 ||
                    r.reviewAfterSessions <= 2
                )}
                emptyMessage="Nenhuma meta crítica identificada agora."
              />
              <ForecastBucket
                title="Consolidação próxima"
                subtitle="Metas perto de fading ou generalização"
                items={forecastResults.filter(
                  (r) =>
                    r.goalHealth === "consolidating" ||
                    r.recommendedAction === "fade_support" ||
                    r.recommendedAction === "generalize"
                )}
                emptyMessage="Nenhuma meta em consolidação avançada ainda."
              />
            </div>

            <div className="space-y-4">
              {forecastResults.map((item) => (
                <ForecastGoalCard key={item.goalId} item={item} />
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function SectionCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[28px] border border-white/10 bg-white/5 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.18)] backdrop-blur">
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        {subtitle ? (
          <p className="mt-1 text-sm text-white/50">{subtitle}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function MetricCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0c1728] p-4 shadow-sm">
      <div className="mb-2 flex items-center justify-between text-white/45">
        <span className="text-xs">{label}</span>
        {icon}
      </div>
      <div className="text-2xl font-semibold tracking-tight text-white">{value}</div>
    </div>
  );
}

function ProgressBlock({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="text-white/70">{label}</span>
        <span className="text-white/45">{value}%</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

function PriorityRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <p className="text-xs text-white/40">{label}</p>
      <p className="mt-1 text-sm font-medium leading-6 text-white/85">{value}</p>
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: "absent" | "emerging" | "acquired" | "active" | "completed" | "stalled";
}) {
  const styles = {
    absent: "bg-white/10 text-white/55 border-white/10",
    emerging: "bg-amber-400/10 text-amber-300 border-amber-400/20",
    acquired: "bg-emerald-400/10 text-emerald-300 border-emerald-400/20",
    active: "bg-cyan-400/10 text-cyan-300 border-cyan-400/20",
    completed: "bg-emerald-400/10 text-emerald-300 border-emerald-400/20",
    stalled: "bg-red-400/10 text-red-300 border-red-400/20",
  };

  const labels = {
    absent: "Ausente",
    emerging: "Emergente",
    acquired: "Consolidada",
    active: "Ativo",
    completed: "Concluído",
    stalled: "Travado",
  };

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}

function SeverityBadge({
  level,
}: {
  level: "low" | "medium" | "high";
}) {
  const styles = {
    low: "bg-white/10 text-white/55 border-white/10",
    medium: "bg-amber-400/10 text-amber-300 border-amber-400/20",
    high: "bg-red-400/10 text-red-300 border-red-400/20",
  };

  const labels = {
    low: "Baixa prioridade",
    medium: "Atenção clínica",
    high: "Alta prioridade",
  };

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${styles[level]}`}
    >
      {labels[level]}
    </span>
  );
}

// ─── Forecast UI Components ───────────────────────────────────────────────────

function ForecastSummaryGrid({ results }: { results: ForecastResult[] }) {
  const stalled = results.filter((r) => r.goalHealth === "stalled").length;
  const quickWins = results.filter(
    (r) =>
      (r.goalHealth === "accelerating" || r.goalHealth === "on_track") &&
      r.effort !== "high" &&
      r.riskScore <= 45
  ).length;
  const nextReviews = results.filter((r) => r.reviewAfterSessions <= 3).length;
  const avgRisk =
    results.length > 0
      ? Math.round(results.reduce((acc, r) => acc + r.riskScore, 0) / results.length)
      : 0;

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      <ForecastStatCard label="Metas ativas" value={String(results.length)} tone="neutral" />
      <ForecastStatCard
        label="Travadas"
        value={String(stalled)}
        tone={stalled > 0 ? "danger" : "neutral"}
      />
      <ForecastStatCard
        label="Ganhos rápidos"
        value={String(quickWins)}
        tone={quickWins > 0 ? "success" : "neutral"}
      />
      <ForecastStatCard
        label="Risco médio"
        value={String(avgRisk)}
        tone={avgRisk >= 60 ? "danger" : avgRisk >= 40 ? "warning" : "success"}
        helper={`${nextReviews} revisão(ões) próximas`}
      />
    </div>
  );
}

function ForecastStatCard({
  label,
  value,
  helper,
  tone,
}: {
  label: string;
  value: string;
  helper?: string;
  tone: "neutral" | "success" | "warning" | "danger";
}) {
  const tones = {
    neutral: "border-white/10 bg-white/5 text-white",
    success: "border-emerald-400/20 bg-emerald-400/10 text-emerald-300",
    warning: "border-amber-400/20 bg-amber-400/10 text-amber-300",
    danger: "border-red-400/20 bg-red-400/10 text-red-300",
  };

  return (
    <div className={`rounded-2xl border p-4 ${tones[tone]}`}>
      <p className="text-xs uppercase tracking-wide opacity-70">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
      {helper ? <p className="mt-1 text-xs opacity-70">{helper}</p> : null}
    </div>
  );
}

function ForecastBucket({
  title,
  subtitle,
  items,
  emptyMessage,
}: {
  title: string;
  subtitle: string;
  items: ForecastResult[];
  emptyMessage: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
      <div className="mb-4">
        <p className="font-medium text-white">{title}</p>
        <p className="text-sm text-white/45">{subtitle}</p>
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border border-white/8 bg-white/5 px-3 py-3 text-sm text-white/45">
          {emptyMessage}
        </div>
      ) : (
        <div className="space-y-3">
          {items.slice(0, 3).map((item) => (
            <div key={item.goalId} className="rounded-xl border border-white/8 bg-white/5 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-white">{item.goalName}</p>
                  <p className="mt-1 text-xs text-white/45">
                    {item.min}–{item.max} sessões
                  </p>
                </div>
                <HealthBadge value={item.goalHealth} />
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-white/45">
                <span>Risco {item.riskScore}</span>
                <span>Revisar em {item.reviewAfterSessions}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ForecastGoalCard({ item }: { item: ForecastResult }) {
  const riskBar = getRiskBarClass(item.riskScore);
  const rationaleStyle = getHealthRationaleStyle(item.goalHealth);

  return (
    <div className="overflow-hidden rounded-[24px] border border-white/10 bg-white/5">
      <div className={`h-1.5 w-full ${riskBar}`} />
      <div className="p-4">
        <div className="mb-4 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-base font-semibold text-white">{item.goalName}</p>
              <HealthBadge value={item.goalHealth} />
            </div>
            <p className="mt-1 text-xs uppercase tracking-[0.18em] text-white/35">
              {item.goalType}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3 text-right">
            <p className="text-xs uppercase tracking-wide text-white/35">Previsão atual</p>
            <p className="mt-1 text-lg font-semibold text-emerald-300">
              {item.min}–{item.max} sessões
            </p>
            <p className="text-xs text-white/45">esforço {translateEffort(item.effort)}</p>
          </div>
        </div>

        <div className="mb-4 grid gap-3 md:grid-cols-3 xl:grid-cols-5">
          <ForecastMetric label="Risco" value={String(item.riskScore)} hint="0 a 100" />
          <ForecastMetric label="Tendência" value={translateProgressDelta(item.progressDelta)} />
          <ForecastMetric label="Revisar em" value={`${item.reviewAfterSessions} sessões`} />
          <ForecastMetric label="Ação" value={translateRecommendedAction(item.recommendedAction)} />
          <ForecastMetric label="Confiança" value={translateConfidence(item.confidence)} />
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          <MiniPill label={`Prontidão: ${translateLevel(item.inferredReadiness)}`} />
          <MiniPill label={`Suporte: ${translateLevel(item.inferredSupport)}`} />
          <MiniPill label={`Generalização: ${translateLevel(item.inferredGeneralization)}`} />
          <MiniPill label={`Barreiras: ${item.inferredBarriers}`} />
          <MiniPill label={`Severidade: ${item.inferredSeverity}`} />
        </div>

        <div className="grid gap-3 xl:grid-cols-3">
          {item.rationale.slice(0, 3).map((reason, index) => (
            <div
              key={index}
              className={`rounded-2xl border bg-black/10 p-3 text-sm leading-6 ${rationaleStyle}`}
            >
              {reason}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ForecastMetric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/10 p-3">
      <p className="text-[11px] uppercase tracking-wide text-white/35">{label}</p>
      <p className="mt-1 text-sm font-medium text-white/80">{value}</p>
      {hint ? <p className="mt-1 text-[11px] text-white/35">{hint}</p> : null}
    </div>
  );
}

function HealthBadge({ value }: { value: ForecastResult["goalHealth"] }) {
  const map: Record<ForecastResult["goalHealth"], string> = {
    on_track: "border-cyan-400/20 bg-cyan-400/10 text-cyan-300",
    watch: "border-amber-400/20 bg-amber-400/10 text-amber-300",
    stalled: "border-red-400/20 bg-red-400/10 text-red-300",
    accelerating: "border-emerald-400/20 bg-emerald-400/10 text-emerald-300",
    consolidating: "border-violet-400/20 bg-violet-400/10 text-violet-300",
  };
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${map[value]}`}>
      {translateGoalHealth(value)}
    </span>
  );
}

function MiniPill({ label }: { label: string }) {
  return (
    <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-white/65">
      {label}
    </span>
  );
}

function getRiskBarClass(riskScore: number) {
  if (riskScore >= 65) return "bg-gradient-to-r from-red-500 to-rose-400";
  if (riskScore >= 40) return "bg-gradient-to-r from-amber-400 to-orange-300";
  return "bg-gradient-to-r from-emerald-400 to-cyan-400";
}

function getHealthRationaleStyle(value: ForecastResult["goalHealth"]) {
  if (value === "stalled") return "border-red-400/10 text-white/70";
  if (value === "watch") return "border-amber-400/10 text-white/70";
  if (value === "accelerating") return "border-emerald-400/10 text-white/70";
  if (value === "consolidating") return "border-violet-400/10 text-white/70";
  return "border-white/10 text-white/70";
}

function translateGoalHealth(value: ForecastResult["goalHealth"]) {
  const map: Record<ForecastResult["goalHealth"], string> = {
    on_track: "em curso",
    watch: "monitorar",
    stalled: "travada",
    accelerating: "acelerando",
    consolidating: "consolidando",
  };
  return map[value];
}

function translateConfidence(value: "low" | "medium" | "high") {
  if (value === "high") return "alta";
  if (value === "medium") return "média";
  return "baixa";
}

function translateLevel(value: "low" | "medium" | "high") {
  if (value === "high") return "alta";
  if (value === "medium") return "média";
  return "baixa";
}

function translateEffort(value: "low" | "moderate" | "high") {
  if (value === "low") return "baixo";
  if (value === "moderate") return "moderado";
  return "alto";
}

function translateProgressDelta(value: number) {
  if (value >= 8) return `forte melhora (+${value})`;
  if (value >= 4) return `melhora consistente (+${value})`;
  if (value >= 1) return `leve avanço (+${value})`;
  if (value === 0) return "estável";
  return `queda/lentidão (${value})`;
}

function translateRecommendedAction(value: ForecastResult["recommendedAction"]) {
  const map: Record<ForecastResult["recommendedAction"], string> = {
    continue: "manter plano",
    adjust_reinforcement: "ajustar reforçadores",
    adjust_prompting: "ajustar prompting",
    reduce_criterion: "reduzir critério",
    review_function: "revisar função",
    generalize: "generalizar",
    fade_support: "fading de ajuda",
  };
  return map[value];
}