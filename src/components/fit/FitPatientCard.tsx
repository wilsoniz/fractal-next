"use client";

// FitPatientCard — item de paciente na listagem (Consultoria).

import Link from "next/link";
import { FitStatusBadge } from "./FitStatusBadge";
import { MODALITY_LABELS, type FitPatient, type FitPatientUiStatus } from "@/lib/fit/types";

export function FitPatientCard({ patient }: { patient: FitPatient }) {
  const iniciais =
    patient.full_name.split(" ").filter(Boolean).slice(0, 2).map((n) => n[0]).join("").toUpperCase() || "?";
  const uiStatus = patient.status as FitPatientUiStatus;

  return (
    <Link
      href={`/consultoria/professional/patients/${patient.id}`}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "14px 16px",
        borderRadius: 12,
        textDecoration: "none",
        background: "rgba(20,28,48,.7)",
        border: "1px solid rgba(90,110,160,.22)",
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: "50%",
          background: "linear-gradient(135deg,#7c5cfc,#5b8def)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 13,
          fontWeight: 800,
          color: "#fff",
          flexShrink: 0,
        }}
      >
        {iniciais}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: ".92rem", fontWeight: 600, color: "#f2f6ff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {patient.full_name}
        </div>
        <div style={{ fontSize: ".76rem", color: "#8ea3c0", marginTop: 2 }}>
          {patient.modality ? MODALITY_LABELS[patient.modality] : "Sem modalidade"}
          {patient.goal ? ` · ${patient.goal}` : ""}
        </div>
      </div>
      <FitStatusBadge status={uiStatus} />
    </Link>
  );
}
