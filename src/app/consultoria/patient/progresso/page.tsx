"use client";

// Progresso do paciente — versão enxuta mobile-first com gráficos (Fase 5).

import { useEffect, useMemo, useState } from "react";
import { usePatient } from "../_context";
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
import { FitFileUpload } from "@/components/fit/FitFileUpload";
import { FitFileGrid } from "@/components/fit/FitFileGrid";
import type { FitFile } from "@/lib/fit/types";

function fmt(d: string): string {
  const [y, m, day] = d.split("-");
  return day && m && y ? `${day}/${m}` : d;
}
function toChart(points: FitPoint[]): FitChartPoint[] {
  return points.map((p) => ({ label: fmt(p.date), value: p.value }));
}

export default function PatientProgress() {
  const patient = usePatient();
  const [weight, setWeight] = useState<FitPoint[]>([]);
  const [bmi, setBmi] = useState<FitBMI | null>(null);
  const [exercises, setExercises] = useState<string[]>([]);
  const [checkins, setCheckins] = useState<FitCheckinPoint[]>([]);
  const [sessions, setSessions] = useState(0);
  const [selExercise, setSelExercise] = useState("");
  const [exerciseSeries, setExerciseSeries] = useState<FitPoint[]>([]);
  const [photos, setPhotos] = useState<FitFile[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadPhotos() {
    setPhotos(await listFiles(patient.id, "progress_photo"));
  }

  useEffect(() => {
    (async () => {
      const [w, b, ex, c, lg] = await Promise.all([
        getWeightSeries(patient.id),
        getCurrentBMI(patient.id),
        listPatientExercises(patient.id),
        getCheckinSeries(patient.id),
        listLogs(patient.id),
      ]);
      setWeight(w); setBmi(b); setExercises(ex); setCheckins(c); setSessions(lg.length);
      setSelExercise(ex[0] ?? "");
      await loadPhotos();
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patient.id]);

  useEffect(() => {
    if (!selExercise) { setExerciseSeries([]); return; }
    getExerciseLoadSeries(patient.id, selExercise).then(setExerciseSeries);
  }, [patient.id, selExercise]);

  const adherenceChart: FitChartPoint[] = useMemo(
    () => checkins.filter((c) => c.adherence != null).map((c) => ({ label: fmt(c.date), value: c.adherence as number })),
    [checkins],
  );

  if (loading) return <div style={{ color: "#8ea3c0" }}>Carregando…</div>;

  const currentWeight = weight.length ? weight[weight.length - 1].value : null;

  return (
    <div>
      <h1 style={{ margin: "0 0 16px", fontSize: "1.3rem", fontWeight: 800, color: "#f2f6ff" }}>Meu progresso</h1>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
        <FitKpi label="Peso" value={currentWeight != null ? `${currentWeight}` : "—"} />
        <FitKpi label="IMC" value={bmi ? bmi.bmi.toFixed(1) : "—"} accent="#22c5a4" />
        <FitKpi label="Treinos" value={sessions} />
      </div>

      <FitSection title="Meu peso">
        <FitLineChart data={toChart(weight)} unit="kg" />
      </FitSection>

      <FitSection
        title="Minha carga"
        right={
          exercises.length > 0 ? (
            <select value={selExercise} onChange={(e) => setSelExercise(e.target.value)} style={{ ...fitFieldStyle, width: "auto", padding: "6px 10px" }}>
              {exercises.map((ex) => <option key={ex} value={ex}>{ex}</option>)}
            </select>
          ) : undefined
        }
      >
        {exercises.length === 0 ? (
          <div style={{ fontSize: ".82rem", color: "#8ea3c0" }}>Registre treinos para ver sua evolução de carga.</div>
        ) : (
          <FitLineChart data={toChart(exerciseSeries)} unit="kg" color="#22c5a4" />
        )}
      </FitSection>

      <FitSection title="Minha aderência">
        {checkins.length === 0 ? (
          <div style={{ fontSize: ".82rem", color: "#8ea3c0" }}>Faça check-ins para acompanhar sua semana.</div>
        ) : (
          <FitLineChart data={adherenceChart} unit="%" color="#efb04a" />
        )}
      </FitSection>

      <FitSection title="Fotos de progresso" subtitle="Registre sua evolução ao longo do tempo.">
        <div style={{ marginBottom: 12 }}>
          <FitFileUpload patientId={patient.id} categories={["progress_photo"]} fixedCategory="progress_photo" onUploaded={loadPhotos} />
        </div>
        <FitFileGrid files={photos} canDelete={false} onChanged={loadPhotos} />
      </FitSection>
    </div>
  );
}
