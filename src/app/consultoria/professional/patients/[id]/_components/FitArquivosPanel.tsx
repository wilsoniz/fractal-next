"use client";

// Painel da aba "Arquivos" no workspace (profissional). Upload + grade.

import { useEffect, useState } from "react";
import { listFiles } from "@/lib/fit/fit-files";
import { FitFileUpload } from "@/components/fit/FitFileUpload";
import { FitFileGrid } from "@/components/fit/FitFileGrid";
import { FitSection } from "@/components/fit/FitSection";
import type { FitFile, FitFileCategory } from "@/lib/fit/types";

const PRO_CATEGORIES: FitFileCategory[] = ["photo", "exam", "document", "video", "progress_photo", "other"];

export function FitArquivosPanel({ patientId }: { patientId: string }) {
  const [files, setFiles] = useState<FitFile[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setFiles(await listFiles(patientId));
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

  return (
    <div>
      <FitSection title="Enviar arquivo" subtitle="Fotos, exames, documentos ou vídeos do paciente.">
        <FitFileUpload patientId={patientId} categories={PRO_CATEGORIES} onUploaded={load} />
      </FitSection>
      <FitSection title="Arquivos do paciente">
        {loading ? (
          <div style={{ fontSize: ".82rem", color: "#8ea3c0" }}>Carregando…</div>
        ) : (
          <FitFileGrid files={files} canDelete onChanged={load} />
        )}
      </FitSection>
    </div>
  );
}
