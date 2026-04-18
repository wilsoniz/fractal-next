// ============================================================
// Tipos gerados a partir do information_schema real do banco
// Inspecionado em: 2026-04-09
// ============================================================

export type SkillStatus   = "absent" | "emerging" | "acquired";
export type ProgramStatus = "active" | "completed" | "stalled";
export type AlertLevel    = "low" | "medium" | "high";
export type GoalType      = "acquisition" | "replacement" | "reduction" | "generalization" | "maintenance";
export type GoalHealth    = "on_track" | "watch" | "stalled" | "accelerating" | "consolidating";
export type ForecastConf  = "low" | "medium" | "high";
export type ForecastEffort = "low" | "moderate" | "high";

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

// radar_snapshots — sem coluna label (não existe no banco)
export interface RadarSnapshotDB {
  id: string;
  crianca_id: string;
  avaliacao_id: string | null;
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
  crianca_id: string | null;
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
  plano_id: string;
  crianca_id: string;
  responsavel_id: string;
  tentativas: string[];
  total_tentativas: number | null;
  acertos: number;
  taxa_acerto: number | null;
  duracao_segundos: number | null;
  observacao: string | null;
  humor_crianca: number | null;
  concluida: boolean;
  criado_em: string;
}

export interface Plano {
  id: string;
  crianca_id: string;
  programa_id: string;
  status: string;
  prioridade: number;
  tipo_plano: string;
  score_inicio: number | null;
  score_atual: number | null;
  meta_score: number | null;
  gerado_por: string | null;
  terapeuta_id: string | null;
  iniciado_em: string | null;
  concluido_em: string | null;
  criado_em: string;
  atualizado_em: string;
}

export interface Programa {
  id: string;
  codigo: string;
  nome: string;
  dominio: string;
  tipo: string;
  nivel: string;
  objetivo: string;
  subtitulo: string | null;
  materiais: string | null;
  passos: unknown[];
  dica: string | null;
  prereqs: string[] | null;
  desbloqueia: string[] | null;
  tempo_minutos: number | null;
  ativo: boolean;
  criado_em: string;
}

export interface Perfil {
  id: string;
  nome: string | null;
  email: string | null;
  criado_em?: string;
}

export interface LearnerProfileData {
  crianca: Crianca;
  radar: RadarSnapshotDB[];
  sessoes: SessaoClinica[];
  checkins: Checkin[];
}
