import { supabase } from "@/lib/supabase";
import type {
  Crianca,
  RadarSnapshotDB,
  Avaliacao,
  Checkin,
  SessaoClinica,
} from "@/lib/database.types";

// ─── Busca criança pelo responsavel_id ───────────────────
export async function getCriancasByResponsavel(responsavelId: string): Promise<Crianca[]> {
  const { data, error } = await supabase
    .from("criancas")
    .select("*")
    .eq("responsavel_id", responsavelId)
    .eq("ativo", true)
    .order("criado_em", { ascending: true });

  if (error) { console.error("getCriancas:", error); return []; }
  return data ?? [];
}

// ─── Busca criança por id ─────────────────────────────────
export async function getCriancaById(id: string): Promise<Crianca | null> {
  const { data, error } = await supabase
    .from("criancas")
    .select("*")
    .eq("id", id)
    .single();

  if (error) { console.error("getCriancaById:", error); return null; }
  return data;
}

// ─── Radar snapshots ─────────────────────────────────────
export async function getRadarSnapshots(criancaId: string): Promise<RadarSnapshotDB[]> {
  const { data, error } = await supabase
    .from("radar_snapshots")
    .select("*")
    .eq("crianca_id", criancaId)
    .order("criado_em", { ascending: true });

  if (error) { console.error("getRadarSnapshots:", error); return []; }
  return data ?? [];
}

// ─── Último radar ─────────────────────────────────────────
export async function getUltimoRadar(criancaId: string): Promise<RadarSnapshotDB | null> {
  const { data, error } = await supabase
    .from("radar_snapshots")
    .select("*")
    .eq("crianca_id", criancaId)
    .order("criado_em", { ascending: false })
    .limit(1)
    .single();

  if (error) { return null; }
  return data;
}

// ─── Programas ativos ─────────────────────────────────────
// programas = biblioteca global de programas (sem crianca_id)
// Para buscar programas de uma criança, usar a tabela sessoes
export async function getProgramasBiblioteca(dominio?: string) {
  let query = supabase.from("programas").select("*").order("codigo");
  if (dominio) query = query.eq("dominio", dominio);
  const { data, error } = await query;
  if (error) { console.error("getProgramas:", error); return []; }
  return data ?? [];
}

// Busca programas recomendados para uma criança baseado nos scores do radar
export async function getProgramasRecomendados(scores: Record<string, number>) {
  // Pega os 3 domínios com menor score
  const dominiosPrioritarios = Object.entries(scores)
    .sort(([, a], [, b]) => a - b)
    .slice(0, 3)
    .map(([k]) => k);

  const { data, error } = await supabase
    .from("programas")
    .select("*")
    .in("dominio", dominiosPrioritarios)
    .order("codigo");

  if (error) { console.error("getProgramasRecomendados:", error); return []; }
  return data ?? [];
}

// ─── Sessões recentes ─────────────────────────────────────
export async function getSessoesRecentes(criancaId: string, limit = 10): Promise<SessaoClinica[]> {
  const { data, error } = await supabase
    .from("sessoes")
    .select("*")
    .eq("crianca_id", criancaId)
    .order("criado_em", { ascending: false })
    .limit(limit);

  if (error) { console.error("getSessoes:", error); return []; }
  return data ?? [];
}

// ─── Checkins recentes ────────────────────────────────────
export async function getCheckins(criancaId: string, limit = 5): Promise<Checkin[]> {
  const { data, error } = await supabase
    .from("checkins")
    .select("*")
    .eq("crianca_id", criancaId)
    .order("criado_em", { ascending: false })
    .limit(limit);

  if (error) { console.error("getCheckins:", error); return []; }
  return data ?? [];
}

// ─── Avaliações ───────────────────────────────────────────
export async function getAvaliacoes(criancaId: string): Promise<Avaliacao[]> {
  const { data, error } = await supabase
    .from("avaliacoes")
    .select("*")
    .eq("crianca_id", criancaId)
    .order("criado_em", { ascending: false });

  if (error) { console.error("getAvaliacoes:", error); return []; }
  return data ?? [];
}

// ─── Salvar sessão de atividade ───────────────────────────
export async function salvarSessaoAtividade(params: {
  criancaId: string;
  responsavelId: string;
  programaId?: string;
  tentativas: Record<string, unknown>;
  observacoes?: string;
  timerSegundos?: number;
}) {
  const { data, error } = await supabase
    .from("sessoes")
    .insert({
      crianca_id:     params.criancaId,
      responsavel_id: params.responsavelId,
      programa_id:    params.programaId ?? null,
      tentativas:     params.tentativas,
      observacoes:    params.observacoes ?? null,
      timer_segundos: params.timerSegundos ?? null,
      status:         "concluido",
    })
    .select()
    .single();

  if (error) { console.error("salvarSessao:", error); return null; }
  return data;
}

// ─── Salvar checkin ───────────────────────────────────────
export async function salvarCheckin(params: {
  criancaId: string;
  responsavelId: string;
  respostas: Record<string, unknown>;
  scores: {
    comunicacao?: number; social?: number; atencao?: number;
    regulacao?: number; brincadeira?: number; flexibilidade?: number;
    autonomia?: number; motivacao?: number;
  };
  observacao?: string;
  semana?: number;
}) {
  const { data, error } = await supabase
    .from("checkins")
    .insert({
      crianca_id:          params.criancaId,
      responsavel_id:      params.responsavelId,
      respostas:           params.respostas,
      score_comunicacao:   params.scores.comunicacao   ?? null,
      score_social:        params.scores.social        ?? null,
      score_atencao:       params.scores.atencao       ?? null,
      score_regulacao:     params.scores.regulacao     ?? null,
      score_brincadeira:   params.scores.brincadeira   ?? null,
      score_flexibilidade: params.scores.flexibilidade ?? null,
      score_autonomia:     params.scores.autonomia     ?? null,
      score_motivacao:     params.scores.motivacao     ?? null,
      observacao:          params.observacao ?? null,
      semana:              params.semana ?? null,
    })
    .select()
    .single();

  if (error) { console.error("salvarCheckin:", error); return null; }
  return data;
}

// ─── Perfil completo para o dashboard ────────────────────
export async function getDashboardData(responsavelId: string) {
  const criancas = await getCriancasByResponsavel(responsavelId);
  if (criancas.length === 0) return null;

  const crianca = criancas[0]; // primeira criança (por ora)

  const [radar, sessoes, checkins] = await Promise.all([
    getUltimoRadar(crianca.id),
    getSessoesRecentes(crianca.id, 7),
    getCheckins(crianca.id, 3),
  ]);

  return { crianca, radar, sessoes, checkins };
}
