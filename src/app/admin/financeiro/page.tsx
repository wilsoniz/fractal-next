'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

// ── Tipos ─────────────────────────────────────────────────────────────────────
interface ResumoFinanceiro {
  receitaBrutaMes: number
  comissoesMes: number
  sessoesCareMes: number
  sessoesFfsMes: number
  totalTerapeutas: number
  terapeutasAtivos: number
}

interface SessaoClinica {
  id: string
  criado_em: string
  duracao_min: number | null
  concluida: boolean
  profiles?: { nivel_senioridade?: string } | null
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const COMISSAO: Record<string, number> = {
  terapeuta: 0.08,
  coordenador: 0.10,
  supervisor: 0.12,
}
const VALOR_SESSAO = 150 // valor médio por sessão em R$

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function mesLabel(offset: number) {
  const d = new Date()
  d.setMonth(d.getMonth() - offset)
  return d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
}

// ── Componentes ───────────────────────────────────────────────────────────────
function KPI({ label, value, sub, cor }: { label: string; value: string; sub?: string; cor: string }) {
  return (
    <div style={{
      background: 'rgba(13,32,53,0.75)', border: '1px solid rgba(26,58,92,0.5)',
      borderRadius: 12, padding: '20px 24px',
    }}>
      <div style={{ fontSize: 11, color: 'rgba(226,232,240,.4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 600, color: cor, letterSpacing: '-0.5px', marginBottom: 4 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: 'rgba(226,232,240,.35)' }}>{sub}</div>}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function AdminFinanceiroPage() {
  const [resumo, setResumo] = useState<ResumoFinanceiro | null>(null)
  const [loading, setLoading] = useState(true)
  const [historico, setHistorico] = useState<{ mes: string; receita: number; comissoes: number; sessoes: number }[]>([])

  useEffect(() => {
    const carregar = async () => {
      setLoading(true)

      const agora = new Date()
      const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1).toISOString()
      const fimMes = new Date(agora.getFullYear(), agora.getMonth() + 1, 0, 23, 59, 59).toISOString()

      // Sessões do mês atual com nível do terapeuta
      const { data: sessoesMes } = await supabase
        .from('sessoes_clinicas')
        .select('id, criado_em, duracao_min, concluida, profiles(nivel_senioridade)')
        .gte('criado_em', inicioMes)
        .lte('criado_em', fimMes)
        .eq('concluida', true) as { data: SessaoClinica[] | null }

      // Total de terapeutas
      const { count: totalTerapeutas } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('tipo', 'terapeuta')

      // Terapeutas com sessão no mês
      const { count: terapeutasAtivos } = await supabase
        .from('sessoes_clinicas')
        .select('terapeuta_id', { count: 'exact', head: true })
        .gte('criado_em', inicioMes)
        .lte('criado_em', fimMes)

      // Calcula receita e comissões do mês
      let receitaBrutaMes = 0
      let comissoesMes = 0
      const sessoesCareMes = sessoesMes?.length ?? 0

      sessoesMes?.forEach(s => {
        const nivel = (s.profiles as any)?.nivel_senioridade ?? 'terapeuta'
        const taxa = COMISSAO[nivel] ?? 0.08
        receitaBrutaMes += VALOR_SESSAO * taxa
        comissoesMes += VALOR_SESSAO * taxa
      })

      setResumo({
        receitaBrutaMes,
        comissoesMes,
        sessoesCareMes,
        sessoesFfsMes: 0, // placeholder até ter tabela de assinaturas FFS
        totalTerapeutas: totalTerapeutas ?? 0,
        terapeutasAtivos: terapeutasAtivos ?? 0,
      })

      // Histórico dos últimos 6 meses
      const hist = await Promise.all(
        Array.from({ length: 6 }, async (_, i) => {
          const d = new Date()
          d.setMonth(d.getMonth() - i)
          const ini = new Date(d.getFullYear(), d.getMonth(), 1).toISOString()
          const fim = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59).toISOString()

          const { data: s } = await supabase
            .from('sessoes_clinicas')
            .select('id, profiles(nivel_senioridade)')
            .gte('criado_em', ini)
            .lte('criado_em', fim)
            .eq('concluida', true) as { data: SessaoClinica[] | null }

          let receita = 0
          let comissoes = 0
          s?.forEach(x => {
            const nivel = (x.profiles as any)?.nivel_senioridade ?? 'terapeuta'
            const taxa = COMISSAO[nivel] ?? 0.08
            receita += VALOR_SESSAO * taxa
            comissoes += VALOR_SESSAO * taxa
          })

          return { mes: mesLabel(i), receita, comissoes, sessoes: s?.length ?? 0 }
        })
      )

      setHistorico(hist.reverse())
      setLoading(false)
    }

    carregar()
  }, [])

  const s = {
    bg: '#07111f',
    card: 'rgba(13,32,53,0.75)',
    border: 'rgba(26,58,92,0.5)',
    text: '#e2e8f0',
    muted: 'rgba(226,232,240,.4)',
    teal: '#1D9E75',
    blue: '#378ADD',
    amber: '#EF9F27',
    coral: '#E05A4B',
  }

  const maxReceita = Math.max(...historico.map(h => h.receita), 1)

  return (
    <div style={{ padding: '32px 40px', fontFamily: 'var(--font-sans)', color: s.text, minHeight: '100vh' }}>

      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 11, color: s.teal, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>FractaAdmin</div>
        <h1 style={{ fontSize: 24, fontWeight: 500, letterSpacing: '-0.5px', marginBottom: 4 }}>Financeiro</h1>
        <p style={{ fontSize: 13, color: s.muted }}>Receita da plataforma, comissões por sessão e visão de terapeutas ativos.</p>
      </div>

      {loading ? (
        <div style={{ color: s.muted, fontSize: 13 }}>Carregando dados financeiros...</div>
      ) : resumo && (
        <>
          {/* KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 32 }}>
            <KPI label="Receita da plataforma (mês)" value={fmt(resumo.receitaBrutaMes)} sub="Comissões sobre sessões Care" cor={s.teal} />
            <KPI label="Sessões Care (mês)" value={resumo.sessoesCareMes.toString()} sub="Sessões clínicas concluídas" cor={s.blue} />
            <KPI label="Terapeutas ativos (mês)" value={`${resumo.terapeutasAtivos} / ${resumo.totalTerapeutas}`} sub="Com pelo menos 1 sessão" cor={s.amber} />
          </div>

          {/* Gráfico de barras — histórico 6 meses */}
          <div style={{ background: s.card, border: `1px solid ${s.border}`, borderRadius: 12, padding: '24px', marginBottom: 24 }}>
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 20 }}>Receita — últimos 6 meses</div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, height: 140 }}>
              {historico.map(h => (
                <div key={h.mes} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <div style={{ fontSize: 10, color: s.muted }}>{fmt(h.receita)}</div>
                  <div style={{
                    width: '100%', borderRadius: '4px 4px 0 0',
                    background: `linear-gradient(180deg, ${s.teal}, rgba(29,158,117,0.4))`,
                    height: `${Math.max((h.receita / maxReceita) * 100, 4)}px`,
                    transition: 'height 0.3s',
                  }} />
                  <div style={{ fontSize: 11, color: s.muted }}>{h.mes}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Tabela de histórico */}
          <div style={{ background: s.card, border: `1px solid ${s.border}`, borderRadius: 12, overflow: 'hidden', marginBottom: 24 }}>
            <div style={{ padding: '16px 24px', borderBottom: `1px solid ${s.border}`, fontSize: 13, fontWeight: 500 }}>
              Detalhamento mensal
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'rgba(0,0,0,0.2)' }}>
                  {['Mês', 'Sessões', 'Comissões geradas', 'Receita plataforma'].map(h => (
                    <th key={h} style={{ padding: '10px 24px', textAlign: 'left', fontSize: 11, color: s.muted, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 500 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {historico.map((h, i) => (
                  <tr key={h.mes} style={{ borderTop: `1px solid ${s.border}`, background: i % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.1)' }}>
                    <td style={{ padding: '12px 24px', fontWeight: 500 }}>{h.mes}</td>
                    <td style={{ padding: '12px 24px', color: s.blue }}>{h.sessoes}</td>
                    <td style={{ padding: '12px 24px', color: s.amber }}>{fmt(h.comissoes)}</td>
                    <td style={{ padding: '12px 24px', color: s.teal, fontWeight: 600 }}>{fmt(h.receita)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Nota sobre FFS */}
          <div style={{
            background: 'rgba(55,138,221,0.06)', border: '1px solid rgba(55,138,221,0.15)',
            borderRadius: 10, padding: '14px 20px', fontSize: 12, color: 'rgba(226,232,240,.5)',
          }}>
            Assinaturas FFS (Starter · Profissional · Clínica) serão contabilizadas aqui quando a tabela de assinaturas for implementada.
          </div>
        </>
      )}
    </div>
  )
}
