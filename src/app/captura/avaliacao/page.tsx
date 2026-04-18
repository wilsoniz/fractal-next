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
  texto: (nome: string) => string;
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
  { texto: "Ainda não", valor: 0 },
];

const ESCALA_INV: Escala = [
  { texto: "Nunca", valor: 4 },
  { texto: "Raramente", valor: 3 },
  { texto: "Às vezes", valor: 2 },
  { texto: "Frequentemente", valor: 1 },
  { texto: "Quase sempre", valor: 0 },
];

const ESCALA_INTENSIDADE: Escala = [
  { texto: "Não acontece", valor: 4 },
  { texto: "Pouco", valor: 3 },
  { texto: "Às vezes atrapalha", valor: 2 },
  { texto: "Atrapalha bastante", valor: 1 },
  { texto: "Atrapalha muito", valor: 0 },
];

function calcularIdadeDetalhada(dataNascimento: string) {
  const hoje = new Date();
  const nasc = new Date(`${dataNascimento}T00:00:00`);

  if (Number.isNaN(nasc.getTime())) {
    return null;
  }

  let anos = hoje.getFullYear() - nasc.getFullYear();
  let meses = hoje.getMonth() - nasc.getMonth();
  let dias = hoje.getDate() - nasc.getDate();

  if (dias < 0) meses--;
  if (meses < 0) {
    anos--;
    meses += 12;
  }

  const idadeMeses = anos * 12 + meses;

  return {
    anos,
    meses,
    idadeMeses,
    texto:
      anos > 0
        ? `${anos} ano${anos !== 1 ? "s" : ""} e ${meses} mes${
            meses !== 1 ? "es" : ""
          }`
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

function dentroDaFaixa(
  idadeMeses: number,
  min?: number,
  max?: number
): boolean {
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

function criarTriagemFlags(respostas: Respostas): TriagemFlags {
  const tela = respostas["triagem_telas_tempo"] ?? 4;
  const transicao = respostas["triagem_transicoes"] ?? 4;
  const frustracao = respostas["triagem_frustracao"] ?? 4;
  const comunicacao = respostas["triagem_pedir"] ?? 4;
  const nome = respostas["triagem_responde_nome"] ?? 4;
  const brincar = respostas["triagem_brinca_com_pessoas"] ?? 4;
  const foco = respostas["triagem_foco"] ?? 4;

  return {
    aprofundarComunicacao: comunicacao <= 2,
    aprofundarSocial: nome <= 2 || brincar <= 2,
    aprofundarAtencao: foco <= 2,
    aprofundarRegulacao: frustracao <= 2,
    aprofundarFlexibilidade: transicao <= 2,
    aprofundarTelas: tela <= 2,
  };
}

const PERGUNTAS_BASE: Pergunta[] = [
  {
    id: "triagem_pedir",
    dominio: "Comunicação funcional",
    domKey: "comunicacao",
    peso: 1.3,
    idadeMinMeses: 12,
    escala: ESCALA_POS,
    texto: (n) => `${n} consegue pedir o que quer de alguma forma?`,
    exemplo: "Por gesto, olhar, apontar, som, palavra ou frase.",
  },
  {
    id: "triagem_responde_nome",
    dominio: "Interação social",
    domKey: "social",
    peso: 1.1,
    idadeMinMeses: 12,
    escala: ESCALA_POS,
    texto: (n) => `Quando você chama ${n} pelo nome, ele costuma responder?`,
    exemplo: "Olha, vira, para o que está fazendo ou responde de algum jeito.",
  },
  {
    id: "triagem_foco",
    dominio: "Atenção",
    domKey: "atencao",
    peso: 1.0,
    idadeMinMeses: 12,
    escala: ESCALA_POS,
    texto: (n) => `${n} consegue ficar envolvido por alguns minutos em uma atividade?`,
    exemplo: "Brincar, folhear livro, encaixar, desenhar ou explorar algo.",
  },
  {
    id: "triagem_frustracao",
    dominio: "Regulação",
    domKey: "regulacao",
    peso: 1.1,
    idadeMinMeses: 12,
    escala: ESCALA_POS,
    texto: (n) => `Quando algo não acontece como ${n} queria, ele consegue se reorganizar depois de um tempo?`,
    exemplo: "Aceita ajuda, muda de foco ou se acalma com apoio.",
  },
  {
    id: "triagem_brinca_com_pessoas",
    dominio: "Engajamento social",
    domKey: "social",
    peso: 1.0,
    idadeMinMeses: 12,
    escala: ESCALA_POS,
    texto: (n) => `${n} gosta de brincar com você ou com outras pessoas?`,
    exemplo: "Procura interação, ri junto, compartilha a brincadeira.",
  },
  {
    id: "triagem_explora_brinquedos",
    dominio: "Brincadeira",
    domKey: "brincadeira",
    peso: 1.0,
    idadeMinMeses: 12,
    escala: ESCALA_POS,
    texto: (n) => `${n} explora brinquedos e objetos de formas diferentes?`,
    exemplo: "Empilha, encaixa, finge, testa possibilidades.",
  },
  {
    id: "triagem_transicoes",
    dominio: "Flexibilidade",
    domKey: "flexibilidade",
    peso: 1.0,
    idadeMinMeses: 18,
    escala: ESCALA_INV,
    texto: (n) => `Mudanças pequenas na rotina costumam deixar ${n} muito irritado?`,
    exemplo: "Trocar de atividade, mudar o caminho, parar algo que estava gostando.",
  },
  {
    id: "triagem_autonomia",
    dominio: "Autonomia",
    domKey: "autonomia",
    peso: 1.0,
    idadeMinMeses: 18,
    escala: ESCALA_POS,
    texto: (n) => `${n} tenta fazer pequenas coisas sozinho no dia a dia?`,
    exemplo: "Pegar objetos, guardar brinquedos, comer, participar da rotina.",
  },
  {
    id: "triagem_curiosidade",
    dominio: "Motivação",
    domKey: "motivacao",
    peso: 1.0,
    idadeMinMeses: 12,
    escala: ESCALA_POS,
    texto: (n) => `${n} demonstra curiosidade por atividades, brinquedos ou pessoas?`,
    exemplo: "Se aproxima, observa, explora, tenta participar.",
  },
  {
    id: "triagem_telas_tempo",
    dominio: "Rotina e telas",
    domKey: "atencao",
    peso: 0.7,
    idadeMinMeses: 12,
    tipo: "escolha",
    texto: (n) => `Em média, quanto tempo por dia ${n} passa em telas?`,
    opcoes: [
      { texto: "Quase nada ou menos de 30 minutos", valor: 4 },
      { texto: "30 a 60 minutos", valor: 3 },
      { texto: "1 a 2 horas", valor: 2 },
      { texto: "2 a 3 horas", valor: 1 },
      { texto: "Mais de 3 horas", valor: 0 },
    ],
  },
  {
    id: "triagem_queixa_principal",
    dominio: "Prioridade da família",
    domKey: "motivacao",
    peso: 0.6,
    tipo: "escolha",
    texto: () => "O que mais tem pesado para vocês hoje?",
    opcoes: [
      { texto: "Quero ajudar meu filho a aprender novas habilidades", valor: 4 },
      { texto: "Quero melhorar comunicação e interação", valor: 3 },
      { texto: "Quero lidar melhor com momentos difíceis do dia a dia", valor: 2 },
      { texto: "Quero mais previsibilidade sobre como estimular em casa", valor: 3 },
    ],
  },
];

const PERGUNTAS_APROFUNDAMENTO: Pergunta[] = [
  {
    id: "aprof_com_pede_ajuda",
    dominio: "Comunicação",
    domKey: "comunicacao",
    peso: 1.2,
    idadeMinMeses: 12,
    escala: ESCALA_POS,
    texto: (n) => `Quando precisa de ajuda, ${n} tenta se comunicar com você?`,
    exemplo: "Olha, aponta, leva até o local, vocaliza ou fala.",
    gatilho: ({ triagem }) => triagem.aprofundarComunicacao,
  },
  {
    id: "aprof_com_nomeia",
    dominio: "Comunicação",
    domKey: "comunicacao",
    peso: 1.0,
    idadeMinMeses: 18,
    escala: ESCALA_POS,
    texto: (n) => `${n} nomeia, aponta ou mostra o que quer compartilhar?`,
    exemplo: "Brinquedos, comidas, animais, coisas da rotina.",
    gatilho: ({ triagem }) => triagem.aprofundarComunicacao,
  },
  {
    id: "aprof_soc_atencao_compartilhada",
    dominio: "Social",
    domKey: "social",
    peso: 1.2,
    idadeMinMeses: 12,
    escala: ESCALA_POS,
    texto: (n) => `${n} compartilha interesse com você em momentos do dia a dia?`,
    exemplo: "Mostra algo, aponta para ver sua reação, tenta dividir a experiência.",
    gatilho: ({ triagem }) => triagem.aprofundarSocial,
  },
  {
    id: "aprof_soc_imitacao",
    dominio: "Social",
    domKey: "social",
    peso: 1.0,
    idadeMinMeses: 12,
    escala: ESCALA_POS,
    texto: (n) => `${n} gosta de imitar ações, gestos ou brincadeiras?`,
    exemplo: "Bater palmas, fazer caretas, copiar movimentos ou ações simples.",
    gatilho: ({ triagem }) => triagem.aprofundarSocial,
  },
  {
    id: "aprof_aten_retoma",
    dominio: "Atenção",
    domKey: "atencao",
    peso: 1.1,
    idadeMinMeses: 18,
    escala: ESCALA_POS,
    texto: (n) => `Depois de se distrair, ${n} consegue voltar para a atividade com pouca ajuda?`,
    exemplo: "Retoma a brincadeira, volta ao livro, reconecta com a proposta.",
    gatilho: ({ triagem }) => triagem.aprofundarAtencao,
  },
  {
    id: "aprof_aten_telas_impacto",
    dominio: "Atenção e telas",
    domKey: "atencao",
    peso: 1.0,
    idadeMinMeses: 18,
    escala: ESCALA_INV,
    texto: (n) => `Depois das telas, ${n} costuma ficar mais difícil de engajar em outras atividades?`,
    exemplo: "Mais irritado, agitado, disperso ou com dificuldade de transição.",
    gatilho: ({ triagem }) => triagem.aprofundarAtencao || triagem.aprofundarTelas,
  },
  {
    id: "aprof_reg_espera",
    dominio: "Regulação",
    domKey: "regulacao",
    peso: 1.1,
    idadeMinMeses: 18,
    escala: ESCALA_POS,
    texto: (n) => `${n} consegue esperar alguns segundos quando você sinaliza que já vai atender?`,
    exemplo: 'Espera breve para água, colo, comida, brinquedo ou atenção.',
    gatilho: ({ triagem }) => triagem.aprofundarRegulacao,
  },
  {
    id: "aprof_reg_intensidade",
    dominio: "Regulação",
    domKey: "regulacao",
    peso: 1.2,
    idadeMinMeses: 12,
    escala: ESCALA_INTENSIDADE,
    texto: (n) => `Quando ${n} se frustra, isso costuma atrapalhar bastante a rotina da casa?`,
    exemplo: "Demora a se reorganizar, fica muito difícil continuar o dia.",
    gatilho: ({ triagem }) => triagem.aprofundarRegulacao,
  },
  {
    id: "aprof_flex_transicao",
    dominio: "Flexibilidade",
    domKey: "flexibilidade",
    peso: 1.1,
    idadeMinMeses: 18,
    escala: ESCALA_POS,
    texto: (n) => `Com aviso e apoio, ${n} consegue fazer transições com mais tranquilidade?`,
    exemplo: "Ir do brincar para o banho, da tela para a refeição, de um ambiente para outro.",
    gatilho: ({ triagem }) => triagem.aprofundarFlexibilidade,
  },
  {
    id: "aprof_flex_nao",
    dominio: "Flexibilidade",
    domKey: "flexibilidade",
    peso: 1.0,
    idadeMinMeses: 24,
    escala: ESCALA_INV,
    texto: (n) => `Ouvir um “agora não” costuma gerar uma reação muito difícil em ${n}?`,
    exemplo: "Choro intenso, gritos, jogar-se no chão, agressão ou recusa prolongada.",
    gatilho: ({ triagem }) => triagem.aprofundarFlexibilidade || triagem.aprofundarRegulacao,
  },
];

const PERGUNTAS_CUSPIDE: Pergunta[] = [
  {
    id: "cuspide_pivotal_aprender",
    dominio: "Aprendizagem",
    domKey: "motivacao",
    peso: 1.0,
    idadeMinMeses: 18,
    escala: ESCALA_POS,
    texto: (n) => `${n} costuma aprender melhor quando a atividade é divertida e significativa para ele?`,
    exemplo: "Com brincadeira, participação do adulto e objetivo claro.",
  },
  {
    id: "cuspide_iniciativa_social",
    dominio: "Iniciativa social",
    domKey: "social",
    peso: 0.9,
    idadeMinMeses: 18,
    escala: ESCALA_POS,
    texto: (n) => `${n} inicia interações para conseguir algo ou para compartilhar algo bom?`,
    exemplo: "Chama, mostra, leva até você, pede para brincar junto.",
  },
  {
    id: "cuspide_brincadeira_funcional",
    dominio: "Brincadeira",
    domKey: "brincadeira",
    peso: 1.0,
    idadeMinMeses: 12,
    escala: ESCALA_POS,
    texto: (n) => `${n} amplia a brincadeira quando você participa com ele?`,
    exemplo: "Fica mais tempo, aceita novas ideias, imita, cria variações.",
  },
];

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

    const proximaEstrutura = montarPerguntasDinamicas(
      idadeMeses,
      novasRespostas
    );
    const novasPerguntas = proximaEstrutura.perguntas;
    const indiceAtualNaNovaLista = novasPerguntas.findIndex(
      (p) => p.id === perg.id
    );

    setRespostas(novasRespostas);

    const ultimoIndice = indiceAtualNaNovaLista;
    if (ultimoIndice < novasPerguntas.length - 1) {
      setPergAtual(ultimoIndice + 1);
      return;
    }

    void irParaResultado(novasRespostas, novasPerguntas);
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
              <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>👶</div>
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
                {perg.texto(nomeCrianca || "seu filho")}
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