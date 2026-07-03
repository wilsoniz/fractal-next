// src/lib/document-engine/registro-sessao.ts
// FCRM-008 — Compositor do Registro Clínico da Sessão.
//
// Organiza o que o documento de sessão já produz (reusa dadosDoSummary) e
// costura o elo FCRM: Perguntas Clínicas que esta sessão alimentou.
// Sem cálculo, sem IA, sem PDF. Coexiste com o PDF atual (não o substitui).

import { supabase } from "@/lib/supabase"
import { dadosDoSummary } from "@/lib/relatorio-pdf"  // reuso do mapper (não editado)
import {
  PRIORIDADE_LABEL,
  STATUS_LABEL,
  type Resultado,
} from "@/lib/clinical-investigations"
import { listarInvestigacoesDaSessao } from "@/lib/clinical-investigation-evidence"
import type { DocumentoClinico, ItemLista, Secao } from "./types"

function pgrstVazio(e: unknown): boolean {
  return (e as { code?: string })?.code === "PGRST116"
}

export async function montarRegistroSessao(
  sessaoId: string
): Promise<Resultado<DocumentoClinico>> {
  // 1. Sessão (fonte de terapeuta/paciente/horários)
  const { data: sess, error: errSess } = await supabase
    .from("sessoes_v2")
    .select("id, inicio, tipo, duracao_segundos, terapeuta_id, crianca_id")
    .eq("id", sessaoId)
    .single()
  if (errSess) {
    if (pgrstVazio(errSess)) return { data: null, error: "Sessão não encontrada." }
    return { data: null, error: errSess.message }
  }

  // 2. Summary (resultados/observações da sessão)
  const { data: summary, error: errSum } = await supabase
    .from("session_summary")
    .select("id, sessao_id, taxa_geral, total_operantes, programas_json, eventos_json, familia_comunicada, nota_encerramento, analise_clinica, decisao_proxima, nota_decisao")
    .eq("sessao_id", sessaoId)
    .single()
  if (errSum) {
    if (pgrstVazio(errSum)) return { data: null, error: "Esta sessão não possui registro para compor o documento." }
    return { data: null, error: errSum.message }
  }

  // 3. Terapeuta + paciente (cabeçalho)
  const [perfilR, criancaR] = await Promise.all([
    supabase.from("profiles").select("nome, conselho_profissional, registro_profissional").eq("id", (sess as any).terapeuta_id).single(),
    supabase.from("criancas").select("nome").eq("id", (sess as any).crianca_id).single(),
  ])
  const perfil = perfilR.data as { nome?: string; conselho_profissional?: string; registro_profissional?: string } | null
  const pacienteNome = ((criancaR.data as { nome?: string } | null)?.nome) ?? "—"

  // 4. Reuso do mapper existente → estrutura da sessão
  const d = dadosDoSummary(
    summary as any,
    { inicio: (sess as any).inicio, tipo: (sess as any).tipo, duracao_segundos: (sess as any).duracao_segundos },
    { nome: perfil?.nome ?? "—", conselho_profissional: perfil?.conselho_profissional, registro_profissional: perfil?.registro_profissional },
    pacienteNome,
  )

  const registro = [d.conselhoProfissional, d.registroProfissional].filter(Boolean).join(" ")

  // 5. Elo FCRM — Perguntas Clínicas que esta sessão alimentou
  const perguntasItens: ItemLista[] = []
  const vinc = await listarInvestigacoesDaSessao(sessaoId)
  if (vinc.error === null && vinc.data.length > 0) {
    const { data: invs, error: errInv } = await supabase
      .from("clinical_investigations")
      .select("title, status, priority")
      .in("id", vinc.data)
    if (errInv) return { data: null, error: errInv.message }
    for (const inv of (invs ?? []) as { title: string; status: string; priority: string }[]) {
      perguntasItens.push({
        titulo: inv.title,
        badges: [PRIORIDADE_LABEL[inv.priority as keyof typeof PRIORIDADE_LABEL] ?? inv.priority,
                 STATUS_LABEL[inv.status as keyof typeof STATUS_LABEL] ?? inv.status],
      })
    }
  }

  // 6. Composição (mapeamento puro → seções)
  const secoes: Secao[] = [
    {
      id: "identificacao", tipo: "campos", titulo: "Identificação",
      campos: [
        { rotulo: "Paciente", valor: d.pacienteNome },
        { rotulo: "Terapeuta", valor: registro ? `${d.terapeutaNome} · ${registro}` : d.terapeutaNome },
        { rotulo: "Data", valor: d.data },
        { rotulo: "Horário", valor: d.horario },
        { rotulo: "Duração", valor: d.duracao },
        { rotulo: "Tipo", valor: d.tipo },
        { rotulo: "Local", valor: d.local },
        { rotulo: "Família comunicada", valor: d.familiaComunicada ? "Sim" : "Não" },
      ],
    },
    {
      id: "metricas", tipo: "campos", titulo: "Métricas",
      campos: [
        { rotulo: "Taxa geral", valor: `${d.taxaGeral}%` },
        { rotulo: "Total de operantes", valor: String(d.totalOperantes) },
      ],
    },
    {
      id: "programas", tipo: "lista", titulo: "Programas aplicados",
      vazio: "Nenhum programa aplicado nesta sessão.",
      itens: d.programas.map(p => ({
        titulo: p.nome,
        descricao: p.dominio,
        badges: [
          `${p.taxa}%`,
          `${p.independencia}% ind`,
          ...(p.criterio ? ["critério"] : []),
        ],
      })),
    },
    {
      id: "avaliacoes", tipo: "lista", titulo: "Avaliações",
      vazio: "Nenhuma avaliação aplicada.",
      itens: d.avaliacoes.map(a => ({ titulo: a.nome, descricao: `${a.registros} registros` })),
    },
    {
      id: "eventos", tipo: "lista", titulo: "Eventos clínicos",
      vazio: "Nenhum evento registrado.",
      itens: d.eventos.map(e => ({ titulo: e.label })),
    },
    { id: "analise", tipo: "texto", titulo: "Análise clínica", texto: d.analiseClinica?.trim() || "—" },
    {
      id: "plano", tipo: "texto", titulo: "Plano para próxima sessão",
      texto: [...(d.decisaoProxima ?? []), d.notaDecisao].filter(Boolean).join("\n").trim() || "—",
    },
    { id: "observacoes", tipo: "texto", titulo: "Observações de encerramento", texto: d.notaEncerramento?.trim() || "—" },
  ]

  // Encaminhamentos (supervisão) — só quando existirem
  if (d.encaminhamentos && d.encaminhamentos.length > 0) {
    secoes.push({
      id: "encaminhamentos", tipo: "lista", titulo: "Encaminhamentos",
      itens: d.encaminhamentos.map(e => ({ titulo: e.programaNome, descricao: e.acao, badges: [e.prioridade] })),
    })
  }

  // Elo FCRM (fecha o documento)
  secoes.push({
    id: "perguntas", tipo: "lista", titulo: "Perguntas Clínicas relacionadas",
    vazio: "Esta sessão não está vinculada a nenhuma pergunta clínica.",
    itens: perguntasItens,
  })

  return {
    data: {
      tipo: "registro_sessao",
      titulo: "Registro Clínico da Sessão",
      meta: {
        pacienteNome: d.pacienteNome,
        pacienteId: (sess as any).crianca_id ?? null,
        geradoEm: new Date().toISOString(),
      },
      secoes,
    },
    error: null,
  }
}
