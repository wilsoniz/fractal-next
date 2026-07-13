"use client";

import { useEffect, useMemo, useState } from "react";
import { createCustomExerciseVariation, listExerciseFamilies, listExerciseFavorites, listExerciseLibrary, setExerciseFavorite } from "@/lib/fit/fit-exercises";
import type { FitExerciseFamily, FitExerciseVariation, FitExerciseVariationInput } from "@/lib/fit/types";
import { fitFieldStyle } from "./FitSection";
import { FitExerciseVariationForm } from "./FitExerciseVariationForm";

type View = "mine" | "favorites" | "all";

export function FitExercisePicker({ onSelect, onManual }: { onSelect: (item: FitExerciseVariation) => void; onManual: () => void }) {
  const [families, setFamilies] = useState<FitExerciseFamily[]>([]);
  const [items, setItems] = useState<FitExerciseVariation[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [view, setView] = useState<View>("mine");
  const [query, setQuery] = useState("");
  const [family, setFamily] = useState("");
  const [muscle, setMuscle] = useState("");
  const [equipment, setEquipment] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const [fs, vs, favs] = await Promise.all([listExerciseFamilies(), listExerciseLibrary(), listExerciseFavorites()]);
    setFamilies(fs); setItems(vs); setFavorites(new Set(favs.map((f) => f.exercise_library_id)));
  }
  useEffect(() => { void load(); }, []);

  const muscles = useMemo(() => Array.from(new Set(items.map((i) => i.primary_muscle_group ?? i.family?.primary_muscle_group).filter(Boolean) as string[])).sort(), [items]);
  const equipments = useMemo(() => Array.from(new Set(items.map((i) => i.equipment_type).filter(Boolean) as string[])).sort(), [items]);
  const visible = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("pt-BR");
    return items.filter((item) => {
      if (view === "favorites" && !favorites.has(item.id)) return false;
      if (view === "mine" && item.is_system && !favorites.has(item.id)) return false;
      if (family && item.family_id !== family) return false;
      if (muscle && (item.primary_muscle_group ?? item.family?.primary_muscle_group) !== muscle) return false;
      if (equipment && item.equipment_type !== equipment) return false;
      if (q && !`${item.display_name} ${item.name} ${item.family?.name ?? ""} ${item.equipment_type ?? ""}`.toLocaleLowerCase("pt-BR").includes(q)) return false;
      return true;
    }).sort((a, b) => Number(favorites.has(b.id)) - Number(favorites.has(a.id)) || a.display_name.localeCompare(b.display_name, "pt-BR"));
  }, [items, favorites, view, family, muscle, equipment, query]);

  async function toggleFavorite(item: FitExerciseVariation) {
    const active = !favorites.has(item.id);
    if (await setExerciseFavorite(item.id, active)) {
      setFavorites((old) => { const next = new Set(old); active ? next.add(item.id) : next.delete(item.id); return next; });
    }
  }
  async function create(input: FitExerciseVariationInput) {
    setError(null);
    const result = await createCustomExerciseVariation(input);
    if (!result.data) { setError(result.error ?? "Não foi possível criar a variação."); return; }
    onSelect(result.data);
  }

  if (creating) return <FitExerciseVariationForm families={families} onSave={create} onCancel={() => setCreating(false)} />;

  return (
    <div>
      {error && <div style={{ color: "#f08070", marginBottom: 10 }}>{error}</div>}
      <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
        {(["mine", "favorites", "all"] as View[]).map((v) => <button key={v} onClick={() => setView(v)} style={{ padding: "7px 10px", borderRadius: 8, border: "1px solid rgba(124,92,252,.4)", background: view === v ? "rgba(124,92,252,.18)" : "transparent", color: view === v ? "#b7a6ff" : "#9fb2cf" }}>{v === "mine" ? "Meus exercícios" : v === "favorites" ? "Favoritos" : "Biblioteca"}</button>)}
      </div>
      <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Pesquisar exercício" style={{ ...fitFieldStyle, marginBottom: 8 }} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 10 }}>
        <select value={muscle} onChange={(e) => setMuscle(e.target.value)} style={fitFieldStyle}><option value="">Grupos musculares</option>{muscles.map((m) => <option key={m}>{m}</option>)}</select>
        <select value={family} onChange={(e) => setFamily(e.target.value)} style={fitFieldStyle}><option value="">Famílias / movimentos</option>{families.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}</select>
        <select value={equipment} onChange={(e) => setEquipment(e.target.value)} style={fitFieldStyle}><option value="">Equipamento</option>{equipments.map((e) => <option key={e}>{e}</option>)}</select>
      </div>
      <div style={{ maxHeight: 360, overflow: "auto", display: "flex", flexDirection: "column", gap: 7 }}>
        {visible.map((item) => <div key={item.id} style={{ display: "flex", gap: 8, alignItems: "center", padding: 10, border: "1px solid rgba(90,110,160,.24)", borderRadius: 9, background: "rgba(15,22,40,.5)" }}>
          <button onClick={() => onSelect(item)} style={{ flex: 1, textAlign: "left", border: 0, background: "transparent", color: "#f2f6ff", cursor: "pointer" }}><div style={{ fontWeight: 700 }}>{item.display_name}</div><div style={{ color: "#8ea3c0", fontSize: ".72rem" }}>{[item.family?.name, item.equipment_type, item.laterality].filter(Boolean).join(" · ")}</div></button>
          <button onClick={() => toggleFavorite(item)} aria-label="Favoritar" style={{ border: 0, background: "transparent", color: favorites.has(item.id) ? "#efb04a" : "#8ea3c0", fontSize: "1.1rem", cursor: "pointer" }}>{favorites.has(item.id) ? "★" : "☆"}</button>
        </div>)}
        {visible.length === 0 && <div style={{ textAlign: "center", color: "#8ea3c0", padding: 20 }}>Nenhum exercício encontrado.</div>}
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <button onClick={() => setCreating(true)} style={{ flex: 1, padding: 9, borderRadius: 9, border: "1px solid rgba(124,92,252,.4)", background: "rgba(124,92,252,.12)", color: "#b7a6ff" }}>Criar variação</button>
        <button onClick={onManual} style={{ flex: 1, padding: 9, borderRadius: 9, border: "1px solid rgba(90,110,160,.4)", background: "transparent", color: "#c5d2e6" }}>Usar exercício manual</button>
      </div>
    </div>
  );
}
