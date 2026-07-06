"use client";

// Item 3 do MVP — Cadastro/listagem de pacientes.

import { useEffect, useMemo, useState } from "react";
import { listPatients, createPatient } from "@/lib/fit/fit-patients";
import { FitModal } from "@/components/fit/FitModal";
import { FitPatientForm } from "@/components/fit/FitPatientForm";
import { FitPatientCard } from "@/components/fit/FitPatientCard";
import { FitCard } from "@/components/fit/FitCard";
import type { FitPatient, FitPatientInput } from "@/lib/fit/types";

export default function PatientsPage() {
  const [patients, setPatients] = useState<FitPatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);

  async function refresh() {
    const rows = await listPatients();
    setPatients(rows);
    setLoading(false);
  }

  useEffect(() => {
    refresh();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return patients
      .filter((p) => (showArchived ? true : p.status !== "archived"))
      .filter((p) => (q ? p.full_name.toLowerCase().includes(q) : true));
  }, [patients, query, showArchived]);

  const archivedCount = useMemo(() => patients.filter((p) => p.status === "archived").length, [patients]);

  async function handleCreate(input: FitPatientInput) {
    const created = await createPatient(input);
    if (!created) throw new Error("create failed");
    setModalOpen(false);
    await refresh();
  }

  return (
    <div style={{ maxWidth: 860 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, gap: 16, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 800, color: "#f2f6ff" }}>Pacientes</h1>
          <p style={{ margin: "4px 0 0", fontSize: ".85rem", color: "#8ea3c0" }}>
            {loading ? "Carregando…" : `${patients.length} paciente(s)`}
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          style={{
            padding: "10px 16px",
            borderRadius: 10,
            border: "none",
            background: "linear-gradient(135deg,#7c5cfc,#5b8def)",
            color: "#0b1120",
            fontWeight: 800,
            fontSize: ".85rem",
            cursor: "pointer",
            fontFamily: "var(--font-sans)",
          }}
        >
          + Novo Paciente
        </button>
      </div>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar por nome…"
        style={{
          width: "100%",
          maxWidth: 360,
          padding: "10px 14px",
          borderRadius: 10,
          border: "1px solid rgba(90,110,160,.4)",
          background: "rgba(15,22,40,.7)",
          color: "#e6edf6",
          fontFamily: "var(--font-sans)",
          fontSize: ".88rem",
          outline: "none",
          marginBottom: 10,
          boxSizing: "border-box",
        }}
      />

      {archivedCount > 0 && (
        <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18, fontSize: ".8rem", color: "#8ea3c0", cursor: "pointer", userSelect: "none" }}>
          <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
          Mostrar arquivados ({archivedCount})
        </label>
      )}

      {loading ? (
        <FitCard><div style={{ color: "#8ea3c0", fontSize: ".85rem" }}>Carregando…</div></FitCard>
      ) : filtered.length === 0 ? (
        <FitCard>
          <div style={{ color: "#8ea3c0", fontSize: ".88rem" }}>
            {patients.length === 0 ? "Nenhum paciente cadastrado. Clique em “Novo Paciente”." : "Nenhum paciente encontrado para a busca."}
          </div>
        </FitCard>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map((p) => (
            <FitPatientCard key={p.id} patient={p} />
          ))}
        </div>
      )}

      <FitModal open={modalOpen} onClose={() => setModalOpen(false)} title="Novo paciente">
        <FitPatientForm submitLabel="Cadastrar paciente" onSubmit={handleCreate} />
      </FitModal>
    </div>
  );
}
