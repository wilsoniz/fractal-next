'use client'
import { useState } from 'react'
import { useCareContext } from '../layout'

// ── DADOS ────────────────────────────────────────────────────────────────────

type Aula = {
  id: string
  titulo: string
  duracao: string
  concluida: boolean
}

type Trilha = {
  id: string
  dominio: string
  titulo: string
  desc: string
  cor: string
  icon: string
  total: number
  concluidas: number
  recomendada: boolean
  aulas: Aula[]
}

const TRILHAS: Trilha[] = [
  {
    id: 'comunicacao',
    dominio: 'Comunicação',
    titulo: 'Como fortalecer a comunicação no dia a dia',
    desc: 'Aprenda a criar oportunidades naturais para seu filho se comunicar — de pedidos simples até conversas.',
    cor: '#2BBFA4',
    icon: '💬',
    total: 5,
    concluidas: 2,
    recomendada: true,
    aulas: [
      { id: 'c1', titulo: 'O que é comunicação funcional', duracao: '4 min', concluida: true },
      { id: 'c2', titulo: 'Como criar oportunidades de pedido', duracao: '5 min', concluida: true },
      { id: 'c3', titulo: 'Entendendo o Mando na prática', duracao: '4 min', concluida: false },
      { id: 'c4', titulo: 'Quando ajudar e quando esperar', duracao: '3 min', concluida: false },
      { id: 'c5', titulo: 'Registrando comunicações em casa', duracao: '3 min', concluida: false },
    ],
  },
  {
    id: 'regulacao',
    dominio: 'Regulação',
    titulo: 'Lidando com momentos difíceis com mais leveza',
    desc: 'Estratégias práticas para birras, frustrações e transições — sem punição e com base científica.',
    cor: '#2A7BA8',
    icon: '💙',
    total: 4,
    concluidas: 0,
    recomendada: false,
    aulas: [
      { id: 'r1', titulo: 'Por que seu filho tem dificuldade de aceitar "não"', duracao: '5 min', concluida: false },
      { id: 'r2', titulo: 'Antecipando situações difíceis', duracao: '4 min', concluida: false },
      { id: 'r3', titulo: 'Como lidar com birras na prática', duracao: '5 min', concluida: false },
      { id: 'r4', titulo: 'Transições mais tranquilas', duracao: '3 min', concluida: false },
    ],
  },
  {
    id: 'atencao',
    dominio: 'Atenção',
    titulo: 'Desenvolvendo foco e persistência',
    desc: 'Como aumentar gradualmente o tempo de atenção do seu filho em atividades do dia a dia.',
    cor: '#7AE040',
    icon: '🎯',
    total: 4,
    concluidas: 0,
    recomendada: false,
    aulas: [
      { id: 'a1', titulo: 'O que é atenção sustentada', duracao: '3 min', concluida: false },
      { id: 'a2', titulo: 'Atividades que desenvolvem foco naturalmente', duracao: '5 min', concluida: false },
      { id: 'a3', titulo: 'Reforçando a persistência', duracao: '4 min', concluida: false },
      { id: 'a4', titulo: 'Reduzindo dependência de telas', duracao: '4 min', concluida: false },
    ],
  },
  {
    id: 'social',
    dominio: 'Social',
    titulo: 'Brincadeira e interação com outras crianças',
    desc: 'Entenda as etapas do desenvolvimento social e como criar contextos para seu filho se relacionar.',
    cor: '#4FC3D8',
    icon: '🤝',
    total: 4,
    concluidas: 0,
    recomendada: false,
    aulas: [
      { id: 's1', titulo: 'Etapas do desenvolvimento social', duracao: '4 min', concluida: false },
      { id: 's2', titulo: 'Como facilitar a brincadeira', duracao: '5 min', concluida: false },
      { id: 's3', titulo: 'Situações sociais desafiadoras', duracao: '4 min', concluida: false },
      { id: 's4', titulo: 'Ampliando o círculo social', duracao: '3 min', concluida: false },
    ],
  },
  {
    id: 'autonomia',
    dominio: 'Autonomia',
    titulo: 'Criando hábitos de independência',
    desc: 'Rotinas, autocuidado e pequenas responsabilidades que desenvolvem autonomia com segurança.',
    cor: '#EF9F27',
    icon: '⭐',
    total: 3,
    concluidas: 0,
    recomendada: false,
    aulas: [
      { id: 'au1', titulo: 'A importância da rotina previsível', duracao: '4 min', concluida: false },
      { id: 'au2', titulo: 'Ensino por etapas no dia a dia', duracao: '5 min', concluida: false },
      { id: 'au3', titulo: 'Quando ajudar e quando deixar tentar', duracao: '3 min', concluida: false },
    ],
  },
]

// ── COMPONENTE ────────────────────────────────────────────────────────────────

export default function AprendizadoPage() {
  const { criancaAtiva } = useCareContext()
  const [trilhaAberta, setTrilhaAberta] = useState<string | null>(null)
  const [aulaAberta, setAulaAberta] = useState<string | null>(null)

  const totalAulas = TRILHAS.reduce((a, t) => a + t.total, 0)
  const totalConcluidas = TRILHAS.reduce((a, t) => a + t.concluidas, 0)
  const pct = Math.round((totalConcluidas / totalAulas) * 100)

  const trilha = TRILHAS.find(t => t.id === trilhaAberta)
  const aula = trilha?.aulas.find(a => a.id === aulaAberta)

  // ── Tela de aula ──
  if (aula && trilha) {
    return (
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '0 16px 40px', boxSizing: 'border-box' as const, width: '100%' }}>
        <button onClick={() => setAulaAberta(null)} style={{
          display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none',
          cursor: 'pointer', color: '#2BBFA4', fontWeight: 600, fontSize: '.82rem',
          fontFamily: 'var(--font-sans)', marginBottom: 20, padding: 0,
        }}>← Voltar para a trilha</button>

        <div style={{ background: `${trilha.cor}12`, border: `1px solid ${trilha.cor}30`, borderRadius: 16, padding: '20px', marginBottom: 20 }}>
          <div style={{ fontSize: '.65rem', fontWeight: 700, color: trilha.cor, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 6 }}>{trilha.dominio}</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1E3A5F' }}>{aula.titulo}</div>
          <div style={{ fontSize: '.78rem', color: '#8a9ab8', marginTop: 4 }}>{aula.duracao} de leitura</div>
        </div>

        {/* Conteúdo mock da aula */}
        <div style={{ background: 'white', border: '1px solid rgba(43,191,164,.12)', borderRadius: 20, padding: '24px 20px' }}>
          <p style={{ fontSize: '.9rem', color: '#3a5a7a', lineHeight: 1.8, marginBottom: 16 }}>
            Esta aula faz parte da trilha <strong style={{ color: trilha.cor }}>{trilha.dominio}</strong>. O conteúdo foi desenvolvido com base nos princípios da Análise do Comportamento Aplicada, traduzido para a linguagem do dia a dia dos pais.
          </p>
          <p style={{ fontSize: '.9rem', color: '#3a5a7a', lineHeight: 1.8, marginBottom: 16 }}>
            Entender como funciona o comportamento do seu filho é o primeiro passo para criar contextos que favoreçam o desenvolvimento. Não se trata de técnica difícil — mas de pequenos ajustes na rotina que fazem grande diferença ao longo do tempo.
          </p>
          <div style={{ background: 'rgba(43,191,164,.06)', border: '1px solid rgba(43,191,164,.15)', borderRadius: 12, padding: '16px', marginBottom: 16 }}>
            <div style={{ fontSize: '.75rem', fontWeight: 700, color: '#2BBFA4', marginBottom: 8 }}>💡 Dica prática</div>
            <p style={{ fontSize: '.85rem', color: '#3a5a7a', lineHeight: 1.7, margin: 0 }}>
              Tente aplicar o que aprendeu hoje em um momento específico da rotina — hora do banho, refeição ou brincadeira. Consistência em pequenos momentos é mais eficaz do que grandes intervenções ocasionais.
            </p>
          </div>
          <p style={{ fontSize: '.9rem', color: '#3a5a7a', lineHeight: 1.8 }}>
            Nas próximas aulas desta trilha, você vai aprender estratégias específicas e como registrar o progresso do seu filho em casa.
          </p>
        </div>

        <button onClick={() => {
          setAulaAberta(null)
        }} style={{
          width: '100%', marginTop: 16, padding: '13px', borderRadius: 12, border: 'none',
          background: `linear-gradient(135deg,${trilha.cor},${trilha.cor}cc)`,
          color: 'white', fontWeight: 800, fontSize: '.9rem',
          cursor: 'pointer', fontFamily: 'var(--font-sans)',
        }}>✓ Marcar como concluída</button>
      </div>
    )
  }

  // ── Tela de trilha ──
  if (trilha) {
    const progPct = Math.round((trilha.concluidas / trilha.total) * 100)
    return (
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '0 16px 40px', boxSizing: 'border-box' as const, width: '100%' }}>
        <button onClick={() => setTrilhaAberta(null)} style={{
          display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none',
          cursor: 'pointer', color: '#2BBFA4', fontWeight: 600, fontSize: '.82rem',
          fontFamily: 'var(--font-sans)', marginBottom: 20, padding: 0,
        }}>← Todas as trilhas</button>

        <div style={{ background: `${trilha.cor}10`, border: `1px solid ${trilha.cor}25`, borderRadius: 20, padding: '24px 20px', marginBottom: 20 }}>
          <div style={{ fontSize: '2rem', marginBottom: 10 }}>{trilha.icon}</div>
          {trilha.recomendada && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: `${trilha.cor}15`, border: `1px solid ${trilha.cor}30`, borderRadius: 50, padding: '3px 10px', marginBottom: 10, fontSize: '.65rem', fontWeight: 700, color: trilha.cor, textTransform: 'uppercase', letterSpacing: '.08em' }}>
              ★ Recomendada para {criancaAtiva?.nome.split(' ')[0] ?? 'seu filho'}
            </div>
          )}
          <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1E3A5F', marginBottom: 8 }}>{trilha.titulo}</div>
          <p style={{ fontSize: '.85rem', color: '#5a7a9a', lineHeight: 1.7, marginBottom: 16 }}>{trilha.desc}</p>

          {/* Progresso */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: '.75rem', color: '#8a9ab8' }}>
            <span>{trilha.concluidas} de {trilha.total} aulas concluídas</span>
            <span style={{ color: trilha.cor, fontWeight: 700 }}>{progPct}%</span>
          </div>
          <div style={{ height: 6, background: 'rgba(0,0,0,.06)', borderRadius: 99 }}>
            <div style={{ height: '100%', width: `${progPct}%`, background: trilha.cor, borderRadius: 99, transition: 'width .5s' }} />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {trilha.aulas.map((a, i) => (
            <button key={a.id} onClick={() => setAulaAberta(a.id)} style={{
              display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px',
              background: 'white', border: `1px solid ${a.concluida ? trilha.cor + '30' : 'rgba(0,0,0,.06)'}`,
              borderRadius: 14, cursor: 'pointer', textAlign: 'left',
              fontFamily: 'var(--font-sans)', transition: 'all .15s',
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                background: a.concluida ? trilha.cor : 'rgba(0,0,0,.05)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '.8rem', fontWeight: 800,
                color: a.concluida ? 'white' : '#8a9ab8',
              }}>{a.concluida ? '✓' : i + 1}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '.88rem', fontWeight: 600, color: '#1E3A5F', marginBottom: 2 }}>{a.titulo}</div>
                <div style={{ fontSize: '.72rem', color: '#8a9ab8' }}>{a.duracao}</div>
              </div>
              <span style={{ color: '#aabbcc', fontSize: '1rem' }}>›</span>
            </button>
          ))}
        </div>
      </div>
    )
  }

  // ── Tela principal ──
  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '0 16px 40px', boxSizing: 'border-box' as const, width: '100%' }}>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1E3A5F', marginBottom: 4 }}>Aprendizado</h1>
        <p style={{ fontSize: '.85rem', color: '#8a9ab8' }}>Trilhas de orientação parental baseadas em ABA</p>
      </div>

      {/* Progresso geral */}
      <div style={{ background: 'linear-gradient(135deg,#1E3A5F,#2A7BA8)', borderRadius: 20, padding: '20px', marginBottom: 24, color: 'white', width: '100%', boxSizing: 'border-box' as const }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: '.72rem', color: 'rgba(255,255,255,.6)', marginBottom: 2 }}>Seu progresso</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>{totalConcluidas} de {totalAulas} aulas</div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#2BBFA4' }}>{pct}%</div>
        </div>
        <div style={{ height: 6, background: 'rgba(255,255,255,.15)', borderRadius: 99 }}>
          <div style={{ height: '100%', width: `${pct}%`, background: '#2BBFA4', borderRadius: 99 }} />
        </div>
        <div style={{ fontSize: '.72rem', color: 'rgba(255,255,255,.5)', marginTop: 8 }}>
          Continue aprendendo para apoiar melhor o desenvolvimento de {criancaAtiva?.nome.split(' ')[0] ?? 'seu filho'}
        </div>
      </div>

      {/* Trilha recomendada */}
      {TRILHAS.filter(t => t.recomendada).map(t => (
        <div key={t.id} style={{ marginBottom: 24 }}>
          <div style={{ fontSize: '.72rem', fontWeight: 700, color: '#2BBFA4', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 10 }}>★ Recomendada para você agora</div>
          <button onClick={() => setTrilhaAberta(t.id)} style={{
            width: '100%', background: `${t.cor}08`, border: `2px solid ${t.cor}40`,
            borderRadius: 20, padding: '20px', textAlign: 'left', cursor: 'pointer',
            fontFamily: 'var(--font-sans)', transition: 'all .15s',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
              <span style={{ fontSize: '1.6rem' }}>{t.icon}</span>
              <div>
                <div style={{ fontSize: '.65rem', fontWeight: 700, color: t.cor, textTransform: 'uppercase', letterSpacing: '.08em' }}>{t.dominio}</div>
                <div style={{ fontSize: '.92rem', fontWeight: 800, color: '#1E3A5F' }}>{t.titulo}</div>
              </div>
            </div>
            <p style={{ fontSize: '.82rem', color: '#5a7a9a', lineHeight: 1.65, marginBottom: 14 }}>{t.desc}</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '.75rem' }}>
              <span style={{ color: '#8a9ab8' }}>{t.total} aulas · {t.concluidas} concluídas</span>
              <span style={{ color: t.cor, fontWeight: 700 }}>Continuar →</span>
            </div>
            <div style={{ height: 4, background: 'rgba(0,0,0,.06)', borderRadius: 99, marginTop: 10 }}>
              <div style={{ height: '100%', width: `${Math.round((t.concluidas/t.total)*100)}%`, background: t.cor, borderRadius: 99 }} />
            </div>
          </button>
        </div>
      ))}

      {/* Todas as trilhas */}
      <div style={{ fontSize: '.72rem', fontWeight: 700, color: '#8a9ab8', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 12 }}>Todas as trilhas</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {TRILHAS.filter(t => !t.recomendada).map(t => (
          <button key={t.id} onClick={() => setTrilhaAberta(t.id)} style={{
            display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px',
            background: 'white', border: '1px solid rgba(0,0,0,.06)',
            borderRadius: 16, cursor: 'pointer', textAlign: 'left',
            fontFamily: 'var(--font-sans)', transition: 'all .15s',
          }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: `${t.cor}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0 }}>{t.icon}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '.88rem', fontWeight: 700, color: '#1E3A5F', marginBottom: 2 }}>{t.dominio}</div>
              <div style={{ fontSize: '.78rem', color: '#8a9ab8', marginBottom: 6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.titulo}</div>
              <div style={{ height: 3, background: 'rgba(0,0,0,.06)', borderRadius: 99 }}>
                <div style={{ height: '100%', width: `${Math.round((t.concluidas/t.total)*100)}%`, background: t.cor, borderRadius: 99 }} />
              </div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: '.75rem', fontWeight: 700, color: t.cor }}>{Math.round((t.concluidas/t.total)*100)}%</div>
              <div style={{ fontSize: '.68rem', color: '#aabbcc', marginTop: 2 }}>{t.total} aulas</div>
            </div>
          </button>
        ))}
      </div>

    </div>
  )
}
