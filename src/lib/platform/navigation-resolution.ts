import {
  resolveAuthorizedClinicalWorkspaces,
  resolveAuthorizedProductSurfaces,
  resolveEntryDecision,
  type EntryDecision,
  type PlatformIdentityEvidence,
} from "./access-resolution";
import {
  ProductSurfaceRegistry,
  type ProductSurfaceId,
} from "./registry";

export const SAFE_PLATFORM_EXIT = "/";

function belongsToSurface(pathname: string, surfaceId: ProductSurfaceId) {
  const surface = ProductSurfaceRegistry.getById(surfaceId);
  return Boolean(
    surface?.routePrefixes.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    ),
  );
}

export function validateSurfaceRedirect(
  redirect: string | null | undefined,
  surfaceId: ProductSurfaceId,
  loginPath: string,
): string | null {
  if (
    !redirect ||
    !redirect.startsWith("/") ||
    redirect.startsWith("//") ||
    redirect.includes("\\")
  ) {
    return null;
  }

  let parsed: URL;
  try {
    parsed = new URL(redirect, "https://fracta.internal");
  } catch {
    return null;
  }

  if (
    parsed.origin !== "https://fracta.internal" ||
    parsed.pathname === loginPath ||
    !belongsToSurface(parsed.pathname, surfaceId)
  ) {
    return null;
  }

  return `${parsed.pathname}${parsed.search}${parsed.hash}`;
}

export function resolveSurfaceDestination(
  surfaceId: ProductSurfaceId,
  redirect: string | null | undefined,
  loginPath: string,
): string {
  const surface = ProductSurfaceRegistry.getById(surfaceId);
  const validRedirect = validateSurfaceRedirect(
    redirect,
    surfaceId,
    loginPath,
  );
  return validRedirect ?? surface?.entryPath ?? SAFE_PLATFORM_EXIT;
}

export function resolveProductSurfaceEntry(
  identity: PlatformIdentityEvidence,
): EntryDecision<ProductSurfaceId> {
  return resolveEntryDecision(resolveAuthorizedProductSurfaces(identity));
}

export function canAccessProductSurface(
  identity: PlatformIdentityEvidence,
  surfaceId: ProductSurfaceId,
): boolean {
  return resolveAuthorizedProductSurfaces(identity).includes(surfaceId);
}

export function canEnterClinicAba(
  identity: PlatformIdentityEvidence,
): boolean {
  const decision = resolveEntryDecision(
    resolveAuthorizedClinicalWorkspaces(identity, "clinic"),
  );
  return decision.kind === "direct" && decision.target === "aba";
}

export function surfaceLoginPath(surfaceId: ProductSurfaceId): string {
  return surfaceId === "clinic" ? "/login" : "/care/login";
}

export function protectedSurfaceLoginRedirect(
  surfaceId: ProductSurfaceId,
  pathname: string,
): string {
  const loginPath = surfaceLoginPath(surfaceId);
  const redirect = belongsToSurface(pathname, surfaceId)
    ? `?redirect=${encodeURIComponent(pathname)}`
    : "";
  return `${loginPath}${redirect}`;
}
