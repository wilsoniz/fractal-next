// Plataforma de Consultoria de Treinos e Fisioterapia — tipos do domínio.
// Produto isolado do Fracta: nenhum tipo aqui importa/depende de entidades clínicas.
// Valores internos em inglês; a UI traduz para PT-BR (mapas de label abaixo).

export type FitRole = "professional" | "patient";

export interface FitProfile {
  id: string;
  role: FitRole;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  created_at: string;
  updated_at: string;
}

// ── Enums de domínio ─────────────────────────────────────────
export type FitSex = "female" | "male" | "other";
export type FitModality = "strength" | "running" | "crossfit" | "rehab" | "wellness" | "other";
export type FitConsultoriaType = "in_person" | "online" | "hybrid";

// Status PERSISTIDO no banco (fit_patients.status) — apenas 2 estados por enquanto.
export type FitPatientStatus = "active" | "archived";

// Status de UI — a interface já nasce preparada para 4 estados;
// "em_avaliacao" e "pausado" ainda não são persistíveis (migration futura).
export type FitPatientUiStatus = "active" | "em_avaliacao" | "pausado" | "archived";

export interface FitPatient {
  id: string;
  professional_id: string;
  user_id: string | null;
  full_name: string;
  birth_date: string | null;
  sex: FitSex | null;
  phone: string | null;
  email: string | null;
  goal: string | null;
  modality: FitModality | null;
  consultoria_type: FitConsultoriaType | null;
  training_location: string | null;
  notes: string | null;
  status: FitPatientStatus;
  created_at: string;
  updated_at: string;
}

// Payload normalizado (vindo do FitPatientForm): strings vazias já viram null.
export interface FitPatientInput {
  full_name: string;
  birth_date: string | null;
  sex: FitSex | null;
  phone: string | null;
  email: string | null;
  goal: string | null;
  modality: FitModality | null;
  consultoria_type: FitConsultoriaType | null;
  training_location: string | null;
  notes: string | null;
}

// ── Mapas de tradução UI (PT-BR) ─────────────────────────────
export const SEX_LABELS: Record<FitSex, string> = {
  female: "Feminino",
  male: "Masculino",
  other: "Outro",
};

export const MODALITY_LABELS: Record<FitModality, string> = {
  strength: "Musculação",
  running: "Corrida",
  crossfit: "Crossfit",
  rehab: "Reabilitação",
  wellness: "Wellness",
  other: "Outro",
};

export const CONSULTORIA_TYPE_LABELS: Record<FitConsultoriaType, string> = {
  in_person: "Presencial",
  online: "Online",
  hybrid: "Híbrida",
};

export interface FitStatusMeta {
  label: string;
  color: string;
  bg: string;
  persistable: boolean; // se pode ser salvo hoje (só active/archived)
}

export const UI_STATUS_META: Record<FitPatientUiStatus, FitStatusMeta> = {
  active:       { label: "Ativo",        color: "#22c5a4", bg: "rgba(34,197,164,.14)",  persistable: true },
  em_avaliacao: { label: "Em avaliação", color: "#7c9cfc", bg: "rgba(124,156,252,.14)", persistable: false },
  pausado:      { label: "Pausado",      color: "#efb04a", bg: "rgba(239,176,74,.14)",  persistable: false },
  archived:     { label: "Arquivado",    color: "#8ea3c0", bg: "rgba(142,163,192,.14)", persistable: true },
};

// ── Fase 2 — questionário, avaliações e medições ─────────────

export type FitQuestionnaireStatus = "draft" | "completed";

export interface FitQuestionnaire {
  id: string;
  patient_id: string;
  professional_id: string;
  answers: Record<string, Record<string, string>>; // seção → campo → valor
  status: FitQuestionnaireStatus;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export type FitAssessmentType = "baseline" | "reassessment";
export type FitAssessmentStatus = "active" | "archived";

export const ASSESSMENT_TYPE_LABELS: Record<FitAssessmentType, string> = {
  baseline: "Linha de base",
  reassessment: "Reavaliação",
};

export interface FitAssessment {
  id: string;
  patient_id: string;
  professional_id: string;
  type: FitAssessmentType;
  assessed_at: string;
  title: string | null;
  notes: string | null;
  data: Record<string, unknown>;
  status: FitAssessmentStatus;
  created_at: string;
  updated_at: string;
}

// fit_measurements = repositório central de variáveis quantitativas (não só antropometria).
export type FitMeasurementCategory =
  | "anthropometry"
  | "circumference"
  | "performance"
  | "functional"
  | "other";

export const MEASUREMENT_CATEGORY_LABELS: Record<FitMeasurementCategory, string> = {
  anthropometry: "Antropometria",
  circumference: "Perimetria",
  performance: "Performance",
  functional: "Dor e Funcionalidade",
  other: "Outros",
};

// Ordem dos blocos na tela de avaliação.
export const MEASUREMENT_CATEGORY_ORDER: FitMeasurementCategory[] = [
  "anthropometry",
  "circumference",
  "performance",
  "functional",
  "other",
];

export interface FitMeasurement {
  id: string;
  patient_id: string;
  professional_id: string;
  assessment_id: string | null;
  category: FitMeasurementCategory;
  metric: string;
  label: string | null;
  value: number;
  unit: string | null;
  measured_at: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// ── Fase 3 — planos de treino (prescrição) ───────────────────

export type FitWorkoutPlanStatus = "draft" | "active" | "archived";

export const WORKOUT_PLAN_STATUS_LABELS: Record<FitWorkoutPlanStatus, string> = {
  draft: "Rascunho",
  active: "Ativo",
  archived: "Arquivado",
};

export interface FitWorkoutPlan {
  id: string;
  patient_id: string;
  professional_id: string;
  title: string;
  goal: string | null;
  start_date: string | null;
  end_date: string | null;
  frequency_per_week: number | null;
  notes: string | null;
  data: Record<string, unknown>;
  status: FitWorkoutPlanStatus;
  created_at: string;
  updated_at: string;
}

export interface FitWorkoutDay {
  id: string;
  plan_id: string;
  name: string;
  focus: string | null;
  order_index: number;
  notes: string | null;
  status: "active" | "archived";
  created_at: string;
  updated_at: string;
}

export interface FitWorkoutExercise {
  id: string;
  plan_id: string;
  day_id: string;
  name: string;
  order_index: number;
  sets: number | null;
  target_reps: string | null;
  target_load: string | null;
  rest_seconds: number | null;
  tempo: string | null;
  video_url: string | null;
  instructions: string | null;
  notes: string | null;
  group_id: string | null;   // Fase 11 — grupo (null = standalone)
  group_order: number;       // ordem dentro do grupo
  status: "active" | "archived";
  created_at: string;
  updated_at: string;
}

// ── Fase 11 — agrupamento de exercícios ──────────────────────
export type FitGroupType = "superset" | "circuit" | "emom" | "other";

export const GROUP_TYPE_LABELS: Record<FitGroupType, string> = {
  superset: "Superset",
  circuit: "Circuito",
  emom: "EMOM",
  other: "Grupo",
};

export interface FitExerciseGroup {
  id: string;
  plan_id: string;
  day_id: string;
  type: FitGroupType;
  label: string | null;
  rounds: number | null;
  interval_seconds: number | null;
  rest_seconds: number | null;
  order_index: number;
  notes: string | null;
  data: Record<string, unknown>;
  status: "active" | "archived";
  created_at: string;
  updated_at: string;
}

export interface FitExerciseGroupInput {
  type: FitGroupType;
  label: string | null;
  rounds: number | null;
  interval_seconds: number | null;
  rest_seconds: number | null;
}

// Payload de exercício vindo do FitExerciseEditor (normalizado).
export interface FitWorkoutExerciseInput {
  name: string;
  sets: number | null;
  target_reps: string | null;
  target_load: string | null;
  rest_seconds: number | null;
  tempo: string | null;
  video_url: string | null;
  instructions: string | null;
  notes: string | null;
}

// ── Fase 6 — blocos de execução ──────────────────────────────
export type FitBlockType =
  | "feeder"
  | "top_set"
  | "backoff"
  | "myo_activation"
  | "myo_mini_set"
  | "straight_set"
  | "warmup"
  | "amrap"
  | "rest_pause"
  | "drop_set"
  | "cluster"
  | "circuit"
  | "other";

export interface FitExerciseBlock {
  id: string;
  exercise_id: string;
  plan_id: string;
  day_id: string;
  block_type: FitBlockType;
  label: string | null;
  order_index: number;
  sets: number | null;
  target_reps: string | null;
  target_load: string | null;
  rest_seconds: number | null;
  rir: string | null; // prescrição em texto (faixa)
  rpe: string | null; // prescrição em texto (faixa)
  tempo: string | null;
  instructions: string | null;
  data: Record<string, unknown>;
  status: "active" | "archived";
  created_at: string;
  updated_at: string;
}

export interface FitExerciseBlockInput {
  block_type: FitBlockType;
  label: string | null;
  sets: number | null;
  target_reps: string | null;
  target_load: string | null;
  rest_seconds: number | null;
  rir: string | null;
  rpe: string | null;
  tempo: string | null;
  instructions: string | null;
}

// Exercício com seus blocos ativos aninhados.
export type FitExerciseWithBlocks = FitWorkoutExercise & { blocks: FitExerciseBlock[] };

// Grupo com seus exercícios (com blocos) aninhados.
export type FitGroupWithExercises = FitExerciseGroup & { exercises: FitExerciseWithBlocks[] };

// Plano com dias → exercícios standalone + grupos (com exercícios) aninhados (ativos).
export interface FitWorkoutPlanFull extends FitWorkoutPlan {
  days: (FitWorkoutDay & { exercises: FitExerciseWithBlocks[]; groups: FitGroupWithExercises[] })[];
}

// ── Fase 4 — área do paciente (registro de treino + check-ins) ──

export interface FitTrainingLog {
  id: string;
  patient_id: string;
  plan_id: string | null;
  day_id: string | null;
  performed_at: string;
  duration_min: number | null;
  notes: string | null;
  status: "active" | "archived";
  created_at: string;
  updated_at: string;
}

export interface FitTrainingLogEntry {
  id: string;
  log_id: string;
  exercise_id: string | null;
  exercise_name: string;
  sets_done: number | null;
  reps_done: string | null;
  load_done: number | null;
  load_unit: string | null;
  rpe: number | null;
  completed: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface FitTrainingLogEntryInput {
  exercise_id: string | null;
  exercise_name: string;
  sets_done: number | null;
  reps_done: string | null;
  load_done: number | null;
  load_unit: string | null;
  rpe: number | null;
  completed: boolean;
  notes: string | null;
}

export interface FitCheckin {
  id: string;
  patient_id: string;
  checkin_date: string;
  weight_kg: number | null;
  adherence_pct: number | null;
  energy_level: number | null;
  sleep_quality: number | null;
  pain_level: number | null;
  mood: number | null;
  notes: string | null;
  data: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface FitCheckinInput {
  checkin_date: string;
  weight_kg: number | null;
  adherence_pct: number | null;
  energy_level: number | null;
  sleep_quality: number | null;
  pain_level: number | null;
  mood: number | null;
  notes: string | null;
}

// Registro do paciente por bloco (modo avançado).
export interface FitTrainingLogBlockEntry {
  id: string;
  log_id: string;
  exercise_id: string | null;
  block_id: string | null;
  exercise_name: string | null;
  block_label: string | null;
  block_type: string | null;
  load_done: number | null;
  load_unit: string | null;
  reps_done: string | null;
  sets_done: number | null;
  rpe: number | null;
  rir: number | null;
  completed: boolean;
  notes: string | null;
  data: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface FitTrainingLogBlockEntryInput {
  exercise_id: string | null;
  block_id: string | null;
  exercise_name: string | null;
  block_label: string | null;
  block_type: string | null;
  load_done: number | null;
  load_unit: string | null;
  reps_done: string | null;
  sets_done: number | null;
  rpe: number | null;
  rir: number | null;
  completed: boolean;
  notes: string | null;
}

// ── Fase 7 — convite/token de paciente ───────────────────────
export type FitInviteStatus = "pending" | "accepted" | "revoked";

export interface FitPatientInvite {
  id: string;
  patient_id: string;
  professional_id: string;
  token: string;
  email: string | null;
  status: FitInviteStatus;
  expires_at: string;
  accepted_by: string | null;
  accepted_at: string | null;
  created_at: string;
  updated_at: string;
}

// Retorno de fn_fit_invite_info (status pode ser 'expired'/'invalid').
export interface FitInviteInfo {
  status: FitInviteStatus | "expired" | "invalid";
  expires_at: string | null;
  patient_name: string | null;
  professional_name: string | null;
}

// Retorno de fn_fit_redeem_invite.
export interface FitRedeemResult {
  ok: boolean;
  patient_id?: string;
  reason?: string;
}

// ── Fase 8 — arquivos (Storage) ──────────────────────────────
export type FitFileCategory = "photo" | "video" | "exam" | "document" | "progress_photo" | "other";

export const FILE_CATEGORY_LABELS: Record<FitFileCategory, string> = {
  photo: "Foto",
  video: "Vídeo",
  exam: "Exame",
  document: "Documento",
  progress_photo: "Foto de progresso",
  other: "Outro",
};

export interface FitFile {
  id: string;
  patient_id: string;
  uploaded_by: string;
  storage_path: string;
  file_name: string;
  mime_type: string | null;
  size_bytes: number | null;
  category: FitFileCategory;
  taken_at: string | null;
  notes: string | null;
  status: "active" | "archived";
  created_at: string;
  updated_at: string;
}
