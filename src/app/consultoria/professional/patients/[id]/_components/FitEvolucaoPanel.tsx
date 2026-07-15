"use client";

// Aba "Evolução" do profissional — visão completa da evolução do paciente.
// KPIs + comparativo com a linha de base + gráficos + atividade recente (registros do paciente).

import { useEffect, useMemo, useState } from "react";
import {
  getWeightSeries,
  getMeasurementSeries,
  listPatientMetrics,
  getExerciseLoadSeries,
  listPatientExercises,
  getCheckinSeries,
  getBaselineComparison,
  getCurrentBMI,
  getWeeklyTrainingCounts,
  type FitPoint,
  type FitMetricRef,
  type FitBaselineRow,
  type FitCheckinPoint,
  type FitBMI,
} from "@/lib/fit/fit-evolution";
import { listLogs } from "@/lib/fit/fit-training-logs";
import { listAssessmentsWithMeasurements, type FitAssessmentHistory } from "@/lib/fit/fit-assessment-compare";
import { FitKpi } from "@/components/fit/FitCard";
import { FitSection, fitFieldStyle } from "@/components/fit/FitSection";
import { FitLineChart, type FitChartPoint } from "@/components/fit/FitLineChart";
import { FitDeltaBadge } from "@/components/fit/FitDeltaBadge";
import { FitAssessmentHistoryTable } from "@/components/fit/FitAssessmentHistoryTable";
import { FitAsymmetryPanel } from "@/components/fit/FitAsymmetryPanel";
import type { FitTrainingLog } from "@/lib/fit/types";

function fmt(d: string): string {
  const [y, m, day] = d.split("-");
  return day && m && y ? `${day}/${m}` : d;
}
function toChart(points: FitPoint[]): FitChartPoint[] {
  return points.map((p) => ({ label: fmt(p.date), value: p.value }));
}

const CHECKIN_OPTIONS = [
  { key: "adherence", label: "Aderência (%)" },
  { key: "energy", label: "Energia" },
  { key: "sleep", label: "Sono" },
  { key: "mood", label: "Humor" },
  { key: "pain", label: "Dor" },
] as const;
type CheckinKey = (typeof CHECKIN_OPTIONS)[number]["key"];

export function FitEvolucaoPanel({ patientId }: { patientId: string }) {
  const [loading, setLoading] = useState(true);
  const [weight, setWeight] = useState<FitPoint[]>([]);
  const [bmi, setBmi] = useState<FitBMI | null>(null);
  const [metrics, setMetrics] = useState<FitMetricRef[]>([]);
  const [exercises, setExercises] = useState<string[]>([]);
  const [checkins, setCheckins] = useState<FitCheckinPoint[]>([]);
  const [baseline, setBaseline] = useState<FitBaselineRow[]>([]);
  const [logs, setLogs] = useState<FitTrainingLog[]>([]);
  const [weekly, setWeekly] = useState<FitPoint[]>([]);
  const [history, setHistory] = useState<FitAssessmentHistory | null>(null);

  const [selMetric, setSelMetric] = useState<string>("");
  const [metricSeries, setMetricSeries] = useState<FitPoint[]>([]);
  const [selExercise, setSelExercise] = useState<string>("");
  const [exerciseSeries, setExerciseSeries] = useState<FitPoint[]>([]);
  const [selCheckin, setSelCheckin] = useState<CheckinKey>("adherence");

  useEffect(() => {
    (async () => {
      const [w, b, m, ex, c, base, lg, wk] = await Promise.all([
        getWeightSeries(patientId),
        getCurrentBMI(patientId),
        listPatientMetrics(patientId),
        listPatientExercises(patientId),
        getCheckinSeries(patientId),
        getBaselineComparison(patientId),
        listLogs(patientId),
        getWeeklyTrainingCounts(patientId),
      ]);
      setWeight(w); setBmi(b); setMetrics(m); setExercises(ex); setCheckins(c);
      setBaseline(base); setLogs(lg); setWeekly(wk);
      setHistory(await listAssessmentsWithMeasurements(patientId));
      const firstMetric = m.find((x) => x.metric !== "weight_kg")?.metric ?? m[0]?.metric ?? "";
      setSelMetric(firstMetric);
      setSelExercise(ex[0] ?? "");
      setLoading(false);
    })();
  }, [patientId]);

  useEffect(() => {
    if (!selMetric) return;
    getMeasurementSeries(patientId, selMetric).then(setMetricSeries);
  }, [patientId, selMetric]);

  useEffect(() => {
    if (!selExercise) return;
    getExerciseLoadSeries(patientId, selExercise).then(setExerciseSeries);
  }, [patientId, selExercise]);

  const adherenceAvg = useMemo(() => {
    const vals = checkins.map((c) => c.adherence).filter((v): v is number => v != null);
    return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
  }, [checkins]);

  const checkinChart: FitChartPoint[] = useMemo(
    () => checkins.filter((c) => c[selCheckin] != null).map((c) => ({ label: fmt(c.date), value: c[selCheckin] as number })),
    [checkins, selCheckin],
  );

  const metricUnit = metrics.find((m) => m.metric === selMetric)?.unit ?? null;

  if (loading) return <div style={{ color: "#8ea3c0" }}>Carregando…</div>;

  const currentWeight = weight.length ? weight[weight.length - 1].value : null;

  return (
    <div>
      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 16 }}>
        <FitKpi label="Peso atual" value={currentWeight != null ? `${currentWeight} kg` : "—"} />
        <FitKpi label="IMC" value={bmi ? bmi.bmi.toFixed(1) : "—"} accent="#22c5a4" hint={bmi ? `${bmi.weight} kg (${fmt(bmi.weightSource.date)}) · ${bmi.height_cm} cm (${fmt(bmi.heightSource.date)})` : "peso ou altura indisponível"} />
        <FitKpi label="Sessões" value={logs.length} />
        <FitKpi label="Aderência média" value={adherenceAvg != null ? `${adherenceAvg}%` : "—"} accent="#22c5a4" />
      </div>

      {/* Comparativo com a Linha de Base */}
      <FitSection title="Comparativo com a linha de base" subtitle="Variação neutra — a leitura de melhora/piora depende do objetivo.">
        {baseline.length === 0 ? (
          <div style={{ fontSize: ".82rem", color: "#8ea3c0" }}>Sem linha de base com medições ainda.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {baseline.map((r) => (
              <div key={r.metric} style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr auto", gap: 8, alignItems: "center", padding: "7px 0", borderBottom: "1px solid rgba(90,110,160,.16)", fontSize: ".82rem" }}>
                <div style={{ color: "#e6edf6" }}>{r.label}</div>
                <div style={{ color: "#8ea3c0" }}>base {r.baseline}{r.unit ? ` ${r.unit}` : ""}</div>
                <div style={{ color: "#e6edf6" }}>atual {r.current}{r.unit ? ` ${r.unit}` : ""}</div>
                <FitDeltaBadge delta={r.delta} unit={r.unit} valence={r.valence} />
              </div>
            ))}
          </div>
        )}
      </FitSection>

      {/* Histórico de avaliações (métrica × avaliações) */}
      {history && history.assessments.length > 1 && (
        <FitSection title="Histórico de avaliações" subtitle="Progressão das medidas ao longo das avaliações.">
          <FitAssessmentHistoryTable history={history} />
        </FitSection>
      )}

      <FitSection title="Evolução segmentar e assimetria" subtitle="Comparações derivadas e neutras; a interpretação permanece com o profissional.">
        <FitAsymmetryPanel patientId={patientId} />
      </FitSection>

      {/* Peso */}
      <FitSection title="Peso ao longo do tempo">
        <FitLineChart data={toChart(weight)} unit="kg" />
      </FitSection>

      {/* Medida por métrica */}
      <FitSection
        title="Medidas"
        right={
          metrics.length > 0 ? (
            <select value={selMetric} onChange={(e) => setSelMetric(e.target.value)} style={{ ...fitFieldStyle, width: "auto", padding: "6px 10px" }}>
              {metrics.map((m) => <option key={m.metric} value={m.metric}>{m.label}</option>)}
            </select>
          ) : undefined
        }
      >
        {metrics.length === 0 ? <div style={{ fontSize: ".82rem", color: "#8ea3c0" }}>Nenhuma medição registrada.</div> : <FitLineChart data={toChart(metricSeries)} unit={metricUnit} color="#5b8def" />}
      </FitSection>

      {/* Carga por exercício */}
      <FitSection
        title="Carga por exercício"
        right={
          exercises.length > 0 ? (
            <select value={selExercise} onChange={(e) => setSelExercise(e.target.value)} style={{ ...fitFieldStyle, width: "auto", padding: "6px 10px" }}>
              {exercises.map((ex) => <option key={ex} value={ex}>{ex}</option>)}
            </select>
          ) : undefined
        }
      >
        {exercises.length === 0 ? <div style={{ fontSize: ".82rem", color: "#8ea3c0" }}>Nenhum treino registrado ainda.</div> : <FitLineChart data={toChart(exerciseSeries)} unit="kg" color="#22c5a4" />}
      </FitSection>

      {/* Tendências de check-in */}
      <FitSection
        title="Tendências de check-in"
        right={
          <select value={selCheckin} onChange={(e) => setSelCheckin(e.target.value as CheckinKey)} style={{ ...fitFieldStyle, width: "auto", padding: "6px 10px" }}>
            {CHECKIN_OPTIONS.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
          </select>
        }
      >
        {checkins.length === 0 ? <div style={{ fontSize: ".82rem", color: "#8ea3c0" }}>Nenhum check-in ainda.</div> : <FitLineChart data={checkinChart} color="#efb04a" />}
      </FitSection>

      {/* Frequência de treino */}
      <FitSection title="Frequência de treino (por semana)">
        <FitLineChart data={toChart(weekly)} variant="bar" color="#7c5cfc" height={160} />
      </FitSection>

      {/* Atividade recente */}
      <FitSection title="Atividade recente do paciente">
        {logs.length === 0 && checkins.length === 0 ? (
          <div style={{ fontSize: ".82rem", color: "#8ea3c0" }}>Nenhum registro do paciente ainda.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {logs.slice(0, 6).map((l) => (
              <div key={l.id} style={{ display: "flex", justifyContent: "space-between", fontSize: ".82rem", color: "#e6edf6", padding: "5px 0", borderBottom: "1px solid rgba(90,110,160,.14)" }}>
                <span>🏋️ Treino registrado</span><span style={{ color: "#8ea3c0" }}>{fmt(l.performed_at)}</span>
              </div>
            ))}
            {checkins.slice(-6).reverse().map((c) => (
              <div key={c.date} style={{ display: "flex", justifyContent: "space-between", fontSize: ".82rem", color: "#e6edf6", padding: "5px 0", borderBottom: "1px solid rgba(90,110,160,.14)" }}>
                <span>📋 Check-in{c.adherence != null ? ` · ${c.adherence}%` : ""}</span><span style={{ color: "#8ea3c0" }}>{fmt(c.date)}</span>
              </div>
            ))}
          </div>
        )}
      </FitSection>
    </div>
  );
}
