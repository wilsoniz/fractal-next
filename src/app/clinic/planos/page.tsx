'use client'

import { useState, useEffect } from 'react'
import { useClinicContext } from '../layout'
import { supabase } from '@/lib/supabase'

// ─── Tipos ────────────────────────────────────────────────────────────────────

type PrazoType = 'curto' | 'medio' | 'longo'
type StatusPlano = 'ativo' | 'revisao' | 'rascunho' | 'encerrado'
type TipoMidia = 'imagem' | 'texto' | 'audio' | 'simbolo'
type TipoTarefa = 'enunciado' | 'encaixar'
type TipoRelacao = 'treino_direto' | 'equivalencia' | 'generalizacao'
type EstrategiaDica = 'none' | 'least_to_most' | 'most_to_least' | 'time_delay'

interface Coluna { id: string; nome: string; tipo: TipoMidia }
interface Matriz {
  id: string; nome: string; descricao: string
  colunas: Coluna[]
  grupos: { id: string; celulas: Record<string, { valor: string }> }[]
}

interface Objetivo {
  id: string; prazo: PrazoType; descricao: string
  dataPrevista?: string; atingido: boolean
}

interface ProgramaEnsino {
  id: string; nome: string; areaFoco: string; prereqs: string
  relevancia: string; protocoloRef: string[]; localImpl: string[]
  sd: string; resposta: string; consequenciaAcerto: string; consequenciaErro: string
  estrategiaDica: string; hierarquiaDicas: string; estrategiaEnsino: string[]
  operante: string; objetivoLongoPrazo: string; criterioAvanco: string
  criterioInterrupcao: string; totalTentativas: number; materiais: string
  objetivosCurtoPrazo: Objetivo[]; status: 'ativo' | 'dominio' | 'pausado'
  matrizVinculada?: Matriz
}

interface AlvoComportamental {
  id: string; codigo: string; descricao: string; area: string
  funcao: string; operante: string
  status: 'ativo' | 'emergente' | 'dominio' | 'nao_iniciado'
  programas: ProgramaEnsino[]
}

interface ProtocoloConduta {
  id: string; nome: string; topografia: string; funcao: string
  estrategia: string[]; planoCrise: string
}

interface PlanoIntervencao {
  id: string; nome: string; pacienteNome: string; pacienteId: string
  terapeutaNome: string; dataInicio: string; dataRevisao: string
  status: StatusPlano; alvos: AlvoComportamental[]; protocolos: ProtocoloConduta[]
}

// ─── Config de envio digital por modo ────────────────────────────────────────

interface ConfigEnvio {
  matrizId: string
  colunaModelo: string
  colunaComparacao: string
  // coordenador+
  tipoTarefa: TipoTarefa
  totalTentativas: number
  criterioMaestria: number
  // supervisor
  tipoRelacao: TipoRelacao
  testarSimetria: boolean
  testarTransitividade: boolean
  testarEquivalencia: boolean
  estrategiaDica: EstrategiaDica
  reforcoTipo: 'visual' | 'audio' | 'token'
  condicAstracao: boolean
}

const CONFIG_ENVIO_DEFAULT: ConfigEnvio = {
  matrizId: '',
  colunaModelo: '',
  colunaComparacao: '',
  tipoTarefa: 'enunciado',
  totalTentativas: 10,
  criterioMaestria: 80,
  tipoRelacao: 'treino_direto',
  testarSimetria: false,
  testarTransitividade: false,
  testarEquivalencia: false,
  estrategiaDica: 'least_to_most',
  reforcoTipo: 'visual',
  condicAstracao: false,
}

// ─── Matrizes mock (em produção virá do Supabase) ─────────────────────────────

const MOCK_MATRIZES: Matriz[] = [
  {
    id: 'm1', nome: 'Frutas', descricao: 'Imagem, português, inglês',
    colunas: [
      { id: 'A', nome: 'Imagem', tipo: 'imagem' },
      { id: 'B', nome: 'Português', tipo: 'texto' },
      { id: 'C', nome: 'Inglês', tipo: 'texto' },
    ],
    grupos: [
      { id: 'g1', celulas: { A: { valor: '' }, B: { valor: 'Maçã' }, C: { valor: 'Apple' } } },
      { id: 'g2', celulas: { A: { valor: '' }, B: { valor: 'Milho' }, C: { valor: 'Corn' } } },
      { id: 'g3', celulas: { A: { valor: '' }, B: { valor: 'Pão' }, C: { valor: 'Bread' } } },
    ],
  },
  {
    id: 'm2', nome: 'Notas Musicais', descricao: 'Áudio, nome PT, nome EN',
    colunas: [
      { id: 'A', nome: 'Áudio', tipo: 'audio' },
      { id: 'B', nome: 'Nota (PT)', tipo: 'texto' },
      { id: 'C', nome: 'Note (EN)', tipo: 'texto' },
    ],
    grupos: [
      { id: 'g1', celulas: { A: { valor: '' }, B: { valor: 'Dó' }, C: { valor: 'C' } } },
      { id: 'g2', celulas: { A: { valor: '' }, B: { valor: 'Ré' }, C: { valor: 'D' } } },
      { id: 'g3', celulas: { A: { valor: '' }, B: { valor: 'Mi' }, C: { valor: 'E' } } },
    ],
  },
]

// ─── Dados mock planos ────────────────────────────────────────────────────────

const MOCK_PLANOS: PlanoIntervencao[] = [
  {
    id: '1', nome: 'Plano de Intervenção — Tião Mello',
    pacienteNome: 'Tião Mello', pacienteId: 'f04cc5b0-513a-43ba-97b9-1662727acede',
    terapeutaNome: 'Wilson', dataInicio: 'mar/2025', dataRevisao: 'jun/2025',
    status: 'ativo',
    alvos: [
      {
        id: 'a1', codigo: '0A', descricao: 'Orientar-se para voz ou rosto de outra pessoa',
        area: 'Prontidão', funcao: 'Atenção Social Inicial', operante: 'Ouvinte', status: 'ativo',
        programas: [
          {
            id: 'p1', nome: 'Atenção ao nome', areaFoco: 'Prontidão · Atenção Social',
            prereqs: 'Tolerância ambiental básica (0E)',
            relevancia: 'Base para todas as interações sociais',
            protocoloRef: ['VB-MAPP'], localImpl: ['Clínica', 'Casa'],
            sd: 'Chamada verbal pelo nome', resposta: 'Orientação do rosto ≥ 0,5 s',
            consequenciaAcerto: 'Reforço social + item preferido',
            consequenciaErro: 'Correção com dica física leve',
            estrategiaDica: 'Least to most',
            hierarquiaDicas: 'Independente → Gestual → Físico parcial → Físico total',
            estrategiaEnsino: ['Tentativa discreta'], operante: 'Ouvinte',
            objetivoLongoPrazo: 'Orientar ao nome em 3 ambientes, 80% em 2 sessões consecutivas',
            criterioAvanco: '80% em 2 sessões consecutivas',
            criterioInterrupcao: 'Queda abaixo de 50% por 3 sessões',
            totalTentativas: 10, materiais: 'Itens preferidos · Planilha · Cronômetro',
            status: 'ativo',
            objetivosCurtoPrazo: [
              { id: 'o1', prazo: 'curto', descricao: 'Orientar com dica física em 80%', dataPrevista: 'abr/2025', atingido: true },
              { id: 'o2', prazo: 'medio', descricao: 'Orientar de forma independente na clínica', dataPrevista: 'mai/2025', atingido: false },
              { id: 'o3', prazo: 'longo', descricao: 'Generalizar para casa e escola', dataPrevista: 'jul/2025', atingido: false },
            ],
          },
        ],
      },
      {
        id: 'a2', codigo: 'IM-0C', descricao: 'Tocar o mesmo objeto que o instrutor toca',
        area: 'Imitação', funcao: 'Coordenação Social', operante: 'Imitação', status: 'emergente',
        programas: [],
      },
      {
        id: 'a3', codigo: 'EC-0A', descricao: 'Produzir sons espontâneos (balbucio)',
        area: 'Ecoico', funcao: 'Pré-vocalização', operante: 'Ecoico', status: 'nao_iniciado',
        programas: [],
      },
    ],
    protocolos: [
      {
        id: 'pr1', nome: 'Comportamento de fuga de tarefa',
        topografia: 'Esquiva / recusa com choro', funcao: 'Fuga',
        estrategia: ['Extinção', 'DRA', 'NCR'],
        planoCrise: 'Pausar atividade, ofertar item de alta preferência, retomar em 2 min',
      },
    ],
  },
  {
    id: '2', nome: 'Plano de Intervenção — Ana Beatriz',
    pacienteNome: 'Ana Beatriz', pacienteId: 'abc-123',
    terapeutaNome: 'Wilson', dataInicio: 'jan/2025', dataRevisao: 'abr/2025',
    status: 'revisao', alvos: [], protocolos: [],
  },
  {
    id: '3', nome: 'Plano de Intervenção — Rafa Costa',
    pacienteNome: 'Rafa Costa', pacienteId: 'def-456',
    terapeutaNome: 'Wilson', dataInicio: '', dataRevisao: '',
    status: 'rascunho', alvos: [], protocolos: [],
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_PLANO: Record<StatusPlano, { label: string; color: string; bg: string }> = {
  ativo:     { label: 'Ativo',     color: '#1D9E75', bg: 'rgba(29,158,117,0.12)' },
  revisao:   { label: 'Revisão',   color: '#EF9F27', bg: 'rgba(239,159,39,0.12)' },
  rascunho:  { label: 'Rascunho',  color: '#8B7FE8', bg: 'rgba(139,127,232,0.12)' },
  encerrado: { label: 'Encerrado', color: '#7a9ab5', bg: 'rgba(122,154,181,0.10)' },
}

const STATUS_ALVO: Record<string, { label: string; color: string }> = {
  ativo:        { label: 'Em andamento', color: '#1D9E75' },
  emergente:    { label: 'Emergente',    color: '#EF9F27' },
  dominio:      { label: 'Domínio',      color: '#378ADD' },
  nao_iniciado: { label: 'Não iniciado', color: '#7a9ab5' },
}

const PRAZO_STYLE: Record<PrazoType, { label: string; color: string; bg: string }> = {
  curto: { label: 'Curto prazo', color: '#1D9E75', bg: 'rgba(29,158,117,0.12)' },
  medio: { label: 'Médio prazo', color: '#EF9F27', bg: 'rgba(239,159,39,0.12)' },
  longo: { label: 'Longo prazo', color: '#8B7FE8', bg: 'rgba(139,127,232,0.12)' },
}

// ─── Subcomponentes básicos ───────────────────────────────────────────────────

function Badge({ label, color, bg }: { label: string; color: string; bg: string }) {
  return (
    <span style={{ fontSize: 10, padding: '3px 10px', borderRadius: 20, fontWeight: 500, color, background: bg, whiteSpace: 'nowrap' }}>
      {label}
    </span>
  )
}

function Chip({ label, active, color = '#1D9E75', onClick }: { label: string; active?: boolean; color?: string; onClick?: () => void }) {
  return (
    <span onClick={onClick} style={{
      fontSize: 11, padding: '4px 11px', borderRadius: 20, cursor: onClick ? 'pointer' : 'default',
      border: `1px solid ${active ? color : 'rgba(26,58,92,0.5)'}`,
      color: active ? color : '#7a9ab5',
      background: active ? `${color}18` : 'transparent',
      transition: 'all 0.15s',
    }}>
      {label}
    </span>
  )
}

function FieldRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 10, color: '#7a9ab5', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 13, color: '#e8eef4', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(26,58,92,0.5)', borderRadius: 7, padding: '8px 12px', lineHeight: 1.5 }}>
        {value || <span style={{ color: '#7a9ab5' }}>—</span>}
      </div>
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 10, color: '#7a9ab5', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid rgba(26,58,92,0.4)' }}>
      {children}
    </div>
  )
}

// ─── Modal: Enviar para treino digital ───────────────────────────────────────

function ModalEnvioDigital({
  programa, pacienteId, nivel, onClose, matrizes,
}: {
  programa: ProgramaEnsino
  pacienteId: string
  nivel: 'terapeuta' | 'coordenador' | 'supervisor'
  onClose: () => void
  matrizes: Matriz[]
}) {
  const [passo, setPasso] = useState<1 | 2 | 3>(1)
  const [cfg, setCfg] = useState<ConfigEnvio>(CONFIG_ENVIO_DEFAULT)
  const [matrizSelecionada, setMatrizSelecionada] = useState<Matriz | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)

  const s = {
    navy:   '#07111f',
    card:   'rgba(13,32,53,0.95)',
    border: 'rgba(26,58,92,0.5)',
    teal:   '#1D9E75',
    blue:   '#378ADD',
    amber:  '#EF9F27',
    coral:  '#E05A4B',
    purple: '#8B7FE8',
    text:   '#e8eef4',
    muted:  '#7a9ab5',
  }

  const NIVEL_LABEL: Record<typeof nivel, { label: string; color: string }> = {
    terapeuta:   { label: 'Modo guiado',      color: s.teal   },
    coordenador: { label: 'Modo semi-guiado', color: s.amber  },
    supervisor:  { label: 'Modo livre',       color: s.purple },
  }

  const selecionarMatriz = (m: Matriz) => {
    setMatrizSelecionada(m)
    setCfg(prev => ({ ...prev, matrizId: m.id, colunaModelo: '', colunaComparacao: '' }))
  }

  const podeProsseguir = () => {
    if (passo === 1) return !!matrizSelecionada
    if (passo === 2) return !!cfg.colunaModelo && !!cfg.colunaComparacao && cfg.colunaModelo !== cfg.colunaComparacao
    return true
  }

  const handleEnviar = async () => {
    if (!matrizSelecionada) return
    setEnviando(true)

    // Monta stimuli_payload a partir da matriz e das colunas selecionadas
    const trials = matrizSelecionada.grupos.map((grupo, idx) => {
      const sd = grupo.celulas[cfg.colunaModelo]?.valor ?? ''
      const correct = grupo.celulas[cfg.colunaComparacao]?.valor ?? ''
      const options = matrizSelecionada.grupos.map(g => g.celulas[cfg.colunaComparacao]?.valor ?? '')
      return { trial_index: idx + 1, sd, correct, options }
    })

    const payload = {
      child_id: pacienteId,
      title: `${programa.nome} — ${matrizSelecionada.nome}`,
      task_type: `mts_${cfg.tipoTarefa}`,
      total_trials: cfg.totalTentativas,
      mastery_criterion: cfg.criterioMaestria / 100,
      max_options: matrizSelecionada.grupos.length,
      stimuli_payload: { trials },
      origin: 'clinic',
      status: 'active',
      rules: {
        relation_type: cfg.tipoRelacao,
        test_symmetry: cfg.testarSimetria,
        test_transitivity: cfg.testarTransitividade,
        test_equivalence: cfg.testarEquivalencia,
        prompt_strategy: cfg.estrategiaDica,
        reinforcement_type: cfg.reforcoTipo,
        abstraction_conditioning: cfg.condicAstracao,
        matriz_id: matrizSelecionada.id,
        coluna_modelo: cfg.colunaModelo,
        coluna_comparacao: cfg.colunaComparacao,
      },
    }

    const { error } = await supabase.from('apprentice_tasks').insert(payload)
    setEnviando(false)
    if (!error) setEnviado(true)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
    }}>
      <div style={{
        background: s.card, border: `1px solid ${s.border}`, borderRadius: 14,
        width: '100%', maxWidth: 640, maxHeight: '90vh', overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
      }}>

        {/* Header do modal */}
        <div style={{ padding: '18px 24px', borderBottom: `1px solid ${s.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 500, color: s.text }}>Enviar para treino digital</div>
            <div style={{ fontSize: 11, color: s.muted, marginTop: 2 }}>
              {programa.nome}
              <span style={{ marginLeft: 8, padding: '2px 8px', borderRadius: 20, fontSize: 10, background: `${NIVEL_LABEL[nivel].color}18`, color: NIVEL_LABEL[nivel].color }}>
                {NIVEL_LABEL[nivel].label}
              </span>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: s.muted, fontSize: 20, cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>

        {/* Indicador de passos */}
        {!enviado && (
          <div style={{ display: 'flex', padding: '12px 24px', gap: 6, borderBottom: `1px solid ${s.border}`, background: 'rgba(0,0,0,0.2)' }}>
            {[
              { n: 1, label: 'Matriz' },
              { n: 2, label: 'Colunas' },
              ...(nivel !== 'terapeuta' ? [{ n: 3, label: nivel === 'supervisor' ? 'Avançado' : 'Configurar' }] : []),
            ].map(p => (
              <div key={p.n} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{
                  width: 22, height: 22, borderRadius: '50%', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 500,
                  background: passo >= p.n ? s.teal : 'rgba(255,255,255,0.06)',
                  color: passo >= p.n ? '#fff' : s.muted,
                  border: `1px solid ${passo >= p.n ? s.teal : s.border}`,
                }}>
                  {p.n}
                </div>
                <span style={{ fontSize: 11, color: passo >= p.n ? s.text : s.muted }}>{p.label}</span>
                {p.n < (nivel === 'terapeuta' ? 2 : 3) && (
                  <div style={{ width: 20, height: 1, background: s.border, margin: '0 2px' }} />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Corpo do modal */}
        <div style={{ padding: 24, overflowY: 'auto', flex: 1 }}>

          {/* ── Enviado com sucesso ── */}
          {enviado && (
            <div style={{ textAlign: 'center', padding: '32px 20px' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(29,158,117,0.15)', border: `2px solid ${s.teal}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 24 }}>
                ✓
              </div>
              <div style={{ fontSize: 15, fontWeight: 500, color: s.text, marginBottom: 6 }}>Treino enviado com sucesso</div>
              <div style={{ fontSize: 13, color: s.muted, marginBottom: 8 }}>
                O programa <strong style={{ color: s.text }}>{programa.nome}</strong> já está disponível para a criança no Fracta Apprentice.
              </div>
              <div style={{ fontSize: 12, color: s.muted }}>
                Matriz: <span style={{ color: s.teal }}>{matrizSelecionada?.nome}</span> ·
                Modelo: <span style={{ color: s.blue }}>{matrizSelecionada?.colunas.find(c => c.id === cfg.colunaModelo)?.nome}</span> →
                Comparação: <span style={{ color: s.amber }}>{matrizSelecionada?.colunas.find(c => c.id === cfg.colunaComparacao)?.nome}</span>
              </div>
              <button onClick={onClose} style={{ marginTop: 20, fontSize: 13, padding: '8px 20px', borderRadius: 8, background: s.teal, border: 'none', color: '#fff', cursor: 'pointer' }}>
                Fechar
              </button>
            </div>
          )}

          {/* ── Passo 1: Selecionar matriz ── */}
          {!enviado && passo === 1 && (
            <div>
              <div style={{ fontSize: 13, color: s.text, marginBottom: 4, fontWeight: 500 }}>Qual matriz de estímulos usar?</div>
              <div style={{ fontSize: 12, color: s.muted, marginBottom: 16 }}>
                Selecione uma matriz da sua biblioteca. Os estímulos dela serão usados no treino digital.
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {matrizes.map(m => (
                  <div
                    key={m.id}
                    onClick={() => selecionarMatriz(m)}
                    style={{
                      padding: '14px 16px', borderRadius: 10, cursor: 'pointer',
                      border: `1px solid ${matrizSelecionada?.id === m.id ? s.teal : s.border}`,
                      background: matrizSelecionada?.id === m.id ? 'rgba(29,158,117,0.08)' : 'rgba(255,255,255,0.02)',
                      transition: 'all 0.15s',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: s.text }}>{m.nome}</div>
                      <div style={{ fontSize: 11, color: s.muted }}>{m.grupos.length} grupos</div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {m.colunas.map(c => (
                        <span key={c.id} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: 'rgba(55,138,221,0.12)', color: s.blue }}>
                          {c.nome}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Passo 2: Selecionar colunas ── */}
          {!enviado && passo === 2 && matrizSelecionada && (
            <div>
              <div style={{ fontSize: 13, color: s.text, marginBottom: 4, fontWeight: 500 }}>Como a criança vai treinar?</div>
              <div style={{ fontSize: 12, color: s.muted, marginBottom: 20 }}>
                Escolha o que ela vai <strong style={{ color: s.text }}>ver</strong> (modelo) e o que ela vai <strong style={{ color: s.text }}>escolher</strong> (comparação).
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                {/* Coluna modelo */}
                <div>
                  <div style={{ fontSize: 11, color: s.teal, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10 }}>
                    O que a criança vai VER?
                  </div>
                  {matrizSelecionada.colunas.map(c => (
                    <div
                      key={c.id}
                      onClick={() => setCfg(prev => ({ ...prev, colunaModelo: c.id }))}
                      style={{
                        padding: '10px 14px', borderRadius: 8, cursor: 'pointer', marginBottom: 6,
                        border: `1px solid ${cfg.colunaModelo === c.id ? s.teal : s.border}`,
                        background: cfg.colunaModelo === c.id ? 'rgba(29,158,117,0.08)' : 'rgba(255,255,255,0.02)',
                        opacity: cfg.colunaComparacao === c.id ? 0.3 : 1,
                        transition: 'all 0.15s',
                      }}
                    >
                      <div style={{ fontSize: 12, color: s.text }}>{c.nome}</div>
                      <div style={{ fontSize: 10, color: s.muted, marginTop: 2, textTransform: 'capitalize' }}>{c.tipo}</div>
                    </div>
                  ))}
                </div>

                {/* Coluna comparação */}
                <div>
                  <div style={{ fontSize: 11, color: s.amber, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10 }}>
                    O que ela vai ESCOLHER?
                  </div>
                  {matrizSelecionada.colunas.map(c => (
                    <div
                      key={c.id}
                      onClick={() => setCfg(prev => ({ ...prev, colunaComparacao: c.id }))}
                      style={{
                        padding: '10px 14px', borderRadius: 8, cursor: 'pointer', marginBottom: 6,
                        border: `1px solid ${cfg.colunaComparacao === c.id ? s.amber : s.border}`,
                        background: cfg.colunaComparacao === c.id ? 'rgba(239,159,39,0.08)' : 'rgba(255,255,255,0.02)',
                        opacity: cfg.colunaModelo === c.id ? 0.3 : 1,
                        transition: 'all 0.15s',
                      }}
                    >
                      <div style={{ fontSize: 12, color: s.text }}>{c.nome}</div>
                      <div style={{ fontSize: 10, color: s.muted, marginTop: 2, textTransform: 'capitalize' }}>{c.tipo}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Preview da tentativa */}
              {cfg.colunaModelo && cfg.colunaComparacao && (
                <div style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${s.border}`, borderRadius: 10, padding: 16 }}>
                  <div style={{ fontSize: 10, color: s.muted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>
                    Preview — como vai aparecer para a criança
                  </div>
                  <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 10, color: s.teal, marginBottom: 6 }}>Estímulo modelo (SD)</div>
                      <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(29,158,117,0.08)', border: `1px solid ${s.teal}30`, fontSize: 13, color: s.text }}>
                        {matrizSelecionada.grupos[0]?.celulas[cfg.colunaModelo]?.valor || '—'}
                      </div>
                    </div>
                    <div style={{ flex: 2 }}>
                      <div style={{ fontSize: 10, color: s.amber, marginBottom: 6 }}>Opções de comparação</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {matrizSelecionada.grupos.map((g, i) => (
                          <div key={g.id} style={{
                            padding: '7px 12px', borderRadius: 7, fontSize: 12, color: s.text,
                            background: i === 0 ? 'rgba(239,159,39,0.08)' : 'rgba(255,255,255,0.02)',
                            border: `1px solid ${i === 0 ? s.amber + '40' : s.border}`,
                          }}>
                            {g.celulas[cfg.colunaComparacao]?.valor || '—'}
                            {i === 0 && <span style={{ marginLeft: 8, fontSize: 10, color: s.teal }}>correto</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Passo 3: Configurações por nível ── */}
          {!enviado && passo === 3 && (
            <div>
              {/* Coordenador — configurações básicas */}
              {(nivel === 'coordenador' || nivel === 'supervisor') && (
                <div style={{ marginBottom: 24 }}>
                  <SectionTitle>Configurações do treino</SectionTitle>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                    <div>
                      <div style={{ fontSize: 11, color: s.muted, marginBottom: 8 }}>Tipo de tarefa</div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {([['enunciado', 'Enunciado'], ['encaixar', 'Encaixar']] as const).map(([val, label]) => (
                          <div
                            key={val}
                            onClick={() => setCfg(prev => ({ ...prev, tipoTarefa: val }))}
                            style={{
                              flex: 1, padding: '10px', borderRadius: 8, cursor: 'pointer', textAlign: 'center',
                              border: `1px solid ${cfg.tipoTarefa === val ? s.teal : s.border}`,
                              background: cfg.tipoTarefa === val ? 'rgba(29,158,117,0.08)' : 'rgba(255,255,255,0.02)',
                              fontSize: 12, color: cfg.tipoTarefa === val ? s.teal : s.muted,
                            }}
                          >
                            {label}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: s.muted, marginBottom: 8 }}>Tentativas por sessão</div>
                      <input
                        type="number"
                        value={cfg.totalTentativas}
                        min={5} max={30}
                        onChange={e => setCfg(prev => ({ ...prev, totalTentativas: Number(e.target.value) }))}
                        style={{ width: '100%', padding: '9px 12px', fontSize: 13, color: s.text, background: 'rgba(255,255,255,0.04)', border: `1px solid ${s.border}`, borderRadius: 8, outline: 'none', boxSizing: 'border-box' }}
                      />
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: s.muted, marginBottom: 8 }}>Critério de maestria (%)</div>
                      <input
                        type="number"
                        value={cfg.criterioMaestria}
                        min={50} max={100}
                        onChange={e => setCfg(prev => ({ ...prev, criterioMaestria: Number(e.target.value) }))}
                        style={{ width: '100%', padding: '9px 12px', fontSize: 13, color: s.text, background: 'rgba(255,255,255,0.04)', border: `1px solid ${s.border}`, borderRadius: 8, outline: 'none', boxSizing: 'border-box' }}
                      />
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: s.muted, marginBottom: 8 }}>Reforçamento</div>
                      <div style={{ display: 'flex', gap: 5 }}>
                        {([['visual', 'Visual'], ['audio', 'Áudio'], ['token', 'Token']] as const).map(([val, label]) => (
                          <div
                            key={val}
                            onClick={() => setCfg(prev => ({ ...prev, reforcoTipo: val }))}
                            style={{
                              flex: 1, padding: '7px 4px', borderRadius: 7, cursor: 'pointer', textAlign: 'center',
                              border: `1px solid ${cfg.reforcoTipo === val ? s.amber : s.border}`,
                              background: cfg.reforcoTipo === val ? 'rgba(239,159,39,0.08)' : 'rgba(255,255,255,0.02)',
                              fontSize: 11, color: cfg.reforcoTipo === val ? s.amber : s.muted,
                            }}
                          >
                            {label}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Supervisor — opções avançadas */}
              {nivel === 'supervisor' && (
                <div>
                  <SectionTitle>Opções avançadas — Modo livre</SectionTitle>
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 11, color: s.muted, marginBottom: 8 }}>Tipo de relação</div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {([
                        ['treino_direto', 'Treino direto'],
                        ['equivalencia', 'Equivalência'],
                        ['generalizacao', 'Generalização'],
                      ] as const).map(([val, label]) => (
                        <div
                          key={val}
                          onClick={() => setCfg(prev => ({ ...prev, tipoRelacao: val }))}
                          style={{
                            flex: 1, padding: '9px 6px', borderRadius: 8, cursor: 'pointer', textAlign: 'center',
                            border: `1px solid ${cfg.tipoRelacao === val ? s.purple : s.border}`,
                            background: cfg.tipoRelacao === val ? 'rgba(139,127,232,0.1)' : 'rgba(255,255,255,0.02)',
                            fontSize: 11, color: cfg.tipoRelacao === val ? s.purple : s.muted,
                          }}
                        >
                          {label}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 11, color: s.muted, marginBottom: 8 }}>Estratégia de dica</div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {([
                        ['none', 'Sem dica'],
                        ['least_to_most', 'Least to most'],
                        ['most_to_least', 'Most to least'],
                        ['time_delay', 'Time delay'],
                      ] as const).map(([val, label]) => (
                        <div
                          key={val}
                          onClick={() => setCfg(prev => ({ ...prev, estrategiaDica: val }))}
                          style={{
                            padding: '6px 12px', borderRadius: 20, cursor: 'pointer',
                            border: `1px solid ${cfg.estrategiaDica === val ? s.blue : s.border}`,
                            background: cfg.estrategiaDica === val ? 'rgba(55,138,221,0.1)' : 'transparent',
                            fontSize: 11, color: cfg.estrategiaDica === val ? s.blue : s.muted,
                          }}
                        >
                          {label}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ fontSize: 11, color: s.muted, marginBottom: 4 }}>Relações emergentes a testar</div>
                    {[
                      { key: 'testarSimetria' as const, label: 'Simetria', desc: 'Se A→B foi treinado, testa B→A' },
                      { key: 'testarTransitividade' as const, label: 'Transitividade', desc: 'Se A→B e B→C, testa A→C' },
                      { key: 'testarEquivalencia' as const, label: 'Equivalência', desc: 'Testa todas as relações emergentes' },
                    ].map(item => (
                      <div
                        key={item.key}
                        onClick={() => setCfg(prev => ({ ...prev, [item.key]: !prev[item.key] }))}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                          borderRadius: 8, cursor: 'pointer',
                          border: `1px solid ${cfg[item.key] ? s.purple : s.border}`,
                          background: cfg[item.key] ? 'rgba(139,127,232,0.08)' : 'rgba(255,255,255,0.02)',
                        }}
                      >
                        <div style={{
                          width: 18, height: 18, borderRadius: 4, flexShrink: 0,
                          background: cfg[item.key] ? s.purple : 'transparent',
                          border: `1.5px solid ${cfg[item.key] ? s.purple : s.border}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          {cfg[item.key] && <span style={{ color: '#fff', fontSize: 11 }}>✓</span>}
                        </div>
                        <div>
                          <div style={{ fontSize: 12, color: s.text }}>{item.label}</div>
                          <div style={{ fontSize: 10, color: s.muted }}>{item.desc}</div>
                        </div>
                      </div>
                    ))}

                    <div
                      onClick={() => setCfg(prev => ({ ...prev, condicAstracao: !prev.condicAstracao }))}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                        borderRadius: 8, cursor: 'pointer',
                        border: `1px solid ${cfg.condicAstracao ? s.coral : s.border}`,
                        background: cfg.condicAstracao ? 'rgba(224,90,75,0.08)' : 'rgba(255,255,255,0.02)',
                      }}
                    >
                      <div style={{
                        width: 18, height: 18, borderRadius: 4, flexShrink: 0,
                        background: cfg.condicAstracao ? s.coral : 'transparent',
                        border: `1.5px solid ${cfg.condicAstracao ? s.coral : s.border}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {cfg.condicAstracao && <span style={{ color: '#fff', fontSize: 11 }}>✓</span>}
                      </div>
                      <div>
                        <div style={{ fontSize: 12, color: s.text }}>Condicionamento de Abstração</div>
                        <div style={{ fontSize: 10, color: s.muted }}>Varia dimensões irrelevantes do estímulo para isolar controle pela relação</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer do modal */}
        {!enviado && (
          <div style={{ padding: '14px 24px', borderTop: `1px solid ${s.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button
              onClick={() => passo > 1 ? setPasso(p => (p - 1) as 1 | 2 | 3) : onClose()}
              style={{ fontSize: 12, padding: '7px 16px', borderRadius: 7, background: 'transparent', border: `1px solid ${s.border}`, color: s.muted, cursor: 'pointer' }}
            >
              {passo === 1 ? 'Cancelar' : '← Voltar'}
            </button>

            {/* Modo guiado: passo 2 já envia */}
            {nivel === 'terapeuta' && passo === 2 && (
              <button
                onClick={handleEnviar}
                disabled={!podeProsseguir() || enviando}
                style={{
                  fontSize: 12, padding: '7px 20px', borderRadius: 7, fontWeight: 500,
                  background: podeProsseguir() ? s.teal : 'rgba(29,158,117,0.3)',
                  border: 'none', color: '#fff', cursor: podeProsseguir() ? 'pointer' : 'not-allowed',
                }}
              >
                {enviando ? 'Enviando...' : 'Enviar para Apprentice'}
              </button>
            )}

            {/* Coordenador/Supervisor: navega entre passos */}
            {nivel !== 'terapeuta' && (
              passo < 3 ? (
                <button
                  onClick={() => setPasso(p => (p + 1) as 1 | 2 | 3)}
                  disabled={!podeProsseguir()}
                  style={{
                    fontSize: 12, padding: '7px 20px', borderRadius: 7, fontWeight: 500,
                    background: podeProsseguir() ? s.teal : 'rgba(29,158,117,0.3)',
                    border: 'none', color: '#fff', cursor: podeProsseguir() ? 'pointer' : 'not-allowed',
                  }}
                >
                  Próximo →
                </button>
              ) : (
                <button
                  onClick={handleEnviar}
                  disabled={enviando}
                  style={{ fontSize: 12, padding: '7px 20px', borderRadius: 7, fontWeight: 500, background: s.teal, border: 'none', color: '#fff', cursor: 'pointer' }}
                >
                  {enviando ? 'Enviando...' : 'Enviar para Apprentice'}
                </button>
              )
            )}

            {/* Modo guiado passo 1 */}
            {nivel === 'terapeuta' && passo === 1 && (
              <button
                onClick={() => setPasso(2)}
                disabled={!podeProsseguir()}
                style={{
                  fontSize: 12, padding: '7px 20px', borderRadius: 7, fontWeight: 500,
                  background: podeProsseguir() ? s.teal : 'rgba(29,158,117,0.3)',
                  border: 'none', color: '#fff', cursor: podeProsseguir() ? 'pointer' : 'not-allowed',
                }}
              >
                Próximo →
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Programa panel ───────────────────────────────────────────────────────────

function ProgramaPanel({
  programa, pacienteId, nivel, matrizes,
}: {
  programa: ProgramaEnsino
  pacienteId: string
  nivel: 'terapeuta' | 'coordenador' | 'supervisor'
  matrizes: Matriz[]
}) {
  const [modalAberto, setModalAberto] = useState(false)

  const PROTOCOLOS = ['VB-MAPP', 'ABLLS-R', 'PEAK', 'Social Skills', 'Outro']
  const LOCAIS = ['Clínica', 'Casa', 'Escola', 'Comunidade']
  const ESTRATEGIAS = ['Tentativa discreta', 'Modelagem', 'NET', 'Encadeamento', 'Role play']
  const OPERANTES = ['Mando', 'Tato', 'Ouvinte', 'Ecoico', 'Intraverbal', 'Imitação', 'Emparelhamento']
  const DICAS = ['Least to most', 'Most to least', 'Time delay', 'Simultânea']

  const s = {
    border: 'rgba(26,58,92,0.5)', teal: '#1D9E75', amber: '#EF9F27',
    purple: '#8B7FE8', text: '#e8eef4', muted: '#7a9ab5',
  }

  return (
    <>
      {modalAberto && (
        <ModalEnvioDigital
          programa={programa}
          pacienteId={pacienteId}
          nivel={nivel}
          matrizes={matrizes}
          onClose={() => setModalAberto(false)}
        />
      )}

      <div style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${s.border}`, borderRadius: 10, padding: 20, marginTop: 16 }}>

        <div style={{ marginBottom: 20 }}>
          <SectionTitle>1 · Identificação e justificativa</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <FieldRow label="Nome do programa" value={programa.nome} />
            <FieldRow label="Área de foco" value={programa.areaFoco} />
            <div style={{ gridColumn: '1/-1' }}><FieldRow label="Pré-requisitos para início" value={programa.prereqs} /></div>
            <div style={{ gridColumn: '1/-1' }}><FieldRow label="Relevância do treino" value={programa.relevancia} /></div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 10, color: s.muted, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>Protocolo de referência</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {PROTOCOLOS.map(p => <Chip key={p} label={p} active={programa.protocoloRef.includes(p)} color="#378ADD" />)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: s.muted, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>Local de implementação</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {LOCAIS.map(l => <Chip key={l} label={l} active={programa.localImpl.includes(l)} color={s.teal} />)}
            </div>
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <SectionTitle>2 · Contingências de ensino</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <FieldRow label="Antecedente — SD" value={programa.sd} />
            <FieldRow label="Resposta esperada — R" value={programa.resposta} />
            <FieldRow label="Consequência — acerto (SR+)" value={programa.consequenciaAcerto} />
            <FieldRow label="Consequência — erro" value={programa.consequenciaErro} />
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <SectionTitle>3 · Sistema de dicas e estratégia</SectionTitle>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 10, color: s.muted, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>Estratégia de dica</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {DICAS.map(d => <Chip key={d} label={d} active={programa.estrategiaDica === d} color={s.amber} />)}
            </div>
          </div>
          <FieldRow label="Hierarquia de dicas" value={programa.hierarquiaDicas} />
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 10, color: s.muted, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>Estratégia de ensino</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {ESTRATEGIAS.map(e => <Chip key={e} label={e} active={programa.estrategiaEnsino.includes(e)} color={s.teal} />)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: s.muted, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>Operante</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {OPERANTES.map(o => <Chip key={o} label={o} active={programa.operante === o} color={s.purple} />)}
            </div>
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <SectionTitle>4 · Critérios de avanço e materiais</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ gridColumn: '1/-1' }}><FieldRow label="Objetivo de longo prazo" value={programa.objetivoLongoPrazo} /></div>
            <FieldRow label="Critério de avanço" value={programa.criterioAvanco} />
            <FieldRow label="Critério de interrupção" value={programa.criterioInterrupcao} />
            <FieldRow label="Total de tentativas / sessão" value={`${programa.totalTentativas} tentativas`} />
            <div style={{ gridColumn: '1/-1' }}><FieldRow label="Materiais necessários" value={programa.materiais} /></div>
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <SectionTitle>5 · Objetivos de curto, médio e longo prazo</SectionTitle>
          {programa.objetivosCurtoPrazo.map(ocp => (
            <div key={ocp.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '1px solid rgba(26,58,92,0.3)' }}>
              <Badge label={PRAZO_STYLE[ocp.prazo].label} color={PRAZO_STYLE[ocp.prazo].color} bg={PRAZO_STYLE[ocp.prazo].bg} />
              <span style={{ flex: 1, fontSize: 12, color: ocp.atingido ? '#7a9ab5' : '#e8eef4', textDecoration: ocp.atingido ? 'line-through' : 'none' }}>
                {ocp.descricao}
              </span>
              {ocp.dataPrevista && <span style={{ fontSize: 11, color: '#7a9ab5', whiteSpace: 'nowrap' }}>{ocp.dataPrevista}</span>}
              <div style={{ width: 16, height: 16, borderRadius: 4, background: ocp.atingido ? s.teal : 'transparent', border: `1.5px solid ${ocp.atingido ? s.teal : 'rgba(26,58,92,0.6)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {ocp.atingido && <span style={{ color: '#fff', fontSize: 10 }}>✓</span>}
              </div>
            </div>
          ))}
          <button style={{ marginTop: 10, fontSize: 12, color: s.teal, background: 'transparent', border: '1px dashed rgba(29,158,117,0.4)', borderRadius: 7, padding: '6px 14px', cursor: 'pointer' }}>
            + Adicionar objetivo
          </button>
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 8, borderTop: `1px solid ${s.border}` }}>
          <button style={{ fontSize: 12, padding: '7px 14px', borderRadius: 7, background: 'transparent', border: `1px solid ${s.border}`, color: '#7a9ab5', cursor: 'pointer' }}>
            Vincular matriz de estímulos
          </button>
          <button
            onClick={() => setModalAberto(true)}
            style={{ fontSize: 12, padding: '7px 14px', borderRadius: 7, background: 'rgba(55,138,221,0.12)', border: '1px solid rgba(55,138,221,0.4)', color: '#378ADD', cursor: 'pointer', fontWeight: 500 }}
          >
            Enviar para treino digital
          </button>
          <button style={{ fontSize: 12, padding: '7px 14px', borderRadius: 7, background: s.teal, border: 'none', color: '#fff', cursor: 'pointer', fontWeight: 500 }}>
            Salvar programa
          </button>
        </div>
      </div>
    </>
  )
}

// ─── Protocolo de Conduta ─────────────────────────────────────────────────────

function ProtocoloPanel({ protocolo }: { protocolo: ProtocoloConduta }) {
  const s = { border: 'rgba(26,58,92,0.5)', amber: '#EF9F27', blue: '#378ADD', coral: '#E05A4B', text: '#e8eef4', muted: '#7a9ab5' }
  return (
    <div style={{ background: 'rgba(224,90,75,0.05)', border: '1px solid rgba(224,90,75,0.22)', borderRadius: 10, padding: 16, marginBottom: 10 }}>
      <div style={{ fontSize: 13, fontWeight: 500, color: '#f08070', marginBottom: 10 }}>{protocolo.nome}</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 10, color: s.muted, marginBottom: 4 }}>Topografia (o quê)</div>
          <div style={{ fontSize: 12, color: s.text }}>{protocolo.topografia}</div>
        </div>
        <div>
          <div style={{ fontSize: 10, color: s.muted, marginBottom: 4 }}>Função (por quê)</div>
          <div style={{ fontSize: 12, color: s.amber }}>{protocolo.funcao}</div>
        </div>
      </div>
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 10, color: s.muted, marginBottom: 6 }}>Estratégias</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {protocolo.estrategia.map(e => <span key={e} style={{ fontSize: 11, padding: '3px 9px', borderRadius: 20, background: 'rgba(55,138,221,0.12)', color: s.blue }}>{e}</span>)}
        </div>
      </div>
      <div>
        <div style={{ fontSize: 10, color: s.muted, marginBottom: 4 }}>Plano de crise / escalada</div>
        <div style={{ fontSize: 12, color: s.text, lineHeight: 1.5 }}>{protocolo.planoCrise}</div>
      </div>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function PlanosPage() {
  const { terapeuta } = useClinicContext()
  const nivel = (terapeuta?.nivel ?? 'coordenador') as 'terapeuta' | 'coordenador' | 'supervisor'
const [matrizes, setMatrizes] = useState<Matriz[]>([])

  useEffect(() => {
    const carregarMatrizes = async () => {
      const { data } = await supabase
        .from('stimulus_matrices')
        .select('id, name, description, columns, total_groups, created_at')
        .order('created_at', { ascending: false })
      if (data) {
        setMatrizes(data.map(m => ({
          id: m.id,
          nome: m.name,
          descricao: m.description ?? '',
          colunas: m.columns ?? [],
          grupos: Array.from({ length: m.total_groups }, (_, i) => ({
            id: `g${i+1}`,
            celulas: {},
          })),
          criatedAt: m.created_at?.slice(0, 10) ?? '',
          isPublic: false,
        })))
      }
    }
    carregarMatrizes()
  }, [])
  const [abaPage, setAbaPage] = useState<'planos' | 'biblioteca' | 'matrizes' | 'protocolos'>('planos')
  const [planoSelecionado, setPlanoSelecionado] = useState<PlanoIntervencao>(MOCK_PLANOS[0])
  const [alvoSelecionado, setAlvoSelecionado] = useState<AlvoComportamental | null>(MOCK_PLANOS[0].alvos[0])
  const [programaSelecionado, setProgramaSelecionado] = useState<ProgramaEnsino | null>(MOCK_PLANOS[0].alvos[0].programas[0] ?? null)
  const [detalheAba, setDetalheAba] = useState<'alvos' | 'protocolos' | 'historico'>('alvos')

  const s = {
    navy: '#07111f', card: 'rgba(13,32,53,0.85)', border: 'rgba(26,58,92,0.5)',
    teal: '#1D9E75', blue: '#378ADD', amber: '#EF9F27', coral: '#E05A4B',
    purple: '#8B7FE8', text: '#e8eef4', muted: '#7a9ab5',
  }

  const abas = [
    { key: 'planos' as const,     label: 'Planos ativos' },
    { key: 'biblioteca' as const, label: 'Biblioteca de programas' },
    { key: 'matrizes' as const,   label: 'Matrizes de estímulos' },
    { key: 'protocolos' as const, label: 'Protocolos de conduta' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: s.navy, color: s.text, fontFamily: 'var(--font-sans, system-ui, sans-serif)' }}>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 28px', borderBottom: `1px solid ${s.border}`, background: 'rgba(7,17,31,0.96)', position: 'sticky', top: 0, zIndex: 20 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 500 }}>Planos de Intervenção</div>
          <div style={{ fontSize: 12, color: s.muted, marginTop: 2 }}>Programas · Matrizes · Protocolos de conduta</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={{ fontSize: 12, padding: '7px 16px', borderRadius: 7, background: 'rgba(255,255,255,0.04)', border: `1px solid ${s.border}`, color: s.muted, cursor: 'pointer' }}>Biblioteca</button>
          <button style={{ fontSize: 12, padding: '7px 16px', borderRadius: 7, background: s.teal, border: 'none', color: '#fff', cursor: 'pointer', fontWeight: 500 }}>+ Novo plano</button>
        </div>
      </div>

      <div style={{ display: 'flex', padding: '0 28px', borderBottom: `1px solid ${s.border}`, background: 'rgba(7,17,31,0.7)' }}>
        {abas.map(a => (
          <button key={a.key} onClick={() => setAbaPage(a.key)} style={{ padding: '10px 18px', fontSize: 13, background: 'transparent', border: 'none', borderBottom: `2px solid ${abaPage === a.key ? s.teal : 'transparent'}`, color: abaPage === a.key ? s.teal : s.muted, cursor: 'pointer', transition: 'all 0.15s' }}>
            {a.label}
          </button>
        ))}
      </div>

      <div style={{ padding: '24px 28px' }}>

        {abaPage === 'planos' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14, marginBottom: 28 }}>
              {MOCK_PLANOS.map(plano => {
                const st = STATUS_PLANO[plano.status]
                const sel = plano.id === planoSelecionado.id
                return (
                  <div key={plano.id} onClick={() => { setPlanoSelecionado(plano); setAlvoSelecionado(plano.alvos[0] ?? null); setProgramaSelecionado(plano.alvos[0]?.programas[0] ?? null) }}
                    style={{ background: sel ? 'rgba(13,32,53,0.95)' : s.card, border: `1px solid ${sel ? s.teal : s.border}`, borderRadius: 12, padding: 18, cursor: 'pointer', transition: 'all 0.15s' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>{plano.pacienteNome}</div>
                        <div style={{ fontSize: 11, color: s.muted, marginTop: 2 }}>{plano.dataInicio ? `Início: ${plano.dataInicio} · Rev. ${plano.dataRevisao}` : 'Rascunho · não publicado'}</div>
                      </div>
                      <Badge label={st.label} color={st.color} bg={st.bg} />
                    </div>
                    <div style={{ display: 'flex', gap: 18 }}>
                      {[{ label: 'Alvos', val: plano.alvos.length }, { label: 'Programas', val: plano.alvos.reduce((acc, a) => acc + a.programas.length, 0) }, { label: 'Protocolos', val: plano.protocolos.length }].map(item => (
                        <div key={item.label}>
                          <div style={{ fontSize: 18, fontWeight: 500, color: s.text }}>{item.val}</div>
                          <div style={{ fontSize: 11, color: s.muted }}>{item.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
              <div onClick={() => {}} style={{ background: 'transparent', border: `1px dashed ${s.border}`, borderRadius: 12, padding: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: s.muted, fontSize: 13, minHeight: 100 }}>
                <span style={{ fontSize: 18 }}>+</span> Novo plano de intervenção
              </div>
            </div>

            <div style={{ background: s.card, border: `1px solid ${s.border}`, borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ padding: '18px 24px', borderBottom: `1px solid ${s.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>Plano de Intervenção — {planoSelecionado.pacienteNome}</div>
                  <div style={{ fontSize: 11, color: s.muted, marginTop: 2 }}>{planoSelecionado.dataInicio ? `Ativo desde ${planoSelecionado.dataInicio} · Revisão prevista: ${planoSelecionado.dataRevisao}` : 'Rascunho — configure e publique o plano'}</div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button style={{ fontSize: 12, padding: '6px 13px', borderRadius: 7, background: 'rgba(255,255,255,0.04)', border: `1px solid ${s.border}`, color: s.muted, cursor: 'pointer' }}>Exportar PDF</button>
                  <button style={{ fontSize: 12, padding: '6px 13px', borderRadius: 7, background: 'rgba(255,255,255,0.04)', border: `1px solid ${s.border}`, color: s.muted, cursor: 'pointer' }}>Editar plano</button>
                  <button style={{ fontSize: 12, padding: '6px 13px', borderRadius: 7, background: s.teal, border: 'none', color: '#fff', cursor: 'pointer', fontWeight: 500 }}>+ Adicionar alvo</button>
                </div>
              </div>

              <div style={{ display: 'flex', borderBottom: `1px solid ${s.border}`, background: 'rgba(0,0,0,0.15)' }}>
                {[{ key: 'alvos' as const, label: 'Alvos e programas' }, { key: 'protocolos' as const, label: 'Protocolos de conduta' }, { key: 'historico' as const, label: 'Histórico' }].map(t => (
                  <button key={t.key} onClick={() => setDetalheAba(t.key)} style={{ padding: '9px 18px', fontSize: 12, background: 'transparent', border: 'none', borderBottom: `2px solid ${detalheAba === t.key ? s.teal : 'transparent'}`, color: detalheAba === t.key ? s.teal : s.muted, cursor: 'pointer' }}>
                    {t.label}
                  </button>
                ))}
              </div>

              <div style={{ padding: 24 }}>
                {detalheAba === 'alvos' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 20 }}>
                    <div>
                      <div style={{ fontSize: 11, color: s.muted, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Comportamentos-alvo</div>
                      {planoSelecionado.alvos.map(alvo => {
                        const stAlvo = STATUS_ALVO[alvo.status]
                        const sel = alvoSelecionado?.id === alvo.id
                        return (
                          <div key={alvo.id} onClick={() => { setAlvoSelecionado(alvo); setProgramaSelecionado(alvo.programas[0] ?? null) }}
                            style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '11px 14px', borderRadius: 9, marginBottom: 6, background: sel ? 'rgba(29,158,117,0.08)' : 'rgba(255,255,255,0.02)', border: `1px solid ${sel ? 'rgba(29,158,117,0.35)' : s.border}`, cursor: 'pointer', transition: 'all 0.15s' }}>
                            <div style={{ width: 7, height: 7, borderRadius: '50%', background: stAlvo.color, flexShrink: 0, marginTop: 4 }} />
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 3 }}>
                                <span style={{ fontSize: 10, fontFamily: 'monospace', color: s.blue, background: 'rgba(55,138,221,0.12)', padding: '1px 6px', borderRadius: 4 }}>{alvo.codigo}</span>
                              </div>
                              <div style={{ fontSize: 12, color: s.text, lineHeight: 1.4 }}>{alvo.descricao}</div>
                              <div style={{ fontSize: 10, color: s.muted, marginTop: 3 }}>{alvo.area} · {alvo.operante}</div>
                            </div>
                          </div>
                        )
                      })}
                      <div style={{ padding: '10px 14px', borderRadius: 9, marginTop: 4, border: `1px dashed ${s.border}`, color: s.muted, fontSize: 12, cursor: 'pointer', textAlign: 'center' }}>
                        + Adicionar da biblioteca
                      </div>
                    </div>

                    <div>
                      {alvoSelecionado ? (
                        <>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 500, color: s.text }}>{alvoSelecionado.descricao}</div>
                              <div style={{ fontSize: 11, color: s.muted, marginTop: 2 }}>{alvoSelecionado.area} · {alvoSelecionado.funcao} · {alvoSelecionado.operante}</div>
                            </div>
                            <Badge label={STATUS_ALVO[alvoSelecionado.status].label} color={STATUS_ALVO[alvoSelecionado.status].color} bg={`${STATUS_ALVO[alvoSelecionado.status].color}18`} />
                          </div>

                          {alvoSelecionado.programas.length > 0 ? (
                            <>
                              <div style={{ display: 'flex', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
                                {alvoSelecionado.programas.map(p => (
                                  <button key={p.id} onClick={() => setProgramaSelecionado(p)}
                                    style={{ fontSize: 12, padding: '5px 13px', borderRadius: 20, cursor: 'pointer', border: `1px solid ${programaSelecionado?.id === p.id ? s.teal : s.border}`, background: programaSelecionado?.id === p.id ? 'rgba(29,158,117,0.12)' : 'transparent', color: programaSelecionado?.id === p.id ? s.teal : s.muted }}>
                                    {p.nome}
                                  </button>
                                ))}
                                <button style={{ fontSize: 12, padding: '5px 13px', borderRadius: 20, cursor: 'pointer', border: `1px dashed ${s.border}`, background: 'transparent', color: s.muted }}>
                                  + Novo programa
                                </button>
                              </div>
                              {programaSelecionado && (
                                <ProgramaPanel
  programa={programaSelecionado}
                            pacienteId={planoSelecionado.pacienteId}
                                  nivel={nivel}
                                  matrizes={matrizes}
                                />
                              )}
                            </>
                          ) : (
                            <div style={{ textAlign: 'center', padding: '32px 20px', color: s.muted, fontSize: 13, border: `1px dashed ${s.border}`, borderRadius: 10 }}>
                              <div style={{ marginBottom: 10 }}>Nenhum programa de ensino vinculado a este alvo</div>
                              <button style={{ fontSize: 12, padding: '7px 16px', borderRadius: 7, background: s.teal, border: 'none', color: '#fff', cursor: 'pointer' }}>
                                + Criar programa de ensino
                              </button>
                            </div>
                          )}
                        </>
                      ) : (
                        <div style={{ color: s.muted, fontSize: 13, padding: 20 }}>Selecione um comportamento-alvo para ver os programas</div>
                      )}
                    </div>
                  </div>
                )}

                {detalheAba === 'protocolos' && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                      <button style={{ fontSize: 12, padding: '7px 14px', borderRadius: 7, background: s.coral, border: 'none', color: '#fff', cursor: 'pointer', fontWeight: 500 }}>+ Adicionar protocolo</button>
                    </div>
                    {planoSelecionado.protocolos.length > 0
                      ? planoSelecionado.protocolos.map(p => <ProtocoloPanel key={p.id} protocolo={p} />)
                      : <div style={{ textAlign: 'center', padding: '32px 20px', color: s.muted, fontSize: 13, border: `1px dashed ${s.border}`, borderRadius: 10 }}>Nenhum protocolo de conduta cadastrado</div>}
                  </div>
                )}

                {detalheAba === 'historico' && (
                  <div style={{ color: s.muted, fontSize: 13, textAlign: 'center', padding: 32 }}>Histórico de revisões — em breve</div>
                )}
              </div>
            </div>
          </>
        )}

        {abaPage !== 'planos' && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: s.muted, fontSize: 14, border: `1px dashed ${s.border}`, borderRadius: 12 }}>
            <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.3 }}>{abaPage === 'biblioteca' ? '◫' : abaPage === 'matrizes' ? '⊞' : '⊟'}</div>
            <div style={{ fontWeight: 500, marginBottom: 6, color: s.text }}>
              {abaPage === 'biblioteca' ? 'Biblioteca de programas' : abaPage === 'matrizes' ? 'Matrizes de estímulos' : 'Protocolos de conduta'}
            </div>
            <div>Em desenvolvimento — disponível em breve</div>
          </div>
        )}
      </div>
    </div>
  )
}
