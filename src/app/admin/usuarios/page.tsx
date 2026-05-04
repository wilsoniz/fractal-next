'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

// ── Tipos ─────────────────────────────────────────────────────────────────────
interface Usuario {
  id: string
  email: string
  nome: string | null
  tipo: 'responsavel' | 'terapeuta' | 'supervisor' | 'coordenador' | 'admin' | 'desconhecido'
  nivel: string | null
  criado_em: string
  criancas: number
  sessoes: number
  isento_comissao: boolean
  visivel_fractacare: boolean
}

type FiltroTipo = 'todos' | 'responsavel' | 'terapeuta' | 'supervisor' | 'coordenador' | 'admin'

const ADMIN_EMAIL = 'wilson@fractabehavior.com'

const TIPO_CONFIG: Record<string, { label: string; cor: string }> = {
  responsavel:  { label: 'Responsável',  cor: '#1D9E75' },
  terapeuta:    { label: 'Terapeuta',    cor: '#63b3ed' },
  coordenador:  { label: 'Coordenador',  cor: '#EF9F27' },
  supervisor:   { label: 'Supervisor',   cor: '#8B7FE8' },
  admin:        { label: 'Admin',        cor: '#E05A4B' },
  desconhecido: { label: 'Desconhecido', cor: '#4d6d8a' },
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function Badge({ label, cor }: { label: string; cor: string }) {
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
      background: `${cor}18`, border: `1px solid ${cor}33`, color: cor,
      textTransform: 'uppercase' as const, letterSpacing: '0.06em',
    }}>{label}</span>
  )
}

function tempoRelativo(data: string) {
  const diff = Date.now() - new Date(data).getTime()
  const d = Math.floor(diff / 86400000)
  if (d === 0) return 'hoje'
  if (d === 1) return 'ontem'
  if (d < 30) return `${d} dias atrás`
  const m = Math.floor(d / 30)
  return `${m} ${m === 1 ? 'mês' : 'meses'} atrás`
}

// Determina tipo a partir do nivel_senioridade — fonte de verdade
function resolverTipo(email: string, nivel: string | null): Usuario['tipo'] {
  if (email === ADMIN_EMAIL) return 'admin'
  if (!nivel) return 'responsavel' // sem nível = usuário do FractaCare
  if (nivel === 'supervisor')  return 'supervisor'
  if (nivel === 'coordenador') return 'coordenador'
  if (nivel === 'terapeuta' || nivel === 'abat' || nivel === 'qasp_s' || nivel === 'qba') return 'terapeuta'
  return 'desconhecido'
}

const card: React.CSSProperties = {
  background: 'rgba(10,15,30,.7)',
  border: '1px solid rgba(99,179,237,.08)',
  borderRadius: 16,
  backdropFilter: 'blur(10px)',
}

const inp: React.CSSProperties = {
  width: '100%', padding: '10px 12px', borderRadius: 9,
  border: '1px solid rgba(99,179,237,.12)',
  background: 'rgba(99,179,237,.04)', color: '#e2e8f0',
  fontSize: 13, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' as const,
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function AdminUsuariosPage() {
  const [usuarios,    setUsuarios]    = useState<Usuario[]>([])
  const [loading,     setLoading]     = useState(true)
  const [filtro,      setFiltro]      = useState<FiltroTipo>('todos')
  const [busca,       setBusca]       = useState('')
  const [selecionado, setSelecionado] = useState<Usuario | null>(null)
  const [salvando,    setSalvando]    = useState(false)
  const [modalCriar,  setModalCriar]  = useState(false)
  const [criando,     setCriando]     = useState(false)
  const [msg,         setMsg]         = useState('')
  const [novoEmail,   setNovoEmail]   = useState('')
  const [novoNome,    setNovoNome]    = useState('')
  const [novoTipo,    setNovoTipo]    = useState<'terapeuta' | 'responsavel'>('terapeuta')
  const [novaSenha,   setNovaSenha]   = useState('')

  useEffect(() => { carregar() }, [])

  async function carregar() {
    setLoading(true)
    try {
      // Busca todos os profiles com colunas reais
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, nome, email, criado_em, nivel_senioridade, isento_comissao, visivel_fractacare')
        .order('criado_em', { ascending: false })

      if (error) throw error
      if (!profiles) { setLoading(false); return }

      // Busca criancas agrupadas por responsavel_id
      const { data: criancasRaw } = await supabase
        .from('criancas')
        .select('responsavel_id')

      const criancasPorUser = new Map<string, number>()
      for (const c of (criancasRaw ?? [])) {
        if (c.responsavel_id) {
          criancasPorUser.set(c.responsavel_id, (criancasPorUser.get(c.responsavel_id) ?? 0) + 1)
        }
      }

      // Busca sessões agrupadas por terapeuta_id
      const { data: sessoesRaw } = await supabase
        .from('sessoes_clinicas')
        .select('terapeuta_id')

      const sessoesPorUser = new Map<string, number>()
      for (const s of (sessoesRaw ?? [])) {
        if (s.terapeuta_id) {
          sessoesPorUser.set(s.terapeuta_id, (sessoesPorUser.get(s.terapeuta_id) ?? 0) + 1)
        }
      }

      const result: Usuario[] = profiles.map((p: any) => {
        const nivel = p.nivel_senioridade as string | null
        const email = p.email ?? ''
        const tipo  = resolverTipo(email, nivel)

        return {
          id:                 p.id,
          email,
          nome:               p.nome ?? null,
          tipo,
          nivel,
          criado_em:          p.criado_em ?? '',
          criancas:           criancasPorUser.get(p.id) ?? 0,
          sessoes:            sessoesPorUser.get(p.id) ?? 0,
          isento_comissao:    p.isento_comissao ?? false,
          visivel_fractacare: p.visivel_fractacare ?? false,
        }
      })

      setUsuarios(result)
    } catch (err) {
      console.error('Erro ao carregar usuários:', err)
    }
    setLoading(false)
  }

  async function criarUsuario() {
    if (!novoEmail || !novaSenha || !novoNome) return
    setCriando(true)
    setMsg('')
    try {
      const { data, error } = await supabase.auth.signUp({
        email:    novoEmail,
        password: novaSenha,
        options:  { data: { nome: novoNome } },
      })
      if (error) { setMsg(`Erro: ${error.message}`); setCriando(false); return }
      if (data.user) {
        await supabase.from('profiles').upsert({
          id:                data.user.id,
          nome:              novoNome,
          email:             novoEmail,
          nivel_senioridade: novoTipo === 'terapeuta' ? 'terapeuta' : null,
        })
      }
      setMsg('Usuário criado com sucesso!')
      setModalCriar(false)
      setNovoEmail(''); setNovoNome(''); setNovaSenha('')
      await carregar()
    } catch {
      setMsg('Erro ao criar usuário.')
    }
    setCriando(false)
  }

  async function atualizarNivel(userId: string, nivel: string) {
    setSalvando(true)
    await supabase.from('profiles').update({ nivel_senioridade: nivel }).eq('id', userId)
    const novoTipo = resolverTipo(selecionado?.email ?? '', nivel)
    setSelecionado(prev => prev ? { ...prev, nivel, tipo: novoTipo } : null)
    setUsuarios(prev => prev.map(u => u.id === userId ? { ...u, nivel, tipo: novoTipo } : u))
    setSalvando(false)
  }

  async function toggleIsencao(userId: string, isento: boolean, motivo: string) {
    await supabase.from('profiles').update({
      isento_comissao: isento,
      motivo_isencao:  motivo,
      isento_desde:    isento ? new Date().toISOString() : null,
    }).eq('id', userId)
    setUsuarios(prev => prev.map(u => u.id === userId ? { ...u, isento_comissao: isento } : u))
    setSelecionado(prev => prev && prev.id === userId ? { ...prev, isento_comissao: isento } : prev)
  }

  async function excluirUsuario(userId: string) {
    if (!confirm('Tem certeza? Esta ação não pode ser desfeita.')) return
    await supabase.from('profiles').delete().eq('id', userId)
    setSelecionado(null)
    setUsuarios(prev => prev.filter(u => u.id !== userId))
  }

  const filtrados = usuarios.filter(u => {
    const matchFiltro = filtro === 'todos' || u.tipo === filtro
    const matchBusca  = !busca
      || (u.email).toLowerCase().includes(busca.toLowerCase())
      || (u.nome ?? '').toLowerCase().includes(busca.toLowerCase())
    return matchFiltro && matchBusca
  })

  const stats = {
    total:       usuarios.length,
    responsaveis: usuarios.filter(u => u.tipo === 'responsavel').length,
    terapeutas:  usuarios.filter(u => u.tipo === 'terapeuta' || u.tipo === 'coordenador' || u.tipo === 'supervisor').length,
    admins:      usuarios.filter(u => u.tipo === 'admin').length,
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
      <div style={{ width: 32, height: 32, borderRadius: '50%', border: '2px solid rgba(99,179,237,.2)', borderTopColor: '#63b3ed', animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#fff', margin: 0, marginBottom: 6, letterSpacing: '-0.02em' }}>Usuários</h1>
          <div style={{ fontSize: 13, color: 'rgba(226,232,240,.4)' }}>Gestão de acesso e permissões do ecossistema</div>
        </div>
        <button onClick={() => { setModalCriar(true); setMsg('') }} style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 18px', borderRadius: 10, border: 'none',
          background: 'linear-gradient(135deg, #1D9E75, #63b3ed)',
          color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Novo usuário
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
        {[
          { label: 'Total',        v: stats.total,        cor: '#63b3ed', f: 'todos'       },
          { label: 'Responsáveis', v: stats.responsaveis, cor: '#1D9E75', f: 'responsavel' },
          { label: 'Profissionais',v: stats.terapeutas,   cor: '#8B7FE8', f: 'terapeuta'   },
          { label: 'Admins',       v: stats.admins,       cor: '#E05A4B', f: 'admin'       },
        ].map(s => (
          <button key={s.f} onClick={() => setFiltro(s.f as FiltroTipo)} style={{
            ...card, padding: '16px 18px', cursor: 'pointer', textAlign: 'left',
            border: `1px solid ${filtro === s.f ? s.cor + '33' : 'rgba(99,179,237,.08)'}`,
            background: filtro === s.f ? `${s.cor}0f` : 'rgba(10,15,30,.7)',
          }}>
            <div style={{ fontSize: 11, color: 'rgba(226,232,240,.4)', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: 8 }}>{s.label}</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: s.cor }}>{s.v}</div>
          </button>
        ))}
      </div>

      {/* Busca */}
      <div style={{ position: 'relative' }}>
        <svg style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', opacity: .4 }} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#e2e8f0" strokeWidth="2">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          value={busca} onChange={e => setBusca(e.target.value)}
          placeholder="Buscar por nome ou email..."
          style={{ ...inp, padding: '11px 14px 11px 42px' }}
        />
      </div>

      {/* Tabela */}
      <div style={{ ...card, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 120px', padding: '12px 20px', borderBottom: '1px solid rgba(99,179,237,.08)', fontSize: 10, color: 'rgba(226,232,240,.35)', textTransform: 'uppercase' as const, letterSpacing: '0.08em' }}>
          <span>Usuário</span><span>Tipo</span><span>Pacientes</span><span>Sessões</span><span>Cadastro</span><span>Ações</span>
        </div>

        {filtrados.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', fontSize: 13, color: 'rgba(226,232,240,.3)' }}>
            Nenhum usuário encontrado
          </div>
        ) : filtrados.map((u, i) => {
          const tc = TIPO_CONFIG[u.tipo] ?? TIPO_CONFIG.desconhecido
          return (
            <div key={u.id} style={{
              display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 120px',
              padding: '14px 20px', alignItems: 'center',
              borderBottom: i < filtrados.length - 1 ? '1px solid rgba(99,179,237,.05)' : 'none',
              transition: 'background .15s',
            }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(99,179,237,.03)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0', marginBottom: 2 }}>
                  {u.nome ?? '—'}
                  {u.email === ADMIN_EMAIL && <span style={{ marginLeft: 6, fontSize: 10, color: '#EF9F27' }}>Founder</span>}
                  {u.isento_comissao && <span style={{ marginLeft: 6, fontSize: 10, color: '#1D9E75' }}>Isento</span>}
                </div>
                <div style={{ fontSize: 11, color: 'rgba(226,232,240,.4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{u.email}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 4 }}>
                <Badge label={tc.label} cor={tc.cor} />
                {u.nivel && u.nivel !== 'terapeuta' && (
                  <span style={{ fontSize: 9, color: 'rgba(226,232,240,.3)', textTransform: 'uppercase' as const }}>{u.nivel}</span>
                )}
              </div>
              <div style={{ fontSize: 13, color: 'rgba(226,232,240,.6)' }}>{u.criancas}</div>
              <div style={{ fontSize: 13, color: 'rgba(226,232,240,.6)' }}>{u.sessoes}</div>
              <div style={{ fontSize: 11, color: 'rgba(226,232,240,.35)' }}>{u.criado_em ? tempoRelativo(u.criado_em) : '—'}</div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => setSelecionado(u)} style={{ padding: '5px 10px', borderRadius: 7, border: '1px solid rgba(99,179,237,.2)', background: 'transparent', color: '#63b3ed', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>
                  Detalhes
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Modal detalhes */}
      {selecionado && (
        <ModalDetalhes
          usuario={selecionado}
          salvando={salvando}
          onClose={() => setSelecionado(null)}
          onNivel={(nivel) => atualizarNivel(selecionado.id, nivel)}
          onIsencao={(isento, motivo) => toggleIsencao(selecionado.id, isento, motivo)}
          onExcluir={() => excluirUsuario(selecionado.id)}
        />
      )}

      {/* Modal criar */}
      {modalCriar && (
        <div onClick={() => setModalCriar(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ ...card, padding: 28, width: '100%', maxWidth: 440, border: '1px solid rgba(99,179,237,.15)' }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 4 }}>Criar novo usuário</div>
            <div style={{ fontSize: 12, color: 'rgba(226,232,240,.4)', marginBottom: 24 }}>O usuário receberá acesso à plataforma</div>
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 14 }}>
              {[
                { label: 'Nome completo', value: novoNome,  setter: setNovoNome,  type: 'text',     placeholder: 'Ex: João Silva'    },
                { label: 'Email',         value: novoEmail, setter: setNovoEmail, type: 'email',    placeholder: 'joao@email.com'    },
                { label: 'Senha inicial', value: novaSenha, setter: setNovaSenha, type: 'password', placeholder: '••••••••'          },
              ].map(f => (
                <div key={f.label}>
                  <label style={{ fontSize: 11, color: 'rgba(226,232,240,.4)', textTransform: 'uppercase' as const, letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>{f.label}</label>
                  <input type={f.type} value={f.value} onChange={e => f.setter(e.target.value)} placeholder={f.placeholder} style={inp} />
                </div>
              ))}
              <div>
                <label style={{ fontSize: 11, color: 'rgba(226,232,240,.4)', textTransform: 'uppercase' as const, letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>Tipo de acesso</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {(['terapeuta', 'responsavel'] as const).map(t => (
                    <button key={t} onClick={() => setNovoTipo(t)} style={{
                      flex: 1, padding: '9px', borderRadius: 9, cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 600,
                      border: `1px solid ${novoTipo === t ? '#63b3ed44' : 'rgba(99,179,237,.1)'}`,
                      background: novoTipo === t ? 'rgba(99,179,237,.1)' : 'transparent',
                      color: novoTipo === t ? '#63b3ed' : 'rgba(226,232,240,.4)',
                    }}>{t === 'terapeuta' ? 'Terapeuta' : 'Responsável'}</button>
                  ))}
                </div>
              </div>
              {msg && (
                <div style={{ fontSize: 12, borderRadius: 8, padding: '10px 12px', color: msg.includes('Erro') ? '#fc8181' : '#68d391', background: msg.includes('Erro') ? 'rgba(224,90,75,.08)' : 'rgba(29,158,117,.08)', border: `1px solid ${msg.includes('Erro') ? 'rgba(224,90,75,.2)' : 'rgba(29,158,117,.2)'}` }}>
                  {msg}
                </div>
              )}
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button onClick={() => setModalCriar(false)} style={{ flex: 1, padding: '11px', borderRadius: 9, border: '1px solid rgba(99,179,237,.15)', background: 'transparent', color: 'rgba(226,232,240,.5)', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
                  Cancelar
                </button>
                <button onClick={criarUsuario} disabled={criando || !novoEmail || !novoNome || !novaSenha} style={{ flex: 2, padding: '11px', borderRadius: 9, border: 'none', background: 'linear-gradient(135deg, #1D9E75, #63b3ed)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: criando ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: criando ? 0.7 : 1 }}>
                  {criando ? 'Criando...' : 'Criar usuário'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Modal Detalhes ────────────────────────────────────────────────────────────
function ModalDetalhes({ usuario, salvando, onClose, onNivel, onIsencao, onExcluir }: {
  usuario: Usuario
  salvando: boolean
  onClose: () => void
  onNivel: (nivel: string) => void
  onIsencao: (isento: boolean, motivo: string) => void
  onExcluir: () => void
}) {
  const [isento,  setIsento]  = useState(usuario.isento_comissao)
  const [motivo,  setMotivo]  = useState('')
  const [salvandoIsencao, setSalvandoIsencao] = useState(false)
  const tc = TIPO_CONFIG[usuario.tipo] ?? TIPO_CONFIG.desconhecido
  const ehProfissional = ['terapeuta','coordenador','supervisor'].includes(usuario.tipo)

  useEffect(() => {
    supabase.from('profiles').select('motivo_isencao').eq('id', usuario.id).single()
      .then(({ data }) => { if (data) setMotivo(data.motivo_isencao ?? '') })
  }, [usuario.id])

  async function salvarIsencao() {
    setSalvandoIsencao(true)
    await onIsencao(isento, motivo)
    setSalvandoIsencao(false)
  }

  const card: React.CSSProperties = { background: 'rgba(10,15,30,.7)', border: '1px solid rgba(99,179,237,.08)', borderRadius: 16, backdropFilter: 'blur(10px)' }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ ...card, padding: 28, width: '100%', maxWidth: 500, border: '1px solid rgba(99,179,237,.15)', maxHeight: '90vh', overflowY: 'auto' as const }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: 'linear-gradient(135deg, #1D9E75, #63b3ed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
            {(usuario.nome ?? usuario.email).slice(0,2).toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 4 }}>{usuario.nome ?? '—'}</div>
            <div style={{ fontSize: 12, color: 'rgba(226,232,240,.5)' }}>{usuario.email}</div>
          </div>
          <Badge label={tc.label} cor={tc.cor} />
        </div>

        {/* Info */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
          {[
            { l: 'Pacientes vinculados', v: usuario.criancas },
            { l: 'Sessões registradas',  v: usuario.sessoes  },
            { l: 'Nível',                v: usuario.nivel ?? '—' },
            { l: 'Cadastro',             v: usuario.criado_em ? tempoRelativo(usuario.criado_em) : '—' },
          ].map(r => (
            <div key={r.l} style={{ background: 'rgba(99,179,237,.05)', borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ fontSize: 10, color: 'rgba(226,232,240,.35)', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: 4 }}>{r.l}</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#e2e8f0' }}>{r.v}</div>
            </div>
          ))}
        </div>

        {/* Nível de senioridade — só para profissionais */}
        {ehProfissional && (
          <div style={{ padding: 14, borderRadius: 9, border: '1px solid rgba(139,127,232,.2)', background: 'rgba(139,127,232,.04)', marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: 'rgba(226,232,240,.4)', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: 10 }}>Nível de senioridade</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const }}>
              {([
                { id: 'terapeuta',   label: 'Terapeuta',   cor: '#1D9E75' },
                { id: 'coordenador', label: 'Coordenador', cor: '#EF9F27' },
                { id: 'supervisor',  label: 'Supervisor',  cor: '#8B7FE8' },
              ] as const).map(n => (
                <button key={n.id} onClick={() => onNivel(n.id)} disabled={salvando} style={{
                  flex: 1, padding: '8px 6px', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit', fontSize: 11, fontWeight: 600,
                  border: `1px solid ${usuario.nivel === n.id ? n.cor + '55' : 'rgba(139,127,232,.15)'}`,
                  background: usuario.nivel === n.id ? n.cor + '18' : 'transparent',
                  color: usuario.nivel === n.id ? n.cor : 'rgba(226,232,240,.4)',
                  opacity: salvando ? 0.6 : 1,
                }}>{n.label}</button>
              ))}
            </div>
          </div>
        )}

        {/* Isenção de comissão — só para profissionais */}
        {ehProfissional && (
          <div style={{ padding: 14, borderRadius: 9, border: '1px solid rgba(239,159,39,.2)', background: 'rgba(239,159,39,.04)', marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: 'rgba(226,232,240,.4)', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: 10 }}>Isenção de comissão</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: isento ? 10 : 0 }}>
              <span style={{ fontSize: 13, color: 'rgba(226,232,240,.7)' }}>Isento de comissão</span>
              <button onClick={() => setIsento(!isento)} style={{ width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', background: isento ? '#EF9F27' : 'rgba(226,232,240,.15)', position: 'relative', transition: 'background 0.2s' }}>
                <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, transition: 'left 0.2s', left: isento ? 23 : 3 }} />
              </button>
            </div>
            {isento && (
              <input value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Motivo da isenção..."
                style={{ width: '100%', padding: '8px 10px', borderRadius: 7, boxSizing: 'border-box' as const, border: '1px solid rgba(239,159,39,.2)', background: 'rgba(239,159,39,.06)', color: '#e2e8f0', fontSize: 12, fontFamily: 'inherit', outline: 'none', marginBottom: 8 }}
              />
            )}
            <button onClick={salvarIsencao} disabled={salvandoIsencao} style={{ width: '100%', padding: '8px', borderRadius: 7, border: 'none', cursor: 'pointer', background: 'rgba(239,159,39,.15)', color: '#EF9F27', fontSize: 12, fontWeight: 600, fontFamily: 'inherit' }}>
              {salvandoIsencao ? 'Salvando...' : 'Salvar isenção'}
            </button>
          </div>
        )}

        {/* Excluir */}
        {usuario.email !== ADMIN_EMAIL && (
          <button onClick={onExcluir} style={{ width: '100%', padding: '10px 14px', borderRadius: 9, border: '1px solid rgba(224,90,75,.2)', background: 'rgba(224,90,75,.06)', color: '#E05A4B', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' as const, marginBottom: 12 }}>
            Excluir usuário do sistema
          </button>
        )}

        <button onClick={onClose} style={{ width: '100%', padding: '10px', borderRadius: 9, border: '1px solid rgba(99,179,237,.15)', background: 'transparent', color: 'rgba(226,232,240,.5)', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
          Fechar
        </button>
      </div>
    </div>
  )
}
