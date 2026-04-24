'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

// ── Tipos ─────────────────────────────────────────────────────────────────────
interface Filtro {
  id: string
  campo: string
  operador: string
  valor: string
}

interface ResultadoRow {
  [key: string]: string | number | boolean | null
}

// ── Config das tabelas ────────────────────────────────────────────────────────
const TABELAS = {
  criancas: {
    label: 'Pacientes (crianças)',
    campos: [
      { key: 'nome',            label: 'Nome',          tipo: 'texto'  },
      { key: 'diagnostico',     label: 'Diagnóstico',   tipo: 'texto'  },
      { key: 'idade_anos',      label: 'Idade (anos)',  tipo: 'numero' },
      { key: 'ativo',           label: 'Ativo',         tipo: 'bool'   },
      { key: 'criado_em',       label: 'Cadastro',      tipo: 'data'   },
    ],
  },
  avaliacoes: {
    label: 'Avaliações',
    campos: [
      { key: 'nome_crianca',        label: 'Nome da criança',   tipo: 'texto'  },
      { key: 'idade_crianca',       label: 'Idade da criança',  tipo: 'numero' },
      { key: 'score_geral',         label: 'Score geral',       tipo: 'numero' },
      { key: 'score_comunicacao',   label: 'Score comunicação', tipo: 'numero' },
      { key: 'score_social',        label: 'Score social',      tipo: 'numero' },
      { key: 'score_atencao',       label: 'Score atenção',     tipo: 'numero' },
      { key: 'score_regulacao',     label: 'Score regulação',   tipo: 'numero' },
      { key: 'dominio_prioritario', label: 'Domínio prioritário', tipo: 'texto' },
      { key: 'convertido',          label: 'Convertido',        tipo: 'bool'   },
      { key: 'origem',              label: 'Origem',            tipo: 'texto'  },
      { key: 'criado_em',           label: 'Data',              tipo: 'data'   },
    ],
  },
  sessoes_clinicas: {
    label: 'Sessões Clínicas',
    campos: [
      { key: 'taxa_acerto',       label: 'Taxa de acerto (%)', tipo: 'numero' },
      { key: 'total_tentativas',  label: 'Total tentativas',   tipo: 'numero' },
      { key: 'acertos',           label: 'Acertos',            tipo: 'numero' },
      { key: 'duracao_segundos',  label: 'Duração (seg)',      tipo: 'numero' },
      { key: 'concluida',         label: 'Concluída',          tipo: 'bool'   },
      { key: 'humor_crianca',     label: 'Humor criança',      tipo: 'numero' },
      { key: 'criado_em',         label: 'Data',               tipo: 'data'   },
    ],
  },
  radar_snapshots: {
    label: 'Radar de Evolução',
    campos: [
      { key: 'score_comunicacao',   label: 'Comunicação',   tipo: 'numero' },
      { key: 'score_social',        label: 'Social',        tipo: 'numero' },
      { key: 'score_atencao',       label: 'Atenção',       tipo: 'numero' },
      { key: 'score_regulacao',     label: 'Regulação',     tipo: 'numero' },
      { key: 'score_brincadeira',   label: 'Brincadeira',   tipo: 'numero' },
      { key: 'score_flexibilidade', label: 'Flexibilidade', tipo: 'numero' },
      { key: 'score_autonomia',     label: 'Autonomia',     tipo: 'numero' },
      { key: 'score_motivacao',     label: 'Motivação',     tipo: 'numero' },
      { key: 'criado_em',           label: 'Data',          tipo: 'data'   },
    ],
  },
  planos: {
    label: 'Planos de Intervenção',
    campos: [
      { key: 'status',       label: 'Status',       tipo: 'texto'  },
      { key: 'score_inicio', label: 'Score inicial', tipo: 'numero' },
      { key: 'score_atual',  label: 'Score atual',   tipo: 'numero' },
      { key: 'meta_score',   label: 'Meta',          tipo: 'numero' },
      { key: 'tipo_plano',   label: 'Tipo',          tipo: 'texto'  },
      { key: 'criado_em',    label: 'Data',          tipo: 'data'   },
    ],
  },
  checkins: {
    label: 'Check-ins Familiares',
    campos: [
      { key: 'score_comunicacao', label: 'Comunicação', tipo: 'numero' },
      { key: 'score_social',      label: 'Social',      tipo: 'numero' },
      { key: 'score_atencao',     label: 'Atenção',     tipo: 'numero' },
      { key: 'score_regulacao',   label: 'Regulação',   tipo: 'numero' },
      { key: 'semana',            label: 'Semana',      tipo: 'numero' },
      { key: 'criado_em',         label: 'Data',        tipo: 'data'   },
    ],
  },
}

const OPERADORES = {
  texto:  [{ op: 'ilike', label: 'contém' }, { op: 'eq', label: 'igual a' }, { op: 'neq', label: 'diferente de' }],
  numero: [{ op: 'eq', label: '=' }, { op: 'gt', label: '>' }, { op: 'gte', label: '>=' }, { op: 'lt', label: '<' }, { op: 'lte', label: '<=' }],
  bool:   [{ op: 'eq', label: 'é' }],
  data:   [{ op: 'gte', label: 'depois de' }, { op: 'lte', label: 'antes de' }],
}

const METRICAS = [
  { key: 'count',  label: 'Contagem de registros' },
  { key: 'avg',    label: 'Média de campo numérico' },
  { key: 'sum',    label: 'Soma de campo numérico'  },
  { key: 'min',    label: 'Valor mínimo'            },
  { key: 'max',    label: 'Valor máximo'            },
]

function uid() { return Math.random().toString(36).slice(2, 8) }

// ── Page ──────────────────────────────────────────────────────────────────────
export default function AdminExplorerPage() {
  const [tabela,   setTabela]   = useState<keyof typeof TABELAS>('criancas')
  const [filtros,  setFiltros]  = useState<Filtro[]>([])
  const [metrica,  setMetrica]  = useState('count')
  const [campMet,  setCampMet]  = useState('')
  const [resultado, setResultado] = useState<ResultadoRow[] | null>(null)
  const [total,    setTotal]    = useState<number | null>(null)
  const [valorMet, setValorMet] = useState<number | null>(null)
  const [loading,  setLoading]  = useState(false)
  const [erro,     setErro]     = useState('')
  const [consultaDesc, setConsultaDesc] = useState('')

  const tabelaConfig = TABELAS[tabela]

  function adicionarFiltro() {
    const primeiroCampo = tabelaConfig.campos[0]
    const tipo = primeiroCampo.tipo as keyof typeof OPERADORES
    setFiltros(f => [...f, {
      id: uid(),
      campo: primeiroCampo.key,
      operador: OPERADORES[tipo][0].op,
      valor: '',
    }])
  }

  function atualizarFiltro(id: string, key: keyof Filtro, val: string) {
    setFiltros(f => f.map(fi => {
      if (fi.id !== id) return fi
      if (key === 'campo') {
        const campo = tabelaConfig.campos.find(c => c.key === val)
        const tipo  = (campo?.tipo ?? 'texto') as keyof typeof OPERADORES
        return { ...fi, campo: val, operador: OPERADORES[tipo][0].op, valor: '' }
      }
      return { ...fi, [key]: val }
    }))
  }

  function removerFiltro(id: string) {
    setFiltros(f => f.filter(fi => fi.id !== id))
  }

  async function executar() {
    setLoading(true)
    setErro('')
    setResultado(null)
    setTotal(null)
    setValorMet(null)

    try {
      let query = supabase.from(tabela).select('*', { count: 'exact' }).limit(100)

      for (const f of filtros) {
        if (!f.valor) continue
        const campo = tabelaConfig.campos.find(c => c.key === f.campo)
        let val: string | number | boolean = f.valor
        if (campo?.tipo === 'numero') val = parseFloat(f.valor)
        if (campo?.tipo === 'bool')   val = f.valor === 'true'
        if (f.operador === 'ilike')   val = `%${f.valor}%`

        query = (query as any)[f.operador](f.campo, val)
      }

      const { data, count, error } = await query
      if (error) { setErro(error.message); setLoading(false); return }

      setResultado(data ?? [])
      setTotal(count ?? 0)

      // Calcular métrica
      if (metrica !== 'count' && campMet && data && data.length > 0) {
        const vals = data.map((r: any) => r[campMet]).filter((v: any) => v !== null && v !== undefined) as number[]
        if (vals.length > 0) {
          if (metrica === 'avg') setValorMet(Math.round(vals.reduce((a, b) => a + b, 0) / vals.length * 10) / 10)
          if (metrica === 'sum') setValorMet(vals.reduce((a, b) => a + b, 0))
          if (metrica === 'min') setValorMet(Math.min(...vals))
          if (metrica === 'max') setValorMet(Math.max(...vals))
        }
      }

      // Gerar descrição da consulta
      const desc = `${tabelaConfig.label}${filtros.filter(f => f.valor).length > 0 ? ` com ${filtros.filter(f => f.valor).length} filtro(s)` : ''} — ${count ?? 0} registros encontrados`
      setConsultaDesc(desc)

    } catch (err: any) {
      setErro(err.message ?? 'Erro ao executar consulta')
    }
    setLoading(false)
  }

  function exportarCSV() {
    if (!resultado || resultado.length === 0) return
    const headers = Object.keys(resultado[0]).join(',')
    const rows    = resultado.map(r => Object.values(r).map(v => `"${v ?? ''}"`).join(',')).join('\n')
    const csv     = `${headers}\n${rows}`
    const blob    = new Blob([csv], { type: 'text/csv' })
    const url     = URL.createObjectURL(blob)
    const a       = document.createElement('a')
    a.href = url; a.download = `fracta_explorer_${tabela}.csv`; a.click()
  }

  const card: React.CSSProperties = {
    background: 'rgba(10,15,30,.7)',
    border: '1px solid rgba(99,179,237,.08)',
    borderRadius: 16, backdropFilter: 'blur(10px)',
  }

  const inp: React.CSSProperties = {
    padding: '9px 12px', borderRadius: 9,
    border: '1px solid rgba(99,179,237,.12)',
    background: 'rgba(99,179,237,.04)',
    color: '#e2e8f0', fontSize: 13,
    outline: 'none', fontFamily: 'inherit',
  }

  const colunas = resultado && resultado.length > 0 ? Object.keys(resultado[0]) : []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Header */}
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#fff', margin: 0, marginBottom: 6, letterSpacing: '-0.02em' }}>Explorer</h1>
        <div style={{ fontSize: 13, color: 'rgba(226,232,240,.4)' }}>Cruzamento e filtro visual de dados — sem precisar escrever SQL</div>
      </div>

      {/* Builder */}
      <div style={{ ...card, padding: '24px' }}>

        {/* Seleção de tabela */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, color: 'rgba(226,232,240,.35)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>1. Selecione a fonte de dados</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {(Object.entries(TABELAS) as [keyof typeof TABELAS, any][]).map(([key, t]) => (
              <button key={key} onClick={() => { setTabela(key); setFiltros([]); setResultado(null) }} style={{
                padding: '8px 14px', borderRadius: 9, cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: tabela === key ? 700 : 400,
                border: `1px solid ${tabela === key ? '#63b3ed44' : 'rgba(99,179,237,.1)'}`,
                background: tabela === key ? 'rgba(99,179,237,.12)' : 'transparent',
                color: tabela === key ? '#63b3ed' : 'rgba(226,232,240,.5)',
              }}>{t.label}</button>
            ))}
          </div>
        </div>

        {/* Filtros */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ fontSize: 11, color: 'rgba(226,232,240,.35)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>2. Adicione filtros</div>
            <button onClick={adicionarFiltro} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(99,179,237,.2)', background: 'rgba(99,179,237,.06)', color: '#63b3ed', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Adicionar filtro
            </button>
          </div>

          {filtros.length === 0 ? (
            <div style={{ padding: '16px', background: 'rgba(99,179,237,.03)', borderRadius: 10, border: '1px dashed rgba(99,179,237,.12)', textAlign: 'center', fontSize: 12, color: 'rgba(226,232,240,.25)' }}>
              Nenhum filtro — retorna todos os registros
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {filtros.map(f => {
                const campo = tabelaConfig.campos.find(c => c.key === f.campo)
                const tipo  = (campo?.tipo ?? 'texto') as keyof typeof OPERADORES
                const ops   = OPERADORES[tipo]
                return (
                  <div key={f.id} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {/* Campo */}
                    <select value={f.campo} onChange={e => atualizarFiltro(f.id, 'campo', e.target.value)} style={{ ...inp, flex: 2 }}>
                      {tabelaConfig.campos.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                    </select>
                    {/* Operador */}
                    <select value={f.operador} onChange={e => atualizarFiltro(f.id, 'operador', e.target.value)} style={{ ...inp, flex: 1 }}>
                      {ops.map(o => <option key={o.op} value={o.op}>{o.label}</option>)}
                    </select>
                    {/* Valor */}
                    {tipo === 'bool' ? (
                      <select value={f.valor} onChange={e => atualizarFiltro(f.id, 'valor', e.target.value)} style={{ ...inp, flex: 1 }}>
                        <option value="">Selecione</option>
                        <option value="true">Sim</option>
                        <option value="false">Não</option>
                      </select>
                    ) : (
                      <input
                        type={tipo === 'numero' ? 'number' : tipo === 'data' ? 'date' : 'text'}
                        value={f.valor}
                        onChange={e => atualizarFiltro(f.id, 'valor', e.target.value)}
                        placeholder="Valor..."
                        style={{ ...inp, flex: 2 }}
                      />
                    )}
                    {/* Remover */}
                    <button onClick={() => removerFiltro(f.id)} style={{ padding: '9px 10px', borderRadius: 8, border: '1px solid rgba(224,90,75,.2)', background: 'rgba(224,90,75,.06)', color: '#E05A4B', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Métrica */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, color: 'rgba(226,232,240,.35)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>3. Escolha a métrica de retorno</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <select value={metrica} onChange={e => setMetrica(e.target.value)} style={{ ...inp }}>
              {METRICAS.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
            </select>
            {metrica !== 'count' && (
              <select value={campMet} onChange={e => setCampMet(e.target.value)} style={{ ...inp }}>
                <option value="">Selecione o campo...</option>
                {tabelaConfig.campos.filter(c => c.tipo === 'numero').map(c => (
                  <option key={c.key} value={c.key}>{c.label}</option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Executar */}
        <button onClick={executar} disabled={loading} style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '12px 24px', borderRadius: 10, border: 'none',
          background: loading ? 'rgba(99,179,237,.2)' : 'linear-gradient(135deg, #1D9E75, #63b3ed)',
          color: loading ? 'rgba(255,255,255,.4)' : '#fff',
          fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
        }}>
          {loading ? (
            <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(255,255,255,.3)', borderTop: '2px solid #fff', animation: 'spin 1s linear infinite' }} />
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          )}
          {loading ? 'Executando...' : 'Executar consulta'}
        </button>
      </div>

      {/* Erro */}
      {erro && (
        <div style={{ padding: '14px 18px', background: 'rgba(224,90,75,.08)', border: '1px solid rgba(224,90,75,.2)', borderRadius: 12, fontSize: 13, color: '#fc8181' }}>
          {erro}
        </div>
      )}

      {/* Resultados */}
      {resultado !== null && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Resumo */}
          <div style={{ display: 'flex', gap: 12, alignItems: 'stretch' }}>
            <div style={{ ...card, padding: '16px 20px', flex: 1 }}>
              <div style={{ fontSize: 10, color: 'rgba(226,232,240,.35)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Registros encontrados</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#63b3ed' }}>{total ?? 0}</div>
              <div style={{ fontSize: 11, color: 'rgba(226,232,240,.3)', marginTop: 4 }}>{consultaDesc}</div>
            </div>
            {valorMet !== null && (
              <div style={{ ...card, padding: '16px 20px', flex: 1 }}>
                <div style={{ fontSize: 10, color: 'rgba(226,232,240,.35)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
                  {METRICAS.find(m => m.key === metrica)?.label ?? metrica}
                </div>
                <div style={{ fontSize: 28, fontWeight: 800, color: '#1D9E75' }}>{valorMet}</div>
              </div>
            )}
            <button onClick={exportarCSV} style={{ ...card, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', border: '1px solid rgba(99,179,237,.15)', color: '#63b3ed', fontSize: 13, fontWeight: 600, fontFamily: 'inherit', background: 'rgba(99,179,237,.06)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Exportar CSV
            </button>
          </div>

          {/* Tabela de resultados */}
          {resultado.length > 0 ? (
            <div style={{ ...card, overflow: 'auto', maxHeight: 480 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(99,179,237,.1)' }}>
                    {colunas.map(col => (
                      <th key={col} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10, color: 'rgba(226,232,240,.35)', textTransform: 'uppercase', letterSpacing: '0.08em', whiteSpace: 'nowrap', fontWeight: 700 }}>
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {resultado.map((row, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid rgba(99,179,237,.05)' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(99,179,237,.03)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      {colunas.map(col => {
                        const val = row[col]
                        const isNum  = typeof val === 'number'
                        const isBool = typeof val === 'boolean'
                        const isDate = typeof val === 'string' && val.includes('T') && val.includes('Z')
                        return (
                          <td key={col} style={{ padding: '10px 14px', color: isBool ? (val ? '#1D9E75' : '#E05A4B') : isNum ? '#63b3ed' : 'rgba(226,232,240,.7)', whiteSpace: 'nowrap', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {isBool ? (val ? 'Sim' : 'Não') : isDate ? new Date(val as string).toLocaleDateString('pt-BR') : val !== null ? String(val) : '—'}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
              {(total ?? 0) > 100 && (
                <div style={{ padding: '12px 16px', fontSize: 11, color: 'rgba(226,232,240,.3)', borderTop: '1px solid rgba(99,179,237,.06)', textAlign: 'center' }}>
                  Mostrando 100 de {total} registros. Exporte o CSV para ver todos.
                </div>
              )}
            </div>
          ) : (
            <div style={{ ...card, padding: '40px', textAlign: 'center', fontSize: 13, color: 'rgba(226,232,240,.3)' }}>
              Nenhum registro encontrado com esses filtros.
            </div>
          )}
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
