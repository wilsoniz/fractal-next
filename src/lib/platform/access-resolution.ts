import {
  ClinicalWorkspaceRegistry,
  ProductSurfaceRegistry,
  type ClinicalWorkspaceId,
  type ProductSurfaceId,
} from "./registry";

export interface PlatformIdentityEvidence {
  readonly authenticated: boolean;
  readonly hasProfile: boolean;
  readonly clinicSeniority: string | null;
  readonly hasCareProfile: boolean;
  readonly hasDirectChildLink: boolean;
  readonly hasAssociativeChildLink: boolean;
}

export type EntryDecision<T extends string> =
  | Readonly<{ kind: "denied" }>
  | Readonly<{ kind: "direct"; target: T }>
  | Readonly<{ kind: "select"; targets: readonly T[] }>;

const DENIED_ENTRY_DECISION = Object.freeze({
  kind: "denied",
} as const);

export function resolveAuthorizedProductSurfaces(
  identity: PlatformIdentityEvidence,
): readonly ProductSurfaceId[] {
  if (!identity.authenticated) {
    return Object.freeze([]);
  }

  const authorized: ProductSurfaceId[] = [];

  // Compatibility rule only: this reproduces the current Clinic layout gate.
  // It is not definitive professional authorization and does not replace RLS.
  const hasCurrentClinicGate =
    identity.hasProfile && identity.clinicSeniority !== null;

  if (
    hasCurrentClinicGate &&
    ProductSurfaceRegistry.getById("clinic")?.available
  ) {
    authorized.push("clinic");
  }

  const hasCareEvidence =
    identity.hasCareProfile ||
    identity.hasDirectChildLink ||
    identity.hasAssociativeChildLink;

  if (
    hasCareEvidence &&
    ProductSurfaceRegistry.getById("care")?.available
  ) {
    authorized.push("care");
  }

  return Object.freeze(authorized);
}

export function resolveAuthorizedClinicalWorkspaces(
  identity: PlatformIdentityEvidence,
  surfaceId: ProductSurfaceId,
): readonly ClinicalWorkspaceId[] {
  const authorizedSurfaces = resolveAuthorizedProductSurfaces(identity);

  if (
    surfaceId !== "clinic" ||
    !authorizedSurfaces.includes("clinic")
  ) {
    return Object.freeze([]);
  }

  const aba = ClinicalWorkspaceRegistry.getById("aba");

  if (!aba?.available || aba.productSurfaceId !== "clinic") {
    return Object.freeze([]);
  }

  return Object.freeze(["aba"]);
}

export function resolveEntryDecision<T extends string>(
  accesses: readonly T[],
): EntryDecision<T> {
  const uniqueAccesses = Object.freeze([...new Set(accesses)]);

  if (uniqueAccesses.length === 0) {
    return DENIED_ENTRY_DECISION;
  }

  if (uniqueAccesses.length === 1) {
    return Object.freeze({
      kind: "direct",
      target: uniqueAccesses[0],
    });
  }

  return Object.freeze({
    kind: "select",
    targets: uniqueAccesses,
  });
}
