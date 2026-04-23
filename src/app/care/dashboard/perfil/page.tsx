'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useCareContext } from '../layout'
import GamificationWidget from '@/components/fracta/GamificationWidget'
import { buscarGamificacao, buscarConquistas } from '@/lib/fracta/gamification-supabase'

type Perfil = {
  id: string
  nome: string
  email: string | null
  foto_url: string | null
  notificacoes_email: boolean
  notificacoes_push: boolean
  criado_em: string
}

export default function PerfilPage() {
  const { nomeResp } = useCareContext()
  const [perfil, setPerfil] = useState<Perfil | null>(null)
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [sucesso, setSucesso] = useState(false)
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [tab, setTab] = useState<'perfil' | 'notificacoes' | 'conta'>('perfil')
  const [gamificacao, setGamificacao] = useState({ pontos: 0, streak_atual: 0, streak_max: 0 })
  const [conquistas, setConquistas] = useState<string[]>([])

  useEffect(() => {
    async function carregar() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setEmail(user.email ?? '')

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (data) {
        setPerfil(data)
        setNome(data.nome ?? '')
      } else {
        setNome(user.user_metadata?.nome || user.email?.split('@')[0] || '')
      }
      setLoading(false)
      const gam = await buscarGamificacao(user.id)
      setGamificacao(gam)
      const conq = await buscarConquistas(user.id)
      setConquistas(conq)
    }
    carregar()
  }, [])

  async function salvar() {
    setSalvando(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('profiles').upsert({
      id: user.id,
      nome,
      email,
      atualizado_em: new Date().toISOString(),
    })

    setSucesso(true)
    setTimeout(() => setSucesso(false), 3000)
    setSalvando(false)
  }

  async function sair() {
    await supabase.auth.signOut()
    window.location.href = '/care/login'
  }

  const card: React.CSSProperties = {
    background: 'white',
    border: '1px solid rgba(43,191,164,.12)',
    borderRadius: 20,
    padding: '24px 20px',
    marginBottom: 16,
  }

  const inp: React.CSSProperties = {
    width: '100%',
    padding: '11px 14px',
    borderRadius: 10,
    border: '1.5px solid rgba(43,191,164,.25)',
    fontFamily: 'var(--font-sans)',
    fontSize: '.9rem',
    color: '#1E3A5F',
    outline: 'none',
    boxSizing: 'border-box',
    background: 'white',
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
      <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid rgba(43,191,164,.2)', borderTopColor: '#2BBFA4', animation: 'spin 1s linear infinite' }} />
    </div>
  )

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '0 0 40px' }}>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1E3A5F', marginBottom: 4 }}>Meu Perfil</h1>
        <p style={{ fontSize: '.85rem', color: '#8a9ab8' }}>Gerencie suas informações pessoais e preferências</p>
      </div>

      {/* Avatar */}
      <div style={{ ...card, display: 'flex', alignItems: 'center', gap: 18 }}>
        <div style={{
          width: 64, height: 64, borderRadius: '50%',
          background: 'linear-gradient(135deg,#2BBFA4,#2A7BA8)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.4rem', fontWeight: 800, color: 'white', flexShrink: 0,
        }}>
          {nome.slice(0, 2).toUpperCase() || 'EU'}
        </div>
        <div>
          <div style={{ fontSize: '1rem', fontWeight: 700, color: '#1E3A5F' }}>{nome || 'Responsável'}</div>
          <div style={{ fontSize: '.8rem', color: '#8a9ab8', marginTop: 2 }}>{email}</div>
          <div style={{ fontSize: '.72rem', color: '#2BBFA4', marginTop: 6, fontWeight: 600 }}>
            Membro desde {perfil?.criado_em ? new Date(perfil.criado_em).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }) : 'hoje'}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'rgba(43,191,164,.06)', borderRadius: 12, padding: 4 }}>
        {([['perfil','Dados'],['notificacoes','Notificações'],['conta','Conta']] as const).map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)} style={{
            flex: 1, padding: '8px 12px', borderRadius: 9, border: 'none',
            background: tab === t ? 'white' : 'transparent',
            color: tab === t ? '#1E3A5F' : '#8a9ab8',
            fontWeight: tab === t ? 700 : 500,
            fontSize: '.82rem', cursor: 'pointer',
            fontFamily: 'var(--font-sans)',
            boxShadow: tab === t ? '0 1px 6px rgba(0,0,0,.08)' : 'none',
            transition: 'all .15s',
          }}>{label}</button>
        ))}
      </div>

      {/* Tab: Dados pessoais */}
      {tab === 'perfil' && (
        <div style={card}>
          <div style={{ fontSize: '.75rem', fontWeight: 700, color: '#2BBFA4', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 18 }}>Dados pessoais</div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: '.75rem', fontWeight: 600, color: '#5a7a9a', marginBottom: 6 }}>Nome completo</label>
            <input value={nome} onChange={e => setNome(e.target.value)} style={inp} placeholder="Seu nome" />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: '.75rem', fontWeight: 600, color: '#5a7a9a', marginBottom: 6 }}>E-mail</label>
            <input value={email} disabled style={{ ...inp, background: '#f8f9fb', color: '#8a9ab8' }} />
            <div style={{ fontSize: '.7rem', color: '#aabbcc', marginTop: 4 }}>O e-mail não pode ser alterado aqui</div>
          </div>

          {sucesso && (
            <div style={{ padding: '10px 14px', background: 'rgba(43,191,164,.1)', border: '1px solid rgba(43,191,164,.25)', borderRadius: 10, fontSize: '.82rem', color: '#2BBFA4', marginBottom: 16 }}>
              ✓ Perfil atualizado com sucesso!
            </div>
          )}

          <button onClick={salvar} disabled={salvando} style={{
            width: '100%', padding: '12px', borderRadius: 10, border: 'none',
            background: salvando ? 'rgba(43,191,164,.4)' : 'linear-gradient(135deg,#2BBFA4,#1e9e88)',
            color: 'white', fontWeight: 800, fontSize: '.9rem',
            cursor: salvando ? 'default' : 'pointer', fontFamily: 'var(--font-sans)',
          }}>{salvando ? 'Salvando...' : 'Salvar alterações'}</button>
        </div>
      )}
<GamificationWidget
  pontos={gamificacao.pontos}
  streak={gamificacao.streak_atual}
  streakMax={gamificacao.streak_max}
  atividades={Math.round(gamificacao.pontos / 10)}
  trilhasConcluidas={conquistas.filter(c => c === 'trilha-concluida').length}
  avaliacoes={conquistas.filter(c => c === 'avaliacao-2').length + 1}
  compact={false}
/>
      {/* Tab: Notificações */}
      {tab === 'notificacoes' && (
        <div style={card}>
          <div style={{ fontSize: '.75rem', fontWeight: 700, color: '#2BBFA4', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 18 }}>Preferências de notificação</div>

          {[
            { titulo: 'Lembrete de atividade diária', desc: 'Receba um lembrete para registrar as atividades do dia' },
            { titulo: 'Novidades do FractaEngine', desc: 'Alertas quando o sistema identificar novas recomendações' },
            { titulo: 'Relatório semanal', desc: 'Resumo do progresso toda semana' },
            { titulo: 'Comunicação do terapeuta', desc: 'Notificações de mensagens e atualizações do terapeuta' },
          ].map((n, i) => (
            <div key={n.titulo} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: i < 3 ? '1px solid rgba(0,0,0,.05)' : 'none' }}>
              <div>
                <div style={{ fontSize: '.88rem', fontWeight: 600, color: '#1E3A5F', marginBottom: 2 }}>{n.titulo}</div>
                <div style={{ fontSize: '.75rem', color: '#8a9ab8' }}>{n.desc}</div>
              </div>
              <div style={{
                width: 44, height: 24, borderRadius: 12,
                background: i === 0 || i === 3 ? '#2BBFA4' : 'rgba(0,0,0,.1)',
                position: 'relative', cursor: 'pointer', flexShrink: 0, marginLeft: 16,
                transition: 'background .2s',
              }}>
                <div style={{
                  width: 18, height: 18, borderRadius: '50%', background: 'white',
                  position: 'absolute', top: 3,
                  left: i === 0 || i === 3 ? 23 : 3,
                  transition: 'left .2s',
                  boxShadow: '0 1px 4px rgba(0,0,0,.2)',
                }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab: Conta */}
      {tab === 'conta' && (
        <div>
          <div style={card}>
            <div style={{ fontSize: '.75rem', fontWeight: 700, color: '#2BBFA4', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 18 }}>Segurança</div>
            <button style={{
              width: '100%', padding: '12px', borderRadius: 10,
              border: '1.5px solid rgba(43,191,164,.3)', background: 'transparent',
              color: '#2BBFA4', fontWeight: 700, fontSize: '.88rem',
              cursor: 'pointer', fontFamily: 'var(--font-sans)', marginBottom: 12,
            }}>Alterar senha</button>
          </div>

          <div style={card}>
            <div style={{ fontSize: '.75rem', fontWeight: 700, color: '#e05a4b', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 18 }}>Sessão</div>
            <button onClick={sair} style={{
              width: '100%', padding: '12px', borderRadius: 10,
              border: '1.5px solid rgba(224,90,75,.3)', background: 'transparent',
              color: '#e05a4b', fontWeight: 700, fontSize: '.88rem',
              cursor: 'pointer', fontFamily: 'var(--font-sans)',
            }}>Sair da conta</button>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
