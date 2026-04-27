'use client'

import { useState, useEffect, useRef, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Trial {
  trial_index: number
  sd: string
  correct: string
  options: string[]
}

interface ApprenticeTask {
  id: string
  child_id: string
  title: string
  task_type: string
  total_trials: number
  mastery_criterion: number
  stimuli_payload: { trials: Trial[] }
  rules: Record<string, any>
}

interface TrialResult {
  trial_index: number
  correct_stimulus_id: string
  selected_stimulus_id: string
  is_correct: boolean
  latency_ms: number
  options_presented: string[]
}

// ─── Web Audio — sons sintéticos ─────────────────────────────────────────────

function playSound(type: 'acerto' | 'erro' | 'conclusao') {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const master = ctx.createGain()
    master.connect(ctx.destination)

    if (type === 'acerto') {
      // Acorde maior ascendente
      const freqs = [523, 659, 784, 1047]
      freqs.forEach((freq, i) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(master)
        osc.type = 'sine'
        osc.frequency.value = freq
        gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.08)
        gain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + i * 0.08 + 0.05)
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + i * 0.08 + 0.25)
        osc.start(ctx.currentTime + i * 0.08)
        osc.stop(ctx.currentTime + i * 0.08 + 0.3)
      })
    } else if (type === 'erro') {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(master)
      osc.type = 'sine'
      osc.frequency.setValueAtTime(300, ctx.currentTime)
      osc.frequency.linearRampToValueAtTime(200, ctx.currentTime + 0.3)
      gain.gain.setValueAtTime(0.1, ctx.currentTime)
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.35)
    } else {
      // Fanfarra de conclusão
      const freqs = [523, 659, 784, 659, 784, 1047]
      const times = [0, 0.1, 0.2, 0.35, 0.45, 0.55]
      freqs.forEach((freq, i) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(master)
        osc.type = 'triangle'
        osc.frequency.value = freq
        gain.gain.setValueAtTime(0, ctx.currentTime + times[i])
        gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + times[i] + 0.05)
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + times[i] + 0.18)
        osc.start(ctx.currentTime + times[i])
        osc.stop(ctx.currentTime + times[i] + 0.25)
      })
    }
  } catch (e) {
    // Audio não disponível — silencioso
  }
}

// ─── Partículas de confetti ───────────────────────────────────────────────────

function Confetti({ ativo }: { ativo: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number | null>(null)
  const particlesRef = useRef<any[]>([])

  useEffect(() => {
    if (!ativo || !canvasRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')!
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    const cores = ['#1D9E75', '#378ADD', '#EF9F27', '#E05A4B', '#8B7FE8', '#FFD700', '#FF69B4']
    particlesRef.current = Array.from({ length: 80 }, () => ({
      x: Math.random() * canvas.width,
      y: -20,
      vx: (Math.random() - 0.5) * 4,
      vy: Math.random() * 3 + 2,
      cor: cores[Math.floor(Math.random() * cores.length)],
      size: Math.random() * 10 + 5,
      rotation: Math.random() * 360,
      rotSpeed: (Math.random() - 0.5) * 8,
      opacity: 1,
    }))

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      particlesRef.current = particlesRef.current.filter(p => p.opacity > 0)
      particlesRef.current.forEach(p => {
        p.x += p.vx
        p.y += p.vy
        p.vy += 0.1
        p.rotation += p.rotSpeed
        if (p.y > canvas.height * 0.7) p.opacity -= 0.02
        ctx.save()
        ctx.globalAlpha = p.opacity
        ctx.translate(p.x, p.y)
        ctx.rotate((p.rotation * Math.PI) / 180)
        ctx.fillStyle = p.cor
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6)
        ctx.restore()
      })
      if (particlesRef.current.length > 0) {
        animRef.current = requestAnimationFrame(animate)
      }
    }
    animRef.current = requestAnimationFrame(animate)
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current) }
  }, [ativo])

  if (!ativo) return null
  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 50 }}
    />
  )
}

// ─── Mensagens de reforço ─────────────────────────────────────────────────────

const MSGS_ACERTO = [
  'Incrível!', 'Muito bem!', 'Você conseguiu!', 'Parabéns!',
  'Arrasou!', 'Que demais!', 'Perfeito!', 'Show!',
]

const MSGS_ERRO = [
  'Quase lá!', 'Tente de novo!', 'Você vai conseguir!', 'Continue tentando!',
]

function msgAleatoria(arr: string[]) {
  return arr[Math.floor(Math.random() * arr.length)]
}

// ─── Embaralhar array ─────────────────────────────────────────────────────────

function embaralhar<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// ─── Tela de carregamento ─────────────────────────────────────────────────────

function TelaCarregando() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #e0f7f0 0%, #e8f4ff 100%)',
    }}>
      <div style={{
        width: 64, height: 64, borderRadius: '50%',
        border: '4px solid #1D9E75',
        borderTopColor: 'transparent',
        animation: 'spin 0.8s linear infinite',
      }} />
      <div style={{ marginTop: 20, fontSize: 18, color: '#1D9E75', fontWeight: 600 }}>
        Preparando seu treino...
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

// ─── Tela de conclusão ────────────────────────────────────────────────────────

function TelaConclusao({
  total, acertos, onReiniciar,
}: { total: number; acertos: number; onReiniciar: () => void }) {
  const pct = Math.round((acertos / total) * 100)
  const estrelas = pct >= 90 ? 3 : pct >= 70 ? 2 : 1

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', padding: 32,
      background: 'linear-gradient(135deg, #e0f7f0 0%, #e8f4ff 100%)',
      textAlign: 'center',
    }}>
      <Confetti ativo={true} />

      {/* Estrelas */}
      <div style={{ fontSize: 56, marginBottom: 16, animation: 'popIn 0.5s ease' }}>
        {Array.from({ length: 3 }, (_, i) => (
          <span key={i} style={{
            opacity: i < estrelas ? 1 : 0.2,
            display: 'inline-block',
            animation: i < estrelas ? `popIn 0.4s ease ${i * 0.15}s both` : 'none',
          }}>
            ⭐
          </span>
        ))}
      </div>

      <div style={{ fontSize: 32, fontWeight: 800, color: '#07111f', marginBottom: 8 }}>
        {pct >= 80 ? 'Parabéns!' : 'Bom trabalho!'}
      </div>

      <div style={{ fontSize: 18, color: '#4a7a9b', marginBottom: 32 }}>
        Você acertou {acertos} de {total} questões
      </div>

      {/* Barra de progresso */}
      <div style={{
        width: '100%', maxWidth: 320, height: 20, borderRadius: 10,
        background: 'rgba(0,0,0,0.08)', overflow: 'hidden', marginBottom: 32,
      }}>
        <div style={{
          height: '100%', borderRadius: 10,
          background: pct >= 80 ? '#1D9E75' : '#EF9F27',
          width: `${pct}%`,
          transition: 'width 1s ease',
          boxShadow: '0 2px 8px rgba(29,158,117,0.4)',
        }} />
      </div>

      <div style={{ fontSize: 28, fontWeight: 800, color: pct >= 80 ? '#1D9E75' : '#EF9F27', marginBottom: 40 }}>
        {pct}%
      </div>

      <button
        onClick={onReiniciar}
        style={{
          padding: '16px 40px', borderRadius: 16, border: 'none',
          background: '#1D9E75', color: '#fff', fontSize: 18,
          fontWeight: 700, cursor: 'pointer',
          boxShadow: '0 4px 20px rgba(29,158,117,0.4)',
          transition: 'transform 0.15s',
        }}
        onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.05)')}
        onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
      >
        Treinar de novo
      </button>

      <style>{`
        @keyframes popIn {
          from { transform: scale(0); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

function ApprenticeContent() {
  const searchParams = useSearchParams()
  const taskId = searchParams.get('taskId')

  const [task, setTask] = useState<ApprenticeTask | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [trials, setTrials] = useState<Trial[]>([])
  const [trialAtual, setTrialAtual] = useState(0)
  const [resultados, setResultados] = useState<TrialResult[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')
  const [concluido, setConcluido] = useState(false)

  // Estado de feedback
  const [feedback, setFeedback] = useState<'acerto' | 'erro' | null>(null)
  const [opcaoSelecionada, setOpcaoSelecionada] = useState<string | null>(null)
  const [msgFeedback, setMsgFeedback] = useState('')
  const [confetti, setConfetti] = useState(false)
  const [bloqueado, setBloqueado] = useState(false)
  const [pontos, setPontos] = useState(0)
  const [pontosAnim, setPontosAnim] = useState(false)

  const inicioTrialRef = useRef<number>(Date.now())

  // Carrega task e cria sessão
  useEffect(() => {
    if (!taskId) { setErro('ID da tarefa não encontrado.'); setLoading(false); return }

    const iniciar = async () => {
      const { data: taskData, error: taskError } = await supabase
        .from('apprentice_tasks')
        .select('*')
        .eq('id', taskId)
        .single()

      if (taskError || !taskData) {
        setErro('Tarefa não encontrada. Verifique o link.')
        setLoading(false)
        return
      }

      setTask(taskData)

      // Embaralha os trials e as opções de cada trial
      const rawTrials = (taskData.stimuli_payload as { trials: Trial[] })?.trials ?? []
      const trialsEmbaralhados = embaralhar(rawTrials)
        .map((t: Trial) => ({ ...t, options: embaralhar(t.options) }))
      setTrials(trialsEmbaralhados)

      // Cria sessão
      const { data: sessao } = await supabase
        .from('apprentice_sessions')
        .insert({
          child_id: taskData.child_id,
          task_id: taskData.id,
          status: 'in_progress',
        })
        .select('id')
        .single()

      if (sessao) setSessionId(sessao.id)
      setLoading(false)
      inicioTrialRef.current = Date.now()
    }

    iniciar()
  }, [taskId])

  const handleResposta = useCallback(async (opcao: string) => {
    if (bloqueado || !task || !sessionId) return
    setBloqueado(true)

    const trial = trials[trialAtual]
    const correto = opcao === trial.correct
    const latencia = Date.now() - inicioTrialRef.current

    setOpcaoSelecionada(opcao)
    setFeedback(correto ? 'acerto' : 'erro')
    setMsgFeedback(correto ? msgAleatoria(MSGS_ACERTO) : msgAleatoria(MSGS_ERRO))

    if (correto) {
      playSound('acerto')
      setConfetti(true)
      setPontos(p => p + 100)
      setPontosAnim(true)
      setTimeout(() => { setConfetti(false); setPontosAnim(false) }, 1800)
    } else {
      playSound('erro')
    }

    // Salva trial no Supabase
    const resultado: TrialResult = {
      trial_index: trialAtual + 1,
      correct_stimulus_id: trial.correct,
      selected_stimulus_id: opcao,
      is_correct: correto,
      latency_ms: latencia,
      options_presented: trial.options,
    }

    await supabase.from('apprentice_trials').insert({
      session_id: sessionId,
      task_id: task.id,
      child_id: task.child_id,
      trial_index: resultado.trial_index,
      correct_stimulus_id: resultado.correct_stimulus_id,
      selected_stimulus_id: resultado.selected_stimulus_id,
      options_presented: resultado.options_presented,
      is_correct: resultado.is_correct,
      latency_ms: resultado.latency_ms,
    })

    const novosResultados = [...resultados, resultado]
    setResultados(novosResultados)

    // Avança após 1.5s
    setTimeout(async () => {
      setFeedback(null)
      setOpcaoSelecionada(null)
      setBloqueado(false)

      if (trialAtual + 1 >= trials.length) {
        // Finaliza sessão
        const acertos = novosResultados.filter(r => r.is_correct).length
        const accuracy = acertos / novosResultados.length

        await supabase.from('apprentice_sessions').update({
          status: 'completed',
          finished_at: new Date().toISOString(),
          total_trials: novosResultados.length,
          correct_trials: acertos,
          incorrect_trials: novosResultados.length - acertos,
          accuracy,
        }).eq('id', sessionId)

        playSound('conclusao')
        setConcluido(true)
      } else {
        setTrialAtual(t => t + 1)
        inicioTrialRef.current = Date.now()
      }
    }, 1500)
  }, [bloqueado, task, sessionId, trials, trialAtual, resultados])

  const handleReiniciar = () => {
    setTrialAtual(0)
    setResultados([])
    setConcluido(false)
    setFeedback(null)
    setOpcaoSelecionada(null)
    setPontos(0)
    if (task) {
      const trialsEmbaralhados = embaralhar(task.stimuli_payload?.trials ?? [])
        .map((t: Trial) => ({ ...t, options: embaralhar(t.options) }))
      setTrials(trialsEmbaralhados)
    }
    inicioTrialRef.current = Date.now()
  }

  if (loading) return <TelaCarregando />

  if (erro) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(135deg, #e0f7f0 0%, #e8f4ff 100%)',
        flexDirection: 'column', gap: 16, padding: 32, textAlign: 'center',
      }}>
        <div style={{ fontSize: 48 }}>😕</div>
        <div style={{ fontSize: 20, fontWeight: 700, color: '#07111f' }}>{erro}</div>
        <div style={{ fontSize: 14, color: '#7a9ab5' }}>Peça ajuda ao seu terapeuta.</div>
      </div>
    )
  }

  if (!task || trials.length === 0) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(135deg, #e0f7f0 0%, #e8f4ff 100%)',
        flexDirection: 'column', gap: 16, padding: 32, textAlign: 'center',
      }}>
        <div style={{ fontSize: 48 }}>📭</div>
        <div style={{ fontSize: 20, fontWeight: 700, color: '#07111f' }}>Nenhuma atividade encontrada</div>
      </div>
    )
  }

  if (concluido) {
    const acertos = resultados.filter(r => r.is_correct).length
    return <TelaConclusao total={resultados.length} acertos={acertos} onReiniciar={handleReiniciar} />
  }

  const trial = trials[trialAtual]
  const progresso = ((trialAtual) / trials.length) * 100

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      background: 'linear-gradient(135deg, #e0f7f0 0%, #e8f4ff 100%)',
      fontFamily: 'var(--font-sans, system-ui, sans-serif)',
      userSelect: 'none',
    }}>
      <Confetti ativo={confetti} />

      {/* Topbar */}
      <div style={{
        padding: '12px 20px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', background: 'rgba(255,255,255,0.7)',
        backdropFilter: 'blur(8px)', borderBottom: '1px solid rgba(29,158,117,0.15)',
      }}>
        {/* Progresso */}
        <div style={{ flex: 1, marginRight: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 12, color: '#7a9ab5' }}>Progresso</span>
            <span style={{ fontSize: 12, color: '#1D9E75', fontWeight: 600 }}>
              {trialAtual + 1} / {trials.length}
            </span>
          </div>
          <div style={{ height: 8, borderRadius: 4, background: 'rgba(0,0,0,0.08)', overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 4, background: '#1D9E75',
              width: `${progresso}%`, transition: 'width 0.4s ease',
            }} />
          </div>
        </div>

        {/* Pontos */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'rgba(29,158,117,0.1)', borderRadius: 20,
          padding: '6px 14px',
          transform: pontosAnim ? 'scale(1.2)' : 'scale(1)',
          transition: 'transform 0.2s ease',
        }}>
          <span style={{ fontSize: 16 }}>⭐</span>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#1D9E75' }}>{pontos}</span>
        </div>
      </div>

      {/* Área principal */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '24px 20px', gap: 28, maxWidth: 520, margin: '0 auto', width: '100%',
      }}>

        {/* Estímulo modelo (SD) */}
        <div style={{
          width: '100%', padding: 28, borderRadius: 20,
          background: 'rgba(255,255,255,0.9)',
          boxShadow: '0 4px 24px rgba(29,158,117,0.12)',
          border: '2px solid rgba(29,158,117,0.2)',
          textAlign: 'center',
          transform: feedback ? 'scale(0.98)' : 'scale(1)',
          transition: 'transform 0.2s ease',
        }}>
          <div style={{ fontSize: 11, color: '#7a9ab5', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>
            O que é isso?
          </div>
          <div style={{ fontSize: 32, fontWeight: 700, color: '#07111f', lineHeight: 1.3 }}>
            {trial.sd || '—'}
          </div>
        </div>

        {/* Feedback banner */}
        {feedback && (
          <div style={{
            width: '100%', padding: '14px 20px', borderRadius: 14,
            background: feedback === 'acerto' ? '#1D9E75' : '#EF9F27',
            color: '#fff', textAlign: 'center', fontSize: 20, fontWeight: 800,
            animation: 'popIn 0.3s ease',
            boxShadow: feedback === 'acerto'
              ? '0 4px 20px rgba(29,158,117,0.5)'
              : '0 4px 20px rgba(239,159,39,0.5)',
          }}>
            {msgFeedback}
          </div>
        )}

        {/* Opções de comparação */}
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontSize: 11, color: '#7a9ab5', letterSpacing: '0.1em', textTransform: 'uppercase', textAlign: 'center', marginBottom: 4 }}>
            Escolha a resposta certa
          </div>
          {trial.options.map((opcao, idx) => {
            const isSelecionada = opcaoSelecionada === opcao
            const isCorreta = opcao === trial.correct
            const mostrarCorreta = feedback === 'erro' && isCorreta

            let bg = 'rgba(255,255,255,0.9)'
            let border = '2px solid rgba(0,0,0,0.08)'
            let scale = 'scale(1)'
            let shadow = '0 2px 12px rgba(0,0,0,0.06)'

            if (isSelecionada && feedback === 'acerto') {
              bg = '#1D9E75'
              border = '2px solid #1D9E75'
              scale = 'scale(1.04)'
              shadow = '0 6px 24px rgba(29,158,117,0.5)'
            } else if (isSelecionada && feedback === 'erro') {
              bg = '#FFF3E0'
              border = '2px solid #EF9F27'
              scale = 'scale(0.97)'
            } else if (mostrarCorreta) {
              bg = 'rgba(29,158,117,0.12)'
              border = '2px solid #1D9E75'
            }

            return (
              <button
                key={idx}
                onClick={() => handleResposta(opcao)}
                disabled={bloqueado}
                style={{
                  width: '100%', padding: '18px 20px', borderRadius: 14,
                  background: bg, border, cursor: bloqueado ? 'default' : 'pointer',
                  fontSize: 20, fontWeight: 600, color: isSelecionada && feedback === 'acerto' ? '#fff' : '#07111f',
                  textAlign: 'center', transform: scale, transition: 'all 0.2s ease',
                  boxShadow: shadow, letterSpacing: '0.02em',
                  animation: isSelecionada && feedback === 'erro' ? 'shake 0.4s ease' : 'none',
                }}
              >
                {opcao}
              </button>
            )
          })}
        </div>
      </div>

      <style>{`
        @keyframes popIn {
          from { transform: scale(0.8); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0) scale(0.97); }
          20% { transform: translateX(-8px) scale(0.97); }
          40% { transform: translateX(8px) scale(0.97); }
          60% { transform: translateX(-5px) scale(0.97); }
          80% { transform: translateX(5px) scale(0.97); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        * { -webkit-tap-highlight-color: transparent; }
        button:active { transform: scale(0.96) !important; }
      `}</style>
    </div>
  )
}

// ─── Export com Suspense (necessário para useSearchParams) ────────────────────

export default function ApprenticePage() {
  return (
    <Suspense fallback={<TelaCarregando />}>
      <ApprenticeContent />
    </Suspense>
  )
}
