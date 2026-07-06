"use client";

// Preview do Progresso do paciente (read-only) — gráficos + fotos (sem upload/excluir).

import { useEffect, useMemo, useState } from "react";
import {
  getWeightSeries,
  getCurrentBMI,
  getExerciseLoadSeries,
  listPatientExercises,
  getCheckinSeries,
  type FitPoint,
  type FitBMI,
  type FitCheckinPoint,
} from "@/lib/fit/fit-evolution";
import { listLogs } from "@/lib/fit/fit-training-logs";
import { listFiles } from "@/lib/fit/fit-files";
import { FitKpi } from "@/components/fit/FitCard";
import { FitSection, fitFieldStyle } from "@/components/fit/FitSection";
import { FitLineChart, type FitChartPoint } from "@/components/fit/FitLineChart";
import { FitFileGrid } from "@/components/fit/FitFileGrid";
import type { FitFile } from "@/lib/fit/types";

function fmt(d: string): string {
  const [y, m, day] = d.split("-");
  return day && m && y ? `${day}/${m}` : d;
}
function toChart(points: FitPoint[]): FitChartPoint[] {
  return points.map((p) => ({ label: fmt(p.date), value: p.value }));
}

export function FitPreviewProgresso({ patientId }: { patientId: string }) {
  const [weight, setWeight] = useState<FitPoint[]>([]);
  const [bmi, setBmi] = useState<FitBMI | null>(null);
  const [exercises, setExercises] = useState<string[]>([]);
  const [checkins, setCheckins] = useState<FitCheckinPoint[]>([]);
  const [sessions, setSessions] = useState(0);
  const [selExercise, setSelExercise] = useState("");
  const [exerciseSeries, setExerciseSeries] = useState<FitPoint[]>([]);
  const [photos, setPhotos] = useState<FitFile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [w, b, ex, c, lg, ph] = await Promise.all([
        getWeightSeries(patientId),
        getCurrentBMI(patientId),
        listPatientExercises(patientId),
        getCheckinSeries(patientId),
        listLogs(patientId),
        listFiles(patientId, "progress_photo"),
      ]);
      setWeight(w); setBmi(b); setExercises(ex); setCheckins(c); setSessions(lg.length); setPhotos(ph);
      setSelExercise(ex[0] ?? "");
      setLoading(false);
    })();
  }, [patientId]);

  useEffect(() => {
    if (!selExercise) { setExerciseSeries([]); return; }
    getExerciseLoadSeries(patientId, selExercise).then(setExerciseSeries);
  }, [patientId, selExercise]);

  const adherenceChart: FitChartPoint[] = useMemo(
    () => checkins.filter((c) => c.adherence != null).map((c) => ({ label: fmt(c.date), value: c.adherence as number })),
    [checkins],
  );

  if (loading) return <div style={{ color: "#8ea3c0" }}>Carregando…</div>;

  const currentWeight = weight.length ? weight[weight.length - 1].value : null;

  return (
    <div>
      <h1 style={{ margin: "0 0 12px", fontSize: "1.25rem", fontWeight: 800, color: "#f2f6ff" }}>Meu progresso</h1>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>
        <FitKpi label="Peso" value={currentWeight != null ? `${currentWeight}` : "—"} />
        <FitKpi label="IMC" value={bmi ? bmi.bmi.toFixed(1) : "—"} accent="#22c5a4" />
        <FitKpi label="Treinos" value={sessions} />
      </div>

      <FitSection title="Meu peso"><FitLineChart data={toChart(weight)} unit="kg" /></FitSection>

      <FitSection
        title="Minha carga"
        right={exercises.length > 0 ? (
          <select value={selExercise} onChange={(e) => setSelExercise(e.target.value)} style={{ ...fitFieldStyle, width: "auto", padding: "6px 10px" }}>
            {exercises.map((ex) => <option key={ex} value={ex}>{ex}</option>)}
          </select>
        ) : undefined}
      >
        {exercises.length === 0 ? <div style={{ fontSize: ".82rem", color: "#8ea3c0" }}>Sem registros de carga.</div> : <FitLineChart data={toChart(exerciseSeries)} unit="kg" color="#22c5a4" />}
      </FitSection>

      <FitSection title="Minha aderência">
        {checkins.length === 0 ? <div style={{ fontSize: ".82rem", color: "#8ea3c0" }}>Sem check-ins.</div> : <FitLineChart data={adherenceChart} unit="%" color="#efb04a" />}
      </FitSection>

      <FitSection title="Fotos de progresso">
        <div style={{ padding: "8px 12px", marginBottom: 10, background: "rgba(90,110,160,.12)", color: "#8ea3c0", fontSize: ".78rem", borderRadius: 8 }}>
          Preview — envio de foto desativado.
        </div>
        <FitFileGrid files={photos} canDelete={false} onChanged={() => {}} />
      </FitSection>
    </div>
  );
}
