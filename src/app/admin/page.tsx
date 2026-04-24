'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

// ── Tipos ─────────────────────────────────────────────────────────────────────
interface Metricas {
  totalUsuarios: number
  totalCriancas: number
  totalSessoes: number
  sessoesRealizadas: number
  sessoesCanceladas: number
  totalAvaliacoes: number
  avaliacoesConvertidas: number
  totalCheckins: number
  totalPlanos: number
  planosAtivos: number
  mediaScoreGeral: number
  crescimentoSemana: number
}

interface SerieHistorica {
  label: string
  usuarios: number
  sessoes: number
  avaliacoes: number
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function MetricCard({
  label, value, sub, cor, icon,
}: {
  label: string; value: string | number; sub?: string; cor: string; icon: React.ReactNode
}) {
  return (
    <div style={{
      background: 'rgba(10,15,30,.7)',
      border: '1px solid rgba(99,179,237,.08)',
      borderRadius: 16,
      padding: '20px 22px',
      display: 'flex', flexDirection: 'column', gap: 10,
      backdropFilter: 'blur(10px)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11, color: 'rgba(226,232,240,.4)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</span>
        <div style={{ color: cor, opacity: 0.7 }}>{icon}</div>
      </div>
      <div style={{ fontSize: 32, fontWeight: 800, color: cor, letterSpacing: '-0.03em', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'rgba(226,232,240,.35)' }}>{sub}</div>}
    </div>
  )
}

function MiniBar({ valor, max, cor }: { valor: number; max: number; cor: string }) {
  const pct = max > 0 ? Math.round((valor / max) * 100) : 0
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,.06)', borderRadius: 2 }}>
        <div style={{ height: '100%', width: `${pct}%`, background: cor, borderRadius: 2, transition: 'width .5s' }} />
      </div>
      <span style={{ fontSize: 11, color: 'rgba(226,232,240,.4)', width: 32, textAlign: 'right' }}>{pct}%</span>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const [metricas, setMetricas] = useState<Metricas | null>(null)
  const [serie,    setSerie]    = useState<SerieHistorica[]>([])
  const [loading,  setLoading]  = useState(true)
  const [agora,    setAgora]    = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setAgora(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    async function carregar() {
      setLoading(true)
      try {
        // Queries paralelas
        const [
          { count: totalUsuarios },
          { count: totalCriancas },
          { count: totalSessoes },
          { count: sessoesRealizadas },
          { count: totalAvaliacoes },
          { data: avaliacoesConv },
          { count: totalCheckins },
          { count: totalPlanos },
          { count: planosAtivos },
          { data: scores },
        ] = await Promise.all([
          supabase.from('profiles').select('*', { count: 'exact', head: true }),
          supabase.from('criancas').select('*', { count: 'exact', head: true }),
          supabase.from('sessoes_clinicas').select('*', { count: 'exact', head: true }),
          supabase.from('sessoes_clinicas').select('*', { count: 'exact', head: true }).eq('concluida', true),
          supabase.from('avaliacoes').select('*', { count: 'exact', head: true }),
          supabase.from('avaliacoes').select('convertido').eq('convertido', true),
          supabase.from('checkins').select('*', { count: 'exact', head: true }),
          supabase.from('planos').select('*', { count: 'exact', head: true }),
          supabase.from('planos').select('*', { count: 'exact', head: true }).eq('status', 'ativo'),
          supabase.from('avaliacoes').select('score_geral').not('score_geral', 'is', null).limit(100),
        ])

        // Score médio geral
        const scoreVals = (scores ?? []).map((s: any) => s.score_geral).filter(Boolean)
        const mediaScoreGeral = scoreVals.length > 0
          ? Math.round(scoreVals.reduce((a: number, b: number) => a + b, 0) / scoreVals.length)
          : 0

        // Crescimento da semana — usuários criados nos últimos 7 dias
        const seteDiasAtras = new Date()
        seteDiasAtras.setDate(seteDiasAtras.getDate() - 7)
        const { count: crescimento } = await supabase
          .from('criancas')
          .select('*', { count: 'exact', head: true })
          .gte('criado_em', seteDiasAtras.toISOString())

        setMetricas({
          totalUsuarios:        totalUsuarios ?? 0,
          totalCriancas:        totalCriancas ?? 0,
          totalSessoes:         totalSessoes ?? 0,
          sessoesRealizadas:    sessoesRealizadas ?? 0,
          sessoesCanceladas:    (totalSessoes ?? 0) - (sessoesRealizadas ?? 0),
          totalAvaliacoes:      totalAvaliacoes ?? 0,
          avaliacoesConvertidas: (avaliacoesConv ?? []).length,
          totalCheckins:        totalCheckins ?? 0,
          totalPlanos:          totalPlanos ?? 0,
          planosAtivos:         planosAtivos ?? 0,
          mediaScoreGeral,
          crescimentoSemana:    crescimento ?? 0,
        })

        // Série histórica — últimos 6 meses
        const meses: SerieHistorica[] = []
        for (let i = 5; i >= 0; i--) {
          const d = new Date()
          d.setMonth(d.getMonth() - i)
          const inicio = new Date(d.getFullYear(), d.getMonth(), 1).toISOString()
          const fim    = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString()
          const label  = d.toLocaleDateString('pt-BR', { month: 'short' })

          const [
            { count: u },
            { count: s },
            { count: a },
          ] = await Promise.all([
            supabase.from('criancas').select('*', { count: 'exact', head: true }).gte('criado_em', inicio).lte('criado_em', fim),
            supabase.from('sessoes_clinicas').select('*', { count: 'exact', head: true }).gte('criado_em', inicio).lte('criado_em', fim),
            supabase.from('avaliacoes').select('*', { count: 'exact', head: true }).gte('criado_em', inicio).lte('criado_em', fim),
          ])
          meses.push({ label, usuarios: u ?? 0, sessoes: s ?? 0, avaliacoes: a ?? 0 })
        }
        setSerie(meses)

      } catch (err) {
        console.error('Erro ao carregar métricas:', err)
      }
      setLoading(false)
    }
    carregar()
  }, [])

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', border: '2px solid rgba(99,179,237,.2)', borderTop: '2px solid #63b3ed', animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
          <div style={{ fontSize: 12, color: 'rgba(226,232,240,.4)', letterSpacing: '0.08em' }}>Carregando métricas...</div>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  const m = metricas!
  const taxaConversao = m.totalAvaliacoes > 0 ? Math.round((m.avaliacoesConvertidas / m.totalAvaliacoes) * 100) : 0
  const taxaSessao    = m.totalSessoes > 0 ? Math.round((m.sessoesRealizadas / m.totalSessoes) * 100) : 0
  const maxSerie      = Math.max(...serie.map(s => Math.max(s.usuarios, s.sessoes, s.avaliacoes)), 1)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#fff', margin: 0, marginBottom: 6, letterSpacing: '-0.02em' }}>
            Visão Geral
          </h1>
          <div style={{ fontSize: 13, color: 'rgba(226,232,240,.4)' }}>
            Fracta Behavior Ecosystem · {agora.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
          </div>
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'rgba(29,158,117,.1)', border: '1px solid rgba(29,158,117,.2)',
          borderRadius: 10, padding: '8px 14px',
        }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#1D9E75', animation: 'pulse 2s infinite' }} />
          <span style={{ fontSize: 12, color: '#1D9E75', fontWeight: 600 }}>Sistema online</span>
        </div>
      </div>

      {/* Métricas principais */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        <MetricCard
          label="Usuários totais" value={m.totalUsuarios}
          sub="profiles cadastrados"
          cor="#63b3ed"
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>}
        />
        <MetricCard
          label="Pacientes" value={m.totalCriancas}
          sub={`+${m.crescimentoSemana} esta semana`}
          cor="#1D9E75"
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>}
        />
        <MetricCard
          label="Sessões clínicas" value={m.totalSessoes}
          sub={`${m.sessoesRealizadas} realizadas · ${taxaSessao}% conclusão`}
          cor="#8B7FE8"
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>}
        />
        <MetricCard
          label="Avaliações" value={m.totalAvaliacoes}
          sub={`${taxaConversao}% taxa de conversão`}
          cor="#EF9F27"
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>}
        />
      </div>

      {/* Segunda linha de métricas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        <MetricCard
          label="Planos ativos" value={m.planosAtivos}
          sub={`de ${m.totalPlanos} totais`}
          cor="#1D9E75"
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>}
        />
        <MetricCard
          label="Check-ins" value={m.totalCheckins}
          sub="engajamento familiar"
          cor="#63b3ed"
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>}
        />
        <MetricCard
          label="Score médio" value={m.mediaScoreGeral > 0 ? `${m.mediaScoreGeral}%` : '—'}
          sub="média das avaliações"
          cor="#E05A4B"
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>}
        />
        <MetricCard
          label="Conversões" value={m.avaliacoesConvertidas}
          sub="avaliações → cadastro"
          cor="#EF9F27"
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>}
        />
      </div>

      {/* Gráfico de série histórica + Funil */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 14 }}>

        {/* Série histórica */}
        <div style={{ background: 'rgba(10,15,30,.7)', border: '1px solid rgba(99,179,237,.08)', borderRadius: 16, padding: '22px 24px', backdropFilter: 'blur(10px)' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', marginBottom: 4 }}>Crescimento histórico</div>
          <div style={{ fontSize: 11, color: 'rgba(226,232,240,.35)', marginBottom: 20 }}>Últimos 6 meses — pacientes, sessões e avaliações</div>

          {/* Legenda */}
          <div style={{ display: 'flex', gap: 20, marginBottom: 16 }}>
            {[['#1D9E75','Pacientes'],['#8B7FE8','Sessões'],['#EF9F27','Avaliações']].map(([c, l]) => (
              <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 10, height: 3, background: c, borderRadius: 2 }} />
                <span style={{ fontSize: 11, color: 'rgba(226,232,240,.4)' }}>{l}</span>
              </div>
            ))}
          </div>

          {/* Barras */}
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', height: 120 }}>
            {serie.map((s, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{ width: '100%', display: 'flex', gap: 2, alignItems: 'flex-end', height: 100 }}>
                  {[
                    { v: s.usuarios,   cor: '#1D9E75' },
                    { v: s.sessoes,    cor: '#8B7FE8' },
                    { v: s.avaliacoes, cor: '#EF9F27' },
                  ].map((b, j) => (
                    <div key={j} style={{ flex: 1, background: b.cor, opacity: 0.8, borderRadius: '3px 3px 0 0', height: `${maxSerie > 0 ? Math.max(4, (b.v / maxSerie) * 100) : 4}%`, transition: 'height .5s' }} />
                  ))}
                </div>
                <span style={{ fontSize: 10, color: 'rgba(226,232,240,.3)', textTransform: 'capitalize' }}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Funil de conversão */}
        <div style={{ background: 'rgba(10,15,30,.7)', border: '1px solid rgba(99,179,237,.08)', borderRadius: 16, padding: '22px 24px', backdropFilter: 'blur(10px)' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', marginBottom: 4 }}>Funil de conversão</div>
          <div style={{ fontSize: 11, color: 'rgba(226,232,240,.35)', marginBottom: 24 }}>Do lead ao paciente ativo</div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[
              { label: 'Avaliações feitas',    valor: m.totalAvaliacoes,      cor: '#63b3ed', max: m.totalAvaliacoes },
              { label: 'Convertidas',          valor: m.avaliacoesConvertidas, cor: '#1D9E75', max: m.totalAvaliacoes },
              { label: 'Pacientes ativos',     valor: m.totalCriancas,         cor: '#8B7FE8', max: m.totalAvaliacoes },
              { label: 'Com plano ativo',      valor: m.planosAtivos,          cor: '#EF9F27', max: m.totalAvaliacoes },
              { label: 'Sessões realizadas',   valor: m.sessoesRealizadas,     cor: '#E05A4B', max: m.totalAvaliacoes },
            ].map(item => (
              <div key={item.label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 12, color: 'rgba(226,232,240,.6)' }}>{item.label}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: item.cor }}>{item.valor}</span>
                </div>
                <MiniBar valor={item.valor} max={item.max} cor={item.cor} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Saúde do sistema */}
      <div style={{ background: 'rgba(10,15,30,.7)', border: '1px solid rgba(99,179,237,.08)', borderRadius: 16, padding: '22px 24px', backdropFilter: 'blur(10px)' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', marginBottom: 16 }}>Saúde do ecossistema</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {[
            {
              label: 'FractaCare',
              items: [
                { l: 'Pacientes', v: m.totalCriancas },
                { l: 'Check-ins', v: m.totalCheckins },
                { l: 'Avaliações', v: m.totalAvaliacoes },
              ],
              cor: '#1D9E75',
            },
            {
              label: 'FractaClinic',
              items: [
                { l: 'Sessões totais', v: m.totalSessoes },
                { l: 'Realizadas', v: m.sessoesRealizadas },
                { l: 'Planos ativos', v: m.planosAtivos },
              ],
              cor: '#63b3ed',
            },
            {
              label: 'FractaEngine',
              items: [
                { l: 'Score médio', v: m.mediaScoreGeral > 0 ? `${m.mediaScoreGeral}%` : '—' },
                { l: 'Taxa conversão', v: `${taxaConversao}%` },
                { l: 'Taxa sessão', v: `${taxaSessao}%` },
              ],
              cor: '#8B7FE8',
            },
          ].map(produto => (
            <div key={produto.label} style={{ background: `${produto.cor}08`, border: `1px solid ${produto.cor}18`, borderRadius: 12, padding: '16px 18px' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: produto.cor, marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{produto.label}</div>
              {produto.items.map(item => (
                <div key={item.l} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,.04)' }}>
                  <span style={{ fontSize: 12, color: 'rgba(226,232,240,.5)' }}>{item.l}</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: produto.cor }}>{item.v}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
        @keyframes spin { to { transform: rotate(360deg) } }
      `}</style>
    </div>
  )
}
