"use client";

// Item 2 do MVP — Dashboard do profissional.
// KPIs reais de fit_patients + espaço reservado para as próximas fases
// (aderência, evolução, check-ins, mensagens) já seguindo a filosofia do produto.

import { useEffect, useState } from "react";
import Link from "next/link";
import { listPatients } from "@/lib/fit/fit-patients";
import { countPendingInvites } from "@/lib/fit/fit-invites";
import { FitCard, FitKpi } from "@/components/fit/FitCard";
import { FitPatientCard } from "@/components/fit/FitPatientCard";
import type { FitPatient } from "@/lib/fit/types";

export default function ProfessionalDashboard() {
  const [patients, setPatients] = useState<FitPatient[]>([]);
  const [pendingInvites, setPendingInvites] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listPatients().then((rows) => {
      setPatients(rows);
      setLoading(false);
    });
    countPendingInvites().then(setPendingInvites);
  }, []);

  const total = patients.length;
  const ativos = patients.filter((p) => p.status === "active").length;
  const recentes = patients.slice(0, 5);

  return (
    <div style={{ maxWidth: 1000 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22, gap: 16, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 800, color: "#f2f6ff" }}>Dashboard</h1>
          <p style={{ margin: "4px 0 0", fontSize: ".85rem", color: "#8ea3c0" }}>Acompanhe seus pacientes e a evolução da consultoria.</p>
        </div>
        <Link
          href="/consultoria/professional/patients"
          style={{
            padding: "10px 16px",
            borderRadius: 10,
            background: "linear-gradient(135deg,#7c5cfc,#5b8def)",
            color: "#0b1120",
            fontWeight: 800,
            fontSize: ".85rem",
            textDecoration: "none",
          }}
        >
          + Novo Paciente
        </Link>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginBottom: 22 }}>
        <FitKpi label="Total de pacientes" value={loading ? "—" : total} />
        <FitKpi label="Pacientes ativos" value={loading ? "—" : ativos} accent="#22c5a4" hint={loading ? undefined : `${ativos} em acompanhamento`} />
        <FitKpi label="Próximas avaliações" value="—" hint="Em breve" />
        <FitKpi label="Convites pendentes" value={pendingInvites ?? "—"} accent="#efb04a" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.4fr) minmax(0, 1fr)", gap: 18, alignItems: "start" }}>
        {/* Últimos cadastrados */}
        <FitCard>
          <div style={{ fontSize: ".95rem", fontWeight: 700, color: "#f2f6ff", marginBottom: 12 }}>Últimos pacientes cadastrados</div>
          {loading ? (
            <div style={{ color: "#8ea3c0", fontSize: ".85rem" }}>Carregando…</div>
          ) : recentes.length === 0 ? (
            <div style={{ color: "#8ea3c0", fontSize: ".85rem", padding: "8px 0" }}>
              Nenhum paciente ainda. Comece cadastrando o primeiro.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {recentes.map((p) => (
                <FitPatientCard key={p.id} patient={p} />
              ))}
            </div>
          )}
        </FitCard>

        {/* Espaço reservado — filosofia de acompanhamento */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {[
            { t: "Aderência", d: "Acompanhamento de constância dos treinos" },
            { t: "Evolução", d: "Tendências de carga, medidas e desempenho" },
            { t: "Check-ins", d: "Retornos semanais dos pacientes" },
            { t: "Mensagens", d: "Comunicação com o paciente" },
          ].map((s) => (
            <FitCard key={s.t} padding={16}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ fontSize: ".9rem", fontWeight: 700, color: "#e6edf6" }}>{s.t}</div>
                <span style={{ fontSize: ".68rem", color: "#7c9cfc", background: "rgba(124,156,252,.12)", border: "1px solid rgba(124,156,252,.3)", borderRadius: 999, padding: "2px 9px" }}>
                  Em breve
                </span>
              </div>
              <div style={{ fontSize: ".78rem", color: "#8ea3c0", marginTop: 5 }}>{s.d}</div>
            </FitCard>
          ))}
        </div>
      </div>
    </div>
  );
}
