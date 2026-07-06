"use client";

// Workspace do paciente — centro da jornada (Consultoria).
// Abas: Resumo e Cadastro funcionais; demais preparadas ("Em desenvolvimento").
// As próximas fases penduram Questionário/Avaliações/Treinos/Evolução/Arquivos aqui.

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { getPatient, updatePatient, archivePatient, reactivatePatient } from "@/lib/fit/fit-patients";
import { FitCard } from "@/components/fit/FitCard";
import { FitTabs, type FitTabDef } from "@/components/fit/FitTabs";
import { FitStatusBadge } from "@/components/fit/FitStatusBadge";
import { FitAccessBadge } from "@/components/fit/FitAccessBadge";
import { FitInvitePanel } from "@/components/fit/FitInvitePanel";
import { FitPatientForm } from "@/components/fit/FitPatientForm";
import { FitQuestionarioPanel } from "./_components/FitQuestionarioPanel";
import { FitAvaliacoesPanel } from "./_components/FitAvaliacoesPanel";
import { FitTreinosPanel } from "./_components/FitTreinosPanel";
import { FitEvolucaoPanel } from "./_components/FitEvolucaoPanel";
import { FitArquivosPanel } from "./_components/FitArquivosPanel";
import {
  MODALITY_LABELS,
  CONSULTORIA_TYPE_LABELS,
  SEX_LABELS,
  type FitPatient,
  type FitPatientInput,
  type FitPatientUiStatus,
} from "@/lib/fit/types";

const TABS: FitTabDef[] = [
  { key: "resumo", label: "Resumo" },
  { key: "cadastro", label: "Cadastro" },
  { key: "questionario", label: "Questionário" },
  { key: "avaliacoes", label: "Avaliações" },
  { key: "treinos", label: "Treinos" },
  { key: "evolucao", label: "Evolução" },
  { key: "arquivos", label: "Arquivos" },
];

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", gap: 12, padding: "8px 0", borderBottom: "1px solid rgba(90,110,160,.16)" }}>
      <div style={{ width: 170, flexShrink: 0, fontSize: ".78rem", color: "#8ea3c0" }}>{label}</div>
      <div style={{ fontSize: ".85rem", color: "#e6edf6" }}>{value || "—"}</div>
    </div>
  );
}

export default function PatientWorkspace() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const [patient, setPatient] = useState<FitPatient | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("resumo");
  const [savedMsg, setSavedMsg] = useState(false);

  async function load() {
    if (!id) return;
    const p = await getPatient(id);
    setPatient(p);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleUpdate(input: FitPatientInput) {
    if (!id) return;
    const updated = await updatePatient(id, input);
    if (!updated) throw new Error("update failed");
    setPatient(updated);
    setSavedMsg(true);
    setTimeout(() => setSavedMsg(false), 2500);
  }

  async function handleArchive() {
    if (!id || !patient) return;
    const ok = await archivePatient(id);
    if (ok) await load();
  }

  async function handleReactivate() {
    if (!id || !patient) return;
    const ok = await reactivatePatient(id);
    if (ok) await load();
  }

  if (loading) {
    return <div style={{ color: "#8ea3c0" }}>Carregando…</div>;
  }
  if (!patient) {
    return (
      <div>
        <div style={{ color: "#8ea3c0", marginBottom: 12 }}>Paciente não encontrado.</div>
        <Link href="/consultoria/professional/patients" style={{ color: "#b7a6ff" }}>← Voltar</Link>
      </div>
    );
  }

  const uiStatus = patient.status as FitPatientUiStatus;

  return (
    <div style={{ maxWidth: 860 }}>
      <Link href="/consultoria/professional/patients" style={{ color: "#8ea3c0", fontSize: ".8rem", textDecoration: "none" }}>
        ← Pacientes
      </Link>

      <div style={{ display: "flex", alignItems: "center", gap: 14, margin: "12px 0 20px" }}>
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: "50%",
            background: "linear-gradient(135deg,#7c5cfc,#5b8def)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 17,
            fontWeight: 800,
            color: "#fff",
            flexShrink: 0,
          }}
        >
          {patient.full_name.split(" ").filter(Boolean).slice(0, 2).map((n) => n[0]).join("").toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ margin: 0, fontSize: "1.4rem", fontWeight: 800, color: "#f2f6ff" }}>{patient.full_name}</h1>
          <div style={{ marginTop: 6, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <FitStatusBadge status={uiStatus} />
            {patient.status !== "archived" && <FitAccessBadge hasAccess={!!patient.user_id} />}
          </div>
        </div>
        <Link
          href={`/consultoria/professional/patients/${patient.id}/preview`}
          style={{ flexShrink: 0, padding: "8px 14px", borderRadius: 9, border: "1px solid rgba(124,92,252,.5)", background: "rgba(124,92,252,.14)", color: "#b7a6ff", fontWeight: 700, fontSize: ".8rem", textDecoration: "none", whiteSpace: "nowrap" }}
        >
          Ver como paciente
        </Link>
      </div>

      <FitTabs tabs={TABS} active={tab} onChange={setTab} />

      <div style={{ marginTop: 20 }}>
        {tab === "resumo" && (
          <FitCard>
            <Row label="Objetivo principal" value={patient.goal ?? ""} />
            <Row label="Modalidade" value={patient.modality ? MODALITY_LABELS[patient.modality] : ""} />
            <Row label="Tipo de consultoria" value={patient.consultoria_type ? CONSULTORIA_TYPE_LABELS[patient.consultoria_type] : ""} />
            <Row label="Academia / local" value={patient.training_location ?? ""} />
            <Row label="Sexo" value={patient.sex ? SEX_LABELS[patient.sex] : ""} />
            <Row label="Data de nascimento" value={patient.birth_date ?? ""} />
            <Row label="Telefone" value={patient.phone ?? ""} />
            <Row label="Email" value={patient.email ?? ""} />
            <Row label="Observações" value={patient.notes ?? ""} />
          </FitCard>
        )}

        {tab === "cadastro" && (
          <FitCard>
            {savedMsg && (
              <div style={{ padding: "8px 12px", marginBottom: 14, background: "rgba(34,197,164,.12)", border: "1px solid rgba(34,197,164,.3)", borderRadius: 8, fontSize: ".8rem", color: "#3fd6ad" }}>
                Dados salvos.
              </div>
            )}
            <FitPatientForm initial={patient} submitLabel="Salvar alterações" onSubmit={handleUpdate} />

            {patient.status !== "archived" ? (
              <button
                onClick={handleArchive}
                style={{
                  marginTop: 16,
                  padding: "9px 14px",
                  borderRadius: 9,
                  border: "1px solid rgba(224,90,75,.3)",
                  background: "transparent",
                  color: "#f0857a",
                  cursor: "pointer",
                  fontFamily: "var(--font-sans)",
                  fontSize: ".82rem",
                  fontWeight: 600,
                }}
              >
                Arquivar paciente
              </button>
            ) : (
              <button
                onClick={handleReactivate}
                style={{
                  marginTop: 16,
                  padding: "9px 14px",
                  borderRadius: 9,
                  border: "1px solid rgba(34,197,164,.4)",
                  background: "rgba(34,197,164,.1)",
                  color: "#3fd6ad",
                  cursor: "pointer",
                  fontFamily: "var(--font-sans)",
                  fontSize: ".82rem",
                  fontWeight: 600,
                }}
              >
                Desarquivar paciente
              </button>
            )}
          </FitCard>
        )}

        {tab === "cadastro" && (
          <div style={{ marginTop: 16 }}>
            <FitInvitePanel patientId={patient.id} patientEmail={patient.email} hasAccess={!!patient.user_id} />
          </div>
        )}

        {tab === "questionario" && <FitQuestionarioPanel patientId={patient.id} />}

        {tab === "avaliacoes" && <FitAvaliacoesPanel patientId={patient.id} />}

        {tab === "treinos" && <FitTreinosPanel patientId={patient.id} />}

        {tab === "evolucao" && <FitEvolucaoPanel patientId={patient.id} />}

        {tab === "arquivos" && <FitArquivosPanel patientId={patient.id} />}

      </div>
    </div>
  );
}
