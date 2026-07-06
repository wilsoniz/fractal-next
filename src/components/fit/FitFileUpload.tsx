"use client";

// FitFileUpload — envio de arquivo para o Storage (com aviso de consentimento).

import { useRef, useState } from "react";
import { uploadFile, ALLOWED_MIME, maxBytesFor } from "@/lib/fit/fit-files";
import { FILE_CATEGORY_LABELS, type FitFileCategory } from "@/lib/fit/types";
import { fitLabelStyle, fitFieldStyle } from "./FitSection";

export function FitFileUpload({
  patientId,
  categories,
  fixedCategory,
  onUploaded,
}: {
  patientId: string;
  categories: FitFileCategory[];
  fixedCategory?: FitFileCategory;
  onUploaded: () => void | Promise<void>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState<FitFileCategory>(fixedCategory ?? categories[0]);
  const [takenAt, setTakenAt] = useState("");
  const [consent, setConsent] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isProgress = (fixedCategory ?? category) === "progress_photo";

  function pick(f: File | null) {
    setError(null);
    if (!f) { setFile(null); return; }
    if (!ALLOWED_MIME.includes(f.type)) {
      setError("Tipo não permitido. Aceitos: JPEG, PNG, WEBP, PDF, MP4, MOV.");
      setFile(null);
      return;
    }
    if (f.size > maxBytesFor(f.type)) {
      setError(f.type.startsWith("video/") ? "Vídeo acima de 50 MB." : "Arquivo acima de 10 MB.");
      setFile(null);
      return;
    }
    setFile(f);
  }

  async function handleUpload() {
    if (!file || !consent) return;
    setUploading(true);
    setError(null);
    const res = await uploadFile({ patientId, file, category: fixedCategory ?? category, takenAt: takenAt || null });
    setUploading(false);
    if (!res) {
      setError("Falha no envio. Tente novamente.");
      return;
    }
    setFile(null);
    setConsent(false);
    setTakenAt("");
    if (inputRef.current) inputRef.current.value = "";
    await onUploaded();
  }

  return (
    <div style={{ border: "1px dashed rgba(90,110,160,.4)", borderRadius: 12, padding: 14 }}>
      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED_MIME.join(",")}
        onChange={(e) => pick(e.target.files?.[0] ?? null)}
        style={{ fontSize: ".82rem", color: "#c5d2e6", fontFamily: "var(--font-sans)" }}
      />

      {error && <div style={{ marginTop: 8, fontSize: ".78rem", color: "#f08070" }}>{error}</div>}

      {file && (
        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ fontSize: ".82rem", color: "#e6edf6" }}>
            {file.name} <span style={{ color: "#8ea3c0" }}>· {(file.size / 1024 / 1024).toFixed(1)} MB</span>
          </div>

          {!fixedCategory && (
            <div>
              <label style={fitLabelStyle}>Categoria</label>
              <select value={category} onChange={(e) => setCategory(e.target.value as FitFileCategory)} style={fitFieldStyle}>
                {categories.map((c) => <option key={c} value={c}>{FILE_CATEGORY_LABELS[c]}</option>)}
              </select>
            </div>
          )}

          {isProgress && (
            <div>
              <label style={fitLabelStyle}>Data da foto</label>
              <input type="date" value={takenAt} onChange={(e) => setTakenAt(e.target.value)} style={fitFieldStyle} />
            </div>
          )}

          <label style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: ".76rem", color: "#9fb2cf", cursor: "pointer" }}>
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} style={{ marginTop: 2 }} />
            Confirmo que tenho consentimento para armazenar este arquivo (dado de saúde).
          </label>

          <button
            onClick={handleUpload}
            disabled={!consent || uploading}
            style={{ alignSelf: "flex-start", padding: "9px 16px", borderRadius: 9, border: "none", background: !consent || uploading ? "rgba(124,92,252,.4)" : "linear-gradient(135deg,#7c5cfc,#5b8def)", color: "#0b1120", fontWeight: 800, fontSize: ".83rem", cursor: !consent || uploading ? "default" : "pointer", fontFamily: "var(--font-sans)" }}
          >
            {uploading ? "Enviando…" : "Enviar arquivo"}
          </button>
        </div>
      )}
    </div>
  );
}
