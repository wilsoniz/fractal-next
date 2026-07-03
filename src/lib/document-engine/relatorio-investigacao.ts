// src/lib/document-engine/relatorio-investigacao.ts
// FCRM-007 — Compositor do Relatório de Investigação Clínica.
//
// Apenas ORGANIZA dados já existentes (I/O das FCRM-001..006) num
// DocumentoClinico. Sem cálculo, sem interpretação, sem IA, sem PDF.

import { supabase } from "@/lib/supabase"
import {
  obterInvestigacao,
  PRIORIDADE_LABEL,
  STATUS_LABEL,
  type Resultado,
} from "@/lib/clinical-investigations"
import { obterResumoInvestigacao } from "@/lib/clinical-investigation-summary"
import { listarProgramasDaInvestigacao } from "@/lib/clinical-investigation-programs"
import { listarEvidenciasDaInvestigacao } from "@/lib/clinical-investigation-evidence"
import { montarTimelineInvestigacao } from "@/lib/clinical-investigation-timeline"
import type { DocumentoClinico, Secao } from "./types"

function fmtData(iso: string | null): string {
  if (!iso) return "—"
  const d = new Date(iso)
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("pt-BR")
}

export async function montarRelatorioInvestigacao(
  investigationId: string
): Promise<Resultado<DocumentoClinico>> {
  // 1. Investigação (fonte da identidade)
  const invRes = await obterInvestigacao(investigationId)
  if (invRes.error !== null) return { data: null, error: invRes.error }
  const inv = invRes.data
  if (!inv) return { data: null, error: "Pergunta clínica não encontrada." }

  // 2. Paciente (cabeçalho)
  const { data: crianca } = await supabase
    .from("criancas")
    .select("nome")
    .eq("id", inv.patient_id)
    .single()
  const pacienteNome = (crianca?.nome as string) ?? null

  // 3. Provedores existentes (paralelo) — fail-fast em erro de provedor
  const [resumoR, progsR, evidR, timelineR] = await Promise.all([
    obterResumoInvestigacao(investigationId),
    listarProgramasDaInvestigacao(investigationId),
    listarEvidenciasDaInvestigacao(investigationId),
    montarTimelineInvestigacao(investigationId),
  ])
  if (resumoR.error !== null) return { data: null, error: resumoR.error }
  if (progsR.error !== null) return { data: null, error: progsR.error }
  if (evidR.error !== null) return { data: null, error: evidR.error }
  if (timelineR.error !== null) return { data: null, error: timelineR.error }

  const resumo = resumoR.data
  const programas = progsR.data
  const evidencias = evidR.data
  const timeline = timelineR.data

  // 4. Composição (mapeamento puro → seções)
  const secoes: Secao[] = [
    {
      id: "identificacao", tipo: "campos", titulo: "Identificação",
      campos: [
        { rotulo: "Pergunta clínica", valor: inv.title },
        { rotulo: "Prioridade", valor: PRIORIDADE_LABEL[inv.priority] ?? inv.priority },
        { rotulo: "Status", valor: STATUS_LABEL[inv.status] ?? inv.status },
        { rotulo: "Criada em", valor: fmtData(inv.created_at) },
        ...(inv.closed_at ? [{ rotulo: "Encerrada em", valor: fmtData(inv.closed_at) }] : []),
      ],
    },
    {
      id: "problema", tipo: "texto", titulo: "Problema observado",
      texto: inv.clinical_problem?.trim() || "—",
    },
    {
      id: "situacao", tipo: "campos", titulo: "Situação atual",
      campos: [
        { rotulo: "Evidências", valor: String(resumo.totalEvidencias) },
        { rotulo: "Sessões relacionadas", valor: String(resumo.totalSessoes) },
        { rotulo: "Primeira sessão", valor: fmtData(resumo.primeiraSessao) },
        { rotulo: "Última sessão", valor: fmtData(resumo.ultimaSessao) },
        { rotulo: "Última atualização", valor: fmtData(resumo.ultimaAtualizacao) },
      ],
    },
    {
      id: "programas", tipo: "lista", titulo: "Programas relacionados",
      vazio: "Nenhum programa vinculado a esta pergunta.",
      itens: programas.map(p => ({ titulo: p.nome, descricao: p.dominio })),
    },
    {
      id: "evidencias", tipo: "lista", titulo: "Evidências",
      vazio: "Nenhuma evidência registrada.",
      itens: evidencias.map(e => ({ titulo: "Sessão vinculada", descricao: fmtData(e.created_at) })),
    },
    {
      id: "timeline", tipo: "timeline", titulo: "Timeline",
      vazio: "Sem eventos registrados.",
      eventos: timeline.eventos.map(ev => ({ data: ev.data, titulo: ev.titulo, detalhe: ev.detalhe ?? null })),
    },
  ]

  return {
    data: {
      tipo: "relatorio_investigacao",
      titulo: "Relatório de Investigação Clínica",
      meta: {
        pacienteNome,
        pacienteId: inv.patient_id,
        geradoEm: new Date().toISOString(),
      },
      secoes,
    },
    error: null,
  }
}
