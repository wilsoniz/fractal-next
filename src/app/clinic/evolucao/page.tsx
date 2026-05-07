"use client";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  BarChart, Bar, Cell,
  ReferenceLine, Area, ComposedChart,
} from "recharts";
import { generateForecastFromProfile, type ForecastGoal, type ForecastResult } from "@/lib/forecast";
import { supabase } from "@/lib/supabase";
import { useClinicContext } from "../layout";

// ─── TIPOS ───────────────────────────────────────────────────────────────────
type Tab = "consolidado" | "individual";
type DominioKey = "communication" | "social" | "attention" | "regulation" | "autonomy" | "flexibility" | "play" | "motivation";
interface RadarSnapshot {
  date: string;
  realDate?: string;
  communication: number; social: number; attention: number; regulation: number;
  autonomy: number; flexibility: number; play: number; motivation: number;
}
interface PacienteData {
  id: string;
  nome: string;
  iniciais: string;
  gradient: string;
  cor: string;
  diagnostico: string;
  radar: RadarSnapshot[];
  avaliado: boolean;
  skills: { id: string; name: string; domain: string; status: "absent" | "emerging" | "acquired" }[];
  programs: { id: string; name: string; domain: string; status: "active" | "completed" | "stalled"; success: number; independence: number }[];
  alerts: { id: string; title: string; description: string; level: "low" | "medium" | "high" }[];
}

// ─── CONSTANTES ──────────────────────────────────────────────────────────────
const DOMINIOS: { key: DominioKey; label: string; cor: string }[] = [
  { key: "communication", label: "Comunicação",  cor: "#1D9E75" },
  { key: "social",        label: "Social",       cor: "#378ADD" },
  { key: "attention",     label: "Atenção",      cor: "#8B7FE8" },
  { key: "regulation",    label: "Regulação",    cor: "#EF9F27" },
  { key: "autonomy",      label: "Autonomia",    cor: "#E05A4B" },
  { key: "flexibility",   label: "Flexibilidade",cor: "#4d6d8a" },
  { key: "play",          label: "Brincadeira",  cor: "#23c48f" },
  { key: "motivation",    label: "Motivação",    cor: "#378ADD" },
];
const FORECAST_GOALS: ForecastGoal[] = [
  { id: "g1", name: "Pedir o que quer",           type: "acquisition", targetDomain: "communication" },
  { id: "g2", name: "Esperar 3 segundos",          type: "acquisition", targetDomain: "regulation"    },
  { id: "g3", name: "Troca de turnos",             type: "acquisition", targetDomain: "social"        },
  { id: "g4", name: "Seguir instrução de 1 passo", type: "acquisition", targetDomain: "attention"     },
  { id: "g5", name: "Redução de fuga",             type: "reduction",   targetDomain: "regulation"    },
  { id: "g6", name: "Brincar 5 minutos",           type: "acquisition", targetDomain: "play"          },
];
const HEALTH_CONFIG = {
  on_track:     { label: "Em curso",     cor: "#378ADD", bg: "rgba(55,138,221,.1)"  },
  watch:        { label: "Monitorar",    cor: "#EF9F27", bg: "rgba(239,159,39,.1)"  },
  stalled:      { label: "Travada",      cor: "#E05A4B", bg: "rgba(224,90,75,.1)"   },
  accelerating: { label: "Acelerando",   cor: "#1D9E75", bg: "rgba(29,158,117,.1)"  },
  consolidating:{ label: "Consolidando", cor: "#8B7FE8", bg: "rgba(139,127,232,.1)" },
};
const GRADIENTS = [
  "linear-gradient(135deg,#1D9E75,#378ADD)",
  "linear-gradient(135deg,#378ADD,#8B7FE8)",
  "linear-gradient(135deg,#8B7FE8,#E05A4B)",
  "linear-gradient(135deg,#EF9F27,#1D9E75)",
  "linear-gradient(135deg,#E05A4B,#EF9F27)",
];
const CORES = ["#1D9E75","#378ADD","#8B7FE8","#EF9F27","#E05A4B"];

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function iniciais(nome: string) {
  const p = nome.trim().split(" ");
  return p.length >= 2 ? `${p[0][0]}${p[p.length-1][0]}`.toUpperCase() : nome.slice(0,2).toUpperCase();
}
function mediaRadar(snapshots: RadarSnapshot[]): number {
  if (!snapshots.length) return 0;
  const last = snapshots[snapshots.length - 1];
  if (!last) return 0;
  const vals = [last.communication ?? 0, last.social ?? 0, last.attention ?? 0, last.regulation ?? 0, last.autonomy ?? 0, last.flexibility ?? 0, last.play ?? 0, last.motivation ?? 0];
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
}
function deltaRadar(snapshots: RadarSnapshot[]): number {
  if (snapshots.length < 2) return 0;
  const first = snapshots[0], last = snapshots[snapshots.length - 1];
  if (!first || !last) return 0;
  const keys: DominioKey[] = ["communication","social","attention","regulation","autonomy","flexibility","play","motivation"];
  const avgFirst = Math.round(keys.reduce((a, k) => a + (first[k] ?? 0), 0) / keys.length);
  const avgLast  = Math.round(keys.reduce((a, k) => a + (last[k] ?? 0), 0) / keys.length);
  return avgLast - avgFirst;
}

// ─── PAGE ────────────────────────────────────────────────────────────────────
export default function EvolucaoPage() {
  const { terapeuta } = useClinicContext();
  const nivel = terapeuta?.nivel ?? "coordenador";
  const [tab,         setTab]         = useState<Tab>("consolidado");
  const [pacienteSel, setPacienteSel] = useState<string>("");
  const [dominiosSel, setDominiosSel] = useState<DominioKey[]>(["communication","social","attention","regulation"]);
  const [pacientesData, setPacientesData] = useState<PacienteData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!terapeuta) return;
    async function carregar() {
      setLoading(true);
      try {
        const { data: planos } = await supabase
          .from("planos")
          .select(`
            id, status, score_atual,
            criancas ( id, nome, diagnostico, data_nascimento ),
            programas ( id, nome, dominio )
          `)
          .eq("terapeuta_id", terapeuta!.id)
          .order("criado_em", { ascending: false });

        if (!planos || planos.length === 0) {
          setPacientesData([]);
          setLoading(false);
          return;
        }

        const criancaMap = new Map<string, { crianca: any; planos: any[] }>();
        for (const pl of planos) {
          const c = pl.criancas as any;
          if (!c) continue;
          if (!criancaMap.has(c.id)) criancaMap.set(c.id, { crianca: c, planos: [] });
          criancaMap.get(c.id)!.planos.push(pl);
        }

        const criancaIds = Array.from(criancaMap.keys());

        const { data: radares } = await supabase
          .from("radar_snapshots")
          .select("crianca_id, score_comunicacao, score_social, score_atencao, score_regulacao, score_brincadeira, score_flexibilidade, score_autonomia, score_motivacao, criado_em")
          .in("crianca_id", criancaIds)
          .order("criado_em", { ascending: true });

        const radarPorCrianca = new Map<string, any[]>();
        for (const r of (radares ?? [])) {
          if (!radarPorCrianca.has(r.crianca_id)) radarPorCrianca.set(r.crianca_id, []);
          radarPorCrianca.get(r.crianca_id)!.push(r);
        }

        const result: PacienteData[] = Array.from(criancaMap.values()).map(({ crianca, planos: cPlanos }, i) => {
          const snapshots = radarPorCrianca.get(crianca.id) ?? [];

          const radarFormatado: RadarSnapshot[] = snapshots.map((s, idx) => ({
            date: `Sem. ${(idx + 1) * 4}`,
            realDate: new Date(s.criado_em).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }),
            communication: s.score_comunicacao   ?? 0,
            social:        s.score_social        ?? 0,
            attention:     s.score_atencao       ?? 0,
            regulation:    s.score_regulacao     ?? 0,
            autonomy:      s.score_autonomia     ?? 0,
            flexibility:   s.score_flexibilidade ?? 0,
            play:          s.score_brincadeira   ?? 0,
            motivation:    s.score_motivacao     ?? 0,
          }));

          // Não injeta dados falsos — radar vazio = não avaliado
          const avaliado = radarFormatado.length > 0;

          const programs = cPlanos
            .filter(pl => pl.programas)
            .map(pl => {
              const prog = pl.programas as any;
              const score = pl.score_atual ?? 0;
              return {
                id: pl.id,
                name: prog.nome,
                domain: prog.dominio,
                status: pl.status === "pausado" ? "stalled" : score >= 80 ? "completed" : "active" as "active" | "completed" | "stalled",
                success: score,
                independence: Math.max(0, score - 15),
              };
            });

          const alerts: { id: string; title: string; description: string; level: "low" | "medium" | "high" }[] = [];
          for (const pl of cPlanos) {
            const prog = pl.programas as any;
            if (!prog) continue;
            const score = pl.score_atual ?? 0;
            if (score > 0 && score < 50) {
              alerts.push({ id: pl.id + "_h", title: "Score baixo", description: `${prog.nome} com ${score}%`, level: "high" });
            } else if (score >= 80) {
              alerts.push({ id: pl.id + "_l", title: "Próximo de critério", description: `${prog.nome} atingiu ${score}%`, level: "low" });
            }
          }

          return {
            id:          crianca.id,
            nome:        crianca.nome,
            iniciais:    iniciais(crianca.nome),
            gradient:    GRADIENTS[i % GRADIENTS.length],
            cor:         CORES[i % CORES.length],
            diagnostico: crianca.diagnostico ?? "Não informado",
            radar:       radarFormatado,
            avaliado,
            skills:      [],
            programs,
            alerts,
          };
        });

        setPacientesData(result);
        if (result.length > 0) setPacienteSel(result[0].id);
      } catch (err) {
        console.error("Erro ao carregar evolução:", err);
      }
      setLoading(false);
    }
    carregar();
  }, [terapeuta]);

  const paciente = useMemo(
    () => pacientesData.find(p => p.id === pacienteSel) ?? pacientesData[0],
    [pacienteSel, pacientesData]
  );

  const forecastResults = useMemo<ForecastResult[]>(() => {
    if (!paciente || !paciente.avaliado) return [];
    return FORECAST_GOALS.map(goal => generateForecastFromProfile(goal, {
      radar: paciente.radar, skills: paciente.skills,
      programs: paciente.programs, alerts: paciente.alerts, adherence: 72,
    }));
  }, [paciente]);

  const consolidadoData = useMemo(() => {
    return pacientesData.map(p => ({
      nome: p.nome.split(" ")[0],
      media: mediaRadar(p.radar),
      delta: deltaRadar(p.radar),
      cor: p.cor,
      avaliado: p.avaliado,
    }));
  }, [pacientesData]);

  const evolucaoData = useMemo(() => {
    if (!paciente || !paciente.avaliado || paciente.radar.length === 0) return [];
    const reais = paciente.radar.map(r => {
      const obj: Record<string, string | number | null> = {
        date: r.date, realDate: r.realDate ?? r.date,
      };
      dominiosSel.forEach(d => {
        obj[d] = r[d] ?? 0;
        obj[d + "_proj"] = null;
        obj[d + "_max"]  = null;
        obj[d + "_min"]  = null;
      });
      return obj;
    });

    const last  = paciente.radar[paciente.radar.length - 1];
    const first = paciente.radar[0];
    if (!last || !first) return reais;

    const taxas: Record<string, number> = {};
    dominiosSel.forEach(d => {
      const delta = (last[d as DominioKey] ?? 0) - (first[d as DominioKey] ?? 0);
      taxas[d] = paciente.radar.length > 1 ? delta / ((paciente.radar.length - 1) * 4) * 0.7 : 0.5;
    });

    const mesesFuturos = ["Mai 2025", "Jun 2025", "Jul 2025", "Ago 2025"];
    const projecoes = [4, 8, 12, 16].map((semOffset, i) => {
      const obj: Record<string, string | number | null | boolean> = {
        date: `+${semOffset}s`, realDate: mesesFuturos[i], projecao: true,
      };
      dominiosSel.forEach(d => {
        obj[d] = null;
        const val = Math.min(100, Math.round((last[d as DominioKey] ?? 0) + taxas[d] * semOffset));
        obj[d + "_proj"] = val;
        obj[d + "_max"]  = Math.min(100, val + 8);
        obj[d + "_min"]  = Math.max(0, val - 8);
      });
      return obj;
    });

    const transicao: Record<string, unknown> = { ...reais[reais.length - 1], projecao: "transicao" };
    dominiosSel.forEach(d => {
      transicao[d + "_proj"] = last[d as DominioKey] ?? 0;
      transicao[d + "_max"]  = ((last[d as DominioKey] ?? 0) as number) + 8;
      transicao[d + "_min"]  = ((last[d as DominioKey] ?? 0) as number) - 8;
    });

    return [...reais, transicao, ...projecoes];
  }, [paciente, dominiosSel]);

  const radarAtual = useMemo(() => {
    if (!paciente || !paciente.avaliado || paciente.radar.length === 0) return [];
    const last = paciente.radar[paciente.radar.length - 1];
    if (!last) return [];
    return DOMINIOS.map(d => ({ domain: d.label, value: last[d.key] ?? 0 }));
  }, [paciente]);

  const primeiraData = paciente?.radar[0]?.realDate ?? "";
  const ultimaData   = paciente?.radar.length ? (paciente.radar[paciente.radar.length - 1]?.realDate ?? "") : "";

  const card: React.CSSProperties = {
    background: "rgba(13,32,53,.75)",
    border: "1px solid rgba(70,120,180,.5)",
    borderRadius: 14,
    backdropFilter: "blur(8px)",
  };
  const lbl: React.CSSProperties = {
    fontSize: ".6rem", fontWeight: 700, textTransform: "uppercase" as const,
    letterSpacing: ".09em", color: "rgba(170,210,245,.88)", marginBottom: 8,
  };
  const tooltipStyle = {
    contentStyle: { background: "#0d2035", border: "1px solid rgba(26,58,92,.7)", borderRadius: 10, color: "#e8f0f8", fontSize: 11 },
  };

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 400 }}>
        <div style={{ fontSize: 13, color: "rgba(160,200,235,.9)" }}>Carregando evolução...</div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* ── HEADER ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: "1.2rem", fontWeight: 800, color: "#e8f0f8", margin: 0, marginBottom: 4 }}>Evolução & Forecast</h1>
          <div style={{ fontSize: ".72rem", color: "rgba(160,200,235,.84)" }}>Longitudinal por domínio · Previsibilidade de metas</div>
        </div>
        <Link href="/clinic/pacientes" style={{ fontSize: ".75rem", color: "rgba(160,200,235,.84)", textDecoration: "none", display: "flex", alignItems: "center", gap: 5 }}>
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M10 3L5 8l5 5"/></svg>
          Pacientes
        </Link>
      </div>

      {/* ── TABS ── */}
      <div style={{ display: "flex", borderBottom: "1px solid rgba(26,58,92,.4)", marginBottom: 4 }}>
        {([["consolidado","Visão consolidada"],["individual","Por paciente"]] as [Tab,string][]).map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: "10px 18px", background: "none", border: "none",
            borderBottom: `2px solid ${tab === t ? "#1D9E75" : "transparent"}`,
            color: tab === t ? "#1D9E75" : "rgba(160,200,235,.84)",
            fontFamily: "var(--font-sans)", fontWeight: tab === t ? 600 : 400,
            fontSize: ".82rem", cursor: "pointer", marginBottom: -1,
          }}>{label}</button>
        ))}
      </div>

      {pacientesData.length === 0 && (
        <div style={{ ...card, padding: "48px 24px", textAlign: "center" }}>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,.3)" }}>
            Nenhum paciente vinculado ainda.
          </div>
        </div>
      )}

      {/* ── TAB: CONSOLIDADO ── */}
      {tab === "consolidado" && pacientesData.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 10 }}>
            {[
              { l: "Pacientes ativos", v: pacientesData.length, c: "#e8f0f8" },
              { l: "Avaliados",        v: pacientesData.filter(p => p.avaliado).length, c: "#1D9E75" },
              { l: "Com alerta alto",  v: pacientesData.filter(p => p.alerts.some(a => a.level === "high")).length, c: "#E05A4B" },
              { l: "Aguard. avaliação",v: pacientesData.filter(p => !p.avaliado).length, c: "#8B7FE8" },
            ].map(k => (
              <div key={k.l} style={{ ...card, padding: "14px 16px" }}>
                <div style={{ fontSize: ".6rem", color: "rgba(170,210,245,.88)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 6 }}>{k.l}</div>
                <div style={{ fontSize: "1.6rem", fontWeight: 800, color: k.c, letterSpacing: "-.02em" }}>{k.v}</div>
              </div>
            ))}
          </div>

          {/* Comparativo — só pacientes avaliados */}
          {pacientesData.some(p => p.avaliado) && (
            <div style={{ ...card, padding: 20 }}>
              <div style={{ fontSize: ".88rem", fontWeight: 700, color: "#e8f0f8", marginBottom: 4 }}>Média geral por paciente</div>
              <div style={{ fontSize: ".7rem", color: "rgba(160,200,235,.84)", marginBottom: 16 }}>Média dos 8 domínios na última medição</div>
              <div style={{ height: 200, minHeight: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={consolidadoData.filter(p => p.avaliado)} barSize={32}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(26,58,92,.4)" vertical={false} />
                    <XAxis dataKey="nome" stroke="rgba(165,208,242,.85)" tick={{ fill: "rgba(160,200,235,.90)", fontSize: 11 }} />
                    <YAxis domain={[0, 100]} stroke="rgba(165,208,242,.85)" tick={{ fill: "rgba(160,200,235,.84)", fontSize: 10 }} />
                    <Tooltip {...tooltipStyle} formatter={(v: unknown) => [`${Number(v)}%`, "Média"] as [string, string]} />
                    <Bar dataKey="media" radius={[6, 6, 0, 0]}>
                      {consolidadoData.filter(p => p.avaliado).map((entry, i) => (
                        <Cell key={i} fill={entry.cor} fillOpacity={0.8} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Cards por paciente */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(320px,1fr))", gap: 12 }}>
            {pacientesData.map(p => {
              const media = mediaRadar(p.radar);
              const delta = deltaRadar(p.radar);
              const last  = p.radar.length > 0 ? p.radar[p.radar.length - 1] : null;
              const temAlerta = p.alerts.some(a => a.level === "high");
              return (
                <div key={p.id} style={{ ...card, padding: 18, border: `1px solid ${temAlerta ? "rgba(224,90,75,.25)" : "rgba(26,58,92,.5)"}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                    <div style={{ width: 36, height: 36, borderRadius: "50%", background: p.gradient, display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".68rem", fontWeight: 800, color: "#fff", flexShrink: 0 }}>{p.iniciais}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: ".85rem", fontWeight: 700, color: "#e8f0f8" }}>{p.nome}</div>
                      <div style={{ fontSize: ".68rem", color: "rgba(160,200,235,.84)" }}>{p.diagnostico}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      {p.avaliado ? (
                        <>
                          <div style={{ fontSize: "1.3rem", fontWeight: 800, color: media >= 70 ? "#1D9E75" : media >= 50 ? "#EF9F27" : "#E05A4B", lineHeight: 1 }}>{media}%</div>
                          <div style={{ fontSize: ".65rem", color: delta > 0 ? "#1D9E75" : "#E05A4B", fontWeight: 600 }}>{delta > 0 ? "+" : ""}{delta}pts</div>
                        </>
                      ) : (
                        <div style={{ fontSize: ".68rem", color: "#8B7FE8", fontWeight: 600, background: "rgba(139,127,232,.1)", borderRadius: 6, padding: "3px 8px", border: "1px solid rgba(139,127,232,.25)" }}>
                          Não avaliado
                        </div>
                      )}
                    </div>
                  </div>

                  {p.avaliado && last ? (
                    <>
                      <div style={{ height: 60, minHeight: 60, marginBottom: 12 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={(p.radar ?? []).map(r => ({ date: r?.date ?? '', val: r ? Math.round([(r.communication??0),(r.social??0),(r.attention??0),(r.regulation??0),(r.autonomy??0),(r.flexibility??0),(r.play??0),(r.motivation??0)].reduce((a,b)=>a+b,0)/8) : 0 }))}>
                            <Line type="monotone" dataKey="val" stroke={p.cor} strokeWidth={2} dot={false} />
                            <Tooltip {...tooltipStyle} formatter={(v: unknown) => [`${Number(v)}%`, "Média"] as [string, string]} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
                        {DOMINIOS.slice(0, 4).map(d => (
                          <div key={d.key} style={{ flex: 1, minWidth: 50 }}>
                            <div style={{ fontSize: ".58rem", color: "rgba(165,208,242,.85)", marginBottom: 2 }}>{d.label.slice(0,3)}</div>
                            <div style={{ height: 3, background: "rgba(26,58,92,.5)", borderRadius: 2, overflow: "hidden" }}>
                              <div style={{ height: "100%", width: `${last[d.key] ?? 0}%`, background: (last[d.key] ?? 0) >= 70 ? "#1D9E75" : (last[d.key] ?? 0) >= 50 ? "#EF9F27" : "#E05A4B" }} />
                            </div>
                            <div style={{ fontSize: ".58rem", color: "rgba(170,210,245,.88)", marginTop: 1 }}>{last[d.key] ?? 0}</div>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div style={{ padding: "16px 0", textAlign: "center", fontSize: ".75rem", color: "rgba(160,200,235,.3)", marginBottom: 12 }}>
                      Aguardando primeira avaliação clínica
                    </div>
                  )}

                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => { setPacienteSel(p.id); setTab("individual"); }} style={{ flex: 1, padding: "7px", borderRadius: 7, border: "1px solid rgba(70,120,180,.5)", background: "transparent", color: "rgba(160,200,235,.90)", fontFamily: "var(--font-sans)", fontSize: ".72rem", cursor: "pointer" }}>
                      Ver evolução
                    </button>
                    <Link href={`/clinic/paciente/${p.id}`} style={{ flex: 1, padding: "7px", borderRadius: 7, border: "none", background: "rgba(29,158,117,.1)", color: "#1D9E75", fontFamily: "var(--font-sans)", fontWeight: 600, fontSize: ".72rem", textDecoration: "none", textAlign: "center" }}>
                      Ver perfil →
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── TAB: INDIVIDUAL ── */}
      {tab === "individual" && paciente && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {pacientesData.map(p => (
              <button key={p.id} onClick={() => setPacienteSel(p.id)} style={{
                display: "flex", alignItems: "center", gap: 8, padding: "8px 14px",
                borderRadius: 9,
                border: `1px solid ${pacienteSel === p.id ? p.cor + "55" : "rgba(26,58,92,.5)"}`,
                background: pacienteSel === p.id ? p.cor + "11" : "transparent",
                cursor: "pointer", fontFamily: "var(--font-sans)",
              }}>
                <div style={{ width: 22, height: 22, borderRadius: "50%", background: p.gradient, display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".52rem", fontWeight: 800, color: "#fff" }}>{p.iniciais}</div>
                <span style={{ fontSize: ".78rem", color: pacienteSel === p.id ? p.cor : "rgba(160,200,235,.90)", fontWeight: pacienteSel === p.id ? 600 : 400 }}>{p.nome.split(" ")[0]}</span>
                {!p.avaliado && <span style={{ fontSize: ".58rem", color: "#8B7FE8" }}>· não avaliado</span>}
              </button>
            ))}
          </div>

          {/* Paciente não avaliado */}
          {!paciente.avaliado ? (
            <div style={{ ...card, padding: "48px 24px", textAlign: "center" }}>
              <div style={{ fontSize: ".88rem", fontWeight: 700, color: "#8B7FE8", marginBottom: 8 }}>Aguardando avaliação inicial</div>
              <div style={{ fontSize: ".75rem", color: "rgba(160,200,235,.4)", lineHeight: 1.6 }}>
                O radar e a evolução longitudinal serão construídos a partir das avaliações clínicas e sessões registradas.
              </div>
              <Link href={`/clinic/paciente/${paciente.id}`} style={{ display: "inline-block", marginTop: 20, padding: "9px 20px", borderRadius: 9, background: "rgba(139,127,232,.15)", border: "1px solid rgba(139,127,232,.3)", color: "#8B7FE8", fontSize: ".78rem", fontWeight: 600, textDecoration: "none" }}>
                Ir para o perfil →
              </Link>
            </div>
          ) : (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 10 }}>
                {[
                  { l: "Média atual",    v: `${mediaRadar(paciente.radar)}%`, c: "#e8f0f8" },
                  { l: "Evolução total", v: `+${deltaRadar(paciente.radar)}pts`, c: "#1D9E75" },
                  { l: "Programas",     v: paciente.programs.length, c: "#378ADD" },
                  { l: "Alertas",       v: paciente.alerts.filter(a => a.level === "high").length, c: paciente.alerts.some(a => a.level === "high") ? "#E05A4B" : "#1D9E75" },
                ].map(k => (
                  <div key={k.l} style={{ ...card, padding: "14px 16px" }}>
                    <div style={{ fontSize: ".6rem", color: "rgba(170,210,245,.88)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 6 }}>{k.l}</div>
                    <div style={{ fontSize: "1.6rem", fontWeight: 800, color: k.c, letterSpacing: "-.02em" }}>{k.v}</div>
                  </div>
                ))}
              </div>

              <div style={{ ...card, padding: "12px 16px" }}>
                <div style={{ ...lbl, marginBottom: 8 }}>Domínios no gráfico</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {DOMINIOS.map(d => {
                    const ativo = dominiosSel.includes(d.key);
                    return (
                      <button key={d.key} onClick={() => {
                        if (ativo && dominiosSel.length > 1) setDominiosSel(prev => prev.filter(x => x !== d.key));
                        else if (!ativo) setDominiosSel(prev => [...prev, d.key]);
                      }} style={{
                        padding: "5px 12px", borderRadius: 20,
                        border: `1px solid ${ativo ? d.cor + "55" : "rgba(26,58,92,.5)"}`,
                        background: ativo ? d.cor + "15" : "transparent",
                        color: ativo ? d.cor : "rgba(170,210,245,.88)",
                        fontFamily: "var(--font-sans)", fontSize: ".72rem", fontWeight: ativo ? 600 : 400, cursor: "pointer",
                      }}>{d.label}</button>
                    );
                  })}
                </div>
              </div>

              <div style={{ ...card, padding: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                  <div>
                    <div style={{ fontSize: ".88rem", fontWeight: 700, color: "#e8f0f8", marginBottom: 4 }}>Evolução longitudinal — {paciente.nome}</div>
                    <div style={{ fontSize: ".7rem", color: "rgba(160,200,235,.84)" }}>
                      {primeiraData} → {ultimaData} · <span style={{ color: "rgba(139,127,232,.8)" }}>tracejado = projeção</span>
                    </div>
                  </div>
                </div>
                <div style={{ height: 300, minHeight: 300, marginTop: 16 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={evolucaoData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(26,58,92,.4)" />
                      <XAxis dataKey="date" stroke="rgba(165,208,242,.85)" tick={{ fill: "rgba(160,200,235,.84)", fontSize: 10 }} />
                      <YAxis domain={[0, 100]} stroke="rgba(165,208,242,.85)" tick={{ fill: "rgba(160,200,235,.84)", fontSize: 10 }} tickFormatter={(v: number) => `${v}%`} />
                      <Tooltip {...tooltipStyle} content={({ active, payload, label }) => {
                        if (!active || !payload?.length) return null;
                        const point = evolucaoData.find(d => d.date === label);
                        const isProj = point?.projecao === true;
                        return (
                          <div style={{ background: "#0d2035", border: "1px solid rgba(26,58,92,.7)", borderRadius: 10, padding: "10px 14px", fontSize: 11 }}>
                            <div style={{ fontWeight: 700, color: "#e8f0f8", marginBottom: 4 }}>{label}</div>
                            <div style={{ color: "rgba(160,200,235,.84)", marginBottom: 6, fontSize: 10 }}>{String(point?.realDate ?? "")} {isProj ? "· Projeção" : "· Medição real"}</div>
                            {payload.filter(p => !String(p.dataKey).includes("_")).map(p => (
                              <div key={String(p.dataKey)} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                                <div style={{ width: 8, height: 8, borderRadius: "50%", background: String(p.color) }} />
                                <span style={{ color: "rgba(175,210,240,.95)" }}>{p.name}:</span>
                                <span style={{ color: "#e8f0f8", fontWeight: 600 }}>{p.value}%</span>
                              </div>
                            ))}
                          </div>
                        );
                      }} />
                      <ReferenceLine y={80} stroke="rgba(255,255,255,.2)" strokeDasharray="6 3" label={{ value: "Critério 80%", position: "insideTopRight", fill: "rgba(255,255,255,.35)", fontSize: 10 }} />
                      {dominiosSel.map(d => {
                        const dom = DOMINIOS.find(x => x.key === d)!;
                        return <Area key={d + "_conf"} type="monotone" dataKey={d + "_max"} stroke="none" fill={dom.cor} fillOpacity={0.06} legendType="none" name="" activeDot={false} connectNulls={false} />;
                      })}
                      {dominiosSel.map(d => {
                        const dom = DOMINIOS.find(x => x.key === d)!;
                        return (
                          <Line key={d} type="monotone" dataKey={d} name={dom.label} stroke={dom.cor} strokeWidth={2}
                            dot={(props: { cx?: number; cy?: number; payload?: Record<string, unknown> }) => {
                              if (!props.payload || props.payload.projecao) return <g key={`dot-${props.cx}-${props.cy}`} />;
                              return <circle key={`dot-${props.cx}-${props.cy}`} cx={props.cx} cy={props.cy} r={3} fill={dom.cor} stroke="none" />;
                            }}
                            connectNulls={false}
                          />
                        );
                      })}
                      {dominiosSel.map(d => {
                        const dom = DOMINIOS.find(x => x.key === d)!;
                        return <Line key={d + "_proj"} type="monotone" dataKey={d + "_proj"} name={dom.label + " (proj.)"} stroke={dom.cor} strokeWidth={1.5} strokeDasharray="5 4" dot={false} connectNulls opacity={0.7} legendType="none" />;
                      })}
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, flexWrap: "wrap", gap: 8 }}>
                  <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                    {dominiosSel.map(d => {
                      const dom = DOMINIOS.find(x => x.key === d)!;
                      return (
                        <div key={d} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                          <div style={{ width: 12, height: 3, background: dom.cor, borderRadius: 2 }} />
                          <span style={{ fontSize: ".68rem", color: "rgba(160,200,235,.90)" }}>{dom.label}</span>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ fontSize: ".65rem", color: "rgba(165,208,242,.85)" }}>
                    {paciente.radar.length} medições reais · +4 projeções
                  </div>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div style={{ ...card, padding: 20 }}>
                  <div style={{ fontSize: ".88rem", fontWeight: 700, color: "#e8f0f8", marginBottom: 4 }}>Radar atual</div>
                  <div style={{ fontSize: ".7rem", color: "rgba(160,200,235,.84)", marginBottom: 8 }}>Semana {paciente.radar.length * 4}</div>
                  <div style={{ height: 260, minHeight: 260 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={radarAtual}>
                        <PolarGrid stroke="rgba(26,58,92,.5)" />
                        <PolarAngleAxis dataKey="domain" tick={{ fill: "rgba(160,200,235,.90)", fontSize: 10 }} />
                        <Radar name="Atual" dataKey="value" stroke={paciente.cor} fill={paciente.cor} fillOpacity={0.15} strokeWidth={1.5} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div style={{ ...card, padding: 20 }}>
                  <div style={{ fontSize: ".88rem", fontWeight: 700, color: "#e8f0f8", marginBottom: 14 }}>Programas em andamento</div>
                  {paciente.programs.length === 0 ? (
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,.3)", textAlign: "center", paddingTop: 24 }}>Sem programas ativos</div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      {paciente.programs.map(p => {
                        const cor = p.success >= 80 ? "#1D9E75" : p.success >= 50 ? "#EF9F27" : "#E05A4B";
                        const st  = p.status === "active" ? { l: "Ativo", c: "#1D9E75" } : p.status === "completed" ? { l: "Concluído", c: "#378ADD" } : { l: "Travado", c: "#E05A4B" };
                        return (
                          <div key={p.id}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                              <div>
                                <div style={{ fontSize: ".8rem", fontWeight: 600, color: "#e8f0f8" }}>{p.name}</div>
                                <div style={{ fontSize: ".65rem", color: "rgba(170,210,245,.88)" }}>{p.domain}</div>
                              </div>
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <span style={{ fontSize: ".62rem", color: st.c, background: st.c + "15", border: `1px solid ${st.c}33`, borderRadius: 20, padding: "2px 7px", fontWeight: 600 }}>{st.l}</span>
                                <span style={{ fontSize: ".85rem", fontWeight: 700, color: cor }}>{p.success}%</span>
                              </div>
                            </div>
                            <div style={{ height: 4, background: "rgba(26,58,92,.5)", borderRadius: 2, overflow: "hidden", marginBottom: 2 }}>
                              <div style={{ height: "100%", width: `${p.success}%`, background: cor, transition: "width .5s" }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {(nivel === "coordenador" || nivel === "supervisor") && forecastResults.length > 0 && (
                <div style={{ ...card, padding: 20 }}>
                  <div style={{ fontSize: ".88rem", fontWeight: 700, color: "#e8f0f8", marginBottom: 4 }}>Forecast Matrix — {paciente.nome}</div>
                  <div style={{ fontSize: ".7rem", color: "rgba(160,200,235,.84)", marginBottom: 16 }}>Previsibilidade de metas pelo FractaEngine</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
                    {forecastResults.map(item => {
                      const hc = HEALTH_CONFIG[item.goalHealth] ?? HEALTH_CONFIG.watch;
                      const riskBg = item.riskScore >= 65 ? "#E05A4B" : item.riskScore >= 40 ? "#EF9F27" : "#1D9E75";
                      return (
                        <div key={item.goalId} style={{ background: "rgba(26,58,92,.25)", border: "1px solid rgba(70,120,180,.4)", borderRadius: 10, overflow: "hidden" }}>
                          <div style={{ height: 2, background: riskBg }} />
                          <div style={{ padding: "12px 14px" }}>
                            <div style={{ fontSize: ".75rem", fontWeight: 600, color: "#e8f0f8", marginBottom: 4, lineHeight: 1.3 }}>{item.goalName}</div>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                              <span style={{ fontSize: ".62rem", color: hc.cor, background: hc.bg, borderRadius: 20, padding: "2px 7px", fontWeight: 600 }}>{hc.label}</span>
                              <span style={{ fontSize: ".78rem", fontWeight: 700, color: "#1D9E75", fontFamily: "monospace" }}>{item.min}–{item.max}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
