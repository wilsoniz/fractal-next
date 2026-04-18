"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useClinicContext } from "../layout";

// ─── TIPOS ───────────────────────────────────────────────────────────────────
type Etapa = 1 | 2 | 3 | 4;
type NivelTreino = "basico" | "intermediario" | "avancado";
type TipoOperante = "tato" | "mando" | "intraverbal" | "echoico" | "imitacao" | "ouvinte" | "textual" | "transcricao";
type TipoRelacao = 
  | "A→B"
  | "B→A"
  | "A→C"
  | "B→C"
  | "C→B"
  | "A=A"
  | "B=A"
  | "A=C"
  | "C=A";

interface Estimulo {
  id: string;
  modelo: string;        // SD modelo (ex: imagem, palavra falada)
  comparacao: string;    // SD comparação (ex: nome escrito, imagem)
  modeloTipo: "imagem" | "texto" | "audio" | "emoji";
  comparacaoTipo: "imagem" | "texto" | "audio" | "emoji";
}

interface CriterioPontuacao {
  pontos: number;
  descricao: string;
  reforco: string;
}

interface Programa {
  // Etapa 1
  nome: string;
  operante: TipoOperante;
  nivelTreino: NivelTreino;
  comportamentoAlvo: string;
  sd: string;
  material: string;
  instrucoes: string;
  pacienteId: string;
  // Etapa 2
  estimulos: Estimulo[];
  relacoes: TipoRelacao[];
  totalTentativas: number;
  ordemApresentacao: "fixo" | "randomizado";
  // Etapa 3
  criterios: CriterioPontuacao[];
  criterioMaestria: string;
  sessoesParaMaestria: number;
  reforcoGeral: string;
  nivelDicas: string[];
}

// ─── CONSTANTES ──────────────────────────────────────────────────────────────
const OPERANTES: { id: TipoOperante; label: string; desc: string; cor: string }[] = [
  { id: "mando",       label: "Mando",        desc: "Solicitar itens ou ações",           cor: "#1D9E75" },
  { id: "tato",        label: "Tato",         desc: "Nomear estímulos presentes",          cor: "#378ADD" },
  { id: "intraverbal", label: "Intraverbal",  desc: "Responder a perguntas verbais",       cor: "#8B7FE8" },
  { id: "echoico",     label: "Echoico",      desc: "Imitar sons e palavras",              cor: "#EF9F27" },
  { id: "imitacao",    label: "Imitação",     desc: "Imitar ações motoras",                cor: "#E05A4B" },
  { id: "ouvinte",     label: "Ouvinte",      desc: "Seguir instruções / selecionar",      cor: "#1D9E75" },
  { id: "textual",     label: "Textual",      desc: "Leitura funcional",                   cor: "#378ADD" },
  { id: "transcricao", label: "Transcrição",  desc: "Escrita sob controle verbal",         cor: "#8B7FE8" },
];

const NIVEIS_TREINO = [
  { id: "basico"        as NivelTreino, label: "Nível 1 — Controle direto",       desc: "DTT simples, SD → R → SR. Controle discriminativo por reforçamento direto.", cor: "#1D9E75" },
  { id: "intermediario" as NivelTreino, label: "Nível 2 — Equivalência",          desc: "MTS com relações condicionais. Simetria, transitividade, equivalência.", cor: "#EF9F27" },
  { id: "avancado"      as NivelTreino, label: "Nível 3 — Molduras relacionais",  desc: "Relações derivadas complexas. Comparação, oposição, hierarquia.", cor: "#8B7FE8" },
];

const CRITERIOS_DEFAULT: CriterioPontuacao[] = [
  { pontos: 0,  descricao: "Sem resposta mesmo com várias dicas",              reforco: "Sem reforço" },
  { pontos: 2,  descricao: "Resposta após redução de estímulos e dicas",       reforco: "1 unidade de reforçador" },
  { pontos: 4,  descricao: "Resposta após 2+ dicas, sem redução de estímulos", reforco: "2 unidades de reforçador" },
  { pontos: 8,  descricao: "Resposta após 1 dica verbal ou visual",            reforco: "3 unidades de reforçador" },
  { pontos: 10, descricao: "Resposta independente, sem dicas",                 reforco: "4 unidades de reforçador" },
];

const DICAS_DEFAULT = ["Independente", "Gestual", "Modelo", "Física parcial", "Física total"];

const RELACOES_MTS: { id: TipoRelacao; label: string; desc: string }[] = [
  { id: "A→B", label: "A → B", desc: "Treino direto (modelo → comparação)" },
  { id: "B→A", label: "B → A (Simetria)", desc: "Relação emergente simétrica" },
  { id: "A→C", label: "A → C (Transitividade)", desc: "Relação transitiva emergente" },
  { id: "C→A", label: "C → A (Equivalência)", desc: "Equivalência completa" },
  { id: "B→C", label: "B → C", desc: "Treino adicional" },
  { id: "C→B", label: "C → B", desc: "Relação inversa" },
];

function uid() { return Math.random().toString(36).slice(2, 9); }

// ─── PROGRAMA INICIAL ─────────────────────────────────────────────────────────
const PROGRAMA_INICIAL: Programa = {
  nome: "", operante: "tato", nivelTreino: "basico",
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
};

// ─── PACIENTES MOCK ──────────────────────────────────────────────────────────
const PACIENTES_MOCK = [
  { id: "1", nome: "Lucas Carvalho", iniciais: "LC", gradient: "linear-gradient(135deg,#1D9E75,#378ADD)" },
  { id: "2", nome: "Maria Santos",   iniciais: "MS", gradient: "linear-gradient(135deg,#378ADD,#8B7FE8)" },
  { id: "3", nome: "Rafael Pinto",   iniciais: "RP", gradient: "linear-gradient(135deg,#8B7FE8,#E05A4B)" },
  { id: "4", nome: "Beatriz Lima",   iniciais: "BL", gradient: "linear-gradient(135deg,#4d6d8a,#378ADD)" },
  { id: "5", nome: "Pedro Gomes",    iniciais: "PG", gradient: "linear-gradient(135deg,#EF9F27,#E05A4B)" },
];

// ─── PAGE ────────────────────────────────────────────────────────────────────
export default function GoalBuilderPage() {
  const { terapeuta } = useClinicContext();
  const nivel = terapeuta?.nivel ?? "coordenador";

  const [etapa,    setEtapa]    = useState<Etapa>(1);
  const [programa, setPrograma] = useState<Programa>(PROGRAMA_INICIAL);
  const [salvo,    setSalvo]    = useState(false);

  const upd = useCallback(<K extends keyof Programa>(key: K, val: Programa[K]) => {
    setPrograma(prev => ({ ...prev, [key]: val }));
  }, []);

  // ── Validações por etapa ───────────────────────────────────────────────────
  const etapa1Valida = programa.nome.trim() && programa.comportamentoAlvo.trim() && programa.sd.trim();
  const etapa2Valida = programa.estimulos.length > 0 && programa.estimulos.every(e => e.modelo.trim() && e.comparacao.trim());
  const etapa3Valida = programa.criterioMaestria.trim() && programa.reforcoGeral.trim();

  // ── CSS ────────────────────────────────────────────────────────────────────
const card: React.CSSProperties = {
  background: "#142433",
  border: "1px solid #2C4258",
  borderRadius: 14,
};

const inp: React.CSSProperties = {
  background: "#0F1C2A",
  border: "1px solid #2C4258",
  borderRadius: 8,
  padding: "10px 12px",
  color: "#EAF2F9",
  fontFamily: "var(--font-sans)",
  fontSize: ".85rem",
  outline: "none",
  width: "100%",
  boxSizing: "border-box" as const,
};

const lbl: React.CSSProperties = {
  fontSize: ".65rem",
  fontWeight: 700,
  textTransform: "uppercase" as const,
  letterSpacing: ".08em",
  color: "#B6C7D8",
  marginBottom: 6,
  display: "block",
};
  if (salvo) return (
    <div style={{ maxWidth: 560, margin: "60px auto", textAlign: "center" }}>
      <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(29,158,117,.15)", border: "1px solid rgba(29,158,117,.3)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", fontSize: 28 }}>✓</div>
      <div style={{ fontSize: "1.3rem", fontWeight: 800, color: "#e8f0f8", marginBottom: 8 }}>Programa criado</div>
      <div style={{ fontSize: ".85rem", color: "rgba(160,200,235,.90)", marginBottom: 28 }}>
        <strong style={{ color: "#1D9E75" }}>{programa.nome}</strong> foi adicionado ao plano terapêutico do paciente.
      </div>
      <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
        <button onClick={() => { setPrograma(PROGRAMA_INICIAL); setEtapa(1); setSalvo(false); }} style={{ padding: "10px 20px", borderRadius: 9, border: "1px solid rgba(70,120,180,.5)", background: "transparent", color: "rgba(160,200,235,.92)", fontFamily: "var(--font-sans)", fontWeight: 600, fontSize: ".82rem", cursor: "pointer" }}>
          Criar outro programa
        </button>
        <Link href={`/clinic/paciente/${programa.pacienteId}`} style={{ padding: "10px 20px", borderRadius: 9, border: "none", background: "linear-gradient(135deg,#1D9E75,#0f8f7a)", color: "#07111f", fontFamily: "var(--font-sans)", fontWeight: 700, fontSize: ".82rem", textDecoration: "none" }}>
          Ver perfil do paciente →
        </Link>
      </div>
    </div>
  );

  return (
    <div style={{ maxWidth: 780, margin: "0 auto" }}>

      {/* ── HEADER ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: "1.2rem", fontWeight: 800, color: "#e8f0f8", margin: 0, marginBottom: 4 }}>Goal Builder</h1>
          <div style={{ fontSize: ".72rem", color: "rgba(160,200,235,.84)" }}>Construção de programa terapêutico</div>
        </div>
        <Link href="/clinic/pacientes" style={{ display: "flex", alignItems: "center", gap: 5, fontSize: ".75rem", color: "rgba(160,200,235,.84)", textDecoration: "none" }}>
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M10 3L5 8l5 5"/></svg>
          Pacientes
        </Link>
      </div>

      {/* ── STEPPER ── */}
      <div style={{ display: "flex", alignItems: "center", marginBottom: 28 }}>
        {([1,2,3,4] as Etapa[]).map((e, i) => {
          const labels = ["Identificação","Estímulos","Critério","Revisão"];
          const ativa = e === etapa;
          const concluida = e < etapa;
          return (
            <div key={e} style={{ display: "flex", alignItems: "center", flex: e < 4 ? 1 : undefined }}>
              <button onClick={() => e < etapa && setEtapa(e)} style={{
                display: "flex", flexDirection: "column", alignItems: "center", gap: 5,
                background: "none", border: "none", cursor: e < etapa ? "pointer" : "default", fontFamily: "var(--font-sans)",
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: "50%",
                  background: ativa ? "#1D9E75" : concluida ? "rgba(29,158,117,.2)" : "rgba(26,58,92,.4)",
                  border: `2px solid ${ativa ? "#1D9E75" : concluida ? "rgba(29,158,117,.4)" : "rgba(26,58,92,.6)"}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: ".72rem", fontWeight: 700,
                  color: ativa ? "#07111f" : concluida ? "#1D9E75" : "rgba(170,210,245,.88)",
                }}>
                  {concluida ? "✓" : e}
                </div>
                <span style={{ fontSize: ".62rem", fontWeight: ativa ? 600 : 400, color: ativa ? "#e8f0f8" : "rgba(170,210,245,.88)", whiteSpace: "nowrap" }}>{labels[i]}</span>
              </button>
              {e < 4 && <div style={{ flex: 1, height: 1, background: e < etapa ? "rgba(29,158,117,.3)" : "rgba(26,58,92,.4)", margin: "0 8px", marginBottom: 20 }} />}
            </div>
          );
        })}
      </div>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* ETAPA 1 — IDENTIFICAÇÃO */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {etapa === 1 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Paciente */}
          <div style={{ ...card, padding: 20 }}>
            <label style={lbl}>Paciente</label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {PACIENTES_MOCK.map(p => (
                <button key={p.id} onClick={() => upd("pacienteId", p.id)} style={{
                  display: "flex", alignItems: "center", gap: 8, padding: "8px 14px",
                  borderRadius: 9, border: `1px solid ${programa.pacienteId === p.id ? "rgba(29,158,117,.4)" : "rgba(26,58,92,.5)"}`,
                  background: programa.pacienteId === p.id ? "rgba(29,158,117,.1)" : "transparent",
                  cursor: "pointer", fontFamily: "var(--font-sans)",
                }}>
                  <div style={{ width: 24, height: 24, borderRadius: "50%", background: p.gradient, display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".55rem", fontWeight: 800, color: "#fff" }}>{p.iniciais}</div>
                  <span style={{ fontSize: ".78rem", color: programa.pacienteId === p.id ? "#1D9E75" : "rgba(160,200,235,.92)", fontWeight: programa.pacienteId === p.id ? 600 : 400 }}>{p.nome}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Nome + operante */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div style={{ ...card, padding: 20 }}>
              <label style={lbl}>Nome do programa *</label>
              <input value={programa.nome} onChange={e => upd("nome", e.target.value)} placeholder="Ex: Contato visual — 2 segundos" style={inp} />
            </div>
            <div style={{ ...card, padding: 20 }}>
              <label style={lbl}>Nível de treino *</label>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {NIVEIS_TREINO.map(n => (
                  <button key={n.id} onClick={() => upd("nivelTreino", n.id)} style={{
                    padding: "8px 12px", borderRadius: 8, textAlign: "left",
                    border: `1px solid ${programa.nivelTreino === n.id ? n.cor + "55" : "rgba(26,58,92,.5)"}`,
                    background: programa.nivelTreino === n.id ? n.cor + "11" : "transparent",
                    cursor: "pointer", fontFamily: "var(--font-sans)",
                  }}>
                    <div style={{ fontSize: ".75rem", fontWeight: 600, color: programa.nivelTreino === n.id ? n.cor : "rgba(160,200,235,.92)" }}>{n.label}</div>
                    <div style={{ fontSize: ".65rem", color: "rgba(170,210,245,.88)", marginTop: 2 }}>{n.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Operante */}
          <div style={{ ...card, padding: 20 }}>
            <label style={lbl}>Operante verbal *</label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
              {OPERANTES.map(o => (
                <button key={o.id} onClick={() => upd("operante", o.id)} style={{
                  padding: "10px 12px", borderRadius: 9,
                  border: `1px solid ${programa.operante === o.id ? o.cor + "55" : "rgba(26,58,92,.5)"}`,
                  background: programa.operante === o.id ? o.cor + "11" : "transparent",
                  cursor: "pointer", textAlign: "left", fontFamily: "var(--font-sans)",
                }}>
                  <div style={{ fontSize: ".78rem", fontWeight: 600, color: programa.operante === o.id ? o.cor : "rgba(160,200,235,.92)" }}>{o.label}</div>
                  <div style={{ fontSize: ".62rem", color: "rgba(165,208,242,.85)", marginTop: 2 }}>{o.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Comportamento-alvo + SD */}
          <div style={{ ...card, padding: 20 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div>
                <label style={lbl}>Comportamento-alvo *</label>
                <textarea value={programa.comportamentoAlvo} onChange={e => upd("comportamentoAlvo", e.target.value)} rows={3} placeholder="Descreva a resposta esperada do aprendiz em termos observáveis e mensuráveis." style={{ ...inp, resize: "none" }} />
              </div>
              <div>
                <label style={lbl}>SD — Estímulo discriminativo *</label>
                <textarea value={programa.sd} onChange={e => upd("sd", e.target.value)} rows={3} placeholder="Descreva o antecedente que controla a resposta." style={{ ...inp, resize: "none" }} />
              </div>
            </div>
          </div>

          {/* Material + Instruções */}
          <div style={{ ...card, padding: 20 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div>
                <label style={lbl}>Material necessário</label>
                <input value={programa.material} onChange={e => upd("material", e.target.value)} placeholder="Ex: Fichas de imagem, objetos concretos..." style={inp} />
              </div>
              <div>
                <label style={lbl}>Instruções ao terapeuta</label>
                <input value={programa.instrucoes} onChange={e => upd("instrucoes", e.target.value)} placeholder="Ex: Apresente o SD a 50cm do aprendiz..." style={inp} />
              </div>
            </div>
          </div>

          <button onClick={() => setEtapa(2)} disabled={!etapa1Valida} style={{ padding: 14, borderRadius: 10, border: "none", background: etapa1Valida ? "linear-gradient(135deg,#1D9E75,#0f8f7a)" : "rgba(26,58,92,.4)", color: etapa1Valida ? "#07111f" : "rgba(165,208,242,.85)", fontFamily: "var(--font-sans)", fontWeight: 800, fontSize: ".9rem", cursor: etapa1Valida ? "pointer" : "not-allowed" }}>
            Próximo — Estímulos →
          </button>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* ETAPA 2 — ESTÍMULOS */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {etapa === 2 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Configuração MTS */}
          <div style={{ ...card, padding: 20 }}>
            <label style={lbl}>Configuração da sessão</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div>
                <label style={{ ...lbl, marginBottom: 4 }}>Total de tentativas</label>
                <input type="number" min={4} max={30} value={programa.totalTentativas} onChange={e => upd("totalTentativas", Number(e.target.value))} style={{ ...inp, width: "auto" }} />
              </div>
              <div>
                <label style={{ ...lbl, marginBottom: 4 }}>Ordem de apresentação</label>
                <div style={{ display: "flex", gap: 8 }}>
                  {(["randomizado","fixo"] as const).map(o => (
                    <button key={o} onClick={() => upd("ordemApresentacao", o)} style={{
                      flex: 1, padding: "8px", borderRadius: 8,
                      border: `1px solid ${programa.ordemApresentacao === o ? "rgba(29,158,117,.4)" : "rgba(26,58,92,.5)"}`,
                      background: programa.ordemApresentacao === o ? "rgba(29,158,117,.1)" : "transparent",
                      color: programa.ordemApresentacao === o ? "#1D9E75" : "rgba(160,200,235,.90)",
                      fontFamily: "var(--font-sans)", fontWeight: 500, fontSize: ".78rem", cursor: "pointer",
                    }}>{o === "randomizado" ? "Randomizado" : "Ordem fixa"}</button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Relações MTS — só intermediário e avançado */}
          {programa.nivelTreino !== "basico" && (
            <div style={{ ...card, padding: 20 }}>
              <label style={lbl}>Relações condicionais (MTS)</label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
                {RELACOES_MTS.map(r => {
                  const ativa = programa.relacoes.includes(r.id);
                  return (
                    <button key={r.id} onClick={() => {
                      if (ativa) upd("relacoes", programa.relacoes.filter(x => x !== r.id));
                      else upd("relacoes", [...programa.relacoes, r.id]);
                    }} style={{
                      padding: "9px 12px", borderRadius: 8, textAlign: "left",
                      border: `1px solid ${ativa ? "rgba(139,127,232,.4)" : "rgba(26,58,92,.5)"}`,
                      background: ativa ? "rgba(139,127,232,.1)" : "transparent",
                      cursor: "pointer", fontFamily: "var(--font-sans)",
                    }}>
                      <div style={{ fontSize: ".8rem", fontWeight: 700, color: ativa ? "#8B7FE8" : "rgba(160,200,235,.92)", fontFamily: "monospace" }}>{r.id}</div>
                      <div style={{ fontSize: ".65rem", color: "rgba(170,210,245,.88)", marginTop: 2 }}>{r.desc}</div>
                    </button>
                  );
                })}
              </div>
              {programa.relacoes.length > 0 && (
                <div style={{ marginTop: 12, padding: "8px 12px", background: "rgba(139,127,232,.06)", border: "1px solid rgba(139,127,232,.15)", borderRadius: 8, fontSize: ".72rem", color: "rgba(160,200,235,.92)" }}>
                  Relações selecionadas: <strong style={{ color: "#8B7FE8" }}>{programa.relacoes.join(" · ")}</strong>
                </div>
              )}
            </div>
          )}

          {/* Lista de estímulos */}
          <div style={{ ...card, padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <label style={{ ...lbl, marginBottom: 0 }}>Pares de estímulos *</label>
              <button onClick={() => upd("estimulos", [...programa.estimulos, { id: uid(), modelo: "", comparacao: "", modeloTipo: "texto", comparacaoTipo: "texto" }])} style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 7, border: "1px solid rgba(29,158,117,.3)", background: "rgba(29,158,117,.08)", color: "#1D9E75", fontFamily: "var(--font-sans)", fontWeight: 600, fontSize: ".72rem", cursor: "pointer" }}>
                + Adicionar estímulo
              </button>
            </div>

            {/* Header */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 28px", gap: 10, marginBottom: 8 }}>
              <div style={{ ...lbl, marginBottom: 0 }}>SD Modelo (A)</div>
              <div style={{ ...lbl, marginBottom: 0 }}>SD Comparação (B)</div>
              <div />
            </div>

            {programa.estimulos.map((est, i) => (
              <div key={est.id} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 28px", gap: 10, marginBottom: 8 }}>
                <div style={{ position: "relative" }}>
                  <input value={est.modelo} onChange={e => upd("estimulos", programa.estimulos.map((x, j) => j === i ? { ...x, modelo: e.target.value } : x))} placeholder={`Estímulo ${i + 1} modelo...`} style={{ ...inp }} />
                </div>
                <div style={{ position: "relative" }}>
                  <input value={est.comparacao} onChange={e => upd("estimulos", programa.estimulos.map((x, j) => j === i ? { ...x, comparacao: e.target.value } : x))} placeholder={`Estímulo ${i + 1} comparação...`} style={{ ...inp }} />
                </div>
                <button onClick={() => programa.estimulos.length > 1 && upd("estimulos", programa.estimulos.filter((_, j) => j !== i))} style={{ width: 28, height: 36, borderRadius: 7, border: "1px solid rgba(224,90,75,.25)", background: "transparent", color: "rgba(224,90,75,.6)", cursor: programa.estimulos.length > 1 ? "pointer" : "not-allowed", fontSize: ".85rem", display: "flex", alignItems: "center", justifyContent: "center", opacity: programa.estimulos.length > 1 ? 1 : .3 }}>
                  ×
                </button>
              </div>
            ))}

            {programa.estimulos.length > 0 && programa.estimulos[0].modelo && programa.estimulos[0].comparacao && (
              <div style={{ marginTop: 12, padding: "8px 12px", background: "rgba(20,55,110,.55)", borderRadius: 8 }}>
                <div style={{ fontSize: ".62rem", color: "rgba(170,210,245,.88)", marginBottom: 6 }}>PRÉVIA — Par 1</div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ padding: "8px 14px", background: "rgba(29,158,117,.1)", border: "1px solid rgba(29,158,117,.2)", borderRadius: 8, fontSize: ".85rem", fontWeight: 600, color: "#1D9E75" }}>{programa.estimulos[0].modelo}</div>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="rgba(170,210,245,.88)" strokeWidth="1.5"><path d="M2 8h12M9 3l5 5-5 5"/></svg>
                  <div style={{ padding: "8px 14px", background: "rgba(55,138,221,.1)", border: "1px solid rgba(55,138,221,.2)", borderRadius: 8, fontSize: ".85rem", fontWeight: 600, color: "#378ADD" }}>{programa.estimulos[0].comparacao}</div>
                </div>
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => setEtapa(1)} style={{ padding: "12px 20px", borderRadius: 10, border: "1px solid rgba(70,120,180,.5)", background: "transparent", color: "rgba(160,200,235,.90)", fontFamily: "var(--font-sans)", fontWeight: 500, fontSize: ".85rem", cursor: "pointer" }}>← Voltar</button>
            <button onClick={() => setEtapa(3)} disabled={!etapa2Valida} style={{ flex: 1, padding: 12, borderRadius: 10, border: "none", background: etapa2Valida ? "linear-gradient(135deg,#1D9E75,#0f8f7a)" : "rgba(26,58,92,.4)", color: etapa2Valida ? "#07111f" : "rgba(165,208,242,.85)", fontFamily: "var(--font-sans)", fontWeight: 800, fontSize: ".88rem", cursor: etapa2Valida ? "pointer" : "not-allowed" }}>
              Próximo — Critério →
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* ETAPA 3 — CRITÉRIO */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {etapa === 3 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Critério de maestria */}
          <div style={{ ...card, padding: 20 }}>
            <label style={lbl}>Critério de domínio (maestria)</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, marginBottom: 10 }}>
              <input value={programa.criterioMaestria} onChange={e => upd("criterioMaestria", e.target.value)} placeholder="Ex: 80% de respostas corretas" style={inp} />
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: ".75rem", color: "rgba(160,200,235,.84)" }}>em</span>
                <input type="number" min={1} max={10} value={programa.sessoesParaMaestria} onChange={e => upd("sessoesParaMaestria", Number(e.target.value))} style={{ ...inp, width: 50, textAlign: "center" }} />
                <span style={{ fontSize: ".75rem", color: "rgba(160,200,235,.84)", whiteSpace: "nowrap" }}>sessões</span>
              </div>
            </div>
          </div>

          {/* Escala de pontuação */}
          <div style={{ ...card, padding: 20 }}>
            <label style={lbl}>Escala de pontuação</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {programa.criterios.map((c, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "44px 1fr 1fr", gap: 10, alignItems: "center" }}>
                  <div style={{ width: 40, height: 40, borderRadius: 8, background: c.pontos === 10 ? "rgba(29,158,117,.15)" : c.pontos >= 8 ? "rgba(29,158,117,.1)" : c.pontos >= 4 ? "rgba(239,159,39,.1)" : "rgba(224,90,75,.1)", border: `1px solid ${c.pontos >= 8 ? "rgba(29,158,117,.3)" : c.pontos >= 4 ? "rgba(239,159,39,.3)" : "rgba(224,90,75,.3)"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".85rem", fontWeight: 800, color: c.pontos >= 8 ? "#1D9E75" : c.pontos >= 4 ? "#EF9F27" : "#E05A4B" }}>
                    {c.pontos}
                  </div>
                  <input value={c.descricao} onChange={e => upd("criterios", programa.criterios.map((x, j) => j === i ? { ...x, descricao: e.target.value } : x))} style={{ ...inp, fontSize: ".75rem" }} />
                  <input value={c.reforco} onChange={e => upd("criterios", programa.criterios.map((x, j) => j === i ? { ...x, reforco: e.target.value } : x))} placeholder="Reforço..." style={{ ...inp, fontSize: ".75rem" }} />
                </div>
              ))}
            </div>
          </div>

          {/* Reforçador geral + níveis de dica */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div style={{ ...card, padding: 20 }}>
              <label style={lbl}>Reforçador geral *</label>
              <input value={programa.reforcoGeral} onChange={e => upd("reforcoGeral", e.target.value)} placeholder="Ex: Fichas, tempo no tablet, stickers..." style={inp} />
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
                <button onClick={() => upd("nivelDicas", [...programa.nivelDicas, ""])} style={{ padding: "5px 10px", borderRadius: 6, border: "1px dashed rgba(26,58,92,.5)", background: "transparent", color: "rgba(170,210,245,.88)", fontFamily: "var(--font-sans)", fontSize: ".7rem", cursor: "pointer", marginTop: 4 }}>
                  + Adicionar nível
                </button>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => setEtapa(2)} style={{ padding: "12px 20px", borderRadius: 10, border: "1px solid rgba(70,120,180,.5)", background: "transparent", color: "rgba(160,200,235,.90)", fontFamily: "var(--font-sans)", fontWeight: 500, fontSize: ".85rem", cursor: "pointer" }}>← Voltar</button>
            <button onClick={() => setEtapa(4)} disabled={!etapa3Valida} style={{ flex: 1, padding: 12, borderRadius: 10, border: "none", background: etapa3Valida ? "linear-gradient(135deg,#1D9E75,#0f8f7a)" : "rgba(26,58,92,.4)", color: etapa3Valida ? "#07111f" : "rgba(165,208,242,.85)", fontFamily: "var(--font-sans)", fontWeight: 800, fontSize: ".88rem", cursor: etapa3Valida ? "pointer" : "not-allowed" }}>
              Próximo — Revisão →
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* ETAPA 4 — REVISÃO */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {etapa === 4 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          {/* Sumário */}
          <div style={{ ...card, padding: 20, border: "1px solid rgba(29,158,117,.25)" }}>
            <div style={{ fontSize: ".62rem", color: "#1D9E75", fontWeight: 700, letterSpacing: ".09em", textTransform: "uppercase", marginBottom: 12 }}>Resumo do programa</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {[
                { l: "Nome",            v: programa.nome },
                { l: "Paciente",        v: PACIENTES_MOCK.find(p => p.id === programa.pacienteId)?.nome ?? "—" },
                { l: "Operante",        v: OPERANTES.find(o => o.id === programa.operante)?.label ?? "—" },
                { l: "Nível de treino", v: NIVEIS_TREINO.find(n => n.id === programa.nivelTreino)?.label ?? "—" },
                { l: "Estímulos",       v: `${programa.estimulos.length} pares` },
                { l: "Tentativas/sessão", v: programa.totalTentativas },
                { l: "Critério",        v: `${programa.criterioMaestria} em ${programa.sessoesParaMaestria} sessões` },
                { l: "Reforçador",      v: programa.reforcoGeral },
              ].map(r => (
                <div key={r.l}>
                  <div style={{ fontSize: ".6rem", color: "rgba(170,210,245,.88)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 3 }}>{r.l}</div>
                  <div style={{ fontSize: ".82rem", color: "#e8f0f8", fontWeight: 500 }}>{r.v}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Comportamento-alvo */}
          <div style={{ ...card, padding: 18 }}>
            <div style={{ fontSize: ".62rem", color: "rgba(170,210,245,.88)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 6 }}>Comportamento-alvo</div>
            <div style={{ fontSize: ".82rem", color: "#e8f0f8", lineHeight: 1.6 }}>{programa.comportamentoAlvo}</div>
          </div>

          {/* Estímulos */}
          <div style={{ ...card, padding: 18 }}>
            <div style={{ fontSize: ".62rem", color: "rgba(170,210,245,.88)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 10 }}>Estímulos ({programa.estimulos.length} pares)</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {programa.estimulos.map((est, i) => (
                <div key={est.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: ".65rem", color: "rgba(165,208,242,.85)", fontFamily: "monospace", width: 20 }}>{i + 1}</span>
                  <div style={{ padding: "5px 12px", background: "rgba(29,158,117,.1)", border: "1px solid rgba(29,158,117,.2)", borderRadius: 7, fontSize: ".78rem", color: "#1D9E75", fontWeight: 600 }}>{est.modelo}</div>
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="rgba(165,208,242,.85)" strokeWidth="1.5"><path d="M2 8h12M9 3l5 5-5 5"/></svg>
                  <div style={{ padding: "5px 12px", background: "rgba(55,138,221,.1)", border: "1px solid rgba(55,138,221,.2)", borderRadius: 7, fontSize: ".78rem", color: "#378ADD", fontWeight: 600 }}>{est.comparacao}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Relações (só se não for básico) */}
          {programa.nivelTreino !== "basico" && programa.relacoes.length > 0 && (
            <div style={{ ...card, padding: 18 }}>
              <div style={{ fontSize: ".62rem", color: "rgba(170,210,245,.88)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 8 }}>Relações condicionais</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {programa.relacoes.map(r => (
                  <span key={r} style={{ padding: "4px 10px", background: "rgba(139,127,232,.1)", border: "1px solid rgba(139,127,232,.25)", color: "#8B7FE8", borderRadius: 20, fontSize: ".75rem", fontFamily: "monospace", fontWeight: 600 }}>{r}</span>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => setEtapa(3)} style={{ padding: "12px 20px", borderRadius: 10, border: "1px solid rgba(70,120,180,.5)", background: "transparent", color: "rgba(160,200,235,.90)", fontFamily: "var(--font-sans)", fontWeight: 500, fontSize: ".85rem", cursor: "pointer" }}>← Voltar</button>
            <button onClick={() => setSalvo(true)} style={{ flex: 1, padding: 14, borderRadius: 10, border: "none", background: "linear-gradient(135deg,#1D9E75,#0f8f7a)", color: "#07111f", fontFamily: "var(--font-sans)", fontWeight: 800, fontSize: ".9rem", cursor: "pointer" }}>
              ✓ Salvar programa
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
