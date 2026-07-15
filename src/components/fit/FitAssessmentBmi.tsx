"use client";

import { useEffect, useState } from "react";
import { resolveBMI, type FitBMIResolution, type FitMeasurementSource } from "@/lib/fit/fit-segmented-measurements";

const fmt = (date: string) => date.split("-").reverse().join("/");
const source = (item: FitMeasurementSource) => `${item.type === "measurement" ? "Medição" : "Check-in"} de ${fmt(item.date)} · ID ${item.id}`;

export function FitAssessmentBmi({ patientId, assessmentId, assessedAt, refreshKey }: { patientId: string; assessmentId: string; assessedAt: string; refreshKey: string }) {
  const [result, setResult] = useState<FitBMIResolution | null>(null);
  useEffect(() => { void resolveBMI(patientId, assessedAt, assessmentId).then(setResult); }, [patientId, assessmentId, assessedAt, refreshKey]);
  if (!result) return <div style={{ color: "#8ea3c0", fontSize: ".8rem" }}>Calculando…</div>;
  if (result.status === "incomplete") return <div><div style={{ color: "#8ea3c0", fontSize: ".84rem" }}>IMC incompleto: {result.reason}</div><div style={{ color: "#6f829f", fontSize: ".7rem", marginTop: 4 }}>Data de referência: {fmt(result.referenceDate)}. Medidas futuras não são utilizadas.</div></div>;
  return <div style={{ display: "grid", gridTemplateColumns: "minmax(100px,.5fr) 1fr 1fr", gap: 10, alignItems: "start" }}>
    <div><div style={{ color: "#8ea3c0", fontSize: ".68rem" }}>IMC derivado</div><div style={{ color: "#f2f6ff", fontSize: "1.35rem", fontWeight: 800 }}>{result.bmi?.toFixed(1)}</div><div style={{ color: "#6f829f", fontSize: ".68rem" }}>Sem classificação automática</div></div>
    {result.weight && <div><div style={{ color: "#8ea3c0", fontSize: ".68rem" }}>Peso utilizado</div><div style={{ color: "#e6edf6", fontWeight: 700 }}>{result.weight.value} kg</div><div title={result.weight.id} style={{ color: "#6f829f", fontSize: ".66rem", wordBreak: "break-all" }}>{source(result.weight)}</div></div>}
    {result.height && <div><div style={{ color: "#8ea3c0", fontSize: ".68rem" }}>Altura utilizada</div><div style={{ color: "#e6edf6", fontWeight: 700 }}>{result.height.value} cm</div><div title={result.height.id} style={{ color: "#6f829f", fontSize: ".66rem", wordBreak: "break-all" }}>{source(result.height)}</div></div>}
  </div>;
}
