// ============================================================
// Tipos gerados a partir do information_schema real do banco
// Inspecionado em: 2026-04-08
// ============================================================

// ─── Enums ────────────────────────────────────────────────────
export type SkillStatus   = "absent" | "emerging" | "acquired";
export type ProgramStatus = "active" | "completed" | "stalled";
export type AlertLevel    = "low" | "medium" | "high";
export type GoalType      = "acquisition" | "replacement" | "reduction" | "generalization" | "maintenance";
export type GoalHealth    = "on_track" | "watch" | "stalled" | "accelerating" | "consolidating";
export type ForecastConf  = "low" | "medium" | "high";
export type ForecastEffort = "low" | "moderate" | "high";

// ─── Tabelas existentes ───────────────────────────────────────

export interface Crianca {
  id: string;
  responsavel_id: string | null;
  nome: string;
  data_nascimento: string;
  idade_anos: number | null;
  diagnostico: string | null;
  observacoes: string | null;
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
}

// radar_snapshots — domain scores em português com prefixo score_
export interface RadarSnapshotDB {
  id: string;
  crianca_id: string;
  avaliacao_id: string | null;
  label: string | null;           // adicionado pelo schema Fracta
  score_comunicacao: number | null;
  score_social: number | null;
  score_atencao: number | null;
  score_regulacao: number | null;
  score_brincadeira: number | null;
  score_flexibilidade: number | null;
  score_autonomia: number | null;
  score_motivacao: number | null;
  criado_em: string;
}

export interface Avaliacao {
  id: string;
  crianca_id: string;
  responsavel_id: string | null;
  nome_crianca: string | null;
  idade_crianca: number | null;
  nome_responsavel: string | null;
  email_responsavel: string | null;
  respostas: Record<string, unknown> | null;
  score_comunicacao: number | null;
  score_social: number | null;
  score_atencao: number | null;
  score_regulacao: number | null;
  score_brincadeira: number | null;
  score_flexibilidade: number | null;
  score_autonomia: number | null;
  score_motivacao: number | null;
  score_geral: number | null;
  tipo: string | null;
  origem: string | null;
  dominio_prioritario: string | null;
  convertido: boolean | null;
  criado_em: string;
}

export interface Checkin {
  id: string;
  crianca_id: string;
  responsavel_id: string | null;
  respostas: Record<string, unknown> | null;
  score_comunicacao: number | null;
  score_social: number | null;
  score_atencao: number | null;
  score_regulacao: number | null;
  score_brincadeira: number | null;
  score_flexibilidade: number | null;
  score_autonomia: number | null;
  score_motivacao: number | null;
  observacao: string | null;
  semana: number | null;
  criado_em: string;
}

export interface SessaoClinica {
  id: string;
  terapeuta_id: string | null;
  crianca_id: string;
  responsavel_id: string | null;
  programa_id: string | null;
  timer_segundos: number | null;
  tentativas: Record<string, unknown> | null;
  pic_registros: Record<string, unknown> | null;
  observacoes: string | null;
  taxa_id: number | null;
  agendado_para: string | null;
  status: string | null;
  valor_sessao: number | null;
  comissao_fracta: number | null;
  pago: boolean | null;
  criado_em: string;
}

// ─── Novas tabelas clínicas ───────────────────────────────────

export interface HabilidadeCrianca {
  id: string;
  crianca_id: string;
  skill_library_id: string | null;
  nome: string;
  dominio: string;
  status: SkillStatus;
  confianca: number;
  notas: string | null;
  criado_em: string;
  atualizado_em: string;
}

export interface ProgramaCrianca {
  id: string;
  crianca_id: string;
  programa_id: string | null;
  nome: string;
  dominio: string;
  status: ProgramStatus;
  taxa_sucesso: number;
  taxa_independencia: number;
  nivel_ajuda: string | null;
  criterio_meta: string | null;
  total_sessoes: number;
  iniciado_em: string | null;
  concluido_em: string | null;
  criado_em: string;
  atualizado_em: string;
}

export interface AlertaClinico {
  id: string;
  crianca_id: string;
  titulo: string;
  descricao: string;
  nivel: AlertLevel;
  ativo: boolean;
  resolvido_em: string | null;
  criado_em: string;
}

export interface MetaClinica {
  id: string;
  crianca_id: string;
  nome: string;
  tipo: GoalType;
  dominio_alvo: string;
  descricao_baseline: string | null;
  criterio_consolidacao: string | null;
  habilidades_requeridas: string[];
  programas_relacionados: string[];
  forecast_min: number | null;
  forecast_max: number | null;
  forecast_confianca: ForecastConf | null;
  forecast_esforco: ForecastEffort | null;
  saude_meta: GoalHealth | null;
  risco_score: number | null;
  revisar_em_sessoes: number | null;
  acao_recomendada: string | null;
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
}

// ─── Tipo composto para o Learner Profile ────────────────────
export interface LearnerProfileData {
  crianca: Crianca;
  radar: RadarSnapshotDB[];
  habilidades: HabilidadeCrianca[];
  programas: ProgramaCrianca[];
  alertas: AlertaClinico[];
  metas: MetaClinica[];
  sessoes: SessaoClinica[];
  checkins: Checkin[];
}
