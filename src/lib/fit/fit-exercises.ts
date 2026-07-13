// I/O da Biblioteca de Exercícios da Consultoria. Pacientes não acessam estas tabelas.

import { getFitUser, supabase } from "./supabase-fit";
import type {
  FitExerciseFamily,
  FitExerciseFavorite,
  FitExerciseVariation,
  FitExerciseVariationInput,
} from "./types";

export async function listExerciseFamilies(): Promise<FitExerciseFamily[]> {
  const { data } = await supabase
    .from("fit_exercise_families")
    .select("*")
    .eq("status", "active")
    .order("name");
  return (data as FitExerciseFamily[] | null) ?? [];
}

export async function listExerciseLibrary(): Promise<FitExerciseVariation[]> {
  const { data } = await supabase
    .from("fit_exercise_variations")
    .select("*, family:fit_exercise_families(*)")
    .eq("status", "active")
    .order("display_name")
    .limit(500);
  return (data as FitExerciseVariation[] | null) ?? [];
}

export async function listExerciseFavorites(): Promise<FitExerciseFavorite[]> {
  const { data } = await supabase
    .from("fit_exercise_favorites")
    .select("*")
    .eq("status", "active")
    .order("created_at", { ascending: false });
  return (data as FitExerciseFavorite[] | null) ?? [];
}

export async function setExerciseFavorite(exerciseLibraryId: string, active: boolean): Promise<boolean> {
  const { user } = await getFitUser();
  if (!user) return false;

  const { data: existing } = await supabase
    .from("fit_exercise_favorites")
    .select("id")
    .eq("professional_id", user.id)
    .eq("exercise_library_id", exerciseLibraryId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("fit_exercise_favorites")
      .update({ status: active ? "active" : "archived" })
      .eq("id", existing.id);
    return !error;
  }

  if (!active) return true;
  const { error } = await supabase.from("fit_exercise_favorites").insert({
    professional_id: user.id,
    exercise_library_id: exerciseLibraryId,
  });
  return !error;
}

export async function createCustomExerciseVariation(
  input: FitExerciseVariationInput,
): Promise<{ data: FitExerciseVariation | null; error: string | null }> {
  const { user } = await getFitUser();
  if (!user) return { data: null, error: "Sessão não encontrada." };
  const { data, error } = await supabase
    .from("fit_exercise_variations")
    .insert({ ...input, professional_id: user.id, is_system: false })
    .select("*, family:fit_exercise_families(*)")
    .single();
  return { data: (data as FitExerciseVariation | null) ?? null, error: error?.message ?? null };
}

export async function archiveCustomExerciseVariation(id: string): Promise<boolean> {
  const { error } = await supabase
    .from("fit_exercise_variations")
    .update({ status: "archived" })
    .eq("id", id)
    .eq("is_system", false);
  return !error;
}
