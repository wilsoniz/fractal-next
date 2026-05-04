'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useClinicContext } from '../layout'

// ─── Types ────────────────────────────────────────────────────────────────────
type TabTerapeuta  = 'minha-supervisao' | 'buscar-supervisor' | 'historico'
type TabSupervisor = 'painel' | 'minha-equipe' | 'inbox' | 'historico-ministrado'

interface CasoRecebendo {
  id: string
  supervisor_nome: string
  foco: string
  status: 'pendente' | 'ativo'
  criado_em: string
}

interface HistoricoItem {
  id: string
  data: string
  supervisor_nome: string
  foco: string
}

interface RequestInbox {
  id: string
  terapeuta_nome: string
  mensagem: string
  status: string
  criado_em: string
  programa_nome: string | null
}

interface MembroEquipe {
  id: string
  membro_id: string
  nome: string
  email: string
  status: 'convidado' | 'ativo' | 'inativo'
  limite_pacientes: number
  criado_em: string
}

interface NotificacaoEquipe {
  id: string
  membro_id: string
  membro_nome: string
  tipo: 'sessao_iniciada' | 'sessao_encerrada' | 'alerta_clinico' | 'novo_paciente'
  mensagem: string
  lida: boolean
  criado_em: string
}

// ─── Helpers visuais ─────────────────────────────────────────────────────────
const c = {
  bg:     '#07111f',
  card:   'rgba(13,32,53,.75)',
  border: 'rgba(26,58,92,.5)',
  teal:   '#1D9E75',
  blue:   '#378ADD',
  purple: '#8B7FE8',
  amber:  '#EF9F27',
  coral:  '#E05A4B',
  muted:  'rgba(255,255,255,.4)',
  text:   'rgba(255,255,255,.85)',
  sub:    'rgba(255,255,255,.35)',
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 12, ...style }}>
      {children}
    </div>
  )
}

function Badge({ label, cor }: { label: string; cor: string }) {
  return (
    <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: cor + '20', color: cor, textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>
      {label}
    </span>
  )
}

function KPI({ label, value, cor, sub }: { label: string; value: string | number; cor: string; sub?: string }) {
  return (
    <Card style={{ padding: '18px 20px' }}>
      <div style={{ fontSize: 11, color: c.muted, textTransform: 'uppercase' as const, letterSpacing: '.08em', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, color: cor, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: c.sub, marginTop: 4 }}>{sub}</div>}
    </Card>
  )
}

function TabBar({ tabs, active, onChange }: { tabs: { id: string; label: string; badge?: number }[]; active: string; onChange: (id: string) => void }) {
  return (
    <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: 'rgba(255,255,255,.04)', borderRadius: 10, padding: 4 }}>
      {tabs.map(t => (
        <button key={t.id} onClick={() => onChange(t.id)} style={{
          flex: 1, padding: '9px 4px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          background: active === t.id ? 'rgba(139,127,232,.2)' : 'transparent',
          border: active === t.id ? '1px solid rgba(139,127,232,.35)' : '1px solid transparent',
          borderRadius: 8, color: active === t.id ? c.purple : c.muted,
          fontSize: 13, fontWeight: active === t.id ? 600 : 400,
          cursor: 'pointer', fontFamily: 'var(--font-sans)',
        }}>
          {t.label}
          {t.badge !== undefined && t.badge > 0 && (
            <span style={{ minWidth: 16, height: 16, borderRadius: 8, background: c.coral, color: 'white', fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>
              {t.badge}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODO TERAPEUTA — Supervisão que RECEBO
// ═══════════════════════════════════════════════════════════════════════════════

function MinhaSupervisaoTab({ casos, loading }: { casos: CasoRecebendo[]; loading: boolean }) {
  if (loading) return <div style={{ color: c.muted, fontSize: 13, padding: 20 }}>Carregando...</div>

  const ativos   = casos.filter(x => x.status === 'ativo').length
  const pendentes = casos.filter(x => x.status === 'pendente').length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
        <KPI label="Casos com supervisor" value={ativos}   cor={c.teal}   sub="ativos agora" />
        <KPI label="Aguardando resposta"  value={pendentes} cor={c.amber}  sub="solicitações enviadas" />
        <KPI label="Total de vínculos"    value={casos.length} cor={c.purple} sub="histórico completo" />
      </div>

      {casos.length === 0 ? (
        <Card style={{ padding: '48px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 13, color: c.muted, marginBottom: 16 }}>
            Você ainda não tem supervisão ativa.
          </div>
          <div style={{ fontSize: 12, color: c.sub }}>
            Use a aba "Buscar Supervisor" para solicitar suporte clínico.
          </div>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: 11, color: c.muted, textTransform: 'uppercase' as const, letterSpacing: '.08em', marginBottom: 4 }}>
            Meus vínculos de supervisão
          </div>
          {casos.map(caso => (
            <Card key={caso.id} style={{ padding: '18px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: c.text }}>{caso.supervisor_nome}</span>
                    <Badge label={caso.status === 'ativo' ? 'Ativo' : 'Pendente'} cor={caso.status === 'ativo' ? c.teal : c.amber} />
                  </div>
                  <div style={{ fontSize: 12, color: c.muted, lineHeight: 1.6 }}>{caso.foco}</div>
                  <div style={{ fontSize: 11, color: c.sub, marginTop: 6 }}>
                    Desde {new Date(caso.criado_em).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

function BuscarSupervisorTab({ terapeutaId }: { terapeutaId: string }) {
  const [supervisores, setSupervisores] = useState<any[]>([])
  const [loading,      setLoading]      = useState(true)
  const [solicitando,  setSolicitando]  = useState<string | null>(null)
  const [solicitados,  setSolicitados]  = useState<Set<string>>(new Set())

  useEffect(() => {
    supabase
      .from('supervisor_profiles')
      .select('*, profiles(nome, nivel_senioridade)')
      .eq('disponivel', true)
      .order('criado_em', { ascending: false })
      .then(({ data }) => { setSupervisores(data ?? []); setLoading(false) })
  }, [])

  async function solicitar(supId: string, supervisorTerapeutaId: string) {
    setSolicitando(supId)
    await supabase.from('supervisor_requests').insert({
      terapeuta_id:  terapeutaId,
      supervisor_id: supervisorTerapeutaId,
      tipo:          'duvida_clinica',
      mensagem:      'Solicitação de supervisão clínica via marketplace.',
      status:        'pendente',
    })
    setSolicitados(prev => new Set([...prev, supId]))
    setSolicitando(null)
  }

  if (loading) return <div style={{ color: c.muted, fontSize: 13, padding: 20 }}>Carregando supervisores...</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ fontSize: 11, color: c.muted, textTransform: 'uppercase' as const, letterSpacing: '.08em', marginBottom: 4 }}>
        Supervisores disponíveis na plataforma
      </div>

      {supervisores.length === 0 ? (
        <Card style={{ padding: '48px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 13, color: c.muted }}>Nenhum supervisor disponível no momento.</div>
        </Card>
      ) : supervisores.map(sup => {
        const nome    = sup.profiles?.nome ?? 'Supervisor'
        const iniciais = nome.trim().split(' ').map((p: string) => p[0]).slice(0,2).join('').toUpperCase()
        const jaSolicitou    = solicitados.has(sup.id)
        const estaSolicitando = solicitando === sup.id

        return (
          <Card key={sup.id} style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
              <div style={{ width: 46, height: 46, borderRadius: 12, background: 'rgba(139,127,232,.2)', border: '1px solid rgba(139,127,232,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: c.purple, flexShrink: 0 }}>
                {iniciais}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: c.text }}>{nome}</span>
                  <Badge label={sup.disponivel ? 'Disponível' : 'Indisponível'} cor={sup.disponivel ? c.teal : c.muted} />
                </div>
                {sup.titulo && <div style={{ fontSize: 12, color: c.muted, marginBottom: 8 }}>{sup.titulo}</div>}
                <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 5 }}>
                  {(sup.especialidades ?? []).map((esp: string) => (
                    <span key={esp} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: 'rgba(255,255,255,.05)', color: c.muted, border: `1px solid ${c.border}` }}>{esp}</span>
                  ))}
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                {sup.preco_sessao && (
                  <div style={{ fontSize: 18, fontWeight: 700, color: c.text, marginBottom: 8 }}>R$ {sup.preco_sessao}</div>
                )}
                <button
                  disabled={!sup.disponivel || jaSolicitou || estaSolicitando}
                  onClick={() => solicitar(sup.id, sup.terapeuta_id)}
                  style={{
                    padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                    background: jaSolicitou ? 'rgba(29,158,117,.15)' : sup.disponivel ? 'rgba(139,127,232,.2)' : 'rgba(255,255,255,.04)',
                    border: `1px solid ${jaSolicitou ? 'rgba(29,158,117,.35)' : sup.disponivel ? 'rgba(139,127,232,.4)' : c.border}`,
                    color: jaSolicitou ? c.teal : sup.disponivel ? c.purple : c.muted,
                    cursor: sup.disponivel && !jaSolicitou ? 'pointer' : 'not-allowed',
                    fontFamily: 'var(--font-sans)', whiteSpace: 'nowrap' as const,
                  }}
                >
                  {jaSolicitou ? 'Solicitado' : estaSolicitando ? 'Enviando...' : 'Solicitar supervisão'}
                </button>
              </div>
            </div>
          </Card>
        )
      })}
    </div>
  )
}

function HistoricoRecebidoTab({ historico, loading }: { historico: HistoricoItem[]; loading: boolean }) {
  if (loading) return <div style={{ color: c.muted, fontSize: 13, padding: 20 }}>Carregando...</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ fontSize: 11, color: c.muted, textTransform: 'uppercase' as const, letterSpacing: '.08em', marginBottom: 4 }}>
        {historico.length} sessão(ões) de supervisão concluída(s)
      </div>
      {historico.length === 0 ? (
        <Card style={{ padding: '48px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 13, color: c.muted }}>Nenhuma sessão de supervisão concluída ainda.</div>
        </Card>
      ) : historico.map((h, i) => (
        <div key={h.id} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 4, flexShrink: 0 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: c.purple }} />
            {i < historico.length - 1 && <div style={{ width: 1, height: 40, background: 'rgba(139,127,232,.2)', marginTop: 4 }} />}
          </div>
          <Card style={{ flex: 1, padding: '14px 16px', marginBottom: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: c.text, marginBottom: 3 }}>{h.supervisor_nome}</div>
            <div style={{ fontSize: 12, color: c.muted, marginBottom: 4 }}>{h.foco}</div>
            <div style={{ fontSize: 11, color: c.sub }}>
              {new Date(h.data).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
            </div>
          </Card>
        </div>
      ))}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODO SUPERVISOR — Supervisão que MINISTRO + MINHA EQUIPE
// ═══════════════════════════════════════════════════════════════════════════════

function PainelSupervisorTab({ requests, loading, onAcao }: {
  requests: RequestInbox[]
  loading: boolean
  onAcao: (id: string, acao: 'em_andamento' | 'resolvido') => void
}) {
  if (loading) return <div style={{ color: c.muted, fontSize: 13, padding: 20 }}>Carregando...</div>

  const pendentes   = requests.filter(r => r.status === 'pendente')
  const emAndamento = requests.filter(r => r.status === 'em_andamento')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
        <KPI label="Aguardando ação"  value={pendentes.length}   cor={c.coral}  sub="novas solicitações" />
        <KPI label="Em andamento"     value={emAndamento.length} cor={c.amber}  sub="casos ativos" />
        <KPI label="Total recebidos"  value={requests.length}    cor={c.purple} sub="histórico" />
      </div>

      {pendentes.length > 0 && (
        <div>
          <div style={{ fontSize: 11, color: c.coral, textTransform: 'uppercase' as const, letterSpacing: '.08em', marginBottom: 10 }}>
            Novas solicitações
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {pendentes.map(r => <RequestCard key={r.id} r={r} onAcao={onAcao} />)}
          </div>
        </div>
      )}

      {emAndamento.length > 0 && (
        <div>
          <div style={{ fontSize: 11, color: c.amber, textTransform: 'uppercase' as const, letterSpacing: '.08em', marginBottom: 10 }}>
            Em andamento
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {emAndamento.map(r => <RequestCard key={r.id} r={r} onAcao={onAcao} />)}
          </div>
        </div>
      )}

      {requests.length === 0 && (
        <Card style={{ padding: '48px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 13, color: c.muted }}>Nenhuma solicitação de supervisão recebida ainda.</div>
        </Card>
      )}
    </div>
  )
}

function RequestCard({ r, onAcao }: { r: RequestInbox; onAcao: (id: string, acao: 'em_andamento' | 'resolvido') => void }) {
  return (
    <Card style={{ padding: '16px 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: c.text, marginBottom: 2 }}>{r.terapeuta_nome}</div>
          <div style={{ fontSize: 11, color: c.sub }}>
            {new Date(r.criado_em).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
        <Badge label={r.status === 'pendente' ? 'Novo' : 'Em andamento'} cor={r.status === 'pendente' ? c.coral : c.amber} />
      </div>
      {r.mensagem && (
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,.6)', lineHeight: 1.6, padding: '8px 10px', background: 'rgba(0,0,0,.2)', borderRadius: 7, marginBottom: 10 }}>
          {r.mensagem}
        </div>
      )}
      <div style={{ display: 'flex', gap: 8 }}>
        {r.status === 'pendente' && (
          <button onClick={() => onAcao(r.id, 'em_andamento')} style={{ flex: 1, padding: '8px', borderRadius: 7, border: `1px solid ${c.amber}44`, background: 'rgba(239,159,39,.08)', color: c.amber, fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
            Iniciar atendimento
          </button>
        )}
        <button onClick={() => onAcao(r.id, 'resolvido')} style={{ flex: 1, padding: '8px', borderRadius: 7, border: `1px solid ${c.teal}44`, background: 'rgba(29,158,117,.08)', color: c.teal, fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
          Marcar resolvido
        </button>
      </div>
    </Card>
  )
}

function MinhaEquipeTab({ supervisorId, nivel }: { supervisorId: string; nivel: string }) {
  const [membros,        setMembros]        = useState<MembroEquipe[]>([])
  const [notificacoes,   setNotificacoes]   = useState<NotificacaoEquipe[]>([])
  const [loading,        setLoading]        = useState(true)
  const [convidando,     setConvidando]     = useState(false)
  const [emailConvite,   setEmailConvite]   = useState('')
  const [enviandoConvite,setEnviandoConvite]= useState(false)
  const [erroConvite,    setErroConvite]    = useState<string | null>(null)

  const limiteEquipe = nivel === 'supervisor' ? 999 : 2

  useEffect(() => {
    carregar()
  }, [supervisorId])

  async function carregar() {
    setLoading(true)

    const { data: membrosRaw } = await supabase
      .from('equipe_membros')
      .select('*')
      .eq('supervisor_id', supervisorId)
      .order('criado_em', { ascending: false })

    if (membrosRaw && membrosRaw.length > 0) {
      const membroIds = membrosRaw.map((m: any) => m.membro_id)
      const { data: perfis } = await supabase
        .from('profiles')
        .select('id, nome, email')
        .in('id', membroIds)

      const perfilMap = new Map<string, { nome: string; email: string }>()
      for (const p of (perfis ?? [])) {
        perfilMap.set(p.id, { nome: p.nome ?? p.email ?? 'Membro', email: p.email ?? '' })
      }

      setMembros(membrosRaw.map((m: any) => ({
        id:               m.id,
        membro_id:        m.membro_id,
        nome:             perfilMap.get(m.membro_id)?.nome ?? 'Membro',
        email:            perfilMap.get(m.membro_id)?.email ?? '',
        status:           m.status,
        limite_pacientes: m.limite_pacientes,
        criado_em:        m.criado_em,
      })))
    } else {
      setMembros([])
    }

    const { data: notifs } = await supabase
      .from('equipe_notificacoes')
      .select('*')
      .eq('supervisor_id', supervisorId)
      .eq('lida', false)
      .order('criado_em', { ascending: false })
      .limit(20)

    if (notifs && notifs.length > 0) {
      const membroIds = [...new Set(notifs.map((n: any) => n.membro_id))]
      const { data: perfis } = await supabase
        .from('profiles')
        .select('id, nome')
        .in('id', membroIds)
      const perfilMap = new Map<string, string>()
      for (const p of (perfis ?? [])) perfilMap.set(p.id, p.nome ?? 'Membro')

      setNotificacoes(notifs.map((n: any) => ({
        id:          n.id,
        membro_id:   n.membro_id,
        membro_nome: perfilMap.get(n.membro_id) ?? 'Membro',
        tipo:        n.tipo,
        mensagem:    n.mensagem,
        lida:        n.lida,
        criado_em:   n.criado_em,
      })))
    } else {
      setNotificacoes([])
    }

    setLoading(false)
  }

  async function marcarLida(id: string) {
    await supabase.from('equipe_notificacoes').update({ lida: true }).eq('id', id)
    setNotificacoes(prev => prev.filter(n => n.id !== id))
  }

  async function convidarMembro() {
    if (!emailConvite.trim()) return
    if (membros.length >= limiteEquipe) {
      setErroConvite(`Limite de ${limiteEquipe} membro(s) para o seu nível.`)
      return
    }
    setEnviandoConvite(true)
    setErroConvite(null)

    // Busca o profile pelo email
    const { data: perfil } = await supabase
      .from('profiles')
      .select('id, nome')
      .eq('email', emailConvite.trim())
      .maybeSingle()

    if (!perfil) {
      setErroConvite('Usuário não encontrado. O aplicador precisa ter conta no FractaClinic.')
      setEnviandoConvite(false)
      return
    }

    const { error } = await supabase.from('equipe_membros').insert({
      supervisor_id:    supervisorId,
      membro_id:        perfil.id,
      status:           'convidado',
      limite_pacientes: 5,
    })

    if (error) {
      setErroConvite(error.code === '23505' ? 'Este membro já está na sua equipe.' : 'Erro ao convidar. Tente novamente.')
    } else {
      setEmailConvite('')
      setConvidando(false)
      await carregar()
    }
    setEnviandoConvite(false)
  }

  const TIPO_NOTIF: Record<string, { label: string; cor: string }> = {
    sessao_iniciada:  { label: 'Sessão iniciada',  cor: c.teal   },
    sessao_encerrada: { label: 'Sessão encerrada', cor: c.blue   },
    alerta_clinico:   { label: 'Alerta clínico',   cor: c.coral  },
    novo_paciente:    { label: 'Novo paciente',    cor: c.purple },
  }

  if (loading) return <div style={{ color: c.muted, fontSize: 13, padding: 20 }}>Carregando equipe...</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
        <KPI label="Membros ativos"   value={membros.filter(m => m.status === 'ativo').length}   cor={c.teal}   sub={`de ${limiteEquipe === 999 ? 'ilimitados' : limiteEquipe}`} />
        <KPI label="Convidados"       value={membros.filter(m => m.status === 'convidado').length} cor={c.amber}  sub="aguardando aceite" />
        <KPI label="Notificações"     value={notificacoes.length}                                  cor={c.coral}  sub="não lidas" />
      </div>

      {/* Notificações em tempo real */}
      {notificacoes.length > 0 && (
        <div>
          <div style={{ fontSize: 11, color: c.coral, textTransform: 'uppercase' as const, letterSpacing: '.08em', marginBottom: 10 }}>
            Alertas da equipe
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {notificacoes.map(n => {
              const cfg = TIPO_NOTIF[n.tipo] ?? { label: n.tipo, cor: c.muted }
              return (
                <Card key={n.id} style={{ padding: '12px 16px', borderLeft: `3px solid ${cfg.cor}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <Badge label={cfg.label} cor={cfg.cor} />
                        <span style={{ fontSize: 12, fontWeight: 600, color: c.text }}>{n.membro_nome}</span>
                      </div>
                      <div style={{ fontSize: 12, color: c.muted }}>{n.mensagem}</div>
                      <div style={{ fontSize: 11, color: c.sub, marginTop: 4 }}>
                        {new Date(n.criado_em).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <button onClick={() => marcarLida(n.id)} style={{ padding: '4px 10px', borderRadius: 6, border: `1px solid ${c.border}`, background: 'transparent', color: c.muted, fontSize: 11, cursor: 'pointer', flexShrink: 0, marginLeft: 12, fontFamily: 'inherit' }}>
                      Lida
                    </button>
                  </div>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {/* Lista de membros */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: c.muted, textTransform: 'uppercase' as const, letterSpacing: '.08em' }}>
            Minha equipe — {membros.length}/{limiteEquipe === 999 ? 'ilimitado' : limiteEquipe}
          </div>
          {membros.length < limiteEquipe && (
            <button onClick={() => { setConvidando(!convidando); setErroConvite(null) }} style={{
              padding: '7px 14px', borderRadius: 8, border: `1px solid rgba(139,127,232,.35)`,
              background: 'rgba(139,127,232,.15)', color: c.purple, fontSize: 12, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'var(--font-sans)',
            }}>
              {convidando ? 'Cancelar' : '+ Convidar membro'}
            </button>
          )}
        </div>

        {convidando && (
          <Card style={{ padding: '16px 20px', marginBottom: 12, border: '1px solid rgba(139,127,232,.3)' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: c.purple, marginBottom: 10 }}>Convidar aplicador / AT / estagiário</div>
            <div style={{ fontSize: 11, color: c.muted, marginBottom: 12 }}>
              O profissional precisa ter conta ativa no FractaClinic. Ele aparecerá no marketplace sob sua supervisão.
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={emailConvite}
                onChange={e => setEmailConvite(e.target.value)}
                placeholder="email@profissional.com"
                style={{ flex: 1, padding: '9px 12px', borderRadius: 8, border: `1px solid ${c.border}`, background: 'rgba(13,32,53,.6)', color: c.text, fontSize: 13, fontFamily: 'var(--font-sans)', outline: 'none' }}
              />
              <button onClick={convidarMembro} disabled={!emailConvite || enviandoConvite} style={{
                padding: '9px 16px', borderRadius: 8, border: 'none',
                background: emailConvite ? 'rgba(139,127,232,.3)' : 'rgba(255,255,255,.05)',
                color: emailConvite ? c.purple : c.muted, fontSize: 13, fontWeight: 600,
                cursor: emailConvite ? 'pointer' : 'not-allowed', fontFamily: 'var(--font-sans)',
              }}>
                {enviandoConvite ? 'Enviando...' : 'Convidar'}
              </button>
            </div>
            {erroConvite && (
              <div style={{ fontSize: 12, color: c.coral, marginTop: 8 }}>{erroConvite}</div>
            )}
          </Card>
        )}

        {membros.length === 0 ? (
          <Card style={{ padding: '40px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: 13, color: c.muted, marginBottom: 8 }}>Sua equipe está vazia.</div>
            <div style={{ fontSize: 12, color: c.sub }}>
              Convide aplicadores, ATs ou estagiários para atender sob sua responsabilidade técnica.
            </div>
          </Card>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {membros.map(m => {
              const iniciais = m.nome.trim().split(' ').map((p: string) => p[0]).slice(0,2).join('').toUpperCase()
              const corStatus = m.status === 'ativo' ? c.teal : m.status === 'convidado' ? c.amber : c.muted
              return (
                <Card key={m.id} style={{ padding: '16px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(55,138,221,.2)', border: '1px solid rgba(55,138,221,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: c.blue, flexShrink: 0 }}>
                      {iniciais}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: c.text }}>{m.nome}</span>
                        <Badge label={m.status === 'ativo' ? 'Ativo' : m.status === 'convidado' ? 'Convidado' : 'Inativo'} cor={corStatus} />
                      </div>
                      <div style={{ fontSize: 12, color: c.muted }}>{m.email}</div>
                      <div style={{ fontSize: 11, color: c.sub, marginTop: 2 }}>
                        Limite: {m.limite_pacientes} paciente(s) · Desde {new Date(m.criado_em).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </div>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {nivel === 'coordenador' && (
        <div style={{ padding: '12px 16px', background: 'rgba(239,159,39,.06)', border: '1px solid rgba(239,159,39,.2)', borderRadius: 10, fontSize: 12, color: 'rgba(239,159,39,.8)', lineHeight: 1.6 }}>
          Como Coordenador, você pode ter até 2 membros na equipe. Avance para Supervisor para equipes ilimitadas e notificações em tempo real.
        </div>
      )}
    </div>
  )
}

function HistoricoMinistradoTab({ supervisorId }: { supervisorId: string }) {
  const [historico, setHistorico] = useState<any[]>([])
  const [loading,   setLoading]   = useState(true)

  useEffect(() => {
    supabase
      .from('supervisor_requests')
      .select('id, criado_em, mensagem, resolvido_em, terapeuta_id')
      .eq('supervisor_id', supervisorId)
      .eq('status', 'resolvido')
      .order('resolvido_em', { ascending: false })
      .limit(30)
      .then(async ({ data }) => {
        if (!data || data.length === 0) { setHistorico([]); setLoading(false); return }
        const ids = [...new Set(data.map((r: any) => r.terapeuta_id))]
        const { data: perfis } = await supabase.from('profiles').select('id, nome').in('id', ids)
        const map = new Map<string, string>()
        for (const p of (perfis ?? [])) map.set(p.id, p.nome ?? 'Terapeuta')
        setHistorico(data.map((r: any) => ({ ...r, terapeuta_nome: map.get(r.terapeuta_id) ?? 'Terapeuta' })))
        setLoading(false)
      })
  }, [supervisorId])

  if (loading) return <div style={{ color: c.muted, fontSize: 13, padding: 20 }}>Carregando...</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ fontSize: 11, color: c.muted, textTransform: 'uppercase' as const, letterSpacing: '.08em', marginBottom: 4 }}>
        {historico.length} supervisão(ões) concluída(s)
      </div>
      {historico.length === 0 ? (
        <Card style={{ padding: '48px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 13, color: c.muted }}>Nenhuma supervisão concluída ainda.</div>
        </Card>
      ) : historico.map((h, i) => (
        <div key={h.id} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 4, flexShrink: 0 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: c.teal }} />
            {i < historico.length - 1 && <div style={{ width: 1, height: 40, background: 'rgba(29,158,117,.2)', marginTop: 4 }} />}
          </div>
          <Card style={{ flex: 1, padding: '14px 16px', marginBottom: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: c.text, marginBottom: 3 }}>{h.terapeuta_nome}</div>
            {h.mensagem && <div style={{ fontSize: 12, color: c.muted, marginBottom: 4 }}>{h.mensagem}</div>}
            <div style={{ fontSize: 11, color: c.sub }}>
              Concluída em {new Date(h.resolvido_em ?? h.criado_em).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
            </div>
          </Card>
        </div>
      ))}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════
export default function SupervisaoPage() {
  const { terapeuta } = useClinicContext()
  const nivel = terapeuta?.nivel ?? 'terapeuta'
  const isSupervisor = nivel === 'supervisor' || nivel === 'coordenador'

  // Estado modo terapeuta
  const [tabT,          setTabT]          = useState<TabTerapeuta>('minha-supervisao')
  const [casosRecebendo, setCasosRecebendo] = useState<CasoRecebendo[]>([])
  const [historicoRec,  setHistoricoRec]  = useState<HistoricoItem[]>([])
  const [loadingRec,    setLoadingRec]    = useState(true)
  const [loadingHist,   setLoadingHist]   = useState(true)

  // Estado modo supervisor
  const [tabS,       setTabS]       = useState<TabSupervisor>('painel')
  const [requests,   setRequests]   = useState<RequestInbox[]>([])
  const [loadingReq, setLoadingReq] = useState(true)

  // ── Carregar dados modo terapeuta ────────────────────────────────────────
  useEffect(() => {
    if (!terapeuta) { setLoadingRec(false); setLoadingHist(false); return }

    // Casos que estou recebendo supervisão
    const carregarCasos = async () => {
      const { data } = await supabase
        .from('supervisor_requests')
        .select('id, status, criado_em, mensagem, supervisor_id')
        .eq('terapeuta_id', terapeuta.id)
        .in('status', ['pendente', 'em_andamento'])
        .order('criado_em', { ascending: false })

      if (!data || data.length === 0) { setCasosRecebendo([]); setLoadingRec(false); return }
      const ids = [...new Set(data.map((r: any) => r.supervisor_id))]
      const { data: perfis } = await supabase.from('profiles').select('id, nome').in('id', ids)
      const map = new Map<string, string>()
      for (const p of (perfis ?? [])) map.set(p.id, p.nome ?? 'Supervisor')
      setCasosRecebendo(data.map((r: any) => ({
        id: r.id, supervisor_nome: map.get(r.supervisor_id) ?? 'Supervisor',
        foco: r.mensagem ?? 'Supervisão clínica', status: r.status === 'em_andamento' ? 'ativo' : 'pendente',
        criado_em: r.criado_em,
      })))
      setLoadingRec(false)
    }

    // Histórico resolvido
    const carregarHist = async () => {
      const { data } = await supabase
        .from('supervisor_requests')
        .select('id, resolvido_em, criado_em, mensagem, supervisor_id')
        .eq('terapeuta_id', terapeuta.id)
        .eq('status', 'resolvido')
        .order('resolvido_em', { ascending: false })
        .limit(20)

      if (!data || data.length === 0) { setHistoricoRec([]); setLoadingHist(false); return }
      const ids = [...new Set(data.map((r: any) => r.supervisor_id))]
      const { data: perfis } = await supabase.from('profiles').select('id, nome').in('id', ids)
      const map = new Map<string, string>()
      for (const p of (perfis ?? [])) map.set(p.id, p.nome ?? 'Supervisor')
      setHistoricoRec(data.map((r: any) => ({
        id: r.id, supervisor_nome: map.get(r.supervisor_id) ?? 'Supervisor',
        foco: r.mensagem ?? '', data: r.resolvido_em ?? r.criado_em,
      })))
      setLoadingHist(false)
    }

    carregarCasos()
    carregarHist()
  }, [terapeuta])

  // ── Carregar dados modo supervisor ───────────────────────────────────────
  useEffect(() => {
    if (!terapeuta || !isSupervisor) { setLoadingReq(false); return }

    supabase
      .from('supervisor_requests')
      .select('id, status, criado_em, mensagem, terapeuta_id, programa_nome')
      .eq('supervisor_id', terapeuta.id)
      .neq('status', 'resolvido')
      .order('criado_em', { ascending: false })
      .then(async ({ data }) => {
        if (!data || data.length === 0) { setRequests([]); setLoadingReq(false); return }
        const ids = [...new Set(data.map((r: any) => r.terapeuta_id))]
        const { data: perfis } = await supabase.from('profiles').select('id, nome').in('id', ids)
        const map = new Map<string, string>()
        for (const p of (perfis ?? [])) map.set(p.id, p.nome ?? 'Terapeuta')
        setRequests(data.map((r: any) => ({
          id: r.id, terapeuta_nome: map.get(r.terapeuta_id) ?? 'Terapeuta',
          mensagem: r.mensagem ?? '', status: r.status,
          criado_em: r.criado_em, programa_nome: r.programa_nome ?? null,
        })))
        setLoadingReq(false)
      })
  }, [terapeuta, isSupervisor])

  async function handleAcaoRequest(id: string, acao: 'em_andamento' | 'resolvido') {
    await supabase.from('supervisor_requests')
      .update({ status: acao, ...(acao === 'resolvido' ? { resolvido_em: new Date().toISOString() } : {}) })
      .eq('id', id)
    setRequests(prev => acao === 'resolvido'
      ? prev.filter(r => r.id !== id)
      : prev.map(r => r.id === id ? { ...r, status: acao } : r)
    )
  }

  const naoLidas = 0 // alimentado via notificacoes quando supervisor

  // ── Header dinâmico ──────────────────────────────────────────────────────
  const headerLabel = isSupervisor
    ? 'Supervisão que você ministra'
    : 'Supervisão clínica'
  const headerSub = isSupervisor
    ? 'Gerencie os terapeutas que você supervisiona e sua equipe de aplicadores'
    : 'Suporte clínico especializado para seus casos'

  return (
    <div style={{ minHeight: '100vh', background: c.bg, color: c.text, fontFamily: 'var(--font-sans, system-ui)', padding: '32px' }}>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 8 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(139,127,232,.2)', border: '1px solid rgba(139,127,232,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c.purple} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: 'rgba(255,255,255,.95)' }}>
              {headerLabel}
            </h1>
            <p style={{ fontSize: 13, color: c.muted, margin: 0 }}>{headerSub}</p>
          </div>
          {isSupervisor && (
            <div style={{ marginLeft: 'auto' }}>
              <Badge label="Você supervisiona" cor={c.purple} />
            </div>
          )}
        </div>
      </div>

      {/* ── MODO TERAPEUTA ── */}
      {!isSupervisor && (
        <>
          <TabBar
            tabs={[
              { id: 'minha-supervisao',   label: 'Minha Supervisão' },
              { id: 'buscar-supervisor',  label: 'Buscar Supervisor' },
              { id: 'historico',          label: 'Histórico' },
            ]}
            active={tabT}
            onChange={id => setTabT(id as TabTerapeuta)}
          />
          {tabT === 'minha-supervisao'  && <MinhaSupervisaoTab   casos={casosRecebendo} loading={loadingRec} />}
          {tabT === 'buscar-supervisor' && <BuscarSupervisorTab   terapeutaId={terapeuta?.id ?? ''} />}
          {tabT === 'historico'         && <HistoricoRecebidoTab  historico={historicoRec} loading={loadingHist} />}
        </>
      )}

      {/* ── MODO SUPERVISOR / COORDENADOR ── */}
      {isSupervisor && (
        <>
          <TabBar
            tabs={[
              { id: 'painel',              label: 'Painel',       badge: requests.filter(r => r.status === 'pendente').length },
              { id: 'minha-equipe',        label: 'Minha Equipe'  },
              { id: 'historico-ministrado',label: 'Histórico'     },
            ]}
            active={tabS}
            onChange={id => setTabS(id as TabSupervisor)}
          />
          {tabS === 'painel'               && <PainelSupervisorTab   requests={requests} loading={loadingReq} onAcao={handleAcaoRequest} />}
          {tabS === 'minha-equipe'         && <MinhaEquipeTab         supervisorId={terapeuta?.id ?? ''} nivel={nivel} />}
          {tabS === 'historico-ministrado' && <HistoricoMinistradoTab supervisorId={terapeuta?.id ?? ''} />}
        </>
      )}

    </div>
  )
}
