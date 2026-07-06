"use client";

// FitQuestionnaireForm — formulário da anamnese, gerado a partir do schema.
// Grava answers (jsonb) por seção; salva como rascunho ou concluído.

import { useState } from "react";
import { QUESTIONNAIRE_SCHEMA } from "@/lib/fit/questionnaire-schema";
import type { FitQuestionnaireStatus } from "@/lib/fit/types";
import { FitSection, fitLabelStyle, fitFieldStyle } from "./FitSection";

type Answers = Record<string, Record<string, string>>;

export function FitQuestionnaireForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Answers;
  onSave: (answers: Answers, status: FitQuestionnaireStatus) => Promise<void>;
  onCancel?: () => void;
}) {
  const [answers, setAnswers] = useState<Answers>(initial ?? {});
  const [saving, setSaving] = useState<null | FitQuestionnaireStatus>(null);

  function setField(section: string, field: string, value: string) {
    setAnswers((prev) => ({ ...prev, [section]: { ...(prev[section] ?? {}), [field]: value } }));
  }

  async function handleSave(status: FitQuestionnaireStatus) {
    setSaving(status);
    try {
      await onSave(answers, status);
    } finally {
      setSaving(null);
    }
  }

  return (
    <div>
      {QUESTIONNAIRE_SCHEMA.map((section) => (
        <FitSection key={section.key} title={section.title}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {section.fields.map((f) => {
              const val = answers[section.key]?.[f.key] ?? "";
              return (
                <div key={f.key}>
                  <label style={fitLabelStyle}>{f.label}</label>
                  {f.type === "textarea" ? (
                    <textarea
                      value={val}
                      onChange={(e) => setField(section.key, f.key, e.target.value)}
                      rows={2}
                      style={{ ...fitFieldStyle, resize: "vertical" }}
                    />
                  ) : (
                    <input
                      value={val}
                      onChange={(e) => setField(section.key, f.key, e.target.value)}
                      style={fitFieldStyle}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </FitSection>
      ))}

      <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
        <button
          onClick={() => handleSave("completed")}
          disabled={saving !== null}
          style={{
            padding: "11px 18px",
            borderRadius: 10,
            border: "none",
            background: "linear-gradient(135deg,#7c5cfc,#5b8def)",
            color: "#0b1120",
            fontWeight: 800,
            fontSize: ".88rem",
            cursor: saving ? "default" : "pointer",
            fontFamily: "var(--font-sans)",
          }}
        >
          {saving === "completed" ? "Salvando..." : "Concluir questionário"}
        </button>
        <button
          onClick={() => handleSave("draft")}
          disabled={saving !== null}
          style={{
            padding: "11px 18px",
            borderRadius: 10,
            border: "1px solid rgba(90,110,160,.4)",
            background: "transparent",
            color: "#c5d2e6",
            fontWeight: 600,
            fontSize: ".88rem",
            cursor: saving ? "default" : "pointer",
            fontFamily: "var(--font-sans)",
          }}
        >
          {saving === "draft" ? "Salvando..." : "Salvar rascunho"}
        </button>
        {onCancel && (
          <button
            onClick={onCancel}
            disabled={saving !== null}
            style={{
              padding: "11px 14px",
              borderRadius: 10,
              border: "none",
              background: "transparent",
              color: "#8ea3c0",
              fontSize: ".85rem",
              cursor: "pointer",
              fontFamily: "var(--font-sans)",
            }}
          >
            Cancelar
          </button>
        )}
      </div>
    </div>
  );
}
