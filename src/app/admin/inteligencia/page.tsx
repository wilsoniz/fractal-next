'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

// ── Tipos ─────────────────────────────────────────────────────────────────────
interface EstudoSalvo {
  id: string
  titulo: string
  pergunta: string
  resposta: string
  criado_em: string
  tags: string[]
}

interface DadosContexto {
  total_criancas: number
  total_sessoes: number
  total_avaliacoes: number
  media_score_geral: number
  dominio_mais_forte: string
  dominio_mais_fraco: string
  taxa_conclusao: number
  media_acerto: number
  total_planos: number
  diagnosticos: string[]
}

const PERGUNTAS_SUGERIDAS = [
  'Qual é o padrão de evolução mais comum entre os pacientes do ecossistema?',
  'Existe correlação entre frequência de sessões e melhora de score?',
  'Quais domínios apresentam maior resistência à intervenção?',
  'Como o engajamento familiar (check-ins) impacta o progresso clínico?',
  'Quais programas têm maior taxa de domínio no ecossistema?',
  'Qual é o perfil típico das crianças com diagnóstico de TEA nível 2?',
  'Quais são os principais indicadores de risco de abandono do tratamento?',
  'Como o score de comunicação evolui em relação ao score social?',
  'Qual é o tempo médio para atingir critério de domínio em comunicação funcional?',
  'Quais padrões diferenciam casos de progresso acelerado dos demais?',
]

const TAGS_DISPONIVEIS = [
  'Evolução', 'Comunicação', 'Comportamento', 'Família', 'Sessões',
  'TEA', 'Programas', 'Domínios', 'Pesquisa', 'Produto',
]

// ── Page ──────────────────────────────────────────────────────────────────────
export default function AdminInteligenciaPage() {
  const [pergunta,    setPergunta]    = useState('')
  const [resposta,    setResposta]    = useState('')
  const [gerando,     setGerando]     = useState(false)
  const [estudos,     setEstudos]     = useState<EstudoSalvo[]>([])
  const [contexto,    setContexto]    = useState<DadosContexto | null>(null)
  const [tagsSel,     setTagsSel]     = useState<string[]>([])
  const [tituloNovo,  setTituloNovo]  = useState('')
  const [salvando,    setSalvando]    = useState(false)
  const [msg,         setMsg]         = useState('')
  const [estudoAberto, setEstudoAberto] = useState<EstudoSalvo | null>(null)
  const [loadingCtx,  setLoadingCtx]  = useState(true)

  useEffect(() => {
    carregarContexto()
    carregarEstudos()
  }, [])

  async function carregarContexto() {
    setLoadingCtx(true)
    try {
      const [
        { count: totalCriancas },
        { count: totalSessoes },
        { count: totalAvaliacoes },
        { count: totalPlanos },
        { data: scores },
        { data: radares },
        { data: sessoes },
        { data: diagnosticos },
      ] = await Promise.all([
        supabase.from('criancas').select('*', { count: 'exact', head: true }),
        supabase.from('sessoes_clinicas').select('*', { count: 'exact', head: true }),
        supabase.from('avaliacoes').select('*', { count: 'exact', head: true }),
        supabase.from('planos').select('*', { count: 'exact', head: true }),
        supabase.from('avaliacoes').select('score_geral').not('score_geral', 'is', null).limit(100),
        supabase.from('radar_snapshots').select('score_comunicacao, score_social, score_atencao, score_regulacao, score_brincadeira, score_flexibilidade, score_autonomia, score_motivacao').limit(100),
        supabase.from('sessoes_clinicas').select('concluida, taxa_acerto').limit(200),
        supabase.from('criancas').select('diagnostico').not('diagnostico', 'is', null).limit(100),
      ])

      const scoreVals  = (scores ?? []).map((s: any) => s.score_geral).filter(Boolean) as number[]
      const mediaScore = scoreVals.length > 0 ? Math.round(scoreVals.reduce((a, b) => a + b, 0) / scoreVals.length) : 0

      const DOMS = ['comunicacao','social','atencao','regulacao','brincadeira','flexibilidade','autonomia','motivacao']
      const LABELS: Record<string, string> = { comunicacao:'Comunicação', social:'Social', atencao:'Atenção', regulacao:'Regulação', brincadeira:'Brincadeira', flexibilidade:'Flexibilidade', autonomia:'Autonomia', motivacao:'Motivação' }
      const mediaDoms = DOMS.map(d => {
        const vals = (radares ?? []).map((r: any) => r[`score_${d}`]).filter(Boolean) as number[]
        return { d, media: vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0 }
      }).sort((a, b) => b.media - a.media)

      const sessoesList = sessoes ?? []
      const realizadas  = sessoesList.filter((s: any) => s.concluida).length
      const taxas       = sessoesList.map((s: any) => s.taxa_acerto).filter(Boolean) as number[]
      const mediaAcerto = taxas.length > 0 ? Math.round(taxas.reduce((a, b) => a + b, 0) / taxas.length) : 0

      const diagList = Array.from(new Set((diagnosticos ?? []).map((d: any) => d.diagnostico).filter(Boolean))).slice(0, 5)

      setContexto({
        total_criancas:     totalCriancas ?? 0,
        total_sessoes:      totalSessoes ?? 0,
        total_avaliacoes:   totalAvaliacoes ?? 0,
        media_score_geral:  mediaScore,
        dominio_mais_forte: LABELS[mediaDoms[0]?.d] ?? '—',
        dominio_mais_fraco: LABELS[mediaDoms[mediaDoms.length - 1]?.d] ?? '—',
        taxa_conclusao:     sessoesList.length > 0 ? Math.round((realizadas / sessoesList.length) * 100) : 0,
        media_acerto:       mediaAcerto,
        total_planos:       totalPlanos ?? 0,
        diagnosticos:       diagList as string[],
      })
    } catch (err) {
      console.error('Erro ao carregar contexto:', err)
    }
    setLoadingCtx(false)
  }

  async function carregarEstudos() {
    // Estudos salvos localmente no localStorage por enquanto
    try {
      const saved = localStorage.getItem('fracta_estudos')
      if (saved) setEstudos(JSON.parse(saved))
    } catch {}
  }

  async function gerarEstudo() {
    if (!pergunta.trim() || !contexto) return
    setGerando(true)
    setResposta('')

    try {
      const prompt = `Você é um especialista em Análise do Comportamento Aplicada (ABA) e ciência de dados clínicos. Analise os dados reais do ecossistema Fracta Behavior e responda a seguinte pergunta de pesquisa:

PERGUNTA: ${pergunta}

DADOS REAIS DO ECOSSISTEMA FRACTA (${new Date().toLocaleDateString('pt-BR')}):
- Total de pacientes cadastrados: ${contexto.total_criancas}
- Total de sessões clínicas registradas: ${contexto.total_sessoes}
- Total de avaliações realizadas: ${contexto.total_avaliacoes}
- Total de planos de intervenção: ${contexto.total_planos}
- Score médio geral das avaliações: ${contexto.media_score_geral}%
- Taxa de conclusão de sessões: ${contexto.taxa_conclusao}%
- Média de acerto nas sessões: ${contexto.media_acerto}%
- Domínio com maior score médio: ${contexto.dominio_mais_forte}
- Domínio com menor score médio: ${contexto.dominio_mais_fraco}
- Diagnósticos presentes na base: ${contexto.diagnosticos.join(', ') || 'Dados insuficientes'}

Responda com profundidade científica, usando os dados acima como base empírica. Estruture sua resposta com:
1. Análise dos dados disponíveis
2. Padrões identificados
3. Hipóteses clínicas fundamentadas
4. Implicações para a prática e para o produto Fracta
5. Limitações e próximos passos de investigação

Responda em português brasileiro, com linguagem científica mas acessível. Seja específico com os números disponíveis.`

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [{ role: 'user', content: prompt }],
        }),
      })

      const data = await response.json()
      const texto = data.content?.[0]?.text ?? 'Não foi possível gerar o estudo.'
      setResposta(texto)
      setTituloNovo(pergunta.slice(0, 60) + (pergunta.length > 60 ? '...' : ''))

    } catch (err) {
      setResposta('Erro ao gerar análise. Verifique sua conexão e tente novamente.')
    }
    setGerando(false)
  }

  function salvarEstudo() {
    if (!resposta || !tituloNovo) return
    setSalvando(true)
    const novo: EstudoSalvo = {
      id: Math.random().toString(36).slice(2),
      titulo: tituloNovo,
      pergunta,
      resposta,
      criado_em: new Date().toISOString(),
      tags: tagsSel,
    }
    const atualizados = [novo, ...estudos]
    setEstudos(atualizados)
    try { localStorage.setItem('fracta_estudos', JSON.stringify(atualizados)) } catch {}
    setMsg('Estudo salvo com sucesso!')
    setSalvando(false)
    setTimeout(() => setMsg(''), 3000)
  }

  function deletarEstudo(id: string) {
    const atualizados = estudos.filter(e => e.id !== id)
    setEstudos(atualizados)
    try { localStorage.setItem('fracta_estudos', JSON.stringify(atualizados)) } catch {}
    if (estudoAberto?.id === id) setEstudoAberto(null)
  }

  const card: React.CSSProperties = {
    background: 'rgba(10,15,30,.7)',
    border: '1px solid rgba(99,179,237,.08)',
    borderRadius: 16, backdropFilter: 'blur(10px)',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Header */}
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#fff', margin: 0, marginBottom: 6, letterSpacing: '-0.02em' }}>Inteligência</h1>
        <div style={{ fontSize: 13, color: 'rgba(226,232,240,.4)' }}>Estudos gerados por IA sobre os dados reais do ecossistema · Base empírica para decisões de produto e pesquisa</div>
      </div>

      {/* Contexto de dados */}
      {!loadingCtx && contexto && (
        <div style={{ ...card, padding: '18px 22px', border: '1px solid rgba(29,158,117,.15)', background: 'rgba(29,158,117,.04)' }}>
          <div style={{ fontSize: 11, color: '#1D9E75', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
            Base de dados em uso para análise
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
            {[
              { l: 'Pacientes', v: contexto.total_criancas },
              { l: 'Sessões',   v: contexto.total_sessoes   },
              { l: 'Avaliações', v: contexto.total_avaliacoes },
              { l: 'Score médio', v: `${contexto.media_score_geral}%` },
              { l: 'Taxa conclusão', v: `${contexto.taxa_conclusao}%` },
              { l: 'Média acerto', v: `${contexto.media_acerto}%` },
            ].map(item => (
              <div key={item.l} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: 'rgba(226,232,240,.4)' }}>{item.l}:</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#1D9E75' }}>{item.v}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Gerador */}
      <div style={{ ...card, padding: '24px' }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 4 }}>Nova análise</div>
        <div style={{ fontSize: 12, color: 'rgba(226,232,240,.4)', marginBottom: 20 }}>Faça uma pergunta de pesquisa — a IA usa os dados reais do Fracta para responder</div>

        {/* Perguntas sugeridas */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: 'rgba(226,232,240,.35)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Sugestões de perguntas</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {PERGUNTAS_SUGERIDAS.slice(0, 5).map((p, i) => (
              <button key={i} onClick={() => setPergunta(p)} style={{
                padding: '6px 12px', borderRadius: 20, cursor: 'pointer', fontFamily: 'inherit', fontSize: 11,
                border: '1px solid rgba(99,179,237,.15)', background: 'rgba(99,179,237,.04)',
                color: 'rgba(226,232,240,.6)', textAlign: 'left', transition: 'all .15s',
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(99,179,237,.35)'; e.currentTarget.style.color = '#63b3ed' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(99,179,237,.15)'; e.currentTarget.style.color = 'rgba(226,232,240,.6)' }}
              >{p.slice(0, 50)}...</button>
            ))}
          </div>
        </div>

        {/* Input da pergunta */}
        <textarea
          value={pergunta}
          onChange={e => setPergunta(e.target.value)}
          placeholder="Ex: Qual é a correlação entre score de comunicação e frequência de sessões nos pacientes com TEA nível 2?"
          rows={3}
          style={{
            width: '100%', padding: '12px 14px', borderRadius: 10,
            border: '1px solid rgba(99,179,237,.15)',
            background: 'rgba(99,179,237,.04)',
            color: '#e2e8f0', fontSize: 13, outline: 'none',
            fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box',
            marginBottom: 14,
          }}
        />

        <button onClick={gerarEstudo} disabled={gerando || !pergunta.trim()} style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '12px 22px', borderRadius: 10, border: 'none',
          background: gerando || !pergunta.trim() ? 'rgba(99,179,237,.15)' : 'linear-gradient(135deg, #8B7FE8, #63b3ed)',
          color: gerando || !pergunta.trim() ? 'rgba(255,255,255,.3)' : '#fff',
          fontSize: 14, fontWeight: 700, cursor: gerando || !pergunta.trim() ? 'not-allowed' : 'pointer',
          fontFamily: 'inherit',
        }}>
          {gerando ? (
            <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(255,255,255,.3)', borderTop: '2px solid #fff', animation: 'spin 1s linear infinite' }} />
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/></svg>
          )}
          {gerando ? 'Analisando dados...' : 'Gerar análise com IA'}
        </button>
      </div>

      {/* Resultado gerado */}
      {resposta && (
        <div style={{ ...card, padding: '24px', border: '1px solid rgba(139,127,232,.15)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 4 }}>Análise gerada</div>
              <div style={{ fontSize: 12, color: 'rgba(226,232,240,.4)' }}>{pergunta}</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => navigator.clipboard.writeText(resposta)} style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid rgba(99,179,237,.2)', background: 'transparent', color: '#63b3ed', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>
                Copiar
              </button>
            </div>
          </div>

          {/* Texto da resposta */}
          <div style={{ fontSize: 13, color: 'rgba(226,232,240,.8)', lineHeight: 1.8, whiteSpace: 'pre-wrap', marginBottom: 20, padding: '16px', background: 'rgba(99,179,237,.03)', borderRadius: 10, border: '1px solid rgba(99,179,237,.06)' }}>
            {resposta}
          </div>

          {/* Salvar estudo */}
          <div style={{ borderTop: '1px solid rgba(99,179,237,.08)', paddingTop: 16 }}>
            <div style={{ fontSize: 12, color: 'rgba(226,232,240,.4)', marginBottom: 10 }}>Salvar como estudo</div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
              <input
                value={tituloNovo}
                onChange={e => setTituloNovo(e.target.value)}
                placeholder="Título do estudo..."
                style={{ flex: 1, padding: '9px 12px', borderRadius: 9, border: '1px solid rgba(99,179,237,.12)', background: 'rgba(99,179,237,.04)', color: '#e2e8f0', fontSize: 13, outline: 'none', fontFamily: 'inherit' }}
              />
              <button onClick={salvarEstudo} disabled={salvando || !tituloNovo} style={{ padding: '9px 18px', borderRadius: 9, border: 'none', background: tituloNovo ? 'linear-gradient(135deg, #1D9E75, #63b3ed)' : 'rgba(99,179,237,.1)', color: tituloNovo ? '#fff' : 'rgba(255,255,255,.3)', fontSize: 13, fontWeight: 700, cursor: tituloNovo ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}>
                Salvar
              </button>
            </div>
            {/* Tags */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {TAGS_DISPONIVEIS.map(tag => (
                <button key={tag} onClick={() => setTagsSel(t => t.includes(tag) ? t.filter(x => x !== tag) : [...t, tag])} style={{
                  padding: '4px 10px', borderRadius: 20, cursor: 'pointer', fontFamily: 'inherit', fontSize: 11,
                  border: `1px solid ${tagsSel.includes(tag) ? '#8B7FE855' : 'rgba(99,179,237,.1)'}`,
                  background: tagsSel.includes(tag) ? 'rgba(139,127,232,.12)' : 'transparent',
                  color: tagsSel.includes(tag) ? '#8B7FE8' : 'rgba(226,232,240,.4)',
                }}>{tag}</button>
              ))}
            </div>
            {msg && <div style={{ marginTop: 10, fontSize: 12, color: '#68d391' }}>{msg}</div>}
          </div>
        </div>
      )}

      {/* Estudos salvos */}
      {estudos.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(226,232,240,.5)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {estudos.length} estudo{estudos.length > 1 ? 's' : ''} salvo{estudos.length > 1 ? 's' : ''}
          </div>
          {estudos.map(e => (
            <div key={e.id} style={{ ...card, padding: '18px 20px', cursor: 'pointer' }}
              onClick={() => setEstudoAberto(estudoAberto?.id === e.id ? null : e)}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#e2e8f0', marginBottom: 4 }}>{e.titulo}</div>
                  <div style={{ fontSize: 11, color: 'rgba(226,232,240,.4)', marginBottom: 8 }}>
                    {new Date(e.criado_em).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </div>
                  {e.tags.length > 0 && (
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                      {e.tags.map(tag => (
                        <span key={tag} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: 'rgba(139,127,232,.1)', border: '1px solid rgba(139,127,232,.2)', color: '#8B7FE8' }}>{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button onClick={ev => { ev.stopPropagation(); deletarEstudo(e.id) }} style={{ padding: '5px 10px', borderRadius: 7, border: '1px solid rgba(224,90,75,.2)', background: 'rgba(224,90,75,.06)', color: '#E05A4B', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>
                    Deletar
                  </button>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(226,232,240,.3)" strokeWidth="2" style={{ transform: estudoAberto?.id === e.id ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform .2s', marginTop: 2 }}><polyline points="6 9 12 15 18 9"/></svg>
                </div>
              </div>

              {estudoAberto?.id === e.id && (
                <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(99,179,237,.08)' }}>
                  <div style={{ fontSize: 12, color: 'rgba(226,232,240,.4)', marginBottom: 8, fontStyle: 'italic' }}>"{e.pergunta}"</div>
                  <div style={{ fontSize: 13, color: 'rgba(226,232,240,.75)', lineHeight: 1.75, whiteSpace: 'pre-wrap' }}>{e.resposta}</div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
