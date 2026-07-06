"use client";

// Preview do Início do paciente (read-only).

import { useEffect, useState } from "react";
import { listActivePlans } from "@/lib/fit/fit-workouts";
import { listLogs } from "@/lib/fit/fit-training-logs";
import { listCheckins } from "@/lib/fit/fit-checkins";
import { FitCard, FitKpi } from "@/components/fit/FitCard";
import type { FitPatient, FitWorkoutPlan } from "@/lib/fit/types";

function daysAgo(dateStr: string): number {
  const d = new Date(dateStr + "T00:00:00");
  return Math.floor((Date.now() - d.getTime()) / 86400000);
}

export function FitPreviewInicio({ patient }: { patient: FitPatient }) {
  const [plan, setPlan] = useState<FitWorkoutPlan | null>(null);
  const [logsWeek, setLogsWeek] = useState(0);
  const [lastCheckin, setLastCheckin] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const plans = await listActivePlans(patient.id);
      setPlan(plans[0] ?? null);
      const logs = await listLogs(patient.id);
      setLogsWeek(logs.filter((l) => daysAgo(l.performed_at) < 7).length);
      const checks = await listCheckins(patient.id);
      setLastCheckin(checks[0]?.checkin_date ?? null);
      setLoading(false);
    })();
  }, [patient.id]);

  const firstName = patient.full_name.split(" ")[0];

  return (
    <div>
      <div style={{ fontSize: ".8rem", color: "#8ea3c0" }}>Olá,</div>
      <h1 style={{ margin: "2px 0 16px", fontSize: "1.4rem", fontWeight: 800, color: "#f2f6ff" }}>{firstName}</h1>

      <FitCard style={{ marginBottom: 12 }}>
        <div style={{ fontSize: ".72rem", color: "#8ea3c0", textTransform: "uppercase", letterSpacing: ".06em" }}>Seu treino</div>
        {loading ? (
          <div style={{ color: "#8ea3c0", fontSize: ".85rem", marginTop: 6 }}>Carregando…</div>
        ) : plan ? (
          <>
            <div style={{ fontSize: "1.05rem", fontWeight: 700, color: "#f2f6ff", marginTop: 6 }}>{plan.title}</div>
            {plan.goal && <div style={{ fontSize: ".8rem", color: "#8ea3c0", marginTop: 2 }}>{plan.goal}</div>}
            <div style={{ marginTop: 12, padding: "10px 14px", borderRadius: 10, background: "rgba(90,110,160,.12)", color: "#8ea3c0", fontSize: ".8rem", textAlign: "center" }}>
              Preview — “Registrar treino” desativado
            </div>
          </>
        ) : (
          <div style={{ color: "#8ea3c0", fontSize: ".85rem", marginTop: 6 }}>Nenhum treino ativo.</div>
        )}
      </FitCard>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <FitKpi label="Treinos (7 dias)" value={loading ? "—" : logsWeek} />
        <FitKpi label="Último check-in" value={loading ? "—" : lastCheckin ? `${daysAgo(lastCheckin)}d` : "Nunca"} />
      </div>
    </div>
  );
}
