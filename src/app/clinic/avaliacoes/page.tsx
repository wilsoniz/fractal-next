"use client";

import { supabase } from "@/lib/supabase";
import { useState, useMemo, useEffect, useCallback } from "react";
import { useClinicContext, useAcesso } from "../layout";

// ─── TIPOS ───────────────────────────────────────────────────────────────────
type TabAval    = "protocolos" | "analise-funcional" | "historico";
type TipoAF     = "indireta" | "descritiva" | "experimental";
type StatusAval = "nao_iniciada" | "em_andamento" | "concluida";
type FuncaoComport = "atencao" | "fuga" | "tangivel" | "automatica" | "indefinida";

interface Protocolo {
  id: string;
  nome: string;
  sigla: string;
  descricao: string;
  faixaEtaria: string;
  tempoMedio: string;
  cor: string;
  icone: string;
  disponivel: boolean;
  dominios: DominioProtocolo[];
}

interface DominioProtocolo {
  id: string;
  nome: string;
  descricao: string;
  dominio_radar: string | null;
  itens: ItemAvaliacao[];
}

interface ItemAvaliacao {
  id: string;
  codigo: string;
  descricao: string;
  criterio: string;
  pontuacao_max: number;
  pontuacao_valores: number[];
  ordem: number;
}

interface SessaoAtiva {
  id: string;
  protocolo_id: string;
  crianca_id: string;
  status: string;
}

interface RespostaLocal {
  [item_id: string]: number;
}

interface RegistroABC {
  id: string;
  horario: string;
  antecedente: string;
  comportamento: string;
  consequencia: string;
  duracao: string;
  intensidade: "leve" | "moderada" | "intensa";
}

interface CondicaoExperimental {
  id: string;
  nome: string;
  cor: string;
  descricao: string;
  registros: number[];
}

// ─── MOCK AF (mantido estático por ora) ──────────────────────────────────────
const REGISTROS_ABC: RegistroABC[] = [
  { id: "abc1", horario: "09:12", antecedente: "Solicitação de tarefa acadêmica (pareamento de figuras)", comportamento: "Jogou o material no chão e vocalizou loudly", consequencia: "Terapeuta removeu o material e aguardou 30s", duracao: "45s", intensidade: "moderada" },
  { id: "abc2", horario: "09:28", antecedente: "Transição de atividade (fim do NET)", comportamento: "Birra com choro e tentativa de fuga da cadeira", consequencia: "Terapeuta manteve instrução com suporte físico parcial", duracao: "2min", intensidade: "intensa" },
  { id: "abc3", horario: "09:45", antecedente: "Acesso a reforçador preferido foi encerrado", comportamento: "Autolesão leve (bater mãos na cabeça, 3x)", consequencia: "Terapeuta bloqueou sem atenção verbal, redirecionou", duracao: "15s", intensidade: "leve" },
  { id: "abc4", horario: "10:02", antecedente: "Sem instrução — período de pausa", comportamento: "Estereotipia motora (balançar o corpo) por período prolongado", consequencia: "Sem consequência externa", duracao: "3min", intensidade: "leve" },
];

const CONDICOES_EXPERIMENTAIS: CondicaoExperimental[] = [
  { id: "atencao",  nome: "Atenção",  cor: "#378ADD", descricao: "Atenção contingente ao comportamento-alvo",          registros: [2,3,4,3,5,4,6,5,4,3] },
  { id: "fuga",     nome: "Fuga",     cor: "#E05A4B", descricao: "Remoção de demanda contingente ao comportamento",    registros: [8,9,7,10,9,8,11,9,10,8] },
  { id: "tangivel", nome: "Tangível", cor: "#EF9F27", descricao: "Acesso a item preferido contingente ao comportamento",registros: [3,2,3,4,2,3,2,3,2,3] },
  { id: "controle", nome: "Controle", cor: "#1D9E75", descricao: "Acesso livre a reforçadores, sem demandas",          registros: [1,0,1,1,0,1,0,0,1,0] },
];

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const STATUS_AVAL: Record<StatusAval, { label: string; cor: string; bg: string }> = {
  nao_iniciada: { label: "Não iniciada", cor: "rgba(170,210,245,.88)", bg: "rgba(26,58,92,.2)"  },
  em_andamento: { label: "Em andamento", cor: "#EF9F27",              bg: "rgba(239,159,39,.1)" },
  concluida:    { label: "Concluída",    cor: "#1D9E75",              bg: "rgba(29,158,117,.1)" },
};

const FUNCAO_CONFIG: Record<FuncaoComport, { label: string; cor: string; descricao: string }> = {
  atencao:    { label: "Atenção social",    cor: "#378ADD", descricao: "Comportamento mantido por atenção de outras pessoas" },
  fuga:       { label: "Fuga/Esquiva",      cor: "#E05A4B", descricao: "Comportamento mantido pela remoção de estímulos aversivos" },
  tangivel:   { label: "Acesso a tangível", cor: "#EF9F27", descricao: "Comportamento mantido por acesso a objetos/atividades" },
  automatica: { label: "Automática",        cor: "#8B7FE8", descricao: "Comportamento mantido por estimulação sensorial intrínseca" },
  indefinida: { label: "Indefinida",        cor: "rgba(160,200,235,.84)", descricao: "Função não determinada — mais dados necessários" },
};

const ICONES: Record<string, string> = {
  vbmapp: "🗣", peak: "🔗", ablls: "📋", afls: "🏠",
};

function funcaoIdentificada(condicoes: CondicaoExperimental[]): FuncaoComport {
  const maxima = condicoes.reduce((a, b) =>
    b.registros.reduce((s, n) => s + n, 0) > a.registros.reduce((s, n) => s + n, 0) ? b : a
  );
  const mediaMaxima = maxima.registros.reduce((s, n) => s + n, 0) / maxima.registros.length;
  const mediaControle = (condicoes.find(c => c.id === "controle")?.registros.reduce((s, n) => s + n, 0) ?? 0) / 10;
  if (mediaMaxima < mediaControle * 1.5) return "indefinida";
  const map: Record<string, FuncaoComport> = { fuga: "fuga", atencao: "atencao", tangivel: "tangivel", controle: "automatica" };
  return map[maxima.id] ?? "indefinida";
}

// ─── PAGE ────────────────────────────────────────────────────────────────────
export default function AvaliacoesPage() {
  const { terapeuta } = useClinicContext();
  const acesso = useAcesso();

  const [tab,           setTab]           = useState<TabAval>("protocolos");
  const [tipoAF,        setTipoAF]        = useState<TipoAF>("indireta");
  const [protocolos,    setProtocolos]    = useState<Protocolo[]>([]);
  const [protocoloSel,  setProtocoloSel]  = useState<Protocolo | null>(null);
  const [pacienteSel,   setPacienteSel]   = useState<string>("");
  const [pacientesAval, setPacientesAval] = useState<{ id: string; nome: string }[]>([]);
  const [sessaoAtiva,   setSessaoAtiva]   = useState<SessaoAtiva | null>(null);
  const [respostas,     setRespostas]     = useState<RespostaLocal>({});
  const [dominioAtivo,  setDominioAtivo]  = useState<string>("");
  const [busca,         setBusca]         = useState("");
  const [salvando,      setSalvando]      = useState<string | null>(null);
  const [historico,     setHistorico]     = useState<any[]>([]);
  const [abcNovo,       setAbcNovo]       = useState({ ant: "", comp: "", cons: "", dur: "", int: "moderada" as const });
  const [loading,       setLoading]       = useState(true);

  // ── Carregar protocolos do banco ─────────────────────────────────────────
  useEffect(() => {
    async function carregarProtocolos() {
      const { data: prots } = await supabase
        .from("avaliacao_protocolos")
        .select(`
          id, nome, sigla, descricao, faixa_etaria, duracao_estimada, cor, icone, ativo,
          avaliacao_dominios (
            id, nome, descricao, dominio_radar, ordem,
            avaliacao_itens ( id, codigo, descricao, criterio, pontuacao_max, pontuacao_valores, ordem )
          )
        `)
        .eq("ativo", true)
        .order("criado_em");

      if (prots) {
        const formatados: Protocolo[] = prots.map((p: any) => ({
          id: p.id,
          nome: p.nome,
          sigla: p.sigla,
          descricao: p.descricao,
          faixaEtaria: p.faixa_etaria,
          tempoMedio: p.duracao_estimada,
          cor: p.cor ?? "#1D9E75",
          icone: ICONES[p.icone ?? ""] ?? "📋",
          disponivel: true,
          dominios: (p.avaliacao_dominios ?? [])
            .sort((a: any, b: any) => a.ordem - b.ordem)
            .map((d: any) => ({
              id: d.id,
              nome: d.nome,
              descricao: d.descricao,
              dominio_radar: d.dominio_radar,
              itens: (d.avaliacao_itens ?? []).sort((a: any, b: any) => a.ordem - b.ordem).map((i: any) => ({
                id: i.id,
                codigo: i.codigo,
                descricao: i.descricao,
                criterio: i.criterio,
                pontuacao_max: i.pontuacao_max,
                pontuacao_valores: i.pontuacao_valores ?? [0, 1],
                ordem: i.ordem,
              })),
            })),
        }));
        setProtocolos(formatados);
      }
    }
    carregarProtocolos();
  }, []);

  // ── Carregar pacientes e histórico ───────────────────────────────────────
  useEffect(() => {
    if (!terapeuta) return;
    async function carregar() {
      setLoading(true);
      const { data: planos } = await supabase
        .from("planos")
        .select("criancas ( id, nome )")
        .eq("terapeuta_id", terapeuta!.id)
        .eq("status", "ativo");

      if (planos) {
        const map = new Map<string, string>();
        for (const pl of planos) {
          const c = (pl as any).criancas as any;
          if (c && !map.has(c.id)) map.set(c.id, c.nome);
        }
        const lista = Array.from(map.entries()).map(([id, nome]) => ({ id, nome }));
        setPacientesAval(lista);
        if (lista.length > 0) setPacienteSel(lista[0].id);
      }

      const { data: hist } = await supabase
        .from("avaliacoes_sessoes")
        .select(`
          id, status, iniciada_em, concluida_em,
          avaliacao_protocolos ( sigla, cor ),
          criancas ( nome )
        `)
        .order("iniciada_em", { ascending: false })
        .limit(20);

      if (hist) setHistorico(hist);
      setLoading(false);
    }
    carregar();
  }, [terapeuta]);

  // ── Iniciar ou retomar sessão de avaliação ───────────────────────────────
  const iniciarSessao = useCallback(async () => {
    if (!terapeuta || !protocoloSel || !pacienteSel) return;

    // Verifica se já existe sessão em andamento
    const { data: existente } = await supabase
      .from("avaliacoes_sessoes")
      .select("id, protocolo_id, crianca_id, status")
      .eq("crianca_id", pacienteSel)
      .eq("protocolo_id", protocoloSel.id)
      .eq("status", "em_andamento")
      .single();

    let sessaoId: string;

    if (existente) {
      sessaoId = existente.id;
      setSessaoAtiva(existente as SessaoAtiva);
    } else {
      const { data: nova } = await supabase
        .from("avaliacoes_sessoes")
        .insert({
          crianca_id:   pacienteSel,
          terapeuta_id: terapeuta.id,
          protocolo_id: protocoloSel.id,
          status:       "em_andamento",
        })
        .select("id, protocolo_id, crianca_id, status")
        .single();

      if (!nova) return;
      sessaoId = nova.id;
      setSessaoAtiva(nova as SessaoAtiva);
    }

    // Carrega respostas já registradas
    const { data: resps } = await supabase
      .from("avaliacoes_respostas")
      .select("item_id, pontuacao")
      .eq("sessao_id", sessaoId);

    if (resps) {
      const map: RespostaLocal = {};
      for (const r of resps) map[r.item_id] = r.pontuacao;
      setRespostas(map);
    }

    // Ativa primeiro domínio
    if (protocoloSel.dominios.length > 0) {
      setDominioAtivo(protocoloSel.dominios[0].id);
    }
  }, [terapeuta, protocoloSel, pacienteSel]);

  // ── Registrar resposta ───────────────────────────────────────────────────
  const registrarResposta = useCallback(async (item_id: string, pontuacao: number) => {
    if (!sessaoAtiva) return;
    setSalvando(item_id);

    setRespostas(prev => ({ ...prev, [item_id]: pontuacao }));

    // Upsert — se já existe atualiza, senão insere
    const { data: existente } = await supabase
      .from("avaliacoes_respostas")
      .select("id")
      .eq("sessao_id", sessaoAtiva.id)
      .eq("item_id", item_id)
      .single();

    if (existente) {
      await supabase
        .from("avaliacoes_respostas")
        .update({ pontuacao })
        .eq("id", existente.id);
    } else {
      await supabase
        .from("avaliacoes_respostas")
        .insert({
          sessao_id:  sessaoAtiva.id,
          item_id,
          crianca_id: sessaoAtiva.crianca_id,
          pontuacao,
        });
    }

    setTimeout(() => setSalvando(null), 600);
  }, [sessaoAtiva]);

  // ── Concluir sessão ──────────────────────────────────────────────────────
  const concluirSessao = useCallback(async () => {
    if (!sessaoAtiva) return;
    await supabase
      .from("avaliacoes_sessoes")
      .update({ status: "concluida", concluida_em: new Date().toISOString() })
      .eq("id", sessaoAtiva.id);
    setSessaoAtiva(null);
    setRespostas({});
    setProtocoloSel(null);
  }, [sessaoAtiva]);

  const funcaoIdent = useMemo(() => funcaoIdentificada(CONDICOES_EXPERIMENTAIS), []);
  const fc = FUNCAO_CONFIG[funcaoIdent];

  // Itens filtrados do domínio ativo
  const dominioAtivoObj = protocoloSel?.dominios.find(d => d.id === dominioAtivo);
  const itensFiltrados = useMemo(() => {
    if (!dominioAtivoObj) return [];
    if (!busca.trim()) return dominioAtivoObj.itens;
    const b = busca.toLowerCase();
    return dominioAtivoObj.itens.filter(i =>
      i.codigo?.toLowerCase().includes(b) || i.descricao.toLowerCase().includes(b)
    );
  }, [dominioAtivoObj, busca]);

  // Progresso por domínio
  const progressoPorDominio = useMemo(() => {
    if (!protocoloSel) return {};
    const map: Record<string, { respondidos: number; total: number; soma: number }> = {};
    for (const d of protocoloSel.dominios) {
      const respondidos = d.itens.filter(i => respostas[i.id] !== undefined);
      map[d.id] = {
        respondidos: respondidos.length,
        total: d.itens.length,
        soma: respondidos.reduce((acc, i) => acc + (respostas[i.id] ?? 0), 0),
      };
    }
    return map;
  }, [protocoloSel, respostas]);

  const card: React.CSSProperties = { background: "rgba(13,32,53,.75)", border: "1px solid rgba(70,120,180,.5)", borderRadius: 14, backdropFilter: "blur(8px)" };
  const lbl:  React.CSSProperties = { fontSize: ".6rem", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: ".09em", color: "rgba(170,210,245,.88)", marginBottom: 8 };
  const inp:  React.CSSProperties = { background: "rgba(20,55,110,.55)", border: "1px solid rgba(26,58,92,.6)", borderRadius: 8, padding: "9px 12px", color: "#e8f0f8", fontFamily: "var(--font-sans)", fontSize: ".82rem", outline: "none", width: "100%", boxSizing: "border-box" as const };

  const TABS = [
    { id: "protocolos"        as TabAval, label: "Protocolos"        },
    { id: "analise-funcional" as TabAval, label: "Análise Funcional" },
    { id: "historico"         as TabAval, label: "Histórico"         },
  ];

  // ── TELA DE APLICAÇÃO DE ITENS ───────────────────────────────────────────
  if (protocoloSel && sessaoAtiva) {
    const paciente = pacientesAval.find(p => p.id === pacienteSel);
    const totalRespondidos = Object.keys(respostas).length;
    const totalItens = protocoloSel.dominios.reduce((acc, d) => acc + d.itens.length, 0);

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 0, height: "calc(100vh - 120px)" }}>

        {/* Header fixo */}
        <div style={{ ...card, padding: "14px 20px", marginBottom: 14, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, borderLeft: `3px solid ${protocoloSel.cor}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button onClick={() => { setSessaoAtiva(null); setRespostas({}); }} style={{ background: "none", border: "none", color: "rgba(160,200,235,.7)", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", gap: 4, fontFamily: "var(--font-sans)", fontSize: ".75rem" }}>
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 3L5 8l5 5"/></svg>
              Voltar
            </button>
            <div style={{ width: 1, height: 20, background: "rgba(26,58,92,.5)" }} />
            <div>
              <span style={{ fontSize: ".9rem", fontWeight: 800, color: protocoloSel.cor }}>{protocoloSel.sigla}</span>
              <span style={{ fontSize: ".72rem", color: "rgba(160,200,235,.7)", marginLeft: 8 }}>— {paciente?.nome}</span>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: ".65rem", color: "rgba(170,210,245,.88)" }}>{totalRespondidos} de {totalItens} itens</div>
              <div style={{ width: 120, height: 4, background: "rgba(26,58,92,.5)", borderRadius: 2, marginTop: 3, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${totalItens > 0 ? (totalRespondidos / totalItens) * 100 : 0}%`, background: protocoloSel.cor, transition: "width .3s" }} />
              </div>
            </div>
            <button
              onClick={concluirSessao}
              style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "linear-gradient(135deg,#1D9E75,#0f8f7a)", color: "#07111f", fontFamily: "var(--font-sans)", fontWeight: 700, fontSize: ".78rem", cursor: "pointer" }}
            >
              Concluir
            </button>
          </div>
        </div>

        <div style={{ display: "flex", gap: 14, flex: 1, minHeight: 0 }}>

          {/* Sidebar de domínios */}
          <div style={{ width: 200, flexShrink: 0, display: "flex", flexDirection: "column", gap: 4, overflowY: "auto" }}>
            {protocoloSel.dominios.map(d => {
              const prog = progressoPorDominio[d.id];
              const ativo = dominioAtivo === d.id;
              return (
                <button
                  key={d.id}
                  onClick={() => { setDominioAtivo(d.id); setBusca(""); }}
                  style={{
                    padding: "10px 12px", borderRadius: 9, border: `1px solid ${ativo ? protocoloSel.cor + "55" : "rgba(26,58,92,.4)"}`,
                    background: ativo ? protocoloSel.cor + "15" : "rgba(13,32,53,.5)",
                    cursor: "pointer", textAlign: "left", fontFamily: "var(--font-sans)",
                    transition: "all .15s",
                  }}
                >
                  <div style={{ fontSize: ".78rem", fontWeight: ativo ? 700 : 400, color: ativo ? protocoloSel.cor : "#e8f0f8", marginBottom: 4 }}>{d.nome}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ flex: 1, height: 3, background: "rgba(26,58,92,.5)", borderRadius: 2, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${prog ? (prog.respondidos / prog.total) * 100 : 0}%`, background: protocoloSel.cor, transition: "width .3s" }} />
                    </div>
                    <span style={{ fontSize: ".58rem", color: "rgba(170,210,245,.88)", flexShrink: 0 }}>{prog?.respondidos ?? 0}/{prog?.total ?? 0}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Lista de itens */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10, overflowY: "auto", minHeight: 0 }}>

            {/* Busca */}
            <div style={{ position: "relative", flexShrink: 0 }}>
              <input
                value={busca}
                onChange={e => setBusca(e.target.value)}
                placeholder="Buscar por código ou descrição..."
                style={{ ...inp, paddingLeft: 34 }}
              />
              <svg style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", opacity: .4 }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#e8f0f8" strokeWidth="2" strokeLinecap="round">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </div>

            {/* Info do domínio */}
            {dominioAtivoObj && (
              <div style={{ padding: "10px 14px", background: "rgba(26,58,92,.2)", borderRadius: 9, border: "1px solid rgba(26,58,92,.4)", flexShrink: 0 }}>
                <div style={{ fontSize: ".75rem", fontWeight: 700, color: "#e8f0f8", marginBottom: 2 }}>{dominioAtivoObj.nome}</div>
                {dominioAtivoObj.descricao && (
                  <div style={{ fontSize: ".68rem", color: "rgba(160,200,235,.7)" }}>{dominioAtivoObj.descricao}</div>
                )}
              </div>
            )}

            {/* Itens */}
            {itensFiltrados.map(item => {
              const resposta = respostas[item.id];
              const respondido = resposta !== undefined;
              const salvandoEste = salvando === item.id;

              return (
                <div
                  key={item.id}
                  style={{
                    ...card,
                    padding: "14px 16px",
                    border: respondido
                      ? `1px solid ${protocoloSel.cor}44`
                      : "1px solid rgba(70,120,180,.3)",
                    background: respondido ? `${protocoloSel.cor}08` : "rgba(13,32,53,.75)",
                    transition: "all .15s",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                    <div style={{ flexShrink: 0, minWidth: 36 }}>
                      <span style={{ fontSize: ".68rem", fontWeight: 800, color: protocoloSel.cor, fontFamily: "monospace" }}>{item.codigo}</span>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: ".82rem", color: "#e8f0f8", lineHeight: 1.5, marginBottom: 4 }}>{item.descricao}</div>
                      {item.criterio && (
                        <div style={{ fontSize: ".68rem", color: "rgba(160,200,235,.5)", lineHeight: 1.5, marginBottom: 10 }}>
                          Critério: {item.criterio}
                        </div>
                      )}

                      {/* Botões de pontuação */}
                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <span style={{ fontSize: ".6rem", color: "rgba(170,210,245,.88)", marginRight: 4 }}>Pontuação:</span>
                        {item.pontuacao_valores.map(val => {
                          const selecionado = resposta === val;
                          const cor = val === 0 ? "#E05A4B" : val === item.pontuacao_max ? "#1D9E75" : "#EF9F27";
                          return (
                            <button
                              key={val}
                              onClick={() => registrarResposta(item.id, val)}
                              style={{
                                width: 44, height: 34, borderRadius: 7,
                                border: `1px solid ${selecionado ? cor : "rgba(26,58,92,.5)"}`,
                                background: selecionado ? cor + "22" : "rgba(26,58,92,.2)",
                                color: selecionado ? cor : "rgba(160,200,235,.6)",
                                fontFamily: "monospace", fontWeight: selecionado ? 800 : 400,
                                fontSize: ".82rem", cursor: "pointer",
                                transition: "all .12s",
                              }}
                            >
                              {val}
                            </button>
                          );
                        })}
                        {salvandoEste && (
                          <span style={{ fontSize: ".62rem", color: "#1D9E75", marginLeft: 6 }}>Salvo</span>
                        )}
                        {respondido && !salvandoEste && (
                          <span style={{ fontSize: ".62rem", color: "rgba(160,200,235,.35)", marginLeft: 6 }}>
                            {resposta === item.pontuacao_max ? "Completo" : resposta === 0 ? "Não emite" : "Emergente"}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {itensFiltrados.length === 0 && (
              <div style={{ textAlign: "center", padding: "32px 0", color: "rgba(160,200,235,.3)", fontSize: ".82rem" }}>
                {dominioAtivoObj?.itens.length === 0
                  ? "Itens deste domínio ainda não foram cadastrados no sistema."
                  : "Nenhum item encontrado para essa busca."}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── TELA DE SELEÇÃO DE PROTOCOLO (antes de iniciar) ──────────────────────
  if (protocoloSel && !sessaoAtiva) {
    const p = protocoloSel;
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <button onClick={() => setProtocoloSel(null)} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: "rgba(160,200,235,.90)", cursor: "pointer", fontFamily: "var(--font-sans)", fontSize: ".78rem", padding: 0, alignSelf: "flex-start" }}>
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 3L5 8l5 5"/></svg>
          Voltar
        </button>

        <div style={{ ...card, padding: 24, borderLeft: `3px solid ${p.cor}` }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 20 }}>
            <span style={{ fontSize: 36 }}>{p.icone}</span>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                <h1 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#e8f0f8", margin: 0 }}>{p.sigla}</h1>
                <span style={{ fontSize: ".68rem", color: "rgba(160,200,235,.84)" }}>{p.faixaEtaria}</span>
                <span style={{ fontSize: ".68rem", color: "rgba(160,200,235,.84)" }}>~{p.tempoMedio}</span>
              </div>
              <div style={{ fontSize: ".82rem", color: "rgba(160,200,235,.90)", lineHeight: 1.65, marginBottom: 6 }}>{p.nome}</div>
              <div style={{ fontSize: ".78rem", color: "rgba(160,200,235,.84)", lineHeight: 1.6 }}>{p.descricao}</div>
            </div>
          </div>

          {/* Selecionar paciente */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ ...lbl }}>Aplicar para qual paciente?</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {pacientesAval.length === 0 ? (
                <div style={{ fontSize: ".75rem", color: "rgba(255,255,255,.3)" }}>Nenhum paciente vinculado</div>
              ) : pacientesAval.map(pac => (
                <button
                  key={pac.id}
                  onClick={() => setPacienteSel(pac.id)}
                  style={{
                    padding: "8px 14px", borderRadius: 9,
                    border: `1px solid ${pacienteSel === pac.id ? p.cor + "55" : "rgba(70,120,180,.5)"}`,
                    background: pacienteSel === pac.id ? p.cor + "15" : "rgba(26,58,92,.25)",
                    color: pacienteSel === pac.id ? p.cor : "rgba(160,200,235,.92)",
                    fontFamily: "var(--font-sans)", fontSize: ".75rem", fontWeight: pacienteSel === pac.id ? 700 : 400,
                    cursor: "pointer",
                  }}
                >
                  {pac.nome.split(" ")[0]}
                </button>
              ))}
            </div>
          </div>

          {/* Domínios */}
          <div style={{ ...lbl }}>Domínios da avaliação</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 10, marginBottom: 20 }}>
            {p.dominios.map(d => (
              <div key={d.id} style={{ padding: "12px 14px", background: "rgba(26,58,92,.25)", borderRadius: 10, border: `1px solid ${p.cor}22` }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: ".78rem", fontWeight: 600, color: "#e8f0f8" }}>{d.nome}</span>
                  <span style={{ fontSize: ".65rem", color: "rgba(170,210,245,.88)" }}>{d.itens.length} itens</span>
                </div>
                <div style={{ height: 4, background: "rgba(26,58,92,.5)", borderRadius: 2, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: "0%", background: p.cor }} />
                </div>
                <div style={{ fontSize: ".62rem", color: "rgba(165,208,242,.85)", marginTop: 4 }}>Não iniciado</div>
              </div>
            ))}
          </div>

          <button
            onClick={iniciarSessao}
            disabled={!pacienteSel}
            style={{ width: "100%", padding: 14, borderRadius: 10, border: "none", background: pacienteSel ? `linear-gradient(135deg,${p.cor},${p.cor}99)` : "rgba(26,58,92,.4)", color: pacienteSel ? "#07111f" : "rgba(160,200,235,.3)", fontFamily: "var(--font-sans)", fontWeight: 800, fontSize: ".9rem", cursor: pacienteSel ? "pointer" : "not-allowed" }}
          >
            Iniciar avaliação {p.sigla} →
          </button>
        </div>
      </div>
    );
  }

  // ── TELA PRINCIPAL ────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: "1.2rem", fontWeight: 800, color: "#e8f0f8", margin: 0, marginBottom: 4 }}>Avaliações</h1>
          <div style={{ fontSize: ".72rem", color: "rgba(160,200,235,.84)" }}>Protocolos padronizados · Análise Funcional · Histórico clínico</div>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 10 }}>
        {[
          { l: "Avaliações concluídas", v: historico.filter((a: any) => a.status === "concluida").length,    c: "#1D9E75" },
          { l: "Em andamento",          v: historico.filter((a: any) => a.status === "em_andamento").length, c: "#EF9F27" },
          { l: "Protocolos disponíveis",v: protocolos.length,                                                c: "#378ADD" },
          { l: "AFs realizadas",        v: 0,                                                                c: "#8B7FE8" },
        ].map(k => (
          <div key={k.l} style={{ ...card, padding: "14px 16px" }}>
            <div style={{ fontSize: ".58rem", color: "rgba(170,210,245,.88)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 6 }}>{k.l}</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 800, color: k.c }}>{k.v}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid rgba(26,58,92,.4)" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: "10px 18px", background: "none", border: "none",
            borderBottom: `2px solid ${tab === t.id ? "#1D9E75" : "transparent"}`,
            color: tab === t.id ? "#1D9E75" : "rgba(160,200,235,.84)",
            fontFamily: "var(--font-sans)", fontWeight: tab === t.id ? 600 : 400,
            fontSize: ".82rem", cursor: "pointer", marginBottom: -1,
          }}>{t.label}</button>
        ))}
      </div>

      {/* ── PROTOCOLOS ── */}
      {tab === "protocolos" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: "32px 0", color: "rgba(160,200,235,.5)", fontSize: ".82rem" }}>Carregando protocolos...</div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 14 }}>
              {protocolos.map(p => (
                <div key={p.id} style={{ ...card, display: "flex", flexDirection: "column", border: `1px solid ${p.cor}33` }}>
                  <div style={{ height: 4, background: p.cor, borderRadius: "14px 14px 0 0" }} />
                  <div style={{ padding: 18, flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                      <span style={{ fontSize: 28, flexShrink: 0 }}>{p.icone}</span>
                      <div>
                        <div style={{ fontSize: "1rem", fontWeight: 800, color: p.cor, marginBottom: 3 }}>{p.sigla}</div>
                        <div style={{ fontSize: ".7rem", color: "rgba(160,200,235,.84)", lineHeight: 1.4 }}>{p.nome}</div>
                      </div>
                    </div>
                    <div style={{ fontSize: ".75rem", color: "rgba(160,200,235,.90)", lineHeight: 1.55 }}>{p.descricao.slice(0, 110)}...</div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontSize: ".62rem", color: "rgba(170,210,245,.88)", background: "rgba(20,55,110,.55)", borderRadius: 20, padding: "2px 8px" }}>{p.faixaEtaria}</span>
                      <span style={{ fontSize: ".62rem", color: "rgba(170,210,245,.88)", background: "rgba(20,55,110,.55)", borderRadius: 20, padding: "2px 8px" }}>⏱ {p.tempoMedio}</span>
                      <span style={{ fontSize: ".62rem", color: "rgba(170,210,245,.88)", background: "rgba(20,55,110,.55)", borderRadius: 20, padding: "2px 8px" }}>{p.dominios.length} domínios</span>
                    </div>
                    <div style={{ display: "flex", gap: 3 }}>
                      {p.dominios.map(d => (
                        <div key={d.id} style={{ flex: 1, height: 4, background: p.cor, borderRadius: 2, opacity: .6 }} title={d.nome} />
                      ))}
                    </div>
                    <button
                      onClick={() => setProtocoloSel(p)}
                      style={{ marginTop: "auto", padding: "9px", borderRadius: 8, border: "none", background: `${p.cor}22`, color: p.cor, fontFamily: "var(--font-sans)", fontWeight: 700, fontSize: ".78rem", cursor: "pointer" }}
                    >
                      Aplicar {p.sigla} →
                    </button>
                  </div>
                </div>
              ))}

              {/* Card AFLS em breve */}
              <div style={{ ...card, display: "flex", flexDirection: "column", border: "1px solid rgba(26,58,92,.4)", opacity: 0.6 }}>
                <div style={{ height: 4, background: "rgba(26,58,92,.5)", borderRadius: "14px 14px 0 0" }} />
                <div style={{ padding: 18, flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <span style={{ fontSize: 28 }}>🏠</span>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                        <span style={{ fontSize: "1rem", fontWeight: 800, color: "#EF9F27" }}>AFLS</span>
                        <span style={{ fontSize: ".6rem", color: "rgba(170,210,245,.88)", background: "rgba(20,55,110,.55)", borderRadius: 20, padding: "1px 7px" }}>Em breve</span>
                      </div>
                      <div style={{ fontSize: ".7rem", color: "rgba(160,200,235,.84)" }}>Assessment of Functional Living Skills</div>
                    </div>
                  </div>
                  <div style={{ fontSize: ".75rem", color: "rgba(160,200,235,.90)", lineHeight: 1.55 }}>Avaliação de habilidades funcionais de vida independente. Foco em autocuidado, habilidades domésticas...</div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <span style={{ fontSize: ".62rem", color: "rgba(170,210,245,.88)", background: "rgba(20,55,110,.55)", borderRadius: 20, padding: "2px 8px" }}>5+ anos</span>
                    <span style={{ fontSize: ".62rem", color: "rgba(170,210,245,.88)", background: "rgba(20,55,110,.55)", borderRadius: 20, padding: "2px 8px" }}>4 domínios</span>
                  </div>
                  <div style={{ marginTop: "auto", padding: "9px", borderRadius: 8, background: "rgba(26,58,92,.2)", color: "rgba(165,208,242,.85)", fontFamily: "var(--font-sans)", fontWeight: 600, fontSize: ".78rem", textAlign: "center" }}>Em breve</div>
                </div>
              </div>
            </div>
          )}

          <div style={{ ...card, padding: 16, border: "1px solid rgba(55,138,221,.2)", background: "rgba(55,138,221,.04)", display: "flex", alignItems: "center", gap: 12 }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#378ADD" strokeWidth="1.5"><circle cx="8" cy="8" r="6"/><path d="M8 7v4M8 5h.01"/></svg>
            <span style={{ fontSize: ".75rem", color: "rgba(160,200,235,.92)" }}>
              Os protocolos serão expandidos com os itens completos conforme o material clínico for integrado. Por enquanto, a estrutura de domínios já permite iniciar e registrar avaliações.
            </span>
          </div>
        </div>
      )}

      {/* ── ANÁLISE FUNCIONAL ── */}
      {tab === "analise-funcional" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", gap: 0, ...card, padding: 4, borderRadius: 12, alignSelf: "flex-start" }}>
            {([
              { id: "indireta"     as TipoAF, label: "Indireta",     sub: "Via FractaCare" },
              { id: "descritiva"   as TipoAF, label: "Descritiva",   sub: "ABC em sessão"  },
              { id: "experimental" as TipoAF, label: "Experimental", sub: "Condições ctrl" },
            ]).map(t => (
              <button key={t.id} onClick={() => setTipoAF(t.id)} style={{
                padding: "8px 18px", borderRadius: 9, border: "none",
                background: tipoAF === t.id ? "rgba(29,158,117,.2)" : "transparent",
                cursor: "pointer", fontFamily: "var(--font-sans)",
              }}>
                <div style={{ fontSize: ".78rem", fontWeight: tipoAF === t.id ? 700 : 400, color: tipoAF === t.id ? "#1D9E75" : "rgba(160,200,235,.84)" }}>{t.label}</div>
                <div style={{ fontSize: ".6rem", color: "rgba(165,208,242,.85)", marginTop: 2 }}>{t.sub}</div>
              </button>
            ))}
          </div>

          {tipoAF === "indireta" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ ...card, padding: 20, border: "1px solid rgba(55,138,221,.2)", background: "rgba(55,138,221,.04)" }}>
                <div style={{ fontSize: ".62rem", color: "#378ADD", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".09em", marginBottom: 10 }}>Como funciona a AF Indireta</div>
                <div style={{ fontSize: ".8rem", color: "rgba(160,200,235,.92)", lineHeight: 1.7 }}>
                  O formulário é enviado ao responsável via <strong style={{ color: "#378ADD" }}>FractaCare</strong>. A família responde sobre antecedentes, consequências e contextos associados ao comportamento-alvo em casa. As respostas voltam automaticamente para este painel.
                </div>
              </div>
              <div style={{ ...card, padding: 20 }}>
                <div style={{ ...lbl }}>Instrumentos disponíveis</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {[
                    { sigla: "MAS",  nome: "Motivation Assessment Scale",        itens: 16, cor: "#1D9E75", descricao: "Avalia motivação por atenção, fuga, tangível e sensorial" },
                    { sigla: "FAST", nome: "Functional Analysis Screening Tool", itens: 27, cor: "#378ADD", descricao: "Triagem das possíveis funções do comportamento" },
                    { sigla: "FAI",  nome: "Functional Assessment Interview",    itens: 11, cor: "#8B7FE8", descricao: "Entrevista estruturada sobre antecedentes e consequências" },
                  ].map(inst => (
                    <div key={inst.sigla} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: "rgba(26,58,92,.2)", borderRadius: 10, border: `1px solid ${inst.cor}22` }}>
                      <div style={{ width: 44, height: 44, borderRadius: 10, background: `${inst.cor}15`, border: `1px solid ${inst.cor}33`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <span style={{ fontSize: ".7rem", fontWeight: 800, color: inst.cor }}>{inst.sigla}</span>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: ".82rem", fontWeight: 600, color: "#e8f0f8", marginBottom: 2 }}>{inst.nome}</div>
                        <div style={{ fontSize: ".7rem", color: "rgba(160,200,235,.84)" }}>{inst.descricao} · {inst.itens} itens</div>
                      </div>
                      <button style={{ padding: "7px 14px", borderRadius: 8, border: `1px solid ${inst.cor}44`, background: `${inst.cor}11`, color: inst.cor, fontFamily: "var(--font-sans)", fontWeight: 600, fontSize: ".72rem", cursor: "pointer", flexShrink: 0 }}>
                        Enviar via Care
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tipoAF === "descritiva" && (
            <div style={{ ...card, padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: ".88rem", fontWeight: 700, color: "#e8f0f8", marginBottom: 4 }}>Registro ABC</div>
                  <div style={{ fontSize: ".7rem", color: "rgba(160,200,235,.84)" }}>Antecedente → Comportamento → Consequência</div>
                </div>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: ".75rem" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid rgba(26,58,92,.4)" }}>
                      {["Horário","Antecedente (A)","Comportamento (B)","Consequência (C)","Duração","Int."].map(h => (
                        <th key={h} style={{ padding: "8px 10px", textAlign: "left", fontSize: ".6rem", color: "rgba(170,210,245,.88)", textTransform: "uppercase", letterSpacing: ".07em", fontWeight: 600, whiteSpace: "nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {REGISTROS_ABC.map((r, i) => (
                      <tr key={r.id} style={{ borderBottom: i < REGISTROS_ABC.length - 1 ? "1px solid rgba(26,58,92,.2)" : "none" }}>
                        <td style={{ padding: "10px 10px", color: "rgba(160,200,235,.84)", fontFamily: "monospace" }}>{r.horario}</td>
                        <td style={{ padding: "10px 10px", color: "rgba(175,210,240,.95)", lineHeight: 1.5 }}>{r.antecedente}</td>
                        <td style={{ padding: "10px 10px", color: "#e8f0f8", fontWeight: 500, lineHeight: 1.5 }}>{r.comportamento}</td>
                        <td style={{ padding: "10px 10px", color: "rgba(160,200,235,.92)", lineHeight: 1.5 }}>{r.consequencia}</td>
                        <td style={{ padding: "10px 10px", color: "rgba(160,200,235,.84)" }}>{r.duracao}</td>
                        <td style={{ padding: "10px 10px" }}>
                          <span style={{ fontSize: ".62rem", color: r.intensidade === "intensa" ? "#E05A4B" : r.intensidade === "moderada" ? "#EF9F27" : "#1D9E75", fontWeight: 600 }}>
                            {r.intensidade === "intensa" ? "Alta" : r.intensidade === "moderada" ? "Mod." : "Leve"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ marginTop: 16, padding: "14px 16px", background: "rgba(26,58,92,.2)", borderRadius: 10, border: "1px dashed rgba(26,58,92,.5)" }}>
                <div style={{ ...lbl, marginBottom: 10 }}>Novo registro</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 10 }}>
                  <div><label style={{ ...lbl }}>Antecedente</label><input value={abcNovo.ant} onChange={e => setAbcNovo(v => ({ ...v, ant: e.target.value }))} placeholder="O que aconteceu antes..." style={inp} /></div>
                  <div><label style={{ ...lbl }}>Comportamento</label><input value={abcNovo.comp} onChange={e => setAbcNovo(v => ({ ...v, comp: e.target.value }))} placeholder="Descreva o comportamento..." style={inp} /></div>
                  <div><label style={{ ...lbl }}>Consequência</label><input value={abcNovo.cons} onChange={e => setAbcNovo(v => ({ ...v, cons: e.target.value }))} placeholder="O que aconteceu depois..." style={inp} /></div>
                </div>
                <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
                  <div style={{ width: 100 }}><label style={{ ...lbl }}>Duração</label><input value={abcNovo.dur} onChange={e => setAbcNovo(v => ({ ...v, dur: e.target.value }))} placeholder="ex: 30s" style={inp} /></div>
                  <div style={{ flex: 1 }}><label style={{ ...lbl }}>Intensidade</label><select value={abcNovo.int} onChange={e => setAbcNovo(v => ({ ...v, int: e.target.value as any }))} style={inp}><option value="leve">Leve</option><option value="moderada">Moderada</option><option value="intensa">Intensa</option></select></div>
                  <button style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: "#1D9E75", color: "#07111f", fontFamily: "var(--font-sans)", fontWeight: 700, fontSize: ".8rem", cursor: "pointer", flexShrink: 0 }}>+ Registrar</button>
                </div>
              </div>
            </div>
          )}

          {tipoAF === "experimental" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ ...card, padding: 20, border: `1px solid ${fc.cor}44`, background: `${fc.cor}06` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ width: 48, height: 48, borderRadius: "50%", background: `${fc.cor}20`, border: `2px solid ${fc.cor}55`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <div style={{ width: 14, height: 14, borderRadius: "50%", background: fc.cor }} />
                  </div>
                  <div>
                    <div style={{ fontSize: ".62rem", color: "rgba(170,210,245,.88)", marginBottom: 3 }}>Função identificada</div>
                    <div style={{ fontSize: "1.1rem", fontWeight: 800, color: fc.cor }}>{fc.label}</div>
                    <div style={{ fontSize: ".72rem", color: "rgba(160,200,235,.84)", marginTop: 2 }}>{fc.descricao}</div>
                  </div>
                </div>
              </div>
              <div style={{ ...card, padding: 20 }}>
                <div style={{ fontSize: ".88rem", fontWeight: 700, color: "#e8f0f8", marginBottom: 16 }}>Análise Funcional Experimental</div>
                {CONDICOES_EXPERIMENTAIS.map(cond => {
                  const media = Math.round(cond.registros.reduce((a, b) => a + b, 0) / cond.registros.length * 10) / 10;
                  const max   = Math.max(...CONDICOES_EXPERIMENTAIS.flatMap(c => c.registros));
                  return (
                    <div key={cond.id} style={{ marginBottom: 16 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                        <span style={{ fontSize: ".78rem", fontWeight: 600, color: cond.cor }}>{cond.nome}</span>
                        <span style={{ fontSize: ".72rem", color: cond.cor, fontWeight: 700, fontFamily: "monospace" }}>média: {media}/intervalo</span>
                      </div>
                      <div style={{ display: "flex", gap: 3, alignItems: "flex-end", height: 60 }}>
                        {cond.registros.map((val, i) => (
                          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", gap: 2 }}>
                            <div style={{ height: `${(val / max) * 52}px`, background: cond.cor, borderRadius: "3px 3px 0 0", opacity: .8, minHeight: val > 0 ? 3 : 0 }} />
                            <span style={{ fontSize: ".5rem", color: "rgba(165,208,242,.85)", textAlign: "center" }}>{i + 1}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── HISTÓRICO ── */}
      {tab === "historico" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {historico.length === 0 ? (
            <div style={{ ...card, padding: "48px 24px", textAlign: "center", color: "rgba(160,200,235,.3)", fontSize: ".82rem" }}>
              Nenhuma avaliação registrada ainda.
            </div>
          ) : historico.map((av: any) => {
            const proto = av.avaliacao_protocolos as any;
            const crianca = av.criancas as any;
            const st = STATUS_AVAL[av.status as StatusAval] ?? STATUS_AVAL.em_andamento;
            const nome = crianca?.nome ?? "Paciente";
            const partes = nome.trim().split(" ");
            const inic = partes.length >= 2 ? `${partes[0][0]}${partes[partes.length-1][0]}`.toUpperCase() : nome.slice(0,2).toUpperCase();
            return (
              <div key={av.id} style={{ ...card, padding: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: "50%", background: "linear-gradient(135deg,#1D9E75,#378ADD)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".68rem", fontWeight: 800, color: "#fff", flexShrink: 0 }}>
                    {inic}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                      <span style={{ fontSize: ".9rem", fontWeight: 700, color: "#e8f0f8" }}>{nome}</span>
                      <span style={{ fontSize: ".72rem", color: proto?.cor ?? "#1D9E75", fontWeight: 700 }}>{proto?.sigla ?? "—"}</span>
                      <span style={{ fontSize: ".62rem", color: st.cor, background: st.bg, borderRadius: 20, padding: "2px 8px", fontWeight: 600 }}>{st.label}</span>
                    </div>
                    <div style={{ fontSize: ".72rem", color: "rgba(160,200,235,.84)" }}>
                      {new Date(av.iniciada_em).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}
                      {av.concluida_em && ` · Concluída em ${new Date(av.concluida_em).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}`}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
