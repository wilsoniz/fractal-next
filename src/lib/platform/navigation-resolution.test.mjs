import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import { describe, test } from "node:test";

registerHooks({
  resolve(specifier, context, nextResolve) {
    const platformModules = new Set([
      "./access-resolution",
      "./registry",
    ]);
    return nextResolve(
      platformModules.has(specifier) ? `${specifier}.ts` : specifier,
      context,
    );
  },
});

const {
  canAccessProductSurface,
  canEnterClinicAba,
  protectedSurfaceLoginRedirect,
  resolveProductSurfaceEntry,
  resolveSurfaceDestination,
  SAFE_PLATFORM_EXIT,
  validateSurfaceRedirect,
} = await import("./navigation-resolution.ts");
const {
  DENIED_PLATFORM_IDENTITY_EVIDENCE,
  loadPlatformIdentityEvidenceSafely,
} = await import("./access-evidence.ts");

const BASE_IDENTITY = Object.freeze({
  authenticated: true,
  hasProfile: false,
  clinicSeniority: null,
  hasCareProfile: false,
  hasDirectChildLink: false,
  hasAssociativeChildLink: false,
});

function identity(overrides) {
  return Object.freeze({ ...BASE_IDENTITY, ...overrides });
}

const CARE_IDENTITY = identity({ hasCareProfile: true });
const CLINIC_IDENTITY = identity({
  hasProfile: true,
  clinicSeniority: "terapeuta",
});
const BOTH_IDENTITY = identity({
  hasProfile: true,
  clinicSeniority: "terapeuta",
  hasCareProfile: true,
});

describe("platform entry", () => {
  test("routes a Care-only identity directly to Care", () => {
    const decision = resolveProductSurfaceEntry(CARE_IDENTITY);
    assert.deepEqual(decision, { kind: "direct", target: "care" });
    assert.equal(
      resolveSurfaceDestination(decision.target, null, "/care/login"),
      "/care/dashboard",
    );
  });

  test("routes a Clinic-only identity directly to Clinic", () => {
    assert.deepEqual(resolveProductSurfaceEntry(CLINIC_IDENTITY), {
      kind: "direct",
      target: "clinic",
    });
  });

  test("offers selection only when Clinic and Care are authorized", () => {
    assert.deepEqual(resolveProductSurfaceEntry(BOTH_IDENTITY), {
      kind: "select",
      targets: ["clinic", "care"],
    });
  });

  test("denies an identity without an authorized surface", () => {
    assert.deepEqual(resolveProductSurfaceEntry(BASE_IDENTITY), {
      kind: "denied",
    });
    assert.equal(SAFE_PLATFORM_EXIT, "/");
  });
});

describe("surface and clinical workspace protection", () => {
  test("blocks direct Clinic access without Clinic evidence", () => {
    assert.equal(canAccessProductSurface(CARE_IDENTITY, "clinic"), false);
  });

  test("blocks protected Care access without Care evidence", () => {
    assert.equal(canAccessProductSurface(CLINIC_IDENTITY, "care"), false);
  });

  test("enters ABA directly and never enables future workspaces", () => {
    assert.equal(canEnterClinicAba(CLINIC_IDENTITY), true);
    assert.equal(canEnterClinicAba(CARE_IDENTITY), false);
  });

  test("preserves current protected login redirects without self loops", () => {
    assert.equal(
      protectedSurfaceLoginRedirect("clinic", "/clinic/agenda"),
      "/login?redirect=%2Fclinic%2Fagenda",
    );
    assert.equal(
      protectedSurfaceLoginRedirect("care", "/care/atividade"),
      "/care/login?redirect=%2Fcare%2Fatividade",
    );
    assert.notEqual(
      protectedSurfaceLoginRedirect("clinic", "/clinic/agenda"),
      "/clinic/agenda",
    );
  });
});

describe("redirect validation", () => {
  test("accepts only an internal redirect belonging to the surface", () => {
    assert.equal(
      validateSurfaceRedirect(
        "/clinic/pacientes?active=1",
        "clinic",
        "/login",
      ),
      "/clinic/pacientes?active=1",
    );
  });

  test("rejects an absolute URL", () => {
    assert.equal(
      validateSurfaceRedirect(
        "https://example.com/clinic",
        "clinic",
        "/login",
      ),
      null,
    );
  });

  test("rejects a protocol-relative URL", () => {
    assert.equal(
      validateSurfaceRedirect("//example.com/clinic", "clinic", "/login"),
      null,
    );
  });

  test("rejects redirect to the same login page", () => {
    assert.equal(
      validateSurfaceRedirect("/login", "clinic", "/login"),
      null,
    );
    assert.equal(
      validateSurfaceRedirect(
        "/care/login?again=1",
        "care",
        "/care/login",
      ),
      null,
    );
  });

  test("rejects Care redirect for a Clinic-only identity", () => {
    const decision = resolveProductSurfaceEntry(CLINIC_IDENTITY);
    assert.equal(decision.kind, "direct");
    assert.equal(
      resolveSurfaceDestination(
        decision.target,
        "/care/dashboard",
        "/login",
      ),
      "/clinic/dashboard",
    );
  });

  test("rejects Clinic redirect for a Care-only identity", () => {
    const decision = resolveProductSurfaceEntry(CARE_IDENTITY);
    assert.equal(decision.kind, "direct");
    assert.equal(
      resolveSurfaceDestination(
        decision.target,
        "/clinic/dashboard",
        "/care/login",
      ),
      "/care/dashboard",
    );
  });
});

describe("Care public route structure", () => {
  const publicCarePages = [
    "../../app/care/login/page.tsx",
    "../../app/care/esqueci-senha/page.tsx",
    "../../app/care/nova-senha/page.tsx",
    "../../app/care/convite/[codigo]/page.tsx",
  ];

  test("keeps public Care pages outside evidence resolution", () => {
    for (const relativePath of publicCarePages) {
      const fileUrl = new URL(relativePath, import.meta.url);
      const source = readFileSync(fileUrl, "utf8");
      assert.equal(source.includes("PlatformSurfaceGate"), false);
    }
  });

  test("does not create a global Care layout", () => {
    assert.equal(
      existsSync(new URL("../../app/care/layout.tsx", import.meta.url)),
      false,
    );
  });
});

describe("safe evidence failure", () => {
  test("denies safely when evidence reading fails", async () => {
    const result = await loadPlatformIdentityEvidenceSafely(async () => {
      throw new Error("read failed");
    });

    assert.equal(result, DENIED_PLATFORM_IDENTITY_EVIDENCE);
    assert.deepEqual(resolveProductSurfaceEntry(result), { kind: "denied" });
    assert.equal(SAFE_PLATFORM_EXIT, "/");
  });

  test("keeps evidence collection read-only", () => {
    const source = readFileSync(
      new URL("./access-evidence.ts", import.meta.url),
      "utf8",
    );
    const writeMethods = [".insert(", ".update(", ".upsert(", ".delete("];

    for (const method of writeMethods) {
      assert.equal(source.includes(method), false);
    }
  });
});
