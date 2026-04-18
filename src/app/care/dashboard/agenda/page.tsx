'use client'

/**
 * Aba: Agenda
 * src/app/care/dashboard/agenda/page.tsx
 *
 * Visualização: lista cronológica + calendário semanal
 * 3 tipos de eventos:
 *   - sessao_clinica: vinda do FractaClinic
 *   - atividade: programas ativos da criança
 *   - compromisso_externo: adicionado manualmente pelos pais
 */

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useCareContext } from '../layout'

// ─────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────

type TipoEvento = 'sessao_clinica' | 'atividade' | 'compromisso_externo'
type StatusEvento = 'agendado' | 'realizado' | 'cancelado'

type Evento = {
  id: string
  tipo: TipoEvento
  titulo: string
  descricao: string | null
  data_hora: string
  duracao_minutos: number
  status: StatusEvento
  origem: string
  criado_em: string
}

type NovoEvento = {
  titulo: string
  tipo: TipoEvento
  data: string
  hora: string
  duracao_minutos: string
  descricao: string
}

// ─────────────────────────────────────────────
// CONFIGURAÇÃO VISUAL POR TIPO
// ─────────────────────────────────────────────

const TIPO_CONFIG: Record<TipoEvento, {
  label: string
  cor: string
  bg: string
  icon: React.ReactNode
}> = {
  sessao_clinica: {
    label: 'Sessão clínica',
    cor: '#8B5CF6',
    bg: 'rgba(139,92,246,.1)',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
  },
  atividade: {
    label: 'Atividade',
    cor: '#2BBFA4',
    bg: 'rgba(43,191,164,.1)',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M9 11l3 3L22 4"/>
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
      </svg>
    ),
  },
  compromisso_externo: {
    label: 'Compromisso',
    cor: '#2A7BA8',
    bg: 'rgba(42,123,168,.1)',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
        <line x1="16" y1="2" x2="16" y2="6"/>
        <line x1="8" y1="2" x2="8" y2="6"/>
        <line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
    ),
  },
}

const STATUS_CONFIG: Record<StatusEvento, { label: string; cor: string; bg: string }> = {
  agendado:  { label: 'Agendado',  cor: '#2A7BA8', bg: 'rgba(42,123,168,.1)'  },
  realizado: { label: 'Realizado', cor: '#2BBFA4', bg: 'rgba(43,191,164,.1)'  },
  cancelado: { label: 'Cancelado', cor: '#94a3b8', bg: 'rgba(148,163,184,.1)' },
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

function formatarData(dataStr: string): string {
  const data = new Date(dataStr)
  const hoje = new Date()
  const amanha = new Date()
  amanha.setDate(amanha.getDate() + 1)

  if (data.toDateString() === hoje.toDateString()) return 'Hoje'
  if (data.toDateString() === amanha.toDateString()) return 'Amanhã'

  return data.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })
}

function formatarHora(dataStr: string): string {
  return new Date(dataStr).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function getInicioSemana(data: Date): Date {
  const d = new Date(data)
  const dia = d.getDay()
  const diff = d.getDate() - dia + (dia === 0 ? -6 : 1)
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function getDiasSemana(inicioSemana: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(inicioSemana)
    d.setDate(d.getDate() + i)
    return d
  })
}

// ─────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────

export default function AgendaPage() {
  const { criancaAtiva } = useCareContext()

  const [eventos, setEventos] = useState<Evento[]>([])
  const [loading, setLoading] = useState(true)
  const [visualizacao, setVisualizacao] = useState<'lista' | 'semana'>('lista')
  const [semanaAtual, setSemanaAtual] = useState(getInicioSemana(new Date()))
  const [mostrarForm, setMostrarForm] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [filtroTipo, setFiltroTipo] = useState<TipoEvento | 'todos'>('todos')
  const [novoEvento, setNovoEvento] = useState<NovoEvento>({
    titulo: '',
    tipo: 'compromisso_externo',
    data: new Date().toISOString().split('T')[0],
    hora: '09:00',
    duracao_minutos: '60',
    descricao: '',
  })

  useEffect(() => {
    if (!criancaAtiva) return
    carregarEventos()
  }, [criancaAtiva])

  async function carregarEventos() {
    setLoading(true)

    // Buscar próximos 60 dias de eventos
    const inicio = new Date()
    inicio.setDate(inicio.getDate() - 7) // inclui última semana
    const fim = new Date()
    fim.setDate(fim.getDate() + 60)

    const { data } = await supabase
      .from('agenda_eventos')
      .select('*')
      .eq('crianca_id', criancaAtiva!.id)
      .gte('data_hora', inicio.toISOString())
      .lte('data_hora', fim.toISOString())
      .order('data_hora', { ascending: true })

    // Gerar eventos de atividade dos planos ativos
    const { data: planos } = await supabase
      .from('planos')
      .select('id, programas(nome, dominio)')
      .eq('crianca_id', criancaAtiva!.id)
      .eq('status', 'ativo')

    const eventosAtividade: Evento[] = []
    if (planos && planos.length > 0) {
      // Gerar sugestão para hoje e próximos 6 dias
      for (let i = 0; i < 7; i++) {
        const dia = new Date()
        dia.setDate(dia.getDate() + i)
        dia.setHours(9, 0, 0, 0)

        for (const plano of planos.slice(0, 2)) {
          const prog = plano.programas as any
          if (!prog) continue
          eventosAtividade.push({
            id: `atividade-${plano.id}-${i}`,
            tipo: 'atividade',
            titulo: prog.nome,
            descricao: `Domínio: ${prog.dominio}`,
            data_hora: dia.toISOString(),
            duracao_minutos: 15,
            status: 'agendado',
            origem: 'engine',
            criado_em: new Date().toISOString(),
          })
        }
      }
    }

    // Placeholder sessão clínica
    const eventoClinic: Evento[] = [{
      id: 'clinic-placeholder',
      tipo: 'sessao_clinica',
      titulo: 'Sessão com terapeuta',
      descricao: 'Conecte-se ao FractaClinic para agendar sessões',
      data_hora: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      duracao_minutos: 60,
      status: 'agendado',
      origem: 'clinic',
      criado_em: new Date().toISOString(),
    }]

    const todosEventos = [
      ...(data ?? []),
      ...eventosAtividade,
      ...eventoClinic,
    ].sort((a, b) => new Date(a.data_hora).getTime() - new Date(b.data_hora).getTime())

    setEventos(todosEventos)
    setLoading(false)
  }

  async function salvarEvento() {
    if (!criancaAtiva || !novoEvento.titulo || !novoEvento.data) return
    setSalvando(true)

    const { data: { user } } = await supabase.auth.getUser()
    const dataHora = new Date(`${novoEvento.data}T${novoEvento.hora}:00`)

    await supabase.from('agenda_eventos').insert({
      crianca_id: criancaAtiva.id,
      responsavel_id: user?.id,
      tipo: novoEvento.tipo,
      titulo: novoEvento.titulo,
      descricao: novoEvento.descricao || null,
      data_hora: dataHora.toISOString(),
      duracao_minutos: parseInt(novoEvento.duracao_minutos) || 60,
      status: 'agendado',
      origem: 'manual',
    })

    await carregarEventos()
    setMostrarForm(false)
    setNovoEvento({
      titulo: '', tipo: 'compromisso_externo',
      data: new Date().toISOString().split('T')[0],
      hora: '09:00', duracao_minutos: '60', descricao: '',
    })
    setSalvando(false)
  }

  async function marcarRealizado(id: string) {
    await supabase
      .from('agenda_eventos')
      .update({ status: 'realizado' })
      .eq('id', id)
    await carregarEventos()
  }

  const nomeFilho = criancaAtiva?.nome.split(' ')[0] ?? '—'
  const diasSemana = getDiasSemana(semanaAtual)
  const hoje = new Date()

  const eventosFiltrados = filtroTipo === 'todos'
    ? eventos
    : eventos.filter(e => e.tipo === filtroTipo)

  // Agrupar por data para a lista
  const eventosPorData: Record<string, Evento[]> = {}
  for (const ev of eventosFiltrados) {
    const chave = new Date(ev.data_hora).toDateString()
    if (!eventosPorData[chave]) eventosPorData[chave] = []
    eventosPorData[chave].push(ev)
  }

  const card: React.CSSProperties = {
    background: 'rgba(255,255,255,.84)',
    backdropFilter: 'blur(14px)',
    borderRadius: 22,
    border: '1px solid rgba(43,191,164,.18)',
    boxShadow: '0 4px 28px rgba(43,191,164,.06)',
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
        <p style={{ color: '#8a9ab8', fontSize: 14 }}>Carregando agenda...</p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── HEADER */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: '.78rem', color: '#8a9ab8', marginBottom: 3 }}>Agenda de</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1E3A5F', letterSpacing: '-.02em' }}>{nomeFilho}</div>
        </div>
        <button
          onClick={() => setMostrarForm(true)}
          style={{
            padding: '11px 22px', borderRadius: 50, border: 'none',
            background: 'linear-gradient(135deg,#2BBFA4,#7AE040)',
            color: 'white', fontWeight: 700, fontSize: '.85rem',
            cursor: 'pointer', boxShadow: '0 4px 16px rgba(43,191,164,.35)',
          }}
        >
          + Novo compromisso
        </button>
      </div>

      {/* ── CONTROLES */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        {/* Filtro por tipo */}
        <div style={{ display: 'flex', gap: 6 }}>
          {(['todos', 'atividade', 'compromisso_externo', 'sessao_clinica'] as const).map(tipo => {
            const config = tipo !== 'todos' ? TIPO_CONFIG[tipo] : null
            const ativo = filtroTipo === tipo
            return (
              <button
                key={tipo}
                onClick={() => setFiltroTipo(tipo)}
                style={{
                  padding: '6px 12px', borderRadius: 99,
                  background: ativo
                    ? (config ? config.cor : '#1E3A5F')
                    : 'rgba(255,255,255,.7)',
                  color: ativo ? 'white' : '#64748b',
                  fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  boxShadow: ativo ? '0 2px 8px rgba(0,0,0,.1)' : 'none',
                  border: ativo ? 'none' : '1px solid rgba(0,0,0,.08)',
                  transition: 'all 0.15s',
                }}
              >
                {tipo === 'todos' ? 'Todos' : config?.label}
              </button>
            )
          })}
        </div>

        {/* Toggle visualização */}
        <div style={{
          display: 'flex', background: 'rgba(255,255,255,.7)',
          borderRadius: 10, padding: 3, gap: 2,
          border: '1px solid rgba(0,0,0,.08)',
        }}>
          {(['lista', 'semana'] as const).map(v => (
            <button
              key={v}
              onClick={() => setVisualizacao(v)}
              style={{
                padding: '6px 14px', borderRadius: 8, border: 'none',
                background: visualizacao === v ? 'white' : 'transparent',
                color: visualizacao === v ? '#1E3A5F' : '#94a3b8',
                fontSize: 12, fontWeight: 600, cursor: 'pointer',
                boxShadow: visualizacao === v ? '0 1px 4px rgba(0,0,0,.08)' : 'none',
                transition: 'all 0.15s',
              }}
            >
              {v === 'lista' ? '≡ Lista' : '⊞ Semana'}
            </button>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════
          VISUALIZAÇÃO: CALENDÁRIO SEMANAL
      ══════════════════════════════════════ */}
      {visualizacao === 'semana' && (
        <div style={card}>
          {/* Navegação da semana */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '16px 20px', borderBottom: '1px solid rgba(43,191,164,.1)',
          }}>
            <button
              onClick={() => {
                const anterior = new Date(semanaAtual)
                anterior.setDate(anterior.getDate() - 7)
                setSemanaAtual(anterior)
              }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 4 }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 18l-6-6 6-6"/>
              </svg>
            </button>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#1E3A5F' }}>
              {semanaAtual.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })} —{' '}
              {diasSemana[6].toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
            </span>
            <button
              onClick={() => {
                const proxima = new Date(semanaAtual)
                proxima.setDate(proxima.getDate() + 7)
                setSemanaAtual(proxima)
              }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 4 }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 18l6-6-6-6"/>
              </svg>
            </button>
          </div>

          {/* Grid dos dias */}
          <div style={{ overflowX: 'auto', padding: '12px 16px 20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(80px, 1fr))', gap: 8, minWidth: 560 }}>
            </div>
            {diasSemana.map((dia, i) => {
              const ehHoje = dia.toDateString() === hoje.toDateString()
              const eventsDia = eventosFiltrados.filter(e =>
                new Date(e.data_hora).toDateString() === dia.toDateString()
              )
              const nomes = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

              return (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  {/* Header do dia */}
                  <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>{nomes[i]}</div>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: ehHoje ? 'linear-gradient(135deg,#2BBFA4,#7AE040)' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, fontWeight: ehHoje ? 800 : 500,
                    color: ehHoje ? 'white' : '#1E3A5F',
                  }}>
                    {dia.getDate()}
                  </div>

                  {/* Eventos do dia */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3, width: '100%' }}>
                    {eventsDia.slice(0, 3).map(ev => {
                      const config = TIPO_CONFIG[ev.tipo]
                      return (
                        <div
                          key={ev.id}
                          style={{
                            padding: '3px 5px', borderRadius: 6,
                            background: config.bg,
                            fontSize: 9, fontWeight: 600,
                            color: config.cor,
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}
                          title={ev.titulo}
                        >
                          {formatarHora(ev.data_hora)} {ev.titulo}
                        </div>
                      )
                    })}
                    {eventsDia.length > 3 && (
                      <div style={{ fontSize: 9, color: '#94a3b8', textAlign: 'center' }}>
                        +{eventsDia.length - 3}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════
          VISUALIZAÇÃO: LISTA CRONOLÓGICA
      ══════════════════════════════════════ */}
      {visualizacao === 'lista' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {Object.keys(eventosPorData).length === 0 ? (
            <div style={{ ...card, padding: 32, textAlign: 'center' }}>
              <p style={{ color: '#8a9ab8', fontSize: 14, marginBottom: 16 }}>
                Nenhum evento nos próximos dias.
              </p>
              <button
                onClick={() => setMostrarForm(true)}
                style={{
                  padding: '10px 24px', borderRadius: 50,
                  border: '1.5px solid rgba(43,191,164,.4)',
                  background: 'rgba(255,255,255,.7)',
                  color: '#2BBFA4', fontWeight: 700, fontSize: 14, cursor: 'pointer',
                }}
              >
                Adicionar compromisso
              </button>
            </div>
          ) : (
            Object.entries(eventosPorData).map(([dataStr, evsDia]) => {
              const data = new Date(dataStr)
              const ehPassado = data < new Date(hoje.setHours(0,0,0,0))

              return (
                <div key={dataStr} style={{ marginBottom: 16 }}>
                  {/* Header da data */}
                  <div style={{
                    fontSize: 12, fontWeight: 700, color: ehPassado ? '#94a3b8' : '#1E3A5F',
                    marginBottom: 8, paddingLeft: 4,
                    display: 'flex', alignItems: 'center', gap: 8,
                  }}>
                    {formatarData(new Date(evsDia[0].data_hora).toISOString())}
                    <div style={{ flex: 1, height: 1, background: 'rgba(43,191,164,.1)' }} />
                  </div>

                  {/* Eventos do dia */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {evsDia.map(ev => {
                      const config = TIPO_CONFIG[ev.tipo]
                      const statusCfg = STATUS_CONFIG[ev.status]
                      const isPlaceholder = ev.id.startsWith('atividade-') || ev.id === 'clinic-placeholder'

                      return (
                        <div
                          key={ev.id}
                          style={{
                            ...card,
                            padding: '14px 18px',
                            display: 'flex', alignItems: 'center', gap: 14,
                            opacity: ev.status === 'cancelado' ? 0.5 : 1,
                            borderLeft: `3px solid ${config.cor}`,
                          }}
                        >
                          {/* Ícone do tipo */}
                          <div style={{
                            width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                            background: config.bg,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: config.cor,
                          }}>
                            {config.icon}
                          </div>

                          {/* Conteúdo */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3, flexWrap: 'wrap' }}>
                              <span style={{ fontSize: 14, fontWeight: 700, color: '#1E3A5F' }}>
                                {ev.titulo}
                              </span>
                              {isPlaceholder && (
                                <span style={{
                                  fontSize: 9, fontWeight: 700, padding: '2px 6px',
                                  borderRadius: 99, background: 'rgba(148,163,184,.15)',
                                  color: '#94a3b8',
                                }}>
                                  Sugestão
                                </span>
                              )}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                              <span style={{ fontSize: 12, color: '#64748b' }}>
                                {formatarHora(ev.data_hora)} · {ev.duracao_minutos} min
                              </span>
                              <span style={{
                                fontSize: 10, fontWeight: 700, padding: '2px 7px',
                                borderRadius: 99, background: statusCfg.bg, color: statusCfg.cor,
                              }}>
                                {statusCfg.label}
                              </span>
                              <span style={{
                                fontSize: 10, fontWeight: 600, padding: '2px 7px',
                                borderRadius: 99, background: config.bg, color: config.cor,
                              }}>
                                {config.label}
                              </span>
                            </div>
                            {ev.descricao && (
                              <div style={{ fontSize: 12, color: '#8a9ab8', marginTop: 3 }}>
                                {ev.descricao}
                              </div>
                            )}
                          </div>

                          {/* Ação */}
                          {!isPlaceholder && ev.status === 'agendado' && (
                            <button
                              onClick={() => marcarRealizado(ev.id)}
                              style={{
                                padding: '6px 10px', borderRadius: 8, border: 'none',
                                background: 'rgba(43,191,164,.1)', color: '#2BBFA4',
                                fontSize: 11, fontWeight: 700, cursor: 'pointer', flexShrink: 0,
                              }}
                            >
                              ✓
                            </button>
                          )}
                          {ev.status === 'realizado' && (
                            <div style={{ color: '#2BBFA4', fontSize: 18, flexShrink: 0 }}>✓</div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* ══════════════════════════════════════
          MODAL: NOVO COMPROMISSO
      ══════════════════════════════════════ */}
      {mostrarForm && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: 'rgba(0,0,0,.4)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'flex-end',
        }}
          onClick={(e) => { if (e.target === e.currentTarget) setMostrarForm(false) }}
        >
          <div style={{
            width: '100%', maxWidth: 560, margin: '0 auto',
            background: 'white', borderRadius: '24px 24px 0 0',
            padding: '24px 24px 40px',
            maxHeight: '90vh', overflowY: 'auto',
          }}>
            {/* Handle */}
            <div style={{ width: 36, height: 4, background: '#e2e8f0', borderRadius: 99, margin: '0 auto 20px' }} />

            <div style={{ fontSize: 18, fontWeight: 800, color: '#1E3A5F', marginBottom: 20 }}>
              Novo compromisso
            </div>

            {/* Tipo */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 8 }}>
                Tipo
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                {(['compromisso_externo', 'atividade'] as TipoEvento[]).map(tipo => {
                  const config = TIPO_CONFIG[tipo]
                  const ativo = novoEvento.tipo === tipo
                  return (
                    <button
                      key={tipo}
                      onClick={() => setNovoEvento(prev => ({ ...prev, tipo }))}
                      style={{
                        flex: 1, padding: '10px 8px', borderRadius: 12,
                        border: `1.5px solid ${ativo ? config.cor : 'rgba(0,0,0,.1)'}`,
                        background: ativo ? config.bg : 'transparent',
                        color: ativo ? config.cor : '#64748b',
                        fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      }}
                    >
                      {config.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Campos */}
            {[
              { key: 'titulo', label: 'Título', placeholder: 'ex: Consulta neuropediatra', type: 'text' },
              { key: 'data', label: 'Data', placeholder: '', type: 'date' },
              { key: 'hora', label: 'Hora', placeholder: '', type: 'time' },
              { key: 'duracao_minutos', label: 'Duração (minutos)', placeholder: 'ex: 60', type: 'number' },
            ].map(campo => (
              <div key={campo.key} style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 5 }}>
                  {campo.label}
                </label>
                <input
                  type={campo.type}
                  value={novoEvento[campo.key as keyof NovoEvento]}
                  onChange={e => setNovoEvento(prev => ({ ...prev, [campo.key]: e.target.value }))}
                  placeholder={campo.placeholder}
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: 10,
                    border: '1.5px solid rgba(0,0,0,.1)', fontSize: 14,
                    fontFamily: 'var(--font-sans)', boxSizing: 'border-box',
                    background: 'rgba(255,255,255,.9)',
                  }}
                />
              </div>
            ))}

            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 5 }}>
                Observação (opcional)
              </label>
              <textarea
                value={novoEvento.descricao}
                onChange={e => setNovoEvento(prev => ({ ...prev, descricao: e.target.value }))}
                placeholder="ex: Dr. João Silva — CRM 12345"
                rows={2}
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: 10,
                  border: '1.5px solid rgba(0,0,0,.1)', fontSize: 14,
                  fontFamily: 'var(--font-sans)', resize: 'vertical', boxSizing: 'border-box',
                  background: 'rgba(255,255,255,.9)',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setMostrarForm(false)}
                style={{
                  flex: 1, padding: '13px', borderRadius: 14,
                  border: '1.5px solid rgba(0,0,0,.1)', background: 'transparent',
                  color: '#64748b', fontSize: 14, cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
              <button
                onClick={salvarEvento}
                disabled={!novoEvento.titulo || salvando}
                style={{
                  flex: 2, padding: '13px', borderRadius: 14, border: 'none',
                  background: novoEvento.titulo
                    ? 'linear-gradient(135deg,#2BBFA4,#7AE040)'
                    : '#e2e8f0',
                  color: novoEvento.titulo ? 'white' : '#94a3b8',
                  fontSize: 14, fontWeight: 700, cursor: novoEvento.titulo ? 'pointer' : 'not-allowed',
                  boxShadow: novoEvento.titulo ? '0 4px 16px rgba(43,191,164,.3)' : 'none',
                }}
              >
                {salvando ? 'Salvando...' : 'Salvar compromisso'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
