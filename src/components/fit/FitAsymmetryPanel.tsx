"use client";

import { useEffect, useMemo, useState } from "react";
import { getAsymmetrySeries, listSegmentedMetrics, type FitSegmentedMetricRef } from "@/lib/fit/fit-evolution";
import type { FitAsymmetryPoint, FitComparisonMode } from "@/lib/fit/fit-segmented-measurements";
import { fitFieldStyle } from "./FitSection";
import { FitDualLineChart } from "./FitDualLineChart";
import { FitLineChart } from "./FitLineChart";

const fmt = (date: string) => { const [, month, day] = date.split("-"); return day && month ? `${day}/${month}` : date; };

export function FitAsymmetryPanel({ patientId }: { patientId: string }) {
  const [metrics, setMetrics] = useState<FitSegmentedMetricRef[]>([]); const [region, setRegion] = useState(""); const [technicalKey, setTechnicalKey] = useState(""); const [mode, setMode] = useState<FitComparisonMode>("left_right"); const [series, setSeries] = useState<FitAsymmetryPoint[]>([]); const [loading, setLoading] = useState(true);
  useEffect(() => { void listSegmentedMetrics(patientId).then((rows) => { setMetrics(rows); setTechnicalKey(rows[0]?.technicalKey ?? ""); setLoading(false); }); }, [patientId]);
  const regions = useMemo(() => Array.from(new Set(metrics.map((item) => item.bodyRegion).filter((item): item is string => Boolean(item)))).sort(), [metrics]);
  const visible = useMemo(() => metrics.filter((item) => !region || item.bodyRegion === region), [metrics, region]);
  const activeTechnicalKey = visible.some((item) => item.technicalKey === technicalKey)
    ? technicalKey
    : (visible[0]?.technicalKey ?? "");
  useEffect(() => {
    if (!activeTechnicalKey) return;
    void getAsymmetrySeries(patientId, activeTechnicalKey, mode).then(setSeries);
  }, [patientId, activeTechnicalKey, mode]);
  const selected = metrics.find((item) => item.technicalKey === activeTechnicalKey);
  if (loading) return <div style={{ color: "#8ea3c0" }}>Carregando…</div>;
  if (metrics.length === 0) return <div style={{ color: "#8ea3c0", fontSize: ".82rem" }}>Nenhuma medição segmentar registrada.</div>;
  const firstLabel = mode === "left_right" ? "Esquerda" : "Afetado"; const secondLabel = mode === "left_right" ? "Direita" : "Não afetado";
  return <div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 8, marginBottom: 10 }}><select value={region} onChange={(e) => setRegion(e.target.value)} style={fitFieldStyle}><option value="">Todas as regiões</option>{regions.map((item) => <option key={item}>{item}</option>)}</select><select value={activeTechnicalKey} onChange={(e) => setTechnicalKey(e.target.value)} style={fitFieldStyle}>{visible.map((item) => <option key={item.technicalKey} value={item.technicalKey}>{item.contextLabel}</option>)}</select><select value={mode} onChange={(e) => setMode(e.target.value as FitComparisonMode)} style={fitFieldStyle}><option value="left_right">Esquerda × direita</option><option value="affected_unaffected">Afetado × não afetado</option></select></div>
    {series.length === 0 ? <div style={{ color: "#efb04a", fontSize: ".8rem", padding: 12 }}>Dados não comparáveis automaticamente. Verifique se o par está completo e se unidade, protocolo, ponto anatômico, método, contexto e exercício de origem coincidem.</div> : <><FitDualLineChart data={series.map((point) => ({ label: fmt(point.date), first: point.first, second: point.second }))} firstLabel={firstLabel} secondLabel={secondLabel} unit={selected?.unit} /><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}><div><div style={chartTitle}>Diferença absoluta</div><FitLineChart data={series.map((point) => ({ label: fmt(point.date), value: point.absoluteDifference }))} unit={selected?.unit} color="#efb04a" height={150} /></div><div><div style={chartTitle}>{mode === "affected_unaffected" ? "Índice afetado/não afetado" : "Diferença relativa"}</div><FitLineChart data={series.filter((point) => mode === "affected_unaffected" ? point.affectedUnaffectedPct != null : point.relativeDifferencePct != null).map((point) => ({ label: fmt(point.date), value: (mode === "affected_unaffected" ? point.affectedUnaffectedPct : point.relativeDifferencePct) as number }))} unit="%" color="#5b8def" height={150} /></div></div><div style={{ overflowX: "auto", marginTop: 10 }}><table style={{ width: "100%", borderCollapse: "collapse", fontSize: ".74rem" }}><thead><tr><th style={cell}>Data</th><th style={cell}>{firstLabel}</th><th style={cell}>{secondLabel}</th><th style={cell}>Dif. abs.</th><th style={cell}>{mode === "affected_unaffected" ? "Índice" : "Dif. rel."}</th></tr></thead><tbody>{series.map((point, index) => <tr key={`${point.date}-${index}`}><td style={cell}>{fmt(point.date)}</td><td style={cell}>{point.first}</td><td style={cell}>{point.second}</td><td style={cell}>{point.absoluteDifference.toFixed(2)}</td><td style={cell}>{mode === "affected_unaffected" ? (point.affectedUnaffectedPct == null ? "—" : `${point.affectedUnaffectedPct.toFixed(1)}%`) : (point.relativeDifferencePct == null ? "—" : `${point.relativeDifferencePct.toFixed(1)}%`)}</td></tr>)}</tbody></table></div><div title="Diferença absoluta = |A−B|; relativa = |A−B| / max(|A|,|B|) × 100" style={{ color: "#6f829f", fontSize: ".68rem", marginTop: 7 }}>Resultados informativos, sem classificação automática de melhora, normalidade ou objetivo de simetria.</div></>}
  </div>;
}

const cell: React.CSSProperties = { padding: "5px 7px", borderBottom: "1px solid rgba(90,110,160,.14)", textAlign: "right", color: "#c5d2e6" };
const chartTitle: React.CSSProperties = { color: "#9fb2cf", fontSize: ".72rem", fontWeight: 700, marginBottom: 4 };
