export {
  ClinicalWorkspaceRegistry,
  ProductSurfaceRegistry,
} from "./registry";

export {
  resolveAuthorizedClinicalWorkspaces,
  resolveAuthorizedProductSurfaces,
  resolveEntryDecision,
} from "./access-resolution";

export {
  DENIED_PLATFORM_IDENTITY_EVIDENCE,
  loadPlatformIdentityEvidenceSafely,
  readPlatformIdentityEvidence,
} from "./access-evidence";

export {
  canAccessProductSurface,
  canEnterClinicAba,
  protectedSurfaceLoginRedirect,
  resolveProductSurfaceEntry,
  resolveSurfaceDestination,
  SAFE_PLATFORM_EXIT,
  surfaceLoginPath,
  validateSurfaceRedirect,
} from "./navigation-resolution";

export type {
  ClinicalWorkspaceDefinition,
  ClinicalWorkspaceId,
  ProductSurfaceDefinition,
  ProductSurfaceId,
} from "./registry";

export type {
  EntryDecision,
  PlatformIdentityEvidence,
} from "./access-resolution";
