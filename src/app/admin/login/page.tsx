'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const ADMIN_EMAIL = 'wilson@fractabehavior.com'

export default function AdminLoginPage() {
  const router = useRouter()
  const [email,    setEmail]    = useState('')
  const [senha,    setSenha]    = useState('')
  const [erro,     setErro]     = useState('')
  const [loading,  setLoading]  = useState(false)

  async function entrar() {
    setErro('')
    if (email !== ADMIN_EMAIL) {
      setErro('Acesso restrito ao administrador do sistema.')
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
    if (error) {
      setErro('Email ou senha incorretos.')
      setLoading(false)
      return
    }
    router.replace('/admin')
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0f1e 0%, #0d1f35 60%, #071428 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'DM Sans', system-ui, sans-serif",
    }}>
      {/* Grid bg */}
      <div style={{
        position: 'fixed', inset: 0,
        backgroundImage: `linear-gradient(rgba(99,179,237,.03) 1px, transparent 1px), linear-gradient(90deg, rgba(99,179,237,.03) 1px, transparent 1px)`,
        backgroundSize: '40px 40px', pointerEvents: 'none',
      }} />

      <div style={{
        width: '100%', maxWidth: 400,
        background: 'rgba(10,15,30,.85)',
        border: '1px solid rgba(99,179,237,.12)',
        borderRadius: 20,
        padding: '40px 36px',
        backdropFilter: 'blur(20px)',
        position: 'relative', zIndex: 1,
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14,
            background: 'linear-gradient(135deg, #1D9E75, #63b3ed)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, fontWeight: 800, color: '#fff',
            margin: '0 auto 14px',
          }}>F</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 4 }}>FractaAdmin</div>
          <div style={{ fontSize: 12, color: 'rgba(99,179,237,.5)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Acesso restrito</div>
        </div>

        {/* Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 11, color: 'rgba(226,232,240,.4)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="seu@email.com"
              style={{
                width: '100%', padding: '11px 14px', borderRadius: 10,
                border: '1px solid rgba(99,179,237,.15)',
                background: 'rgba(99,179,237,.05)',
                color: '#e2e8f0', fontSize: 14, outline: 'none',
                fontFamily: 'inherit', boxSizing: 'border-box',
              }}
            />
          </div>
          <div>
            <label style={{ fontSize: 11, color: 'rgba(226,232,240,.4)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>Senha</label>
            <input
              type="password"
              value={senha}
              onChange={e => setSenha(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && entrar()}
              placeholder="••••••••"
              style={{
                width: '100%', padding: '11px 14px', borderRadius: 10,
                border: '1px solid rgba(99,179,237,.15)',
                background: 'rgba(99,179,237,.05)',
                color: '#e2e8f0', fontSize: 14, outline: 'none',
                fontFamily: 'inherit', boxSizing: 'border-box',
              }}
            />
          </div>

          {erro && (
            <div style={{ fontSize: 12, color: '#fc8181', background: 'rgba(224,90,75,.08)', border: '1px solid rgba(224,90,75,.2)', borderRadius: 8, padding: '10px 12px' }}>
              {erro}
            </div>
          )}

          <button
            onClick={entrar}
            disabled={loading}
            style={{
              width: '100%', padding: '13px', borderRadius: 10, border: 'none',
              background: loading ? 'rgba(99,179,237,.2)' : 'linear-gradient(135deg, #1D9E75, #63b3ed)',
              color: loading ? 'rgba(255,255,255,.4)' : '#fff',
              fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit', marginTop: 4,
            }}
          >
            {loading ? 'Verificando...' : 'Entrar no painel'}
          </button>
        </div>
      </div>
    </div>
  )
}
