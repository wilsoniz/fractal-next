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

interface Crianca {
  id: string
  nome: string
  genero: string | null
}

interface TrialResult {
  trial_index: number
  correct_stimulus_id: string
  selected_stimulus_id: string
  is_correct: boolean
  latency_ms: number
  options_presented: string[]
}

// ─── Temas de cor por gênero/preferência ─────────────────────────────────────

const TEMAS = {
  default: { bg: 'linear-gradient(135deg, #e0f7f0 0%, #e8f4ff 100%)', accent: '#1D9E75', accentLight: 'rgba(29,158,117,0.12)' },
  feminino: { bg: 'linear-gradient(135deg, #fce4f3 0%, #e8f0ff 100%)', accent: '#d45fa8', accentLight: 'rgba(212,95,168,0.12)' },
  masculino: { bg: 'linear-gradient(135deg, #e0eeff 0%, #e8f7ff 100%)', accent: '#2e7dd4', accentLight: 'rgba(46,125,212,0.12)' },
}

// ─── Mascote SVG reativo ──────────────────────────────────────────────────────

function Mascote({ estado, nome }: { estado: 'neutro' | 'feliz' | 'pensando' | 'erro' | 'celebrando'; nome: string }) {
  const cores = {
    neutro:     { rosto: '#1D9E75', olho: '#07111f', boca: 'M 6 10 Q 9 12 12 10', fundo: 'rgba(29,158,117,0.12)' },
    feliz:      { rosto: '#1D9E75', olho: '#07111f', boca: 'M 5 9 Q 9 14 13 9',   fundo: 'rgba(29,158,117,0.18)' },
    pensando:   { rosto: '#378ADD', olho: '#07111f', boca: 'M 6 10 Q 9 10 12 10', fundo: 'rgba(55,138,221,0.12)' },
    erro:       { rosto: '#EF9F27', olho: '#07111f', boca: 'M 5 11 Q 9 8 13 11',  fundo: 'rgba(239,159,39,0.12)' },
    celebrando: { rosto: '#1D9E75', olho: '#07111f', boca: 'M 4 9 Q 9 15 14 9',   fundo: 'rgba(29,158,117,0.2)' },
  }
  const c = cores[estado]

  const animacao = estado === 'celebrando'
    ? 'mascote-celebra 0.4s ease infinite alternate'
    : estado === 'pensando'
    ? 'mascote-pensa 1.5s ease infinite'
    : 'mascote-idle 3s ease infinite'

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
    }}>
      <div style={{
        width: 72, height: 72, borderRadius: '50%',
        background: c.fundo, border: `2px solid ${c.rosto}30`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: animacao,
      }}>
        <svg width="36" height="36" viewBox="0 0 18 18" fill="none">
          {/* Cabeça */}
          <circle cx="9" cy="9" r="8" fill={c.rosto} opacity="0.9" />
          {/* Olhos */}
          {estado === 'celebrando' ? (
            <>
              <path d="M 5 6 L 7 8 M 5 8 L 7 6" stroke={c.olho} strokeWidth="1.2" strokeLinecap="round" />
              <path d="M 11 6 L 13 8 M 11 8 L 13 6" stroke={c.olho} strokeWidth="1.2" strokeLinecap="round" />
            </>
          ) : (
            <>
              <circle cx="6" cy="7.5" r="1.2" fill={c.olho} />
              <circle cx="12" cy="7.5" r="1.2" fill={c.olho} />
            </>
          )}
          {/* Boca */}
          <path d={c.boca} stroke="#fff" strokeWidth="1.4" strokeLinecap="round" fill="none" />
          {/* Estrelinhas no celebrando */}
          {estado === 'celebrando' && (
            <>
              <text x="0" y="5" fontSize="4" fill="#FFD700">✦</text>
              <text x="14" y="5" fontSize="4" fill="#FFD700">✦</text>
            </>
          )}
        </svg>
      </div>
      <style>{`
        @keyframes mascote-idle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
        @keyframes mascote-celebra {
          from { transform: rotate(-8deg) scale(1.05); }
          to { transform: rotate(8deg) scale(1.15); }
        }
        @keyframes mascote-pensa {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-5deg); }
          75% { transform: rotate(5deg); }
        }
      `}</style>
    </div>
  )
}

// ─── Conquistas ───────────────────────────────────────────────────────────────

const CONQUISTAS = [
  { id: 'primeiro_acerto', icone: '🎯', label: 'Primeiro acerto!', condicao: (acertos: number) => acertos >= 1 },
  { id: 'tres_seguidos',   icone: '🔥', label: '3 acertos seguidos!', condicao: (_: number, sequencia: number) => sequencia >= 3 },
  { id: 'metade',          icone: '⭐', label: 'Metade do caminho!', condicao: (acertos: number, _: number, total: number, idx: number) => idx === Math.floor(total / 2) },
]

// ─── Web Audio ────────────────────────────────────────────────────────────────

function playSound(type: 'acerto' | 'erro' | 'conclusao' | 'conquista') {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const master = ctx.createGain()
    master.connect(ctx.destination)

    if (type === 'acerto') {
      const freqs = [523, 659, 784, 1047]
      freqs.forEach((freq, i) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain); gain.connect(master)
        osc.type = 'sine'; osc.frequency.value = freq
        gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.08)
        gain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + i * 0.08 + 0.05)
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + i * 0.08 + 0.25)
        osc.start(ctx.currentTime + i * 0.08)
        osc.stop(ctx.currentTime + i * 0.08 + 0.3)
      })
    } else if (type === 'erro') {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain); gain.connect(master)
      osc.type = 'sine'
      osc.frequency.setValueAtTime(300, ctx.currentTime)
      osc.frequency.linearRampToValueAtTime(200, ctx.currentTime + 0.3)
      gain.gain.setValueAtTime(0.1, ctx.currentTime)
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3)
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.35)
    } else if (type === 'conquista') {
      const freqs = [784, 988, 1175, 1568]
      freqs.forEach((freq, i) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain); gain.connect(master)
        osc.type = 'triangle'; osc.frequency.value = freq
        gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.06)
        gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + i * 0.06 + 0.04)
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + i * 0.06 + 0.2)
        osc.start(ctx.currentTime + i * 0.06)
        osc.stop(ctx.currentTime + i * 0.06 + 0.25)
      })
    } else {
      const freqs = [523, 659, 784, 659, 784, 1047]
      const times = [0, 0.1, 0.2, 0.35, 0.45, 0.55]
      freqs.forEach((freq, i) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain); gain.connect(master)
        osc.type = 'triangle'; osc.frequency.value = freq
        gain.gain.setValueAtTime(0, ctx.currentTime + times[i])
        gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + times[i] + 0.05)
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + times[i] + 0.18)
        osc.start(ctx.currentTime + times[i])
        osc.stop(ctx.currentTime + times[i] + 0.25)
      })
    }
  } catch (e) {}
}

// ─── Confetti ─────────────────────────────────────────────────────────────────

function Confetti({ ativo }: { ativo: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number | null>(null)

  useEffect(() => {
    if (!ativo || !canvasRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')!
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    const cores = ['#1D9E75', '#378ADD', '#EF9F27', '#E05A4B', '#8B7FE8', '#FFD700', '#FF69B4']
    const particles = Array.from({ length: 80 }, () => ({
      x: Math.random() * canvas.width, y: -20,
      vx: (Math.random() - 0.5) * 4, vy: Math.random() * 3 + 2,
      cor: cores[Math.floor(Math.random() * cores.length)],
      size: Math.random() * 10 + 5,
      rotation: Math.random() * 360, rotSpeed: (Math.random() - 0.5) * 8,
      opacity: 1,
    }))

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy; p.vy += 0.1
        p.rotation += p.rotSpeed
        if (p.y > canvas.height * 0.7) p.opacity -= 0.02
        if (p.opacity <= 0) return
        ctx.save()
        ctx.globalAlpha = Math.max(0, p.opacity)
        ctx.translate(p.x, p.y)
        ctx.rotate((p.rotation * Math.PI) / 180)
        ctx.fillStyle = p.cor
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6)
        ctx.restore()
      })
      if (particles.some(p => p.opacity > 0)) {
        animRef.current = requestAnimationFrame(animate)
      }
    }
    animRef.current = requestAnimationFrame(animate)
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current) }
  }, [ativo])

  if (!ativo) return null
  return <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 50 }} />
}

// ─── Msgs ─────────────────────────────────────────────────────────────────────

const MSGS_ACERTO = ['Incrível!', 'Muito bem!', 'Você conseguiu!', 'Parabéns!', 'Arrasou!', 'Que demais!', 'Perfeito!', 'Show de bola!']
const MSGS_ERRO = ['Quase lá!', 'Tente de novo!', 'Você vai conseguir!', 'Continue tentando!', 'Não desista!']
const MSGS_SAUDACAO = ['Vamos lá', 'Pronto para treinar', 'Hora de aprender', 'Vamos jogar']

function msgAleatoria(arr: string[]) { return arr[Math.floor(Math.random() * arr.length)] }
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
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #e0f7f0 0%, #e8f4ff 100%)' }}>
      <div style={{ width: 64, height: 64, borderRadius: '50%', border: '4px solid #1D9E75', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
      <div style={{ marginTop: 20, fontSize: 18, color: '#1D9E75', fontWeight: 600 }}>Preparando seu treino...</div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

// ─── Tela de boas-vindas ──────────────────────────────────────────────────────

function TelaBoasVindas({ crianca, task, tema, onIniciar }: {
  crianca: Crianca; task: ApprenticeTask
  tema: typeof TEMAS.default; onIniciar: () => void
}) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: tema.bg, padding: 32, textAlign: 'center', fontFamily: 'var(--font-sans, system-ui)' }}>
      <Mascote estado="neutro" nome={crianca.nome} />
      <div style={{ marginTop: 20, fontSize: 28, fontWeight: 800, color: '#07111f' }}>
        {msgAleatoria(MSGS_SAUDACAO)}, {crianca.nome.split(' ')[0]}!
      </div>
      <div style={{ fontSize: 16, color: '#4a7a9b', marginTop: 8, marginBottom: 32 }}>
        {task.title}
      </div>
      <div style={{ display: 'flex', gap: 20, marginBottom: 40 }}>
        {[
          { icone: '🎯', label: `${task.total_trials} questões` },
          { icone: '⭐', label: 'Ganhe pontos' },
          { icone: '🏆', label: 'Conquistas' },
        ].map(item => (
          <div key={item.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div style={{ fontSize: 28 }}>{item.icone}</div>
            <div style={{ fontSize: 12, color: '#7a9ab5', fontWeight: 500 }}>{item.label}</div>
          </div>
        ))}
      </div>
      <button
        onClick={onIniciar}
        style={{
          padding: '18px 56px', borderRadius: 20, border: 'none',
          background: tema.accent, color: '#fff', fontSize: 20, fontWeight: 800,
          cursor: 'pointer', boxShadow: `0 6px 24px ${tema.accent}40`,
          transition: 'transform 0.15s',
          animation: 'pulsa 2s ease infinite',
        }}
        onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.06)')}
        onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
      >
        Começar!
      </button>
      <style>{`
        @keyframes pulsa {
          0%, 100% { box-shadow: 0 6px 24px ${tema.accent}40; }
          50% { box-shadow: 0 6px 36px ${tema.accent}70; }
        }
      `}</style>
    </div>
  )
}

// ─── Banner de conquista ──────────────────────────────────────────────────────

function BannerConquista({ conquista, onClose }: { conquista: { icone: string; label: string }; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 2500)
    return () => clearTimeout(t)
  }, [onClose])

  return (
    <div style={{
      position: 'fixed', top: 80, left: '50%', transform: 'translateX(-50%)',
      background: '#FFD700', color: '#07111f', padding: '12px 24px',
      borderRadius: 16, fontSize: 16, fontWeight: 800, zIndex: 60,
      display: 'flex', alignItems: 'center', gap: 10,
      boxShadow: '0 4px 20px rgba(255,215,0,0.5)',
      animation: 'slideDown 0.3s ease',
    }}>
      <span style={{ fontSize: 24 }}>{conquista.icone}</span>
      {conquista.label}
      <style>{`@keyframes slideDown { from { transform: translateX(-50%) translateY(-20px); opacity: 0; } to { transform: translateX(-50%) translateY(0); opacity: 1; } }`}</style>
    </div>
  )
}

// ─── Tela de conclusão ────────────────────────────────────────────────────────

function TelaConclusao({ total, acertos, crianca, tema, onReiniciar }: {
  total: number; acertos: number; crianca: Crianca
  tema: typeof TEMAS.default; onReiniciar: () => void
}) {
  const pct = Math.round((acertos / total) * 100)
  const estrelas = pct >= 90 ? 3 : pct >= 70 ? 2 : 1

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32, background: tema.bg, textAlign: 'center', fontFamily: 'var(--font-sans, system-ui)' }}>
      <Confetti ativo={true} />
      <Mascote estado="celebrando" nome={crianca.nome} />

      <div style={{ fontSize: 48, margin: '16px 0', animation: 'popIn 0.5s ease' }}>
        {Array.from({ length: 3 }, (_, i) => (
          <span key={i} style={{ opacity: i < estrelas ? 1 : 0.2, display: 'inline-block', animation: i < estrelas ? `popIn 0.4s ease ${i * 0.15}s both` : 'none' }}>⭐</span>
        ))}
      </div>

      <div style={{ fontSize: 30, fontWeight: 800, color: '#07111f', marginBottom: 6 }}>
        {pct >= 80 ? `Parabéns, ${crianca.nome.split(' ')[0]}!` : 'Bom trabalho!'}
      </div>
      <div style={{ fontSize: 16, color: '#4a7a9b', marginBottom: 24 }}>
        Você acertou {acertos} de {total} questões
      </div>

      <div style={{ width: '100%', maxWidth: 320, height: 20, borderRadius: 10, background: 'rgba(0,0,0,0.08)', overflow: 'hidden', marginBottom: 16 }}>
        <div style={{ height: '100%', borderRadius: 10, background: tema.accent, width: `${pct}%`, transition: 'width 1.2s ease', boxShadow: `0 2px 8px ${tema.accent}60` }} />
      </div>

      <div style={{ fontSize: 36, fontWeight: 800, color: tema.accent, marginBottom: 40 }}>{pct}%</div>

      <button
        onClick={onReiniciar}
        style={{ padding: '16px 48px', borderRadius: 18, border: 'none', background: tema.accent, color: '#fff', fontSize: 18, fontWeight: 700, cursor: 'pointer', boxShadow: `0 4px 20px ${tema.accent}40` }}
      >
        Treinar de novo!
      </button>

      <style>{`
        @keyframes popIn { from { transform: scale(0); opacity: 0; } to { transform: scale(1); opacity: 1; } }
      `}</style>
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

function ApprenticeContent() {
  const searchParams = useSearchParams()
  const taskId = searchParams.get('taskId')

  const [task, setTask] = useState<ApprenticeTask | null>(null)
  const [crianca, setCrianca] = useState<Crianca | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [trials, setTrials] = useState<Trial[]>([])
  const [trialAtual, setTrialAtual] = useState(0)
  const [resultados, setResultados] = useState<TrialResult[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')
  const [fase, setFase] = useState<'loading' | 'boasvindas' | 'treino' | 'concluido'>('loading')

  const [feedback, setFeedback] = useState<'acerto' | 'erro' | null>(null)
  const [opcaoSelecionada, setOpcaoSelecionada] = useState<string | null>(null)
  const [msgFeedback, setMsgFeedback] = useState('')
  const [confetti, setConfetti] = useState(false)
  const [bloqueado, setBloqueado] = useState(false)
  const [pontos, setPontos] = useState(0)
  const [pontosAnim, setPontosAnim] = useState(false)
  const [mascoteEstado, setMascoteEstado] = useState<'neutro' | 'feliz' | 'pensando' | 'erro' | 'celebrando'>('neutro')
  const [sequenciaAcertos, setSequenciaAcertos] = useState(0)
  const [conquistaAtiva, setConquistaAtiva] = useState<{ icone: string; label: string } | null>(null)
  const [conquistasDesbloqueadas, setConquistasDesbloqueadas] = useState<string[]>([])

  const inicioTrialRef = useRef<number>(Date.now())

  const tema = crianca?.genero === 'feminino' ? TEMAS.feminino
    : crianca?.genero === 'masculino' ? TEMAS.masculino
    : TEMAS.default

  // Carrega task e criança
  useEffect(() => {
    if (!taskId) { setErro('ID da tarefa não encontrado.'); setLoading(false); return }

    const iniciar = async () => {
      const { data: taskData, error: taskError } = await supabase
        .from('apprentice_tasks')
        .select('*')
        .eq('id', taskId)
        .single()

      if (taskError || !taskData) { setErro('Tarefa não encontrada. Verifique o link.'); setLoading(false); return }

      setTask(taskData)

      // Busca dados da criança
      const { data: criancaData } = await supabase
        .from('criancas')
        .select('id, nome, genero')
        .eq('id', taskData.child_id)
        .single()

      if (criancaData) setCrianca(criancaData)

      const rawTrials = (taskData.stimuli_payload as { trials: Trial[] })?.trials ?? []
      const trialsEmbaralhados = embaralhar(rawTrials).map((t: Trial) => ({ ...t, options: embaralhar(t.options) }))
      setTrials(trialsEmbaralhados)

      setLoading(false)
      setFase('boasvindas')
    }

    iniciar()
  }, [taskId])

  const iniciarSessao = useCallback(async () => {
    if (!task) return
    const { data: sessao } = await supabase
      .from('apprentice_sessions')
      .insert({ child_id: task.child_id, task_id: task.id, status: 'in_progress' })
      .select('id')
      .single()

    if (sessao) setSessionId(sessao.id)
    setFase('treino')
    inicioTrialRef.current = Date.now()
  }, [task])

  const verificarConquistas = useCallback((acertos: number, sequencia: number, total: number, idx: number) => {
    CONQUISTAS.forEach(c => {
      if (!conquistasDesbloqueadas.includes(c.id) && c.condicao(acertos, sequencia, total, idx)) {
        setConquistasDesbloqueadas(prev => [...prev, c.id])
        setConquistaAtiva({ icone: c.icone, label: c.label })
        playSound('conquista')
      }
    })
  }, [conquistasDesbloqueadas])

  const handleResposta = useCallback(async (opcao: string) => {
    if (bloqueado || !task || !sessionId) return
    setBloqueado(true)

    const trial = trials[trialAtual]
    const correto = opcao === trial.correct
    const latencia = Date.now() - inicioTrialRef.current

    setOpcaoSelecionada(opcao)
    setFeedback(correto ? 'acerto' : 'erro')
    setMsgFeedback(correto ? msgAleatoria(MSGS_ACERTO) : msgAleatoria(MSGS_ERRO))

    const novaSequencia = correto ? sequenciaAcertos + 1 : 0
    setSequenciaAcertos(novaSequencia)

    if (correto) {
      playSound('acerto')
      setMascoteEstado('celebrando')
      setConfetti(true)
      setPontos(p => p + 100)
      setPontosAnim(true)
      setTimeout(() => { setConfetti(false); setPontosAnim(false); setMascoteEstado('neutro') }, 1800)
    } else {
      playSound('erro')
      setMascoteEstado('erro')
      setTimeout(() => setMascoteEstado('neutro'), 1500)
    }

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

    const acertos = novosResultados.filter(r => r.is_correct).length
    verificarConquistas(acertos, novaSequencia, trials.length, trialAtual)

    setTimeout(async () => {
      setFeedback(null)
      setOpcaoSelecionada(null)
      setBloqueado(false)

      if (trialAtual + 1 >= trials.length) {
        const accuracy = acertos / novosResultados.length
        await supabase.from('apprentice_sessions').update({
          status: 'completed',
          finished_at: new Date().toISOString(),
          total_trials: novosResultados.length,
          correct_trials: acertos,
          incorrect_trials: novosResultados.length - acertos,
          accuracy,
        }).eq('id', sessionId)

        // Dispara o FractaEngine em background
        fetch('/api/engine/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_id: sessionId }),
        }).catch(err => console.error('Engine error:', err))
        playSound('conclusao')
        setFase('concluido')
      } else {
        setTrialAtual(t => t + 1)
        setMascoteEstado('pensando')
        setTimeout(() => setMascoteEstado('neutro'), 800)
        inicioTrialRef.current = Date.now()
      }
    }, 1500)
  }, [bloqueado, task, sessionId, trials, trialAtual, resultados, sequenciaAcertos, verificarConquistas])

  const handleReiniciar = () => {
    setTrialAtual(0); setResultados([]); setFase('boasvindas')
    setFeedback(null); setOpcaoSelecionada(null)
    setPontos(0); setSequenciaAcertos(0); setConquistasDesbloqueadas([])
    setMascoteEstado('neutro')
    if (task) {
      const rawTrials = (task.stimuli_payload as { trials: Trial[] })?.trials ?? []
      setTrials(embaralhar(rawTrials).map((t: Trial) => ({ ...t, options: embaralhar(t.options) })))
    }
  }

  if (loading || fase === 'loading') return <TelaCarregando />

  if (erro) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #e0f7f0 0%, #e8f4ff 100%)', flexDirection: 'column', gap: 16, padding: 32, textAlign: 'center' }}>
        <div style={{ fontSize: 48 }}>😕</div>
        <div style={{ fontSize: 20, fontWeight: 700, color: '#07111f' }}>{erro}</div>
        <div style={{ fontSize: 14, color: '#7a9ab5' }}>Peça ajuda ao seu terapeuta.</div>
      </div>
    )
  }

  if (!task || !crianca || trials.length === 0) return <TelaCarregando />

  if (fase === 'boasvindas') {
    return <TelaBoasVindas crianca={crianca} task={task} tema={tema} onIniciar={iniciarSessao} />
  }

  if (fase === 'concluido') {
    const acertos = resultados.filter(r => r.is_correct).length
    return <TelaConclusao total={resultados.length} acertos={acertos} crianca={crianca} tema={tema} onReiniciar={handleReiniciar} />
  }

  const trial = trials[trialAtual]
  const progresso = (trialAtual / trials.length) * 100

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: tema.bg, fontFamily: 'var(--font-sans, system-ui, sans-serif)', userSelect: 'none' }}>
      <Confetti ativo={confetti} />
      {conquistaAtiva && <BannerConquista conquista={conquistaAtiva} onClose={() => setConquistaAtiva(null)} />}

      {/* Topbar */}
      <div style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(255,255,255,0.75)', backdropFilter: 'blur(8px)', borderBottom: `1px solid ${tema.accent}20` }}>
        {/* Mascote pequeno + nome */}
        <Mascote estado={mascoteEstado} nome={crianca.nome} />

        {/* Progresso */}
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#07111f' }}>{crianca.nome.split(' ')[0]}</span>
            <span style={{ fontSize: 12, color: tema.accent, fontWeight: 600 }}>{trialAtual + 1} / {trials.length}</span>
          </div>
          <div style={{ height: 10, borderRadius: 5, background: 'rgba(0,0,0,0.08)', overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: 5, background: tema.accent, width: `${progresso}%`, transition: 'width 0.4s ease' }} />
          </div>
          {/* Conquistas desbloqueadas */}
          {conquistasDesbloqueadas.length > 0 && (
            <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
              {conquistasDesbloqueadas.map(id => {
                const c = CONQUISTAS.find(x => x.id === id)
                return c ? <span key={id} style={{ fontSize: 14 }}>{c.icone}</span> : null
              })}
            </div>
          )}
        </div>

        {/* Pontos */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 5,
          background: tema.accentLight, borderRadius: 20, padding: '6px 14px',
          transform: pontosAnim ? 'scale(1.2)' : 'scale(1)',
          transition: 'transform 0.2s ease',
        }}>
          <span style={{ fontSize: 16 }}>⭐</span>
          <span style={{ fontSize: 16, fontWeight: 800, color: tema.accent }}>{pontos}</span>
        </div>
      </div>

      {/* Área principal */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 20px', gap: 20, maxWidth: 520, margin: '0 auto', width: '100%' }}>

        {/* SD */}
        <div style={{
          width: '100%', padding: '32px 28px', borderRadius: 24,
          background: 'rgba(255,255,255,0.92)',
          boxShadow: `0 4px 24px ${tema.accent}18`,
          border: `2px solid ${tema.accent}25`,
          textAlign: 'center',
          transform: feedback ? 'scale(0.98)' : 'scale(1)',
          transition: 'transform 0.2s ease',
        }}>
          <div style={{ fontSize: 11, color: '#7a9ab5', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 14 }}>
            O que é isso?
          </div>
          <div style={{ fontSize: 36, fontWeight: 800, color: '#07111f', lineHeight: 1.2 }}>
            {trial.sd || '—'}
          </div>
        </div>

        {/* Feedback banner */}
        {feedback && (
          <div style={{
            width: '100%', padding: '14px 20px', borderRadius: 16,
            background: feedback === 'acerto' ? tema.accent : '#EF9F27',
            color: '#fff', textAlign: 'center', fontSize: 22, fontWeight: 800,
            animation: 'popIn 0.3s ease',
            boxShadow: feedback === 'acerto' ? `0 4px 20px ${tema.accent}50` : '0 4px 20px rgba(239,159,39,0.5)',
          }}>
            {msgFeedback}
          </div>
        )}

        {/* Opções */}
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontSize: 11, color: '#7a9ab5', letterSpacing: '0.12em', textTransform: 'uppercase', textAlign: 'center', marginBottom: 2 }}>
            Escolha a resposta certa
          </div>
          {trial.options.map((opcao, idx) => {
            const isSelecionada = opcaoSelecionada === opcao
            const isCorreta = opcao === trial.correct
            const mostrarCorreta = feedback === 'erro' && isCorreta

            let bg = 'rgba(255,255,255,0.92)'
            let border = '2px solid rgba(0,0,0,0.07)'
            let scale = 'scale(1)'
            let shadow = '0 2px 12px rgba(0,0,0,0.05)'
            let color = '#07111f'

            if (isSelecionada && feedback === 'acerto') {
              bg = tema.accent; border = `2px solid ${tema.accent}`
              scale = 'scale(1.04)'; shadow = `0 6px 24px ${tema.accent}50`; color = '#fff'
            } else if (isSelecionada && feedback === 'erro') {
              bg = '#FFF3E0'; border = '2px solid #EF9F27'; scale = 'scale(0.97)'
            } else if (mostrarCorreta) {
              bg = tema.accentLight; border = `2px solid ${tema.accent}`
            }

            return (
              <button
                key={idx}
                onClick={() => handleResposta(opcao)}
                disabled={bloqueado}
                style={{
                  width: '100%', padding: '20px 20px', borderRadius: 16,
                  background: bg, border, cursor: bloqueado ? 'default' : 'pointer',
                  fontSize: 22, fontWeight: 700, color,
                  textAlign: 'center', transform: scale, transition: 'all 0.2s ease',
                  boxShadow: shadow,
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
        @keyframes popIn { from { transform: scale(0.8); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        @keyframes shake { 0%, 100% { transform: translateX(0) scale(0.97); } 20% { transform: translateX(-8px) scale(0.97); } 40% { transform: translateX(8px) scale(0.97); } 60% { transform: translateX(-5px) scale(0.97); } 80% { transform: translateX(5px) scale(0.97); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        * { -webkit-tap-highlight-color: transparent; }
        button:active { transform: scale(0.95) !important; }
      `}</style>
    </div>
  )
}

export default function ApprenticePage() {
  return (
    <Suspense fallback={<TelaCarregando />}>
      <ApprenticeContent />
    </Suspense>
  )
}
