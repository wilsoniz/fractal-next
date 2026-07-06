"use client";

// Painel da aba "Questionário" no workspace do paciente.
// Vazio → preencher; existente → resumo por seção + editar.

import { useEffect, useState } from "react";
import { getQuestionnaire, saveQuestionnaire } from "@/lib/fit/fit-questionnaires";
import { QUESTIONNAIRE_SCHEMA } from "@/lib/fit/questionnaire-schema";
import { FitCard } from "@/components/fit/FitCard";
import { FitSection } from "@/components/fit/FitSection";
import { FitQuestionnaireForm } from "@/components/fit/FitQuestionnaireForm";
import type { FitQuestionnaire, FitQuestionnaireStatus } from "@/lib/fit/types";

export function FitQuestionarioPanel({ patientId }: { patientId: string }) {
  const [questionnaire, setQuestionnaire] = useState<FitQuestionnaire | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);

  async function load() {
    const q = await getQuestionnaire(patientId);
    setQuestionnaire(q);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

  async function handleSave(answers: Record<string, Record<string, string>>, status: FitQuestionnaireStatus) {
    const saved = await saveQuestionnaire({
      patientId,
      existingId: questionnaire?.id ?? null,
      answers,
      status,
    });
    if (saved) {
      setQuestionnaire(saved);
      setEditing(false);
    }
  }

  if (loading) return <div style={{ color: "#8ea3c0" }}>Carregando…</div>;

  if (!questionnaire || editing) {
    return (
      <div>
        {!questionnaire && !editing ? (
          <FitCard>
            <div style={{ textAlign: "center", padding: "28px 20px" }}>
              <div style={{ fontSize: ".95rem", fontWeight: 700, color: "#e6edf6" }}>Nenhum questionário ainda</div>
              <div style={{ fontSize: ".82rem", color: "#8ea3c0", marginTop: 6, marginBottom: 16 }}>
                Preencha a anamnese pré-avaliação do paciente.
              </div>
              <button
                onClick={() => setEditing(true)}
                style={{ padding: "10px 18px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#7c5cfc,#5b8def)", color: "#0b1120", fontWeight: 800, fontSize: ".85rem", cursor: "pointer", fontFamily: "var(--font-sans)" }}
              >
                Preencher questionário
              </button>
            </div>
          </FitCard>
        ) : (
          <FitQuestionnaireForm
            initial={questionnaire?.answers}
            onSave={handleSave}
            onCancel={questionnaire ? () => setEditing(false) : undefined}
          />
        )}
      </div>
    );
  }

  // Resumo (read view)
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ fontSize: ".8rem", color: "#8ea3c0" }}>
          {questionnaire.status === "completed" ? "Concluído" : "Rascunho"}
        </div>
        <button
          onClick={() => setEditing(true)}
          style={{ padding: "8px 14px", borderRadius: 9, border: "1px solid rgba(90,110,160,.4)", background: "transparent", color: "#c5d2e6", fontWeight: 600, fontSize: ".82rem", cursor: "pointer", fontFamily: "var(--font-sans)" }}
        >
          Editar
        </button>
      </div>
      {QUESTIONNAIRE_SCHEMA.map((section) => {
        const sec = questionnaire.answers[section.key] ?? {};
        const hasAny = section.fields.some((f) => (sec[f.key] ?? "").trim() !== "");
        return (
          <FitSection key={section.key} title={section.title}>
            {hasAny ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {section.fields.map((f) => {
                  const v = (sec[f.key] ?? "").trim();
                  if (!v) return null;
                  return (
                    <div key={f.key} style={{ display: "flex", gap: 12 }}>
                      <div style={{ width: 180, flexShrink: 0, fontSize: ".78rem", color: "#8ea3c0" }}>{f.label}</div>
                      <div style={{ fontSize: ".84rem", color: "#e6edf6", whiteSpace: "pre-wrap" }}>{v}</div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ fontSize: ".8rem", color: "#8ea3c0" }}>—</div>
            )}
          </FitSection>
        );
      })}
    </div>
  );
}
