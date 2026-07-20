import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  ClinicalWorkspaceRegistry,
  ProductSurfaceRegistry,
} from "./registry.ts";

describe("ProductSurfaceRegistry", () => {
  test("returns Clinic by ID", () => {
    assert.deepEqual(ProductSurfaceRegistry.getById("clinic"), {
      id: "clinic",
      name: "Fracta Clinic",
      kind: "professional",
      entryPath: "/clinic/dashboard",
      routePrefixes: ["/clinic"],
      available: true,
    });
  });

  test("returns Care by ID", () => {
    assert.deepEqual(ProductSurfaceRegistry.getById("care"), {
      id: "care",
      name: "Fracta Care",
      kind: "family",
      entryPath: "/care/dashboard",
      routePrefixes: ["/care"],
      available: true,
    });
  });

  test("lists only available product surfaces", () => {
    assert.deepEqual(
      ProductSurfaceRegistry.listAvailable().map((surface) => surface.id),
      ["clinic", "care"],
    );
  });

  test("safely denies an unknown product surface ID", () => {
    assert.equal(ProductSurfaceRegistry.getById("unknown"), undefined);
  });
});

describe("ClinicalWorkspaceRegistry", () => {
  test("returns available ABA associated with Clinic", () => {
    const aba = ClinicalWorkspaceRegistry.getById("aba");

    assert.equal(aba?.id, "aba");
    assert.equal(aba?.available, true);
    assert.equal(aba?.productSurfaceId, "clinic");
  });

  test("contains future workspaces as unavailable", () => {
    const futureWorkspaceIds = [
      "psychotherapy",
      "occupational_therapy",
      "speech_therapy",
      "psychopedagogy",
    ];

    for (const id of futureWorkspaceIds) {
      const workspace = ClinicalWorkspaceRegistry.getById(id);
      assert.equal(workspace?.id, id);
      assert.equal(workspace?.available, false);
      assert.equal(workspace?.productSurfaceId, "clinic");
    }
  });

  test("lists only ABA as an available clinical workspace", () => {
    assert.deepEqual(
      ClinicalWorkspaceRegistry.listAvailable().map(
        (workspace) => workspace.id,
      ),
      ["aba"],
    );
  });

  test("safely denies an unknown clinical workspace ID", () => {
    assert.equal(ClinicalWorkspaceRegistry.getById("unknown"), undefined);
  });
});

describe("registry immutability", () => {
  test("prevents registry and definition mutation at runtime", () => {
    const clinic = ProductSurfaceRegistry.getById("clinic");
    const aba = ClinicalWorkspaceRegistry.getById("aba");
    const productSurfaces = ProductSurfaceRegistry.listAvailable();
    const clinicalWorkspaces = ClinicalWorkspaceRegistry.listAvailable();

    assert.ok(clinic);
    assert.ok(aba);
    assert.equal(Object.isFrozen(ProductSurfaceRegistry), true);
    assert.equal(Object.isFrozen(ClinicalWorkspaceRegistry), true);
    assert.equal(Object.isFrozen(clinic), true);
    assert.equal(Object.isFrozen(clinic.routePrefixes), true);
    assert.equal(Object.isFrozen(aba), true);
    assert.equal(Object.isFrozen(productSurfaces), true);
    assert.equal(Object.isFrozen(clinicalWorkspaces), true);

    assert.throws(() => {
      Object.assign(ProductSurfaceRegistry, { getById: () => undefined });
    }, TypeError);
    assert.throws(() => {
      Object.assign(clinic, { name: "Changed" });
    }, TypeError);
    assert.throws(() => {
      Object.assign(aba, { available: false });
    }, TypeError);
    assert.throws(() => {
      Array.prototype.push.call(productSurfaces, clinic);
    }, TypeError);
    assert.throws(() => {
      Array.prototype.push.call(clinicalWorkspaces, aba);
    }, TypeError);
  });
});
