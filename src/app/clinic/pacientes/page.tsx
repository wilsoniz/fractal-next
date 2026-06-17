"use client";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useClinicContext } from "../layout";

// ─── TIPOS ───────────────────────────────────────────────────────────────────
type StatusPaciente = "ativo" | "alerta" | "pausado";
type FiltroAtivo = "todos" | "alerta" | "hoje" | "pausado";
interface Paciente {
  id: string;
  nome: string;
  iniciais: string;
  gradient: string;
  idade: number;
  diagnostico: string;
  taxaGeral: number;
  avaliado: boolean;
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
  planoId: string;
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
  { key: "score_social", label: "Soc" },
  { key: "score_atencao", label: "Ate" },
  { key: "score_regulacao", label: "Reg" },
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
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<FiltroAtivo>("todos");
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [loading, setLoading] = useState(true);
  const [encerrando, setEncerrando] = useState<string | null>(null);
  const [confirmEncerrar, setConfirmEncerrar] = useState<Paciente | null>(null);

  async function encerrarVinculo(p: Paciente) {
    if (!p.planoId) return
    setEncerrando(p.id)
    const { error } = await supabase.from("planos").update({
      status: "cancelado",
      atualizado_em: new Date().toISOString(),
    }).eq("id", p.planoId)
    if (error) {
      console.error("Erro ao encerrar vínculo:", error)
      alert("Não foi possível encerrar o vínculo. Tente novamente.")
      setEncerrando(null)
      return
    }
    setPacientes(prev => prev.filter(x => x.id !== p.id))
    setEncerrando(null)
    setConfirmEncerrar(null)
  }
  const [modalFFS, setModalFFS] = useState(false);
  const [modalVinculo, setModalVinculo] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [codigoConvite, setCodigoConvite] = useState('');
  const [msgVinculo, setMsgVinculo] = useState('');
  const [vinculando, setVinculando] = useState(false);
  const [msgFFS, setMsgFFS] = useState('');
  const [novoNome, setNovoNome] = useState('');
  const [novoNasc, setNovoNasc] = useState('');
  const [novoGenero, setNovoGenero] = useState('');
  const [novoDiag, setNovoDiag] = useState('');
  const [novoResp, setNovoResp] = useState('');
  const [novoEmail, setNovoEmail] = useState('');

  useEffect(() => {
    if (!terapeuta) return;
    async function carregar() {
      setLoading(true);
      try {
        // 1. Busca planos simples — sem join
        const { data: planos, error: erroPlanos } = await supabase
          .from("planos")
          .select("id, status, score_atual, criado_em, crianca_id")
          .eq("terapeuta_id", terapeuta!.id)
          .eq("status", "ativo")

        console.log('planos:', planos, 'erro:', erroPlanos)

        if (!planos || planos.length === 0) {
          setPacientes([]);
          setLoading(false);
          return;
        }

        // 2. Busca criancas separadamente
        // linha 111 — mude o nome
        const criancaIdsFromPlanos = [...new Set(planos.map((pl: any) => pl.crianca_id))]
        const { data: criancas } = await supabase
          .from("criancas")
          .select("id, nome, data_nascimento, diagnostico")
          .in("id", criancaIdsFromPlanos)

        const criancaById = new Map((criancas ?? []).map((c: any) => [c.id, c]))

        // 3. Monta mapa crianca → planos
        const criancaMap = new Map<string, { crianca: any; planos: any[] }>();
        for (const pl of planos) {
          const c = criancaById.get(pl.crianca_id)
          if (!c) continue;
          if (!criancaMap.has(c.id)) criancaMap.set(c.id, { crianca: c, planos: [] });
          criancaMap.get(c.id)!.planos.push(pl);
        }
        // O resto continua igual...

        const { data: radares } = await supabase
          .from("radar_snapshots")
          .select("crianca_id, score_comunicacao, score_social, score_atencao, score_regulacao, score_brincadeira, score_flexibilidade, score_autonomia, score_motivacao, criado_em")
          .in("crianca_id", criancaIdsFromPlanos)
          .order("criado_em", { ascending: false });

        const radarMap = new Map<string, any>();
        for (const r of (radares ?? [])) {
          if (!radarMap.has(r.crianca_id)) radarMap.set(r.crianca_id, r);
        }

        const { data: sessoes } = await supabase
          .from("sessoes_clinicas")
          .select("crianca_id, criado_em, concluida")
          .in("crianca_id", criancaIdsFromPlanos)
          .order("criado_em", { ascending: false });

        const ultimaSessaoMap = new Map<string, string>();
        for (const s of (sessoes ?? [])) {
          if (!ultimaSessaoMap.has(s.crianca_id)) {
            ultimaSessaoMap.set(s.crianca_id, s.criado_em);
          }
        }

        const result: Paciente[] = Array.from(criancaMap.values()).map(({ crianca, planos: cPlanos }, i) => {
          const radar = radarMap.get(crianca.id);
          const ultima = ultimaSessaoMap.get(crianca.id) ?? null;
          const avaliado = !!radar;

          const scores = radar ? RADAR_KEYS.map(k => radar[k.key]).filter(Boolean) : [];
          const taxaGeral = scores.length > 0
            ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length)
            : 0;

          const dominiosFoco = radar
            ? Object.entries(DOMINIO_LABELS)
              .map(([k, v]) => ({ nome: v, val: radar[`score_${k}`] ?? 100 }))
              .sort((a, b) => a.val - b.val)
              .slice(0, 3)
              .map(d => d.nome)
            : [];

          const alertas: { nivel: "high" | "medium" | "low"; texto: string }[] = [];
          for (const pl of cPlanos) {
            const score = pl.score_atual ?? 0;
            const prog = pl.programas as any;
            if (!prog) continue;
            if (score > 0 && score < 50) {
              alertas.push({ nivel: "high", texto: `Score baixo em ${prog.nome} (${score}%)` });
            } else if (score >= 75) {
              alertas.push({ nivel: "low", texto: `${prog.nome} próximo de critério` });
            }
          }

          const temAlertaHigh = alertas.some(a => a.nivel === "high");
          const pausado = cPlanos.every(pl => pl.status === "pausado");
          const status: StatusPaciente = pausado ? "pausado" : temAlertaHigh ? "alerta" : "ativo";

          const inicioMes = new Date(); inicioMes.setDate(1); inicioMes.setHours(0, 0, 0, 0);
          const sessoesMes = (sessoes ?? []).filter(s =>
            s.crianca_id === crianca.id && new Date(s.criado_em) >= inicioMes
          ).length;

          return {
            id: crianca.id,
            nome: crianca.nome,
            iniciais: iniciais(crianca.nome),
            gradient: GRADIENTS[i % GRADIENTS.length],
            idade: crianca.data_nascimento ? idadeAnos(crianca.data_nascimento) : 0,
            diagnostico: crianca.diagnostico ?? "Não informado",
            taxaGeral,
            avaliado,
            sessoesMes,
            programasAtivos: cPlanos.filter(pl => pl.status === "ativo").length,
            dominios: dominiosFoco,
            ultimaSessao: ultimaSessaoLabel(ultima),
            proximaSessao: null,
            status,
            alertas,
            radarMini: RADAR_KEYS.map(k => ({ label: k.label, val: radar?.[k.key] ?? 0 })),
            semSupervisor: false,
            cuidadorAtivo: true,
            planoId: cPlanos.find(pl => pl.status === "ativo")?.id ?? "",
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
        filtro === "todos" ? true :
          filtro === "alerta" ? p.alertas.some(a => a.nivel === "high" || a.nivel === "medium") :
            filtro === "hoje" ? p.ultimaSessao === "hoje" :
              filtro === "pausado" ? p.status === "pausado" : true;
      return matchBusca && matchFiltro;
    });
  }, [busca, filtro, pacientes]);

  const stats = useMemo(() => ({
    total: pacientes.length,
    alertas: pacientes.filter(p => p.alertas.some(a => a.nivel === "high")).length,
    hoje: pacientes.filter(p => p.ultimaSessao === "hoje").length,
    pausados: pacientes.filter(p => p.status === "pausado").length,
  }), [pacientes]);

  const fecharFFS = () => {
    setModalFFS(false);
    setMsgFFS('');
    setNovoNome(''); setNovoNasc(''); setNovoGenero('');
    setNovoDiag(''); setNovoResp(''); setNovoEmail('');
  };

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
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setModalVinculo(true)}
            style={{ padding: "9px 18px", borderRadius: 9, border: "1px solid rgba(55,138,221,0.4)", background: "rgba(55,138,221,0.08)", color: "#378ADD", fontWeight: 600, fontSize: ".82rem", cursor: "pointer", fontFamily: "var(--font-sans)" }}
          >
            Vincular por código
          </button>
          <button
            onClick={() => setModalFFS(true)}
            style={{ padding: "9px 18px", borderRadius: 9, border: "none", background: "linear-gradient(135deg,#1D9E75,#0f8f7a)", color: "#07111f", fontWeight: 700, fontSize: ".82rem", cursor: "pointer", fontFamily: "var(--font-sans)" }}
          >
            + Novo paciente
          </button>
        </div>
      </div>

      {/* ── STATS ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
        {[
          { label: "Total", val: stats.total, cor: "#378ADD", filtroId: "todos" },
          { label: "Alertas", val: stats.alertas, cor: "#E05A4B", filtroId: "alerta" },
          { label: "Hoje", val: stats.hoje, cor: "#1D9E75", filtroId: "hoje" },
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
        <svg style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", opacity: .4 }} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#e8f0f8" strokeWidth="2" strokeLinecap="round">
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      </div>

      {/* ── LISTA ── */}
      {pacientesFiltrados.length === 0 ? (
        <div style={{ ...card, padding: "48px 24px", textAlign: "center" }}>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,.3)" }}>
            {pacientes.length === 0
              ? "Nenhum paciente cadastrado ainda. Cadastre um novo paciente para começar."
              : "Nenhum paciente encontrado para esse filtro."}
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {pacientesFiltrados.map(p => (
            <div key={p.id} style={{ position: "relative" }}>
              <Link href={`/clinic/paciente/${p.id}`} style={{ textDecoration: "none", display: "block" }}>
                <div
                  style={{ ...card, padding: "18px 20px", cursor: "pointer", transition: "border-color .15s" }}
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
                        <span style={{ fontSize: ".7rem", color: "rgba(138,168,200,.5)" }}>
                          {p.idade > 0 ? `${p.idade} anos · ` : ''}{p.diagnostico}
                        </span>
                        <span style={{
                          fontSize: ".65rem", fontWeight: 700, padding: "2px 8px", borderRadius: 6,
                          background: p.status === "alerta" ? "rgba(224,90,75,.15)" : p.status === "pausado" ? "rgba(239,159,39,.12)" : "rgba(29,158,117,.12)",
                          color: p.status === "alerta" ? "#E05A4B" : p.status === "pausado" ? "#EF9F27" : "#1D9E75",
                          border: `1px solid ${p.status === "alerta" ? "#E05A4B33" : p.status === "pausado" ? "#EF9F2733" : "#1D9E7533"}`,
                        }}>
                          {p.status === "alerta" ? "Atenção" : p.status === "pausado" ? "Pausado" : "Ativo"}
                        </span>
                        {!p.avaliado && (
                          <span style={{ fontSize: ".65rem", fontWeight: 600, padding: "2px 8px", borderRadius: 6, background: "rgba(139,127,232,.12)", color: "#8B7FE8", border: "1px solid rgba(139,127,232,.25)" }}>
                            Aguardando avaliação
                          </span>
                        )}
                      </div>

                      {p.dominios.length > 0 && (
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                          {p.dominios.map(d => (
                            <span key={d} style={{ fontSize: ".65rem", padding: "2px 8px", borderRadius: 5, background: "rgba(55,138,221,.1)", color: "rgba(138,168,200,.8)", border: "1px solid rgba(55,138,221,.2)" }}>{d}</span>
                          ))}
                        </div>
                      )}

                      {p.alertas.slice(0, 2).map((a, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                          <div style={{ width: 5, height: 5, borderRadius: "50%", background: a.nivel === "high" ? "#E05A4B" : a.nivel === "medium" ? "#EF9F27" : "#1D9E75", flexShrink: 0 }} />
                          <span style={{ fontSize: ".72rem", color: "rgba(200,220,240,.6)" }}>{a.texto}</span>
                        </div>
                      ))}
                    </div>

                    {/* Métricas direita */}
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, flexShrink: 0 }}>
                      {p.avaliado ? (
                        <div style={{ fontSize: "1.3rem", fontWeight: 800, color: p.taxaGeral >= 70 ? "#1D9E75" : p.taxaGeral >= 50 ? "#EF9F27" : "#E05A4B" }}>
                          {p.taxaGeral}%
                        </div>
                      ) : (
                        <div style={{ fontSize: ".7rem", fontWeight: 600, color: "rgba(139,127,232,.7)", textAlign: "right", lineHeight: 1.4 }}>
                          Não<br />avaliado
                        </div>
                      )}
                      <div style={{ fontSize: ".65rem", color: "rgba(138,168,200,.4)", textAlign: "right" }}>
                        {p.programasAtivos} programas · {p.sessoesMes} sessões/mês
                      </div>
                      <div style={{ fontSize: ".65rem", color: "rgba(138,168,200,.4)" }}>
                        Última: {p.ultimaSessao}
                      </div>
                      {p.avaliado && (
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
                      )}
                    </div>
                  </div>
                </div>
              </Link>
              <button
                onClick={e => { e.stopPropagation(); setConfirmEncerrar(p); }}
                style={{
                  position: "absolute", top: 10, right: 10,
                  padding: "4px 10px", borderRadius: 6,
                  border: "1px solid rgba(224,90,75,.25)",
                  background: "rgba(13,32,53,.9)",
                  color: "rgba(224,90,75,.6)",
                  fontSize: ".62rem", fontWeight: 600,
                  cursor: "pointer", fontFamily: "var(--font-sans)",
                }}
              >
                Encerrar
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── Modal confirmar encerramento ── */}
      {confirmEncerrar && (
        <div onClick={() => setConfirmEncerrar(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", backdropFilter: "blur(4px)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: "rgba(13,32,53,.97)", border: "1px solid rgba(224,90,75,.3)", borderRadius: 16, padding: 28, width: "100%", maxWidth: 400 }}>
            <div style={{ fontSize: "1rem", fontWeight: 700, color: "#e8f0f8", marginBottom: 8 }}>Encerrar vínculo</div>
            <div style={{ fontSize: ".82rem", color: "rgba(160,200,235,.6)", marginBottom: 6, lineHeight: 1.6 }}>
              Tem certeza que deseja encerrar o vínculo com <strong style={{ color: "#e8f0f8" }}>{confirmEncerrar.nome}</strong>?
            </div>
            <div style={{ fontSize: ".75rem", color: "rgba(160,200,235,.4)", marginBottom: 24, lineHeight: 1.6 }}>
              O paciente será removido da sua lista ativa e não contará no faturamento do próximo mês. O histórico clínico e todas as sessões ficam preservados.
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setConfirmEncerrar(null)}
                style={{ flex: 1, padding: "10px", borderRadius: 9, border: "1px solid rgba(70,120,180,.4)", background: "transparent", color: "rgba(160,200,235,.6)", fontSize: ".8rem", cursor: "pointer", fontFamily: "var(--font-sans)" }}>
                Cancelar
              </button>
              <button onClick={() => encerrarVinculo(confirmEncerrar)}
                disabled={encerrando === confirmEncerrar.id}
                style={{ flex: 1, padding: "10px", borderRadius: 9, border: "none", background: "linear-gradient(135deg,#E05A4B,#c04030)", color: "#fff", fontSize: ".8rem", fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-sans)" }}>
                {encerrando === confirmEncerrar.id ? "Encerrando..." : "Encerrar vínculo"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal vinculação por código ── */}
      {modalVinculo && (
        <div
          onClick={() => { setModalVinculo(false); setMsgVinculo(''); setCodigoConvite(''); }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
        >
          <div onClick={e => e.stopPropagation()} style={{ background: 'rgba(13,32,53,0.97)', border: '1px solid rgba(55,138,221,0.3)', borderRadius: 14, padding: 28, width: '100%', maxWidth: 420, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 500, color: '#e8eef4', marginBottom: 4 }}>Vincular paciente FractaCare</div>
              <div style={{ fontSize: 12, color: 'rgba(232,238,244,.4)', lineHeight: 1.6 }}>
                Peça ao responsável para gerar um código de convite no FractaCare e insira abaixo para vincular o paciente à sua conta.
              </div>
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'rgba(232,238,244,.4)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>Código de convite</label>
              <input
                value={codigoConvite}
                onChange={e => setCodigoConvite(e.target.value.toUpperCase())}
                placeholder="Ex: ABC123"
                maxLength={10}
                style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid rgba(55,138,221,0.3)', background: 'rgba(55,138,221,0.05)', color: '#e8eef4', fontSize: 16, fontFamily: 'monospace', outline: 'none', boxSizing: 'border-box', letterSpacing: '0.15em', textAlign: 'center' }}
              />
            </div>
            {msgVinculo && (
              <div style={{ fontSize: 12, padding: '9px 12px', borderRadius: 8, background: msgVinculo.includes('Erro') || msgVinculo.includes('inválido') || msgVinculo.includes('expirado') ? 'rgba(224,90,75,.08)' : 'rgba(29,158,117,.08)', color: msgVinculo.includes('Erro') || msgVinculo.includes('inválido') || msgVinculo.includes('expirado') ? '#E05A4B' : '#1D9E75', border: `1px solid ${msgVinculo.includes('Erro') || msgVinculo.includes('inválido') || msgVinculo.includes('expirado') ? 'rgba(224,90,75,.2)' : 'rgba(29,158,117,.2)'}` }}>
                {msgVinculo}
              </div>
            )}
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => { setModalVinculo(false); setMsgVinculo(''); setCodigoConvite(''); }}
                style={{ flex: 1, padding: '10px', borderRadius: 9, border: '1px solid rgba(26,58,92,0.5)', background: 'transparent', color: 'rgba(232,238,244,.5)', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}
              >
                Cancelar
              </button>
              <button
                disabled={vinculando || codigoConvite.trim().length < 4}
                onClick={async () => {
                  if (!terapeuta || !codigoConvite.trim()) return
                  setVinculando(true)
                  setMsgVinculo('')
                  try {
                    const { data: convite } = await supabase
                      .from('convites')
                      .select('id, crianca_id, usado, expira_em')
                      .eq('codigo', codigoConvite.trim())
                      .single()
                    if (!convite) { setMsgVinculo('Código inválido. Verifique e tente novamente.'); setVinculando(false); return }
                    if (convite.usado) { setMsgVinculo('Este código já foi utilizado.'); setVinculando(false); return }
                    if (new Date(convite.expira_em) < new Date()) { setMsgVinculo('Este código está expirado. Peça um novo ao responsável.'); setVinculando(false); return }
                    const { data: crianca } = await supabase.from('criancas').select('nome').eq('id', convite.crianca_id).single()
                    await supabase.from('planos').insert({ crianca_id: convite.crianca_id, terapeuta_id: terapeuta.id, status: 'ativo', tipo_plano: 'care' })
                    await supabase.from('convites').update({ usado: true }).eq('id', convite.id)
                    setMsgVinculo(`Paciente ${crianca?.nome ?? ''} vinculado com sucesso!`)
                    setCodigoConvite('')
                    setTimeout(() => { setModalVinculo(false); setMsgVinculo('') }, 1800)
                  } catch { setMsgVinculo('Erro inesperado. Tente novamente.') }
                  setVinculando(false)
                }}
                style={{ flex: 2, padding: '10px', borderRadius: 9, border: 'none', background: codigoConvite.trim().length >= 4 ? '#378ADD' : 'rgba(26,58,92,0.4)', color: codigoConvite.trim().length >= 4 ? '#fff' : 'rgba(232,238,244,.4)', fontSize: 13, fontWeight: 700, cursor: vinculando || codigoConvite.trim().length < 4 ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: vinculando ? 0.7 : 1 }}
              >
                {vinculando ? 'Verificando...' : 'Vincular paciente'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal cadastro FFS ── */}
      {modalFFS && (
        <div onClick={fecharFFS} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'rgba(13,32,53,0.97)', border: '1px solid rgba(26,58,92,0.5)', borderRadius: 14, padding: 28, width: '100%', maxWidth: 480, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 500, color: '#e8eef4', marginBottom: 4 }}>Cadastrar paciente</div>
              <div style={{ fontSize: 12, color: 'rgba(232,238,244,.4)' }}>
                O paciente será cadastrado sem avaliação inicial. O repertório e o radar serão construídos a partir das sessões e avaliações clínicas.
              </div>
            </div>

            {/* Nome */}
            <div>
              <label style={{ fontSize: 11, color: 'rgba(232,238,244,.4)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 5 }}>Nome da criança *</label>
              <input
                value={novoNome}
                onChange={e => setNovoNome(e.target.value)}
                placeholder="Ex: João Silva"
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid rgba(26,58,92,0.5)', background: 'rgba(255,255,255,0.03)', color: '#e8eef4', fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>

            {/* Data de nascimento + Gênero lado a lado */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={{ fontSize: 11, color: 'rgba(232,238,244,.4)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 5 }}>Data de nascimento</label>
                <input
                  type="date"
                  value={novoNasc}
                  onChange={e => setNovoNasc(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid rgba(26,58,92,0.5)', background: 'rgba(255,255,255,0.03)', color: novoNasc ? '#e8eef4' : 'rgba(232,238,244,.3)', fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', colorScheme: 'dark' }}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'rgba(232,238,244,.4)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 5 }}>Gênero</label>
                <select
                  value={novoGenero}
                  onChange={e => setNovoGenero(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid rgba(26,58,92,0.5)', background: 'rgba(13,32,53,0.97)', color: novoGenero ? '#e8eef4' : 'rgba(232,238,244,.3)', fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
                >
                  <option value="">Selecionar</option>
                  <option value="masculino">Masculino</option>
                  <option value="feminino">Feminino</option>
                </select>
              </div>
            </div>

            {/* Diagnóstico */}
            <div>
              <label style={{ fontSize: 11, color: 'rgba(232,238,244,.4)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 5 }}>Diagnóstico</label>
              <input
                value={novoDiag}
                onChange={e => setNovoDiag(e.target.value)}
                placeholder="Ex: TEA nível 1"
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid rgba(26,58,92,0.5)', background: 'rgba(255,255,255,0.03)', color: '#e8eef4', fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>

            {/* Responsável */}
            <div>
              <label style={{ fontSize: 11, color: 'rgba(232,238,244,.4)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 5 }}>Nome do responsável</label>
              <input
                value={novoResp}
                onChange={e => setNovoResp(e.target.value)}
                placeholder="Ex: Maria Silva"
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid rgba(26,58,92,0.5)', background: 'rgba(255,255,255,0.03)', color: '#e8eef4', fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>

            {/* Email responsável */}
            <div>
              <label style={{ fontSize: 11, color: 'rgba(232,238,244,.4)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 5 }}>Email do responsável</label>
              <input
                value={novoEmail}
                onChange={e => setNovoEmail(e.target.value)}
                placeholder="maria@email.com"
                type="email"
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid rgba(26,58,92,0.5)', background: 'rgba(255,255,255,0.03)', color: '#e8eef4', fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>

            {msgFFS && (
              <div style={{ fontSize: 12, padding: '9px 12px', borderRadius: 8, background: msgFFS.includes('Erro') ? 'rgba(224,90,75,.08)' : 'rgba(29,158,117,.08)', color: msgFFS.includes('Erro') ? '#E05A4B' : '#1D9E75', border: `1px solid ${msgFFS.includes('Erro') ? 'rgba(224,90,75,.2)' : 'rgba(29,158,117,.2)'}` }}>
                {msgFFS}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
              <button
                onClick={fecharFFS}
                style={{ flex: 1, padding: '10px', borderRadius: 9, border: '1px solid rgba(26,58,92,0.5)', background: 'transparent', color: 'rgba(232,238,244,.5)', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}
              >
                Cancelar
              </button>
              <button
                disabled={salvando || !novoNome.trim()}
                onClick={async () => {
                  if (!terapeuta || !novoNome.trim()) return
                  setSalvando(true)
                  setMsgFFS('')
                  try {
                    const criancaId = crypto.randomUUID()

                    // 1. Cadastra a criança com dados completos
                    const { error: errCrianca } = await supabase
                      .from('criancas')
                      .insert({
                        id: criancaId,
                        nome: novoNome.trim(),
                        data_nascimento: novoNasc || null,
                        genero: novoGenero || null,
                        diagnostico: novoDiag.trim() || null,
                        ativo: true,
                      })
                    if (errCrianca) { setMsgFFS('Erro ao cadastrar criança: ' + errCrianca.message); setSalvando(false); return }

                    // 2. Cria plano terapêutico
                    const { error: errPlano } = await supabase
                      .from('planos')
                      .insert({ crianca_id: criancaId, terapeuta_id: terapeuta.id, status: 'ativo', tipo_plano: 'ffs' })
                    if (errPlano) { setMsgFFS('Erro ao criar plano: ' + errPlano.message); setSalvando(false); return }

                    // 3. Inicializa variáveis clínicas com estado nao_avaliado
                    // Não cria radar_snapshots — o radar só nasce após avaliação real
                    await supabase
                      .from('variaveis_clinicas')
                      .insert({
                        crianca_id: criancaId,
                        status_repertorio: 'nao_avaliado',
                        assentimento_pct: null,
                        tolerancia_exigencia: null,
                        responsividade_reforco: null,
                        revogacoes_por_sessao: null,
                      })

                    setMsgFFS('Paciente cadastrado com sucesso!')
                    fecharFFS()
                    // Recarrega a lista
                    setTimeout(() => window.location.reload(), 1200)
                  } catch { setMsgFFS('Erro inesperado. Tente novamente.') }
                  setSalvando(false)
                }}
                style={{ flex: 2, padding: '10px', borderRadius: 9, border: 'none', background: novoNome.trim() ? 'linear-gradient(135deg,#1D9E75,#0f8f7a)' : 'rgba(26,58,92,0.4)', color: novoNome.trim() ? '#07111f' : 'rgba(232,238,244,.4)', fontSize: 13, fontWeight: 700, cursor: salvando || !novoNome.trim() ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: salvando ? 0.7 : 1 }}
              >
                {salvando ? 'Cadastrando...' : 'Cadastrar paciente'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
