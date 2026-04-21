// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE: GamificationWidget
// Cole em src/components/fracta/GamificationWidget.tsx
// Usado no dashboard home e no perfil
// ─────────────────────────────────────────────────────────────────────────────
'use client'
import { NIVEIS, calcularNivel, calcularBadges } from '@/lib/fracta/gamification'

type Props = {
  pontos: number
  streak: number
  streakMax: number
  atividades: number
  trilhasConcluidas: number
  avaliacoes: number
  compact?: boolean  // modo compacto para o dashboard home
}

export default function GamificationWidget({ pontos, streak, streakMax, atividades, trilhasConcluidas, avaliacoes, compact = false }: Props) {
  const { nivel, nivelIndex, proximoNivel, pontosProximoNivel } = calcularNivel(pontos)
  const badges = calcularBadges(atividades, streak, trilhasConcluidas, avaliacoes)
  const desbloqueados = badges.filter(b => b.desbloqueado)
  const nivelAtual = NIVEIS[nivelIndex]
  const nivelProximo = NIVEIS[nivelIndex + 1]
  const pctNivel = nivelProximo
    ? Math.min(100, Math.round(((pontos - nivelAtual.min) / (nivelProximo.min - nivelAtual.min)) * 100))
    : 100

  if (compact) {
    // ── Modo compacto — para o dashboard home ──
    return (
      <div style={{
        background: 'white',
        border: '1px solid rgba(43,191,164,.12)',
        borderRadius: 20,
        padding: '20px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: '.68rem', fontWeight: 700, color: '#8a9ab8', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 4 }}>Seu progresso</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '1.1rem' }}>{nivelAtual.icon}</span>
              <span style={{ fontSize: '1rem', fontWeight: 800, color: nivelAtual.cor }}>{nivel}</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#EF9F27' }}>🔥{streak}</div>
              <div style={{ fontSize: '.62rem', color: '#8a9ab8' }}>streak</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#2BBFA4' }}>{pontos}</div>
              <div style={{ fontSize: '.62rem', color: '#8a9ab8' }}>pontos</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#2A7BA8' }}>{desbloqueados.length}</div>
              <div style={{ fontSize: '.62rem', color: '#8a9ab8' }}>badges</div>
            </div>
          </div>
        </div>

        {/* Barra de nível */}
        {nivelProximo && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.7rem', color: '#8a9ab8', marginBottom: 6 }}>
              <span>{nivel}</span>
              <span>{pontos}/{pontosProximoNivel} pts → {proximoNivel}</span>
            </div>
            <div style={{ height: 6, background: 'rgba(0,0,0,.06)', borderRadius: 99 }}>
              <div style={{ height: '100%', width: `${pctNivel}%`, background: `linear-gradient(90deg,${nivelAtual.cor},${nivelProximo?.cor ?? nivelAtual.cor})`, borderRadius: 99, transition: 'width .5s' }} />
            </div>
          </div>
        )}

        {/* Badges desbloqueados */}
        {desbloqueados.length > 0 && (
          <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
            {desbloqueados.map(b => (
              <div key={b.id} title={b.titulo} style={{
                width: 32, height: 32, borderRadius: 10,
                background: `${b.cor}15`, border: `1px solid ${b.cor}30`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '.9rem', cursor: 'default',
              }}>{b.icon}</div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // ── Modo completo — para o perfil ──
  return (
    <div>
      {/* Header de nível */}
      <div style={{
        background: `linear-gradient(135deg,${nivelAtual.cor}15,${nivelAtual.cor}05)`,
        border: `1px solid ${nivelAtual.cor}25`,
        borderRadius: 20, padding: '20px', marginBottom: 16,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: '.68rem', fontWeight: 700, color: '#8a9ab8', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 6 }}>Nível atual</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: '1.8rem' }}>{nivelAtual.icon}</span>
              <div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: nivelAtual.cor }}>{nivel}</div>
                <div style={{ fontSize: '.75rem', color: '#8a9ab8' }}>{pontos} pontos acumulados</div>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 20 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#EF9F27' }}>🔥</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1E3A5F' }}>{streak}</div>
              <div style={{ fontSize: '.65rem', color: '#8a9ab8' }}>dias seguidos</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>📅</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1E3A5F' }}>{streakMax}</div>
              <div style={{ fontSize: '.65rem', color: '#8a9ab8' }}>recorde</div>
            </div>
          </div>
        </div>

        {nivelProximo && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.72rem', color: '#8a9ab8', marginBottom: 6 }}>
              <span>{pctNivel}% para {proximoNivel}</span>
              <span>{pontosProximoNivel - pontos} pts restantes</span>
            </div>
            <div style={{ height: 8, background: 'rgba(0,0,0,.06)', borderRadius: 99 }}>
              <div style={{ height: '100%', width: `${pctNivel}%`, background: `linear-gradient(90deg,${nivelAtual.cor},${nivelProximo.cor})`, borderRadius: 99 }} />
            </div>
          </div>
        )}
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 16 }}>
        {[
          { label: 'Atividades', val: atividades, icon: '✅', cor: '#2BBFA4' },
          { label: 'Trilhas', val: trilhasConcluidas, icon: '📚', cor: '#7AE040' },
          { label: 'Avaliações', val: avaliacoes, icon: '📊', cor: '#2A7BA8' },
        ].map(s => (
          <div key={s.label} style={{ background: 'white', border: '1px solid rgba(0,0,0,.06)', borderRadius: 14, padding: '14px 12px', textAlign: 'center' }}>
            <div style={{ fontSize: '1.2rem', marginBottom: 4 }}>{s.icon}</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: s.cor }}>{s.val}</div>
            <div style={{ fontSize: '.65rem', color: '#8a9ab8' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Badges */}
      <div style={{ background: 'white', border: '1px solid rgba(0,0,0,.06)', borderRadius: 20, padding: '20px' }}>
        <div style={{ fontSize: '.72rem', fontWeight: 700, color: '#2BBFA4', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 16 }}>
          Conquistas — {desbloqueados.length}/{badges.length}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
          {badges.map(b => (
            <div key={b.id} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
              padding: '12px 8px', borderRadius: 14,
              background: b.desbloqueado ? `${b.cor}10` : 'rgba(0,0,0,.03)',
              border: `1px solid ${b.desbloqueado ? b.cor + '30' : 'rgba(0,0,0,.06)'}`,
              opacity: b.desbloqueado ? 1 : 0.4,
            }}>
              <span style={{ fontSize: '1.4rem', filter: b.desbloqueado ? 'none' : 'grayscale(1)' }}>{b.icon}</span>
              <div style={{ fontSize: '.6rem', fontWeight: 700, color: b.desbloqueado ? '#1E3A5F' : '#8a9ab8', textAlign: 'center', lineHeight: 1.3 }}>{b.titulo}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
