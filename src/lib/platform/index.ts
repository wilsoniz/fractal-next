export {
  ClinicalWorkspaceRegistry,
  ProductSurfaceRegistry,
} from "./registry";

export {
  resolveAuthorizedClinicalWorkspaces,
  resolveAuthorizedProductSurfaces,
  resolveEntryDecision,
} from "./access-resolution";

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
