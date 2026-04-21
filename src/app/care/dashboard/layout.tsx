'use client'

/**
 * Layout: /care/dashboard
 * src/app/care/dashboard/layout.tsx
 *
 * Layout compartilhado de todas as abas do FractaCare.
 * Gerencia: nav, sidebar, tab bar mobile, seletor de criança ativa.
 * Cada aba é uma página separada — esse layout persiste entre navegações.
 */

import { useState, useEffect, createContext, useContext, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { FractaLogo } from '@/components/fracta/FractaLogo'
import { FractalTriangle } from '@/components/fracta/FractalTriangle'
import { supabase, signOut, getUser } from '@/lib/supabase'

// ─────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────

type Crianca = {
  id: string
  nome: string
  idade_anos: number
  diagnostico?: string | null
  ativo: boolean
}

type CareContextType = {
  criancaAtiva: Crianca | null
  criancas: Crianca[]
  setCriancaAtiva: (c: Crianca) => void
  nomeResp: string
  recarregarCriancas: () => void
}

// ─────────────────────────────────────────────
// CONTEXTO GLOBAL DO CARE
// Disponível para todas as páginas filhas via useCareContext()
// ─────────────────────────────────────────────

export const CareContext = createContext<CareContextType>({
  criancaAtiva: null,
  criancas: [],
  setCriancaAtiva: () => {},
  nomeResp: '',
  recarregarCriancas: () => {},
})

export function useCareContext() {
  return useContext(CareContext)
}

// ─────────────────────────────────────────────
// CONFIGURAÇÃO DAS ABAS
// ─────────────────────────────────────────────

const ABAS = [
  {
    key: 'home',
    label: 'Home',
    href: '/care/dashboard',
    exact: true,
    icon: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10',
  },
  {
    key: 'atividades',
    label: 'Atividades',
    href: '/care/dashboard/atividades',
    exact: false,
    icon: 'M9 11l3 3L22 4 M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11',
  },
  {
    key: 'avaliacao',
    label: 'Avaliação',
    href: '/care/dashboard/avaliacao',
    exact: false,
    icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2 M9 5a2 2 0 002 2h2a2 2 0 002-2 M9 5a2 2 0 012-2h2a2 2 0 012 2 M12 12h.01 M12 16h.01',
  },
  {
    key: 'agenda',
    label: 'Agenda',
    href: '/care/dashboard/agenda',
    exact: false,
    icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
  },
  {
    key: 'meu-filho',
    label: 'Meu Filho',
    href: '/care/dashboard/meu-filho',
    exact: false,
    icon: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  },
  {
  key: 'aprendizado',
  label: 'Guia-Familiar',
  href: '/care/dashboard/aprendizado',
  icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253',
},
  {
  key: 'perfil',
  label: 'Meu Perfil',
  href: '/care/dashboard/perfil',
  icon: 'M8 8a3 3 0 100-6 3 3 0 000 6zM4 14s-1 0-1-1 1-4 5-4 5 3 5 4-1 1-1 1H4z',
},
]

// ─────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────

// CORRETO para Next.js 16:

export default function CareDashboardLayout({
  children,
}: {
  children: ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()

  const [nomeResp, setNomeResp] = useState('')
  const [criancas, setCriancas] = useState<Crianca[]>([])
  const [criancaAtiva, setCriancaAtivaState] = useState<Crianca | null>(null)
  const [loading, setLoading] = useState(true)
  const [seletorAberto, setSeletorAberto] = useState(false)

  // ── Determinar aba ativa
  const abaAtiva = ABAS.find((a) =>
    a.exact ? pathname === a.href : pathname.startsWith(a.href) && !a.exact
      ? pathname === a.href || pathname.startsWith(a.href + '/')
      : false
  ) ?? ABAS[0]

  // ── Carregar dados iniciais
  async function carregarDados() {
    const { user } = await getUser()
    if (!user) { router.replace('/care/login'); return }

    setNomeResp(user.user_metadata?.nome || user.email?.split('@')[0] || 'você')

    const { data } = await supabase
      .from('criancas')
      .select('id, nome, idade_anos, diagnostico, ativo')
      .eq('responsavel_id', user.id)
      .eq('ativo', true)
      .order('criado_em', { ascending: true })

    if (data && data.length > 0) {
      setCriancas(data)
      // Recupera criança ativa do localStorage ou usa a primeira
      const idSalvo = localStorage.getItem('fracta_crianca_ativa')
      const criancaSalva = idSalvo ? data.find((c) => c.id === idSalvo) : null
      setCriancaAtivaState(criancaSalva ?? data[0])
    }

    setLoading(false)
  }

  useEffect(() => {
    carregarDados()
  }, [router])

  function setCriancaAtiva(c: Crianca) {
    setCriancaAtivaState(c)
    localStorage.setItem('fracta_crianca_ativa', c.id)
    setSeletorAberto(false)
  }

  async function handleLogout() {
    await signOut()
    router.replace('/care/login')
  }

  // ── Determinar label da aba "Meu Filho"
  const labelFilho = criancaAtiva
    ? criancaAtiva.nome.split(' ')[0]
    : 'Meu Filho'

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(160deg,#e8f8ff,#f0fdfb)',
        fontFamily: 'var(--font-sans)',
      }}>
        <div style={{ textAlign: 'center' }}>
          <FractaLogo logo="care" height={80} alt="FractaCare" />
          <p style={{ color: '#8a9ab8', fontSize: '.9rem', marginTop: 16 }}>
            Carregando...
          </p>
        </div>
      </div>
    )
  }

  return (
    <CareContext.Provider value={{
      criancaAtiva,
      criancas,
      setCriancaAtiva,
      nomeResp,
      recarregarCriancas: carregarDados,
    }}>
      <div style={{
        fontFamily: 'var(--font-sans)',
        color: '#1E3A5F',
        minHeight: '100vh',
        background: 'radial-gradient(ellipse 80% 60% at 20% 10%, rgba(122,224,64,.10) 0%, transparent 55%), radial-gradient(ellipse 60% 70% at 80% 90%, rgba(43,191,164,.13) 0%, transparent 55%), linear-gradient(160deg,#e8f8ff 0%,#f0fdfb 35%,#edfff8 65%,#ddf4ff 100%)',
      }}>

        {/* ── NAV SUPERIOR */}
        <nav style={{
          background: 'rgba(255,255,255,.78)',
          backdropFilter: 'blur(18px)',
          borderBottom: '1px solid rgba(43,191,164,.15)',
          padding: '0 24px',
          height: 60,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}>
          <Link href="/care/dashboard" style={{ textDecoration: 'none' }}>
            <FractaLogo logo="care" height={32} alt="FractaCare" />
          </Link>

          {/* Seletor de criança — centro da nav */}
          {criancas.length > 0 && (
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setSeletorAberto(!seletorAberto)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 14px',
                  background: 'rgba(43,191,164,.08)',
                  border: '1px solid rgba(43,191,164,.2)',
                  borderRadius: 99,
                  cursor: 'pointer',
                  fontFamily: 'var(--font-sans)',
                  fontSize: '.82rem',
                  fontWeight: 600,
                  color: '#1E3A5F',
                }}
              >
                <div style={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg,#2BBFA4,#4FC3D8)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '.6rem',
                  color: 'white',
                  fontWeight: 800,
                }}>
                  {criancaAtiva?.nome.slice(0, 2).toUpperCase()}
                </div>
                {criancaAtiva?.nome.split(' ')[0]}
                {criancas.length > 1 && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                )}
              </button>

              {/* Dropdown seletor */}
              {seletorAberto && criancas.length > 1 && (
                <div style={{
                  position: 'absolute',
                  top: '110%',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: 'white',
                  borderRadius: 14,
                  boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                  border: '1px solid rgba(43,191,164,.15)',
                  overflow: 'hidden',
                  minWidth: 180,
                  zIndex: 200,
                }}>
                  {criancas.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setCriancaAtiva(c)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        width: '100%',
                        padding: '12px 16px',
                        background: c.id === criancaAtiva?.id ? 'rgba(43,191,164,.08)' : 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        fontFamily: 'var(--font-sans)',
                        fontSize: '.83rem',
                        color: '#1E3A5F',
                        fontWeight: c.id === criancaAtiva?.id ? 700 : 400,
                        textAlign: 'left',
                      }}
                    >
                      <div style={{
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        background: c.id === criancaAtiva?.id
                          ? 'linear-gradient(135deg,#2BBFA4,#4FC3D8)'
                          : 'linear-gradient(135deg,#e2e8f0,#cbd5e1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '.6rem',
                        color: c.id === criancaAtiva?.id ? 'white' : '#64748b',
                        fontWeight: 800,
                        flexShrink: 0,
                      }}>
                        {c.nome.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontSize: '.82rem', fontWeight: 600 }}>{c.nome.split(' ')[0]}</div>
                        <div style={{ fontSize: '.68rem', color: '#8a9ab8' }}>{c.idade_anos} anos</div>
                      </div>
                      {c.id === criancaAtiva?.id && (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2BBFA4" strokeWidth="2.5" style={{ marginLeft: 'auto' }}>
                          <path d="M20 6L9 17l-5-5" />
                        </svg>
                      )}
                    </button>
                  ))}

                  {/* Adicionar filho */}
                  <div style={{ borderTop: '1px solid rgba(43,191,164,.1)', padding: '8px' }}>
                    <Link
                      href="/care/dashboard/meu-filho?acao=adicionar"
                      onClick={() => setSeletorAberto(false)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '8px 10px',
                        borderRadius: 10,
                        fontSize: '.78rem',
                        color: '#2BBFA4',
                        fontWeight: 600,
                        textDecoration: 'none',
                        background: 'transparent',
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 5v14M5 12h14" />
                      </svg>
                      Adicionar filho
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Avatar + nome */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              onClick={handleLogout}
              title="Sair"
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: 'linear-gradient(135deg,#2BBFA4,#2A7BA8)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '.6rem',
                fontWeight: 800,
                color: 'white',
                cursor: 'pointer',
              }}
            >
              {nomeResp.slice(0, 2).toUpperCase()}
            </div>
            <span style={{ fontSize: '.82rem', fontWeight: 600, color: '#1E3A5F' }} className="hide-mobile">
              {nomeResp}
            </span>
          </div>
        </nav>

        {/* ── LAYOUT PRINCIPAL */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '220px 1fr',
          minHeight: 'calc(100vh - 60px)',
        }} className="desktop-grid">

          {/* ── SIDEBAR DESKTOP */}
          <aside style={{
            background: 'rgba(255,255,255,.55)',
            backdropFilter: 'blur(10px)',
            borderRight: '1px solid rgba(43,191,164,.12)',
            padding: '24px 14px',
            display: 'flex',
            flexDirection: 'column',
          }} className="sidebar-desktop">

            {/* Card da criança ativa */}
            <div style={{
              background: 'rgba(255,255,255,.84)',
              borderRadius: 16,
              padding: 14,
              marginBottom: 20,
              border: '1px solid rgba(43,191,164,.15)',
              textAlign: 'center',
            }}>
              <FractaLogo logo="care" height={50} alt="FractaCare" />
              <div style={{ fontSize: '.95rem', fontWeight: 800, color: '#1E3A5F', marginTop: 6 }}>
                {criancaAtiva?.nome.split(' ')[0] ?? '—'}
              </div>
              <div style={{ fontSize: '.72rem', color: '#8a9ab8' }}>
                {criancaAtiva?.idade_anos ? `${criancaAtiva.idade_anos} anos · ` : ''}Perfil ativo
              </div>
              {criancaAtiva?.diagnostico && (
                <div style={{
                  fontSize: '.65rem',
                  color: '#2BBFA4',
                  fontWeight: 600,
                  marginTop: 4,
                  background: 'rgba(43,191,164,.1)',
                  padding: '2px 8px',
                  borderRadius: 99,
                  display: 'inline-block',
                }}>
                  {criancaAtiva.diagnostico}
                </div>
              )}
            </div>

            {/* Itens de navegação */}
            {ABAS.map((aba) => {
              const ativa = aba.exact
                ? pathname === aba.href
                : pathname === aba.href || pathname.startsWith(aba.href + '/')
              return (
                <Link
                  key={aba.key}
                  href={aba.href}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 12px',
                    borderRadius: 12,
                    background: ativa
                      ? 'linear-gradient(135deg,rgba(43,191,164,.15),rgba(122,224,64,.1))'
                      : 'transparent',
                    color: ativa ? '#2BBFA4' : '#5a7a9a',
                    fontSize: '.83rem',
                    fontWeight: ativa ? 700 : 500,
                    textDecoration: 'none',
                    marginBottom: 2,
                    transition: 'all .2s',
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    {aba.icon.split(' M').map((path, i) => (
                      <path key={i} d={i === 0 ? path : 'M' + path} />
                    ))}
                  </svg>
                  {aba.key === 'meu-filho' ? labelFilho : aba.label}
                  {/* Badge avaliação pendente */}
                  {aba.key === 'avaliacao' && (
                    <span style={{
                      marginLeft: 'auto',
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: '#2BBFA4',
                      display: 'inline-block',
                    }} />
                  )}
                </Link>
              )
            })}

            <div style={{ marginTop: 'auto', paddingTop: 20, borderTop: '1px solid rgba(43,191,164,.1)' }}>
              <button
                onClick={handleLogout}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 12,
                  border: 'none',
                  background: 'transparent',
                  color: '#94a3b8',
                  fontFamily: 'var(--font-sans)',
                  fontSize: '.8rem',
                  cursor: 'pointer',
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
                </svg>
                Sair
              </button>
            </div>
          </aside>

          {/* ── CONTEÚDO DA PÁGINA */}
          <main style={{ padding: '28px 28px 80px', minHeight: 'calc(100vh - 60px)' }}>
            {criancaAtiva ? children : (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 400,
                gap: 16,
                textAlign: 'center',
              }}>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#1E3A5F' }}>
                  Nenhuma criança cadastrada
                </h2>
                <p style={{ color: '#8a9ab8', fontSize: '.9rem' }}>
                  Adicione seu filho para começar a usar o FractaCare.
                </p>
                <Link
                  href="/care/dashboard/meu-filho?acao=adicionar"
                  style={{
                    padding: '12px 28px',
                    background: 'linear-gradient(135deg,#2BBFA4,#7AE040)',
                    color: 'white',
                    borderRadius: 50,
                    textDecoration: 'none',
                    fontWeight: 700,
                    fontSize: '.85rem',
                  }}
                >
                  Adicionar filho
                </Link>
              </div>
            )}
          </main>
        </div>

        {/* ── TAB BAR MOBILE */}
        <nav style={{
          display: 'none',
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          background: 'rgba(255,255,255,.95)',
          backdropFilter: 'blur(16px)',
          borderTop: '1px solid rgba(43,191,164,.15)',
          zIndex: 100,
        }} className="tab-bar-mobile">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)' }}>
            {ABAS.map((aba) => {
              const ativa = aba.exact
                ? pathname === aba.href
                : pathname === aba.href || pathname.startsWith(aba.href + '/')
              return (
                <Link
                  key={aba.key}
                  href={aba.href}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 3,
                    padding: '10px 0 8px',
                    color: ativa ? '#2BBFA4' : '#8a9ab8',
                    textDecoration: 'none',
                    fontSize: '.55rem',
                    fontWeight: 600,
                    position: 'relative',
                  }}
                >
                  {ativa && (
                    <div style={{
                      position: 'absolute',
                      top: 0,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: 32,
                      height: 3,
                      background: '#2BBFA4',
                      borderRadius: '0 0 4px 4px',
                    }} />
                  )}
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={ativa ? 2.5 : 1.8} strokeLinecap="round" strokeLinejoin="round">
                    {aba.icon.split(' M').map((path, i) => (
                      <path key={i} d={i === 0 ? path : 'M' + path} />
                    ))}
                  </svg>
                  {aba.key === 'meu-filho'
                    ? criancaAtiva?.nome.split(' ')[0] ?? 'Filho'
                    : aba.label}
                </Link>
              )
            })}
          </div>
        </nav>

      </div>

      <style>{`
        @media(max-width:768px){
          .desktop-grid { grid-template-columns:1fr !important; }
          .sidebar-desktop { display:none !important; }
          .tab-bar-mobile { display:block !important; }
          .hide-mobile { display:none !important; }
          main { padding:16px 14px 84px !important; }
        }
      `}</style>
    </CareContext.Provider>
  )
}
