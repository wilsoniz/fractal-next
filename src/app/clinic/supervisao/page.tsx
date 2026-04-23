'use client'

import { useState } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = 'visao-geral' | 'casos' | 'supervisores' | 'historico'

interface SupervisorCard {
  id: string
  nome: string
  titulo: string
  especialidades: string[]
  rating: number
  sessoes_total: number
  disponivel: boolean
  preco_sessao: number
  avatar_inicial: string
  badge_cor: string
}

interface CasoEmSupervimento {
  id: string
  crianca_nome: string
  crianca_idade: number
  supervisor_nome: string
  proxima_sessao: string
  complexidade: 'alta' | 'muito-alta'
  status: 'ativo' | 'pendente'
  foco: string
  progresso: number
}

interface HistoricoSessao {
  id: string
  data: string
  supervisor_nome: string
  crianca_nome: string
  duracao: number
  tema: string
  nota: string
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const SUPERVISORES: SupervisorCard[] = [
  {
    id: '1',
    nome: 'Dra. Camila Torres',
    titulo: 'BCBA-D · Supervisora Sênior',
    especialidades: ['Comunicação', 'Comportamentos Desafiadores', 'TEA nível 2-3'],
    rating: 4.9,
    sessoes_total: 312,
    disponivel: true,
    preco_sessao: 180,
    avatar_inicial: 'CT',
    badge_cor: '#8B7FE8',
  },
  {
    id: '2',
    nome: 'Dr. André Lemos',
    titulo: 'BCBA · Supervisor Clínico',
    especialidades: ['Prontidão de Aprendiz', 'Equivalência de Estímulos', 'Habilidades Acadêmicas'],
    rating: 4.8,
    sessoes_total: 245,
    disponivel: true,
    preco_sessao: 160,
    avatar_inicial: 'AL',
    badge_cor: '#8B7FE8',
  },
  {
    id: '3',
    nome: 'Ma. Fernanda Souza',
    titulo: 'BCBA · Especialista em Generalização',
    especialidades: ['Generalização', 'Treino em Ambiente Natural', 'Regulação Emocional'],
    rating: 4.7,
    sessoes_total: 178,
    disponivel: false,
    preco_sessao: 150,
    avatar_inicial: 'FS',
    badge_cor: '#8B7FE8',
  },
]

const CASOS_ATIVOS: CasoEmSupervimento[] = [
  {
    id: '1',
    crianca_nome: 'Pedro H.',
    crianca_idade: 5,
    supervisor_nome: 'Dra. Camila Torres',
    proxima_sessao: '2026-04-25T14:00:00',
    complexidade: 'muito-alta',
    status: 'ativo',
    foco: 'Redução de comportamentos de fuga e aumento de tolerância à transição',
    progresso: 68,
  },
  {
    id: '2',
    crianca_nome: 'Isabela R.',
    crianca_idade: 7,
    supervisor_nome: 'Dr. André Lemos',
    proxima_sessao: '2026-04-28T10:00:00',
    complexidade: 'alta',
    status: 'pendente',
    foco: 'Estratégia de ensino para equivalência de estímulos — fase 3',
    progresso: 41,
  },
]

const HISTORICO: HistoricoSessao[] = [
  {
    id: '1',
    data: '2026-04-15',
    supervisor_nome: 'Dra. Camila Torres',
    crianca_nome: 'Pedro H.',
    duracao: 60,
    tema: 'Análise de dados — plateau em comunicação funcional',
    nota: 'Revisar critério de mastery. Introduzir variação de contexto.',
  },
  {
    id: '2',
    data: '2026-04-08',
    supervisor_nome: 'Dr. André Lemos',
    crianca_nome: 'Isabela R.',
    duracao: 45,
    tema: 'Planejamento do programa de equivalência — sessão 1',
    nota: 'Definir SDs para fase 2. Checar reforçadores funcionais.',
  },
  {
    id: '3',
    data: '2026-03-28',
    supervisor_nome: 'Dra. Camila Torres',
    crianca_nome: 'Pedro H.',
    duracao: 60,
    tema: 'Revisão de plano comportamental — comportamentos de fuga',
    nota: 'Implementar extinção com reforço diferencial de comportamento alternativo.',
  },
]

// ─── Sub-components ───────────────────────────────────────────────────────────

function MetricCard({
  label,
  value,
  sub,
  cor,
}: {
  label: string
  value: string | number
  sub?: string
  cor: string
}) {
  return (
    <div
      style={{
        background: 'rgba(13,32,53,.75)',
        border: '1px solid rgba(26,58,92,.5)',
        borderRadius: 12,
        padding: '20px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
      }}
    >
      <span style={{ fontSize: 12, color: 'rgba(255,255,255,.45)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        {label}
      </span>
      <span style={{ fontSize: 28, fontWeight: 700, color: cor, lineHeight: 1.1 }}>{value}</span>
      {sub && <span style={{ fontSize: 12, color: 'rgba(255,255,255,.35)' }}>{sub}</span>}
    </div>
  )
}

function StarRating({ rating }: { rating: number }) {
  return (
    <span style={{ color: '#EF9F27', fontSize: 13, fontWeight: 600 }}>
      {'★'.repeat(Math.floor(rating))}
      <span style={{ color: 'rgba(255,255,255,.2)' }}>{'★'.repeat(5 - Math.floor(rating))}</span>
      <span style={{ color: 'rgba(255,255,255,.5)', marginLeft: 6, fontSize: 12 }}>{rating.toFixed(1)}</span>
    </span>
  )
}

function BadgeComplexidade({ nivel }: { nivel: 'alta' | 'muito-alta' }) {
  const cor = nivel === 'muito-alta' ? '#E05A4B' : '#EF9F27'
  const label = nivel === 'muito-alta' ? 'Muito Alta' : 'Alta'
  return (
    <span
      style={{
        background: cor + '22',
        border: `1px solid ${cor}55`,
        borderRadius: 6,
        padding: '2px 10px',
        fontSize: 11,
        fontWeight: 600,
        color: cor,
        letterSpacing: '0.04em',
      }}
    >
      {label}
    </span>
  )
}

function VisaoGeralTab() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Engine Alert */}
      <div
        style={{
          background: 'rgba(139,127,232,.1)',
          border: '1px solid rgba(139,127,232,.35)',
          borderRadius: 12,
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 14,
        }}
      >
        <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(139,127,232,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8B7FE8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><path d="M12 8v4m0 4h.01" />
          </svg>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#8B7FE8', marginBottom: 4 }}>FractaEngine — Recomendação de Supervisão</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,.6)', lineHeight: 1.6 }}>
            O sistema identificou <strong style={{ color: 'rgba(255,255,255,.85)' }}>2 casos com necessidade de supervisão</strong> com base em previsibilidade baixa, progresso abaixo do esperado e complexidade clínica elevada.
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        <MetricCard label="Casos supervisionados" value={2} sub="ativos agora" cor="#1D9E75" />
        <MetricCard label="Sessões realizadas" value={12} sub="últimos 90 dias" cor="#378ADD" />
        <MetricCard label="Score clínico" value="88%" sub="+4% vs mês anterior" cor="#8B7FE8" />
        <MetricCard label="Próxima sessão" value="25/04" sub="Dra. Camila · 14h" cor="#EF9F27" />
      </div>

      {/* Casos precisando supervisão */}
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,.5)', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Casos monitorados pelo Engine
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {CASOS_ATIVOS.map((caso) => (
            <div
              key={caso.id}
              style={{
                background: 'rgba(13,32,53,.75)',
                border: '1px solid rgba(26,58,92,.5)',
                borderRadius: 12,
                padding: '18px 20px',
                display: 'flex',
                alignItems: 'center',
                gap: 16,
              }}
            >
              <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(29,158,117,.15)', border: '1px solid rgba(29,158,117,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1D9E75" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                </svg>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                  <span style={{ fontWeight: 600, color: 'rgba(255,255,255,.9)', fontSize: 14 }}>
                    {caso.crianca_nome}, {caso.crianca_idade} anos
                  </span>
                  <BadgeComplexidade nivel={caso.complexidade} />
                  <span style={{
                    background: caso.status === 'ativo' ? 'rgba(29,158,117,.15)' : 'rgba(239,159,39,.15)',
                    border: `1px solid ${caso.status === 'ativo' ? 'rgba(29,158,117,.35)' : 'rgba(239,159,39,.35)'}`,
                    borderRadius: 6,
                    padding: '2px 10px',
                    fontSize: 11,
                    fontWeight: 600,
                    color: caso.status === 'ativo' ? '#1D9E75' : '#EF9F27',
                  }}>
                    {caso.status === 'ativo' ? 'Ativo' : 'Pendente'}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,.45)', marginBottom: 8 }}>
                  Supervisor: {caso.supervisor_nome}
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,.6)', marginBottom: 10, lineHeight: 1.5 }}>
                  {caso.foco}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,.08)', borderRadius: 2 }}>
                    <div style={{ height: '100%', width: `${caso.progresso}%`, background: '#1D9E75', borderRadius: 2, transition: 'width 0.4s' }} />
                  </div>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,.4)', width: 36, textAlign: 'right' }}>{caso.progresso}%</span>
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,.35)', marginBottom: 4 }}>Próxima sessão</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#EF9F27' }}>
                  {new Date(caso.proxima_sessao).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,.45)' }}>
                  {new Date(caso.proxima_sessao).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function CasosTab() {
  const [selecionado, setSelecionado] = useState<string | null>(null)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,.5)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {CASOS_ATIVOS.length} casos em supervisão
        </div>
        <button
          style={{
            background: 'rgba(139,127,232,.15)',
            border: '1px solid rgba(139,127,232,.35)',
            borderRadius: 8,
            padding: '8px 16px',
            color: '#8B7FE8',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Adicionar caso
        </button>
      </div>

      {CASOS_ATIVOS.map((caso) => (
        <div
          key={caso.id}
          onClick={() => setSelecionado(selecionado === caso.id ? null : caso.id)}
          style={{
            background: selecionado === caso.id ? 'rgba(139,127,232,.08)' : 'rgba(13,32,53,.75)',
            border: `1px solid ${selecionado === caso.id ? 'rgba(139,127,232,.4)' : 'rgba(26,58,92,.5)'}`,
            borderRadius: 12,
            padding: '20px',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span style={{ fontWeight: 700, color: 'rgba(255,255,255,.9)', fontSize: 15 }}>
                  {caso.crianca_nome}, {caso.crianca_idade} anos
                </span>
                <BadgeComplexidade nivel={caso.complexidade} />
              </div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,.5)', marginBottom: 10 }}>
                {caso.supervisor_nome} · Próxima sessão: {new Date(caso.proxima_sessao).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,.65)', lineHeight: 1.6 }}>{caso.foco}</div>
            </div>
            <svg
              width="16" height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="rgba(255,255,255,.3)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ transform: selecionado === caso.id ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', flexShrink: 0, marginLeft: 12 }}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>

          {selecionado === caso.id && (
            <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,.06)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,.35)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Progresso do caso</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ flex: 1, height: 6, background: 'rgba(255,255,255,.08)', borderRadius: 3 }}>
                      <div style={{ height: '100%', width: `${caso.progresso}%`, background: 'linear-gradient(90deg, #1D9E75, #23c48f)', borderRadius: 3 }} />
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#1D9E75' }}>{caso.progresso}%</span>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,.35)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Score de Necessidade</div>
                  <span style={{ fontSize: 22, fontWeight: 700, color: caso.complexidade === 'muito-alta' ? '#E05A4B' : '#EF9F27' }}>
                    {caso.complexidade === 'muito-alta' ? '9.2' : '7.1'}
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,.3)', fontWeight: 400 }}>/10</span>
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button style={{ flex: 1, background: 'rgba(139,127,232,.15)', border: '1px solid rgba(139,127,232,.35)', borderRadius: 8, padding: '10px', color: '#8B7FE8', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  Agendar sessão
                </button>
                <button style={{ flex: 1, background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 8, padding: '10px', color: 'rgba(255,255,255,.6)', fontSize: 13, cursor: 'pointer' }}>
                  Ver histórico
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function SupervisoresTab() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,.5)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
        Supervisores disponíveis na plataforma
      </div>
      {SUPERVISORES.map((sup) => (
        <div
          key={sup.id}
          style={{
            background: 'rgba(13,32,53,.75)',
            border: '1px solid rgba(26,58,92,.5)',
            borderRadius: 12,
            padding: '20px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
            {/* Avatar */}
            <div style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: `rgba(139,127,232,.2)`,
              border: `1px solid rgba(139,127,232,.35)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 15,
              fontWeight: 700,
              color: sup.badge_cor,
              flexShrink: 0,
            }}>
              {sup.avatar_inicial}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <span style={{ fontWeight: 700, color: 'rgba(255,255,255,.9)', fontSize: 15 }}>{sup.nome}</span>
                <span style={{
                  background: sup.disponivel ? 'rgba(29,158,117,.15)' : 'rgba(255,255,255,.06)',
                  border: `1px solid ${sup.disponivel ? 'rgba(29,158,117,.35)' : 'rgba(255,255,255,.12)'}`,
                  borderRadius: 6,
                  padding: '2px 8px',
                  fontSize: 11,
                  fontWeight: 600,
                  color: sup.disponivel ? '#1D9E75' : 'rgba(255,255,255,.3)',
                }}>
                  {sup.disponivel ? 'Disponível' : 'Indisponível'}
                </span>
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,.45)', marginBottom: 8 }}>{sup.titulo}</div>
              <StarRating rating={sup.rating} />
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,.35)', marginTop: 2 }}>
                {sup.sessoes_total} sessões realizadas
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
                {sup.especialidades.map((esp) => (
                  <span key={esp} style={{
                    background: 'rgba(255,255,255,.05)',
                    border: '1px solid rgba(255,255,255,.1)',
                    borderRadius: 6,
                    padding: '3px 10px',
                    fontSize: 11,
                    color: 'rgba(255,255,255,.5)',
                  }}>
                    {esp}
                  </span>
                ))}
              </div>
            </div>

            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,.35)', marginBottom: 4 }}>por sessão</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: 'rgba(255,255,255,.9)' }}>
                R$ {sup.preco_sessao}
              </div>
              <button
                disabled={!sup.disponivel}
                style={{
                  marginTop: 10,
                  background: sup.disponivel ? 'rgba(139,127,232,.2)' : 'rgba(255,255,255,.04)',
                  border: `1px solid ${sup.disponivel ? 'rgba(139,127,232,.45)' : 'rgba(255,255,255,.08)'}`,
                  borderRadius: 8,
                  padding: '8px 16px',
                  color: sup.disponivel ? '#8B7FE8' : 'rgba(255,255,255,.2)',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: sup.disponivel ? 'pointer' : 'not-allowed',
                  whiteSpace: 'nowrap',
                }}
              >
                {sup.disponivel ? 'Solicitar sessão' : 'Indisponível'}
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function HistoricoTab() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,.5)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
        {HISTORICO.length} sessões registradas
      </div>
      {HISTORICO.map((sessao) => (
        <div
          key={sessao.id}
          style={{
            background: 'rgba(13,32,53,.75)',
            border: '1px solid rgba(26,58,92,.5)',
            borderRadius: 12,
            padding: '18px 20px',
            display: 'flex',
            gap: 16,
            alignItems: 'flex-start',
          }}
        >
          {/* Timeline dot */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 2 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#8B7FE8', flexShrink: 0 }} />
            <div style={{ width: 1, flex: 1, background: 'rgba(139,127,232,.2)', marginTop: 6 }} />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, color: 'rgba(255,255,255,.9)', marginBottom: 2 }}>
                  {sessao.crianca_nome} · {sessao.supervisor_nome}
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,.4)' }}>
                  {new Date(sessao.data).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })} · {sessao.duracao} min
                </div>
              </div>
            </div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,.7)', fontWeight: 500, marginBottom: 8 }}>
              {sessao.tema}
            </div>
            <div style={{
              background: 'rgba(255,255,255,.04)',
              border: '1px solid rgba(255,255,255,.07)',
              borderRadius: 8,
              padding: '10px 14px',
              fontSize: 12,
              color: 'rgba(255,255,255,.5)',
              lineHeight: 1.6,
            }}>
              <span style={{ color: 'rgba(139,127,232,.8)', fontWeight: 600 }}>Encaminhamentos: </span>
              {sessao.nota}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SupervisaoPage() {
  const [tab, setTab] = useState<Tab>('visao-geral')

  const tabs: { id: Tab; label: string }[] = [
    { id: 'visao-geral', label: 'Visão Geral' },
    { id: 'casos', label: 'Casos' },
    { id: 'supervisores', label: 'Supervisores' },
    { id: 'historico', label: 'Histórico' },
  ]

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#07111f',
        color: 'rgba(255,255,255,.85)',
        fontFamily: 'var(--font-sans, system-ui)',
        padding: '32px',
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 8 }}>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: 'rgba(139,127,232,.2)',
            border: '1px solid rgba(139,127,232,.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8B7FE8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: 'rgba(255,255,255,.95)' }}>
              Supervisão
            </h1>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,.4)', margin: 0 }}>
              Suporte clínico especializado para seus casos
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 28, background: 'rgba(255,255,255,.04)', borderRadius: 10, padding: 4 }}>
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              flex: 1,
              padding: '9px 0',
              background: tab === t.id ? 'rgba(139,127,232,.2)' : 'transparent',
              border: tab === t.id ? '1px solid rgba(139,127,232,.35)' : '1px solid transparent',
              borderRadius: 8,
              color: tab === t.id ? '#8B7FE8' : 'rgba(255,255,255,.4)',
              fontSize: 13,
              fontWeight: tab === t.id ? 600 : 400,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {tab === 'visao-geral' && <VisaoGeralTab />}
      {tab === 'casos' && <CasosTab />}
      {tab === 'supervisores' && <SupervisoresTab />}
      {tab === 'historico' && <HistoricoTab />}
    </div>
  )
}
