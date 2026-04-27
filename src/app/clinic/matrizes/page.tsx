'use client'

import { useState, useRef, useCallback } from 'react'
import { useClinicContext } from '../layout'
import { supabase } from '@/lib/supabase'

// ─── Tipos ────────────────────────────────────────────────────────────────────

type TipoMidia = 'imagem' | 'texto' | 'audio' | 'simbolo'

interface Coluna {
  id: string
  nome: string
  tipo: TipoMidia
}

interface Celula {
  colunaId: string
  valor: string       // texto ou URL
  arquivo?: File      // upload pendente
  preview?: string    // base64 para preview imediato
  uploading?: boolean
}

interface LinhaGrupo {
  id: string
  celulas: Record<string, Celula>  // colunaId → celula
}

interface Matriz {
  id: string
  nome: string
  descricao: string
  colunas: Coluna[]
  grupos: LinhaGrupo[]
  criatedAt: string
  isPublic: boolean
}

// ─── Mock inicial ─────────────────────────────────────────────────────────────

const MOCK_MATRIZES: Matriz[] = [
  {
    id: 'm1',
    nome: 'Frutas',
    descricao: 'Imagem, nome em português, inglês e cor',
    colunas: [
      { id: 'A', nome: 'Imagem', tipo: 'imagem' },
      { id: 'B', nome: 'Português', tipo: 'texto' },
      { id: 'C', nome: 'Inglês', tipo: 'texto' },
      { id: 'D', nome: 'Cor', tipo: 'simbolo' },
    ],
    grupos: [
      { id: 'g1', celulas: { A: { colunaId: 'A', valor: '' }, B: { colunaId: 'B', valor: 'Maçã' }, C: { colunaId: 'C', valor: 'Apple' }, D: { colunaId: 'D', valor: '🔴' } } },
      { id: 'g2', celulas: { A: { colunaId: 'A', valor: '' }, B: { colunaId: 'B', valor: 'Milho' }, C: { colunaId: 'C', valor: 'Corn' }, D: { colunaId: 'D', valor: '🟡' } } },
      { id: 'g3', celulas: { A: { colunaId: 'A', valor: '' }, B: { colunaId: 'B', valor: 'Pão' }, C: { colunaId: 'C', valor: 'Bread' }, D: { colunaId: 'D', valor: '🟤' } } },
    ],
    criatedAt: '2025-03-01',
    isPublic: false,
  },
  {
    id: 'm2',
    nome: 'Notas Musicais',
    descricao: 'Áudio da nota, nome, representação em inglês',
    colunas: [
      { id: 'A', nome: 'Áudio', tipo: 'audio' },
      { id: 'B', nome: 'Nota (PT)', tipo: 'texto' },
      { id: 'C', nome: 'Note (EN)', tipo: 'texto' },
    ],
    grupos: [
      { id: 'g1', celulas: { A: { colunaId: 'A', valor: '' }, B: { colunaId: 'B', valor: 'Dó' }, C: { colunaId: 'C', valor: 'C' } } },
      { id: 'g2', celulas: { A: { colunaId: 'A', valor: '' }, B: { colunaId: 'B', valor: 'Ré' }, C: { colunaId: 'C', valor: 'D' } } },
      { id: 'g3', celulas: { A: { colunaId: 'A', valor: '' }, B: { colunaId: 'B', valor: 'Mi' }, C: { colunaId: 'C', valor: 'E' } } },
      { id: 'g4', celulas: { A: { colunaId: 'A', valor: '' }, B: { colunaId: 'B', valor: 'Fá' }, C: { colunaId: 'C', valor: 'F' } } },
      { id: 'g5', celulas: { A: { colunaId: 'A', valor: '' }, B: { colunaId: 'B', valor: 'Sol' }, C: { colunaId: 'C', valor: 'G' } } },
    ],
    criatedAt: '2025-03-10',
    isPublic: false,
  },
]

const TIPO_MIDIA_CONFIG: Record<TipoMidia, { label: string; cor: string; bg: string; icone: string }> = {
  imagem:  { label: 'Imagem',  cor: '#378ADD', bg: 'rgba(55,138,221,0.12)',  icone: 'M3 3h10a1 1 0 011 1v8a1 1 0 01-1 1H3a1 1 0 01-1-1V4a1 1 0 011-1zM5 9l2-2 2 2 2-3' },
  texto:   { label: 'Texto',   cor: '#1D9E75', bg: 'rgba(29,158,117,0.12)',  icone: 'M2 4h12M2 8h9M2 12h6' },
  audio:   { label: 'Áudio',   cor: '#EF9F27', bg: 'rgba(239,159,39,0.12)',  icone: 'M8 2a3 3 0 013 3v4a3 3 0 01-6 0V5a3 3 0 013-3zM4 9a4 4 0 008 0M8 13v2M6 15h4' },
  simbolo: { label: 'Símbolo', cor: '#8B7FE8', bg: 'rgba(139,127,232,0.12)', icone: 'M8 2l2 4 4.5.7-3.2 3.1.7 4.5L8 12l-4 2.1.7-4.5L1.5 6.7 6 6z' },
}

function gerarId() {
  return Math.random().toString(36).slice(2, 9)
}

function novaMatrizVazia(): Matriz {
  const colA = { id: 'A', nome: 'Coluna A', tipo: 'imagem' as TipoMidia }
  const colB = { id: 'B', nome: 'Coluna B', tipo: 'texto' as TipoMidia }
  return {
    id: gerarId(),
    nome: '',
    descricao: '',
    colunas: [colA, colB],
    grupos: [
      { id: gerarId(), celulas: { A: { colunaId: 'A', valor: '' }, B: { colunaId: 'B', valor: '' } } },
    ],
    criatedAt: new Date().toISOString().slice(0, 10),
    isPublic: false,
  }
}

// ─── Ícone SVG inline ─────────────────────────────────────────────────────────

function Icon({ path, size = 14, color = 'currentColor' }: { path: string; size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d={path} />
    </svg>
  )
}

// ─── Célula do builder ────────────────────────────────────────────────────────

function CelulaEditor({
  celula, coluna, onChange,
}: {
  celula: Celula
  coluna: Coluna
  onChange: (nova: Celula) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  

  const s = {
    border: 'rgba(26,58,92,0.5)',
    text:   '#e8eef4',
    muted:  '#7a9ab5',
    navy:   '#07111f',
  }

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Preview imediato via base64
    const reader = new FileReader()
    reader.onload = (ev) => {
      onChange({ ...celula, arquivo: file, preview: ev.target?.result as string, uploading: true })
    }
    reader.readAsDataURL(file)

    // Upload para Supabase Storage
    const path = `stimulus-media/${gerarId()}-${file.name}`
    const { data, error } = await supabase.storage
      .from('stimulus-media')
      .upload(path, file, { upsert: true })

    if (!error && data) {
      const { data: urlData } = supabase.storage.from('stimulus-media').getPublicUrl(data.path)
      onChange({ ...celula, valor: urlData.publicUrl, arquivo: undefined, uploading: false })
    } else {
      // Mantém preview mesmo se upload falhar (offline mode)
      onChange({ ...celula, uploading: false })
    }
  }, [celula, onChange, supabase])

  if (coluna.tipo === 'imagem') {
    const cfg = TIPO_MIDIA_CONFIG.imagem
    const temImagem = celula.preview || celula.valor

    return (
      <div
        onClick={() => inputRef.current?.click()}
        style={{
          width: '100%', minHeight: 72, borderRadius: 7, cursor: 'pointer',
          border: `1px dashed ${temImagem ? cfg.cor : s.border}`,
          background: temImagem ? 'transparent' : cfg.bg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden', position: 'relative', transition: 'all 0.15s',
        }}
      >
        {temImagem ? (
          <>
            <img
              src={celula.preview || celula.valor}
              alt=""
              style={{ width: '100%', height: 72, objectFit: 'cover', borderRadius: 6 }}
            />
            {celula.uploading && (
              <div style={{
                position: 'absolute', inset: 0, background: 'rgba(7,17,31,0.6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, color: '#fff',
              }}>
                Enviando...
              </div>
            )}
          </>
        ) : (
          <div style={{ textAlign: 'center', color: cfg.cor }}>
            <Icon path={cfg.icone} size={18} color={cfg.cor} />
            <div style={{ fontSize: 10, marginTop: 4 }}>Clique para enviar</div>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
      </div>
    )
  }

  if (coluna.tipo === 'audio') {
    const cfg = TIPO_MIDIA_CONFIG.audio
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div
          onClick={() => inputRef.current?.click()}
          style={{
            padding: '8px 10px', borderRadius: 7, cursor: 'pointer',
            border: `1px dashed ${celula.valor ? cfg.cor : s.border}`,
            background: cfg.bg, display: 'flex', alignItems: 'center', gap: 6,
            color: celula.valor ? cfg.cor : s.muted, fontSize: 12,
          }}
        >
          <Icon path={cfg.icone} size={14} color={cfg.cor} />
          {celula.valor ? 'Áudio carregado' : 'Enviar áudio'}
        </div>
        {celula.valor && (
          <audio controls src={celula.valor} style={{ width: '100%', height: 28, borderRadius: 4 }} />
        )}
        <input ref={inputRef} type="file" accept="audio/*" style={{ display: 'none' }} onChange={handleFileChange} />
      </div>
    )
  }

  // texto e símbolo
  return (
    <input
      type="text"
      value={celula.valor}
      placeholder={coluna.tipo === 'simbolo' ? 'Ex: 🔴' : 'Digite...'}
      onChange={e => onChange({ ...celula, valor: e.target.value })}
      style={{
        width: '100%', padding: '8px 10px', fontSize: 13, color: s.text,
        background: 'rgba(255,255,255,0.03)', border: `1px solid ${s.border}`,
        borderRadius: 7, outline: 'none', boxSizing: 'border-box',
        fontFamily: 'var(--font-sans, system-ui)',
      }}
    />
  )
}

// ─── Editor de matriz ─────────────────────────────────────────────────────────

function MatrizEditor({
  matriz, onSave, onCancel,
}: {
  matriz: Matriz
  onSave: (m: Matriz) => void
  onCancel: () => void
}) {
  const [m, setM] = useState<Matriz>(matriz)

  const s = {
    border: 'rgba(26,58,92,0.5)',
    card:   'rgba(13,32,53,0.85)',
    teal:   '#1D9E75',
    blue:   '#378ADD',
    amber:  '#EF9F27',
    coral:  '#E05A4B',
    purple: '#8B7FE8',
    text:   '#e8eef4',
    muted:  '#7a9ab5',
    navy:   '#07111f',
  }

  // ── Colunas ──

  const addColuna = () => {
    const ids = ['A','B','C','D','E','F','G','H','I','J']
    const novoId = ids[m.colunas.length] ?? gerarId()
    const novaCol: Coluna = { id: novoId, nome: `Coluna ${novoId}`, tipo: 'texto' }
    const novosGrupos = m.grupos.map(g => ({
      ...g,
      celulas: { ...g.celulas, [novoId]: { colunaId: novoId, valor: '' } },
    }))
    setM({ ...m, colunas: [...m.colunas, novaCol], grupos: novosGrupos })
  }

  const removeColuna = (colunaId: string) => {
    if (m.colunas.length <= 1) return
    const novasColunas = m.colunas.filter(c => c.id !== colunaId)
    const novosGrupos = m.grupos.map(g => {
      const { [colunaId]: _, ...resto } = g.celulas
      return { ...g, celulas: resto }
    })
    setM({ ...m, colunas: novasColunas, grupos: novosGrupos })
  }

  const updateColuna = (colunaId: string, campo: Partial<Coluna>) => {
    setM({ ...m, colunas: m.colunas.map(c => c.id === colunaId ? { ...c, ...campo } : c) })
  }

  // ── Grupos/linhas ──

  const addGrupo = () => {
    const novoCelulas: Record<string, Celula> = {}
    m.colunas.forEach(c => { novoCelulas[c.id] = { colunaId: c.id, valor: '' } })
    setM({ ...m, grupos: [...m.grupos, { id: gerarId(), celulas: novoCelulas }] })
  }

  const removeGrupo = (grupoId: string) => {
    if (m.grupos.length <= 1) return
    setM({ ...m, grupos: m.grupos.filter(g => g.id !== grupoId) })
  }

  const updateCelula = (grupoId: string, colunaId: string, nova: Celula) => {
    setM({
      ...m,
      grupos: m.grupos.map(g =>
        g.id === grupoId ? { ...g, celulas: { ...g.celulas, [colunaId]: nova } } : g
      ),
    })
  }

  const colWidth = Math.max(140, Math.floor(600 / m.colunas.length))

  return (
    <div style={{ background: s.card, border: `1px solid ${s.border}`, borderRadius: 12, overflow: 'hidden' }}>

      {/* Header */}
      <div style={{ padding: '18px 24px', borderBottom: `1px solid ${s.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ flex: 1, marginRight: 16 }}>
          <input
            type="text"
            value={m.nome}
            placeholder="Nome da matriz (ex: Frutas, Funcionários da escola...)"
            onChange={e => setM({ ...m, nome: e.target.value })}
            style={{
              fontSize: 15, fontWeight: 500, color: s.text, background: 'transparent',
              border: 'none', outline: 'none', width: '100%',
              fontFamily: 'var(--font-sans, system-ui)',
            }}
          />
          <input
            type="text"
            value={m.descricao}
            placeholder="Descrição curta (opcional)"
            onChange={e => setM({ ...m, descricao: e.target.value })}
            style={{
              fontSize: 12, color: s.muted, background: 'transparent',
              border: 'none', outline: 'none', width: '100%', marginTop: 4,
              fontFamily: 'var(--font-sans, system-ui)',
            }}
          />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={onCancel}
            style={{ fontSize: 12, padding: '6px 14px', borderRadius: 7, background: 'transparent', border: `1px solid ${s.border}`, color: s.muted, cursor: 'pointer' }}
          >
            Cancelar
          </button>
          <button
            onClick={() => onSave(m)}
            style={{ fontSize: 12, padding: '6px 14px', borderRadius: 7, background: s.teal, border: 'none', color: '#fff', cursor: 'pointer', fontWeight: 500 }}
          >
            Salvar matriz
          </button>
        </div>
      </div>

      {/* Configuração de colunas */}
      <div style={{ padding: '16px 24px', borderBottom: `1px solid ${s.border}`, background: 'rgba(0,0,0,0.15)' }}>
        <div style={{ fontSize: 10, color: s.muted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>
          Colunas — defina o nome e o tipo de mídia de cada coluna
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          {m.colunas.map((col, idx) => {
            const cfg = TIPO_MIDIA_CONFIG[col.tipo]
            return (
              <div key={col.id} style={{
                background: 'rgba(255,255,255,0.03)', border: `1px solid ${s.border}`,
                borderRadius: 9, padding: '10px 12px', minWidth: 160,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 10, color: s.muted, fontFamily: 'monospace' }}>Col {col.id}</span>
                  {m.colunas.length > 1 && (
                    <button
                      onClick={() => removeColuna(col.id)}
                      style={{ background: 'transparent', border: 'none', color: s.muted, cursor: 'pointer', padding: 0, fontSize: 14, lineHeight: 1 }}
                    >
                      ×
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={col.nome}
                  onChange={e => updateColuna(col.id, { nome: e.target.value })}
                  style={{
                    fontSize: 12, color: s.text, background: 'rgba(255,255,255,0.04)',
                    border: `1px solid ${s.border}`, borderRadius: 6, padding: '5px 8px',
                    outline: 'none', width: '100%', boxSizing: 'border-box', marginBottom: 8,
                    fontFamily: 'var(--font-sans, system-ui)',
                  }}
                />
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {(Object.keys(TIPO_MIDIA_CONFIG) as TipoMidia[]).map(tipo => {
                    const tc = TIPO_MIDIA_CONFIG[tipo]
                    const ativo = col.tipo === tipo
                    return (
                      <button
                        key={tipo}
                        onClick={() => updateColuna(col.id, { tipo })}
                        style={{
                          fontSize: 10, padding: '3px 8px', borderRadius: 20, cursor: 'pointer',
                          border: `1px solid ${ativo ? tc.cor : s.border}`,
                          background: ativo ? tc.bg : 'transparent',
                          color: ativo ? tc.cor : s.muted,
                        }}
                      >
                        {tc.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}

          {/* Botão nova coluna */}
          <button
            onClick={addColuna}
            style={{
              fontSize: 12, padding: '10px 16px', borderRadius: 9, cursor: 'pointer',
              border: `1px dashed ${s.border}`, background: 'transparent', color: s.muted,
              display: 'flex', alignItems: 'center', gap: 6, alignSelf: 'stretch',
            }}
          >
            + Coluna
          </button>
        </div>
      </div>

      {/* Tabela de grupos */}
      <div style={{ padding: 24, overflowX: 'auto' }}>
        <div style={{ fontSize: 10, color: s.muted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>
          Grupos de estímulos — cada linha é um conjunto relacionado
        </div>

        {/* Header da tabela */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 8, paddingLeft: 40 }}>
          {m.colunas.map(col => {
            const cfg = TIPO_MIDIA_CONFIG[col.tipo]
            return (
              <div key={col.id} style={{ width: colWidth, flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                  <Icon path={cfg.icone} size={11} color={cfg.cor} />
                  <span style={{ fontSize: 11, color: s.text, fontWeight: 500 }}>{col.nome}</span>
                </div>
                <div style={{ height: 2, borderRadius: 2, background: cfg.cor, opacity: 0.4 }} />
              </div>
            )
          })}
        </div>

        {/* Linhas */}
        {m.grupos.map((grupo, idx) => (
          <div key={grupo.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
            {/* Número da linha */}
            <div style={{
              width: 32, height: 32, borderRadius: 6, background: 'rgba(255,255,255,0.04)',
              border: `1px solid ${s.border}`, display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: 11, color: s.muted, flexShrink: 0, marginTop: 4,
            }}>
              {idx + 1}
            </div>

            {/* Células */}
            {m.colunas.map(col => (
              <div key={col.id} style={{ width: colWidth, flexShrink: 0 }}>
                <CelulaEditor
                  celula={grupo.celulas[col.id] ?? { colunaId: col.id, valor: '' }}
                  coluna={col}
                  onChange={nova => updateCelula(grupo.id, col.id, nova)}
                />
              </div>
            ))}

            {/* Remover linha */}
            <button
              onClick={() => removeGrupo(grupo.id)}
              style={{
                background: 'transparent', border: 'none', color: s.muted,
                cursor: 'pointer', fontSize: 16, padding: '4px 6px', marginTop: 4,
                opacity: m.grupos.length <= 1 ? 0.2 : 0.6,
              }}
            >
              ×
            </button>
          </div>
        ))}

        {/* Adicionar linha */}
        <button
          onClick={addGrupo}
          style={{
            marginTop: 4, fontSize: 12, padding: '8px 16px', borderRadius: 8,
            border: `1px dashed ${s.border}`, background: 'transparent', color: s.muted,
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
          }}
        >
          + Adicionar grupo de estímulos
        </button>
      </div>
    </div>
  )
}

// ─── Card de matriz na lista ──────────────────────────────────────────────────

function MatrizCard({ matriz, onEditar, onSelecionar, selecionada }: {
  matriz: Matriz
  onEditar: () => void
  onSelecionar: () => void
  selecionada: boolean
}) {
  const s = {
    border: 'rgba(26,58,92,0.5)',
    card:   'rgba(13,32,53,0.85)',
    teal:   '#1D9E75',
    text:   '#e8eef4',
    muted:  '#7a9ab5',
  }

  return (
    <div
      onClick={onSelecionar}
      style={{
        background: selecionada ? 'rgba(13,32,53,0.95)' : s.card,
        border: `1px solid ${selecionada ? s.teal : s.border}`,
        borderRadius: 10, padding: 16, cursor: 'pointer', transition: 'all 0.15s',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 500, color: s.text }}>{matriz.nome}</div>
          {matriz.descricao && (
            <div style={{ fontSize: 11, color: s.muted, marginTop: 2 }}>{matriz.descricao}</div>
          )}
        </div>
        <button
          onClick={e => { e.stopPropagation(); onEditar() }}
          style={{ fontSize: 11, padding: '3px 10px', borderRadius: 6, background: 'transparent', border: `1px solid ${s.border}`, color: s.muted, cursor: 'pointer' }}
        >
          Editar
        </button>
      </div>

      {/* Preview das colunas */}
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 10 }}>
        {matriz.colunas.map(col => {
          const cfg = TIPO_MIDIA_CONFIG[col.tipo]
          return (
            <span key={col.id} style={{
              fontSize: 10, padding: '2px 8px', borderRadius: 20,
              background: cfg.bg, color: cfg.cor, border: `1px solid ${cfg.cor}30`,
            }}>
              {col.nome}
            </span>
          )
        })}
      </div>

      <div style={{ display: 'flex', gap: 16 }}>
        <div style={{ fontSize: 11, color: s.muted }}>
          <span style={{ color: s.text, fontWeight: 500 }}>{matriz.colunas.length}</span> colunas
        </div>
        <div style={{ fontSize: 11, color: s.muted }}>
          <span style={{ color: s.text, fontWeight: 500 }}>{matriz.grupos.length}</span> grupos
        </div>
        <div style={{ fontSize: 11, color: s.muted }}>
          {matriz.criatedAt}
        </div>
      </div>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function MatrizesPage() {
  useClinicContext()
  const { terapeuta } = useClinicContext()
  const [matrizes, setMatrizes] = useState<Matriz[]>(MOCK_MATRIZES)
  const [editando, setEditando] = useState<Matriz | null>(null)
  const [selecionada, setSelecionada] = useState<string | null>(null)
  const [busca, setBusca] = useState('')

  const s = {
    navy:   '#07111f',
    card:   'rgba(13,32,53,0.85)',
    border: 'rgba(26,58,92,0.5)',
    teal:   '#1D9E75',
    blue:   '#378ADD',
    amber:  '#EF9F27',
    coral:  '#E05A4B',
    purple: '#8B7FE8',
    text:   '#e8eef4',
    muted:  '#7a9ab5',
  }

  const matrizesFiltradas = matrizes.filter(m =>
    m.nome.toLowerCase().includes(busca.toLowerCase()) ||
    m.descricao.toLowerCase().includes(busca.toLowerCase())
  )

  const handleSave = async (m: Matriz) => {
    if (!terapeuta) return

    const payload = {
      name: m.nome,
      description: m.descricao,
      total_groups: m.grupos.length,
      columns: m.colunas,
      is_public: false,
      created_by: terapeuta.id,
    }

    // Upsert na stimulus_matrices
    const { data, error } = await supabase
      .from('stimulus_matrices')
      .upsert({ id: m.id, ...payload }, { onConflict: 'id' })
      .select('id')
      .single()

    if (error) {
      console.error('Erro ao salvar matriz:', error)
      alert('Erro ao salvar matriz. Verifique o console.')
      return
    }

    // Salva células
    const celulas = m.grupos.flatMap((grupo, grupIdx) =>
      m.colunas.map(col => ({
        matrix_id: data.id,
        group_index: grupIdx + 1,
        column_id: col.id,
        inline_type: col.tipo,
        inline_label: grupo.celulas[col.id]?.valor ?? '',
      }))
    )

    await supabase
      .from('stimulus_matrix_cells')
      .delete()
      .eq('matrix_id', data.id)

    if (celulas.length > 0) {
      await supabase.from('stimulus_matrix_cells').insert(celulas)
    }

    setMatrizes(prev => {
      const existe = prev.find(x => x.id === m.id)
      return existe ? prev.map(x => x.id === m.id ? m : x) : [m, ...prev]
    })
    setEditando(null)
  }

  const handleNova = () => {
    setEditando(novaMatrizVazia())
  }

  if (editando) {
    return (
      <div style={{ minHeight: '100vh', background: s.navy, color: s.text, fontFamily: 'var(--font-sans, system-ui, sans-serif)', padding: 28 }}>
        {/* Topbar editor */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <button
            onClick={() => setEditando(null)}
            style={{ fontSize: 12, padding: '6px 12px', borderRadius: 7, background: 'transparent', border: `1px solid ${s.border}`, color: s.muted, cursor: 'pointer' }}
          >
            ← Voltar
          </button>
          <div style={{ fontSize: 14, fontWeight: 500 }}>
            {editando.nome || 'Nova matriz de estímulos'}
          </div>
        </div>
        <MatrizEditor
          matriz={editando}
          onSave={handleSave}
          onCancel={() => setEditando(null)}
        />
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: s.navy, color: s.text, fontFamily: 'var(--font-sans, system-ui, sans-serif)' }}>

      {/* Topbar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 28px', borderBottom: `1px solid ${s.border}`,
        background: 'rgba(7,17,31,0.96)', position: 'sticky', top: 0, zIndex: 20,
      }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 500 }}>Matrizes de Estímulos</div>
          <div style={{ fontSize: 12, color: s.muted, marginTop: 2 }}>
            Biblioteca global · reutilizável em qualquer programa de ensino
          </div>
        </div>
        <button
          onClick={handleNova}
          style={{ fontSize: 12, padding: '7px 16px', borderRadius: 7, background: s.teal, border: 'none', color: '#fff', cursor: 'pointer', fontWeight: 500 }}
        >
          + Nova matriz
        </button>
      </div>

      <div style={{ padding: '24px 28px' }}>

        {/* Busca */}
        <div style={{ marginBottom: 20 }}>
          <input
            type="text"
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Buscar matrizes..."
            style={{
              width: 280, padding: '8px 14px', fontSize: 13, color: s.text,
              background: s.card, border: `1px solid ${s.border}`,
              borderRadius: 8, outline: 'none', fontFamily: 'var(--font-sans, system-ui)',
            }}
          />
        </div>

        {matrizesFiltradas.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '60px 20px',
            border: `1px dashed ${s.border}`, borderRadius: 12, color: s.muted,
          }}>
            <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.3 }}>⊞</div>
            <div style={{ fontWeight: 500, color: s.text, marginBottom: 6 }}>Nenhuma matriz encontrada</div>
            <div style={{ fontSize: 13, marginBottom: 16 }}>Crie sua primeira matriz de estímulos para começar</div>
            <button
              onClick={handleNova}
              style={{ fontSize: 12, padding: '8px 18px', borderRadius: 8, background: s.teal, border: 'none', color: '#fff', cursor: 'pointer' }}
            >
              + Nova matriz
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
            {matrizesFiltradas.map(m => (
              <MatrizCard
                key={m.id}
                matriz={m}
                selecionada={selecionada === m.id}
                onSelecionar={() => setSelecionada(m.id)}
                onEditar={() => setEditando(m)}
              />
            ))}
            {/* Card nova matriz */}
            <div
              onClick={handleNova}
              style={{
                background: 'transparent', border: `1px dashed ${s.border}`,
                borderRadius: 10, padding: 16, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: 8, color: s.muted, fontSize: 13, minHeight: 120,
              }}
            >
              <span style={{ fontSize: 20, lineHeight: 1 }}>+</span> Nova matriz
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
