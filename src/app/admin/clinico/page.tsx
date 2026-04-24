'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

// ── Tipos ─────────────────────────────────────────────────────────────────────
interface DominioStat {
  dominio: string
  label: string
  media: number
  cor: string
}

interface ProgramaStat {
  nome: string
  dominio: string
  total_planos: number
  media_score: number
  cor: string
}

interface SessaoStat {
  mes: string
  realizadas: number
  taxa_acerto: number
  duracao_media: number
}

interface ResumoClinico {
  total_sessoes: number
  sessoes_realizadas: number
  taxa_conclusao: number
  media_acerto: number
  duracao_media_min: number
  total_planos: number
  planos_ativos: number
  media_score_geral: number
  dominio_mais_forte: string
  dominio_mais_fraco: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const DOMINIOS = [
  { key: 'comunicacao',   label: 'Comunicação',   cor: '#1D9E75' },
  { key: 'social',        label: 'Social',        cor: '#63b3ed' },
  { key: 'atencao',       label: 'Atenção',       cor: '#8B7FE8' },
  { key: 'regulacao',     label: 'Regulação',     cor: '#EF9F27' },
  { key: 'brincadeira',   label: 'Brincadeira',   cor: '#23c48f' },
  { key: 'flexibilidade', label: 'Flexibilidade', cor: '#E05A4B' },
  { key: 'autonomia',     label: 'Autonomia',     cor: '#4d9de0' },
  { key: 'motivacao',     label: 'Motivação',     cor: '#e8a838' },
]

function BarraHorizontal({ valor, max, cor, label, sub }: { valor: number; max: number; cor: string; label: string; sub?: string }) {
  const pct = max > 0 ? Math.round((valor / max) * 100) : 0
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 12, color: 'rgba(226,232,240,.7)' }}>{label}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: cor }}>{sub ?? valor}</span>
      </div>
      <div style={{ height: 6, background: 'rgba(255,255,255,.06)', borderRadius: 3 }}>
        <div style={{ height: '100%', width: `${pct}%`, background: cor, borderRadius: 3, transition: 'width .6s' }} />
      </div>
    </div>
  )
}

function MiniStat({ label, valor, cor }: { label: string; valor: string | number; cor: string }) {
  return (
    <div style={{ background: 'rgba(99,179,237,.04)', border: '1px solid rgba(99,179,237,.08)', borderRadius: 12, padding: '14px 16px' }}>
      <div style={{ fontSize: 10, color: 'rgba(226,232,240,.35)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: cor, letterSpacing: '-0.02em' }}>{valor}</div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function AdminClinicoPage() {
  const [resumo,    setResumo]    = useState<ResumoClinico | null>(null)
  const [dominios,  setDominios]  = useState<DominioStat[]>([])
  const [programas, setProgramas] = useState<ProgramaStat[]>([])
  const [serie,     setSerie]     = useState<SessaoStat[]>([])
  const [loading,   setLoading]   = useState(true)

  useEffect(() => { carregar() }, [])

  async function carregar() {
    setLoading(true)
    try {
      // 1. Sessões clínicas
      const { data: sessoes, count: totalSessoes } = await supabase
        .from('sessoes_clinicas')
        .select('concluida, taxa_acerto, duracao_segundos', { count: 'exact' })
        .limit(500)

      const realizadas    = (sessoes ?? []).filter(s => s.concluida).length
      const taxas         = (sessoes ?? []).map(s => s.taxa_acerto).filter(Boolean) as number[]
      const duracoes      = (sessoes ?? []).map(s => s.duracao_segundos).filter(Boolean) as number[]
      const mediaAcerto   = taxas.length > 0 ? Math.round(taxas.reduce((a, b) => a + b, 0) / taxas.length) : 0
      const duracaoMedia  = duracoes.length > 0 ? Math.round(duracoes.reduce((a, b) => a + b, 0) / duracoes.length / 60) : 0

      // 2. Planos
      const { count: totalPlanos } = await supabase.from('planos').select('*', { count: 'exact', head: true })
      const { count: planosAtivos } = await supabase.from('planos').select('*', { count: 'exact', head: true }).eq('status', 'ativo')

      // 3. Radar snapshots — média por domínio
      const { data: radares } = await supabase
        .from('radar_snapshots')
        .select('score_comunicacao, score_social, score_atencao, score_regulacao, score_brincadeira, score_flexibilidade, score_autonomia, score_motivacao')
        .limit(200)

      const dominioStats: DominioStat[] = DOMINIOS.map(d => {
        const vals = (radares ?? [])
          .map((r: any) => r[`score_${d.key}`])
          .filter((v: any) => v !== null && v !== undefined) as number[]
        const media = vals.length > 0 ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0
        return { dominio: d.key, label: d.label, media, cor: d.cor }
      }).sort((a, b) => b.media - a.media)

      const mediaScoreGeral = dominioStats.length > 0
        ? Math.round(dominioStats.reduce((a, d) => a + d.media, 0) / dominioStats.length)
        : 0

      // 4. Programas mais usados
      const { data: planosData } = await supabase
        .from('planos')
        .select('score_atual, programas ( nome, dominio )')
        .not('programas', 'is', null)
        .limit(200)

      const progMap = new Map<string, { nome: string; dominio: string; scores: number[]; count: number }>()
      for (const pl of (planosData ?? [])) {
        const prog = (pl as any).programas as any
        if (!prog) continue
        const key = prog.nome
        if (!progMap.has(key)) progMap.set(key, { nome: prog.nome, dominio: prog.dominio, scores: [], count: 0 })
        const entry = progMap.get(key)!
        entry.count++
        if ((pl as any).score_atual !== null) entry.scores.push((pl as any).score_atual)
      }

      const progStats: ProgramaStat[] = Array.from(progMap.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, 8)
        .map(p => {
          const dom = DOMINIOS.find(d => d.key === p.dominio)
          const mediaScore = p.scores.length > 0 ? Math.round(p.scores.reduce((a, b) => a + b, 0) / p.scores.length) : 0
          return { nome: p.nome, dominio: p.dominio, total_planos: p.count, media_score: mediaScore, cor: dom?.cor ?? '#63b3ed' }
        })

      // 5. Série histórica — últimos 6 meses
      const serieData: SessaoStat[] = []
      for (let i = 5; i >= 0; i--) {
        const d = new Date()
        d.setMonth(d.getMonth() - i)
        const inicio = new Date(d.getFullYear(), d.getMonth(), 1).toISOString()
        const fim    = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString()
        const mes    = d.toLocaleDateString('pt-BR', { month: 'short' })

        const { data: sessMes } = await supabase
          .from('sessoes_clinicas')
          .select('concluida, taxa_acerto, duracao_segundos')
          .gte('criado_em', inicio).lte('criado_em', fim)

        const realizadasMes = (sessMes ?? []).filter(s => s.concluida).length
        const taxasMes      = (sessMes ?? []).map(s => s.taxa_acerto).filter(Boolean) as number[]
        const duracoesMes   = (sessMes ?? []).map(s => s.duracao_segundos).filter(Boolean) as number[]
        const mediaAcertoMes = taxasMes.length > 0 ? Math.round(taxasMes.reduce((a, b) => a + b, 0) / taxasMes.length) : 0
        const duracaoMes     = duracoesMes.length > 0 ? Math.round(duracoesMes.reduce((a, b) => a + b, 0) / duracoesMes.length / 60) : 0

        serieData.push({ mes, realizadas: realizadasMes, taxa_acerto: mediaAcertoMes, duracao_media: duracaoMes })
      }

      setResumo({
        total_sessoes:     totalSessoes ?? 0,
        sessoes_realizadas: realizadas,
        taxa_conclusao:    totalSessoes ? Math.round((realizadas / totalSessoes) * 100) : 0,
        media_acerto:      mediaAcerto,
        duracao_media_min: duracaoMedia,
        total_planos:      totalPlanos ?? 0,
        planos_ativos:     planosAtivos ?? 0,
        media_score_geral: mediaScoreGeral,
        dominio_mais_forte: dominioStats[0]?.label ?? '—',
        dominio_mais_fraco: dominioStats[dominioStats.length - 1]?.label ?? '—',
      })
      setDominios(dominioStats)
      setProgramas(progStats)
      setSerie(serieData)

    } catch (err) {
      console.error('Erro ao carregar dados clínicos:', err)
    }
    setLoading(false)
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

  const r = resumo!
  const maxSerie = Math.max(...serie.map(s => s.realizadas), 1)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Header */}
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#fff', margin: 0, marginBottom: 6, letterSpacing: '-0.02em' }}>Dados Clínicos</h1>
        <div style={{ fontSize: 13, color: 'rgba(226,232,240,.4)' }}>Análise agregada de sessões, programas e evolução por domínio</div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
        <MiniStat label="Sessões totais"    valor={r.total_sessoes}       cor="#63b3ed" />
        <MiniStat label="Taxa de conclusão" valor={`${r.taxa_conclusao}%`} cor="#1D9E75" />
        <MiniStat label="Média de acerto"   valor={`${r.media_acerto}%`}   cor="#8B7FE8" />
        <MiniStat label="Duração média"     valor={`${r.duracao_media_min}min`} cor="#EF9F27" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
        <MiniStat label="Planos ativos"     valor={r.planos_ativos}        cor="#1D9E75" />
        <MiniStat label="Score médio geral" valor={`${r.media_score_geral}%`} cor="#63b3ed" />
        <MiniStat label="Domínio mais forte" valor={r.dominio_mais_forte}  cor="#23c48f" />
        <MiniStat label="Domínio mais fraco" valor={r.dominio_mais_fraco}  cor="#E05A4B" />
      </div>

      {/* Série histórica + Domínios */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

        {/* Série histórica */}
        <div style={{ ...card, padding: '22px 24px' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', marginBottom: 4 }}>Sessões por mês</div>
          <div style={{ fontSize: 11, color: 'rgba(226,232,240,.35)', marginBottom: 20 }}>Últimos 6 meses — sessões realizadas</div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', height: 120, marginBottom: 12 }}>
            {serie.map((s, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{ fontSize: 10, color: '#1D9E75', fontWeight: 600 }}>{s.realizadas > 0 ? s.realizadas : ''}</div>
                <div style={{
                  width: '100%', borderRadius: '4px 4px 0 0',
                  background: 'linear-gradient(180deg, #1D9E75, #0f8f7a)',
                  height: `${Math.max(4, (s.realizadas / maxSerie) * 100)}px`,
                  opacity: 0.85, transition: 'height .5s',
                }} />
                <span style={{ fontSize: 10, color: 'rgba(226,232,240,.35)', textTransform: 'capitalize' }}>{s.mes}</span>
              </div>
            ))}
          </div>
          {/* Taxa de acerto por mês */}
          <div style={{ borderTop: '1px solid rgba(99,179,237,.08)', paddingTop: 16, marginTop: 4 }}>
            <div style={{ fontSize: 11, color: 'rgba(226,232,240,.35)', marginBottom: 10 }}>Taxa de acerto média por mês</div>
            <div style={{ display: 'flex', gap: 10 }}>
              {serie.map((s, i) => (
                <div key={i} style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: s.taxa_acerto >= 70 ? '#1D9E75' : s.taxa_acerto >= 50 ? '#EF9F27' : '#E05A4B' }}>
                    {s.taxa_acerto > 0 ? `${s.taxa_acerto}%` : '—'}
                  </div>
                  <div style={{ fontSize: 9, color: 'rgba(226,232,240,.25)', textTransform: 'capitalize' }}>{s.mes}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Domínios */}
        <div style={{ ...card, padding: '22px 24px' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', marginBottom: 4 }}>Score médio por domínio</div>
          <div style={{ fontSize: 11, color: 'rgba(226,232,240,.35)', marginBottom: 20 }}>Média agregada de todos os radar snapshots</div>
          {dominios.map(d => (
            <BarraHorizontal
              key={d.dominio}
              label={d.label}
              valor={d.media}
              max={100}
              cor={d.cor}
              sub={d.media > 0 ? `${d.media}%` : '—'}
            />
          ))}
        </div>
      </div>

      {/* Programas mais usados */}
      <div style={{ ...card, padding: '22px 24px' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', marginBottom: 4 }}>Programas mais utilizados</div>
        <div style={{ fontSize: 11, color: 'rgba(226,232,240,.35)', marginBottom: 20 }}>Ranking por número de planos ativos · score médio atual</div>

        {programas.length === 0 ? (
          <div style={{ fontSize: 13, color: 'rgba(226,232,240,.3)', textAlign: 'center', padding: '24px 0' }}>Nenhum dado disponível ainda</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {programas.map((p, i) => (
              <div key={p.nome} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px', background: 'rgba(99,179,237,.03)', borderRadius: 10, border: '1px solid rgba(99,179,237,.06)' }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: 'rgba(226,232,240,.2)', width: 20, textAlign: 'center' }}>#{i+1}</div>
                <div style={{ width: 4, height: 32, borderRadius: 2, background: p.cor, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.nome}</div>
                  <div style={{ fontSize: 11, color: 'rgba(226,232,240,.4)' }}>{p.dominio} · {p.total_planos} planos</div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: p.media_score >= 70 ? '#1D9E75' : p.media_score >= 50 ? '#EF9F27' : '#E05A4B' }}>
                    {p.media_score > 0 ? `${p.media_score}%` : '—'}
                  </div>
                  <div style={{ fontSize: 10, color: 'rgba(226,232,240,.3)' }}>score médio</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Insights automáticos */}
      <div style={{ ...card, padding: '22px 24px' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', marginBottom: 4 }}>Insights clínicos automáticos</div>
        <div style={{ fontSize: 11, color: 'rgba(226,232,240,.35)', marginBottom: 16 }}>Gerados a partir dos dados agregados do ecossistema</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            r.taxa_conclusao >= 80
              ? { cor: '#1D9E75', texto: `Taxa de conclusão de ${r.taxa_conclusao}% — excelente adesão ao protocolo clínico.` }
              : r.taxa_conclusao >= 50
              ? { cor: '#EF9F27', texto: `Taxa de conclusão de ${r.taxa_conclusao}% — há espaço para melhorar a adesão familiar.` }
              : { cor: '#E05A4B', texto: `Taxa de conclusão de ${r.taxa_conclusao}% — investigar barreiras de engajamento das famílias.` },
            dominios[0] && { cor: '#1D9E75', texto: `Domínio mais forte do ecossistema: ${dominios[0].label} (${dominios[0].media}%). Boa base para generalização.` },
            dominios[dominios.length-1] && { cor: '#EF9F27', texto: `Domínio mais sensível: ${dominios[dominios.length-1].label} (${dominios[dominios.length-1].media}%). Considerar fortalecer programas nessa área.` },
            r.media_acerto >= 70
              ? { cor: '#1D9E75', texto: `Média de acerto de ${r.media_acerto}% — indica qualidade de implementação dos programas.` }
              : { cor: '#EF9F27', texto: `Média de acerto de ${r.media_acerto}% — verificar dificuldade dos programas e nível de dica utilizado.` },
          ].filter(Boolean).map((ins, i) => ins && (
            <div key={i} style={{ display: 'flex', gap: 12, padding: '12px 14px', background: `${ins.cor}08`, border: `1px solid ${ins.cor}20`, borderRadius: 10 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: ins.cor, marginTop: 5, flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: 'rgba(226,232,240,.8)', lineHeight: 1.6 }}>{ins.texto}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
