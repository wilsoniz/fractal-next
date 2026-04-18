'use client'

/**
 * FractaRadarChart
 * src/components/fracta/FractaRadarChart.tsx
 *
 * Radar SVG com duas camadas:
 *   - Camada 1: score atual da criança (teal preenchido)
 *   - Camada 2: média esperada para a idade (âmbar tracejado)
 *
 * Reusável em: dashboard Home, aba Avaliação, aba Meu Filho, FractaClinic
 */

import { useEffect, useRef, useState } from 'react'

// ─────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────

export type DominioKey =
  | 'comunicacao'
  | 'social'
  | 'atencao'
  | 'regulacao'
  | 'brincadeira'
  | 'flexibilidade'
  | 'autonomia'
  | 'motivacao'

export type ScoresRadar = Record<DominioKey, number>

export type FractaRadarChartProps = {
  scores: ScoresRadar
  idadeAnos?: number
  size?: number           // tamanho em px (default 280)
  showLegend?: boolean    // mostrar legenda (default true)
  showLabels?: boolean    // mostrar labels dos domínios (default true)
  showExpected?: boolean  // mostrar camada esperada (default true)
  animated?: boolean      // animar entrada (default true)
  onDominioClick?: (dominio: DominioKey) => void
}

// ─────────────────────────────────────────────
// CONFIGURAÇÃO DOS DOMÍNIOS
// ─────────────────────────────────────────────

const DOMINIOS: {
  key: DominioKey
  nome: string
  anguloGraus: number  // 0° = topo, sentido horário
  corScore: string
}[] = [
  { key: 'comunicacao',   nome: 'Comunicação',  anguloGraus: 0,    corScore: '#2BBFA4' },
  { key: 'social',        nome: 'Social',        anguloGraus: 45,   corScore: '#4FC3D8' },
  { key: 'atencao',       nome: 'Atenção',       anguloGraus: 90,   corScore: '#7AE040' },
  { key: 'regulacao',     nome: 'Regulação',     anguloGraus: 135,  corScore: '#2A7BA8' },
  { key: 'brincadeira',   nome: 'Brincadeira',   anguloGraus: 180,  corScore: '#A78BFA' },
  { key: 'flexibilidade', nome: 'Flexibilidade', anguloGraus: 225,  corScore: '#F59E0B' },
  { key: 'autonomia',     nome: 'Autonomia',     anguloGraus: 270,  corScore: '#34D399' },
  { key: 'motivacao',     nome: 'Motivação',     anguloGraus: 315,  corScore: '#F87171' },
]

// ─────────────────────────────────────────────
// MÉDIAS ESPERADAS POR FAIXA ETÁRIA
// Baseadas em marcos do desenvolvimento (VB-MAPP + literatura ABA)
// Auditáveis e ajustáveis por feedback clínico
// ─────────────────────────────────────────────

type FaixaEtaria = {
  minAnos: number
  maxAnos: number
  scores: ScoresRadar
}

const ESPERADO_POR_IDADE: FaixaEtaria[] = [
  {
    minAnos: 0, maxAnos: 1,
    scores: { comunicacao: 40, social: 45, atencao: 30, regulacao: 25, brincadeira: 35, flexibilidade: 25, autonomia: 20, motivacao: 55 },
  },
  {
    minAnos: 2, maxAnos: 2,
    scores: { comunicacao: 55, social: 58, atencao: 42, regulacao: 38, brincadeira: 52, flexibilidade: 38, autonomia: 35, motivacao: 65 },
  },
  {
    minAnos: 3, maxAnos: 4,
    scores: { comunicacao: 68, social: 65, atencao: 55, regulacao: 52, brincadeira: 68, flexibilidade: 55, autonomia: 52, motivacao: 70 },
  },
  {
    minAnos: 5, maxAnos: 6,
    scores: { comunicacao: 75, social: 72, atencao: 65, regulacao: 62, brincadeira: 72, flexibilidade: 65, autonomia: 65, motivacao: 75 },
  },
  {
    minAnos: 7, maxAnos: 9,
    scores: { comunicacao: 80, social: 78, atencao: 72, regulacao: 70, brincadeira: 75, flexibilidade: 72, autonomia: 75, motivacao: 78 },
  },
  {
    minAnos: 10, maxAnos: 18,
    scores: { comunicacao: 85, social: 82, atencao: 80, regulacao: 78, brincadeira: 72, flexibilidade: 78, autonomia: 85, motivacao: 80 },
  },
]

function getEsperadoPorIdade(idadeAnos: number): ScoresRadar {
  const faixa = ESPERADO_POR_IDADE.find(
    (f) => idadeAnos >= f.minAnos && idadeAnos <= f.maxAnos
  )
  return faixa?.scores ?? ESPERADO_POR_IDADE[2].scores // fallback: 3–4 anos
}

// ─────────────────────────────────────────────
// HELPERS GEOMÉTRICOS
// ─────────────────────────────────────────────

function polarParaCartesiano(
  cx: number,
  cy: number,
  raio: number,
  anguloGraus: number
): { x: number; y: number } {
  // 0° = topo, sentido horário → ângulo SVG = anguloGraus - 90
  const rad = ((anguloGraus - 90) * Math.PI) / 180
  return {
    x: cx + raio * Math.cos(rad),
    y: cy + raio * Math.sin(rad),
  }
}

function scoresToPolygon(
  scores: ScoresRadar,
  cx: number,
  cy: number,
  raioMax: number
): string {
  return DOMINIOS.map((d) => {
    const score = Math.max(0, Math.min(100, scores[d.key] ?? 0))
    const raio = (score / 100) * raioMax
    const { x, y } = polarParaCartesiano(cx, cy, raio, d.anguloGraus)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
}

// ─────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────

export default function FractaRadarChart({
  scores,
  idadeAnos = 4,
  size = 280,
  showLegend = true,
  showLabels = true,
  showExpected = true,
  animated = true,
  onDominioClick,
}: FractaRadarChartProps) {
  const [progresso, setProgresso] = useState(animated ? 0 : 1)
  const animRef = useRef<number | null>(null)
  const startRef = useRef<number | null>(null)
  const duracao = 900 // ms

  useEffect(() => {
    if (!animated) { setProgresso(1); return }

    setProgresso(0)
    const animar = (ts: number) => {
      if (!startRef.current) startRef.current = ts
      const elapsed = ts - startRef.current
      const p = Math.min(elapsed / duracao, 1)
      // easeOutCubic
      const eased = 1 - Math.pow(1 - p, 3)
      setProgresso(eased)
      if (p < 1) animRef.current = requestAnimationFrame(animar)
    }
    animRef.current = requestAnimationFrame(animar)
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current) }
  }, [scores, animated])

  const esperado = getEsperadoPorIdade(idadeAnos)

  // Dimensões SVG
  const padding = 52  // espaço para labels
  const viewSize = size + padding * 2
  const cx = viewSize / 2
  const cy = viewSize / 2
  const raioMax = size / 2

  // Scores animados (escala de 0 → real)
  const scoresAnimados: ScoresRadar = {} as ScoresRadar
  for (const d of DOMINIOS) {
    scoresAnimados[d.key] = (scores[d.key] ?? 0) * progresso
  }

  const polygonAtual = scoresToPolygon(scoresAnimados, cx, cy, raioMax)
  const polygonEsperado = scoresToPolygon(esperado, cx, cy, raioMax)

  // Grid rings (5 níveis: 20, 40, 60, 80, 100)
  const rings = [20, 40, 60, 80, 100]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      <svg
        width={viewSize}
        height={viewSize}
        viewBox={`0 0 ${viewSize} ${viewSize}`}
        style={{ overflow: 'visible', maxWidth: '100%' }}
        aria-label="Radar de habilidades"
      >
        {/* ── Grid rings */}
        {rings.map((r) => {
          const raio = (r / 100) * raioMax
          // Polígono octogonal para o grid
          const pontos = DOMINIOS.map((d) => {
            const { x, y } = polarParaCartesiano(cx, cy, raio, d.anguloGraus)
            return `${x.toFixed(1)},${y.toFixed(1)}`
          }).join(' ')
          return (
            <polygon
              key={r}
              points={pontos}
              fill="none"
              stroke="rgba(43,191,164,0.12)"
              strokeWidth={0.5}
            />
          )
        })}

        {/* ── Eixos */}
        {DOMINIOS.map((d) => {
          const { x, y } = polarParaCartesiano(cx, cy, raioMax, d.anguloGraus)
          return (
            <line
              key={d.key}
              x1={cx}
              y1={cy}
              x2={x}
              y2={y}
              stroke="rgba(43,191,164,0.15)"
              strokeWidth={0.5}
            />
          )
        })}

        {/* ── Camada esperada (âmbar tracejado) */}
        {showExpected && (
          <polygon
            points={polygonEsperado}
            fill="rgba(245,158,11,0.05)"
            stroke="#F59E0B"
            strokeWidth={1.5}
            strokeDasharray="5 3"
            opacity={0.8}
          />
        )}

        {/* ── Camada atual (teal preenchido) */}
        <polygon
          points={polygonAtual}
          fill="rgba(43,191,164,0.18)"
          stroke="#2BBFA4"
          strokeWidth={2}
          opacity={progresso}
        />

        {/* ── Pontos nos vértices do score atual */}
        {DOMINIOS.map((d) => {
          const score = (scores[d.key] ?? 0) * progresso
          const raio = (score / 100) * raioMax
          const { x, y } = polarParaCartesiano(cx, cy, raio, d.anguloGraus)
          const esperadoScore = esperado[d.key]
          const abaixoDoEsperado = (scores[d.key] ?? 0) < esperadoScore - 10
          return (
            <circle
              key={d.key}
              cx={x}
              cy={y}
              r={4}
              fill={abaixoDoEsperado ? '#F59E0B' : '#2BBFA4'}
              stroke="white"
              strokeWidth={1.5}
              style={{ cursor: onDominioClick ? 'pointer' : 'default' }}
              onClick={() => onDominioClick?.(d.key)}
            />
          )
        })}

        {/* ── Labels dos domínios */}
        {showLabels && DOMINIOS.map((d) => {
          const offset = raioMax + 18
          const { x, y } = polarParaCartesiano(cx, cy, offset, d.anguloGraus)
          const scoreAtual = scores[d.key] ?? 0
          const scoreEsp = esperado[d.key]
          const abaixo = scoreAtual < scoreEsp - 10
          const acima = scoreAtual >= scoreEsp

          // Alinhamento baseado na posição
          let anchor: 'middle' | 'start' | 'end' = 'middle'
          const ang = ((d.anguloGraus % 360) + 360) % 360
          if (ang > 30 && ang < 150) anchor = 'start'
          else if (ang > 210 && ang < 330) anchor = 'end'

          return (
            <g
              key={d.key}
              style={{ cursor: onDominioClick ? 'pointer' : 'default' }}
              onClick={() => onDominioClick?.(d.key)}
            >
              <text
                x={x}
                y={y - 4}
                textAnchor={anchor}
                dominantBaseline="central"
                style={{
                  fontFamily: 'var(--font-sans, Inter, sans-serif)',
                  fontSize: 11,
                  fontWeight: 600,
                  fill: abaixo ? '#F59E0B' : 'currentColor',
                  opacity: 0.85,
                }}
              >
                {d.nome}
              </text>
              <text
                x={x}
                y={y + 10}
                textAnchor={anchor}
                dominantBaseline="central"
                style={{
                  fontFamily: 'var(--font-sans, Inter, sans-serif)',
                  fontSize: 10,
                  fill: acima ? '#2BBFA4' : abaixo ? '#F59E0B' : '#94a3b8',
                }}
              >
                {Math.round(scoreAtual)}
                {acima && ' ✓'}
              </text>
            </g>
          )
        })}

        {/* ── Score geral no centro */}
        <text
          x={cx}
          y={cy - 8}
          textAnchor="middle"
          dominantBaseline="central"
          style={{
            fontFamily: 'var(--font-sans, Inter, sans-serif)',
            fontSize: 18,
            fontWeight: 700,
            fill: '#2BBFA4',
          }}
        >
          {Math.round(
            Object.values(scores).reduce((a, b) => a + b, 0) / DOMINIOS.length
          )}
        </text>
        <text
          x={cx}
          y={cy + 10}
          textAnchor="middle"
          dominantBaseline="central"
          style={{
            fontFamily: 'var(--font-sans, Inter, sans-serif)',
            fontSize: 9,
            fill: '#94a3b8',
            letterSpacing: '0.05em',
          }}
        >
          GERAL
        </text>
      </svg>

      {/* ── Legenda */}
      {showLegend && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 20,
          fontSize: 11,
          color: '#64748b',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{
              width: 28,
              height: 3,
              background: '#2BBFA4',
              borderRadius: 2,
            }} />
            <span>Score atual</span>
          </div>
          {showExpected && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <svg width="28" height="3" style={{ overflow: 'visible' }}>
                <line
                  x1="0" y1="1.5" x2="28" y2="1.5"
                  stroke="#F59E0B"
                  strokeWidth="1.5"
                  strokeDasharray="5 3"
                />
              </svg>
              <span>Esperado para {idadeAnos} ano{idadeAnos !== 1 ? 's' : ''}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
