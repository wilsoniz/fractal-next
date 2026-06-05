"use client";
import { useState, useCallback, useEffect } from "react";
import { useClinicContext, useAcesso } from "../layout";
import { supabase } from "@/lib/supabase";

// ─── TIPOS ───────────────────────────────────────────────────────────────────
type ViewPrincipal = "biblioteca" | "goal-builder" | "editar";
type TabBiblioteca = "meus" | "plataforma" | "avaliacao" | "equipe";
type Etapa = 1 | 2 | 3 | 4;
type NivelTreino = "basico" | "intermediario" | "avancado";
type TipoOperante = "tato" | "mando" | "intraverbal" | "echoico" | "imitacao" | "ouvinte" | "textual" | "transcricao";
type TipoComportamento = "verbal" | "não-verbal";
type TipoRelacao =
  | "A→B" | "B→A" | "A→C" | "B→C" | "C→A" | "C→B"
  | "A=A" | "B=A" | "A=C" | "C=A";

interface Estimulo {
  id: string;
  modelo: string;
  comparacao: string;
  modeloTipo: "imagem" | "texto" | "audio" | "emoji";
  comparacaoTipo: "imagem" | "texto" | "audio" | "emoji";
}

interface CriterioPontuacao {
  pontos: number;
  descricao: string;
  reforco: string;
}

interface Programa {
  nome: string;
  operante: TipoOperante;
  tipoComportamento: TipoComportamento;
  nivelTreino: NivelTreino;
  dominio: string;
  comportamentoAlvo: string;
  sd: string;
  material: string;
  instrucoes: string;
  pacienteId: string;
  estimulos: Estimulo[];
  relacoes: TipoRelacao[];
  totalTentativas: number;
  ordemApresentacao: "fixo" | "randomizado";
  criterios: CriterioPontuacao[];
  criterioMaestria: string;
  sessoesParaMaestria: number;
  reforcoGeral: string;
  nivelDicas: string[];
  tipoRegistro: "dtt" | "frequencia" | "duracao" | "latencia" | "encadeamento" | "matching";
  passosEncadeamento: string[];
  direcaoEncadeamento: "frente" | "tras" | "total";
}

interface ProgramaDB {
  id: string;
  nome: string;
  dominio: string;
  operante: string;
  sd: string | null;
  objetivo: string | null;
  total_tentativas: number;
  criterio_maestria: string | null;
  nivel: string | null;
  tipo_registro: string | null;
  hierarquia_dicas: string[] | null;
  passos_encadeamento: string[] | null;
  direcao_encadeamento: string | null;
  estimulos: any[] | null;
  relacoes: string[] | null;
  ativo: boolean;
  criado_em: string;
  origem?: string;
}

// ─── CONSTANTES ──────────────────────────────────────────────────────────────
function uid() { return Math.random().toString(36).slice(2, 9); }

const GRADIENTS_PAC = [
  "linear-gradient(135deg,#1D9E75,#378ADD)",
  "linear-gradient(135deg,#378ADD,#8B7FE8)",
  "linear-gradient(135deg,#8B7FE8,#E05A4B)",
]

function iniciaisPac(nome: string) {
  const p = nome.trim().split(" ")
  return p.length >= 2 ? `${p[0][0]}${p[p.length-1][0]}`.toUpperCase() : nome.slice(0,2).toUpperCase()
}

const OPERANTES: { id: TipoOperante; label: string; desc: string; cor: string }[] = [
  { id: "mando",       label: "Mando",        desc: "Solicitar itens ou ações",           cor: "#1D9E75" },
  { id: "tato",        label: "Tato",         desc: "Nomear estímulos presentes",         cor: "#378ADD" },
  { id: "intraverbal", label: "Intraverbal",  desc: "Responder a perguntas verbais",      cor: "#8B7FE8" },
  { id: "echoico",     label: "Echoico",      desc: "Imitar sons e palavras",             cor: "#EF9F27" },
  { id: "imitacao",    label: "Imitação",     desc: "Imitar ações motoras",               cor: "#E05A4B" },
  { id: "ouvinte",     label: "Ouvinte",      desc: "Seguir instruções verbais",          cor: "#23c48f" },
  { id: "textual",     label: "Textual",      desc: "Leitura funcional",                  cor: "#378ADD" },
  { id: "transcricao", label: "Transcrição",  desc: "Escrita sob controle verbal",        cor: "#8B7FE8" },
]

const NIVEIS_TREINO: { id: NivelTreino; label: string; desc: string }[] = [
  { id: "basico",        label: "Nível 1 — Controle direto",     desc: "Treino direto, sem equivalência" },
  { id: "intermediario", label: "Nível 2 — Controle colateral",  desc: "Equivalência de estímulos"       },
  { id: "avancado",      label: "Nível 3 — Molduras relacionais",desc: "RFT e relações derivadas"        },
]

const DOMINIOS = [
  { id: "comunicacao",   label: "Comunicação",   cor: "#1D9E75" },
  { id: "social",        label: "Social",        cor: "#378ADD" },
  { id: "atencao",       label: "Atenção",       cor: "#8B7FE8" },
  { id: "regulacao",     label: "Regulação",     cor: "#E05A4B" },
  { id: "brincadeira",   label: "Brincadeira",   cor: "#EF9F27" },
  { id: "flexibilidade", label: "Flexibilidade", cor: "#23c48f" },
  { id: "autonomia",     label: "Autonomia",     cor: "#378ADD" },
  { id: "motivacao",     label: "Motivação",     cor: "#8B7FE8" },
]

const RELACOES_DISP: { id: TipoRelacao; label: string; desc: string }[] = [
  { id: "A→B", label: "A→B", desc: "Treino direto" },
  { id: "B→A", label: "B→A", desc: "Treino inverso" },
  { id: "A→C", label: "A→C", desc: "Treino direto C" },
  { id: "B→C", label: "B→C", desc: "Treino BC" },
  { id: "C→A", label: "C→A", desc: "Emergente CA" },
  { id: "C→B", label: "C→B", desc: "Emergente CB" },
  { id: "A=A", label: "A=A", desc: "Reflexividade A" },
  { id: "B=A", label: "B=A", desc: "Simetria BA" },
  { id: "A=C", label: "A=C", desc: "Transitiv. AC" },
  { id: "C=A", label: "C=A", desc: "Equiv. CA" },
]

const CRITERIOS_DEFAULT: CriterioPontuacao[] = [
  { pontos: 0,  descricao: "Sem resposta mesmo com várias dicas",              reforco: "Sem reforço" },
  { pontos: 2,  descricao: "Resposta após redução de estímulos e dicas",       reforco: "1 unidade de reforçador" },
  { pontos: 4,  descricao: "Resposta após 2+ dicas, sem redução de estímulos", reforco: "2 unidades de reforçador" },
  { pontos: 8,  descricao: "Resposta após 1 dica verbal ou visual",            reforco: "3 unidades de reforçador" },
  { pontos: 10, descricao: "Resposta independente, sem dicas",                 reforco: "4 unidades de reforçador" },
]

const DICAS_DEFAULT = ["Independente", "Gestual", "Modelo", "Física parcial", "Física total"]

const PROGRAMA_INICIAL: Programa = {
  nome: "", operante: "tato", nivelTreino: "basico",
  tipoComportamento: "verbal" as TipoComportamento, dominio: "comunicacao",
  comportamentoAlvo: "", sd: "", material: "", instrucoes: "", pacienteId: "1",
  estimulos: [{ id: uid(), modelo: "", comparacao: "", modeloTipo: "texto", comparacaoTipo: "texto" }],
  relacoes: ["A→B"],
  totalTentativas: 10,
  ordemApresentacao: "randomizado",
  criterios: CRITERIOS_DEFAULT,
  criterioMaestria: "80% de respostas corretas",
  sessoesParaMaestria: 3,
  reforcoGeral: "",
  nivelDicas: DICAS_DEFAULT,
  tipoRegistro: "dtt",
  passosEncadeamento: [],
  direcaoEncadeamento: "frente",
}

const DOMINIO_COR: Record<string, string> = {
  comunicacao: "#1D9E75", social: "#378ADD", atencao: "#8B7FE8",
  regulacao: "#E05A4B", brincadeira: "#EF9F27", flexibilidade: "#23c48f",
  autonomia: "#378ADD", motivacao: "#8B7FE8",
}

// ─── COMPONENTE PRINCIPAL ────────────────────────────────────────────────────
export default function ProgramasPage() {
  const { terapeuta } = useClinicContext()
  const acesso = useAcesso()

  const [view,          setView]          = useState<ViewPrincipal>("biblioteca")
  const [tabBiblioteca, setTabBiblioteca] = useState<TabBiblioteca>("meus")
  const [programasDB,   setProgramasDB]   = useState<ProgramaDB[]>([])
  const [loading,       setLoading]       = useState(true)
  const [busca,         setBusca]         = useState("")
  const [filtroDominio, setFiltroDominio] = useState("todos")
  const [editandoId,    setEditandoId]    = useState<string | null>(null)
  const [confirmExcluir,setConfirmExcluir]= useState<ProgramaDB | null>(null)
  const [excluindo,     setExcluindo]     = useState(false)

  const card: React.CSSProperties = {
    background: "rgba(13,32,53,.75)",
    border: "1px solid rgba(26,58,92,.5)",
    borderRadius: 14,
    backdropFilter: "blur(8px)",
  }
  const inp: React.CSSProperties = {
    background: "rgba(20,55,110,.55)",
    border: "1px solid rgba(26,58,92,.6)",
    borderRadius: 8, padding: "9px 12px",
    color: "#e8f0f8", fontFamily: "var(--font-sans)",
    fontSize: ".82rem", outline: "none",
    width: "100%", boxSizing: "border-box" as const,
  }
  const lbl: React.CSSProperties = {
    fontSize: ".6rem", fontWeight: 700,
    textTransform: "uppercase" as const,
    letterSpacing: ".09em", color: "rgba(170,210,245,.6)",
    marginBottom: 8, display: "block",
  }

  useEffect(() => {
    carregarProgramas()
  }, [terapeuta])

  async function carregarProgramas() {
    if (!terapeuta) return
    setLoading(true)
    const { data } = await supabase
      .from("programas")
      .select("*")
      .eq("ativo", true)
      .order("criado_em", { ascending: false })
    setProgramasDB(data ?? [])
    setLoading(false)
  }

  async function excluirPrograma(prog: ProgramaDB) {
    setExcluindo(true)
    await supabase.from("programas").update({ ativo: false }).eq("id", prog.id)
    setProgramasDB(prev => prev.filter(p => p.id !== prog.id))
    setConfirmExcluir(null)
    setExcluindo(false)
  }

  function abrirEditar(prog: ProgramaDB) {
    setEditandoId(prog.id)
    setView("editar")
  }

  // Filtros
  const programasFiltrados = programasDB.filter(p => {
    const matchBusca = p.nome.toLowerCase().includes(busca.toLowerCase()) ||
      (p.dominio ?? "").toLowerCase().includes(busca.toLowerCase())
    const matchDominio = filtroDominio === "todos" || p.dominio === filtroDominio
    return matchBusca && matchDominio
  })

  // ── VIEW: BIBLIOTECA ────────────────────────────────────────────────────────
  if (view === "biblioteca") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

        {/* Cabeçalho */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
          <div>
            <h1 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#e8f0f8", margin: 0 }}>Biblioteca de Programas</h1>
            <div style={{ fontSize: ".72rem", color: "rgba(160,200,235,.4)", marginTop: 3 }}>
              {programasDB.length} programa(s) disponível(is)
            </div>
          </div>
          {acesso.podeEditarProgramas && (
            <button onClick={() => setView("goal-builder")}
              style={{ padding: "9px 18px", borderRadius: 9, border: "none", background: "linear-gradient(135deg,#1D9E75,#0f8f7a)", color: "#07111f", fontWeight: 700, fontSize: ".82rem", cursor: "pointer", fontFamily: "var(--font-sans)", display: "flex", alignItems: "center", gap: 6 }}>
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M8 3v10M3 8h10"/></svg>
              Novo programa
            </button>
          )}
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", borderBottom: "1px solid rgba(26,58,92,.4)", overflowX: "auto", scrollbarWidth: "none" as any }}>
          {([
            ["meus",       "Meus programas"],
            ["plataforma", "Plataforma Fracta"],
            ["avaliacao",  "Da avaliação"],
            ["equipe",     "Da equipe"],
          ] as const).map(([id, label]) => (
            <button key={id} onClick={() => setTabBiblioteca(id)} style={{
              padding: "10px 16px", background: "none", border: "none",
              borderBottom: `2px solid ${tabBiblioteca === id ? "#1D9E75" : "transparent"}`,
              color: tabBiblioteca === id ? "#1D9E75" : "rgba(160,200,235,.5)",
              fontFamily: "var(--font-sans)", fontWeight: tabBiblioteca === id ? 700 : 400,
              fontSize: ".78rem", cursor: "pointer", marginBottom: -1, whiteSpace: "nowrap" as const, flexShrink: 0,
            }}>{label}</button>
          ))}
        </div>

        {/* Filtros */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" as const }}>
          <input
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Buscar por nome ou domínio..."
            style={{ ...inp, maxWidth: 280 }}
          />
          <select value={filtroDominio} onChange={e => setFiltroDominio(e.target.value)}
            style={{ ...inp, width: "auto", appearance: "none" as const }}>
            <option value="todos">Todos os domínios</option>
            {DOMINIOS.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}
          </select>
        </div>

        {/* Conteúdo por aba */}
        {tabBiblioteca === "meus" && (
          <>
            {loading ? (
              <div style={{ padding: 48, textAlign: "center", fontSize: ".78rem", color: "rgba(160,200,235,.3)" }}>
                Carregando...
              </div>
            ) : programasFiltrados.length === 0 ? (
              <div style={{ ...card, padding: 48, textAlign: "center" }}>
                <div style={{ fontSize: ".82rem", color: "rgba(160,200,235,.3)", marginBottom: 16 }}>
                  {busca || filtroDominio !== "todos"
                    ? "Nenhum programa encontrado para esse filtro."
                    : "Nenhum programa criado ainda."}
                </div>
                {acesso.podeEditarProgramas && !busca && filtroDominio === "todos" && (
                  <button onClick={() => setView("goal-builder")}
                    style={{ padding: "9px 20px", borderRadius: 9, border: "none", background: "linear-gradient(135deg,#1D9E75,#0f8f7a)", color: "#07111f", fontWeight: 700, fontSize: ".82rem", cursor: "pointer", fontFamily: "var(--font-sans)" }}>
                    Criar primeiro programa
                  </button>
                )}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {programasFiltrados.map(prog => {
                  const corDom = DOMINIO_COR[prog.dominio] ?? "rgba(160,200,235,.4)"
                  const operante = OPERANTES.find(o => o.id === prog.operante)
                  return (
                    <div key={prog.id} style={{ ...card, padding: 18 }}>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" as const }}>
                            <span style={{ fontSize: ".88rem", fontWeight: 700, color: "#e8f0f8" }}>{prog.nome}</span>
                            <span style={{ fontSize: ".62rem", color: corDom, background: `${corDom}15`, border: `1px solid ${corDom}25`, borderRadius: 20, padding: "2px 8px", fontWeight: 600 }}>
                              {DOMINIOS.find(d => d.id === prog.dominio)?.label ?? prog.dominio}
                            </span>
                            {prog.tipo_registro && prog.tipo_registro !== "dtt" && (
                              <span style={{ fontSize: ".62rem", color: "#378ADD", background: "rgba(55,138,221,.1)", border: "1px solid rgba(55,138,221,.2)", borderRadius: 20, padding: "2px 8px" }}>
                                {prog.tipo_registro}
                              </span>
                            )}
                          </div>
                          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" as const }}>
                            {operante && (
                              <div style={{ fontSize: ".7rem", color: "rgba(160,200,235,.5)" }}>
                                <span style={{ color: operante.cor, fontWeight: 600 }}>{operante.label}</span>
                              </div>
                            )}
                            {prog.total_tentativas && (
                              <div style={{ fontSize: ".7rem", color: "rgba(160,200,235,.5)" }}>
                                {prog.total_tentativas} tentativas/sessão
                              </div>
                            )}
                            {prog.criterio_maestria && (
                              <div style={{ fontSize: ".7rem", color: "rgba(160,200,235,.5)" }}>
                                Critério: {prog.criterio_maestria}
                              </div>
                            )}
                          </div>
                          {prog.sd && (
                            <div style={{ fontSize: ".72rem", color: "rgba(160,200,235,.4)", marginTop: 6, lineHeight: 1.5 }}>
                              SD: {prog.sd.slice(0, 100)}{prog.sd.length > 100 ? "..." : ""}
                            </div>
                          )}
                          {/* Passos de encadeamento */}
                          {prog.tipo_registro === "encadeamento" && prog.passos_encadeamento && prog.passos_encadeamento.length > 0 && (
                            <div style={{ marginTop: 8 }}>
                              <div style={{ fontSize: ".6rem", color: "rgba(170,210,245,.4)", textTransform: "uppercase" as const, letterSpacing: ".07em", marginBottom: 4 }}>
                                {prog.passos_encadeamento.length} passos · {prog.direcao_encadeamento ?? "frente"}
                              </div>
                              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" as const }}>
                                {prog.passos_encadeamento.slice(0, 4).map((passo, i) => (
                                  <span key={i} style={{ fontSize: ".62rem", padding: "2px 8px", borderRadius: 4, background: "rgba(139,127,232,.1)", color: "#8B7FE8", border: "1px solid rgba(139,127,232,.2)" }}>
                                    {i + 1}. {passo.slice(0, 30)}{passo.length > 30 ? "..." : ""}
                                  </span>
                                ))}
                                {prog.passos_encadeamento.length > 4 && (
                                  <span style={{ fontSize: ".62rem", color: "rgba(160,200,235,.3)" }}>
                                    +{prog.passos_encadeamento.length - 4}
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                          {/* Hierarquia de dicas */}
                          {prog.hierarquia_dicas && prog.hierarquia_dicas.length > 0 && (
                            <div style={{ display: "flex", gap: 4, marginTop: 8, flexWrap: "wrap" as const }}>
                              {prog.hierarquia_dicas.slice(0, 5).map((d, i) => (
                                <span key={i} style={{ fontSize: ".6rem", padding: "1px 6px", borderRadius: 4, background: "rgba(26,58,92,.3)", color: "rgba(160,200,235,.5)", border: "1px solid rgba(26,58,92,.4)" }}>
                                  {d}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Ações */}
                        {acesso.podeEditarProgramas && (
                          <div style={{ display: "flex", flexDirection: "column" as const, gap: 6, flexShrink: 0 }}>
                            <button onClick={() => abrirEditar(prog)}
                              style={{ padding: "5px 12px", borderRadius: 7, border: "1px solid rgba(55,138,221,.3)", background: "rgba(55,138,221,.08)", color: "#378ADD", fontSize: ".68rem", fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-sans)" }}>
                              Editar
                            </button>
                            <button onClick={() => setConfirmExcluir(prog)}
                              style={{ padding: "5px 12px", borderRadius: 7, border: "1px solid rgba(224,90,75,.25)", background: "transparent", color: "rgba(224,90,75,.6)", fontSize: ".68rem", fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-sans)" }}>
                              Excluir
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}

        {tabBiblioteca === "plataforma" && (
          <div style={{ ...card, padding: 48, textAlign: "center" }}>
            <div style={{ fontSize: ".82rem", color: "rgba(160,200,235,.3)", marginBottom: 8 }}>
              Biblioteca Fracta
            </div>
            <div style={{ fontSize: ".72rem", color: "rgba(160,200,235,.2)", lineHeight: 1.65 }}>
              Pacotes de programas curados pela equipe Fracta — por diagnóstico, operante e fase de intervenção.<br/>
              Em breve.
            </div>
          </div>
        )}

        {tabBiblioteca === "avaliacao" && (
          <div style={{ ...card, padding: 48, textAlign: "center" }}>
            <div style={{ fontSize: ".82rem", color: "rgba(160,200,235,.3)", marginBottom: 8 }}>
              Programas gerados por avaliação
            </div>
            <div style={{ fontSize: ".72rem", color: "rgba(160,200,235,.2)", lineHeight: 1.65 }}>
              Programas sugeridos automaticamente com base nos resultados de VB-MAPP, PEAK e ABLLS-R.<br/>
              Acesse via perfil do paciente — aba Programas.
            </div>
          </div>
        )}

        {tabBiblioteca === "equipe" && (
          <div style={{ ...card, padding: 48, textAlign: "center" }}>
            <div style={{ fontSize: ".82rem", color: "rgba(160,200,235,.3)", marginBottom: 8 }}>
              Programas da equipe
            </div>
            <div style={{ fontSize: ".72rem", color: "rgba(160,200,235,.2)", lineHeight: 1.65 }}>
              Pacotes de programas enviados pelo supervisor para os supervisionados.<br/>
              Em breve — integração com gestão de equipe.
            </div>
          </div>
        )}

        {/* Modal confirmar exclusão */}
        {confirmExcluir && (
          <div onClick={() => setConfirmExcluir(null)}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", backdropFilter: "blur(4px)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
            <div onClick={e => e.stopPropagation()}
              style={{ background: "rgba(13,32,53,.97)", border: "1px solid rgba(224,90,75,.3)", borderRadius: 16, padding: 28, width: "100%", maxWidth: 400 }}>
              <div style={{ fontSize: "1rem", fontWeight: 700, color: "#e8f0f8", marginBottom: 8 }}>Excluir programa</div>
              <div style={{ fontSize: ".82rem", color: "rgba(160,200,235,.6)", marginBottom: 6, lineHeight: 1.6 }}>
                Tem certeza que deseja excluir <strong style={{ color: "#e8f0f8" }}>{confirmExcluir.nome}</strong>?
              </div>
              <div style={{ fontSize: ".75rem", color: "rgba(160,200,235,.4)", marginBottom: 24, lineHeight: 1.6 }}>
                O programa será removido da biblioteca. Pacientes com esse programa no plano não serão afetados — ele permanece vinculado ao plano existente.
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setConfirmExcluir(null)}
                  style={{ flex: 1, padding: "10px", borderRadius: 9, border: "1px solid rgba(70,120,180,.4)", background: "transparent", color: "rgba(160,200,235,.6)", fontSize: ".8rem", cursor: "pointer", fontFamily: "var(--font-sans)" }}>
                  Cancelar
                </button>
                <button onClick={() => excluirPrograma(confirmExcluir)} disabled={excluindo}
                  style={{ flex: 1, padding: "10px", borderRadius: 9, border: "none", background: "linear-gradient(135deg,#E05A4B,#c04030)", color: "#fff", fontSize: ".8rem", fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-sans)" }}>
                  {excluindo ? "Excluindo..." : "Excluir"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── VIEW: GOAL BUILDER (criar ou editar) ────────────────────────────────────
  return (
    <GoalBuilder
      terapeutaId={terapeuta?.id ?? ""}
      editandoId={editandoId}
      acesso={acesso}
      onVoltar={() => { setView("biblioteca"); setEditandoId(null); carregarProgramas() }}
    />
  )
}

// ─── GOAL BUILDER ────────────────────────────────────────────────────────────
function GoalBuilder({
  terapeutaId, editandoId, acesso, onVoltar
}: {
  terapeutaId: string
  editandoId: string | null
  acesso: any
  onVoltar: () => void
}) {
  const [etapa,    setEtapa]    = useState<Etapa>(1)
  const [programa, setPrograma] = useState<Programa>(PROGRAMA_INICIAL)
  const [salvo,    setSalvo]    = useState(false)
  const [pacientes, setPacientes] = useState<{ id: string; nome: string; iniciais: string; gradient: string }[]>([])

  const card: React.CSSProperties = {
    background: "rgba(13,32,53,.75)",
    border: "1px solid rgba(26,58,92,.5)",
    borderRadius: 14,
    backdropFilter: "blur(8px)",
  }
  const inp: React.CSSProperties = {
    background: "rgba(20,55,110,.55)",
    border: "1px solid rgba(26,58,92,.6)",
    borderRadius: 8, padding: "9px 12px",
    color: "#e8f0f8", fontFamily: "var(--font-sans)",
    fontSize: ".82rem", outline: "none",
    width: "100%", boxSizing: "border-box" as const,
  }
  const lbl: React.CSSProperties = {
    fontSize: ".6rem", fontWeight: 700,
    textTransform: "uppercase" as const,
    letterSpacing: ".09em", color: "rgba(170,210,245,.6)",
    marginBottom: 8, display: "block",
  }

  useEffect(() => {
    async function carregarPacientes() {
      if (!terapeutaId) return
      const { data: planos } = await supabase
        .from("planos")
        .select("criancas ( id, nome )")
        .eq("terapeuta_id", terapeutaId)
        .eq("status", "ativo")
      if (!planos) return
      const criancaMap = new Map<string, string>()
      for (const pl of planos) {
        const c = (pl as any).criancas as any
        if (c && !criancaMap.has(c.id)) criancaMap.set(c.id, c.nome)
      }
      setPacientes(Array.from(criancaMap.entries()).map(([id, nome], i) => ({
        id, nome, iniciais: iniciaisPac(nome), gradient: GRADIENTS_PAC[i % GRADIENTS_PAC.length],
      })))
    }

    async function carregarEdicao() {
      if (!editandoId) return
      const { data } = await supabase.from("programas").select("*").eq("id", editandoId).single()
      if (!data) return
      setPrograma({
        nome:               data.nome ?? "",
        operante:           data.operante ?? "tato",
        tipoComportamento:  "verbal",
        nivelTreino:        (data.nivel === "iniciante" ? "basico" : data.nivel) ?? "basico",
        dominio:            data.dominio ?? "comunicacao",
        comportamentoAlvo:  data.comportamento_alvo ?? data.objetivo ?? "",
        sd:                 data.sd ?? "",
        material:           data.materiais ?? "",
        instrucoes:         data.dica ?? "",
        pacienteId:         "1",
        estimulos:          data.estimulos?.length > 0 ? data.estimulos : [{ id: uid(), modelo: "", comparacao: "", modeloTipo: "texto", comparacaoTipo: "texto" }],
        relacoes:           data.relacoes ?? ["A→B"],
        totalTentativas:    data.total_tentativas ?? 10,
        ordemApresentacao:  "randomizado",
        criterios:          CRITERIOS_DEFAULT,
        criterioMaestria:   data.criterio_maestria ?? "80% de respostas corretas",
        sessoesParaMaestria: 3,
        reforcoGeral:       "",
        nivelDicas:         data.hierarquia_dicas ?? DICAS_DEFAULT,
        tipoRegistro:       data.tipo_registro ?? "dtt",
        passosEncadeamento: data.passos_encadeamento ?? [],
        direcaoEncadeamento:(data.direcao_encadeamento ?? "frente") as "frente" | "tras" | "total",
      })
    }

    carregarPacientes()
    carregarEdicao()
  }, [terapeutaId, editandoId])

  if (!acesso.podeEditarProgramas) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", gap: 16, color: "rgba(232,238,244,.6)", fontFamily: "var(--font-sans)" }}>
      <div style={{ fontSize: 32, opacity: 0.2 }}>⊘</div>
      <div style={{ fontSize: 15, fontWeight: 500, color: "#e8eef4" }}>Acesso restrito</div>
      <div style={{ fontSize: 13, textAlign: "center", maxWidth: 360, lineHeight: 1.6 }}>
        A criação e edição de programas requer nível QASP-S ou QBA. Solicite ao seu supervisor que configure os programas para seus pacientes.
      </div>
      <button onClick={onVoltar} style={{ padding: "9px 20px", borderRadius: 9, border: "1px solid rgba(70,120,180,.4)", background: "transparent", color: "rgba(160,200,235,.7)", fontSize: ".82rem", cursor: "pointer", fontFamily: "var(--font-sans)" }}>
        Voltar à biblioteca
      </button>
    </div>
  )

  const upd = useCallback(<K extends keyof Programa>(key: K, val: Programa[K]) => {
    setPrograma(prev => ({ ...prev, [key]: val }))
  }, [])

  const etapa1Valida = programa.nome.trim() && programa.comportamentoAlvo.trim() && programa.sd.trim()
  const etapa2Valida = programa.estimulos.length > 0 && programa.estimulos.every(e => e.modelo.trim() && e.comparacao.trim())
  const etapa3Valida = programa.criterioMaestria.trim() && programa.reforcoGeral.trim()

  const handleSalvar = async () => {
    const payload = {
      nome:                    programa.nome,
      operante:                programa.operante,
      dominio:                 programa.dominio,
      objetivo:                programa.comportamentoAlvo,
      comportamento_alvo:      programa.comportamentoAlvo,
      sd:                      programa.sd,
      materiais:               programa.material,
      dica:                    programa.instrucoes,
      total_tentativas:        programa.totalTentativas,
      criterio_maestria:       programa.criterioMaestria,
      nivel:                   programa.nivelTreino === "basico" ? "iniciante" : programa.nivelTreino,
      estimulos:               programa.estimulos,
      relacoes:                programa.relacoes,
      hierarquia_dicas:        programa.nivelDicas.filter(d => d.trim()),
      tipo_registro:           programa.tipoRegistro,
      passos_encadeamento:     programa.tipoRegistro === "encadeamento" ? programa.passosEncadeamento.filter(p => p.trim()) : null,
      direcao_encadeamento:    programa.tipoRegistro === "encadeamento" ? programa.direcaoEncadeamento : null,
      ativo:                   true,
    }

    let error
    if (editandoId) {
      const res = await supabase.from("programas").update(payload).eq("id", editandoId)
      error = res.error
    } else {
      const res = await supabase.from("programas").insert(payload)
      error = res.error
    }

    if (!error) {
      setSalvo(true)
    } else {
      console.error("Erro ao salvar programa:", error)
      alert("Erro ao salvar. Verifique o console.")
    }
  }

  const ETAPAS_LABELS = ["Identificação", "Estímulos", "Critério", "Revisão"]

  if (salvo) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "50vh", gap: 20 }}>
      <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(29,158,117,.15)", border: "1px solid rgba(29,158,117,.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.4rem", color: "#1D9E75" }}>✓</div>
      <div style={{ fontSize: "1.3rem", fontWeight: 800, color: "#e8f0f8" }}>
        {editandoId ? "Programa atualizado" : "Programa criado"}
      </div>
      <div style={{ fontSize: ".82rem", color: "rgba(160,200,235,.5)", textAlign: "center" }}>
        <strong style={{ color: "#1D9E75" }}>{programa.nome}</strong> foi {editandoId ? "atualizado" : "adicionado"} à biblioteca de programas.
      </div>
      <div style={{ display: "flex", gap: 12 }}>
        <button onClick={() => { setPrograma(PROGRAMA_INICIAL); setEtapa(1); setSalvo(false) }}
          style={{ padding: "10px 20px", borderRadius: 9, border: "1px solid rgba(70,120,180,.5)", background: "transparent", color: "rgba(160,200,235,.92)", fontFamily: "var(--font-sans)", fontWeight: 600, fontSize: ".82rem", cursor: "pointer" }}>
          Criar outro
        </button>
        <button onClick={onVoltar}
          style={{ padding: "10px 20px", borderRadius: 9, border: "none", background: "linear-gradient(135deg,#1D9E75,#0f8f7a)", color: "#07111f", fontFamily: "var(--font-sans)", fontWeight: 700, fontSize: ".82rem", cursor: "pointer" }}>
          Ver biblioteca →
        </button>
      </div>
    </div>
  )

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Cabeçalho */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={onVoltar}
          style={{ background: "none", border: "none", color: "rgba(160,200,235,.7)", cursor: "pointer", fontSize: ".75rem", fontFamily: "var(--font-sans)", display: "flex", alignItems: "center", gap: 4, padding: 0 }}>
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 3L5 8l5 5"/></svg>
          Biblioteca
        </button>
        <div style={{ width: 1, height: 16, background: "rgba(26,58,92,.5)" }} />
        <h1 style={{ fontSize: "1rem", fontWeight: 700, color: "#e8f0f8", margin: 0 }}>
          {editandoId ? "Editar programa" : "Goal Builder"}
        </h1>
        <div style={{ fontSize: ".72rem", color: "rgba(160,200,235,.4)" }}>
          {editandoId ? programa.nome : "Construção de programa terapêutico"}
        </div>
      </div>

      {/* Progress steps */}
      <div style={{ display: "flex", alignItems: "center" }}>
        {([1,2,3,4] as Etapa[]).map((e, i) => {
          const ativa = e === etapa
          const concluida = e < etapa
          return (
            <div key={e} style={{ display: "flex", alignItems: "center", flex: 1 }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <button onClick={() => e < etapa && setEtapa(e)}
                  style={{ width: 32, height: 32, borderRadius: "50%", border: `2px solid ${concluida ? "#1D9E75" : ativa ? "#1D9E75" : "rgba(26,58,92,.5)"}`, background: concluida ? "#1D9E75" : ativa ? "rgba(29,158,117,.15)" : "rgba(7,17,31,.8)", display: "flex", alignItems: "center", justifyContent: "center", cursor: e < etapa ? "pointer" : "default", color: concluida ? "#fff" : ativa ? "#1D9E75" : "rgba(160,200,235,.3)", fontSize: concluida ? ".75rem" : ".82rem", fontWeight: 700 }}>
                  {concluida ? "✓" : e}
                </button>
                <span style={{ fontSize: ".6rem", color: ativa ? "#1D9E75" : "rgba(160,200,235,.35)", whiteSpace: "nowrap" as const }}>{ETAPAS_LABELS[i]}</span>
              </div>
              {i < 3 && <div style={{ flex: 1, height: 2, background: concluida ? "#1D9E75" : "rgba(26,58,92,.4)", margin: "0 6px", marginBottom: 18 }} />}
            </div>
          )
        })}
      </div>

      {/* ── ETAPA 1 — IDENTIFICAÇÃO ── */}
      {etapa === 1 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ ...card, padding: 20 }}>
            <label style={lbl}>Nome do programa *</label>
            <input value={programa.nome} onChange={e => upd("nome", e.target.value)} placeholder="Ex: Treino de Mando por MO Natural" style={inp} />
          </div>

          <div style={{ ...card, padding: 20 }}>
            <label style={lbl}>Tipo de comportamento *</label>
            <div style={{ display: "flex", gap: 8 }}>
              {(["verbal","não-verbal"] as TipoComportamento[]).map(t => (
                <button key={t} onClick={() => upd("tipoComportamento", t)}
                  style={{ flex: 1, padding: "10px", borderRadius: 9, border: `1px solid ${programa.tipoComportamento === t ? "rgba(29,158,117,.5)" : "rgba(26,58,92,.4)"}`, background: programa.tipoComportamento === t ? "rgba(29,158,117,.15)" : "transparent", color: programa.tipoComportamento === t ? "#1D9E75" : "rgba(160,200,235,.4)", fontSize: ".78rem", fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-sans)", textTransform: "capitalize" as const }}>
                  {t === "verbal" ? "Comportamento Verbal" : "Comportamento Não-verbal"}
                </button>
              ))}
            </div>
          </div>

          {programa.tipoComportamento === "verbal" && (
            <div style={{ ...card, padding: 20 }}>
              <label style={lbl}>Operante verbal *</label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 8 }}>
                {OPERANTES.filter(o => !["imitacao","ouvinte"].includes(o.id)).map(o => (
                  <button key={o.id} onClick={() => upd("operante", o.id)}
                    style={{ padding: "10px 12px", borderRadius: 9, border: `1px solid ${programa.operante === o.id ? o.cor + "55" : "rgba(26,58,92,.5)"}`, background: programa.operante === o.id ? o.cor + "11" : "transparent", cursor: "pointer", textAlign: "left" as const, fontFamily: "var(--font-sans)" }}>
                    <div style={{ fontSize: ".78rem", fontWeight: 600, color: programa.operante === o.id ? o.cor : "rgba(160,200,235,.92)" }}>{o.label}</div>
                    <div style={{ fontSize: ".62rem", color: "rgba(165,208,242,.85)", marginTop: 2 }}>{o.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div style={{ ...card, padding: 20 }}>
            <label style={lbl}>Domínio de desenvolvimento *</label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 8 }}>
              {DOMINIOS.map(d => (
                <button key={d.id} onClick={() => upd("dominio", d.id)}
                  style={{ padding: "9px 12px", borderRadius: 9, border: `1px solid ${programa.dominio === d.id ? d.cor + "55" : "rgba(26,58,92,.4)"}`, background: programa.dominio === d.id ? d.cor + "11" : "transparent", cursor: "pointer", fontFamily: "var(--font-sans)", textAlign: "left" as const }}>
                  <div style={{ fontSize: ".78rem", fontWeight: 600, color: programa.dominio === d.id ? d.cor : "rgba(160,200,235,.84)" }}>{d.label}</div>
                </button>
              ))}
            </div>
          </div>

          <div style={{ ...card, padding: 20 }}>
            <label style={lbl}>Nível de treino *</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {NIVEIS_TREINO.map(n => (
                <button key={n.id} onClick={() => upd("nivelTreino", n.id)}
                  style={{ padding: "12px 14px", borderRadius: 9, border: `1px solid ${programa.nivelTreino === n.id ? "rgba(29,158,117,.4)" : "rgba(26,58,92,.4)"}`, background: programa.nivelTreino === n.id ? "rgba(29,158,117,.1)" : "transparent", cursor: "pointer", fontFamily: "var(--font-sans)", textAlign: "left" as const }}>
                  <div style={{ fontSize: ".8rem", fontWeight: 600, color: programa.nivelTreino === n.id ? "#1D9E75" : "rgba(160,200,235,.84)" }}>{n.label}</div>
                  <div style={{ fontSize: ".65rem", color: "rgba(165,208,242,.85)", marginTop: 2 }}>{n.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div style={{ ...card, padding: 20 }}>
            <label style={lbl}>Comportamento-alvo *</label>
            <textarea value={programa.comportamentoAlvo} onChange={e => upd("comportamentoAlvo", e.target.value)} rows={3} placeholder="Descreva o comportamento que será ensinado." style={{ ...inp, resize: "none" as const }} />
          </div>

          <div style={{ ...card, padding: 20 }}>
            <label style={lbl}>SD — Estímulo Discriminativo *</label>
            <textarea value={programa.sd} onChange={e => upd("sd", e.target.value)} rows={3} placeholder="Descreva o antecedente que controla a resposta." style={{ ...inp, resize: "none" as const }} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div style={{ ...card, padding: 20 }}>
              <label style={lbl}>Materiais necessários</label>
              <textarea value={programa.material} onChange={e => upd("material", e.target.value)} rows={3} placeholder="Flashcards, objetos, tablet..." style={{ ...inp, resize: "none" as const }} />
            </div>
            <div style={{ ...card, padding: 20 }}>
              <label style={lbl}>Instruções de aplicação</label>
              <textarea value={programa.instrucoes} onChange={e => upd("instrucoes", e.target.value)} rows={3} placeholder="Procedimento passo a passo..." style={{ ...inp, resize: "none" as const }} />
            </div>
          </div>

          <button onClick={() => setEtapa(2)} disabled={!etapa1Valida}
            style={{ padding: 14, borderRadius: 10, border: "none", background: etapa1Valida ? "linear-gradient(135deg,#1D9E75,#0f8f7a)" : "rgba(26,58,92,.4)", color: etapa1Valida ? "#07111f" : "rgba(165,208,242,.85)", fontFamily: "var(--font-sans)", fontWeight: 800, fontSize: ".88rem", cursor: etapa1Valida ? "pointer" : "not-allowed" }}>
            Próximo — Estímulos →
          </button>
        </div>
      )}

      {/* ── ETAPA 2 — ESTÍMULOS ── */}
      {etapa === 2 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ ...card, padding: 20 }}>
            <label style={lbl}>Relações de treino</label>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" as const }}>
              {RELACOES_DISP.map(r => {
                const ativa = programa.relacoes.includes(r.id)
                return (
                  <button key={r.id} onClick={() => {
                    upd("relacoes", ativa ? programa.relacoes.filter(x => x !== r.id) : [...programa.relacoes, r.id])
                  }} style={{ padding: "6px 12px", borderRadius: 8, border: `1px solid ${ativa ? "rgba(29,158,117,.4)" : "rgba(26,58,92,.4)"}`, background: ativa ? "rgba(29,158,117,.12)" : "transparent", cursor: "pointer", fontFamily: "var(--font-sans)" }}>
                    <div style={{ fontSize: ".75rem", fontWeight: ativa ? 700 : 400, color: ativa ? "#1D9E75" : "rgba(160,200,235,.6)" }}>{r.label}</div>
                    <div style={{ fontSize: ".6rem", color: "rgba(160,200,235,.35)" }}>{r.desc}</div>
                  </button>
                )
              })}
            </div>
          </div>

          <div style={{ ...card, padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <label style={{ ...lbl, marginBottom: 0 }}>Pares de estímulos *</label>
              <button onClick={() => upd("estimulos", [...programa.estimulos, { id: uid(), modelo: "", comparacao: "", modeloTipo: "texto", comparacaoTipo: "texto" }])}
                style={{ padding: "5px 12px", borderRadius: 7, border: "1px solid rgba(29,158,117,.3)", background: "rgba(29,158,117,.08)", color: "#1D9E75", fontSize: ".7rem", fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-sans)" }}>
                + Adicionar par
              </button>
            </div>

            {programa.estimulos.map((est, i) => (
              <div key={est.id} style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr auto", gap: 8, alignItems: "center", marginBottom: 8 }}>
                <input value={est.modelo} onChange={e => upd("estimulos", programa.estimulos.map((x, j) => j === i ? { ...x, modelo: e.target.value } : x))} placeholder={`Modelo ${i+1}...`} style={inp} />
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="rgba(170,210,245,.4)" strokeWidth="1.5"><path d="M2 8h12M9 3l5 5-5 5"/></svg>
                <input value={est.comparacao} onChange={e => upd("estimulos", programa.estimulos.map((x, j) => j === i ? { ...x, comparacao: e.target.value } : x))} placeholder={`Comparação ${i+1}...`} style={inp} />
                <button onClick={() => programa.estimulos.length > 1 && upd("estimulos", programa.estimulos.filter((_, j) => j !== i))}
                  style={{ width: 28, height: 36, borderRadius: 7, border: "1px solid rgba(224,90,75,.25)", background: "transparent", color: "rgba(224,90,75,.6)", cursor: programa.estimulos.length > 1 ? "pointer" : "not-allowed", fontSize: ".85rem", display: "flex", alignItems: "center", justifyContent: "center", opacity: programa.estimulos.length > 1 ? 1 : .3 }}>
                  ×
                </button>
              </div>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div style={{ ...card, padding: 20 }}>
              <label style={lbl}>Tentativas por sessão</label>
              <input type="number" min={5} max={50} value={programa.totalTentativas} onChange={e => upd("totalTentativas", Number(e.target.value))} style={inp} />
            </div>
            <div style={{ ...card, padding: 20 }}>
              <label style={lbl}>Ordem de apresentação</label>
              <div style={{ display: "flex", gap: 8 }}>
                {(["randomizado","fixo"] as const).map(o => (
                  <button key={o} onClick={() => upd("ordemApresentacao", o)}
                    style={{ flex: 1, padding: "9px", borderRadius: 8, border: `1px solid ${programa.ordemApresentacao === o ? "rgba(29,158,117,.4)" : "rgba(26,58,92,.4)"}`, background: programa.ordemApresentacao === o ? "rgba(29,158,117,.1)" : "transparent", color: programa.ordemApresentacao === o ? "#1D9E75" : "rgba(160,200,235,.5)", fontSize: ".75rem", fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-sans)", textTransform: "capitalize" as const }}>
                    {o}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => setEtapa(1)} style={{ padding: "12px 20px", borderRadius: 10, border: "1px solid rgba(70,120,180,.5)", background: "transparent", color: "rgba(160,200,235,.90)", fontFamily: "var(--font-sans)", fontWeight: 500, fontSize: ".85rem", cursor: "pointer" }}>← Voltar</button>
            <button onClick={() => setEtapa(3)} disabled={!etapa2Valida}
              style={{ flex: 1, padding: 12, borderRadius: 10, border: "none", background: etapa2Valida ? "linear-gradient(135deg,#1D9E75,#0f8f7a)" : "rgba(26,58,92,.4)", color: etapa2Valida ? "#07111f" : "rgba(165,208,242,.85)", fontFamily: "var(--font-sans)", fontWeight: 800, fontSize: ".88rem", cursor: etapa2Valida ? "pointer" : "not-allowed" }}>
              Próximo — Critério →
            </button>
          </div>
        </div>
      )}

      {/* ── ETAPA 3 — CRITÉRIO ── */}
      {etapa === 3 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          <div style={{ ...card, padding: 20 }}>
            <label style={lbl}>Critério de domínio (maestria)</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, marginBottom: 10 }}>
              <input value={programa.criterioMaestria} onChange={e => upd("criterioMaestria", e.target.value)} placeholder="Ex: 80% de respostas corretas" style={inp} />
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: ".75rem", color: "rgba(160,200,235,.84)" }}>em</span>
                <input type="number" min={1} max={10} value={programa.sessoesParaMaestria} onChange={e => upd("sessoesParaMaestria", Number(e.target.value))} style={{ ...inp, width: 50, textAlign: "center" as const }} />
                <span style={{ fontSize: ".75rem", color: "rgba(160,200,235,.84)", whiteSpace: "nowrap" as const }}>sessões</span>
              </div>
            </div>
          </div>

          <div style={{ ...card, padding: 20 }}>
            <label style={lbl}>Tipo de registro</label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
              {([
                ["dtt",          "DTT",          "Tentativa discreta"],
                ["frequencia",   "Frequência",   "Contagem livre"],
                ["duracao",      "Duração",       "Tempo de resposta"],
                ["latencia",     "Latência",      "SD → resposta"],
                ["encadeamento", "Encadeamento",  "Task analysis"],
                ["matching",     "Matching",      "Estímulo/comparação"],
              ] as const).map(([id, label, desc]) => (
                <button key={id} onClick={() => upd("tipoRegistro", id)}
                  style={{ padding: "8px 6px", borderRadius: 8, border: `1px solid ${programa.tipoRegistro === id ? "rgba(55,138,221,.4)" : "rgba(26,58,92,.4)"}`, background: programa.tipoRegistro === id ? "rgba(55,138,221,.1)" : "transparent", cursor: "pointer", fontFamily: "var(--font-sans)", textAlign: "center" as const }}>
                  <div style={{ fontSize: ".72rem", fontWeight: programa.tipoRegistro === id ? 700 : 400, color: programa.tipoRegistro === id ? "#378ADD" : "rgba(160,200,235,.5)" }}>{label}</div>
                  <div style={{ fontSize: ".58rem", color: "rgba(160,200,235,.3)", marginTop: 2 }}>{desc}</div>
                </button>
              ))}
            </div>
          </div>

          {programa.tipoRegistro === "encadeamento" && (
            <div style={{ ...card, padding: 20 }}>
              <label style={lbl}>Passos da tarefa (task analysis)</label>
              <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
                {([["frente","À frente"],["tras","Atrás"],["total","Cadeia total"]] as const).map(([id, label]) => (
                  <button key={id} onClick={() => upd("direcaoEncadeamento", id)}
                    style={{ flex: 1, padding: "7px", borderRadius: 8, border: `1px solid ${programa.direcaoEncadeamento === id ? "rgba(139,127,232,.4)" : "rgba(26,58,92,.4)"}`, background: programa.direcaoEncadeamento === id ? "rgba(139,127,232,.1)" : "transparent", color: programa.direcaoEncadeamento === id ? "#8B7FE8" : "rgba(160,200,235,.4)", fontSize: ".65rem", fontWeight: programa.direcaoEncadeamento === id ? 700 : 400, cursor: "pointer", fontFamily: "var(--font-sans)" }}>
                    {label}
                  </button>
                ))}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
                {programa.passosEncadeamento.map((passo, idx) => (
                  <div key={idx} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: "rgba(26,58,92,.2)", borderRadius: 8, border: "1px solid rgba(26,58,92,.3)" }}>
                    <span style={{ fontSize: ".65rem", color: "rgba(160,200,235,.35)", width: 20, flexShrink: 0 }}>{idx + 1}.</span>
                    <input value={passo}
                      onChange={e => upd("passosEncadeamento", programa.passosEncadeamento.map((p, i) => i === idx ? e.target.value : p))}
                      style={{ ...inp, flex: 1, padding: "5px 8px", fontSize: ".75rem" }} />
                    <button onClick={() => upd("passosEncadeamento", programa.passosEncadeamento.filter((_, i) => i !== idx))}
                      style={{ background: "none", border: "none", color: "rgba(224,90,75,.5)", cursor: "pointer", fontSize: ".85rem", flexShrink: 0 }}>×</button>
                  </div>
                ))}
              </div>
              <button onClick={() => upd("passosEncadeamento", [...programa.passosEncadeamento, ""])}
                style={{ padding: "7px 14px", borderRadius: 8, border: "1px dashed rgba(139,127,232,.3)", background: "transparent", color: "#8B7FE8", fontSize: ".72rem", fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-sans)" }}>
                + Adicionar passo
              </button>
            </div>
          )}

          <div style={{ ...card, padding: 20 }}>
            <label style={lbl}>Escala de pontuação</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {programa.criterios.map((c, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "44px 1fr 1fr", gap: 10, alignItems: "center" }}>
                  <div style={{ width: 40, height: 40, borderRadius: 8, background: c.pontos >= 8 ? "rgba(29,158,117,.15)" : c.pontos >= 4 ? "rgba(239,159,39,.1)" : "rgba(224,90,75,.1)", border: `1px solid ${c.pontos >= 8 ? "rgba(29,158,117,.3)" : c.pontos >= 4 ? "rgba(239,159,39,.3)" : "rgba(224,90,75,.3)"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".85rem", fontWeight: 800, color: c.pontos >= 8 ? "#1D9E75" : c.pontos >= 4 ? "#EF9F27" : "#E05A4B" }}>
                    {c.pontos}
                  </div>
                  <input value={c.descricao} onChange={e => upd("criterios", programa.criterios.map((x, j) => j === i ? { ...x, descricao: e.target.value } : x))} style={{ ...inp, fontSize: ".75rem" }} />
                  <input value={c.reforco} onChange={e => upd("criterios", programa.criterios.map((x, j) => j === i ? { ...x, reforco: e.target.value } : x))} placeholder="Reforço..." style={{ ...inp, fontSize: ".75rem" }} />
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div style={{ ...card, padding: 20 }}>
              <label style={lbl}>Reforçador geral *</label>
              <input value={programa.reforcoGeral} onChange={e => upd("reforcoGeral", e.target.value)} placeholder="Ex: Fichas, tempo no tablet..." style={inp} />
            </div>
            <div style={{ ...card, padding: 20 }}>
              <label style={lbl}>Hierarquia de dicas</label>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {programa.nivelDicas.map((d, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 22, height: 22, borderRadius: "50%", background: "rgba(20,55,110,.65)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".62rem", fontWeight: 700, color: "rgba(160,200,235,.84)", flexShrink: 0 }}>{i + 1}</div>
                    <input value={d} onChange={e => upd("nivelDicas", programa.nivelDicas.map((x, j) => j === i ? e.target.value : x))} style={{ ...inp, padding: "6px 10px", fontSize: ".75rem" }} />
                  </div>
                ))}
                <button onClick={() => upd("nivelDicas", [...programa.nivelDicas, ""])}
                  style={{ padding: "5px 10px", borderRadius: 6, border: "1px dashed rgba(26,58,92,.5)", background: "transparent", color: "rgba(170,210,245,.88)", fontFamily: "var(--font-sans)", fontSize: ".7rem", cursor: "pointer", marginTop: 4 }}>
                  + Adicionar nível
                </button>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => setEtapa(2)} style={{ padding: "12px 20px", borderRadius: 10, border: "1px solid rgba(70,120,180,.5)", background: "transparent", color: "rgba(160,200,235,.90)", fontFamily: "var(--font-sans)", fontWeight: 500, fontSize: ".85rem", cursor: "pointer" }}>← Voltar</button>
            <button onClick={() => setEtapa(4)} disabled={!etapa3Valida}
              style={{ flex: 1, padding: 12, borderRadius: 10, border: "none", background: etapa3Valida ? "linear-gradient(135deg,#1D9E75,#0f8f7a)" : "rgba(26,58,92,.4)", color: etapa3Valida ? "#07111f" : "rgba(165,208,242,.85)", fontFamily: "var(--font-sans)", fontWeight: 800, fontSize: ".88rem", cursor: etapa3Valida ? "pointer" : "not-allowed" }}>
              Próximo — Revisão →
            </button>
          </div>
        </div>
      )}

      {/* ── ETAPA 4 — REVISÃO ── */}
      {etapa === 4 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ ...card, padding: 20, border: "1px solid rgba(29,158,117,.25)" }}>
            <div style={{ fontSize: ".62rem", color: "#1D9E75", fontWeight: 700, letterSpacing: ".09em", textTransform: "uppercase" as const, marginBottom: 12 }}>Resumo do programa</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {[
                { l: "Nome",             v: programa.nome },
                { l: "Disponibilidade",  v: "Biblioteca global" },
                { l: "Operante",         v: OPERANTES.find(o => o.id === programa.operante)?.label ?? "—" },
                { l: "Nível de treino",  v: NIVEIS_TREINO.find(n => n.id === programa.nivelTreino)?.label ?? "—" },
                { l: "Estímulos",        v: `${programa.estimulos.length} pares` },
                { l: "Tentativas/sessão",v: String(programa.totalTentativas) },
                { l: "Tipo de registro", v: programa.tipoRegistro },
                { l: "Critério",         v: `${programa.criterioMaestria} em ${programa.sessoesParaMaestria} sessões` },
                { l: "Reforçador",       v: programa.reforcoGeral },
              ].map(r => (
                <div key={r.l}>
                  <div style={{ fontSize: ".6rem", color: "rgba(170,210,245,.88)", textTransform: "uppercase" as const, letterSpacing: ".08em", marginBottom: 3 }}>{r.l}</div>
                  <div style={{ fontSize: ".82rem", color: "#e8f0f8" }}>{r.v}</div>
                </div>
              ))}
            </div>
          </div>

          {programa.tipoRegistro === "encadeamento" && programa.passosEncadeamento.length > 0 && (
            <div style={{ ...card, padding: 20 }}>
              <div style={{ fontSize: ".62rem", color: "#8B7FE8", fontWeight: 700, letterSpacing: ".09em", textTransform: "uppercase" as const, marginBottom: 12 }}>
                Passos de encadeamento ({programa.passosEncadeamento.length}) · {programa.direcaoEncadeamento}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {programa.passosEncadeamento.map((p, i) => (
                  <div key={i} style={{ display: "flex", gap: 10, padding: "7px 12px", background: "rgba(26,58,92,.2)", borderRadius: 7 }}>
                    <span style={{ fontSize: ".65rem", color: "rgba(160,200,235,.35)", flexShrink: 0 }}>{i + 1}.</span>
                    <span style={{ fontSize: ".78rem", color: "#e8f0f8" }}>{p}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ ...card, padding: 20 }}>
            <div style={{ fontSize: ".62rem", color: "rgba(170,210,245,.88)", fontWeight: 700, letterSpacing: ".09em", textTransform: "uppercase" as const, marginBottom: 10 }}>Comportamento-alvo</div>
            <div style={{ fontSize: ".82rem", color: "rgba(160,200,235,.92)", lineHeight: 1.6 }}>{programa.comportamentoAlvo}</div>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => setEtapa(3)} style={{ padding: "12px 20px", borderRadius: 10, border: "1px solid rgba(70,120,180,.5)", background: "transparent", color: "rgba(160,200,235,.90)", fontFamily: "var(--font-sans)", fontWeight: 500, fontSize: ".85rem", cursor: "pointer" }}>← Voltar</button>
            <button onClick={handleSalvar}
              style={{ flex: 1, padding: 14, borderRadius: 10, border: "none", background: "linear-gradient(135deg,#1D9E75,#0f8f7a)", color: "#07111f", fontFamily: "var(--font-sans)", fontWeight: 800, fontSize: ".9rem", cursor: "pointer" }}>
              {editandoId ? "Salvar alterações" : "Salvar programa"} ✓
            </button>
          </div>
        </div>
      )}
    </div>
  )
}