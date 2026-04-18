'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useCareContext } from '../layout'

type Plano = {
  id: string
  score_atual: number | null
  score_inicio: number | null
  iniciado_em: string | null
  programas: {
    id: string
    nome: string
    dominio: string
    tempo_minutos: number
    objetivo: string | null
    nivel: string
  } | null
}

type Sessao = {
  id: string
  plano_id: string
  acertos: number
  total_tentativas: number
  taxa_acerto: number | null
  humor_crianca: number | null
  observacao: string | null
  concluida: boolean
  criado_em: string
  planos?: { programas?: { nome: string; dominio: string } | null } | null
}

const CORES: Record<string, string> = {
  comunicacao: '#2BBFA4', social: '#4FC3D8', atencao: '#7AE040',
  regulacao: '#2A7BA8', brincadeira: '#A78BFA', flexibilidade: '#F59E0B',
  autonomia: '#34D399', motivacao: '#F87171',
}
const ICONS: Record<string, string> = {
  comunicacao: '💬', social: '🤝', atencao: '🎯', regulacao: '💙',
  brincadeira: '🎨', flexibilidade: '🔄', autonomia: '⭐', motivacao: '🚀',
}
const HUMOR_EMOJI: Record<number, string> = { 1: '😤', 2: '😕', 3: '😐', 4: '😊', 5: '🤩' }

function formatarDataRelativa(dataStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dataStr).getTime()) / 86400000)
  if (diff === 0) return 'Hoje'
  if (diff === 1) return 'Ontem'
  if (diff < 7) return `${diff} dias atrás`
  return new Date(dataStr).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

function calcularStreak(sessoes: Sessao[]): number {
  if (sessoes.length === 0) return 0
  const diasComSessao = new Set(sessoes.map(s => new Date(s.criado_em).toDateString()))
  let streak = 0
  const dia = new Date()
  dia.setHours(0, 0, 0, 0)
  while (diasComSessao.has(dia.toDateString())) {
    streak++
    dia.setDate(dia.getDate() - 1)
  }
  return streak
}

// ── Anel de progresso SVG
function AnelProgresso({ pct, cor, size = 80 }: { pct: number; cor: string; size?: number }) {
  const r = (size - 10) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (pct / 100) * circ
  const cx = size / 2
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cx} r={r} fill="none" stroke="rgba(0,0,0,.06)" strokeWidth={6}/>
      <circle
        cx={cx} cy={cx} r={r} fill="none"
        stroke={cor} strokeWidth={6}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cx})`}
        style={{ transition: 'stroke-dashoffset 1s ease' }}
      />
      <text x={cx} y={cx} textAnchor="middle" dominantBaseline="central"
        style={{ fontSize: size * 0.22, fontWeight: 800, fill: cor, fontFamily: 'var(--font-sans)' }}>
        {pct}%
      </text>
    </svg>
  )
}

// ── Mini linha de evolução SVG
function LinhaEvolucao({ pontos, cor, width = 120, height = 36 }: { pontos: number[]; cor: string; width?: number; height?: number }) {
  if (pontos.length < 2) return (
    <div style={{ width, height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ fontSize: 10, color: '#94a3b8' }}>Poucas sessões</span>
    </div>
  )
  const min = Math.min(...pontos)
  const max = Math.max(...pontos)
  const range = max - min || 1
  const pad = 4
  const w = width - pad * 2
  const h = height - pad * 2
  const coords = pontos.map((v, i) => ({
    x: pad + (i / (pontos.length - 1)) * w,
    y: pad + h - ((v - min) / range) * h,
  }))
  const path = coords.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const area = `${path} L${coords[coords.length-1].x},${pad+h} L${coords[0].x},${pad+h} Z`

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <path d={area} fill={cor} opacity={0.12}/>
      <path d={path} fill="none" stroke={cor} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"/>
      {/* Último ponto */}
      <circle cx={coords[coords.length-1].x} cy={coords[coords.length-1].y} r={3} fill={cor}/>
    </svg>
  )
}

export default function AtividadesPage() {
  const { criancaAtiva } = useCareContext()
  const [planos, setPlanos] = useState<Plano[]>([])
  const [sessoes, setSessoes] = useState<Sessao[]>([])
  const [loading, setLoading] = useState(true)
  const [secaoAberta, setSecaoAberta] = useState<'progresso' | 'historico' | null>('progresso')

  useEffect(() => {
    if (!criancaAtiva) return
    carregarDados()
  }, [criancaAtiva])

  async function carregarDados() {
    setLoading(true)
    const [{ data: pl }, { data: se }] = await Promise.all([
      supabase.from('planos')
        .select('id, score_atual, score_inicio, iniciado_em, programas(id, nome, dominio, tempo_minutos, objetivo, nivel)')
        .eq('crianca_id', criancaAtiva!.id).eq('status', 'ativo')
        .order('criado_em', { ascending: true }),
      supabase.from('sessoes')
        .select('id, plano_id, acertos, total_tentativas, taxa_acerto, humor_crianca, observacao, concluida, criado_em, planos(programas(nome, dominio))')
        .eq('crianca_id', criancaAtiva!.id)
        .order('criado_em', { ascending: false }).limit(60),
    ])
    setPlanos((pl as any) ?? [])
    setSessoes((se as any) ?? [])
    setLoading(false)
  }

  const nomeFilho = criancaAtiva?.nome.split(' ')[0] ?? '—'
  const streak = calcularStreak(sessoes)
  const totalSessoes = sessoes.length
  const mediaAcertos = sessoes.length > 0
    ? Math.round(sessoes.reduce((acc, s) => acc + (s.taxa_acerto ?? 0), 0) / sessoes.length) : 0

  // Timeline 30 dias
  const ultimos30 = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (29 - i)); d.setHours(0,0,0,0); return d
  })
  const sessoesPorDia = new Map<string, Sessao[]>()
  for (const s of sessoes) {
    const k = new Date(s.criado_em).toDateString()
    if (!sessoesPorDia.has(k)) sessoesPorDia.set(k, [])
    sessoesPorDia.get(k)!.push(s)
  }

  // Progresso por plano
  const progressoPorPlano = planos.map(pl => {
    const sp = sessoes.filter(s => s.plano_id === pl.id)
    const mediaPl = sp.length > 0
      ? Math.round(sp.reduce((a, s) => a + (s.taxa_acerto ?? 0), 0) / sp.length) : null
    const scoreAtual = pl.score_atual ?? mediaPl ?? 0
    const evolucao = scoreAtual - (pl.score_inicio ?? 0)
    // Linha de evolução — últimas 8 sessões do plano
    const pontosLinha = sp.slice(-8).reverse().map(s => s.taxa_acerto ?? 0)
    return { ...pl, sessoesCount: sp.length, scoreAtual, evolucao, pontosLinha }
  })

  const card: React.CSSProperties = {
    background: 'rgba(255,255,255,.84)', backdropFilter: 'blur(14px)',
    borderRadius: 22, border: '1px solid rgba(43,191,164,.18)',
    boxShadow: '0 4px 28px rgba(43,191,164,.06)',
  }

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:300 }}>
      <p style={{ color:'#8a9ab8', fontSize:14 }}>Carregando atividades...</p>
    </div>
  )

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>

      {/* HEADER */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
        <div>
          <div style={{ fontSize:'.78rem', color:'#8a9ab8', marginBottom:3 }}>Atividades de</div>
          <div style={{ fontSize:'1.4rem', fontWeight:800, color:'#1E3A5F', letterSpacing:'-.02em' }}>{nomeFilho}</div>
        </div>
        <Link href="/care/atividade" style={{
          padding:'11px 22px', borderRadius:50, border:'none',
          background:'linear-gradient(135deg,#2BBFA4,#7AE040)',
          color:'white', fontWeight:700, fontSize:'.85rem',
          textDecoration:'none', boxShadow:'0 4px 16px rgba(43,191,164,.35)',
        }}>Iniciar atividade</Link>
      </div>

      {/* STATS */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
        {[
          { label:'Sessões', val:totalSessoes.toString(), sub:'realizadas', cor:'#2BBFA4' },
          { label:'Média', val:`${mediaAcertos}%`, sub:'de acertos', cor:'#7AE040' },
          { label:'Sequência', val:streak.toString(), sub:streak===1?'dia ativo':'dias ativos', cor:'#F59E0B',
            badge: streak >= 3 ? '🔥' : undefined },
        ].map(s => (
          <div key={s.label} style={{ ...card, padding:'16px 14px', textAlign:'center' }}>
            <div style={{ fontSize:'.6rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'.08em', color:'#8a9ab8', marginBottom:6 }}>{s.label}</div>
            <div style={{ fontSize:'1.8rem', fontWeight:800, color:s.cor, lineHeight:1, marginBottom:3 }}>
              {(s as any).badge}{s.val}
            </div>
            <div style={{ fontSize:'.65rem', color:'#8a9ab8' }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* ── CONSISTÊNCIA (fixo, sempre visível) */}
      <div style={{ ...card, padding:'18px 20px' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
          <div>
            <div style={{ fontSize:'.88rem', fontWeight:800, color:'#1E3A5F' }}>Consistência</div>
            <div style={{ fontSize:'.72rem', color:'#8a9ab8' }}>Últimos 30 dias</div>
          </div>
          {streak > 0 && (
            <div style={{
              fontSize:13, fontWeight:700, padding:'4px 12px', borderRadius:99,
              background:'rgba(245,158,11,.12)', color:'#92400e',
            }}>
              🔥 {streak} {streak===1?'dia':'dias'} seguidos
            </div>
          )}
        </div>

        <div style={{ display:'flex', flexWrap:'wrap', gap:4, marginBottom:12 }}>
          {ultimos30.map((dia, i) => {
            const sd = sessoesPorDia.get(dia.toDateString()) ?? []
            const tem = sd.length > 0
            const media = tem ? Math.round(sd.reduce((a,s) => a+(s.taxa_acerto??0),0)/sd.length) : 0
            const ehHoje = dia.toDateString() === new Date().toDateString()
            let bg = 'rgba(43,191,164,.08)'
            if (tem) bg = media >= 70 ? '#2BBFA4' : media >= 40 ? '#7AE040' : '#F59E0B'
            return (
              <div key={i} title={`${dia.toLocaleDateString('pt-BR')}: ${sd.length} sessão(ões)${tem?` · ${media}% acertos`:''}`}
                style={{
                  width:28, height:28, borderRadius:6, background:bg, flexShrink:0,
                  border: ehHoje ? '2px solid #1E3A5F' : 'none',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:9, fontWeight:700, color: tem?'white':'transparent',
                }}>
                {sd.length > 1 ? sd.length : ''}
              </div>
            )
          })}
        </div>

        <div style={{ display:'flex', alignItems:'center', gap:10, fontSize:10, color:'#94a3b8' }}>
          <span>Menos</span>
          {['rgba(43,191,164,.08)','#F59E0B','#7AE040','#2BBFA4'].map((c,i) => (
            <div key={i} style={{ width:12, height:12, borderRadius:3, background:c }}/>
          ))}
          <span>Mais</span>
        </div>
      </div>

      {/* ── PROGRAMAS ATIVOS */}
      <div style={card}>
        <div style={{ padding:'18px 20px', borderBottom:'1px solid rgba(43,191,164,.08)' }}>
          <div style={{ fontSize:'.88rem', fontWeight:800, color:'#1E3A5F' }}>Programas ativos</div>
          <div style={{ fontSize:'.72rem', color:'#8a9ab8', marginTop:2 }}>
            {planos.length} programa{planos.length!==1?'s':''} em andamento
          </div>
        </div>
        {planos.length === 0 ? (
          <div style={{ padding:'32px 20px', textAlign:'center' }}>
            <p style={{ color:'#8a9ab8', fontSize:14, marginBottom:16 }}>Nenhum programa ativo.</p>
            <Link href="/care/dashboard/avaliacao" style={{
              display:'inline-block', padding:'10px 24px',
              border:'1.5px solid rgba(43,191,164,.4)', background:'rgba(255,255,255,.7)',
              color:'#2BBFA4', borderRadius:50, textDecoration:'none', fontWeight:700, fontSize:13,
            }}>Fazer avaliação</Link>
          </div>
        ) : planos.map((pl, i) => {
          if (!pl.programas) return null
          const p = pl.programas
          const cor = CORES[p.dominio] ?? '#2BBFA4'
          const icon = ICONS[p.dominio] ?? '🎯'
          const score = pl.score_atual ?? 0
          const dias = pl.iniciado_em ? Math.floor((Date.now()-new Date(pl.iniciado_em).getTime())/86400000) : 0
          return (
            <div key={pl.id} style={{
              display:'flex', alignItems:'center', gap:14, padding:'14px 20px',
              borderBottom: i<planos.length-1 ? '1px solid rgba(43,191,164,.06)' : 'none',
            }}>
              <div style={{ width:44, height:44, borderRadius:13, flexShrink:0, background:`${cor}18`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.1rem' }}>
                {icon}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:'.88rem', fontWeight:700, color:'#1E3A5F', marginBottom:4 }}>{p.nome}</div>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                  <span style={{ fontSize:10, fontWeight:600, padding:'2px 7px', borderRadius:99, background:`${cor}18`, color:cor }}>{p.dominio}</span>
                  <span style={{ fontSize:11, color:'#8a9ab8' }}>{p.tempo_minutos} min · {dias} dias ativo</span>
                </div>
                <div style={{ height:5, background:'rgba(43,191,164,.1)', borderRadius:99, overflow:'hidden' }}>
                  <div style={{ height:'100%', width:`${score}%`, background:`linear-gradient(90deg,${cor},${cor}cc)`, borderRadius:99, transition:'width 0.8s ease' }}/>
                </div>
                <div style={{ fontSize:10, color:'#8a9ab8', marginTop:3 }}>Score atual: {score}%</div>
              </div>
              <Link href={`/care/atividade?planoId=${pl.id}`} style={{
                padding:'8px 14px', borderRadius:10, border:'none',
                background:`linear-gradient(135deg,${cor},${cor}cc)`,
                color:'white', fontSize:12, fontWeight:700, textDecoration:'none',
                flexShrink:0, boxShadow:`0 2px 8px ${cor}40`,
              }}>Praticar</Link>
            </div>
          )
        })}
      </div>

      {/* ── PROGRESSO POR PROGRAMA (acordeão) */}
      <SecaoAcordeon
        titulo="Progresso por programa"
        subtitulo="Anel de progresso + evolução por sessão"
        aberta={secaoAberta === 'progresso'}
        onToggle={() => setSecaoAberta(secaoAberta==='progresso'?null:'progresso')}
        cor="#2BBFA4"
      >
        {progressoPorPlano.length === 0 ? (
          <p style={{ color:'#8a9ab8', fontSize:13, textAlign:'center', padding:'16px 0' }}>
            Faça algumas sessões para ver o progresso.
          </p>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            {progressoPorPlano.map(pl => {
              if (!pl.programas) return null
              const cor = CORES[pl.programas.dominio] ?? '#2BBFA4'
              const meta = 80
              const pctMeta = Math.min(100, Math.round((pl.scoreAtual / meta) * 100))
              return (
                <div key={pl.id} style={{
                  borderRadius:18, overflow:'hidden',
                  background:`linear-gradient(135deg,${cor}10,${cor}05)`,
                  border:`1px solid ${cor}20`, padding:'16px',
                }}>
                  {/* Linha superior: nome + sessões */}
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:14 }}>
                    <div>
                      <div style={{ fontSize:14, fontWeight:800, color:'#1E3A5F' }}>{pl.programas.nome}</div>
                      <div style={{ fontSize:11, color:'#8a9ab8', marginTop:2 }}>
                        {pl.sessoesCount} sessão{pl.sessoesCount!==1?'ões':''} · domínio {pl.programas.dominio}
                      </div>
                    </div>
                    {pl.evolucao !== 0 && (
                      <div style={{
                        fontSize:13, fontWeight:800, padding:'4px 10px', borderRadius:99,
                        background: pl.evolucao>0 ? 'rgba(43,191,164,.15)' : 'rgba(239,68,68,.1)',
                        color: pl.evolucao>0 ? '#2BBFA4' : '#ef4444',
                      }}>
                        {pl.evolucao>0?'↑':'↓'} {Math.abs(pl.evolucao)}pts
                      </div>
                    )}
                  </div>

                  {/* Anel + linha + números */}
                  <div style={{ display:'flex', alignItems:'center', gap:16 }}>
                    {/* Anel de progresso */}
                    <div style={{ flexShrink:0, display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
                      <AnelProgresso pct={pl.scoreAtual} cor={cor} size={88}/>
                      <div style={{ fontSize:9, color:'#8a9ab8', fontWeight:600 }}>SCORE ATUAL</div>
                    </div>

                    {/* Linha de evolução + números */}
                    <div style={{ flex:1, minWidth:0 }}>
                      {pl.pontosLinha.length >= 2 ? (
                        <>
                          <div style={{ fontSize:10, color:'#8a9ab8', marginBottom:4, fontWeight:600 }}>
                            EVOLUÇÃO POR SESSÃO
                          </div>
                          <LinhaEvolucao pontos={pl.pontosLinha} cor={cor} width={160} height={44}/>
                        </>
                      ) : (
                        <div style={{ fontSize:11, color:'#94a3b8', fontStyle:'italic' }}>
                          Faça mais sessões para ver a evolução
                        </div>
                      )}

                      {/* Barra de meta */}
                      <div style={{ marginTop:10 }}>
                        <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:'#8a9ab8', marginBottom:4 }}>
                          <span>Progresso até a meta (80%)</span>
                          <span style={{ fontWeight:700, color:cor }}>{pctMeta}%</span>
                        </div>
                        <div style={{ height:6, background:'rgba(0,0,0,.06)', borderRadius:99, overflow:'hidden' }}>
                          <div style={{ height:'100%', width:`${pctMeta}%`, background:`linear-gradient(90deg,${cor},${cor}cc)`, borderRadius:99, transition:'width 1s ease' }}/>
                        </div>
                      </div>

                      {/* Início vs atual */}
                      <div style={{ display:'flex', gap:16, marginTop:8 }}>
                        <div style={{ fontSize:10, color:'#8a9ab8' }}>
                          Início: <span style={{ fontWeight:700, color:'#1E3A5F' }}>{pl.score_inicio??0}%</span>
                        </div>
                        <div style={{ fontSize:10, color:'#8a9ab8' }}>
                          Meta: <span style={{ fontWeight:700, color:cor }}>80%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </SecaoAcordeon>

      {/* ── HISTÓRICO DE SESSÕES (acordeão) */}
      <SecaoAcordeon
        titulo="Histórico de sessões"
        subtitulo={`${totalSessoes} sessão${totalSessoes!==1?'ões':''} no total`}
        aberta={secaoAberta === 'historico'}
        onToggle={() => setSecaoAberta(secaoAberta==='historico'?null:'historico')}
        cor="#2A7BA8"
      >
        {sessoes.length === 0 ? (
          <p style={{ color:'#8a9ab8', fontSize:13, textAlign:'center', padding:'16px 0' }}>
            Nenhuma sessão registrada ainda.
          </p>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {sessoes.slice(0,20).map(s => {
              const prog = (s.planos as any)?.programas
              const cor = prog ? (CORES[prog.dominio]??'#2BBFA4') : '#2BBFA4'
              const taxa = s.taxa_acerto ?? (s.total_tentativas>0 ? Math.round((s.acertos/s.total_tentativas)*100) : 0)
              return (
                <div key={s.id} style={{
                  display:'flex', alignItems:'center', gap:12, padding:'12px 14px',
                  borderRadius:14, background:'rgba(0,0,0,.02)', border:'1px solid rgba(0,0,0,.05)',
                }}>
                  <div style={{
                    width:40, height:40, borderRadius:10, flexShrink:0,
                    background: taxa>=70?'rgba(43,191,164,.15)':taxa>=40?'rgba(245,158,11,.15)':'rgba(148,163,184,.15)',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:13, fontWeight:800,
                    color: taxa>=70?'#2BBFA4':taxa>=40?'#F59E0B':'#94a3b8',
                  }}>
                    {taxa}%
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight:700, color:'#1E3A5F', marginBottom:2 }}>
                      {prog?.nome ?? 'Atividade'}
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                      <span style={{ fontSize:11, color:'#8a9ab8' }}>{formatarDataRelativa(s.criado_em)}</span>
                      <span style={{ fontSize:11, color:'#8a9ab8' }}>{s.acertos} acerto{s.acertos!==1?'s':''} de {s.total_tentativas}</span>
                      {s.humor_crianca && <span style={{ fontSize:13 }}>{HUMOR_EMOJI[s.humor_crianca]}</span>}
                    </div>
                    {s.observacao && (
                      <div style={{ fontSize:11, color:'#64748b', marginTop:2, fontStyle:'italic', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        "{s.observacao}"
                      </div>
                    )}
                  </div>
                  <div style={{ width:4, height:40, borderRadius:99, flexShrink:0, background: taxa>=70?'#2BBFA4':taxa>=40?'#F59E0B':'#e2e8f0' }}/>
                </div>
              )
            })}
            {sessoes.length > 20 && (
              <div style={{ textAlign:'center', fontSize:12, color:'#8a9ab8', paddingTop:8 }}>
                Mostrando as 20 mais recentes de {sessoes.length} sessões
              </div>
            )}
          </div>
        )}
      </SecaoAcordeon>

    </div>
  )
}

function SecaoAcordeon({ titulo, subtitulo, aberta, onToggle, cor, badge, children }: {
  titulo: string; subtitulo: string; aberta: boolean; onToggle: () => void
  cor: string; badge?: string; children: React.ReactNode
}) {
  return (
    <div style={{
      background:'rgba(255,255,255,.84)', backdropFilter:'blur(14px)',
      borderRadius:22, overflow:'hidden', transition:'all 0.2s',
      border:`1px solid ${aberta?cor+'30':'rgba(43,191,164,.12)'}`,
      boxShadow: aberta?`0 4px 28px ${cor}10`:'0 2px 8px rgba(0,0,0,.04)',
    }}>
      <button onClick={onToggle} style={{
        width:'100%', padding:'18px 20px', display:'flex', alignItems:'center', gap:12,
        background:'none', border:'none', cursor:'pointer', textAlign:'left',
      }}>
        <div style={{ width:8, height:8, borderRadius:'50%', flexShrink:0, background:aberta?cor:'#e2e8f0', transition:'background 0.2s' }}/>
        <div style={{ flex:1 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ fontSize:'.88rem', fontWeight:800, color:'#1E3A5F' }}>{titulo}</span>
            {badge && <span style={{ fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:99, background:`${cor}18`, color:cor }}>{badge}</span>}
          </div>
          <div style={{ fontSize:'.72rem', color:'#8a9ab8', marginTop:1 }}>{subtitulo}</div>
        </div>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round"
          style={{ transform:aberta?'rotate(180deg)':'none', transition:'transform 0.2s', flexShrink:0 }}>
          <path d="M6 9l6 6 6-6"/>
        </svg>
      </button>
      {aberta && (
        <div style={{ padding:'0 20px 20px', borderTop:`1px solid ${cor}15` }}>
          <div style={{ paddingTop:16 }}>{children}</div>
        </div>
      )}
    </div>
  )
}
