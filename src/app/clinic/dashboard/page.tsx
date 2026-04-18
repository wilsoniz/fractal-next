'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useClinicContext } from '../layout'

// ── TIPOS ─────────────────────────────────────────────────────────────────
type SenioridadeNivel = 'terapeuta' | 'coordenador' | 'supervisor'

interface SessaoHoje {
  id: string
  paciente: string
  iniciais: string
  cor: string
  tipo: string
  programas: number
  horario: string
  status: 'agora' | 'proxima' | 'concluida'
}

interface PacienteEvolucao {
  id: string
  nome: string
  iniciais: string
  cor: string
  dominios: string
  pct: number
  corBarra: string
}

interface Programa {
  id: string
  nome: string
  paciente: string
  operantes: number
  dominio_pct: number
  status: 'ativo' | 'revisar' | 'pausado'
  cor: string
}

interface AlertaEngine {
  id: string
  tipo: 'critico' | 'aviso' | 'ok' | 'info' | 'neutro'
  texto: string
  tempo: string
}

// ── MOCK DATA (substitui Supabase enquanto schema não existe) ──────────────
const MOCK_SESSOES: SessaoHoje[] = [
  { id: '1', paciente: 'Lucas Carvalho',  iniciais: 'LC', cor: 'rgba(29,158,117,.2)',    tipo: 'DTT · Contato visual · 3 programas',   programas: 3, horario: '09:00–10:00', status: 'agora'     },
  { id: '2', paciente: 'Maria Santos',    iniciais: 'MS', cor: 'rgba(55,138,221,.15)',   tipo: 'NET · Mando · 2 programas',             programas: 2, horario: '14:00–15:00', status: 'proxima'   },
  { id: '3', paciente: 'Rafael Pinto',    iniciais: 'RP', cor: 'rgba(139,127,232,.15)',  tipo: 'DTT/NET misto · 4 programas',           programas: 4, horario: '16:30–17:30', status: 'proxima'   },
  { id: '4', paciente: 'Beatriz Lima',    iniciais: 'BL', cor: 'rgba(77,109,138,.2)',    tipo: 'NET · Tato · 2 programas',              programas: 2, horario: '08:00–09:00', status: 'concluida' },
]

const MOCK_PACIENTES: PacienteEvolucao[] = [
  { id: '1', nome: 'Lucas Carvalho', iniciais: 'LC', cor: 'rgba(29,158,117,.2)',   dominios: 'Comunicação · Espera · Tato',     pct: 78, corBarra: '#1D9E75' },
  { id: '2', nome: 'Maria Santos',   iniciais: 'MS', cor: 'rgba(55,138,221,.15)', dominios: 'Prontidão · Mando',               pct: 61, corBarra: '#378ADD' },
  { id: '3', nome: 'Rafael Pinto',   iniciais: 'RP', cor: 'rgba(139,127,232,.15)',dominios: 'Atenção · Tato · Social',         pct: 85, corBarra: '#8B7FE8' },
  { id: '4', nome: 'Beatriz Lima',   iniciais: 'BL', cor: 'rgba(77,109,138,.2)',  dominios: 'Fuga · NET',                      pct: 52, corBarra: '#4d6d8a' },
]

const MOCK_PROGRAMAS: Programa[] = [
  { id: '1', nome: 'Comunicação funcional', paciente: 'Lucas',  operantes: 4, dominio_pct: 78, status: 'ativo',   cor: '#1D9E75' },
  { id: '2', nome: 'Tolerância à espera',   paciente: 'Lucas',  operantes: 2, dominio_pct: 42, status: 'revisar', cor: '#EF9F27' },
  { id: '3', nome: 'Atenção conjunta',       paciente: 'Rafael', operantes: 3, dominio_pct: 85, status: 'ativo',   cor: '#378ADD' },
  { id: '4', nome: 'Prontidão p/ aprendiz', paciente: 'Maria',  operantes: 3, dominio_pct: 61, status: 'ativo',   cor: '#8B7FE8' },
  { id: '5', nome: 'Redução de fuga',        paciente: 'Beatriz',operantes: 2, dominio_pct: 52, status: 'pausado', cor: '#4d6d8a' },
]

const MOCK_ALERTAS: AlertaEngine[] = [
  { id: '1', tipo: 'critico', texto: '<strong>Lucas</strong> sem evolução em Espera há 3 sessões. Revisar critério.',  tempo: 'há 2h'  },
  { id: '2', tipo: 'aviso',   texto: '<strong>Rafael</strong> atingiu 85% em Tato. Pronto para progressão.',           tempo: 'ontem'  },
  { id: '3', tipo: 'ok',      texto: '<strong>Maria</strong> — nova atividade do FractaCare disponível.',              tempo: 'ontem'  },
  { id: '4', tipo: 'info',    texto: '<strong>Education:</strong> módulo de FBA liberado para seu nível.',             tempo: '2 dias' },
  { id: '5', tipo: 'neutro',  texto: '<strong>Beatriz</strong> — supervisão agendada para sexta às 15h.',              tempo: '3 dias' },
]

const CHART_DATA = [
  { dia: 'Seg', acerto: 72, ajuda: 18, erro: 10 },
  { dia: 'Ter', acerto: 68, ajuda: 22, erro: 10 },
  { dia: 'Qua', acerto: 76, ajuda: 15, erro: 9,  hoje: true },
  { dia: 'Qui', acerto: 0,  ajuda: 0,  erro: 0  },
  { dia: 'Sex', acerto: 0,  ajuda: 0,  erro: 0  },
  { dia: 'Sáb', acerto: 0,  ajuda: 0,  erro: 0  },
  { dia: 'Dom', acerto: 0,  ajuda: 0,  erro: 0  },
]

// ── HELPERS ────────────────────────────────────────────────────────────────
const STATUS_TAG: Record<SessaoHoje['status'], { label: string; bg: string; cor: string }> = {
  agora:     { label: 'Agora',  bg: 'rgba(29,158,117,.15)',  cor: '#23c48f' },
  proxima:   { label: '',       bg: 'rgba(55,138,221,.12)',  cor: '#378ADD' },
  concluida: { label: 'Ontem',  bg: 'rgba(26,58,92,.3)',     cor: '#4d6d8a' },
}

const PROG_TAG: Record<Programa['status'], { label: string; bg: string; cor: string }> = {
  ativo:   { label: 'Ativo',   bg: 'rgba(29,158,117,.12)',  cor: '#1D9E75' },
  revisar: { label: 'Revisar', bg: 'rgba(239,159,39,.12)',  cor: '#EF9F27' },
  pausado: { label: 'Pausa',   bg: 'rgba(26,58,92,.3)',     cor: '#4d6d8a' },
}

const ALERTA_COR: Record<AlertaEngine['tipo'], string> = {
  critico: '#E05A4B',
  aviso:   '#EF9F27',
  ok:      '#1D9E75',
  info:    '#378ADD',
  neutro:  '#4d6d8a',
}

const NIVEL_BANNER: Record<SenioridadeNivel, { texto: string; cor: string; bg: string; borda: string }> = {
  terapeuta:   { texto: 'Modo <strong>guiado</strong> ativo · Terapeuta · Continue concluindo trilhas Education',           cor: '#1D9E75', bg: 'rgba(29,158,117,.08)',  borda: 'rgba(29,158,117,.25)'  },
  coordenador: { texto: 'Modo <strong>semi-guiado</strong> ativo · Coordenador de caso · 6 pts para Supervisor',            cor: '#EF9F27', bg: 'rgba(239,159,39,.08)',  borda: 'rgba(239,159,39,.25)'  },
  supervisor:  { texto: 'Modo <strong>livre</strong> ativo · Supervisor · Você pode ajustar a lógica do FractaEngine',     cor: '#E05A4B', bg: 'rgba(224,90,75,.08)',   borda: 'rgba(224,90,75,.25)'   },
}

// ── COMPONENTE CARD ────────────────────────────────────────────────────────
function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: 'rgba(13,32,53,.7)',
      border: '1px solid rgba(70,120,180,.5)',
      borderRadius: 14,
      backdropFilter: 'blur(8px)',
      overflow: 'hidden',
      ...style,
    }}>
      {children}
    </div>
  )
}

function CardHeader({ title, action, href }: { title: string; action?: string; href?: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '14px 18px',
      borderBottom: '1px solid rgba(26,58,92,.35)',
    }}>
      <span style={{ fontSize: 13, fontWeight: 600, color: '#e8f0f8' }}>{title}</span>
      {action && href && (
        <Link href={href} style={{ fontSize: 11, color: '#1D9E75', fontWeight: 500, textDecoration: 'none', opacity: .85 }}>
          {action}
        </Link>
      )}
    </div>
  )
}

// ── PAGE ───────────────────────────────────────────────────────────────────
export default function ClinicDashboardPage() {
  const { terapeuta } = useClinicContext()
  const [sessoes,   setSessoes]   = useState<SessaoHoje[]>([])
  const [pacientes, setPacientes] = useState<PacienteEvolucao[]>([])
  const [programas, setProgramas] = useState<Programa[]>([])
  const [alertas,   setAlertas]   = useState<AlertaEngine[]>([])
  const [kpis,      setKpis]      = useState({ pacientes: 12, sessoesSemana: 8, programasAtivos: 23, receitaAbr: 7400 })
  const [loading,   setLoading]   = useState(true)
  const [isMobile,  setIsMobile]  = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    async function carregar() {
      setLoading(true)

      // Tenta carregar dados reais; cai no mock se tabelas não existirem
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          // Futuro: queries reais aqui
          // const { data: casos } = await supabase.from('patient_cases')...
        }
      } catch { /* silent */ }

      // Mock enquanto schema não está completo
      setSessoes(MOCK_SESSOES)
      setPacientes(MOCK_PACIENTES)
      setProgramas(MOCK_PROGRAMAS)
      setAlertas(MOCK_ALERTAS)
      setLoading(false)
    }
    carregar()
  }, [])

  const nivel   = terapeuta?.nivel ?? 'coordenador'
  const banner  = NIVEL_BANNER[nivel]

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 13, color: 'rgba(160,200,235,.90)', marginTop: 16 }}>Carregando painel clínico...</div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── BANNER SENIORIDADE */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        background: banner.bg,
        border: `1px solid ${banner.borda}`,
        borderRadius: 10, padding: '10px 16px',
      }}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke={banner.cor} strokeWidth="1.4">
          <path d="M8 1l1.5 3 3.5.5-2.5 2.5.6 3.5L8 9l-3.1 1.5.6-3.5L3 4.5z"/>
        </svg>
        <div
          style={{ fontSize: 12, color: 'rgba(138,168,200,.85)', flex: 1, lineHeight: 1.5 }}
          dangerouslySetInnerHTML={{ __html: banner.texto.replace('<strong>', `<strong style="color:${banner.cor}">`).replace('</strong>', '</strong>') }}
        />
        <Link href="/clinic/education" style={{ fontSize: 11, color: banner.cor, fontWeight: 500, textDecoration: 'none', whiteSpace: 'nowrap', opacity: .85 }}>
          Ver trilha →
        </Link>
      </div>

      {/* ── KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(4,minmax(0,1fr))', gap: 12 }}>
        {[
          { label: 'Pacientes ativos',      val: kpis.pacientes,      fmt: String(kpis.pacientes),                              cor: '#23c48f', delta: '↑ 2 este mês'         },
          { label: 'Sessões esta semana',    val: kpis.sessoesSemana,  fmt: String(kpis.sessoesSemana),                         cor: '#378ADD', delta: '↑ 1 vs semana anterior' },
          { label: 'Programas em andamento', val: kpis.programasAtivos,fmt: String(kpis.programasAtivos),                       cor: '#EF9F27', delta: '↓ 1 em revisão'        },
          { label: 'Receita estimada abr.',  val: kpis.receitaAbr,     fmt: `R$${(kpis.receitaAbr/1000).toFixed(1)}k`,         cor: '#E05A4B', delta: '↑ 12% vs março'        },
        ].map((k, i) => (
          <div key={i} style={{
            background: 'rgba(13,32,53,.7)', border: '1px solid rgba(70,120,180,.5)',
            borderRadius: 14, padding: '16px 18px',
            backdropFilter: 'blur(8px)', position: 'relative', overflow: 'hidden',
          }}>
            <div style={{ position: 'absolute', top: 0, right: 0, width: 60, height: 60, borderRadius: '50%', background: k.cor, opacity: .06, transform: 'translate(20px,-20px)' }} />
            <div style={{ fontSize: 11, color: 'rgba(165,205,240,.98)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.03em' }}>{k.label}</div>
            <div style={{ fontFamily: 'var(--font-sans)', fontSize: 28, fontWeight: 800, color: k.cor, margin: '6px 0 4px', letterSpacing: '-.02em', lineHeight: 1 }}>{k.fmt}</div>
            <div style={{ fontSize: 11, color: 'rgba(165,205,240,.98)' }}>{k.delta}</div>
          </div>
        ))}
      </div>

      {/* ── GRID PRINCIPAL */}
      <div style={{ display: 'grid', gridTemplateColumns: window.innerWidth < 1200 ? '1fr' : '1fr 1fr 300px', gap: 16 }}>

        {/* SESSÕES DO DIA */}
        <Card>
          <CardHeader title="Sessões de hoje" action="Ver agenda →" href="/clinic/agenda" />
          <div style={{ padding: '0 18px' }}>
            {sessoes.map((s, i) => {
              const tag = STATUS_TAG[s.status]
              return (
                <Link key={s.id} href={`/clinic/sessao?id=${s.id}`} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 0',
                  borderBottom: i < sessoes.length - 1 ? '1px solid rgba(26,58,92,.25)' : 'none',
                  textDecoration: 'none', transition: 'padding-left .15s',
                }}
                  onMouseEnter={e => (e.currentTarget.style.paddingLeft = '4px')}
                  onMouseLeave={e => (e.currentTarget.style.paddingLeft = '0')}
                >
                  <div style={{
                    width: 34, height: 34, borderRadius: '50%',
                    background: s.cor, display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontSize: 12, fontWeight: 600,
                    color: '#e8f0f8', flexShrink: 0,
                  }}>{s.iniciais}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: '#e8f0f8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.paciente}</div>
                    <div style={{ fontSize: 11, color: 'rgba(150,192,230,.95)', marginTop: 1 }}>{s.tipo}</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 10, padding: '2px 7px', borderRadius: 20, fontWeight: 500, background: tag.bg, color: tag.cor }}>
                      {s.status === 'proxima' ? s.horario.split('–')[0] : tag.label}
                    </div>
                    <div style={{ fontSize: 11, color: 'rgba(160,200,235,.90)', fontFamily: 'monospace', marginTop: 3 }}>{s.horario}</div>
                  </div>
                </Link>
              )
            })}
          </div>
        </Card>

        {/* GRÁFICO SEMANAL */}
        <Card>
          <CardHeader title="Evolução semanal (tentativas %)" action="Detalhes →" href="/clinic/evolucao" />
          <div style={{ padding: '16px 18px' }}>

            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 90 }}>
              {CHART_DATA.map((d, i) => (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', gap: 1, height: '100%' }}>
                  {d.acerto > 0 ? (
                    <>
                      <div style={{ width: '100%', height: `${(d.erro / 100) * 90}px`,  background: 'rgba(26,58,92,.6)',  borderRadius: '2px 2px 0 0' }} />
                      <div style={{ width: '100%', height: `${(d.ajuda / 100) * 90}px`, background: '#378ADD',            borderRadius: '2px 2px 0 0' }} />
                      <div style={{ width: '100%', height: `${(d.acerto / 100) * 90}px`,background: '#1D9E75',            borderRadius: '2px 2px 0 0' }} />
                    </>
                  ) : (
                    <div style={{ width: '100%', height: 4, background: 'rgba(20,55,110,.55)', borderRadius: 2 }} />
                  )}
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
              {CHART_DATA.map((d, i) => (
                <div key={i} style={{
                  flex: 1, textAlign: 'center',
                  fontSize: 9, fontFamily: 'monospace',
                  color: d.hoje ? '#1D9E75' : 'rgba(140,185,225,.92)',
                }}>
                  {d.dia}
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 16, marginTop: 12, flexWrap: 'wrap' }}>
              {[['#1D9E75','Acertos'],['#378ADD','Com ajuda'],['rgba(26,58,92,.6)','Erros']].map(([cor,label]) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: cor }} />
                  <span style={{ fontSize: 11, color: 'rgba(150,192,230,.95)' }}>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* ALERTAS ENGINE */}
        <Card>
          <CardHeader title="Alertas do Engine" action="Todos →" href="/clinic/evolucao" />
          <div style={{ padding: '0 18px' }}>
            {alertas.map((a, i) => (
              <div key={a.id} style={{
                display: 'flex', gap: 10,
                padding: '10px 0',
                borderBottom: i < alertas.length - 1 ? '1px solid rgba(26,58,92,.2)' : 'none',
                cursor: 'pointer',
              }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: ALERTA_COR[a.tipo], marginTop: 4, flexShrink: 0 }} />
                <div>
                  <div
                    style={{ fontSize: 12, color: 'rgba(138,168,200,.85)', lineHeight: 1.5 }}
                    dangerouslySetInnerHTML={{ __html: a.texto }}
                  />
                  <div style={{ fontSize: 10, color: 'rgba(140,185,225,.92)', fontFamily: 'monospace', marginTop: 3 }}>{a.tempo}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>

      </div>

      {/* ── GRID INFERIOR */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16 }}>

        {/* PROGRAMAS */}
        <Card>
          <CardHeader title="Programas em andamento" action="Ver todos →" href="/clinic/programas" />
          <div style={{ padding: '0 18px' }}>
            {programas.map((p, i) => {
              const tag = PROG_TAG[p.status]
              return (
                <Link key={p.id} href={`/clinic/programas?id=${p.id}`} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 0',
                  borderBottom: i < programas.length - 1 ? '1px solid rgba(26,58,92,.2)' : 'none',
                  textDecoration: 'none',
                }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.cor, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 500, color: '#e8f0f8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.nome} — {p.paciente}</div>
                    <div style={{ fontSize: 11, color: 'rgba(140,185,225,.92)' }}>{p.operantes} operantes · {p.dominio_pct}% domínio médio</div>
                  </div>
                  <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 20, fontWeight: 500, background: tag.bg, color: tag.cor, whiteSpace: 'nowrap', flexShrink: 0 }}>
                    {tag.label}
                  </span>
                </Link>
              )
            })}
          </div>
        </Card>

        {/* COLUNA DIREITA: PACIENTES + WALLET */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          <Card>
            <CardHeader title="Pacientes — evolução geral" action="Ver perfis →" href="/clinic/pacientes" />
            <div style={{ padding: '0 18px' }}>
              {pacientes.map((p, i) => (
                <Link key={p.id} href={`/clinic/paciente/${p.id}`} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 0',
                  borderBottom: i < pacientes.length - 1 ? '1px solid rgba(26,58,92,.2)' : 'none',
                  textDecoration: 'none',
                }}>
                  <div style={{ width: 30, height: 30, borderRadius: 8, background: p.cor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#e8f0f8', flexShrink: 0 }}>
                    {p.iniciais}
                  </div>
                  <div style={{ minWidth: 0, width: 90 }}>
                    <div style={{ fontSize: 12, fontWeight: 500, color: '#e8f0f8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.nome}</div>
                    <div style={{ fontSize: 11, color: 'rgba(140,185,225,.92)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.dominios}</div>
                  </div>
                  <div style={{ flex: 1, height: 4, background: 'rgba(26,58,92,.5)', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${p.pct}%`, background: p.corBarra, borderRadius: 4 }} />
                  </div>
                  <div style={{ fontSize: 11, color: 'rgba(160,200,235,.92)', fontFamily: 'monospace', width: 30, textAlign: 'right', flexShrink: 0 }}>{p.pct}%</div>
                </Link>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader title="Clinic Wallet — abril" action="Abrir →" href="/clinic/wallet" />
            <div style={{ padding: '0 18px' }}>
              {[
                { k: 'Receita prevista',      v: 'R$ 8.400',  cor: 'rgba(175,210,240,.95)' },
                { k: 'Confirmado (sessões)',  v: 'R$ 7.420',  cor: '#1D9E75'               },
                { k: 'Cancelamentos',         v: '− R$ 980',  cor: '#E05A4B'               },
                { k: 'Próximo repasse',       v: '21/04',     cor: '#EF9F27'               },
              ].map((r, i, arr) => (
                <div key={r.k} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '8px 0',
                  borderBottom: i < arr.length - 1 ? '1px solid rgba(26,58,92,.2)' : 'none',
                }}>
                  <span style={{ fontSize: 12, color: 'rgba(160,200,235,.92)' }}>{r.k}</span>
                  <span style={{ fontSize: 12, fontWeight: 500, fontFamily: 'monospace', color: r.cor }}>{r.v}</span>
                </div>
              ))}
            </div>
          </Card>

        </div>
      </div>

    </div>
  )
}
