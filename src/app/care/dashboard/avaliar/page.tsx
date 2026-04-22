"use client";
import { Suspense } from 'react'
import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { FractaLogo } from '@/components/fracta/FractaLogo'

// ── TIPOS ────────────────────────────────────────────────────────────────────
type DomKey = "comunicacao"|"social"|"atencao"|"regulacao"|"brincadeira"|"flexibilidade"|"autonomia"|"motivacao"
type Respostas = Record<string, number>
type EscalaItem = { texto: string; valor: number }
type Pergunta = {
  id: string; dominio: string; domKey: DomKey; peso: number
  idadeMinMeses?: number; idadeMaxMeses?: number
  escala?: EscalaItem[]; tipo?: "escala"|"escolha"
  texto: (nome: string, genero?: string) => string
  exemplo?: string; opcoes?: EscalaItem[]
  gatilho?: (ctx: { idadeMeses: number; respostas: Respostas; triagem: TriagemFlags }) => boolean
}
type TriagemFlags = {
  aprofundarComunicacao: boolean; aprofundarSocial: boolean
  aprofundarAtencao: boolean; aprofundarRegulacao: boolean
  aprofundarFlexibilidade: boolean; aprofundarTelas: boolean
}
type Crianca = { id: string; nome: string; idade_anos: number | null; data_nascimento: string | null; genero?: string | null }
type Fase = "loading"|"confirmacao"|"perguntas"|"salvando"|"resultado"

// ── ESCALAS ──────────────────────────────────────────────────────────────────
const EP: EscalaItem[] = [
  {texto:"Sempre",valor:4},{texto:"Frequentemente",valor:3},
  {texto:"Às vezes",valor:2},{texto:"Raramente",valor:1},{texto:"Ainda não faz isso",valor:0}]
const EI: EscalaItem[] = [
  {texto:"Nunca acontece",valor:4},{texto:"Raramente",valor:3},
  {texto:"Às vezes",valor:2},{texto:"Frequentemente",valor:1},{texto:"Quase sempre",valor:0}]
const EINT: EscalaItem[] = [
  {texto:"Não acontece",valor:4},{texto:"Acontece mas passa rápido",valor:3},
  {texto:"Às vezes atrapalha a rotina",valor:2},{texto:"Atrapalha bastante",valor:1},
  {texto:"Atrapalha muito — é difícil continuar o dia",valor:0}]

// ── PERGUNTAS BASE ────────────────────────────────────────────────────────────
const PERGUNTAS_BASE: Pergunta[] = [
  {id:"com_mando_basico",dominio:"Comunicação — Mando",domKey:"comunicacao",peso:1.4,idadeMinMeses:12,idadeMaxMeses:23,escala:EP,
    texto:(n)=>`${n} consegue pedir o que quer de alguma forma — mesmo sem palavras?`,
    exemplo:"Aponta, leva sua mão, olha para o objeto e para você, vocaliza, faz gesto."},
  {id:"com_mando_verbal",dominio:"Comunicação — Mando verbal",domKey:"comunicacao",peso:1.4,idadeMinMeses:24,escala:EP,
    texto:(n)=>`${n} usa palavras ou frases para pedir o que quer?`,
    exemplo:"Palavras soltas, frases curtas ou frases completas — dependendo da idade."},
  {id:"com_tato_objetos",dominio:"Comunicação — Nomeação",domKey:"comunicacao",peso:1.2,idadeMinMeses:18,idadeMaxMeses:47,escala:EP,
    texto:(n)=>`${n} nomeia objetos, pessoas ou imagens que conhece?`,
    exemplo:"Nomeia objetos do dia a dia, pessoas próximas ou imagens em livros."},
  {id:"com_intraverbal",dominio:"Comunicação — Conversa",domKey:"comunicacao",peso:1.1,idadeMinMeses:36,escala:EP,
    texto:(n)=>`${n} responde perguntas simples sobre o dia a dia?`,
    exemplo:"'O que você comeu?' 'Onde está o cachorro?' 'O que aconteceu no parque?'"},
  {id:"com_atencao_conjunta",dominio:"Comunicação — Atenção conjunta",domKey:"comunicacao",peso:1.3,idadeMinMeses:12,idadeMaxMeses:35,escala:EP,
    texto:(n)=>`${n} tenta chamar sua atenção para mostrar algo interessante?`,
    exemplo:"Mostra algo, aponta para coisas, olha para você para compartilhar a experiência."},
  {id:"soc_responde_nome",dominio:"Social — Orientação",domKey:"social",peso:1.4,idadeMinMeses:12,escala:EP,
    texto:(n)=>`Quando você chama ${n} pelo nome, ele responde de alguma forma?`,
    exemplo:"Olha, vira, para o que está fazendo, fala 'hã' ou se aproxima."},
  {id:"soc_imitacao",dominio:"Social — Imitação",domKey:"social",peso:1.3,idadeMinMeses:12,idadeMaxMeses:47,escala:EP,
    texto:(n)=>`${n} imita ações ou gestos que você faz?`,
    exemplo:"Imita gestos, expressões, ações com brinquedos ou sequências de movimentos."},
  {id:"soc_jogo_paralelo",dominio:"Social — Jogo",domKey:"social",peso:1.1,idadeMinMeses:18,idadeMaxMeses:47,escala:EP,
    texto:(n)=>`${n} brinca perto de outras crianças sem precisar interagir o tempo todo?`,
    exemplo:"Jogo paralelo — cada um brinca do seu jeito mas aceita a presença do outro."},
  {id:"soc_jogo_cooperativo",dominio:"Social — Jogo cooperativo",domKey:"social",peso:1.2,idadeMinMeses:36,escala:EP,
    texto:(n)=>`${n} brinca junto com outras crianças seguindo uma lógica compartilhada?`,
    exemplo:"Faz de conta com papéis, brincadeira com turnos, jogo de regra simples."},
  {id:"soc_empatia",dominio:"Social — Empatia",domKey:"social",peso:1.0,idadeMinMeses:24,escala:EP,
    texto:(n)=>`${n} reage quando alguém está triste ou machucado?`,
    exemplo:"Olha, se aproxima, oferece objeto, expressa preocupação."},
  {id:"aten_sustentada",dominio:"Atenção — Sustentada",domKey:"atencao",peso:1.2,idadeMinMeses:12,escala:EP,
    texto:(n)=>`${n} consegue se manter engajado em uma atividade por tempo adequado para a idade?`,
    exemplo:"Consegue brincar, folhear livro, montar peças ou explorar algo por alguns minutos."},
  {id:"aten_instrucao_simples",dominio:"Atenção — Seguir instrução",domKey:"atencao",peso:1.3,idadeMinMeses:12,escala:EP,
    texto:(n)=>`${n} segue instruções simples no contexto da rotina?`,
    exemplo:"Instruções simples como 'vem cá', 'pega o sapato', ou sequências com mais de uma etapa."},
  {id:"aten_telas",dominio:"Atenção — Telas",domKey:"atencao",peso:0.8,idadeMinMeses:12,tipo:"escolha",
    texto:(n)=>`Em média, quanto tempo por dia ${n} passa em telas?`,
    opcoes:[{texto:"Menos de 30 minutos",valor:4},{texto:"30 a 60 minutos",valor:3},
      {texto:"1 a 2 horas",valor:2},{texto:"2 a 3 horas",valor:1},{texto:"Mais de 3 horas",valor:0}]},
  {id:"reg_frustracao",dominio:"Regulação — Frustração",domKey:"regulacao",peso:1.3,idadeMinMeses:12,escala:EI,
    texto:(n)=>`Quando algo não acontece como ${n} quer, a reação é muito intensa ou demorada?`,
    exemplo:"Choro intenso, gritos, jogar-se no chão ou agressão que demora para passar."},
  {id:"reg_espera",dominio:"Regulação — Espera",domKey:"regulacao",peso:1.2,idadeMinMeses:18,escala:EP,
    texto:(n)=>`${n} consegue esperar alguns segundos quando você sinaliza que já vai atender?`,
    exemplo:"Espera por água, colo, comida, atenção quando há um sinal claro de 'já vou'."},
  {id:"reg_transicao",dominio:"Regulação — Transições",domKey:"regulacao",peso:1.1,idadeMinMeses:18,escala:EI,
    texto:(n)=>`Mudanças de atividade ou rotina costumam gerar reações muito difíceis em ${n}?`,
    exemplo:"Parar telas, sair do parque, trocar de ambiente, mudar planos."},
  {id:"reg_aceita_nao",dominio:"Regulação — Tolerância ao não",domKey:"regulacao",peso:1.2,idadeMinMeses:24,escala:EI,
    texto:(n)=>`Ouvir "não" ou "agora não" gera reações muito intensas em ${n}?`,
    exemplo:"Choro intenso, agressão, gritos, recusa prolongada."},
  {id:"bri_exploratoria",dominio:"Brincadeira — Exploração",domKey:"brincadeira",peso:1.1,idadeMinMeses:12,idadeMaxMeses:35,escala:EP,
    texto:(n)=>`${n} explora objetos e brinquedos de formas variadas?`,
    exemplo:"Empilha, derruba, encaixa, abre, fecha — vai além de uso repetitivo."},
  {id:"bri_simbolica",dominio:"Brincadeira — Simbólica",domKey:"brincadeira",peso:1.2,idadeMinMeses:18,idadeMaxMeses:59,escala:EP,
    texto:(n)=>`${n} faz brincadeiras de faz de conta?`,
    exemplo:"Alimenta boneca, fala ao telefone de mentira, cria personagens ou situações imaginárias."},
  {id:"bri_com_par",dominio:"Brincadeira — Com parceiro",domKey:"brincadeira",peso:1.1,idadeMinMeses:12,escala:EP,
    texto:(n)=>`${n} amplia a brincadeira quando você participa com ele?`,
    exemplo:"Fica mais engajado, aceita variações, cria novas ideias."},
  {id:"fle_rotina",dominio:"Flexibilidade — Rotina",domKey:"flexibilidade",peso:1.2,idadeMinMeses:18,escala:EI,
    texto:(n)=>`${n} fica muito perturbado quando algo na rotina muda inesperadamente?`,
    exemplo:"Caminho diferente, pessoa diferente, ordem das coisas mudou."},
  {id:"fle_interesses",dominio:"Flexibilidade — Interesses",domKey:"flexibilidade",peso:1.0,idadeMinMeses:24,escala:EI,
    texto:(n)=>`${n} tem interesses muito restritos que dominam a maior parte do tempo?`,
    exemplo:"Só quer falar de um tema, rejeita qualquer outra proposta."},
  {id:"fle_erro",dominio:"Flexibilidade — Tolerância ao erro",domKey:"flexibilidade",peso:1.0,idadeMinMeses:30,escala:EI,
    texto:(n)=>`${n} reage de forma muito intensa quando erra ou algo não sai como planejou?`,
    exemplo:"Apaga tudo, destrói o que fez, recusa tentar de novo."},
  {id:"aut_autocuidado",dominio:"Autonomia — Autocuidado",domKey:"autonomia",peso:1.1,idadeMinMeses:18,escala:EP,
    texto:(n)=>`${n} participa das rotinas de cuidado pessoal de forma adequada para a idade?`,
    exemplo:"Coopera no banho, lava as mãos, tenta se vestir ou é independente nas rotinas básicas."},
  {id:"aut_alimentacao",dominio:"Autonomia — Alimentação",domKey:"autonomia",peso:1.0,idadeMinMeses:18,escala:EP,
    texto:(n)=>`${n} come uma variedade razoável de alimentos sem grande resistência?`,
    exemplo:"Aceita diferentes texturas e sabores — sem rituais muito rígidos."},
  {id:"aut_iniciativa",dominio:"Autonomia — Iniciativa",domKey:"autonomia",peso:1.0,idadeMinMeses:24,escala:EP,
    texto:(n)=>`${n} tenta fazer coisas sozinho antes de pedir ajuda?`,
    exemplo:"Tenta abrir embalagem, montar brinquedo, se vestir."},
  {id:"mot_curiosidade",dominio:"Motivação — Curiosidade",domKey:"motivacao",peso:1.1,idadeMinMeses:12,escala:EP,
    texto:(n)=>`${n} demonstra curiosidade genuína por atividades, objetos ou situações novas?`,
    exemplo:"Se aproxima, observa, toca, explora — não evita o novo por padrão."},
  {id:"mot_persistencia",dominio:"Motivação — Persistência",domKey:"motivacao",peso:1.0,idadeMinMeses:24,escala:EP,
    texto:(n)=>`Quando algo é difícil, ${n} tenta mais de uma vez antes de desistir?`,
    exemplo:"Repete tentativas, busca estratégias, pede ajuda e tenta de novo."},
  {id:"mot_aprendizagem",dominio:"Motivação — Aprendizagem",domKey:"motivacao",peso:1.2,idadeMinMeses:18,escala:EP,
    texto:(n)=>`${n} aprende melhor quando a atividade é significativa ou divertida para ele?`,
    exemplo:"Engaja mais, aprende mais rápido, generaliza com motivação."},
  {id:"cp_agressao",dominio:"Comportamento — Agressão",domKey:"regulacao",peso:1.3,idadeMinMeses:18,escala:EINT,tipo:"escala",
    texto:(n)=>`Com que frequência ${n} bate, morde, arranha ou machuca outras pessoas?`,
    exemplo:"Inclui reações a frustração, transições ou quando contrariado."},
  {id:"cp_autolesao",dominio:"Comportamento — Autolesão",domKey:"regulacao",peso:1.5,idadeMinMeses:12,escala:EINT,tipo:"escala",
    texto:(n)=>`${n} bate a cabeça, morde a si mesmo ou se machuca quando frustrado?`,
    exemplo:"Qualquer forma de autolesão durante episódios difíceis."},
  {id:"cp_movimentos",dominio:"Comportamento — Estereotipias",domKey:"flexibilidade",peso:1.0,idadeMinMeses:18,escala:EINT,tipo:"escala",
    texto:(n)=>`${n} apresenta movimentos repetitivos frequentes — balançar, girar, agitar as mãos?`,
    exemplo:"Estereotipias que ocorrem com frequência ao longo do dia."},
  {id:"cp_rigidez",dominio:"Comportamento — Rigidez",domKey:"flexibilidade",peso:1.1,idadeMinMeses:24,escala:EINT,tipo:"escala",
    texto:(n)=>`${n} insiste em rituais muito rígidos ao ponto de travar o dia?`,
    exemplo:"Mesma ordem, mesmo lugar, mesma sequência — recusa qualquer variação."},
]

const PERGUNTAS_APROFUNDAMENTO: Pergunta[] = [
  {id:"ap_com_ecoico",dominio:"Comunicação — Imitação vocal",domKey:"comunicacao",peso:1.3,idadeMinMeses:12,idadeMaxMeses:47,escala:EP,
    texto:(n)=>`${n} repete sons, sílabas ou palavras quando você fala para ele imitar?`,
    exemplo:"Repete quando você fala devagar e pede para imitar — sons, sílabas ou palavras simples.",
    gatilho:({triagem})=>triagem.aprofundarComunicacao},
  {id:"ap_com_pedido_ajuda",dominio:"Comunicação — Pedir ajuda",domKey:"comunicacao",peso:1.2,idadeMinMeses:18,escala:EP,
    texto:(n)=>`Quando não consegue fazer algo, ${n} pede ajuda de alguma forma?`,
    exemplo:"Leva até você, vocaliza, fala 'ajuda', olha alternando entre objeto e você.",
    gatilho:({triagem})=>triagem.aprofundarComunicacao},
  {id:"ap_soc_contato_olho",dominio:"Social — Contato visual",domKey:"social",peso:1.3,idadeMinMeses:12,escala:EP,
    texto:(n)=>`${n} usa o olhar para se comunicar — olha para você quando quer algo ou para compartilhar?`,
    exemplo:"Não apenas olho no olho passivo — uso ativo do olhar como comunicação.",
    gatilho:({triagem})=>triagem.aprofundarSocial},
  {id:"ap_soc_isolamento",dominio:"Social — Isolamento",domKey:"social",peso:1.2,idadeMinMeses:24,escala:EI,
    texto:(n)=>`${n} prefere brincar sozinho a maior parte do tempo, mesmo com outras crianças disponíveis?`,
    exemplo:"Afasta ativamente ou ignora completamente a presença de outras crianças.",
    gatilho:({triagem})=>triagem.aprofundarSocial},
  {id:"ap_aten_distrai",dominio:"Atenção — Distractibilidade",domKey:"atencao",peso:1.1,idadeMinMeses:30,escala:EINT,
    texto:(n)=>`${n} se distrai com tanta facilidade que não consegue terminar atividades?`,
    exemplo:"Qualquer coisa ao redor tira o foco e é difícil voltar para o que estava fazendo.",
    gatilho:({triagem})=>triagem.aprofundarAtencao},
  {id:"ap_aten_pos_tela",dominio:"Atenção — Impacto das telas",domKey:"atencao",peso:1.0,idadeMinMeses:18,escala:EINT,
    texto:(n)=>`Após usar telas, ${n} fica mais difícil de engajar em atividades sem tela?`,
    exemplo:"Mais irritado, agitado, recusa atividades, chora ao desligar.",
    gatilho:({triagem})=>triagem.aprofundarTelas||triagem.aprofundarAtencao},
  {id:"ap_reg_duracao",dominio:"Regulação — Duração da crise",domKey:"regulacao",peso:1.2,idadeMinMeses:18,tipo:"escolha",
    texto:(n)=>`Quando ${n} entra em crise, quanto tempo costuma durar até se reorganizar?`,
    opcoes:[{texto:"Alguns segundos a 2 minutos",valor:4},{texto:"2 a 5 minutos",valor:3},
      {texto:"5 a 15 minutos",valor:2},{texto:"15 a 30 minutos",valor:1},
      {texto:"Mais de 30 minutos ou não consegue se reorganizar",valor:0}],
    gatilho:({triagem})=>triagem.aprofundarRegulacao},
  {id:"ap_reg_frequencia",dominio:"Regulação — Frequência",domKey:"regulacao",peso:1.1,idadeMinMeses:18,tipo:"escolha",
    texto:(n)=>`Com que frequência ${n} tem episódios de crise?`,
    opcoes:[{texto:"Raramente — menos de 1 vez por semana",valor:4},
      {texto:"1 a 2 vezes por semana",valor:3},{texto:"3 a 5 vezes por semana",valor:2},
      {texto:"1 a 2 vezes por dia",valor:1},{texto:"Várias vezes por dia",valor:0}],
    gatilho:({triagem})=>triagem.aprofundarRegulacao},
]

// ── FUNÇÕES ───────────────────────────────────────────────────────────────────
function calcularIdadeMeses(dataNascimento: string | null, idadeAnos: number | null): number {
  if (dataNascimento) {
    const nasc = new Date(`${dataNascimento}T00:00:00`)
    if (!isNaN(nasc.getTime())) {
      const hoje = new Date()
      const anos = hoje.getFullYear() - nasc.getFullYear()
      const meses = hoje.getMonth() - nasc.getMonth()
      return anos * 12 + meses
    }
  }
  return (idadeAnos ?? 3) * 12
}

function dentroDaFaixa(idadeMeses: number, min?: number, max?: number) {
  if (min !== undefined && idadeMeses < min) return false
  if (max !== undefined && idadeMeses > max) return false
  return true
}

function criarTriagemFlags(respostas: Respostas): TriagemFlags {
  return {
    aprofundarComunicacao: (respostas["com_mando_basico"]??4)<=2||(respostas["com_mando_verbal"]??4)<=2||(respostas["com_atencao_conjunta"]??4)<=1,
    aprofundarSocial: (respostas["soc_responde_nome"]??4)<=2||(respostas["soc_imitacao"]??4)<=1,
    aprofundarAtencao: (respostas["aten_sustentada"]??4)<=1||(respostas["aten_instrucao_simples"]??4)<=1,
    aprofundarRegulacao: (respostas["reg_frustracao"]??4)<=1||(respostas["cp_agressao"]??4)<=2||(respostas["cp_autolesao"]??4)<=2,
    aprofundarFlexibilidade: (respostas["fle_rotina"]??4)<=1||(respostas["cp_rigidez"]??4)<=1,
    aprofundarTelas: (respostas["aten_telas"]??4)<=1,
  }
}

function montarPerguntas(idadeMeses: number, respostas: Respostas) {
  const triagem = criarTriagemFlags(respostas)
  const base = PERGUNTAS_BASE.filter(p => dentroDaFaixa(idadeMeses, p.idadeMinMeses, p.idadeMaxMeses))
  const aprofundamento = PERGUNTAS_APROFUNDAMENTO.filter(p => {
    if (!dentroDaFaixa(idadeMeses, p.idadeMinMeses, p.idadeMaxMeses)) return false
    return p.gatilho ? p.gatilho({ idadeMeses, respostas, triagem }) : true
  })
  return { perguntas: [...base, ...aprofundamento], triagem }
}

function calcularScores(respostas: Respostas, perguntas: Pergunta[]): Record<DomKey, number> {
  const DOMINIOS: DomKey[] = ["comunicacao","social","atencao","regulacao","brincadeira","flexibilidade","autonomia","motivacao"]
  const somas: Record<DomKey, number> = {} as Record<DomKey, number>
  const pesos: Record<DomKey, number> = {} as Record<DomKey, number>
  DOMINIOS.forEach(k => { somas[k] = 50; pesos[k] = 1 })
  perguntas.forEach(p => {
    const valor = respostas[p.id]
    if (valor === undefined) return
    somas[p.domKey] += (valor/4)*100*p.peso
    pesos[p.domKey] += p.peso
  })
  const scores = {} as Record<DomKey, number>
  DOMINIOS.forEach(k => { scores[k] = Math.max(0, Math.min(100, Math.round(somas[k]/pesos[k]))) })
  return scores
}

// ── COMPONENTE ────────────────────────────────────────────────────────────────
function AvaliarPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const criancaIdParam = searchParams.get('criancaId')

  const [crianca, setCrianca] = useState<Crianca | null>(null)
  const [fase, setFase] = useState<Fase>("loading")
  const [respostas, setRespostas] = useState<Respostas>({})
  const [pergAtual, setPergAtual] = useState(0)
  const [scores, setScores] = useState<Record<DomKey, number> | null>(null)

  useEffect(() => {
  async function carregar() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/care/login'); return }

    const baseQ = supabase.from('criancas')
      .select('id, nome, idade_anos, data_nascimento, genero')
      .eq('responsavel_id', user.id)
      .eq('ativo', true)

    const { data } = await (criancaIdParam
      ? baseQ.eq('id', criancaIdParam)
      : baseQ.order('criado_em', { ascending: true }).limit(1)
    ).single()

    if (data) setCrianca(data)
    setFase("confirmacao")
  }
  carregar()
}, [router, criancaIdParam])

  const idadeMeses = calcularIdadeMeses(crianca?.data_nascimento ?? null, crianca?.idade_anos ?? null)
  const { perguntas } = montarPerguntas(idadeMeses, respostas)
  const total = perguntas.length
  const perg = perguntas[pergAtual]
  const opcoes = perg?.tipo === "escolha" ? perg.opcoes ?? [] : perg?.escala ?? EP
  const pct = fase === "perguntas" && total > 0 ? Math.round(((pergAtual+1)/total)*100) : 0

  function responder(valor: number) {
    if (!perg) return
    const novas = { ...respostas, [perg.id]: valor }
    setRespostas(novas)
    setTimeout(() => {
      const { perguntas: novasPergs } = montarPerguntas(idadeMeses, novas)
      const idx = novasPergs.findIndex(p => p.id === perg.id)
      if (idx < novasPergs.length - 1) {
        setPergAtual(idx + 1)
      } else {
        salvar(novas, novasPergs)
      }
    }, 350)
  }

  async function salvar(resps: Respostas, pergs: Pergunta[]) {
    if (!crianca) return
    setFase("salvando")
    const sc = calcularScores(resps, pergs)
    setScores(sc)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.from('radar_snapshots').insert({
        crianca_id: crianca.id,
        score_comunicacao: sc.comunicacao,
        score_social: sc.social,
        score_atencao: sc.atencao,
        score_regulacao: sc.regulacao,
        score_brincadeira: sc.brincadeira,
        score_flexibilidade: sc.flexibilidade,
        score_autonomia: sc.autonomia,
        score_motivacao: sc.motivacao,
      })
      await supabase.from('avaliacoes').insert({
        crianca_id: crianca.id,
        responsavel_id: user.id,
        idade_crianca: crianca.idade_anos,
        respostas: resps,
        score_comunicacao: sc.comunicacao,
        score_social: sc.social,
        score_atencao: sc.atencao,
        score_regulacao: sc.regulacao,
        score_brincadeira: sc.brincadeira,
        score_flexibilidade: sc.flexibilidade,
        score_autonomia: sc.autonomia,
        score_motivacao: sc.motivacao,
        score_geral: Math.round(Object.values(sc).reduce((a,b)=>a+b,0)/8),
        tipo: 'care_internal', origem: 'web', convertido: true,
      })
    }
    setFase("resultado")
  }

  const nome = crianca?.nome.split(' ')[0] ?? 'seu filho'
  const bg = "radial-gradient(ellipse 80% 60% at 20% 10%,rgba(122,224,64,.10) 0%,transparent 55%),radial-gradient(ellipse 60% 70% at 80% 90%,rgba(43,191,164,.13) 0%,transparent 55%),linear-gradient(160deg,#e8f8ff 0%,#f0fdfb 35%,#edfff8 65%,#ddf4ff 100%)"
  const card: React.CSSProperties = {background:"rgba(255,255,255,.84)",backdropFilter:"blur(14px)",borderRadius:24,border:"1px solid rgba(43,191,164,.18)",boxShadow:"0 4px 28px rgba(43,191,164,.07)",padding:"28px 22px",width:"100%",maxWidth:560,boxSizing:"border-box"}

  return (
    <div style={{minHeight:"100vh",background:bg,fontFamily:"var(--font-sans)",color:"#1E3A5F"}}>
      <nav style={{background:"rgba(255,255,255,.75)",backdropFilter:"blur(16px)",borderBottom:"1px solid rgba(43,191,164,.15)",padding:"0 20px",height:56,display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:50}}>
        <FractaLogo logo="care" height={28} alt="FractaCare" />
        <span style={{fontSize:".75rem",color:"#8a9ab8"}}>
          {fase==="perguntas" ? `Pergunta ${Math.min(pergAtual+1,total)} de ${total}` : fase==="confirmacao" ? "Avaliação" : fase==="salvando" ? "Salvando..." : "Resultado"}
        </span>
        <span style={{fontSize:".72rem",color:"#8a9ab8"}}>Privado · Seguro</span>
      </nav>

      {/* Barra de progresso */}
      <div style={{height:4,background:"rgba(43,191,164,.15)"}}>
        <div style={{height:"100%",width:`${pct}%`,background:"linear-gradient(90deg,#2BBFA4,#7AE040)",transition:"width .4s ease"}} />
      </div>

      <div style={{display:"flex",flexDirection:"column",alignItems:"center",padding:"32px 16px 80px",gap:16}}>

        {/* LOADING */}
        {fase==="loading" && (
          <div style={{...card,textAlign:"center",padding:"48px"}}>
            <div style={{width:32,height:32,borderRadius:"50%",border:"3px solid rgba(43,191,164,.2)",borderTopColor:"#2BBFA4",animation:"spin 1s linear infinite",margin:"0 auto"}} />
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </div>
        )}

        {/* CONFIRMAÇÃO */}
        {fase==="confirmacao" && crianca && (
          <div style={{...card,textAlign:"center"}}>
            <div style={{fontSize:"2.5rem",marginBottom:16}}>📋</div>
            <h2 style={{fontSize:"1.3rem",fontWeight:800,color:"#1E3A5F",marginBottom:8}}>
              Vamos avaliar {crianca.nome}?
            </h2>
            <p style={{fontSize:".88rem",color:"#5a7a9a",lineHeight:1.7,marginBottom:8}}>
              Avaliação adaptada para {crianca.nome} com base na idade atual.
            </p>
            <p style={{fontSize:".78rem",color:"#8a9ab8",marginBottom:24}}>
              {idadeMeses} meses · {total} perguntas adaptativas · Leva cerca de 3 minutos
            </p>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:24}}>
              {[["📊","8 domínios"],["⏱","~3 minutos"],["🔄","Radar atualiza"]].map(([i,l])=>(
                <div key={l} style={{background:"rgba(43,191,164,.06)",borderRadius:12,padding:"12px 8px",textAlign:"center"}}>
                  <div style={{fontSize:"1.2rem",marginBottom:4}}>{i}</div>
                  <div style={{fontSize:".68rem",color:"#5a7a9a",fontWeight:600}}>{l}</div>
                </div>
              ))}
            </div>
            <button onClick={()=>setFase("perguntas")} style={{
              width:"100%",padding:"14px",borderRadius:50,border:"none",
              background:"linear-gradient(135deg,#2BBFA4,#7AE040)",
              color:"white",fontWeight:800,fontSize:".95rem",cursor:"pointer",
              fontFamily:"var(--font-sans)",boxShadow:"0 4px 18px rgba(43,191,164,.35)",
            }}>Começar avaliação</button>
          </div>
        )}

        {/* PERGUNTAS */}
        {fase==="perguntas" && perg && (
          <div style={card}>
            <div style={{display:"inline-flex",alignItems:"center",gap:8,background:"rgba(43,191,164,.10)",border:"1px solid rgba(43,191,164,.18)",borderRadius:50,padding:"5px 12px",fontSize:".62rem",fontWeight:800,color:"#2BBFA4",textTransform:"uppercase",letterSpacing:".08em",marginBottom:14}}>
              {perg.dominio}
            </div>
            <h2 style={{fontSize:"1.25rem",lineHeight:1.3,fontWeight:800,color:"#1E3A5F",marginBottom:8}}>
              {perg.texto(nome)}
            </h2>
            {perg.exemplo && (
              <p style={{fontSize:".85rem",color:"#5a7a9a",lineHeight:1.65,marginBottom:20}}>{perg.exemplo}</p>
            )}
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {opcoes.map(op => {
                const ativo = respostas[perg.id] === op.valor
                return (
                  <button key={op.texto} onClick={()=>responder(op.valor)} style={{
                    width:"100%",textAlign:"left",padding:"14px 16px",borderRadius:14,
                    border: ativo ? "2px solid #2BBFA4" : "1.5px solid rgba(43,191,164,.15)",
                    background: ativo ? "linear-gradient(145deg,#effff7,#f6fffb)" : "rgba(255,255,255,.82)",
                    cursor:"pointer",fontFamily:"var(--font-sans)",transition:"all .15s",
                    boxShadow: ativo ? "0 4px 16px rgba(43,191,164,.12)" : "none",
                  }}>
                    <div style={{fontSize:".92rem",fontWeight:700,color:"#1E3A5F",display:"flex",alignItems:"center",gap:10}}>
                      {ativo && <span style={{color:"#2BBFA4"}}>✓</span>}
                      {op.texto}
                    </div>
                  </button>
                )
              })}
            </div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:20}}>
              <button onClick={()=>pergAtual>0?setPergAtual(p=>p-1):setFase("confirmacao")} style={{
                background:"rgba(255,255,255,.7)",border:"1.5px solid rgba(43,191,164,.2)",borderRadius:50,
                color:"#1E3A5F",fontFamily:"var(--font-sans)",fontWeight:700,fontSize:".88rem",
                padding:"10px 18px",cursor:"pointer",
              }}>← Voltar</button>
              <span style={{fontSize:".72rem",color:"#8a9ab8"}}>Adaptada à idade e perfil</span>
            </div>
          </div>
        )}

        {/* SALVANDO */}
        {fase==="salvando" && (
          <div style={{...card,textAlign:"center",padding:"48px"}}>
            <div style={{fontSize:"2rem",marginBottom:16}}>🧠</div>
            <h2 style={{fontSize:"1.1rem",fontWeight:800,color:"#1E3A5F",marginBottom:8}}>Atualizando o mapa de {nome}</h2>
            <p style={{fontSize:".85rem",color:"#5a7a9a",lineHeight:1.7}}>Calculando os scores e salvando o radar de habilidades...</p>
            <div style={{width:32,height:32,borderRadius:"50%",border:"3px solid rgba(43,191,164,.2)",borderTopColor:"#2BBFA4",animation:"spin 1s linear infinite",margin:"20px auto 0"}} />
          </div>
        )}

        {/* RESULTADO */}
        {fase==="resultado" && scores && (
          <div style={card}>
            <div style={{textAlign:"center",marginBottom:24}}>
              <div style={{fontSize:"2rem",marginBottom:10}}>✅</div>
              <h2 style={{fontSize:"1.2rem",fontWeight:800,color:"#1E3A5F",marginBottom:6}}>Radar de {nome} atualizado!</h2>
              <p style={{fontSize:".85rem",color:"#5a7a9a",lineHeight:1.7}}>O mapa de habilidades foi recalculado com base nas respostas de hoje.</p>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:20}}>
              {(Object.entries(scores) as [DomKey,number][]).map(([k,v])=>{
                const nomes: Record<DomKey,string> = {comunicacao:"Comunicação",social:"Social",atencao:"Atenção",regulacao:"Regulação",brincadeira:"Brincadeira",flexibilidade:"Flexibilidade",autonomia:"Autonomia",motivacao:"Motivação"}
                const cores: Record<DomKey,string> = {comunicacao:"#2BBFA4",social:"#4FC3D8",atencao:"#7AE040",regulacao:"#2A7BA8",brincadeira:"#2BBFA4",flexibilidade:"#4FC3D8",autonomia:"#7AE040",motivacao:"#2A7BA8"}
                return (
                  <div key={k} style={{background:"#f8faff",borderRadius:12,padding:"12px"}}>
                    <div style={{fontSize:".72rem",fontWeight:600,color:"#8a9ab8",marginBottom:4}}>{nomes[k]}</div>
                    <div style={{fontSize:"1.2rem",fontWeight:800,color:cores[k]}}>{v}%</div>
                    <div style={{height:4,background:"rgba(0,0,0,.06)",borderRadius:99,marginTop:6}}>
                      <div style={{height:"100%",width:`${v}%`,background:cores[k],borderRadius:99}} />
                    </div>
                  </div>
                )
              })}
            </div>
            <button onClick={()=>router.push('/care/dashboard/avaliacao')} style={{
              width:"100%",padding:"13px",borderRadius:50,border:"none",
              background:"linear-gradient(135deg,#2BBFA4,#7AE040)",
              color:"white",fontWeight:800,fontSize:".9rem",cursor:"pointer",
              fontFamily:"var(--font-sans)",
            }}>Ver dashboard atualizado →</button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function AvaliarPage() {
  return (
    <Suspense fallback={null}>
      <AvaliarPageInner />
    </Suspense>
  )
}
