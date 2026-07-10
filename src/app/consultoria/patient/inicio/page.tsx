"use client";

// Início da área do paciente — plano ativo + atalhos + resumo da semana.

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePatient } from "../_context";
import { signOutFit } from "@/lib/fit/supabase-fit";
import { listActivePlans } from "@/lib/fit/fit-workouts";
import { listLogs } from "@/lib/fit/fit-training-logs";
import { listCheckins } from "@/lib/fit/fit-checkins";
import { FitCard } from "@/components/fit/FitCard";
import type { FitWorkoutPlan } from "@/lib/fit/types";

function daysAgo(dateStr: string): number {
  const d = new Date(dateStr + "T00:00:00");
  return Math.floor((Date.now() - d.getTime()) / 86400000);
}

export default function PatientHome() {
  const patient = usePatient();
  const router = useRouter();
  const [plan, setPlan] = useState<FitWorkoutPlan | null>(null);
  const [logsWeek, setLogsWeek] = useState(0);
  const [lastCheckin, setLastCheckin] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function handleLogout() {
    await signOutFit();
    router.replace("/consultoria/login");
  }

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
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 18 }}>
        <div>
          <div style={{ fontSize: ".8rem", color: "#8ea3c0" }}>Olá,</div>
          <h1 style={{ margin: "2px 0 0", fontSize: "1.5rem", fontWeight: 800, color: "#f2f6ff" }}>{firstName}</h1>
        </div>
        <button
          onClick={handleLogout}
          style={{ flexShrink: 0, marginTop: 4, padding: "7px 14px", borderRadius: 9, border: "1px solid rgba(224,90,75,.35)", background: "transparent", color: "#f0857a", cursor: "pointer", fontFamily: "var(--font-sans)", fontSize: ".8rem", fontWeight: 600 }}
        >
          Sair
        </button>
      </div>

      <FitCard style={{ marginBottom: 14 }}>
        <div style={{ fontSize: ".72rem", color: "#8ea3c0", textTransform: "uppercase", letterSpacing: ".06em" }}>Seu treino</div>
        {loading ? (
          <div style={{ color: "#8ea3c0", fontSize: ".85rem", marginTop: 6 }}>Carregando…</div>
        ) : plan ? (
          <>
            <div style={{ fontSize: "1.05rem", fontWeight: 700, color: "#f2f6ff", marginTop: 6 }}>{plan.title}</div>
            {plan.goal && <div style={{ fontSize: ".8rem", color: "#8ea3c0", marginTop: 2 }}>{plan.goal}</div>}
            <Link href="/consultoria/patient/treino" style={{ display: "inline-block", marginTop: 12, padding: "10px 18px", borderRadius: 10, background: "linear-gradient(135deg,#7c5cfc,#5b8def)", color: "#0b1120", fontWeight: 800, fontSize: ".85rem", textDecoration: "none" }}>
              Registrar treino
            </Link>
          </>
        ) : (
          <div style={{ color: "#8ea3c0", fontSize: ".85rem", marginTop: 6 }}>Nenhum treino ativo ainda. Seu profissional publicará em breve.</div>
        )}
      </FitCard>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
        <FitCard>
          <div style={{ fontSize: ".72rem", color: "#8ea3c0" }}>Treinos (7 dias)</div>
          <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "#f2f6ff", marginTop: 4 }}>{loading ? "—" : logsWeek}</div>
        </FitCard>
        <FitCard>
          <div style={{ fontSize: ".72rem", color: "#8ea3c0" }}>Último check-in</div>
          <div style={{ fontSize: ".95rem", fontWeight: 700, color: "#f2f6ff", marginTop: 8 }}>
            {loading ? "—" : lastCheckin ? `${daysAgo(lastCheckin)}d atrás` : "Nunca"}
          </div>
        </FitCard>
      </div>

      <Link href="/consultoria/patient/checkin" style={{ display: "block", textAlign: "center", padding: "12px", borderRadius: 10, border: "1px solid rgba(124,92,252,.5)", background: "rgba(124,92,252,.14)", color: "#b7a6ff", fontWeight: 700, fontSize: ".88rem", textDecoration: "none" }}>
        Fazer check-in semanal
      </Link>
    </div>
  );
}
