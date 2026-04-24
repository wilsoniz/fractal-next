'use client'

import { useEffect, useState, createContext, useContext } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

// ── Context ───────────────────────────────────────────────────────────────────
interface AdminContextType { email: string }
const AdminContext = createContext<AdminContextType>({ email: '' })
export const useAdminContext = () => useContext(AdminContext)

const ADMIN_EMAIL = 'wilsoniz@icloud.com'

// ── Nav ───────────────────────────────────────────────────────────────────────
const NAV = [
  {
    label: 'Visão Geral',
    href: '/admin',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="2" width="9" height="9" rx="2"/><rect x="13" y="2" width="9" height="9" rx="2"/>
        <rect x="2" y="13" width="9" height="9" rx="2"/><rect x="13" y="13" width="9" height="9" rx="2"/>
      </svg>
    ),
  },
  {
    label: 'Usuários',
    href: '/admin/usuarios',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
  },
  {
    label: 'Clínico',
    href: '/admin/clinico',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>
    ),
  },
  {
    label: 'Explorer',
    href: '/admin/explorer',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        <line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>
      </svg>
    ),
  },
  {
    label: 'Inteligência',
    href: '/admin/inteligencia',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
    ),
  },
]

// ── Layout ────────────────────────────────────────────────────────────────────
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter()
  const pathname = usePathname()
  const [email,   setEmail]   = useState('')
  const [status,  setStatus]  = useState<'loading' | 'ok' | 'unauth'>('loading')

  // Se estiver na página de login, renderiza direto sem verificar
  if (pathname === '/admin/login') {
    return <>{children}</>
  }

  useEffect(() => {
    async function verificar() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || user.email !== ADMIN_EMAIL) {
        setStatus('unauth')
        router.replace('/admin/login')
        return
      }
      setEmail(user.email)
      setStatus('ok')
    }
    verificar()
  }, [router])

  async function logout() {
    await supabase.auth.signOut()
    router.replace('/admin/login')
  }

  if (status === 'loading' || status === 'unauth') {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0a0f1e 0%, #0d1f35 50%, #071428 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            border: '2px solid rgba(99,179,237,.2)',
            borderTop: '2px solid #63b3ed',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 12px',
          }} />
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,.35)', letterSpacing: '0.08em' }}>
            {status === 'unauth' ? 'Redirecionando...' : 'Verificando acesso'}
          </div>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  return (
    <AdminContext.Provider value={{ email }}>
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0a0f1e 0%, #0d1f35 60%, #071428 100%)',
        color: '#e2e8f0',
        fontFamily: "'DM Sans', system-ui, sans-serif",
        display: 'flex',
      }}>

        {/* Background grid */}
        <div style={{
          position: 'fixed', inset: 0, zIndex: 0,
          backgroundImage: `
            linear-gradient(rgba(99,179,237,.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(99,179,237,.03) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
          pointerEvents: 'none',
        }} />

        {/* Glow top-left */}
        <div style={{
          position: 'fixed', top: -200, left: -200, width: 600, height: 600,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(29,158,117,.08) 0%, transparent 70%)',
          pointerEvents: 'none', zIndex: 0,
        }} />

        {/* Glow bottom-right */}
        <div style={{
          position: 'fixed', bottom: -200, right: -200, width: 500, height: 500,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99,179,237,.06) 0%, transparent 70%)',
          pointerEvents: 'none', zIndex: 0,
        }} />

        {/* Sidebar */}
        <aside style={{
          width: 240, flexShrink: 0,
          background: 'rgba(10,15,30,.8)',
          borderRight: '1px solid rgba(99,179,237,.08)',
          backdropFilter: 'blur(20px)',
          display: 'flex', flexDirection: 'column',
          position: 'fixed', top: 0, left: 0, bottom: 0,
          zIndex: 10,
        }}>
          {/* Logo */}
          <div style={{ padding: '28px 24px 20px', borderBottom: '1px solid rgba(99,179,237,.08)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: 'linear-gradient(135deg, #1D9E75, #63b3ed)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, fontWeight: 800, color: '#fff',
              }}>F</div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>FractaAdmin</div>
                <div style={{ fontSize: 10, color: 'rgba(99,179,237,.6)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Painel do Fundador</div>
              </div>
            </div>
          </div>

          {/* Nav */}
          <nav style={{ flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {NAV.map(item => {
              const ativo = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href))
              return (
                <Link key={item.href} href={item.href} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 12px', borderRadius: 10,
                  background: ativo ? 'rgba(99,179,237,.1)' : 'transparent',
                  border: `1px solid ${ativo ? 'rgba(99,179,237,.2)' : 'transparent'}`,
                  color: ativo ? '#63b3ed' : 'rgba(226,232,240,.5)',
                  textDecoration: 'none', fontSize: 13, fontWeight: ativo ? 600 : 400,
                  transition: 'all 0.15s',
                }}>
                  {item.icon}
                  {item.label}
                </Link>
              )
            })}
          </nav>

          {/* Footer */}
          <div style={{ padding: '16px 12px', borderTop: '1px solid rgba(99,179,237,.08)' }}>
            <div style={{ padding: '10px 12px', marginBottom: 8 }}>
              <div style={{ fontSize: 11, color: 'rgba(99,179,237,.5)', marginBottom: 2 }}>Conectado como</div>
              <div style={{ fontSize: 12, color: 'rgba(226,232,240,.7)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{email}</div>
            </div>
            <button onClick={logout} style={{
              width: '100%', padding: '9px 12px', borderRadius: 9,
              border: '1px solid rgba(224,90,75,.2)',
              background: 'rgba(224,90,75,.06)',
              color: 'rgba(224,90,75,.7)', fontSize: 12, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              Sair
            </button>
          </div>
        </aside>

        {/* Main */}
        <main style={{
          flex: 1, marginLeft: 240,
          padding: '32px 36px',
          position: 'relative', zIndex: 1,
          minHeight: '100vh',
        }}>
          {children}
        </main>
      </div>
    </AdminContext.Provider>
  )
}
