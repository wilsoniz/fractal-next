// I/O do domínio de treino (fit_workout_plans / _days / _exercises).
// Dias e exercícios usam soft-delete (status='archived'); sem DELETE físico.

import { supabase, getFitUser } from "./supabase-fit";
import type {
  FitWorkoutPlan,
  FitWorkoutPlanFull,
  FitWorkoutPlanStatus,
  FitWorkoutDay,
  FitWorkoutExercise,
  FitWorkoutExerciseInput,
  FitExerciseBlock,
  FitExerciseBlockInput,
  FitExerciseGroup,
  FitExerciseGroupInput,
  FitExerciseWithBlocks,
  FitGroupWithExercises,
} from "./types";

// Item ordenado de um dia: exercício standalone OU grupo.
export type FitDayItem =
  | { kind: "exercise"; order: number; exercise: FitExerciseWithBlocks }
  | { kind: "group"; order: number; group: FitGroupWithExercises };

export function orderedDayItems(day: { exercises: FitExerciseWithBlocks[]; groups: FitGroupWithExercises[] }): FitDayItem[] {
  const items: FitDayItem[] = [
    ...day.exercises.map((e) => ({ kind: "exercise" as const, order: e.order_index, exercise: e })),
    ...day.groups.map((g) => ({ kind: "group" as const, order: g.order_index, group: g })),
  ];
  return items.sort((a, b) => a.order - b.order);
}

// ── Planos ──────────────────────────────────────────────────
export async function listPlans(patientId: string): Promise<FitWorkoutPlan[]> {
  const { data } = await supabase
    .from("fit_workout_plans")
    .select("*")
    .eq("patient_id", patientId)
    .neq("status", "archived")
    .order("created_at", { ascending: false });
  return (data as FitWorkoutPlan[] | null) ?? [];
}

// Plano + dias + exercícios (todos ativos), aninhados e ordenados.
export async function getPlanFull(planId: string): Promise<FitWorkoutPlanFull | null> {
  const { data: plan } = await supabase.from("fit_workout_plans").select("*").eq("id", planId).maybeSingle();
  if (!plan) return null;

  const { data: days } = await supabase
    .from("fit_workout_days")
    .select("*")
    .eq("plan_id", planId)
    .eq("status", "active")
    .order("order_index", { ascending: true });

  const { data: exercises } = await supabase
    .from("fit_workout_exercises")
    .select("*")
    .eq("plan_id", planId)
    .eq("status", "active")
    .order("order_index", { ascending: true });

  const { data: blocks } = await supabase
    .from("fit_exercise_blocks")
    .select("*")
    .eq("plan_id", planId)
    .eq("status", "active")
    .order("order_index", { ascending: true });

  const { data: groups } = await supabase
    .from("fit_exercise_groups")
    .select("*")
    .eq("plan_id", planId)
    .eq("status", "active")
    .order("order_index", { ascending: true });

  const exList = (exercises as FitWorkoutExercise[] | null) ?? [];
  const dayList = (days as FitWorkoutDay[] | null) ?? [];
  const blockList = (blocks as FitExerciseBlock[] | null) ?? [];
  const groupList = (groups as FitExerciseGroup[] | null) ?? [];

  const withBlocks = (e: FitWorkoutExercise): FitExerciseWithBlocks => ({
    ...e,
    blocks: blockList.filter((b) => b.exercise_id === e.id),
  });

  return {
    ...(plan as FitWorkoutPlan),
    days: dayList.map((d) => {
      const dayEx = exList.filter((e) => e.day_id === d.id).map(withBlocks);
      const standalone = dayEx.filter((e) => !e.group_id).sort((a, b) => a.order_index - b.order_index);
      const dayGroups: FitGroupWithExercises[] = groupList
        .filter((g) => g.day_id === d.id)
        .map((g) => ({
          ...g,
          exercises: dayEx.filter((e) => e.group_id === g.id).sort((a, b) => a.group_order - b.group_order),
        }));
      return { ...d, exercises: standalone, groups: dayGroups };
    }),
  };
}

// ── Grupos ──────────────────────────────────────────────────
export async function addGroup(
  planId: string,
  dayId: string,
  orderIndex: number,
  input: FitExerciseGroupInput,
): Promise<FitExerciseGroup | null> {
  const { data, error } = await supabase
    .from("fit_exercise_groups")
    .insert({ plan_id: planId, day_id: dayId, order_index: orderIndex, ...input })
    .select()
    .single();
  if (error) return null;
  return data as FitExerciseGroup;
}

export async function updateGroup(id: string, patch: Partial<FitExerciseGroupInput>): Promise<boolean> {
  const { error } = await supabase.from("fit_exercise_groups").update(patch).eq("id", id);
  return !error;
}

// Arquiva o grupo e desagrupa seus exercícios (viram standalone).
export async function archiveGroup(group: FitExerciseGroup): Promise<boolean> {
  await supabase.from("fit_workout_exercises").update({ group_id: null, order_index: group.order_index }).eq("group_id", group.id);
  const { error } = await supabase.from("fit_exercise_groups").update({ status: "archived" }).eq("id", group.id);
  return !error;
}

// Move um exercício para fora do grupo (standalone), dando-lhe uma ordem no dia.
export async function ungroupExercise(exerciseId: string, dayOrder: number): Promise<boolean> {
  const { error } = await supabase
    .from("fit_workout_exercises")
    .update({ group_id: null, order_index: dayOrder })
    .eq("id", exerciseId);
  return !error;
}

// ── Blocos de execução ──────────────────────────────────────
export async function listBlocks(exerciseId: string): Promise<FitExerciseBlock[]> {
  const { data } = await supabase
    .from("fit_exercise_blocks")
    .select("*")
    .eq("exercise_id", exerciseId)
    .eq("status", "active")
    .order("order_index", { ascending: true });
  return (data as FitExerciseBlock[] | null) ?? [];
}

export async function addBlock(params: {
  exerciseId: string;
  planId: string;
  dayId: string;
  orderIndex: number;
  input: FitExerciseBlockInput;
}): Promise<FitExerciseBlock | null> {
  const { data, error } = await supabase
    .from("fit_exercise_blocks")
    .insert({
      exercise_id: params.exerciseId,
      plan_id: params.planId,
      day_id: params.dayId,
      order_index: params.orderIndex,
      ...params.input,
    })
    .select()
    .single();
  if (error) return null;
  return data as FitExerciseBlock;
}

export async function updateBlock(
  id: string,
  patch: Partial<FitExerciseBlockInput & { order_index: number }>,
): Promise<boolean> {
  const { error } = await supabase.from("fit_exercise_blocks").update(patch).eq("id", id);
  return !error;
}

export async function archiveBlock(id: string): Promise<boolean> {
  const { error } = await supabase.from("fit_exercise_blocks").update({ status: "archived" }).eq("id", id);
  return !error;
}

// Planos ATIVOS do paciente (o que o paciente enxerga na área dele).
export async function listActivePlans(patientId: string): Promise<FitWorkoutPlan[]> {
  const { data } = await supabase
    .from("fit_workout_plans")
    .select("*")
    .eq("patient_id", patientId)
    .eq("status", "active")
    .order("created_at", { ascending: false });
  return (data as FitWorkoutPlan[] | null) ?? [];
}

export async function createPlan(patientId: string, title: string): Promise<FitWorkoutPlan | null> {
  const { user } = await getFitUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from("fit_workout_plans")
    .insert({ patient_id: patientId, professional_id: user.id, title })
    .select()
    .single();
  if (error) return null;
  return data as FitWorkoutPlan;
}

export async function updatePlan(
  id: string,
  patch: Partial<Pick<FitWorkoutPlan, "title" | "goal" | "start_date" | "end_date" | "frequency_per_week" | "notes" | "status" | "data">>,
): Promise<FitWorkoutPlan | null> {
  const { data, error } = await supabase.from("fit_workout_plans").update(patch).eq("id", id).select().single();
  if (error) return null;
  return data as FitWorkoutPlan;
}

export async function setPlanStatus(id: string, status: FitWorkoutPlanStatus): Promise<boolean> {
  const { error } = await supabase.from("fit_workout_plans").update({ status }).eq("id", id);
  return !error;
}

// ── Dias ────────────────────────────────────────────────────
export async function addDay(planId: string, name: string, orderIndex: number, focus: string | null): Promise<FitWorkoutDay | null> {
  const { data, error } = await supabase
    .from("fit_workout_days")
    .insert({ plan_id: planId, name, order_index: orderIndex, focus })
    .select()
    .single();
  if (error) return null;
  return data as FitWorkoutDay;
}

export async function updateDay(id: string, patch: Partial<Pick<FitWorkoutDay, "name" | "focus" | "order_index" | "notes">>): Promise<boolean> {
  const { error } = await supabase.from("fit_workout_days").update(patch).eq("id", id);
  return !error;
}

export async function archiveDay(id: string): Promise<boolean> {
  const { error } = await supabase.from("fit_workout_days").update({ status: "archived" }).eq("id", id);
  return !error;
}

// ── Exercícios ──────────────────────────────────────────────
export async function addExercise(
  planId: string,
  dayId: string,
  orderIndex: number,
  input: FitWorkoutExerciseInput,
  opts?: { groupId?: string | null; groupOrder?: number },
): Promise<{ data: FitWorkoutExercise | null; error: string | null }> {
  const { data, error } = await supabase
    .from("fit_workout_exercises")
    .insert({
      plan_id: planId,
      day_id: dayId,
      order_index: orderIndex,
      group_id: opts?.groupId ?? null,
      group_order: opts?.groupOrder ?? 0,
      ...input,
    })
    .select()
    .single();
  return { data: (data as FitWorkoutExercise | null) ?? null, error: error?.message ?? null };
}

export async function updateExercise(id: string, patch: Partial<FitWorkoutExerciseInput & { order_index: number }>): Promise<boolean> {
  const { error } = await supabase.from("fit_workout_exercises").update(patch).eq("id", id);
  return !error;
}

export async function archiveExercise(id: string): Promise<boolean> {
  const { error } = await supabase.from("fit_workout_exercises").update({ status: "archived" }).eq("id", id);
  return !error;
}
