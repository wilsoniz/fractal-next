'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

// ── Tipos ─────────────────────────────────────────────────────────────────────
interface Usuario {
  id: string
  email: string
  nome: string | null
  tipo: 'responsavel' | 'terapeuta' | 'admin' | 'desconhecido'
  nivel: string | null
  criado_em: string
  ultimo_acesso: string | null
  criancas: number
  sessoes: number
  acesso_especial: boolean
}

type FiltroTipo = 'todos' | 'responsavel' | 'terapeuta' | 'admin'

// ── Helpers ───────────────────────────────────────────────────────────────────
function Badge({ label, cor }: { label: string; cor: string }) {
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
      background: `${cor}18`, border: `1px solid ${cor}33`, color: cor,
      textTransform: 'uppercase', letterSpacing: '0.06em',
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

// ── Page ──────────────────────────────────────────────────────────────────────
export default function AdminUsuariosPage() {
  const [usuarios,  setUsuarios]  = useState<Usuario[]>([])
  const [loading,   setLoading]   = useState(true)
  const [filtro,    setFiltro]    = useState<FiltroTipo>('todos')
  const [busca,     setBusca]     = useState('')
  const [selecionado, setSelecionado] = useState<Usuario | null>(null)
  const [salvando,  setSalvando]  = useState(false)
  const [novoEmail, setNovoEmail] = useState('')
  const [novoNome,  setNovoNome]  = useState('')
  const [novoTipo,  setNovoTipo]  = useState<'responsavel' | 'terapeuta'>('terapeuta')
  const [novaSenha, setNovaSenha] = useState('')
  const [modalCriar, setModalCriar] = useState(false)
  const [criando,   setCriando]   = useState(false)
  const [msg,       setMsg]       = useState('')

  useEffect(() => { carregar() }, [])

  async function carregar() {
    setLoading(true)
    try {
      // Buscar profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, nome, email, criado_em')
        .order('criado_em', { ascending: false })

      if (!profiles) { setLoading(false); return }

      // Para cada profile, buscar criancas e sessoes
      const result: Usuario[] = await Promise.all(
        profiles.map(async (p: any) => {
          const [
            { count: criancas },
            { count: sessoes },
          ] = await Promise.all([
            supabase.from('criancas').select('*', { count: 'exact', head: true }).eq('responsavel_id', p.id),
            supabase.from('sessoes_clinicas').select('*', { count: 'exact', head: true }).eq('responsavel_id', p.id),
          ])

          const tipo: Usuario['tipo'] = p.email === 'wilson@fractabehavior.com' ? 'admin'
            : (criancas ?? 0) > 0 ? 'responsavel'
            : 'terapeuta'

          return {
            id:            p.id,
            email:         p.email ?? '',
            nome:          p.nome,
            tipo,
            nivel:         null,
            criado_em:     p.criado_em ?? '',
            ultimo_acesso: null,
            criancas:      criancas ?? 0,
            sessoes:       sessoes ?? 0,
            acesso_especial: false,
          }
        })
      )
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
      // Criar no Supabase Auth via admin (apenas funciona com service role — aqui usamos o client normal)
      const { data, error } = await supabase.auth.signUp({
        email: novoEmail,
        password: novaSenha,
        options: { data: { nome: novoNome } },
      })
      if (error) { setMsg(`Erro: ${error.message}`); setCriando(false); return }

      // Criar profile
      if (data.user) {
        await supabase.from('profiles').upsert({
          id:    data.user.id,
          nome:  novoNome,
          email: novoEmail,
          nivel_senioridade: novoTipo === 'terapeuta' ? 'terapeuta' : null,
        })
      }
      setMsg('Usuário criado com sucesso!')
      setModalCriar(false)
      setNovoEmail(''); setNovoNome(''); setNovaSenha('')
      await carregar()
    } catch (err) {
      setMsg('Erro ao criar usuário.')
    }
    setCriando(false)
  }

  const TIPO_CONFIG = {
    responsavel:  { label: 'Responsável', cor: '#1D9E75' },
    terapeuta:    { label: 'Terapeuta',   cor: '#63b3ed' },
    admin:        { label: 'Admin',       cor: '#8B7FE8' },
    desconhecido: { label: 'Desconhecido',cor: '#4d6d8a' },
  }

  const filtrados = usuarios.filter(u => {
    const matchFiltro = filtro === 'todos' || u.tipo === filtro
    const matchBusca  = !busca || u.email.includes(busca) || (u.nome ?? '').toLowerCase().includes(busca.toLowerCase())
    return matchFiltro && matchBusca
  })

  const stats = {
    total:       usuarios.length,
    responsaveis: usuarios.filter(u => u.tipo === 'responsavel').length,
    terapeutas:  usuarios.filter(u => u.tipo === 'terapeuta').length,
    admins:      usuarios.filter(u => u.tipo === 'admin').length,
  }

  const card: React.CSSProperties = {
    background: 'rgba(10,15,30,.7)',
    border: '1px solid rgba(99,179,237,.08)',
    borderRadius: 16, backdropFilter: 'blur(10px)',
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
      <div style={{ width: 32, height: 32, borderRadius: '50%', border: '2px solid rgba(99,179,237,.2)', borderTop: '2px solid #63b3ed', animation: 'spin 1s linear infinite' }} />
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
        <button onClick={() => setModalCriar(true)} style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 18px', borderRadius: 10, border: 'none',
          background: 'linear-gradient(135deg, #1D9E75, #63b3ed)',
          color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
          fontFamily: 'inherit',
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
          { label: 'Terapeutas',   v: stats.terapeutas,   cor: '#63b3ed', f: 'terapeuta'   },
          { label: 'Admins',       v: stats.admins,       cor: '#8B7FE8', f: 'admin'       },
        ].map(s => (
          <button key={s.f} onClick={() => setFiltro(s.f as FiltroTipo)} style={{
            ...card, padding: '16px 18px', cursor: 'pointer', textAlign: 'left',
            border: `1px solid ${filtro === s.f ? s.cor + '33' : 'rgba(99,179,237,.08)'}`,
            background: filtro === s.f ? `${s.cor}0f` : 'rgba(10,15,30,.7)',
          }}>
            <div style={{ fontSize: 11, color: 'rgba(226,232,240,.4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>{s.label}</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: s.cor }}>{s.v}</div>
          </button>
        ))}
      </div>

      {/* Busca */}
      <div style={{ position: 'relative' }}>
        <svg style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', opacity: .4 }} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#e2e8f0" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input
          value={busca} onChange={e => setBusca(e.target.value)}
          placeholder="Buscar por nome ou email..."
          style={{
            width: '100%', padding: '11px 14px 11px 42px', borderRadius: 10,
            border: '1px solid rgba(99,179,237,.1)',
            background: 'rgba(10,15,30,.7)', color: '#e2e8f0',
            fontSize: 13, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
          }}
        />
      </div>

      {/* Tabela */}
      <div style={{ ...card, overflow: 'hidden' }}>
        {/* Header da tabela */}
        <div style={{
          display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 120px',
          padding: '12px 20px', borderBottom: '1px solid rgba(99,179,237,.08)',
          fontSize: 10, color: 'rgba(226,232,240,.35)', textTransform: 'uppercase', letterSpacing: '0.08em',
        }}>
          <span>Usuário</span><span>Tipo</span><span>Pacientes</span><span>Sessões</span><span>Cadastro</span><span>Ações</span>
        </div>

        {filtrados.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', fontSize: 13, color: 'rgba(226,232,240,.3)' }}>
            Nenhum usuário encontrado
          </div>
        ) : (
          filtrados.map((u, i) => {
            const tc = TIPO_CONFIG[u.tipo]
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
                    {u.acesso_especial && <span style={{ marginLeft: 6, fontSize: 10, color: '#EF9F27' }}>★ Founder</span>}
                  </div>
                  <div style={{ fontSize: 11, color: 'rgba(226,232,240,.4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</div>
                </div>
                <div><Badge label={tc.label} cor={tc.cor} /></div>
                <div style={{ fontSize: 13, color: 'rgba(226,232,240,.6)' }}>{u.criancas}</div>
                <div style={{ fontSize: 13, color: 'rgba(226,232,240,.6)' }}>{u.sessoes}</div>
                <div style={{ fontSize: 11, color: 'rgba(226,232,240,.35)' }}>{u.criado_em ? tempoRelativo(u.criado_em) : '—'}</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => setSelecionado(u)} style={{
                    padding: '5px 10px', borderRadius: 7, border: '1px solid rgba(99,179,237,.2)',
                    background: 'transparent', color: '#63b3ed', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit',
                  }}>Detalhes</button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Modal detalhes */}
      {selecionado && (
        <div onClick={() => setSelecionado(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ ...card, padding: 28, width: '100%', maxWidth: 480, border: '1px solid rgba(99,179,237,.15)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
              <div style={{
                width: 48, height: 48, borderRadius: 12,
                background: 'linear-gradient(135deg, #1D9E75, #63b3ed)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 16, fontWeight: 800, color: '#fff', flexShrink: 0,
              }}>
                {(selecionado.nome ?? selecionado.email).slice(0,2).toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 4 }}>{selecionado.nome ?? '—'}</div>
                <div style={{ fontSize: 12, color: 'rgba(226,232,240,.5)' }}>{selecionado.email}</div>
              </div>
              <Badge label={TIPO_CONFIG[selecionado.tipo].label} cor={TIPO_CONFIG[selecionado.tipo].cor} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
              {[
                { l: 'Pacientes vinculados', v: selecionado.criancas },
                { l: 'Sessões registradas',  v: selecionado.sessoes  },
                { l: 'Cadastro',             v: selecionado.criado_em ? tempoRelativo(selecionado.criado_em) : '—' },
                { l: 'ID',                   v: selecionado.id.slice(0,8) + '...' },
              ].map(r => (
                <div key={r.l} style={{ background: 'rgba(99,179,237,.05)', borderRadius: 10, padding: '12px 14px' }}>
                  <div style={{ fontSize: 10, color: 'rgba(226,232,240,.35)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>{r.l}</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#e2e8f0' }}>{r.v}</div>
                </div>
              ))}
            </div>

            {/* Ações de acesso */}
            <div style={{ fontSize: 11, color: 'rgba(226,232,240,.35)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Controle de acesso</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
              <button style={{ padding: '10px 14px', borderRadius: 9, border: '1px solid rgba(239,159,39,.2)', background: 'rgba(239,159,39,.06)', color: '#EF9F27', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}>
                ★ Promover a Founder Test User
              </button>
              <button style={{ padding: '10px 14px', borderRadius: 9, border: '1px solid rgba(139,127,232,.2)', background: 'rgba(139,127,232,.06)', color: '#8B7FE8', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}>
                ↑ Promover nível de senioridade
              </button>
              <button style={{ padding: '10px 14px', borderRadius: 9, border: '1px solid rgba(224,90,75,.2)', background: 'rgba(224,90,75,.06)', color: '#E05A4B', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}>
                ⊘ Suspender acesso
              </button>
            </div>

            <button onClick={() => setSelecionado(null)} style={{ width: '100%', padding: '10px', borderRadius: 9, border: '1px solid rgba(99,179,237,.15)', background: 'transparent', color: 'rgba(226,232,240,.5)', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* Modal criar usuário */}
      {modalCriar && (
        <div onClick={() => setModalCriar(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ ...card, padding: 28, width: '100%', maxWidth: 440, border: '1px solid rgba(99,179,237,.15)' }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 4 }}>Criar novo usuário</div>
            <div style={{ fontSize: 12, color: 'rgba(226,232,240,.4)', marginBottom: 24 }}>O usuário receberá acesso à plataforma</div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { label: 'Nome completo', value: novoNome, setter: setNovoNome, type: 'text', placeholder: 'Ex: João Silva' },
                { label: 'Email',         value: novoEmail, setter: setNovoEmail, type: 'email', placeholder: 'joao@email.com' },
                { label: 'Senha inicial', value: novaSenha, setter: setNovaSenha, type: 'password', placeholder: '••••••••' },
              ].map(f => (
                <div key={f.label}>
                  <label style={{ fontSize: 11, color: 'rgba(226,232,240,.4)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>{f.label}</label>
                  <input
                    type={f.type} value={f.value} onChange={e => f.setter(e.target.value)}
                    placeholder={f.placeholder}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 9, border: '1px solid rgba(99,179,237,.12)', background: 'rgba(99,179,237,.04)', color: '#e2e8f0', fontSize: 13, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                  />
                </div>
              ))}

              <div>
                <label style={{ fontSize: 11, color: 'rgba(226,232,240,.4)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>Tipo de acesso</label>
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

              {msg && <div style={{ fontSize: 12, color: msg.includes('Erro') ? '#fc8181' : '#68d391', background: msg.includes('Erro') ? 'rgba(224,90,75,.08)' : 'rgba(29,158,117,.08)', borderRadius: 8, padding: '10px 12px', border: `1px solid ${msg.includes('Erro') ? 'rgba(224,90,75,.2)' : 'rgba(29,158,117,.2)'}` }}>{msg}</div>}

              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button onClick={() => setModalCriar(false)} style={{ flex: 1, padding: '11px', borderRadius: 9, border: '1px solid rgba(99,179,237,.15)', background: 'transparent', color: 'rgba(226,232,240,.5)', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>Cancelar</button>
                <button onClick={criarUsuario} disabled={criando} style={{ flex: 2, padding: '11px', borderRadius: 9, border: 'none', background: 'linear-gradient(135deg, #1D9E75, #63b3ed)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: criando ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: criando ? 0.7 : 1 }}>
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
