// src/lib/document-engine/types.ts
// FCRM-007 — Document Engine: MODELO de composição (presentation-agnostic).
//
// Um DocumentoClinico é uma lista ordenada de seções tipadas. NÃO contém HTML
// nem lógica de render — o renderer (tela agora; PDF no futuro) consome este
// modelo. Compositores diferentes (relatório de investigação, PEI, PIC, plano
// de saúde, supervisão) produzem o MESMO modelo reusando as mesmas seções.

export type DocumentoTipo =
  | 'relatorio_investigacao'
  | 'pei'
  | 'pic'
  | 'relatorio_plano_saude'
  | 'relatorio_supervisao'

// ─── Primitivos de seção (reutilizáveis por qualquer documento) ─────────────
export interface CampoDoc {
  rotulo: string
  valor: string
}

export interface ItemLista {
  titulo: string
  descricao?: string | null
  badges?: string[]
}

export interface EventoTimelineDoc {
  data: string            // ISO — o renderer formata
  titulo: string
  detalhe?: string | null
}

export type Secao =
  | { id: string; tipo: 'campos'; titulo: string; campos: CampoDoc[] }
  | { id: string; tipo: 'texto'; titulo: string; texto: string }
  | { id: string; tipo: 'lista'; titulo: string; itens: ItemLista[]; vazio?: string }
  | { id: string; tipo: 'timeline'; titulo: string; eventos: EventoTimelineDoc[]; vazio?: string }

export interface DocumentoMeta {
  pacienteNome?: string | null
  pacienteId?: string | null
  geradoEm: string        // ISO
}

export interface DocumentoClinico {
  tipo: DocumentoTipo
  titulo: string
  meta: DocumentoMeta
  secoes: Secao[]
}
