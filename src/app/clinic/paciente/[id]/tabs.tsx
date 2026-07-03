'use client'
import { abrirRelatorioPDF, dadosDoSummary } from "@/lib/relatorio-pdf";
import { DocumentoPreview } from "@/components/fracta/DocumentoPreview";
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

// ─── TIPOS ────────────────────────────────────────────────────────────────────
interface SessaoHistorico {
  id: string
  sessao_id: string
  inicio: string
  tipo: string
  duracao_segundos: number
  concluida: boolean
  acrescimo_min: number
  taxa_geral: number | null
  total_operantes: number | null
  programas_json: any[]
  eventos_json: any[]
  familia_comunicada: boolean
  nota_encerramento: string | null
  terapeuta_nome: string
  terapeuta_conselho: string | null
  terapeuta_registro: string | null
  analise_clinica: string | null
  decisao_proxima: string[] | null
  nota_decisao: string | null
}

interface Contrato {
  id: string
  status: string
  data_inicio: string
  data_fim: string | null
  modalidades: Modalidade[]
}

interface Modalidade {
  id: string
  tipo: string
  valor_sessao: number
  sessoes_por_semana: number
  duracao_min: number
  total_sessoes: number | null
  sessoes_realizadas: number
  local_padrao: string
  ativo: boolean
  dias_semana?: number[]
  horario?: string
}

interface ModalidadeForm {
  tipo: string
  valor_sessao: number
  sessoes_por_semana: number
  duracao_min: number
  total_sessoes: number | null
  local_padrao: string
  ativo: boolean
  dias_semana: number[]
  horario: string
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function fmt(s: number) {
  const min = Math.floor(s / 60)
  return `${min}min`
}
function fmtData(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}
function fmtBRL(v: number) {
  return `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`
}
function isoDate(d: Date) { return d.toISOString().slice(0, 10) }
function addDias(d: Date, n: number) { const r = new Date(d); r.setDate(r.getDate() + n); return r }

const TIPO_LABEL: Record<string, string> = {
  atendimento:                'Atendimento',
  acompanhamento_terapeutico: 'AT',
  supervisao:                 'Supervisão',
}
const TIPO_COR: Record<string, string> = {
  atendimento:                '#1D9E75',
  acompanhamento_terapeutico: '#378ADD',
  supervisao:                 '#8B7FE8',
}
const LOCAL_LABEL: Record<string, string> = {
  presencial:       'Presencial',
  remoto:           'Remoto',
  ambiente_natural: 'Amb. Natural',
}
const DIAS_SEMANA = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']

// Gera agenda_eventos a partir de uma modalidade com horários
async function gerarSlots(
  modalidadeId: string,
  criancaId: string,
  tipo: string,
  local: string,
  diasSemana: number[],
  horario: string,
  duracaoMin: number,
  dataInicio: string,
  dataFim: string | null,
  semanas: number = 12
) {
  if (diasSemana.length === 0 || !horario) return 0

  const inicio  = new Date(dataInicio + 'T12:00:00')
  const fim     = dataFim
    ? new Date(dataFim + 'T23:59:59')
    : new Date(inicio.getTime() + semanas * 7 * 24 * 60 * 60 * 1000)

  const [h, m] = horario.split(':').map(Number)
  const eventos: any[] = []
  const cursor = new Date(inicio)

  while (cursor <= fim) {
    if (diasSemana.includes(cursor.getDay())) {
      const dataHora = new Date(cursor)
      dataHora.setHours(h, m, 0, 0)
      eventos.push({
        crianca_id:             criancaId,
        tipo:                   'sessao_clinica',
        titulo:                 `Sessão — ${TIPO_LABEL[tipo] ?? tipo}`,
        data_hora:              dataHora.toISOString(),
        duracao_minutos:        duracaoMin,
        status:                 'agendado',
        tipo_sessao:            tipo,
        local:                  local,
        confirmado_terapeuta:   true,
        confirmado_responsavel: false,
        contrato_modalidade_id: modalidadeId,
      })
    }
    cursor.setDate(cursor.getDate() + 1)
  }

  if (eventos.length > 0) {
    await supabase.from('agenda_eventos').insert(eventos)
  }
  return eventos.length
}

// ─── HISTÓRICO DE SESSÕES ─────────────────────────────────────────────────────
export function HistoricoSessoes({ criancaId, criancaNome }: { criancaId: string; criancaNome: string }) {
  const [sessoes, setSessoes] = useState<SessaoHistorico[]>([])
  const [loading, setLoading] = useState(true)
  const [aberta,  setAberta]  = useState<string | null>(null)
  const [editId, setEditId] = useState<string | null>(null)
  const [fAnalise, setFAnalise] = useState("")
  const [fDecisao, setFDecisao] = useState<string[]>([])
  const [fNota, setFNota] = useState("")
  const [salvandoAn, setSalvandoAn] = useState(false)
  const [registroSessaoId, setRegistroSessaoId] = useState<string | null>(null) // FCRM-008: preview do registro clínico
  const OPCOES_PLANO = ["Manter programas atuais","Aumentar critério de maestria","Reduzir nível de ajuda","Introduzir generalização","Revisão de programa","Incluir novos objetivos","Necessidade de supervisão clínica"]
  function iniciarEdicao(s: SessaoHistorico) {
    setEditId(s.id)
    setFAnalise(s.analise_clinica ?? "")
    setFDecisao(s.decisao_proxima ?? [])
    setFNota(s.nota_decisao ?? "")
  }
  async function salvarEdicao(s: SessaoHistorico) {
    setSalvandoAn(true)
    const { error } = await supabase.from('session_summary').update({
      analise_clinica: fAnalise || null,
      decisao_proxima: fDecisao.length > 0 ? fDecisao : null,
      nota_decisao: fNota || null,
    }).eq('sessao_id', s.sessao_id)
    setSalvandoAn(false)
    if (error) { console.error('Erro ao salvar analise:', error); alert('Erro ao salvar. Verifique o console.'); return }
    setSessoes(prev => prev.map(x => x.id === s.id ? { ...x, analise_clinica: fAnalise || null, decisao_proxima: fDecisao.length > 0 ? fDecisao : null, nota_decisao: fNota || null } : x))
    setEditId(null)
  }

  useEffect(() => {
    if (!criancaId) return
    async function carregar() {
      setLoading(true)
      const { data: summaries } = await supabase
        .from('session_summary')
        .select('id, sessao_id, taxa_geral, total_operantes, programas_json, eventos_json, familia_comunicada, nota_encerramento, criado_em, analise_clinica, decisao_proxima, nota_decisao')
        .eq('crianca_id', criancaId)
        .order('criado_em', { ascending: false })
        .limit(50)

      if (!summaries || summaries.length === 0) {
        setSessoes([])
        setLoading(false)
        return
      }

      const sessaoIds = summaries.map(s => s.sessao_id).filter(Boolean)
      const { data: sessv2 } = await supabase
        .from('sessoes_v2')
        .select('id, inicio, tipo, duracao_segundos, concluida, acrescimo_min, terapeuta_id')
        .in('id', sessaoIds)

      const terapeutaIds = [...new Set((sessv2 ?? []).map(s => s.terapeuta_id).filter(Boolean))]
      const { data: perfis } = await supabase
        .from('profiles')
        .select('id, nome, conselho_profissional, registro_profissional')
        .in('id', terapeutaIds)

      const perfilMap = new Map((perfis ?? []).map(p => [p.id, p]))
      const sessMap   = new Map((sessv2 ?? []).map(s => [s.id, s]))

      setSessoes(summaries.map(sm => {
        const sv = sessMap.get(sm.sessao_id)
        return {
          id:                sm.id,
          sessao_id:         sm.sessao_id,
          inicio:            sv?.inicio ?? sm.criado_em,
          tipo:              sv?.tipo ?? 'atendimento',
          duracao_segundos:  sv?.duracao_segundos ?? 0,
          concluida:         sv?.concluida ?? true,
          acrescimo_min:     sv?.acrescimo_min ?? 0,
          taxa_geral:        sm.taxa_geral,
          total_operantes:   sm.total_operantes,
          programas_json:    sm.programas_json ?? [],
          eventos_json:      sm.eventos_json ?? [],
          familia_comunicada:sm.familia_comunicada ?? false,
          nota_encerramento: sm.nota_encerramento,
          terapeuta_nome:    (perfilMap.get(sv?.terapeuta_id) as any)?.nome ?? '—',
          terapeuta_conselho:(perfilMap.get(sv?.terapeuta_id) as any)?.conselho_profissional ?? null,
          terapeuta_registro:(perfilMap.get(sv?.terapeuta_id) as any)?.registro_profissional ?? null,
          analise_clinica:   sm.analise_clinica ?? null,
          decisao_proxima:   sm.decisao_proxima ?? null,
          nota_decisao:      sm.nota_decisao ?? null,
        }
      }))
      setLoading(false)
    }
    carregar()
  }, [criancaId])

  const card: React.CSSProperties = { background: 'rgba(13,32,53,.75)', border: '1px solid rgba(26,58,92,.5)', borderRadius: 12 }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
      <div style={{ fontSize: 13, color: 'rgba(160,200,235,.5)' }}>Carregando histórico...</div>
    </div>
  )

  if (sessoes.length === 0) return (
    <div style={{ ...card, padding: 32, textAlign: 'center', marginTop: 20 }}>
      <div style={{ fontSize: 13, color: 'rgba(160,200,235,.3)', marginBottom: 8 }}>Nenhuma sessão finalizada ainda</div>
      <div style={{ fontSize: 12, color: 'rgba(160,200,235,.2)' }}>O histórico aparece aqui após o encerramento de cada sessão</div>
    </div>
  )

  const taxaMedia = Math.round(
    sessoes.filter(s => s.taxa_geral !== null).reduce((a,s) => a + (s.taxa_geral ?? 0), 0) /
    (sessoes.filter(s => s.taxa_geral !== null).length || 1)
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 20 }}>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
        {[
          { l: 'Sessões',       v: sessoes.length,                                             c: '#e8f0f8' },
          { l: 'Taxa média',    v: `${taxaMedia}%`,                                            c: '#1D9E75' },
          { l: 'Operantes',     v: sessoes.reduce((a,s) => a + (s.total_operantes ?? 0), 0),   c: '#378ADD' },
          { l: 'Última sessão', v: fmtData(sessoes[0]?.inicio ?? ''),                          c: '#EF9F27' },
        ].map(k => (
          <div key={k.l} style={{ ...card, padding: '12px 14px' }}>
            <div style={{ fontSize: '.6rem', color: 'rgba(170,210,245,.5)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 4 }}>{k.l}</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: k.c }}>{k.v}</div>
          </div>
        ))}
      </div>

      {/* Lista */}
      {sessoes.map(s => {
        const cor        = TIPO_COR[s.tipo] ?? '#1D9E75'
        const estaAberta = aberta === s.id
        const progInterv = s.programas_json.filter((p:any) => p.area === 'intervencao' || p.tipo === 'intervention')
        const progAval   = s.programas_json.filter((p:any) => p.area === 'avaliacao'   || p.tipo === 'assessment')

        return (
          <div key={s.id} style={{ ...card, overflow: 'hidden', border: `1px solid ${estaAberta ? cor+'44' : 'rgba(26,58,92,.5)'}` }}>

            <div onClick={() => setAberta(estaAberta ? null : s.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', cursor: 'pointer' }}>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 48, flexShrink: 0 }}>
                <div style={{ fontSize: '.65rem', color: cor, fontWeight: 700, textTransform: 'uppercase' }}>
                  {new Date(s.inicio).toLocaleDateString('pt-BR', { month: 'short' })}
                </div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#e8f0f8', lineHeight: 1 }}>
                  {new Date(s.inicio).getDate()}
                </div>
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                  <span style={{ fontSize: '.72rem', fontWeight: 700, color: cor, background: cor+'15', borderRadius: 20, padding: '2px 8px' }}>
                    {TIPO_LABEL[s.tipo] ?? s.tipo}
                  </span>
                  <span style={{ fontSize: '.68rem', color: 'rgba(160,200,235,.4)' }}>
                    {new Date(s.inicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span style={{ fontSize: '.68rem', color: 'rgba(160,200,235,.4)' }}>· {fmt(s.duracao_segundos)}</span>
                  {s.acrescimo_min > 0 && <span style={{ fontSize: '.62rem', color: '#EF9F27' }}>+{s.acrescimo_min}min</span>}
                </div>
                <div style={{ fontSize: '.68rem', color: 'rgba(160,200,235,.4)' }}>
                  {s.terapeuta_nome}{s.total_operantes ? ` · ${s.total_operantes} operantes` : ''}
                </div>
              </div>

              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                {s.taxa_geral !== null ? (
                  <>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: s.taxa_geral >= 80 ? '#1D9E75' : s.taxa_geral >= 50 ? '#EF9F27' : '#E05A4B' }}>
                      {s.taxa_geral}%
                    </div>
                    <div style={{ fontSize: '.6rem', color: 'rgba(160,200,235,.35)' }}>acerto</div>
                  </>
                ) : <div style={{ fontSize: '.72rem', color: 'rgba(160,200,235,.2)' }}>—</div>}
              </div>

              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="rgba(160,200,235,.3)" strokeWidth="1.5"
                style={{ transform: estaAberta ? 'rotate(180deg)' : 'none', transition: 'transform .2s', flexShrink: 0 }}>
                <path d="M3 6l5 5 5-5"/>
              </svg>
            </div>

            {estaAberta && (
              <div style={{ borderTop: '1px solid rgba(26,58,92,.3)', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
    <button onClick={() => setRegistroSessaoId(s.sessao_id)} style={{ padding: '5px 14px', borderRadius: 8, border: '1px solid rgba(55,138,221,.3)', background: 'rgba(55,138,221,.08)', color: '#378ADD', fontSize: '.68rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
      Ver registro clínico
    </button>
    <button onClick={() => abrirRelatorioPDF(dadosDoSummary(
      s,
      { inicio: s.inicio, tipo: s.tipo, duracao_segundos: s.duracao_segundos },
      { nome: s.terapeuta_nome, conselho_profissional: s.terapeuta_conselho ?? undefined, registro_profissional: s.terapeuta_registro ?? undefined },
      criancaNome ?? '—'
    ))} style={{ padding: '5px 14px', borderRadius: 8, border: '1px solid rgba(29,158,117,.3)', background: 'rgba(29,158,117,.08)', color: '#1D9E75', fontSize: '.68rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
      Ver relatório
    </button>
  </div>

  {/* Analise clinica e plano (2c) */}
  <div style={{ background: 'rgba(26,58,92,.15)', borderRadius: 10, padding: 14 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
      <div style={{ fontSize: '.65rem', color: 'rgba(170,210,245,.5)', textTransform: 'uppercase', letterSpacing: '.08em' }}>Análise clínica e plano</div>
      {editId !== s.id && (
        <button onClick={() => iniciarEdicao(s)} style={{ padding: '4px 12px', borderRadius: 7, border: '1px solid rgba(55,138,221,.3)', background: 'rgba(55,138,221,.08)', color: '#378ADD', fontSize: '.64rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
          {(s.analise_clinica || (s.decisao_proxima && s.decisao_proxima.length > 0) || s.nota_decisao) ? 'Editar' : 'Adicionar'}
        </button>
      )}
    </div>
    {editId === s.id ? (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <textarea value={fAnalise} onChange={e => setFAnalise(e.target.value)} placeholder="Análise clínica..." rows={3}
          style={{ width: '100%', padding: '9px 11px', borderRadius: 8, border: '1px solid rgba(26,58,92,.4)', background: 'rgba(13,32,53,.6)', color: '#e8f0f8', fontSize: '.75rem', fontFamily: 'var(--font-sans)', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {OPCOES_PLANO.map(opcao => {
            const sel = fDecisao.includes(opcao)
            return (
              <div key={opcao} onClick={() => setFDecisao(prev => sel ? prev.filter(d => d !== opcao) : [...prev, opcao])}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 7, background: sel ? 'rgba(29,158,117,.08)' : 'rgba(26,58,92,.15)', border: `1px solid ${sel ? 'rgba(29,158,117,.3)' : 'rgba(26,58,92,.3)'}`, cursor: 'pointer' }}>
                <div style={{ width: 14, height: 14, borderRadius: 4, flexShrink: 0, border: `1.5px solid ${sel ? '#1D9E75' : 'rgba(160,200,235,.25)'}`, background: sel ? '#1D9E75' : 'transparent' }} />
                <span style={{ fontSize: '.72rem', color: sel ? '#e8f0f8' : 'rgba(160,200,235,.6)' }}>{opcao}</span>
              </div>
            )
          })}
        </div>
        <textarea value={fNota} onChange={e => setFNota(e.target.value)} placeholder="Detalhes do plano..." rows={2}
          style={{ width: '100%', padding: '9px 11px', borderRadius: 8, border: '1px solid rgba(26,58,92,.4)', background: 'rgba(13,32,53,.6)', color: '#e8f0f8', fontSize: '.75rem', fontFamily: 'var(--font-sans)', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }} />
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => salvarEdicao(s)} disabled={salvandoAn}
            style={{ padding: '7px 16px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#1D9E75,#168a64)', color: '#07111f', fontSize: '.72rem', fontWeight: 800, cursor: 'pointer', fontFamily: 'var(--font-sans)', opacity: salvandoAn ? .6 : 1 }}>
            {salvandoAn ? 'Salvando...' : 'Salvar'}
          </button>
          <button onClick={() => setEditId(null)}
            style={{ padding: '7px 16px', borderRadius: 8, border: '1px solid rgba(160,200,235,.2)', background: 'transparent', color: 'rgba(160,200,235,.7)', fontSize: '.72rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
            Cancelar
          </button>
        </div>
      </div>
    ) : (
      (s.analise_clinica || (s.decisao_proxima && s.decisao_proxima.length > 0) || s.nota_decisao) ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {s.analise_clinica && <div style={{ fontSize: '.75rem', color: 'rgba(232,240,248,.85)', lineHeight: 1.5 }}>{s.analise_clinica}</div>}
          {s.decisao_proxima && s.decisao_proxima.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {s.decisao_proxima.map((d, i) => (
                <span key={i} style={{ fontSize: '.66rem', padding: '3px 9px', borderRadius: 20, background: 'rgba(29,158,117,.1)', border: '1px solid rgba(29,158,117,.25)', color: '#1D9E75' }}>{d}</span>
              ))}
            </div>
          )}
          {s.nota_decisao && <div style={{ fontSize: '.72rem', color: 'rgba(160,200,235,.6)', fontStyle: 'italic' }}>{s.nota_decisao}</div>}
        </div>
      ) : (
        <div style={{ fontSize: '.72rem', color: 'rgba(160,200,235,.3)' }}>Nenhuma análise registrada nesta sessão.</div>
      )
    )}
  </div>

                {progInterv.length > 0 && (
                  <div>
                    <div style={{ fontSize: '.65rem', color: 'rgba(170,210,245,.5)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 8 }}>Intervenções</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {progInterv.map((p:any, i:number) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'rgba(26,58,92,.2)', borderRadius: 8 }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '.78rem', fontWeight: 600, color: '#e8f0f8' }}>{p.nome}</div>
                            <div style={{ fontSize: '.65rem', color: 'rgba(160,200,235,.4)' }}>
                              {p.dominio} · {p.total} tentativas · {p.independencia ?? 0}% independência
                            </div>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                            <div style={{ fontSize: '1rem', fontWeight: 800, color: p.taxa >= 80 ? '#1D9E75' : p.taxa >= 50 ? '#EF9F27' : '#E05A4B' }}>{p.taxa}%</div>
                            {p.criterio && <div style={{ fontSize: '.58rem', color: '#1D9E75', fontWeight: 700 }}>Critério</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {progAval.length > 0 && (
                  <div>
                    <div style={{ fontSize: '.65rem', color: 'rgba(170,210,245,.5)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 6 }}>Avaliações</div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {progAval.map((p:any, i:number) => (
                        <span key={i} style={{ fontSize: '.72rem', padding: '4px 10px', borderRadius: 20, background: 'rgba(139,127,232,.1)', border: '1px solid rgba(139,127,232,.2)', color: '#8B7FE8' }}>
                          {p.nome}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {s.eventos_json.length > 0 && (
                  <div>
                    <div style={{ fontSize: '.65rem', color: 'rgba(170,210,245,.5)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 6 }}>Eventos clínicos</div>
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                      {s.eventos_json.map((ev:any, i:number) => (
                        <span key={i} style={{ fontSize: '.65rem', padding: '2px 8px', borderRadius: 20, background: 'rgba(26,58,92,.3)', color: 'rgba(160,200,235,.6)', border: '1px solid rgba(26,58,92,.5)' }}>
                          {ev.label}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {s.nota_encerramento && (
                  <div style={{ padding: '10px 12px', background: 'rgba(26,58,92,.2)', borderRadius: 8, fontSize: '.75rem', color: 'rgba(160,200,235,.7)', lineHeight: 1.55 }}>
                    {s.nota_encerramento}
                  </div>
                )}

                <div style={{ fontSize: '.68rem', color: s.familia_comunicada ? '#1D9E75' : 'rgba(224,90,75,.6)', fontWeight: 600 }}>
                  {s.familia_comunicada ? 'Família comunicada' : 'Família não comunicada'}
                </div>
              </div>
            )}
          </div>
        )
      })}

      {registroSessaoId && (
        <DocumentoPreview
          tipo="registro_sessao"
          id={registroSessaoId}
          onFechar={() => setRegistroSessaoId(null)}
        />
      )}
    </div>
  )
}

// ─── ABA CONTRATO ─────────────────────────────────────────────────────────────
export function ContratoTab({ criancaId, terapeutaId }: { criancaId: string; terapeutaId: string }) {
  const [contrato,     setContrato]     = useState<Contrato | null>(null)
  const [loading,      setLoading]      = useState(true)
  const [criandoModal, setCriandoModal] = useState(false)
  const [salvando,     setSalvando]     = useState(false)
  const [slotsMensagem, setSlotsMensagem] = useState<string | null>(null)

  const [form, setForm] = useState({
    data_inicio: new Date().toISOString().slice(0,10),
    data_fim:    '',
    semanas:     12,
  })

  const modalidadeVazia = (): ModalidadeForm => ({
    tipo:               'atendimento',
    valor_sessao:       250,
    sessoes_por_semana: 2,
    duracao_min:        60,
    total_sessoes:      null,
    local_padrao:       'presencial',
    ativo:              true,
    dias_semana:        [],
    horario:            '14:00',
  })

  const [modalidades, setModalidades] = useState<ModalidadeForm[]>([modalidadeVazia()])

  const card: React.CSSProperties = { background: 'rgba(13,32,53,.75)', border: '1px solid rgba(26,58,92,.5)', borderRadius: 12 }
  const inp:  React.CSSProperties = { width: '100%', padding: '9px 11px', borderRadius: 8, border: '1px solid rgba(26,58,92,.5)', background: 'rgba(13,32,53,.6)', color: '#e8f0f8', fontSize: 13, fontFamily: 'var(--font-sans)', outline: 'none', boxSizing: 'border-box' as const }

  useEffect(() => {
    if (!criancaId) return
    async function carregar() {
      setLoading(true)
      const { data: contratos } = await supabase
        .from('contratos')
        .select('id, status, data_inicio, data_fim')
        .eq('crianca_id', criancaId)
        .eq('status', 'ativo')
        .order('criado_em', { ascending: false })
        .limit(1)

      if (!contratos || contratos.length === 0) {
        setContrato(null)
        setLoading(false)
        return
      }

      const c = contratos[0]
      const { data: mods } = await supabase
        .from('contrato_modalidades')
        .select('*')
        .eq('contrato_id', c.id)

      setContrato({ ...c, modalidades: mods ?? [] })
      setLoading(false)
    }
    carregar()
  }, [criancaId])

  async function criarContrato() {
    if (!criancaId || !terapeutaId) return
    setSalvando(true)
    setSlotsMensagem(null)
    try {
      // 1. Criar contrato principal
      const { data: c, error } = await supabase
        .from('contratos')
        .insert({
          crianca_id:   criancaId,
          terapeuta_id: terapeutaId,
          status:       'ativo',
          data_inicio:  form.data_inicio,
          data_fim:     form.data_fim || null,
        })
        .select('id')
        .single()

      if (error || !c) throw error

      let totalSlots = 0

      // 2. Criar modalidades e gerar slots
      for (const m of modalidades) {
        if (!m.ativo) continue

        const { data: mod } = await supabase
          .from('contrato_modalidades')
          .insert({
            contrato_id:        c.id,
            tipo:               m.tipo,
            valor_sessao:       m.valor_sessao,
            sessoes_por_semana: m.sessoes_por_semana,
            duracao_min:        m.duracao_min,
            total_sessoes:      m.total_sessoes,
            local_padrao:       m.local_padrao,
            ativo:              true,
          })
          .select('id')
          .single()

        if (mod && m.dias_semana.length > 0 && m.horario) {
          const slots = await gerarSlots(
            mod.id,
            criancaId,
            m.tipo,
            m.local_padrao,
            m.dias_semana,
            m.horario,
            m.duracao_min,
            form.data_inicio,
            form.data_fim || null,
            form.semanas,
          )
          totalSlots += slots
        }
      }

      // 3. Recarregar
      const { data: mods } = await supabase
        .from('contrato_modalidades')
        .select('*')
        .eq('contrato_id', c.id)

      setContrato({
        id:          c.id,
        status:      'ativo',
        data_inicio: form.data_inicio,
        data_fim:    form.data_fim || null,
        modalidades: mods ?? [],
      })

      setSlotsMensagem(
        totalSlots > 0
          ? `Contrato criado. ${totalSlots} sessão(ões) geradas na agenda.`
          : 'Contrato criado. Sem horários definidos — agendamentos podem ser criados manualmente na Agenda.'
      )
      setCriandoModal(false)
    } catch (err) {
      console.error('Erro ao criar contrato:', err)
    }
    setSalvando(false)
  }

  function toggleDia(idx: number, dia: number) {
    setModalidades(prev => prev.map((m,i) => {
      if (i !== idx) return m
      const dias = m.dias_semana.includes(dia)
        ? m.dias_semana.filter(d => d !== dia)
        : [...m.dias_semana, dia]
      return { ...m, dias_semana: dias }
    }))
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
      <div style={{ fontSize: 13, color: 'rgba(160,200,235,.5)' }}>Carregando...</div>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 20 }}>

      {slotsMensagem && (
        <div style={{ padding: '12px 16px', background: 'rgba(29,158,117,.08)', border: '1px solid rgba(29,158,117,.2)', borderRadius: 10, fontSize: 13, color: '#1D9E75' }}>
          {slotsMensagem}
        </div>
      )}

      {!contrato ? (
        <div style={{ ...card, padding: 32, textAlign: 'center' }}>
          <div style={{ fontSize: 13, color: 'rgba(160,200,235,.4)', marginBottom: 16 }}>
            Nenhum contrato ativo para este paciente
          </div>
          <button onClick={() => setCriandoModal(true)} style={{ padding: '10px 24px', borderRadius: 9, border: 'none', background: 'linear-gradient(135deg,#1D9E75,#0f8f7a)', color: '#07111f', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
            + Criar contrato
          </button>
        </div>
      ) : (
        <>
          {/* Header */}
          <div style={{ ...card, padding: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: '.88rem', fontWeight: 700, color: '#e8f0f8', marginBottom: 4 }}>Contrato ativo</div>
                <div style={{ fontSize: '.72rem', color: 'rgba(160,200,235,.5)' }}>
                  Início: {fmtData(contrato.data_inicio)}
                  {contrato.data_fim ? ` · Fim: ${fmtData(contrato.data_fim)}` : ' · Em aberto'}
                </div>
              </div>
              <span style={{ fontSize: '.65rem', color: '#1D9E75', background: 'rgba(29,158,117,.1)', border: '1px solid rgba(29,158,117,.2)', borderRadius: 20, padding: '3px 10px', fontWeight: 700 }}>
                Ativo
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
              {[
                { l: 'Receita mensal prev.', v: fmtBRL(contrato.modalidades.reduce((a,m) => a + m.valor_sessao * m.sessoes_por_semana * 4, 0)) },
                { l: 'Sessões/semana',        v: contrato.modalidades.reduce((a,m) => a + m.sessoes_por_semana, 0).toFixed(1) },
                { l: 'Modalidades',           v: contrato.modalidades.length },
              ].map(k => (
                <div key={k.l} style={{ padding: '10px 12px', background: 'rgba(26,58,92,.2)', borderRadius: 9 }}>
                  <div style={{ fontSize: '.6rem', color: 'rgba(170,210,245,.5)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 4 }}>{k.l}</div>
                  <div style={{ fontSize: '.95rem', fontWeight: 800, color: '#e8f0f8' }}>{k.v}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Modalidades */}
          {contrato.modalidades.map(m => {
            const cor       = TIPO_COR[m.tipo] ?? '#1D9E75'
            const progresso = m.total_sessoes ? Math.round(m.sessoes_realizadas / m.total_sessoes * 100) : null
            return (
              <div key={m.id} style={{ ...card, padding: 18, border: `1px solid ${cor}22` }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: '.78rem', fontWeight: 700, color: cor, background: cor+'15', borderRadius: 20, padding: '3px 10px' }}>
                      {TIPO_LABEL[m.tipo] ?? m.tipo}
                    </span>
                    <span style={{ fontSize: '.68rem', color: 'rgba(160,200,235,.4)' }}>
                      {LOCAL_LABEL[m.local_padrao]} · {m.duracao_min}min
                    </span>
                    {m.dias_semana && m.dias_semana.length > 0 && (
                      <span style={{ fontSize: '.65rem', color: 'rgba(160,200,235,.35)' }}>
                        {m.dias_semana.map(d => DIAS_SEMANA[d]).join(', ')} {m.horario}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '.9rem', fontWeight: 800, color: '#e8f0f8' }}>
                    {fmtBRL(m.valor_sessao)}<span style={{ fontSize: '.65rem', color: 'rgba(160,200,235,.4)', fontWeight: 400 }}>/sessão</span>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: progresso !== null ? 12 : 0 }}>
                  <div style={{ padding: '8px 10px', background: 'rgba(26,58,92,.2)', borderRadius: 7 }}>
                    <div style={{ fontSize: '.58rem', color: 'rgba(170,210,245,.5)', marginBottom: 2 }}>Freq./semana</div>
                    <div style={{ fontSize: '.85rem', fontWeight: 700, color: '#e8f0f8' }}>{m.sessoes_por_semana}x</div>
                  </div>
                  <div style={{ padding: '8px 10px', background: 'rgba(26,58,92,.2)', borderRadius: 7 }}>
                    <div style={{ fontSize: '.58rem', color: 'rgba(170,210,245,.5)', marginBottom: 2 }}>Sessões</div>
                    <div style={{ fontSize: '.85rem', fontWeight: 700, color: '#e8f0f8' }}>{m.sessoes_realizadas}/{m.total_sessoes ?? '∞'}</div>
                  </div>
                </div>
                {progresso !== null && (
                  <>
                    <div style={{ height: 4, background: 'rgba(26,58,92,.5)', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${progresso}%`, background: cor }} />
                    </div>
                    <div style={{ fontSize: '.65rem', color: 'rgba(160,200,235,.4)', marginTop: 4 }}>{progresso}% utilizado</div>
                  </>
                )}
              </div>
            )
          })}

          <button onClick={() => setCriandoModal(true)} style={{ padding: '10px', borderRadius: 9, border: '1px solid rgba(26,58,92,.5)', background: 'transparent', color: 'rgba(160,200,235,.5)', fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
            + Adicionar modalidade / renovar contrato
          </button>
        </>
      )}

      {/* Modal de criação */}
      {criandoModal && (
        <div onClick={() => setCriandoModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ ...card, padding: 28, width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto', border: '1px solid rgba(99,179,237,.15)' }}>

            <div style={{ fontSize: '1rem', fontWeight: 700, color: '#e8f0f8', marginBottom: 4 }}>Novo contrato</div>
            <div style={{ fontSize: '.75rem', color: 'rgba(160,200,235,.4)', marginBottom: 24 }}>
              Defina modalidades, horários e frequência. A agenda será gerada automaticamente com slots editáveis.
            </div>

            {/* Período */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div>
                <label style={{ fontSize: '.62rem', color: 'rgba(170,210,245,.5)', textTransform: 'uppercase', letterSpacing: '.08em', display: 'block', marginBottom: 6 }}>Data de início</label>
                <input type="date" value={form.data_inicio} onChange={e => setForm(p => ({ ...p, data_inicio: e.target.value }))} style={inp} />
              </div>
              <div>
                <label style={{ fontSize: '.62rem', color: 'rgba(170,210,245,.5)', textTransform: 'uppercase', letterSpacing: '.08em', display: 'block', marginBottom: 6 }}>Data de fim (opcional)</label>
                <input type="date" value={form.data_fim} onChange={e => setForm(p => ({ ...p, data_fim: e.target.value }))} style={inp} />
              </div>
            </div>

            {!form.data_fim && (
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: '.62rem', color: 'rgba(170,210,245,.5)', textTransform: 'uppercase', letterSpacing: '.08em', display: 'block', marginBottom: 6 }}>
                  Gerar agenda para (semanas)
                </label>
                <input type="number" min={1} max={52} value={form.semanas}
                  onChange={e => setForm(p => ({ ...p, semanas: parseInt(e.target.value) }))} style={{ ...inp, maxWidth: 120 }} />
              </div>
            )}

            {/* Modalidades */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: '.62rem', color: 'rgba(170,210,245,.5)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 12 }}>Modalidades contratadas</div>
              {modalidades.map((m, idx) => {
                const cor = TIPO_COR[m.tipo] ?? '#1D9E75'
                return (
                  <div key={idx} style={{ padding: 16, borderRadius: 10, border: `1px solid ${cor}22`, background: cor+'08', marginBottom: 12 }}>

                    {/* Tipo */}
                    <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                      {(['atendimento','acompanhamento_terapeutico','supervisao'] as const).map(t => (
                        <button key={t} onClick={() => setModalidades(prev => prev.map((x,i) => i===idx ? { ...x, tipo: t } : x))}
                          style={{ flex: 1, padding: '7px 4px', borderRadius: 7, border: `1px solid ${m.tipo===t ? TIPO_COR[t]+'55' : 'rgba(26,58,92,.4)'}`, background: m.tipo===t ? TIPO_COR[t]+'15' : 'transparent', color: m.tipo===t ? TIPO_COR[t] : 'rgba(160,200,235,.4)', fontSize: '.65rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
                          {TIPO_LABEL[t]}
                        </button>
                      ))}
                    </div>

                    {/* Campos financeiros e duração */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                      <div>
                        <label style={{ fontSize: '.6rem', color: 'rgba(170,210,245,.4)', display: 'block', marginBottom: 4 }}>Valor/sessão (R$)</label>
                        <input type="number" value={m.valor_sessao}
                          onChange={e => setModalidades(prev => prev.map((x,i) => i===idx ? { ...x, valor_sessao: parseFloat(e.target.value) } : x))} style={inp} />
                      </div>
                      <div>
                        <label style={{ fontSize: '.6rem', color: 'rgba(170,210,245,.4)', display: 'block', marginBottom: 4 }}>Duração (min)</label>
                        <input type="number" min={30} max={240} step={15} value={m.duracao_min}
                          onChange={e => setModalidades(prev => prev.map((x,i) => i===idx ? { ...x, duracao_min: parseInt(e.target.value) } : x))} style={inp} />
                      </div>
                      <div>
                        <label style={{ fontSize: '.6rem', color: 'rgba(170,210,245,.4)', display: 'block', marginBottom: 4 }}>Sessões/semana</label>
                        <input type="number" min={0.5} max={7} step={0.5} value={m.sessoes_por_semana}
                          onChange={e => setModalidades(prev => prev.map((x,i) => i===idx ? { ...x, sessoes_por_semana: parseFloat(e.target.value) } : x))} style={inp} />
                      </div>
                      <div>
                        <label style={{ fontSize: '.6rem', color: 'rgba(170,210,245,.4)', display: 'block', marginBottom: 4 }}>Total sessões (opcional)</label>
                        <input type="number" min={1} placeholder="∞ aberto" value={m.total_sessoes ?? ''}
                          onChange={e => setModalidades(prev => prev.map((x,i) => i===idx ? { ...x, total_sessoes: e.target.value ? parseInt(e.target.value) : null } : x))} style={inp} />
                      </div>
                    </div>

                    {/* Local */}
                    <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                      {(['presencial','remoto','ambiente_natural'] as const).map(l => (
                        <button key={l} onClick={() => setModalidades(prev => prev.map((x,i) => i===idx ? { ...x, local_padrao: l } : x))}
                          style={{ flex: 1, padding: '6px 4px', borderRadius: 7, border: `1px solid ${m.local_padrao===l ? '#378ADD55' : 'rgba(26,58,92,.4)'}`, background: m.local_padrao===l ? 'rgba(55,138,221,.15)' : 'transparent', color: m.local_padrao===l ? '#378ADD' : 'rgba(160,200,235,.4)', fontSize: '.62rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
                          {LOCAL_LABEL[l]}
                        </button>
                      ))}
                    </div>

                    {/* Dias da semana + Horário */}
                    <div style={{ padding: '12px 14px', background: 'rgba(0,0,0,.15)', borderRadius: 9, border: '1px solid rgba(26,58,92,.3)' }}>
                      <div style={{ fontSize: '.62rem', color: 'rgba(170,210,245,.5)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 8 }}>
                        Horário fixo — gera agenda automaticamente
                      </div>
                      <div style={{ display: 'flex', gap: 5, marginBottom: 10 }}>
                        {DIAS_SEMANA.map((d, di) => {
                          const ativo = m.dias_semana.includes(di)
                          return (
                            <button key={di} onClick={() => toggleDia(idx, di)}
                              style={{ flex: 1, padding: '7px 4px', borderRadius: 7, border: `1px solid ${ativo ? cor+'55' : 'rgba(26,58,92,.4)'}`, background: ativo ? cor+'15' : 'transparent', color: ativo ? cor : 'rgba(160,200,235,.35)', fontSize: '.62rem', fontWeight: ativo ? 700 : 400, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
                              {d}
                            </button>
                          )
                        })}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ flex: 1 }}>
                          <label style={{ fontSize: '.6rem', color: 'rgba(170,210,245,.4)', display: 'block', marginBottom: 4 }}>Horário de início</label>
                          <input type="time" value={m.horario}
                            onChange={e => setModalidades(prev => prev.map((x,i) => i===idx ? { ...x, horario: e.target.value } : x))}
                            style={{ ...inp, maxWidth: 140 }} />
                        </div>
                        {m.dias_semana.length > 0 && m.horario && (
                          <div style={{ fontSize: '.68rem', color: cor, padding: '6px 10px', background: cor+'10', borderRadius: 7, border: `1px solid ${cor}22`, whiteSpace: 'nowrap' as const }}>
                            {m.dias_semana.length}x/sem · {m.horario}
                          </div>
                        )}
                      </div>
                      {m.dias_semana.length === 0 && (
                        <div style={{ fontSize: '.65rem', color: 'rgba(160,200,235,.3)', marginTop: 6 }}>
                          Sem dias definidos — agenda criada manualmente
                        </div>
                      )}
                    </div>

                    {idx > 0 && (
                      <button onClick={() => setModalidades(prev => prev.filter((_,i) => i !== idx))}
                        style={{ marginTop: 10, fontSize: '.65rem', color: '#E05A4B', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
                        Remover modalidade
                      </button>
                    )}
                  </div>
                )
              })}

              <button onClick={() => setModalidades(prev => [...prev, modalidadeVazia()])}
                style={{ width: '100%', padding: '9px', borderRadius: 9, border: '1px dashed rgba(26,58,92,.5)', background: 'transparent', color: 'rgba(160,200,235,.4)', fontSize: '.75rem', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
                + Adicionar modalidade
              </button>
            </div>

            {/* Receita prevista */}
            <div style={{ padding: '12px 14px', background: 'rgba(29,158,117,.06)', border: '1px solid rgba(29,158,117,.2)', borderRadius: 9, marginBottom: 20 }}>
              <div style={{ fontSize: '.62rem', color: 'rgba(170,210,245,.5)', marginBottom: 4 }}>Receita mensal prevista</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1D9E75' }}>
                {fmtBRL(modalidades.reduce((a,m) => a + m.valor_sessao * m.sessoes_por_semana * 4, 0))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setCriandoModal(false)}
                style={{ flex: 1, padding: 11, borderRadius: 9, border: '1px solid rgba(26,58,92,.5)', background: 'transparent', color: 'rgba(160,200,235,.5)', fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
                Cancelar
              </button>
              <button onClick={criarContrato} disabled={salvando}
                style={{ flex: 2, padding: 11, borderRadius: 9, border: 'none', background: salvando ? 'rgba(29,158,117,.4)' : 'linear-gradient(135deg,#1D9E75,#0f8f7a)', color: '#07111f', fontSize: 13, fontWeight: 700, cursor: salvando ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-sans)' }}>
                {salvando ? 'Criando contrato...' : 'Criar contrato e gerar agenda'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
