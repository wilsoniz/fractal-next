"use client";

// "Ver como paciente" — preview read-only dos dados reais do paciente (ADR-FIT-006).
// Sob o guard do profissional; sem impersonation, sem escrita.

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { getPatient } from "@/lib/fit/fit-patients";
import { FitPhoneFrame } from "@/components/fit/FitPhoneFrame";
import { FitPreviewInicio } from "./_screens/FitPreviewInicio";
import { FitPreviewTreino } from "./_screens/FitPreviewTreino";
import { FitPreviewCheckin } from "./_screens/FitPreviewCheckin";
import { FitPreviewProgresso } from "./_screens/FitPreviewProgresso";
import type { FitPatient } from "@/lib/fit/types";

export default function PatientPreview() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const [patient, setPatient] = useState<FitPatient | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("inicio");

  useEffect(() => {
    if (!id) return;
    getPatient(id).then((p) => { setPatient(p); setLoading(false); });
  }, [id]);

  if (loading) return <div style={{ color: "#8ea3c0" }}>Carregando…</div>;
  if (!patient) {
    return (
      <div>
        <div style={{ color: "#8ea3c0", marginBottom: 12 }}>Paciente não encontrado.</div>
        <Link href="/consultoria/professional/patients" style={{ color: "#b7a6ff" }}>← Voltar</Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 860 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, gap: 12, flexWrap: "wrap" }}>
        <div>
          <Link href={`/consultoria/professional/patients/${patient.id}`} style={{ color: "#8ea3c0", fontSize: ".8rem", textDecoration: "none" }}>← Voltar ao paciente</Link>
          <h1 style={{ margin: "6px 0 0", fontSize: "1.3rem", fontWeight: 800, color: "#f2f6ff" }}>Ver como paciente</h1>
          <p style={{ margin: "2px 0 0", fontSize: ".82rem", color: "#8ea3c0" }}>Pré-visualização somente leitura de <strong style={{ color: "#c5d2e6" }}>{patient.full_name}</strong>.</p>
        </div>
      </div>

      <FitPhoneFrame patientName={patient.full_name} active={tab} onChange={setTab}>
        {tab === "inicio" && <FitPreviewInicio patient={patient} />}
        {tab === "treino" && <FitPreviewTreino patientId={patient.id} />}
        {tab === "checkin" && <FitPreviewCheckin />}
        {tab === "progresso" && <FitPreviewProgresso patientId={patient.id} />}
      </FitPhoneFrame>
    </div>
  );
}
