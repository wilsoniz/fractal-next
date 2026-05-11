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
  tipo_dominio: "habilidade" | "barreira";
  itens: ItemAvaliacao[];
  subdomínios?: DominioProtocolo[];
}

interface ItemAvaliacao {
  id: string;
  codigo: string;
  descricao: string;
  criterio: string;
  pontuacao_max: number;
  pontuacao_valores: number[];
  ordem: number;
  subdominio?: string;
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

// ─── MOCK AF ─────────────────────────────────────────────────────────────────
const REGISTROS_ABC: RegistroABC[] = [
  { id: "abc1", horario: "09:12", antecedente: "Solicitação de tarefa acadêmica (pareamento de figuras)", comportamento: "Jogou o material no chão e vocalizou loudly", consequencia: "Terapeuta removeu o material e aguardou 30s", duracao: "45s", intensidade: "moderada" },
  { id: "abc2", horario: "09:28", antecedente: "Transição de atividade (fim do NET)", comportamento: "Birra com choro e tentativa de fuga da cadeira", consequencia: "Terapeuta manteve instrução com suporte físico parcial", duracao: "2min", intensidade: "intensa" },
  { id: "abc3", horario: "09:45", antecedente: "Acesso a reforçador preferido foi encerrado", comportamento: "Autolesão leve (bater mãos na cabeça, 3x)", consequencia: "Terapeuta bloqueou sem atenção verbal, redirecionou", duracao: "15s", intensidade: "leve" },
  { id: "abc4", horario: "10:02", antecedente: "Sem instrução — período de pausa", comportamento: "Estereotipia motora (balançar o corpo) por período prolongado", consequencia: "Sem consequência externa", duracao: "3min", intensidade: "leve" },
];

const CONDICOES_EXPERIMENTAIS: CondicaoExperimental[] = [
  { id: "atencao",  nome: "Atenção",  cor: "#378ADD", descricao: "Atenção contingente ao comportamento-alvo",           registros: [2,3,4,3,5,4,6,5,4,3] },
  { id: "fuga",     nome: "Fuga",     cor: "#E05A4B", descricao: "Remoção de demanda contingente ao comportamento",     registros: [8,9,7,10,9,8,11,9,10,8] },
  { id: "tangivel", nome: "Tangível", cor: "#EF9F27", descricao: "Acesso a item preferido contingente ao comportamento", registros: [3,2,3,4,2,3,2,3,2,3] },
  { id: "controle", nome: "Controle", cor: "#1D9E75", descricao: "Acesso livre a reforçadores, sem demandas",           registros: [1,0,1,1,0,1,0,0,1,0] },
];

const MOTIVOS_CONCLUSAO = [
  "Avaliando domínios específicos",
  "Protocolo não adequado ao repertório atual",
  "Criança não colaborou na sessão",
  "Limite de tempo da sessão",
  "Outro",
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

// ─── FUNÇÃO: atualizar repertório ────────────────────────────────────────────
async function atualizarRepertorio(
  protocoloSel: Protocolo,
  sessaoAtiva: SessaoAtiva,
  respostas: RespostaLocal
) {
  for (const dominio of protocoloSel.dominios) {
    const ehBarreira = dominio.tipo_dominio === "barreira";
    console.log("Dominio:", dominio.nome, "tipo:", dominio.tipo_dominio, "ehBarreira:", ehBarreira);

    for (const item of dominio.itens) {
      const pontuacao = respostas[item.id];
      if (pontuacao === undefined) continue;

      if (ehBarreira) {
        // Barreiras: pontuação invertida — 0=ausente (bom), max=presente (ruim)
        const intensidade =
          pontuacao === 0                          ? "ausente"  :
          pontuacao <= item.pontuacao_max * 0.4    ? "leve"     : 
          pontuacao <= item.pontuacao_max * 0.7    ? "moderada" : "grave";

        if (pontuacao > 0) {
          const { data: existente } = await supabase
          
            .from("planos_comportamento_interferente")
            .select("id")
            .eq("crianca_id", sessaoAtiva.crianca_id)
            .eq("comportamento", item.descricao)
            .maybeSingle();

          if (!existente) {
            const { error: insErr } = await supabase
              .from("planos_comportamento_interferente")
              .insert({
                crianca_id:    sessaoAtiva.crianca_id,
                comportamento: item.descricao,
                intensidade,
                status:        "monitorado",
                fonte:         "vbmapp_barreiras",
              });
            if (insErr) console.error("Erro INSERT barreira:", insErr, item.descricao);
            else console.log("Barreira inserida:", item.descricao, intensidade);
          } else {
            const { error: updErr } = await supabase
              .from("planos_comportamento_interferente")
              .update({ intensidade })
              .eq("id", existente.id);
            if (updErr) console.error("Erro UPDATE barreira:", updErr);
            else console.log("Barreira atualizada:", item.descricao, intensidade);
          }
        }
        continue;
      }

      // Habilidades — fluxo normal
      const scorePercent = Math.round((pontuacao / item.pontuacao_max) * 100);
      const status =
        scorePercent === 0   ? "ausente"      :
        scorePercent <= 40   ? "emergente"    :
        scorePercent <= 79   ? "em_aquisicao" : "dominada";

      const { data: existenteArr } = await supabase
        .from("repertorio_habilidades")
        .select("id")
        .eq("crianca_id", sessaoAtiva.crianca_id)
        .eq("habilidade", item.descricao)
        .limit(1);
      const existente = existenteArr?.[0] ?? null;

      if (existente) {
        await supabase
          .from("repertorio_habilidades")
          .update({ score: scorePercent, status, ultima_atualizacao: new Date().toISOString() })
          .eq("id", existente.id);
      } else {
        await supabase
          .from("repertorio_habilidades")
          .insert({
            crianca_id:    sessaoAtiva.crianca_id,
            dominio:       dominio.dominio_radar ?? dominio.nome.toLowerCase(),
            habilidade:    item.descricao,
            operante:      null,
            status,
            score:         scorePercent,
            independencia: 0,
            generalizacao: 0,
            manutencao:    0,
          });
      }
    }
  }
}

// ─── FUNÇÃO: gerar radar snapshot ────────────────────────────────────────────
async function gerarRadarSnapshot(
  protocoloSel: Protocolo,
  sessaoAtiva: SessaoAtiva,
  respostas: RespostaLocal
) {
  const dominioRadarScores: Record<string, number[]> = {};
  for (const dominio of protocoloSel.dominios) {
    const chave = dominio.dominio_radar;
    if (!chave) continue;
    for (const item of dominio.itens) {
      const pontuacao = respostas[item.id];
      if (pontuacao === undefined) continue;
      if (!dominioRadarScores[chave]) dominioRadarScores[chave] = [];
      dominioRadarScores[chave].push(Math.round((pontuacao / item.pontuacao_max) * 100));
    }
  }
  console.log("dominioRadarScores:", dominioRadarScores);
  console.log("respostas count:", Object.keys(respostas).length);
  const media = (arr: number[]) => arr.length > 0 ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;
  const { error: radarError } = await supabase.from("radar_snapshots").insert({
    crianca_id:          sessaoAtiva.crianca_id,
    score_comunicacao:   media(dominioRadarScores["comunicacao"]   ?? []),
    score_social:        media(dominioRadarScores["social"]        ?? []),
    score_atencao:       media(dominioRadarScores["atencao"]       ?? []),
    score_regulacao:     media(dominioRadarScores["regulacao"]     ?? []),
    score_brincadeira:   media(dominioRadarScores["brincadeira"]   ?? []),
    score_flexibilidade: media(dominioRadarScores["flexibilidade"] ?? []),
    score_autonomia:     media(dominioRadarScores["autonomia"]     ?? []),
    score_motivacao:     media(dominioRadarScores["motivacao"]     ?? []),
  });
  if (radarError) console.error("Erro ao gerar radar:", radarError);
}

// ─── PAGE ────────────────────────────────────────────────────────────────────
export default function AvaliacoesPage() {
  const { terapeuta } = useClinicContext();
  const acesso = useAcesso();

  const [tab,              setTab]              = useState<TabAval>("protocolos");
  const [tipoAF,           setTipoAF]           = useState<TipoAF>("indireta");
  const [protocolos,       setProtocolos]       = useState<Protocolo[]>([]);
  const [protocoloSel,     setProtocoloSel]     = useState<Protocolo | null>(null);
  const [pacienteSel,      setPacienteSel]      = useState<string>("");
  const [pacientesAval,    setPacientesAval]    = useState<{ id: string; nome: string }[]>([]);
  const [sessaoAtiva,      setSessaoAtiva]      = useState<SessaoAtiva | null>(null);
  const [respostas,        setRespostas]        = useState<RespostaLocal>({});
  const [dominioAtivo,     setDominioAtivo]     = useState<string>("");
  const [busca,            setBusca]            = useState("");
  const [salvando,         setSalvando]         = useState<string | null>(null);
  const [historico,        setHistorico]        = useState<any[]>([]);
  const [abcNovo,          setAbcNovo]          = useState({ ant: "", comp: "", cons: "", dur: "", int: "moderada" as const });
  const [loading,          setLoading]          = useState(true);
  const [processando,      setProcessando]      = useState(false);

  // Modal de conclusão
  const [modalConclusao,   setModalConclusao]   = useState(false);
  const [motivoConclusao,  setMotivoConclusao]  = useState("");
  const [outroMotivo,      setOutroMotivo]      = useState("");
  const [tipoAvaliacao,    setTipoAvaliacao]    = useState<"pre_avaliacao" | "avaliacao_completa">("pre_avaliacao");

  // ── Carregar protocolos ──────────────────────────────────────────────────
  useEffect(() => {
    async function carregarProtocolos() {
      // 1. Busca protocolos
      const { data: prots } = await supabase
        .from("avaliacao_protocolos")
        .select("id, nome, sigla, descricao, faixa_etaria, duracao_estimada, cor, icone, ativo")
        .eq("ativo", true)
        .order("criado_em");

      if (!prots) return;

      // 2. Busca todos os domínios (pai e filhos) com itens
      const { data: dominios } = await supabase
        .from("avaliacao_dominios")
        .select(`
          id, nome, descricao, dominio_radar, tipo_dominio, ordem, parent_id, protocolo_id,
          avaliacao_itens ( id, codigo, descricao, criterio, pontuacao_max, pontuacao_valores, ordem )
        `)
        .in("protocolo_id", prots.map((p: any) => p.id))
        .order("ordem");

      if (!dominios) return;

      const formatados: Protocolo[] = prots.map((p: any) => {
        // Domínios pai deste protocolo
        const dominiosPai = dominios
          .filter((d: any) => d.protocolo_id === p.id && !d.parent_id)
          .sort((a: any, b: any) => a.ordem - b.ordem);

        const mapDominio = (d: any): DominioProtocolo => {
          // Subdomínios filhos deste domínio
          const filhos = dominios
            .filter((f: any) => f.parent_id === d.id)
            .sort((a: any, b: any) => a.ordem - b.ordem);

          // Itens diretos + itens dos filhos
          const itensDiretos = (d.avaliacao_itens ?? [])
            .sort((a: any, b: any) => a.ordem - b.ordem)
            .map((i: any) => ({
              id: i.id, codigo: i.codigo, descricao: i.descricao, criterio: i.criterio,
              pontuacao_max: i.pontuacao_max, pontuacao_valores: i.pontuacao_valores ?? [0, 1], ordem: i.ordem,
            }));

          const itensFilhos = filhos.flatMap((f: any) =>
            (f.avaliacao_itens ?? [])
              .sort((a: any, b: any) => a.ordem - b.ordem)
              .map((i: any) => ({
                id: i.id, codigo: i.codigo, descricao: i.descricao, criterio: i.criterio,
                pontuacao_max: i.pontuacao_max, pontuacao_valores: i.pontuacao_valores ?? [0, 1], ordem: i.ordem,
                subdominio: f.nome, // indica de qual subdomínio veio
              }))
          );

          return {
            id: d.id,
            nome: d.nome,
            descricao: d.descricao,
            dominio_radar: d.dominio_radar,
            tipo_dominio: d.tipo_dominio ?? "habilidade",
            itens: filhos.length > 0 ? itensFilhos : itensDiretos,
            subdomínios: filhos.map(mapDominio),
          };
        };

        return {
          id: p.id, nome: p.nome, sigla: p.sigla, descricao: p.descricao,
          faixaEtaria: p.faixa_etaria, tempoMedio: p.duracao_estimada,
          cor: p.cor ?? "#1D9E75", icone: ICONES[p.icone ?? ""] ?? "📋", disponivel: true,
          dominios: dominiosPai.map(mapDominio),
        };
      });

      setProtocolos(formatados);
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
        .select(`id, status, iniciada_em, concluida_em, observacoes,
          avaliacao_protocolos ( sigla, cor ),
          criancas ( nome )`)
        .order("iniciada_em", { ascending: false })
        .limit(20);

      if (hist) setHistorico(hist);
      setLoading(false);
    }
    carregar();
  }, [terapeuta]);

  // ── Iniciar ou retomar sessão ────────────────────────────────────────────
   const dominiosFiltrados = useMemo(() => {
    if (!protocoloSel) return [];
    if (protocoloSel.sigla !== "PEAK") return protocoloSel.dominios;
    if (tipoAvaliacao === "avaliacao_completa") return protocoloSel.dominios.filter(d => d.nome.includes("Avaliação Completa"));
    return protocoloSel.dominios.filter(d => !d.nome.includes("Avaliação Completa"));
  }, [protocoloSel, tipoAvaliacao]);

  const iniciarSessao = useCallback(async () => {
    if (!terapeuta || !protocoloSel || !pacienteSel) return;

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
        .insert({ crianca_id: pacienteSel, terapeuta_id: terapeuta.id, protocolo_id: protocoloSel.id, status: "em_andamento" })
        .select("id, protocolo_id, crianca_id, status")
        .single();
      if (!nova) return;
      sessaoId = nova.id;
      setSessaoAtiva(nova as SessaoAtiva);
    }

    const { data: resps } = await supabase
      .from("avaliacoes_respostas")
      .select("item_id, pontuacao")
      .eq("sessao_id", sessaoId);

    if (resps) {
      const map: RespostaLocal = {};
      for (const r of resps) map[r.item_id] = r.pontuacao;
      setRespostas(map);
    }

    if (dominiosFiltrados.length > 0) setDominioAtivo(dominiosFiltrados[0].id);
  }, [terapeuta, protocoloSel, pacienteSel]);

  // ── Registrar resposta ───────────────────────────────────────────────────
  const registrarResposta = useCallback(async (item_id: string, pontuacao: number) => {
    if (!sessaoAtiva) return;
    setSalvando(item_id);
    setRespostas(prev => ({ ...prev, [item_id]: pontuacao }));

    const { data: existente } = await supabase
      .from("avaliacoes_respostas")
      .select("id")
      .eq("sessao_id", sessaoAtiva.id)
      .eq("item_id", item_id)
      .single();

    if (existente) {
      await supabase.from("avaliacoes_respostas").update({ pontuacao }).eq("id", existente.id);
    } else {
      await supabase.from("avaliacoes_respostas").insert({
        sessao_id: sessaoAtiva.id, item_id, crianca_id: sessaoAtiva.crianca_id, pontuacao,
      });
    }
    setTimeout(() => setSalvando(null), 600);
  }, [sessaoAtiva]);

  // ── Salvar e sair (sem concluir) ─────────────────────────────────────────
  const salvarESair = useCallback(async () => {
    if (!sessaoAtiva || !protocoloSel) return;
    setProcessando(true);
    // Atualiza repertório parcialmente mas mantém status em_andamento
    await atualizarRepertorio(protocoloSel, sessaoAtiva, respostas);
    setProcessando(false);
    setSessaoAtiva(null);
    setRespostas({});
    setProtocoloSel(null);
  }, [sessaoAtiva, protocoloSel, respostas]);

  // ── Verificar se pode concluir direto ───────────────────────────────────
  const totalItens = dominiosFiltrados.reduce((acc, d) => acc + d.itens.length, 0);
  const totalRespondidos = Object.keys(respostas).length;
  const percentCompleto = totalItens > 0 ? Math.round((totalRespondidos / totalItens) * 100) : 0;

  const handleConcluir = () => {
    if (percentCompleto >= 100) {
      executarConclusao("");
    } else {
      setModalConclusao(true);
    }
  };

  // ── Executar conclusão ───────────────────────────────────────────────────
  const executarConclusao = useCallback(async (justificativa: string) => {
    if (!sessaoAtiva || !protocoloSel) return;
    setProcessando(true);
    setModalConclusao(false);

    const obs = justificativa || null;

    await supabase
      .from("avaliacoes_sessoes")
      .update({ status: "concluida", concluida_em: new Date().toISOString(), observacoes: obs })
      .eq("id", sessaoAtiva.id);

    await atualizarRepertorio(protocoloSel, sessaoAtiva, respostas);
    await gerarRadarSnapshot(protocoloSel, sessaoAtiva, respostas);

    setProcessando(false);
    setSessaoAtiva(null);
    setRespostas({});
    setProtocoloSel(null);
    setMotivoConclusao("");
    setOutroMotivo("");
  }, [sessaoAtiva, protocoloSel, respostas]);

  const funcaoIdent = useMemo(() => funcaoIdentificada(CONDICOES_EXPERIMENTAIS), []);
  const fc = FUNCAO_CONFIG[funcaoIdent];

  

  const dominioAtivoObj = dominiosFiltrados.find(d => d.id === dominioAtivo);
  const itensFiltrados = useMemo(() => {
    if (!dominioAtivoObj) return [];
    if (!busca.trim()) return dominioAtivoObj.itens;
    const b = busca.toLowerCase();
    return dominioAtivoObj.itens.filter(i =>
      i.codigo?.toLowerCase().includes(b) || i.descricao.toLowerCase().includes(b)
    );
  }, [dominioAtivoObj, busca]);

  const progressoPorDominio = useMemo(() => {
    if (!protocoloSel) return {};
    const map: Record<string, { respondidos: number; total: number }> = {};
    for (const d of dominiosFiltrados) {
      map[d.id] = {
        respondidos: d.itens.filter(i => respostas[i.id] !== undefined).length,
        total: d.itens.length,
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

  // ── TELA DE APLICAÇÃO ────────────────────────────────────────────────────
  if (protocoloSel && sessaoAtiva) {
    const paciente = pacientesAval.find(p => p.id === pacienteSel);

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 0, height: "calc(100vh - 120px)" }}>

        {/* Modal de conclusão parcial */}
        {modalConclusao && (
          <div onClick={() => setModalConclusao(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
            <div onClick={e => e.stopPropagation()} style={{ ...card, padding: 28, width: "100%", maxWidth: 460, border: "1px solid rgba(239,159,39,.25)" }}>
              <div style={{ fontSize: ".88rem", fontWeight: 700, color: "#e8f0f8", marginBottom: 4 }}>Concluir avaliação parcial</div>
              <div style={{ fontSize: ".72rem", color: "rgba(160,200,235,.7)", marginBottom: 20, lineHeight: 1.6 }}>
                {percentCompleto}% dos itens foram respondidos. Por que está concluindo antes de 100%?
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
                {MOTIVOS_CONCLUSAO.map(m => (
                  <button
                    key={m}
                    onClick={() => setMotivoConclusao(m)}
                    style={{
                      padding: "10px 14px", borderRadius: 9, textAlign: "left",
                      border: `1px solid ${motivoConclusao === m ? "rgba(239,159,39,.5)" : "rgba(26,58,92,.4)"}`,
                      background: motivoConclusao === m ? "rgba(239,159,39,.1)" : "rgba(26,58,92,.2)",
                      color: motivoConclusao === m ? "#EF9F27" : "rgba(160,200,235,.84)",
                      fontFamily: "var(--font-sans)", fontSize: ".78rem", cursor: "pointer",
                    }}
                  >
                    {m}
                  </button>
                ))}
              </div>
              {motivoConclusao === "Outro" && (
                <textarea
                  value={outroMotivo}
                  onChange={e => setOutroMotivo(e.target.value)}
                  placeholder="Descreva o motivo..."
                  rows={3}
                  style={{ ...inp, resize: "none", marginBottom: 16 }}
                />
              )}
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setModalConclusao(false)} style={{ flex: 1, padding: "10px", borderRadius: 9, border: "1px solid rgba(26,58,92,.5)", background: "transparent", color: "rgba(160,200,235,.5)", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
                  Cancelar
                </button>
                <button
                  disabled={!motivoConclusao}
                  onClick={() => {
                    const justificativa = motivoConclusao === "Outro" ? outroMotivo : motivoConclusao;
                    executarConclusao(justificativa);
                  }}
                  style={{ flex: 2, padding: "10px", borderRadius: 9, border: "none", background: motivoConclusao ? "linear-gradient(135deg,#EF9F27,#d4870f)" : "rgba(26,58,92,.4)", color: motivoConclusao ? "#07111f" : "rgba(160,200,235,.3)", fontSize: 13, fontWeight: 700, cursor: motivoConclusao ? "pointer" : "not-allowed", fontFamily: "inherit" }}
                >
                  Confirmar conclusão
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
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
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: ".65rem", color: "rgba(170,210,245,.88)" }}>{totalRespondidos} de {totalItens} itens · {percentCompleto}%</div>
              <div style={{ width: 120, height: 4, background: "rgba(26,58,92,.5)", borderRadius: 2, marginTop: 3, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${percentCompleto}%`, background: protocoloSel.cor, transition: "width .3s" }} />
              </div>
            </div>
            <button
              onClick={salvarESair}
              disabled={processando}
              style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid rgba(70,120,180,.4)", background: "transparent", color: "rgba(160,200,235,.8)", fontFamily: "var(--font-sans)", fontWeight: 500, fontSize: ".75rem", cursor: "pointer" }}
            >
              {processando ? "Salvando..." : "Salvar e sair"}
            </button>
            <button
              onClick={handleConcluir}
              disabled={processando || totalRespondidos === 0}
              style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: totalRespondidos > 0 ? "linear-gradient(135deg,#1D9E75,#0f8f7a)" : "rgba(26,58,92,.4)", color: totalRespondidos > 0 ? "#07111f" : "rgba(160,200,235,.3)", fontFamily: "var(--font-sans)", fontWeight: 700, fontSize: ".78rem", cursor: totalRespondidos > 0 ? "pointer" : "not-allowed" }}
            >
              Concluir avaliação
            </button>
          </div>
        </div>

        <div style={{ display: "flex", gap: 14, flex: 1, minHeight: 0 }}>

          {/* Sidebar domínios */}
          <div style={{ width: 200, flexShrink: 0, display: "flex", flexDirection: "column", gap: 4, overflowY: "auto" }}>
            {dominiosFiltrados.map(d => {
              const prog = progressoPorDominio[d.id];
              const ativo = dominioAtivo === d.id;
              return (
                <button key={d.id} onClick={() => { setDominioAtivo(d.id); setBusca(""); }}
                  style={{ padding: "10px 12px", borderRadius: 9, border: `1px solid ${ativo ? protocoloSel.cor + "55" : "rgba(26,58,92,.4)"}`, background: ativo ? protocoloSel.cor + "15" : "rgba(13,32,53,.5)", cursor: "pointer", textAlign: "left", fontFamily: "var(--font-sans)" }}
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

          {/* Lista itens */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10, overflowY: "auto", minHeight: 0 }}>
            <div style={{ position: "relative", flexShrink: 0 }}>
              <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar por código ou descrição..." style={{ ...inp, paddingLeft: 34 }} />
              <svg style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", opacity: .4 }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#e8f0f8" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </div>

            {dominioAtivoObj && (
              <div style={{ padding: "10px 14px", background: "rgba(26,58,92,.2)", borderRadius: 9, border: "1px solid rgba(26,58,92,.4)", flexShrink: 0 }}>
                <div style={{ fontSize: ".75rem", fontWeight: 700, color: "#e8f0f8", marginBottom: 2 }}>{dominioAtivoObj.nome}</div>
                {dominioAtivoObj.descricao && <div style={{ fontSize: ".68rem", color: "rgba(160,200,235,.7)" }}>{dominioAtivoObj.descricao}</div>}
              </div>
            )}

            {itensFiltrados.map(item => {
              const resposta = respostas[item.id];
              const respondido = resposta !== undefined;
              const salvandoEste = salvando === item.id;
              return (
                <div key={item.id} style={{ ...card, padding: "14px 16px", border: respondido ? `1px solid ${protocoloSel.cor}44` : "1px solid rgba(70,120,180,.3)", background: respondido ? `${protocoloSel.cor}08` : "rgba(13,32,53,.75)" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                    <div style={{ flexShrink: 0, minWidth: 36 }}>
                      <span style={{ fontSize: ".68rem", fontWeight: 800, color: protocoloSel.cor, fontFamily: "monospace" }}>{item.codigo}</span>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: ".82rem", color: "#e8f0f8", lineHeight: 1.5, marginBottom: 4 }}>{item.descricao}</div>
                      {item.criterio && <div style={{ fontSize: ".68rem", color: "rgba(160,200,235,.5)", lineHeight: 1.5, marginBottom: 10 }}>Critério: {item.criterio}</div>}
                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <span style={{ fontSize: ".6rem", color: "rgba(170,210,245,.88)", marginRight: 4 }}>Pontuação:</span>
                        {item.pontuacao_valores.map(val => {
                          const selecionado = resposta === val;
                          const cor = val === 0 ? "#E05A4B" : val === item.pontuacao_max ? "#1D9E75" : "#EF9F27";
                          return (
                            <button key={val} onClick={() => registrarResposta(item.id, val)}
                              style={{ width: 44, height: 34, borderRadius: 7, border: `1px solid ${selecionado ? cor : "rgba(26,58,92,.5)"}`, background: selecionado ? cor + "22" : "rgba(26,58,92,.2)", color: selecionado ? cor : "rgba(160,200,235,.6)", fontFamily: "monospace", fontWeight: selecionado ? 800 : 400, fontSize: ".82rem", cursor: "pointer" }}
                            >
                              {val}
                            </button>
                          );
                        })}
                        {salvandoEste && <span style={{ fontSize: ".62rem", color: "#1D9E75", marginLeft: 6 }}>Salvo</span>}
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
                {dominioAtivoObj?.itens.length === 0 ? "Itens deste domínio ainda não foram cadastrados." : "Nenhum item encontrado para essa busca."}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── TELA DE SELEÇÃO ──────────────────────────────────────────────────────
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
          <div style={{ marginBottom: 20 }}>
            <div style={{ ...lbl }}>Aplicar para qual paciente?</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {pacientesAval.length === 0 ? (
                <div style={{ fontSize: ".75rem", color: "rgba(255,255,255,.3)" }}>Nenhum paciente vinculado</div>
              ) : pacientesAval.map(pac => (
                <button key={pac.id} onClick={() => setPacienteSel(pac.id)}
                  style={{ padding: "8px 14px", borderRadius: 9, border: `1px solid ${pacienteSel === pac.id ? p.cor + "55" : "rgba(70,120,180,.5)"}`, background: pacienteSel === pac.id ? p.cor + "15" : "rgba(26,58,92,.25)", color: pacienteSel === pac.id ? p.cor : "rgba(160,200,235,.92)", fontFamily: "var(--font-sans)", fontSize: ".75rem", fontWeight: pacienteSel === pac.id ? 700 : 400, cursor: "pointer" }}
                >
                  {pac.nome.split(" ")[0]}
                </button>
              ))}
            </div>
          </div>
          {/* Seletor de tipo — só aparece para PEAK */}
          {p.sigla === "PEAK" && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ ...lbl }}>Tipo de avaliação</div>
              <div style={{ display: "flex", gap: 8 }}>
                {([
                  { id: "pre_avaliacao" as const,      label: "Pré-Avaliação",      sub: "Triagem rápida — 64 itens por módulo" },
                  { id: "avaliacao_completa" as const, label: "Avaliação Completa", sub: "Mapeamento detalhado — 184 programas" },
                ]).map(t => (
                  <button key={t.id} onClick={() => setTipoAvaliacao(t.id)}
                    style={{ flex: 1, padding: "12px 14px", borderRadius: 10, textAlign: "left", cursor: "pointer", fontFamily: "var(--font-sans)",
                      border: `1px solid ${tipoAvaliacao === t.id ? p.cor + "55" : "rgba(26,58,92,.4)"}`,
                      background: tipoAvaliacao === t.id ? p.cor + "12" : "rgba(26,58,92,.2)",
                    }}
                  >
                    <div style={{ fontSize: ".8rem", fontWeight: 700, color: tipoAvaliacao === t.id ? p.cor : "#e8f0f8", marginBottom: 3 }}>{t.label}</div>
                    <div style={{ fontSize: ".65rem", color: "rgba(160,200,235,.6)" }}>{t.sub}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div style={{ ...lbl }}>Domínios da avaliação</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 10, marginBottom: 20 }}>
            {p.dominios
              .filter((d: any) => {
                if (p.sigla !== "PEAK") return true;
                if (tipoAvaliacao === "avaliacao_completa") return d.nome.includes("Avaliação Completa");
                return !d.nome.includes("Avaliação Completa");
              })
              .map((d: any) => (
                <div key={d.id} style={{ padding: "12px 14px", background: "rgba(26,58,92,.25)", borderRadius: 10, border: `1px solid ${p.cor}22` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: ".78rem", fontWeight: 600, color: "#e8f0f8" }}>{d.nome}</span>
                    <span style={{ fontSize: ".65rem", color: "rgba(170,210,245,.88)" }}>{d.itens.length} itens</span>
                  </div>
                  <div style={{ height: 4, background: "rgba(26,58,92,.5)", borderRadius: 2 }} />
                  <div style={{ fontSize: ".62rem", color: "rgba(165,208,242,.85)", marginTop: 4 }}>Não iniciado</div>
                </div>
              ))}
          </div>
          <button onClick={iniciarSessao} disabled={!pacienteSel}
            style={{ width: "100%", padding: 14, borderRadius: 10, border: "none", background: pacienteSel ? `linear-gradient(135deg,${p.cor},${p.cor}99)` : "rgba(26,58,92,.4)", color: pacienteSel ? "#07111f" : "rgba(160,200,235,.3)", fontFamily: "var(--font-sans)", fontWeight: 800, fontSize: ".9rem", cursor: pacienteSel ? "pointer" : "not-allowed" }}
          >
            Iniciar {tipoAvaliacao === "avaliacao_completa" ? "Avaliação Completa" : "Pré-Avaliação"} {p.sigla} →
          </button>
        </div>
      </div>
    );
  }

  // ── TELA PRINCIPAL ────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: "1.2rem", fontWeight: 800, color: "#e8f0f8", margin: 0, marginBottom: 4 }}>Avaliações</h1>
          <div style={{ fontSize: ".72rem", color: "rgba(160,200,235,.84)" }}>Protocolos padronizados · Análise Funcional · Histórico clínico</div>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 10 }}>
        {[
          { l: "Concluídas",            v: historico.filter((a: any) => a.status === "concluida").length,    c: "#1D9E75" },
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
          <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: "10px 18px", background: "none", border: "none", borderBottom: `2px solid ${tab === t.id ? "#1D9E75" : "transparent"}`, color: tab === t.id ? "#1D9E75" : "rgba(160,200,235,.84)", fontFamily: "var(--font-sans)", fontWeight: tab === t.id ? 600 : 400, fontSize: ".82rem", cursor: "pointer", marginBottom: -1 }}>{t.label}</button>
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
                      {p.dominios.map(d => <div key={d.id} style={{ flex: 1, height: 4, background: p.cor, borderRadius: 2, opacity: .6 }} title={d.nome} />)}
                    </div>
                    <button onClick={() => setProtocoloSel(p)} style={{ marginTop: "auto", padding: "9px", borderRadius: 8, border: "none", background: `${p.cor}22`, color: p.cor, fontFamily: "var(--font-sans)", fontWeight: 700, fontSize: ".78rem", cursor: "pointer" }}>
                      Aplicar {p.sigla} →
                    </button>
                  </div>
                </div>
              ))}
              {/* AFLS em breve */}
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
                  <div style={{ marginTop: "auto", padding: "9px", borderRadius: 8, background: "rgba(26,58,92,.2)", color: "rgba(165,208,242,.85)", fontFamily: "var(--font-sans)", fontWeight: 600, fontSize: ".78rem", textAlign: "center" }}>Em breve</div>
                </div>
              </div>
            </div>
          )}
          <div style={{ ...card, padding: 16, border: "1px solid rgba(55,138,221,.2)", background: "rgba(55,138,221,.04)", display: "flex", alignItems: "center", gap: 12 }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#378ADD" strokeWidth="1.5"><circle cx="8" cy="8" r="6"/><path d="M8 7v4M8 5h.01"/></svg>
            <span style={{ fontSize: ".75rem", color: "rgba(160,200,235,.92)" }}>Os protocolos serão expandidos com os itens completos conforme o material clínico for integrado. Por enquanto, a estrutura de domínios já permite iniciar e registrar avaliações.</span>
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
              <button key={t.id} onClick={() => setTipoAF(t.id)} style={{ padding: "8px 18px", borderRadius: 9, border: "none", background: tipoAF === t.id ? "rgba(29,158,117,.2)" : "transparent", cursor: "pointer", fontFamily: "var(--font-sans)" }}>
                <div style={{ fontSize: ".78rem", fontWeight: tipoAF === t.id ? 700 : 400, color: tipoAF === t.id ? "#1D9E75" : "rgba(160,200,235,.84)" }}>{t.label}</div>
                <div style={{ fontSize: ".6rem", color: "rgba(165,208,242,.85)", marginTop: 2 }}>{t.sub}</div>
              </button>
            ))}
          </div>

          {tipoAF === "indireta" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ ...card, padding: 20, border: "1px solid rgba(55,138,221,.2)", background: "rgba(55,138,221,.04)" }}>
                <div style={{ fontSize: ".62rem", color: "#378ADD", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".09em", marginBottom: 10 }}>Como funciona a AF Indireta</div>
                <div style={{ fontSize: ".8rem", color: "rgba(160,200,235,.92)", lineHeight: 1.7 }}>O formulário é enviado ao responsável via <strong style={{ color: "#378ADD" }}>FractaCare</strong>. A família responde sobre antecedentes, consequências e contextos associados ao comportamento-alvo em casa.</div>
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
                      <button style={{ padding: "7px 14px", borderRadius: 8, border: `1px solid ${inst.cor}44`, background: `${inst.cor}11`, color: inst.cor, fontFamily: "var(--font-sans)", fontWeight: 600, fontSize: ".72rem", cursor: "pointer", flexShrink: 0 }}>Enviar via Care</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tipoAF === "descritiva" && (
            <div style={{ ...card, padding: 20 }}>
              <div style={{ fontSize: ".88rem", fontWeight: 700, color: "#e8f0f8", marginBottom: 4 }}>Registro ABC</div>
              <div style={{ fontSize: ".7rem", color: "rgba(160,200,235,.84)", marginBottom: 16 }}>Antecedente → Comportamento → Consequência</div>
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
                        <td style={{ padding: "10px", color: "rgba(160,200,235,.84)", fontFamily: "monospace" }}>{r.horario}</td>
                        <td style={{ padding: "10px", color: "rgba(175,210,240,.95)", lineHeight: 1.5 }}>{r.antecedente}</td>
                        <td style={{ padding: "10px", color: "#e8f0f8", fontWeight: 500, lineHeight: 1.5 }}>{r.comportamento}</td>
                        <td style={{ padding: "10px", color: "rgba(160,200,235,.92)", lineHeight: 1.5 }}>{r.consequencia}</td>
                        <td style={{ padding: "10px", color: "rgba(160,200,235,.84)" }}>{r.duracao}</td>
                        <td style={{ padding: "10px" }}><span style={{ fontSize: ".62rem", color: r.intensidade === "intensa" ? "#E05A4B" : r.intensidade === "moderada" ? "#EF9F27" : "#1D9E75", fontWeight: 600 }}>{r.intensidade === "intensa" ? "Alta" : r.intensidade === "moderada" ? "Mod." : "Leve"}</span></td>
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
                  const max = Math.max(...CONDICOES_EXPERIMENTAIS.flatMap(c => c.registros));
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
            <div style={{ ...card, padding: "48px 24px", textAlign: "center", color: "rgba(160,200,235,.3)", fontSize: ".82rem" }}>Nenhuma avaliação registrada ainda.</div>
          ) : historico.map((av: any) => {
            const proto = av.avaliacao_protocolos as any;
            const crianca = av.criancas as any;
            const st = STATUS_AVAL[av.status as StatusAval] ?? STATUS_AVAL.em_andamento;
            const nome = crianca?.nome ?? "Paciente";
            const partes = nome.trim().split(" ");
            const inic = partes.length >= 2 ? `${partes[0][0]}${partes[partes.length-1][0]}`.toUpperCase() : nome.slice(0,2).toUpperCase();
            return (
              <div key={av.id} style={{ ...card, padding: 20 }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: "50%", background: "linear-gradient(135deg,#1D9E75,#378ADD)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".68rem", fontWeight: 800, color: "#fff", flexShrink: 0 }}>{inic}</div>
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
                    {av.observacoes && (
                      <div style={{ marginTop: 6, fontSize: ".68rem", color: "rgba(239,159,39,.7)", fontStyle: "italic" }}>
                        Motivo: {av.observacoes}
                      </div>
                    )}
                    {av.status === "em_andamento" && (
                      <button
                        onClick={() => {
                          const proto_obj = protocolos.find(p => p.sigla === proto?.sigla);
                          if (proto_obj) setProtocoloSel(proto_obj);
                        }}
                        style={{ marginTop: 8, padding: "6px 14px", borderRadius: 7, border: `1px solid rgba(239,159,39,.3)`, background: "rgba(239,159,39,.08)", color: "#EF9F27", fontFamily: "var(--font-sans)", fontWeight: 600, fontSize: ".72rem", cursor: "pointer" }}
                      >
                        Retomar avaliação →
                      </button>
                    )}
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
