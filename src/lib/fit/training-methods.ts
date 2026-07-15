// Catálogo versionado de métodos/estratégias. Presets são copiados para a
// prescrição; alterações futuras não reescrevem blocos ou etapas existentes.

import type { FitBlockType, FitExerciseBlockStepInput } from "./types";

export type ChartRole = "primary" | "secondary" | "none";
export interface FitBlockTypeMeta { label: string; description: string; chartRole: ChartRole }

export const BLOCK_TYPE_META: Record<FitBlockType, FitBlockTypeMeta> = {
  straight_set: { label: "Série reta", description: "Séries iguais de trabalho.", chartRole: "primary" },
  warmup: { label: "Aquecimento", description: "Preparação, sem carga de trabalho.", chartRole: "none" },
  feeder: { label: "Feeder set", description: "Séries de aproximação.", chartRole: "none" },
  top_set: { label: "Top set", description: "Série mais pesada.", chartRole: "primary" },
  backoff: { label: "Back-off set", description: "Retrocesso com mais repetições.", chartRole: "secondary" },
  myo_activation: { label: "Myo — ativação", description: "Série de ativação.", chartRole: "secondary" },
  myo_mini_set: { label: "Myo — mini-série", description: "Mini-séries com descanso mínimo.", chartRole: "none" },
  rest_pause: { label: "Rest-pause", description: "Pausas curtas intra-série.", chartRole: "primary" },
  drop_set: { label: "Drop set", description: "Reduções de carga sem descanso.", chartRole: "secondary" },
  cluster: { label: "Cluster", description: "Série fracionada.", chartRole: "primary" },
  amrap: { label: "AMRAP", description: "Máximo de repetições.", chartRole: "primary" },
  circuit: { label: "Circuito", description: "Estação de circuito.", chartRole: "none" },
  other: { label: "Outro", description: "Estratégia personalizada.", chartRole: "none" },
};

export function blockTypeLabel(bt: string): string { return (BLOCK_TYPE_META as Record<string, FitBlockTypeMeta>)[bt]?.label ?? bt; }
export function blockChartRole(bt: string): ChartRole { return (BLOCK_TYPE_META as Record<string, FitBlockTypeMeta>)[bt]?.chartRole ?? "none"; }

export interface FitMethodBlockSeed {
  block_type: FitBlockType;
  label: string;
  sets: number | null;
  target_reps: string | null;
  rir: string | null;
  rest_seconds: number | null;
  instructions?: string | null;
  data?: Record<string, unknown>;
  steps?: FitExerciseBlockStepInput[];
}
export interface FitTrainingMethod { key: string; name: string; description: string; blocks: FitMethodBlockSeed[]; primaryBlockType: FitBlockType; chartRelevant: boolean }

const step = (step_type: FitExerciseBlockStepInput["step_type"], label: string, patch: Partial<FitExerciseBlockStepInput> = {}): FitExerciseBlockStepInput => ({
  step_type, label, target_reps: null, target_full_reps: null, target_partial_reps: null,
  target_duration_seconds: null, target_load: null, target_load_unit: null,
  load_change_type: null, load_change_value: null, rest_seconds: null,
  repeat_mode: "fixed", min_occurrences: 1, max_occurrences: 1,
  termination_rule: null, data: {}, ...patch,
});
const block = (block_type: FitBlockType, label: string, patch: Partial<FitMethodBlockSeed> = {}): FitMethodBlockSeed => ({ block_type, label, sets: null, target_reps: null, rir: null, rest_seconds: null, ...patch });
const strategyData = (key: string, summary_rule: string, configuration: Record<string, unknown>, warning: string | null = null) => ({ strategy_key: key, strategy_version: 1, summary_rule, configuration, safety: { warning, termination: "Interromper em caso de dor ou desconforto relevante." } });

export const TRAINING_METHODS: FitTrainingMethod[] = [
  { key: "traditional", name: "Tradicional", description: "Séries retas.", blocks: [block("straight_set", "Séries de trabalho", { sets: 3, target_reps: "8-12" })], primaryBlockType: "straight_set", chartRelevant: true },
  { key: "feeder_top_backoff", name: "Feeder / Top / Back-off", description: "Aproximação, série pesada e retrocesso.", blocks: [block("feeder", "Feeder", { sets: 2, target_reps: "6-8" }), block("top_set", "Top set", { sets: 1, target_reps: "5-9" }), block("backoff", "Back-off", { sets: 1, target_reps: "10-15" })], primaryBlockType: "top_set", chartRelevant: true },
  { key: "myo_reps", name: "Myo Reps", description: "Ativação e mini-séries repetíveis.", blocks: [block("myo_activation", "Myo Reps", { data: strategyData("myo_reps", "initial_load_total_reps_occurrences", { rest_seconds: 10 }), steps: [step("failure_segment", "Ativação", { target_reps: "6-8" }), step("mini_set", "Mini-série", { target_reps: "2-3", rest_seconds: 10, repeat_mode: "open", min_occurrences: 1, max_occurrences: null })] })], primaryBlockType: "myo_activation", chartRelevant: true },
  { key: "rest_pause", name: "Rest-pause", description: "Série com pausas curtas.", blocks: [block("rest_pause", "Rest-pause", { data: strategyData("rest_pause", "initial_load_total_reps_occurrences", { pause_mode: "short" }), steps: [step("failure_segment", "Série inicial", { target_reps: "8-12" }), step("mini_set", "Repetições após pausa", { repeat_mode: "open", min_occurrences: 1, max_occurrences: null })] })], primaryBlockType: "rest_pause", chartRelevant: true },
  { key: "cluster", name: "Cluster", description: "Mini-blocos com pausa intra-série.", blocks: [block("cluster", "Cluster", { data: strategyData("cluster", "initial_load_total_reps_occurrences", {}), steps: [step("mini_set", "Mini-bloco", { target_reps: "3", rest_seconds: 20, repeat_mode: "open", min_occurrences: 3, max_occurrences: 6 })] })], primaryBlockType: "cluster", chartRelevant: true },
  { key: "drop_set_target", name: "Drop set com meta", description: "Série inicial e drops até a meta.", blocks: [block("drop_set", "Drop set com meta", { data: strategyData("drop_set_target", "initial_load_total_reps_drop_count", { initial_rep_range: { min: 13, max: 16 }, drop_count: null, drop_count_mode: "open", load_reduction_type: "percentage", load_reduction_pct: null, target_reps_after_drop: 24, target_mode: "after_drop", termination: "target_reps_or_professional_decision" }, "Técnica intensiva: seguir o critério de interrupção definido pelo profissional."), steps: [step("failure_segment", "Série inicial", { target_reps: "13-16" }), step("load_drop", "Drop", { target_reps: "até a meta", load_change_type: "percentage", repeat_mode: "open", min_occurrences: 1, max_occurrences: null, termination_rule: "Meta atingida ou decisão profissional" })] })], primaryBlockType: "drop_set", chartRelevant: true },
  { key: "staged_drop_isometric", name: "Drop set com isometria em estágios", description: "Reps, isometria e redução em três estágios.", blocks: [block("drop_set", "Drop set com isometria em estágios", { data: strategyData("staged_drop_isometric", "initial_load_total_reps_total_duration", { stages: 3, reps_per_stage: 8, hold_seconds: 8, hold_position: "professional_defined", reduction_pct: 30, rest_between_stages_seconds: 0 }, "Interromper se a sustentação causar dor ou perda de controle."), steps: [1,2,3].flatMap((n) => [step("dynamic_reps", `Estágio ${n} — repetições`, { target_reps: "8" }), step("isometric_hold", `Estágio ${n} — isometria`, { target_duration_seconds: 8 }), ...(n < 3 ? [step("load_drop", `Reduzir carga após estágio ${n}`, { load_change_type: "percentage", load_change_value: 30, min_occurrences: 0, max_occurrences: 1 })] : [])]) })], primaryBlockType: "drop_set", chartRelevant: true },
  { key: "full_partial_ladder", name: "Escada completa + parcial", description: "Escada de completas com parciais constantes.", blocks: [block("other", "Escada completa + parcial", { data: strategyData("full_partial_ladder", "total_full_total_partial_initial_load", { load_mode: "fixed", rest_between_stages_seconds: 0, partial_range: null }), steps: [5,4,3,2,1].map((full, i) => step("dynamic_reps", `Estágio ${i + 1}`, { target_full_reps: full, target_partial_reps: 5 })) })], primaryBlockType: "other", chartRelevant: true },
  { key: "widowmaker", name: "Widowmaker", description: "Meta total com pausas intra-série sem encerrar a montagem.", blocks: [block("rest_pause", "Widowmaker", { data: strategyData("widowmaker", "initial_load_total_reps_pause_count", { initial_rep_range: { min: 10, max: 12 }, total_rep_range: { min: 15, max: 20 }, pause_mode: "self_regulated", keep_setup_between_pauses: true }, "Técnica intensiva: usar somente conforme prescrição e encerrar diante de dor ou risco."), steps: [step("failure_segment", "Antes da primeira pausa", { target_reps: "10-12" }), step("mini_set", "Bloco após pausa", { repeat_mode: "open", min_occurrences: 1, max_occurrences: null, termination_rule: "Meta total, segurança ou decisão profissional" })] })], primaryBlockType: "rest_pause", chartRelevant: true },
  { key: "stretched_isometric", name: "Isometria em posição alongada", description: "Sustentação controlada em posição alongada.", blocks: [block("other", "Isometria em posição alongada", { sets: 1, data: strategyData("stretched_isometric", "total_duration_load", { duration_range_seconds: { min: 60, max: 90 }, hold_position: "stretched" }, "Não exagerar na carga; interromper em caso de dor ou perda de posição."), steps: [step("isometric_hold", "Sustentação alongada", { target_duration_seconds: 60, data: { target_duration_max_seconds: 90, hold_position: "stretched" } })] })], primaryBlockType: "other", chartRelevant: false },
  { key: "peak_contraction", name: "Pico de contração", description: "Sustentação em cada repetição.", blocks: [block("straight_set", "Pico de contração", { sets: 2, target_reps: "10-15", data: strategyData("peak_contraction", "load_total_reps", { hold_per_rep_seconds: 2, hold_position: "peak_contraction" }), steps: [step("dynamic_reps", "Repetições com sustentação", { target_reps: "10-15", data: { hold_per_rep_seconds: 2, hold_position: "peak_contraction" } })] })], primaryBlockType: "straight_set", chartRelevant: true },
  { key: "custom", name: "Personalizado", description: "Bloco editável pelo profissional.", blocks: [block("other", "Personalizado")], primaryBlockType: "other", chartRelevant: false },
];
