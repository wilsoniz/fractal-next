'use client'

import { useState, useEffect, useRef, createContext, useContext } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Image from 'next/image'

// ── TIPOS ───────────────────────────────────────────────────────────────────
type SenioridadeNivel = 'terapeuta' | 'coordenador' | 'supervisor'

interface TerapeutaAtivo {
  id: string
  nome: string
  nivel: SenioridadeNivel
  iniciais: string
}

interface ClinicContextType {
  terapeuta: TerapeutaAtivo | null
}

const ClinicContext = createContext<ClinicContextType>({ terapeuta: null })
export const useClinicContext = () => useContext(ClinicContext)

// ── CONSTANTES ──────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  {
    section: 'Clínico',
    items: [
      { href: '/clinic/dashboard', label: 'Dashboard',    icon: 'M2 2h5v5H2zM9 2h5v5H9zM2 9h5v5H2zM9 9h5v5H9z' },
      { href: '/clinic/pacientes', label: 'Pacientes',    icon: 'M8 8a3 3 0 100-6 3 3 0 000 6zM2 18c0-3 2.7-5 6-5s6 2 6 5', badge: '12' },
      { href: '/clinic/programas', label: 'Programas',    icon: 'M2 4h12M2 8h9M2 12h6' },
      { href: '/clinic/sessao',    label: 'Sessão ativa', icon: 'M8 2a6 6 0 100 12A6 6 0 008 2zM8 5v3l2 1.5' },
      { href: '/clinic/avaliacoes', label: 'Avaliações',   icon: 'M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
      { href: '/clinic/evolucao',  label: 'Evolução',     icon: 'M1 11l4-5 3 3 3-5 4 3M1 13h14' },
      { href: '/clinic/agenda',    label: 'Agenda',       icon: 'M2 3h12a1 1 0 011 1v10a1 1 0 01-1 1H2a1 1 0 01-1-1V4a1 1 0 011-1zM5 3V1M11 3V1M1 7h14', badge: '3' },
    ],
  },
  {
    section: 'Desenvolvimento',
    items: [
      { href: '/clinic/education',   label: 'Education',    icon: 'M8 1l1.5 3 3.5.5-2.5 2.5.6 3.5L8 9l-3.1 1.5.6-3.5L3 4.5z' },
      { href: '/clinic/supervisao',  label: 'Supervisão',   icon: 'M1 5h14v9a1 1 0 01-1 1H2a1 1 0 01-1-1V5zM5 5V4a3 3 0 016 0v1' },
    ],
  },
  {
    section: 'Financeiro',
    items: [
      { href: '/clinic/wallet', label: 'Clinic Wallet', icon: 'M8 2a6 6 0 100 12A6 6 0 008 2zM8 5v1.5M8 9.5V11M6 7.5c0-.8.9-1.5 2-1.5s2 .7 2 1.5-2 1.5-2 1.5' },
    ],
  },
]

const NIVEL_CONFIG: Record<SenioridadeNivel, { label: string; cor: string; bg: string; modo: string }> = {
  terapeuta:    { label: 'Terapeuta',         cor: '#1D9E75', bg: 'rgba(29,158,117,.15)',  modo: 'Modo guiado'      },
  coordenador:  { label: 'Coord. de caso',    cor: '#EF9F27', bg: 'rgba(239,159,39,.15)',  modo: 'Modo semi-guiado' },
  supervisor:   { label: 'Supervisor',        cor: '#E05A4B', bg: 'rgba(224,90,75,.15)',   modo: 'Modo livre'       },
}

// ── CANVAS PARTÍCULAS ────────────────────────────────────────────────────────
function ParticlesCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    let animId: number

    const resize = () => {
      canvas.width  = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    type P = { x: number; y: number; vx: number; vy: number; r: number; alpha: number; color: string }
    const particles: P[] = Array.from({ length: 80 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - .5) * .25,
      vy: (Math.random() - .5) * .25,
      r: Math.random() * 1.6 + .4,
      alpha: Math.random() * .2 + .05,
      color: Math.random() > .55 ? '29,158,117' : Math.random() > .5 ? '55,138,221' : '30,58,92',
    }))

    const loop = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i]
        p.x += p.vx; p.y += p.vy
        if (p.x < 0) p.x = canvas.width
        if (p.x > canvas.width) p.x = 0
        if (p.y < 0) p.y = canvas.height
        if (p.y > canvas.height) p.y = 0
        for (let j = i + 1; j < particles.length; j++) {
          const q = particles[j]
          const dx = p.x - q.x, dy = p.y - q.y
          const d = Math.sqrt(dx * dx + dy * dy)
          if (d < 100) {
            ctx.beginPath()
            ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y)
            ctx.strokeStyle = `rgba(30,58,92,${.1 * (1 - d / 100)})`
            ctx.lineWidth = .5
            ctx.stroke()
          }
        }
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${p.color},${p.alpha})`
        ctx.fill()
      }
      animId = requestAnimationFrame(loop)
    }
    loop()

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}
    />
  )
}

// ── SIDEBAR ──────────────────────────────────────────────────────────────────
function Sidebar({ terapeuta }: { terapeuta: TerapeutaAtivo | null }) {
  const pathname = usePathname()
  const router   = useRouter()
  const nivel = terapeuta?.nivel ?? 'coordenador'
  const cfg   = NIVEL_CONFIG[nivel]

  async function handleLogout() {
    await supabase.auth.signOut()
    router.replace('/clinic/login')
  }

  const isActive = (href: string) => pathname === href || (href !== '/clinic/dashboard' && pathname.startsWith(href))

  return (
    <aside style={{
      width: 220,
      flexShrink: 0,
      background: 'rgba(10,24,40,.85)',
      borderRight: '1px solid rgba(26,58,92,.5)',
      backdropFilter: 'blur(20px)',
      display: 'flex',
      flexDirection: 'column',
      paddingBottom: 20,
      zIndex: 10,
      position: 'relative',
    }}>

      {/* Logo */}
      <Link href="/clinic/dashboard" style={{
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  padding: '20px 16px',
  borderBottom: '1px solid rgba(26,58,92,.4)',
  textDecoration: 'none',
}}>
        <Image 
  src="/logo-fractaclinic.png" 
  alt="FractaClinic" 
  width={180} 
  height={56} 
  style={{ objectFit: 'contain', width: '100%', height: 'auto', maxHeight: 56 }} 
  loading="eager" 
/>
      </Link>

      {/* Nav */}
      <div style={{ flex: 1, overflowY: 'auto', paddingTop: 8 }}>
        {NAV_ITEMS.map(group => (
          <div key={group.section}>
            <div style={{
              padding: '12px 20px 4px',
              fontSize: 9, fontWeight: 600, letterSpacing: '.1em',
              textTransform: 'uppercase', color: 'rgba(148,180,210,.9)',
            }}>
              {group.section}
            </div>
            {group.items.map(item => {
              const active = isActive(item.href)
              return (
                <Link key={item.href} href={item.href} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 12px', margin: '1px 8px',
                  borderRadius: 8,
                  color: active ? '#1D9E75' : 'rgba(180,205,230,.95)',
                  background: active ? 'rgba(29,158,117,.12)' : 'transparent',
                  fontWeight: active ? 500 : 400,
                  fontSize: 13,
                  textDecoration: 'none',
                  position: 'relative',
                  transition: 'background .15s, color .15s',
                  borderLeft: active ? '3px solid #1D9E75' : '3px solid transparent',
                }}>
                  <svg width="15" height="15" viewBox="0 0 16 16" fill="none"
                    stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"
                    style={{ flexShrink: 0, opacity: active ? 1 : .65 }}>
                    <path d={item.icon} />
                  </svg>
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {(item as any).badge && (
                    <span style={{
                      background: 'rgba(29,158,117,.15)', color: '#1D9E75',
                      border: '1px solid rgba(29,158,117,.25)',
                      borderRadius: 20, fontSize: 10, fontWeight: 600,
                      fontFamily: 'monospace', padding: '1px 6px',
                    }}>
                      {(item as any).badge}
                    </span>
                  )}
                </Link>
              )
            })}
          </div>
        ))}
      </div>

      {/* Footer — usuário */}
      <div style={{ borderTop: '1px solid rgba(26,58,92,.3)', padding: '12px 8px 0' }}>
        <Link href='/clinic/terapeuta' style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 12px', borderRadius: 8, cursor: 'pointer',
          textDecoration: 'none',
          transition: 'background .15s',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(20,65,120,.6)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: 'linear-gradient(135deg,#1D9E75,#378ADD)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 600, color: '#fff', flexShrink: 0,
          }}>
            {terapeuta?.iniciais ?? 'WI'}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#e8f0f8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {terapeuta?.nome ?? 'Wilson Isola'}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.cor, flexShrink: 0 }} />
              <span style={{ fontSize: 10, color: 'rgba(148,180,210,.9)' }}>{cfg.label}</span>
            </div>
          </div>
          <svg width='13' height='13' viewBox='0 0 16 16' fill='none' stroke='rgba(138,168,200,.7)' strokeWidth='1.5'>
            <path d='M11 8H5M8 5l3 3-3 3'/>
          </svg>
        </Link>
        <button onClick={handleLogout} style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 12px', marginTop: 4, width: '100%',
          borderRadius: 8, border: 'none', background: 'transparent',
          color: 'rgba(224,90,75,.7)', cursor: 'pointer',
          fontFamily: 'var(--font-sans)', fontSize: 12,
          transition: 'background .15s',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(224,90,75,.08)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          <svg width='13' height='13' viewBox='0 0 16 16' fill='none' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round'>
            <path d='M10 3h3a1 1 0 011 1v8a1 1 0 01-1 1h-3M7 11l-4-3 4-3M3 8h8'/>
          </svg>
          Sair
        </button>
      </div>

    </aside>
  )
}

// ── LAYOUT ────────────────────────────────────────────────────────────────────
export default function ClinicDashboardLayout({ children }: { children: React.ReactNode }) {
  const [terapeuta, setTerapeuta] = useState<TerapeutaAtivo | null>(null)
  const [isMobile,   setIsMobile]   = useState(false)
  const [menuMaisAberto, setMenuMaisAberto] = useState(false)
  const [avatarOpen,     setAvatarOpen]     = useState(false)
  const [seletorPaciente, setSeletorPaciente] = useState(false)
  const [pacientesNav,    setPacientesNav]    = useState<{id:string;nome:string}[]>([])

  const router = useRouter()
  async function handleLogout() {
    await supabase.auth.signOut()
    router.replace('/login')
  }
  const pathname = usePathname()


  useEffect(() => { setMenuMaisAberto(false) }, [pathname])

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    async function carregarTerapeuta() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Busca perfil do terapeuta na tabela de profiles
      const { data } = await supabase
        .from('profiles')
        .select('id, nome, nivel_senioridade')
        .eq('id', user.id)
        .single()

      if (data) {
        const nomes = (data.nome ?? 'W I').split(' ')
        const iniciais = nomes.length >= 2
          ? `${nomes[0][0]}${nomes[nomes.length - 1][0]}`.toUpperCase()
          : nomes[0].slice(0, 2).toUpperCase()

        setTerapeuta({
          id: data.id,
          nome: data.nome ?? 'Terapeuta',
          nivel: (data.nivel_senioridade as SenioridadeNivel) ?? 'coordenador',
          iniciais,
        })
      } else {
        // Fallback mock enquanto tabela não existe
        setTerapeuta({ id: user.id, nome: 'Wilson Isola', nivel: 'coordenador', iniciais: 'WI' })
      }
    }
    carregarTerapeuta()
  }, [])
useEffect(() => {
  if (!terapeuta) return
  async function carregarPacientes() {
    const { data: planos } = await supabase
      .from('planos')
      .select('criancas(id, nome)')
      .eq('terapeuta_id', terapeuta!.id)
      .eq('status', 'ativo')
    if (!planos) return
    const map = new Map<string, string>()
    for (const pl of planos) {
      const c = (pl as any).criancas
      if (c && !map.has(c.id)) map.set(c.id, c.nome)
    }
    setPacientesNav(Array.from(map.entries()).map(([id, nome]) => ({ id, nome })))
  }
  carregarPacientes()
}, [terapeuta])
  return (
    <ClinicContext.Provider value={{ terapeuta }}>
      <div style={{
        minHeight: '100vh',
        background: '#07111f',
        color: '#e8f0f8',
        fontFamily: 'var(--font-sans)',
        display: 'flex',
        position: 'relative',
      }}>

        <ParticlesCanvas />

        {!isMobile && <Sidebar terapeuta={terapeuta} />}

        {/* Main */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 1, minWidth: 0 }}>

          {/* Topbar */}
          <header style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '16px 28px',
            borderBottom: '1px solid rgba(26,58,92,.3)',
            background: 'rgba(7,17,31,.6)',
            backdropFilter: 'blur(10px)',
            position: 'sticky', top: 0, zIndex: 10,
            gap: 16,
          }}>
            <div>
              <div style={{ fontSize: 17, fontWeight: 700, color: '#e8f0f8', letterSpacing: '-.01em' }}>
                {getPageTitle(pathname)}
              </div>
              <div style={{ fontSize: 12, color: '#9ec8e8', marginTop: 2 }}>
                {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 6 : 10 }}>
              {/* Banner de senioridade */}
              {terapeuta && !isMobile && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  background: NIVEL_CONFIG[terapeuta.nivel].bg,
                  border: `1px solid ${NIVEL_CONFIG[terapeuta.nivel].cor}44`,
                  borderRadius: 8, padding: '6px 12px',
                }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: NIVEL_CONFIG[terapeuta.nivel].cor }} />
                  <span style={{ fontSize: 11, fontWeight: 500, color: NIVEL_CONFIG[terapeuta.nivel].cor }}>
                    {NIVEL_CONFIG[terapeuta.nivel].modo}
                  </span>
                </div>
              )}

              {!isMobile && <button
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '7px 14px', borderRadius: 8, cursor: 'pointer',
                  background: 'rgba(20,65,120,.8)', color: '#daeeff',
                  border: '1px solid rgba(80,150,220,.7)', fontSize: 12, fontWeight: 700,
                }}
              >
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="7" cy="7" r="5"/><path d="M11 11l3 3"/>
                </svg>
                Buscar paciente
              </button>}

<div style={{ position: 'relative' }}>
  <button onClick={() => setSeletorPaciente(v => !v)} style={{
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '7px 14px', borderRadius: 8, cursor: 'pointer',
    background: '#1D9E75', color: '#fff',
    border: 'none', fontSize: 12, fontWeight: 500,
    fontFamily: 'var(--font-sans)',
  }}>
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="8" cy="8" r="6"/><path d="M8 5v6M5 8h6"/>
    </svg>
    Nova sessão
  </button>
  {seletorPaciente && (
    <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 8, background: 'rgba(10,24,40,.98)', border: '1px solid rgba(26,58,92,.6)', borderRadius: 12, padding: 12, minWidth: 220, zIndex: 50, boxShadow: '0 8px 32px rgba(0,0,0,.4)' }}>
      <div style={{ fontSize: 11, color: 'rgba(160,200,235,.4)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.06em' }}>Selecionar paciente</div>
      {pacientesNav.length === 0
        ? <div style={{ fontSize: 12, color: 'rgba(160,200,235,.3)', padding: '8px 0' }}>Nenhum paciente vinculado</div>
        : pacientesNav.map(p => (
          <Link key={p.id} href={`/clinic/sessao?pacienteId=${p.id}`} onClick={() => setSeletorPaciente(false)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8, textDecoration: 'none', color: '#e8f0f8', fontSize: 13, cursor: 'pointer' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(26,58,92,.5)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'linear-gradient(135deg,#1D9E75,#378ADD)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
              {p.nome.split(' ').map((n: string) => n[0]).slice(0,2).join('').toUpperCase()}
            </div>
            {p.nome}
          </Link>
        ))
      }
    </div>
  )}
</div>
              {/* Avatar dropdown */}
              <div style={{ position: 'relative' }}>
                <button onClick={() => setAvatarOpen(v => !v)} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '5px 10px 5px 5px', borderRadius: 10,
                  background: 'rgba(15,55,110,.8)', border: '1px solid rgba(80,150,220,.65)',
                  cursor: 'pointer', transition: 'background .15s', fontFamily: 'var(--font-sans)',
                }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: 'linear-gradient(135deg,#1D9E75,#378ADD)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0,
                  }}>
                    {terapeuta?.iniciais ?? 'WI'}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#ffffff', whiteSpace: 'nowrap', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {terapeuta?.nome?.split(' ')[0] ?? 'Wilson'}
                    </div>
                    <div style={{ fontSize: 10, color: '#90bce0' }}>Meu perfil</div>
                  </div>
                </button>
                {avatarOpen && (
                  <>
                    <div onClick={() => setAvatarOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 40 }} />
                    <div style={{
                      position: 'absolute', top: '100%', right: 0, marginTop: 6, zIndex: 50,
                      background: '#0d2035', border: '1px solid rgba(55,90,130,.5)',
                      borderRadius: 12, padding: 6, minWidth: 160,
                      boxShadow: '0 8px 32px rgba(0,0,0,.4)',
                    }}>
                      <Link href='/clinic/terapeuta' onClick={() => setAvatarOpen(false)} style={{
                        display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px',
                        borderRadius: 8, textDecoration: 'none', color: '#c8e4f8', fontSize: 13,
                        transition: 'background .15s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(26,58,92,.5)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        <svg width='14' height='14' viewBox='0 0 16 16' fill='none' stroke='currentColor' strokeWidth='1.5'><circle cx='8' cy='6' r='3'/><path d='M2 14c0-3 2.7-5 6-5s6 2 6 5'/></svg>
                        Meu perfil
                      </Link>
                      <div style={{ height: 1, background: 'rgba(55,90,130,.3)', margin: '4px 8px' }} />
                      <button onClick={() => { setAvatarOpen(false); handleLogout(); }} style={{
                        display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px',
                        borderRadius: 8, background: 'none', border: 'none', width: '100%',
                        color: '#E05A4B', fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font-sans)',
                        transition: 'background .15s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(224,90,75,.1)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        <svg width='14' height='14' viewBox='0 0 16 16' fill='none' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round'><path d='M10 3h3a1 1 0 011 1v8a1 1 0 01-1 1h-3M7 11l-4-3 4-3M3 8h8'/></svg>
                        Sair
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </header>

          {/* Conteúdo da página */}
          <main style={{ flex: 1, padding: isMobile ? '16px 16px 90px' : '24px 28px 48px', overflowY: 'auto' }}>
            {children}
          </main>

        </div>
      </div>

        {/* ── TAB BAR MOBILE ── */}
        {isMobile && (
          <nav style={{
            position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
            background: 'rgba(7,17,31,.97)',
            borderTop: '1px solid rgba(55,100,150,.4)',
            backdropFilter: 'blur(20px)',
            display: 'flex', alignItems: 'stretch',
            paddingBottom: 'env(safe-area-inset-bottom)',
          }}>
            {/* 4 itens principais */}
            {[
              { href: '/clinic/dashboard', label: 'Início',    icon: 'M2 2h5v5H2zM9 2h5v5H9zM2 9h5v5H9z' },
              { href: '/clinic/pacientes', label: 'Pacientes', icon: 'M8 8a3 3 0 100-6 3 3 0 000 6zM2 18c0-3 2.7-5 6-5s6 2 6 5' },
              { href: '/clinic/sessao',    label: 'Sessão',    icon: 'M8 2a6 6 0 100 12A6 6 0 008 2zM8 5v3l2 1.5' },
              { href: '/clinic/agenda',    label: 'Agenda',    icon: 'M2 3h12a1 1 0 011 1v10a1 1 0 01-1 1H2a1 1 0 01-1-1V4a1 1 0 011-1zM5 3V1M11 3V1M1 7h14' },
            ].map(item => {
              const active = pathname === item.href || (item.href !== '/clinic/dashboard' && pathname.startsWith(item.href))
              return (
                <Link key={item.href} href={item.href} style={{
                  flex: 1, display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  padding: '10px 4px 8px', textDecoration: 'none',
                  color: active ? '#23c48f' : 'rgba(160,200,235,.65)', gap: 4, position: 'relative',
                }}>
                  {active && <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 32, height: 2, background: '#23c48f', borderRadius: '0 0 2px 2px' }} />}
                  <svg width="20" height="20" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d={item.icon} />
                  </svg>
                  <span style={{ fontSize: 10, fontWeight: active ? 600 : 400 }}>{item.label}</span>
                </Link>
              )
            })}
            {/* Botão MAIS */}
            <button onClick={() => setMenuMaisAberto(v => !v)} style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              padding: '10px 4px 8px', background: 'none', border: 'none',
              color: menuMaisAberto ? '#23c48f' : 'rgba(160,200,235,.65)', gap: 4, cursor: 'pointer',
              fontFamily: 'var(--font-sans)', position: 'relative',
            }}>
              {menuMaisAberto && <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 32, height: 2, background: '#23c48f', borderRadius: '0 0 2px 2px' }} />}
              <svg width="20" height="20" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="4" cy="8" r="1.2" fill="currentColor" stroke="none"/>
                <circle cx="8" cy="8" r="1.2" fill="currentColor" stroke="none"/>
                <circle cx="12" cy="8" r="1.2" fill="currentColor" stroke="none"/>
              </svg>
              <span style={{ fontSize: 10, fontWeight: menuMaisAberto ? 600 : 400 }}>Mais</span>
            </button>

            {/* Drawer MAIS */}
            {menuMaisAberto && (
              <>
                {/* Overlay */}
                <div onClick={() => setMenuMaisAberto(false)} style={{ position: 'fixed', inset: 0, bottom: 60, background: 'rgba(0,0,0,.5)', zIndex: 48 }} />
                {/* Painel */}
                <div style={{
                  position: 'fixed', left: 0, right: 0, bottom: 60, zIndex: 49,
                  background: 'rgba(10,24,40,.97)', borderTop: '1px solid rgba(55,100,150,.4)',
                  backdropFilter: 'blur(20px)', borderRadius: '16px 16px 0 0',
                  padding: '16px 0 8px',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
                    <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(80,130,180,.4)' }} />
                  </div>
                  {[
                    { section: 'Clínico', items: [
                      { href: '/clinic/programas',  label: 'Programas',   icon: 'M2 4h12M2 8h9M2 12h6' },
                      { href: '/clinic/avaliacoes', label: 'Avaliações',  icon: 'M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
                      { href: '/clinic/evolucao',   label: 'Evolução',    icon: 'M1 11l4-5 3 3 3-5 4 3M1 13h14' },
                    ]},
                    { section: 'Desenvolvimento', items: [
                      { href: '/clinic/education',  label: 'Education',   icon: 'M8 1l1.5 3 3.5.5-2.5 2.5.6 3.5L8 9l-3.1 1.5.6-3.5L3 4.5z' },
                      { href: '/clinic/supervisao', label: 'Supervisão',  icon: 'M1 5h14v9a1 1 0 01-1 1H2a1 1 0 01-1-1V5zM5 5V4a3 3 0 016 0v1' },
                    ]},
                    { section: 'Financeiro & Perfil', items: [
                      { href: '/clinic/wallet',     label: 'Clinic Wallet', icon: 'M8 2a6 6 0 100 12A6 6 0 008 2zM8 5v1.5M8 9.5V11M6 7.5c0-.8.9-1.5 2-1.5s2 .7 2 1.5-2 1.5-2 1.5' },
                      { href: '/clinic/terapeuta',  label: 'Meu Perfil',    icon: 'M8 8a3 3 0 100-6 3 3 0 000 6zM4 14s-1 0-1-1 1-4 5-4 5 3 5 4-1 1-1 1H4z' },
                    ]},
                  ].map(group => (
                    <div key={group.section}>
                      <div style={{ padding: '6px 20px 4px', fontSize: 9, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'rgba(160,195,230,.5)' }}>{group.section}</div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', padding: '4px 8px' }}>
                        {group.items.map(item => {
                          const active = pathname === item.href || pathname.startsWith(item.href)
                          return (
                            <Link key={item.href} href={item.href} onClick={() => setMenuMaisAberto(false)} style={{
                              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                              padding: '12px 8px', borderRadius: 10, textDecoration: 'none',
                              color: active ? '#23c48f' : 'rgba(160,200,235,.8)',
                              background: active ? 'rgba(29,158,117,.1)' : 'transparent',
                            }}>
                              <svg width="22" height="22" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                                <path d={item.icon} />
                              </svg>
                              <span style={{ fontSize: 11, fontWeight: active ? 600 : 400, textAlign: 'center' }}>{item.label}</span>
                            </Link>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </nav>
        )}

    </ClinicContext.Provider>
  )
}

function getPageTitle(pathname: string): string {
  const map: Record<string, string> = {
    '/clinic/dashboard':  'Dashboard',
    '/clinic/pacientes':  'Pacientes',
    '/clinic/programas':  'Programas',
    '/clinic/sessao':     'Sessão ativa',
    '/clinic/evolucao':   'Evolução',
    '/clinic/agenda':     'Agenda',
    '/clinic/education':  'FractaEducation',
    '/clinic/supervisao': 'Supervisão',
    '/clinic/wallet':     'Clinic Wallet',
    '/clinic/avaliacoes': 'Avaliações',
    '/clinic/terapeuta':  'Meu Perfil',
  }
  return map[pathname] ?? 'FractaClinic'
}
