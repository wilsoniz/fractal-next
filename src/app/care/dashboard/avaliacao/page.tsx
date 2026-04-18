'use client'

/**
 * Aba: Avaliação
 * src/app/care/dashboard/avaliacao/page.tsx
 *
 * 4 blocos:
 *   1. Mapa de Habilidades — radar atual + histórico de snapshots
 *   2. Triagem de Desenvolvimento — 39 perguntas da planilha
 *   3. Laudos e Diagnósticos — upload + formulário
 *   4. Do Terapeuta — placeholder
 */

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useCareContext } from '../layout'
import FractaRadarChart from '@/components/fracta/FractaRadarChart'
import type { ScoresRadar } from '@/components/fracta/FractaRadarChart'

// ─────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────

type RadarSnapshot = {
  id: string
  criado_em: string
  score_comunicacao: number
  score_social: number
  score_atencao: number
  score_regulacao: number
  score_brincadeira: number
  score_flexibilidade: number
  score_autonomia: number
  score_motivacao: number
}

type Laudo = {
  id: string
  cid: string | null
  diagnostico: string | null
  especialidades: string[]
  horas_tratamento_semana: number | null
  profissional_emissor: string | null
  data_laudo: string | null
  arquivo_url: string | null
  notas: string | null
  criado_em: string
}

type TriagemResultado = {
  area: string
  label: string
  score: number
  nivel: 'baixo' | 'medio' | 'alto'
}

// ─────────────────────────────────────────────
// PERGUNTAS DE TRIAGEM (da planilha)
// ─────────────────────────────────────────────

const PERGUNTAS_TRIAGEM = [
  // TDI
  { id: 'tdi_1', area: 'TDI', texto: 'Seu filho encontra dificuldades em aprender coisas novas ou mais avançadas?' },
  { id: 'tdi_2', area: 'TDI', texto: 'Como ele se sai nas interações sociais? Tem amigos com quem gosta de brincar?' },
  { id: 'tdi_3', area: 'TDI', texto: 'Vocês percebem algum desafio em seguir regras sociais ou entender o que os outros querem?' },
  { id: 'tdi_4', area: 'TDI', texto: 'Seu filho enfrenta dificuldades para entender o que os outros estão pensando ou planejando?' },
  { id: 'tdi_5', area: 'TDI', texto: 'Seu filho tem dificuldade para aprender, entender as coisas e resolver problemas?' },
  { id: 'tdi_6', area: 'TDI', texto: 'Ele parece esquecer com frequência ou tem problemas para lembrar das coisas?' },
  { id: 'tdi_7', area: 'TDI', texto: 'Vocês notam que ele encontra dificuldades para lidar com situações do dia a dia?' },
  // TC
  { id: 'tc_1', area: 'TC', texto: 'Seu filho teve atrasos na fala ou na compreensão da linguagem?' },
  { id: 'tc_2', area: 'TC', texto: 'Ele parece ter dificuldade em se dar bem com outras crianças ou fazer amigos?' },
  { id: 'tc_3', area: 'TC', texto: 'Notam problemas nas interações sociais ou para se comunicar?' },
  { id: 'tc_4', area: 'TC', texto: 'Seu filho tem problemas para falar ou entender o que os outros dizem?' },
  { id: 'tc_5', area: 'TC', texto: 'Ele faz movimentos ou comportamentos repetitivos que podem interferir no jeito como ele pensa?' },
  { id: 'tc_6', area: 'TC', texto: 'É difícil para ele entender sinais sociais ou interagir com outras crianças?' },
  // TEA
  { id: 'tea_1', area: 'TEA', texto: 'A comunicação e socialização do seu filho são impactadas?' },
  { id: 'tea_2', area: 'TEA', texto: 'Ele tem dificuldade em entender emoções ou expressar as próprias emoções?' },
  { id: 'tea_3', area: 'TEA', texto: 'Como é a interação dele com outras crianças? Ele parece ter dificuldades?' },
  { id: 'tea_4', area: 'TEA', texto: 'Seu filho enfrenta desafios na comunicação e interação social?' },
  { id: 'tea_5', area: 'TEA', texto: 'Ele tem comportamentos repetitivos ou interesses muito específicos?' },
  { id: 'tea_6', area: 'TEA', texto: 'Notam que ele tem dificuldade para entender expressões faciais e emoções?' },
  // TDAH
  { id: 'tdah_1', area: 'TDAH', texto: 'Seu filho tem dificuldades em prestar atenção e pode ser impulsivo?' },
  { id: 'tdah_2', area: 'TDAH', texto: 'Ele parece ter problemas para pensar nas consequências de suas ações?' },
  { id: 'tdah_3', area: 'TDAH', texto: 'Vocês notam desafios na autonomia e na capacidade de tomar decisões?' },
  { id: 'tdah_4', area: 'TDAH', texto: 'Seu filho tem problemas para prestar atenção ou se concentra muito pouco?' },
  { id: 'tdah_5', area: 'TDAH', texto: 'Ele é muito agitado ou age impulsivamente?' },
  { id: 'tdah_6', area: 'TDAH', texto: 'Vocês percebem que ele tem dificuldades para se organizar e planejar as coisas?' },
  // TA
  { id: 'ta_1', area: 'TA', texto: 'Seu filho enfrenta dificuldades específicas em algumas matérias na escola?' },
  { id: 'ta_2', area: 'TA', texto: 'Como isso afeta a maneira como ele se relaciona com os outros e entende o que está acontecendo ao redor?' },
  { id: 'ta_3', area: 'TA', texto: 'Seu filho enfrenta desafios específicos em matérias da escola?' },
  { id: 'ta_4', area: 'TA', texto: 'Isso afeta a maneira como ele se sente consigo mesmo ou o motiva?' },
  // TM
  { id: 'tm_1', area: 'TM', texto: 'Seu filho tem dificuldades com atividades físicas ou movimentos?' },
  { id: 'tm_2', area: 'TM', texto: 'Ele faz movimentos estranhos que chamam a atenção?' },
  { id: 'tm_3', area: 'TM', texto: 'Seu filho tem dificuldades com atividades físicas ou coordenação motora?' },
  { id: 'tm_4', area: 'TM', texto: 'Ele faz movimentos estranhos ou diferentes das outras crianças?' },
  // TT
  { id: 'tt_1', area: 'TT', texto: 'Seu filho faz movimentos ou sons repetitivos que ele não consegue controlar?' },
  { id: 'tt_2', area: 'TT', texto: 'Isso afeta o jeito como ele se sente consigo mesmo ou como se relaciona com os outros?' },
  { id: 'tt_3', area: 'TT', texto: 'Seu filho faz movimentos ou sons repetitivos que chamam a atenção?' },
  { id: 'tt_4', area: 'TT', texto: 'Ele tem dificuldade em controlar esses movimentos ou sons?' },
  // Outros
  { id: 'out_1', area: 'Outros', texto: 'Se houver outros problemas específicos, como eles afetam seu filho? O que vocês notam?' },
]

const AREA_LABELS: Record<string, string> = {
  TDI: 'Desenvolvimento Intelectual',
  TC: 'Comunicação',
  TEA: 'Espectro Autista',
  TDAH: 'Atenção / Hiperatividade',
  TA: 'Aprendizagem',
  TM: 'Transtornos Motores',
  TT: 'Transtornos de Tique',
  Outros: 'Outras Áreas',
}

const AREA_CORES: Record<string, string> = {
  TDI: '#8B5CF6',
  TC: '#2BBFA4',
  TEA: '#4FC3D8',
  TDAH: '#F59E0B',
  TA: '#7AE040',
  TM: '#F87171',
  TT: '#A78BFA',
  Outros: '#94a3b8',
}

// ─────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────

export default function AvaliacaoPage() {
  const { criancaAtiva } = useCareContext()

  // Estado dos blocos
  const [blocoAberto, setBlocoAberto] = useState<1 | 2 | 3 | 4>(1)

  // Bloco 1 — Radar + Histórico
  const [snapshots, setSnapshots] = useState<RadarSnapshot[]>([])
  const [loadingSnapshots, setLoadingSnapshots] = useState(true)

  // Bloco 2 — Triagem
  const [respostasTriagem, setRespostasTriagem] = useState<Record<string, number>>({})
  const [triagensFeitas, setTriagensFeitas] = useState<{ id: string; criado_em: string; resultado: TriagemResultado[] }[]>([])
  const [salvandoTriagem, setSalvandoTriagem] = useState(false)
  const [triagempasso, setTriagemPasso] = useState(0) // 0 = início, 1 = em progresso, 2 = resultado

  // Bloco 3 — Laudos
  const [laudos, setLaudos] = useState<Laudo[]>([])
  const [formLaudo, setFormLaudo] = useState({
    cid: '', diagnostico: '', especialidades: '',
    horas_tratamento_semana: '', profissional_emissor: '',
    data_laudo: '', notas: '',
  })
  const [salvandoLaudo, setSalvandoLaudo] = useState(false)
  const [laudoSalvo, setLaudoSalvo] = useState(false)
  const [mostrarFormLaudo, setMostrarFormLaudo] = useState(false)

  // ── Carregar dados
  useEffect(() => {
    if (!criancaAtiva) return
    carregarSnapshots()
    carregarTriagens()
    carregarLaudos()
  }, [criancaAtiva])

  async function carregarSnapshots() {
    setLoadingSnapshots(true)
    const { data } = await supabase
      .from('radar_snapshots')
      .select('*')
      .eq('crianca_id', criancaAtiva!.id)
      .order('criado_em', { ascending: false })
      .limit(6)
    setSnapshots(data ?? [])
    setLoadingSnapshots(false)
  }

  async function carregarTriagens() {
    const { data } = await supabase
      .from('triagens')
      .select('id, criado_em, resultado')
      .eq('crianca_id', criancaAtiva!.id)
      .eq('tipo', 'triagem_inicial')
      .eq('status', 'concluida')
      .order('criado_em', { ascending: false })
      .limit(3)
    if (data) {
      setTriagensFeitas(data.map(t => ({
        id: t.id,
        criado_em: t.criado_em,
        resultado: (t.resultado as TriagemResultado[]) ?? [],
      })))
    }
  }

  async function carregarLaudos() {
    const { data } = await supabase
      .from('laudos')
      .select('*')
      .eq('crianca_id', criancaAtiva!.id)
      .order('criado_em', { ascending: false })
    setLaudos(data ?? [])
  }

  // ── Calcular resultado da triagem
  function calcularResultadoTriagem(): TriagemResultado[] {
    const areas = ['TDI', 'TC', 'TEA', 'TDAH', 'TA', 'TM', 'TT', 'Outros']
    return areas.map(area => {
      const perguntas = PERGUNTAS_TRIAGEM.filter(p => p.area === area)
      const total = perguntas.reduce((acc, p) => acc + (respostasTriagem[p.id] ?? 0), 0)
      const max = perguntas.length * 2
      const score = max > 0 ? Math.round((total / max) * 100) : 0
      const nivel: 'baixo' | 'medio' | 'alto' = score >= 60 ? 'alto' : score >= 30 ? 'medio' : 'baixo'
      return { area, label: AREA_LABELS[area], score, nivel }
    })
  }

  // ── Salvar triagem
  async function salvarTriagem() {
    if (!criancaAtiva) return
    setSalvandoTriagem(true)
    const resultado = calcularResultadoTriagem()
    await supabase.from('triagens').insert({
      crianca_id: criancaAtiva.id,
      responsavel_id: (await supabase.auth.getUser()).data.user?.id,
      tipo: 'triagem_inicial',
      area: 'geral',
      respostas: respostasTriagem,
      resultado,
      status: 'concluida',
    })
    await carregarTriagens()
    setTriagemPasso(2)
    setSalvandoTriagem(false)
  }

  // ── Salvar laudo
  async function salvarLaudo() {
    if (!criancaAtiva) return
    setSalvandoLaudo(true)
    const especialidades = formLaudo.especialidades
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
    await supabase.from('laudos').insert({
      crianca_id: criancaAtiva.id,
      responsavel_id: (await supabase.auth.getUser()).data.user?.id,
      cid: formLaudo.cid || null,
      diagnostico: formLaudo.diagnostico || null,
      especialidades,
      horas_tratamento_semana: formLaudo.horas_tratamento_semana ? parseInt(formLaudo.horas_tratamento_semana) : null,
      profissional_emissor: formLaudo.profissional_emissor || null,
      data_laudo: formLaudo.data_laudo || null,
      notas: formLaudo.notas || null,
    })
    await carregarLaudos()
    setFormLaudo({ cid: '', diagnostico: '', especialidades: '', horas_tratamento_semana: '', profissional_emissor: '', data_laudo: '', notas: '' })
    setMostrarFormLaudo(false)
    setLaudoSalvo(true)
    setTimeout(() => setLaudoSalvo(false), 3000)
    setSalvandoLaudo(false)
  }

  const nomeFilho = criancaAtiva?.nome.split(' ')[0] ?? '—'
  const snapshotAtual = snapshots[0]
  const scoresAtuais: ScoresRadar = snapshotAtual ? {
    comunicacao: snapshotAtual.score_comunicacao,
    social: snapshotAtual.score_social,
    atencao: snapshotAtual.score_atencao,
    regulacao: snapshotAtual.score_regulacao,
    brincadeira: snapshotAtual.score_brincadeira,
    flexibilidade: snapshotAtual.score_flexibilidade,
    autonomia: snapshotAtual.score_autonomia,
    motivacao: snapshotAtual.score_motivacao,
  } : {
    comunicacao: 50, social: 50, atencao: 50, regulacao: 50,
    brincadeira: 50, flexibilidade: 50, autonomia: 50, motivacao: 50,
  }

  const perguntasRespondidas = Object.keys(respostasTriagem).length
  const totalPerguntas = PERGUNTAS_TRIAGEM.length
  const progressoTriagem = Math.round((perguntasRespondidas / totalPerguntas) * 100)
  const triagempodeSalvar = perguntasRespondidas === totalPerguntas

  // ─────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────

  const card: React.CSSProperties = {
    background: 'rgba(255,255,255,.84)',
    backdropFilter: 'blur(14px)',
    borderRadius: 22,
    border: '1px solid rgba(43,191,164,.18)',
    boxShadow: '0 4px 28px rgba(43,191,164,.06)',
    overflow: 'hidden',
    marginBottom: 16,
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

      {/* ── Cabeçalho da aba */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: '.78rem', color: '#8a9ab8', marginBottom: 3 }}>Avaliações de</div>
        <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1E3A5F', letterSpacing: '-.02em' }}>{nomeFilho}</div>
      </div>

      {/* ══════════════════════════════════════
          BLOCO 1 — MAPA DE HABILIDADES
      ══════════════════════════════════════ */}
      <BlocoContainer
        numero={1}
        titulo="Mapa de Habilidades"
        subtitulo={snapshots.length > 0
          ? `${snapshots.length} avaliação${snapshots.length > 1 ? 'ões' : ''} registrada${snapshots.length > 1 ? 's' : ''}`
          : 'Nenhuma avaliação ainda'}
        aberto={blocoAberto === 1}
        onToggle={() => setBlocoAberto(blocoAberto === 1 ? 0 as any : 1)}
        cor="#2BBFA4"
      >
        {loadingSnapshots ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: '#8a9ab8', fontSize: 14 }}>Carregando...</div>
        ) : snapshots.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <p style={{ color: '#8a9ab8', fontSize: 14, marginBottom: 16 }}>
              {nomeFilho} ainda não tem avaliações registradas.
            </p>
            <Link href="/care/dashboard/avaliar" style={{
              display: 'inline-block', padding: '12px 28px',
              background: 'linear-gradient(135deg,#2BBFA4,#7AE040)',
              color: 'white', borderRadius: 50, textDecoration: 'none',
              fontWeight: 700, fontSize: '.85rem',
              boxShadow: '0 4px 16px rgba(43,191,164,.35)',
            }}>
              Fazer primeira avaliação
            </Link>
          </div>
        ) : (
          <div>
            {/* Radar atual */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 24 }}>
              <FractaRadarChart
                scores={scoresAtuais}
                idadeAnos={criancaAtiva?.idade_anos ?? 4}
                size={220}
                animated
              />
              <div style={{ fontSize: '.72rem', color: '#8a9ab8', marginTop: 8 }}>
                Última avaliação: {new Date(snapshotAtual.criado_em).toLocaleDateString('pt-BR')}
              </div>
            </div>

            {/* Histórico de snapshots */}
            {snapshots.length > 1 && (
              <div>
                <div style={{ fontSize: '.72rem', fontWeight: 700, color: '#8a9ab8', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 12 }}>
                  Histórico
                </div>
                <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
                  {snapshots.map((snap, i) => {
                    const media = Math.round(
                      (snap.score_comunicacao + snap.score_social + snap.score_atencao +
                       snap.score_regulacao + snap.score_brincadeira + snap.score_flexibilidade +
                       snap.score_autonomia + snap.score_motivacao) / 8
                    )
                    const anterior = snapshots[i + 1]
                    const mediaAnterior = anterior ? Math.round(
                      (anterior.score_comunicacao + anterior.score_social + anterior.score_atencao +
                       anterior.score_regulacao + anterior.score_brincadeira + anterior.score_flexibilidade +
                       anterior.score_autonomia + anterior.score_motivacao) / 8
                    ) : null
                    const delta = mediaAnterior !== null ? media - mediaAnterior : null
                    return (
                      <div key={snap.id} style={{
                        minWidth: 90, padding: '12px 14px',
                        background: i === 0 ? 'linear-gradient(135deg,rgba(43,191,164,.15),rgba(43,191,164,.05))' : 'rgba(0,0,0,.03)',
                        borderRadius: 14,
                        border: i === 0 ? '1px solid rgba(43,191,164,.25)' : '1px solid rgba(0,0,0,.06)',
                        textAlign: 'center',
                        flexShrink: 0,
                      }}>
                        <div style={{ fontSize: 22, fontWeight: 800, color: i === 0 ? '#2BBFA4' : '#1E3A5F', lineHeight: 1 }}>{media}</div>
                        {delta !== null && (
                          <div style={{ fontSize: 11, fontWeight: 700, color: delta >= 0 ? '#2BBFA4' : '#ef4444', marginTop: 2 }}>
                            {delta >= 0 ? '+' : ''}{delta}
                          </div>
                        )}
                        <div style={{ fontSize: 10, color: '#8a9ab8', marginTop: 4 }}>
                          {new Date(snap.criado_em).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                        </div>
                        {i === 0 && <div style={{ fontSize: 9, color: '#2BBFA4', fontWeight: 600, marginTop: 2 }}>ATUAL</div>}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* CTA nova avaliação */}
            <div style={{ marginTop: 20, textAlign: 'center' }}>
              <Link href="/care/dashboard/avaliar" style={{
                display: 'inline-block', padding: '10px 24px',
                border: '1.5px solid rgba(43,191,164,.4)',
                background: 'rgba(255,255,255,.7)',
                color: '#2BBFA4', borderRadius: 50, textDecoration: 'none',
                fontWeight: 700, fontSize: '.82rem', backdropFilter: 'blur(8px)',
              }}>
                Nova avaliação rápida
              </Link>
            </div>
          </div>
        )}
      </BlocoContainer>

      {/* ══════════════════════════════════════
          BLOCO 2 — TRIAGEM DE DESENVOLVIMENTO
      ══════════════════════════════════════ */}
      <BlocoContainer
        numero={2}
        titulo="Triagem de Desenvolvimento"
        subtitulo={triagensFeitas.length > 0
          ? `Última triagem: ${new Date(triagensFeitas[0].criado_em).toLocaleDateString('pt-BR')}`
          : 'Identifica áreas que merecem atenção'}
        aberto={blocoAberto === 2}
        onToggle={() => setBlocoAberto(blocoAberto === 2 ? 0 as any : 2)}
        cor="#8B5CF6"
        badge={triagensFeitas.length > 0 ? 'Feita' : 'Recomendada'}
        badgeCor={triagensFeitas.length > 0 ? '#2BBFA4' : '#F59E0B'}
      >
        {/* Resultado da última triagem */}
        {triagensFeitas.length > 0 && triagempasso !== 1 && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: '.72rem', fontWeight: 700, color: '#8a9ab8', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 12 }}>
              Resultado mais recente
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
              {triagensFeitas[0].resultado
                .filter(r => r.nivel !== 'baixo')
                .sort((a, b) => b.score - a.score)
                .map(r => (
                  <div key={r.area} style={{
                    padding: '10px 12px',
                    background: `${AREA_CORES[r.area]}12`,
                    border: `1px solid ${AREA_CORES[r.area]}25`,
                    borderRadius: 12,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: AREA_CORES[r.area] }}>{r.area}</span>
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 99,
                        background: r.nivel === 'alto' ? '#fef2f2' : '#fef3c7',
                        color: r.nivel === 'alto' ? '#ef4444' : '#92400e',
                      }}>
                        {r.nivel === 'alto' ? 'Atenção' : 'Observar'}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>{r.label}</div>
                    <div style={{ height: 4, background: 'rgba(0,0,0,.06)', borderRadius: 99, overflow: 'hidden', marginTop: 6 }}>
                      <div style={{ height: '100%', width: `${r.score}%`, background: AREA_CORES[r.area], borderRadius: 99 }} />
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Iniciar nova triagem */}
        {triagempasso === 0 && (
          <div style={{ textAlign: 'center', padding: triagensFeitas.length > 0 ? '0' : '16px 0' }}>
            {triagensFeitas.length === 0 && (
              <p style={{ color: '#8a9ab8', fontSize: 14, marginBottom: 20, lineHeight: 1.6 }}>
                São {totalPerguntas} perguntas sobre o desenvolvimento de {nomeFilho}.
                Leva cerca de 5 minutos e ajuda a identificar áreas que merecem atenção.
              </p>
            )}
            <button
              onClick={() => setTriagemPasso(1)}
              style={{
                padding: '12px 28px',
                background: 'linear-gradient(135deg,#8B5CF6,#7C3AED)',
                color: 'white', border: 'none', borderRadius: 50,
                fontWeight: 700, fontSize: '.85rem', cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(139,92,246,.35)',
              }}
            >
              {triagensFeitas.length > 0 ? 'Refazer triagem' : 'Iniciar triagem'}
            </button>
          </div>
        )}

        {/* Questionário */}
        {triagempasso === 1 && (
          <div>
            {/* Progresso */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#64748b', marginBottom: 6 }}>
                <span>{perguntasRespondidas} de {totalPerguntas} respondidas</span>
                <span>{progressoTriagem}%</span>
              </div>
              <div style={{ height: 6, background: 'rgba(139,92,246,.12)', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${progressoTriagem}%`, background: 'linear-gradient(90deg,#8B5CF6,#A78BFA)', borderRadius: 99, transition: 'width 0.3s' }} />
              </div>
            </div>

            {/* Perguntas agrupadas por área */}
            {['TDI', 'TC', 'TEA', 'TDAH', 'TA', 'TM', 'TT', 'Outros'].map(area => {
              const perguntas = PERGUNTAS_TRIAGEM.filter(p => p.area === area)
              return (
                <div key={area} style={{ marginBottom: 20 }}>
                  <div style={{
                    fontSize: 12, fontWeight: 700, color: AREA_CORES[area],
                    marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6,
                  }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: AREA_CORES[area], display: 'inline-block' }} />
                    {AREA_LABELS[area]}
                  </div>
                  {perguntas.map(p => (
                    <div key={p.id} style={{
                      padding: '12px 14px', marginBottom: 8,
                      background: respostasTriagem[p.id] !== undefined ? `${AREA_CORES[area]}08` : 'rgba(0,0,0,.02)',
                      border: `1px solid ${respostasTriagem[p.id] !== undefined ? AREA_CORES[area] + '25' : 'rgba(0,0,0,.06)'}`,
                      borderRadius: 12,
                    }}>
                      <p style={{ fontSize: 13, color: '#1E3A5F', marginBottom: 10, lineHeight: 1.5 }}>
                        {p.texto.replace('Seu filho', nomeFilho).replace('seu filho', nomeFilho)}
                      </p>
                      <div style={{ display: 'flex', gap: 8 }}>
                        {[
                          { valor: 0, label: 'Não' },
                          { valor: 1, label: 'Às vezes' },
                          { valor: 2, label: 'Sim' },
                        ].map(op => (
                          <button
                            key={op.valor}
                            onClick={() => setRespostasTriagem(prev => ({ ...prev, [p.id]: op.valor }))}
                            style={{
                              flex: 1, padding: '7px 0', borderRadius: 8,
                              border: `1.5px solid ${respostasTriagem[p.id] === op.valor ? AREA_CORES[area] : 'rgba(0,0,0,.1)'}`,
                              background: respostasTriagem[p.id] === op.valor ? `${AREA_CORES[area]}15` : 'white',
                              color: respostasTriagem[p.id] === op.valor ? AREA_CORES[area] : '#64748b',
                              fontSize: 12, fontWeight: respostasTriagem[p.id] === op.valor ? 700 : 400,
                              cursor: 'pointer', transition: 'all 0.15s',
                            }}
                          >
                            {op.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )
            })}

            {/* Botões de ação */}
            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <button
                onClick={() => { setTriagemPasso(0); setRespostasTriagem({}) }}
                style={{
                  flex: 1, padding: '12px', border: '1.5px solid rgba(0,0,0,.1)',
                  background: 'transparent', borderRadius: 12,
                  color: '#64748b', fontSize: 14, cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
              <button
                onClick={salvarTriagem}
                disabled={!triagempodeSalvar || salvandoTriagem}
                style={{
                  flex: 2, padding: '12px',
                  background: triagempodeSalvar
                    ? 'linear-gradient(135deg,#8B5CF6,#7C3AED)'
                    : '#e2e8f0',
                  color: triagempodeSalvar ? 'white' : '#94a3b8',
                  border: 'none', borderRadius: 12,
                  fontSize: 14, fontWeight: 700,
                  cursor: triagempodeSalvar ? 'pointer' : 'not-allowed',
                  boxShadow: triagempodeSalvar ? '0 4px 16px rgba(139,92,246,.3)' : 'none',
                }}
              >
                {salvandoTriagem ? 'Salvando...' : `Ver resultado (${perguntasRespondidas}/${totalPerguntas})`}
              </button>
            </div>
          </div>
        )}

        {/* Resultado */}
        {triagempasso === 2 && triagensFeitas.length > 0 && (
          <div>
            <div style={{ textAlign: 'center', padding: '16px 0 20px' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>✓</div>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#1E3A5F', marginBottom: 4 }}>Triagem concluída!</p>
              <p style={{ fontSize: 13, color: '#8a9ab8' }}>Resultado salvo com sucesso.</p>
            </div>
            <button
              onClick={() => setTriagemPasso(0)}
              style={{
                width: '100%', padding: '12px',
                background: 'linear-gradient(135deg,#8B5CF6,#7C3AED)',
                color: 'white', border: 'none', borderRadius: 12,
                fontSize: 14, fontWeight: 700, cursor: 'pointer',
              }}
            >
              Ver resultado
            </button>
          </div>
        )}
      </BlocoContainer>

      {/* ══════════════════════════════════════
          BLOCO 3 — LAUDOS E DIAGNÓSTICOS
      ══════════════════════════════════════ */}
      <BlocoContainer
        numero={3}
        titulo="Laudos e Diagnósticos"
        subtitulo={laudos.length > 0
          ? `${laudos.length} laudo${laudos.length > 1 ? 's' : ''} cadastrado${laudos.length > 1 ? 's' : ''}`
          : 'Opcional — enriquece o perfil'}
        aberto={blocoAberto === 3}
        onToggle={() => setBlocoAberto(blocoAberto === 3 ? 0 as any : 3)}
        cor="#2A7BA8"
      >
        {/* Lista de laudos */}
        {laudos.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            {laudos.map(l => (
              <div key={l.id} style={{
                padding: '14px 16px', marginBottom: 8,
                background: 'rgba(42,123,168,.06)',
                border: '1px solid rgba(42,123,168,.15)',
                borderRadius: 14,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                  <div>
                    {l.cid && (
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: '2px 8px',
                        background: 'rgba(42,123,168,.12)', color: '#2A7BA8',
                        borderRadius: 99, marginRight: 8,
                      }}>
                        {l.cid}
                      </span>
                    )}
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#1E3A5F' }}>
                      {l.diagnostico ?? 'Sem diagnóstico especificado'}
                    </span>
                  </div>
                  <span style={{ fontSize: 11, color: '#8a9ab8' }}>
                    {l.data_laudo ? new Date(l.data_laudo).toLocaleDateString('pt-BR') : '—'}
                  </span>
                </div>
                {l.especialidades?.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 4 }}>
                    {l.especialidades.map(e => (
                      <span key={e} style={{
                        fontSize: 10, padding: '2px 7px',
                        background: 'rgba(43,191,164,.1)', color: '#2BBFA4',
                        borderRadius: 99, fontWeight: 600,
                      }}>{e}</span>
                    ))}
                  </div>
                )}
                {l.horas_tratamento_semana && (
                  <div style={{ fontSize: 12, color: '#64748b' }}>
                    {l.horas_tratamento_semana}h/semana de tratamento recomendadas
                  </div>
                )}
                {l.profissional_emissor && (
                  <div style={{ fontSize: 11, color: '#8a9ab8', marginTop: 2 }}>
                    Por: {l.profissional_emissor}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Formulário de novo laudo */}
        {mostrarFormLaudo ? (
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#1E3A5F', marginBottom: 14 }}>Novo laudo / diagnóstico</div>
            {[
              { key: 'cid', label: 'CID (código)', placeholder: 'ex: F84.0' },
              { key: 'diagnostico', label: 'Diagnóstico', placeholder: 'ex: Transtorno do Espectro Autista' },
              { key: 'especialidades', label: 'Especialidades recomendadas', placeholder: 'ex: Fonoaudiologia, Terapia Ocupacional' },
              { key: 'horas_tratamento_semana', label: 'Horas de tratamento por semana', placeholder: 'ex: 10' },
              { key: 'profissional_emissor', label: 'Profissional emissor', placeholder: 'ex: Dr. João Silva — Neuropediatra' },
              { key: 'data_laudo', label: 'Data do laudo', placeholder: '', type: 'date' },
              { key: 'notas', label: 'Notas adicionais', placeholder: 'Observações relevantes...', textarea: true },
            ].map(campo => (
              <div key={campo.key} style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4 }}>
                  {campo.label}
                </label>
                {campo.textarea ? (
                  <textarea
                    value={formLaudo[campo.key as keyof typeof formLaudo]}
                    onChange={e => setFormLaudo(prev => ({ ...prev, [campo.key]: e.target.value }))}
                    placeholder={campo.placeholder}
                    rows={3}
                    style={{
                      width: '100%', padding: '10px 12px', borderRadius: 10,
                      border: '1.5px solid rgba(0,0,0,.1)', fontSize: 13,
                      fontFamily: 'var(--font-sans)', resize: 'vertical', boxSizing: 'border-box',
                      background: 'rgba(255,255,255,.8)',
                    }}
                  />
                ) : (
                  <input
                    type={campo.type ?? 'text'}
                    value={formLaudo[campo.key as keyof typeof formLaudo]}
                    onChange={e => setFormLaudo(prev => ({ ...prev, [campo.key]: e.target.value }))}
                    placeholder={campo.placeholder}
                    style={{
                      width: '100%', padding: '10px 12px', borderRadius: 10,
                      border: '1.5px solid rgba(0,0,0,.1)', fontSize: 13,
                      fontFamily: 'var(--font-sans)', boxSizing: 'border-box',
                      background: 'rgba(255,255,255,.8)',
                    }}
                  />
                )}
              </div>
            ))}

            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button
                onClick={() => setMostrarFormLaudo(false)}
                style={{
                  flex: 1, padding: '11px', border: '1.5px solid rgba(0,0,0,.1)',
                  background: 'transparent', borderRadius: 12,
                  color: '#64748b', fontSize: 14, cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
              <button
                onClick={salvarLaudo}
                disabled={salvandoLaudo}
                style={{
                  flex: 2, padding: '11px',
                  background: 'linear-gradient(135deg,#2A7BA8,#1a5a8a)',
                  color: 'white', border: 'none', borderRadius: 12,
                  fontSize: 14, fontWeight: 700, cursor: 'pointer',
                  boxShadow: '0 4px 16px rgba(42,123,168,.3)',
                }}
              >
                {salvandoLaudo ? 'Salvando...' : 'Salvar laudo'}
              </button>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: laudos.length > 0 ? '0' : '16px 0' }}>
            {laudos.length === 0 && (
              <p style={{ color: '#8a9ab8', fontSize: 13, marginBottom: 16, lineHeight: 1.6 }}>
                Cadastre laudos médicos, diagnósticos e especialidades recomendadas.
                Isso enriquece o perfil de {nomeFilho} e permite atividades mais específicas.
              </p>
            )}
            {laudoSalvo && (
              <div style={{ fontSize: 13, color: '#2BBFA4', fontWeight: 600, marginBottom: 12 }}>
                ✓ Laudo salvo com sucesso!
              </div>
            )}
            <button
              onClick={() => setMostrarFormLaudo(true)}
              style={{
                padding: '11px 24px',
                border: '1.5px solid rgba(42,123,168,.4)',
                background: 'rgba(255,255,255,.7)',
                color: '#2A7BA8', borderRadius: 50,
                fontWeight: 700, fontSize: '.82rem', cursor: 'pointer',
                backdropFilter: 'blur(8px)',
              }}
            >
              + Adicionar laudo
            </button>
          </div>
        )}
      </BlocoContainer>

      {/* ══════════════════════════════════════
          BLOCO 4 — DO TERAPEUTA
      ══════════════════════════════════════ */}
      <BlocoContainer
        numero={4}
        titulo="Do Terapeuta"
        subtitulo="Avaliações enviadas pelo seu terapeuta"
        aberto={blocoAberto === 4}
        onToggle={() => setBlocoAberto(blocoAberto === 4 ? 0 as any : 4)}
        cor="#F59E0B"
        badge="Em breve"
        badgeCor="#94a3b8"
      >
        <div style={{ textAlign: 'center', padding: '24px 0' }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: 'rgba(245,158,11,.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <p style={{ fontSize: 14, fontWeight: 600, color: '#1E3A5F', marginBottom: 6 }}>
            Conecte-se com um terapeuta
          </p>
          <p style={{ fontSize: 13, color: '#8a9ab8', lineHeight: 1.6, maxWidth: 320, margin: '0 auto 20px' }}>
            Quando você tiver um terapeuta vinculado pelo FractaClinic,
            as avaliações e anamneses dele aparecerão aqui para você responder.
          </p>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '8px 16px', borderRadius: 99,
            background: 'rgba(245,158,11,.1)',
            fontSize: 12, color: '#92400e', fontWeight: 600,
          }}>
            Disponível em breve no FractaClinic
          </div>
        </div>
      </BlocoContainer>

    </div>
  )
}

// ─────────────────────────────────────────────
// COMPONENTE: BlocoContainer (acordeão)
// ─────────────────────────────────────────────

function BlocoContainer({
  numero,
  titulo,
  subtitulo,
  aberto,
  onToggle,
  cor,
  badge,
  badgeCor,
  children,
}: {
  numero: number
  titulo: string
  subtitulo: string
  aberto: boolean
  onToggle: () => void
  cor: string
  badge?: string
  badgeCor?: string
  children: React.ReactNode
}) {
  return (
    <div style={{
      background: 'rgba(255,255,255,.84)',
      backdropFilter: 'blur(14px)',
      borderRadius: 22,
      border: `1px solid ${aberto ? cor + '30' : 'rgba(43,191,164,.12)'}`,
      boxShadow: aberto ? `0 4px 28px ${cor}12` : '0 2px 8px rgba(0,0,0,.04)',
      overflow: 'hidden',
      marginBottom: 12,
      transition: 'all 0.2s',
    }}>
      {/* Header clicável */}
      <button
        onClick={onToggle}
        style={{
          width: '100%', padding: '18px 20px',
          display: 'flex', alignItems: 'center', gap: 14,
          background: 'none', border: 'none', cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        {/* Número */}
        <div style={{
          width: 36, height: 36, borderRadius: 10, flexShrink: 0,
          background: aberto ? `linear-gradient(135deg,${cor},${cor}cc)` : 'rgba(0,0,0,.06)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, fontWeight: 800,
          color: aberto ? 'white' : '#94a3b8',
          transition: 'all 0.2s',
        }}>
          {numero}
        </div>

        {/* Textos */}
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
            <span style={{ fontSize: '.88rem', fontWeight: 800, color: '#1E3A5F' }}>{titulo}</span>
            {badge && (
              <span style={{
                fontSize: 10, fontWeight: 700, padding: '2px 7px',
                borderRadius: 99,
                background: `${badgeCor}18`,
                color: badgeCor,
              }}>
                {badge}
              </span>
            )}
          </div>
          <div style={{ fontSize: '.72rem', color: '#8a9ab8' }}>{subtitulo}</div>
        </div>

        {/* Chevron */}
        <svg
          width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke="#94a3b8" strokeWidth="2" strokeLinecap="round"
          style={{ transform: aberto ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', flexShrink: 0 }}
        >
          <path d="M6 9l6 6 6-6"/>
        </svg>
      </button>

      {/* Conteúdo */}
      {aberto && (
        <div style={{ padding: '0 20px 20px', borderTop: `1px solid ${cor}15` }}>
          <div style={{ paddingTop: 18 }}>
            {children}
          </div>
        </div>
      )}
    </div>
  )
}
