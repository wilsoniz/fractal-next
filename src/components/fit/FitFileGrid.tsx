"use client";

// FitFileGrid — grade de arquivos do paciente (thumbnails via Signed URL).

import { useEffect, useState } from "react";
import { signedUrl, deleteFile } from "@/lib/fit/fit-files";
import { FILE_CATEGORY_LABELS, type FitFile } from "@/lib/fit/types";

function fmtDate(d: string): string {
  return new Date(d).toLocaleDateString("pt-BR");
}
function sizeMb(n: number | null): string {
  return n != null ? `${(n / 1024 / 1024).toFixed(1)} MB` : "";
}
function isImage(mime: string | null): boolean {
  return !!mime && mime.startsWith("image/");
}

export function FitFileGrid({
  files,
  canDelete,
  onChanged,
}: {
  files: FitFile[];
  canDelete: boolean;
  onChanged: () => void | Promise<void>;
}) {
  if (files.length === 0) {
    return <div style={{ fontSize: ".82rem", color: "#8ea3c0", padding: "8px 0" }}>Nenhum arquivo.</div>;
  }
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 12 }}>
      {files.map((f) => (
        <FitFileCard key={f.id} file={f} canDelete={canDelete} onChanged={onChanged} />
      ))}
    </div>
  );
}

function FitFileCard({ file, canDelete, onChanged }: { file: FitFile; canDelete: boolean; onChanged: () => void | Promise<void> }) {
  const [thumb, setThumb] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    if (isImage(file.mime_type)) {
      signedUrl(file.storage_path).then((u) => { if (alive) setThumb(u); });
    }
    return () => { alive = false; };
  }, [file.storage_path, file.mime_type]);

  async function handleOpen() {
    const u = await signedUrl(file.storage_path);
    if (u) window.open(u, "_blank", "noopener,noreferrer");
  }

  async function handleDelete() {
    if (!confirm(`Excluir "${file.file_name}" definitivamente? Esta ação não pode ser desfeita.`)) return;
    setBusy(true);
    const ok = await deleteFile(file);
    setBusy(false);
    if (ok) await onChanged();
  }

  return (
    <div style={{ background: "rgba(20,28,48,.7)", border: "1px solid rgba(90,110,160,.22)", borderRadius: 12, overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <button
        onClick={handleOpen}
        style={{ display: "block", width: "100%", height: 110, border: "none", cursor: "pointer", background: "rgba(15,22,40,.6)", padding: 0 }}
        title="Abrir"
      >
        {isImage(file.mime_type) && thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumb} alt={file.file_name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <div style={{ display: "grid", placeItems: "center", height: "100%", color: "#8ea3c0", fontSize: "1.8rem" }}>
            {file.mime_type === "application/pdf" ? "📄" : file.mime_type?.startsWith("video/") ? "🎬" : "📁"}
          </div>
        )}
      </button>
      <div style={{ padding: "8px 10px", display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ fontSize: ".76rem", fontWeight: 600, color: "#e6edf6", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={file.file_name}>
          {file.file_name}
        </div>
        <div style={{ fontSize: ".66rem", color: "#8ea3c0" }}>
          {FILE_CATEGORY_LABELS[file.category]} · {fmtDate(file.taken_at ?? file.created_at)} · {sizeMb(file.size_bytes)}
        </div>
        {canDelete && (
          <button
            onClick={handleDelete}
            disabled={busy}
            style={{ alignSelf: "flex-start", marginTop: 2, background: "none", border: "none", color: "#f0857a", cursor: busy ? "default" : "pointer", fontSize: ".72rem", fontWeight: 600, padding: 0, fontFamily: "var(--font-sans)" }}
          >
            Excluir
          </button>
        )}
      </div>
    </div>
  );
}
