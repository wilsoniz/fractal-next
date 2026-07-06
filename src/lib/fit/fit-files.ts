// I/O de arquivos do paciente (Supabase Storage + fit_files). Ver ADR-FIT-003.
// Bucket privado; exibição via Signed URLs de 300s. Hard-delete (blob + metadado).

import { supabase, getFitUser } from "./supabase-fit";
import type { FitFile, FitFileCategory } from "./types";

const BUCKET = "fit-files";
const SIGNED_TTL = 300;

export const ALLOWED_MIME = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "video/mp4",
  "video/quicktime",
];

export function maxBytesFor(mime: string): number {
  return mime.startsWith("video/") ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
}

function sanitize(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .slice(0, 120) || "arquivo";
}

export async function uploadFile(params: {
  patientId: string;
  file: File;
  category: FitFileCategory;
  takenAt?: string | null;
  notes?: string | null;
}): Promise<FitFile | null> {
  const { user } = await getFitUser();
  if (!user) return null;
  if (!ALLOWED_MIME.includes(params.file.type)) return null;
  if (params.file.size > maxBytesFor(params.file.type)) return null;

  const path = `patient/${params.patientId}/${crypto.randomUUID()}-${sanitize(params.file.name)}`;
  const up = await supabase.storage.from(BUCKET).upload(path, params.file, {
    contentType: params.file.type,
    upsert: false,
  });
  if (up.error) return null;

  const { data, error } = await supabase
    .from("fit_files")
    .insert({
      patient_id: params.patientId,
      uploaded_by: user.id,
      storage_path: path,
      file_name: params.file.name,
      mime_type: params.file.type,
      size_bytes: params.file.size,
      category: params.category,
      taken_at: params.takenAt ?? null,
      notes: params.notes ?? null,
    })
    .select()
    .single();

  if (error) {
    // rollback do blob se o metadado falhar
    await supabase.storage.from(BUCKET).remove([path]);
    return null;
  }
  return data as FitFile;
}

export async function listFiles(patientId: string, category?: FitFileCategory): Promise<FitFile[]> {
  let q = supabase.from("fit_files").select("*").eq("patient_id", patientId).eq("status", "active");
  if (category) q = q.eq("category", category);
  const { data } = await q.order("created_at", { ascending: false });
  return (data as FitFile[] | null) ?? [];
}

export async function signedUrl(path: string): Promise<string | null> {
  const { data } = await supabase.storage.from(BUCKET).createSignedUrl(path, SIGNED_TTL);
  return data?.signedUrl ?? null;
}

export async function updateFile(
  id: string,
  patch: Partial<Pick<FitFile, "category" | "notes" | "taken_at">>,
): Promise<boolean> {
  const { error } = await supabase.from("fit_files").update(patch).eq("id", id);
  return !error;
}

// Hard-delete: remove o blob e o metadado (LGPD).
export async function deleteFile(file: FitFile): Promise<boolean> {
  await supabase.storage.from(BUCKET).remove([file.storage_path]);
  const { error } = await supabase.from("fit_files").delete().eq("id", file.id);
  return !error;
}
