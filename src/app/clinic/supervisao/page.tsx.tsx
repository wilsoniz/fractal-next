'use client'
import { useState, useEffect } from 'react'
import { useClinicContext } from '../layout'

// ─── Types ────────────────────────────────────────────────────────────────────
type Tab = 'visao-geral' | 'casos' | 'supervisores' | 'historico' | 'inbox'

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
  proxima_sessao: string | null
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

// ─── Sub-components ───────────────────────────────────────────────────────────
function MetricCard({ label, value, sub, cor }: { label: string; value: string | number; sub?: string; cor: string }) {
  return (
    <div style={{ background: 'rgba(13,32,53,.75)', border: '1px solid rgba(26,58,92,.5)', borderRadius: 12, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: 12, color: 'rgba(255,255,255,.45)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</span>
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
    <span style={{ background: cor + '22', border: `1px solid ${cor}55`, borderRadius: 6, padding: '2px 10px', fontSize: 11, fontWeight: 600, color: cor, letterSpacing: '0.04em' }}>
      {label}
    </span>
  )
}

// ─── Visão Geral Tab (agora com dados reais) ──────────────────────────────────
function VisaoGeralTab({ casos, loading }: { casos: CasoEmSupervimento[]; loading: boolean }) {
  const casosAtivos    = casos.filter(c => c.status === 'ativo').length
  const totalSessoes   = 0  // será alimentado quando tivermos tabela de sessões de supervisão
  const proximosCasos  = [...casos].sort((a, b) => {
    if (!a.proxima_sessao) return 1
    if (!b.proxima_sessao) return -1
    return new Date(a.proxima_sessao).getTime() - new Date(b.proxima_sessao).getTime()
  })
  const proximo = proximosCasos[0]

  if (loading) return (
    <div style={{ color: 'rgba(255,255,255,.3)', fontSize: 13, padding: 20 }}>Carregando...</div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {casos.length > 0 && (
        <div style={{ background: 'rgba(139,127,232,.1)', border: '1px solid rgba(139,127,232,.35)', borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(139,127,232,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8B7FE8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><path d="M12 8v4m0 4h.01" />
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#8B7FE8', marginBottom: 4 }}>FractaEngine — Recomendação de Supervisão</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,.6)', lineHeight: 1.6 }}>
              O sistema identificou <strong style={{ color: 'rgba(255,255,255,.85)' }}>{casos.length} {casos.length === 1 ? 'caso com necessidade' : 'casos com necessidade'} de supervisão</strong> com base em previsibilidade baixa, progresso abaixo do esperado e complexidade clínica elevada.
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        <MetricCard label="Casos supervisionados" value={casosAtivos}   sub="ativos agora"         cor="#1D9E75" />
        <MetricCard label="Sessões realizadas"     value={totalSessoes} sub="últimos 90 dias"      cor="#378ADD" />
        <MetricCard label="Em supervisão"          value={casos.length} sub="total na plataforma"  cor="#8B7FE8" />
        <MetricCard
          label="Próximo caso"
          value={proximo ? new Date(proximo.proxima_sessao!).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) : '—'}
          sub={proximo ? proximo.supervisor_nome : 'Sem agendamentos'}
          cor="#EF9F27"
        />
      </div>

      {casos.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 20px', color: 'rgba(255,255,255,.3)', fontSize: 13, border: '1px dashed rgba(26,58,92,.5)', borderRadius: 12 }}>
          Nenhum caso em supervisão. Use a aba Supervisores para solicitar supervisão.
        </div>
      ) : (
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,.5)', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Casos monitorados pelo Engine
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {casos.map((caso) => (
              <div key={caso.id} style={{ background: 'rgba(13,32,53,.75)', border: '1px solid rgba(26,58,92,.5)', borderRadius: 12, padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(29,158,117,.15)', border: '1px solid rgba(29,158,117,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1D9E75" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                  </svg>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                    <span style={{ fontWeight: 600, color: 'rgba(255,255,255,.9)', fontSize: 14 }}>
                      {caso.crianca_nome}{caso.crianca_idade > 0 ? `, ${caso.crianca_idade} anos` : ''}
                    </span>
                    <BadgeComplexidade nivel={caso.complexidade} />
                    <span style={{
                      background: caso.status === 'ativo' ? 'rgba(29,158,117,.15)' : 'rgba(239,159,39,.15)',
                      border: `1px solid ${caso.status === 'ativo' ? 'rgba(29,158,117,.35)' : 'rgba(239,159,39,.35)'}`,
                      borderRadius: 6, padding: '2px 10px', fontSize: 11, fontWeight: 600,
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
                  {caso.progresso > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,.08)', borderRadius: 2 }}>
                        <div style={{ height: '100%', width: `${caso.progresso}%`, background: '#1D9E75', borderRadius: 2 }} />
                      </div>
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,.4)', width: 36, textAlign: 'right' }}>{caso.progresso}%</span>
                    </div>
                  )}
                </div>
                {caso.proxima_sessao && (
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,.35)', marginBottom: 4 }}>Próxima sessão</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#EF9F27' }}>
                      {new Date(caso.proxima_sessao).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                    </div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,.45)' }}>
                      {new Date(caso.proxima_sessao).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Casos Tab (agora com dados reais) ───────────────────────────────────────
function CasosTab({ casos, loading }: { casos: CasoEmSupervimento[]; loading: boolean }) {
  const [selecionado, setSelecionado] = useState<string | null>(null)

  if (loading) return (
    <div style={{ color: 'rgba(255,255,255,.3)', fontSize: 13, padding: 20 }}>Carregando casos...</div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,.5)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {casos.length} {casos.length === 1 ? 'caso' : 'casos'} em supervisão
        </div>
      </div>

      {casos.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 20px', color: 'rgba(255,255,255,.3)', fontSize: 13, border: '1px dashed rgba(26,58,92,.5)', borderRadius: 12 }}>
          Nenhum caso em supervisão ativo.
        </div>
      ) : casos.map((caso) => (
        <div
          key={caso.id}
          onClick={() => setSelecionado(selecionado === caso.id ? null : caso.id)}
          style={{
            background: selecionado === caso.id ? 'rgba(139,127,232,.08)' : 'rgba(13,32,53,.75)',
            border: `1px solid ${selecionado === caso.id ? 'rgba(139,127,232,.4)' : 'rgba(26,58,92,.5)'}`,
            borderRadius: 12, padding: '20px', cursor: 'pointer', transition: 'all 0.2s',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span style={{ fontWeight: 700, color: 'rgba(255,255,255,.9)', fontSize: 15 }}>
                  {caso.crianca_nome}{caso.crianca_idade > 0 ? `, ${caso.crianca_idade} anos` : ''}
                </span>
                <BadgeComplexidade nivel={caso.complexidade} />
              </div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,.5)', marginBottom: 10 }}>
                {caso.supervisor_nome}
                {caso.proxima_sessao && (
                  <> · Próxima sessão: {new Date(caso.proxima_sessao).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</>
                )}
              </div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,.65)', lineHeight: 1.6 }}>{caso.foco}</div>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              style={{ transform: selecionado === caso.id ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0, marginLeft: 12 }}>
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>

          {selecionado === caso.id && (
            <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,.06)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                {caso.progresso > 0 && (
                  <div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,.35)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Progresso do caso</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ flex: 1, height: 6, background: 'rgba(255,255,255,.08)', borderRadius: 3 }}>
                        <div style={{ height: '100%', width: `${caso.progresso}%`, background: 'linear-gradient(90deg, #1D9E75, #23c48f)', borderRadius: 3 }} />
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#1D9E75' }}>{caso.progresso}%</span>
                    </div>
                  </div>
                )}
                <div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,.35)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Complexidade</div>
                  <span style={{ fontSize: 22, fontWeight: 700, color: caso.complexidade === 'muito-alta' ? '#E05A4B' : '#EF9F27' }}>
                    {caso.complexidade === 'muito-alta' ? 'Muito Alta' : 'Alta'}
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button style={{ flex: 1, background: 'rgba(139,127,232,.15)', border: '1px solid rgba(139,127,232,.35)', borderRadius: 8, padding: '10px', color: '#8B7FE8', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
                  Agendar sessão
                </button>
                <button style={{ flex: 1, background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 8, padding: '10px', color: 'rgba(255,255,255,.6)', fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
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

// ─── Supervisores Tab ─────────────────────────────────────────────────────────
function SupervisoresTab() {
  const { terapeuta } = useClinicContext()
  const [supervisores, setSupervisores] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [solicitando, setSolicitando] = useState<string | null>(null)
  const [solicitados, setSolicitados] = useState<Set<string>>(new Set())

  useEffect(() => {
    const carregar = async () => {
      const { supabase } = await import('@/lib/supabase')
      const { data } = await supabase
        .from('supervisor_profiles')
        .select('*, profiles(nome, nivel_senioridade)')
        .eq('disponivel', true)
        .order('criado_em', { ascending: false })
      setSupervisores(data ?? [])
      setLoading(false)
    }
    carregar()
  }, [])

  const solicitarSessao = async (supId: string, supervisorTerapeutaId: string) => {
    if (!terapeuta) return
    setSolicitando(supId)
    const { supabase } = await import('@/lib/supabase')
    await supabase.from('supervisor_requests').insert({
      terapeuta_id: terapeuta.id,
      supervisor_id: supervisorTerapeutaId,
      tipo: 'duvida_clinica',
      mensagem: 'Solicitação de sessão de supervisão via marketplace.',
      status: 'pendente',
    })
    setSolicitados(prev => new Set([...prev, supId]))
    setSolicitando(null)
  }

  if (loading) return (
    <div style={{ color: 'rgba(255,255,255,.3)', fontSize: 13, padding: 20 }}>Carregando supervisores...</div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,.5)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
        Supervisores disponíveis na plataforma
      </div>

      {supervisores.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 20px', color: 'rgba(255,255,255,.3)', fontSize: 13, border: '1px dashed rgba(26,58,92,.5)', borderRadius: 12 }}>
          Nenhum supervisor disponível no momento.
        </div>
      ) : supervisores.map((sup) => {
        const nome = sup.profiles?.nome ?? 'Supervisor'
        const iniciais = nome.trim().split(' ').map((p: string) => p[0]).slice(0, 2).join('').toUpperCase()
        const jaSolicitou = solicitados.has(sup.id)
        const estaSolicitando = solicitando === sup.id

        return (
          <div key={sup.id} style={{ background: 'rgba(13,32,53,.75)', border: '1px solid rgba(26,58,92,.5)', borderRadius: 12, padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(139,127,232,.2)', border: '1px solid rgba(139,127,232,.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700, color: '#8B7FE8', flexShrink: 0 }}>
                {iniciais}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                  <span style={{ fontWeight: 700, color: 'rgba(255,255,255,.9)', fontSize: 15 }}>{nome}</span>
                  <span style={{ background: sup.disponivel ? 'rgba(29,158,117,.15)' : 'rgba(255,255,255,.06)', border: `1px solid ${sup.disponivel ? 'rgba(29,158,117,.35)' : 'rgba(255,255,255,.12)'}`, borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 600, color: sup.disponivel ? '#1D9E75' : 'rgba(255,255,255,.3)' }}>
                    {sup.disponivel ? 'Disponível' : 'Indisponível'}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,.45)', marginBottom: 8 }}>{sup.titulo ?? '—'}</div>
                {sup.rating && <StarRating rating={sup.rating} />}
                {sup.sessoes_total && (
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,.35)', marginTop: 2 }}>{sup.sessoes_total} sessões realizadas</div>
                )}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
                  {(sup.especialidades ?? []).map((esp: string) => (
                    <span key={esp} style={{ background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 6, padding: '3px 10px', fontSize: 11, color: 'rgba(255,255,255,.5)' }}>
                      {esp}
                    </span>
                  ))}
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                {sup.preco_sessao && (
                  <>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,.35)', marginBottom: 4 }}>por sessão</div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: 'rgba(255,255,255,.9)' }}>R$ {sup.preco_sessao}</div>
                  </>
                )}
                <button
                  disabled={!sup.disponivel || jaSolicitou || estaSolicitando}
                  onClick={() => solicitarSessao(sup.id, sup.terapeuta_id)}
                  style={{
                    marginTop: 10,
                    background: jaSolicitou ? 'rgba(29,158,117,.15)' : sup.disponivel ? 'rgba(139,127,232,.2)' : 'rgba(255,255,255,.04)',
                    border: `1px solid ${jaSolicitou ? 'rgba(29,158,117,.35)' : sup.disponivel ? 'rgba(139,127,232,.45)' : 'rgba(255,255,255,.08)'}`,
                    borderRadius: 8, padding: '8px 16px',
                    color: jaSolicitou ? '#1D9E75' : sup.disponivel ? '#8B7FE8' : 'rgba(255,255,255,.2)',
                    fontSize: 12, fontWeight: 600,
                    cursor: sup.disponivel && !jaSolicitou ? 'pointer' : 'not-allowed',
                    whiteSpace: 'nowrap' as const,
                    fontFamily: 'var(--font-sans)',
                  }}
                >
                  {jaSolicitou ? 'Solicitado' : estaSolicitando ? 'Enviando...' : sup.disponivel ? 'Solicitar sessão' : 'Indisponível'}
                </button>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Histórico Tab (agora com dados reais) ────────────────────────────────────
function HistoricoTab({ historico, loading }: { historico: HistoricoSessao[]; loading: boolean }) {
  if (loading) return (
    <div style={{ color: 'rgba(255,255,255,.3)', fontSize: 13, padding: 20 }}>Carregando histórico...</div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,.5)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
        {historico.length} {historico.length === 1 ? 'sessão registrada' : 'sessões registradas'}
      </div>

      {historico.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 20px', color: 'rgba(255,255,255,.3)', fontSize: 13, border: '1px dashed rgba(26,58,92,.5)', borderRadius: 12 }}>
          Nenhuma sessão de supervisão registrada ainda.
        </div>
      ) : historico.map((sessao) => (
        <div key={sessao.id} style={{ background: 'rgba(13,32,53,.75)', border: '1px solid rgba(26,58,92,.5)', borderRadius: 12, padding: '18px 20px', display: 'flex', gap: 16, alignItems: 'flex-start' }}>
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
                  {new Date(sessao.data).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                  {sessao.duracao > 0 && ` · ${sessao.duracao} min`}
                </div>
              </div>
            </div>
            {sessao.tema && (
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,.7)', fontWeight: 500, marginBottom: 8 }}>
                {sessao.tema}
              </div>
            )}
            {sessao.nota && (
              <div style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.07)', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: 'rgba(255,255,255,.5)', lineHeight: 1.6 }}>
                <span style={{ color: 'rgba(139,127,232,.8)', fontWeight: 600 }}>Encaminhamentos: </span>
                {sessao.nota}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Inbox Tab ────────────────────────────────────────────────────────────────
function InboxTab() {
  const { terapeuta } = useClinicContext()
  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const carregar = async () => {
      if (!terapeuta) { setLoading(false); return }
      const { supabase } = await import('@/lib/supabase')
      const { data } = await supabase
        .from('supervisor_requests')
        .select('*')
        .eq('supervisor_id', terapeuta.id)
        .order('criado_em', { ascending: false })
      setRequests(data ?? [])
      setLoading(false)
    }
    carregar()
  }, [terapeuta])

  const marcarResolvido = async (id: string) => {
    const { supabase } = await import('@/lib/supabase')
    await supabase.from('supervisor_requests').update({ status: 'resolvido', resolvido_em: new Date().toISOString() }).eq('id', id)
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'resolvido' } : r))
  }

  const marcarEmAndamento = async (id: string) => {
    const { supabase } = await import('@/lib/supabase')
    await supabase.from('supervisor_requests').update({ status: 'em_andamento' }).eq('id', id)
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'em_andamento' } : r))
  }

  const pendentes    = requests.filter(r => r.status === 'pendente')
  const emAndamento  = requests.filter(r => r.status === 'em_andamento')
  const resolvidos   = requests.filter(r => r.status === 'resolvido')

  const s = {
    card: 'rgba(13,32,53,0.75)', border: 'rgba(26,58,92,0.5)',
    teal: '#1D9E75', amber: '#EF9F27', coral: '#E05A4B', purple: '#8B7FE8',
    muted: 'rgba(255,255,255,.4)', text: 'rgba(255,255,255,.85)',
  }

  const StatusBadge = ({ status }: { status: string }) => {
    const cfg: Record<string, { label: string; cor: string }> = {
      pendente:     { label: 'Pendente',     cor: s.coral  },
      em_andamento: { label: 'Em andamento', cor: s.amber  },
      resolvido:    { label: 'Resolvido',    cor: s.teal   },
    }
    const c = cfg[status] ?? cfg.pendente
    return (
      <span style={{ fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 20, background: c.cor + '20', color: c.cor, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {c.label}
      </span>
    )
  }

  const RequestCard = ({ r }: { r: any }) => (
    <div style={{ background: s.card, border: `1px solid ${s.border}`, borderRadius: 10, padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 500, color: s.text, marginBottom: 4 }}>
            {r.programa_nome ?? 'Solicitação de supervisão'}
          </div>
          <div style={{ fontSize: 11, color: s.muted }}>
            {new Date(r.criado_em).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
        <StatusBadge status={r.status} />
      </div>
      {r.mensagem && (
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,.6)', lineHeight: 1.6, padding: '10px 12px', background: 'rgba(0,0,0,0.2)', borderRadius: 7 }}>
          {r.mensagem}
        </div>
      )}
      {r.status !== 'resolvido' && (
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          {r.status === 'pendente' && (
            <button onClick={() => marcarEmAndamento(r.id)} style={{ flex: 1, padding: '8px', borderRadius: 7, border: `1px solid ${s.amber}44`, background: 'rgba(239,159,39,0.08)', color: s.amber, fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
              Iniciar atendimento
            </button>
          )}
          <button onClick={() => marcarResolvido(r.id)} style={{ flex: 1, padding: '8px', borderRadius: 7, border: `1px solid ${s.teal}44`, background: 'rgba(29,158,117,0.08)', color: s.teal, fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
            Marcar como resolvido
          </button>
        </div>
      )}
    </div>
  )

  if (loading) return <div style={{ color: s.muted, fontSize: 13, padding: 32 }}>Carregando inbox...</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
        {[
          { label: 'Pendentes',    value: pendentes.length,   cor: s.coral },
          { label: 'Em andamento', value: emAndamento.length, cor: s.amber },
          { label: 'Resolvidos',   value: resolvidos.length,  cor: s.teal  },
        ].map(m => (
          <div key={m.label} style={{ background: s.card, border: `1px solid ${s.border}`, borderRadius: 10, padding: '16px 20px' }}>
            <div style={{ fontSize: 11, color: s.muted, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>{m.label}</div>
            <div style={{ fontSize: 28, fontWeight: 600, color: m.cor }}>{m.value}</div>
          </div>
        ))}
      </div>

      {pendentes.length > 0 && (
        <div>
          <div style={{ fontSize: 11, color: s.coral, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Aguardando ação</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {pendentes.map(r => <RequestCard key={r.id} r={r} />)}
          </div>
        </div>
      )}
      {emAndamento.length > 0 && (
        <div>
          <div style={{ fontSize: 11, color: s.amber, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Em andamento</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {emAndamento.map(r => <RequestCard key={r.id} r={r} />)}
          </div>
        </div>
      )}
      {resolvidos.length > 0 && (
        <div>
          <div style={{ fontSize: 11, color: s.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Resolvidos</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {resolvidos.map(r => <RequestCard key={r.id} r={r} />)}
          </div>
        </div>
      )}
      {requests.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 20px', color: s.muted, fontSize: 13, border: `1px dashed ${s.border}`, borderRadius: 12 }}>
          Nenhuma solicitação recebida ainda.
        </div>
      )}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function SupervisaoPage() {
  const { terapeuta } = useClinicContext()
  const [tab, setTab] = useState<Tab>('visao-geral')

  // Estado compartilhado entre Visão Geral, Casos e Histórico
  const [casos,         setCasos]         = useState<CasoEmSupervimento[]>([])
  const [historico,     setHistorico]     = useState<HistoricoSessao[]>([])
  const [loadingCasos,  setLoadingCasos]  = useState(true)
  const [loadingHist,   setLoadingHist]   = useState(true)

  // ── Carregar casos de supervisão ─────────────────────────────────────────
  // Os casos vêm de supervisor_requests (solicitações aceitas/em andamento)
  // cruzadas com criancas para obter nome/idade e com profiles do supervisor para o nome
  useEffect(() => {
    if (!terapeuta) { setLoadingCasos(false); return }
    const carregar = async () => {
      setLoadingCasos(true)
      const { supabase } = await import('@/lib/supabase')

      // Busca requests onde o terapeuta está envolvido (como solicitante)
      // e que tenham status ativo ou pendente
      const { data: requests } = await supabase
        .from('supervisor_requests')
        .select('id, status, criado_em, mensagem, supervisor_id, terapeuta_id, programa_id, programa_nome')
        .eq('terapeuta_id', terapeuta.id)
        .in('status', ['pendente', 'em_andamento'])
        .order('criado_em', { ascending: false })

      if (!requests || requests.length === 0) {
        setCasos([])
        setLoadingCasos(false)
        return
      }

      // Buscar nomes dos supervisores
      const supervisorIds = [...new Set(requests.map((r: any) => r.supervisor_id))]
      const { data: supervisorProfiles } = await supabase
        .from('profiles')
        .select('id, nome')
        .in('id', supervisorIds)

      const supervisorMap = new Map<string, string>()
      for (const sp of (supervisorProfiles ?? [])) {
        supervisorMap.set(sp.id, sp.nome ?? 'Supervisor')
      }

      // Montar casos
      const casosFormatados: CasoEmSupervimento[] = requests.map((r: any) => ({
        id:            r.id,
        crianca_nome:  r.programa_nome ?? 'Caso clínico',
        crianca_idade: 0,
        supervisor_nome: supervisorMap.get(r.supervisor_id) ?? 'Supervisor',
        proxima_sessao: null,
        complexidade:  r.status === 'em_andamento' ? 'muito-alta' : 'alta',
        status:        r.status === 'em_andamento' ? 'ativo' : 'pendente',
        foco:          r.mensagem ?? 'Supervisão clínica solicitada.',
        progresso:     r.status === 'em_andamento' ? 40 : 0,
      }))

      setCasos(casosFormatados)
      setLoadingCasos(false)
    }
    carregar()
  }, [terapeuta])

  // ── Carregar histórico ───────────────────────────────────────────────────
  useEffect(() => {
    if (!terapeuta) { setLoadingHist(false); return }
    const carregar = async () => {
      setLoadingHist(true)
      const { supabase } = await import('@/lib/supabase')

      const { data: requests } = await supabase
        .from('supervisor_requests')
        .select('id, status, criado_em, mensagem, supervisor_id, programa_nome, resolvido_em')
        .eq('terapeuta_id', terapeuta.id)
        .eq('status', 'resolvido')
        .order('resolvido_em', { ascending: false })
        .limit(20)

      if (!requests || requests.length === 0) {
        setHistorico([])
        setLoadingHist(false)
        return
      }

      const supervisorIds = [...new Set(requests.map((r: any) => r.supervisor_id))]
      const { data: supervisorProfiles } = await supabase
        .from('profiles')
        .select('id, nome')
        .in('id', supervisorIds)

      const supervisorMap = new Map<string, string>()
      for (const sp of (supervisorProfiles ?? [])) {
        supervisorMap.set(sp.id, sp.nome ?? 'Supervisor')
      }

      const historicoFormatado: HistoricoSessao[] = requests.map((r: any) => ({
        id:              r.id,
        data:            r.resolvido_em ?? r.criado_em,
        supervisor_nome: supervisorMap.get(r.supervisor_id) ?? 'Supervisor',
        crianca_nome:    r.programa_nome ?? 'Caso clínico',
        duracao:         0,
        tema:            r.mensagem ?? '',
        nota:            '',
      }))

      setHistorico(historicoFormatado)
      setLoadingHist(false)
    }
    carregar()
  }, [terapeuta])

  const tabs: { id: Tab; label: string }[] = [
    { id: 'visao-geral',  label: 'Visão Geral'  },
    { id: 'casos',        label: 'Casos'        },
    { id: 'supervisores', label: 'Supervisores' },
    { id: 'historico',    label: 'Histórico'    },
    { id: 'inbox',        label: 'Inbox'        },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#07111f', color: 'rgba(255,255,255,.85)', fontFamily: 'var(--font-sans, system-ui)', padding: '32px' }}>
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 8 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(139,127,232,.2)', border: '1px solid rgba(139,127,232,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8B7FE8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: 'rgba(255,255,255,.95)' }}>Supervisão</h1>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,.4)', margin: 0 }}>Suporte clínico especializado para seus casos</p>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 28, background: 'rgba(255,255,255,.04)', borderRadius: 10, padding: 4 }}>
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex: 1, padding: '9px 0',
            background: tab === t.id ? 'rgba(139,127,232,.2)' : 'transparent',
            border: tab === t.id ? '1px solid rgba(139,127,232,.35)' : '1px solid transparent',
            borderRadius: 8, color: tab === t.id ? '#8B7FE8' : 'rgba(255,255,255,.4)',
            fontSize: 13, fontWeight: tab === t.id ? 600 : 400,
            cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'var(--font-sans)',
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'visao-geral'  && <VisaoGeralTab casos={casos} loading={loadingCasos} />}
      {tab === 'casos'        && <CasosTab      casos={casos} loading={loadingCasos} />}
      {tab === 'supervisores' && <SupervisoresTab />}
      {tab === 'historico'    && <HistoricoTab  historico={historico} loading={loadingHist} />}
      {tab === 'inbox'        && <InboxTab />}
    </div>
  )
}
