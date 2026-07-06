// Catálogo de métodos de treino e metadados de blocos (Consultoria — Fase 6).
// Fonte única para: rótulos, papel no gráfico (chartRole) e presets de método.

import type { FitBlockType } from "./types";

export type ChartRole = "primary" | "secondary" | "none";

export interface FitBlockTypeMeta {
  label: string;
  description: string;
  chartRole: ChartRole;
}

// Metadados por tipo de bloco. chartRole define entrada nos gráficos de carga.
export const BLOCK_TYPE_META: Record<FitBlockType, FitBlockTypeMeta> = {
  straight_set:   { label: "Série reta",       description: "Séries iguais de trabalho.",                         chartRole: "primary" },
  warmup:         { label: "Aquecimento",      description: "Preparação, sem carga de trabalho.",                chartRole: "none" },
  feeder:         { label: "Feeder set",       description: "Séries de aproximação até a série principal.",       chartRole: "none" },
  top_set:        { label: "Top set",          description: "Série mais pesada do exercício.",                   chartRole: "primary" },
  backoff:        { label: "Back-off set",     description: "Série de retrocesso com mais repetições.",           chartRole: "secondary" },
  myo_activation: { label: "Myo — ativação",   description: "Série de ativação próxima à falha.",                chartRole: "secondary" },
  myo_mini_set:   { label: "Myo — mini-série",  description: "Mini-séries curtas com descanso mínimo.",           chartRole: "none" },
  rest_pause:     { label: "Rest-pause",       description: "Série com pausas curtas para reps adicionais.",      chartRole: "primary" },
  drop_set:       { label: "Drop set",         description: "Série até a falha reduzindo a carga sem descanso.",  chartRole: "secondary" },
  cluster:        { label: "Cluster",          description: "Série fracionada com descanso intra-série.",         chartRole: "primary" },
  amrap:          { label: "AMRAP",            description: "Máximo de repetições no tempo/estímulo definido.",   chartRole: "primary" },
  circuit:        { label: "Circuito",         description: "Estação de circuito (bloco único).",                chartRole: "none" },
  other:          { label: "Outro",            description: "Método personalizado.",                             chartRole: "none" },
};

export function blockTypeLabel(bt: string): string {
  return (BLOCK_TYPE_META as Record<string, FitBlockTypeMeta>)[bt]?.label ?? bt;
}
export function blockChartRole(bt: string): ChartRole {
  return (BLOCK_TYPE_META as Record<string, FitBlockTypeMeta>)[bt]?.chartRole ?? "none";
}

// Preset de bloco que um método semeia no builder.
export interface FitMethodBlockSeed {
  block_type: FitBlockType;
  label: string;
  sets: number | null;
  target_reps: string | null;
  rir: string | null;
  rest_seconds: number | null;
}

export interface FitTrainingMethod {
  key: string;
  name: string;
  description: string;
  blocks: FitMethodBlockSeed[];
  primaryBlockType: FitBlockType; // bloco mais relevante para evolução
  chartRelevant: boolean;
}

const seed = (
  block_type: FitBlockType,
  label: string,
  sets: number | null = null,
  target_reps: string | null = null,
  rir: string | null = null,
  rest_seconds: number | null = null,
): FitMethodBlockSeed => ({ block_type, label, sets, target_reps, rir, rest_seconds });

export const TRAINING_METHODS: FitTrainingMethod[] = [
  {
    key: "feeder_top_backoff",
    name: "Feeder / Top / Back-off",
    description: "Séries de aproximação, uma série pesada (top) e uma de retrocesso com mais reps.",
    blocks: [
      seed("feeder", "Feeder", 2, "6-8"),
      seed("top_set", "Top set", 1, "5-9"),
      seed("backoff", "Back-off", 1, "10-15"),
    ],
    primaryBlockType: "top_set",
    chartRelevant: true,
  },
  {
    key: "myo_reps",
    name: "Myo Reps",
    description: "Série de ativação seguida de mini-séries curtas com descanso mínimo.",
    blocks: [
      seed("myo_activation", "Ativação", 1, "6-8", "1"),
      seed("myo_mini_set", "Mini-séries", 3, "2-3", null, 10),
    ],
    primaryBlockType: "myo_activation",
    chartRelevant: true,
  },
  {
    key: "rest_pause",
    name: "Rest-pause",
    description: "Uma série próxima à falha com pausas curtas para repetições adicionais.",
    blocks: [seed("rest_pause", "Rest-pause", 1, "8-12")],
    primaryBlockType: "rest_pause",
    chartRelevant: true,
  },
  {
    key: "drop_set",
    name: "Drop set",
    description: "Série até a falha reduzindo a carga sem descanso.",
    blocks: [seed("drop_set", "Drop set", 1, "falha")],
    primaryBlockType: "drop_set",
    chartRelevant: true,
  },
  {
    key: "cluster",
    name: "Cluster",
    description: "Série fracionada em mini-blocos com descanso intra-série.",
    blocks: [seed("cluster", "Cluster", 1, "3x3")],
    primaryBlockType: "cluster",
    chartRelevant: true,
  },
];
