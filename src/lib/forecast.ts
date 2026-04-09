export type GoalType =
  | "acquisition"
  | "replacement"
  | "reduction"
  | "generalization"
  | "maintenance";

export type ReadinessLevel = "low" | "medium" | "high";
export type SupportLevel = "low" | "medium" | "high";
export type GeneralizationLevel = "low" | "medium" | "high";
export type GoalHealth =
  | "on_track"
  | "watch"
  | "stalled"
  | "accelerating"
  | "consolidating";

export type RecommendedAction =
  | "continue"
  | "adjust_reinforcement"
  | "adjust_prompting"
  | "reduce_criterion"
  | "review_function"
  | "generalize"
  | "fade_support";

export type SkillStatus = "absent" | "emerging" | "acquired";
export type ProgramStatus = "active" | "completed" | "stalled";
export type AlertLevel = "low" | "medium" | "high";

export type LearnerSkill = {
  id: string;
  name: string;
  domain: string;
  status: SkillStatus;
};

export type LearnerProgram = {
  id: string;
  name: string;
  domain: string;
  status: ProgramStatus;
  success: number;
  independence: number;
};

export type LearnerAlert = {
  id: string;
  title: string;
  description: string;
  level: AlertLevel;
};

export type RadarSnapshot = {
  date: string;
  communication: number;
  social: number;
  attention: number;
  regulation: number;
  autonomy: number;
  flexibility: number;
  play: number;
  motivation: number;
};

export type ForecastGoal = {
  id: string;
  name: string;
  type: GoalType;
  targetDomain: keyof Omit<RadarSnapshot, "date">;
  requiredSkills?: string[];
  relatedPrograms?: string[];
};

export type ForecastInput = {
  radar: RadarSnapshot[];
  skills: LearnerSkill[];
  programs: LearnerProgram[];
  alerts: LearnerAlert[];
  adherence?: number;
};

export type ForecastResult = {
  goalId: string;
  goalName: string;
  goalType: GoalType;
  min: number;
  max: number;
  confidence: "low" | "medium" | "high";
  effort: "low" | "moderate" | "high";
  inferredReadiness: ReadinessLevel;
  inferredSupport: SupportLevel;
  inferredGeneralization: GeneralizationLevel;
  inferredBarriers: number;
  inferredSeverity: number;
  rationale: string[];
  goalHealth: GoalHealth;
  reviewAfterSessions: number;
  recommendedAction: RecommendedAction;
  progressDelta: number;
  riskScore: number;
};

// ─── Base sessions per goal type ────────────────────────────────────────────

const BASE_SESSIONS: Record<GoalType, number> = {
  acquisition: 6,
  replacement: 8,
  reduction: 12,
  generalization: 6,
  maintenance: 4,
};

// ─── Adjustment functions ────────────────────────────────────────────────────

function readinessAdj(level: ReadinessLevel) {
  if (level === "high") return -2;
  if (level === "medium") return 0;
  return 3;
}

function supportAdj(level: SupportLevel) {
  if (level === "high") return -2;
  if (level === "medium") return 0;
  return 2;
}

function generalizationAdj(level: GeneralizationLevel) {
  if (level === "high") return 4;
  if (level === "medium") return 2;
  return 0;
}

function barrierAdj(barriers: number) {
  return barriers * 2;
}

function severityAdj(severity: number) {
  return severity * 2;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

// ─── Radar helpers ───────────────────────────────────────────────────────────

function latestRadar(radar: RadarSnapshot[]) {
  return radar[radar.length - 1];
}

function previousRadar(radar: RadarSnapshot[]) {
  return radar.length >= 2 ? radar[radar.length - 2] : null;
}

function domainScore(snapshot: RadarSnapshot, domain: ForecastGoal["targetDomain"]) {
  return snapshot[domain];
}

// ─── Program matching ────────────────────────────────────────────────────────

function relatedPrograms(goal: ForecastGoal, programs: LearnerProgram[]) {
  if (goal.relatedPrograms && goal.relatedPrograms.length > 0) {
    const names = goal.relatedPrograms.map((n) => n.trim().toLowerCase());
    return programs.filter((p) => names.includes(p.name.trim().toLowerCase()));
  }
  return programs.filter((p) =>
    p.domain.toLowerCase().includes(goal.targetDomain)
  );
}

// ─── Inference functions ─────────────────────────────────────────────────────

function inferReadiness(
  goal: ForecastGoal,
  latest: RadarSnapshot,
  skills: LearnerSkill[]
): ReadinessLevel {
  const score = domainScore(latest, goal.targetDomain);
  const required = (goal.requiredSkills ?? []).map((name) =>
    skills.find((s) => s.name.toLowerCase() === name.toLowerCase())
  );
  const acquired = required.filter((s) => s?.status === "acquired").length;
  const emerging = required.filter((s) => s?.status === "emerging").length;

  if (score >= 65 || acquired >= 2 || acquired + emerging >= 3) return "high";
  if (score >= 45 || acquired >= 1 || emerging >= 1) return "medium";
  return "low";
}

function inferSupport(adherence: number | undefined, alerts: LearnerAlert[]): SupportLevel {
  const value = adherence ?? 65;
  const highAlerts = alerts.filter((a) => a.level === "high").length;
  if (value >= 75 && highAlerts === 0) return "high";
  if (value >= 50) return "medium";
  return "low";
}

function inferGeneralization(goal: ForecastGoal): GeneralizationLevel {
  if (goal.type === "generalization") return "high";
  if (goal.type === "maintenance") return "medium";
  return "low";
}

function inferBarriers(
  goal: ForecastGoal,
  latest: RadarSnapshot,
  programs: LearnerProgram[],
  alerts: LearnerAlert[]
): number {
  let barriers = 0;
  const score = domainScore(latest, goal.targetDomain);
  if (score < 50) barriers += 1;
  if (score < 40) barriers += 1;

  const stalledInDomain = programs.filter(
    (p) => p.domain.toLowerCase().includes(goal.targetDomain) && p.status === "stalled"
  ).length;
  barriers += Math.min(stalledInDomain, 1);

  if (alerts.filter((a) => a.level === "high").length > 0) barriers += 1;
  return Math.min(barriers, 3);
}

function inferSeverity(goal: ForecastGoal, latest: RadarSnapshot): number {
  const score = domainScore(latest, goal.targetDomain);
  if (goal.type === "reduction" || goal.type === "replacement") {
    if (score < 35) return 3;
    if (score < 55) return 2;
    return 1;
  }
  if (goal.type === "acquisition") {
    if (score < 40) return 2;
    return 1;
  }
  return 1;
}

function inferConfidence(
  readiness: ReadinessLevel,
  barriers: number,
  support: SupportLevel
): "low" | "medium" | "high" {
  if (readiness === "high" && barriers <= 1 && support !== "low") return "high";
  if (barriers >= 3 || support === "low") return "low";
  return "medium";
}

function inferEffort(max: number): "low" | "moderate" | "high" {
  if (max <= 6) return "low";
  if (max <= 12) return "moderate";
  return "high";
}

function inferProgressDelta(
  latest: RadarSnapshot,
  previous: RadarSnapshot | null,
  goal: ForecastGoal,
  programs: LearnerProgram[]
): number {
  let delta = 0;
  if (previous) {
    delta += domainScore(latest, goal.targetDomain) - domainScore(previous, goal.targetDomain);
  }
  if (programs.length > 0) {
    const avgSuccess = programs.reduce((acc, p) => acc + p.success, 0) / programs.length;
    const avgIndependence = programs.reduce((acc, p) => acc + p.independence, 0) / programs.length;
    delta += (avgSuccess - 50) / 10;
    delta += (avgIndependence - 40) / 15;
  }
  return Math.round(delta);
}

function inferGoalHealth(
  goal: ForecastGoal,
  programs: LearnerProgram[],
  progressDelta: number,
  barriers: number
): GoalHealth {
  const hasStalled = programs.some((p) => p.status === "stalled");
  const avgSuccess =
    programs.length > 0
      ? programs.reduce((acc, p) => acc + p.success, 0) / programs.length
      : 0;
  const avgIndependence =
    programs.length > 0
      ? programs.reduce((acc, p) => acc + p.independence, 0) / programs.length
      : 0;

  if (goal.type === "maintenance" && avgSuccess >= 80) return "consolidating";
  if (avgSuccess >= 78 && avgIndependence >= 65 && progressDelta >= 6) return "accelerating";
  if (hasStalled || (avgSuccess < 35 && barriers >= 2)) return "stalled";
  if (progressDelta <= 1 && barriers >= 2) return "watch";
  if (avgSuccess >= 80 && avgIndependence >= 70) return "consolidating";
  return "on_track";
}

function inferRiskScore(
  barriers: number,
  support: SupportLevel,
  confidence: "low" | "medium" | "high",
  goalHealth: GoalHealth,
  severity: number
): number {
  let score = 0;
  score += barriers * 18;
  score += severity * 10;
  if (support === "low") score += 20;
  if (support === "medium") score += 8;
  if (confidence === "low") score += 16;
  if (confidence === "medium") score += 6;
  if (goalHealth === "watch") score += 12;
  if (goalHealth === "stalled") score += 24;
  if (goalHealth === "accelerating") score -= 10;
  if (goalHealth === "consolidating") score -= 14;
  return clamp(Math.round(score), 0, 100);
}

function inferReviewAfterSessions(
  goalType: GoalType,
  goalHealth: GoalHealth,
  barriers: number
): number {
  if (goalHealth === "stalled") return 2;
  if (goalHealth === "watch") return 3;
  if (goalType === "reduction") return barriers >= 2 ? 4 : 5;
  if (goalType === "replacement") return barriers >= 2 ? 3 : 4;
  if (goalType === "acquisition") return 4;
  if (goalType === "generalization") return 3;
  return 5;
}

function inferRecommendedAction(
  goal: ForecastGoal,
  goalHealth: GoalHealth,
  programs: LearnerProgram[],
  readiness: ReadinessLevel,
  barriers: number
): RecommendedAction {
  const avgSuccess =
    programs.length > 0
      ? programs.reduce((acc, p) => acc + p.success, 0) / programs.length
      : 0;
  const avgIndependence =
    programs.length > 0
      ? programs.reduce((acc, p) => acc + p.independence, 0) / programs.length
      : 0;

  if (goalHealth === "consolidating") {
    return goal.type === "generalization" ? "generalize" : "fade_support";
  }
  if (goalHealth === "accelerating") return "continue";
  if (goalHealth === "stalled") {
    if (goal.type === "reduction") return "review_function";
    if (avgSuccess < 40 && readiness === "low") return "reduce_criterion";
    if (avgSuccess >= 40 && avgIndependence < 35) return "adjust_prompting";
    return "adjust_reinforcement";
  }
  if (goalHealth === "watch") {
    if (barriers >= 2) return "adjust_reinforcement";
    if (avgIndependence < 40) return "adjust_prompting";
  }
  return "continue";
}

function buildRationale(
  goal: ForecastGoal,
  latest: RadarSnapshot,
  previous: RadarSnapshot | null,
  programs: LearnerProgram[],
  readiness: ReadinessLevel,
  support: SupportLevel,
  generalization: GeneralizationLevel,
  barriers: number,
  severity: number,
  progressDelta: number,
  goalHealth: GoalHealth
): string[] {
  const rationale: string[] = [];
  const score = domainScore(latest, goal.targetDomain);

  rationale.push(`Domínio-alvo em ${score}/100 no radar atual.`);

  if (previous) {
    const delta = score - domainScore(previous, goal.targetDomain);
    if (delta >= 8) rationale.push("Há crescimento recente consistente no domínio-alvo.");
    else if (delta <= -5) rationale.push("O domínio-alvo mostrou piora recente e isso aumenta cautela.");
    else rationale.push("O domínio-alvo está relativamente estável nas últimas leituras.");
  }

  if (programs.length > 0) {
    const avgSuccess = Math.round(
      programs.reduce((acc, p) => acc + p.success, 0) / programs.length
    );
    const avgIndependence = Math.round(
      programs.reduce((acc, p) => acc + p.independence, 0) / programs.length
    );
    rationale.push(
      `Programas relacionados com média de ${avgSuccess}% de sucesso e ${avgIndependence}% de independência.`
    );
  }

  if (readiness === "high") rationale.push("Os pré-requisitos parecem bem estabelecidos.");
  else if (readiness === "medium") rationale.push("Há sinais de prontidão parcial para avanço da meta.");
  else rationale.push("Ainda há lacunas importantes de prontidão para essa meta.");

  if (support === "high") rationale.push("O contexto sugere boa sustentação terapêutica/familiar.");
  else if (support === "low") rationale.push("A sustentação do ambiente parece baixa e pode desacelerar o progresso.");

  if (generalization === "high") rationale.push("A meta exige generalização mais ampla, aumentando o esforço previsto.");
  if (barriers >= 2) rationale.push("Há múltiplas barreiras clínicas ativas influenciando a previsão.");
  if (severity >= 3) rationale.push("A severidade basal atual sugere maior tempo até consolidação.");

  if (progressDelta >= 6) rationale.push("A tendência atual favorece encurtamento da previsão inicial.");
  else if (progressDelta <= 1) rationale.push("A tendência atual sugere progresso lento e necessidade de monitoramento.");

  if (goalHealth === "stalled") rationale.push("A meta apresenta sinais de estagnação e pede revisão breve.");
  else if (goalHealth === "consolidating") rationale.push("A meta parece próxima de consolidação com espaço para fading ou generalização.");

  return rationale;
}

// ─── Main export ─────────────────────────────────────────────────────────────

export function generateForecastFromProfile(
  goal: ForecastGoal,
  input: ForecastInput
): ForecastResult {
  const latest = latestRadar(input.radar);
  const previous = previousRadar(input.radar);
  const programs = relatedPrograms(goal, input.programs);

  const readiness = inferReadiness(goal, latest, input.skills);
  const support = inferSupport(input.adherence, input.alerts);
  const generalization = inferGeneralization(goal);
  const barriers = inferBarriers(goal, latest, input.programs, input.alerts);
  const severity = inferSeverity(goal, latest);

  let sessions =
    BASE_SESSIONS[goal.type] +
    readinessAdj(readiness) +
    supportAdj(support) +
    generalizationAdj(generalization) +
    barrierAdj(barriers) +
    severityAdj(severity);

  if (sessions < 4) sessions = 4;

  const progressDelta = inferProgressDelta(latest, previous, goal, programs);

  if (progressDelta >= 8) sessions -= 2;
  else if (progressDelta >= 4) sessions -= 1;
  else if (progressDelta <= 0) sessions += 2;
  else if (progressDelta <= 2) sessions += 1;

  sessions = clamp(sessions, 4, 40);

  const confidence = inferConfidence(readiness, barriers, support);
  const goalHealth = inferGoalHealth(goal, programs, progressDelta, barriers);

  let min = Math.round(sessions * 0.8);
  let max = Math.round(sessions * 1.2);

  if (goalHealth === "stalled") max += 2;
  if (goalHealth === "consolidating") {
    min = Math.max(2, min - 1);
    max = Math.max(min + 1, max - 2);
  }

  const effort = inferEffort(max);
  const riskScore = inferRiskScore(barriers, support, confidence, goalHealth, severity);
  const reviewAfterSessions = inferReviewAfterSessions(goal.type, goalHealth, barriers);
  const recommendedAction = inferRecommendedAction(goal, goalHealth, programs, readiness, barriers);

  return {
    goalId: goal.id,
    goalName: goal.name,
    goalType: goal.type,
    min,
    max,
    confidence,
    effort,
    inferredReadiness: readiness,
    inferredSupport: support,
    inferredGeneralization: generalization,
    inferredBarriers: barriers,
    inferredSeverity: severity,
    rationale: buildRationale(
      goal, latest, previous, programs,
      readiness, support, generalization,
      barriers, severity, progressDelta, goalHealth
    ),
    goalHealth,
    reviewAfterSessions,
    recommendedAction,
    progressDelta,
    riskScore,
  };
}
