'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import {
  PERGUNTAS,
  RespostaBruta,
  Dominio,
  DOMINIO_LABELS,
  DOMINIO_CORES,
  calcularScores,
} from '@/lib/fracta/scoring'

// ─────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────

type Crianca = {
  id: string
  nome: string
  idade_anos: number
}

type Passo =
  | { tipo: 'confirmacao' }
  | { tipo: 'pergunta'; index: number }
  | { tipo: 'processando' }
  | { tipo: 'resultado' }

// ─────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────

export default function AvaliarPage() {
  const router = useRouter()

  const [crianca, setCrianca] = useState<Crianca | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [passo, setPasso] = useState<Passo>({ tipo: 'confirmacao' })
  const [respostas, setRespostas] = useState<RespostaBruta[]>([])
  const [resultado, setResultado] = useState<ReturnType<typeof calcularScores> | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    async function buscarCrianca() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/care/login'); return }

      const { data } = await supabase
        .from('criancas')
        .select('id, nome, idade_anos')
        .eq('responsavel_id', session.user.id)
        .eq('ativo', true)
        .order('criado_em', { ascending: true })
        .limit(1)
        .single()

      if (data) setCrianca(data)
      setCarregando(false)
    }
    buscarCrianca()
  }, [router])

  const perguntaAtual = passo.tipo === 'pergunta' ? PERGUNTAS[passo.index] : null

  const progresso =
    passo.tipo === 'confirmacao' ? 0
    : passo.tipo === 'pergunta' ? Math.round(((passo.index + 1) / PERGUNTAS.length) * 100)
    : 100

  const processarResultado = useCallback(
    async (todasRespostas: RespostaBruta[]) => {
      if (!crianca) return
      setSalvando(true)

      const calc = calcularScores(todasRespostas, crianca.idade_anos)
      setResultado(calc)

      try {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) { setErro('Não autenticado. Faça login para continuar.'); return }
  await supabase.from('avaliacoes').insert({
    crianca_id: crianca.id,
    responsavel_id: user.id,
    idade_crianca: crianca.idade_anos,
    respostas: todasRespostas,
    score_comunicacao: calc.scores.comunicacao,
    score_social: calc.scores.social,
    score_atencao: calc.scores.atencao,
    score_regulacao: calc.scores.regulacao,
    score_brincadeira: calc.scores.brincadeira,
    score_flexibilidade: calc.scores.flexibilidade,
    score_autonomia: calc.scores.autonomia,
    score_motivacao: calc.scores.motivacao,
    score_geral: calc.score_geral,
    tipo: 'care_internal',
    origem: 'web',
    convertido: true,
  })
} catch {
  setErro('Erro ao salvar. Seus dados foram calculados.')
} finally {
        setSalvando(false)
        setTimeout(() => setPasso({ tipo: 'resultado' }), 1800)
      }
    },
    [crianca]
  )

  const responder = useCallback(
    (valor: 0 | 1 | 2 | 3) => {
      if (passo.tipo !== 'pergunta' || !perguntaAtual) return

      const novaResposta: RespostaBruta = {
        questao_id: perguntaAtual.id,
        dominio: perguntaAtual.dominio,
        valor,
      }

      const novasRespostas = [...respostas, novaResposta]
      setRespostas(novasRespostas)

      const proximoIndex = passo.index + 1
      if (proximoIndex < PERGUNTAS.length) {
        setPasso({ tipo: 'pergunta', index: proximoIndex })
      } else {
        setPasso({ tipo: 'processando' })
        processarResultado(novasRespostas)
      }
    },
    [passo, perguntaAtual, respostas, processarResultado]
  )

  const voltar = useCallback(() => {
    if (passo.tipo === 'pergunta' && passo.index > 0) {
      setRespostas((prev) => prev.slice(0, -1))
      setPasso({ tipo: 'pergunta', index: passo.index - 1 })
    } else if (passo.tipo === 'pergunta' && passo.index === 0) {
      setPasso({ tipo: 'confirmacao' })
    }
  }, [passo])

  if (carregando) return <TelaCarregando />
  if (!crianca) return <SemCrianca onVoltar={() => router.push('/care/dashboard')} />

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #ffffff 0%, #e0f2fe 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      fontFamily: "'Inter', -apple-system, sans-serif",
    }}>
      <header style={{
        width: '100%',
        maxWidth: 600,
        padding: '24px 20px 0',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}>
        {passo.tipo === 'pergunta' && (
          <button
            onClick={voltar}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px', borderRadius: 8, color: '#64748b', display: 'flex', alignItems: 'center' }}
            aria-label="Voltar"
          >
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        <div style={{ flex: 1 }}>
          {passo.tipo !== 'confirmacao' && passo.tipo !== 'resultado' && (
            <>
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6, fontWeight: 500 }}>
                {passo.tipo === 'pergunta' ? `${passo.index + 1} de ${PERGUNTAS.length}` : 'Processando...'}
              </div>
              <BarraProgresso valor={progresso} />
            </>
          )}
        </div>
      </header>

      <main style={{
        width: '100%',
        maxWidth: 600,
        padding: '32px 20px 40px',
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {passo.tipo === 'confirmacao' && (
          <PassoConfirmacao
            crianca={crianca}
            onIniciar={() => setPasso({ tipo: 'pergunta', index: 0 })}
            onVoltar={() => router.push('/care/dashboard')}
          />
        )}

        {passo.tipo === 'pergunta' && perguntaAtual && (
          <PassoPergunta
            pergunta={perguntaAtual}
            numero={passo.index + 1}
            total={PERGUNTAS.length}
            nomeCrianca={crianca.nome}
            onResponder={responder}
          />
        )}

        {passo.tipo === 'processando' && (
          <PassoProcessando nomeCrianca={crianca.nome} />
        )}

        {passo.tipo === 'resultado' && resultado && (
          <PassoResultado
            crianca={crianca}
            resultado={resultado}
            salvando={salvando}
            erro={erro}
            onVerDashboard={() => router.push('/care/dashboard')}
          />
        )}
      </main>
    </div>
  )
}

// ─────────────────────────────────────────────
// SUB-COMPONENTES
// ─────────────────────────────────────────────

function BarraProgresso({ valor }: { valor: number }) {
  return (
    <div style={{ height: 6, background: '#e2e8f0', borderRadius: 99, overflow: 'hidden' }}>
      <div style={{
        height: '100%',
        width: `${valor}%`,
        background: 'linear-gradient(90deg, #2BBFA4, #4FC3D8)',
        borderRadius: 99,
        transition: 'width 0.4s ease',
      }} />
    </div>
  )
}

function PassoConfirmacao({
  crianca,
  onIniciar,
  onVoltar,
}: {
  crianca: Crianca
  onIniciar: () => void
  onVoltar: () => void
}) {
  return (
    <div style={{ textAlign: 'center', paddingTop: 40 }}>
      <div style={{
        width: 80, height: 80, borderRadius: '50%',
        background: 'linear-gradient(135deg, #2BBFA4, #4FC3D8)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 24px',
        boxShadow: '0 8px 32px rgba(43, 191, 164, 0.3)',
      }}>
        <svg width="36" height="36" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>

      <h1 style={{ fontSize: 28, fontWeight: 700, color: '#0f172a', marginBottom: 12, lineHeight: 1.2 }}>
        Vamos avaliar {crianca.nome}?
      </h1>

      <p style={{ fontSize: 16, color: '#475569', lineHeight: 1.6, maxWidth: 380, margin: '0 auto 32px' }}>
        São 14 perguntas rápidas sobre o dia a dia de {crianca.nome}.
        Leva menos de 3 minutos e atualiza o mapa de habilidades.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 32 }}>
        {[
          { icone: '⏱', label: '~3 min' },
          { icone: '📊', label: '8 domínios' },
          { icone: '🔄', label: 'Radar atualiza' },
        ].map((item) => (
          <div key={item.label} style={{ background: 'white', borderRadius: 12, padding: '14px 8px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: 22, marginBottom: 4 }}>{item.icone}</div>
            <div style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>{item.label}</div>
          </div>
        ))}
      </div>

      <button
        onClick={onIniciar}
        style={{
          width: '100%', padding: '16px',
          background: 'linear-gradient(135deg, #2BBFA4, #1a9e87)',
          color: 'white', border: 'none', borderRadius: 14,
          fontSize: 16, fontWeight: 600, cursor: 'pointer',
          boxShadow: '0 4px 20px rgba(43, 191, 164, 0.4)', marginBottom: 12,
        }}
      >
        Começar avaliação
      </button>

      <button
        onClick={onVoltar}
        style={{
          width: '100%', padding: '14px',
          background: 'transparent', color: '#64748b',
          border: '1.5px solid #e2e8f0', borderRadius: 14,
          fontSize: 15, cursor: 'pointer',
        }}
      >
        Voltar ao dashboard
      </button>
    </div>
  )
}

function PassoPergunta({
  pergunta,
  numero,
  total,
  nomeCrianca,
  onResponder,
}: {
  pergunta: typeof PERGUNTAS[number]
  numero: number
  total: number
  nomeCrianca: string
  onResponder: (valor: 0 | 1 | 2 | 3) => void
}) {
  const cor = DOMINIO_CORES[pergunta.dominio as Dominio]
  const [selecionado, setSelecionado] = useState<number | null>(null)

  const handleClick = (valor: 0 | 1 | 2 | 3) => {
    setSelecionado(valor)
    setTimeout(() => onResponder(valor), 180)
  }

  return (
    <div>
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '6px 12px', borderRadius: 99,
        background: `${cor}20`, color: cor,
        fontSize: 13, fontWeight: 600, marginBottom: 24,
        border: `1px solid ${cor}40`,
      }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: cor, display: 'inline-block' }} />
        {DOMINIO_LABELS[pergunta.dominio as Dominio]}
      </div>

      <h2 style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', lineHeight: 1.35, marginBottom: pergunta.exemplo ? 10 : 32 }}>
        {pergunta.texto.replace('Seu filho', nomeCrianca).replace('seu filho', nomeCrianca)}
      </h2>

      {pergunta.exemplo && (
        <p style={{ fontSize: 14, color: '#64748b', marginBottom: 32, fontStyle: 'italic' }}>
          {pergunta.exemplo}
        </p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {pergunta.opcoes.map((opcao) => (
          <button
            key={opcao.valor}
            onClick={() => handleClick(opcao.valor as 0 | 1 | 2 | 3)}
            style={{
              width: '100%', padding: '16px 20px', textAlign: 'left',
              background: selecionado === opcao.valor ? `${cor}15` : 'white',
              border: `2px solid ${selecionado === opcao.valor ? cor : '#e2e8f0'}`,
              borderRadius: 14, fontSize: 15,
              color: selecionado === opcao.valor ? cor : '#374151',
              cursor: 'pointer',
              fontWeight: selecionado === opcao.valor ? 600 : 400,
              transition: 'all 0.15s ease',
              boxShadow: selecionado === opcao.valor ? `0 0 0 3px ${cor}20` : '0 1px 4px rgba(0,0,0,0.06)',
              display: 'flex', alignItems: 'center', gap: 12,
            }}
          >
            <span style={{
              width: 20, height: 20, borderRadius: '50%',
              border: `2px solid ${selecionado === opcao.valor ? cor : '#cbd5e1'}`,
              background: selecionado === opcao.valor ? cor : 'transparent',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, transition: 'all 0.15s ease',
            }}>
              {selecionado === opcao.valor && (
                <svg width="10" height="10" viewBox="0 0 10 10" fill="white">
                  <path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" fill="none" />
                </svg>
              )}
            </span>
            {opcao.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function PassoProcessando({ nomeCrianca }: { nomeCrianca: string }) {
  const [fase, setFase] = useState(0)
  const fases = [
    `Analisando as habilidades de ${nomeCrianca}...`,
    'Calculando os 8 domínios de desenvolvimento...',
    'Identificando habilidades emergentes...',
    'Gerando o mapa atualizado...',
  ]

  useEffect(() => {
    const interval = setInterval(() => {
      setFase((f) => Math.min(f + 1, fases.length - 1))
    }, 450)
    return () => clearInterval(interval)
  }, [fases.length])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400, gap: 32 }}>
      <div style={{ position: 'relative', width: 120, height: 120 }}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{
            position: 'absolute',
            inset: i * 16,
            borderRadius: '50%',
            border: '2px solid #2BBFA4',
            opacity: 1 - i * 0.25,
            animation: `pulse ${1.2 + i * 0.3}s ease-in-out infinite`,
            animationDelay: `${i * 0.2}s`,
          }} />
        ))}
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            <polygon points="20,4 36,32 4,32" fill="none" stroke="#2BBFA4" strokeWidth="1.5" />
            <polygon points="20,12 28,26 12,26" fill="none" stroke="#4FC3D8" strokeWidth="1.5" />
            <polygon points="20,18 24,24 16,24" fill="#2BBFA4" opacity="0.6" />
          </svg>
        </div>
      </div>
      <p style={{ fontSize: 16, color: '#475569', textAlign: 'center', minHeight: 48, transition: 'opacity 0.3s' }}>
        {fases[fase]}
      </p>
      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.05); opacity: 1; }
        }
      `}</style>
    </div>
  )
}

function PassoResultado({
  crianca,
  resultado,
  salvando,
  erro,
  onVerDashboard,
}: {
  crianca: Crianca
  resultado: ReturnType<typeof calcularScores>
  salvando: boolean
  erro: string | null
  onVerDashboard: () => void
}) {
  const dominios = Object.entries(resultado.scores) as [Dominio, number][]

  return (
    <div>
      <div style={{
        background: 'linear-gradient(135deg, #2BBFA4, #4FC3D8)',
        borderRadius: 20, padding: '28px 24px', marginBottom: 24,
        color: 'white', textAlign: 'center',
      }}>
        <div style={{ fontSize: 14, opacity: 0.9, marginBottom: 4 }}>Mapa de habilidades de</div>
        <h2 style={{ fontSize: 26, fontWeight: 700, marginBottom: 8 }}>{crianca.nome}</h2>
        <div style={{ fontSize: 48, fontWeight: 800, lineHeight: 1, marginBottom: 4 }}>
          {resultado.score_geral}
          <span style={{ fontSize: 20, opacity: 0.8 }}>/100</span>
        </div>
        <div style={{ fontSize: 13, opacity: 0.85 }}>Score geral de desenvolvimento</div>
      </div>

      <div style={{ background: 'white', borderRadius: 16, padding: '20px', marginBottom: 20, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: '#64748b', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Por domínio
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[...dominios].sort((a, b) => b[1] - a[1]).map(([dominio, score]) => (
            <div key={dominio}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 14, color: '#374151', fontWeight: 500 }}>{DOMINIO_LABELS[dominio]}</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: DOMINIO_CORES[dominio] }}>{score}</span>
              </div>
              <div style={{ height: 8, background: '#f1f5f9', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${score}%`, background: DOMINIO_CORES[dominio], borderRadius: 99, transition: 'width 0.8s ease' }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {resultado.cuspides_emergentes.length > 0 && (
        <div style={{ background: 'white', borderRadius: 16, padding: '20px', marginBottom: 20, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: '#64748b', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Habilidades prontas para crescer
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {resultado.cuspides_emergentes.slice(0, 3).map((c) => (
              <div key={c.dominio} style={{
                display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px',
                background: `${DOMINIO_CORES[c.dominio]}10`, borderRadius: 12,
                border: `1px solid ${DOMINIO_CORES[c.dominio]}25`,
              }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: DOMINIO_CORES[c.dominio], marginTop: 5, flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: DOMINIO_CORES[c.dominio], marginBottom: 2 }}>
                    {DOMINIO_LABELS[c.dominio]}{' '}
                    <span style={{ fontSize: 11, background: `${DOMINIO_CORES[c.dominio]}20`, padding: '2px 6px', borderRadius: 99 }}>
                      {c.nivel === 'emergente' ? 'Emergindo' : 'Próxima'}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: '#475569' }}>{c.descricao}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {erro && (
        <div style={{ background: '#fef3c7', border: '1px solid #fbbf24', borderRadius: 12, padding: '12px 16px', marginBottom: 20, fontSize: 13, color: '#92400e' }}>
          ⚠️ {erro}
        </div>
      )}

      <button
        onClick={onVerDashboard}
        disabled={salvando}
        style={{
          width: '100%', padding: '16px',
          background: salvando ? '#e2e8f0' : 'linear-gradient(135deg, #2BBFA4, #1a9e87)',
          color: salvando ? '#94a3b8' : 'white',
          border: 'none', borderRadius: 14, fontSize: 16, fontWeight: 600,
          cursor: salvando ? 'not-allowed' : 'pointer',
          boxShadow: salvando ? 'none' : '0 4px 20px rgba(43, 191, 164, 0.4)',
        }}
      >
        {salvando ? 'Salvando...' : 'Ver dashboard atualizado'}
      </button>
    </div>
  )
}

function TelaCarregando() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #ffffff, #e0f2fe)' }}>
      <div style={{ textAlign: 'center', color: '#64748b' }}>
        <div style={{ width: 48, height: 48, border: '3px solid #e2e8f0', borderTop: '3px solid #2BBFA4', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        Carregando...
      </div>
    </div>
  )
}

function SemCrianca({ onVoltar }: { onVoltar: () => void }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #ffffff, #e0f2fe)', padding: 24 }}>
      <div style={{ textAlign: 'center', maxWidth: 360 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', marginBottom: 12 }}>Nenhuma criança encontrada</h2>
        <p style={{ color: '#64748b', marginBottom: 24 }}>Cadastre uma criança no dashboard antes de fazer a avaliação.</p>
        <button
          onClick={onVoltar}
          style={{ padding: '14px 28px', background: 'linear-gradient(135deg, #2BBFA4, #1a9e87)', color: 'white', border: 'none', borderRadius: 14, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}
        >
          Ir para o dashboard
        </button>
      </div>
    </div>
  )
}
