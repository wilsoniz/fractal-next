import { supabase } from "@/lib/supabase";
import type { LearnerProfileData } from "@/lib/database.types";

export async function getLearnerProfile(id: string): Promise<LearnerProfileData | null> {
  const learnerRes = await supabase.from("learners").select("*").eq("id", id).single();
  if (learnerRes.error || !learnerRes.data) return null;

  const [radarRes, skillsRes, programsRes] = await Promise.all([
    supabase
      .from("radar_snapshots")
      .select("*")
      .eq("learner_id", id)
      .order("created_at", { ascending: true }),
    supabase
      .from("learner_skills")
      .select("*")
      .eq("learner_id", id)
      .order("created_at", { ascending: true }),
    supabase
      .from("learner_programs")
      .select("*")
      .eq("learner_id", id)
      .order("created_at", { ascending: true }),
  ]);

  const [alertsRes, goalsRes] = await Promise.all([
    supabase
      .from("clinical_alerts")
      .select("*")
      .eq("learner_id", id)
      .eq("is_active", true)
      .order("level", { ascending: false }),
    supabase
      .from("clinical_goals")
      .select("*")
      .eq("learner_id", id)
      .eq("is_active", true)
      .order("created_at", { ascending: true }),
  ]);

  const [sessionsRes, careRes] = await Promise.all([
    supabase
      .from("sessoes")
      .select("*")
      .eq("learner_id", id)
      .order("date", { ascending: false })
      .limit(20),
    supabase
      .from("care_activities")
      .select("*")
      .eq("learner_id", id)
      .order("created_at", { ascending: true }),
  ]);

  return {
    learner: learnerRes.data,
    radar: radarRes.data ?? [],
    skills: skillsRes.data ?? [],
    programs: programsRes.data ?? [],
    alerts: alertsRes.data ?? [],
    goals: goalsRes.data ?? [],
    sessions: sessionsRes.data ?? [],
    care: careRes.data ?? [],
  };
}
