"use client";

import { useState } from "react";
import type { FitExerciseFamily, FitExerciseVariationInput } from "@/lib/fit/types";
import { fitFieldStyle, fitLabelStyle } from "./FitSection";

const nn = (value: string): string | null => value.trim() || null;
const list = (value: string): string[] => value.split(",").map((v) => v.trim()).filter(Boolean);

export function FitExerciseVariationForm({
  families,
  onSave,
  onCancel,
}: {
  families: FitExerciseFamily[];
  onSave: (input: FitExerciseVariationInput) => Promise<void>;
  onCancel: () => void;
}) {
  const [familyId, setFamilyId] = useState(families[0]?.id ?? "");
  const [name, setName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [implementation, setImplementation] = useState("");
  const [primaryMuscle, setPrimaryMuscle] = useState("");
  const [secondaryMuscles, setSecondaryMuscles] = useState("");
  const [movement, setMovement] = useState("");
  const [equipment, setEquipment] = useState("");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [laterality, setLaterality] = useState("");
  const [grip, setGrip] = useState("");
  const [position, setPosition] = useState("");
  const [angle, setAngle] = useState("");
  const [execution, setExecution] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [skill, setSkill] = useState("");
  const [fatigue, setFatigue] = useState("");
  const [jointStress, setJointStress] = useState("");
  const [goal, setGoal] = useState("");
  const [instructions, setInstructions] = useState("");
  const [errors, setErrors] = useState("");
  const [cues, setCues] = useState("");
  const [contraindications, setContraindications] = useState("");
  const [substitutions, setSubstitutions] = useState("");
  const [image, setImage] = useState("");
  const [video, setVideo] = useState("");
  const [tags, setTags] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!familyId || !name.trim() || !displayName.trim()) return;
    setSaving(true);
    try {
      await onSave({
        family_id: familyId,
        name: name.trim(),
        display_name: displayName.trim(),
        implementation: nn(implementation),
        primary_muscle_group: nn(primaryMuscle),
        secondary_muscle_groups: list(secondaryMuscles),
        movement_pattern: nn(movement),
        equipment_type: nn(equipment),
        equipment_brand: nn(brand),
        equipment_model: nn(model),
        laterality: nn(laterality),
        grip: nn(grip),
        body_position: nn(position),
        bench_angle: angle.trim() ? Number(angle.replace(",", ".")) : null,
        execution_mode: nn(execution),
        difficulty: nn(difficulty),
        skill_requirement: nn(skill),
        fatigue_score: fatigue.trim() ? Number(fatigue.replace(",", ".")) : null,
        joint_stress: nn(jointStress),
        exercise_goal: nn(goal),
        instructions: nn(instructions),
        common_errors: nn(errors),
        coaching_cues: nn(cues),
        contraindications: nn(contraindications),
        substitutions: list(substitutions),
        image_url: nn(image),
        video_url: nn(video),
        tags: list(tags),
        data: {},
      });
    } finally {
      setSaving(false);
    }
  }

  const field = (label: string, value: string, setValue: (v: string) => void, placeholder = "") => (
    <div><label style={fitLabelStyle}>{label}</label><input value={value} onChange={(e) => setValue(e.target.value)} placeholder={placeholder} style={fitFieldStyle} /></div>
  );

  return (
    <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div><label style={fitLabelStyle}>Família *</label><select value={familyId} onChange={(e) => setFamilyId(e.target.value)} style={fitFieldStyle}>{families.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}</select></div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {field("Nome curto *", name, setName, "Ex.: Máquina articulada")}
        {field("Nome exibido *", displayName, setDisplayName, "Ex.: Supino inclinado articulado")}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 10 }}>
        {field("Implementação", implementation, setImplementation)}
        {field("Equipamento", equipment, setEquipment)}
        {field("Marca", brand, setBrand)}
        {field("Modelo", model, setModel)}
        {field("Lateralidade", laterality, setLaterality, "unilateral / bilateral")}
        {field("Pegada", grip, setGrip)}
        {field("Posição corporal", position, setPosition)}
        {field("Ângulo do banco", angle, setAngle, "30")}
        {field("Modo de execução", execution, setExecution)}
      </div>
      <details>
        <summary style={{ cursor: "pointer", color: "#b7a6ff", fontSize: ".82rem", fontWeight: 700 }}>Detalhes técnicos opcionais</summary>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 10, marginTop: 10 }}>
          {field("Grupo muscular principal", primaryMuscle, setPrimaryMuscle)}
          {field("Grupos secundários", secondaryMuscles, setSecondaryMuscles, "separados por vírgula")}
          {field("Padrão de movimento", movement, setMovement)}
          {field("Dificuldade", difficulty, setDifficulty)}
          {field("Requisito técnico", skill, setSkill)}
          {field("Fadiga", fatigue, setFatigue)}
          {field("Estresse articular", jointStress, setJointStress)}
          {field("Objetivo", goal, setGoal)}
          {field("Substituições", substitutions, setSubstitutions, "separadas por vírgula")}
          {field("Tags", tags, setTags, "separadas por vírgula")}
          {field("Imagem", image, setImage, "https://")}
          {field("Vídeo", video, setVideo, "https://")}
        </div>
        <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
          {[["Instruções", instructions, setInstructions], ["Erros comuns", errors, setErrors], ["Pistas de coaching", cues, setCues], ["Contraindicações", contraindications, setContraindications]].map(([label, value, setter]) => (
            <div key={label as string}><label style={fitLabelStyle}>{label as string}</label><textarea value={value as string} onChange={(e) => (setter as (v: string) => void)(e.target.value)} rows={2} style={{ ...fitFieldStyle, resize: "vertical" }} /></div>
          ))}
        </div>
      </details>
      <div style={{ display: "flex", gap: 8 }}>
        <button type="button" onClick={onCancel} style={{ flex: 1, padding: 10, borderRadius: 9, border: "1px solid rgba(90,110,160,.4)", background: "transparent", color: "#c5d2e6" }}>Voltar</button>
        <button type="submit" disabled={saving} style={{ flex: 2, padding: 10, borderRadius: 9, border: "none", background: "linear-gradient(135deg,#7c5cfc,#5b8def)", color: "#0b1120", fontWeight: 800 }}>{saving ? "Salvando..." : "Criar variação"}</button>
      </div>
    </form>
  );
}
