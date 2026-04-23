'use client'
// v2 — completo com previsibilidade clínica

/**
 * Aba: Meu Filho
 * src/app/care/dashboard/meu-filho/page.tsx
 */

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useCareContext } from '../layout'
import FractaRadarChart from '@/components/fracta/FractaRadarChart'
import type { ScoresRadar } from '@/components/fracta/FractaRadarChart'
import { calcularForecast } from '@/lib/fracta/forecast'
import type { RadarSnapshot as ForecastRadarSnapshot, DadosSessao } from '@/lib/fracta/forecast'
import { DOMINIO_LABELS, DOMINIO_CORES } from '@/lib/fracta/scoring'
import type { Dominio } from '@/lib/fracta/scoring'
import { Suspense } from "react";


type Crianca = {
  id: string
  nome: string
  data_nascimento: string | null
  idade_anos: number | null
  diagnostico: string | null
  observacoes: string | null
  ativo: boolean
}

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
}

function calcularIdade(dataNasc: string | null, idadeAnos: number | null): string {
  if (dataNasc) {
    const nasc = new Date(dataNasc)
    const hoje = new Date()
    const anos = hoje.getFullYear() - nasc.getFullYear()
    const meses = hoje.getMonth() - nasc.getMonth()
    return `${meses < 0 ? anos - 1 : anos} anos`
  }
  if (idadeAnos) return `${idadeAnos} ano${idadeAnos !== 1 ? 's' : ''}`
  return '—'
}

function mediaSnapshot(s: RadarSnapshot): number {
  return Math.round((s.score_comunicacao + s.score_social + s.score_atencao + s.score_regulacao +
    s.score_brincadeira + s.score_flexibilidade + s.score_autonomia + s.score_motivacao) / 8)
}

function getIniciais(nome: string): string {
  return nome.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
}

const CORES_AVATAR = [
  'linear-gradient(135deg,#2BBFA4,#4FC3D8)',
  'linear-gradient(135deg,#8B5CF6,#A78BFA)',
  'linear-gradient(135deg,#F59E0B,#FCD34D)',
  'linear-gradient(135deg,#F87171,#FB923C)',
  'linear-gradient(135deg,#34D399,#7AE040)',
]

function MeuFilhoPageInner() {
  const { criancaAtiva, criancas, setCriancaAtiva, recarregarCriancas } = useCareContext()
  const searchParams = useSearchParams()

  const [snapshots, setSnapshots] = useState<RadarSnapshot[]>([])
  const [laudos, setLaudos] = useState<Laudo[]>([])
  const [sessoes, setSessoes] = useState<{ id: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [editando, setEditando] = useState(false)
  const [formPerfil, setFormPerfil] = useState({ nome: '', data_nascimento: '', diagnostico: '', observacoes: '' })
  const [salvandoPerfil, setSalvandoPerfil] = useState(false)
  const [mostrarFormFilho, setMostrarFormFilho] = useState(searchParams.get('acao') === 'adicionar')
  const [formFilho, setFormFilho] = useState({ nome: '', data_nascimento: '', idade_anos: '', diagnostico: '' })
  const [salvandoFilho, setSalvandoFilho] = useState(false)
  const [forecast, setForecast] = useState<ReturnType<typeof calcularForecast> | null>(null)
  const [conviteCodigo, setConviteCodigo] = useState<string | null>(null)
  const [gerandoConvite, setGerandoConvite] = useState(false)
  const [conviteCopiado, setConviteCopiado] = useState(false)
  const [responsaveis, setResponsaveis] = useState<{id:string;email:string;tipo:string}[]>([])
 
 
  useEffect(() => {
    if (!criancaAtiva) return
    carregarDados()
    setFormPerfil({
      nome: criancaAtiva.nome ?? '',
      data_nascimento: (criancaAtiva as any).data_nascimento ?? '',
      diagnostico: (criancaAtiva as any).diagnostico ?? '',
      observacoes: (criancaAtiva as any).observacoes ?? '',
    })
  }, [criancaAtiva])

  async function carregarDados() {
    setLoading(true)
    const [{ data: snaps }, { data: laud }, { data: sess }] = await Promise.all([
      supabase.from('radar_snapshots').select('*').eq('crianca_id', criancaAtiva!.id)
        .order('criado_em', { ascending: false }).limit(8),
      supabase.from('laudos').select('*').eq('crianca_id', criancaAtiva!.id)
        .order('criado_em', { ascending: false }),
      supabase.from('sessoes').select('id').eq('crianca_id', criancaAtiva!.id),
    ])
    setSnapshots(snaps ?? [])
    setLaudos(laud ?? [])
    setSessoes(sess ?? [])

    const quatorze = new Date()
    quatorze.setDate(quatorze.getDate() - 14)
    const { data: sessoesRec } = await supabase.from('sessoes').select('id')
      .eq('crianca_id', criancaAtiva!.id).gte('criado_em', quatorze.toISOString())

    const fc = calcularForecast(
      criancaAtiva!.id,
      (snaps ?? []) as ForecastRadarSnapshot[],
      { total_sessoes: sess?.length ?? 0, sessoes_ultimos_14d: sessoesRec?.length ?? 0 } as DadosSessao
    )
    setForecast(fc)
    setLoading(false)
  }

  async function salvarPerfil() {
    if (!criancaAtiva) return
    setSalvandoPerfil(true)
    await supabase.from('criancas').update({
      nome: formPerfil.nome,
      data_nascimento: formPerfil.data_nascimento || null,
      diagnostico: formPerfil.diagnostico || null,
      observacoes: formPerfil.observacoes || null,
    }).eq('id', criancaAtiva.id)
    await recarregarCriancas()
    setEditando(false)
    setSalvandoPerfil(false)
  }

  async function adicionarFilho() {
    setSalvandoFilho(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data: novaC } = await supabase.from('criancas').insert({
      responsavel_id: user?.id,
      nome: formFilho.nome,
      data_nascimento: formFilho.data_nascimento || null,
      idade_anos: formFilho.idade_anos ? parseInt(formFilho.idade_anos) : null,
      diagnostico: formFilho.diagnostico || null,
      ativo: true,
    }).select().single()
    if (novaC) { await recarregarCriancas(); setCriancaAtiva(novaC as any) }
    setMostrarFormFilho(false)
    setFormFilho({ nome: '', data_nascimento: '', idade_anos: '', diagnostico: '' })
    setSalvandoFilho(false)
  }

async function gerarConvite() {
  if (!criancaAtiva) return
  setGerandoConvite(true)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  const { data } = await supabase
    .from('convites')
    .insert({ crianca_id: criancaAtiva.id, criado_por: user.id })
    .select('codigo')
    .single()
  if (data) setConviteCodigo(data.codigo)
  setGerandoConvite(false)
}

async function copiarConvite() {
  if (!conviteCodigo) return
  const link = `${window.location.origin}/care/convite/${conviteCodigo}`
  await navigator.clipboard.writeText(link)
  setConviteCopiado(true)
  setTimeout(() => setConviteCopiado(false), 3000)
}



  const snapshotAtual = snapshots[0]
  const scoresAtuais: ScoresRadar = snapshotAtual ? {
    comunicacao: snapshotAtual.score_comunicacao, social: snapshotAtual.score_social,
    atencao: snapshotAtual.score_atencao, regulacao: snapshotAtual.score_regulacao,
    brincadeira: snapshotAtual.score_brincadeira, flexibilidade: snapshotAtual.score_flexibilidade,
    autonomia: snapshotAtual.score_autonomia, motivacao: snapshotAtual.score_motivacao,
  } : { comunicacao:50, social:50, atencao:50, regulacao:50, brincadeira:50, flexibilidade:50, autonomia:50, motivacao:50 }

  const card: React.CSSProperties = {
    background: 'rgba(255,255,255,.84)', backdropFilter: 'blur(14px)',
    borderRadius: 22, border: '1px solid rgba(43,191,164,.18)',
    boxShadow: '0 4px 28px rgba(43,191,164,.06)',
  }

  if (!criancaAtiva) return (
    <div style={{ textAlign:'center', padding:'48px 24px' }}>
      <p style={{ color:'#8a9ab8', fontSize:14, marginBottom:20 }}>Nenhuma criança cadastrada ainda.</p>
      <button onClick={() => setMostrarFormFilho(true)} style={{
        padding:'12px 28px', background:'linear-gradient(135deg,#2BBFA4,#7AE040)',
        color:'white', border:'none', borderRadius:50, fontWeight:700, fontSize:14, cursor:'pointer',
      }}>Adicionar meu filho</button>
    </div>
  )

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>

      {/* ── PERFIL ATIVO */}
      <div style={card}>
        <div style={{
          background:'linear-gradient(135deg,rgba(43,191,164,.12),rgba(79,195,216,.06))',
          borderRadius:'22px 22px 0 0', padding:'24px 24px 20px',
          borderBottom:'1px solid rgba(43,191,164,.1)',
        }}>
          <div style={{ display:'flex', alignItems:'center', gap:16 }}>
            <div style={{
              width:72, height:72, borderRadius:20, flexShrink:0,
              background: CORES_AVATAR[criancas.indexOf(criancaAtiva as any) % CORES_AVATAR.length] ?? CORES_AVATAR[0],
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:24, fontWeight:800, color:'white',
              boxShadow:'0 4px 16px rgba(43,191,164,.3)',
            }}>
              {getIniciais(criancaAtiva.nome)}
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:'1.3rem', fontWeight:800, color:'#1E3A5F', marginBottom:4 }}>
                {criancaAtiva.nome}
              </div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                <span style={{ fontSize:12, color:'#64748b' }}>
                  {calcularIdade((criancaAtiva as any).data_nascimento, criancaAtiva.idade_anos)}
                </span>
                {(criancaAtiva as any).diagnostico && (
                  <span style={{ fontSize:11, fontWeight:600, padding:'2px 8px', borderRadius:99, background:'rgba(139,92,246,.12)', color:'#8B5CF6' }}>
                    {(criancaAtiva as any).diagnostico}
                  </span>
                )}
                <span style={{ fontSize:11, fontWeight:600, padding:'2px 8px', borderRadius:99, background:'rgba(43,191,164,.12)', color:'#2BBFA4' }}>
                  Perfil ativo
                </span>
              </div>
            </div>
            <button onClick={() => setEditando(!editando)} style={{
              padding:'8px 14px', borderRadius:10, border:'none',
              background: editando ? 'rgba(239,68,68,.1)' : 'rgba(43,191,164,.1)',
              color: editando ? '#ef4444' : '#2BBFA4',
              fontSize:12, fontWeight:700, cursor:'pointer', flexShrink:0,
            }}>{editando ? 'Cancelar' : 'Editar'}</button>
          </div>
        </div>

        {editando ? (
          <div style={{ padding:'20px 24px' }}>
            {[
              { key:'nome', label:'Nome', type:'text', placeholder:'Nome da criança' },
              { key:'data_nascimento', label:'Data de nascimento', type:'date', placeholder:'' },
              { key:'diagnostico', label:'Diagnóstico', type:'text', placeholder:'ex: TEA nível 1' },
              { key:'observacoes', label:'Observações', type:'text', placeholder:'Informações relevantes' },
            ].map(c => (
              <div key={c.key} style={{ marginBottom:12 }}>
                <label style={{ fontSize:12, fontWeight:600, color:'#64748b', display:'block', marginBottom:4 }}>{c.label}</label>
                <input type={c.type} value={formPerfil[c.key as keyof typeof formPerfil]}
                  onChange={e => setFormPerfil(p => ({ ...p, [c.key]: e.target.value }))}
                  placeholder={c.placeholder}
                  style={{ width:'100%', padding:'10px 12px', borderRadius:10, border:'1.5px solid rgba(0,0,0,.1)', fontSize:14, fontFamily:'var(--font-sans)', boxSizing:'border-box' }}
                />
              </div>
            ))}
            <button onClick={salvarPerfil} disabled={salvandoPerfil} style={{
              width:'100%', padding:'12px', borderRadius:12, border:'none',
              background:'linear-gradient(135deg,#2BBFA4,#7AE040)', color:'white',
              fontSize:14, fontWeight:700, cursor:'pointer',
            }}>{salvandoPerfil ? 'Salvando...' : 'Salvar alterações'}</button>
          </div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)' }}>
            {[
              { label:'Sessões', val:sessoes.length },
              { label:'Avaliações', val:snapshots.length },
              { label:'Laudos', val:laudos.length },
            ].map((s, i) => (
              <div key={s.label} style={{ padding:'16px', textAlign:'center', borderRight: i<2?'1px solid rgba(43,191,164,.08)':'none' }}>
                <div style={{ fontSize:'1.5rem', fontWeight:800, color:'#2BBFA4', lineHeight:1 }}>{s.val}</div>
                <div style={{ fontSize:11, color:'#8a9ab8', marginTop:4 }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── MEUS FILHOS */}
      <div style={card}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'18px 20px', borderBottom:'1px solid rgba(43,191,164,.08)' }}>
          <div>
            <div style={{ fontSize:'.88rem', fontWeight:800, color:'#1E3A5F' }}>Meus filhos</div>
            <div style={{ fontSize:'.72rem', color:'#8a9ab8', marginTop:2 }}>{criancas.length} cadastrado{criancas.length!==1?'s':''}</div>
          </div>
          <button onClick={() => setMostrarFormFilho(!mostrarFormFilho)} style={{
            padding:'7px 14px', borderRadius:10, border:'none',
            background: mostrarFormFilho ? 'rgba(239,68,68,.1)' : 'rgba(43,191,164,.1)',
            color: mostrarFormFilho ? '#ef4444' : '#2BBFA4',
            fontSize:12, fontWeight:700, cursor:'pointer',
          }}>{mostrarFormFilho ? 'Cancelar' : '+ Adicionar'}</button>
        </div>

        {criancas.map((c, i) => {
          const ativo = c.id === criancaAtiva?.id
          return (
            <div key={c.id} onClick={() => !ativo && setCriancaAtiva(c as any)}
              style={{
                display:'flex', alignItems:'center', gap:14, padding:'14px 20px',
                borderBottom: i<criancas.length-1?'1px solid rgba(43,191,164,.06)':'none',
                cursor: ativo?'default':'pointer',
                background: ativo?'rgba(43,191,164,.04)':'transparent',
              }}>
              <div style={{ width:44, height:44, borderRadius:13, flexShrink:0, background:CORES_AVATAR[i%CORES_AVATAR.length], display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, fontWeight:800, color:'white' }}>
                {getIniciais(c.nome)}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:14, fontWeight:700, color:'#1E3A5F', marginBottom:2 }}>{c.nome}</div>
                <div style={{ fontSize:11, color:'#8a9ab8' }}>
                  {calcularIdade((c as any).data_nascimento, c.idade_anos)}
                  {(c as any).diagnostico && ` · ${(c as any).diagnostico}`}
                </div>
              </div>
              {ativo ? (
                <span style={{ fontSize:10, fontWeight:700, padding:'3px 9px', borderRadius:99, background:'rgba(43,191,164,.12)', color:'#2BBFA4' }}>Ativo</span>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
              )}
            </div>
          )
        })}

        {mostrarFormFilho && (
          <div style={{ padding:'20px', borderTop:'1px solid rgba(43,191,164,.1)' }}>
            <div style={{ fontSize:13, fontWeight:700, color:'#1E3A5F', marginBottom:14 }}>Novo filho</div>
            {[
              { key:'nome', label:'Nome *', type:'text', placeholder:'Nome da criança' },
              { key:'data_nascimento', label:'Data de nascimento', type:'date', placeholder:'' },
              { key:'idade_anos', label:'Idade (se não souber a data)', type:'number', placeholder:'ex: 4' },
              { key:'diagnostico', label:'Diagnóstico (opcional)', type:'text', placeholder:'ex: TEA, TDAH...' },
            ].map(c => (
              <div key={c.key} style={{ marginBottom:12 }}>
                <label style={{ fontSize:12, fontWeight:600, color:'#64748b', display:'block', marginBottom:4 }}>{c.label}</label>
                <input type={c.type} value={formFilho[c.key as keyof typeof formFilho]}
                  onChange={e => setFormFilho(p => ({ ...p, [c.key]: e.target.value }))}
                  placeholder={c.placeholder}
                  style={{ width:'100%', padding:'10px 12px', borderRadius:10, border:'1.5px solid rgba(0,0,0,.1)', fontSize:14, fontFamily:'var(--font-sans)', boxSizing:'border-box' }}
                />
              </div>
            ))}
            <button onClick={adicionarFilho} disabled={!formFilho.nome||salvandoFilho} style={{
              width:'100%', padding:'12px', borderRadius:12, border:'none',
              background: formFilho.nome ? 'linear-gradient(135deg,#2BBFA4,#7AE040)' : '#e2e8f0',
              color: formFilho.nome ? 'white' : '#94a3b8', fontSize:14, fontWeight:700,
              cursor: formFilho.nome ? 'pointer' : 'not-allowed',
            }}>{salvandoFilho ? 'Cadastrando...' : 'Cadastrar filho'}</button>
          </div>
        )}
      </div>

      {/* ── EVOLUÇÃO DO RADAR */}
      {snapshots.length > 0 && (
        <div style={card}>
          <div style={{ padding:'18px 20px', borderBottom:'1px solid rgba(43,191,164,.08)' }}>
            <div style={{ fontSize:'.88rem', fontWeight:800, color:'#1E3A5F' }}>Evolução do mapa de habilidades</div>
            <div style={{ fontSize:'.72rem', color:'#8a9ab8', marginTop:2 }}>
              {snapshots.length} avaliação{snapshots.length!==1?'ões':''} registrada{snapshots.length!==1?'s':''}
            </div>
          </div>
          <div style={{ padding:'20px', display:'flex', justifyContent:'center' }}>
            <FractaRadarChart scores={scoresAtuais} idadeAnos={criancaAtiva.idade_anos??4} size={220} animated/>
          </div>
          {snapshots.length > 1 && (
            <div style={{ padding:'0 20px 20px' }}>
              <div style={{ fontSize:11, fontWeight:700, color:'#8a9ab8', letterSpacing:'.06em', textTransform:'uppercase', marginBottom:10 }}>Histórico</div>
              <div style={{ display:'flex', gap:8, overflowX:'auto', paddingBottom:4 }}>
                {snapshots.map((snap, i) => {
                  const media = mediaSnapshot(snap)
                  const delta = i < snapshots.length-1 ? media - mediaSnapshot(snapshots[i+1]) : null
                  return (
                    <div key={snap.id} style={{
                      minWidth:76, padding:'12px', borderRadius:14, flexShrink:0, textAlign:'center',
                      background: i===0 ? 'linear-gradient(135deg,rgba(43,191,164,.15),rgba(43,191,164,.05))' : 'rgba(0,0,0,.03)',
                      border: i===0 ? '1px solid rgba(43,191,164,.25)' : '1px solid rgba(0,0,0,.06)',
                    }}>
                      <div style={{ fontSize:22, fontWeight:800, color:i===0?'#2BBFA4':'#1E3A5F', lineHeight:1 }}>{media}</div>
                      {delta !== null && (
                        <div style={{ fontSize:11, fontWeight:700, color:delta>=0?'#2BBFA4':'#ef4444', marginTop:2 }}>
                          {delta>=0?'+':''}{delta}
                        </div>
                      )}
                      <div style={{ fontSize:10, color:'#8a9ab8', marginTop:4 }}>
                        {new Date(snap.criado_em).toLocaleDateString('pt-BR',{day:'2-digit',month:'short'})}
                      </div>
                      {i===0 && <div style={{ fontSize:9, color:'#2BBFA4', fontWeight:700, marginTop:2 }}>ATUAL</div>}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── PREVISIBILIDADE CLÍNICA */}
      {forecast && (
        <div style={card}>
          <div style={{ padding:'18px 20px', borderBottom:'1px solid rgba(43,191,164,.08)' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <div style={{ width:28, height:28, borderRadius:8, background:'linear-gradient(135deg,#2BBFA4,#4FC3D8)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M13 10V3L4 14h7v7l9-11h-7z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div>
                <div style={{ fontSize:'.88rem', fontWeight:800, color:'#1E3A5F' }}>Previsibilidade clínica</div>
                <div style={{ fontSize:'.72rem', color:'#8a9ab8' }}>Fracta Forecast — visão detalhada</div>
              </div>
            </div>
          </div>

          <div style={{ padding:'20px' }}>
            {!forecast.dados_suficientes ? (
              <div style={{ padding:'20px', borderRadius:16, textAlign:'center', background:'rgba(43,191,164,.06)', border:'1px solid rgba(43,191,164,.15)' }}>
                <p style={{ fontSize:14, color:'#1E3A5F', fontWeight:600, marginBottom:6 }}>Dados insuficientes para previsibilidade</p>
                <p style={{ fontSize:12, color:'#8a9ab8', margin:0 }}>Faça uma segunda avaliação para ativar o Fracta Forecast.</p>
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

                {/* Mensagem principal */}
                <div style={{ padding:'16px', borderRadius:16, background:'linear-gradient(135deg,rgba(43,191,164,.1),rgba(79,195,216,.05))', border:'1px solid rgba(43,191,164,.2)' }}>
                  <p style={{ fontSize:14, color:'#1E3A5F', lineHeight:1.6, margin:0, fontWeight:500 }}>
                    {forecast.care.mensagem_principal}
                  </p>
                  {forecast.care.estimativa_semanas && (
                    <div style={{ display:'flex', alignItems:'center', gap:10, marginTop:12 }}>
                      <div style={{ width:48, height:48, borderRadius:12, background:'linear-gradient(135deg,#2BBFA4,#4FC3D8)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', color:'white', flexShrink:0 }}>
                        <span style={{ fontSize:18, fontWeight:800, lineHeight:1 }}>{forecast.care.estimativa_semanas}</span>
                        <span style={{ fontSize:9, opacity:0.9 }}>sem.</span>
                      </div>
                      <div style={{ fontSize:12, color:'#64748b' }}>
                        Estimativa para próxima habilidade em <strong style={{ color:'#2BBFA4' }}>
                          {DOMINIO_LABELS[forecast.care.dominio_destaque as Dominio]}
                        </strong>
                      </div>
                    </div>
                  )}
                </div>

                {/* Ação clínica */}
                <div style={{ padding:'14px 16px', borderRadius:14, background: forecast.clinic.alerta?'rgba(245,158,11,.08)':'rgba(43,191,164,.06)', border:`1px solid ${forecast.clinic.alerta?'rgba(245,158,11,.2)':'rgba(43,191,164,.15)'}` }}>
                  <div style={{ fontSize:10, fontWeight:700, color:'#8a9ab8', marginBottom:6, textTransform:'uppercase', letterSpacing:'.06em' }}>Ação recomendada</div>
                  <div style={{ fontSize:13, fontWeight:700, color:'#1E3A5F' }}>
                    {forecast.clinic.acao_recomendada === 'manter_plano' && '✓ Manter o plano atual'}
                    {forecast.clinic.acao_recomendada === 'intensificar' && '↑ Intensificar as atividades'}
                    {forecast.clinic.acao_recomendada === 'revisar_metas' && '↻ Revisar as metas'}
                    {forecast.clinic.acao_recomendada === 'avaliar_barreiras' && '⚠ Avaliar barreiras'}
                  </div>
                  {forecast.clinic.alerta && (
                    <div style={{ fontSize:12, color:'#92400e', marginTop:4 }}>{forecast.clinic.alerta}</div>
                  )}
                </div>

                {/* Projeção por domínio */}
                <div>
                  <div style={{ fontSize:11, fontWeight:700, color:'#8a9ab8', marginBottom:10, textTransform:'uppercase', letterSpacing:'.06em' }}>
                    Projeção por domínio — 4 semanas
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                    {forecast.dominios.sort((a,b) => b.delta_14d-a.delta_14d).map(d => {
                      const cor = DOMINIO_CORES[d.dominio as Dominio]
                      const pos = d.delta_14d >= 0
                      return (
                        <div key={d.dominio} style={{ display:'flex', alignItems:'center', gap:12 }}>
                          <div style={{ width:80, fontSize:12, color:'#1E3A5F', fontWeight:500, flexShrink:0 }}>
                            {DOMINIO_LABELS[d.dominio as Dominio]}
                          </div>
                          <div style={{ flex:1 }}>
                            <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:'#8a9ab8', marginBottom:3 }}>
                              <span>Atual: {d.score_atual}</span>
                              <span>→ {d.forecast_4w}</span>
                            </div>
                            <div style={{ height:5, background:'rgba(0,0,0,.06)', borderRadius:99, overflow:'hidden' }}>
                              <div style={{ height:'100%', width:`${d.forecast_4w}%`, background:cor, borderRadius:99, opacity:0.7 }}/>
                            </div>
                          </div>
                          <div style={{ fontSize:11, fontWeight:700, minWidth:36, textAlign:'right', color:pos?'#2BBFA4':'#ef4444' }}>
                            {pos?'+':''}{d.delta_14d}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Adesão */}
                <div>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:'#64748b', marginBottom:5 }}>
                    <span>Consistência nas atividades (14 dias)</span>
                    <span style={{ fontWeight:700, color:forecast.adesao_geral>=0.6?'#2BBFA4':'#F59E0B' }}>
                      {Math.round(forecast.adesao_geral*100)}%
                    </span>
                  </div>
                  <div style={{ height:6, background:'rgba(43,191,164,.1)', borderRadius:99, overflow:'hidden' }}>
                    <div style={{ height:'100%', width:`${forecast.adesao_geral*100}%`, background:forecast.adesao_geral>=0.6?'linear-gradient(90deg,#2BBFA4,#4FC3D8)':'#F59E0B', borderRadius:99, transition:'width 0.6s ease' }}/>
                  </div>
                </div>

                {/* Resumo clínico */}
                <div style={{ padding:'12px 14px', borderRadius:12, background:'rgba(0,0,0,.03)', border:'1px solid rgba(0,0,0,.06)' }}>
                  <div style={{ fontSize:10, fontWeight:700, color:'#8a9ab8', marginBottom:4, textTransform:'uppercase', letterSpacing:'.06em' }}>Resumo clínico</div>
                  <p style={{ fontSize:12, color:'#64748b', margin:0, lineHeight:1.6 }}>{forecast.clinic.resumo_clinico}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── LAUDOS VINCULADOS */}
      {laudos.length > 0 && (
        <div style={card}>
          <div style={{ padding:'18px 20px', borderBottom:'1px solid rgba(43,191,164,.08)' }}>
            <div style={{ fontSize:'.88rem', fontWeight:800, color:'#1E3A5F' }}>Laudos e diagnósticos</div>
            <div style={{ fontSize:'.72rem', color:'#8a9ab8', marginTop:2 }}>{laudos.length} laudo{laudos.length!==1?'s':''} cadastrado{laudos.length!==1?'s':''}</div>
          </div>
          <div style={{ padding:'16px 20px', display:'flex', flexDirection:'column', gap:10 }}>
            {laudos.map(l => (
              <div key={l.id} style={{ padding:'14px', borderRadius:14, background:'rgba(42,123,168,.06)', border:'1px solid rgba(42,123,168,.15)' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:6 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    {l.cid && <span style={{ fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:99, background:'rgba(42,123,168,.12)', color:'#2A7BA8' }}>{l.cid}</span>}
                    <span style={{ fontSize:13, fontWeight:700, color:'#1E3A5F' }}>{l.diagnostico ?? 'Sem diagnóstico'}</span>
                  </div>
                  <span style={{ fontSize:11, color:'#8a9ab8' }}>{l.data_laudo ? new Date(l.data_laudo).toLocaleDateString('pt-BR') : ''}</span>
                </div>
                {l.especialidades?.length > 0 && (
                  <div style={{ display:'flex', flexWrap:'wrap', gap:4, marginBottom:4 }}>
                    {l.especialidades.map(e => (
                      <span key={e} style={{ fontSize:10, padding:'2px 7px', borderRadius:99, background:'rgba(43,191,164,.1)', color:'#2BBFA4', fontWeight:600 }}>{e}</span>
                    ))}
                  </div>
                )}
                {l.horas_tratamento_semana && <div style={{ fontSize:12, color:'#64748b' }}>{l.horas_tratamento_semana}h/semana recomendadas</div>}
                {l.profissional_emissor && <div style={{ fontSize:11, color:'#8a9ab8', marginTop:2 }}>Por: {l.profissional_emissor}</div>}
              </div>
            ))}
          </div>
        </div>
      )}
{/* ── COMPARTILHAR ACESSO */}
<div style={card}>
  <div style={{ padding:'20px' }}>
    <div style={{ fontSize:'.88rem', fontWeight:800, color:'#1E3A5F', marginBottom:4 }}>
      Compartilhar acesso
    </div>
    <div style={{ fontSize:'.72rem', color:'#8a9ab8', marginBottom:16 }}>
      Convide outro responsável para acompanhar {criancaAtiva.nome.split(' ')[0]}
    </div>
    {!conviteCodigo ? (
      <button onClick={gerarConvite} disabled={gerandoConvite} style={{
        width:'100%', padding:'11px', borderRadius:10, border:'none',
        background:'linear-gradient(135deg,#2BBFA4,#1e9e88)',
        color:'white', fontWeight:700, fontSize:'.85rem',
        cursor:'pointer', fontFamily:'var(--font-sans)',
      }}>
        {gerandoConvite ? 'Gerando...' : '+ Gerar link de convite'}
      </button>
    ) : (
      <div>
        <div style={{ background:'rgba(43,191,164,.06)', border:'1px solid rgba(43,191,164,.2)', borderRadius:10, padding:'12px 14px', marginBottom:10 }}>
          <div style={{ fontSize:'.65rem', fontWeight:700, color:'#2BBFA4', marginBottom:4 }}>Link de convite (válido por 7 dias)</div>
          <div style={{ fontSize:'.78rem', color:'#1E3A5F', wordBreak:'break-all', fontFamily:'monospace' }}>
            {`${typeof window !== 'undefined' ? window.location.origin : ''}/care/convite/${conviteCodigo}`}
          </div>
        </div>
        <button onClick={copiarConvite} style={{
          width:'100%', padding:'11px', borderRadius:10,
          border:'1.5px solid rgba(43,191,164,.3)', background:'white',
          color:'#2BBFA4', fontWeight:700, fontSize:'.85rem',
          cursor:'pointer', fontFamily:'var(--font-sans)',
        }}>
          {conviteCopiado ? '✓ Copiado!' : 'Copiar link'}
        </button>
      </div>
    )}
  </div>
</div>
    </div>
  )
}

export default function MeuFilhoPage() {
  return <Suspense fallback={null}><MeuFilhoPageInner /></Suspense>;
}

