'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useClinicContext } from '../layout'

// ── TIPOS ─────────────────────────────────────────────────────────────────
type SenioridadeNivel = 'terapeuta' | 'coordenador' | 'supervisor'
interface SessaoHoje {
  id: string
  paciente: string
  iniciais: string
  cor: string
  tipo: string
  programas: number
  horario: string
  status: 'agora' | 'proxima' | 'concluida'
}
interface PacienteEvolucao {
  id: string
  nome: string
  iniciais: string
  cor: string
  dominios: string
  pct: number
  corBarra: string
}
interface Programa {
  id: string
  nome: string
  paciente: string
  operantes: number
  dominio_pct: number
  status: 'ativo' | 'revisar' | 'pausado'
  cor: string
}
interface AlertaEngine {
  id: string
  tipo: 'critico' | 'aviso' | 'ok' | 'info' | 'neutro'
  texto: string
  tempo: string
}

// ── HELPERS ────────────────────────────────────────────────────────────────
const CORES_DOMINIO: Record<string, string> = {
  comunicacao:   '#1D9E75',
  social:        '#378ADD',
  atencao:       '#8B7FE8',
  regulacao:     '#E05A4B',
  brincadeira:   '#EF9F27',
  flexibilidade: '#23c48f',
  autonomia:     '#4d9de0',
  motivacao:     '#e8a838',
}
const CORES_CARD = [
  'rgba(29,158,117,.2)',
  'rgba(55,138,221,.15)',
  'rgba(139,127,232,.15)',
  'rgba(224,90,75,.15)',
  'rgba(239,159,39,.15)',
]
function iniciais(nome: string) {
  const p = nome.trim().split(' ')
  return p.length >= 2
    ? `${p[0][0]}${p[p.length - 1][0]}`.toUpperCase()
    : nome.slice(0, 2).toUpperCase()
}
function tempoRelativo(data: string) {
  const diff = Date.now() - new Date(data).getTime()
  const h = Math.floor(diff / 3600000)
  if (h < 1) return 'agora'
  if (h < 24) return `há ${h}h`
  const d = Math.floor(h / 24)
  if (d === 1) return 'ontem'
  return `há ${d} dias`
}

const NIVEL_BANNER: Record<SenioridadeNivel, { label: string; cor: string; bg: string; desc: string }> = {
  terapeuta:    { label: 'Terapeuta',       cor: '#1D9E75', bg: 'rgba(29,158,117,.12)',  desc: 'Modo guiado — programas e orientações detalhadas' },
  coordenador:  { label: 'Coord. de Caso',  cor: '#EF9F27', bg: 'rgba(239,159,39,.12)',  desc: 'Modo semi-guiado — autonomia com suporte clínico' },
  supervisor:   { label: 'Supervisor',      cor: '#8B7FE8', bg: 'rgba(139,127,232,.12)', desc: 'Modo livre — acesso completo ao sistema' },
}

// ── COMPONENT ──────────────────────────────────────────────────────────────
export default function ClinicDashboard() {
  const { terapeuta } = useClinicContext()
  const [sessoes,   setSessoes]   = useState<SessaoHoje[]>([])
  const [pacientes, setPacientes] = useState<PacienteEvolucao[]>([])
  const [programas, setProgramas] = useState<Programa[]>([])
  const [alertas,   setAlertas]   = useState<AlertaEngine[]>([])
  const [loading,   setLoading]   = useState(true)
  const [isMobile,  setIsMobile]  = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    if (!terapeuta) return
    async function carregar() {
      setLoading(true)
      try {
        const terapeutaId = terapeuta!.id

        // ── 1. Planos ativos do terapeuta com criança e programa ──────────
        const { data: planosData } = await supabase
          .from('planos')
          .select(`
            id,
            status,
            score_atual,
            criancas ( id, nome ),
            programas ( id, nome, dominio, tipo )
          `)
          .eq('terapeuta_id', terapeutaId)
          .in('status', ['ativo', 'pausado'])
          .order('criado_em', { ascending: false })
          .limit(20)

        if (planosData && planosData.length > 0) {

          // ── Programas ──────────────────────────────────────────────────
          const progs: Programa[] = planosData
            .filter(pl => pl.programas && pl.criancas)
            .slice(0, 5)
            .map((pl, i) => {
              const prog = pl.programas as any
              const cri  = pl.criancas  as any
              const domPct = pl.score_atual ?? 50
              const st = pl.status === 'pausado' ? 'pausado'
                : domPct < 55 ? 'revisar' : 'ativo'
              return {
                id: pl.id,
                nome: prog.nome,
                paciente: cri.nome.split(' ')[0],
                operantes: Math.floor(Math.random() * 3) + 2, // será substituído quando tabela operantes existir
                dominio_pct: domPct,
                status: st as 'ativo' | 'revisar' | 'pausado',
                cor: CORES_DOMINIO[prog.dominio] ?? '#1D9E75',
              }
            })
          setProgramas(progs)

          // ── Pacientes únicos com radar ─────────────────────────────────
          const criancasMap = new Map<string, any>()
          for (const pl of planosData) {
            if (pl.criancas) {
              const c = pl.criancas as any
              if (!criancasMap.has(c.id)) criancasMap.set(c.id, { ...c, planos: [] })
              criancasMap.get(c.id).planos.push(pl)
            }
          }
          const criancasIds = Array.from(criancasMap.keys())

          // Buscar radar de cada criança
          const { data: radares } = await supabase
            .from('radar_snapshots')
            .select('crianca_id, score_comunicacao, score_social, score_atencao, score_regulacao, score_brincadeira, score_flexibilidade, score_autonomia, score_motivacao, criado_em')
            .in('crianca_id', criancasIds)
            .order('criado_em', { ascending: false })

          // Pegar radar mais recente por criança
          const radarPorCrianca = new Map<string, any>()
          for (const r of (radares ?? [])) {
            if (!radarPorCrianca.has(r.crianca_id)) radarPorCrianca.set(r.crianca_id, r)
          }

          const pacs: PacienteEvolucao[] = Array.from(criancasMap.values())
            .slice(0, 5)
            .map((c, i) => {
              const radar = radarPorCrianca.get(c.id)
              const scores = radar ? [
                radar.score_comunicacao, radar.score_social, radar.score_atencao,
                radar.score_regulacao, radar.score_brincadeira, radar.score_flexibilidade,
                radar.score_autonomia, radar.score_motivacao,
              ].filter(Boolean) : []
              const pct = scores.length > 0
                ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length)
                : 50

              // Domínios mais baixos como foco
              const dominioNomes: Record<string, string> = {
                score_comunicacao: 'Comunicação', score_social: 'Social',
                score_atencao: 'Atenção', score_regulacao: 'Regulação',
                score_brincadeira: 'Brincadeira', score_flexibilidade: 'Flexibilidade',
              }
              const dominiosFoco = radar
                ? Object.entries(dominioNomes)
                    .map(([k, v]) => ({ nome: v, val: radar[k] ?? 100 }))
                    .sort((a, b) => a.val - b.val)
                    .slice(0, 3)
                    .map(d => d.nome)
                    .join(' · ')
                : 'Aguardando avaliação'

              const cores = ['#1D9E75','#378ADD','#8B7FE8','#EF9F27','#E05A4B']
              return {
                id: c.id,
                nome: c.nome,
                iniciais: iniciais(c.nome),
                cor: CORES_CARD[i % CORES_CARD.length],
                dominios: dominiosFoco,
                pct,
                corBarra: cores[i % cores.length],
              }
            })
          setPacientes(pacs)

          // ── Sessões clínicas recentes → mapear para "hoje" ─────────────
          const { data: sessoesData } = await supabase
            .from('sessoes_clinicas')
            .select('id, crianca_id, concluida, criado_em, plano_id')
            .in('crianca_id', criancasIds)
            .order('criado_em', { ascending: false })
            .limit(10)

          if (sessoesData && sessoesData.length > 0) {
            const sess: SessaoHoje[] = sessoesData.slice(0, 4).map((s, i) => {
              const cri = criancasMap.get(s.crianca_id)
              const nome = cri?.nome ?? 'Paciente'
              const planosSessao = cri?.planos ?? []
              const prog = planosSessao[0]?.programas as any
              const tipo = prog ? `${prog.tipo?.toUpperCase() ?? 'DTT'} · ${prog.nome}` : 'Sessão clínica'
              const status: 'agora' | 'proxima' | 'concluida' = s.concluida ? 'concluida' : i === 0 ? 'agora' : 'proxima'
              const horaCriado = new Date(s.criado_em)
              const hFim = new Date(horaCriado.getTime() + 60 * 60000)
              const fmt = (d: Date) => d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
              return {
                id: s.id,
                paciente: nome,
                iniciais: iniciais(nome),
                cor: CORES_CARD[i % CORES_CARD.length],
                tipo,
                programas: planosSessao.length,
                horario: `${fmt(horaCriado)}–${fmt(hFim)}`,
                status,
              }
            })
            setSessoes(sess)
          } else {
            setSessoes([])
          }

          // ── Alertas gerados a partir dos dados ────────────────────────
          const als: AlertaEngine[] = []
          for (const pl of planosData.slice(0, 5)) {
            const prog = pl.programas as any
            const cri  = pl.criancas  as any
            if (!prog || !cri) continue
            const score = pl.score_atual ?? 50
            const nome  = cri.nome.split(' ')[0]
            if (score < 50) {
              als.push({
                id: pl.id + '_critico',
                tipo: 'critico',
                texto: `<strong>${nome}</strong> com score baixo em ${prog.nome}. Revisar critério.`,
                tempo: 'hoje',
              })
            } else if (score >= 80) {
              als.push({
                id: pl.id + '_aviso',
                tipo: 'aviso',
                texto: `<strong>${nome}</strong> atingiu ${score}% em ${prog.nome}. Pronto para progressão.`,
                tempo: 'hoje',
              })
            }
          }
          if (als.length === 0) {
            als.push({
              id: 'ok_geral',
              tipo: 'ok',
              texto: 'Todos os casos dentro do esperado. Bom trabalho!',
              tempo: 'agora',
            })
          }
          setAlertas(als)

        } else {
          // Sem planos ainda — limpa tudo
          setSessoes([])
          setPacientes([])
          setProgramas([])
          setAlertas([{
            id: 'sem_dados',
            tipo: 'info',
            texto: 'Nenhum paciente vinculado ainda. Acesse <strong>Pacientes</strong> para adicionar.',
            tempo: 'agora',
          }])
        }
      } catch (err) {
        console.error('Erro ao carregar dashboard:', err)
        setAlertas([{
          id: 'erro',
          tipo: 'critico',
          texto: 'Erro ao carregar dados. Verifique sua conexão.',
          tempo: 'agora',
        }])
      }
      setLoading(false)
    }
    carregar()
  }, [terapeuta])

  const nivel  = terapeuta?.nivel ?? 'coordenador'
  const banner = NIVEL_BANNER[nivel]

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 13, color: 'rgba(160,200,235,.90)', marginTop: 16 }}>Carregando painel clínico...</div>
        </div>
      </div>
    )
  }

  // ── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: isMobile ? '20px 16px 80px' : '28px 32px', maxWidth: 1200 }}>

      {/* Banner de nível */}
      <div style={{
        background: banner.bg,
        border: `1px solid ${banner.cor}33`,
        borderRadius: 12,
        padding: '14px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        marginBottom: 28,
      }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: banner.cor, flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: banner.cor }}>{banner.label}</span>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,.45)', marginLeft: 10 }}>{banner.desc}</span>
        </div>
      </div>

      {/* Grid principal */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 20, marginBottom: 20 }}>

        {/* Sessões de hoje */}
        <div style={{ background: 'rgba(13,32,53,.75)', border: '1px solid rgba(26,58,92,.5)', borderRadius: 14, padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,.85)' }}>Sessões recentes</span>
            <Link href="/clinic/agenda" style={{ fontSize: 11, color: '#378ADD', textDecoration: 'none' }}>Ver agenda →</Link>
          </div>
          {sessoes.length === 0 ? (
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,.3)', textAlign: 'center', padding: '24px 0' }}>
              Nenhuma sessão registrada ainda
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {sessoes.map(s => (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: s.cor, borderRadius: 10 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(255,255,255,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                    {s.iniciais}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,.9)', marginBottom: 2 }}>{s.paciente}</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,.45)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.tipo}</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,.5)', marginBottom: 3 }}>{s.horario}</div>
                    <span style={{
                      fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 5,
                      background: s.status === 'agora' ? 'rgba(29,158,117,.3)' : s.status === 'concluida' ? 'rgba(255,255,255,.08)' : 'rgba(55,138,221,.2)',
                      color: s.status === 'agora' ? '#1D9E75' : s.status === 'concluida' ? 'rgba(255,255,255,.3)' : '#378ADD',
                    }}>
                      {s.status === 'agora' ? 'Agora' : s.status === 'concluida' ? 'Concluída' : 'Próxima'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Alertas do Engine */}
        <div style={{ background: 'rgba(13,32,53,.75)', border: '1px solid rgba(26,58,92,.5)', borderRadius: 14, padding: '20px' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,.85)', marginBottom: 16 }}>
            FractaEngine · Alertas
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {alertas.map(a => {
              const corMap = { critico: '#E05A4B', aviso: '#EF9F27', ok: '#1D9E75', info: '#378ADD', neutro: 'rgba(255,255,255,.3)' }
              const cor = corMap[a.tipo]
              return (
                <div key={a.id} style={{ display: 'flex', gap: 10, padding: '10px 12px', background: `${cor}11`, border: `1px solid ${cor}25`, borderRadius: 10 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: cor, marginTop: 5, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,.75)', lineHeight: 1.5 }} dangerouslySetInnerHTML={{ __html: a.texto }} />
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,.3)', marginTop: 3 }}>{a.tempo}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Pacientes em evolução */}
      <div style={{ background: 'rgba(13,32,53,.75)', border: '1px solid rgba(26,58,92,.5)', borderRadius: 14, padding: '20px', marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,.85)' }}>Pacientes · Evolução geral</span>
          <Link href="/clinic/pacientes" style={{ fontSize: 11, color: '#378ADD', textDecoration: 'none' }}>Ver todos →</Link>
        </div>
        {pacientes.length === 0 ? (
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,.3)', textAlign: 'center', padding: '24px 0' }}>
            Nenhum paciente vinculado ainda
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
            {pacientes.map(p => (
              <Link key={p.id} href={`/clinic/paciente/${p.id}`} style={{ textDecoration: 'none' }}>
                <div style={{ background: p.cor, borderRadius: 12, padding: '14px 16px', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff' }}>
                      {p.iniciais}
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,.9)' }}>{p.nome.split(' ')[0]}</div>
                  </div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,.45)', marginBottom: 10, lineHeight: 1.4 }}>{p.dominios}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,.1)', borderRadius: 2 }}>
                      <div style={{ height: '100%', width: `${p.pct}%`, background: p.corBarra, borderRadius: 2 }} />
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 600, color: p.corBarra }}>{p.pct}%</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Programas ativos */}
      <div style={{ background: 'rgba(13,32,53,.75)', border: '1px solid rgba(26,58,92,.5)', borderRadius: 14, padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,.85)' }}>Programas ativos</span>
          <Link href="/clinic/programas" style={{ fontSize: 11, color: '#378ADD', textDecoration: 'none' }}>Ver todos →</Link>
        </div>
        {programas.length === 0 ? (
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,.3)', textAlign: 'center', padding: '24px 0' }}>
            Nenhum programa ativo ainda
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {programas.map(p => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px', background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.06)', borderRadius: 10 }}>
                <div style={{ width: 4, height: 36, borderRadius: 2, background: p.cor, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,.85)', marginBottom: 2 }}>{p.nome}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,.4)' }}>{p.paciente} · {p.operantes} operantes</div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: p.cor, marginBottom: 3 }}>{p.dominio_pct}%</div>
                  <span style={{
                    fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 5,
                    background: p.status === 'ativo' ? 'rgba(29,158,117,.15)' : p.status === 'revisar' ? 'rgba(239,159,39,.15)' : 'rgba(255,255,255,.06)',
                    color: p.status === 'ativo' ? '#1D9E75' : p.status === 'revisar' ? '#EF9F27' : 'rgba(255,255,255,.3)',
                  }}>
                    {p.status === 'ativo' ? 'Ativo' : p.status === 'revisar' ? 'Revisar' : 'Pausado'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
