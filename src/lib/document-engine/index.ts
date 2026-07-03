// src/lib/document-engine/index.ts
// FCRM-007 — Document Engine: ponto de entrada + registry.
//
// Cada tipo de documento registra UM compositor. Documentos futuros (PEI, PIC,
// plano de saúde, supervisão) só adicionam uma entrada aqui — nunca um motor
// novo. O renderer (tela/PDF) consome o DocumentoClinico de qualquer tipo.

import type { Resultado } from "@/lib/clinical-investigations"
import type { DocumentoClinico, DocumentoTipo } from "./types"
import { montarRelatorioInvestigacao } from "./relatorio-investigacao"

// Params de composição (por enquanto todos usam um id da entidade âncora)
export interface ParamsDocumento {
  id: string
}

type Compositor = (params: ParamsDocumento) => Promise<Resultado<DocumentoClinico>>

const REGISTRO: Partial<Record<DocumentoTipo, Compositor>> = {
  relatorio_investigacao: ({ id }) => montarRelatorioInvestigacao(id),
  // pei / pic / relatorio_plano_saude / relatorio_supervisao → sprints futuras
}

export async function montarDocumento(
  tipo: DocumentoTipo,
  params: ParamsDocumento
): Promise<Resultado<DocumentoClinico>> {
  const compositor = REGISTRO[tipo]
  if (!compositor) return { data: null, error: `Documento não suportado ainda: ${tipo}` }
  return compositor(params)
}

export { montarRelatorioInvestigacao }
export * from "./types"
