// Catálogo de métricas da Consultoria — ABERTO.
// Além das métricas padrão, o profissional cria métricas personalizadas
// (nome/unidade/categoria), armazenadas inline em fit_measurements (label/unit/category).
// Preparado para qualquer modalidade: musculação, corrida, crossfit, fisioterapia, etc.

import type { FitMeasurementCategory } from "./types";

export interface FitMetricDef {
  key: string;
  label: string;
  unit: string;
  category: FitMeasurementCategory;
}

export const METRIC_CATALOG: FitMetricDef[] = [
  // Antropometria
  { key: "weight_kg", label: "Peso", unit: "kg", category: "anthropometry" },
  { key: "height_cm", label: "Altura", unit: "cm", category: "anthropometry" },
  { key: "bmi", label: "IMC", unit: "kg/m²", category: "anthropometry" },
  { key: "body_fat_pct", label: "% Gordura", unit: "%", category: "anthropometry" },
  // Perimetria
  { key: "arm_cm", label: "Braço", unit: "cm", category: "circumference" },
  { key: "chest_cm", label: "Peitoral", unit: "cm", category: "circumference" },
  { key: "waist_cm", label: "Cintura", unit: "cm", category: "circumference" },
  { key: "hip_cm", label: "Quadril", unit: "cm", category: "circumference" },
  { key: "thigh_cm", label: "Coxa", unit: "cm", category: "circumference" },
  { key: "calf_cm", label: "Panturrilha", unit: "cm", category: "circumference" },
  // Performance (não exclusivo de força — corrida, VO₂, salto, FC…)
  { key: "rm_bench_kg", label: "1RM Supino", unit: "kg", category: "performance" },
  { key: "rm_squat_kg", label: "1RM Agachamento", unit: "kg", category: "performance" },
  { key: "rm_deadlift_kg", label: "1RM Terra", unit: "kg", category: "performance" },
  { key: "vertical_jump_cm", label: "Salto vertical", unit: "cm", category: "performance" },
  { key: "run_5k_min", label: "Corrida 5 km", unit: "min", category: "performance" },
  { key: "vo2max", label: "VO₂ máx (est.)", unit: "ml/kg/min", category: "performance" },
  { key: "resting_hr_bpm", label: "FC repouso", unit: "bpm", category: "performance" },
  // Dor e Funcionalidade
  { key: "pain_level", label: "Dor", unit: "0-10", category: "functional" },
  { key: "rom_deg", label: "Amplitude de movimento", unit: "°", category: "functional" },
];

export function metricsByCategory(cat: FitMeasurementCategory): FitMetricDef[] {
  return METRIC_CATALOG.filter((m) => m.category === cat);
}

export function findMetric(key: string): FitMetricDef | undefined {
  return METRIC_CATALOG.find((m) => m.key === key);
}

// Gera uma chave estável para uma métrica personalizada a partir do nome.
export function slugifyMetric(name: string): string {
  const base = name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // remove diacríticos
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return `custom_${base || "metric"}`;
}

// Rótulo de exibição de uma medição (catálogo ou custom).
export function measurementLabel(metric: string, label: string | null): string {
  return findMetric(metric)?.label ?? label ?? metric;
}
