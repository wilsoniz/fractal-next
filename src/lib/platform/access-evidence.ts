import type { PlatformIdentityEvidence } from "./access-resolution";

export const DENIED_PLATFORM_IDENTITY_EVIDENCE: PlatformIdentityEvidence =
  Object.freeze({
    authenticated: false,
    hasProfile: false,
    clinicSeniority: null,
    hasCareProfile: false,
    hasDirectChildLink: false,
    hasAssociativeChildLink: false,
  });

export async function readPlatformIdentityEvidence(): Promise<PlatformIdentityEvidence> {
  const { supabase } = await import("@/lib/supabase");
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw userError;
  }

  if (!user) {
    return DENIED_PLATFORM_IDENTITY_EVIDENCE;
  }

  const [profileResult, careProfileResult, directLinkResult, linkResult] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id, nivel_senioridade")
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("perfis")
        .select("id")
        .eq("id", user.id)
        .eq("tipo", "responsavel")
        .maybeSingle(),
      supabase
        .from("criancas")
        .select("id")
        .eq("responsavel_id", user.id)
        .limit(1)
        .maybeSingle(),
      supabase
        .from("crianca_responsaveis")
        .select("crianca_id")
        .eq("responsavel_id", user.id)
        .limit(1)
        .maybeSingle(),
    ]);

  const readError =
    profileResult.error ??
    careProfileResult.error ??
    directLinkResult.error ??
    linkResult.error;

  if (readError) {
    throw readError;
  }

  return Object.freeze({
    authenticated: true,
    hasProfile: profileResult.data !== null,
    clinicSeniority: profileResult.data?.nivel_senioridade ?? null,
    hasCareProfile: careProfileResult.data !== null,
    hasDirectChildLink: directLinkResult.data !== null,
    hasAssociativeChildLink: linkResult.data !== null,
  });
}

export async function loadPlatformIdentityEvidenceSafely(
  reader: () => Promise<PlatformIdentityEvidence> =
    readPlatformIdentityEvidence,
): Promise<PlatformIdentityEvidence> {
  try {
    return await reader();
  } catch {
    return DENIED_PLATFORM_IDENTITY_EVIDENCE;
  }
}
