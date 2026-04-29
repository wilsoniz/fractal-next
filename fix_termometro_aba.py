path = "src/app/clinic/planos/page.tsx"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

COMPONENTE = '''
// ── Termômetro ABA — 8 Dimensões ─────────────────────────────────────────────
const DIMENSOES_ABA = [
  {
    id: 'aplicada',
    label: 'Aplicada',
    desc: 'O comportamento-alvo tem relevância social e funcional para a criança.',
    check: (p: ProgramaEnsino) => !!(p.objetivoLongoPrazo?.trim() && p.areaFoco?.trim()),
  },
  {
    id: 'comportamental',
    label: 'Comportamental',
    desc: 'SD e resposta-alvo estão descritos de forma observável e mensurável.',
    check: (p: ProgramaEnsino) => !!(p.sd?.trim() && p.resposta?.trim()),
  },
  {
    id: 'analitica',
    label: 'Analítica',
    desc: 'Há baseline registrado — avaliação anterior ao programa.',
    check: (p: ProgramaEnsino) => !!(p.prereqs?.trim()),
  },
  {
    id: 'tecnologica',
    label: 'Tecnológica',
    desc: 'O procedimento está descrito com precisão suficiente para ser replicado.',
    check: (p: ProgramaEnsino) => !!(p.hierarquiaDicas?.trim() && p.criterioAvanco?.trim() && p.materiais?.trim()),
  },
  {
    id: 'conceitualmente_sistematica',
    label: 'Conceitualmente sistemática',
    desc: 'As técnicas derivam de princípios comportamentais reconhecidos.',
    check: (p: ProgramaEnsino) => !!(p.operante?.trim() && p.estrategiaEnsino?.length > 0),
  },
  {
    id: 'efetiva',
    label: 'Efetiva',
    desc: 'Há critério de maestria definido e dados de progresso registrados.',
    check: (p: ProgramaEnsino) => !!(p.criterioAvanco?.trim() && p.totalTentativas > 0),
  },
  {
    id: 'generalizavel',
    label: 'Generalizável',
    desc: 'Há previsão de generalização — local, pessoa ou estímulo.',
    check: (p: ProgramaEnsino) => !!(p.localImpl?.length > 0),
  },
  {
    id: 'compassiva',
    label: 'Compassiva',
    desc: 'O programa prioriza reforço positivo, respeito à dignidade e ao ritmo da criança.',
    check: (p: ProgramaEnsino) => !!(p.consequenciaAcerto?.trim()),
  },
]

function TermometroABA({
  programa, nivel, pacienteId,
}: {
  programa: ProgramaEnsino
  nivel: 'terapeuta' | 'coordenador' | 'supervisor'
  pacienteId: string
}) {
  const [aberto, setAberto] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)

  const resultados = DIMENSOES_ABA.map(d => ({ ...d, ok: d.check(programa) }))
  const completas = resultados.filter(d => d.ok).length
  const total = resultados.length
  const pct = Math.round((completas / total) * 100)
  const cor = pct >= 87 ? '#1D9E75' : pct >= 62 ? '#EF9F27' : '#E05A4B'
  const faltantes = resultados.filter(d => !d.ok).map(d => d.label)

  const solicitarSupervisor = async () => {
    setEnviando(true)
    try {
      const { supabase } = await import('@/lib/supabase')
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: sup } = await supabase
        .from('supervisoes')
        .select('supervisor_id')
        .eq('terapeuta_id', user.id)
        .eq('status', 'ativo')
        .single()
      if (!sup) {
        alert('Você não tem um supervisor vinculado. Acesse a aba Supervisão para vincular um.')
        return
      }
      await supabase.from('supervisor_requests').insert({
        terapeuta_id: user.id,
        supervisor_id: sup.supervisor_id,
        crianca_id: pacienteId,
        programa_nome: programa.nome,
        tipo: 'completar_dimensao',
        dimensoes_faltantes: faltantes,
        mensagem: `O programa "${programa.nome}" está com ${faltantes.length} dimensão(ões) ABA incompleta(s): ${faltantes.join(', ')}.`,
        status: 'pendente',
      })
      setEnviado(true)
    } catch (e) {
      console.error(e)
    }
    setEnviando(false)
  }

  return (
    <div style={{ marginBottom: 20 }}>
      <div
        onClick={() => setAberto(!aberto)}
        style={{
          cursor: 'pointer', background: 'rgba(0,0,0,0.2)', borderRadius: 8,
          padding: '10px 14px', border: `1px solid ${cor}33`,
          display: 'flex', alignItems: 'center', gap: 12,
        }}
      >
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 11, color: 'rgba(232,238,244,.6)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Dimensões ABA</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: cor }}>{completas}/{total}</span>
          </div>
          <div style={{ height: 5, background: 'rgba(255,255,255,0.08)', borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: cor, borderRadius: 10, transition: 'width 0.4s ease' }} />
          </div>
        </div>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ transform: aberto ? 'rotate(180deg)' : 'rotate(0)', transition: '0.2s', flexShrink: 0 }}>
          <path d="M2 4.5l5 5 5-5" stroke="rgba(232,238,244,.4)" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </div>

      {aberto && (
        <div style={{
          background: 'rgba(7,17,31,0.8)', border: '1px solid rgba(26,58,92,0.5)',
          borderRadius: 8, padding: 16, marginTop: 8,
          display: 'flex', flexDirection: 'column', gap: 8,
        }}>
          {resultados.map(d => (
            <div key={d.id} style={{
              display: 'flex', alignItems: 'flex-start', gap: 10,
              padding: '8px 10px', borderRadius: 6,
              background: d.ok ? 'rgba(29,158,117,0.06)' : 'rgba(224,90,75,0.06)',
              border: `1px solid ${d.ok ? 'rgba(29,158,117,0.15)' : 'rgba(224,90,75,0.15)'}`,
            }}>
              <div style={{
                width: 18, height: 18, borderRadius: '50%', flexShrink: 0, marginTop: 1,
                background: d.ok ? '#1D9E75' : 'rgba(224,90,75,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {d.ok
                  ? <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5L8 3" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/></svg>
                  : <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#E05A4B' }} />
                }
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 500, color: d.ok ? '#1D9E75' : '#E05A4B', marginBottom: 2 }}>{d.label}</div>
                <div style={{ fontSize: 11, color: 'rgba(232,238,244,.45)', lineHeight: 1.5 }}>{d.desc}</div>
              </div>
            </div>
          ))}

          {nivel === 'terapeuta' && faltantes.length > 0 && (
            <div style={{ marginTop: 8, paddingTop: 12, borderTop: '1px solid rgba(26,58,92,0.4)' }}>
              {enviado ? (
                <div style={{ fontSize: 12, color: '#1D9E75', textAlign: 'center', padding: '8px 0' }}>
                  Solicitação enviada ao supervisor.
                </div>
              ) : (
                <button
                  onClick={solicitarSupervisor}
                  disabled={enviando}
                  style={{
                    width: '100%', padding: '9px', borderRadius: 7,
                    border: '1px solid rgba(139,127,232,0.3)',
                    background: 'rgba(139,127,232,0.08)', color: '#8B7FE8',
                    fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
                    opacity: enviando ? 0.6 : 1,
                  }}
                >
                  {enviando ? 'Enviando...' : `Solicitar ao supervisor (${faltantes.length} dimensão${faltantes.length > 1 ? 'ões' : ''} incompleta${faltantes.length > 1 ? 's' : ''})`}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

'''

# Insere componente antes do ProgramaPanel
TARGET_COMP = "function ProgramaPanel({"
if TARGET_COMP not in content:
    print("ERRO: ProgramaPanel não encontrado.")
    exit(1)
content = content.replace(TARGET_COMP, COMPONENTE + "function ProgramaPanel({", 1)

# Insere o termômetro dentro do ProgramaPanel
TARGET_INS = "      <div style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${s.border}`, borderRadius: 10, padding: 20, marginTop: 16 }}>\n        <div style={{ marginBottom: 20 }}>\n          <SectionTitle>1 · Identificação e justificativa</SectionTitle>"
NEW_INS = "      <div style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${s.border}`, borderRadius: 10, padding: 20, marginTop: 16 }}>\n        <TermometroABA programa={programa} nivel={nivel} pacienteId={pacienteId} />\n        <div style={{ marginBottom: 20 }}>\n          <SectionTitle>1 · Identificação e justificativa</SectionTitle>"

if TARGET_INS not in content:
    print("ERRO: ponto de inserção do termômetro não encontrado.")
    exit(1)

content = content.replace(TARGET_INS, NEW_INS, 1)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("OK — Termômetro ABA inserido com sucesso.")
