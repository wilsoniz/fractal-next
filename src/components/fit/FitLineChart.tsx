"use client";

// FitLineChart — gráfico (linha ou barra) com a identidade da Consultoria (recharts).

import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

export interface FitChartPoint {
  label: string;
  value: number;
}

export function FitLineChart({
  data,
  unit,
  color = "#7c5cfc",
  height = 200,
  variant = "line",
}: {
  data: FitChartPoint[];
  unit?: string | null;
  color?: string;
  height?: number;
  variant?: "line" | "bar";
}) {
  if (data.length === 0) {
    return <div style={{ fontSize: ".82rem", color: "#8ea3c0", padding: "24px 0", textAlign: "center" }}>Sem dados suficientes.</div>;
  }

  const axis = { stroke: "rgba(160,180,210,.5)", fontSize: 11 };
  const contentStyle = { background: "#101a30", border: "1px solid rgba(90,110,160,.4)", borderRadius: 8, fontSize: 12 };
  const labelStyle = { color: "#9fb2cf" };
  const itemStyle = { color: "#e6edf6" };
  const suffix = unit ? ` ${unit}` : "";

  return (
    <ResponsiveContainer width="100%" height={height}>
      {variant === "bar" ? (
        <BarChart data={data} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(90,110,160,.18)" />
          <XAxis dataKey="label" tick={axis} tickLine={false} />
          <YAxis tick={axis} tickLine={false} allowDecimals={false} />
          <Tooltip contentStyle={contentStyle} labelStyle={labelStyle} itemStyle={itemStyle} formatter={(value) => `${value}${suffix}`} cursor={{ fill: "rgba(124,92,252,.08)" }} />
          <Bar dataKey="value" fill={color} radius={[4, 4, 0, 0]} />
        </BarChart>
      ) : (
        <LineChart data={data} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(90,110,160,.18)" />
          <XAxis dataKey="label" tick={axis} tickLine={false} />
          <YAxis tick={axis} tickLine={false} domain={["auto", "auto"]} />
          <Tooltip contentStyle={contentStyle} labelStyle={labelStyle} itemStyle={itemStyle} formatter={(value) => `${value}${suffix}`} />
          <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={{ r: 3, fill: color }} activeDot={{ r: 5 }} />
        </LineChart>
      )}
    </ResponsiveContainer>
  );
}
