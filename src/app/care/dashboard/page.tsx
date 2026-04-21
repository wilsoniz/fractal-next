'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { FractaLogo } from '@/components/fracta/FractaLogo'
import { FractalTriangle } from '@/components/fracta/FractalTriangle'
import { getDashboardData } from '@/lib/queries/learner'
import type { RadarSnapshotDB } from '@/lib/database.types'
import FractaForecastCard from './components/FractaForecastCard'
import { useCareContext } from './layout'
import FractaRadarChart from '@/components/fracta/FractaRadarChart'
import type { ScoresRadar } from '@/components/fracta/FractaRadarChart'

type DomKey = 'comunicacao' | 'social' | 'atencao' | 'regulacao' | 'brincadeira' | 'flexibilidade' | 'autonomia' | 'motivacao'

const DOMINIOS: { key: DomKey; nome: string; cor: string; radarKey: keyof RadarSnapshotDB }[] = [
  { key: 'comunicacao',   nome: 'Comunicação',  cor: 'linear-gradient(90deg,#2BBFA4,#7AE040)', radarKey: 'score_comunicacao'   },
  { key: 'social',        nome: 'Social',        cor: 'linear-gradient(90deg,#2A7BA8,#2BBFA4)', radarKey: 'score_social'        },
  { key: 'atencao',       nome: 'Atenção',       cor: 'linear-gradient(90deg,#4FC3D8,#2BBFA4)', radarKey: 'score_atencao'       },
  { key: 'regulacao',     nome: 'Regulação',     cor: 'linear-gradient(90deg,#2A7BA8,#4FC3D8)', radarKey: 'score_regulacao'     },
  { key: 'brincadeira',   nome: 'Brincadeira',   cor: 'linear-gradient(90deg,#7AE040,#2BBFA4)', radarKey: 'score_brincadeira'   },
  { key: 'flexibilidade', nome: 'Flexibilidade', cor: 'linear-gradient(90deg,#4FC3D8,#7AE040)', radarKey: 'score_flexibilidade' },
  { key: 'autonomia',     nome: 'Autonomia',     cor: 'linear-gradient(90deg,#2BBFA4,#7AE040)', radarKey: 'score_autonomia'     },
  { key: 'motivacao',     nome: 'Motivação',     cor: 'linear-gradient(90deg,#7AE040,#4FC3D8)', radarKey: 'score_motivacao'     },
]

const ATIVIDADES_DEFAULT = [
  { id: 'pedir-o-que-quer',         nome: 'Pedir o que quer',           dominio: 'Comunicação', tempo: '3 min', cor: '#2BBFA4', icon: '💬' },
  { id: 'aumentar-tempo-atividade', nome: 'Aumentar tempo em atividade', dominio: 'Atenção',    tempo: '5 min', cor: '#7AE040', icon: '⏱️' },
  { id: 'esperar-alguns-segundos',  nome: 'Esperar alguns segundos',    dominio: 'Regulação',   tempo: '3 min', cor: '#2A7BA8', icon: '🌊' },
]

const ICONS: Record<string, string> = { comunicacao:'💬', social:'🤝', atencao:'🎯', regulacao:'💙', brincadeira:'🎨', flexibilidade:'🔄', autonomia:'⭐', motivacao:'🚀' }
const CORES: Record<string, string> = { comunicacao:'#2BBFA4', social:'#4FC3D8', atencao:'#7AE040', regulacao:'#2A7BA8', brincadeira:'#2BBFA4', flexibilidade:'#4FC3D8', autonomia:'#7AE040', motivacao:'#2A7BA8' }
const NOMES_DOM: Record<string, string> = { comunicacao:'Comunicação', social:'Social', atencao:'Atenção', regulacao:'Regulação', brincadeira:'Brincadeira', flexibilidade:'Flexibilidade', autonomia:'Autonomia', motivacao:'Motivação' }

function getTagDominio(score: number): { tag: string; tc: string; tt: string } {
  if (score >= 75) return { tag: 'Forte',     tc: 'rgba(122,224,64,.15)', tt: '#3a6a1a' }
  if (score >= 60) return { tag: 'Crescendo', tc: 'rgba(43,191,164,.15)', tt: '#1a7a6a' }
  if (score >= 45) return { tag: 'Em foco',   tc: 'rgba(79,195,216,.15)', tt: '#1a5a6a' }
  return              { tag: 'Atenção',    tc: 'rgba(239,68,68,.10)',  tt: '#b91c1c' }
}

function gerarMensagemEngine(scores: Record<DomKey, number>, nome: string): string {
  const menor = DOMINIOS.map(d => ({ ...d, val: scores[d.key] ?? 50 })).sort((a, b) => a.val - b.val)[0]
  const media = Object.values(scores).reduce((a, b) => a + b, 0) / 8
  if (media >= 70)
    return `${nome} apresenta um perfil sólido. O FractaEngine identificou que ele está pronto para avançar em <strong style="color:#2BBFA4">${menor.nome.toLowerCase()}</strong>.`
  if (media >= 50)
    return `O FractaEngine identificou habilidades emergentes em <strong style="color:#2BBFA4">${menor.nome.toLowerCase()}</strong>. Práticas simples no dia a dia trarão avanços rápidos.`
  return `${nome} está em um momento importante. Foque em <strong style="color:#2BBFA4">${menor.nome.toLowerCase()}</strong> — uma habilidade-chave que desbloqueará outras.`
}

export default function CareDashboardPage() {
  const { criancaAtiva, nomeResp } = useCareContext()

  const [scores, setScores] = useState<Record<DomKey, number>>({
    comunicacao: 50, social: 50, atencao: 50, regulacao: 50,
    brincadeira: 50, flexibilidade: 50, autonomia: 50, motivacao: 50,
  })
  const [sessoes,     setSessoes]     = useState(0)
  const [atividades,  setAtividades]  = useState<{ id: string; nome: string; dominio: string; tempo: string; cor: string; icon: string }[]>([])
  const [barsVisible, setBarsVisible] = useState(false)
  const [loading,     setLoading]     = useState(true)
  const [isMobile,    setIsMobile]    = useState(false)

 useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener("resize", check)
    return () => window.removeEventListener("resize", check)
  }, [])

  useEffect(() => {
  if (!criancaAtiva) return

  async function carregarDados() {
    setLoading(true)
    setBarsVisible(false)

    // Busca direta por crianca_id (sem getDashboardData)
    const { data: radar } = await supabase
      .from('radar_snapshots')
      .select('*')
      .eq('crianca_id', criancaAtiva!.id)
      .order('criado_em', { ascending: false })
      .limit(1)
      .single()

    const { data: sessoesData } = await supabase
      .from('sessoes')
      .select('id')
      .eq('crianca_id', criancaAtiva!.id)

    setSessoes(sessoesData?.length ?? 0)

    if (radar) {
      // ── 1. Scores base da última avaliação
      const s: Record<DomKey, number> = {
        comunicacao:   radar.score_comunicacao   ?? 50,
        social:        radar.score_social        ?? 50,
        atencao:       radar.score_atencao       ?? 50,
        regulacao:     radar.score_regulacao     ?? 50,
        brincadeira:   radar.score_brincadeira   ?? 50,
        flexibilidade: radar.score_flexibilidade ?? 50,
        autonomia:     radar.score_autonomia     ?? 50,
        motivacao:     radar.score_motivacao     ?? 50,
      }

      // ── 2. Mesclar com score_atual dos planos (70% avaliação + 30% planos)
      const { data: planosScores } = await supabase
        .from('planos')
        .select('score_atual, programas(dominio)')
        .eq('crianca_id', criancaAtiva!.id)
        .eq('status', 'ativo')
        .not('score_atual', 'is', null)

      if (planosScores && planosScores.length > 0) {
        const novosScores = { ...s }
        for (const pl of planosScores) {
          const dominio = (pl.programas as any)?.dominio as DomKey
          if (dominio && pl.score_atual !== null) {
            novosScores[dominio] = Math.round(s[dominio] * 0.7 + pl.score_atual * 0.3)
          }
        }
        setScores(novosScores)
      } else {
        setScores(s)
      }
    } else {
      // Fallback: sessionStorage (logo após avaliação do Capture)
      const radarStr = sessionStorage.getItem('fracta_radar')
      if (radarStr) setScores(JSON.parse(radarStr))
    }

    // ── 3. Buscar planos ativos com programa vinculado
    const { data: planosAtivos } = await supabase
      .from('planos')
      .select('id, score_atual, programas(id, nome, dominio, tempo_minutos)')
      .eq('crianca_id', criancaAtiva!.id)
      .eq('status', 'ativo')
      .limit(6)

    if (planosAtivos && planosAtivos.length > 0) {
      setAtividades(
        planosAtivos
          .filter(pl => pl.programas)
          .map(pl => {
            const p = pl.programas as any
            return {
              id: pl.id,
              nome: p.nome,
              dominio: NOMES_DOM[p.dominio] ?? p.dominio,
              tempo: `${p.tempo_minutos ?? 5} min`,
              cor: CORES[p.dominio] ?? '#2BBFA4',
              icon: ICONS[p.dominio] ?? '🎯',
            }
          })
      )
    }

    setLoading(false)
    setTimeout(() => setBarsVisible(true), 300)
  }
    carregarDados()

    function handleVisibility() {
      if (document.visibilityState === 'visible') carregarDados()
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [criancaAtiva])

  const hora = new Date().getHours()
  const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite'
  const nomeCrianca = criancaAtiva?.nome || 'seu filho'
  const primeiroNome = criancaAtiva?.nome.split(' ')[0] || 'seu filho'

  const card: React.CSSProperties = {
    background: 'rgba(255,255,255,.84)',
    backdropFilter: 'blur(14px)',
    borderRadius: 22,
    border: '1px solid rgba(43,191,164,.18)',
    boxShadow: '0 4px 28px rgba(43,191,164,.06)',
    padding: 22,
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
        <div style={{ textAlign: 'center' }}>
          <FractaLogo logo="care" height={60} alt="FractaCare" />
          <p style={{ color: '#8a9ab8', fontSize: '.85rem', marginTop: 12 }}>Carregando painel...</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── HEADER */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: '.78rem', color: '#8a9ab8', marginBottom: 3 }}>{saudacao}, {nomeResp}</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1E3A5F', letterSpacing: '-.02em' }}>
            Painel de {primeiroNome}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Link href="/care/atividade" style={{
            padding: '12px 24px', borderRadius: 50, border: 'none',
            background: 'linear-gradient(135deg,#2BBFA4,#7AE040)',
            color: 'white', fontWeight: 800, fontSize: '.85rem',
            textDecoration: 'none', boxShadow: '0 4px 16px rgba(43,191,164,.35)',
          }}>
            Registrar atividade de hoje
          </Link>
          <Link href="/care/dashboard/avaliacao" style={{
            padding: '12px 24px', borderRadius: 50,
            border: '1.5px solid rgba(43,191,164,.4)',
            background: 'rgba(255,255,255,.7)',
            color: '#2BBFA4', fontWeight: 700, fontSize: '.85rem',
            textDecoration: 'none', backdropFilter: 'blur(8px)',
          }}>
            Avaliar {primeiroNome}
          </Link>
        </div>
      </div>

      {/* ── STATS */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3,1fr)', gap: 16 }}>
        {[
          { label: 'Atividades realizadas', val: sessoes.toString() || '0', sub: 'desde o início',            acc: true  },
          { label: 'Média geral',           val: `${Math.round(Object.values(scores).reduce((a, b) => a + b, 0) / 8)}%`, sub: 'no mapa de habilidades', acc: true  },
          { label: 'Próxima atividade',     val: 'Hoje', sub: `${atividades.length || 3} atividades disponíveis`, acc: false, subCor: '#2BBFA4' },
        ].map(s => (
          <div key={s.label} style={card}>
            <div style={{ fontSize: '.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.09em', color: '#8a9ab8', marginBottom: 8 }}>{s.label}</div>
            <div style={{ fontSize: s.acc ? '2.2rem' : '1.3rem', fontWeight: 800, color: s.acc ? '#2BBFA4' : '#1E3A5F', lineHeight: 1, marginBottom: 4 }}>{s.val}</div>
            <div style={{ fontSize: '.72rem', color: (s as { subCor?: string }).subCor ?? '#8a9ab8' }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* ── GRID PRINCIPAL */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 20 }}>

        {/* RADAR */}
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: '.88rem', fontWeight: 800, color: '#1E3A5F' }}>Mapa de habilidades</div>
              <div style={{ fontSize: '.68rem', color: '#8a9ab8', marginTop: 2 }}>
                Comparado ao esperado para a idade
              </div>
            </div>
            <Link href="/care/dashboard/meu-filho" style={{ fontSize: '.68rem', color: '#2BBFA4', textDecoration: 'none', fontWeight: 600 }}>
              Ver evolução →
            </Link>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <FractaRadarChart
              scores={scores as ScoresRadar}
              idadeAnos={criancaAtiva?.idade_anos ?? 4}
              size={240}
              animated
            />
          </div>
        </div>

        {/* COLUNA DIREITA */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* FRACTAENGINE */}
          <div style={{ background: 'linear-gradient(135deg,rgba(43,191,164,.1),rgba(42,123,168,.07))', border: '1px solid rgba(43,191,164,.2)', borderRadius: 22, padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <FractaLogo logo="engine" height={20} alt="FractaEngine" />
              <span style={{ fontSize: '.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.09em', color: '#2BBFA4' }}>FractaEngine</span>
            </div>
            <p
              style={{ fontSize: '.85rem', color: '#1E3A5F', lineHeight: 1.65, margin: 0 }}
              dangerouslySetInnerHTML={{ __html: gerarMensagemEngine(scores, primeiroNome) }}
            />
          </div>

          {/* FORECAST */}
          {criancaAtiva && (
            <FractaForecastCard
              criancaId={criancaAtiva.id}
              nomeCrianca={primeiroNome}
            />
          )}

          {/* ATIVIDADES DO DIA */}
          <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid rgba(43,191,164,.08)' }}>
              <div style={{ fontSize: '.82rem', fontWeight: 800, color: '#1E3A5F' }}>Atividades de hoje</div>
              <span style={{ fontSize: '.65rem', background: 'rgba(43,191,164,.12)', color: '#2BBFA4', fontWeight: 700, padding: '2px 9px', borderRadius: 50 }}>
                {atividades.length || 3} novas
              </span>
            </div>
            {(atividades.length > 0 ? atividades : ATIVIDADES_DEFAULT).map(a => (
              <Link
                key={a.id}
                href={`/care/atividade?planoId=${a.id}`}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px', borderBottom: '1px solid rgba(43,191,164,.06)', textDecoration: 'none', transition: 'background .15s' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(43,191,164,.04)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <div style={{ width: 36, height: 36, borderRadius: 11, background: `${a.cor}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.95rem', flexShrink: 0 }}>
                  {a.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '.85rem', fontWeight: 700, color: '#1E3A5F', marginBottom: 1 }}>{a.nome}</div>
                  <div style={{ fontSize: '.7rem', color: '#8a9ab8' }}>{a.dominio} · {a.tempo}</div>
                </div>
                <span style={{ color: '#2BBFA4', fontSize: '.9rem' }}>›</span>
              </Link>
            ))}
          </div>

        </div>
      </div>

      <style>{`
        @media(max-width:768px){
          .dashboard-grid { grid-template-columns:1fr !important; }
        }
      `}</style>
    </div>
  )
}
