"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FractaLogo } from "@/components/fracta/FractaLogo";
import { supabase } from "@/lib/supabase";

type DomKey =
  | "comunicacao"
  | "social"
  | "atencao"
  | "regulacao"
  | "brincadeira"
  | "flexibilidade"
  | "autonomia"
  | "motivacao";

type EscalaItem = { texto: string; valor: number };
type Escala = EscalaItem[];

type Respostas = Record<string, number>;

type Faixa =
  | "12-17"
  | "18-23"
  | "24-35"
  | "36-47"
  | "48-59"
  | "60-71"
  | "72-96";

type Pergunta = {
  id: string;
  dominio: string;
  domKey: DomKey;
  peso: number;
  idadeMinMeses?: number;
  idadeMaxMeses?: number;
  escala?: Escala;
  tipo?: "escala" | "escolha";
  texto: (nome: string, genero?: "M"|"F"|"") => string;
  exemplo?: string;
  opcoes?: EscalaItem[];
  gatilho?: (ctx: {
    idadeMeses: number;
    respostas: Respostas;
    triagem: TriagemFlags;
  }) => boolean;
};

type TriagemFlags = {
  aprofundarComunicacao: boolean;
  aprofundarSocial: boolean;
  aprofundarAtencao: boolean;
  aprofundarRegulacao: boolean;
  aprofundarFlexibilidade: boolean;
  aprofundarTelas: boolean;
};

const DOMINIOS_BASE: Record<DomKey, number> = {
  comunicacao: 50,
  social: 50,
  atencao: 50,
  regulacao: 50,
  brincadeira: 50,
  flexibilidade: 50,
  autonomia: 50,
  motivacao: 50,
};


const ESCALA_POS: Escala = [
  { texto: "Sempre", valor: 4 },
  { texto: "Frequentemente", valor: 3 },
  { texto: "Às vezes", valor: 2 },
  { texto: "Raramente", valor: 1 },
  { texto: "Ainda não faz isso", valor: 0 },
];
const ESCALA_INV: Escala = [
  { texto: "Nunca acontece", valor: 4 },
  { texto: "Raramente", valor: 3 },
  { texto: "Às vezes", valor: 2 },
  { texto: "Frequentemente", valor: 1 },
  { texto: "Quase sempre", valor: 0 },
];
const ESCALA_INTENSIDADE: Escala = [
  { texto: "Não acontece", valor: 4 },
  { texto: "Acontece mas passa rápido", valor: 3 },
  { texto: "Às vezes atrapalha a rotina", valor: 2 },
  { texto: "Atrapalha bastante", valor: 1 },
  { texto: "Atrapalha muito — é difícil continuar o dia", valor: 0 },
];

const PERGUNTAS_BASE: Pergunta[] = [
  // ── COMUNICAÇÃO ──
  { id:"com_mando_basico", dominio:"Comunicação — Mando", domKey:"comunicacao", peso:1.4, idadeMinMeses:12, idadeMaxMeses:23, escala:ESCALA_POS,
    texto:(n)=>`${n} consegue pedir o que quer de alguma forma — mesmo sem palavras?`,
    exemplo:"Aponta, leva sua mão, olha para o objeto e para você, vocaliza, faz gesto." },
  { id:"com_mando_verbal", dominio:"Comunicação — Mando verbal", domKey:"comunicacao", peso:1.4, idadeMinMeses:24, escala:ESCALA_POS,
    texto:(n)=>`${n} usa palavras ou frases para pedir o que quer?`,
    exemplo:"Palavras soltas, frases curtas ou frases completas — dependendo da idade." },
  { id:"com_tato_objetos", dominio:"Comunicação — Nomeação", domKey:"comunicacao", peso:1.2, idadeMinMeses:18, idadeMaxMeses:47, escala:ESCALA_POS,
    texto:(n)=>`${n} nomeia objetos, pessoas ou imagens que conhece?`,
    exemplo:"Nomeia objetos do dia a dia, pessoas próximas ou imagens em livros." },
  { id:"com_intraverbal", dominio:"Comunicação — Conversa", domKey:"comunicacao", peso:1.1, idadeMinMeses:36, escala:ESCALA_POS,
    texto:(n)=>`${n} responde perguntas simples sobre o dia a dia?`,
    exemplo:"'O que você comeu?' 'Onde está o cachorro?' 'O que aconteceu no parque?'" },
  { id:"com_atencao_conjunta", dominio:"Comunicação — Atenção conjunta", domKey:"comunicacao", peso:1.3, idadeMinMeses:12, idadeMaxMeses:35, escala:ESCALA_POS,
    texto:(n)=>`${n} tenta chamar sua atenção para mostrar algo interessante?`,
    exemplo:"Mostra algo interessante, aponta para coisas, olha para você para compartilhar a experiência." },
  // ── SOCIAL ──
  { id:"soc_responde_nome", dominio:"Social — Orientação", domKey:"social", peso:1.4, idadeMinMeses:12, escala:ESCALA_POS,
    texto:(n)=>`Quando você chama ${n} pelo nome, ele responde de alguma forma?`,
    exemplo:"Olha, vira, para o que está fazendo, fala 'hã' ou se aproxima." },
  { id:"soc_imitacao", dominio:"Social — Imitação", domKey:"social", peso:1.3, idadeMinMeses:12, idadeMaxMeses:47, escala:ESCALA_POS,
    texto:(n)=>`${n} imita ações ou gestos que você faz?`,
    exemplo:"Imita gestos, expressões, ações com brinquedos ou sequências de movimentos." },
  { id:"soc_jogo_paralelo", dominio:"Social — Jogo", domKey:"social", peso:1.1, idadeMinMeses:18, idadeMaxMeses:47, escala:ESCALA_POS,
    texto:(n)=>`${n} brinca perto de outras crianças sem precisar interagir o tempo todo?`,
    exemplo:"Jogo paralelo — cada um brinca do seu jeito mas aceita a presença do outro." },
  { id:"soc_jogo_cooperativo", dominio:"Social — Jogo cooperativo", domKey:"social", peso:1.2, idadeMinMeses:36, escala:ESCALA_POS,
    texto:(n)=>`${n} brinca junto com outras crianças seguindo uma lógica compartilhada?`,
    exemplo:"Faz de conta com papéis, brincadeira com turnos, jogo de regra simples." },
  { id:"soc_empatia", dominio:"Social — Empatia", domKey:"social", peso:1.0, idadeMinMeses:24, escala:ESCALA_POS,
    texto:(n)=>`${n} reage quando alguém está triste ou machucado?`,
    exemplo:"Olha, se aproxima, oferece objeto, expressa preocupação." },
  // ── ATENÇÃO ──
  { id:"aten_sustentada", dominio:"Atenção — Sustentada", domKey:"atencao", peso:1.2, idadeMinMeses:12, escala:ESCALA_POS,
    texto:(n)=>`${n} consegue se manter engajado em uma atividade por tempo adequado para a idade?`,
    exemplo:"Consegue brincar, folhear livro, montar peças ou explorar algo por alguns minutos." },
  { id:"aten_instrucao_simples", dominio:"Atenção — Seguir instrução", domKey:"atencao", peso:1.3, idadeMinMeses:12, escala:ESCALA_POS,
    texto:(n)=>`${n} segue instruções simples no contexto da rotina?`,
    exemplo:"Instruções simples como 'vem cá', 'pega o sapato', ou sequências com mais de uma etapa." },
  { id:"aten_telas", dominio:"Atenção — Telas", domKey:"atencao", peso:0.8, idadeMinMeses:12, tipo:"escolha",
    texto:(n)=>`Em média, quanto tempo por dia ${n} passa em telas?`,
    opcoes:[
      {texto:"Menos de 30 minutos",valor:4},{texto:"30 a 60 minutos",valor:3},
      {texto:"1 a 2 horas",valor:2},{texto:"2 a 3 horas",valor:1},{texto:"Mais de 3 horas",valor:0}] },
  // ── REGULAÇÃO ──
  { id:"reg_frustracao", dominio:"Regulação — Frustração", domKey:"regulacao", peso:1.3, idadeMinMeses:12, escala:ESCALA_INV,
    texto:(n)=>`Quando algo não acontece como ${n} quer, a reação é muito intensa ou demorada?`,
    exemplo:"Choro intenso, gritos, jogar-se no chão ou agressão que demora para passar." },
  { id:"reg_espera", dominio:"Regulação — Espera", domKey:"regulacao", peso:1.2, idadeMinMeses:18, escala:ESCALA_POS,
    texto:(n)=>`${n} consegue esperar alguns segundos quando você sinaliza que já vai atender?`,
    exemplo:"Espera por água, colo, comida, atenção quando há um sinal claro de 'já vou'." },
  { id:"reg_transicao", dominio:"Regulação — Transições", domKey:"regulacao", peso:1.1, idadeMinMeses:18, escala:ESCALA_INV,
    texto:(n)=>`Mudanças de atividade ou rotina costumam gerar reações muito difíceis em ${n}?`,
    exemplo:"Parar telas, sair do parque, trocar de ambiente, mudar planos." },
  { id:"reg_aceita_nao", dominio:"Regulação — Tolerância ao não", domKey:"regulacao", peso:1.2, idadeMinMeses:24, escala:ESCALA_INV,
    texto:(n)=>`Ouvir "não" ou "agora não" gera reações muito intensas em ${n}?`,
    exemplo:"Choro intenso, agressão, gritos, recusa prolongada." },
  // ── BRINCADEIRA ──
  { id:"bri_exploratoria", dominio:"Brincadeira — Exploração", domKey:"brincadeira", peso:1.1, idadeMinMeses:12, idadeMaxMeses:35, escala:ESCALA_POS,
    texto:(n)=>`${n} explora objetos e brinquedos de formas variadas?`,
    exemplo:"Empilha, derruba, encaixa, abre, fecha — vai além de uso repetitivo." },
  { id:"bri_simbolica", dominio:"Brincadeira — Simbólica", domKey:"brincadeira", peso:1.2, idadeMinMeses:18, idadeMaxMeses:59, escala:ESCALA_POS,
    texto:(n)=>`${n} faz brincadeiras de faz de conta?`,
    exemplo:"18-24m: alimenta boneca; 36m: cria cenas; 48m+: personagens e histórias." },
  { id:"bri_com_par", dominio:"Brincadeira — Com parceiro", domKey:"brincadeira", peso:1.1, idadeMinMeses:12, escala:ESCALA_POS,
    texto:(n)=>`${n} amplia a brincadeira quando você participa com ele?`,
    exemplo:"Fica mais engajado, aceita variações, cria novas ideias." },
  // ── FLEXIBILIDADE ──
  { id:"fle_rotina", dominio:"Flexibilidade — Rotina", domKey:"flexibilidade", peso:1.2, idadeMinMeses:18, escala:ESCALA_INV,
    texto:(n)=>`${n} fica muito perturbado quando algo na rotina muda inesperadamente?`,
    exemplo:"Caminho diferente, pessoa diferente, ordem das coisas mudou." },
  { id:"fle_interesses", dominio:"Flexibilidade — Interesses", domKey:"flexibilidade", peso:1.0, idadeMinMeses:24, escala:ESCALA_INV,
    texto:(n)=>`${n} tem interesses muito restritos que dominam a maior parte do tempo?`,
    exemplo:"Só quer falar de um tema, rejeita qualquer outra proposta." },
  { id:"fle_erro", dominio:"Flexibilidade — Tolerância ao erro", domKey:"flexibilidade", peso:1.0, idadeMinMeses:30, escala:ESCALA_INV,
    texto:(n)=>`${n} reage de forma muito intensa quando erra ou algo não sai como planejou?`,
    exemplo:"Apaga tudo, destrói o que fez, recusa tentar de novo." },
  // ── AUTONOMIA ──
  { id:"aut_autocuidado", dominio:"Autonomia — Autocuidado", domKey:"autonomia", peso:1.1, idadeMinMeses:18, escala:ESCALA_POS,
    texto:(n)=>`${n} participa das rotinas de cuidado pessoal de forma adequada para a idade?`,
    exemplo:"Coopera no banho, lava as mãos, tenta se vestir ou é independente nas rotinas básicas." },
  { id:"aut_alimentacao", dominio:"Autonomia — Alimentação", domKey:"autonomia", peso:1.0, idadeMinMeses:18, escala:ESCALA_POS,
    texto:(n)=>`${n} come uma variedade razoável de alimentos sem grande resistência?`,
    exemplo:"Aceita diferentes texturas e sabores — sem rituais muito rígidos." },
  { id:"aut_iniciativa", dominio:"Autonomia — Iniciativa", domKey:"autonomia", peso:1.0, idadeMinMeses:24, escala:ESCALA_POS,
    texto:(n)=>`${n} tenta fazer coisas sozinho antes de pedir ajuda?`,
    exemplo:"Tenta abrir embalagem, montar brinquedo, se vestir." },
  // ── MOTIVAÇÃO ──
  { id:"mot_curiosidade", dominio:"Motivação — Curiosidade", domKey:"motivacao", peso:1.1, idadeMinMeses:12, escala:ESCALA_POS,
    texto:(n)=>`${n} demonstra curiosidade genuína por atividades, objetos ou situações novas?`,
    exemplo:"Se aproxima, observa, toca, explora — não evita o novo por padrão." },
  { id:"mot_persistencia", dominio:"Motivação — Persistência", domKey:"motivacao", peso:1.0, idadeMinMeses:24, escala:ESCALA_POS,
    texto:(n)=>`Quando algo é difícil, ${n} tenta mais de uma vez antes de desistir?`,
    exemplo:"Repete tentativas, busca estratégias, pede ajuda e tenta de novo." },
  { id:"mot_aprendizagem", dominio:"Motivação — Aprendizagem", domKey:"motivacao", peso:1.2, idadeMinMeses:18, escala:ESCALA_POS,
    texto:(n)=>`${n} aprende melhor quando a atividade é significativa ou divertida para ele?`,
    exemplo:"Engaja mais, aprende mais rápido, generaliza com motivação." },
  // ── COMPORTAMENTO PROBLEMA ──
  { id:"cp_agressao", dominio:"Comportamento — Agressão", domKey:"regulacao", peso:1.3, idadeMinMeses:18, escala:ESCALA_INTENSIDADE, tipo:"escala",
    texto:(n)=>`Com que frequência ${n} bate, morde, arranha ou machuca outras pessoas?`,
    exemplo:"Inclui reações a frustração, transições ou quando contrariado." },
  { id:"cp_autolesao", dominio:"Comportamento — Autolesão", domKey:"regulacao", peso:1.5, idadeMinMeses:12, escala:ESCALA_INTENSIDADE, tipo:"escala",
    texto:(n)=>`${n} bate a cabeça, morde a si mesmo ou se machuca quando frustrado?`,
    exemplo:"Qualquer forma de autolesão durante episódios difíceis." },
  { id:"cp_movimentos", dominio:"Comportamento — Estereotipias", domKey:"flexibilidade", peso:1.0, idadeMinMeses:18, escala:ESCALA_INTENSIDADE, tipo:"escala",
    texto:(n)=>`${n} apresenta movimentos repetitivos frequentes — balançar, girar, agitar as mãos?`,
    exemplo:"Estereotipias que ocorrem com frequência ao longo do dia." },
  { id:"cp_rigidez", dominio:"Comportamento — Rigidez", domKey:"flexibilidade", peso:1.1, idadeMinMeses:24, escala:ESCALA_INTENSIDADE, tipo:"escala",
    texto:(n)=>`${n} insiste em rituais muito rígidos ao ponto de travar o dia?`,
    exemplo:"Mesma ordem, mesmo lugar, mesma sequência — recusa qualquer variação." },
  // ── FINAL ──
  { id:"queixa_principal", dominio:"Prioridade da família", domKey:"motivacao", peso:0.5, tipo:"escolha",
    texto:()=>"O que mais tem pesado para a família hoje?",
    opcoes:[
      {texto:"Quero ajudar meu filho a aprender novas habilidades",valor:4},
      {texto:"Quero melhorar comunicação e interação social",valor:3},
      {texto:"Quero lidar com momentos difíceis — birras, agressão, rigidez",valor:2},
      {texto:"Quero entender meu filho melhor e saber como estimulá-lo",valor:3},
      {texto:"Estou preocupado com o desenvolvimento e quero avaliação completa",valor:2}] },
];

const PERGUNTAS_APROFUNDAMENTO: Pergunta[] = [
  { id:"ap_com_ecoico", dominio:"Comunicação — Imitação vocal", domKey:"comunicacao", peso:1.3, idadeMinMeses:12, idadeMaxMeses:47, escala:ESCALA_POS,
    texto:(n)=>`${n} repete sons, sílabas ou palavras quando você fala para ele imitar?`,
    exemplo:"Repete quando você fala devagar e pede para imitar — sons, sílabas ou palavras simples.",
    gatilho:({triagem})=>triagem.aprofundarComunicacao },
  { id:"ap_com_pedido_ajuda", dominio:"Comunicação — Pedir ajuda", domKey:"comunicacao", peso:1.2, idadeMinMeses:18, escala:ESCALA_POS,
    texto:(n)=>`Quando não consegue fazer algo, ${n} pede ajuda de alguma forma?`,
    exemplo:"Leva até você, vocaliza, fala 'ajuda', olha alternando entre objeto e você.",
    gatilho:({triagem})=>triagem.aprofundarComunicacao },
  { id:"ap_soc_contato_olho", dominio:"Social — Contato visual", domKey:"social", peso:1.3, idadeMinMeses:12, escala:ESCALA_POS,
    texto:(n)=>`${n} usa o olhar para se comunicar — olha para você quando quer algo ou para compartilhar?`,
    exemplo:"Não apenas olho no olho passivo — uso ativo do olhar como comunicação.",
    gatilho:({triagem})=>triagem.aprofundarSocial },
  { id:"ap_soc_isolamento", dominio:"Social — Isolamento", domKey:"social", peso:1.2, idadeMinMeses:24, escala:ESCALA_INV,
    texto:(n)=>`${n} prefere brincar sozinho a maior parte do tempo, mesmo com outras crianças disponíveis?`,
    exemplo:"Afasta ativamente ou ignora completamente a presença de outras crianças.",
    gatilho:({triagem})=>triagem.aprofundarSocial },
  { id:"ap_aten_distrai", dominio:"Atenção — Distractibilidade", domKey:"atencao", peso:1.1, idadeMinMeses:30, escala:ESCALA_INTENSIDADE,
    texto:(n)=>`${n} se distrai com tanta facilidade que não consegue terminar atividades?`,
    exemplo:"Qualquer coisa ao redor tira o foco e é difícil voltar para o que estava fazendo.",
    gatilho:({triagem})=>triagem.aprofundarAtencao },
  { id:"ap_aten_pos_tela", dominio:"Atenção — Impacto das telas", domKey:"atencao", peso:1.0, idadeMinMeses:18, escala:ESCALA_INTENSIDADE,
    texto:(n)=>`Após usar telas, ${n} fica mais difícil de engajar em atividades sem tela?`,
    exemplo:"Mais irritado, agitado, recusa atividades, chora ao desligar.",
    gatilho:({triagem})=>triagem.aprofundarTelas||triagem.aprofundarAtencao },
  { id:"ap_reg_duracao", dominio:"Regulação — Duração da crise", domKey:"regulacao", peso:1.2, idadeMinMeses:18, tipo:"escolha",
    texto:(n)=>`Quando ${n} entra em crise, quanto tempo costuma durar até se reorganizar?`,
    opcoes:[
      {texto:"Alguns segundos a 2 minutos",valor:4},{texto:"2 a 5 minutos",valor:3},
      {texto:"5 a 15 minutos",valor:2},{texto:"15 a 30 minutos",valor:1},
      {texto:"Mais de 30 minutos ou não consegue se reorganizar",valor:0}],
    gatilho:({triagem})=>triagem.aprofundarRegulacao },
  { id:"ap_reg_frequencia", dominio:"Regulação — Frequência", domKey:"regulacao", peso:1.1, idadeMinMeses:18, tipo:"escolha",
    texto:(n)=>`Com que frequência ${n} tem episódios de crise?`,
    opcoes:[
      {texto:"Raramente — menos de 1 vez por semana",valor:4},
      {texto:"1 a 2 vezes por semana",valor:3},{texto:"3 a 5 vezes por semana",valor:2},
      {texto:"1 a 2 vezes por dia",valor:1},{texto:"Várias vezes por dia",valor:0}],
    gatilho:({triagem})=>triagem.aprofundarRegulacao },
];
function calcularIdadeDetalhada(dataNascimento: string) {
  const hoje = new Date();
  const nasc = new Date(`${dataNascimento}T00:00:00`);
  if (Number.isNaN(nasc.getTime())) return null;
  let anos = hoje.getFullYear() - nasc.getFullYear();
  let meses = hoje.getMonth() - nasc.getMonth();
  let dias = hoje.getDate() - nasc.getDate();
  if (dias < 0) meses--;
  if (meses < 0) { anos--; meses += 12; }
  const idadeMeses = anos * 12 + meses;
  return {
    anos, meses, idadeMeses,
    texto: anos > 0
      ? `${anos} ano${anos !== 1 ? "s" : ""} e ${meses} mes${meses !== 1 ? "es" : ""}`
      : `${meses} mes${meses !== 1 ? "es" : ""}`,
  };
}

function obterFaixa(idadeMeses: number): Faixa {
  if (idadeMeses <= 17) return "12-17";
  if (idadeMeses <= 23) return "18-23";
  if (idadeMeses <= 35) return "24-35";
  if (idadeMeses <= 47) return "36-47";
  if (idadeMeses <= 59) return "48-59";
  if (idadeMeses <= 71) return "60-71";
  return "72-96";
}

function dentroDaFaixa(idadeMeses: number, min?: number, max?: number): boolean {
  if (min !== undefined && idadeMeses < min) return false;
  if (max !== undefined && idadeMeses > max) return false;
  return true;
}

function idadeMinimaPergunta(idadeMeses: number) {
  if (idadeMeses <= 17) return 12;
  if (idadeMeses <= 23) return 18;
  if (idadeMeses <= 35) return 24;
  if (idadeMeses <= 47) return 36;
  if (idadeMeses <= 59) return 48;
  if (idadeMeses <= 71) return 60;
  return 72;
}

function fatorIdade(idadeMeses: number, pergunta: Pergunta) {
  const base = pergunta.idadeMinMeses ?? idadeMinimaPergunta(idadeMeses);
  const delta = Math.max(0, idadeMeses - base);
  return 1 + Math.min(delta * 0.015, 0.35);
}
const PERGUNTAS_CUSPIDE: Pergunta[] = [];
function criarTriagemFlags(respostas: Respostas): TriagemFlags {
  return {
    aprofundarComunicacao: (respostas["com_mando_basico"] ?? 4) <= 2 || (respostas["com_mando_verbal"] ?? 4) <= 2 || (respostas["com_atencao_conjunta"] ?? 4) <= 1,
    aprofundarSocial: (respostas["soc_responde_nome"] ?? 4) <= 2 || (respostas["soc_imitacao"] ?? 4) <= 1,
    aprofundarAtencao: (respostas["aten_sustentada"] ?? 4) <= 1 || (respostas["aten_instrucao_simples"] ?? 4) <= 1,
    aprofundarRegulacao: (respostas["reg_frustracao"] ?? 4) <= 1 || (respostas["cp_agressao"] ?? 4) <= 2 || (respostas["cp_autolesao"] ?? 4) <= 2,
    aprofundarFlexibilidade: (respostas["fle_rotina"] ?? 4) <= 1 || (respostas["cp_rigidez"] ?? 4) <= 1,
    aprofundarTelas: (respostas["aten_telas"] ?? 4) <= 1,
  };
}
function montarPerguntasDinamicas(idadeMeses: number, respostas: Respostas) {
  const triagem = criarTriagemFlags(respostas);

  const base = PERGUNTAS_BASE.filter((p) =>
    dentroDaFaixa(idadeMeses, p.idadeMinMeses, p.idadeMaxMeses)
  );

  const aprofundamento = PERGUNTAS_APROFUNDAMENTO.filter((p) => {
    if (!dentroDaFaixa(idadeMeses, p.idadeMinMeses, p.idadeMaxMeses)) return false;
    return p.gatilho
      ? p.gatilho({ idadeMeses, respostas, triagem })
      : true;
  });

  const cuspides = PERGUNTAS_CUSPIDE.filter((p) =>
    dentroDaFaixa(idadeMeses, p.idadeMinMeses, p.idadeMaxMeses)
  );

  return {
    triagem,
    perguntas: [...base, ...aprofundamento, ...cuspides],
  };
}


function pronome(genero: "M"|"F"|"", tipo: "ele"|"ela"|"do"|"da"|"o"|"a") {
  const masc: Record<string, string> = { ele:"ele", ela:"ele", do:"do", da:"do", o:"o", a:"o" };
  const fem: Record<string, string>  = { ele:"ela", ela:"ela", do:"da", da:"da", o:"a", a:"a" };
  return genero === "F" ? fem[tipo] : masc[tipo];
}

function calcularScores(
  perguntas: Pergunta[],
  respostas: Respostas,
  idadeMeses: number
): Record<DomKey, number> {
  const somas: Record<DomKey, number> = { ...DOMINIOS_BASE };
  const pesos: Record<DomKey, number> = {
    comunicacao: 1,
    social: 1,
    atencao: 1,
    regulacao: 1,
    brincadeira: 1,
    flexibilidade: 1,
    autonomia: 1,
    motivacao: 1,
  };

  perguntas.forEach((p) => {
    const valor = respostas[p.id];
    if (valor === undefined) return;

    const pesoFinal = p.peso * fatorIdade(idadeMeses, p);
    somas[p.domKey] += (valor / 4) * 100 * pesoFinal;
    pesos[p.domKey] += pesoFinal;
  });

  const scores = {} as Record<DomKey, number>;

  (Object.keys(somas) as DomKey[]).forEach((key) => {
    scores[key] = Math.max(
      0,
      Math.min(100, Math.round(somas[key] / pesos[key]))
    );
  });

  return scores;
}

const S = {
  bg: {
    minHeight: "100vh",
    background:
      "radial-gradient(ellipse 80% 60% at 20% 10%, rgba(122,224,64,.10) 0%, transparent 55%), radial-gradient(ellipse 60% 70% at 80% 90%, rgba(43,191,164,.13) 0%, transparent 55%), linear-gradient(160deg,#e8f8ff 0%,#f0fdfb 35%,#edfff8 65%,#ddf4ff 100%)",
    fontFamily: "var(--font-sans)",
    color: "#1E3A5F",
  } as React.CSSProperties,
  card: {
    background: "rgba(255,255,255,.84)",
    backdropFilter: "blur(14px)",
    borderRadius: 24,
    border: "1px solid rgba(43,191,164,.18)",
    boxShadow: "0 4px 28px rgba(43,191,164,.07)",
    padding: "36px",
    width: "100%",
    maxWidth: 680,
  } as React.CSSProperties,
  input: {
    width: "100%",
    padding: "13px 16px",
    border: "2px solid rgba(43,191,164,.2)",
    borderRadius: 14,
    fontFamily: "var(--font-sans)",
    fontSize: "1rem",
    color: "#1E3A5F",
    background: "#f7fdff",
    outline: "none",
    transition: "border-color .2s",
    boxSizing: "border-box" as const,
  } as React.CSSProperties,
  btnPrimary: {
    background: "linear-gradient(135deg,#2BBFA4,#7AE040)",
    border: "none",
    borderRadius: 50,
    color: "white",
    fontFamily: "var(--font-sans)",
    fontWeight: 800,
    fontSize: ".95rem",
    padding: "14px 32px",
    cursor: "pointer",
    boxShadow: "0 4px 18px rgba(43,191,164,.35)",
    transition: "all .25s",
  } as React.CSSProperties,
  btnGhost: {
    background: "rgba(255,255,255,.7)",
    border: "1.5px solid rgba(43,191,164,.2)",
    borderRadius: 50,
    color: "#1E3A5F",
    fontFamily: "var(--font-sans)",
    fontWeight: 700,
    fontSize: ".9rem",
    padding: "12px 20px",
    cursor: "pointer",
  } as React.CSSProperties,
};

export default function AvaliacaoPage() {
  const router = useRouter();

  const [fase, setFase] = useState<"intro" | "perguntas" | "loading">("intro");
  const [nomeCrianca, setNomeCrianca] = useState("");
  const [generoCrianca, setGeneroCrianca] = useState<"M"|"F"|"">("");
  const [dataNascimento, setDataNascimento] = useState("");
  const [nomeResp, setNomeResp] = useState("");
  const [emailResp, setEmailResp] = useState("");
  const [pergAtual, setPergAtual] = useState(0);
  const [respostas, setRespostas] = useState<Respostas>({});
  const [erroIntro, setErroIntro] = useState("");

  const idadeInfo = useMemo(
    () => (dataNascimento ? calcularIdadeDetalhada(dataNascimento) : null),
    [dataNascimento]
  );

  const idadeMeses = idadeInfo?.idadeMeses ?? 0;
  const faixa = idadeInfo ? obterFaixa(idadeMeses) : null;

  const { perguntas, triagem } = useMemo(() => {
    if (!idadeInfo) {
      return {
        perguntas: [] as Pergunta[],
        triagem: criarTriagemFlags({}),
      };
    }
    return montarPerguntasDinamicas(idadeInfo.idadeMeses, respostas);
  }, [idadeInfo, respostas]);

  const total = perguntas.length;
  const perg = perguntas[pergAtual];
  const opcoes =
    perg?.tipo === "escolha" ? perg.opcoes ?? [] : perg?.escala ?? ESCALA_POS;
  const pct =
    fase === "intro" || total === 0
      ? 0
      : Math.round(((pergAtual + 1) / total) * 100);

  function validarIntro() {
    if (!nomeCrianca.trim()) return "Por favor, informe o nome da criança.";
    if (!generoCrianca) return "Por favor, selecione o sexo da criança.";
    if (!dataNascimento) return "Por favor, informe a data de nascimento.";
    if (!idadeInfo) return "Data de nascimento inválida.";
    if (idadeInfo.idadeMeses < 12 || idadeInfo.idadeMeses > 96) {
      return "No momento, a avaliação foi desenhada para crianças entre 1 e 8 anos.";
    }
    return "";
  }

  function comecar() {
    const erro = validarIntro();
    if (erro) {
      setErroIntro(erro);
      return;
    }

    setErroIntro("");
    setFase("perguntas");
  }

function responder(valor: number) {
  if (!perg) return;
  const novasRespostas = {
    ...respostas,
    [perg.id]: valor,
  };

  // Salva resposta imediatamente para mostrar feedback visual
  setRespostas(novasRespostas);

  // Aguarda 350ms antes de avançar
  setTimeout(() => {
    const proximaEstrutura = montarPerguntasDinamicas(idadeMeses, novasRespostas);
    const novasPerguntas = proximaEstrutura.perguntas;
    const indiceAtualNaNovaLista = novasPerguntas.findIndex(p => p.id === perg.id);
    const ultimoIndice = indiceAtualNaNovaLista;
    if (ultimoIndice < novasPerguntas.length - 1) {
      setPergAtual(ultimoIndice + 1);
      return;
    }
    void irParaResultado(novasRespostas, novasPerguntas);
  }, 350);
}
  function voltar() {
    if (pergAtual === 0) {
      setFase("intro");
      return;
    }
    setPergAtual((i) => i - 1);
  }

  async function irParaResultado(
    resps: Respostas,
    perguntasFinais: Pergunta[]
  ) {
    setFase("loading");

    const scores = calcularScores(perguntasFinais, resps, idadeMeses);
    const idadeAnosInteira = idadeInfo?.anos ?? 0;

    // Compatibilidade com o fluxo atual
    sessionStorage.setItem("fracta_nome", nomeCrianca);
    sessionStorage.setItem("fracta_genero", generoCrianca);
    sessionStorage.setItem("fracta_idade", String(idadeAnosInteira));
    sessionStorage.setItem("fracta_resp", nomeResp || "você");
    sessionStorage.setItem("fracta_email", emailResp);
    sessionStorage.setItem("fracta_radar", JSON.stringify(scores));

    // Novos campos para V2
    sessionStorage.setItem("fracta_data_nascimento", dataNascimento);
    sessionStorage.setItem("fracta_idade_meses", String(idadeMeses));
    sessionStorage.setItem("fracta_faixa", faixa ?? "");
    sessionStorage.setItem("fracta_resps", JSON.stringify(resps));
    sessionStorage.setItem(
      "fracta_questionario_meta",
      JSON.stringify({
        totalPerguntas: perguntasFinais.length,
        flags: triagem,
      })
    );

    try {
      const payloadAtual = {
        nome_crianca: nomeCrianca,
        idade_crianca: idadeAnosInteira,
        nome_responsavel: nomeResp || null,
        email_responsavel: emailResp || null,
        respostas: resps,
        score_comunicacao: scores.comunicacao,
        score_social: scores.social,
        score_atencao: scores.atencao,
        score_regulacao: scores.regulacao,
        score_brincadeira: scores.brincadeira,
        score_flexibilidade: scores.flexibilidade,
        score_autonomia: scores.autonomia,
        score_motivacao: scores.motivacao,
        score_geral: Math.round(
          Object.values(scores).reduce((a, b) => a + b, 0) / 8
        ),
        tipo: "captura",
        origem: "web",
        convertido: false,
      };

      const { data, error } = await supabase
        .from("avaliacoes")
        .insert(payloadAtual)
        .select("id")
        .single();

      if (!error && data?.id) {
        sessionStorage.setItem("fracta_avaliacao_id", data.id);
      }

      if (emailResp) {
        await supabase.from("leads").upsert(
          {
            email: emailResp,
            nome: nomeResp || null,
            origem: "avaliacao_captura",
          },
          { onConflict: "email" }
        );
      }
    } catch (err) {
      console.error("Erro ao salvar avaliação:", err);
    }

    setTimeout(() => router.push("/captura/resultado"), 1800);
  }

  return (
    <div style={S.bg}>
      <nav
        style={{
          background: "rgba(255,255,255,.75)",
          backdropFilter: "blur(16px)",
          borderBottom: "1px solid rgba(43,191,164,.15)",
          padding: "0 20px",
          height: 56,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          position: "sticky",
          top: 0,
          zIndex: 50,
        }}
      >
        <Link href="/care" style={{ textDecoration: "none" }}>
          <FractaLogo logo="care" height={30} alt="FractaCare" />
        </Link>

        <span style={{ fontSize: ".75rem", color: "#8a9ab8" }}>
          {fase === "intro"
            ? "Identificação"
            : fase === "perguntas"
            ? `Pergunta ${Math.min(pergAtual + 1, total)} de ${total}`
            : "Gerando resultado..."}
        </span>

        <span style={{ fontSize: ".72rem", color: "#8a9ab8" }}>
          Gratuito · Sem cartão
        </span>
      </nav>

      <div style={{ height: 4, background: "rgba(43,191,164,.15)" }}>
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            background: "linear-gradient(90deg,#2BBFA4,#7AE040)",
            borderRadius: "0 2px 2px 0",
            transition: "width .4s ease",
          }}
        />
      </div>

      <div
        style={{
          minHeight: "calc(100vh - 60px)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "40px 18px 80px",
        }}
      >
        {fase === "perguntas" && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 0,
              marginBottom: 28,
            }}
          >
            {["Identificação", "Avaliação", "Resultado"].map((label, i) => {
              const step = i + 1;
              const current = 2;
              const done = step < current;
              const active = step === current;

              return (
                <div
                  key={label}
                  style={{ display: "flex", alignItems: "center" }}
                >
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                    }}
                  >
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: "50%",
                        background: done
                          ? "linear-gradient(135deg,#2BBFA4,#7AE040)"
                          : active
                          ? "#1E3A5F"
                          : "rgba(43,191,164,.12)",
                        color: done || active ? "white" : "#8a9ab8",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: ".68rem",
                        fontWeight: 800,
                        boxShadow: active
                          ? "0 0 0 3px rgba(43,191,164,.25)"
                          : "none",
                      }}
                    >
                      {done ? "✓" : step}
                    </div>
                    <span
                      style={{
                        fontSize: ".6rem",
                        color: active ? "#2BBFA4" : "#8a9ab8",
                        marginTop: 4,
                        fontWeight: active ? 700 : 400,
                      }}
                    >
                      {label}
                    </span>
                  </div>

                  {i < 2 && (
                    <div
                      style={{
                        width: 48,
                        height: 2,
                        background: done
                          ? "#2BBFA4"
                          : "rgba(43,191,164,.2)",
                        margin: "0 4px 16px",
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {fase === "intro" && (
          <div style={S.card}>
            <div style={{ textAlign: "center", marginBottom: 28 }}>
              <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>➢</div>
              <h2
                style={{
                  fontSize: "1.4rem",
                  fontWeight: 800,
                  color: "#1E3A5F",
                  marginBottom: 8,
                }}
              >
                Vamos começar!
              </h2>
              <p
                style={{
                  fontSize: ".88rem",
                  color: "#5a7a9a",
                  lineHeight: 1.65,
                  marginBottom: 0,
                }}
              >
                Conte um pouco sobre seu filho para personalizar a avaliação.
                Ela se adapta à idade e às necessidades do dia a dia.
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: ".82rem",
                    fontWeight: 700,
                    color: "#1E3A5F",
                    marginBottom: 6,
                  }}
                >
                  Nome da criança
                </label>
                <input
                  style={S.input}
                  placeholder="Ex: Lucas, Sofia, Pedro..."
                  value={nomeCrianca}
                  onChange={(e) => setNomeCrianca(e.target.value)}
                />
              </div>

              <div>
                <label style={{ display:"block", fontSize:".82rem", fontWeight:700, color:"#1E3A5F", marginBottom:6 }}>
                  Sexo da criança
                </label>
                <div style={{ display:"flex", gap:10 }}>
                  {(["M","F"] as const).map(g => (
                    <button key={g} type="button" onClick={() => setGeneroCrianca(g)} style={{
                      flex:1, padding:"11px", borderRadius:12, border: generoCrianca === g ? "2px solid #2BBFA4" : "1.5px solid rgba(43,191,164,.2)",
                      background: generoCrianca === g ? "rgba(43,191,164,.08)" : "white",
                      color: generoCrianca === g ? "#2BBFA4" : "#5a7a9a",
                      fontWeight:700, fontSize:".88rem", cursor:"pointer", fontFamily:"var(--font-sans)",
                    }}>{g === "M" ? "Menino" : "Menina"}</button>
                  ))}
                </div>
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: ".82rem",
                    fontWeight: 700,
                    color: "#1E3A5F",
                    marginBottom: 6,
                  }}
                >
                  Data de nascimento
                </label>
                <input
                  type="date"
                  style={S.input}
                  value={dataNascimento}
                  max={new Date().toISOString().split("T")[0]}
                  onChange={(e) => setDataNascimento(e.target.value)}
                />
                {idadeInfo && (
                  <div
                    style={{
                      marginTop: 8,
                      fontSize: ".78rem",
                      color: "#2BBFA4",
                      fontWeight: 700,
                    }}
                  >
                    Idade calculada: {idadeInfo.texto}
                    {faixa ? ` · faixa ${faixa} meses` : ""}
                  </div>
                )}
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: ".82rem",
                    fontWeight: 700,
                    color: "#1E3A5F",
                    marginBottom: 6,
                  }}
                >
                  Seu nome (responsável)
                </label>
                <input
                  style={S.input}
                  placeholder="Ex: Ana, Ricardo..."
                  value={nomeResp}
                  onChange={(e) => setNomeResp(e.target.value)}
                />
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: ".82rem",
                    fontWeight: 700,
                    color: "#1E3A5F",
                    marginBottom: 6,
                  }}
                >
                  Seu e-mail
                </label>
                <input
                  type="email"
                  style={S.input}
                  placeholder="seu@email.com"
                  value={emailResp}
                  onChange={(e) => setEmailResp(e.target.value)}
                />
              </div>

              {erroIntro && (
                <div
                  style={{
                    padding: "12px 14px",
                    borderRadius: 14,
                    background: "rgba(255,120,120,.08)",
                    border: "1px solid rgba(255,120,120,.18)",
                    color: "#a14d4d",
                    fontSize: ".84rem",
                    lineHeight: 1.5,
                  }}
                >
                  {erroIntro}
                </div>
              )}

              <button
                style={{ ...S.btnPrimary, marginTop: 8 }}
                onClick={comecar}
              >
                Começar avaliação →
              </button>
            </div>
          </div>
        )}

        {fase === "perguntas" && perg && (
          <div style={S.card}>
            <div style={{ marginBottom: 24 }}>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  background: "rgba(43,191,164,.10)",
                  border: "1px solid rgba(43,191,164,.18)",
                  borderRadius: 50,
                  padding: "6px 12px",
                  fontSize: ".66rem",
                  fontWeight: 800,
                  color: "#2BBFA4",
                  textTransform: "uppercase",
                  letterSpacing: ".08em",
                  marginBottom: 14,
                }}
              >
                {perg.dominio}
              </div>

              <h2
                style={{
                  fontSize: "1.45rem",
                  lineHeight: 1.3,
                  fontWeight: 800,
                  color: "#1E3A5F",
                  marginBottom: 10,
                }}
              >
                {perg.texto(nomeCrianca || "seu filho", generoCrianca)}
              </h2>

              {perg.exemplo && (
                <p
                  style={{
                    fontSize: ".9rem",
                    color: "#5a7a9a",
                    lineHeight: 1.65,
                    margin: 0,
                  }}
                >
                  {perg.exemplo}
                </p>
              )}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {opcoes.map((op) => {
                const ativo = respostas[perg.id] === op.valor;
                return (
                  <button
                    key={`${perg.id}-${op.texto}`}
                    onClick={() => responder(op.valor)}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "16px 18px",
                      borderRadius: 16,
                      border: ativo
                        ? "2px solid #2BBFA4"
                        : "1.5px solid rgba(43,191,164,.15)",
                      background: ativo
                        ? "linear-gradient(145deg,#effff7,#f6fffb)"
                        : "rgba(255,255,255,.82)",
                      cursor: "pointer",
                      fontFamily: "var(--font-sans)",
                      transition: "all .2s",
                      boxShadow: ativo
                        ? "0 8px 24px rgba(43,191,164,.08)"
                        : "0 2px 8px rgba(30,58,95,.03)",
                    }}
                  >
                    <div
                      style={{
                        fontSize: ".94rem",
                        fontWeight: 700,
                        color: "#1E3A5F",
                      }}
                    >
                      {op.texto}
                    </div>
                  </button>
                );
              })}
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                marginTop: 22,
              }}
            >
              <button style={S.btnGhost} onClick={voltar}>
                ← Voltar
              </button>

              <div
                style={{
                  alignSelf: "center",
                  fontSize: ".78rem",
                  color: "#8a9ab8",
                  textAlign: "right",
                }}
              >
                Avaliação dinâmica baseada em idade e perfil atual
              </div>
            </div>
          </div>
        )}

        {fase === "loading" && (
          <div style={S.card}>
            <div style={{ textAlign: "center", padding: "20px 10px" }}>
              <div style={{ fontSize: "2.2rem", marginBottom: 14 }}>🧠</div>
              <h2
                style={{
                  fontSize: "1.25rem",
                  fontWeight: 800,
                  color: "#1E3A5F",
                  marginBottom: 10,
                }}
              >
                Estamos montando o mapa de habilidades de {nomeCrianca}
              </h2>
              <p
                style={{
                  fontSize: ".9rem",
                  color: "#5a7a9a",
                  lineHeight: 1.7,
                  maxWidth: 480,
                  margin: "0 auto",
                }}
              >
                Cruzando idade, oportunidades de desenvolvimento e momentos
                difíceis do dia a dia para gerar uma devolutiva mais inteligente.
              </p>

              <div
                style={{
                  marginTop: 24,
                  height: 8,
                  borderRadius: 99,
                  background: "rgba(43,191,164,.12)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: "74%",
                    height: "100%",
                    borderRadius: 99,
                    background: "linear-gradient(90deg,#2BBFA4,#7AE040)",
                    animation: "none",
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}