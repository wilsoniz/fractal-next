"use client";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useClinicContext } from "../layout";

// ─── TIPOS ───────────────────────────────────────────────────────────────────
type StatusPaciente = "ativo" | "alerta" | "pausado";
type FiltroAtivo    = "todos" | "alerta" | "hoje" | "pausado";
interface Paciente {
  id: string;
  nome: string;
  iniciais: string;
  gradient: string;
  idade: number;
  diagnostico: string;
  taxaGeral: number;
  sessoesMes: number;
  programasAtivos: number;
  dominios: string[];
  ultimaSessao: string;
  proximaSessao: string | null;
  status: StatusPaciente;
  alertas: { nivel: "high" | "medium" | "low"; texto: string }[];
  radarMini: { label: string; val: number }[];
  semSupervisor: boolean;
  cuidadorAtivo: boolean;
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const GRADIENTS = [
  "linear-gradient(135deg,#1D9E75,#378ADD)",
  "linear-gradient(135deg,#378ADD,#8B7FE8)",
  "linear-gradient(135deg,#8B7FE8,#E05A4B)",
  "linear-gradient(135deg,#EF9F27,#1D9E75)",
  "linear-gradient(135deg,#E05A4B,#EF9F27)",
]
const DOMINIO_LABELS: Record<string, string> = {
  comunicacao: "Comunicação", social: "Social", atencao: "Atenção",
  regulacao: "Regulação", brincadeira: "Brincadeira",
  flexibilidade: "Flexibilidade", autonomia: "Autonomia", motivacao: "Motivação",
}
const RADAR_KEYS = [
  { key: "score_comunicacao", label: "Com" },
  { key: "score_social",      label: "Soc" },
  { key: "score_atencao",     label: "Ate" },
  { key: "score_regulacao",   label: "Reg" },
]
function iniciais(nome: string) {
  const p = nome.trim().split(" ")
  return p.length >= 2
    ? `${p[0][0]}${p[p.length - 1][0]}`.toUpperCase()
    : nome.slice(0, 2).toUpperCase()
}
function idadeAnos(dataNasc: string) {
  const diff = Date.now() - new Date(dataNasc).getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25))
}
function ultimaSessaoLabel(data: string | null) {
  if (!data) return "Nunca"
  const diff = Date.now() - new Date(data).getTime()
  const d = Math.floor(diff / 86400000)
  if (d === 0) return "hoje"
  if (d === 1) return "ontem"
  return `${d} dias atrás`
}

// ─── COMPONENTE ───────────────────────────────────────────────────────────────
export default function PacientesPage() {
  const { terapeuta } = useClinicContext();
  const nivel = terapeuta?.nivel ?? "coordenador";
  const [busca,     setBusca]     = useState("");
  const [filtro,    setFiltro]    = useState<FiltroAtivo>("todos");
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    if (!terapeuta) return;
    async function carregar() {
      setLoading(true);
      try {
        // 1. Planos do terapeuta com criança e programa
        const { data: planos } = await supabase
          .from("planos")
          .select(`
            id, status, score_atual, criado_em,
            criancas ( id, nome, data_nascimento, diagnostico ),
            programas ( id, nome, dominio )
          `)
          .eq("terapeuta_id", terapeuta!.id)
          .order("criado_em", { ascending: false });

        if (!planos || planos.length === 0) {
          setPacientes([]);
          setLoading(false);
          return;
        }

        // Agrupar planos por criança
        const criancaMap = new Map<string, { crianca: any; planos: any[] }>();
        for (const pl of planos) {
          const c = pl.criancas as any;
          if (!c) continue;
          if (!criancaMap.has(c.id)) criancaMap.set(c.id, { crianca: c, planos: [] });
          criancaMap.get(c.id)!.planos.push(pl);
        }

        const criancaIds = Array.from(criancaMap.keys());

        // 2. Radar mais recente de cada criança
        const { data: radares } = await supabase
          .from("radar_snapshots")
          .select("crianca_id, score_comunicacao, score_social, score_atencao, score_regulacao, score_brincadeira, score_flexibilidade, score_autonomia, score_motivacao, criado_em")
          .in("crianca_id", criancaIds)
          .order("criado_em", { ascending: false });

        const radarMap = new Map<string, any>();
        for (const r of (radares ?? [])) {
          if (!radarMap.has(r.crianca_id)) radarMap.set(r.crianca_id, r);
        }

        // 3. Última sessão clínica de cada criança
        const { data: sessoes } = await supabase
          .from("sessoes_clinicas")
          .select("crianca_id, criado_em, concluida")
          .in("crianca_id", criancaIds)
          .order("criado_em", { ascending: false });

        const ultimaSessaoMap = new Map<string, string>();
        for (const s of (sessoes ?? [])) {
          if (!ultimaSessaoMap.has(s.crianca_id)) {
            ultimaSessaoMap.set(s.crianca_id, s.criado_em);
          }
        }

        // 4. Montar pacientes
        const result: Paciente[] = Array.from(criancaMap.values()).map(({ crianca, planos: cPlanos }, i) => {
          const radar  = radarMap.get(crianca.id);
          const ultima = ultimaSessaoMap.get(crianca.id) ?? null;

          // Score geral médio
          const scores = radar ? RADAR_KEYS.map(k => radar[k.key]).filter(Boolean) : [];
          const taxaGeral = scores.length > 0
            ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length)
            : 0;

          // Domínios prioritários (mais baixos)
          const dominiosFoco = radar
            ? Object.entries(DOMINIO_LABELS)
                .map(([k, v]) => ({ nome: v, val: radar[`score_${k}`] ?? 100 }))
                .sort((a, b) => a.val - b.val)
                .slice(0, 3)
                .map(d => d.nome)
            : [];

          // Alertas automáticos
          const alertas: { nivel: "high" | "medium" | "low"; texto: string }[] = [];
          for (const pl of cPlanos) {
            const score = pl.score_atual ?? 0;
            const prog  = pl.programas as any;
            if (!prog) continue;
            if (score > 0 && score < 50) {
              alertas.push({ nivel: "high", texto: `Score baixo em ${prog.nome} (${score}%)` });
            } else if (score >= 75) {
              alertas.push({ nivel: "low", texto: `${prog.nome} próximo de critério` });
            }
          }

          // Status
          const temAlertaHigh = alertas.some(a => a.nivel === "high");
          const pausado       = cPlanos.every(pl => pl.status === "pausado");
          const status: StatusPaciente = pausado ? "pausado" : temAlertaHigh ? "alerta" : "ativo";

          // Sessões no mês
          const inicioMes = new Date(); inicioMes.setDate(1); inicioMes.setHours(0,0,0,0);
          const sessoesMes = (sessoes ?? []).filter(s =>
            s.crianca_id === crianca.id && new Date(s.criado_em) >= inicioMes
          ).length;

          return {
            id:              crianca.id,
            nome:            crianca.nome,
            iniciais:        iniciais(crianca.nome),
            gradient:        GRADIENTS[i % GRADIENTS.length],
            idade:           crianca.data_nascimento ? idadeAnos(crianca.data_nascimento) : 0,
            diagnostico:     crianca.diagnostico ?? "Não informado",
            taxaGeral,
            sessoesMes,
            programasAtivos: cPlanos.filter(pl => pl.status === "ativo").length,
            dominios:        dominiosFoco,
            ultimaSessao:    ultimaSessaoLabel(ultima),
            proximaSessao:   null,
            status,
            alertas,
            radarMini:       RADAR_KEYS.map(k => ({ label: k.label, val: radar?.[k.key] ?? 0 })),
            semSupervisor:   false,
            cuidadorAtivo:   true,
          };
        });

        setPacientes(result);
      } catch (err) {
        console.error("Erro ao carregar pacientes:", err);
      }
      setLoading(false);
    }
    carregar();
  }, [terapeuta]);

  const pacientesFiltrados = useMemo(() => {
    return pacientes.filter(p => {
      const matchBusca =
        p.nome.toLowerCase().includes(busca.toLowerCase()) ||
        p.diagnostico.toLowerCase().includes(busca.toLowerCase()) ||
        p.dominios.some(d => d.toLowerCase().includes(busca.toLowerCase()));
      const matchFiltro =
        filtro === "todos"   ? true :
        filtro === "alerta"  ? p.alertas.some(a => a.nivel === "high" || a.nivel === "medium") :
        filtro === "hoje"    ? p.ultimaSessao === "hoje" :
        filtro === "pausado" ? p.status === "pausado" : true;
      return matchBusca && matchFiltro;
    });
  }, [busca, filtro, pacientes]);

  const stats = useMemo(() => ({
    total:    pacientes.length,
    alertas:  pacientes.filter(p => p.alertas.some(a => a.nivel === "high")).length,
    hoje:     pacientes.filter(p => p.ultimaSessao === "hoje").length,
    pausados: pacientes.filter(p => p.status === "pausado").length,
  }), [pacientes]);

  const card: React.CSSProperties = {
    background: "rgba(13,32,53,.75)",
    border: "1px solid rgba(70,120,180,.5)",
    borderRadius: 14,
    backdropFilter: "blur(8px)",
  };

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 400 }}>
        <div style={{ fontSize: 13, color: "rgba(160,200,235,.9)" }}>Carregando pacientes...</div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* ── HEADER ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#e8f0f8", margin: 0, marginBottom: 4 }}>Pacientes</h1>
          <div style={{ fontSize: ".75rem", color: "rgba(138,168,200,.5)" }}>
            {stats.total} pacientes · {stats.hoje} com sessão hoje
          </div>
        </div>
        {nivel === "supervisor" && (
          <button style={{ padding: "9px 18px", borderRadius: 9, border: "none", background: "linear-gradient(135deg,#1D9E75,#0f8f7a)", color: "#07111f", fontWeight: 700, fontSize: ".82rem", cursor: "pointer", fontFamily: "var(--font-sans)" }}>
            + Novo paciente
          </button>
        )}
      </div>

      {/* ── STATS ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
        {[
          { label: "Total",    val: stats.total,    cor: "#378ADD", filtroId: "todos"   },
          { label: "Alertas",  val: stats.alertas,  cor: "#E05A4B", filtroId: "alerta"  },
          { label: "Hoje",     val: stats.hoje,     cor: "#1D9E75", filtroId: "hoje"    },
          { label: "Pausados", val: stats.pausados, cor: "#EF9F27", filtroId: "pausado" },
        ].map(s => (
          <button
            key={s.filtroId}
            onClick={() => setFiltro(s.filtroId as FiltroAtivo)}
            style={{ ...card, padding: "14px 16px", cursor: "pointer", border: filtro === s.filtroId ? `1px solid ${s.cor}55` : "1px solid rgba(70,120,180,.5)", background: filtro === s.filtroId ? `${s.cor}11` : "rgba(13,32,53,.75)", textAlign: "left" }}
          >
            <div style={{ fontSize: "1.4rem", fontWeight: 800, color: s.cor }}>{s.val}</div>
            <div style={{ fontSize: ".7rem", color: "rgba(138,168,200,.5)", marginTop: 2 }}>{s.label}</div>
          </button>
        ))}
      </div>

      {/* ── BUSCA ── */}
      <div style={{ position: "relative" }}>
        <input
          value={busca}
          onChange={e => setBusca(e.target.value)}
          placeholder="Buscar por nome, diagnóstico ou domínio..."
          style={{ width: "100%", padding: "11px 16px 11px 38px", borderRadius: 10, border: "1px solid rgba(70,120,180,.3)", background: "rgba(13,32,53,.6)", color: "#e8f0f8", fontSize: ".82rem", fontFamily: "var(--font-sans)", boxSizing: "border-box", outline: "none" }}
        />
        <svg style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", opacity: .4 }} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#e8f0f8" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
      </div>

      {/* ── LISTA ── */}
      {pacientesFiltrados.length === 0 ? (
        <div style={{ ...card, padding: "48px 24px", textAlign: "center" }}>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,.3)" }}>
            {pacientes.length === 0
              ? "Nenhum paciente vinculado ainda. Vincule-os pela tabela de planos no Supabase."
              : "Nenhum paciente encontrado para esse filtro."}
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {pacientesFiltrados.map(p => (
            <Link key={p.id} href={`/clinic/paciente/${p.id}`} style={{ textDecoration: "none" }}>
              <div style={{ ...card, padding: "18px 20px", cursor: "pointer", transition: "border-color .15s" }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(55,138,221,.5)")}
                onMouseLeave={e => (e.currentTarget.style.borderColor = "rgba(70,120,180,.5)")}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
                  {/* Avatar */}
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: p.gradient, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 800, color: "#fff", flexShrink: 0 }}>
                    {p.iniciais}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 4 }}>
                      <span style={{ fontSize: ".9rem", fontWeight: 700, color: "#e8f0f8" }}>{p.nome}</span>
                      <span style={{ fontSize: ".7rem", color: "rgba(138,168,200,.5)" }}>{p.idade} anos · {p.diagnostico}</span>
                      {/* Status badge */}
                      <span style={{
                        fontSize: ".65rem", fontWeight: 700, padding: "2px 8px", borderRadius: 6,
                        background: p.status === "alerta" ? "rgba(224,90,75,.15)" : p.status === "pausado" ? "rgba(239,159,39,.12)" : "rgba(29,158,117,.12)",
                        color:      p.status === "alerta" ? "#E05A4B"              : p.status === "pausado" ? "#EF9F27"              : "#1D9E75",
                        border:     `1px solid ${p.status === "alerta" ? "#E05A4B33" : p.status === "pausado" ? "#EF9F2733" : "#1D9E7533"}`,
                      }}>
                        {p.status === "alerta" ? "Atenção" : p.status === "pausado" ? "Pausado" : "Ativo"}
                      </span>
                    </div>

                    {/* Domínios */}
                    {p.dominios.length > 0 && (
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                        {p.dominios.map(d => (
                          <span key={d} style={{ fontSize: ".65rem", padding: "2px 8px", borderRadius: 5, background: "rgba(55,138,221,.1)", color: "rgba(138,168,200,.8)", border: "1px solid rgba(55,138,221,.2)" }}>{d}</span>
                        ))}
                      </div>
                    )}

                    {/* Alertas */}
                    {p.alertas.slice(0, 2).map((a, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                        <div style={{ width: 5, height: 5, borderRadius: "50%", background: a.nivel === "high" ? "#E05A4B" : a.nivel === "medium" ? "#EF9F27" : "#1D9E75", flexShrink: 0 }} />
                        <span style={{ fontSize: ".72rem", color: "rgba(200,220,240,.6)" }}>{a.texto}</span>
                      </div>
                    ))}
                  </div>

                  {/* Métricas direita */}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, flexShrink: 0 }}>
                    <div style={{ fontSize: "1.3rem", fontWeight: 800, color: p.taxaGeral >= 70 ? "#1D9E75" : p.taxaGeral >= 50 ? "#EF9F27" : "#E05A4B" }}>
                      {p.taxaGeral > 0 ? `${p.taxaGeral}%` : "—"}
                    </div>
                    <div style={{ fontSize: ".65rem", color: "rgba(138,168,200,.4)", textAlign: "right" }}>
                      {p.programasAtivos} programas · {p.sessoesMes} sessões/mês
                    </div>
                    <div style={{ fontSize: ".65rem", color: "rgba(138,168,200,.4)" }}>
                      Última: {p.ultimaSessao}
                    </div>
                    {/* Radar mini */}
                    <div style={{ display: "flex", gap: 6 }}>
                      {p.radarMini.map(r => (
                        <div key={r.label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                          <div style={{ width: 4, height: 28, background: "rgba(255,255,255,.08)", borderRadius: 2, position: "relative", overflow: "hidden" }}>
                            <div style={{ position: "absolute", bottom: 0, width: "100%", height: `${r.val}%`, background: r.val >= 70 ? "#1D9E75" : r.val >= 50 ? "#EF9F27" : "#E05A4B", borderRadius: 2 }} />
                          </div>
                          <span style={{ fontSize: ".55rem", color: "rgba(138,168,200,.4)" }}>{r.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
