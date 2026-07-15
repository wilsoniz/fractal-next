"use client";

// Editor global/segmentado. Pares são persistidos em um único INSERT, uma linha por eixo.

import { useEffect, useMemo, useState } from "react";
import { metricsByCategory, findMetric, slugifyMetric, measurementLabel } from "@/lib/fit/metrics";
import { addMeasurements, updateMeasurement, deleteMeasurement, type FitMeasurementCreateInput } from "@/lib/fit/fit-measurements";
import { listExerciseLibrary } from "@/lib/fit/fit-exercises";
import { measurementContextLabel } from "@/lib/fit/fit-segmented-measurements";
import { MEASUREMENT_CLINICAL_ROLE_LABELS, MEASUREMENT_SIDE_LABELS, type FitExerciseVariation, type FitMeasurement, type FitMeasurementCategory, type FitMeasurementClinicalRole, type FitMeasurementSide } from "@/lib/fit/types";
import { fitFieldStyle, fitLabelStyle } from "./FitSection";

const CUSTOM = "__custom__";
type EntryMode = "global" | "unilateral" | "left_right" | "affected_unaffected";
const nn = (value: string) => value.trim() || null;
const num = (value: string) => { const parsed = Number(value.replace(",", ".")); return Number.isFinite(parsed) ? parsed : null; };

export function FitMeasurementEditor({ patientId, assessmentId, category, measuredAt, measurements, onChanged }: { patientId: string; assessmentId: string; category: FitMeasurementCategory; measuredAt: string; measurements: FitMeasurement[]; onChanged: () => void | Promise<void> }) {
  const catalog = metricsByCategory(category);
  const [metricKey, setMetricKey] = useState<string>(catalog[0]?.key ?? CUSTOM);
  const [customName, setCustomName] = useState(""); const [customUnit, setCustomUnit] = useState("");
  const [mode, setMode] = useState<EntryMode>("global"); const [valueA, setValueA] = useState(""); const [valueB, setValueB] = useState("");
  const [sideA, setSideA] = useState<FitMeasurementSide | "">("left"); const [sideB, setSideB] = useState<FitMeasurementSide | "">("right");
  const [roleA, setRoleA] = useState<FitMeasurementClinicalRole | "">(""); const [roleB, setRoleB] = useState<FitMeasurementClinicalRole | "">("");
  const [labelA, setLabelA] = useState(""); const [labelB, setLabelB] = useState("");
  const [bodyRegion, setBodyRegion] = useState(""); const [bodySegment, setBodySegment] = useState(""); const [joint, setJoint] = useState(""); const [site, setSite] = useState(""); const [protocol, setProtocol] = useState(""); const [method, setMethod] = useState("");
  const [exerciseId, setExerciseId] = useState(""); const [exercises, setExercises] = useState<FitExerciseVariation[]>([]);
  const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null);

  useEffect(() => { void listExerciseLibrary().then(setExercises); }, []);
  const isCustom = metricKey === CUSTOM;
  const selectedDef = isCustom ? null : findMetric(metricKey);
  const unit = isCustom ? nn(customUnit) : selectedDef?.unit ?? null;
  const exercise = exercises.find((item) => item.id === exerciseId) ?? null;
  const pairPreview = useMemo(() => {
    const a = num(valueA); const b = num(valueB); if (a == null || b == null) return null;
    const absolute = Math.abs(a - b); const denominator = Math.max(Math.abs(a), Math.abs(b));
    return { absolute, relative: denominator === 0 ? null : absolute / denominator * 100, ratio: mode === "affected_unaffected" && b !== 0 ? a / b * 100 : null };
  }, [valueA, valueB, mode]);

  function changeMode(next: EntryMode) {
    setMode(next); setValueA(""); setValueB(""); setRoleA(""); setRoleB(""); setLabelA(""); setLabelB("");
    if (next === "global") { setSideA(""); setSideB(""); }
    if (next === "unilateral") { setSideA("left"); setSideB(""); }
    if (next === "left_right") { setSideA("left"); setSideB("right"); }
    if (next === "affected_unaffected") { setSideA(""); setSideB(""); setRoleA("affected"); setRoleB("unaffected"); }
  }

  function base(value: number): Omit<FitMeasurementCreateInput, "side" | "clinical_role" | "side_label"> {
    const metric = isCustom ? slugifyMetric(customName) : metricKey;
    return { patientId, assessmentId, category, metric, label: isCustom ? customName.trim() : selectedDef?.label ?? metricKey, value, unit, measured_at: measuredAt, body_region: nn(bodyRegion), body_segment: nn(bodySegment), joint: nn(joint), measurement_site: nn(site), protocol: nn(protocol), method: nn(method), source_exercise_library_id: exercise?.id ?? null, source_exercise_name_snapshot: exercise?.display_name ?? null, context: {}, data: {} };
  }

  async function handleAdd() {
    const a = num(valueA); const b = num(valueB);
    if (a == null || (mode !== "global" && !unit) || (isCustom && !customName.trim())) { setError("Informe métrica, valor e unidade válida."); return; }
    if (mode !== "global" && (!bodyRegion.trim() || (!bodySegment.trim() && !joint.trim()))) { setError("Métrica segmentar exige região e segmento ou articulação."); return; }
    if ((mode === "left_right" || mode === "affected_unaffected") && b == null) { setError("Informe os dois valores do par."); return; }
    const rows: FitMeasurementCreateInput[] = [];
    if (mode === "global") rows.push({ ...base(a), side: null, clinical_role: null, side_label: null, body_region: null, body_segment: null, joint: null, measurement_site: null, protocol: null, method: null, source_exercise_library_id: null, source_exercise_name_snapshot: null });
    if (mode === "unilateral") rows.push({ ...base(a), side: sideA || null, clinical_role: roleA || null, side_label: nn(labelA) });
    if (mode === "left_right") { rows.push({ ...base(a), side: "left", clinical_role: roleA || null, side_label: nn(labelA) ?? "Esquerda" }); rows.push({ ...base(b as number), side: "right", clinical_role: roleB || null, side_label: nn(labelB) ?? "Direita" }); }
    if (mode === "affected_unaffected") { rows.push({ ...base(a), side: sideA || null, clinical_role: "affected", side_label: nn(labelA) ?? "Afetado" }); rows.push({ ...base(b as number), side: sideB || null, clinical_role: "unaffected", side_label: nn(labelB) ?? "Não afetado" }); }
    setBusy(true); setError(null);
    const result = await addMeasurements(rows);
    setBusy(false);
    if (result.error) { setError(result.error); return; }
    setValueA(""); setValueB(""); setCustomName(""); setCustomUnit(""); await onChanged();
  }

  async function handleUpdate(id: string, raw: string) { const value = num(raw); if (value == null) return; if (!await updateMeasurement(id, { value })) setError("Não foi possível atualizar a medição."); else await onChanged(); }
  async function handleDelete(id: string) { if (!await deleteMeasurement(id)) setError("Não foi possível remover a medição."); else await onChanged(); }
  function prepareOpposite(m: FitMeasurement) {
    setMetricKey(findMetric(m.metric) ? m.metric : CUSTOM); if (!findMetric(m.metric)) { setCustomName(m.label ?? m.metric); setCustomUnit(m.unit ?? ""); }
    setMode("unilateral"); setValueA(""); setBodyRegion(m.body_region ?? ""); setBodySegment(m.body_segment ?? ""); setJoint(m.joint ?? ""); setSite(m.measurement_site ?? ""); setProtocol(m.protocol ?? ""); setMethod(m.method ?? ""); setExerciseId(m.source_exercise_library_id ?? "");
    setSideA(m.side === "left" ? "right" : m.side === "right" ? "left" : ""); setRoleA(m.clinical_role === "affected" ? "unaffected" : m.clinical_role === "unaffected" ? "affected" : m.clinical_role === "dominant" ? "non_dominant" : m.clinical_role === "non_dominant" ? "dominant" : ""); setLabelA("");
  }

  const axis = (side: FitMeasurementSide | "", setSide: (value: FitMeasurementSide | "") => void, role: FitMeasurementClinicalRole | "", setRole: (value: FitMeasurementClinicalRole | "") => void, label: string, setLabel: (value: string) => void, title: string) => <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: 8 }}><div><label style={fitLabelStyle}>{title} — lado</label><select value={side} onChange={(e) => setSide(e.target.value as FitMeasurementSide | "")} style={fitFieldStyle}><option value="">Não informado</option>{Object.entries(MEASUREMENT_SIDE_LABELS).map(([key, text]) => <option key={key} value={key}>{text}</option>)}</select></div><div><label style={fitLabelStyle}>Papel clínico</label><select value={role} onChange={(e) => setRole(e.target.value as FitMeasurementClinicalRole | "")} style={fitFieldStyle}><option value="">Não informado</option>{Object.entries(MEASUREMENT_CLINICAL_ROLE_LABELS).map(([key, text]) => <option key={key} value={key}>{text}</option>)}</select></div><div><label style={fitLabelStyle}>Rótulo exibido</label><input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Ex.: Joelho operado" style={fitFieldStyle} /></div></div>;

  return <div>
    {error && <div style={{ color: "#f08070", fontSize: ".76rem", marginBottom: 8 }}>{error}</div>}
    {measurements.length > 0 && <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>{measurements.map((m) => <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 8 }}><div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: ".84rem", color: "#e6edf6" }}>{measurementLabel(m.metric, m.label)}{m.metric === "bmi" ? " · legado" : ""}</div>{!isGlobalRow(m) && <div style={{ fontSize: ".67rem", color: "#8ea3c0" }}>{measurementContextLabel(m)}</div>}</div>{m.metric === "bmi" ? <span style={{ color: "#8ea3c0", fontSize: ".78rem" }}>{m.value} {m.unit ?? ""}</span> : <><input defaultValue={String(m.value)} onBlur={(e) => handleUpdate(m.id, e.target.value)} style={{ ...fitFieldStyle, width: 82, textAlign: "right", padding: "6px 8px" }} /><span style={{ width: 48, fontSize: ".74rem", color: "#8ea3c0" }}>{m.unit ?? ""}</span>{(m.side || m.clinical_role) && <button onClick={() => prepareOpposite(m)} title="Duplicar para o lado oposto" style={smallButton}>⇄</button>}<button onClick={() => handleDelete(m.id)} aria-label="Remover" style={{ ...smallButton, color: "#f0857a" }}>×</button></>}</div>)}</div>}
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>{(["global","unilateral","left_right","affected_unaffected"] as EntryMode[]).map((item) => <button key={item} onClick={() => changeMode(item)} style={{ ...smallButton, padding: "6px 9px", border: "1px solid rgba(124,92,252,.35)", background: mode === item ? "rgba(124,92,252,.16)" : "transparent", color: mode === item ? "#b7a6ff" : "#8ea3c0" }}>{item === "global" ? "Global" : item === "unilateral" ? "Unilateral" : item === "left_right" ? "Esquerda / direita" : "Afetado / não afetado"}</button>)}</div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 8 }}><div><label style={fitLabelStyle}>Métrica</label><select value={metricKey} onChange={(e) => setMetricKey(e.target.value)} style={fitFieldStyle}>{catalog.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}<option value={CUSTOM}>+ Personalizada…</option></select></div>{isCustom && <><div><label style={fitLabelStyle}>Nome</label><input value={customName} onChange={(e) => setCustomName(e.target.value)} style={fitFieldStyle} /></div><div><label style={fitLabelStyle}>Unidade</label><input value={customUnit} onChange={(e) => setCustomUnit(e.target.value)} style={fitFieldStyle} /></div></>}</div>
    {mode !== "global" && <><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(125px,1fr))", gap: 8, marginTop: 8 }}>{field("Região *", bodyRegion, setBodyRegion)}{field("Segmento", bodySegment, setBodySegment)}{field("Articulação", joint, setJoint)}{field("Ponto anatômico", site, setSite)}{field("Protocolo", protocol, setProtocol)}{field("Método", method, setMethod)}</div><div style={{ marginTop: 8 }}><label style={fitLabelStyle}>Exercício/equipamento de origem (opcional)</label><select value={exerciseId} onChange={(e) => setExerciseId(e.target.value)} style={fitFieldStyle}><option value="">Sem vínculo</option>{exercises.map((item) => <option key={item.id} value={item.id}>{item.display_name}</option>)}</select></div></>}
    {mode === "unilateral" && <div style={{ marginTop: 8 }}>{axis(sideA, setSideA, roleA, setRoleA, labelA, setLabelA, "Medição")}</div>}
    {mode === "left_right" && <div style={{ marginTop: 8 }}>{axis("left", () => {}, roleA, setRoleA, labelA, setLabelA, "Esquerda")}{axis("right", () => {}, roleB, setRoleB, labelB, setLabelB, "Direita")}</div>}
    {mode === "affected_unaffected" && <div style={{ marginTop: 8 }}>{axis(sideA, setSideA, "affected", () => {}, labelA, setLabelA, "Afetado")}{axis(sideB, setSideB, "unaffected", () => {}, labelB, setLabelB, "Não afetado")}</div>}
    <div style={{ display: "grid", gridTemplateColumns: mode === "global" || mode === "unilateral" ? "1fr" : "1fr 1fr", gap: 8, marginTop: 8 }}>{field(mode === "left_right" ? "Valor esquerdo" : mode === "affected_unaffected" ? "Valor afetado" : "Valor", valueA, setValueA)}{(mode === "left_right" || mode === "affected_unaffected") && field(mode === "left_right" ? "Valor direito" : "Valor não afetado", valueB, setValueB)}</div>
    {pairPreview && <div title="Diferença absoluta = |A−B|; relativa = |A−B| / max(|A|,|B|) × 100" style={{ marginTop: 8, padding: 8, borderRadius: 8, background: "rgba(124,92,252,.08)", color: "#b7a6ff", fontSize: ".74rem" }}>Diferença: {pairPreview.absolute.toFixed(2)}{unit ? ` ${unit}` : ""} · relativa: {pairPreview.relative == null ? "indisponível (denominador zero)" : `${pairPreview.relative.toFixed(1)}%`}{pairPreview.ratio != null ? ` · índice afetado/não afetado: ${pairPreview.ratio.toFixed(1)}%` : ""} · interpretação profissional</div>}
    <button onClick={handleAdd} disabled={busy} style={{ marginTop: 9, padding: "8px 14px", borderRadius: 9, border: "1px solid rgba(124,92,252,.5)", background: "rgba(124,92,252,.14)", color: "#b7a6ff", fontWeight: 700 }}>{busy ? "Salvando..." : "Adicionar"}</button>
  </div>;
}

function isGlobalRow(m: FitMeasurement) { return !m.side && !m.clinical_role && !m.body_region && !m.body_segment && !m.joint; }
function field(label: string, value: string, setValue: (value: string) => void) { return <div><label style={fitLabelStyle}>{label}</label><input value={value} onChange={(e) => setValue(e.target.value)} style={fitFieldStyle} /></div>; }
const smallButton: React.CSSProperties = { border: 0, background: "transparent", color: "#8ea3c0", cursor: "pointer", fontSize: ".76rem" };
