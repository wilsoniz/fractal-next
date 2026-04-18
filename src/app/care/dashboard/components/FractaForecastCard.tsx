'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { calcularForecast } from '@/lib/fracta/forecast'
import { DOMINIO_LABELS, DOMINIO_CORES } from '@/lib/fracta/scoring'
import type { ForecastResultado, RadarSnapshot, DadosSessao } from '@/lib/fracta/forecast'
import type { Dominio } from '@/lib/fracta/scoring'

type Props = {
  criancaId: string
  nomeCrianca: string
}

export default function FractaForecastCard({ criancaId, nomeCrianca }: Props) {
  const [forecast, setForecast] = useState<ForecastResultado | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(false)

  useEffect(() => {
    if (!criancaId) return

    async function buscar() {
      setCarregando(true)
      setErro(false)
      try {
        const { data: snapshots } = await supabase
          .from('radar_snapshots')
          .select('*')
          .eq('crianca_id', criancaId)
          .order('criado_em', { ascending: false })
          .limit(3)

        const quatorze_dias_atras = new Date()
        quatorze_dias_atras.setDate(quatorze_dias_atras.getDate() - 14)

        const { data: sessoesRecentes } = await supabase
          .from('sessoes')
          .select('id')
          .eq('crianca_id', criancaId)
          .gte('criado_em', quatorze_dias_atras.toISOString())

        const { data: todasSessoes } = await supabase
          .from('sessoes')
          .select('id')
          .eq('crianca_id', criancaId)

        const dadosSessao: DadosSessao = {
          total_sessoes: todasSessoes?.length ?? 0,
          sessoes_ultimos_14d: sessoesRecentes?.length ?? 0,
        }

        const resultado = calcularForecast(
          criancaId,
          (snapshots ?? []) as RadarSnapshot[],
          dadosSessao
        )

        setForecast(resultado)
      } catch (e) {
        console.error('[FractaForecastCard] Erro:', e)
        setErro(true)
      } finally {
        setCarregando(false)
      }
    }

    buscar()
  }, [criancaId])

  if (carregando) return <CardSkeleton />
  if (erro || !forecast) return <CardErro />
  if (!forecast.dados_suficientes) return <CardSemDados nomeCrianca={nomeCrianca} />

  const { care, dominios, adesao_geral } = forecast
  const corDestaque = DOMINIO_CORES[care.dominio_destaque as Dominio]
  const top3 = [...dominios].sort((a, b) => b.delta_14d - a.delta_14d).slice(0, 3)

  return (
    <div style={{ background: 'rgba(255,255,255,.84)', backdropFilter: 'blur(14px)', borderRadius: 22, border: '1px solid rgba(43,191,164,.18)', boxShadow: '0 4px 28px rgba(43,191,164,.06)', overflow: 'hidden' }}>

      {/* Cabeçalho */}
      <div style={{ background: `linear-gradient(135deg,${corDestaque}18,${corDestaque}06)`, borderBottom: `1px solid ${corDestaque}20`, padding: '18px 20px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: `linear-gradient(135deg,${corDestaque},#4FC3D8)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M13 10V3L4 14h7v7l9-11h-7z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 10, color: '#64748b', fontWeight: 600, letterSpacing: '0.06em' }}>FRACTA FORECAST</div>
            <div style={{ fontSize: 13, color: '#1E3A5F', fontWeight: 700 }}>Previsibilidade de {nomeCrianca}</div>
          </div>
        </div>
        <p style={{ fontSize: 14, color: '#1E3A5F', lineHeight: 1.55, margin: 0, fontWeight: 500 }}>
          {care.mensagem_principal}
        </p>
      </div>

      {/* Estimativa em semanas */}
      {care.estimativa_semanas && (
        <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(43,191,164,.08)', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ minWidth: 56, height: 56, borderRadius: 14, background: `linear-gradient(135deg,${corDestaque},${corDestaque}90)`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'white', flexShrink: 0 }}>
            <span style={{ fontSize: 22, fontWeight: 800, lineHeight: 1 }}>{care.estimativa_semanas}</span>
            <span style={{ fontSize: 9, opacity: 0.9 }}>{care.estimativa_semanas === 1 ? 'semana' : 'semanas'}</span>
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#1E3A5F', marginBottom: 2 }}>Próxima habilidade estimada</div>
            <div style={{ fontSize: 11, color: '#8a9ab8' }}>Em {DOMINIO_LABELS[care.dominio_destaque as Dominio]}, mantendo as atividades</div>
          </div>
        </div>
      )}

      {/* Top 3 domínios */}
      <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(43,191,164,.08)' }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>
          Evolução — últimos 14 dias
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {top3.map((d) => {
            const cor = DOMINIO_CORES[d.dominio as Dominio]
            const positivo = d.delta_14d >= 0
            return (
              <div key={d.dominio} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: positivo ? `${cor}15` : '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={positivo ? cor : '#ef4444'} strokeWidth="2.5" strokeLinecap="round">
                    {positivo ? <path d="M7 17L17 7M17 7H7M17 7v10"/> : <path d="M7 7l10 10M17 17H7M17 17V7"/>}
                  </svg>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                    <span style={{ fontSize: 12, color: '#1E3A5F', fontWeight: 500 }}>{DOMINIO_LABELS[d.dominio as Dominio]}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: positivo ? cor : '#ef4444' }}>{positivo ? '+' : ''}{d.delta_14d}</span>
                  </div>
                  <div style={{ height: 4, background: 'rgba(43,191,164,.12)', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${d.score_atual}%`, background: cor, borderRadius: 99 }}/>
                  </div>
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#1E3A5F', minWidth: 28, textAlign: 'right' }}>{d.score_atual}</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Adesão + motivação */}
      <div style={{ padding: '14px 20px' }}>
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
            <span style={{ fontSize: 11, color: '#8a9ab8' }}>Consistência nas atividades</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: adesao_geral >= 0.6 ? '#2BBFA4' : adesao_geral >= 0.3 ? '#f59e0b' : '#ef4444' }}>
              {Math.round(adesao_geral * 100)}%
            </span>
          </div>
          <div style={{ height: 5, background: 'rgba(43,191,164,.12)', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${adesao_geral * 100}%`, background: adesao_geral >= 0.6 ? 'linear-gradient(90deg,#2BBFA4,#4FC3D8)' : adesao_geral >= 0.3 ? '#f59e0b' : '#ef4444', borderRadius: 99, transition: 'width 0.6s ease' }}/>
          </div>
        </div>
        <p style={{ fontSize: 12, color: '#8a9ab8', fontStyle: 'italic', margin: 0, paddingTop: 10, borderTop: '1px solid rgba(43,191,164,.08)', lineHeight: 1.5 }}>
          "{care.motivacao}"
        </p>
      </div>
    </div>
  )
}

function CardSkeleton() {
  return (
    <div style={{ background: 'rgba(255,255,255,.84)', borderRadius: 22, padding: 20, border: '1px solid rgba(43,191,164,.18)' }}>
      {[100, 80, 60, 40].map((w, i) => (
        <div key={i} style={{ height: i === 0 ? 18 : 11, width: `${w}%`, background: 'rgba(43,191,164,.1)', borderRadius: 6, marginBottom: 10 }}/>
      ))}
    </div>
  )
}

function CardErro() {
  return (
    <div style={{ background: 'rgba(255,255,255,.84)', borderRadius: 22, padding: 20, border: '1px solid rgba(43,191,164,.18)', textAlign: 'center', color: '#8a9ab8', fontSize: 13 }}>
      Previsibilidade indisponível no momento.
    </div>
  )
}

function CardSemDados({ nomeCrianca }: { nomeCrianca: string }) {
  return (
    <div style={{ background: 'rgba(255,255,255,.84)', borderRadius: 22, overflow: 'hidden', border: '1px solid rgba(43,191,164,.18)' }}>
      <div style={{ background: 'linear-gradient(135deg,rgba(43,191,164,.1),rgba(43,191,164,.04))', borderBottom: '1px solid rgba(43,191,164,.12)', padding: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: 'linear-gradient(135deg,#2BBFA4,#4FC3D8)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M13 10V3L4 14h7v7l9-11h-7z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <div style={{ fontSize: 10, color: '#64748b', fontWeight: 600, letterSpacing: '0.06em' }}>FRACTA FORECAST</div>
        </div>
        <p style={{ fontSize: 14, color: '#1E3A5F', lineHeight: 1.5, margin: 0, fontWeight: 500 }}>
          A previsibilidade de {nomeCrianca} estará disponível após a segunda avaliação.
        </p>
      </div>
      <div style={{ padding: '14px 20px' }}>
        <p style={{ fontSize: 12, color: '#8a9ab8', margin: 0, lineHeight: 1.5 }}>
          Faça uma nova avaliação em alguns dias. O sistema calculará a evolução e mostrará estimativas de progresso.
        </p>
      </div>
    </div>
  )
}
