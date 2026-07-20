import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { describe, test } from "node:test";

registerHooks({
  resolve(specifier, context, nextResolve) {
    const resolvedSpecifier =
      specifier === "./registry" ? "./registry.ts" : specifier;
    return nextResolve(resolvedSpecifier, context);
  },
});

const {
  resolveAuthorizedClinicalWorkspaces,
  resolveAuthorizedProductSurfaces,
  resolveEntryDecision,
} = await import("./access-resolution.ts");
import { ClinicalWorkspaceRegistry } from "./registry.ts";

const NO_EVIDENCE = Object.freeze({
  authenticated: false,
  hasProfile: false,
  clinicSeniority: null,
  hasCareProfile: false,
  hasDirectChildLink: false,
  hasAssociativeChildLink: false,
});

function evidence(overrides = {}) {
  return Object.freeze({ ...NO_EVIDENCE, ...overrides });
}

describe("resolveAuthorizedProductSurfaces", () => {
  test("returns no surfaces for an unauthenticated identity", () => {
    assert.deepEqual(resolveAuthorizedProductSurfaces(NO_EVIDENCE), []);
  });

  test("returns no surfaces when authentication has no Clinic or Care evidence", () => {
    assert.deepEqual(
      resolveAuthorizedProductSurfaces(
        evidence({ authenticated: true }),
      ),
      [],
    );
  });

  test("recognizes Care from a family profile without a child", () => {
    assert.deepEqual(
      resolveAuthorizedProductSurfaces(
        evidence({ authenticated: true, hasCareProfile: true }),
      ),
      ["care"],
    );
  });

  test("recognizes Care from a direct child link", () => {
    assert.deepEqual(
      resolveAuthorizedProductSurfaces(
        evidence({ authenticated: true, hasDirectChildLink: true }),
      ),
      ["care"],
    );
  });

  test("recognizes Care from an associative child link", () => {
    assert.deepEqual(
      resolveAuthorizedProductSurfaces(
        evidence({ authenticated: true, hasAssociativeChildLink: true }),
      ),
      ["care"],
    );
  });

  test("denies Clinic when profiles exists without seniority", () => {
    assert.deepEqual(
      resolveAuthorizedProductSurfaces(
        evidence({ authenticated: true, hasProfile: true }),
      ),
      [],
    );
  });

  test("reproduces the current Clinic gate when profiles has seniority", () => {
    assert.deepEqual(
      resolveAuthorizedProductSurfaces(
        evidence({
          authenticated: true,
          hasProfile: true,
          clinicSeniority: "terapeuta",
        }),
      ),
      ["clinic"],
    );
  });

  test("resolves both surfaces when Clinic and Care evidence coexist", () => {
    assert.deepEqual(
      resolveAuthorizedProductSurfaces(
        evidence({
          authenticated: true,
          hasProfile: true,
          clinicSeniority: "terapeuta",
          hasCareProfile: true,
        }),
      ),
      ["clinic", "care"],
    );
  });
});

describe("resolveAuthorizedClinicalWorkspaces", () => {
  const clinicIdentity = evidence({
    authenticated: true,
    hasProfile: true,
    clinicSeniority: "terapeuta",
  });

  test("does not resolve a clinical workspace for Care", () => {
    assert.deepEqual(
      resolveAuthorizedClinicalWorkspaces(clinicIdentity, "care"),
      [],
    );
  });

  test("resolves only ABA for an identity authorized for Clinic", () => {
    assert.deepEqual(
      resolveAuthorizedClinicalWorkspaces(clinicIdentity, "clinic"),
      ["aba"],
    );
  });

  test("never returns unavailable clinical workspaces", () => {
    const resolved = resolveAuthorizedClinicalWorkspaces(
      clinicIdentity,
      "clinic",
    );
    const unavailableIds = [
      "psychotherapy",
      "occupational_therapy",
      "speech_therapy",
      "psychopedagogy",
    ];

    for (const id of unavailableIds) {
      assert.equal(ClinicalWorkspaceRegistry.getById(id)?.available, false);
      assert.equal(resolved.includes(id), false);
    }
  });
});

describe("resolveEntryDecision", () => {
  test("returns denied for zero accesses", () => {
    assert.deepEqual(resolveEntryDecision([]), { kind: "denied" });
  });

  test("returns direct for one access", () => {
    assert.deepEqual(resolveEntryDecision(["care"]), {
      kind: "direct",
      target: "care",
    });
  });

  test("returns select for multiple accesses", () => {
    assert.deepEqual(resolveEntryDecision(["clinic", "care"]), {
      kind: "select",
      targets: ["clinic", "care"],
    });
  });
});

describe("resolution immutability", () => {
  test("returns immutable access lists and entry decisions", () => {
    const surfaces = resolveAuthorizedProductSurfaces(
      evidence({
        authenticated: true,
        hasProfile: true,
        clinicSeniority: "terapeuta",
        hasCareProfile: true,
      }),
    );
    const workspaces = resolveAuthorizedClinicalWorkspaces(
      evidence({
        authenticated: true,
        hasProfile: true,
        clinicSeniority: "terapeuta",
      }),
      "clinic",
    );
    const denied = resolveEntryDecision([]);
    const direct = resolveEntryDecision(["aba"]);
    const select = resolveEntryDecision(["clinic", "care"]);

    assert.equal(Object.isFrozen(surfaces), true);
    assert.equal(Object.isFrozen(workspaces), true);
    assert.equal(Object.isFrozen(denied), true);
    assert.equal(Object.isFrozen(direct), true);
    assert.equal(Object.isFrozen(select), true);
    assert.equal(Object.isFrozen(select.targets), true);

    assert.throws(() => Array.prototype.push.call(surfaces, "care"), TypeError);
    assert.throws(
      () => Array.prototype.push.call(workspaces, "psychotherapy"),
      TypeError,
    );
    assert.throws(
      () => Object.assign(direct, { target: "psychotherapy" }),
      TypeError,
    );
    assert.throws(
      () => Array.prototype.push.call(select.targets, "other"),
      TypeError,
    );
  });
});
