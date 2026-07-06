// Schema do questionário pré-avaliação (anamnese) — data-driven.
// As perguntas podem evoluir sem migration: o formulário e o JSON derivam daqui.
// O JSON gravado em fit_questionnaires.answers reflete { secao.key: { campo.key: valor } }.

export interface FitQuestionnaireField {
  key: string;
  label: string;
  type: "text" | "textarea";
}

export interface FitQuestionnaireSection {
  key: string;
  title: string;
  fields: FitQuestionnaireField[];
}

export const QUESTIONNAIRE_SCHEMA: FitQuestionnaireSection[] = [
  {
    key: "health",
    title: "Dados de Saúde",
    fields: [
      { key: "conditions", label: "Condições de saúde / doenças", type: "textarea" },
      { key: "medications", label: "Medicações em uso", type: "textarea" },
      { key: "par_q", label: "Restrições médicas p/ atividade física (PAR-Q)", type: "textarea" },
    ],
  },
  {
    key: "injuries",
    title: "Histórico de Lesões",
    fields: [
      { key: "history", label: "Lesões / cirurgias anteriores", type: "textarea" },
      { key: "current", label: "Dores ou limitações atuais", type: "textarea" },
    ],
  },
  {
    key: "training",
    title: "Histórico de Treino",
    fields: [
      { key: "experience", label: "Experiência prévia", type: "textarea" },
      { key: "current_activity", label: "Atividades físicas atuais", type: "text" },
    ],
  },
  {
    key: "goals",
    title: "Objetivos",
    fields: [
      { key: "main_goal", label: "Objetivo principal", type: "text" },
      { key: "secondary", label: "Objetivos secundários", type: "textarea" },
    ],
  },
  {
    key: "routine",
    title: "Rotina",
    fields: [
      { key: "occupation", label: "Ocupação / rotina diária", type: "textarea" },
      { key: "sleep", label: "Sono e recuperação", type: "text" },
      { key: "nutrition", label: "Alimentação", type: "textarea" },
    ],
  },
  {
    key: "availability",
    title: "Disponibilidade",
    fields: [
      { key: "days_per_week", label: "Dias disponíveis por semana", type: "text" },
      { key: "time_per_session", label: "Tempo por sessão", type: "text" },
      { key: "preferred_time", label: "Horários preferidos", type: "text" },
    ],
  },
  {
    key: "gym",
    title: "Academia / Equipamentos",
    fields: [
      { key: "place", label: "Local de treino", type: "text" },
      { key: "equipment", label: "Equipamentos disponíveis", type: "textarea" },
    ],
  },
  {
    key: "notes",
    title: "Observações",
    fields: [{ key: "general", label: "Observações gerais", type: "textarea" }],
  },
];
