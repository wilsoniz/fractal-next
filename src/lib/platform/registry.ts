export type ProductSurfaceId = "clinic" | "care";

export interface ProductSurfaceDefinition {
  readonly id: ProductSurfaceId;
  readonly name: string;
  readonly kind: "professional" | "family";
  readonly entryPath: string;
  readonly routePrefixes: readonly string[];
  readonly available: boolean;
}

export type ClinicalWorkspaceId =
  | "aba"
  | "psychotherapy"
  | "occupational_therapy"
  | "speech_therapy"
  | "psychopedagogy";

export interface ClinicalWorkspaceDefinition {
  readonly id: ClinicalWorkspaceId;
  readonly name: string;
  readonly productSurfaceId: "clinic";
  readonly available: boolean;
}

function freezeProductSurface(
  definition: ProductSurfaceDefinition,
): ProductSurfaceDefinition {
  return Object.freeze({
    ...definition,
    routePrefixes: Object.freeze([...definition.routePrefixes]),
  });
}

const PRODUCT_SURFACES = Object.freeze([
  freezeProductSurface({
    id: "clinic",
    name: "Fracta Clinic",
    kind: "professional",
    entryPath: "/clinic/dashboard",
    routePrefixes: ["/clinic"],
    available: true,
  }),
  freezeProductSurface({
    id: "care",
    name: "Fracta Care",
    kind: "family",
    entryPath: "/care/dashboard",
    routePrefixes: ["/care"],
    available: true,
  }),
] satisfies readonly ProductSurfaceDefinition[]);

const PRODUCT_SURFACES_BY_ID: ReadonlyMap<
  ProductSurfaceId,
  ProductSurfaceDefinition
> = new Map(PRODUCT_SURFACES.map((surface) => [surface.id, surface]));

const AVAILABLE_PRODUCT_SURFACES = Object.freeze(
  PRODUCT_SURFACES.filter((surface) => surface.available),
);

export const ProductSurfaceRegistry = Object.freeze({
  getById(id: ProductSurfaceId): ProductSurfaceDefinition | undefined {
    return PRODUCT_SURFACES_BY_ID.get(id);
  },

  listAvailable(): readonly ProductSurfaceDefinition[] {
    return AVAILABLE_PRODUCT_SURFACES;
  },
});

function freezeClinicalWorkspace(
  definition: ClinicalWorkspaceDefinition,
): ClinicalWorkspaceDefinition {
  return Object.freeze({ ...definition });
}

const CLINICAL_WORKSPACES = Object.freeze([
  freezeClinicalWorkspace({
    id: "aba",
    name: "ABA",
    productSurfaceId: "clinic",
    available: true,
  }),
  freezeClinicalWorkspace({
    id: "psychotherapy",
    name: "Psicoterapia",
    productSurfaceId: "clinic",
    available: false,
  }),
  freezeClinicalWorkspace({
    id: "occupational_therapy",
    name: "Terapia Ocupacional",
    productSurfaceId: "clinic",
    available: false,
  }),
  freezeClinicalWorkspace({
    id: "speech_therapy",
    name: "Fonoaudiologia",
    productSurfaceId: "clinic",
    available: false,
  }),
  freezeClinicalWorkspace({
    id: "psychopedagogy",
    name: "Psicopedagogia",
    productSurfaceId: "clinic",
    available: false,
  }),
] satisfies readonly ClinicalWorkspaceDefinition[]);

const CLINICAL_WORKSPACES_BY_ID: ReadonlyMap<
  ClinicalWorkspaceId,
  ClinicalWorkspaceDefinition
> = new Map(CLINICAL_WORKSPACES.map((workspace) => [workspace.id, workspace]));

const AVAILABLE_CLINICAL_WORKSPACES = Object.freeze(
  CLINICAL_WORKSPACES.filter((workspace) => workspace.available),
);

export const ClinicalWorkspaceRegistry = Object.freeze({
  getById(id: ClinicalWorkspaceId): ClinicalWorkspaceDefinition | undefined {
    return CLINICAL_WORKSPACES_BY_ID.get(id);
  },

  listAvailable(): readonly ClinicalWorkspaceDefinition[] {
    return AVAILABLE_CLINICAL_WORKSPACES;
  },
});
