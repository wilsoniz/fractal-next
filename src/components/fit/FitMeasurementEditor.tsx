"use client";

// FitMeasurementEditor — editor de medições de UMA categoria (bloco da avaliação).
// Permite escolher métrica do catálogo OU criar personalizada (nome/unidade).
// Adiciona, edita valor e remove (DELETE físico só desta tabela).

import { useState } from "react";
import { metricsByCategory, findMetric, slugifyMetric, measurementLabel } from "@/lib/fit/metrics";
import { addMeasurement, updateMeasurement, deleteMeasurement } from "@/lib/fit/fit-measurements";
import type { FitMeasurement, FitMeasurementCategory } from "@/lib/fit/types";
import { fitFieldStyle } from "./FitSection";

const CUSTOM = "__custom__";

export function FitMeasurementEditor({
  patientId,
  assessmentId,
  category,
  measuredAt,
  measurements,
  onChanged,
}: {
  patientId: string;
  assessmentId: string;
  category: FitMeasurementCategory;
  measuredAt: string;
  measurements: FitMeasurement[];
  onChanged: () => void | Promise<void>;
}) {
  const catalog = metricsByCategory(category);
  const [metricKey, setMetricKey] = useState<string>(catalog[0]?.key ?? CUSTOM);
  const [customName, setCustomName] = useState("");
  const [customUnit, setCustomUnit] = useState("");
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);

  const isCustom = metricKey === CUSTOM;
  const selectedDef = isCustom ? null : findMetric(metricKey);
  const unitHint = isCustom ? customUnit : selectedDef?.unit ?? "";

  async function handleAdd() {
    const num = parseFloat(value.replace(",", "."));
    if (Number.isNaN(num)) return;
    if (isCustom && customName.trim() === "") return;

    setBusy(true);
    try {
      const metric = isCustom ? slugifyMetric(customName) : metricKey;
      const label = isCustom ? customName.trim() : selectedDef?.label ?? metricKey;
      const unit = isCustom ? (customUnit.trim() || null) : selectedDef?.unit ?? null;
      await addMeasurement({ patientId, assessmentId, category, metric, label, value: num, unit, measured_at: measuredAt });
      setValue("");
      setCustomName("");
      setCustomUnit("");
      await onChanged();
    } finally {
      setBusy(false);
    }
  }

  async function handleUpdate(id: string, raw: string) {
    const num = parseFloat(raw.replace(",", "."));
    if (Number.isNaN(num)) return;
    await updateMeasurement(id, { value: num });
    await onChanged();
  }

  async function handleDelete(id: string) {
    await deleteMeasurement(id);
    await onChanged();
  }

  return (
    <div>
      {/* Linhas existentes */}
      {measurements.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
          {measurements.map((m) => (
            <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ flex: 1, fontSize: ".84rem", color: "#e6edf6" }}>
                {measurementLabel(m.metric, m.label)}
              </div>
              <input
                defaultValue={String(m.value)}
                onBlur={(e) => handleUpdate(m.id, e.target.value)}
                style={{ ...fitFieldStyle, width: 90, textAlign: "right", padding: "6px 8px" }}
              />
              <div style={{ width: 60, fontSize: ".76rem", color: "#8ea3c0" }}>{m.unit ?? ""}</div>
              <button
                onClick={() => handleDelete(m.id)}
                aria-label="Remover"
                style={{ background: "none", border: "none", color: "#f0857a", cursor: "pointer", fontSize: "1.05rem", padding: "2px 6px" }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Adicionar */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
        <select value={metricKey} onChange={(e) => setMetricKey(e.target.value)} style={{ ...fitFieldStyle, width: "auto", flex: "1 1 160px", padding: "8px 10px" }}>
          {catalog.map((m) => (
            <option key={m.key} value={m.key}>{m.label}</option>
          ))}
          <option value={CUSTOM}>+ Personalizada…</option>
        </select>

        {isCustom && (
          <>
            <input
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="Nome da métrica"
              style={{ ...fitFieldStyle, width: "auto", flex: "1 1 140px", padding: "8px 10px" }}
            />
            <input
              value={customUnit}
              onChange={(e) => setCustomUnit(e.target.value)}
              placeholder="Unidade"
              style={{ ...fitFieldStyle, width: 90, padding: "8px 10px" }}
            />
          </>
        )}

        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Valor"
          inputMode="decimal"
          style={{ ...fitFieldStyle, width: 90, padding: "8px 10px" }}
        />
        {!isCustom && unitHint && <span style={{ fontSize: ".76rem", color: "#8ea3c0" }}>{unitHint}</span>}

        <button
          onClick={handleAdd}
          disabled={busy}
          style={{
            padding: "8px 14px",
            borderRadius: 9,
            border: "1px solid rgba(124,92,252,.5)",
            background: "rgba(124,92,252,.14)",
            color: "#b7a6ff",
            fontWeight: 700,
            fontSize: ".82rem",
            cursor: busy ? "default" : "pointer",
            fontFamily: "var(--font-sans)",
          }}
        >
          Adicionar
        </button>
      </div>
    </div>
  );
}
