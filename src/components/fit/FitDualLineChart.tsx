"use client";

import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export interface FitDualChartPoint { label: string; first: number; second: number }

export function FitDualLineChart({ data, firstLabel, secondLabel, unit }: { data: FitDualChartPoint[]; firstLabel: string; secondLabel: string; unit?: string | null }) {
  if (data.length === 0) return <div style={{ color: "#8ea3c0", textAlign: "center", padding: 24, fontSize: ".82rem" }}>Sem dados comparáveis.</div>;
  return <ResponsiveContainer width="100%" height={210}><LineChart data={data} margin={{ top: 8, right: 10, left: -12, bottom: 0 }}><CartesianGrid stroke="rgba(90,110,160,.16)" strokeDasharray="3 3" /><XAxis dataKey="label" stroke="rgba(160,180,210,.5)" fontSize={11} /><YAxis stroke="rgba(160,180,210,.5)" fontSize={11} /><Tooltip formatter={(value) => `${value}${unit ? ` ${unit}` : ""}`} contentStyle={{ background: "#101a30", border: "1px solid rgba(90,110,160,.4)", borderRadius: 8, fontSize: 12 }} /><Legend wrapperStyle={{ fontSize: 11 }} /><Line type="monotone" dataKey="first" name={firstLabel} stroke="#7c5cfc" strokeWidth={2} dot={{ r: 3 }} /><Line type="monotone" dataKey="second" name={secondLabel} stroke="#22c5a4" strokeWidth={2} dot={{ r: 3 }} /></LineChart></ResponsiveContainer>;
}
