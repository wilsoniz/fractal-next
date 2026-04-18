import type { AreaTriagem } from './config'

export type PerguntaTriagem = {
  id: string
  area: AreaTriagem
  texto: string
}

export const PERGUNTAS_TRIAGEM: PerguntaTriagem[] = [
  { id: 'tdi_1', area: 'TDI', texto: 'Seu filho encontra dificuldades em aprender coisas novas ou mais avançadas?' },
  { id: 'tdi_2', area: 'TDI', texto: 'Como ele se sai nas interações sociais? Tem amigos com quem gosta de brincar?' },
  { id: 'tdi_3', area: 'TDI', texto: 'Vocês percebem algum desafio em seguir regras sociais ou entender o que os outros querem?' },
  { id: 'tdi_4', area: 'TDI', texto: 'Seu filho enfrenta dificuldades para entender o que os outros estão pensando ou planejando?' },
  { id: 'tdi_5', area: 'TDI', texto: 'Seu filho tem dificuldade para aprender, entender as coisas e resolver problemas?' },
  { id: 'tdi_6', area: 'TDI', texto: 'Ele parece esquecer com frequência ou tem problemas para lembrar das coisas?' },
  { id: 'tdi_7', area: 'TDI', texto: 'Vocês notam que ele encontra dificuldades para lidar com situações do dia a dia?' },
  { id: 'tc_1',  area: 'TC',  texto: 'Seu filho teve atrasos na fala ou na compreensão da linguagem?' },
  { id: 'tc_2',  area: 'TC',  texto: 'Ele parece ter dificuldade em se dar bem com outras crianças ou fazer amigos?' },
  { id: 'tc_3',  area: 'TC',  texto: 'Notam problemas nas interações sociais ou para se comunicar?' },
  { id: 'tc_4',  area: 'TC',  texto: 'Seu filho tem problemas para falar ou entender o que os outros dizem?' },
  { id: 'tc_5',  area: 'TC',  texto: 'Ele faz movimentos ou comportamentos repetitivos que podem interferir no jeito como ele pensa?' },
  { id: 'tc_6',  area: 'TC',  texto: 'É difícil para ele entender sinais sociais ou interagir com outras crianças?' },
  { id: 'tea_1', area: 'TEA', texto: 'A comunicação e socialização do seu filho são impactadas?' },
  { id: 'tea_2', area: 'TEA', texto: 'Ele tem dificuldade em entender emoções ou expressar as próprias emoções?' },
  { id: 'tea_3', area: 'TEA', texto: 'Como é a interação dele com outras crianças? Ele parece ter dificuldades?' },
  { id: 'tea_4', area: 'TEA', texto: 'Seu filho enfrenta desafios na comunicação e interação social?' },
  { id: 'tea_5', area: 'TEA', texto: 'Ele tem comportamentos repetitivos ou interesses muito específicos?' },
  { id: 'tea_6', area: 'TEA', texto: 'Notam que ele tem dificuldade para entender expressões faciais e emoções?' },
  { id: 'tdah_1', area: 'TDAH', texto: 'Seu filho tem dificuldades em prestar atenção e pode ser impulsivo?' },
  { id: 'tdah_2', area: 'TDAH', texto: 'Ele parece ter problemas para pensar nas consequências de suas ações?' },
  { id: 'tdah_3', area: 'TDAH', texto: 'Vocês notam desafios na autonomia e na capacidade de tomar decisões?' },
  { id: 'tdah_4', area: 'TDAH', texto: 'Seu filho tem problemas para prestar atenção ou se concentra muito pouco?' },
  { id: 'tdah_5', area: 'TDAH', texto: 'Ele é muito agitado ou age impulsivamente?' },
  { id: 'tdah_6', area: 'TDAH', texto: 'Vocês percebem que ele tem dificuldades para se organizar e planejar as coisas?' },
  { id: 'ta_1',  area: 'TA',  texto: 'Seu filho enfrenta dificuldades específicas em algumas matérias na escola?' },
  { id: 'ta_2',  area: 'TA',  texto: 'Como isso afeta a maneira como ele se relaciona com os outros?' },
  { id: 'ta_3',  area: 'TA',  texto: 'Seu filho enfrenta desafios específicos em matérias da escola?' },
  { id: 'ta_4',  area: 'TA',  texto: 'Isso afeta a maneira como ele se sente consigo mesmo ou o motiva?' },
  { id: 'tm_1',  area: 'TM',  texto: 'Seu filho tem dificuldades com atividades físicas ou movimentos?' },
  { id: 'tm_2',  area: 'TM',  texto: 'Ele faz movimentos estranhos que chamam a atenção?' },
  { id: 'tm_3',  area: 'TM',  texto: 'Seu filho tem dificuldades com atividades físicas ou coordenação motora?' },
  { id: 'tm_4',  area: 'TM',  texto: 'Ele faz movimentos estranhos ou diferentes das outras crianças?' },
  { id: 'tt_1',  area: 'TT',  texto: 'Seu filho faz movimentos ou sons repetitivos que ele não consegue controlar?' },
  { id: 'tt_2',  area: 'TT',  texto: 'Isso afeta o jeito como ele se sente consigo mesmo ou como se relaciona com os outros?' },
  { id: 'tt_3',  area: 'TT',  texto: 'Seu filho faz movimentos ou sons repetitivos que chamam a atenção?' },
  { id: 'tt_4',  area: 'TT',  texto: 'Ele tem dificuldade em controlar esses movimentos ou sons?' },
  { id: 'out_1', area: 'Outros', texto: 'Se houver outros problemas específicos, como eles afetam seu filho?' },
]
