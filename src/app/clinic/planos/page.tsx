'use client'

import { useState } from 'react'
import { useClinicContext } from '../layout'

// ─── Tipos ────────────────────────────────────────────────────────────────────

type PrazoType = 'curto' | 'medio' | 'longo'
type StatusPlano = 'ativo' | 'revisao' | 'rascunho' | 'encerrado'

interface Objetivo {
  id: string
  prazo: PrazoType
  descricao: string
  dataPrevista?: string
  atingido: boolean
}

interface ProgramaEnsino {
  id: string
  nome: string
  areaFoco: string
  prereqs: string
  relevancia: string
  protocoloRef: string[]
  localImpl: string[]
  sd: string
  resposta: string
  consequenciaAcerto: string
  consequenciaErro: string
  estrategiaDica: string
  hierarquiaDicas: string
  estrategiaEnsino: string[]
  operante: string
  objetivoLongoPrazo: string
  criterioAvanco: string
  criterioInterrupcao: string
  totalTentativas: number
  materiais: string
  objetivosCurtoPrazo: Objetivo[]
  status: 'ativo' | 'dominio' | 'pausado'
}

interface AlvoComportamental {
  id: string
  codigo: string
  descricao: string
  area: string
  funcao: string
  operante: string
  status: 'ativo' | 'emergente' | 'dominio' | 'nao_iniciado'
  programas: ProgramaEnsino[]
}

interface ProtocoloConduta {
  id: string
  nome: string
  topografia: string
  funcao: string
  estrategia: string[]
  planoCrise: string
}

interface PlanoIntervencao {
  id: string
  nome: string
  pacienteNome: string
  pacienteId: string
  terapeutaNome: string
  dataInicio: string
  dataRevisao: string
  status: StatusPlano
  alvos: AlvoComportamental[]
  protocolos: ProtocoloConduta[]
}

// ─── Dados mock ───────────────────────────────────────────────────────────────

const MOCK_PLANOS: PlanoIntervencao[] = [
  {
    id: '1',
    nome: 'Plano de Intervenção — Tião Mello',
    pacienteNome: 'Tião Mello',
    pacienteId: 'f04cc5b0-513a-43ba-97b9-1662727acede',
    terapeutaNome: 'Wilson',
    dataInicio: 'mar/2025',
    dataRevisao: 'jun/2025',
    status: 'ativo',
    alvos: [
      {
        id: 'a1',
        codigo: '0A',
        descricao: 'Orientar-se para voz ou rosto de outra pessoa',
        area: 'Prontidão',
        funcao: 'Atenção Social Inicial',
        operante: 'Ouvinte',
        status: 'ativo',
        programas: [
          {
            id: 'p1',
            nome: 'Atenção ao nome',
            areaFoco: 'Prontidão · Atenção Social',
            prereqs: 'Tolerância ambiental básica (0E) · Permanência no ambiente sem fuga',
            relevancia: 'Base para todas as interações sociais e aprendizagem instrucional posterior',
            protocoloRef: ['VB-MAPP'],
            localImpl: ['Clínica', 'Casa'],
            sd: 'Chamada verbal pelo nome',
            resposta: 'Orientação do rosto ≥ 0,5 s',
            consequenciaAcerto: 'Reforço social + item preferido',
            consequenciaErro: 'Correção com dica física leve',
            estrategiaDica: 'Least to most',
            hierarquiaDicas: 'Independente → Gestual → Físico parcial → Físico total',
            estrategiaEnsino: ['Tentativa discreta'],
            operante: 'Ouvinte',
            objetivoLongoPrazo: 'Orientar ao nome em 3 ambientes diferentes, com 3 pessoas distintas, 80% em 2 sessões consecutivas',
            criterioAvanco: '80% em 2 sessões consecutivas',
            criterioInterrupcao: 'Queda abaixo de 50% por 3 sessões',
            totalTentativas: 10,
            materiais: 'Itens preferidos · Planilha de registro · Cronômetro',
            status: 'ativo',
            objetivosCurtoPrazo: [
              { id: 'o1', prazo: 'curto', descricao: 'Orientar ao nome com dica física em 80% das tentativas', dataPrevista: 'abr/2025', atingido: true },
              { id: 'o2', prazo: 'medio', descricao: 'Orientar ao nome de forma independente em 80% das tentativas na clínica', dataPrevista: 'mai/2025', atingido: false },
              { id: 'o3', prazo: 'longo', descricao: 'Generalizar para casa e escola com 3 pessoas diferentes', dataPrevista: 'jul/2025', atingido: false },
            ],
          },
        ],
      },
      {
        id: 'a2',
        codigo: 'IM-0C',
        descricao: 'Tocar o mesmo objeto que o instrutor toca',
        area: 'Imitação',
        funcao: 'Coordenação Social',
        operante: 'Imitação',
        status: 'emergente',
        programas: [],
      },
      {
        id: 'a3',
        codigo: 'EC-0A',
        descricao: 'Produzir sons espontâneos (balbucio)',
        area: 'Ecoico',
        funcao: 'Pré-vocalização',
        operante: 'Ecoico',
        status: 'nao_iniciado',
        programas: [],
      },
    ],
    protocolos: [
      {
        id: 'pr1',
        nome: 'Comportamento de fuga de tarefa',
        topografia: 'Esquiva / recusa com choro',
        funcao: 'Fuga',
        estrategia: ['Extinção', 'DRA', 'NCR'],
        planoCrise: 'Pausar atividade, ofertar item de alta preferência, retomar em 2 min com demanda menor',
      },
    ],
  },
  {
    id: '2',
    nome: 'Plano de Intervenção — Ana Beatriz',
    pacienteNome: 'Ana Beatriz',
    pacienteId: 'abc-123',
    terapeutaNome: 'Wilson',
    dataInicio: 'jan/2025',
    dataRevisao: 'abr/2025',
    status: 'revisao',
    alvos: [],
    protocolos: [],
  },
  {
    id: '3',
    nome: 'Plano de Intervenção — Rafa Costa',
    pacienteNome: 'Rafa Costa',
    pacienteId: 'def-456',
    terapeutaNome: 'Wilson',
    dataInicio: '',
    dataRevisao: '',
    status: 'rascunho',
    alvos: [],
    protocolos: [],
  },
]

// ─── Helpers de estilo ────────────────────────────────────────────────────────

const STATUS_PLANO: Record<StatusPlano, { label: string; color: string; bg: string }> = {
  ativo:     { label: 'Ativo',    color: '#1D9E75', bg: 'rgba(29,158,117,0.12)' },
  revisao:   { label: 'Revisão',  color: '#EF9F27', bg: 'rgba(239,159,39,0.12)' },
  rascunho:  { label: 'Rascunho', color: '#8B7FE8', bg: 'rgba(139,127,232,0.12)' },
  encerrado: { label: 'Encerrado',color: '#7a9ab5', bg: 'rgba(122,154,181,0.10)' },
}

const STATUS_ALVO: Record<string, { label: string; color: string }> = {
  ativo:       { label: 'Em andamento', color: '#1D9E75' },
  emergente:   { label: 'Emergente',    color: '#EF9F27' },
  dominio:     { label: 'Domínio',      color: '#378ADD' },
  nao_iniciado:{ label: 'Não iniciado', color: '#7a9ab5' },
}

const PRAZO_STYLE: Record<PrazoType, { label: string; color: string; bg: string }> = {
  curto: { label: 'Curto prazo', color: '#1D9E75', bg: 'rgba(29,158,117,0.12)' },
  medio: { label: 'Médio prazo', color: '#EF9F27', bg: 'rgba(239,159,39,0.12)' },
  longo: { label: 'Longo prazo', color: '#8B7FE8', bg: 'rgba(139,127,232,0.12)' },
}

// ─── Subcomponentes ───────────────────────────────────────────────────────────

function Badge({ label, color, bg }: { label: string; color: string; bg: string }) {
  return (
    <span style={{
      fontSize: 10, padding: '3px 10px', borderRadius: 20,
      fontWeight: 500, color, background: bg, whiteSpace: 'nowrap',
    }}>
      {label}
    </span>
  )
}

function Chip({
  label, active, color = '#1D9E75',
  onClick,
}: { label: string; active?: boolean; color?: string; onClick?: () => void }) {
  return (
    <span
      onClick={onClick}
      style={{
        fontSize: 11, padding: '4px 11px', borderRadius: 20, cursor: onClick ? 'pointer' : 'default',
        border: `1px solid ${active ? color : 'rgba(26,58,92,0.5)'}`,
        color: active ? color : '#7a9ab5',
        background: active ? `${color}18` : 'transparent',
        transition: 'all 0.15s',
      }}
    >
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
    <div style={{
      fontSize: 10, color: '#7a9ab5', letterSpacing: '0.1em', textTransform: 'uppercase',
      marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid rgba(26,58,92,0.4)',
    }}>
      {children}
    </div>
  )
}

// ─── Painel: Programa de Ensino ───────────────────────────────────────────────

function ProgramaPanel({ programa }: { programa: ProgramaEnsino }) {
  const PROTOCOLOS = ['VB-MAPP', 'ABLLS-R', 'PEAK', 'Social Skills', 'Outro']
  const LOCAIS = ['Clínica', 'Casa', 'Escola', 'Comunidade']
  const ESTRATEGIAS = ['Tentativa discreta', 'Modelagem', 'NET', 'Encadeamento', 'Role play']
  const OPERANTES = ['Mando', 'Tato', 'Ouvinte', 'Ecoico', 'Intraverbal', 'Imitação', 'Emparelhamento']
  const DICAS = ['Least to most', 'Most to least', 'Time delay', 'Simultânea']

  return (
    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(26,58,92,0.5)', borderRadius: 10, padding: 20, marginTop: 16 }}>

      {/* Bloco 1 */}
      <div style={{ marginBottom: 20 }}>
        <SectionTitle>1 · Identificação e justificativa</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <FieldRow label="Nome do programa" value={programa.nome} />
          <FieldRow label="Área de foco" value={programa.areaFoco} />
          <div style={{ gridColumn: '1/-1' }}>
            <FieldRow label="Pré-requisitos para início" value={programa.prereqs} />
          </div>
          <div style={{ gridColumn: '1/-1' }}>
            <FieldRow label="Relevância do treino" value={programa.relevancia} />
          </div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 10, color: '#7a9ab5', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>Protocolo de referência</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {PROTOCOLOS.map(p => <Chip key={p} label={p} active={programa.protocoloRef.includes(p)} color="#378ADD" />)}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 10, color: '#7a9ab5', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>Local de implementação</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {LOCAIS.map(l => <Chip key={l} label={l} active={programa.localImpl.includes(l)} color="#1D9E75" />)}
          </div>
        </div>
      </div>

      {/* Bloco 2 */}
      <div style={{ marginBottom: 20 }}>
        <SectionTitle>2 · Contingências de ensino</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <FieldRow label="Antecedente — SD" value={programa.sd} />
          <FieldRow label="Resposta esperada — R" value={programa.resposta} />
          <FieldRow label="Consequência — acerto (SR+)" value={programa.consequenciaAcerto} />
          <FieldRow label="Consequência — erro" value={programa.consequenciaErro} />
        </div>
      </div>

      {/* Bloco 3 */}
      <div style={{ marginBottom: 20 }}>
        <SectionTitle>3 · Sistema de dicas e estratégia</SectionTitle>
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 10, color: '#7a9ab5', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>Estratégia de dica</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {DICAS.map(d => <Chip key={d} label={d} active={programa.estrategiaDica === d} color="#EF9F27" />)}
          </div>
        </div>
        <FieldRow label="Hierarquia de dicas" value={programa.hierarquiaDicas} />
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 10, color: '#7a9ab5', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>Estratégia de ensino</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {ESTRATEGIAS.map(e => <Chip key={e} label={e} active={programa.estrategiaEnsino.includes(e)} color="#1D9E75" />)}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 10, color: '#7a9ab5', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>Operante</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {OPERANTES.map(o => <Chip key={o} label={o} active={programa.operante === o} color="#8B7FE8" />)}
          </div>
        </div>
      </div>

      {/* Bloco 4 */}
      <div style={{ marginBottom: 20 }}>
        <SectionTitle>4 · Critérios de avanço e materiais</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={{ gridColumn: '1/-1' }}>
            <FieldRow label="Objetivo de longo prazo" value={programa.objetivoLongoPrazo} />
          </div>
          <FieldRow label="Critério de avanço" value={programa.criterioAvanco} />
          <FieldRow label="Critério de interrupção" value={programa.criterioInterrupcao} />
          <FieldRow label="Total de tentativas / sessão" value={`${programa.totalTentativas} tentativas`} />
          <div style={{ gridColumn: '1/-1' }}>
            <FieldRow label="Materiais necessários" value={programa.materiais} />
          </div>
        </div>
      </div>

      {/* Bloco 5 — OCPs */}
      <div style={{ marginBottom: 16 }}>
        <SectionTitle>5 · Objetivos de curto, médio e longo prazo</SectionTitle>
        {programa.objetivosCurtoPrazo.map(ocp => (
          <div key={ocp.id} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '9px 0', borderBottom: '1px solid rgba(26,58,92,0.3)',
          }}>
            <Badge
              label={PRAZO_STYLE[ocp.prazo].label}
              color={PRAZO_STYLE[ocp.prazo].color}
              bg={PRAZO_STYLE[ocp.prazo].bg}
            />
            <span style={{ flex: 1, fontSize: 12, color: ocp.atingido ? '#7a9ab5' : '#e8eef4', textDecoration: ocp.atingido ? 'line-through' : 'none' }}>
              {ocp.descricao}
            </span>
            {ocp.dataPrevista && (
              <span style={{ fontSize: 11, color: '#7a9ab5', whiteSpace: 'nowrap' }}>{ocp.dataPrevista}</span>
            )}
            <div style={{
              width: 16, height: 16, borderRadius: 4,
              background: ocp.atingido ? '#1D9E75' : 'transparent',
              border: `1.5px solid ${ocp.atingido ? '#1D9E75' : 'rgba(26,58,92,0.6)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {ocp.atingido && <span style={{ color: '#fff', fontSize: 10, lineHeight: 1 }}>✓</span>}
            </div>
          </div>
        ))}
        <button style={{
          marginTop: 10, fontSize: 12, color: '#1D9E75', background: 'transparent',
          border: '1px dashed rgba(29,158,117,0.4)', borderRadius: 7, padding: '6px 14px', cursor: 'pointer',
        }}>
          + Adicionar objetivo
        </button>
      </div>

      {/* Ações */}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 8, borderTop: '1px solid rgba(26,58,92,0.4)' }}>
        <button style={{ fontSize: 12, padding: '7px 14px', borderRadius: 7, background: 'transparent', border: '1px solid rgba(26,58,92,0.5)', color: '#7a9ab5', cursor: 'pointer' }}>
          Vincular matriz de estímulos
        </button>
        <button style={{ fontSize: 12, padding: '7px 14px', borderRadius: 7, background: '#1D9E75', border: 'none', color: '#fff', cursor: 'pointer', fontWeight: 500 }}>
          Salvar programa
        </button>
      </div>
    </div>
  )
}

// ─── Painel: Protocolo de Conduta ─────────────────────────────────────────────

function ProtocoloPanel({ protocolo }: { protocolo: ProtocoloConduta }) {
  return (
    <div style={{
      background: 'rgba(224,90,75,0.05)', border: '1px solid rgba(224,90,75,0.22)',
      borderRadius: 10, padding: 16, marginBottom: 10,
    }}>
      <div style={{ fontSize: 13, fontWeight: 500, color: '#f08070', marginBottom: 10 }}>{protocolo.nome}</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 10, color: '#7a9ab5', marginBottom: 4 }}>Topografia (o quê)</div>
          <div style={{ fontSize: 12, color: '#e8eef4' }}>{protocolo.topografia}</div>
        </div>
        <div>
          <div style={{ fontSize: 10, color: '#7a9ab5', marginBottom: 4 }}>Função (por quê)</div>
          <div style={{ fontSize: 12, color: '#EF9F27' }}>{protocolo.funcao}</div>
        </div>
      </div>
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 10, color: '#7a9ab5', marginBottom: 6 }}>Estratégias</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {protocolo.estrategia.map(e => (
            <span key={e} style={{ fontSize: 11, padding: '3px 9px', borderRadius: 20, background: 'rgba(55,138,221,0.12)', color: '#378ADD' }}>{e}</span>
          ))}
        </div>
      </div>
      <div>
        <div style={{ fontSize: 10, color: '#7a9ab5', marginBottom: 4 }}>Plano de crise / escalada</div>
        <div style={{ fontSize: 12, color: '#e8eef4', lineHeight: 1.5 }}>{protocolo.planoCrise}</div>
      </div>
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function PlanosPage() {
  useClinicContext()

  const [abaPage, setAbaPage] = useState<'planos' | 'biblioteca' | 'matrizes' | 'protocolos'>('planos')
  const [planoSelecionado, setPlanoSelecionado] = useState<PlanoIntervencao>(MOCK_PLANOS[0])
  const [alvoSelecionado, setAlvoSelecionado] = useState<AlvoComportamental | null>(MOCK_PLANOS[0].alvos[0])
  const [programaSelecionado, setProgramaSelecionado] = useState<ProgramaEnsino | null>(MOCK_PLANOS[0].alvos[0].programas[0] ?? null)
  const [detalheAba, setDetalheAba] = useState<'alvos' | 'protocolos' | 'historico'>('alvos')

  const s = {
    // cores base
    navy:   '#07111f',
    card:   'rgba(13,32,53,0.85)',
    border: 'rgba(26,58,92,0.5)',
    teal:   '#1D9E75',
    blue:   '#378ADD',
    amber:  '#EF9F27',
    coral:  '#E05A4B',
    purple: '#8B7FE8',
    text:   '#e8eef4',
    muted:  '#7a9ab5',
  }

  const abas: { key: typeof abaPage; label: string }[] = [
    { key: 'planos',     label: 'Planos ativos' },
    { key: 'biblioteca', label: 'Biblioteca de programas' },
    { key: 'matrizes',   label: 'Matrizes de estímulos' },
    { key: 'protocolos', label: 'Protocolos de conduta' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: s.navy, color: s.text, fontFamily: 'var(--font-sans, system-ui, sans-serif)' }}>

      {/* Topbar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 28px', borderBottom: `1px solid ${s.border}`,
        background: 'rgba(7,17,31,0.96)', position: 'sticky', top: 0, zIndex: 20,
      }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 500 }}>Planos de Intervenção</div>
          <div style={{ fontSize: 12, color: s.muted, marginTop: 2 }}>Programas · Matrizes · Protocolos de conduta</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={{ fontSize: 12, padding: '7px 16px', borderRadius: 7, background: 'rgba(255,255,255,0.04)', border: `1px solid ${s.border}`, color: s.muted, cursor: 'pointer' }}>
            Biblioteca
          </button>
          <button style={{ fontSize: 12, padding: '7px 16px', borderRadius: 7, background: s.teal, border: 'none', color: '#fff', cursor: 'pointer', fontWeight: 500 }}>
            + Novo plano
          </button>
        </div>
      </div>

      {/* Tabs página */}
      <div style={{ display: 'flex', padding: '0 28px', borderBottom: `1px solid ${s.border}`, background: 'rgba(7,17,31,0.7)' }}>
        {abas.map(a => (
          <button
            key={a.key}
            onClick={() => setAbaPage(a.key)}
            style={{
              padding: '10px 18px', fontSize: 13, background: 'transparent', border: 'none',
              borderBottom: `2px solid ${abaPage === a.key ? s.teal : 'transparent'}`,
              color: abaPage === a.key ? s.teal : s.muted,
              cursor: 'pointer', transition: 'all 0.15s',
            }}
          >
            {a.label}
          </button>
        ))}
      </div>

      <div style={{ padding: '24px 28px' }}>

        {/* ── ABA: Planos ativos ── */}
        {abaPage === 'planos' && (
          <>
            {/* Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14, marginBottom: 28 }}>
              {MOCK_PLANOS.map(plano => {
                const st = STATUS_PLANO[plano.status]
                const sel = plano.id === planoSelecionado.id
                return (
                  <div
                    key={plano.id}
                    onClick={() => {
                      setPlanoSelecionado(plano)
                      setAlvoSelecionado(plano.alvos[0] ?? null)
                      setProgramaSelecionado(plano.alvos[0]?.programas[0] ?? null)
                    }}
                    style={{
                      background: sel ? 'rgba(13,32,53,0.95)' : s.card,
                      border: `1px solid ${sel ? s.teal : s.border}`,
                      borderRadius: 12, padding: 18, cursor: 'pointer', transition: 'all 0.15s',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>{plano.pacienteNome}</div>
                        <div style={{ fontSize: 11, color: s.muted, marginTop: 2 }}>
                          {plano.dataInicio ? `Início: ${plano.dataInicio} · Rev. ${plano.dataRevisao}` : 'Rascunho · não publicado'}
                        </div>
                      </div>
                      <Badge label={st.label} color={st.color} bg={st.bg} />
                    </div>
                    <div style={{ display: 'flex', gap: 18 }}>
                      {[
                        { label: 'Alvos',      val: plano.alvos.length },
                        { label: 'Programas',  val: plano.alvos.reduce((acc, a) => acc + a.programas.length, 0) },
                        { label: 'Protocolos', val: plano.protocolos.length },
                      ].map(item => (
                        <div key={item.label}>
                          <div style={{ fontSize: 18, fontWeight: 500, color: s.text }}>{item.val}</div>
                          <div style={{ fontSize: 11, color: s.muted }}>{item.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}

              {/* Card novo */}
              <div style={{
                background: 'transparent', border: `1px dashed ${s.border}`,
                borderRadius: 12, padding: 18, cursor: 'pointer', display: 'flex',
                alignItems: 'center', justifyContent: 'center', gap: 8, color: s.muted,
                fontSize: 13, minHeight: 100, transition: 'all 0.15s',
              }}>
                <span style={{ fontSize: 18, lineHeight: 1 }}>+</span> Novo plano de intervenção
              </div>
            </div>

            {/* Painel de detalhe */}
            <div style={{ background: s.card, border: `1px solid ${s.border}`, borderRadius: 12, overflow: 'hidden' }}>

              {/* Header do plano */}
              <div style={{
                padding: '18px 24px', borderBottom: `1px solid ${s.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>Plano de Intervenção — {planoSelecionado.pacienteNome}</div>
                  <div style={{ fontSize: 11, color: s.muted, marginTop: 2 }}>
                    {planoSelecionado.dataInicio
                      ? `Ativo desde ${planoSelecionado.dataInicio} · Revisão prevista: ${planoSelecionado.dataRevisao}`
                      : 'Rascunho — configure e publique o plano'}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button style={{ fontSize: 12, padding: '6px 13px', borderRadius: 7, background: 'rgba(255,255,255,0.04)', border: `1px solid ${s.border}`, color: s.muted, cursor: 'pointer' }}>
                    Exportar PDF
                  </button>
                  <button style={{ fontSize: 12, padding: '6px 13px', borderRadius: 7, background: 'rgba(255,255,255,0.04)', border: `1px solid ${s.border}`, color: s.muted, cursor: 'pointer' }}>
                    Editar plano
                  </button>
                  <button style={{ fontSize: 12, padding: '6px 13px', borderRadius: 7, background: s.teal, border: 'none', color: '#fff', cursor: 'pointer', fontWeight: 500 }}>
                    + Adicionar alvo
                  </button>
                </div>
              </div>

              {/* Sub-tabs do detalhe */}
              <div style={{ display: 'flex', borderBottom: `1px solid ${s.border}`, background: 'rgba(0,0,0,0.15)' }}>
                {[
                  { key: 'alvos' as const, label: 'Alvos e programas' },
                  { key: 'protocolos' as const, label: 'Protocolos de conduta' },
                  { key: 'historico' as const, label: 'Histórico' },
                ].map(t => (
                  <button
                    key={t.key}
                    onClick={() => setDetalheAba(t.key)}
                    style={{
                      padding: '9px 18px', fontSize: 12, background: 'transparent', border: 'none',
                      borderBottom: `2px solid ${detalheAba === t.key ? s.teal : 'transparent'}`,
                      color: detalheAba === t.key ? s.teal : s.muted, cursor: 'pointer',
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <div style={{ padding: 24 }}>

                {/* ── Sub-aba: Alvos e programas ── */}
                {detalheAba === 'alvos' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 20 }}>

                    {/* Lista de alvos */}
                    <div>
                      <div style={{ fontSize: 11, color: s.muted, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        Comportamentos-alvo
                      </div>
                      {planoSelecionado.alvos.map(alvo => {
                        const stAlvo = STATUS_ALVO[alvo.status]
                        const sel = alvoSelecionado?.id === alvo.id
                        return (
                          <div
                            key={alvo.id}
                            onClick={() => {
                              setAlvoSelecionado(alvo)
                              setProgramaSelecionado(alvo.programas[0] ?? null)
                            }}
                            style={{
                              display: 'flex', alignItems: 'flex-start', gap: 10,
                              padding: '11px 14px', borderRadius: 9, marginBottom: 6,
                              background: sel ? 'rgba(29,158,117,0.08)' : 'rgba(255,255,255,0.02)',
                              border: `1px solid ${sel ? 'rgba(29,158,117,0.35)' : s.border}`,
                              cursor: 'pointer', transition: 'all 0.15s',
                            }}
                          >
                            <div style={{ width: 7, height: 7, borderRadius: '50%', background: stAlvo.color, flexShrink: 0, marginTop: 4 }} />
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 3 }}>
                                <span style={{ fontSize: 10, fontFamily: 'monospace', color: s.blue, background: 'rgba(55,138,221,0.12)', padding: '1px 6px', borderRadius: 4 }}>
                                  {alvo.codigo}
                                </span>
                              </div>
                              <div style={{ fontSize: 12, color: s.text, lineHeight: 1.4 }}>{alvo.descricao}</div>
                              <div style={{ fontSize: 10, color: s.muted, marginTop: 3 }}>{alvo.area} · {alvo.operante}</div>
                            </div>
                          </div>
                        )
                      })}

                      {/* Botão adicionar alvo */}
                      <div style={{
                        padding: '10px 14px', borderRadius: 9, marginTop: 4,
                        border: `1px dashed ${s.border}`, color: s.muted,
                        fontSize: 12, cursor: 'pointer', textAlign: 'center',
                      }}>
                        + Adicionar da biblioteca
                      </div>
                    </div>

                    {/* Detalhe do alvo selecionado */}
                    <div>
                      {alvoSelecionado ? (
                        <>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 500, color: s.text }}>{alvoSelecionado.descricao}</div>
                              <div style={{ fontSize: 11, color: s.muted, marginTop: 2 }}>
                                {alvoSelecionado.area} · {alvoSelecionado.funcao} · {alvoSelecionado.operante}
                              </div>
                            </div>
                            <Badge
                              label={STATUS_ALVO[alvoSelecionado.status].label}
                              color={STATUS_ALVO[alvoSelecionado.status].color}
                              bg={`${STATUS_ALVO[alvoSelecionado.status].color}18`}
                            />
                          </div>

                          {/* Programas do alvo */}
                          {alvoSelecionado.programas.length > 0 ? (
                            <>
                              <div style={{ display: 'flex', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
                                {alvoSelecionado.programas.map(p => (
                                  <button
                                    key={p.id}
                                    onClick={() => setProgramaSelecionado(p)}
                                    style={{
                                      fontSize: 12, padding: '5px 13px', borderRadius: 20, cursor: 'pointer',
                                      border: `1px solid ${programaSelecionado?.id === p.id ? s.teal : s.border}`,
                                      background: programaSelecionado?.id === p.id ? 'rgba(29,158,117,0.12)' : 'transparent',
                                      color: programaSelecionado?.id === p.id ? s.teal : s.muted,
                                    }}
                                  >
                                    {p.nome}
                                  </button>
                                ))}
                                <button style={{
                                  fontSize: 12, padding: '5px 13px', borderRadius: 20, cursor: 'pointer',
                                  border: `1px dashed ${s.border}`, background: 'transparent', color: s.muted,
                                }}>
                                  + Novo programa
                                </button>
                              </div>

                              {programaSelecionado && <ProgramaPanel programa={programaSelecionado} />}
                            </>
                          ) : (
                            <div style={{
                              textAlign: 'center', padding: '32px 20px',
                              color: s.muted, fontSize: 13,
                              border: `1px dashed ${s.border}`, borderRadius: 10,
                            }}>
                              <div style={{ marginBottom: 10 }}>Nenhum programa de ensino vinculado a este alvo</div>
                              <button style={{
                                fontSize: 12, padding: '7px 16px', borderRadius: 7,
                                background: s.teal, border: 'none', color: '#fff', cursor: 'pointer',
                              }}>
                                + Criar programa de ensino
                              </button>
                            </div>
                          )}
                        </>
                      ) : (
                        <div style={{ color: s.muted, fontSize: 13, padding: 20 }}>
                          Selecione um comportamento-alvo para ver os programas
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ── Sub-aba: Protocolos de conduta ── */}
                {detalheAba === 'protocolos' && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                      <button style={{ fontSize: 12, padding: '7px 14px', borderRadius: 7, background: s.coral, border: 'none', color: '#fff', cursor: 'pointer', fontWeight: 500 }}>
                        + Adicionar protocolo
                      </button>
                    </div>
                    {planoSelecionado.protocolos.length > 0
                      ? planoSelecionado.protocolos.map(p => <ProtocoloPanel key={p.id} protocolo={p} />)
                      : (
                        <div style={{ textAlign: 'center', padding: '32px 20px', color: s.muted, fontSize: 13, border: `1px dashed ${s.border}`, borderRadius: 10 }}>
                          Nenhum protocolo de conduta cadastrado para este plano
                        </div>
                      )}
                  </div>
                )}

                {/* ── Sub-aba: Histórico ── */}
                {detalheAba === 'historico' && (
                  <div style={{ color: s.muted, fontSize: 13, textAlign: 'center', padding: 32 }}>
                    Histórico de revisões e alterações do plano — em breve
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* ── ABA: Biblioteca, Matrizes, Protocolos — placeholder ── */}
        {abaPage !== 'planos' && (
          <div style={{
            textAlign: 'center', padding: '60px 20px',
            color: s.muted, fontSize: 14,
            border: `1px dashed ${s.border}`, borderRadius: 12,
          }}>
            <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.3 }}>
              {abaPage === 'biblioteca' ? '◫' : abaPage === 'matrizes' ? '⊞' : '⊟'}
            </div>
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
